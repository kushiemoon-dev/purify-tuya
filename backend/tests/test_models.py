import sys
from pathlib import Path

import pytest
from pydantic import ValidationError

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from models import DeviceState, Mode, SetHumidityRequest, SetTimerRequest


class TestDeviceStateFromDps:
    def test_full_dps(self):
        dps = {
            "1": True,
            "2": 55,
            "4": "laundry",
            "14": True,
            "16": 62,
            "17": "3h",
            "18": 120,
            "19": 1,
            "101": "8h",
        }
        state = DeviceState.from_dps(dps)
        assert state.switch is True
        assert state.humidity_set == 55
        assert state.mode == Mode.LAUNDRY
        assert state.child_lock is True
        assert state.humidity_current == 62
        assert state.countdown_set == "3h"
        assert state.countdown_left == 120
        assert state.fault == 1
        assert state.on_timer == "8h"

    def test_partial_dps_uses_defaults(self):
        state = DeviceState.from_dps({"1": True, "16": 45})
        assert state.switch is True
        assert state.humidity_set == 50
        assert state.mode == Mode.MANUAL
        assert state.humidity_current == 45

    def test_empty_dps_all_defaults(self):
        state = DeviceState.from_dps({})
        assert state.switch is False
        assert state.humidity_set == 50
        assert state.humidity_current == 0


class TestDeviceStateToDict:
    def test_includes_computed_fields(self):
        state = DeviceState(fault=0)
        d = state.to_dict()
        assert "tank_full" in d
        assert "defrosting" in d
        assert d["tank_full"] is False
        assert d["defrosting"] is False

    def test_tank_full_flag(self):
        state = DeviceState(fault=1)
        assert state.tank_full is True
        assert state.defrosting is False

    def test_defrosting_flag(self):
        state = DeviceState(fault=2)
        assert state.tank_full is False
        assert state.defrosting is True

    def test_both_flags(self):
        state = DeviceState(fault=3)
        assert state.tank_full is True
        assert state.defrosting is True


class TestSetHumidityRequest:
    def test_valid_multiples_of_5(self):
        for v in [35, 40, 50, 65, 70]:
            req = SetHumidityRequest(value=v)
            assert req.value == v

    def test_not_multiple_of_5(self):
        with pytest.raises(ValueError, match="multiple of 5"):
            SetHumidityRequest(value=42)

    def test_below_range(self):
        with pytest.raises(ValidationError):
            SetHumidityRequest(value=30)

    def test_above_range(self):
        with pytest.raises(ValidationError):
            SetHumidityRequest(value=75)


class TestSetTimerRequest:
    def test_valid_timer_values(self):
        for v in ["cancel", "1h", "12h", "24h"]:
            req = SetTimerRequest(hours=v)
            assert req.hours == v

    def test_invalid_timer_value(self):
        with pytest.raises(ValueError, match="Timer must be one of"):
            SetTimerRequest(hours="25h")

    def test_invalid_format(self):
        with pytest.raises(ValueError, match="Timer must be one of"):
            SetTimerRequest(hours="abc")
