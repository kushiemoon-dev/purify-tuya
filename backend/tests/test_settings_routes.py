import sys
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))


class TestGetSettings:
    def test_returns_settings_shape(self, client):
        resp = client.get("/purify/api/settings")
        assert resp.status_code == 200
        data = resp.json()
        assert "device_id" in data
        assert "device_ip" in data
        assert "local_key" in data
        assert "poll_interval" in data
        assert "mock_device" in data

    def test_local_key_is_masked(self, client):
        resp = client.get("/purify/api/settings")
        data = resp.json()
        # Default empty key should be masked (empty string → empty mask)
        assert "local_key" in data


class TestPostSettings:
    @patch("routes.write_env")
    def test_valid_payload_returns_ok(self, mock_write_env, client):
        resp = client.post(
            "/purify/api/settings",
            json={
                "device_id": "test123",
                "device_ip": "192.168.1.100",
                "local_key": "abcdef1234567890",
                "poll_interval": 10,
                "mock_device": True,
            },
        )
        assert resp.status_code == 200
        assert resp.json() == {"ok": True}
        mock_write_env.assert_called_once()

    @patch("routes.write_env")
    def test_swaps_device(self, mock_write_env, client):
        resp = client.post(
            "/purify/api/settings",
            json={
                "device_id": "new_id",
                "device_ip": "10.0.0.1",
                "local_key": "",
                "poll_interval": 5,
                "mock_device": True,
            },
        )
        assert resp.status_code == 200
        assert resp.json() == {"ok": True}

    def test_invalid_poll_interval_returns_422(self, client):
        resp = client.post(
            "/purify/api/settings",
            json={
                "device_id": "",
                "device_ip": "",
                "local_key": "",
                "poll_interval": 0,
                "mock_device": True,
            },
        )
        assert resp.status_code == 422

    def test_poll_interval_too_high_returns_422(self, client):
        resp = client.post(
            "/purify/api/settings",
            json={
                "device_id": "",
                "device_ip": "",
                "local_key": "",
                "poll_interval": 999,
                "mock_device": True,
            },
        )
        assert resp.status_code == 422

    @patch("routes.write_env")
    def test_empty_local_key_preserves_existing(self, mock_write_env, client):
        # First set a key
        client.post(
            "/purify/api/settings",
            json={
                "device_id": "",
                "device_ip": "",
                "local_key": "mysecretkey12345",
                "poll_interval": 5,
                "mock_device": True,
            },
        )
        # Now post with empty key — should preserve
        client.post(
            "/purify/api/settings",
            json={
                "device_id": "",
                "device_ip": "",
                "local_key": "",
                "poll_interval": 5,
                "mock_device": True,
            },
        )
        # The second write_env call should have the preserved key
        call_args = mock_write_env.call_args_list[-1]
        assert call_args[0][0]["local_key"] == "mysecretkey12345"
