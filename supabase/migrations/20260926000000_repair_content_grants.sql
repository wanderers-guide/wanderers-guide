-- Repair verified missing feat grants without replacing descriptions or other operations.
-- Sources: Impossible Magic p. 96; Starfinder Player Core p. 45;
-- https://2e.aonprd.com/Feats.aspx?ID=3952 (Tree's Ward)
-- https://2e.aonprd.com/Feats.aspx?ID=3960 (Violent Vines)
-- https://2e.aonprd.com/Feats.aspx?ID=2409 (Bone Caller)
do $repair$
declare
  patches constant jsonb := $patches$
  [
    {"id":58079,"name":"The Taste of Magic","source":842,"operation":"e16b5372-9e86-4d3c-86ac-c8828ef7c83f","type":"giveAbilityBlock","before":{"type":"sense","abilityBlockId":-1},"after":{"type":"sense","abilityBlockId":58078},"target_name":"Magic Scent (imprecise 30 ft)","target_source":842},
    {"id":47102,"name":"Synthetic Speech","source":579,"operation":"37449902-05f6-445e-94be-29e6ac00490f","type":"giveSpell","before":{"rank":4,"type":"INNATE","casts":1,"spellId":7786},"after":{"rank":4,"type":"INNATE","casts":1,"spellId":8319,"tradition":"ARCANE"},"target_name":"Speak with Computers","target_source":579},
    {"id":23103,"name":"Tree's Ward","source":24,"operation":"8353919a-6cb7-4daa-9ece-9a1242daa7b8","type":"giveSpell","before":{"rank":1,"type":"INNATE","casts":1,"spellId":5074,"tradition":"PRIMAL"},"after":{"rank":1,"type":"INNATE","casts":1,"spellId":6759,"tradition":"PRIMAL"},"target_name":"Protector Tree","target_source":256},
    {"id":23111,"name":"Violent Vines","source":24,"operation":"86c25297-a1c5-4bc1-a807-bb0392d24efd","type":"giveSpell","before":{"rank":4,"type":"INNATE","spellId":5061,"tradition":"PRIMAL"},"after":{"rank":4,"type":"INNATE","spellId":8835,"tradition":"PRIMAL"},"target_name":"Murderous Vine","target_source":842},
    {"id":23336,"name":"Bone Caller","source":18,"operation":"a52e18a0-4ab0-4105-9ea2-195c41d9fe55","type":"giveSpell","before":{"rank":2,"type":"INNATE","casts":1,"spellId":5697,"tradition":"PRIMAL"},"after":{"rank":2,"type":"INNATE","casts":1,"spellId":4397,"tradition":"PRIMAL"},"target_name":"Animal Messenger","target_source":1}
  ]
  $patches$::jsonb;
  patch jsonb;
  original json[];
  operation jsonb;
  operation_index integer;
begin
  for patch in select value from jsonb_array_elements(patches) loop
    select operations into original from public.ability_block
     where id = (patch->>'id')::bigint and name = patch->>'name'
       and content_source_id = (patch->>'source')::bigint
     for update;
    if not found or (select count(*) from unnest(original) entry
         where entry->>'id' = patch->>'operation') <> 1 then
      raise exception 'Missing or changed feat operation: %', patch->>'name';
    end if;
    select entry::jsonb, ordinal::integer into operation, operation_index
      from unnest(original) with ordinality as operations(entry, ordinal)
     where entry->>'id' = patch->>'operation';
    if operation->>'type' is distinct from patch->>'type' then
      raise exception 'Changed feat operation type: %', patch->>'name';
    end if;
    if patch->>'type' = 'giveSpell' then
      if not exists (select 1 from public.spell
        where id = (patch #>> '{after,spellId}')::bigint
          and name = patch->>'target_name' and content_source_id = (patch->>'target_source')::bigint
          and rank = (patch #>> '{after,rank}')::integer) then
        raise exception 'Missing or changed spell target: %', patch->>'target_name';
      end if;
    elsif not exists (select 1 from public.ability_block
      where id = (patch #>> '{after,abilityBlockId}')::bigint
        and name = patch->>'target_name' and content_source_id = (patch->>'target_source')::bigint
        and type = patch #>> '{after,type}') then
      raise exception 'Missing or changed ability target: %', patch->>'target_name';
    end if;
    if operation->'data' = patch->'after' then
      continue;
    end if;
    if operation->'data' is distinct from patch->'before' then
      raise exception 'Changed feat grant; review before repair: %', patch->>'name';
    end if;
    if exists (select 1 from public.content_update
      where type = 'ability-block' and ref_id = (patch->>'id')::bigint and status->>'state' = 'PENDING') then
      raise exception 'Feat has a pending curator submission: %', patch->>'name';
    end if;
    update public.ability_block
       set operations[operation_index] = jsonb_set(operation, '{data}', patch->'after', false)::json
     where id = (patch->>'id')::bigint;
  end loop;
end
$repair$;
