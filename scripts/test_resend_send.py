"""Send a one-off test email through Resend to verify the API key works."""

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


def main() -> int:
    api_key = (os.environ.get("RESEND_API_KEY") or "").strip()
    from_email = (os.environ.get("RESEND_FROM_EMAIL") or "Syntrix AI <onboarding@resend.dev>").strip()
    to_email = (sys.argv[1] if len(sys.argv) > 1 else os.environ.get("RESEND_TEST_TO") or "").strip()
    if not api_key:
        print("Missing RESEND_API_KEY in .env")
        return 1
    if not to_email:
        print("Usage: uv run python scripts/test_resend_send.py you@example.com")
        return 1

    body = {
        "from": from_email,
        "to": [to_email],
        "subject": "Syntrix AI — Resend SMTP test",
        "html": "<p>Resend is working for Syntrix AI auth emails.</p>",
    }
    req = urllib.request.Request(
        "https://api.resend.com/emails",
        data=json.dumps(body).encode("utf-8"),
        method="POST",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            # Cloudflare sometimes blocks bare urllib without a UA (error 1010).
            "User-Agent": "SyntrixAI-ResendTest/1.0",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            print(resp.read().decode("utf-8"))
            return 0
    except urllib.error.HTTPError as exc:
        print(exc.read().decode("utf-8"))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
