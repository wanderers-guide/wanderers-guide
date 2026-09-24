-- Reclaimant Plea: preserve selections while restoring the third feat's innate spells.
-- Rules: Knights of Lastwall p. 77, https://2e.aonprd.com/Feats.aspx?ID=3593
do $repair$
declare
  repairs constant jsonb := $patches$
[
  {"id": 28549, "expected": "a90feac5ce959141a53bb9732b2732b5", "changes": [
    {"path":["operations",2,"data","optionsPredefined",0,"operations",3,"data","conditions",0,"value"],"before":"","after":"TRUE"},
    {"path":["operations",2,"data","optionsPredefined",1,"operations",3,"data","conditions",0,"value"],"before":"","after":"TRUE"},
    {"path":["operations",2,"data","optionsPredefined",2,"operations",3,"data","conditions",0,"value"],"before":"","after":"TRUE"},
    {"path":["operations",2,"data","optionsPredefined",3,"operations",3,"data","conditions",0,"value"],"before":"","after":"TRUE"},
    {"path":["operations",2,"data","optionsPredefined",4,"operations",3,"data","conditions",0,"value"],"before":"","after":"TRUE"},
    {"path":["operations",2,"data","optionsPredefined",5,"operations",3,"data","conditions",0,"value"],"before":"","after":"TRUE"},
    {"path":["operations",3,"data","value"],"before":"","after":false}
  ]},
  {"id": 29011, "expected": "6ba619033e9516c58b3c8a768b01d84f", "changes": [
    {"path":["operations",1,"data","optionsPredefined",0,"operations",2,"data","conditions",0,"value"],"before":"","after":"TRUE"},
    {"path":["operations",1,"data","optionsPredefined",1,"operations",2,"data","conditions",0,"value"],"before":"","after":"TRUE"},
    {"path":["operations",1,"data","optionsPredefined",2,"operations",2,"data","conditions",0,"value"],"before":"","after":"TRUE"},
    {"path":["operations",1,"data","optionsPredefined",3,"operations",2,"data","conditions",0,"value"],"before":"","after":"TRUE"},
    {"path":["operations",1,"data","optionsPredefined",4,"operations",2,"data","conditions",0,"value"],"before":"","after":"TRUE"},
    {"path":["operations",1,"data","optionsPredefined",5,"operations",2,"data","conditions",0,"value"],"before":"","after":"TRUE"},
    {"path":["operations",1,"data","optionsPredefined",6,"operations",2,"data","conditions",0,"value"],"before":"","after":"TRUE"},
    {"path":["operations",1,"data","optionsPredefined",7,"operations",2,"data","conditions",0,"value"],"before":"","after":"TRUE"}
  ]},
  {"id": 29012, "expected": "3514788c74fdbf9d9fe9c17c19195c1b", "changes": [
    {"path":["operations",0,"data","value"],"before":"","after":false},
    {"path":["operations",1,"data","value"],"before":0,"after":true},
    {"path":["operations",4,"data","optionsPredefined",0,"operation","data"],"before":{"spellId":6141,"type":"NORMAL"},"after":{"spellId":6141,"type":"INNATE","rank":7,"tradition":"DIVINE","casts":1}},
    {"path":["operations",4,"data","optionsPredefined",1,"operation","data"],"before":{"spellId":4773,"type":"NORMAL"},"after":{"spellId":4773,"type":"INNATE","rank":7,"tradition":"DIVINE","casts":1}},
    {"path":["operations",4,"data","optionsPredefined",2,"operation","data"],"before":{"spellId":4916,"type":"NORMAL"},"after":{"spellId":4916,"type":"INNATE","rank":7,"tradition":"DIVINE","casts":1}},
    {"path":["operations",4,"data","optionsPredefined",3,"operation","data"],"before":{"spellId":4689,"type":"NORMAL"},"after":{"spellId":4689,"type":"INNATE","rank":7,"tradition":"DIVINE","casts":1}},
    {"path":["operations",4,"data","optionsPredefined",4,"operation","data"],"before":{"spellId":4522,"type":"NORMAL"},"after":{"spellId":4522,"type":"INNATE","rank":7,"tradition":"DIVINE","casts":1}},
    {"path":["operations",4,"data","optionsPredefined",5,"operation","data"],"before":{"spellId":4660,"type":"NORMAL"},"after":{"spellId":4660,"type":"INNATE","rank":7,"tradition":"DIVINE","casts":1}},
    {"path":["operations",4,"data","optionsPredefined",6,"operation","data"],"before":{"spellId":5698,"type":"NORMAL"},"after":{"spellId":5698,"type":"INNATE","rank":7,"tradition":"DIVINE","casts":1}},
    {"path":["operations",4,"data","optionsPredefined",7,"operation","data"],"before":{"spellId":4576,"type":"NORMAL"},"after":{"spellId":4576,"type":"INNATE","rank":7,"tradition":"DIVINE","casts":1}},
    {"path":["operations",4,"data","optionsPredefined",8,"operation","data"],"before":{"spellId":4879,"type":"NORMAL"},"after":{"spellId":4879,"type":"INNATE","rank":7,"tradition":"DIVINE","casts":1}}
  ]}
]
$patches$::jsonb;
  repair jsonb;
  change jsonb;
  path text[];
  original jsonb;
  repaired jsonb;
  target_id bigint;
begin
  for repair in select value from jsonb_array_elements(repairs) loop
    target_id := (repair->>'id')::bigint;
    select jsonb_build_object('operations', operations, 'special', special)
      into original
      from public.ability_block
     where id = target_id and content_source_id = 25
       and type = 'feat'
     for update;

    if original is null then
      raise exception 'Reclaimant Plea feat % was not found', target_id;
    end if;

    -- Reapplying an already completed repair is harmless.
    if not exists (
      select 1 from jsonb_array_elements(repair->'changes') as entry(change)
      where original #> array(select jsonb_array_elements_text(entry.change->'path'))
            is distinct from entry.change->'after'
    ) then
      continue;
    end if;

    if md5(original::text) <> repair->>'expected' then
      raise exception 'Reclaimant Plea feat % changed; review before repair', target_id;
    end if;
    if exists (
      select 1 from public.content_update
       where type = 'ability-block' and ref_id = target_id
         and status->>'state' = 'PENDING'
    ) then
      raise exception 'Reclaimant Plea feat % has a pending curator submission', target_id;
    end if;

    repaired := original;
    for change in select value from jsonb_array_elements(repair->'changes') loop
      path := array(select jsonb_array_elements_text(change->'path'));
      if repaired #> path is distinct from change->'before' then
        raise exception 'Unexpected Reclaimant Plea value at %', path;
      end if;
      repaired := jsonb_set(repaired, path, change->'after', false);
    end loop;

    update public.ability_block
       set operations = array(
         select value::json from jsonb_array_elements(repaired->'operations')
       )
     where id = target_id;
  end loop;
end
$repair$;
