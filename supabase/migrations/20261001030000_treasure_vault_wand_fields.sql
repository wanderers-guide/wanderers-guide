-- Preserve the original repair; use the pinned shared terminal check.
do $historical_dual$
declare completion_recognized boolean;completion_passed boolean;
begin
  lock table public.content_update in share mode;
  lock table public.content_source in share mode;
  lock table public.ability_block in share row exclusive mode;
  lock table public.ancestry in share row exclusive mode;
  lock table public.archetype in share row exclusive mode;
  lock table public.class in share row exclusive mode;
  lock table public.creature in share row exclusive mode;
  lock table public.item in share row exclusive mode;
  lock table public.language in share row exclusive mode;
  lock table public.spell in share row exclusive mode;
  lock table public.trait in share row exclusive mode;
  perform s.id from public.content_source s where s.id in(1,3,7,8,11,12,13,14,15,16,17,18,19,22,23,28,29,33,34,37,51,185,239,240,241,256,400,420,476,493,842) order by s.id for share;
  if (exists(select 1 from pg_catalog.pg_proc p
  where p.oid=pg_catalog.to_regprocedure('public.treasure_vault_terminal_status_v1()')
    and pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to((p.prosrc)::text,'UTF8')),'hex')='c55d729fca4f5b25a0c725305b5d2939e49c28e3e5ecb706a909e530708bb126'
    and p.prokind='f' and p.prolang=(select l.oid from pg_catalog.pg_language l where l.lanname='sql')
    and p.provolatile='s' and p.prosecdef is false and p.proisstrict is false and p.proleakproof is false
    and p.proparallel='u' and p.procost=100 and p.prorows=1
    and p.pronargs=0 and p.pronargdefaults=0 and p.proretset is true
    and p.prorettype=pg_catalog.to_regtype('record')
    and p.proallargtypes=array[pg_catalog.to_regtype('boolean')::oid,pg_catalog.to_regtype('boolean')::oid]
    and p.proargmodes=array['t','t']::"char"[] and p.proargnames=array['recognized','passed']::text[]
    and p.proconfig=array['search_path=""']::text[] and p.proowner=pg_catalog.to_regrole('postgres')
    and (select count(*)=3
      and count(*) filter(where a.grantee=pg_catalog.to_regrole('postgres'))=1
      and count(*) filter(where a.grantee=pg_catalog.to_regrole('service_role'))=1
      and count(*) filter(where a.grantee=pg_catalog.to_regrole('supabase_read_only_user'))=1
      and bool_and((a.privilege_type='EXECUTE' and a.is_grantable is false
      and a.grantor=pg_catalog.to_regrole('postgres')
      and a.grantee in(pg_catalog.to_regrole('postgres'),pg_catalog.to_regrole('service_role'),pg_catalog.to_regrole('supabase_read_only_user'))) is true)
      from pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a)
    and pg_catalog.has_function_privilege('postgres',p.oid,'EXECUTE')
    and pg_catalog.has_function_privilege('service_role',p.oid,'EXECUTE')
    and pg_catalog.has_function_privilege('supabase_read_only_user',p.oid,'EXECUTE'))) is not true then
    raise exception 'Treasure Vault terminal helper is missing or differs from the reviewed definition';
  end if;
  select s.recognized,s.passed into strict completion_recognized,completion_passed from public.treasure_vault_terminal_status_v1() s;
  if completion_recognized is null or completion_passed is null then
    raise exception 'Treasure Vault terminal helper returned an invalid status';
  end if;
  if completion_recognized then
    if completion_passed is not true then raise exception 'Treasure Vault catalog/display successor is partial or unreviewed';end if;
    return;
  end if;
  execute $historical_original_dual$do $repair$
declare
  patches constant jsonb := $patches$
  [
    {"id":12659,"before_uuid":"7778569537178750","after_uuid":"7611411327409832","source":16,"level":10,"price":{"gp":1000},"before_name":"Wand of Noisome Acid (4nd-Level Spell)","after_name":"Wand of Noisome Acid (4th-Level Spell)","before_name_md5":"dfd9e6ebf9c69eb48e740984da296cc5","after_name_md5":"88b6dd943f307847b7e90c7f675d5ef0","citation":{"url":"https://2e.aonprd.com/Equipment.aspx?ID=4818","book":"Treasure Vault","page":"141"}},
    {"id":12675,"before_uuid":"2336719364145203","after_uuid":"2336719364145203","source":16,"level":11,"price":{"gp":1400},"before_name":"Wand of Refracting Rays (4th-level)","after_name":"Wand of Refracting Rays (4th-level)","before_name_md5":"20a6294d280a4b7dfaf05520ad57ce5d","after_name_md5":"20a6294d280a4b7dfaf05520ad57ce5d","citation":{"url":"https://2e.aonprd.com/Equipment.aspx?ID=4822","book":"Treasure Vault","page":"142"},"description":{"before":"0957509f74aa8e661bb4dc124305c53f","after":"020252709e385f23c384ac83dc262bb5","replacements":[{"from":"\\[\\[Chromatic Ray\\]\\]","to":"*[Chromatic Ray](link_spell_5322)*","count":1}]},"craft":{"before":"9e2d7f84f6ae9fcac6eaa1b25499d9e3","after":"e91875990c04ecd9cf6437cd0c75677f","replacements":[{"from":"[[Chromatic Ray]]","to":"*[Chromatic Ray](link_spell_5322)*","count":1}]}},
    {"id":12676,"before_uuid":"1838260911081972","after_uuid":"3908476794355892","source":16,"level":15,"price":{"gp":6500},"before_name":"Wand of Refracting Rays (7th-level)","after_name":"Wand of Refracting Rays (6th-level)","before_name_md5":"7716a23b6f9ba39a07b3e5813cb149b7","after_name_md5":"2e75681c60942e873c5d5e06321ae605","citation":{"url":"https://2e.aonprd.com/Equipment.aspx?ID=4822","book":"Treasure Vault","page":"142"},"description":{"before":"d2c7c3fc95239741f07d94ba08289901","after":"9a2a5e6219626b84df338a11259c5a02","replacements":[{"from":"You cast 7th-rank","to":"You cast 6th-rank","count":1},{"from":"\\[\\[Chromatic Ray\\]\\]","to":"*[Chromatic Ray](link_spell_5322)*","count":1}]},"craft":{"before":"9e2d7f84f6ae9fcac6eaa1b25499d9e3","after":"e91875990c04ecd9cf6437cd0c75677f","replacements":[{"from":"[[Chromatic Ray]]","to":"*[Chromatic Ray](link_spell_5322)*","count":1}]}},
    {"id":12702,"before_uuid":"5289744487411251","after_uuid":"7838296050281525","source":16,"level":18,"price":{"gp":24000},"before_name":"Wand of Wearing Dance","after_name":"Wand of Wearying Dance","before_name_md5":"1c1f21fbbc2063da21964a70bd2ef8e8","after_name_md5":"340dc82d2b3694105e04b9834912daef","citation":{"url":"https://2e.aonprd.com/Equipment.aspx?ID=4832","book":"Treasure Vault","page":"143"},"add_citation":true}
  ]
  $patches$::jsonb;
  noisome constant jsonb := $noisome${
  "id": 12659,
  "rank": 4,
  "expected": {
    "id": 12659,
    "name": "Wand of Noisome Acid (4th-Level Spell)",
    "uuid": "7611411327409832",
    "content_source_id": 16,
    "level": 10,
    "price": {
      "gp": 1000
    },
    "bulk": "0.1",
    "usage": "held-in-one-hand",
    "group": "GENERAL",
    "rarity": "UNCOMMON",
    "size": "MEDIUM",
    "hands": null,
    "traits": [
      1528,
      1504,
      1665
    ],
    "availability": null,
    "operations": null,
    "version": "1.0"
  },
  "metadata_absent": [
    "deprecated",
    "unselectable",
    "focus",
    "type",
    "ritual"
  ],
  "raw": {
    "description": "This greasy stick emits a stomach-churning scent when held in a hand.\n\n**Activate** \\[\\[Cast a Spell\\]\\]\n\n**Effect** You cast \\[\\[Acid Arrow\\]\\] at 4th rank.A creature that takes initial acid damage from this spell become \\[\\[Sickened\\]\\]{Sickened 1}. Use your spell DC if the creatures attempts to recover from this sickness. This is an olfactory effect.",
    "craft_requirements": "Supply a casting of Acid Arrow at 4th rank.",
    "source": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4818",
      "book": "Treasure Vault",
      "page": "141"
    }
  },
  "before": {
    "description": "This greasy stick emits a stomach-churning scent when held in a hand.\n\n**Activate** \\[\\[Cast a Spell\\]\\]\n\n**Effect** You cast \\[\\[Acid Arrow\\]\\] at 4th rank.A creature that takes initial acid damage from this spell become sickened 1. Use your spell DC if the creatures attempts to recover from this sickness. This is an olfactory effect.",
    "craft_requirements": "Supply a casting of Acid Arrow at 4th rank.",
    "source": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4818",
      "book": "Treasure Vault",
      "page": "141"
    }
  },
  "after": {
    "description": "This greasy stick emits a stomach-churning scent when held in a hand.\n\n**Activate** [Cast a Spell](link_action_19611); **Frequency** once per day, plus overcharge\n\n**Effect** You cast 4th-rank *[acid grip](link_spell_4389)*. A creature that takes initial [acid](link_trait_1528) damage from this spell become sickened 1. Use your spell DC if the creature attempts to recover from this sickness. This is an [olfactory](link_trait_2131) effect.",
    "craft_requirements": "Supply a casting of *[acid grip](link_spell_4389)* of the appropriate rank.",
    "source": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=2284",
      "book": "Treasure Vault (Remastered)",
      "page": "141"
    }
  },
  "hashes": {
    "description": {
      "raw": "2e81ce88d96bae4f45fc2b1bde9c3055",
      "before": "5fa726a9ae0630c282adb21fb7cd94cf",
      "after": "1f256d29afabfb68e3d56ed478c5c61d"
    },
    "craft_requirements": {
      "raw": "2d7cb96abe09ffe43144a8d4f159f25d",
      "before": "2d7cb96abe09ffe43144a8d4f159f25d",
      "after": "ac1308c588ba266aa09b4ef3f6c8dc22"
    }
  }
}$noisome$::jsonb;
  current_state jsonb;
  patch jsonb;
  replacement jsonb;
  item_row public.item%rowtype;
  spell_row public.spell%rowtype;
  next_name text;
  next_uuid bigint;
  next_description text;
  next_craft text;
  next_meta_data jsonb;
  specification jsonb;
  working_text text;
  changed_rows integer;
begin
  lock table public.content_update in share mode;
  -- Acquire every reviewed child before source locks or cache-trigger writes.
  perform i.id from public.item i where i.id in (
    select (value->>'id')::bigint from jsonb_array_elements(patches)
  ) order by i.id for update;
  perform id from public.spell where id = 5322 for update;
  perform id from public.content_source where id in (13, 16)
    and user_id is null and is_published is true order by id for update;
  get diagnostics changed_rows = row_count;
  if changed_rows <> 2 then raise exception 'Missing official wand dependencies'; end if;

  select * into spell_row from public.spell where id = 5322 for update;
  if not found or spell_row.name is distinct from 'Chromatic Ray'
    or spell_row.uuid is distinct from 8318806142210311
    or spell_row.rank is distinct from 4
    or spell_row.content_source_id is distinct from 13
    or spell_row.meta_data->'source' is distinct from
      '{"url":"https://2e.aonprd.com/Spells.aspx?ID=883","book":"Secrets of Magic","page":"95"}'::jsonb then
    raise exception 'Chromatic Ray spell dependency changed';
  end if;
  if exists (select 1 from public.content_update where type = 'spell'
    and ref_id = 5322 and status->>'state' = 'PENDING') then
    raise exception 'Chromatic Ray has a pending curator submission';
  end if;

  for patch in select value from jsonb_array_elements(patches) order by (value->>'id')::bigint loop
    select * into item_row from public.item where id = (patch->>'id')::bigint for update;
    if not found or item_row.content_source_id is distinct from (patch->>'source')::bigint
      or item_row.level is distinct from (patch->>'level')::integer
      or item_row.price::jsonb is distinct from patch->'price'
      or ((md5(item_row.name) = patch->>'before_name_md5'
        and item_row.uuid = (patch->>'before_uuid')::bigint)
        or (md5(item_row.name) = patch->>'after_name_md5'
          and item_row.uuid = (patch->>'after_uuid')::bigint)) is not true then
      raise exception 'Missing or changed Treasure Vault wand: %', patch->>'id';
    end if;
    if exists (select 1 from public.content_update where type = 'item'
      and ref_id = item_row.id and status->>'state' = 'PENDING') then
      raise exception 'Wand has a pending curator submission: %', patch->>'id';
    end if;
    if jsonb_typeof(item_row.meta_data) is distinct from 'object' then
      raise exception 'Wand metadata differs from reviewed object: %', patch->>'id';
    end if;
    if exists (select 1 from public.item where uuid = (patch->>'after_uuid')::bigint
      and id <> item_row.id) then
      raise exception 'Corrected wand UUID collides with another item: %', patch->>'id';
    end if;
    -- Explicit 020 successor permits post-baseline dump replay without downgrading any leaf.
    if item_row.id=12659 then
      if md5(noisome#>>'{after,description}') is distinct from noisome#>>'{hashes,description,after}' or md5(noisome#>>'{after,craft_requirements}') is distinct from noisome#>>'{hashes,craft_requirements,after}' then raise exception 'Invalid Noisome successor specification'; end if;
      current_state:=jsonb_build_object('description',item_row.description,'craft_requirements',item_row.craft_requirements,'source',item_row.meta_data->'source');
      if current_state=noisome->'after' then
        if exists(select 1 from jsonb_each(noisome->'expected') e where (to_jsonb(item_row)||jsonb_build_object('uuid',item_row.uuid::text))->e.key is distinct from e.value)
          or exists(select 1 from jsonb_array_elements_text(noisome->'metadata_absent') k(key) where item_row.meta_data?k.key) then raise exception 'Noisome successor identity differs from reviewed entry'; end if;
        continue;
      end if;
      if current_state is distinct from noisome->'raw' and current_state is distinct from noisome->'before' then raise exception 'Unreviewed Noisome legacy coupled state'; end if;
    end if;
    if patch ? 'add_citation' then
      if (item_row.meta_data ? 'source') and
        item_row.meta_data->'source' is distinct from patch->'citation' then
        raise exception 'Wand citation differs from reviewed entry: %', patch->>'id';
      end if;
    elsif item_row.meta_data->'source' is distinct from patch->'citation' then
      raise exception 'Wand citation differs from reviewed entry: %', patch->>'id';
    end if;

    next_name := item_row.name;
    next_uuid := (patch->>'after_uuid')::bigint;
    if md5(next_name) = patch->>'before_name_md5' then next_name := patch->>'after_name'; end if;
    if md5(next_name) is distinct from patch->>'after_name_md5' then
      raise exception 'Wand name did not match reviewed result: %', patch->>'id';
    end if;
    next_description := item_row.description;
    next_craft := item_row.craft_requirements;
    for specification in select value from jsonb_array_elements(
      jsonb_build_array(patch->'description', patch->'craft')) loop
      if specification is null or specification = 'null'::jsonb then continue; end if;
      if specification = patch->'description' then working_text := next_description;
      else working_text := next_craft; end if;
      if md5(working_text) = specification->>'before' then
        for replacement in select value from jsonb_array_elements(specification->'replacements') loop
          if replacement->>'from' = '' or
            (length(working_text)-length(replace(working_text,replacement->>'from',''))) /
              length(replacement->>'from') <> (replacement->>'count')::integer then
            raise exception 'Wand text fragment differs from reviewed entry: %', patch->>'id';
          end if;
          working_text := replace(working_text,replacement->>'from',replacement->>'to');
        end loop;
      elsif md5(working_text) is distinct from specification->>'after' then
        raise exception 'Wand text differs from reviewed entry: %', patch->>'id';
      end if;
      if md5(working_text) is distinct from specification->>'after' then
        raise exception 'Wand text did not match reviewed result: %', patch->>'id';
      end if;
      if specification = patch->'description' then next_description := working_text;
      else next_craft := working_text; end if;
    end loop;
    next_meta_data := item_row.meta_data;
    if patch ? 'add_citation' and not (next_meta_data ? 'source') then
      next_meta_data := jsonb_set(next_meta_data, '{source}', patch->'citation', true);
    end if;
    if next_name is distinct from item_row.name
      or next_uuid is distinct from item_row.uuid
      or next_description is distinct from item_row.description
      or next_craft is distinct from item_row.craft_requirements
      or next_meta_data is distinct from item_row.meta_data then
      update public.item set name = next_name, uuid = next_uuid, description = next_description,
        craft_requirements = next_craft, meta_data = next_meta_data
        where id = item_row.id and name is not distinct from item_row.name
          and uuid is not distinct from item_row.uuid
          and description is not distinct from item_row.description
          and craft_requirements is not distinct from item_row.craft_requirements
          and meta_data is not distinct from item_row.meta_data;
      get diagnostics changed_rows = row_count;
      if changed_rows <> 1 then raise exception 'Wand changed during reviewed repair: %', patch->>'id'; end if;
    end if;
  end loop;
end
$repair$;
$historical_original_dual$;
end $historical_dual$;
