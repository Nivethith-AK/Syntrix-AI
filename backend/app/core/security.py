"""Supabase JWT validation (ES256 JWKS primary, HS256 secret fallback)."""

from __future__ import annotations

import base64
import json
from dataclasses import dataclass
from functools import lru_cache
from typing import Any
from uuid import UUID

import jwt
from fastapi import HTTPException, status

from app.core.config import get_settings

# Allow client/server clock skew for Supabase ES256 iat/exp checks.
# This machine was observed ~1h behind Supabase; keep a generous demo leeway.
_JWT_LEEWAY_SECONDS = 7200


@dataclass(frozen=True, slots=True)
class AuthUser:
    id: UUID
    email: str | None
    claims: dict[str, Any]


def _token_header(token: str) -> dict[str, Any]:
    try:
        header_b64 = token.split(".", 1)[0]
        pad = "=" * (-len(header_b64) % 4)
        return json.loads(base64.urlsafe_b64decode(header_b64 + pad))
    except Exception:  # noqa: BLE001
        return {}


@lru_cache(maxsize=4)
def _jwks_client(supabase_url: str) -> jwt.PyJWKClient:
    url = f"{supabase_url.rstrip('/')}/auth/v1/.well-known/jwks.json"
    return jwt.PyJWKClient(url, cache_keys=True)


def _decode_es256(token: str, supabase_url: str) -> dict[str, Any]:
    client = _jwks_client(supabase_url)
    key = client.get_signing_key_from_jwt(token)
    return jwt.decode(
        token,
        key.key,
        algorithms=["ES256"],
        audience="authenticated",
        leeway=_JWT_LEEWAY_SECONDS,
        options={"verify_aud": True},
    )


def _decode_hs256(token: str, secret: str) -> dict[str, Any]:
    return jwt.decode(
        token,
        secret,
        algorithms=["HS256"],
        audience="authenticated",
        leeway=_JWT_LEEWAY_SECONDS,
        options={"verify_aud": True},
    )


def decode_supabase_jwt(token: str) -> AuthUser:
    settings = get_settings()
    alg = str(_token_header(token).get("alg") or "HS256").upper()
    payload: dict[str, Any] | None = None

    if alg == "ES256":
        if not settings.supabase_url:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="SUPABASE_URL is not configured for JWKS validation",
            )
        try:
            payload = _decode_es256(token, settings.supabase_url)
        except Exception:  # noqa: BLE001
            payload = None
            if settings.supabase_jwt_secret:
                try:
                    payload = _decode_hs256(token, settings.supabase_jwt_secret)
                except Exception:  # noqa: BLE001
                    payload = None
    else:
        if not settings.supabase_jwt_secret:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="SUPABASE_JWT_SECRET is not configured",
            )
        try:
            payload = _decode_hs256(token, settings.supabase_jwt_secret)
        except Exception:  # noqa: BLE001
            payload = None
            if settings.supabase_url:
                try:
                    payload = _decode_es256(token, settings.supabase_url)
                except Exception:  # noqa: BLE001
                    payload = None

    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    sub = payload.get("sub")
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing subject",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        user_id = UUID(str(sub))
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid subject claim",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    return AuthUser(id=user_id, email=payload.get("email"), claims=payload)
