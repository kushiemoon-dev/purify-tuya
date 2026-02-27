import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect

from config import settings
from device import create_device
from routes import init_routes
from websocket import ConnectionManager

device = create_device(settings)
manager = ConnectionManager()
current_state: dict | None = None


async def poll_loop():
    global current_state
    while True:
        try:
            state = await asyncio.to_thread(device.poll)
            if state is not None:
                current_state = state.to_dict()
                await manager.broadcast(current_state)
        except Exception:
            pass
        await asyncio.sleep(settings.poll_interval)


@asynccontextmanager
async def lifespan(app: FastAPI):
    device.connect()
    task = asyncio.create_task(poll_loop())
    yield
    task.cancel()


app = FastAPI(lifespan=lifespan)


def get_state():
    return current_state


router = init_routes(device, get_state)
app.include_router(router)


@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await manager.connect(ws)
    if current_state is not None:
        await ws.send_json(current_state)
    try:
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(ws)
