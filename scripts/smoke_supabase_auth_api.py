"""Create/confirm a demo user in Supabase Auth and hit Syntrix API /me + project create."""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / ".env")

SUPABASE_URL = os.environ["SUPABASE_URL"].rstrip("/")
SERVICE = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
ANON = os.environ["SUPABASE_ANON_KEY"]
API = os.environ.get("NEXT_PUBLIC_API_URL", "http://localhost:8000").rstrip("/")
EMAIL = os.environ.get("SYNTRIX_SMOKE_EMAIL", "syntrix.demo@example.com")
PASSWORD = os.environ.get("SYNTRIX_SMOKE_PASSWORD", "SyntrixDemo123!")


def http(method: str, url: str, headers: dict[str, str], body: dict | None = None) -> tuple[int, dict | str]:
    data = None if body is None else json.dumps(body).encode("utf-8")
    req = urllib.request.Request(url, data=data, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            raw = resp.read().decode("utf-8")
            return resp.status, json.loads(raw) if raw else {}
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode("utf-8")
        try:
            payload: dict | str = json.loads(raw)
        except json.JSONDecodeError:
            payload = raw
        return exc.code, payload


def main() -> int:
    print("supabase:", SUPABASE_URL)
    print("api:", API)

    # Ensure demo user exists (service role)
    status, payload = http(
        "POST",
        f"{SUPABASE_URL}/auth/v1/admin/users",
        {
            "apikey": SERVICE,
            "Authorization": f"Bearer {SERVICE}",
            "Content-Type": "application/json",
        },
        {
            "email": EMAIL,
            "password": PASSWORD,
            "email_confirm": True,
            "user_metadata": {"full_name": "Syntrix Demo"},
        },
    )
    if status in (200, 201):
        print("user created/confirmed")
    else:
        # already exists is fine
        print("admin create status", status, payload)

    status, session = http(
        "POST",
        f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
        {
            "apikey": ANON,
            "Content-Type": "application/json",
        },
        {"email": EMAIL, "password": PASSWORD},
    )
    if status != 200 or not isinstance(session, dict) or "access_token" not in session:
        print("LOGIN_FAILED", status, session)
        return 1
    token = session["access_token"]
    print("login ok")

    status, me = http(
        "GET",
        f"{API}/api/v1/me",
        {"Authorization": f"Bearer {token}", "apikey": ANON},
    )
    if status != 200:
        print("ME_FAILED", status, me)
        return 1
    print("me ok:", me.get("email") if isinstance(me, dict) else me)

    status, project = http(
        "POST",
        f"{API}/api/v1/projects",
        {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        {"name": "Smoke Project", "description": "Created by smoke_supabase_auth_api"},
    )
    if status not in (200, 201):
        print("PROJECT_FAILED", status, project)
        return 1
    print("project ok:", project.get("id") if isinstance(project, dict) else project)
    print("SMOKE_OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
