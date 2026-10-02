do $repair$
declare
  patches constant jsonb := $patches$
  [
    {"id":11925,"name":"Devil's Bargain","uuid":"4024487092735678","source":16,"level":6,"path":["traits"],"before":[1577],"after":[1527,1504,1846]},
    {"id":12410,"name":"Skinsaw Mask","uuid":"8304668112940097","source":16,"level":3,"path":["traits"],"before":[1475,1577,1527],"after":[1475,1846,1527]},
    {"id":12000,"name":"Faerie Queen's Bower","uuid":"7955748466843685","source":16,"level":13,"path":["traits"],"before":[1475,1581,1613,2860],"after":[1475,1630,1613,2860,1527]},
    {"id":12000,"name":"Faerie Queen's Bower","uuid":"7955748466843685","source":16,"level":13,"path":["group"],"before":"WEAPON","after":"ARMOR"},
    {"id":12605,"name":"Wand of Dazzling Rays (3rd-level)","uuid":"4359396407182879","source":16,"level":8,"path":["traits"],"before":[1542,1581,1517,1504,1665],"after":[1542,1630,1517,1504,1665]},
    {"id":12606,"name":"Wand of Dazzling Rays (4th-level)","uuid":"8159873792877881","source":16,"level":10,"path":["traits"],"before":[1542,1581,1517,1504,1665],"after":[1542,1630,1517,1504,1665]},
    {"id":12607,"name":"Wand of Dazzling Rays (5th-level)","uuid":"4782914278264481","source":16,"level":12,"path":["traits"],"before":[1542,1581,1517,1504,1665],"after":[1542,1630,1517,1504,1665]},
    {"id":12608,"name":"Wand of Dazzling Rays (6th-level)","uuid":"3471522184663324","source":16,"level":14,"path":["traits"],"before":[1542,1581,1517,1504,1665],"after":[1542,1630,1517,1504,1665]},
    {"id":12609,"name":"Wand of Dazzling Rays (7th-level)","uuid":"7118490375639855","source":16,"level":16,"path":["traits"],"before":[1542,1581,1517,1504,1665],"after":[1542,1630,1517,1504,1665]},
    {"id":12610,"name":"Wand of Dazzling Rays (8th-level)","uuid":"5538114626025655","source":16,"level":18,"path":["traits"],"before":[1542,1581,1517,1504,1665],"after":[1542,1630,1517,1504,1665]},
    {"id":12611,"name":"Wand of Dazzling Rays (9th-level)","uuid":"4716862529480946","source":16,"level":20,"path":["traits"],"before":[1542,1581,1517,1504,1665],"after":[1542,1630,1517,1504,1665]},
    {"id":12147,"name":"Leaf Weave","uuid":"693254247930899","source":16,"level":0,"path":["group"],"before":"WEAPON","after":"ARMOR"},
    {"id":12175,"name":"Living Leaf Weave","uuid":"6903624769179576","source":16,"level":5,"path":["group"],"before":"WEAPON","after":"ARMOR"},
    {"id":12399,"name":"Shared-Pain Sankeit","uuid":"1582869616288572","source":16,"level":14,"path":["group"],"before":"WEAPON","after":"ARMOR"},
    {"id":12399,"name":"Shared-Pain Sankeit","uuid":"1582869616288572","source":16,"level":14,"path":["meta_data","runes","potency"],"before":1,"after":2},
    {"id":12732,"name":"Wooden Breastplate","uuid":"6932044382521709","source":16,"level":0,"path":["group"],"before":"WEAPON","after":"ARMOR"}
  ]
  $patches$::jsonb;
  patch jsonb;
  item_row public.item%rowtype;
  field_path text[];
  current_value jsonb;
  changed_rows integer;
begin
  lock table public.content_update in share mode;
  -- Acquire every reviewed child before source locks or cache-trigger writes.
  perform i.id from public.item i where i.id in (
    select (value->>'id')::bigint from jsonb_array_elements(patches)
  ) order by i.id for update;
  perform t.id from public.trait t
    where t.id in (1475,1504,1517,1527,1542,1613,1630,1665,1846,2860)
    order by t.id for share;
  perform id from public.content_source where id in (3,16)
    and user_id is null and is_published is true order by id for update;
  get diagnostics changed_rows = row_count;
  if changed_rows <> 2 then raise exception 'Missing official Treasure Vault sources'; end if;
  perform t.id from public.trait t join (values
    (1527,'Invested'),(1504,'Magical'),(1846,'Unholy'),(1475,'Divine'),(1630,'Holy'),
    (1613,'Intelligent'),(2860,'Laminar'),(1542,'Fire'),(1517,'Light'),(1665,'Wand')
  ) as expected(id,name) on t.id=expected.id and t.name=expected.name
    where t.content_source_id=3 order by t.id for share of t;
  get diagnostics changed_rows = row_count;
  if changed_rows <> 10 then raise exception 'Missing Treasure Vault trait dependency'; end if;

  for patch in select value from jsonb_array_elements(patches) order by (value->>'id')::bigint loop
    select * into item_row from public.item where id = (patch->>'id')::bigint for update;
    if not found or item_row.name is distinct from patch->>'name'
      or item_row.uuid is distinct from (patch->>'uuid')::bigint
      or item_row.content_source_id is distinct from (patch->>'source')::bigint
      or item_row.level is distinct from (patch->>'level')::integer then
      raise exception 'Missing or changed Treasure Vault equipment: %', patch->>'name';
    end if;
    if exists (select 1 from public.content_update where type = 'item'
      and ref_id = item_row.id and status->>'state' = 'PENDING') then
      raise exception 'Equipment has a pending curator submission: %', patch->>'name';
    end if;
    select array_agg(value order by ordinality) into field_path
      from jsonb_array_elements_text(patch->'path') with ordinality;
    current_value := to_jsonb(item_row) #> field_path;
    if current_value = patch->'after' then continue; end if;
    if current_value is distinct from patch->'before' then
      raise exception 'Equipment value differs from reviewed entry: %', patch->>'name';
    end if;
    if field_path = array['traits']::text[] then
      update public.item
        set traits = array(select value::bigint from jsonb_array_elements_text(patch->'after'))
        where id = item_row.id and traits is not distinct from item_row.traits;
    elsif field_path = array['group']::text[] then
      update public.item set "group" = patch->>'after'
        where id = item_row.id and "group" is not distinct from item_row."group";
    elsif field_path = array['meta_data','runes','potency']::text[] then
      update public.item set meta_data = jsonb_set(meta_data,field_path[2:],patch->'after',false)
        where id = item_row.id and meta_data is not distinct from item_row.meta_data;
    else
      raise exception 'Unsupported equipment repair path';
    end if;
    get diagnostics changed_rows = row_count;
    if changed_rows <> 1 then raise exception 'Equipment changed during repair'; end if;
  end loop;
end
$repair$;
