"""Tests for services.device_manager — non-polling unit tests."""
import pytest

from drivers.base import DeviceCapabilities, DeviceSnapshot
from services.device_manager import DeviceManager, ManagedDevice, _detect_type

# Import drivers to register them in the registry
import drivers.dehumidifier  # noqa: F401
import drivers.air_purifier  # noqa: F401


class TestAddDevice:
    async def test_adds_device_and_starts_task(self):
        manager = DeviceManager()
        managed = manager.add_device(db_id=1, name="Test", device_type="dehumidifier", is_mock=True)
        assert managed.db_id == 1
        assert managed.name == "Test"
        assert 1 in manager.devices
        assert managed.task is not None
        managed.task.cancel()

    async def test_duplicate_raises(self):
        manager = DeviceManager()
        managed = manager.add_device(db_id=1, name="Test", device_type="dehumidifier", is_mock=True)
        with pytest.raises(ValueError, match="already managed"):
            manager.add_device(db_id=1, name="Test2", device_type="dehumidifier", is_mock=True)
        managed.task.cancel()


class TestRemoveDevice:
    async def test_removes_device(self):
        manager = DeviceManager()
        manager.add_device(db_id=1, name="Test", device_type="dehumidifier", is_mock=True)
        await manager.remove_device(1)
        assert 1 not in manager.devices

    async def test_remove_nonexistent_is_noop(self):
        manager = DeviceManager()
        await manager.remove_device(999)  # should not raise


class TestGetState:
    def test_returns_none_for_unknown_device(self):
        manager = DeviceManager()
        assert manager.get_state(99) is None

    async def test_returns_none_when_no_snapshot(self):
        manager = DeviceManager()
        managed = manager.add_device(db_id=1, name="Test", device_type="dehumidifier", is_mock=True)
        # Snapshot is None initially (no poll yet)
        assert manager.get_state(1) is None
        managed.task.cancel()


class TestExecuteCommand:
    async def test_raises_for_unknown_device(self):
        manager = DeviceManager()
        with pytest.raises(ValueError, match="not found"):
            await manager.execute_command(99, "set_power", {"on": True})


class TestShutdown:
    async def test_shuts_down_all_devices(self):
        manager = DeviceManager()
        manager.add_device(db_id=1, name="D1", device_type="dehumidifier", is_mock=True)
        manager.add_device(db_id=2, name="D2", device_type="air_purifier", is_mock=True)
        await manager.shutdown()
        assert len(manager.devices) == 0


class TestSnapshotToDict:
    def test_dehumidifier_snapshot(self):
        snap = DeviceSnapshot(
            metrics={"humidity_current": 65.0},
            flags={"switch": True, "child_lock": False},
            faults={"tank_full": False, "defrosting": False},
            mode="manual",
            raw_dps={},
            extra={"humidity_set": 50, "countdown_set": "cancel", "countdown_left": 0, "fault": 0, "on_timer": "cancel"},
        )
        caps = DeviceCapabilities(
            metrics=("humidity_current",),
            modes=("manual", "laundry", "sleep", "purify"),
            has_timer=True, has_on_timer=True, has_child_lock=True, has_fault=True,
            humidity_range=(35, 70),
        )

        class FakeDriver:
            def get_capabilities(self):
                return caps

        managed = ManagedDevice(db_id=1, name="Dehum", driver=FakeDriver())
        managed.snapshot = snap

        result = DeviceManager._snapshot_to_dict(managed)
        assert result["device_type"] == "dehumidifier"
        assert result["humidity_current"] == 65
        assert result["switch"] is True
        assert result["mode"] == "manual"
        assert result["tank_full"] is False

    def test_air_purifier_snapshot(self):
        snap = DeviceSnapshot(
            metrics={"pm25": 42.0},
            flags={"switch": True, "child_lock": False},
            faults={"sensor_fault": False, "filter_expired": True},
            mode="auto",
            raw_dps={},
            extra={"fan_speed": 3, "filter_life": 80, "fault": 2},
        )
        caps = DeviceCapabilities(
            metrics=("pm25",),
            modes=("auto", "sleep", "manual"),
            has_child_lock=True, has_fault=True,
            extra={"has_fan_speed": True},
        )

        class FakeDriver:
            def get_capabilities(self):
                return caps

        managed = ManagedDevice(db_id=2, name="Purifier", driver=FakeDriver())
        managed.snapshot = snap

        result = DeviceManager._snapshot_to_dict(managed)
        assert result["device_type"] == "air_purifier"
        assert result["pm25"] == 42
        assert result["fan_speed"] == 3
        assert result["filter_expired"] is True

    def test_empty_snapshot_returns_empty_dict(self):
        class FakeDriver:
            def get_capabilities(self):
                return DeviceCapabilities()

        managed = ManagedDevice(db_id=1, name="X", driver=FakeDriver())
        managed.snapshot = None
        result = DeviceManager._snapshot_to_dict(managed)
        assert result == {}


class TestDetectType:
    def test_pm25_is_air_purifier(self):
        caps = DeviceCapabilities(metrics=("pm25",))
        assert _detect_type(caps) == "air_purifier"

    def test_humidity_is_dehumidifier(self):
        caps = DeviceCapabilities(metrics=("humidity_current",))
        assert _detect_type(caps) == "dehumidifier"

    def test_unknown(self):
        caps = DeviceCapabilities(metrics=("temperature",))
        assert _detect_type(caps) == "unknown"
