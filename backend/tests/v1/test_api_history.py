"""Integration tests for the v1 history API."""

import pytest

from db.models import DeviceModel
from services.history_service import write_reading


@pytest.fixture(autouse=True)
def _use_test_db(patch_db_session):
    pass


@pytest.fixture()
async def device_id(db_session):
    device = DeviceModel(name="HistDev", device_type="dehumidifier")
    db_session.add(device)
    await db_session.commit()
    await db_session.refresh(device)
    return device.id


class TestHistoryAPI:
    async def test_get_history(self, api_client, device_id):
        await write_reading(device_id, "humidity_current", 55.0)
        resp = await api_client.get(
            f"/purify/api/v1/devices/{device_id}/history?metric=humidity_current&range=1h"
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["device_id"] == device_id
        assert data["metric"] == "humidity_current"
        assert len(data["data"]) == 1

    async def test_response_shape(self, api_client, device_id):
        await write_reading(device_id, "humidity_current", 42.0)
        resp = await api_client.get(
            f"/purify/api/v1/devices/{device_id}/history?range=1h&resolution=raw"
        )
        data = resp.json()
        assert "data" in data
        assert "range" in data
        point = data["data"][0]
        assert "t" in point
        assert "v" in point

    async def test_empty_history(self, api_client, device_id):
        resp = await api_client.get(
            f"/purify/api/v1/devices/{device_id}/history?metric=nonexistent&range=1h"
        )
        assert resp.status_code == 200
        assert resp.json()["data"] == []
