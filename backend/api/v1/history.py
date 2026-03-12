from fastapi import APIRouter, Query

from services.history_service import get_history

router = APIRouter(tags=["history"])

RANGE_MAP = {
    "1h": 1,
    "24h": 24,
    "7d": 168,
    "30d": 720,
}

RESOLUTION_MAP = {
    "raw": 0,
    "1m": 1,
    "5m": 5,
    "15m": 15,
    "30m": 30,
    "1h": 60,
}


@router.get("/devices/{device_id}/history")
async def device_history(
    device_id: int,
    metric: str = Query(default="humidity_current"),
    range: str = Query(default="24h"),
    resolution: str | None = Query(default=None),
):
    range_hours = RANGE_MAP.get(range)
    if range_hours is None:
        range_hours = 24

    res_minutes = None
    if resolution is not None:
        res_minutes = RESOLUTION_MAP.get(resolution)

    data = await get_history(
        device_id=device_id,
        metric=metric,
        range_hours=range_hours,
        resolution_minutes=res_minutes,
    )
    return {"device_id": device_id, "metric": metric, "range": range, "data": data}
