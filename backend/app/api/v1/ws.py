"""WebSocket and real-time streaming progress routes (CS-34 SDGP).

Exposes real-time channels:
- WebSocket: /api/v1/ws/workflows/{run_id}
- WebSocket: /api/v1/ws/jobs/{job_id}
- SSE: /api/v1/workflows/{run_id}/events

Pushes observable execution traces, agent activity outcomes, and quality gate evaluations.
"""

from __future__ import annotations

import asyncio
import json
from uuid import UUID

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse

from app.core.events import event_broadcaster

router = APIRouter(tags=["realtime"])


@router.websocket("/ws/workflows/{run_id}")
async def workflow_websocket_endpoint(websocket: WebSocket, run_id: UUID) -> None:
    """Real-time progress WebSocket channel for a workflow run."""
    channel_id = str(run_id)
    await websocket.accept()

    # 1. Send connection acknowledgement
    await websocket.send_json(
        {
            "event_type": "connection_established",
            "channel_id": channel_id,
            "status": "connected",
        }
    )

    # 2. Replay history for fast recovery on page refresh
    history = event_broadcaster.get_history(channel_id)
    for hist_event in history:
        await websocket.send_json(hist_event)

    # 3. Subscribe to live broadcaster queue
    queue = await event_broadcaster.subscribe(channel_id)

    async def _send_events():
        try:
            while True:
                event = await queue.get()
                await websocket.send_json(event)
                if event.get("event_type") in {"workflow_completed", "workflow_failed"}:
                    # Keep socket open briefly for any final flush, but can break if client disconnects
                    pass
        except (WebSocketDisconnect, asyncio.CancelledError):
            pass

    async def _receive_client_messages():
        try:
            while True:
                msg = await websocket.receive_text()
                try:
                    data = json.loads(msg)
                    if data.get("type") == "ping":
                        await websocket.send_json({"type": "pong"})
                except Exception:
                    pass
        except (WebSocketDisconnect, asyncio.CancelledError):
            pass

    sender_task = asyncio.create_task(_send_events())
    receiver_task = asyncio.create_task(_receive_client_messages())

    try:
        done, pending = await asyncio.wait(
            [sender_task, receiver_task],
            return_when=asyncio.FIRST_COMPLETED,
        )
        for t in pending:
            t.cancel()
    finally:
        await event_broadcaster.unsubscribe(channel_id, queue)


@router.websocket("/ws/jobs/{job_id}")
async def job_websocket_endpoint(websocket: WebSocket, job_id: UUID) -> None:
    """Real-time progress WebSocket channel for a job."""
    channel_id = str(job_id)
    await websocket.accept()

    await websocket.send_json(
        {
            "event_type": "connection_established",
            "channel_id": channel_id,
            "status": "connected",
        }
    )

    history = event_broadcaster.get_history(channel_id)
    for hist_event in history:
        await websocket.send_json(hist_event)

    queue = await event_broadcaster.subscribe(channel_id)

    async def _send_events():
        try:
            while True:
                event = await queue.get()
                await websocket.send_json(event)
        except (WebSocketDisconnect, asyncio.CancelledError):
            pass

    async def _receive_client_messages():
        try:
            while True:
                msg = await websocket.receive_text()
                try:
                    data = json.loads(msg)
                    if data.get("type") == "ping":
                        await websocket.send_json({"type": "pong"})
                except Exception:
                    pass
        except (WebSocketDisconnect, asyncio.CancelledError):
            pass

    sender_task = asyncio.create_task(_send_events())
    receiver_task = asyncio.create_task(_receive_client_messages())

    try:
        done, pending = await asyncio.wait(
            [sender_task, receiver_task],
            return_when=asyncio.FIRST_COMPLETED,
        )
        for t in pending:
            t.cancel()
    finally:
        await event_broadcaster.unsubscribe(channel_id, queue)


@router.get("/workflows/{run_id}/events")
async def workflow_sse_endpoint(run_id: UUID) -> StreamingResponse:
    """Server-Sent Events (SSE) streaming progress endpoint for workflow execution."""
    channel_id = str(run_id)

    async def event_generator():
        # Yield connection event
        yield f"event: connected\ndata: {json.dumps({'channel_id': channel_id})}\n\n"

        # Replay history
        history = event_broadcaster.get_history(channel_id)
        already_completed = False
        for hist_event in history:
            yield f"event: {hist_event.get('event_type')}\ndata: {json.dumps(hist_event)}\n\n"
            if hist_event.get("event_type") in {"workflow_completed", "workflow_failed"}:
                already_completed = True

        if already_completed:
            return

        queue = await event_broadcaster.subscribe(channel_id)
        try:
            terminal_types = {"workflow_completed", "workflow_failed"}
            while True:
                try:
                    event = await asyncio.wait_for(queue.get(), timeout=15.0)
                    yield f"event: {event.get('event_type')}\ndata: {json.dumps(event)}\n\n"
                    if event.get("event_type") in terminal_types:
                        break
                except asyncio.TimeoutError:
                    # Send keep-alive heartbeat
                    yield "event: heartbeat\ndata: {}\n\n"
        finally:
            await event_broadcaster.unsubscribe(channel_id, queue)

    return StreamingResponse(event_generator(), media_type="text/event-stream")
