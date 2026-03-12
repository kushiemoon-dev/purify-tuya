import asyncio
import logging
import time
from collections import deque
from dataclasses import dataclass, field

from drivers.base import DeviceDriver, DeviceSnapshot
from drivers.registry import create_driver

logger = logging.getLogger("purify.device_manager")

MAX_HISTORY = 60


@dataclass
class ManagedDevice:
    """Runtime state for a single managed device."""
    db_id: int
    name: str
    driver: DeviceDriver
    poll_interval: int = 5
    snapshot: DeviceSnapshot | None = None
    humidity_history: deque = field(default_factory=lambda: deque(maxlen=MAX_HISTORY))
    last_poll: float = 0.0
    task: asyncio.Task | None = None


class DeviceManager:
    """Manages N device connections with independent polling tasks."""

    def __init__(self, on_update=None):
        self._devices: dict[int, ManagedDevice] = {}
        self._on_update = on_update  # async callback(device_id, snapshot, history)
        self._cleanup_task: asyncio.Task | None = None

    @property
    def devices(self) -> dict[int, ManagedDevice]:
        return self._devices

    def get(self, device_id: int) -> ManagedDevice | None:
        return self._devices.get(device_id)

    def add_device(
        self,
        db_id: int,
        name: str,
        device_type: str,
        is_mock: bool,
        poll_interval: int = 5,
        **driver_kwargs,
    ) -> ManagedDevice:
        """Add and start polling a device."""
        if db_id in self._devices:
            raise ValueError(f"Device {db_id} already managed")

        actual_type = f"mock_{device_type}" if is_mock else device_type
        driver = create_driver(actual_type, **driver_kwargs)
        driver.connect()

        managed = ManagedDevice(
            db_id=db_id,
            name=name,
            driver=driver,
            poll_interval=poll_interval,
        )
        self._devices = {**self._devices, db_id: managed}
        managed.task = asyncio.create_task(self._poll_loop(db_id))
        logger.info("Started polling device %d (%s) every %ds", db_id, name, poll_interval)
        return managed

    async def remove_device(self, db_id: int) -> None:
        """Stop polling and remove a device."""
        managed = self._devices.get(db_id)
        if managed is None:
            return
        if managed.task:
            managed.task.cancel()
            try:
                await managed.task
            except asyncio.CancelledError:
                pass
        self._devices = {k: v for k, v in self._devices.items() if k != db_id}
        logger.info("Stopped device %d (%s)", db_id, managed.name)

    async def execute_command(self, db_id: int, command: str, args: dict) -> None:
        managed = self._devices.get(db_id)
        if managed is None:
            raise ValueError(f"Device {db_id} not found")
        await asyncio.to_thread(managed.driver.execute_command, command, args)

    def get_state(self, db_id: int) -> dict | None:
        """Get the current state of a device as a v1-compatible dict."""
        managed = self._devices.get(db_id)
        if managed is None or managed.snapshot is None:
            return None
        return self._snapshot_to_dict(managed)

    def get_all_states(self) -> dict[int, dict]:
        """Get states for all devices."""
        result = {}
        for db_id, managed in self._devices.items():
            if managed.snapshot is not None:
                result[db_id] = self._snapshot_to_dict(managed)
        return result

    def start_cleanup_task(self) -> None:
        """Start the daily cleanup task for old readings."""
        self._cleanup_task = asyncio.create_task(self._cleanup_loop())

    async def shutdown(self) -> None:
        """Stop all polling tasks and cleanup task."""
        if self._cleanup_task:
            self._cleanup_task.cancel()
            try:
                await self._cleanup_task
            except asyncio.CancelledError:
                pass
        for db_id in list(self._devices.keys()):
            await self.remove_device(db_id)

    async def _poll_loop(self, db_id: int) -> None:
        while True:
            managed = self._devices.get(db_id)
            if managed is None:
                return
            try:
                snapshot = await asyncio.to_thread(managed.driver.poll)
                if snapshot is not None:
                    managed.snapshot = snapshot
                    managed.last_poll = time.time()

                    humidity = snapshot.metrics.get("humidity_current")
                    if humidity is not None:
                        managed.humidity_history.append({
                            "t": int(time.time()),
                            "v": humidity,
                        })

                    # Write readings to DB for historical data
                    if snapshot.metrics:
                        try:
                            from services.history_service import write_readings
                            await write_readings(db_id, snapshot.metrics)
                        except Exception as e:
                            logger.warning("Failed to write readings for device %d: %s", db_id, e)

                    if self._on_update:
                        await self._on_update(
                            db_id,
                            snapshot,
                            list(managed.humidity_history),
                        )
            except asyncio.CancelledError:
                raise
            except Exception as e:
                logger.exception("Poll error for device %d: %s", db_id, e)

            await asyncio.sleep(managed.poll_interval)

    async def _cleanup_loop(self) -> None:
        """Run cleanup once daily."""
        while True:
            try:
                await asyncio.sleep(86400)  # 24 hours
                from services.history_service import cleanup_old_readings
                await cleanup_old_readings()
            except asyncio.CancelledError:
                raise
            except Exception as e:
                logger.exception("Cleanup error: %s", e)

    @staticmethod
    def _snapshot_to_dict(managed: ManagedDevice) -> dict:
        """Convert a snapshot to a state dict for the frontend.

        Includes generic fields + device-type-specific extras.
        """
        snap = managed.snapshot
        if snap is None:
            return {}

        caps = managed.driver.get_capabilities()
        fault = snap.extra.get("fault", 0)

        # Base fields (all device types)
        result: dict = {
            "device_id": managed.db_id,
            "name": managed.name,
            "device_type": caps.modes[0] if not caps.metrics else _detect_type(caps),
            "switch": snap.flags.get("switch", False),
            "mode": snap.mode,
            "child_lock": snap.flags.get("child_lock", False),
            "fault": fault,
            "faults": snap.faults,
            "metrics": {k: round(v, 1) for k, v in snap.metrics.items()},
            "capabilities": {
                "metrics": list(caps.metrics),
                "modes": list(caps.modes),
                "has_timer": caps.has_timer,
                "has_on_timer": caps.has_on_timer,
                "has_child_lock": caps.has_child_lock,
                "has_fault": caps.has_fault,
                "humidity_range": list(caps.humidity_range) if caps.humidity_range else None,
                "extra": caps.extra,
            },
            "humidity_history": list(managed.humidity_history),
        }

        # Dehumidifier-specific fields (backward compat)
        if "humidity_current" in snap.metrics:
            result["device_type"] = "dehumidifier"
            result["humidity_current"] = int(snap.metrics.get("humidity_current", 0))
            result["humidity_set"] = snap.extra.get("humidity_set", 50)
            result["countdown_set"] = snap.extra.get("countdown_set", "cancel")
            result["countdown_left"] = snap.extra.get("countdown_left", 0)
            result["on_timer"] = snap.extra.get("on_timer", "cancel")
            result["tank_full"] = bool(fault & 1)
            result["defrosting"] = bool(fault & 2)

        # Air purifier-specific fields
        if "pm25" in snap.metrics:
            result["device_type"] = "air_purifier"
            result["pm25"] = int(snap.metrics.get("pm25", 0))
            result["fan_speed"] = snap.extra.get("fan_speed", 1)
            result["filter_life"] = snap.extra.get("filter_life", 100)
            result["sensor_fault"] = snap.faults.get("sensor_fault", False)
            result["filter_expired"] = snap.faults.get("filter_expired", False)

        return result


def _detect_type(caps) -> str:
    if "pm25" in caps.metrics:
        return "air_purifier"
    if "humidity_current" in caps.metrics:
        return "dehumidifier"
    return "unknown"
