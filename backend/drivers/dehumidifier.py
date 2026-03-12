import random

import tinytuya

from drivers.base import DeviceCapabilities, DeviceDriver, DeviceSnapshot
from drivers.registry import register_driver

DEHUMIDIFIER_CAPABILITIES = DeviceCapabilities(
    metrics=("humidity_current",),
    modes=("manual", "laundry", "sleep", "purify"),
    has_timer=True,
    has_on_timer=True,
    has_child_lock=True,
    has_fault=True,
    humidity_range=(35, 70),
)

# DPS mapping for Tuya dehumidifiers
DPS_SWITCH = "1"
DPS_HUMIDITY_SET = "2"
DPS_MODE = "4"
DPS_CHILD_LOCK = "14"
DPS_HUMIDITY_CURRENT = "16"
DPS_COUNTDOWN_SET = "17"
DPS_COUNTDOWN_LEFT = "18"
DPS_FAULT = "19"
DPS_ON_TIMER = "101"


def _snapshot_from_dps(raw: dict) -> DeviceSnapshot:
    fault = raw.get(DPS_FAULT, 0)
    return DeviceSnapshot(
        metrics={
            "humidity_current": float(raw.get(DPS_HUMIDITY_CURRENT, 0)),
        },
        flags={
            "switch": bool(raw.get(DPS_SWITCH, False)),
            "child_lock": bool(raw.get(DPS_CHILD_LOCK, False)),
        },
        faults={
            "tank_full": bool(fault & 1),
            "defrosting": bool(fault & 2),
        },
        mode=raw.get(DPS_MODE, "manual"),
        raw_dps=raw,
        extra={
            "humidity_set": raw.get(DPS_HUMIDITY_SET, 50),
            "countdown_set": raw.get(DPS_COUNTDOWN_SET, "cancel"),
            "countdown_left": raw.get(DPS_COUNTDOWN_LEFT, 0),
            "fault": fault,
            "on_timer": raw.get(DPS_ON_TIMER, "cancel"),
        },
    )


COMMAND_MAP = {
    "set_power": (DPS_SWITCH, lambda args: args["on"]),
    "set_humidity": (DPS_HUMIDITY_SET, lambda args: args["value"]),
    "set_mode": (DPS_MODE, lambda args: args["mode"]),
    "set_child_lock": (DPS_CHILD_LOCK, lambda args: args["on"]),
    "set_countdown": (DPS_COUNTDOWN_SET, lambda args: args["hours"]),
    "set_on_timer": (DPS_ON_TIMER, lambda args: args["hours"]),
}


@register_driver("dehumidifier")
class DehumidifierDriver(DeviceDriver):
    def __init__(
        self, device_id: str = "", device_ip: str = "", local_key: str = "", **_
    ):
        self._device_id = device_id
        self._device_ip = device_ip
        self._local_key = local_key
        self._device: tinytuya.OutletDevice | None = None

    def connect(self) -> None:
        self._device = tinytuya.OutletDevice(
            dev_id=self._device_id,
            address=self._device_ip,
            local_key=self._local_key,
            version=3.3,
        )
        self._device.set_socketPersistent(True)

    def poll(self) -> DeviceSnapshot | None:
        if self._device is None:
            return None
        data = self._device.status()
        if "dps" not in data:
            return None
        return _snapshot_from_dps(data["dps"])

    def execute_command(self, command: str, args: dict) -> None:
        if self._device is None:
            return
        mapping = COMMAND_MAP.get(command)
        if mapping is None:
            raise ValueError(f"Unknown command: {command}")
        dps_id, value_fn = mapping
        self._device.set_value(dps_id, value_fn(args))

    def get_capabilities(self) -> DeviceCapabilities:
        return DEHUMIDIFIER_CAPABILITIES


@register_driver("mock_dehumidifier")
class MockDehumidifierDriver(DeviceDriver):
    """Simulated dehumidifier for development — preserves v1 drift behavior."""

    def __init__(self, **_):
        self._dps: dict = {
            DPS_SWITCH: False,
            DPS_HUMIDITY_SET: 50,
            DPS_MODE: "manual",
            DPS_CHILD_LOCK: False,
            DPS_HUMIDITY_CURRENT: 65,
            DPS_COUNTDOWN_SET: "cancel",
            DPS_COUNTDOWN_LEFT: 0,
            DPS_FAULT: 0,
            DPS_ON_TIMER: "cancel",
        }

    def connect(self) -> None:
        pass

    def poll(self) -> DeviceSnapshot:
        current = self._dps[DPS_HUMIDITY_CURRENT]
        drift = random.choice([-1, 0, 1])

        if self._dps[DPS_SWITCH] and current > self._dps[DPS_HUMIDITY_SET]:
            drift = -1

        self._dps = {
            **self._dps,
            DPS_HUMIDITY_CURRENT: max(0, min(100, current + drift)),
        }
        return _snapshot_from_dps(self._dps)

    def execute_command(self, command: str, args: dict) -> None:
        mapping = COMMAND_MAP.get(command)
        if mapping is None:
            if command == "set_fault":
                self._dps = {**self._dps, DPS_FAULT: args.get("fault", 0)}
                return
            raise ValueError(f"Unknown command: {command}")
        dps_id, value_fn = mapping
        self._dps = {**self._dps, dps_id: value_fn(args)}

    def get_capabilities(self) -> DeviceCapabilities:
        return DEHUMIDIFIER_CAPABILITIES
