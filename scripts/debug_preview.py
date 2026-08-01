"""Reproduce preview endpoint and print error detail."""

from __future__ import annotations

import time
from pathlib import Path

import httpx

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
    api = (env.get("NEXT_PUBLIC_API_URL") or "http://127.0.0.1:8000").rstrip("/")
    supabase = env["SUPABASE_URL"].rstrip("/")
    service = env["SUPABASE_SERVICE_ROLE_KEY"]
    anon = env["SUPABASE_ANON_KEY"]
    email = f"prev_{int(time.time())}@syntrix.local"
    password = "SmokePass_123456!"

    with httpx.Client(timeout=180.0) as client:
        client.post(
            f"{supabase}/auth/v1/admin/users",
            headers={
                "apikey": service,
                "Authorization": f"Bearer {service}",
                "Content-Type": "application/json",
            },
            json={"email": email, "password": password, "email_confirm": True},
        )
        token = client.post(
            f"{supabase}/auth/v1/token?grant_type=password",
            headers={"apikey": anon, "Content-Type": "application/json"},
            json={"email": email, "password": password},
        ).json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        project = client.post(
            f"{api}/api/v1/projects",
            headers={**headers, "Content-Type": "application/json"},
            json={"name": "prevtest"},
        ).json()
        workspace = client.post(
            f"{api}/api/v1/projects/{project['id']}/workspaces",
            headers={**headers, "Content-Type": "application/json"},
            json={"name": "ws"},
        ).json()
        csv_bytes = (ROOT / "samples" / "demo_churn.csv").read_bytes()
        upload = client.post(
            f"{api}/api/v1/workspaces/{workspace['id']}/datasets/upload",
            headers=headers,
            files={"file": ("demo_churn.csv", csv_bytes, "text/csv")},
            data={"name": "demo"},
        )
        print("upload", upload.status_code)
        body = upload.json()
        job_id = body["job_id"]
        version_id = body["dataset_version"]["id"]
        for _ in range(60):
            job = client.get(f"{api}/api/v1/jobs/{job_id}", headers=headers).json()
            if job["status"] in {"succeeded", "failed", "cancelled"}:
                print("job", job["status"], job.get("error_message"))
                break
            time.sleep(2)
        preview = client.get(
            f"{api}/api/v1/dataset-versions/{version_id}/preview?limit=5",
            headers=headers,
        )
        print("preview", preview.status_code, preview.text[:800])
        eda = client.get(
            f"{api}/api/v1/dataset-versions/{version_id}/eda",
            headers=headers,
        )
        print("eda", eda.status_code, eda.text[:300])


if __name__ == "__main__":
    main()
