"""Diagnose JWT validation against local API (no secrets printed)."""

from __future__ import annotations

import base64
import json
import time
from pathlib import Path

import httpx
from jose import jwt

ROOT = Path(__file__).resolve().parents[1]


def load_env() -> dict[str, str]:
    env: dict[str, str] = {}
    for line in (ROOT / ".env").read_text(encoding="utf-8").splitlines():
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip().strip('"').strip("'")
    return env


def main() -> None:
    env = load_env()
    supabase = env["SUPABASE_URL"].rstrip("/")
    service = env["SUPABASE_SERVICE_ROLE_KEY"]
    anon = env["SUPABASE_ANON_KEY"]
    secret = env.get("SUPABASE_JWT_SECRET", "")
    api = env.get("NEXT_PUBLIC_API_URL", "http://127.0.0.1:8000")
    email = f"smoke_diag_{int(time.time())}@syntrix.local"
    password = "SmokePass_123456!"

    with httpx.Client(timeout=60.0) as client:
        created = client.post(
            f"{supabase}/auth/v1/admin/users",
            headers={
                "apikey": service,
                "Authorization": f"Bearer {service}",
                "Content-Type": "application/json",
            },
            json={"email": email, "password": password, "email_confirm": True},
        )
        print("create_user", created.status_code)
        auth = client.post(
            f"{supabase}/auth/v1/token?grant_type=password",
            headers={"apikey": anon, "Content-Type": "application/json"},
            json={"email": email, "password": password},
        )
        print("login", auth.status_code)
        token = auth.json().get("access_token", "")
        payload = json.loads(base64.urlsafe_b64decode(token.split(".")[1] + "=="))
        print("iss", payload.get("iss"))
        print("aud", payload.get("aud"))
        print("secret_len", len(secret))
        try:
            decoded = jwt.decode(
                token, secret, algorithms=["HS256"], audience="authenticated"
            )
            print("local_decode", "OK", decoded.get("sub", "")[:8])
        except Exception as exc:  # noqa: BLE001
            print("local_decode", type(exc).__name__, str(exc)[:180])
        me = client.get(f"{api}/api/v1/me", headers={"Authorization": f"Bearer {token}"})
        print("api_me", me.status_code, me.text[:220])


if __name__ == "__main__":
    main()
