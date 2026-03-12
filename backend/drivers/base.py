from abc import ABC, abstractmethod
from dataclasses import dataclass, field


@dataclass(frozen=True)
class DeviceCapabilities:
    """Describes what a device type can do — used by frontend to adapt UI."""
    metrics: tuple[str, ...] = ()
    modes: tuple[str, ...] = ()
    has_timer: bool = False
    has_on_timer: bool = False
    has_child_lock: bool = False
    has_fault: bool = False
    humidity_range: tuple[int, int] | None = None
    extra: dict = field(default_factory=dict)


@dataclass(frozen=True)
class DeviceSnapshot:
    """Normalized device state returned by poll()."""
    metrics: dict[str, float] = field(default_factory=dict)
    flags: dict[str, bool] = field(default_factory=dict)
    faults: dict[str, bool] = field(default_factory=dict)
    mode: str = ""
    raw_dps: dict = field(default_factory=dict)
    extra: dict = field(default_factory=dict)


class DeviceDriver(ABC):
    """Abstract base for all device drivers."""

    @abstractmethod
    def connect(self) -> None: ...

    @abstractmethod
    def poll(self) -> DeviceSnapshot | None: ...

    @abstractmethod
    def execute_command(self, command: str, args: dict) -> None: ...

    @abstractmethod
    def get_capabilities(self) -> DeviceCapabilities: ...
