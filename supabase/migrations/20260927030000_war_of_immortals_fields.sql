do $repair$
declare
  patches constant jsonb := $patches$
  [
    {"table":"ability_block","id":38754,"field":"name","before":"Apparition Stabiliization","after":"Apparition Stabilization"},
    {"table":"ability_block","id":38768,"field":"name","before":"Whispers of Warning","after":"Whisper of Warning"},
    {"table":"ability_block","id":39022,"name":"Exemplar Dedication","field":"rarity","before":"COMMON","after":"RARE"},
    {"table":"archetype","id":292,"name":"Exemplar","field":"rarity","before":"COMMON","after":"RARE"},
    {"table":"item","id":16928,"name":"Dragon-Lotus Drum","field":"bulk","before":"2","after":"1"},
    {"table":"item","id":16929,"name":"Final Scalecloak","field":"usage","before":"work cloak","after":"worn cloak"},
    {"table":"item","id":17391,"name":"Fishing Lure","field":"rarity","before":"COMMON","after":"UNCOMMON"}
  ]
  $patches$::jsonb;
  patch jsonb;
  original text;
  current_name text;
  source_id bigint;
  content_type text;
  matched_count integer;
begin
  for patch in select value from jsonb_array_elements(patches) loop
    if (patch->>'table' = 'ability_block' and patch->>'field' not in ('name', 'rarity'))
       or (patch->>'table' = 'archetype' and patch->>'field' <> 'rarity')
       or (patch->>'table' = 'item' and patch->>'field' not in ('bulk', 'usage', 'rarity'))
       or patch->>'table' not in ('ability_block', 'archetype', 'item') then
      raise exception 'Unexpected War of Immortals field: %.%', patch->>'table', patch->>'field';
    end if;
    execute format('select %I, name, content_source_id from public.%I where id = $1 for update', patch->>'field', patch->>'table')
      into original, current_name, source_id using (patch->>'id')::bigint;
    get diagnostics matched_count = row_count;
    if matched_count <> 1 or source_id <> 400 then
      raise exception 'Missing or changed War of Immortals entry: %', patch->>'id';
    end if;
    if patch->>'field' <> 'name' and current_name <> patch->>'name' then
      raise exception 'Changed War of Immortals entry name: %', patch->>'id';
    end if;
    if original = patch->>'after' then continue; end if;
    if original is distinct from patch->>'before' then
      raise exception 'Changed War of Immortals field: %.%', current_name, patch->>'field';
    end if;
    content_type := replace(patch->>'table', '_', '-');
    if exists (select 1 from public.content_update
      where type = content_type and ref_id = (patch->>'id')::bigint and status->>'state' = 'PENDING') then
      raise exception 'Entry has a pending curator submission: %', current_name;
    end if;
    execute format('update public.%I set %I = %L where id = $1', patch->>'table', patch->>'field', patch->>'after')
      using (patch->>'id')::bigint;
  end loop;
end
$repair$;
