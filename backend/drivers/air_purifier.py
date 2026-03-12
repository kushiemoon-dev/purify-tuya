import random

from drivers.base import DeviceCapabilities, DeviceDriver, DeviceSnapshot
from drivers.registry import register_driver

AIR_PURIFIER_CAPABILITIES = DeviceCapabilities(
    metrics=("pm25",),
    modes=("auto", "sleep", "manual"),
    has_timer=False,
    has_on_timer=False,
    has_child_lock=True,
    has_fault=True,
    humidity_range=None,
    extra={"has_fan_speed": True, "has_filter_life": True, "fan_speed_range": (1, 5)},
)

# DPS mapping for Tuya air purifiers (common mapping)
DPS_SWITCH = "1"
DPS_PM25 = "2"
DPS_MODE = "3"
DPS_FAN_SPEED = "4"
DPS_CHILD_LOCK = "7"
DPS_FAULT = "11"
DPS_FILTER_LIFE = "15"


def _snapshot_from_dps(raw: dict) -> DeviceSnapshot:
    fault = raw.get(DPS_FAULT, 0)
    return DeviceSnapshot(
        metrics={
            "pm25": float(raw.get(DPS_PM25, 0)),
        },
        flags={
            "switch": bool(raw.get(DPS_SWITCH, False)),
            "child_lock": bool(raw.get(DPS_CHILD_LOCK, False)),
        },
        faults={
            "sensor_fault": bool(fault & 1),
            "filter_expired": bool(fault & 2),
        },
        mode=raw.get(DPS_MODE, "auto"),
        raw_dps=raw,
        extra={
            "fan_speed": raw.get(DPS_FAN_SPEED, 1),
            "filter_life": raw.get(DPS_FILTER_LIFE, 100),
            "fault": fault,
        },
    )


COMMAND_MAP = {
    "set_power": (DPS_SWITCH, lambda args: args["on"]),
    "set_mode": (DPS_MODE, lambda args: args["mode"]),
    "set_fan_speed": (DPS_FAN_SPEED, lambda args: args["speed"]),
    "set_child_lock": (DPS_CHILD_LOCK, lambda args: args["on"]),
}


@register_driver("air_purifier")
class AirPurifierDriver(DeviceDriver):
    def __init__(
        self, device_id: str = "", device_ip: str = "", local_key: str = "", **_
    ):
        self._device_id = device_id
        self._device_ip = device_ip
        self._local_key = local_key
        self._device = None

    def connect(self) -> None:
        import tinytuya

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
        return AIR_PURIFIER_CAPABILITIES


@register_driver("mock_air_purifier")
class MockAirPurifierDriver(DeviceDriver):
    """Simulated air purifier for development."""

    def __init__(self, **_):
        self._dps: dict = {
            DPS_SWITCH: False,
            DPS_PM25: 35,
            DPS_MODE: "auto",
            DPS_FAN_SPEED: 2,
            DPS_CHILD_LOCK: False,
            DPS_FAULT: 0,
            DPS_FILTER_LIFE: 87,
        }

    def connect(self) -> None:
        pass

    def poll(self) -> DeviceSnapshot:
        pm25 = self._dps[DPS_PM25]
        drift = random.choice([-2, -1, 0, 1, 2])

        # When on, PM2.5 tends to decrease
        if self._dps[DPS_SWITCH]:
            drift = random.choice([-3, -2, -1, 0])

        self._dps = {
            **self._dps,
            DPS_PM25: max(0, min(500, pm25 + drift)),
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
        return AIR_PURIFIER_CAPABILITIES
