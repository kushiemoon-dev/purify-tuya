"""Shared fixtures for v1 API and service tests."""

import sys
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

# Ensure backend root is importable
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from db.models import Base  # noqa: E402


@pytest.fixture()
async def db_engine():
    """In-memory SQLite engine, tables created once per test."""
    engine = create_async_engine(
        "sqlite+aiosqlite://",
        connect_args={"check_same_thread": False},
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest.fixture()
def _test_session_maker(db_engine):
    """Session maker bound to the in-memory engine."""
    return async_sessionmaker(db_engine, class_=AsyncSession, expire_on_commit=False)


@pytest.fixture()
async def db_session(_test_session_maker):
    """Async session bound to the in-memory engine."""
    async with _test_session_maker() as session:
        yield session


@pytest.fixture()
def patch_db_session(db_engine, _test_session_maker, monkeypatch):
    """Patch async_session everywhere it's been imported."""
    import db.engine as engine_module

    monkeypatch.setattr(engine_module, "async_session", _test_session_maker)

    # Patch the already-imported references in service modules
    import services.notification_service as notif_mod
    import services.history_service as hist_mod
    import services.automation_engine as auto_mod

    monkeypatch.setattr(notif_mod, "async_session", _test_session_maker)
    monkeypatch.setattr(hist_mod, "async_session", _test_session_maker)
    monkeypatch.setattr(auto_mod, "async_session", _test_session_maker)

    return _test_session_maker


@pytest.fixture()
def mock_device_manager():
    """A mock DeviceManager for API tests that don't need real device polling."""
    manager = MagicMock()
    # Sync methods
    manager.get.return_value = None
    manager.get_state.return_value = None
    manager.get_all_states.return_value = {}
    manager.devices = {}
    # Async methods
    manager.remove_device = AsyncMock()
    manager.execute_command = AsyncMock()
    return manager


@pytest.fixture()
async def api_client(db_engine, patch_db_session, mock_device_manager):
    """httpx AsyncClient wired to the v1 FastAPI app with test DB."""
    from fastapi import FastAPI

    from api.v1.devices import set_manager
    from api.v1.router import v1_router

    # Import get_session from the same module the routes use, so the
    # dependency_overrides key matches the exact function object in Depends().
    from db.engine import get_session

    app = FastAPI()
    app.include_router(v1_router)
    set_manager(mock_device_manager)

    # Override FastAPI's get_session dependency with one using test DB
    async def _test_get_session():
        async with patch_db_session() as session:
            yield session

    app.dependency_overrides[get_session] = _test_get_session

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client

    app.dependency_overrides.clear()
