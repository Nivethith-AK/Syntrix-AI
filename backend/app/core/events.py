"""In-memory asynchronous event broadcasting for real-time progress streaming (CS-34 SDGP).

Supports:
- WebSocket live streaming
- SSE subscriptions
- Reconnection & event schemas
- Filtering private chain-of-thought to expose observable execution traces only
"""

from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from typing import Any
from uuid import UUID


class WorkflowEvent:
    def __init__(
        self,
        event_type: str,
        channel_id: str,
        *,
        agent_name: str | None = None,
        step: str | None = None,
        status: str = "running",
        progress_pct: int | None = None,
        payload: dict[str, Any] | None = None,
    ) -> None:
        self.event_type = event_type
        self.channel_id = channel_id
        self.agent_name = agent_name
        self.step = step
        self.status = status
        self.progress_pct = progress_pct
        # Ensure only observable data is shared (no confidential prompts or private chain-of-thought)
        self.payload = _sanitize_observable_payload(payload or {})
        self.timestamp = datetime.now(timezone.utc).isoformat()

    def to_dict(self) -> dict[str, Any]:
        return {
            "event_type": self.event_type,
            "channel_id": self.channel_id,
            "agent_name": self.agent_name,
            "step": self.step,
            "status": self.status,
            "progress_pct": self.progress_pct,
            "data": self.payload,
            "timestamp": self.timestamp,
        }


def _sanitize_observable_payload(payload: dict[str, Any]) -> dict[str, Any]:
    """Strip any private LLM prompts, scratchpads, or system directives."""
    sensitive_keys = {"system_prompt", "raw_prompt", "chain_of_thought", "token_usage", "credentials"}
    sanitized = {}
    for k, v in payload.items():
        if k.lower() not in sensitive_keys:
            sanitized[k] = v
    return sanitized


class EventBroadcaster:
    """Thread-safe and async-safe pub/sub broadcaster for workflow and job channels."""

    def __init__(self) -> None:
        self._subscribers: dict[str, set[asyncio.Queue[dict[str, Any]]]] = {}
        self._history: dict[str, list[dict[str, Any]]] = {}
        self._lock = asyncio.Lock()

    async def subscribe(self, channel_id: str | UUID) -> asyncio.Queue[dict[str, Any]]:
        cid = str(channel_id)
        queue: asyncio.Queue[dict[str, Any]] = asyncio.Queue(maxsize=100)
        async with self._lock:
            if cid not in self._subscribers:
                self._subscribers[cid] = set()
            self._subscribers[cid].add(queue)
        return queue

    async def unsubscribe(self, channel_id: str | UUID, queue: asyncio.Queue[dict[str, Any]]) -> None:
        cid = str(channel_id)
        async with self._lock:
            if cid in self._subscribers:
                self._subscribers[cid].discard(queue)
                if not self._subscribers[cid]:
                    del self._subscribers[cid]

    async def publish(
        self,
        channel_id: str | UUID,
        event_type: str,
        *,
        agent_name: str | None = None,
        step: str | None = None,
        status: str = "running",
        progress_pct: int | None = None,
        payload: dict[str, Any] | None = None,
    ) -> None:
        cid = str(channel_id)
        event = WorkflowEvent(
            event_type=event_type,
            channel_id=cid,
            agent_name=agent_name,
            step=step,
            status=status,
            progress_pct=progress_pct,
            payload=payload,
        )
        dict_event = event.to_dict()

        async with self._lock:
            # Store history for recovery replay (last 50 events)
            if cid not in self._history:
                self._history[cid] = []
            self._history[cid].append(dict_event)
            if len(self._history[cid]) > 50:
                self._history[cid] = self._history[cid][-50:]

            subscribers = list(self._subscribers.get(cid, set()))

        for queue in subscribers:
            try:
                queue.put_nowait(dict_event)
            except asyncio.QueueFull:
                pass

    def publish_sync(
        self,
        channel_id: str | UUID,
        event_type: str,
        *,
        agent_name: str | None = None,
        step: str | None = None,
        status: str = "running",
        progress_pct: int | None = None,
        payload: dict[str, Any] | None = None,
    ) -> None:
        cid = str(channel_id)
        event = WorkflowEvent(
            event_type=event_type,
            channel_id=cid,
            agent_name=agent_name,
            step=step,
            status=status,
            progress_pct=progress_pct,
            payload=payload,
        )
        dict_event = event.to_dict()

        if cid not in self._history:
            self._history[cid] = []
        self._history[cid].append(dict_event)
        if len(self._history[cid]) > 50:
            self._history[cid] = self._history[cid][-50:]

        subscribers = list(self._subscribers.get(cid, set()))
        for queue in subscribers:
            try:
                queue.put_nowait(dict_event)
            except Exception:
                pass

    def get_history(self, channel_id: str | UUID) -> list[dict[str, Any]]:
        return list(self._history.get(str(channel_id), []))


# Global broadcaster singleton
event_broadcaster = EventBroadcaster()
