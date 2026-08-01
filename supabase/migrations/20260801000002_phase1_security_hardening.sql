-- Syntrix AI — Phase 1 security hardening (advisors)
-- Applied live via Supabase MCP as migration `phase1_security_hardening`.
-- Safe to re-run; mirrors post-apply fixes for fresh environments that
-- already used an older copy of phase1_foundation without these locks.

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

revoke all on function public.handle_new_user() from public;
revoke execute on function public.handle_new_user() from anon, authenticated;
grant execute on function public.handle_new_user() to supabase_auth_admin;

do $$
begin
  if exists (
    select 1 from pg_extension e
    join pg_namespace n on n.oid = e.extnamespace
    where e.extname = 'vector' and n.nspname = 'public'
  ) then
    alter extension vector set schema extensions;
  end if;
exception when others then
  raise notice 'Could not move vector extension: %', sqlerrm;
end $$;
