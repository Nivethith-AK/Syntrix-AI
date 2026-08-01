-- Syntrix AI — Phase 2 datasets & EDA vertical
-- Additive only: do not wipe data. Safe to re-run (IF NOT EXISTS / guarded DDL).

alter table public.dataset_metadata
  add column if not exists eda_json jsonb not null default '{}'::jsonb;

comment on column public.dataset_metadata.eda_json is
  'Phase 2 EDA v1 chart/insight payload (histograms, missingness, correlations, etc.)';

create index if not exists idx_dataset_versions_status
  on public.dataset_versions (workspace_id, status);

create index if not exists idx_datasets_status
  on public.datasets (project_id, status)
  where deleted_at is null;
