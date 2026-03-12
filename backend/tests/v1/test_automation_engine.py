"""Tests for services.automation_engine."""
import json
import time

import pytest

from db.models import Automation
from services.automation_engine import AutomationEngine, _compare


@pytest.fixture(autouse=True)
def _use_test_db(patch_db_session):
    pass


@pytest.fixture()
async def create_automation(db_session):
    """Factory to create automation rows in test DB."""

    async def _create(
        name="Test Auto",
        trigger_type="threshold",
        trigger_config=None,
        action_type="device_command",
        action_config=None,
        cooldown=0,
        enabled=True,
    ):
        auto = Automation(
            name=name,
            trigger_type=trigger_type,
            trigger_config=json.dumps(trigger_config or {}),
            action_type=action_type,
            action_config=json.dumps(action_config or {}),
            cooldown=cooldown,
            enabled=enabled,
        )
        db_session.add(auto)
        await db_session.commit()
        await db_session.refresh(auto)
        return auto

    return _create


class TestCompare:
    def test_greater_than(self):
        assert _compare(70, ">", 60) is True
        assert _compare(60, ">", 60) is False

    def test_greater_equal(self):
        assert _compare(60, ">=", 60) is True
        assert _compare(59, ">=", 60) is False

    def test_less_than(self):
        assert _compare(50, "<", 60) is True
        assert _compare(60, "<", 60) is False

    def test_less_equal(self):
        assert _compare(60, "<=", 60) is True
        assert _compare(61, "<=", 60) is False

    def test_equal(self):
        assert _compare(60, "==", 60) is True
        assert _compare(61, "==", 60) is False

    def test_unknown_operator_returns_false(self):
        assert _compare(60, "!=", 60) is False


class TestEvaluateOnPoll:
    async def test_triggers_matching_automation(self, create_automation):
        action_called = []

        async def execute(action_type, action_config):
            action_called.append((action_type, action_config))

        engine = AutomationEngine(execute)

        await create_automation(
            trigger_config={"device_id": 1, "metric": "humidity_current", "operator": ">", "value": 60},
            action_config={"device_id": 1, "command": "set_power", "args": {"on": True}},
        )

        triggered = await engine.evaluate_on_poll(1, {"humidity_current": 70.0})
        assert len(triggered) == 1
        assert len(action_called) == 1

    async def test_skips_wrong_device(self, create_automation):
        engine = AutomationEngine(lambda *a: None)

        await create_automation(
            trigger_config={"device_id": 1, "metric": "humidity_current", "operator": ">", "value": 60},
        )

        triggered = await engine.evaluate_on_poll(99, {"humidity_current": 70.0})
        assert triggered == []

    async def test_skips_when_threshold_not_met(self, create_automation):
        engine = AutomationEngine(lambda *a: None)

        await create_automation(
            trigger_config={"device_id": 1, "metric": "humidity_current", "operator": ">", "value": 80},
        )

        triggered = await engine.evaluate_on_poll(1, {"humidity_current": 70.0})
        assert triggered == []

    async def test_skips_disabled_automation(self, create_automation):
        engine = AutomationEngine(lambda *a: None)

        await create_automation(
            trigger_config={"device_id": 1, "metric": "humidity_current", "operator": ">", "value": 60},
            enabled=False,
        )

        triggered = await engine.evaluate_on_poll(1, {"humidity_current": 70.0})
        assert triggered == []

    async def test_respects_cooldown(self, create_automation):
        action_count = []

        async def execute(action_type, action_config):
            action_count.append(1)

        engine = AutomationEngine(execute)

        await create_automation(
            trigger_config={"device_id": 1, "metric": "humidity_current", "operator": ">", "value": 60},
            cooldown=9999,
        )

        await engine.evaluate_on_poll(1, {"humidity_current": 70.0})
        await engine.evaluate_on_poll(1, {"humidity_current": 70.0})
        assert len(action_count) == 1  # Second call blocked by cooldown

    async def test_skips_missing_metric(self, create_automation):
        engine = AutomationEngine(lambda *a: None)

        await create_automation(
            trigger_config={"device_id": 1, "metric": "temperature", "operator": ">", "value": 30},
        )

        triggered = await engine.evaluate_on_poll(1, {"humidity_current": 70.0})
        assert triggered == []

    async def test_action_error_does_not_crash(self, create_automation):
        async def execute(action_type, action_config):
            raise RuntimeError("boom")

        engine = AutomationEngine(execute)

        await create_automation(
            trigger_config={"device_id": 1, "metric": "humidity_current", "operator": ">", "value": 60},
        )

        triggered = await engine.evaluate_on_poll(1, {"humidity_current": 70.0})
        assert triggered == []  # Error means not added to triggered
