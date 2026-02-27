import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))


class TestGetState:
    def test_returns_state(self, client):
        resp = client.get("/purify/api/state")
        assert resp.status_code == 200
        data = resp.json()
        assert "switch" in data
        assert "humidity_current" in data
        assert "tank_full" in data
        assert "defrosting" in data

    def test_503_when_no_state(self, mock_device):
        import asyncio

        from fastapi import FastAPI
        from fastapi.testclient import TestClient

        from routes import init_routes
        from tests.conftest import DeviceHolder

        poll_now = asyncio.Event()
        holder = DeviceHolder(mock_device)
        router = init_routes(
            holder,
            get_state=lambda: None,
            get_raw_dps=lambda: {},
            get_humidity_history=lambda: [],
            poll_now=poll_now,
        )
        app = FastAPI()
        app.include_router(router)
        c = TestClient(app)
        resp = c.get("/purify/api/state")
        assert resp.status_code == 503


class TestGetRawDps:
    def test_returns_raw_dps(self, client):
        resp = client.get("/purify/api/raw-dps")
        assert resp.status_code == 200
        data = resp.json()
        assert "1" in data


class TestGetHumidityHistory:
    def test_returns_list(self, client):
        resp = client.get("/purify/api/humidity-history")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)


class TestPostPower:
    def test_power_on(self, client):
        resp = client.post("/purify/api/power", json={"on": True})
        assert resp.status_code == 200
        assert resp.json() == {"ok": True}

    def test_invalid_body(self, client):
        resp = client.post("/purify/api/power", json={})
        assert resp.status_code == 422


class TestPostHumidity:
    def test_set_valid_humidity(self, client):
        resp = client.post("/purify/api/humidity", json={"value": 50})
        assert resp.status_code == 200
        assert resp.json() == {"ok": True}

    def test_invalid_not_multiple_of_5(self, client):
        resp = client.post("/purify/api/humidity", json={"value": 42})
        assert resp.status_code == 422

    def test_out_of_range(self, client):
        resp = client.post("/purify/api/humidity", json={"value": 80})
        assert resp.status_code == 422


class TestPostMode:
    def test_set_mode(self, client):
        resp = client.post("/purify/api/mode", json={"mode": "laundry"})
        assert resp.status_code == 200
        assert resp.json() == {"ok": True}

    def test_invalid_mode(self, client):
        resp = client.post("/purify/api/mode", json={"mode": "turbo"})
        assert resp.status_code == 422


class TestPostChildLock:
    def test_toggle_child_lock(self, client):
        resp = client.post("/purify/api/child-lock", json={"on": True})
        assert resp.status_code == 200
        assert resp.json() == {"ok": True}


class TestPostTimer:
    def test_set_timer(self, client):
        resp = client.post("/purify/api/timer", json={"hours": "3h"})
        assert resp.status_code == 200
        assert resp.json() == {"ok": True}

    def test_cancel_timer(self, client):
        resp = client.post("/purify/api/timer", json={"hours": "cancel"})
        assert resp.status_code == 200

    def test_invalid_timer(self, client):
        resp = client.post("/purify/api/timer", json={"hours": "99h"})
        assert resp.status_code == 422


class TestPostOnTimer:
    def test_set_on_timer(self, client):
        resp = client.post("/purify/api/on-timer", json={"hours": "8h"})
        assert resp.status_code == 200
        assert resp.json() == {"ok": True}

    def test_invalid_on_timer(self, client):
        resp = client.post("/purify/api/on-timer", json={"hours": "bad"})
        assert resp.status_code == 422
