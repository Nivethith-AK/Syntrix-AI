-- Syntrix AI — Design-level DDL sketch (NOT an applied migration)
-- Target: Supabase PostgreSQL + pgvector
-- See docs/02-database-schema.md for rationale, RLS, and indexes.
-- Apply only after Phase 1 kickoff via proper migration workflow.

create extension if not exists "pgcrypto";
create extension if not exists "vector";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type project_status as enum ('active', 'archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type workspace_status as enum ('active', 'archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type dataset_status as enum ('uploading', 'profiling', 'ready', 'failed', 'deleted');
exception when duplicate_object then null; end $$;

do $$ begin
  create type dataset_version_status as enum ('profiling', 'ready', 'failed', 'superseded');
exception when duplicate_object then null; end $$;

do $$ begin
  create type task_type as enum (
    'classification', 'regression', 'clustering', 'forecasting', 'anomaly'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type run_status as enum (
    'pending', 'queued', 'running', 'completed', 'succeeded', 'failed',
    'cancelled', 'waiting_human'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type model_status as enum ('training', 'ready', 'failed', 'archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type report_type as enum ('eda', 'experiment', 'executive', 'custom');
exception when duplicate_object then null; end $$;

do $$ begin
  create type report_status as enum ('drafting', 'ready', 'failed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type prediction_status as enum ('pending', 'running', 'completed', 'failed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type activity_status as enum ('started', 'succeeded', 'failed', 'waiting_human');
exception when duplicate_object then null; end $$;

do $$ begin
  create type job_status as enum ('queued', 'running', 'succeeded', 'failed', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type message_role as enum ('user', 'assistant', 'system', 'tool');
exception when duplicate_object then null; end $$;

-- Embedding dimension is model-dependent; 1536 is a common default placeholder.
-- Adjust at migration time to match the selected EmbeddingModel.
-- (Keep as a comment-driven constant for design clarity.)

-- ---------------------------------------------------------------------------
-- users (mirrors auth.users.id)
-- ---------------------------------------------------------------------------
create table if not exists public.users (
  id uuid primary key, -- equals auth.users.id
  email text not null unique,
  display_name text,
  avatar_url text,
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- projects
-- ---------------------------------------------------------------------------
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  name text not null,
  description text,
  status project_status not null default 'active',
  settings jsonb not null default '{}'::jsonb,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_projects_user_created
  on public.projects (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- experiment_workspaces (analysis unit under a project)
-- ---------------------------------------------------------------------------
create table if not exists public.experiment_workspaces (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  name text not null,
  description text,
  status workspace_status not null default 'active',
  settings jsonb not null default '{}'::jsonb,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_workspaces_project_created
  on public.experiment_workspaces (project_id, created_at desc);
create index if not exists idx_workspaces_user_created
  on public.experiment_workspaces (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- datasets (project-level logical assets) + versions (workspace pins)
-- ---------------------------------------------------------------------------
create table if not exists public.datasets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  name text not null,
  storage_path text not null, -- Supabase Storage object key
  format text not null,
  mime_type text,
  original_filename text,
  size_bytes bigint not null default 0,
  status dataset_status not null default 'uploading',
  content_hash text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_datasets_project_created
  on public.datasets (project_id, created_at desc);
create index if not exists idx_datasets_content_hash
  on public.datasets (content_hash);

create table if not exists public.dataset_versions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.experiment_workspaces (id) on delete cascade,
  dataset_id uuid not null references public.datasets (id) on delete restrict,
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  version_number integer not null,
  label text,
  storage_path text not null, -- immutable Supabase Storage key for this version
  content_hash text,
  status dataset_version_status not null default 'profiling',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, dataset_id, version_number)
);

create index if not exists idx_dataset_versions_workspace_created
  on public.dataset_versions (workspace_id, created_at desc);
create index if not exists idx_dataset_versions_dataset
  on public.dataset_versions (dataset_id);

create table if not exists public.dataset_metadata (
  id uuid primary key default gen_random_uuid(),
  dataset_version_id uuid not null unique
    references public.dataset_versions (id) on delete cascade,
  row_count integer,
  column_count integer,
  schema_json jsonb not null default '{}'::jsonb,
  profile_json jsonb not null default '{}'::jsonb,
  quality_json jsonb not null default '{}'::jsonb,
  semantic_summary text,
  target_candidates jsonb not null default '[]'::jsonb,
  profiled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- jobs (async correlation; progress durable in Postgres)
-- ---------------------------------------------------------------------------
create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  workspace_id uuid references public.experiment_workspaces (id) on delete cascade,
  celery_task_id text,
  job_type text not null,
  status job_status not null default 'queued',
  progress_pct integer not null default 0 check (progress_pct >= 0 and progress_pct <= 100),
  input_json jsonb not null default '{}'::jsonb,
  result_json jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_jobs_workspace_created
  on public.jobs (workspace_id, created_at desc);
create index if not exists idx_jobs_project_created
  on public.jobs (project_id, created_at desc);
create index if not exists idx_jobs_status on public.jobs (status);

-- ---------------------------------------------------------------------------
-- agent_runs (workspace-scoped execution history)
-- ---------------------------------------------------------------------------
create table if not exists public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.experiment_workspaces (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  job_id uuid references public.jobs (id) on delete set null,
  workflow_type text not null,
  status run_status not null default 'queued',
  input_json jsonb not null default '{}'::jsonb,
  result_json jsonb not null default '{}'::jsonb,
  checkpoint_thread_id text, -- LangGraph Postgres checkpointer correlation
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_agent_runs_workspace_created
  on public.agent_runs (workspace_id, created_at desc);
create index if not exists idx_agent_runs_job on public.agent_runs (job_id);
create index if not exists idx_agent_runs_status on public.agent_runs (status);

-- ---------------------------------------------------------------------------
-- experiments + models + predictions
-- ---------------------------------------------------------------------------
create table if not exists public.experiments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.experiment_workspaces (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  dataset_version_id uuid not null references public.dataset_versions (id) on delete restrict,
  user_id uuid not null references public.users (id) on delete cascade,
  name text not null,
  task_type task_type not null,
  status run_status not null default 'pending',
  config_json jsonb not null default '{}'::jsonb,
  metrics_json jsonb not null default '{}'::jsonb,
  mlflow_run_id text,
  agent_run_id uuid references public.agent_runs (id) on delete set null,
  job_id uuid references public.jobs (id) on delete set null,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_experiments_workspace_created
  on public.experiments (workspace_id, created_at desc);
create index if not exists idx_experiments_dataset_version
  on public.experiments (dataset_version_id);

create table if not exists public.models (
  id uuid primary key default gen_random_uuid(),
  experiment_id uuid not null references public.experiments (id) on delete cascade,
  workspace_id uuid not null references public.experiment_workspaces (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  name text not null,
  algorithm text not null,
  task_type task_type not null,
  artifact_path text, -- Supabase Storage / MLflow URI
  metrics_json jsonb not null default '{}'::jsonb,
  params_json jsonb not null default '{}'::jsonb,
  feature_schema_json jsonb not null default '{}'::jsonb,
  is_champion boolean not null default false,
  status model_status not null default 'training',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_models_experiment on public.models (experiment_id);
create index if not exists idx_models_workspace_champion
  on public.models (workspace_id)
  where is_champion = true and status = 'ready';

create table if not exists public.predictions (
  id uuid primary key default gen_random_uuid(),
  model_id uuid not null references public.models (id) on delete cascade,
  workspace_id uuid not null references public.experiment_workspaces (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  job_id uuid references public.jobs (id) on delete set null,
  input_ref text,
  input_json jsonb,
  output_json jsonb not null default '{}'::jsonb,
  explanation_json jsonb,
  status prediction_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_predictions_model_created
  on public.predictions (model_id, created_at desc);

-- ---------------------------------------------------------------------------
-- reports (Markdown + PDF in v1)
-- ---------------------------------------------------------------------------
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.experiment_workspaces (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  title text not null,
  report_type report_type not null default 'custom',
  storage_path_md text,  -- Supabase Storage .md
  storage_path_pdf text, -- Supabase Storage .pdf
  outline_json jsonb not null default '{}'::jsonb,
  content_md text,
  related_experiment_ids uuid[] not null default '{}',
  related_model_ids uuid[] not null default '{}',
  agent_run_id uuid references public.agent_runs (id) on delete set null,
  status report_status not null default 'drafting',
  job_id uuid references public.jobs (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_reports_workspace_created
  on public.reports (workspace_id, created_at desc);

-- ---------------------------------------------------------------------------
-- AI conversations (workspace-scoped)
-- ---------------------------------------------------------------------------
create table if not exists public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.experiment_workspaces (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  title text,
  context_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversations (id) on delete cascade,
  role message_role not null,
  content text not null,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_ai_messages_conversation_created
  on public.ai_messages (conversation_id, created_at);

-- ---------------------------------------------------------------------------
-- agent activities + system logs
-- ---------------------------------------------------------------------------
create table if not exists public.agent_activities (
  id uuid primary key default gen_random_uuid(),
  agent_run_id uuid references public.agent_runs (id) on delete cascade,
  workspace_id uuid not null references public.experiment_workspaces (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  job_id uuid references public.jobs (id) on delete set null,
  experiment_id uuid references public.experiments (id) on delete set null,
  conversation_id uuid references public.ai_conversations (id) on delete set null,
  agent_name text not null,
  activity_type text not null,
  status activity_status not null default 'started',
  payload_json jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists idx_agent_activities_workspace_started
  on public.agent_activities (workspace_id, started_at desc);
create index if not exists idx_agent_activities_run
  on public.agent_activities (agent_run_id);
create index if not exists idx_agent_activities_job
  on public.agent_activities (job_id);

create table if not exists public.system_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users (id) on delete set null,
  level text not null,
  source text not null,
  message text not null,
  context_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_system_logs_created
  on public.system_logs (created_at desc);

-- ---------------------------------------------------------------------------
-- memory_chunks (pgvector — replaces external vector DB)
-- ---------------------------------------------------------------------------
-- Dimension placeholder: change to match chosen EmbeddingModel at migration time.
create table if not exists public.memory_chunks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.experiment_workspaces (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  conversation_id uuid references public.ai_conversations (id) on delete set null,
  kind text not null,
  source_type text,
  source_id uuid,
  content text not null,
  embedding vector(1536),
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_memory_chunks_workspace_kind
  on public.memory_chunks (workspace_id, kind);
create index if not exists idx_memory_chunks_conversation
  on public.memory_chunks (conversation_id);

-- Vector index (choose HNSW or IVFFlat at migration time based on corpus size)
-- create index idx_memory_chunks_embedding_hnsw
--   on public.memory_chunks using hnsw (embedding vector_cosine_ops);

-- ---------------------------------------------------------------------------
-- LangGraph Postgres checkpointer
-- ---------------------------------------------------------------------------
-- LangGraph's PostgresSaver (or equivalent) manages its own checkpoint tables.
-- Application code correlates via agent_runs.checkpoint_thread_id.
-- Do NOT use Redis for LangGraph checkpoints.

-- ---------------------------------------------------------------------------
-- RLS (owner-only v1) — enable + example policies
-- ---------------------------------------------------------------------------
alter table public.users enable row level security;
alter table public.projects enable row level security;
alter table public.experiment_workspaces enable row level security;
alter table public.datasets enable row level security;
alter table public.dataset_versions enable row level security;
alter table public.dataset_metadata enable row level security;
alter table public.jobs enable row level security;
alter table public.agent_runs enable row level security;
alter table public.experiments enable row level security;
alter table public.models enable row level security;
alter table public.predictions enable row level security;
alter table public.reports enable row level security;
alter table public.ai_conversations enable row level security;
alter table public.ai_messages enable row level security;
alter table public.agent_activities enable row level security;
alter table public.memory_chunks enable row level security;
alter table public.system_logs enable row level security;

-- Example policies (design). Recreate carefully in migrations.
-- users
-- create policy users_select_own on public.users for select using (auth.uid() = id);
-- create policy users_update_own on public.users for update using (auth.uid() = id);

-- projects / experiment_workspaces
-- create policy projects_owner_all on public.projects for all
--   using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- create policy workspaces_owner_all on public.experiment_workspaces for all
--   using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- datasets / dataset_versions (user_id denormalized)
-- create policy datasets_owner_all on public.datasets for all
--   using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- create policy dataset_versions_owner_all on public.dataset_versions for all
--   using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- dataset_metadata via parent ownership
-- create policy dataset_metadata_owner_select on public.dataset_metadata for select using (
--   exists (
--     select 1 from public.dataset_versions dv
--     where dv.id = dataset_version_id and dv.user_id = auth.uid()
--   )
-- );

-- Repeat analogous owner policies for jobs, agent_runs, experiments, models,
-- predictions, reports, ai_conversations, agent_activities, memory_chunks.
-- ai_messages: via conversation ownership join.
-- system_logs: select own rows; inserts via service role.
