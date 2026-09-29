do $monster_count$
declare
  stored_count integer;
begin
  if (
    select count(*) from public.creature
    where content_source_id = 400 and type = 'creature'
  ) <> 11 then
    raise exception 'War of Immortals creature count changed; review before updating source metadata';
  end if;

  select (meta_data::jsonb #>> '{counts,creature}')::integer
  into stored_count
  from public.content_source
  where id = 400 and name = 'War of Immortals' and is_published
  for update;

  if not found or stored_count not in (0, 11) then
    raise exception 'War of Immortals source creature count changed; review before updating';
  end if;

  update public.content_source
  set meta_data = jsonb_set(
    coalesce(meta_data::jsonb, '{}'::jsonb),
    '{counts}',
    coalesce(meta_data::jsonb->'counts', '{}'::jsonb) || '{"creature":11}'::jsonb,
    true
  )::json
  where id = 400
    and coalesce((meta_data::jsonb #>> '{counts,creature}')::integer, 0) <> 11;
end
$monster_count$;
