"""Tests for services.history_service."""

import datetime

import pytest
from sqlalchemy import select

from db.models import DeviceModel, Reading
from services.history_service import (
    cleanup_old_readings,
    get_history,
    write_reading,
    write_readings,
)


@pytest.fixture(autouse=True)
def _use_test_db(patch_db_session):
    pass


@pytest.fixture()
async def device_id(db_session):
    """Create a device in the test DB and return its id."""
    device = DeviceModel(name="TestDev", device_type="dehumidifier")
    db_session.add(device)
    await db_session.commit()
    await db_session.refresh(device)
    return device.id


class TestWriteReading:
    async def test_writes_single_reading(self, device_id, db_session):
        await write_reading(device_id, "humidity_current", 55.0)
        result = await db_session.execute(select(Reading))
        readings = result.scalars().all()
        assert len(readings) == 1
        assert readings[0].metric == "humidity_current"
        assert readings[0].value == 55.0


class TestWriteReadings:
    async def test_writes_multiple_metrics(self, device_id, db_session):
        await write_readings(device_id, {"humidity_current": 55.0, "temperature": 22.5})
        result = await db_session.execute(
            select(Reading).where(Reading.device_id == device_id)
        )
        readings = result.scalars().all()
        assert len(readings) == 2
        metrics = {r.metric for r in readings}
        assert metrics == {"humidity_current", "temperature"}


class TestGetHistory:
    async def test_raw_data_for_short_range(self, device_id):
        await write_reading(device_id, "humidity_current", 50.0)
        await write_reading(device_id, "humidity_current", 55.0)
        result = await get_history(device_id, "humidity_current", range_hours=1)
        assert len(result) == 2
        assert "t" in result[0]
        assert "v" in result[0]

    async def test_aggregated_data_for_24h_range(self, device_id):
        # Write a few readings
        for v in [50.0, 55.0, 60.0]:
            await write_reading(device_id, "humidity_current", v)
        result = await get_history(device_id, "humidity_current", range_hours=24)
        # Should be aggregated into 5-min buckets
        assert len(result) >= 1
        assert "v" in result[0]
        assert "min" in result[0]
        assert "max" in result[0]

    async def test_explicit_raw_resolution(self, device_id):
        await write_reading(device_id, "humidity_current", 42.0)
        result = await get_history(
            device_id, "humidity_current", range_hours=24, resolution_minutes=0
        )
        assert len(result) == 1
        assert result[0]["v"] == 42.0

    async def test_auto_resolution_7d(self, device_id):
        await write_reading(device_id, "humidity_current", 42.0)
        result = await get_history(device_id, "humidity_current", range_hours=168)
        # 30-min buckets
        assert isinstance(result, list)

    async def test_empty_returns_empty_list(self, device_id):
        result = await get_history(device_id, "nonexistent", range_hours=1)
        assert result == []


class TestCleanupOldReadings:
    async def test_deletes_old_readings(self, device_id, db_session):
        # Insert an old reading directly
        old_reading = Reading(
            device_id=device_id,
            timestamp=datetime.datetime.utcnow() - datetime.timedelta(days=10),
            metric="humidity_current",
            value=50.0,
        )
        db_session.add(old_reading)
        await db_session.commit()

        count = await cleanup_old_readings()
        assert count == 1

    async def test_keeps_recent_readings(self, device_id):
        await write_reading(device_id, "humidity_current", 50.0)
        count = await cleanup_old_readings()
        assert count == 0
