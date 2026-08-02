"""Configure Supabase Auth custom SMTP via Resend + enable email confirmation.

Requires in repo `.env`:
  RESEND_API_KEY=re_...
  RESEND_FROM_EMAIL=Syntrix AI <onboarding@resend.dev>   # or you@your-verified-domain.com
  SUPABASE_ACCESS_TOKEN=sbp_...   # https://supabase.com/dashboard/account/tokens
  SUPABASE_URL=https://YOUR_REF.supabase.co
"""

from __future__ import annotations

import json
import os
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / ".env")


def _require(name: str) -> str:
    value = (os.environ.get(name) or "").strip()
    if not value:
        raise SystemExit(f"Missing {name} in .env")
    return value


def _project_ref(supabase_url: str) -> str:
    match = re.search(r"https://([a-z0-9-]+)\.supabase\.co", supabase_url)
    if not match:
        raise SystemExit(f"Could not parse project ref from SUPABASE_URL={supabase_url}")
    return match.group(1)


def _patch_auth(project_ref: str, access_token: str, body: dict) -> dict:
    req = urllib.request.Request(
        f"https://api.supabase.com/v1/projects/{project_ref}/config/auth",
        data=json.dumps(body).encode("utf-8"),
        method="PATCH",
        headers={
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
            "User-Agent": "SyntrixAI-SupabaseConfig/1.0",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            return json.loads(resp.read().decode("utf-8") or "{}")
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8")
        raise SystemExit(f"Supabase Management API {exc.code}: {detail}") from exc


def _parse_from_email(raw: str) -> tuple[str, str]:
    """Return (email, sender_name)."""
    raw = raw.strip()
    match = re.match(r"^(.*?)<([^>]+)>$", raw)
    if match:
        name = match.group(1).strip().strip('"') or "Syntrix AI"
        return match.group(2).strip(), name
    if "@" in raw:
        return raw, "Syntrix AI"
    raise SystemExit("RESEND_FROM_EMAIL must be an email or 'Name <email@domain>'")


def main() -> None:
    resend_key = _require("RESEND_API_KEY")
    from_raw = os.environ.get("RESEND_FROM_EMAIL", "Syntrix AI <onboarding@resend.dev>").strip()
    access_token = _require("SUPABASE_ACCESS_TOKEN")
    supabase_url = _require("SUPABASE_URL")
    project_ref = _project_ref(supabase_url)
    admin_email, sender_name = _parse_from_email(from_raw)

    print("project:", project_ref)
    print("smtp_host: smtp.resend.com")
    print("smtp_user: resend")
    print("from:", f"{sender_name} <{admin_email}>")

    result = _patch_auth(
        project_ref,
        access_token,
        {
            "external_email_enabled": True,
            "mailer_autoconfirm": False,
            "mailer_secure_email_change_enabled": True,
            "smtp_admin_email": admin_email,
            "smtp_host": "smtp.resend.com",
            "smtp_port": "465",
            "smtp_user": "resend",
            "smtp_pass": resend_key,
            "smtp_sender_name": sender_name,
            # Custom SMTP unlocks higher limits; 30/hr is Supabase default after enable.
            "rate_limit_email_sent": 100,
        },
    )
    print("configured keys:", sorted(k for k in result.keys() if "smtp" in k or "mailer" in k)[:20])
    print("OK — Supabase Auth will send confirm/reset emails through Resend.")
    print("Tip: without a verified domain, use onboarding@resend.dev and only send to your Resend account email.")


if __name__ == "__main__":
    main()
