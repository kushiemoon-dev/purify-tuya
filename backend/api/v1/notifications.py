from fastapi import APIRouter, Query

from services.notification_service import (
    get_notifications,
    get_unread_count,
    mark_all_read,
    mark_read,
)

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("")
async def list_notifications(
    limit: int = Query(default=50, ge=1, le=200),
    unread_only: bool = Query(default=False),
):
    notifications = await get_notifications(limit=limit, unread_only=unread_only)
    unread = await get_unread_count()
    return {"notifications": notifications, "unread_count": unread}


@router.post("/{notification_id}/read")
async def read_notification(notification_id: int):
    ok = await mark_read(notification_id)
    return {"ok": ok}


@router.post("/read-all")
async def read_all_notifications():
    count = await mark_all_read()
    return {"marked": count}
