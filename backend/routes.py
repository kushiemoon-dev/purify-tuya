import asyncio

from fastapi import APIRouter, HTTPException

from config import SettingsHolder, write_env
from device import Device, MockDevice, create_device
from models import (
    ChildLockRequest,
    PowerRequest,
    SetHumidityRequest,
    SetModeRequest,
    SetOnTimerRequest,
    SetTimerRequest,
    UpdateSettingsRequest,
)


class DeviceHolder:
    device: Device


def init_routes(
    holder: DeviceHolder,
    get_state: callable,
    get_raw_dps: callable,
    get_humidity_history: callable,
    poll_now: asyncio.Event,
    settings_holder: SettingsHolder | None = None,
    device_replaced: asyncio.Event | None = None,
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
        await asyncio.to_thread(holder.device.set_power, req.on)
        poll_now.set()
        return {"ok": True}

    @router.post("/humidity")
    async def humidity(req: SetHumidityRequest):
        await asyncio.to_thread(holder.device.set_humidity, req.value)
        poll_now.set()
        return {"ok": True}

    @router.post("/mode")
    async def mode(req: SetModeRequest):
        await asyncio.to_thread(holder.device.set_mode, req.mode.value)
        poll_now.set()
        return {"ok": True}

    @router.post("/child-lock")
    async def child_lock(req: ChildLockRequest):
        await asyncio.to_thread(holder.device.set_child_lock, req.on)
        poll_now.set()
        return {"ok": True}

    @router.post("/timer")
    async def timer(req: SetTimerRequest):
        await asyncio.to_thread(holder.device.set_countdown, req.hours)
        poll_now.set()
        return {"ok": True}

    @router.post("/on-timer")
    async def on_timer(req: SetOnTimerRequest):
        await asyncio.to_thread(holder.device.set_on_timer, req.hours)
        poll_now.set()
        return {"ok": True}

    if isinstance(holder.device, MockDevice):

        @router.post("/debug/fault")
        async def debug_fault(body: dict):
            holder.device.set_fault(body.get("fault", 0))
            return {"ok": True}

    if settings_holder is not None:

        @router.get("/settings")
        async def get_settings():
            s = settings_holder.settings
            key = s.local_key
            masked_key = (
                (key[:4] + "****" + key[-4:]) if len(key) >= 8 else ("*" * len(key))
            )
            return {
                "device_id": s.device_id,
                "device_ip": s.device_ip,
                "local_key": masked_key,
                "poll_interval": s.poll_interval,
                "mock_device": s.mock_device,
            }

        @router.post("/settings")
        async def post_settings(req: UpdateSettingsRequest):
            current = settings_holder.settings
            local_key = req.local_key if req.local_key else current.local_key

            env_values = {
                "device_id": req.device_id,
                "device_ip": req.device_ip,
                "local_key": local_key,
                "poll_interval": req.poll_interval,
                "mock_device": req.mock_device,
            }
            write_env(env_values)

            settings_holder.reload(
                device_id=req.device_id,
                device_ip=req.device_ip,
                local_key=local_key,
                poll_interval=req.poll_interval,
                mock_device=req.mock_device,
            )

            new_device = create_device(settings_holder.settings)
            new_device.connect()
            holder.device = new_device

            if device_replaced is not None:
                device_replaced.set()

            return {"ok": True}

    return router
