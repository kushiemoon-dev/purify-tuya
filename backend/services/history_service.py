import datetime
import logging

from sqlalchemy import delete, select, text

from db.engine import async_session
from db.models import Reading

logger = logging.getLogger("purify.history")

# Retention policy
RAW_RETENTION_DAYS = 7
AGGREGATE_5M_RETENTION_DAYS = 30
AGGREGATE_1H_RETENTION_DAYS = 365


async def write_reading(device_id: int, metric: str, value: float) -> None:
    """Write a single raw reading."""
    async with async_session() as session:
        reading = Reading(
            device_id=device_id,
            timestamp=datetime.datetime.utcnow(),
            metric=metric,
            value=value,
        )
        session.add(reading)
        await session.commit()


async def write_readings(device_id: int, metrics: dict[str, float]) -> None:
    """Write multiple metrics from a single poll."""
    now = datetime.datetime.utcnow()
    async with async_session() as session:
        for metric, value in metrics.items():
            session.add(
                Reading(
                    device_id=device_id,
                    timestamp=now,
                    metric=metric,
                    value=value,
                )
            )
        await session.commit()


async def get_history(
    device_id: int,
    metric: str,
    range_hours: int = 24,
    resolution_minutes: int | None = None,
) -> list[dict]:
    """
    Get historical readings for a device metric.

    If resolution_minutes is provided, data is averaged into buckets.
    Otherwise, auto-selects resolution based on range:
      - <=1h: raw data
      - <=24h: 5-min buckets
      - <=7d: 30-min buckets
      - >7d: 1-hour buckets
    """
    if resolution_minutes is None:
        if range_hours <= 1:
            resolution_minutes = 0  # raw
        elif range_hours <= 24:
            resolution_minutes = 5
        elif range_hours <= 168:  # 7 days
            resolution_minutes = 30
        else:
            resolution_minutes = 60

    since = datetime.datetime.utcnow() - datetime.timedelta(hours=range_hours)

    async with async_session() as session:
        if resolution_minutes == 0:
            # Raw data
            result = await session.execute(
                select(Reading.timestamp, Reading.value)
                .where(
                    Reading.device_id == device_id,
                    Reading.metric == metric,
                    Reading.timestamp >= since,
                )
                .order_by(Reading.timestamp)
            )
            return [
                {"t": int(row.timestamp.timestamp()), "v": round(row.value, 1)}
                for row in result
            ]

        # Aggregated data — bucket by resolution
        bucket_seconds = resolution_minutes * 60
        # SQLite-compatible floor to bucket
        result = await session.execute(
            text("""
                SELECT
                    CAST(strftime('%s', timestamp) AS INTEGER) / :bucket * :bucket AS bucket_ts,
                    AVG(value) AS avg_value,
                    MIN(value) AS min_value,
                    MAX(value) AS max_value
                FROM readings
                WHERE device_id = :device_id
                  AND metric = :metric
                  AND timestamp >= :since
                GROUP BY bucket_ts
                ORDER BY bucket_ts
            """),
            {
                "bucket": bucket_seconds,
                "device_id": device_id,
                "metric": metric,
                "since": since.isoformat(),
            },
        )
        return [
            {
                "t": row.bucket_ts,
                "v": round(row.avg_value, 1),
                "min": round(row.min_value, 1),
                "max": round(row.max_value, 1),
            }
            for row in result
        ]


async def cleanup_old_readings() -> int:
    """Delete readings older than retention policy. Returns count deleted."""
    cutoff = datetime.datetime.utcnow() - datetime.timedelta(days=RAW_RETENTION_DAYS)
    async with async_session() as session:
        result = await session.execute(
            delete(Reading).where(Reading.timestamp < cutoff)
        )
        await session.commit()
        count = result.rowcount
        if count > 0:
            logger.info(
                "Cleaned up %d old readings (before %s)", count, cutoff.isoformat()
            )
        return count
