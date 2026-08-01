-- Syntrix AI — Phase 3–6 additive extensions (safe, non-destructive)

-- Cache SHAP/explanation payloads on models
alter table public.models
  add column if not exists explanation_json jsonb not null default '{}'::jsonb;

-- Optional signed download helper metadata on reports
alter table public.reports
  add column if not exists summary_json jsonb not null default '{}'::jsonb;

-- Faster agent timeline reads
create index if not exists idx_agent_activities_run_started
  on public.agent_activities (agent_run_id, started_at desc);

-- Optional HNSW for memory (no-op if extension/type unavailable)
do $$
begin
  create index if not exists idx_memory_chunks_embedding_hnsw
    on public.memory_chunks using hnsw (embedding vector_cosine_ops);
exception when others then
  raise notice 'Skipping HNSW index: %', sqlerrm;
end $$;

comment on column public.models.explanation_json is 'Phase 5 SHAP/LIME explanation cache';
