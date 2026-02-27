import random
from abc import ABC, abstractmethod

import tinytuya

from config import Settings
from models import DeviceState


class Device(ABC):
    @abstractmethod
    def connect(self) -> None: ...

    @abstractmethod
    def poll(self) -> DeviceState | None: ...

    @abstractmethod
    def set_power(self, on: bool) -> None: ...

    @abstractmethod
    def set_humidity(self, value: int) -> None: ...

    @abstractmethod
    def set_mode(self, mode: str) -> None: ...

    @abstractmethod
    def set_child_lock(self, on: bool) -> None: ...

    @abstractmethod
    def set_countdown(self, hours: str) -> None: ...

    @abstractmethod
    def set_on_timer(self, hours: str) -> None: ...


class MockDevice(Device):
    def __init__(self) -> None:
        self._state = DeviceState(
            switch=False,
            humidity_set=50,
            mode="manual",
            child_lock=False,
            humidity_current=65,
            countdown_set="cancel",
            countdown_left=0,
            fault=0,
            on_timer="cancel",
        )

    def connect(self) -> None:
        pass

    def poll(self) -> DeviceState:
        current = self._state.humidity_current
        drift = random.choice([-1, 0, 1])

        if self._state.switch and current > self._state.humidity_set:
            drift = -1

        new_humidity = max(0, min(100, current + drift))

        self._state = DeviceState(
            **{**self._state.model_dump(), "humidity_current": new_humidity}
        )
        return self._state

    def set_power(self, on: bool) -> None:
        self._state = DeviceState(**{**self._state.model_dump(), "switch": on})

    def set_humidity(self, value: int) -> None:
        self._state = DeviceState(
            **{**self._state.model_dump(), "humidity_set": value}
        )

    def set_mode(self, mode: str) -> None:
        self._state = DeviceState(**{**self._state.model_dump(), "mode": mode})

    def set_child_lock(self, on: bool) -> None:
        self._state = DeviceState(
            **{**self._state.model_dump(), "child_lock": on}
        )

    def set_countdown(self, hours: str) -> None:
        self._state = DeviceState(
            **{**self._state.model_dump(), "countdown_set": hours}
        )

    def set_on_timer(self, hours: str) -> None:
        self._state = DeviceState(
            **{**self._state.model_dump(), "on_timer": hours}
        )

    def set_fault(self, fault: int) -> None:
        self._state = DeviceState(**{**self._state.model_dump(), "fault": fault})


class TuyaDevice(Device):
    def __init__(self, device_id: str, device_ip: str, local_key: str) -> None:
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

    def poll(self) -> DeviceState | None:
        if self._device is None:
            return None
        data = self._device.status()
        if "dps" not in data:
            return None
        return DeviceState.from_dps(data["dps"])

    def _set_dps(self, dps_id: str, value) -> None:
        if self._device is None:
            return
        self._device.set_value(dps_id, value)

    def set_power(self, on: bool) -> None:
        self._set_dps("1", on)

    def set_humidity(self, value: int) -> None:
        self._set_dps("2", value)

    def set_mode(self, mode: str) -> None:
        self._set_dps("4", mode)

    def set_child_lock(self, on: bool) -> None:
        self._set_dps("14", on)

    def set_countdown(self, hours: str) -> None:
        self._set_dps("17", hours)

    def set_on_timer(self, hours: str) -> None:
        self._set_dps("101", hours)


def create_device(settings: Settings) -> Device:
    if settings.mock_device:
        return MockDevice()
    return TuyaDevice(
        device_id=settings.device_id,
        device_ip=settings.device_ip,
        local_key=settings.local_key,
    )
