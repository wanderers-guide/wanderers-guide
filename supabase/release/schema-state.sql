-- Read-only compatibility inventory. These objects implement the seven historical
-- migrations reconciled on 2026-09-05. Unrelated schema additions are permitted.
with content_tables(name) as (
  select unnest(array['ability_block', 'ancestry', 'archetype', 'background', 'class',
    'class_archetype', 'content_source', 'creature', 'item', 'language', 'spell',
    'trait', 'versatile_heritage'])
), state as (
  select 'column:' || table_name || '.' || column_name as id,
    jsonb_build_object('type', udt_name, 'nullable', is_nullable,
      'default', column_default)::text as definition
  from information_schema.columns
  where table_schema = 'public' and (
    (table_name in (select name from content_tables) and column_name = 'updated_at') or
    (table_name in (select name from content_tables where name <> 'content_source') and column_name = 'meta_data') or
    (table_name = 'character' and column_name = 'updated_at') or
    table_name = 'campaign_join_grant')
  union all
  select 'function:' || p.proname, pg_get_functiondef(p.oid)
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname in (
    'set_character_updated_at', 'set_content_updated_at',
    'bump_content_source_updated_at', 'enforce_character_campaign_membership')
  union all
  select 'trigger:' || c.relname || '.' || t.tgname,
    jsonb_build_object('enabled', t.tgenabled, 'definition', pg_get_triggerdef(t.oid))::text
  from pg_trigger t join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and not t.tgisinternal and (
    t.tgname in ('character_set_updated_at', 'character_campaign_membership') or
    (c.relname in (select name from content_tables) and
      t.tgname in (c.relname || '_set_updated_at', c.relname || '_bump_source_updated_at')))
  union all
  select 'index:' || indexname, indexdef from pg_indexes
  where schemaname = 'public' and tablename in (select name from content_tables)
    and indexname = tablename || '_meta_data_gin'
  union all
  select 'constraint:campaign_join_grant.' || con.conname, pg_get_constraintdef(con.oid)
  from pg_constraint con where con.conrelid = to_regclass('public.campaign_join_grant')
  union all
  select 'rls:campaign_join_grant', jsonb_build_object('enabled', c.relrowsecurity,
    'public_policies', (select count(*) from pg_policy p where p.polrelid = c.oid))::text
  from pg_class c where c.oid = to_regclass('public.campaign_join_grant')
  union all
  select 'grant:' || r.role || '.' || c.table_name || '.' || c.column_name,
    has_column_privilege(r.role, 'public.' || c.table_name, c.column_name, 'SELECT')::text
  from (values ('anon'), ('authenticated')) r(role)
  cross join information_schema.columns c
  where c.table_schema = 'public' and c.table_name in ('public_user', 'campaign')
)
select id, definition from state order by id;
