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
  execute $historical_original_dual$-- Exact reviewed structured leaves only; canonical citations remain on the original source.
do $repair$
declare
  patches constant jsonb := $patches$
  [
    {"id":11764,"name":"Black Hole Armor","name_md5":"574312c2a92dddc59b2a6a7903920ef7","source":16,"group":"ARMOR","before_level":16,"after_level":16,"before_uuid":"4613287267296927","after_uuid":"4613287267296927","price":{"gp":8500},"citation":{"url":"https://2e.aonprd.com/Equipment.aspx?ID=4375","book":"Treasure Vault","page":"14"},"before":{"traits":[1594,2870]},"after":{"traits":[1594,2870,1527]}},
    {"id":11768,"name":"Blade Byrnie (Greater)","name_md5":"a7924bf80d3f64e1f53a6193b4d0f721","source":16,"group":"ARMOR","before_level":13,"after_level":13,"before_uuid":"3498721685453068","after_uuid":"3498721685453068","price":{"gp":3000},"citation":{"url":"https://2e.aonprd.com/Equipment.aspx?ID=4376","book":"Treasure Vault","page":"15"},"before":{"traits":[1580,1582]},"after":{"traits":[1580,1582,1527]}},
    {"id":11845,"name":"Chromatic Jellyfish Oil (Moderate)","name_md5":"c5eaf4358c1a20a178292f0c664e8983","source":16,"group":"GENERAL","before_level":11,"after_level":14,"before_uuid":"657640334691975","after_uuid":"7281710863321355","price":{"gp":800},"citation":{"url":"https://2e.aonprd.com/Equipment.aspx?ID=4492","book":"Treasure Vault","page":"59"},"before":{},"after":{}},
    {"id":11904,"name":"Dart Shield","name_md5":"ec7ca1e3256f85529bb1271dd8cb8634","source":16,"group":"SHIELD","before_level":0,"after_level":0,"before_uuid":"5960910038516468","after_uuid":"5960910038516468","price":{"gp":8},"citation":{"url":"https://2e.aonprd.com/Shields.aspx?ID=22","book":"Treasure Vault","page":"21"},"before":{"traits":[]},"after":{"traits":[2881]}},
    {"id":11970,"name":"Energizing Lattice","name_md5":"e34080308c5a02aa5450df47128b263b","source":16,"group":"ARMOR","before_level":13,"after_level":13,"before_uuid":"2879054517568319","after_uuid":"2879054517568319","price":{"gp":3000},"citation":{"url":"https://2e.aonprd.com/Equipment.aspx?ID=4379","book":"Treasure Vault","page":"15"},"before":{"traits":[1517]},"after":{"traits":[1517,1527]}},
    {"id":12095,"name":"Hide Shield","name_md5":"ec0dda166bc2a479d66337a02dbff21b","source":16,"group":"SHIELD","before_level":0,"after_level":0,"before_uuid":"4242949722796972","after_uuid":"4242949722796972","price":{"gp":2},"citation":{"url":"https://2e.aonprd.com/Shields.aspx?ID=27","book":"Treasure Vault","page":"21"},"before":{"traits":[]},"after":{"traits":[2890]}},
    {"id":12104,"name":"Immortal Bastion","name_md5":"1e9e440f401cc91657f23788882632dc","source":16,"group":"ARMOR","before_level":20,"after_level":20,"before_uuid":"8298670509031158","after_uuid":"8298670509031158","price":{"gp":70000},"citation":{"url":"https://2e.aonprd.com/Equipment.aspx?ID=4380","book":"Treasure Vault","page":"15"},"before":{"traits":[1594,2865]},"after":{"traits":[1594,2865,1527]}},
    {"id":12138,"name":"Kaldemash's Lament","name_md5":"5aae426cb6f13637be24f014072db9e4","source":16,"group":"WEAPON","before_level":20,"after_level":20,"before_uuid":"5365496003218960","after_uuid":"5365496003218960","price":{},"citation":{"url":"https://2e.aonprd.com/Equipment.aspx?ID=4423","book":"Treasure Vault","page":"38"},"before":{"traits":[1841,1686,3073]},"after":{"traits":[1841,1686,3073,1459]}},
    {"id":12141,"name":"Klar","name_md5":"46bac31627917e2d1f0007824e7f9db4","source":16,"group":"SHIELD","before_level":0,"after_level":0,"before_uuid":"7115254876001488","after_uuid":"7115254876001488","price":{"gp":3},"citation":{"url":"https://2e.aonprd.com/Shields.aspx?ID=28","book":"Treasure Vault","page":"21"},"before":{"traits":[]},"after":{"traits":[2892]}},
    {"id":12178,"name":"Long Hammer","name_md5":"c508378cfa6b7910f86e286086b01d6b","source":16,"group":"WEAPON","before_level":0,"after_level":0,"before_uuid":"6810584880334794","after_uuid":"6810584880334794","price":{"gp":5},"citation":{"url":"https://2e.aonprd.com/Weapons.aspx?ID=613","book":"Treasure Vault","page":"27"},"before":{"rarity":"UNCOMMON"},"after":{"rarity":"COMMON"}},
    {"id":12207,"name":"Meteor Shield","name_md5":"577778a1e7b8d5b280f79fdfbc21d974","source":16,"group":"SHIELD","before_level":0,"after_level":0,"before_uuid":"7386761127045435","after_uuid":"7386761127045435","price":{"gp":4},"citation":{"url":"https://2e.aonprd.com/Shields.aspx?ID=29","book":"Treasure Vault","page":"22"},"before":{"traits":[]},"after":{"traits":[2887]}},
    {"id":12225,"name":"Mother Maw","name_md5":"68dd73a6c926d25aa67d8fdafdf7de83","source":16,"group":"GENERAL","before_level":15,"after_level":15,"before_uuid":"4025362911235579","after_uuid":"4025362911235579","price":{"gp":6000},"citation":{"url":"https://2e.aonprd.com/Equipment.aspx?ID=4913","book":"Treasure Vault","page":"192"},"before":{"bulk":"0","usage":"worn"},"after":{"bulk":"0.1","usage":"placed on a surface"}},
    {"id":12273,"name":"Phoenix Cinder","name_md5":"696f5186861142de2cf0ec5047b86f00","source":16,"group":"GENERAL","before_level":16,"after_level":16,"before_uuid":"991070947169618","after_uuid":"991070947169618","price":{},"citation":{"url":"https://2e.aonprd.com/Equipment.aspx?ID=4901","book":"Treasure Vault","page":"188"},"before":{"bulk":"0.1"},"after":{"bulk":"0"}},
    {"id":12311,"name":"Razor Disc","name_md5":"f5269d5e65f82a378fb5ef01b06c8da4","source":16,"group":"SHIELD","before_level":0,"after_level":0,"before_uuid":"2043070097838465","after_uuid":"2043070097838465","price":{"gp":5},"citation":{"url":"https://2e.aonprd.com/Shields.aspx?ID=30","book":"Treasure Vault","page":"22"},"before":{"traits":[]},"after":{"traits":[2895,2896]}},
    {"id":12317,"name":"Reef Heart (Greater)","name_md5":"cd653dc514586a0cf719b402d7ed252a","source":16,"group":"ARMOR","before_level":15,"after_level":15,"before_uuid":"540967073137902","after_uuid":"540967073137902","price":{"gp":6500},"citation":{"url":"https://2e.aonprd.com/Equipment.aspx?ID=4384","book":"Treasure Vault","page":"18"},"before":{"traits":[2879]},"after":{"traits":[2879,1527]}},
    {"id":12318,"name":"Reef Heart","name_md5":"556c3ec80a4533bd4f4b86739f097d3e","source":16,"group":"ARMOR","before_level":12,"after_level":12,"before_uuid":"7670378767413467","after_uuid":"7670378767413467","price":{"gp":2000},"citation":{"url":"https://2e.aonprd.com/Equipment.aspx?ID=4384","book":"Treasure Vault","page":"18"},"before":{"traits":[2879]},"after":{"traits":[2879,1527]}},
    {"id":12355,"name":"Salvo Shield","name_md5":"0c6ca71cdfbf71294ede3dc5ef2302c6","source":16,"group":"SHIELD","before_level":0,"after_level":0,"before_uuid":"1458991117013504","after_uuid":"1458991117013504","price":{"gp":6},"citation":{"url":"https://2e.aonprd.com/Shields.aspx?ID=31","book":"Treasure Vault","page":"22"},"before":{"traits":[]},"after":{"traits":[2898]}},
    {"id":12377,"name":"Scale of Igroon","name_md5":"59c30d82d1aadbf941fea8fccea81f57","source":16,"group":"SHIELD","before_level":21,"after_level":21,"before_uuid":"6953171332710115","after_uuid":"6953171332710115","price":{},"citation":{"url":"https://2e.aonprd.com/Equipment.aspx?ID=4894","book":"Treasure Vault","page":"180"},"before":{"usage":null},"after":{"usage":"held in 1 hand"}},
    {"id":12485,"name":"Starfaring Cloak","name_md5":"c7aa99ee03ec46094303fb182e49da56","source":16,"group":"GENERAL","before_level":24,"after_level":24,"before_uuid":"6138641114073734","after_uuid":"6138641114073734","price":{},"citation":{"url":"https://2e.aonprd.com/Equipment.aspx?ID=4895","book":"Treasure Vault","page":"180"},"before":{"rarity":"UNIQUE"},"after":{"rarity":"RARE"}},
    {"id":12505,"name":"Swordstealer Shield","name_md5":"45d869b8e3a773ca8ea47c079331307e","source":16,"group":"SHIELD","before_level":0,"after_level":0,"before_uuid":"1137159685038700","after_uuid":"1137159685038700","price":{"gp":6},"citation":{"url":"https://2e.aonprd.com/Shields.aspx?ID=32","book":"Treasure Vault","page":"22"},"before":{"traits":[]},"after":{"traits":[2904]}},
    {"id":12510,"name":"Tattletale Orb (Clear Quartz)","name_md5":"0d83581ed9c8d56ec93ef4a2f597842f","source":16,"group":"GENERAL","before_level":14,"after_level":14,"before_uuid":"1635288967066971","after_uuid":"1635288967066971","price":{"gp":3800},"citation":{"url":"https://2e.aonprd.com/Equipment.aspx?ID=4919","book":"Treasure Vault","page":"193"},"before":{"bulk":"0.1"},"after":{"bulk":"1"}},
    {"id":12511,"name":"Tattletale Orb (Moonstone)","name_md5":"0e19661f317bc2a40350749677cff8f2","source":16,"group":"GENERAL","before_level":16,"after_level":16,"before_uuid":"1694253875786979","after_uuid":"1694253875786979","price":{"gp":7500},"citation":{"url":"https://2e.aonprd.com/Equipment.aspx?ID=4919","book":"Treasure Vault","page":"193"},"before":{"bulk":"0.1"},"after":{"bulk":"1"}},
    {"id":12512,"name":"Tattletale Orb (Obsidian)","name_md5":"2fa517a0660700b72ff87197df7db741","source":16,"group":"GENERAL","before_level":19,"after_level":19,"before_uuid":"7844162904381096","after_uuid":"7844162904381096","price":{"gp":32000},"citation":{"url":"https://2e.aonprd.com/Equipment.aspx?ID=4919","book":"Treasure Vault","page":"193"},"before":{"bulk":"0.1"},"after":{"bulk":"1"}},
    {"id":12513,"name":"Tattletale Orb (Peridot)","name_md5":"bbbac13bbdb919d22fd73fbbfb7781fb","source":16,"group":"GENERAL","before_level":17,"after_level":17,"before_uuid":"779721608287483","after_uuid":"779721608287483","price":{"gp":12500},"citation":{"url":"https://2e.aonprd.com/Equipment.aspx?ID=4919","book":"Treasure Vault","page":"193"},"before":{"bulk":"0.1"},"after":{"bulk":"1"}},
    {"id":12514,"name":"Tattletale Orb (Selenite)","name_md5":"81533cf2cff945a52a7f9d3e9e070608","source":16,"group":"GENERAL","before_level":15,"after_level":15,"before_uuid":"483346499495579","after_uuid":"483346499495579","price":{"gp":7000},"citation":{"url":"https://2e.aonprd.com/Equipment.aspx?ID=4919","book":"Treasure Vault","page":"193"},"before":{"bulk":"0.1"},"after":{"bulk":"1"}},
    {"id":12563,"name":"Trollhound Vest","name_md5":"326a542f3998eaba9008d3e8efd1f9bc","source":16,"group":"ARMOR","before_level":6,"after_level":6,"before_uuid":"1440206271342214","after_uuid":"1440206271342214","price":{"gp":230},"citation":{"url":"https://2e.aonprd.com/Equipment.aspx?ID=4387","book":"Treasure Vault","page":"19"},"before":{"traits":[]},"after":{"traits":[1527]}},
    {"id":12594,"name":"Void Fragment","name_md5":"566f979eb0c0f069f7648c77086ea917","source":16,"group":"GENERAL","before_level":13,"after_level":13,"before_uuid":"487312580376169","after_uuid":"487312580376169","price":{},"citation":{"url":"https://2e.aonprd.com/Equipment.aspx?ID=4902","book":"Treasure Vault","page":"189"},"before":{"bulk":"0.1"},"after":{"bulk":"0"}},
    {"id":12710,"name":"Wasp Guard","name_md5":"267dc5dc2692d11671f6686611c90c09","source":16,"group":"ARMOR","before_level":8,"after_level":8,"before_uuid":"4497824975924283","after_uuid":"4497824975924283","price":{"gp":487},"citation":{"url":"https://2e.aonprd.com/Equipment.aspx?ID=4388","book":"Treasure Vault","page":"19"},"before":{"traits":[]},"after":{"traits":[1527]}},
    {"id":17302,"name":"8-Round Magazine","name_md5":"0f8fa0b4a7c510267dfae94e02c651c3","source":16,"group":"GENERAL","before_level":0,"after_level":0,"before_uuid":"5975038813987928","after_uuid":"5975038813987928","price":{"sp":2},"citation":{"url":"https://2e.aonprd.com/Weapons.aspx?ID=664","book":"Treasure Vault","page":"30"},"before":{"rarity":"UNCOMMON"},"after":{"rarity":"COMMON"}}
  ]
  $patches$::jsonb;
  dependencies constant jsonb := $dependencies$
  [
    {"id":1459,"name":"Arcane","source":3,"uuid":"2175258629482839"},
    {"id":1527,"name":"Invested","source":3,"uuid":"370388764978504"},
    {"id":2881,"name":"Launching Dart","source":16,"uuid":"8881833178962717"},
    {"id":2887,"name":"Shield Throw 30","source":16,"uuid":"2071518794795293"},
    {"id":2890,"name":"Deflecting Bludgeoning","source":16,"uuid":"6524555752659264"},
    {"id":2892,"name":"Integrated 1 D 6 S Versatile P","source":16,"uuid":"2839132031931483"},
    {"id":2895,"name":"Integrated 1 D 6 S","source":16,"uuid":"415867526743598"},
    {"id":2896,"name":"Shield Throw 20","source":16,"uuid":"4636467218140761"},
    {"id":2898,"name":"Deflecting Physical Ranged","source":16,"uuid":"6912649900147573"},
    {"id":2904,"name":"Deflecting Slashing","source":16,"uuid":"8398829696303312"}
  ]
  $dependencies$::jsonb;
  patch jsonb;
  dependency jsonb;
  leaf text;
  item_row public.item%rowtype;
  trait_row public.trait%rowtype;
  changed_rows integer;
begin
  -- Prevent a curator submission from appearing between the guard and the repair.
  lock table public.content_update in share mode;
  -- Acquire reviewed content rows before source cache locks.
  perform i.id from public.item i where i.id in (
    select (p->>'id')::bigint from jsonb_array_elements(patches) p
  ) order by i.id for update;
  perform t.id from public.trait t where t.id in (
    select (d->>'id')::bigint from jsonb_array_elements(dependencies) d
  ) order by t.id for share;
  -- End reviewed content row prelocks.
  perform id from public.content_source
    where (id = 3 and name = 'Common Core' or id = 16 and name = 'Treasure Vault')
      and user_id is null and is_published is true order by id for update;
  get diagnostics changed_rows = row_count;
  if changed_rows <> 2 then raise exception 'Missing official structured-field sources'; end if;

  for dependency in select value from jsonb_array_elements(dependencies)
    order by (value->>'id')::bigint loop
    select * into trait_row from public.trait where id = (dependency->>'id')::bigint for share;
    if not found or trait_row.name is distinct from dependency->>'name'
      or trait_row.uuid is distinct from (dependency->>'uuid')::bigint
      or trait_row.content_source_id is distinct from (dependency->>'source')::bigint then
      raise exception 'Structured-field trait dependency changed: %', dependency->>'id';
    end if;
    if exists (select 1 from public.content_update where type = 'trait'
      and ref_id = trait_row.id and status->>'state' = 'PENDING') then
      raise exception 'Trait dependency has a pending curator submission: %', dependency->>'id';
    end if;
  end loop;

  for patch in select value from jsonb_array_elements(patches) order by (value->>'id')::bigint loop
    select * into item_row from public.item where id = (patch->>'id')::bigint for update;
    if not found or item_row.name is distinct from patch->>'name'
      or md5(item_row.name) is distinct from patch->>'name_md5'
      or item_row.content_source_id is distinct from (patch->>'source')::bigint
      or item_row."group" is distinct from patch->>'group'
      or item_row.price::jsonb is distinct from patch->'price'
      or jsonb_typeof(item_row.meta_data) is distinct from 'object'
      or item_row.meta_data->'source' is distinct from patch->'citation'
      or ((item_row.level = (patch->>'before_level')::integer
        and item_row.uuid = (patch->>'before_uuid')::bigint)
        or (item_row.level = (patch->>'after_level')::integer
          and item_row.uuid = (patch->>'after_uuid')::bigint)) is not true then
      raise exception 'Missing or changed Treasure Vault structured-field item: %', patch->>'id';
    end if;
    -- Check even an already-repaired row before considering an idempotent replay.
    if exists (select 1 from public.content_update where type = 'item'
      and ref_id = item_row.id and status->>'state' = 'PENDING') then
      raise exception 'Structured-field item has a pending curator submission: %', patch->>'id';
    end if;
    for leaf in select jsonb_object_keys(patch->'before') loop
      if (to_jsonb(item_row)->leaf is not distinct from patch->'before'->leaf
        or to_jsonb(item_row)->leaf is not distinct from patch->'after'->leaf) is not true then
        raise exception 'Structured leaf differs from reviewed before/after: % %', patch->>'id', leaf;
      end if;
    end loop;
    if exists (select 1 from public.item where uuid = (patch->>'after_uuid')::bigint
      and id <> item_row.id) then
      raise exception 'Corrected structured-field UUID collides with another item: %', patch->>'id';
    end if;

    -- Level determines the canonical UUID: change the reviewed pair atomically.
    if item_row.level is distinct from (patch->>'after_level')::integer
      or item_row.uuid is distinct from (patch->>'after_uuid')::bigint then
      update public.item set level = (patch->>'after_level')::integer,
        uuid = (patch->>'after_uuid')::bigint where id = item_row.id
          and name is not distinct from item_row.name
          and uuid is not distinct from item_row.uuid
          and level is not distinct from item_row.level
          and content_source_id is not distinct from item_row.content_source_id
          and "group" is not distinct from item_row."group"
          and price::jsonb is not distinct from item_row.price::jsonb
          and meta_data->'source' is not distinct from item_row.meta_data->'source';
      get diagnostics changed_rows = row_count;
      if changed_rows <> 1 then raise exception 'Level/UUID changed during reviewed repair: %', patch->>'id'; end if;
    end if;

    if patch->'after' ? 'traits' and
      to_jsonb(item_row)->'traits' is distinct from patch->'after'->'traits' then
      update public.item set traits = array(select value::bigint from jsonb_array_elements_text(patch->'after'->'traits'))
        where id = item_row.id
          and name is not distinct from item_row.name
          and uuid is not distinct from item_row.uuid
          and level is not distinct from item_row.level
          and content_source_id is not distinct from item_row.content_source_id
          and "group" is not distinct from item_row."group"
          and price::jsonb is not distinct from item_row.price::jsonb
          and meta_data->'source' is not distinct from item_row.meta_data->'source'
          and traits is not distinct from item_row.traits;
      get diagnostics changed_rows = row_count;
      if changed_rows <> 1 then raise exception 'traits changed during reviewed repair: %', patch->>'id'; end if;
    end if;

    if patch->'after' ? 'bulk' and
      to_jsonb(item_row)->'bulk' is distinct from patch->'after'->'bulk' then
      update public.item set bulk = patch->'after'->>'bulk'
        where id = item_row.id
          and name is not distinct from item_row.name
          and uuid is not distinct from item_row.uuid
          and level is not distinct from item_row.level
          and content_source_id is not distinct from item_row.content_source_id
          and "group" is not distinct from item_row."group"
          and price::jsonb is not distinct from item_row.price::jsonb
          and meta_data->'source' is not distinct from item_row.meta_data->'source'
          and bulk is not distinct from item_row.bulk;
      get diagnostics changed_rows = row_count;
      if changed_rows <> 1 then raise exception 'bulk changed during reviewed repair: %', patch->>'id'; end if;
    end if;

    if patch->'after' ? 'usage' and
      to_jsonb(item_row)->'usage' is distinct from patch->'after'->'usage' then
      update public.item set usage = patch->'after'->>'usage'
        where id = item_row.id
          and name is not distinct from item_row.name
          and uuid is not distinct from item_row.uuid
          and level is not distinct from item_row.level
          and content_source_id is not distinct from item_row.content_source_id
          and "group" is not distinct from item_row."group"
          and price::jsonb is not distinct from item_row.price::jsonb
          and meta_data->'source' is not distinct from item_row.meta_data->'source'
          and usage is not distinct from item_row.usage;
      get diagnostics changed_rows = row_count;
      if changed_rows <> 1 then raise exception 'usage changed during reviewed repair: %', patch->>'id'; end if;
    end if;

    if patch->'after' ? 'rarity' and
      to_jsonb(item_row)->'rarity' is distinct from patch->'after'->'rarity' then
      update public.item set rarity = patch->'after'->>'rarity'
        where id = item_row.id
          and name is not distinct from item_row.name
          and uuid is not distinct from item_row.uuid
          and level is not distinct from item_row.level
          and content_source_id is not distinct from item_row.content_source_id
          and "group" is not distinct from item_row."group"
          and price::jsonb is not distinct from item_row.price::jsonb
          and meta_data->'source' is not distinct from item_row.meta_data->'source'
          and rarity is not distinct from item_row.rarity;
      get diagnostics changed_rows = row_count;
      if changed_rows <> 1 then raise exception 'rarity changed during reviewed repair: %', patch->>'id'; end if;
    end if;
  end loop;
end
$repair$;
$historical_original_dual$;
end $historical_dual$;
