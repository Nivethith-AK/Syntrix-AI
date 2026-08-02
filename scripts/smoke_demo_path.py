"""Offline + optional authenticated smoke of the Phase 2–6 demo path.

Does not print secrets. Uses samples/demo_churn.csv.
"""

from __future__ import annotations

import json
import re
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def load_env() -> dict[str, str]:
    env: dict[str, str] = {}
    for line in (ROOT / ".env").read_text(encoding="utf-8").splitlines():
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip().strip('"').strip("'")
    return env


def smoke_ml() -> None:
    from syntrix_ml.eda import build_eda_insights
    from syntrix_ml.explain import explain_model
    from syntrix_ml.io import load_tabular
    from syntrix_ml.pipeline import predict_with_artifact, train_experiment
    from syntrix_ml.profile import profile_dataframe
    from syntrix_ml.reporting import build_markdown_report, markdown_to_pdf

    df = load_tabular(ROOT / "samples" / "demo_churn.csv")
    profile = profile_dataframe(df)
    eda = build_eda_insights(df, profile=profile)
    assert profile["row_count"] == 25
    result = train_experiment(
        df,
        task_type="classification",
        target_column="churned",
        algorithms=["random_forest", "logistic_regression"],
    )
    best = next(m for m in result.models if m.is_best)
    pred = predict_with_artifact(
        best.artifact_bytes,
        df.head(2).drop(columns=["churned"]).to_dict("records"),
    )
    assert pred.get("predictions")
    ex = explain_model(best.artifact_bytes, df)
    md = build_markdown_report(
        title="Demo",
        semantic_summary=profile.get("semantic_summary"),
        eda=eda,
        experiment={
            "task_type": "classification",
            "target_column": "churned",
            "best_algorithm": result.best_algorithm,
            "best_score": result.best_score,
            "models": [{"algorithm": m.algorithm, "metrics": m.metrics} for m in result.models],
        },
        explanations=ex,
    )
    pdf = markdown_to_pdf(md, title="Demo")
    assert len(pdf) > 200
    print(
        f"[OK] ML path: best={result.best_algorithm} score={result.best_score} "
        f"explain={ex.get('method')} pdf_bytes={len(pdf)}"
    )


def smoke_workflow() -> None:
    from syntrix_ai.graphs.workflow import build_workflow_graph

    tools = {
        "profile_dataset": lambda vid: {
            "row_count": 25,
            "semantic_summary": "25x8 demo",
            "eda": {"insights": [{"title": "ok", "detail": "d", "severity": "info"}]},
            "insights": [],
        },
        "build_eda": lambda vid: {"insights": []},
        "train": lambda vid, target_column=None, task_type="classification": {
            "best_algorithm": "random_forest",
            "best_score": 0.9,
            "task_type": task_type,
            "target_column": target_column,
            "models": [],
        },
        "explain": lambda state: {"method": "coeff", "global": []},
        "report": lambda state: "# report",
    }
    g = build_workflow_graph(tools)
    final = g.invoke(
        {
            "workspace_id": "w",
            "project_id": "p",
            "user_id": "u",
            "workflow_type": "eda",
            "dataset_version_id": "v",
            "messages": [],
            "activities": [],
        }
    )
    assert "data_engineer:complete" in (final.get("messages") or [])
    print(f"[OK] Workflow path: activities={len(final.get('activities') or [])}")


def smoke_api_authenticated(env: dict[str, str]) -> None:
    import httpx

    api = env.get("NEXT_PUBLIC_API_URL") or "http://127.0.0.1:8000"
    supabase = env.get("SUPABASE_URL") or env.get("NEXT_PUBLIC_SUPABASE_URL")
    anon = env.get("SUPABASE_ANON_KEY") or env.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
    email = env.get("SMOKE_TEST_EMAIL")
    password = env.get("SMOKE_TEST_PASSWORD")
    service = env.get("SUPABASE_SERVICE_ROLE_KEY")

    with httpx.Client(timeout=120.0) as client:
        token = None
        if email and password and supabase and anon:
            auth = client.post(
                f"{supabase.rstrip('/')}/auth/v1/token?grant_type=password",
                headers={"apikey": anon, "Content-Type": "application/json"},
                json={"email": email, "password": password},
            )
            if auth.status_code < 400:
                token = auth.json().get("access_token")

        # Auto-provision ephemeral smoke user with service role when needed
        if not token and supabase and service and anon:
            email = f"smoke_{int(time.time())}@syntrix.local"
            password = f"SmokePass_{int(time.time())}!"
            created = client.post(
                f"{supabase.rstrip('/')}/auth/v1/admin/users",
                headers={
                    "apikey": service,
                    "Authorization": f"Bearer {service}",
                    "Content-Type": "application/json",
                },
                json={
                    "email": email,
                    "password": password,
                    "email_confirm": True,
                },
            )
            if created.status_code >= 400:
                print(f"[SKIP] Could not create smoke user ({created.status_code})")
                return
            auth = client.post(
                f"{supabase.rstrip('/')}/auth/v1/token?grant_type=password",
                headers={"apikey": anon, "Content-Type": "application/json"},
                json={"email": email, "password": password},
            )
            if auth.status_code >= 400:
                print(f"[SKIP] Smoke user login failed ({auth.status_code})")
                return
            token = auth.json().get("access_token")
            print("[OK] Provisioned ephemeral smoke user")

        if not token:
            print(
                "[SKIP] Authenticated API smoke - provide Supabase keys "
                "(service role can auto-create a smoke user)"
            )
            return

        headers = {"Authorization": f"Bearer {token}"}

        def poll_job(job_id: str, label: str, attempts: int = 120) -> dict:
            terminal = {"succeeded", "failed", "cancelled"}
            job: dict = {}
            for _ in range(attempts):
                jr = client.get(f"{api}/api/v1/jobs/{job_id}", headers=headers)
                jr.raise_for_status()
                job = jr.json()
                if job["status"] in terminal:
                    break
                time.sleep(2)
            if job.get("status") != "succeeded":
                raise RuntimeError(
                    f"{label} job ended as {job.get('status')}: {job.get('error_message')}"
                )
            return job

        # Create project + workspace
        proj = client.post(
            f"{api}/api/v1/projects",
            headers={**headers, "Content-Type": "application/json"},
            json={"name": f"Smoke {int(time.time())}", "description": "demo path"},
        )
        proj.raise_for_status()
        project_id = proj.json()["id"]
        ws = client.post(
            f"{api}/api/v1/projects/{project_id}/workspaces",
            headers={**headers, "Content-Type": "application/json"},
            json={"name": "Smoke workspace"},
        )
        ws.raise_for_status()
        workspace_id = ws.json()["id"]

        # Upload CSV
        csv_bytes = (ROOT / "samples" / "demo_churn.csv").read_bytes()
        up = client.post(
            f"{api}/api/v1/workspaces/{workspace_id}/datasets/upload",
            headers=headers,
            files={"file": ("demo_churn.csv", csv_bytes, "text/csv")},
            data={"name": "demo_churn"},
        )
        up.raise_for_status()
        body = up.json()
        job_id = body["job_id"]
        version_id = body["dataset_version"]["id"]
        print(f"[OK] Upload accepted job={job_id[:8]}... version={version_id[:8]}...")
        poll_job(job_id, "Profile")
        print("[OK] Profiling job succeeded")

        # Preview + EDA
        prev = client.get(
            f"{api}/api/v1/dataset-versions/{version_id}/preview?limit=5", headers=headers
        )
        if prev.status_code >= 400:
            raise RuntimeError(f"Preview failed {prev.status_code}: {prev.text[:400]}")
        assert prev.json()["row_count"] > 0
        eda = client.get(f"{api}/api/v1/dataset-versions/{version_id}/eda", headers=headers)
        if eda.status_code >= 400:
            raise RuntimeError(f"EDA failed {eda.status_code}: {eda.text[:400]}")
        assert eda.json().get("eda")
        print("[OK] Preview + EDA available")

        # Train
        tr = client.post(
            f"{api}/api/v1/workspaces/{workspace_id}/experiments",
            headers={**headers, "Content-Type": "application/json"},
            json={
                "dataset_version_id": version_id,
                "name": "Smoke train",
                "task_type": "classification",
                "target_column": "churned",
                "algorithms": ["random_forest", "logistic_regression"],
            },
        )
        tr.raise_for_status()
        poll_job(tr.json()["job_id"], "Train")
        print("[OK] Train job succeeded")

        models = client.get(
            f"{api}/api/v1/workspaces/{workspace_id}/models", headers=headers
        )
        models.raise_for_status()
        items = models.json()["items"]
        assert items, "No models registered"
        model_id = items[0]["id"]

        # Explain
        ex = client.post(f"{api}/api/v1/models/{model_id}/explain", headers=headers)
        ex.raise_for_status()
        poll_job(ex.json()["job_id"], "Explain")
        print("[OK] Explain job succeeded")

        # Report
        rp = client.post(
            f"{api}/api/v1/workspaces/{workspace_id}/reports",
            headers={**headers, "Content-Type": "application/json"},
            json={"title": "Smoke report", "report_type": "executive", "model_id": model_id},
        )
        rp.raise_for_status()
        poll_job(rp.json()["job_id"], "Report")
        print("[OK] Report job succeeded")

        # Workflow EDA
        wf = client.post(
            f"{api}/api/v1/workspaces/{workspace_id}/workflows",
            headers={**headers, "Content-Type": "application/json"},
            json={"workflow_type": "eda", "dataset_version_id": version_id},
        )
        wf.raise_for_status()
        poll_job(wf.json()["job_id"], "Workflow")
        acts = client.get(
            f"{api}/api/v1/workspaces/{workspace_id}/agent-activities", headers=headers
        )
        acts.raise_for_status()
        print(f"[OK] Workflow succeeded; activities={acts.json()['total']}")

        # Chat
        conv = client.post(
            f"{api}/api/v1/workspaces/{workspace_id}/conversations",
            headers={**headers, "Content-Type": "application/json"},
            json={"title": "Smoke chat"},
        )
        conv.raise_for_status()
        msg = client.post(
            f"{api}/api/v1/conversations/{conv.json()['id']}/messages",
            headers={**headers, "Content-Type": "application/json"},
            json={"content": "What drives churn?"},
        )
        msg.raise_for_status()
        assert msg.json()["assistant_message"]["content"]
        print("[OK] Chat reply received")
        print("[OK] Authenticated demo path complete")

def main() -> int:
    smoke_ml()
    smoke_workflow()
    env = load_env()
    smoke_api_authenticated(env)
    print("SMOKE PASS")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:  # noqa: BLE001
        print(f"SMOKE FAIL: {exc}", file=sys.stderr)
        raise
