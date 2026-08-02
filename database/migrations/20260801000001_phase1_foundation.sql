-- Syntrix AI — Phase 1 foundation migration
-- Target: Supabase Cloud PostgreSQL + pgvector (primary/only app DB path)
-- Applies design DDL from database/schema.sql with owner-only RLS + Storage buckets.
--
-- Apply to a linked Supabase Cloud project (SQL Editor or `supabase db push`).
-- Do NOT rely on a local Postgres Compose service for the application database.
--
-- Access control v1: owner-only — policies use auth.uid() = user_id (or join to owner).
-- Future orgs/teams (NOT in this migration): add project_members / organizations later
-- and switch RLS to membership checks. No unused organization_id columns in v1.

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto" with schema extensions;
create extension if not exists "vector" with schema extensions;

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

-- ---------------------------------------------------------------------------
-- updated_at helper
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- users (mirrors auth.users.id)
-- ---------------------------------------------------------------------------
create table if not exists public.users (
  id uuid primary key,
  email text not null unique,
  display_name text,
  avatar_url text,
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_users_updated_at on public.users;
create trigger trg_users_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

-- Sync public.users from auth.users
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do update
    set email = excluded.email,
        display_name = coalesce(public.users.display_name, excluded.display_name),
        avatar_url = coalesce(public.users.avatar_url, excluded.avatar_url),
        updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Trigger-only: do not expose as callable RPC
revoke all on function public.handle_new_user() from public;
revoke execute on function public.handle_new_user() from anon, authenticated;
grant execute on function public.handle_new_user() to supabase_auth_admin;

-- ---------------------------------------------------------------------------
-- projects
-- Owner: user_id (= auth.users.id). Future: project_members for org/team access.
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

drop trigger if exists trg_projects_updated_at on public.projects;
create trigger trg_projects_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- experiment_workspaces
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

drop trigger if exists trg_workspaces_updated_at on public.experiment_workspaces;
create trigger trg_workspaces_updated_at
  before update on public.experiment_workspaces
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- datasets / versions / metadata (schema ready; upload UI in Phase 2)
-- ---------------------------------------------------------------------------
create table if not exists public.datasets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  name text not null,
  storage_path text not null,
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

drop trigger if exists trg_datasets_updated_at on public.datasets;
create trigger trg_datasets_updated_at
  before update on public.datasets
  for each row execute function public.set_updated_at();

create table if not exists public.dataset_versions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.experiment_workspaces (id) on delete cascade,
  dataset_id uuid not null references public.datasets (id) on delete restrict,
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  version_number integer not null,
  label text,
  storage_path text not null,
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

drop trigger if exists trg_dataset_versions_updated_at on public.dataset_versions;
create trigger trg_dataset_versions_updated_at
  before update on public.dataset_versions
  for each row execute function public.set_updated_at();

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

drop trigger if exists trg_dataset_metadata_updated_at on public.dataset_metadata;
create trigger trg_dataset_metadata_updated_at
  before update on public.dataset_metadata
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- jobs
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

drop trigger if exists trg_jobs_updated_at on public.jobs;
create trigger trg_jobs_updated_at
  before update on public.jobs
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- agent_runs (schema for later phases; checkpoints correlate here)
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
  checkpoint_thread_id text,
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

drop trigger if exists trg_agent_runs_updated_at on public.agent_runs;
create trigger trg_agent_runs_updated_at
  before update on public.agent_runs
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- experiments / models / predictions
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

drop trigger if exists trg_experiments_updated_at on public.experiments;
create trigger trg_experiments_updated_at
  before update on public.experiments
  for each row execute function public.set_updated_at();

create table if not exists public.models (
  id uuid primary key default gen_random_uuid(),
  experiment_id uuid not null references public.experiments (id) on delete cascade,
  workspace_id uuid not null references public.experiment_workspaces (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  name text not null,
  algorithm text not null,
  task_type task_type not null,
  artifact_path text,
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

drop trigger if exists trg_models_updated_at on public.models;
create trigger trg_models_updated_at
  before update on public.models
  for each row execute function public.set_updated_at();

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

drop trigger if exists trg_predictions_updated_at on public.predictions;
create trigger trg_predictions_updated_at
  before update on public.predictions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- reports
-- ---------------------------------------------------------------------------
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.experiment_workspaces (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  title text not null,
  report_type report_type not null default 'custom',
  storage_path_md text,
  storage_path_pdf text,
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

drop trigger if exists trg_reports_updated_at on public.reports;
create trigger trg_reports_updated_at
  before update on public.reports
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- AI conversations
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

drop trigger if exists trg_ai_conversations_updated_at on public.ai_conversations;
create trigger trg_ai_conversations_updated_at
  before update on public.ai_conversations
  for each row execute function public.set_updated_at();

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
-- memory_chunks (pgvector)
-- ---------------------------------------------------------------------------
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

-- HNSW index created when embeddings are written (Phase 4+); optional early:
-- create index if not exists idx_memory_chunks_embedding_hnsw
--   on public.memory_chunks using hnsw (embedding vector_cosine_ops);

-- ---------------------------------------------------------------------------
-- RLS: owner-only (v1) — locked. Org/team membership deferred.
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

-- users
drop policy if exists users_select_own on public.users;
create policy users_select_own on public.users
  for select using (auth.uid() = id);

drop policy if exists users_update_own on public.users;
create policy users_update_own on public.users
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- Helper: owner policy pattern for tables with user_id
drop policy if exists projects_owner_all on public.projects;
create policy projects_owner_all on public.projects
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists workspaces_owner_all on public.experiment_workspaces;
create policy workspaces_owner_all on public.experiment_workspaces
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists datasets_owner_all on public.datasets;
create policy datasets_owner_all on public.datasets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists dataset_versions_owner_all on public.dataset_versions;
create policy dataset_versions_owner_all on public.dataset_versions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists dataset_metadata_owner_all on public.dataset_metadata;
create policy dataset_metadata_owner_all on public.dataset_metadata
  for all using (
    exists (
      select 1 from public.dataset_versions dv
      where dv.id = dataset_version_id and dv.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.dataset_versions dv
      where dv.id = dataset_version_id and dv.user_id = auth.uid()
    )
  );

drop policy if exists jobs_owner_all on public.jobs;
create policy jobs_owner_all on public.jobs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists agent_runs_owner_all on public.agent_runs;
create policy agent_runs_owner_all on public.agent_runs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists experiments_owner_all on public.experiments;
create policy experiments_owner_all on public.experiments
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists models_owner_all on public.models;
create policy models_owner_all on public.models
  for all using (
    exists (
      select 1 from public.experiments e
      where e.id = experiment_id and e.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.experiments e
      where e.id = experiment_id and e.user_id = auth.uid()
    )
  );

drop policy if exists predictions_owner_all on public.predictions;
create policy predictions_owner_all on public.predictions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists reports_owner_all on public.reports;
create policy reports_owner_all on public.reports
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists ai_conversations_owner_all on public.ai_conversations;
create policy ai_conversations_owner_all on public.ai_conversations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists ai_messages_owner_all on public.ai_messages;
create policy ai_messages_owner_all on public.ai_messages
  for all using (
    exists (
      select 1 from public.ai_conversations c
      where c.id = conversation_id and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.ai_conversations c
      where c.id = conversation_id and c.user_id = auth.uid()
    )
  );

drop policy if exists agent_activities_owner_all on public.agent_activities;
create policy agent_activities_owner_all on public.agent_activities
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists memory_chunks_owner_all on public.memory_chunks;
create policy memory_chunks_owner_all on public.memory_chunks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists system_logs_select_own on public.system_logs;
create policy system_logs_select_own on public.system_logs
  for select using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Storage buckets (Phase 1 prep; upload flows in Phase 2)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('datasets', 'datasets', false, 104857600, array[
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/octet-stream',
    'application/parquet'
  ]),
  ('models', 'models', false, 524288000, null),
  ('reports', 'reports', false, 52428800, array['text/markdown', 'text/plain', 'application/pdf'])
on conflict (id) do nothing;

-- Owner-scoped object access via first path segment = auth.uid()
-- Convention: {user_id}/{project_id}/...
drop policy if exists storage_datasets_owner on storage.objects;
create policy storage_datasets_owner on storage.objects
  for all to authenticated
  using (bucket_id = 'datasets' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'datasets' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists storage_models_owner on storage.objects;
create policy storage_models_owner on storage.objects
  for all to authenticated
  using (bucket_id = 'models' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'models' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists storage_reports_owner on storage.objects;
create policy storage_reports_owner on storage.objects
  for all to authenticated
  using (bucket_id = 'reports' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'reports' and (storage.foldername(name))[1] = auth.uid()::text);
