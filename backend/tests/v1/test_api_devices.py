"""Integration tests for the v1 devices API."""

from unittest.mock import MagicMock

import pytest

from drivers.base import DeviceCapabilities


@pytest.fixture(autouse=True)
def _use_test_db(patch_db_session):
    pass


DEVICE_PAYLOAD = {
    "name": "Test Dehum",
    "device_type": "dehumidifier",
    "is_mock": True,
    "poll_interval": 5,
}


class TestDeviceCRUD:
    async def test_create_device(self, api_client, mock_device_manager):
        mock_device_manager.add_device.return_value = MagicMock()
        resp = await api_client.post("/purify/api/v1/devices", json=DEVICE_PAYLOAD)
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "Test Dehum"
        assert data["device_type"] == "dehumidifier"
        assert data["is_mock"] is True
        assert "id" in data

    async def test_list_devices(self, api_client, mock_device_manager):
        mock_device_manager.add_device.return_value = MagicMock()
        await api_client.post("/purify/api/v1/devices", json=DEVICE_PAYLOAD)
        resp = await api_client.get("/purify/api/v1/devices")
        assert resp.status_code == 200
        assert len(resp.json()) == 1

    async def test_get_device(self, api_client, mock_device_manager):
        mock_device_manager.add_device.return_value = MagicMock()
        create = await api_client.post("/purify/api/v1/devices", json=DEVICE_PAYLOAD)
        device_id = create.json()["id"]
        resp = await api_client.get(f"/purify/api/v1/devices/{device_id}")
        assert resp.status_code == 200
        assert resp.json()["name"] == "Test Dehum"

    async def test_get_device_404(self, api_client):
        resp = await api_client.get("/purify/api/v1/devices/999")
        assert resp.status_code == 404

    async def test_update_device(self, api_client, mock_device_manager):
        mock_device_manager.add_device.return_value = MagicMock()
        create = await api_client.post("/purify/api/v1/devices", json=DEVICE_PAYLOAD)
        device_id = create.json()["id"]
        resp = await api_client.patch(
            f"/purify/api/v1/devices/{device_id}",
            json={"name": "Renamed"},
        )
        assert resp.status_code == 200
        assert resp.json()["name"] == "Renamed"

    async def test_delete_device(self, api_client, mock_device_manager):
        mock_device_manager.add_device.return_value = MagicMock()
        create = await api_client.post("/purify/api/v1/devices", json=DEVICE_PAYLOAD)
        device_id = create.json()["id"]
        resp = await api_client.delete(f"/purify/api/v1/devices/{device_id}")
        assert resp.status_code == 204

        resp = await api_client.get(f"/purify/api/v1/devices/{device_id}")
        assert resp.status_code == 404

    async def test_delete_device_404(self, api_client):
        resp = await api_client.delete("/purify/api/v1/devices/999")
        assert resp.status_code == 404


class TestDeviceState:
    async def test_state_returns_503_when_not_ready(self, api_client):
        resp = await api_client.get("/purify/api/v1/devices/1/state")
        assert resp.status_code == 503

    async def test_state_returns_data(self, api_client, mock_device_manager):
        mock_device_manager.get_state.return_value = {"switch": True, "mode": "manual"}
        resp = await api_client.get("/purify/api/v1/devices/1/state")
        assert resp.status_code == 200
        assert resp.json()["switch"] is True


class TestDeviceCapabilities:
    async def test_capabilities_503_when_not_ready(self, api_client):
        resp = await api_client.get("/purify/api/v1/devices/1/capabilities")
        assert resp.status_code == 503

    async def test_capabilities_returns_data(self, api_client, mock_device_manager):
        caps = DeviceCapabilities(
            metrics=("humidity_current",),
            modes=("manual", "sleep"),
            has_timer=True,
            has_child_lock=True,
            humidity_range=(35, 70),
        )
        managed = MagicMock()
        managed.driver.get_capabilities.return_value = caps
        mock_device_manager.get.return_value = managed

        resp = await api_client.get("/purify/api/v1/devices/1/capabilities")
        assert resp.status_code == 200
        data = resp.json()
        assert data["metrics"] == ["humidity_current"]
        assert data["has_timer"] is True
        assert data["humidity_range"] == [35, 70]


class TestDeviceCommand:
    async def test_command_success(self, api_client, mock_device_manager):
        resp = await api_client.post(
            "/purify/api/v1/devices/1/command",
            json={"command": "set_power", "args": {"on": True}},
        )
        assert resp.status_code == 200
        assert resp.json()["ok"] is True

    async def test_command_unknown_device(self, api_client, mock_device_manager):
        mock_device_manager.execute_command.side_effect = ValueError(
            "Device 1 not found"
        )
        resp = await api_client.post(
            "/purify/api/v1/devices/1/command",
            json={"command": "set_power", "args": {"on": True}},
        )
        assert resp.status_code == 400
