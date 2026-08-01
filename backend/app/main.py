"""FastAPI application entrypoint."""

from __future__ import annotations

import sys
from contextlib import asynccontextmanager
from pathlib import Path
from uuid import uuid4

# Ensure monorepo sibling packages resolve under uvicorn --reload on Windows.
_REPO_ROOT = Path(__file__).resolve().parents[2]
for _extra in (_REPO_ROOT / "ml-engine", _REPO_ROOT / "ai-engine", _REPO_ROOT / "mcp"):
    _p = str(_extra)
    if _extra.is_dir() and _p not in sys.path:
        sys.path.insert(0, _p)

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.config import get_settings
from app.core.errors import register_exception_handlers
from app.core.logging import configure_logging


@asynccontextmanager
async def lifespan(_app: FastAPI):
    configure_logging()
    settings = get_settings()
    if settings.app_env == "production":
        settings.require_runtime_secrets()
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title=settings.app_name,
        version="0.1.0",
        lifespan=lifespan,
        docs_url="/docs" if not settings.is_production else None,
        redoc_url=None,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        # Allow Cloudflare quick tunnels + local ports during development demos.
        allow_origin_regex=(
            r"https://.*\.trycloudflare\.com|http://(localhost|127\.0\.0\.1):\d+"
            if not settings.is_production
            else None
        ),
        allow_credentials=True,
        allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "Idempotency-Key"],
    )

    @app.middleware("http")
    async def request_id_middleware(request: Request, call_next):
        request_id = request.headers.get("X-Request-ID", str(uuid4()))
        request.state.request_id = request_id
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response

    register_exception_handlers(app)
    app.include_router(api_router)
    return app


app = create_app()
