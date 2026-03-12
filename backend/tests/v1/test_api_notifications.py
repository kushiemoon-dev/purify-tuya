"""Integration tests for the v1 notifications API."""
import pytest

from services.notification_service import create_notification


@pytest.fixture(autouse=True)
def _use_test_db(patch_db_session):
    pass


class TestNotificationsAPI:
    async def test_list_empty(self, api_client):
        resp = await api_client.get("/purify/api/v1/notifications")
        assert resp.status_code == 200
        data = resp.json()
        assert data["notifications"] == []
        assert data["unread_count"] == 0

    async def test_list_with_notifications(self, api_client):
        await create_notification(type="info", title="Test1")
        await create_notification(type="info", title="Test2")
        resp = await api_client.get("/purify/api/v1/notifications")
        data = resp.json()
        assert len(data["notifications"]) == 2
        assert data["unread_count"] == 2

    async def test_mark_read(self, api_client):
        n = await create_notification(type="info", title="ReadMe")
        resp = await api_client.post(f"/purify/api/v1/notifications/{n['id']}/read")
        assert resp.status_code == 200
        assert resp.json()["ok"] is True

        # Verify unread count dropped
        resp = await api_client.get("/purify/api/v1/notifications")
        assert resp.json()["unread_count"] == 0

    async def test_mark_all_read(self, api_client):
        await create_notification(type="info", title="A")
        await create_notification(type="info", title="B")
        resp = await api_client.post("/purify/api/v1/notifications/read-all")
        assert resp.status_code == 200
        assert resp.json()["marked"] == 2

    async def test_limit_param(self, api_client):
        for i in range(5):
            await create_notification(type="info", title=f"N{i}")
        resp = await api_client.get("/purify/api/v1/notifications?limit=2")
        assert len(resp.json()["notifications"]) == 2
