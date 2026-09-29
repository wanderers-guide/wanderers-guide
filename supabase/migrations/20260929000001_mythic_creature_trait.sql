do $mythic_creature_trait$
declare
  existing public.trait;
begin
  select * into existing
  from public.trait
  where id = 4072
  for update;

  if not found
    or existing.uuid is distinct from 4605683250679547
    or existing.name is distinct from 'Mythic'
    or existing.content_source_id is distinct from 400 then
    raise exception 'Mythic trait changed; review before enabling it on creatures';
  end if;

  if existing.meta_data is null
    or jsonb_typeof(existing.meta_data) is distinct from 'object'
    or coalesce(existing.meta_data->>'creature_trait', 'false') not in ('true', 'false') then
    raise exception 'Mythic creature trait metadata changed; review before updating';
  end if;

  update public.trait
  set meta_data = jsonb_set(meta_data, '{creature_trait}', 'true'::jsonb)
  where id = 4072 and meta_data->>'creature_trait' is distinct from 'true';
end
$mythic_creature_trait$;
