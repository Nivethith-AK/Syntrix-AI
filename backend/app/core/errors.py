"""RFC 7807-inspired problem details and exception handlers."""

from __future__ import annotations

from typing import Any
from uuid import uuid4

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.domain.errors import (
    ConflictError,
    DomainError,
    ForbiddenError,
    NotFoundError,
    PayloadTooLargeError,
)


def problem(
    *,
    status: int,
    title: str,
    detail: str,
    type_: str,
    instance: str,
    request_id: str,
    errors: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    body: dict[str, Any] = {
        "type": type_,
        "title": title,
        "status": status,
        "detail": detail,
        "instance": instance,
        "request_id": request_id,
    }
    if errors:
        body["errors"] = errors
    return body


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(DomainError)
    async def domain_error_handler(request: Request, exc: DomainError) -> JSONResponse:
        request_id = getattr(request.state, "request_id", str(uuid4()))
        status = 400
        type_ = "https://syntrix.local/errors/domain"
        if isinstance(exc, NotFoundError):
            status = 404
            type_ = "https://syntrix.local/errors/not-found"
        elif isinstance(exc, ForbiddenError):
            status = 403
            type_ = "https://syntrix.local/errors/forbidden"
        elif isinstance(exc, ConflictError):
            status = 409
            type_ = "https://syntrix.local/errors/conflict"
        elif isinstance(exc, PayloadTooLargeError):
            status = 413
            type_ = "https://syntrix.local/errors/payload-too-large"
        return JSONResponse(
            status_code=status,
            content=problem(
                status=status,
                title=exc.__class__.__name__,
                detail=str(exc),
                type_=type_,
                instance=str(request.url.path),
                request_id=request_id,
            ),
        )

    @app.exception_handler(StarletteHTTPException)
    async def http_error_handler(
        request: Request, exc: StarletteHTTPException
    ) -> JSONResponse:
        request_id = getattr(request.state, "request_id", str(uuid4()))
        detail = exc.detail if isinstance(exc.detail, str) else str(exc.detail)
        return JSONResponse(
            status_code=exc.status_code,
            content=problem(
                status=exc.status_code,
                title="HTTP Error",
                detail=detail,
                type_=f"https://syntrix.local/errors/http-{exc.status_code}",
                instance=str(request.url.path),
                request_id=request_id,
            ),
        )

    @app.exception_handler(RequestValidationError)
    async def validation_error_handler(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        request_id = getattr(request.state, "request_id", str(uuid4()))
        errors = [
            {
                "field": ".".join(str(p) for p in err.get("loc", [])),
                "message": err.get("msg", "Invalid value"),
            }
            for err in exc.errors()
        ]
        return JSONResponse(
            status_code=422,
            content=problem(
                status=422,
                title="Validation Error",
                detail="Request validation failed",
                type_="https://syntrix.local/errors/validation",
                instance=str(request.url.path),
                request_id=request_id,
                errors=errors,
            ),
        )

    @app.exception_handler(Exception)
    async def unhandled_error_handler(request: Request, exc: Exception) -> JSONResponse:
        import logging

        from app.core.config import get_settings

        request_id = getattr(request.state, "request_id", str(uuid4()))
        logging.getLogger("syntrix").exception(
            "Unhandled error request_id=%s path=%s", request_id, request.url.path
        )
        detail = "An unexpected error occurred"
        if not get_settings().is_production:
            detail = f"{type(exc).__name__}: {exc}"
        return JSONResponse(
            status_code=500,
            content=problem(
                status=500,
                title="Internal Server Error",
                detail=detail,
                type_="https://syntrix.local/errors/internal",
                instance=str(request.url.path),
                request_id=request_id,
            ),
        )
