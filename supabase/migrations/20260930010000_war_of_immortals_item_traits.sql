-- Preserve intrinsic traits when a parent item is outside the enabled source set.
do $repair$
declare
  patches constant jsonb := $patches$
  [
    {"id":17481,"name":"Gut-Ripper","uuid":6490041854253359,"level":7,"url":"https://2e.aonprd.com/Equipment.aspx?ID=3512","before":[1504,4072],"after":[1504,4072,1706,1537]},
    {"id":17480,"name":"Dreamweb Bolt","uuid":1893225331339800,"level":0,"url":"https://2e.aonprd.com/Equipment.aspx?ID=3517","before":[],"after":[1533]}
  ]
  $patches$::jsonb;
  patch jsonb;
  entry public.item%rowtype;
  required_trait record;
  next_traits bigint[];
begin
  for required_trait in select * from (values
    (1706::bigint, 'Deadly d10'), (1537::bigint, 'Trip'), (1533::bigint, 'Precious')
  ) as expected(id, name) loop
    if not exists (
      select 1 from public.trait
      where id = required_trait.id and name = required_trait.name
        and content_source_id = 3
    ) then
      raise exception 'Missing or changed intrinsic item trait: %', required_trait.name;
    end if;
  end loop;

  for patch in select value from jsonb_array_elements(patches) loop
    select * into entry from public.item where id = (patch->>'id')::bigint for update;
    if not found or entry.name is distinct from patch->>'name'
       or entry.uuid is distinct from (patch->>'uuid')::bigint
       or entry.level is distinct from (patch->>'level')::integer
       or entry.content_source_id is distinct from 400
       or entry.meta_data #>> '{source,url}' is distinct from patch->>'url' then
      raise exception 'Missing or changed War of Immortals item: %', patch->>'name';
    end if;
    if exists (
      select 1 from public.content_update
      where type = 'item' and ref_id = entry.id and status->>'state' = 'PENDING'
    ) then
      raise exception 'Item has a pending curator submission: %', entry.name;
    end if;
    if to_jsonb(entry.traits) = patch->'after' then continue; end if;
    if to_jsonb(entry.traits) is distinct from patch->'before' then
      raise exception 'Changed War of Immortals item traits: %', entry.name;
    end if;
    select coalesce(array_agg(value::bigint order by ordinal), '{}'::bigint[])
      into next_traits
      from jsonb_array_elements_text(patch->'after') with ordinality as traits(value, ordinal);
    update public.item set traits = next_traits where id = entry.id;
  end loop;
end
$repair$;
