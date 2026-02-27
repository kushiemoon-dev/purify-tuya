import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from device import MockDevice


class DeviceHolder:
    def __init__(self, device):
        self.device = device


@pytest.fixture
def mock_device():
    return MockDevice()


@pytest.fixture
def app(mock_device):
    import asyncio
    from collections import deque

    from fastapi import FastAPI

    from config import SettingsHolder
    from routes import init_routes

    state_holder = {"state": None, "raw_dps": {}, "history": deque(maxlen=60)}

    poll_now = asyncio.Event()
    device_replaced = asyncio.Event()
    sh = SettingsHolder()
    holder = DeviceHolder(mock_device)

    result = mock_device.poll()
    if result is not None:
        device_state, raw = result
        state_holder["state"] = device_state.to_dict()
        state_holder["raw_dps"] = raw

    router = init_routes(
        holder,
        get_state=lambda: state_holder["state"],
        get_raw_dps=lambda: state_holder["raw_dps"],
        get_humidity_history=lambda: list(state_holder["history"]),
        poll_now=poll_now,
        settings_holder=sh,
        device_replaced=device_replaced,
    )

    test_app = FastAPI()
    test_app.include_router(router)
    return test_app


@pytest.fixture
def client(app):
    return TestClient(app)
