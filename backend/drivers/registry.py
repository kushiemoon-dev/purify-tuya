from drivers.base import DeviceDriver

_registry: dict[str, type[DeviceDriver]] = {}


def register_driver(device_type: str):
    """Decorator to register a driver class for a device type."""

    def wrapper(cls: type[DeviceDriver]):
        _registry[device_type] = cls
        return cls

    return wrapper


def create_driver(device_type: str, **kwargs) -> DeviceDriver:
    """Create a driver instance for the given device type."""
    cls = _registry.get(device_type)
    if cls is None:
        raise ValueError(
            f"Unknown device type: {device_type}. Available: {list(_registry.keys())}"
        )
    return cls(**kwargs)


def list_driver_types() -> list[str]:
    return list(_registry.keys())
