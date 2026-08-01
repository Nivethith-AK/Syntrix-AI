# Syntrix AI — Architecture Documentation

**Status:** Architecture design complete · Phase 0 technical decisions **locked** · **Phase 1 platform foundation implemented**. Phase 2+ awaits explicit kickoff.

Syntrix AI is an autonomous AI data intelligence platform that behaves like a virtual team of data scientists, ML engineers, researchers, and business analysts. Users upload datasets or connect sources; the system understands data, cleans/prepares it, discovers insights, runs statistical analysis, builds models, compares experiments, explains predictions, generates reports (Markdown + PDF), and recommends improvements—organized under **Projects → Experiment Workspaces**.

## Document index

| # | Document | Contents |
|---|----------|----------|
| 00 | [Overview](./00-overview.md) | Product vision, design principles, major technology decisions |
| 01 | [System Architecture](./01-system-architecture.md) | Layered/C4 architecture, components, data flows, infra |
| 02 | [Database Schema](./02-database-schema.md) | Relational model, ER diagram, RLS, indexes, pgvector |
| 03 | [Folder Structure](./03-folder-structure.md) | Monorepo layout and module responsibilities |
| 04 | [API Architecture](./04-api-architecture.md) | REST/SSE, auth, endpoints, jobs, errors |
| 05 | [AI Agent Workflow](./05-ai-agent-workflow.md) | LangGraph supervisor, agents, state, workflows |
| 06 | [MCP Architecture](./06-mcp-architecture.md) | File/DB/Research MCP, security, registration |
| 07 | [Development Roadmap](./07-development-roadmap.md) | Phased delivery to portfolio-demo-ready |

Supporting design artifacts:

- Root pointer: [`../ARCHITECTURE.md`](../ARCHITECTURE.md)
- SQL design sketch: [`../database/schema.sql`](../database/schema.sql)
- Applied migrations: [`../supabase/migrations/`](../supabase/migrations/)

## Target stack (summary)

```
User → Next.js Frontend → FastAPI Backend → AI Orchestration (LangGraph)
     → Multi-Agent System → ML/Data Engine
     → Supabase Cloud (PostgreSQL + pgvector + Auth + Storage) + Redis (Celery) + MLflow + Ollama
```

| Layer | Technology |
|-------|------------|
| Frontend | Next.js, React, TypeScript, Tailwind, shadcn/ui, Framer Motion, Plotly, Recharts, React Query |
| Backend | FastAPI, Clean Architecture, Service + Repository patterns |
| Database / Auth / Storage | **Supabase Cloud** PostgreSQL (+ **pgvector**), Auth, **Storage** (no Compose Postgres) |
| Access control (v1) | **Owner-only** RLS + API checks (`user_id` = auth user); orgs/teams deferred |
| Domain unit | Project → **Experiment Workspace** → artifacts |
| Agents | LangGraph (Supervisor + specialist agents); checkpoints in **PostgreSQL** |
| AI providers | Abstraction layer: primary **Ollama**; optional **OpenAI-compatible** APIs (env-selected) |
| Tools | MCP (File, Database, Research) — File backed by Supabase Storage |
| ML | Custom pipeline + RF/XGBoost/LightGBM/CatBoost/LogReg/SVM/NN; SHAP, LIME; MLflow |
| Jobs | **Redis + Celery** (Redis = broker/queues only) |
| Vector memory | **PostgreSQL + pgvector** (no ChromaDB) |
| Reports | **Markdown + PDF** in v1 |
| Infra | Docker Compose app services + Redis (+ optional MLflow/Ollama); DB/Auth/Storage on Supabase Cloud |

## Reading order

1. Start with [00-overview.md](./00-overview.md) for decisions and constraints.
2. Read [01-system-architecture.md](./01-system-architecture.md) for the big picture.
3. Dive into schema, API, agents, and MCP as needed for implementation planning.
4. Use [07-development-roadmap.md](./07-development-roadmap.md) for sequencing; Phase 1 is done — Phase 2+ needs kickoff.

## Governance note

Phase 0 technology decisions are locked (including Supabase Cloud-only and owner-only access). Phase 1 code lives in the monorepo. Do not start Phase 2+ until explicitly approved.
