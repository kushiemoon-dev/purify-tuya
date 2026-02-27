import asyncio

from fastapi import APIRouter, HTTPException

from device import Device, MockDevice
from models import (
    ChildLockRequest,
    PowerRequest,
    SetHumidityRequest,
    SetModeRequest,
    SetOnTimerRequest,
    SetTimerRequest,
)


def init_routes(
    device: Device,
    get_state: callable,
    get_raw_dps: callable,
    get_humidity_history: callable,
    poll_now: asyncio.Event,
) -> APIRouter:
    router = APIRouter(prefix="/purify/api")

    @router.get("/state")
    async def state():
        current = get_state()
        if current is None:
            raise HTTPException(503, "Device not ready")
        return current

    @router.get("/raw-dps")
    async def raw_dps():
        return get_raw_dps()

    @router.get("/humidity-history")
    async def humidity_history():
        return get_humidity_history()

    @router.post("/power")
    async def power(req: PowerRequest):
        await asyncio.to_thread(device.set_power, req.on)
        poll_now.set()
        return {"ok": True}

    @router.post("/humidity")
    async def humidity(req: SetHumidityRequest):
        await asyncio.to_thread(device.set_humidity, req.value)
        poll_now.set()
        return {"ok": True}

    @router.post("/mode")
    async def mode(req: SetModeRequest):
        await asyncio.to_thread(device.set_mode, req.mode.value)
        poll_now.set()
        return {"ok": True}

    @router.post("/child-lock")
    async def child_lock(req: ChildLockRequest):
        await asyncio.to_thread(device.set_child_lock, req.on)
        poll_now.set()
        return {"ok": True}

    @router.post("/timer")
    async def timer(req: SetTimerRequest):
        await asyncio.to_thread(device.set_countdown, req.hours)
        poll_now.set()
        return {"ok": True}

    @router.post("/on-timer")
    async def on_timer(req: SetOnTimerRequest):
        await asyncio.to_thread(device.set_on_timer, req.hours)
        poll_now.set()
        return {"ok": True}

    if isinstance(device, MockDevice):

        @router.post("/debug/fault")
        async def debug_fault(body: dict):
            device.set_fault(body.get("fault", 0))
            return {"ok": True}

    return router
