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
    and pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to((p.prosrc)::text,'UTF8')),'hex')='daea9d6e1e03e4adbb63c5ab1e06ad540f09b032ae32a1a0b85e421f43d07ded'
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
  execute $historical_original_dual$-- Treasure Vault remaster p. 184: seven omitted Ursine Avenger feats.
-- Benefits stay in exact rules text: hourly/stateful effects are not daily spell pools or passive stats.
-- Source 16 and every existing archetype, attack, and saved-selection identity stay intact.
do $ursine$
declare
  feats constant jsonb := $feats$
  [
    {"legacy_url":"https://2e.aonprd.com/Feats.aspx?ID=8953","row":{"cost":"","name":"Call Ursine Ally","type":"feat","uuid":8641661906134255,"level":8,"access":"","rarity":"COMMON","traits":[3351,1454,2134],"actions":null,"special":"","trigger":"","version":"1.0","frequency":"once per hour","meta_data":{"source":{"url":"https://2e.aonprd.com/Feats.aspx?ID=4089","book":"Treasure Vault (Remastered)","page":"184"}},"operations":[],"description":"You can cast a 3rd-rank *[summon animal](link_spell_4866)* as an innate spell, but only to summon a black bear. At 10th level, the *[summon animal](link_spell_4866)* spell is heightened to 4th rank, and you can summon a grizzly bear. At 12th level, your *[summon animal](link_spell_4866)* innate spell is heightened to 5th rank, and you can summon a polar bear. At 14th level, it is heightened to 6th rank, and you can summon a cave bear.","availability":null,"requirements":"","prerequisites":[],"content_source_id":16}},
    {"legacy_url":"https://2e.aonprd.com/Feats.aspx?ID=8954","row":{"cost":"","name":"Bear Empathy","type":"feat","uuid":5152313550250344,"level":10,"access":"","rarity":"COMMON","traits":[3351,1454],"actions":null,"special":"","trigger":"","version":"1.0","frequency":"","meta_data":{"source":{"url":"https://2e.aonprd.com/Feats.aspx?ID=4090","book":"Treasure Vault (Remastered)","page":"184"}},"operations":[],"description":"You have a magical affinity for bears and can speak to them through sounds and body language. You can communicate with all bears, as well as other ursine creatures at the GM's discretion.","availability":null,"requirements":"","prerequisites":[],"content_source_id":16}},
    {"legacy_url":"https://2e.aonprd.com/Feats.aspx?ID=8955","row":{"cost":"","name":"Great Bear","type":"feat","uuid":7134592185110641,"level":12,"access":"","rarity":"COMMON","traits":[3351],"actions":null,"special":"","trigger":"","version":"1.0","frequency":"once per hour","meta_data":{"source":{"url":"https://2e.aonprd.com/Feats.aspx?ID=4091","book":"Treasure Vault (Remastered)","page":"184"}},"operations":[],"description":"When you transform, you can take on a bear's bulk and size. You can spend an additional action when using [Ursine Avenger Form](link_feat_26030) to gain the effects of a 1st-rank *[enlarge](link_spell_4601)* spell, which lasts for the spell's normal duration or until you leave your [Ursine Avenger Form](link_feat_26030), whichever comes first.","availability":null,"requirements":"","prerequisites":["Ursine Avenger Form"],"content_source_id":16}},
    {"legacy_url":"https://2e.aonprd.com/Feats.aspx?ID=8956","row":{"cost":"","name":"Terrible Transformation","type":"feat","uuid":5732112610711193,"level":14,"access":"","rarity":"COMMON","traits":[3351],"actions":null,"special":"","trigger":"","version":"1.0","frequency":"","meta_data":{"source":{"url":"https://2e.aonprd.com/Feats.aspx?ID=4092","book":"Treasure Vault (Remastered)","page":"184"}},"operations":[],"description":"You let out a mighty roar as part of your transformation. When you use [Ursine Avenger Form](link_feat_26030), you can make an Intimidation check to [Demoralize](link_action_19624) against each enemy within 30 feet that can see you, and you don't take a penalty to your [Demoralize](link_action_19624) check if the creature doesn't understand your language.","availability":null,"requirements":"","prerequisites":["Ursine Avenger Form"],"content_source_id":16}},
    {"legacy_url":"https://2e.aonprd.com/Feats.aspx?ID=8957","row":{"cost":"","name":"Fearsome Fangs","type":"feat","uuid":8910251669367082,"level":16,"access":"","rarity":"COMMON","traits":[3351],"actions":null,"special":"","trigger":"","version":"1.0","frequency":"","meta_data":{"source":{"url":"https://2e.aonprd.com/Feats.aspx?ID=4093","book":"Treasure Vault (Remastered)","page":"184"}},"operations":[],"description":"Your claws and jaws are brutally powerful and efficient, even by ursine standards. The base damage of your jaws [unarmed](link_trait_2398) attack from [Ursine Avenger Form](link_feat_26030) increases to 1d12. The base damage of your claws [unarmed](link_trait_2398) attack from [Ursine Avenger Form](link_feat_26030) increases to 1d8.","availability":null,"requirements":"","prerequisites":["Ursine Avenger Form"],"content_source_id":16}},
    {"legacy_url":"https://2e.aonprd.com/Feats.aspx?ID=8958","row":{"cost":"","name":"Mighty Bear","type":"feat","uuid":6633677401327609,"level":18,"access":"","rarity":"COMMON","traits":[3351],"actions":null,"special":"","trigger":"","version":"1.0","frequency":"","meta_data":{"source":{"url":"https://2e.aonprd.com/Feats.aspx?ID=4094","book":"Treasure Vault (Remastered)","page":"184"}},"operations":[],"description":"The power of the bear within you can expand your physical presence even further. The *[enlarge](link_spell_4601)* spell you cast with your [Great Bear](link_feat_%s) feat is heightened to 4th rank.","availability":null,"requirements":"","prerequisites":["Great Bear"],"content_source_id":16}},
    {"legacy_url":"https://2e.aonprd.com/Feats.aspx?ID=8959","row":{"cost":"","name":"Immortal Bear","type":"feat","uuid":6875755095101542,"level":20,"access":"","rarity":"COMMON","traits":[3351],"actions":null,"special":"","trigger":"","version":"1.0","frequency":"","meta_data":{"source":{"url":"https://2e.aonprd.com/Feats.aspx?ID=4095","book":"Treasure Vault (Remastered)","page":"184"}},"operations":[],"description":"Your body thrums with the primal vitality of the greatest of the ursine beasts. When in [Ursine Avenger Form](link_feat_26030), you gain fast healing 5.","availability":null,"requirements":"","prerequisites":["Ursine Avenger Form"],"content_source_id":16}}
  ]
  $feats$::jsonb;
  repairs constant jsonb := $repairs$
  [
    {"id":52136,"before":["Ursine Avenger Hood Dedication"],"after":[],"row":{"operations":[],"name":"Senses of the Bear","actions":null,"level":4,"rarity":"COMMON","prerequisites":["Ursine Avenger Hood Dedication"],"frequency":"","cost":"","trigger":"","requirements":"","access":"","description":"While in ursine form, you gain low-light vision and scent (imprecise) 30 feet. If you already had low-light vision, you instead gain darkvision.","special":"","type":"feat","meta_data":{"source":{"url":"https://2e.aonprd.com/Feats.aspx?ID=8951","book":"Treasure Vault","page":"183"}},"traits":[3351],"content_source_id":16,"version":null,"uuid":5747920942476014,"availability":null}},
    {"id":52138,"before":["Ursine Avenger Hood Dedication"],"after":[],"row":{"operations":[],"name":"Bear Hug (Ursine Avenger)","actions":"ONE-ACTION","level":6,"rarity":"COMMON","prerequisites":["Ursine Avenger Hood Dedication"],"frequency":"","cost":"","trigger":"","requirements":"Your last action was a successful claw Strike","access":"","description":"You snatch at your opponent with your claws, pulling them close in a ferocious bear hug. You make another claw Strike against the same target. If this Strike hits, the target is also grabbed.","special":"","type":"feat","meta_data":{"source":{"url":"https://2e.aonprd.com/Feats.aspx?ID=8952","book":"Treasure Vault","page":"183"}},"traits":[3351],"content_source_id":16,"version":null,"uuid":799648305223526,"availability":null}}
  ]
  $repairs$::jsonb;
  dependencies constant jsonb := $dependencies$
  [
    {"table":"ability-block","id":19624,"name":"Demoralize","uuid":6544488333511565,"content_source_id":3,"type":"action"},
    {"table":"ability-block","id":26030,"name":"Ursine Avenger Form","uuid":1788057276209300,"content_source_id":16,"type":"feat","level":2,"rarity":"UNIQUE","actions":"ONE-ACTION","traits":[1568,1456,1454,1445,3351],"operations":[{"id":"88233209-3b95-4aed-8497-fe1809421b8a","type":"giveItem","data":{"itemId":13667}},{"id":"fd429a17-7805-4ecf-8db5-2e09a112dbe8","type":"giveItem","data":{"itemId":13666}}]},
    {"table":"trait","id":1568,"name":"Artifact","uuid":484734232108207,"content_source_id":3},
    {"table":"trait","id":2398,"name":"Unarmed","uuid":7327027230694569,"content_source_id":3},
    {"table":"trait","id":1454,"name":"Primal","uuid":6202647683854077,"content_source_id":3},
    {"table":"trait","id":1569,"name":"Agile","uuid":8144183238496458,"content_source_id":3},
    {"table":"trait","id":1445,"name":"Dedication","uuid":5613420393776712,"content_source_id":3},
    {"table":"trait","id":2134,"name":"Summoned","uuid":216541195336692,"content_source_id":3},
    {"table":"trait","id":1456,"name":"Morph","uuid":3327278025830287,"content_source_id":3},
    {"table":"trait","id":3351,"name":"Ursine Avenger Hood Archetype","uuid":4490771783681398,"content_source_id":16,"meta_data":{"archetype_trait":true}},
    {"table":"archetype","id":166,"name":"Ursine Avenger Hood","uuid":4832593203973064,"content_source_id":16,"trait_id":3351,"dedication_feat_id":26030},
    {"table":"item","id":13666,"name":"Ursine Avenger Jaws","uuid":446680443637214,"content_source_id":16,"level":0,"traits":[2398]},
    {"table":"item","id":13667,"name":"Ursine Avenger Claws","uuid":5192159983708629,"content_source_id":16,"level":0,"traits":[2398,1569]},
    {"table":"spell","id":4601,"name":"Enlarge","uuid":6124057272576338,"content_source_id":3,"rank":2},
    {"table":"spell","id":4866,"name":"Summon Animal","uuid":6158864017119068,"content_source_id":3,"rank":1}
  ]
  $dependencies$::jsonb;
  entry jsonb;
  expected jsonb;
  dependency_row jsonb;
  property record;
  actual public.ability_block%rowtype;
  existing_count integer;
  changed_rows integer;
  great_bear_id bigint;
  inserted_id bigint;
  feat_count bigint;
begin
  -- Freeze curator proposals and catalog identity checks for this atomic import.
  lock table public.content_update in share mode;
  lock table public.ability_block in share row exclusive mode;
  -- Acquire reviewed content rows before source cache locks.
  for entry in
    select jsonb_build_object('id', a.id, 'write',
      a.id in (select (r->>'id')::bigint from jsonb_array_elements(repairs) r)
      or exists (select 1 from jsonb_array_elements(feats) f
        where a.uuid = (f->'row'->>'uuid')::bigint
          and a.content_source_id = (f->'row'->>'content_source_id')::bigint))
    from public.ability_block a
    where a.id in (select (r->>'id')::bigint from jsonb_array_elements(repairs) r)
      or exists (select 1 from jsonb_array_elements(feats) f
        where a.uuid = (f->'row'->>'uuid')::bigint
          and a.content_source_id = (f->'row'->>'content_source_id')::bigint)
      or a.id in (select (d->>'id')::bigint from jsonb_array_elements(dependencies) d
        where d->>'table' = 'ability-block')
    order by a.id loop
    if (entry->>'write')::boolean then
      perform id from public.ability_block where id = (entry->>'id')::bigint for update;
    else
      perform id from public.ability_block where id = (entry->>'id')::bigint for share;
    end if;
  end loop;
  perform a.id from public.archetype a where a.id in (
    select (d->>'id')::bigint from jsonb_array_elements(dependencies) d
    where d->>'table' = 'archetype'
  ) order by a.id for share;
  perform i.id from public.item i where i.id in (
    select (d->>'id')::bigint from jsonb_array_elements(dependencies) d
    where d->>'table' = 'item'
  ) order by i.id for share;
  perform s.id from public.spell s where s.id in (
    select (d->>'id')::bigint from jsonb_array_elements(dependencies) d
    where d->>'table' = 'spell'
  ) order by s.id for share;
  perform t.id from public.trait t where t.id in (
    select (d->>'id')::bigint from jsonb_array_elements(dependencies) d
    where d->>'table' = 'trait'
  ) order by t.id for share;
  -- End reviewed content row prelocks.
  perform id from public.content_source where id in (3,16)
    and user_id is null and is_published is true
    and (id <> 16 or name = 'Treasure Vault')
    order by id for update;
  get diagnostics changed_rows = row_count;
  if changed_rows <> 2 then raise exception 'Missing or changed official Ursine sources'; end if;

  if exists (select 1 from public.content_update u where u.status->>'state' = 'PENDING'
    and (
      (u.type = 'content-source' and u.ref_id = 16)
      or (u.type = 'ability-block' and u.ref_id in (52136,52138))
      or (u.type = 'ability-block' and exists (
        select 1 from public.ability_block a where a.id = u.ref_id and (
          a.uuid in (select (f.value->'row'->>'uuid')::bigint from jsonb_array_elements(feats) f)
          or (a.content_source_id = 16 and exists (
            select 1 from jsonb_array_elements(feats) f
            where lower(btrim(a.name)) = lower(f.value->'row'->>'name')
               or lower(btrim(a.name)) like lower(f.value->'row'->>'name') || ' (%'
          ))
          or (exists (select 1 from public.content_source s where s.id = a.content_source_id
                and s.user_id is null and s.is_published is true)
            and exists (select 1 from jsonb_array_elements(feats) f
              where lower(split_part(a.meta_data #>> '{source,url}', '&', 1)) in
                (lower(f.value->>'legacy_url'), lower(f.value->'row' #>> '{meta_data,source,url}'))))
        )))
      or exists (select 1 from jsonb_array_elements(dependencies) d
        where u.type = d.value->>'table' and u.ref_id = (d.value->>'id')::bigint)
      or (u.type = 'ability-block' and u.content_source_id = 16
        and exists (select 1 from jsonb_array_elements(feats) f
          where lower(btrim(u.data->>'name')) = lower(f.value->'row'->>'name')
             or lower(btrim(u.data->>'name')) like lower(f.value->'row'->>'name') || ' (%'
             or u.data->>'uuid' = f.value->'row'->>'uuid'
             or lower(split_part(u.data #>> '{meta_data,source,url}', '&', 1)) in
               (lower(f.value->>'legacy_url'), lower(f.value->'row' #>> '{meta_data,source,url}'))))
    )) then raise exception 'Ursine import has a pending curator submission'; end if;

  -- Table-correct dependencies, including the existing Form dedication and its stable giveItem UUIDs.
  for entry in select value from jsonb_array_elements(dependencies)
    order by value->>'table', (value->>'id')::bigint loop
    dependency_row := null;
    case entry->>'table'
      when 'trait' then
        select to_jsonb(t) into dependency_row from public.trait t
          where t.id = (entry->>'id')::bigint for share;
      when 'ability-block' then
        select to_jsonb(a) into dependency_row from public.ability_block a
          where a.id = (entry->>'id')::bigint for share;
      when 'archetype' then
        select to_jsonb(a) into dependency_row from public.archetype a
          where a.id = (entry->>'id')::bigint for share;
      when 'item' then
        select to_jsonb(i) into dependency_row from public.item i
          where i.id = (entry->>'id')::bigint for share;
      when 'spell' then
        select to_jsonb(s) into dependency_row from public.spell s
          where s.id = (entry->>'id')::bigint for share;
      else raise exception 'Unsupported Ursine dependency table';
    end case;
    if dependency_row is null then raise exception 'Missing Ursine dependency: %', entry->>'id'; end if;
    for property in select key, value from jsonb_each(entry - 'table') loop
      if dependency_row->property.key is distinct from property.value then
        raise exception 'Ursine dependency identity changed: %/%', entry->>'table', entry->>'id';
      end if;
    end loop;
  end loop;

  -- The earlier two entries print no prerequisite. Accept only the reviewed before/after leaves.
  for entry in select value from jsonb_array_elements(repairs) order by (value->>'id')::bigint loop
    select * into actual from public.ability_block where id = (entry->>'id')::bigint for update;
    if not found or
      to_jsonb(actual) - '{id,created_at,updated_at,search_tsv,prerequisites}'::text[]
        is distinct from ((entry->'row') - 'prerequisites')
      or (to_jsonb(actual.prerequisites) = entry->'before'
        or to_jsonb(actual.prerequisites) = entry->'after') is not true then
      raise exception 'Ursine prerequisite row differs from reviewed entry: %', entry->>'id';
    end if;
  end loop;

  -- UUIDs are globally unique; source-specific aliases/citations must not conceal another import.
  select count(*) into existing_count from public.ability_block a where
       a.uuid in (select (f.value->'row'->>'uuid')::bigint from jsonb_array_elements(feats) f)
       or (a.content_source_id = 16 and exists (
         select 1 from jsonb_array_elements(feats) f
         where lower(btrim(a.name)) = lower(f.value->'row'->>'name')
            or lower(btrim(a.name)) like lower(f.value->'row'->>'name') || ' (%'
       ))
       or (exists (select 1 from public.content_source s where s.id = a.content_source_id
             and s.user_id is null and s.is_published is true)
         and exists (select 1 from jsonb_array_elements(feats) f
           where lower(split_part(a.meta_data #>> '{source,url}', '&', 1)) in
             (lower(f.value->>'legacy_url'), lower(f.value->'row' #>> '{meta_data,source,url}'))));
  if existing_count not in (0,7) then
    raise exception 'Ursine feats are partially present or have conflicting identities';
  end if;

  if existing_count = 7 then
    select id into great_bear_id from public.ability_block
      where uuid = 7134592185110641 and content_source_id = 16 and type = 'feat';
    if great_bear_id is null or great_bear_id <= 0 then
      raise exception 'Missing reviewed Great Bear identity';
    end if;
  end if;

  for entry in select value from jsonb_array_elements(feats) order by (value->'row'->>'level')::integer loop
    expected := entry->'row';
    if expected->>'name' = 'Mighty Bear' then
      if great_bear_id is null or great_bear_id <= 0 then raise exception 'Great Bear link is unresolved'; end if;
      -- This format was generated through convertToHardcodedLink and verified against the real helper.
      expected := jsonb_set(expected, '{description}',
        to_jsonb(format(expected->>'description', great_bear_id)), false);
    end if;

    if existing_count = 7 then
      select * into actual from public.ability_block
        where uuid = (expected->>'uuid')::bigint and content_source_id = 16 for update;
      if not found or actual.id <= 0 or
        to_jsonb(actual) - '{id,created_at,updated_at,search_tsv}'::text[] is distinct from expected then
        raise exception 'Existing Ursine feat differs from reviewed import: %', expected->>'name';
      end if;
    else
      insert into public.ability_block (
        name, actions, level, rarity, prerequisites, frequency, cost, "trigger", requirements,
        access, description, special, type, meta_data, traits, content_source_id, version,
        uuid, availability, operations
      )
      select r.name, r.actions, r.level, r.rarity, r.prerequisites, r.frequency, r.cost, r."trigger",
        r.requirements, r.access, r.description, r.special, r.type, r.meta_data, r.traits,
        r.content_source_id, r.version, r.uuid, r.availability, r.operations
      from jsonb_populate_record(null::public.ability_block, expected) r
      returning id into inserted_id;
      if expected->>'name' = 'Great Bear' then great_bear_id := inserted_id; end if;
    end if;
  end loop;

  for entry in select value from jsonb_array_elements(repairs) order by (value->>'id')::bigint loop
    update public.ability_block set prerequisites = '{}'::varchar[]
      where id = (entry->>'id')::bigint and to_jsonb(prerequisites) = entry->'before';
  end loop;

  -- Mirror insertData's housekeeping without replacing unrelated source metadata or pinning a book total.
  select count(*) into feat_count from public.ability_block where content_source_id = 16 and type = 'feat';
  if exists (select 1 from public.content_source where id = 16
    and (jsonb_typeof(meta_data::jsonb) not in ('object','null')
      or jsonb_typeof(meta_data::jsonb->'counts') not in ('object','null'))) then
    raise exception 'Ursine source count metadata changed shape';
  end if;
  update public.content_source
    set meta_data = jsonb_set(coalesce(nullif(meta_data::jsonb, 'null'::jsonb), '{}'::jsonb), '{counts}',
      coalesce(nullif(meta_data::jsonb->'counts', 'null'::jsonb), '{}'::jsonb)
        || jsonb_build_object('feat', feat_count), true)::json
    where id = 16 and meta_data::jsonb #> '{counts,feat}' is distinct from to_jsonb(feat_count);
end
$ursine$;
$historical_original_dual$;
end $historical_dual$;
