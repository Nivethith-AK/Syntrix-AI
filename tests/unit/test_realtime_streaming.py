"""Unit tests for WebSocket and SSE real-time progress streaming (CS-34 SDGP).

Verifies:
- EventBroadcaster pub/sub mechanics and history caching
- Observable trace filtering (sensitive LLM prompts stripped)
- WebSocket connection and real-time message delivery
- SSE endpoint streaming
"""

from __future__ import annotations

import asyncio
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.core.events import EventBroadcaster, WorkflowEvent
from app.main import app


def test_event_broadcaster_pub_sub() -> None:
    async def _runner():
        broadcaster = EventBroadcaster()
        channel_id = str(uuid4())

        queue = await broadcaster.subscribe(channel_id)

        # Publish an agent activity
        await broadcaster.publish(
            channel_id,
            "agent_activity",
            agent_name="quality_validation_agent",
            step="quality_gate",
            status="succeeded",
            payload={"quality_score": 92.5, "system_prompt": "CONFIDENTIAL DO NOT LEAK"},
        )

        event = await asyncio.wait_for(queue.get(), timeout=2.0)
        assert event["event_type"] == "agent_activity"
        assert event["agent_name"] == "quality_validation_agent"
        assert event["data"]["quality_score"] == 92.5
        # Verify sensitive system prompt was stripped
        assert "system_prompt" not in event["data"]

        # History replay check
        history = broadcaster.get_history(channel_id)
        assert len(history) == 1
        assert history[0]["event_type"] == "agent_activity"

        await broadcaster.unsubscribe(channel_id, queue)

    asyncio.run(_runner())


def test_websocket_realtime_workflow_connection() -> None:
    client = TestClient(app)
    run_id = uuid4()

    with client.websocket_connect(f"/api/v1/ws/workflows/{run_id}") as websocket:
        # First message is connection established
        data = websocket.receive_json()
        assert data["event_type"] == "connection_established"
        assert data["channel_id"] == str(run_id)

        # Send ping
        websocket.send_text('{"type": "ping"}')
        response = websocket.receive_json()
        assert response["type"] == "pong"


def test_sse_streaming_endpoint() -> None:
    client = TestClient(app)
    run_id = uuid4()

    # Pre-populate history
    from app.core.events import event_broadcaster
    event_broadcaster.publish_sync(
        run_id,
        "agent_activity",
        agent_name="profiling_prep_agent",
        step="clean_and_prepare",
        payload={"records_cleaned": 50},
    )
    # End event to allow stream to complete
    event_broadcaster.publish_sync(
        run_id,
        "workflow_completed",
        step="complete",
        status="succeeded",
        progress_pct=100,
    )

    with client.stream("GET", f"/api/v1/workflows/{run_id}/events") as response:
        assert response.status_code == 200
        assert "text/event-stream" in response.headers["content-type"]
        text_content = ""
        for line in response.iter_lines():
            text_content += line + "\n"
        assert "event: connected" in text_content
        assert "event: agent_activity" in text_content
        assert "event: workflow_completed" in text_content
