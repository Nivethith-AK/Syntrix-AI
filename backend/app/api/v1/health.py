from __future__ import annotations

from fastapi import APIRouter
from sqlalchemy import text

from app.core.database import engine
from app.core.config import get_settings

router = APIRouter(tags=["health"])


@router.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "service": get_settings().app_name}


@router.get("/ready")
async def ready() -> dict[str, object]:
    db_ok = False
    redis_ok = False
    detail: dict[str, str] = {}

    try:
        async with engine.connect() as conn:
            await conn.execute(text("select 1"))
        db_ok = True
    except Exception as exc:  # noqa: BLE001 — readiness probe
        detail["database"] = str(exc)

    try:
        import redis

        client = redis.from_url(get_settings().redis_url, socket_connect_timeout=1)
        redis_ok = bool(client.ping())
        client.close()
    except Exception as exc:  # noqa: BLE001
        detail["redis"] = str(exc)

    status = "ready" if db_ok else "degraded"
    return {
        "status": status,
        "database": db_ok,
        "redis": redis_ok,
        "detail": detail,
    }
