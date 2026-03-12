import asyncio
import logging
import os
import time
from collections import deque
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from sqlalchemy import select

from api.v1.devices import set_manager
from api.v1.router import v1_router
from config import settings_holder
from db.engine import async_session, init_db
from db.models import DeviceModel
from device import create_device
from drivers.air_purifier import AirPurifierDriver, MockAirPurifierDriver  # noqa: F401 — register drivers
from drivers.dehumidifier import DehumidifierDriver, MockDehumidifierDriver  # noqa: F401 — register drivers
from routes import init_routes
from services.automation_engine import AutomationEngine
from services.device_manager import DeviceManager
from services.notification_service import create_notification
from websocket import ConnectionManager

logger = logging.getLogger("purify")

KNOWN_DPS = {"1", "2", "4", "14", "16", "17", "18", "19", "101"}
MAX_HISTORY = 60


# ── Legacy single-device state (kept for v1 compat routes) ──


class DeviceHolder:
    def __init__(self, device):
        self.device = device


holder = DeviceHolder(create_device(settings_holder.settings))
ws_manager = ConnectionManager()
current_state: dict | None = None
raw_dps: dict = {}
humidity_history: deque[dict] = deque(maxlen=MAX_HISTORY)
poll_now = asyncio.Event()
device_replaced = asyncio.Event()


async def poll_loop():
    global current_state, raw_dps
    while True:
        try:
            result = await asyncio.to_thread(holder.device.poll)
            if result is not None:
                state, raw = result
                raw_dps = raw
                current_state = state.to_dict()

                unknown = {k: v for k, v in raw.items() if k not in KNOWN_DPS}
                if unknown:
                    logger.info("Unknown DPS: %s", unknown)

                humidity_history.append(
                    {
                        "t": int(time.time()),
                        "v": state.humidity_current,
                    }
                )

                broadcast = {
                    **current_state,
                    "humidity_history": list(humidity_history),
                }
                await ws_manager.broadcast(broadcast)
        except Exception as e:
            logger.exception("poll_loop error: %s", e)
        poll_now.clear()
        device_replaced.clear()
        wait_tasks = [
            asyncio.ensure_future(poll_now.wait()),
            asyncio.ensure_future(device_replaced.wait()),
        ]
        try:
            await asyncio.wait_for(
                asyncio.wait(wait_tasks, return_when=asyncio.FIRST_COMPLETED),
                timeout=settings_holder.settings.poll_interval,
            )
        except asyncio.TimeoutError:
            pass
        finally:
            for t in wait_tasks:
                t.cancel()


# ── Multi-device manager (new v1 API) ──

device_manager: DeviceManager | None = None
automation_engine: AutomationEngine | None = None
_prev_faults: dict[int, int] = {}  # device_id -> last fault bitmask


async def execute_automation_action(action_type: str, action_config: dict) -> None:
    """Execute an automation action (e.g. send a device command)."""
    if action_type == "device_command" and device_manager:
        target_id = action_config.get("device_id")
        command = action_config.get("command")
        args = action_config.get("args", {})
        if target_id is not None and command:
            await device_manager.execute_command(target_id, command, args)


async def on_device_update(device_id: int, snapshot, history):
    """Broadcast multi-device updates via WebSocket."""
    global _prev_faults
    managed = device_manager.get(device_id) if device_manager else None
    if managed is None:
        return
    state = device_manager._snapshot_to_dict(managed)
    await ws_manager.broadcast(
        {
            "type": "device_update",
            "device_id": device_id,
            **state,
        }
    )

    # Check fault transitions for notifications
    fault = snapshot.extra.get("fault", 0)
    prev_fault = _prev_faults.get(device_id, 0)
    if fault != prev_fault:
        _prev_faults = {**_prev_faults, device_id: fault}
        await _check_fault_notifications(device_id, managed.name, fault, prev_fault)

    # Evaluate threshold automations
    if automation_engine and snapshot.metrics:
        try:
            triggered = await automation_engine.evaluate_on_poll(
                device_id, snapshot.metrics
            )
            for auto_id in triggered:
                notif = await create_notification(
                    type="automation",
                    title="Automation triggered",
                    message=f"Automation #{auto_id} fired for {managed.name}",
                    device_id=device_id,
                )
                await ws_manager.broadcast({"type": "notification", **notif})
        except Exception as e:
            logger.warning("Automation eval error for device %d: %s", device_id, e)


async def _check_fault_notifications(
    device_id: int, name: str, fault: int, prev_fault: int
):
    """Create notifications for new fault conditions."""
    # Bit 0 = tank full, Bit 1 = defrosting
    tank_now = bool(fault & 1)
    tank_prev = bool(prev_fault & 1)
    defrost_now = bool(fault & 2)
    defrost_prev = bool(prev_fault & 2)

    if tank_now and not tank_prev:
        notif = await create_notification(
            type="alert",
            title="Tank full",
            message=f"{name}: water tank is full",
            device_id=device_id,
        )
        await ws_manager.broadcast({"type": "notification", **notif})

    if defrost_now and not defrost_prev:
        notif = await create_notification(
            type="warning",
            title="Defrosting",
            message=f"{name}: defrost cycle started",
            device_id=device_id,
        )
        await ws_manager.broadcast({"type": "notification", **notif})


async def load_devices_from_db():
    """Load all enabled devices from DB and start polling."""
    global device_manager, automation_engine
    device_manager = DeviceManager(on_update=on_device_update)
    set_manager(device_manager)

    async with async_session() as session:
        result = await session.execute(
            select(DeviceModel).where(DeviceModel.enabled == True)  # noqa: E712
        )
        devices = result.scalars().all()

    for dev in devices:
        try:
            device_manager.add_device(
                db_id=dev.id,
                name=dev.name,
                device_type=dev.device_type,
                is_mock=dev.is_mock,
                poll_interval=dev.poll_interval,
                device_id=dev.device_id,
                device_ip=dev.device_ip,
                local_key=dev.local_key,
            )
        except Exception as e:
            logger.error("Failed to start device %d (%s): %s", dev.id, dev.name, e)

    # Start automation engine
    automation_engine = AutomationEngine(execute_action=execute_automation_action)
    automation_engine.start()

    logger.info("Loaded %d devices from database", len(devices))


# ── Application lifecycle ──


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Init database
    await init_db()

    # Load multi-device system
    await load_devices_from_db()

    # Start daily cleanup for old readings
    if device_manager:
        device_manager.start_cleanup_task()

    # Legacy single-device poll loop
    holder.device.connect()
    legacy_task = asyncio.create_task(poll_loop())

    yield

    # Shutdown
    legacy_task.cancel()
    if automation_engine:
        await automation_engine.stop()
    if device_manager:
        await device_manager.shutdown()


app = FastAPI(lifespan=lifespan)

# CORS for dev mode (Vite dev server on different port)
if os.environ.get("PURIFY_DEV"):
    from fastapi.middleware.cors import CORSMiddleware

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:5173"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


# ── Legacy routes (single device) ──


def get_state():
    return current_state


def get_raw_dps():
    return raw_dps


def get_humidity_history():
    return list(humidity_history)


legacy_router = init_routes(
    holder,
    get_state,
    get_raw_dps,
    get_humidity_history,
    poll_now,
    settings_holder,
    device_replaced,
)
app.include_router(legacy_router)

# ── New v1 API (multi-device) ──
app.include_router(v1_router)


# ── WebSocket ──


@app.websocket("/purify/ws")
async def websocket_endpoint(ws: WebSocket):
    await ws_manager.connect(ws)
    try:
        # Send current legacy state
        if current_state is not None:
            broadcast = {
                **current_state,
                "humidity_history": list(humidity_history),
            }
            await ws.send_json(broadcast)

        # Send all multi-device states
        if device_manager:
            for device_id, state in device_manager.get_all_states().items():
                await ws.send_json(
                    {
                        "type": "device_update",
                        "device_id": device_id,
                        **state,
                    }
                )

        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(ws)


# Serve frontend static files under /purify/ (production only — in dev, Vite serves)
if not os.environ.get("PURIFY_DEV"):
    frontend_dir = Path(__file__).resolve().parent.parent
    app.mount(
        "/purify", StaticFiles(directory=frontend_dir, html=True), name="frontend"
    )
