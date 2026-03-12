"""Integration tests for the v1 rooms API."""
import pytest


@pytest.fixture(autouse=True)
def _use_test_db(patch_db_session):
    pass


ROOM_PAYLOAD = {"name": "Living Room", "icon": "sofa", "sort_order": 1}


class TestRoomCRUD:
    async def test_create_room(self, api_client):
        resp = await api_client.post("/purify/api/v1/rooms", json=ROOM_PAYLOAD)
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "Living Room"
        assert data["icon"] == "sofa"
        assert data["sort_order"] == 1

    async def test_list_rooms(self, api_client):
        await api_client.post("/purify/api/v1/rooms", json=ROOM_PAYLOAD)
        await api_client.post("/purify/api/v1/rooms", json={"name": "Bedroom"})
        resp = await api_client.get("/purify/api/v1/rooms")
        assert resp.status_code == 200
        assert len(resp.json()) == 2

    async def test_update_room(self, api_client):
        create = await api_client.post("/purify/api/v1/rooms", json=ROOM_PAYLOAD)
        room_id = create.json()["id"]
        resp = await api_client.patch(
            f"/purify/api/v1/rooms/{room_id}",
            json={"name": "Renamed Room"},
        )
        assert resp.status_code == 200
        assert resp.json()["name"] == "Renamed Room"

    async def test_update_room_404(self, api_client):
        resp = await api_client.patch("/purify/api/v1/rooms/999", json={"name": "X"})
        assert resp.status_code == 404

    async def test_delete_room(self, api_client):
        create = await api_client.post("/purify/api/v1/rooms", json=ROOM_PAYLOAD)
        room_id = create.json()["id"]
        resp = await api_client.delete(f"/purify/api/v1/rooms/{room_id}")
        assert resp.status_code == 204

    async def test_delete_room_404(self, api_client):
        resp = await api_client.delete("/purify/api/v1/rooms/999")
        assert resp.status_code == 404
