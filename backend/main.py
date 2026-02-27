import asyncio
import logging
import time
from collections import deque
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles

from config import settings
from device import create_device
from routes import init_routes
from websocket import ConnectionManager

logger = logging.getLogger("purify")

KNOWN_DPS = {"1", "2", "4", "14", "16", "17", "18", "19", "101"}
MAX_HISTORY = 60

device = create_device(settings)
manager = ConnectionManager()
current_state: dict | None = None
raw_dps: dict = {}
humidity_history: deque[dict] = deque(maxlen=MAX_HISTORY)
poll_now = asyncio.Event()


async def poll_loop():
    global current_state, raw_dps
    while True:
        try:
            result = await asyncio.to_thread(device.poll)
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
                await manager.broadcast(broadcast)
        except Exception as e:
            logger.exception("poll_loop error: %s", e)
        poll_now.clear()
        try:
            await asyncio.wait_for(poll_now.wait(), timeout=settings.poll_interval)
        except asyncio.TimeoutError:
            pass


@asynccontextmanager
async def lifespan(app: FastAPI):
    device.connect()
    task = asyncio.create_task(poll_loop())
    yield
    task.cancel()


app = FastAPI(lifespan=lifespan)


def get_state():
    return current_state


def get_raw_dps():
    return raw_dps


def get_humidity_history():
    return list(humidity_history)


router = init_routes(device, get_state, get_raw_dps, get_humidity_history, poll_now)
app.include_router(router)


@app.websocket("/purify/ws")
async def websocket_endpoint(ws: WebSocket):
    await manager.connect(ws)
    try:
        if current_state is not None:
            broadcast = {
                **current_state,
                "humidity_history": list(humidity_history),
            }
            await ws.send_json(broadcast)
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(ws)


# Dev mode: serve frontend static files under /purify/
frontend_dir = Path(__file__).resolve().parent.parent
app.mount("/purify", StaticFiles(directory=frontend_dir, html=True), name="frontend")
