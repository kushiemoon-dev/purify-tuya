import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from models import DeviceState, Mode


class TestMockDevicePoll:
    def test_poll_returns_tuple(self, mock_device):
        result = mock_device.poll()
        assert isinstance(result, tuple)
        assert len(result) == 2
        state, raw_dps = result
        assert isinstance(state, DeviceState)
        assert isinstance(raw_dps, dict)

    def test_poll_raw_dps_keys(self, mock_device):
        _, raw_dps = mock_device.poll()
        expected_keys = {"1", "2", "4", "14", "16", "17", "18", "19", "101"}
        assert set(raw_dps.keys()) == expected_keys


class TestMockDeviceSetters:
    def test_set_power(self, mock_device):
        mock_device.set_power(True)
        state, _ = mock_device.poll()
        assert state.switch is True

        mock_device.set_power(False)
        state, _ = mock_device.poll()
        assert state.switch is False

    def test_set_humidity(self, mock_device):
        mock_device.set_humidity(60)
        state, _ = mock_device.poll()
        assert state.humidity_set == 60

    def test_set_mode(self, mock_device):
        mock_device.set_mode("laundry")
        state, _ = mock_device.poll()
        assert state.mode == Mode.LAUNDRY

    def test_set_child_lock(self, mock_device):
        mock_device.set_child_lock(True)
        state, _ = mock_device.poll()
        assert state.child_lock is True

    def test_set_countdown(self, mock_device):
        mock_device.set_countdown("5h")
        state, _ = mock_device.poll()
        assert state.countdown_set == "5h"

    def test_set_on_timer(self, mock_device):
        mock_device.set_on_timer("8h")
        state, _ = mock_device.poll()
        assert state.on_timer == "8h"

    def test_set_fault(self, mock_device):
        mock_device.set_fault(3)
        state, _ = mock_device.poll()
        assert state.fault == 3
        assert state.tank_full is True
        assert state.defrosting is True


class TestMockDeviceHumidityDrift:
    def test_humidity_drifts_down_when_on_and_above_target(self, mock_device):
        mock_device.set_power(True)
        mock_device.set_humidity(40)
        # Set humidity_current high
        mock_device._state = DeviceState(
            **{**mock_device._state.model_dump(), "humidity_current": 80}
        )

        readings = []
        for _ in range(20):
            state, _ = mock_device.poll()
            readings.append(state.humidity_current)

        # Should trend downward (drift=-1 when on and above target)
        assert readings[-1] <= readings[0]
