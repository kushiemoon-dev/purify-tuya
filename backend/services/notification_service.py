import logging

from sqlalchemy import func, select, update

from db.engine import async_session
from db.models import Notification

logger = logging.getLogger("purify.notifications")


async def create_notification(
    type: str,
    title: str,
    message: str = "",
    device_id: int | None = None,
) -> dict:
    """Create a notification and return it as a dict."""
    async with async_session() as session:
        notif = Notification(
            type=type,
            title=title,
            message=message,
            device_id=device_id,
        )
        session.add(notif)
        await session.commit()
        await session.refresh(notif)
        return _to_dict(notif)


async def get_notifications(
    limit: int = 50,
    unread_only: bool = False,
) -> list[dict]:
    """Get recent notifications."""
    async with async_session() as session:
        query = (
            select(Notification).order_by(Notification.created_at.desc()).limit(limit)
        )
        if unread_only:
            query = query.where(Notification.read == False)  # noqa: E712
        result = await session.execute(query)
        return [_to_dict(n) for n in result.scalars().all()]


async def get_unread_count() -> int:
    """Get count of unread notifications."""
    async with async_session() as session:
        result = await session.execute(
            select(func.count(Notification.id)).where(Notification.read == False)  # noqa: E712
        )
        return result.scalar() or 0


async def mark_read(notification_id: int) -> bool:
    """Mark a single notification as read."""
    async with async_session() as session:
        result = await session.execute(
            update(Notification)
            .where(Notification.id == notification_id)
            .values(read=True)
        )
        await session.commit()
        return result.rowcount > 0


async def mark_all_read() -> int:
    """Mark all notifications as read. Returns count updated."""
    async with async_session() as session:
        result = await session.execute(
            update(Notification)
            .where(Notification.read == False)  # noqa: E712
            .values(read=True)
        )
        await session.commit()
        return result.rowcount


def _to_dict(notif: Notification) -> dict:
    return {
        "id": notif.id,
        "type": notif.type,
        "title": notif.title,
        "message": notif.message,
        "read": notif.read,
        "device_id": notif.device_id,
        "created_at": notif.created_at.isoformat() if notif.created_at else None,
    }
