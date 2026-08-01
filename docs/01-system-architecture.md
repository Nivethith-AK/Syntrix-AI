# 01 — System Architecture

## 1. Purpose

This document defines the production-minded layered architecture for Syntrix AI: component boundaries, runtime topology, and end-to-end data flows for core journeys.

## 2. C4 Context

```mermaid
C4Context
  title Syntrix AI — System Context
  Person(user, "Analyst / Stakeholder", "Uploads data, runs analyses, reviews models & reports")
  System(syntrix, "Syntrix AI", "Autonomous data intelligence platform")
  System_Ext(supabase, "Supabase", "Auth, PostgreSQL + pgvector, Storage")
  System_Ext(llm, "AI Providers", "Ollama (primary) / OpenAI-compatible APIs")
  System_Ext(web, "Public Web / APIs", "Research sources via Research MCP")
  Rel(user, syntrix, "Uses (HTTPS)")
  Rel(syntrix, supabase, "Auth JWTs, SQL, embeddings, files")
  Rel(syntrix, llm, "Agent reasoning + embeddings")
  Rel(syntrix, web, "Domain research (optional)")
```

## 3. C4 Container view

```mermaid
C4Container
  title Syntrix AI — Containers
  Person(user, "User")
  Container(web, "Web App", "Next.js", "Premium dark UI, workspace UX, charts, agent timeline")
  Container(api, "API", "FastAPI", "REST + SSE, auth, orchestration entry")
  Container(worker, "Workers", "Celery", "Async agent & ML jobs")
  Container(ai, "AI Engine", "LangGraph + provider adapters", "Supervisor + specialists; Ollama/OpenAI-compatible")
  Container(ml, "ML Engine", "Python ML stack", "Pipelines, train/eval/explain")
  Container(mcp, "MCP Servers", "MCP", "File, Database, Research tools")
  ContainerDb(pg, "PostgreSQL", "Supabase + pgvector", "System of record, memory, LangGraph checkpoints")
  ContainerDb(redis, "Redis", "Redis", "Celery broker / task queues only")
  ContainerDb(mlflow, "MLflow", "MLflow", "Experiment & artifact tracking")
  ContainerDb(obj, "Object Storage", "Supabase Storage", "Datasets, models, reports")
  Rel(user, web, "HTTPS")
  Rel(web, api, "REST / SSE + JWT")
  Rel(api, pg, "SQL")
  Rel(api, redis, "Enqueue Celery tasks")
  Rel(api, obj, "Upload / signed URLs")
  Rel(api, worker, "Tasks via Redis broker")
  Rel(worker, ai, "Invoke graphs")
  Rel(worker, ml, "Run pipelines")
  Rel(ai, mcp, "Tool calls")
  Rel(ai, pg, "Memory R/W + checkpoints")
  Rel(ai, llm, "Completions via abstraction")
  Rel(ml, mlflow, "Log runs")
  Rel(ml, obj, "Artifacts")
  Rel(mcp, obj, "Sandbox file I/O")
  System_Ext(llm, "Ollama / OpenAI-compatible")
```

## 4. Layered application architecture

```mermaid
flowchart TB
  subgraph Presentation
    FE[Next.js App Router]
    RQ[React Query]
    CH[Plotly / Recharts]
  end

  subgraph API_Layer["API Layer (FastAPI)"]
    RT[Versioned Routers /api/v1]
    MW[Auth / Validation / Rate Limit]
    SSE[SSE Controllers]
  end

  subgraph Application
    SVC[Service Layer]
    JOB[Job Dispatcher]
    DTO[Schemas / DTOs]
  end

  subgraph Domain
    ENT[Domain Entities]
    POL[Business Rules]
  end

  subgraph Infrastructure
    REPO[Repositories]
    SUPA[Supabase Client]
    CEL[Celery Client]
    STOR[Supabase Storage Adapter]
  end

  subgraph Engines
    AIE[ai-engine]
    PROV[AI Provider Adapters]
    MLE[ml-engine]
    MCP[mcp servers]
  end

  FE --> RQ --> RT
  RT --> MW --> SVC
  SSE --> SVC
  SVC --> ENT
  SVC --> REPO
  SVC --> JOB
  JOB --> CEL
  CEL --> AIE
  CEL --> MLE
  AIE --> PROV
  AIE --> MCP
  MLE --> STOR
  REPO --> SUPA
  STOR --> SUPA
```

### Backend Clean Architecture mapping

| Layer | Package (planned) | Allowed dependencies |
|-------|-------------------|----------------------|
| API | `backend/app/api` | Services, DTOs |
| Domain | `backend/app/domain` | None (pure) |
| Services | `backend/app/services` | Domain, repository interfaces, job ports |
| Repositories | `backend/app/repositories` | Supabase/Postgres adapters |
| Core | `backend/app/core` | Config, security, logging |
| Workers | `backend/app/workers` | Services, ai-engine, ml-engine |

### AI provider abstraction (ai-engine)

| Port | Responsibility |
|------|----------------|
| `ChatModel` | Completions / tool-capable chat |
| `EmbeddingModel` | Vector embeddings for memory/RAG |
| `OllamaAdapter` | Primary local implementation |
| `OpenAICompatibleAdapter` | Optional remote OpenAI-compatible APIs |

Selection via env (`AI_PROVIDER`, `AI_BASE_URL`, `AI_MODEL`, `EMBEDDING_MODEL`, API keys). Graphs and agents never import a vendor SDK directly.

## 5. Component interaction (runtime)

```mermaid
sequenceDiagram
  participant U as User
  participant FE as Next.js
  participant API as FastAPI
  participant R as Redis/Celery
  participant W as Worker
  participant G as LangGraph
  participant ML as ML Engine
  participant DB as Supabase Postgres
  participant ST as Supabase Storage

  U->>FE: Start workspace workflow
  FE->>API: POST /workspaces/{id}/workflows (JWT)
  API->>DB: Persist agent_run + job
  API->>R: Enqueue task
  API-->>FE: 202 + job_id + run_id
  FE->>API: GET /jobs/{id}/events (SSE)
  R->>W: Deliver task
  W->>G: Invoke supervisor graph
  G->>DB: Retrieve memory (pgvector) + load checkpoint
  G->>ML: Pipeline steps
  ML-->>G: Metrics / artifacts
  G->>ST: Write report/artifact files
  G->>DB: Agent activities, results, checkpoint
  W->>API: Publish progress events
  API-->>FE: SSE: step updates
  W->>DB: Mark job completed
  FE->>API: GET results
```

## 6. Deployment topology (Docker Compose + Supabase Cloud)

> **Locked:** App Postgres/Auth/Storage run on **Supabase Cloud only**. Compose does **not** include a Postgres container for the application database.

```mermaid
flowchart LR
  subgraph Browser
    FE[frontend:3000]
  end

  subgraph Compose
    API[backend:8000]
    W1[worker-agents]
    W2[worker-ml]
    REDIS[redis:6379]
    MLF[mlflow:5000]
    OLLAMA[ollama optional]
  end

  subgraph Supabase_Cloud["Supabase Cloud"]
    AUTH[Auth]
    PG[(Postgres + pgvector)]
    ST[Storage]
  end

  subgraph External
    OPENAI[OpenAI-compatible optional]
  end

  FE --> API
  FE --> AUTH
  API --> PG
  API --> REDIS
  API --> ST
  W1 --> REDIS
  W2 --> REDIS
  W1 --> PG
  W1 --> ST
  W1 --> OLLAMA
  W1 --> OPENAI
  W2 --> MLF
  W2 --> PG
  W2 --> ST
```

### Service responsibilities

| Service | Role | Scale notes |
|---------|------|-------------|
| `frontend` | SSR/CSR UI | Stateless; CDN-friendly |
| `backend` | Sync API + SSE | Scale horizontally behind LB |
| `worker-agents` | LangGraph jobs | Scale on I/O / LLM concurrency |
| `worker-ml` | Train/eval/explain | Scale on CPU/GPU; separate queue |
| `redis` | **Celery broker / queues only** | Not for vectors, checkpoints, or durable app state |
| `mlflow` | Tracking server + artifact root | Not the system of record for business entities |
| `ollama` (optional) | Local LLM/embeddings | Host GPU/CPU; primary AI provider in demos |

**Not in Compose:** ChromaDB or other external vector DB. Vector search runs in Supabase Postgres via pgvector.

**MLflow vs app DB:** Business entities (workspaces, experiments, models, reports, agent runs) live in Supabase. MLflow stores training metrics/params/artifacts for MLOps fidelity; app tables hold user-facing links (`mlflow_run_id`).

**Redis scope (approved):** Celery task queues / background job delivery only. Job status, progress, LangGraph checkpoints, and memory are Postgres-backed.

## 7. Key journey data flows

### 7.1 Upload dataset (into a workspace)

```mermaid
flowchart TD
  A[User selects file in Experiment Workspace] --> B[FE requests upload session]
  B --> C[API validates auth + project/workspace ACL]
  C --> D[Store object in Supabase Storage]
  D --> E[Insert datasets + dataset_versions + metadata stub]
  E --> F[Enqueue profiling job]
  F --> G[Worker: schema infer, stats, quality]
  G --> H[Update dataset_metadata]
  H --> I[Optional: embed summary → pgvector memory]
  I --> J[SSE: dataset version ready]
```

**Security controls:** size/MIME allowlist; virus-scan hook; per-project/workspace storage prefix in Supabase Storage; no executable content served from storage as HTML.

### 7.2 Run analysis (EDA / insights)

```mermaid
flowchart TD
  A[POST workspace workflow type=eda] --> B[Create agent_run + job]
  B --> C[Supervisor plans steps]
  C --> D[Data Engineer: validate/clean view]
  D --> E[Data Scientist: EDA + stats]
  E --> F[Research optional context]
  F --> G[Persist insights + charts specs]
  G --> H[Memory write: insight embeddings in pgvector]
  H --> I[Complete job / notify FE]
```

### 7.3 Train model

```mermaid
flowchart TD
  A[POST workspace experiment or workflow=automl] --> B[Validate dataset version readiness]
  B --> C[Enqueue ml_train job]
  C --> D[ML Engineer agent selects task/algorithms]
  D --> E[ml-engine pipeline]
  E --> E1[validate]
  E1 --> E2[clean]
  E2 --> E3[feature eng]
  E3 --> E4[train]
  E4 --> E5[eval]
  E5 --> F[Log MLflow run]
  F --> G[Persist experiments + models rows]
  G --> H[Explainability agent optional]
  H --> I[SSE metrics / champion selection]
```

**Supported task families (engine contract):** classification, regression, clustering, forecasting, anomaly detection.

**Algorithm palette:** Random Forest, XGBoost, LightGBM, CatBoost, Logistic Regression, SVM, Neural Network (sklearn MLP or lightweight torch—implementation choice in Phase 3).

### 7.4 Generate report (Markdown + PDF)

```mermaid
flowchart TD
  A[POST workspace report or workflow=report] --> B[Gather workspace artifacts]
  B --> C[Report agent + Research agent]
  C --> D[Compose narrative + chart refs]
  D --> E[Write Markdown + generate PDF]
  E --> F[Store both blobs in Supabase Storage]
  F --> G[Link memory / agent_run]
  G --> H[Notify user]
```

## 8. Cross-cutting concerns

### Scalability

- Stateless API; horizontal workers by queue.
- Dataset processing streams/chunks large files (polars preferred later).
- Cache dataset profiles in Postgres (`dataset_metadata`) keyed by `dataset_id` / `dataset_version_id` + content hash (not Redis).
- Memory embeddings partitioned/filtered by `workspace_id` (+ `project_id` / `user_id`).

### Maintainability

- Strict package boundaries; no FE importing engine code.
- Versioned API; additive schema migrations.
- Shared typed contracts (OpenAPI + JSON schemas for workflow configs).
- Agent prompts, tool schemas, and provider adapters versioned alongside graphs.

### Observability

- Structured JSON logs with `request_id`, `job_id`, `run_id`, `workspace_id`, `agent_name`.
- `system_logs` + `agent_activities` / `agent_runs` tables for product UI timelines.
- Optional OpenTelemetry hooks on API and workers (Phase 4+).

### Resilience

- Celery retries with exponential backoff for transient LLM/network errors.
- Idempotent job handlers via `job_id`.
- Dead-letter visibility in admin/system logs.
- Human-in-the-loop pause states in LangGraph for ambiguous schema/target selection; checkpoints in PostgreSQL.

## 9. Trust boundaries

```mermaid
flowchart TB
  subgraph Public
    FE[Browser]
  end
  subgraph Trusted_App["Trusted App Network"]
    API[API]
    W[Workers]
    MCP[MCP Servers]
    OLLAMA[Ollama optional]
  end
  subgraph Provider
    SB[Supabase]
    OPENAI[OpenAI-compatible optional]
  end

  FE -->|JWT + TLS| API
  API --> W
  W --> MCP
  API --> SB
  W --> SB
  W --> OLLAMA
  W --> OPENAI
```

MCP servers are **not** exposed to the public internet. Only workers/API invoke them over internal network (stdio or internal HTTP).

## 10. Related documents

- [02-database-schema.md](./02-database-schema.md)
- [04-api-architecture.md](./04-api-architecture.md)
- [05-ai-agent-workflow.md](./05-ai-agent-workflow.md)
- [06-mcp-architecture.md](./06-mcp-architecture.md)
