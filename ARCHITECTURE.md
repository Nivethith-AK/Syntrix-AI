# Syntrix AI — Architecture

This file is a pointer to the full architecture package.

**Phase 0 decisions are locked. Phase 1 platform foundation is implemented.** Phase 2+ awaits explicit kickoff.

Locked platform constraints relevant to local setup:

- **Database / Auth / Storage:** Supabase Cloud only (no app Postgres in Docker Compose)
- **Access control v1:** owner-only RLS + API authZ (`user_id` = authenticated user)

## Start here

→ **[docs/README.md](./docs/README.md)** — documentation index  
→ **[README.md](./README.md)** — Phase 1 setup / run instructions

## Document map

| Doc | Topic |
|-----|--------|
| [docs/00-overview.md](./docs/00-overview.md) | Vision, principles, major decisions (approved) |
| [docs/01-system-architecture.md](./docs/01-system-architecture.md) | C4/layers, flows, infra |
| [docs/02-database-schema.md](./docs/02-database-schema.md) | ER model, workspaces, RLS, pgvector |
| [docs/03-folder-structure.md](./docs/03-folder-structure.md) | Monorepo layout |
| [docs/04-api-architecture.md](./docs/04-api-architecture.md) | REST/SSE, auth, jobs |
| [docs/05-ai-agent-workflow.md](./docs/05-ai-agent-workflow.md) | LangGraph agents |
| [docs/06-mcp-architecture.md](./docs/06-mcp-architecture.md) | MCP tools & security |
| [docs/07-development-roadmap.md](./docs/07-development-roadmap.md) | Phased delivery |

Design DDL sketch: [database/schema.sql](./database/schema.sql)  
Applied migrations: [supabase/migrations/](./supabase/migrations/)
