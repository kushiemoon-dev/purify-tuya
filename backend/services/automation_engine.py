import asyncio
import json
import logging
import time

from sqlalchemy import select

from db.engine import async_session
from db.models import Automation

logger = logging.getLogger("purify.automation")


class AutomationEngine:
    """Evaluates threshold and schedule-based automation rules."""

    def __init__(self, execute_action):
        self._execute_action = execute_action  # async (action_type, action_config) -> None
        self._last_triggered: dict[int, float] = {}  # automation_id -> timestamp
        self._schedule_task: asyncio.Task | None = None

    def start(self) -> None:
        self._schedule_task = asyncio.create_task(self._schedule_loop())

    async def stop(self) -> None:
        if self._schedule_task:
            self._schedule_task.cancel()
            try:
                await self._schedule_task
            except asyncio.CancelledError:
                pass

    async def evaluate_on_poll(self, device_id: int, metrics: dict[str, float]) -> list[int]:
        """Evaluate threshold automations after a device poll. Returns triggered automation IDs."""
        triggered = []
        async with async_session() as session:
            result = await session.execute(
                select(Automation).where(
                    Automation.enabled == True,  # noqa: E712
                    Automation.trigger_type == "threshold",
                )
            )
            automations = result.scalars().all()

        now = time.time()
        for auto in automations:
            trigger = json.loads(auto.trigger_config)

            # Check if this automation targets this device
            if trigger.get("device_id") != device_id:
                continue

            metric = trigger.get("metric", "humidity_current")
            operator = trigger.get("operator", ">")
            threshold = trigger.get("value", 0)

            current_value = metrics.get(metric)
            if current_value is None:
                continue

            if not _compare(current_value, operator, threshold):
                continue

            # Check cooldown
            last = self._last_triggered.get(auto.id, 0)
            if now - last < auto.cooldown:
                continue

            # Fire action
            action_config = json.loads(auto.action_config)
            try:
                await self._execute_action(auto.action_type, action_config)
                self._last_triggered = {**self._last_triggered, auto.id: now}
                triggered.append(auto.id)
                logger.info(
                    "Automation %d (%s) triggered: %s %s %s (value=%s)",
                    auto.id, auto.name, metric, operator, threshold, current_value,
                )
            except Exception as e:
                logger.error("Automation %d action failed: %s", auto.id, e)

        return triggered

    async def _schedule_loop(self) -> None:
        """Check schedule-based automations every 60s."""
        while True:
            try:
                await asyncio.sleep(60)
                await self._evaluate_schedules()
            except asyncio.CancelledError:
                raise
            except Exception as e:
                logger.exception("Schedule evaluation error: %s", e)

    async def _evaluate_schedules(self) -> None:
        async with async_session() as session:
            result = await session.execute(
                select(Automation).where(
                    Automation.enabled == True,  # noqa: E712
                    Automation.trigger_type == "schedule",
                )
            )
            automations = result.scalars().all()

        now = time.time()
        import datetime
        current_time = datetime.datetime.now()
        current_hhmm = current_time.strftime("%H:%M")
        current_weekday = current_time.weekday()  # 0=Monday

        for auto in automations:
            trigger = json.loads(auto.trigger_config)

            # Check time match
            schedule_time = trigger.get("time", "")
            if schedule_time != current_hhmm:
                continue

            # Check day of week (if specified)
            days = trigger.get("days")
            if days is not None and current_weekday not in days:
                continue

            # Check cooldown
            last = self._last_triggered.get(auto.id, 0)
            if now - last < auto.cooldown:
                continue

            action_config = json.loads(auto.action_config)
            try:
                await self._execute_action(auto.action_type, action_config)
                self._last_triggered = {**self._last_triggered, auto.id: now}
                logger.info("Schedule automation %d (%s) triggered at %s", auto.id, auto.name, current_hhmm)
            except Exception as e:
                logger.error("Schedule automation %d action failed: %s", auto.id, e)


def _compare(value: float, operator: str, threshold: float) -> bool:
    if operator == ">":
        return value > threshold
    if operator == ">=":
        return value >= threshold
    if operator == "<":
        return value < threshold
    if operator == "<=":
        return value <= threshold
    if operator == "==":
        return value == threshold
    return False
