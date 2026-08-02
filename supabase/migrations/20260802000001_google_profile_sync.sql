-- Map Google OAuth metadata (name / picture) into public.users.
-- Google usually sends: name, full_name, picture (and sometimes avatar_url).

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  resolved_name text;
  resolved_avatar text;
begin
  resolved_name := nullif(trim(coalesce(
    meta->>'full_name',
    meta->>'name',
    nullif(trim(concat_ws(' ', meta->>'given_name', meta->>'family_name')), ''),
    split_part(coalesce(new.email, ''), '@', 1)
  )), '');

  resolved_avatar := nullif(trim(coalesce(
    meta->>'avatar_url',
    meta->>'picture'
  )), '');

  insert into public.users (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    resolved_name,
    resolved_avatar
  )
  on conflict (id) do update
    set email = excluded.email,
        -- Fill blanks from provider; never overwrite a name the user already set.
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

-- When Google metadata arrives later (identity link / refresh), backfill blanks.
drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
  after update of email, raw_user_meta_data on auth.users
  for each row
  when (old.raw_user_meta_data is distinct from new.raw_user_meta_data
        or old.email is distinct from new.email)
  execute function public.handle_new_user();

revoke all on function public.handle_new_user() from public;
revoke execute on function public.handle_new_user() from anon, authenticated;
grant execute on function public.handle_new_user() to supabase_auth_admin;
