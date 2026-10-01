do $repair$
declare
  patches constant jsonb := $patches$
  [
    {"id":12041,"name":"Gelid Shard","uuid":"8754698536326669","source":16,"level":2,"traits":[1459,1568,1519,1527],"citation":{"url":"https://2e.aonprd.com/Equipment.aspx?ID=4898","book":"Treasure Vault","page":"184"},"description":{"before":"aaa2cf56d8c43bafc5c18bf896f21ad1","after":"aaa2cf56d8c43bafc5c18bf896f21ad1","replacements":[]},"operations":[{"id":"1ea4abe0-2aab-45f0-a5c7-1edd7f3c0210","type":"adjValue","data":{"variable":"RESISTANCES","value":"cold, {{level}}"}},{"id":"d4b7796e-a060-4103-b4a9-c4846b9286ce","type":"addBonusToValue","data":{"variable":"SAVE_FORT","value":2,"type":"status","text":"against [emotion](link_trait_1486) effects"}},{"id":"394ee897-9a5e-42db-bcf0-879f513e45bf","type":"addBonusToValue","data":{"variable":"SAVE_REFLEX","value":2,"type":"status","text":"against [emotion](link_trait_1486) effects"}},{"id":"2b29bc66-3b77-4e3a-81eb-a443d7df12d7","type":"addBonusToValue","data":{"variable":"SAVE_WILL","value":2,"type":"status","text":"against [emotion](link_trait_1486) effects"}}]},
    {"id":12573,"name":"Ursine Avenger Hood","uuid":"2453284399945122","source":16,"level":2,"traits":[1568,1527,1454],"citation":{"url":"https://2e.aonprd.com/Equipment.aspx?ID=4897","book":"Treasure Vault","page":"183"},"description":{"before":"d35485b84e7f20ed636ee25269ad8e15","after":"0a6868a9bbd15d010621eab400616c82","replacements":[{"from":"\\[\\[Command an Animal\\]\\]","to":"[Command an Animal](link_action_19614)","count":1},{"from":"\\[\\[Make an Impression\\]\\]","to":"[Make an Impression](link_action_19739)","count":1}]},"operations":[{"id":"e06b2490-12a0-4673-b28c-43e246695f80","type":"addBonusToValue","data":{"variable":"SKILL_NATURE","value":1,"type":"item","text":"to [Command an Animal](link_action_19614) (+2 if the animal is a bear)"}}]}
  ]
  $patches$::jsonb;
  dependencies constant jsonb := $dependencies$
  [
    {"table":"trait","id":1486,"name":"Emotion","uuid":"3036864546165598","source":3},
    {"table":"trait","id":1527,"name":"Invested","uuid":"370388764978504","source":3},
    {"table":"ability-block","id":19614,"name":"Command an Animal","uuid":"4398828153695138","source":3,"type":"action"},
    {"table":"ability-block","id":19739,"name":"Make an Impression","uuid":"3944295765726991","source":3,"type":"action"}
  ]
  $dependencies$::jsonb;
  patch jsonb;
  replacement jsonb;
  item_row public.item%rowtype;
  next_operations json[];
  next_description text;
  changed_rows integer;
begin
  lock table public.content_update in share mode;
  perform id from public.content_source where id in (3,16)
    and user_id is null and is_published is true order by id for update;
  get diagnostics changed_rows = row_count;
  if changed_rows <> 2 then raise exception 'Missing official passive bonus sources'; end if;

  perform t.id from public.trait t join jsonb_array_elements(dependencies) d
    on d->>'table' = 'trait' and t.id = (d->>'id')::bigint
    where t.name = d->>'name' and t.uuid = (d->>'uuid')::bigint
      and t.content_source_id = (d->>'source')::bigint
    order by t.id for share of t;
  get diagnostics changed_rows = row_count;
  if changed_rows <> 2 then raise exception 'Passive bonus trait identity changed'; end if;

  perform a.id from public.ability_block a join jsonb_array_elements(dependencies) d
    on d->>'table' = 'ability-block' and a.id = (d->>'id')::bigint
    where a.name = d->>'name' and a.uuid = (d->>'uuid')::bigint
      and a.content_source_id = (d->>'source')::bigint and a.type = d->>'type'
    order by a.id for share of a;
  get diagnostics changed_rows = row_count;
  if changed_rows <> 2 then raise exception 'Passive bonus action identity changed'; end if;

  if exists (select 1 from public.content_update u join jsonb_array_elements(dependencies) d
    on u.type = d->>'table' and u.ref_id = (d->>'id')::bigint
    where u.status->>'state' = 'PENDING') then
    raise exception 'Passive bonus dependency has a pending curator submission';
  end if;

  for patch in select value from jsonb_array_elements(patches) order by (value->>'id')::bigint loop
    select * into item_row from public.item where id = (patch->>'id')::bigint for update;
    if not found or item_row.name is distinct from patch->>'name'
      or item_row.uuid is distinct from (patch->>'uuid')::bigint
      or item_row.content_source_id is distinct from (patch->>'source')::bigint
      or item_row.level is distinct from (patch->>'level')::integer
      or item_row."group" is distinct from 'GENERAL'
      or item_row.usage is distinct from (case when item_row.id = 12041 then 'other' else 'worn' end)
      or to_jsonb(item_row.traits) is distinct from patch->'traits'
      or item_row.meta_data->'source' is distinct from patch->'citation'
      or (md5(item_row.description) = patch->'description'->>'before'
        or md5(item_row.description) = patch->'description'->>'after') is not true then
      raise exception 'Passive bonus item differs from reviewed entry: %', patch->>'id';
    end if;
    if exists (select 1 from public.content_update where type = 'item'
      and ref_id = item_row.id and status->>'state' = 'PENDING') then
      raise exception 'Passive bonus item has a pending curator submission: %', patch->>'id';
    end if;
    if item_row.operations is not null and
      to_jsonb(item_row.operations) is distinct from patch->'operations' then
      raise exception 'Passive bonus operations differ from reviewed entry: %', patch->>'id';
    end if;

    next_description := item_row.description;
    if md5(next_description) is distinct from patch->'description'->>'after' then
      for replacement in select value from jsonb_array_elements(patch->'description'->'replacements') loop
        if replacement->>'from' = '' or
          (length(next_description)-length(replace(next_description,replacement->>'from',''))) /
            length(replacement->>'from') <> (replacement->>'count')::integer then
          raise exception 'Passive bonus reference fragment changed: %', patch->>'id';
        end if;
        next_description := replace(next_description,replacement->>'from',replacement->>'to');
      end loop;
    end if;
    if md5(next_description) is distinct from patch->'description'->>'after' then
      raise exception 'Passive bonus description does not match reviewed result: %', patch->>'id';
    end if;
    next_operations := array(select value::json from jsonb_array_elements(patch->'operations'));
    if item_row.operations is null or next_description is distinct from item_row.description then
      update public.item set operations = next_operations, description = next_description
        where id = item_row.id
          and to_jsonb(operations) is not distinct from to_jsonb(item_row.operations)
          and description is not distinct from item_row.description;
      get diagnostics changed_rows = row_count;
      if changed_rows <> 1 then raise exception 'Passive bonus item changed during repair'; end if;
    end if;
  end loop;
end
$repair$;
