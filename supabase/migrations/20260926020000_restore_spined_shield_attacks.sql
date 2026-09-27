-- GM Core p. 234, https://2e.aonprd.com/Equipment.aspx?ID=2827.
-- Restore the missing grant ID so existing inventory snapshots work without replacement.
-- Two attack profiles keep melee Strength and ranged Dexterity/damage rules separate.
do $repair$
declare
  profiles constant jsonb := $profiles$
  [
    {"name":"Spined Shield Spikes","uuid":5363745504614701,"range":null,"description":"Melee attack using the [spined shield](link_item_15411)'s spikes. Available only while the shield has spines remaining."},
    {"name":"Spined Shield (Fire Spine)","uuid":1437949951899811,"range":120,"description":"Ranged attack for the [spined shield](link_item_15411)'s Fire Spine activation, with a range increment of 120 feet. Available only while the shield has spines remaining; firing consumes one spine."}
  ]
  $profiles$::jsonb;
  shield public.item;
  base public.item;
  ranged_id bigint;
  melee_id bigint;
  metadata jsonb;
  grant_operation json := '{"id":"194d7d21-edf2-43d6-9131-b81da973c098","type":"giveItem","data":{}}';
begin
  select * into shield from public.item where id = 15411 and name = 'Spined Shield'
    and content_source_id = 7 for update;
  if not found or not exists (select 1 from unnest(shield.operations) op
    where op::jsonb = '{"id":"41ce24bd-bd15-49d5-82a8-02dd7d97c57b","type":"giveItem","data":{"itemId":15412}}'::jsonb) then
    raise exception 'Spined Shield grant changed; review before restoration';
  end if;
  select id into melee_id from public.item where uuid = (profiles->0->>'uuid')::bigint;
  select id into ranged_id from public.item where uuid = (profiles->1->>'uuid')::bigint;
  if melee_id = 15412 and ranged_id is not null then
    if exists (select 1 from public.item where id = melee_id and name = profiles->0->>'name'
      and content_source_id = 7 and "group" = 'WEAPON'
      and meta_data::jsonb @> '{"unselectable":true,"category":"martial","group":"shield","damage":{"dice":1,"die":"d6","damageType":"piercing"},"runes":{"potency":1,"striking":1},"range":null}'::jsonb
      and exists (select 1 from unnest(operations) op where op->>'id' = grant_operation->>'id'
        and op->>'type' = 'giveItem' and (op #>> '{data,itemId}')::bigint = ranged_id))
      and exists (select 1 from public.item where id = ranged_id and name = profiles->1->>'name'
        and content_source_id = 7 and "group" = 'WEAPON'
        and meta_data::jsonb @> '{"unselectable":true,"category":"martial","group":"shield","damage":{"dice":1,"die":"d6","damageType":"piercing"},"runes":{"potency":1,"striking":1},"range":120}'::jsonb) then
      return;
    end if;
    raise exception 'Restored Spined Shield attacks changed; review before restoration';
  end if;
  if exists (select 1 from public.item where id = 15412
    or uuid in ((profiles->0->>'uuid')::bigint, (profiles->1->>'uuid')::bigint)
    or (content_source_id = 7 and name in (profiles->0->>'name', profiles->1->>'name'))) then
    raise exception 'Spined Shield attack identity is occupied; review before restoration';
  end if;
  if exists (select 1 from public.content_update where type = 'item' and status->>'state' = 'PENDING'
    and (ref_id in (15411,15412,7754) or (content_source_id = 7 and data->>'name' in
      ('Spined Shield', profiles->0->>'name', profiles->1->>'name')))) then
    raise exception 'Spined Shield has a pending curator submission';
  end if;
  select * into base from public.item where id = 7754 and name = 'Shield Spikes'
    and content_source_id = 1 for share;
  if not found or base.group <> 'WEAPON'
    or base.meta_data #>> '{category}' is distinct from 'martial'
    or base.meta_data #>> '{group}' is distinct from 'shield'
    or base.meta_data #>> '{damage,die}' is distinct from 'd6'
    or base.meta_data #>> '{damage,dice}' is distinct from '1'
    or base.meta_data #>> '{damage,damageType}' is distinct from 'piercing'
    or base.meta_data #>> '{damage,extra}' is distinct from ''
    or base.traits is distinct from array[1704]::bigint[]
    or coalesce(cardinality(base.operations),0) <> 0 then
    raise exception 'Shield Spikes base changed; review before restoration';
  end if;
  metadata := base.meta_data::jsonb || jsonb_build_object(
    'unselectable', true, 'runes', '{"potency":1,"striking":1,"property":[]}'::jsonb,
    'source', shield.meta_data::jsonb->'source', 'range', profiles->1->'range');
  metadata := metadata - array['hp','hp_max','hardness','broken_threshold','base_item_content'];
  insert into public.item (name,uuid,bulk,level,rarity,description,"group",hands,size,
    craft_requirements,usage,meta_data,operations,content_source_id,version,price,traits,availability)
  values (profiles->1->>'name',(profiles->1->>'uuid')::bigint,'0',7,shield.rarity,profiles->1->>'description',
    'WEAPON',base.hands,base.size,null,'',metadata,'{}',7,'1.0','{}',base.traits,null)
  returning id into ranged_id;
  grant_operation := jsonb_set(grant_operation::jsonb,'{data}',jsonb_build_object('itemId',ranged_id))::json;
  insert into public.item (id,name,uuid,bulk,level,rarity,description,"group",hands,size,
    craft_requirements,usage,meta_data,operations,content_source_id,version,price,traits,availability)
  values (15412,profiles->0->>'name',(profiles->0->>'uuid')::bigint,'0',7,shield.rarity,profiles->0->>'description',
    'WEAPON',base.hands,base.size,null,'',jsonb_set(metadata,'{range}',profiles->0->'range'),
    array[grant_operation],7,'1.0','{}',base.traits,null);
end
$repair$;
