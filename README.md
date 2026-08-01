# Syntrix AI

Autonomous AI data intelligence platform — a virtual team of data scientists, ML engineers, researchers, and analysts that understands datasets, runs analysis, trains models, explains predictions, and produces Markdown + PDF reports.

```
User → Next.js → FastAPI → AI Orchestration (LangGraph) → Multi-Agent System
     → ML/Data Engine → Supabase (PostgreSQL + pgvector + Auth + Storage)
     → Redis (Celery only) + MLflow + Ollama
```

## Status

**Architecture design complete. Phase 0 technical decisions are approved. Application implementation has not started and awaits Phase 1 kickoff.**

Empty package directories (`frontend/`, `backend/`, `ai-engine/`, `ml-engine/`, `mcp/`, etc.) exist only to clarify structure. There is no application source code yet.

## Architecture docs

Start at **[docs/README.md](./docs/README.md)** or the root pointer **[ARCHITECTURE.md](./ARCHITECTURE.md)**.

| Doc | Focus |
|-----|--------|
| [Overview](./docs/00-overview.md) | Decisions & principles |
| [System architecture](./docs/01-system-architecture.md) | Layers & data flows |
| [Database schema](./docs/02-database-schema.md) | Relational model + RLS + pgvector |
| [Folder structure](./docs/03-folder-structure.md) | Monorepo layout |
| [API architecture](./docs/04-api-architecture.md) | REST / SSE / jobs |
| [AI agent workflow](./docs/05-ai-agent-workflow.md) | LangGraph supervisor |
| [MCP architecture](./docs/06-mcp-architecture.md) | Tool servers |
| [Roadmap](./docs/07-development-roadmap.md) | Phased delivery |

## Next step

Review the architecture package (decisions are locked in the overview), then approve **Phase 1** (platform foundation) kickoff before any implementation begins.
