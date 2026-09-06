-- Deploy compatible update-user, GM and submission handlers BEFORE this restriction.
-- Profiles are created by the trusted Auth trigger; settings and entitlements are
-- written by authenticated handlers with explicit field and owner selection.
revoke insert, update, delete, truncate, references, trigger
  on public.public_user, public.content_update from public, anon, authenticated;

-- Table revokes do not remove any separately granted column privileges.
do $$
declare column_record record;
begin
  for column_record in
    select table_name, column_name from information_schema.columns
    where table_schema = 'public' and table_name in ('public_user', 'content_update')
  loop
    execute format('revoke insert (%I), update (%I), references (%I) on public.%I from public, anon, authenticated',
      column_record.column_name, column_record.column_name, column_record.column_name, column_record.table_name);
  end loop;
end;
$$;

drop policy if exists "Users can insert their own profile." on public.public_user;
drop policy if exists "Users can update own profile." on public.public_user;
drop policy if exists "Enable insert, update, and delete for authenticated users" on public.content_update;

-- Preserve the existing request-scoped character write path and campaign guard.
-- Tighten its INSERT policy so direct REST cannot forge another account's ownership.
alter policy "Enable insert for authenticated users only" on public.character
  with check (auth.uid() = user_id);

notify pgrst, 'reload schema';
