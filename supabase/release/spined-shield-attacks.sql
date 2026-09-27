select 'spined-shield-attacks' as id, exists (
  select 1 from public.item shield, public.item melee, public.item ranged
   where shield.id = 15411 and shield.content_source_id = 7
     and melee.id = 15412 and melee.uuid = 5363745504614701
     and ranged.uuid = 1437949951899811
     and melee.name = 'Spined Shield Spikes' and ranged.name = 'Spined Shield (Fire Spine)'
     and melee.content_source_id = 7 and ranged.content_source_id = 7
     and melee."group" = 'WEAPON' and ranged."group" = 'WEAPON'
     and melee.meta_data::jsonb @> '{"unselectable":true,"category":"martial","group":"shield","damage":{"dice":1,"die":"d6","damageType":"piercing"},"runes":{"potency":1,"striking":1},"range":null}'::jsonb
     and ranged.meta_data::jsonb @> '{"unselectable":true,"category":"martial","group":"shield","damage":{"dice":1,"die":"d6","damageType":"piercing"},"runes":{"potency":1,"striking":1},"range":120}'::jsonb
     and exists (select 1 from unnest(shield.operations) op where op->>'type' = 'giveItem'
       and op #>> '{data,itemId}' = '15412')
     and exists (select 1 from unnest(melee.operations) op where op->>'type' = 'giveItem'
       and (op #>> '{data,itemId}')::bigint = ranged.id)
) as passed;
