from enum import Enum
from typing import Annotated

from pydantic import BaseModel, Field


class Mode(str, Enum):
    MANUAL = "manual"
    LAUNDRY = "laundry"
    SLEEP = "sleep"
    PURIFY = "purify"


TIMER_VALUES = [
    "cancel", "1h", "2h", "3h", "4h", "5h", "6h", "7h", "8h",
    "9h", "10h", "11h", "12h", "13h", "14h", "15h", "16h",
    "17h", "18h", "19h", "20h", "21h", "22h", "23h", "24h",
]


class DeviceState(BaseModel):
    switch: bool = False
    humidity_set: int = 50
    mode: Mode = Mode.MANUAL
    child_lock: bool = False
    humidity_current: int = 0
    countdown_set: str = "cancel"
    countdown_left: int = 0
    fault: int = 0
    on_timer: str = "cancel"

    @property
    def tank_full(self) -> bool:
        return bool(self.fault & 1)

    @property
    def defrosting(self) -> bool:
        return bool(self.fault & 2)

    @classmethod
    def from_dps(cls, dps: dict) -> "DeviceState":
        return cls(
            switch=dps.get("1", False),
            humidity_set=dps.get("2", 50),
            mode=Mode(dps.get("4", "manual")),
            child_lock=dps.get("14", False),
            humidity_current=dps.get("16", 0),
            countdown_set=dps.get("17", "cancel"),
            countdown_left=dps.get("18", 0),
            fault=dps.get("19", 0),
            on_timer=dps.get("101", "cancel"),
        )

    def to_dict(self) -> dict:
        return {
            **self.model_dump(),
            "tank_full": self.tank_full,
            "defrosting": self.defrosting,
        }


HumidityValue = Annotated[int, Field(ge=35, le=70)]


class PowerRequest(BaseModel):
    on: bool


class SetHumidityRequest(BaseModel):
    value: HumidityValue

    def model_post_init(self, __context) -> None:
        if self.value % 5 != 0:
            raise ValueError("Humidity must be a multiple of 5")


class SetModeRequest(BaseModel):
    mode: Mode


class ChildLockRequest(BaseModel):
    on: bool


class SetTimerRequest(BaseModel):
    hours: str

    def model_post_init(self, __context) -> None:
        if self.hours not in TIMER_VALUES:
            raise ValueError(f"Timer must be one of: {TIMER_VALUES}")


class SetOnTimerRequest(BaseModel):
    hours: str

    def model_post_init(self, __context) -> None:
        if self.hours not in TIMER_VALUES:
            raise ValueError(f"Timer must be one of: {TIMER_VALUES}")
