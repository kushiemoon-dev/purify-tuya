"""Tests for drivers — mock drivers and registry."""
import pytest

from drivers.base import DeviceCapabilities, DeviceSnapshot
from drivers.registry import create_driver, list_driver_types

# Importing the driver modules registers them
import drivers.dehumidifier  # noqa: F401
import drivers.air_purifier  # noqa: F401


class TestDriverRegistry:
    def test_list_driver_types(self):
        types = list_driver_types()
        assert "dehumidifier" in types
        assert "mock_dehumidifier" in types
        assert "air_purifier" in types
        assert "mock_air_purifier" in types

    def test_create_mock_dehumidifier(self):
        driver = create_driver("mock_dehumidifier")
        assert driver is not None

    def test_create_mock_air_purifier(self):
        driver = create_driver("mock_air_purifier")
        assert driver is not None

    def test_unknown_type_raises(self):
        with pytest.raises(ValueError, match="Unknown device type"):
            create_driver("nonexistent")


class TestMockDehumidifier:
    @pytest.fixture()
    def driver(self):
        d = create_driver("mock_dehumidifier")
        d.connect()
        return d

    def test_poll_returns_snapshot(self, driver):
        snap = driver.poll()
        assert isinstance(snap, DeviceSnapshot)
        assert "humidity_current" in snap.metrics
        assert "switch" in snap.flags

    def test_capabilities(self, driver):
        caps = driver.get_capabilities()
        assert isinstance(caps, DeviceCapabilities)
        assert "humidity_current" in caps.metrics
        assert caps.has_timer is True
        assert caps.humidity_range == (35, 70)

    def test_execute_set_power(self, driver):
        driver.execute_command("set_power", {"on": True})
        snap = driver.poll()
        assert snap.flags["switch"] is True

    def test_execute_set_humidity(self, driver):
        driver.execute_command("set_humidity", {"value": 45})
        snap = driver.poll()
        assert snap.extra["humidity_set"] == 45

    def test_execute_set_mode(self, driver):
        driver.execute_command("set_mode", {"mode": "sleep"})
        snap = driver.poll()
        assert snap.mode == "sleep"

    def test_execute_unknown_command_raises(self, driver):
        with pytest.raises(ValueError, match="Unknown command"):
            driver.execute_command("fly_to_moon", {})

    def test_set_fault(self, driver):
        driver.execute_command("set_fault", {"fault": 3})
        snap = driver.poll()
        assert snap.faults["tank_full"] is True
        assert snap.faults["defrosting"] is True

    def test_humidity_drift_when_on_and_above_target(self, driver):
        driver.execute_command("set_power", {"on": True})
        driver.execute_command("set_humidity", {"value": 30})
        # Set humidity high
        driver._dps["16"] = 80
        readings = [driver.poll().metrics["humidity_current"] for _ in range(20)]
        # With target=30 and current=80, drift should always be -1 so readings should decrease
        assert readings[-1] <= readings[0]


class TestMockAirPurifier:
    @pytest.fixture()
    def driver(self):
        d = create_driver("mock_air_purifier")
        d.connect()
        return d

    def test_poll_returns_snapshot(self, driver):
        snap = driver.poll()
        assert isinstance(snap, DeviceSnapshot)
        assert "pm25" in snap.metrics

    def test_capabilities(self, driver):
        caps = driver.get_capabilities()
        assert "pm25" in caps.metrics
        assert caps.has_timer is False
        assert caps.extra["has_fan_speed"] is True

    def test_execute_set_fan_speed(self, driver):
        driver.execute_command("set_fan_speed", {"speed": 4})
        snap = driver.poll()
        assert snap.extra["fan_speed"] == 4

    def test_execute_set_mode(self, driver):
        driver.execute_command("set_mode", {"mode": "sleep"})
        snap = driver.poll()
        assert snap.mode == "sleep"

    def test_set_fault(self, driver):
        driver.execute_command("set_fault", {"fault": 1})
        snap = driver.poll()
        assert snap.faults["sensor_fault"] is True
