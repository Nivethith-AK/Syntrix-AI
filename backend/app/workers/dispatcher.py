"""Background task dispatcher.

Routes jobs to Celery workers if Redis/Celery is responsive;
gracefully executes in an in-process daemon thread if Redis is offline.
Ensures zero-downtime, instant response, and seamless local execution without requiring Redis.
"""

from __future__ import annotations

import logging
import socket
import threading
from typing import Any
from urllib.parse import urlparse
from uuid import uuid4

logger = logging.getLogger(__name__)


def _is_redis_online(broker_url: str | None) -> bool:
    if not broker_url:
        return False
    try:
        parsed = urlparse(broker_url)
        host = parsed.hostname or "127.0.0.1"
        port = parsed.port or 6379
        with socket.create_connection((host, port), timeout=0.1):
            return True
    except Exception:
        return False


def dispatch_task(celery_task: Any, *args: Any, **kwargs: Any) -> str:
    """Dispatches a task via Celery if available, or falls back to an in-process thread."""
    from app.core.config import get_settings

    settings = get_settings()
    if _is_redis_online(settings.celery_broker_url):
        try:
            async_result = celery_task.apply_async(args=args, kwargs=kwargs, retry=False)
            return str(async_result.id)
        except Exception as exc:
            logger.warning("Celery apply_async failed (%s). Falling back to in-process thread.", exc)

    task_id = str(uuid4())
    logger.info(
        "Redis/Celery offline. Running '%s' in in-process background thread (id=%s).",
        getattr(celery_task, "name", str(celery_task)),
        task_id,
    )

    def _worker_thread():
        try:
            if hasattr(celery_task, "run"):
                celery_task.run(*args, **kwargs)
            else:
                celery_task(*args, **kwargs)
        except Exception as e:
            logger.exception(
                "In-process background task '%s' failed: %s",
                getattr(celery_task, "name", str(celery_task)),
                e,
            )

    thread = threading.Thread(target=_worker_thread, daemon=True, name=f"InProcessTask-{task_id[:8]}")
    thread.start()
    return task_id
