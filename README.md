# Syntrix AI

Autonomous AI data intelligence platform — a virtual team of data scientists, ML engineers, researchers, and analysts that understands datasets, runs analysis, trains models, explains predictions, and produces Markdown + PDF reports.

```
User → Next.js → FastAPI → AI Orchestration (LangGraph) → Multi-Agent System
     → ML/Data Engine → Supabase (PostgreSQL + pgvector + Auth + Storage)
     → Redis (Celery only) + MLflow + Ollama
```

## Status

**Phases 1–6 are implemented** for a portfolio demo path on Supabase Cloud project `innnuxoissecvendgajm`.

| Phase | Focus | Status |
|-------|--------|--------|
| 1 | Auth, projects, workspaces, Celery jobs/SSE | Done |
| 2 | Dataset upload, profiling, preview, EDA UI | Done |
| 3 | Train pipeline, experiments, models, MLflow hook | Done |
| 4 | LangGraph agents, MCP File/DB/Research, workflows | Done |
| 5 | SHAP explain, MD+PDF reports, chat, HITL resume | Done |
| 6 | Demo sample, README script, UX polish | Done |

Architecture docs: **[docs/README.md](./docs/README.md)** · **[ARCHITECTURE.md](./ARCHITECTURE.md)** · Roadmap: **[docs/07-development-roadmap.md](./docs/07-development-roadmap.md)**

## Prerequisites

- Python 3.11+ and [uv](https://github.com/astral-sh/uv)
- Node.js 20+ and npm
- Redis (local or Docker) — **Celery broker only**
- Supabase Cloud project (Postgres + Auth + Storage) — **required**
- Optional: [Ollama](https://ollama.com) for richer chat/agent narration; MLflow Compose profile for tracking UI

Docker Compose under `docker/compose/` runs Redis, API, worker, frontend (optional MLflow). It does **not** run Postgres.

## Quickstart (local)

### 1. Environment

```bash
cp .env.example .env
cp frontend/.env.local.example frontend/.env.local
```

Fill Supabase URL/keys, `SUPABASE_JWT_SECRET`, `DATABASE_URL` (prefer session pooler on IPv4), Redis URLs, and `NEXT_PUBLIC_API_URL=http://localhost:8000`.

### 2. Apply migrations (Supabase Cloud)

Phase 1 should already be applied on project B. Apply Phase 2+ additives:

```bash
# PowerShell example — uses DATABASE_URL from .env (do not commit .env)
uv run python -c "from pathlib import Path; import os; from dotenv import load_dotenv; load_dotenv(); import psycopg; url=os.environ['DATABASE_URL'].replace('postgresql+asyncpg://','postgresql://').replace('postgresql+psycopg://','postgresql://'); conn=psycopg.connect(url); cur=conn.cursor();
for p in sorted(Path('supabase/migrations').glob('*.sql')):
  print('Applying', p.name); cur.execute(p.read_text(encoding='utf-8')); conn.commit()
print('OK'); conn.close()"
```

Or paste SQL files from `supabase/migrations/` into the Supabase SQL Editor (in order).

### 3. Install & run

**Redis**

```bash
docker run --name syntrix-redis -p 6379:6379 -d redis:7-alpine
```

**API**

```bash
uv sync
uv run --package syntrix-backend uvicorn app.main:app --reload --app-dir backend --host 0.0.0.0 --port 8000
```

**Celery worker**

```bash
cd backend
uv run celery -A app.workers.celery_app.celery_app worker --loglevel=INFO --queues=default -c 2
```

**Frontend** (if `registry.npmjs.org` fails on Windows, use npmmirror + ipv4first):

```bash
cd frontend
npm install --registry=https://registry.npmmirror.com
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Docker Compose (optional)

```bash
docker compose -f docker/compose/docker-compose.yml up --build
docker compose -f docker/compose/docker-compose.yml --profile mlflow up --build
```

## End-to-end demo script (~15–20 min)

1. **Sign in** at `/sign-in` (email or Google).
2. **Create a project** → **create an experiment workspace** → open the workspace.
3. **Data & EDA**
   - Upload `samples/demo_churn.csv`
   - Wait for profiling job (progress bar) until version `ready`
   - Inspect preview table + charts, or open **Open EDA**
4. **Experiments**
   - Target column: `churned`, task: `classification`
   - **Run AutoML train** → wait for job → review metrics → **Set champion**
5. **Explain**
   - Click **Explain** on a model → job writes SHAP/importance into explanations
6. **Agents** (optional)
   - **Run EDA workflow** or **Run AutoML workflow** → watch **Agent timeline**
   - If status is `waiting_human`, resume via API with `target_column`
7. **Reports**
   - **Generate Markdown + PDF report** → download MD/PDF when `ready`
8. **Chat**
   - Ask e.g. “What drives churn?” — answers use workspace context (Ollama if up; otherwise offline fallback)

### External deps / graceful degrade

| Dependency | Required for demo? | Behavior if missing |
|------------|--------------------|---------------------|
| Redis | Yes | Jobs will not run |
| Supabase | Yes | Auth/DB/Storage fail |
| Ollama | No | Chat/narration falls back to deterministic text |
| MLflow | No | Training still works; `mlflow_run_id` may be null |
| SHAP (`uv sync --extra explain` in ml-engine) | No | Coefficient/importance fallback used on Python builds without llvmlite |
| Research live web | No | `RESEARCH_MCP_MOCK=1` (default) returns mocked results |
| LangGraph Postgres checkpointer extra | No | Linear fallback runner still executes workflows |

**Auth note:** Project B issues **ES256** JWTs (JWKS). The API validates via Supabase JWKS (+ HS256 secret fallback) with clock-skew leeway. If sign-in returns 401 locally, sync the Windows clock (this machine was ~1h behind during smoke).

**Verify demo path:**

```bash
uv run python scripts/smoke_demo_path.py
```

## Key API routes

| Area | Paths |
|------|--------|
| Health | `GET /api/v1/health`, `/ready` |
| Auth user | `GET/PATCH /api/v1/me` |
| Projects / workspaces | `/api/v1/projects`, `/api/v1/workspaces/{id}` |
| Datasets | `POST /workspaces/{id}/datasets/upload`, `GET .../dataset-versions`, `.../preview`, `.../metadata`, `.../eda` |
| Experiments | `POST /workspaces/{id}/experiments`, `GET /workspaces/{id}/models`, `POST /models/{id}/champion`, `POST /models/{id}/predictions`, `POST /models/{id}/explain` |
| Workflows | `POST /workspaces/{id}/workflows`, `GET /workflows/{id}`, `POST /workflows/{id}/resume`, agent-runs/activities |
| Reports | `POST /workspaces/{id}/reports`, `GET /reports/{id}/download` |
| Chat | `POST /workspaces/{id}/conversations`, `POST /conversations/{id}/messages` |
| Jobs / SSE | `GET /jobs/{id}`, `GET /jobs/{id}/events` |

Auth: `Authorization: Bearer <Supabase access_token>`.

## Key UI routes

| Route | Purpose |
|-------|---------|
| `/app/projects` | Project list |
| `/app/projects/{id}` | Workspaces + demo job |
| `/app/projects/{id}/workspaces/{ws}` | Workspace hub (Data, Experiments, Agents, Reports, Chat) |
| `/app/projects/{id}/workspaces/{ws}/eda/{versionId}` | Full EDA page |

## Monorepo layout

- `frontend/` — Next.js, React Query, Recharts, dark enterprise UI
- `backend/` — FastAPI Clean Architecture + Celery workers
- `ai-engine/` — Providers, LangGraph workflow, pgvector helpers
- `ml-engine/` — Profile, EDA, train, explain, report PDF
- `mcp/` — File / Database / Research MCP servers
- `supabase/migrations/` — Cloud schema (mirrored under `database/migrations/`)
- `samples/demo_churn.csv` — Demo dataset

## Lint

```bash
uv run ruff check backend ai-engine ml-engine
cd frontend && npm run lint
```
