"""Integration tests for the v1 automations API."""

import pytest


@pytest.fixture(autouse=True)
def _use_test_db(patch_db_session):
    pass


AUTO_PAYLOAD = {
    "name": "High Humidity Alert",
    "trigger_type": "threshold",
    "trigger_config": {
        "device_id": 1,
        "metric": "humidity_current",
        "operator": ">",
        "value": 70,
    },
    "action_type": "device_command",
    "action_config": {"device_id": 1, "command": "set_power", "args": {"on": True}},
    "cooldown": 300,
    "enabled": True,
}


class TestAutomationCRUD:
    async def test_create_automation(self, api_client):
        resp = await api_client.post("/purify/api/v1/automations", json=AUTO_PAYLOAD)
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "High Humidity Alert"
        assert data["trigger_config"]["operator"] == ">"
        assert data["action_config"]["command"] == "set_power"

    async def test_list_automations(self, api_client):
        await api_client.post("/purify/api/v1/automations", json=AUTO_PAYLOAD)
        resp = await api_client.get("/purify/api/v1/automations")
        assert resp.status_code == 200
        assert len(resp.json()) == 1

    async def test_get_automation(self, api_client):
        create = await api_client.post("/purify/api/v1/automations", json=AUTO_PAYLOAD)
        auto_id = create.json()["id"]
        resp = await api_client.get(f"/purify/api/v1/automations/{auto_id}")
        assert resp.status_code == 200
        assert resp.json()["name"] == "High Humidity Alert"

    async def test_get_automation_404(self, api_client):
        resp = await api_client.get("/purify/api/v1/automations/999")
        assert resp.status_code == 404

    async def test_update_automation(self, api_client):
        create = await api_client.post("/purify/api/v1/automations", json=AUTO_PAYLOAD)
        auto_id = create.json()["id"]
        resp = await api_client.patch(
            f"/purify/api/v1/automations/{auto_id}",
            json={"name": "Renamed", "cooldown": 600},
        )
        assert resp.status_code == 200
        assert resp.json()["name"] == "Renamed"
        assert resp.json()["cooldown"] == 600

    async def test_delete_automation(self, api_client):
        create = await api_client.post("/purify/api/v1/automations", json=AUTO_PAYLOAD)
        auto_id = create.json()["id"]
        resp = await api_client.delete(f"/purify/api/v1/automations/{auto_id}")
        assert resp.status_code == 204

    async def test_delete_automation_404(self, api_client):
        resp = await api_client.delete("/purify/api/v1/automations/999")
        assert resp.status_code == 404

    async def test_json_configs_roundtrip(self, api_client):
        """Ensure trigger_config/action_config are stored as JSON and returned as dicts."""
        create = await api_client.post("/purify/api/v1/automations", json=AUTO_PAYLOAD)
        data = create.json()
        assert isinstance(data["trigger_config"], dict)
        assert isinstance(data["action_config"], dict)
        assert data["trigger_config"]["value"] == 70
