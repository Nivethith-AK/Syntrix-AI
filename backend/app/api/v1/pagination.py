from __future__ import annotations

from fastapi import Query

from app.core.config import get_settings


def pagination_params(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
) -> tuple[int, int]:
    settings = get_settings()
    capped = min(limit, settings.max_page_limit)
    return capped, offset
