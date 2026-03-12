import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db.engine import get_session
from db.models import Automation
from schemas.automations import AutomationCreate, AutomationResponse, AutomationUpdate

router = APIRouter(prefix="/automations", tags=["automations"])


@router.get("", response_model=list[AutomationResponse])
async def list_automations(session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(Automation).order_by(Automation.id))
    rows = result.scalars().all()
    return [_to_response(a) for a in rows]


@router.get("/{automation_id}", response_model=AutomationResponse)
async def get_automation(automation_id: int, session: AsyncSession = Depends(get_session)):
    auto = await session.get(Automation, automation_id)
    if auto is None:
        raise HTTPException(404, "Automation not found")
    return _to_response(auto)


@router.post("", response_model=AutomationResponse, status_code=201)
async def create_automation(body: AutomationCreate, session: AsyncSession = Depends(get_session)):
    auto = Automation(
        name=body.name,
        trigger_type=body.trigger_type,
        trigger_config=json.dumps(body.trigger_config),
        action_type=body.action_type,
        action_config=json.dumps(body.action_config),
        cooldown=body.cooldown,
        enabled=body.enabled,
    )
    session.add(auto)
    await session.commit()
    await session.refresh(auto)
    return _to_response(auto)


@router.patch("/{automation_id}", response_model=AutomationResponse)
async def update_automation(
    automation_id: int,
    body: AutomationUpdate,
    session: AsyncSession = Depends(get_session),
):
    auto = await session.get(Automation, automation_id)
    if auto is None:
        raise HTTPException(404, "Automation not found")

    updates = body.model_dump(exclude_unset=True)
    for key, value in updates.items():
        if key in ("trigger_config", "action_config"):
            setattr(auto, key, json.dumps(value))
        else:
            setattr(auto, key, value)

    await session.commit()
    await session.refresh(auto)
    return _to_response(auto)


@router.delete("/{automation_id}", status_code=204)
async def delete_automation(automation_id: int, session: AsyncSession = Depends(get_session)):
    auto = await session.get(Automation, automation_id)
    if auto is None:
        raise HTTPException(404, "Automation not found")
    await session.delete(auto)
    await session.commit()


def _to_response(auto: Automation) -> dict:
    return {
        "id": auto.id,
        "name": auto.name,
        "trigger_type": auto.trigger_type,
        "trigger_config": json.loads(auto.trigger_config),
        "action_type": auto.action_type,
        "action_config": json.loads(auto.action_config),
        "cooldown": auto.cooldown,
        "enabled": auto.enabled,
    }
