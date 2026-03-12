from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db.engine import get_session
from db.models import Room
from schemas.rooms import RoomCreate, RoomResponse, RoomUpdate

router = APIRouter(prefix="/rooms", tags=["rooms"])


@router.get("", response_model=list[RoomResponse])
async def list_rooms(session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(Room).order_by(Room.sort_order, Room.id))
    return result.scalars().all()


@router.post("", response_model=RoomResponse, status_code=201)
async def create_room(body: RoomCreate, session: AsyncSession = Depends(get_session)):
    room = Room(name=body.name, icon=body.icon, sort_order=body.sort_order)
    session.add(room)
    await session.commit()
    await session.refresh(room)
    return room


@router.patch("/{room_id}", response_model=RoomResponse)
async def update_room(
    room_id: int,
    body: RoomUpdate,
    session: AsyncSession = Depends(get_session),
):
    room = await session.get(Room, room_id)
    if room is None:
        raise HTTPException(404, "Room not found")
    updates = body.model_dump(exclude_unset=True)
    for key, value in updates.items():
        setattr(room, key, value)
    await session.commit()
    await session.refresh(room)
    return room


@router.delete("/{room_id}", status_code=204)
async def delete_room(room_id: int, session: AsyncSession = Depends(get_session)):
    room = await session.get(Room, room_id)
    if room is None:
        raise HTTPException(404, "Room not found")
    await session.delete(room)
    await session.commit()
