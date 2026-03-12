"""Tests for services.notification_service."""

import pytest

from services.notification_service import (
    create_notification,
    get_notifications,
    get_unread_count,
    mark_all_read,
    mark_read,
)


@pytest.fixture(autouse=True)
def _use_test_db(patch_db_session):
    pass


class TestCreateNotification:
    async def test_returns_dict_with_fields(self):
        result = await create_notification(type="info", title="Test")
        assert result["type"] == "info"
        assert result["title"] == "Test"
        assert result["message"] == ""
        assert result["read"] is False
        assert result["device_id"] is None
        assert "id" in result
        assert "created_at" in result

    async def test_with_device_id(self):
        result = await create_notification(type="fault", title="Alert", device_id=42)
        assert result["device_id"] == 42

    async def test_with_message(self):
        result = await create_notification(
            type="warn", title="T", message="details here"
        )
        assert result["message"] == "details here"


class TestGetNotifications:
    async def test_empty_returns_empty_list(self):
        result = await get_notifications()
        assert result == []

    async def test_returns_notifications_ordered_by_newest_first(self):
        await create_notification(type="info", title="First")
        await create_notification(type="info", title="Second")
        result = await get_notifications()
        assert len(result) == 2
        assert result[0]["title"] == "Second"
        assert result[1]["title"] == "First"

    async def test_limit(self):
        for i in range(5):
            await create_notification(type="info", title=f"N{i}")
        result = await get_notifications(limit=3)
        assert len(result) == 3

    async def test_unread_only(self):
        n = await create_notification(type="info", title="Read me")
        await mark_read(n["id"])
        await create_notification(type="info", title="Unread")
        result = await get_notifications(unread_only=True)
        assert len(result) == 1
        assert result[0]["title"] == "Unread"


class TestGetUnreadCount:
    async def test_zero_when_empty(self):
        assert await get_unread_count() == 0

    async def test_counts_unread(self):
        await create_notification(type="info", title="A")
        await create_notification(type="info", title="B")
        assert await get_unread_count() == 2


class TestMarkRead:
    async def test_marks_single_notification(self):
        n = await create_notification(type="info", title="X")
        ok = await mark_read(n["id"])
        assert ok is True
        assert await get_unread_count() == 0

    async def test_nonexistent_returns_false(self):
        ok = await mark_read(9999)
        assert ok is False


class TestMarkAllRead:
    async def test_marks_all(self):
        await create_notification(type="info", title="A")
        await create_notification(type="info", title="B")
        await create_notification(type="info", title="C")
        count = await mark_all_read()
        assert count == 3
        assert await get_unread_count() == 0

    async def test_returns_zero_when_none_unread(self):
        count = await mark_all_read()
        assert count == 0
