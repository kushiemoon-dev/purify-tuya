from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from db.engine import get_session
from db.models import DeviceModel, Notification, Reading
from schemas.devices import CommandRequest, DeviceCreate, DeviceResponse, DeviceUpdate
from services.device_manager import DeviceManager

router = APIRouter(prefix="/devices", tags=["devices"])

# Injected at startup
_manager: DeviceManager | None = None


def set_manager(manager: DeviceManager) -> None:
    global _manager
    _manager = manager


def get_manager() -> DeviceManager:
    if _manager is None:
        raise RuntimeError("DeviceManager not initialized")
    return _manager


@router.get("", response_model=list[DeviceResponse])
async def list_devices(session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(DeviceModel).order_by(DeviceModel.id))
    return result.scalars().all()


@router.get("/{device_id}", response_model=DeviceResponse)
async def get_device(device_id: int, session: AsyncSession = Depends(get_session)):
    device = await session.get(DeviceModel, device_id)
    if device is None:
        raise HTTPException(404, "Device not found")
    return device


@router.post("", response_model=DeviceResponse, status_code=201)
async def create_device(body: DeviceCreate, session: AsyncSession = Depends(get_session)):
    device = DeviceModel(
        name=body.name,
        device_type=body.device_type,
        device_id=body.device_id,
        device_ip=body.device_ip,
        local_key=body.local_key,
        poll_interval=body.poll_interval,
        is_mock=body.is_mock,
        room_id=body.room_id,
    )
    session.add(device)
    await session.commit()
    await session.refresh(device)

    manager = get_manager()
    manager.add_device(
        db_id=device.id,
        name=device.name,
        device_type=device.device_type,
        is_mock=device.is_mock,
        poll_interval=device.poll_interval,
        device_id=device.device_id,
        device_ip=device.device_ip,
        local_key=device.local_key,
    )
    return device


@router.patch("/{device_id}", response_model=DeviceResponse)
async def update_device(
    device_id: int,
    body: DeviceUpdate,
    session: AsyncSession = Depends(get_session),
):
    device = await session.get(DeviceModel, device_id)
    if device is None:
        raise HTTPException(404, "Device not found")

    updates = body.model_dump(exclude_unset=True)
    for key, value in updates.items():
        setattr(device, key, value)
    await session.commit()
    await session.refresh(device)

    # Restart polling with new config
    manager = get_manager()
    await manager.remove_device(device_id)
    if device.enabled:
        manager.add_device(
            db_id=device.id,
            name=device.name,
            device_type=device.device_type,
            is_mock=device.is_mock,
            poll_interval=device.poll_interval,
            device_id=device.device_id,
            device_ip=device.device_ip,
            local_key=device.local_key,
        )
    return device


@router.delete("/{device_id}", status_code=204)
async def delete_device(device_id: int, session: AsyncSession = Depends(get_session)):
    device = await session.get(DeviceModel, device_id)
    if device is None:
        raise HTTPException(404, "Device not found")

    manager = get_manager()
    await manager.remove_device(device_id)

    await session.execute(delete(Reading).where(Reading.device_id == device_id))
    await session.execute(delete(Notification).where(Notification.device_id == device_id))
    await session.delete(device)
    await session.commit()


@router.get("/{device_id}/capabilities")
async def device_capabilities(device_id: int):
    manager = get_manager()
    managed = manager.get(device_id)
    if managed is None:
        raise HTTPException(503, "Device not ready")
    caps = managed.driver.get_capabilities()
    return {
        "device_id": device_id,
        "metrics": list(caps.metrics),
        "modes": list(caps.modes),
        "has_timer": caps.has_timer,
        "has_on_timer": caps.has_on_timer,
        "has_child_lock": caps.has_child_lock,
        "has_fault": caps.has_fault,
        "humidity_range": list(caps.humidity_range) if caps.humidity_range else None,
        "extra": caps.extra,
    }


@router.get("/{device_id}/state")
async def device_state(device_id: int):
    manager = get_manager()
    state = manager.get_state(device_id)
    if state is None:
        raise HTTPException(503, "Device not ready")
    return state


@router.post("/{device_id}/command")
async def device_command(device_id: int, body: CommandRequest):
    manager = get_manager()
    try:
        await manager.execute_command(device_id, body.command, body.args)
    except ValueError as e:
        raise HTTPException(400, str(e))
    return {"ok": True}
