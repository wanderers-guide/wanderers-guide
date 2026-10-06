-- Preserve original check IDs and predicates; use the pinned shared terminal check.
with terminal_function as materialized(select (exists(select 1 from pg_catalog.pg_proc p
  where p.oid=pg_catalog.to_regprocedure('public.treasure_vault_terminal_status_v1()')
    and pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to((p.prosrc)::text,'UTF8')),'hex')='306b98528f553f9089d3b46c8541b30121c9cdf1c30a48a69034842982f22c87'
    and p.prokind='f' and p.prolang=(select l.oid from pg_catalog.pg_language l where l.lanname='sql')
    and p.provolatile='s' and p.prosecdef is false and p.proisstrict is false and p.proleakproof is false
    and p.proparallel='u' and p.procost=100 and p.prorows=1
    and p.pronargs=0 and p.pronargdefaults=0 and p.proretset is true
    and p.prorettype=pg_catalog.to_regtype('record')
    and p.proallargtypes=array[pg_catalog.to_regtype('boolean')::oid,pg_catalog.to_regtype('boolean')::oid]
    and p.proargmodes=array['t','t']::"char"[] and p.proargnames=array['recognized','passed']::text[]
    and p.proconfig=array['search_path=""']::text[] and p.proowner=pg_catalog.to_regrole('postgres')
    and (select count(*)=2
      and count(*) filter(where a.grantee=pg_catalog.to_regrole('postgres'))=1
      and count(*) filter(where a.grantee=pg_catalog.to_regrole('service_role'))=1
      and bool_and((a.privilege_type='EXECUTE' and a.is_grantable is false
      and a.grantor=pg_catalog.to_regrole('postgres')
      and a.grantee in(pg_catalog.to_regrole('postgres'),pg_catalog.to_regrole('service_role'))) is true)
      from pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a)
    and pg_catalog.has_function_privilege('postgres',p.oid,'EXECUTE')
    and pg_catalog.has_function_privilege('service_role',p.oid,'EXECUTE'))) as valid),
terminal_status as materialized(select case when f.valid is true then
  coalesce((select pg_catalog.to_jsonb(s) from public.treasure_vault_terminal_status_v1() s),'{"recognized":true,"passed":false}'::jsonb)
  else '{"recognized":true,"passed":false}'::jsonb end as value from terminal_function f),
original_checks as(
with expected as (
  select * from jsonb_to_recordset($expected$
  [
    {"id":11764,"name":"Black Hole Armor","name_md5":"574312c2a92dddc59b2a6a7903920ef7","uuid":"4613287267296927","source":16,"level":16,"group":"ARMOR","price":{"gp":8500},"citation":{"url":"https://2e.aonprd.com/Equipment.aspx?ID=4375","book":"Treasure Vault","page":"14"},"leaves":{"traits":[1594,2870,1527]}},
    {"id":11768,"name":"Blade Byrnie (Greater)","name_md5":"a7924bf80d3f64e1f53a6193b4d0f721","uuid":"3498721685453068","source":16,"level":13,"group":"ARMOR","price":{"gp":3000},"citation":{"url":"https://2e.aonprd.com/Equipment.aspx?ID=4376","book":"Treasure Vault","page":"15"},"leaves":{"traits":[1580,1582,1527]}},
    {"id":11845,"name":"Chromatic Jellyfish Oil (Moderate)","name_md5":"c5eaf4358c1a20a178292f0c664e8983","uuid":"7281710863321355","source":16,"level":14,"group":"GENERAL","price":{"gp":800},"citation":{"url":"https://2e.aonprd.com/Equipment.aspx?ID=4492","book":"Treasure Vault","page":"59"},"leaves":{}},
    {"id":11904,"name":"Dart Shield","name_md5":"ec7ca1e3256f85529bb1271dd8cb8634","uuid":"5960910038516468","source":16,"level":0,"group":"SHIELD","price":{"gp":8},"citation":{"url":"https://2e.aonprd.com/Shields.aspx?ID=22","book":"Treasure Vault","page":"21"},"leaves":{"traits":[2881]}},
    {"id":11970,"name":"Energizing Lattice","name_md5":"e34080308c5a02aa5450df47128b263b","uuid":"2879054517568319","source":16,"level":13,"group":"ARMOR","price":{"gp":3000},"citation":{"url":"https://2e.aonprd.com/Equipment.aspx?ID=4379","book":"Treasure Vault","page":"15"},"leaves":{"traits":[1517,1527]}},
    {"id":12095,"name":"Hide Shield","name_md5":"ec0dda166bc2a479d66337a02dbff21b","uuid":"4242949722796972","source":16,"level":0,"group":"SHIELD","price":{"gp":2},"citation":{"url":"https://2e.aonprd.com/Shields.aspx?ID=27","book":"Treasure Vault","page":"21"},"leaves":{"traits":[2890]}},
    {"id":12104,"name":"Immortal Bastion","name_md5":"1e9e440f401cc91657f23788882632dc","uuid":"8298670509031158","source":16,"level":20,"group":"ARMOR","price":{"gp":70000},"citation":{"url":"https://2e.aonprd.com/Equipment.aspx?ID=4380","book":"Treasure Vault","page":"15"},"leaves":{"traits":[1594,2865,1527]}},
    {"id":12138,"name":"Kaldemash's Lament","name_md5":"5aae426cb6f13637be24f014072db9e4","uuid":"5365496003218960","source":16,"level":20,"group":"WEAPON","price":{},"citation":{"url":"https://2e.aonprd.com/Equipment.aspx?ID=4423","book":"Treasure Vault","page":"38"},"leaves":{"traits":[1841,1686,3073,1459]}},
    {"id":12141,"name":"Klar","name_md5":"46bac31627917e2d1f0007824e7f9db4","uuid":"7115254876001488","source":16,"level":0,"group":"SHIELD","price":{"gp":3},"citation":{"url":"https://2e.aonprd.com/Shields.aspx?ID=28","book":"Treasure Vault","page":"21"},"leaves":{"traits":[2892]}},
    {"id":12178,"name":"Long Hammer","name_md5":"c508378cfa6b7910f86e286086b01d6b","uuid":"6810584880334794","source":16,"level":0,"group":"WEAPON","price":{"gp":5},"citation":{"url":"https://2e.aonprd.com/Weapons.aspx?ID=613","book":"Treasure Vault","page":"27"},"leaves":{"rarity":"COMMON"}},
    {"id":12207,"name":"Meteor Shield","name_md5":"577778a1e7b8d5b280f79fdfbc21d974","uuid":"7386761127045435","source":16,"level":0,"group":"SHIELD","price":{"gp":4},"citation":{"url":"https://2e.aonprd.com/Shields.aspx?ID=29","book":"Treasure Vault","page":"22"},"leaves":{"traits":[2887]}},
    {"id":12225,"name":"Mother Maw","name_md5":"68dd73a6c926d25aa67d8fdafdf7de83","uuid":"4025362911235579","source":16,"level":15,"group":"GENERAL","price":{"gp":6000},"citation":{"url":"https://2e.aonprd.com/Equipment.aspx?ID=4913","book":"Treasure Vault","page":"192"},"leaves":{"bulk":"0.1","usage":"placed on a surface"}},
    {"id":12273,"name":"Phoenix Cinder","name_md5":"696f5186861142de2cf0ec5047b86f00","uuid":"991070947169618","source":16,"level":16,"group":"GENERAL","price":{},"citation":{"url":"https://2e.aonprd.com/Equipment.aspx?ID=4901","book":"Treasure Vault","page":"188"},"leaves":{"bulk":"0"}},
    {"id":12311,"name":"Razor Disc","name_md5":"f5269d5e65f82a378fb5ef01b06c8da4","uuid":"2043070097838465","source":16,"level":0,"group":"SHIELD","price":{"gp":5},"citation":{"url":"https://2e.aonprd.com/Shields.aspx?ID=30","book":"Treasure Vault","page":"22"},"leaves":{"traits":[2895,2896]}},
    {"id":12317,"name":"Reef Heart (Greater)","name_md5":"cd653dc514586a0cf719b402d7ed252a","uuid":"540967073137902","source":16,"level":15,"group":"ARMOR","price":{"gp":6500},"citation":{"url":"https://2e.aonprd.com/Equipment.aspx?ID=4384","book":"Treasure Vault","page":"18"},"leaves":{"traits":[2879,1527]}},
    {"id":12318,"name":"Reef Heart","name_md5":"556c3ec80a4533bd4f4b86739f097d3e","uuid":"7670378767413467","source":16,"level":12,"group":"ARMOR","price":{"gp":2000},"citation":{"url":"https://2e.aonprd.com/Equipment.aspx?ID=4384","book":"Treasure Vault","page":"18"},"leaves":{"traits":[2879,1527]}},
    {"id":12355,"name":"Salvo Shield","name_md5":"0c6ca71cdfbf71294ede3dc5ef2302c6","uuid":"1458991117013504","source":16,"level":0,"group":"SHIELD","price":{"gp":6},"citation":{"url":"https://2e.aonprd.com/Shields.aspx?ID=31","book":"Treasure Vault","page":"22"},"leaves":{"traits":[2898]}},
    {"id":12377,"name":"Scale of Igroon","name_md5":"59c30d82d1aadbf941fea8fccea81f57","uuid":"6953171332710115","source":16,"level":21,"group":"SHIELD","price":{},"citation":{"url":"https://2e.aonprd.com/Equipment.aspx?ID=4894","book":"Treasure Vault","page":"180"},"leaves":{"usage":"held in 1 hand"}},
    {"id":12485,"name":"Starfaring Cloak","name_md5":"c7aa99ee03ec46094303fb182e49da56","uuid":"6138641114073734","source":16,"level":24,"group":"GENERAL","price":{},"citation":{"url":"https://2e.aonprd.com/Equipment.aspx?ID=4895","book":"Treasure Vault","page":"180"},"leaves":{"rarity":"RARE"}},
    {"id":12505,"name":"Swordstealer Shield","name_md5":"45d869b8e3a773ca8ea47c079331307e","uuid":"1137159685038700","source":16,"level":0,"group":"SHIELD","price":{"gp":6},"citation":{"url":"https://2e.aonprd.com/Shields.aspx?ID=32","book":"Treasure Vault","page":"22"},"leaves":{"traits":[2904]}},
    {"id":12510,"name":"Tattletale Orb (Clear Quartz)","name_md5":"0d83581ed9c8d56ec93ef4a2f597842f","uuid":"1635288967066971","source":16,"level":14,"group":"GENERAL","price":{"gp":3800},"citation":{"url":"https://2e.aonprd.com/Equipment.aspx?ID=4919","book":"Treasure Vault","page":"193"},"leaves":{"bulk":"1"}},
    {"id":12511,"name":"Tattletale Orb (Moonstone)","name_md5":"0e19661f317bc2a40350749677cff8f2","uuid":"1694253875786979","source":16,"level":16,"group":"GENERAL","price":{"gp":7500},"citation":{"url":"https://2e.aonprd.com/Equipment.aspx?ID=4919","book":"Treasure Vault","page":"193"},"leaves":{"bulk":"1"}},
    {"id":12512,"name":"Tattletale Orb (Obsidian)","name_md5":"2fa517a0660700b72ff87197df7db741","uuid":"7844162904381096","source":16,"level":19,"group":"GENERAL","price":{"gp":32000},"citation":{"url":"https://2e.aonprd.com/Equipment.aspx?ID=4919","book":"Treasure Vault","page":"193"},"leaves":{"bulk":"1"}},
    {"id":12513,"name":"Tattletale Orb (Peridot)","name_md5":"bbbac13bbdb919d22fd73fbbfb7781fb","uuid":"779721608287483","source":16,"level":17,"group":"GENERAL","price":{"gp":12500},"citation":{"url":"https://2e.aonprd.com/Equipment.aspx?ID=4919","book":"Treasure Vault","page":"193"},"leaves":{"bulk":"1"}},
    {"id":12514,"name":"Tattletale Orb (Selenite)","name_md5":"81533cf2cff945a52a7f9d3e9e070608","uuid":"483346499495579","source":16,"level":15,"group":"GENERAL","price":{"gp":7000},"citation":{"url":"https://2e.aonprd.com/Equipment.aspx?ID=4919","book":"Treasure Vault","page":"193"},"leaves":{"bulk":"1"}},
    {"id":12563,"name":"Trollhound Vest","name_md5":"326a542f3998eaba9008d3e8efd1f9bc","uuid":"1440206271342214","source":16,"level":6,"group":"ARMOR","price":{"gp":230},"citation":{"url":"https://2e.aonprd.com/Equipment.aspx?ID=4387","book":"Treasure Vault","page":"19"},"leaves":{"traits":[1527]}},
    {"id":12594,"name":"Void Fragment","name_md5":"566f979eb0c0f069f7648c77086ea917","uuid":"487312580376169","source":16,"level":13,"group":"GENERAL","price":{},"citation":{"url":"https://2e.aonprd.com/Equipment.aspx?ID=4902","book":"Treasure Vault","page":"189"},"leaves":{"bulk":"0"}},
    {"id":12710,"name":"Wasp Guard","name_md5":"267dc5dc2692d11671f6686611c90c09","uuid":"4497824975924283","source":16,"level":8,"group":"ARMOR","price":{"gp":487},"citation":{"url":"https://2e.aonprd.com/Equipment.aspx?ID=4388","book":"Treasure Vault","page":"19"},"leaves":{"traits":[1527]}},
    {"id":17302,"name":"8-Round Magazine","name_md5":"0f8fa0b4a7c510267dfae94e02c651c3","uuid":"5975038813987928","source":16,"level":0,"group":"GENERAL","price":{"sp":2},"citation":{"url":"https://2e.aonprd.com/Weapons.aspx?ID=664","book":"Treasure Vault","page":"30"},"leaves":{"rarity":"COMMON"}}
  ]
  $expected$::jsonb) as e(id bigint, name text, name_md5 text, uuid bigint, source bigint,
    level integer, "group" text, price jsonb, citation jsonb, leaves jsonb)
), dependencies as (
  select * from jsonb_to_recordset($dependencies$
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
  $dependencies$::jsonb) as d(id bigint, name text, source bigint, uuid bigint)
)
select 'treasure-vault-structured-fields'::text as id,
  coalesce((select count(*) = 29 and bool_and((
    i.id is not null and i.name = e.name and md5(i.name) = e.name_md5
    and i.uuid = e.uuid and i.content_source_id = e.source and i.level = e.level
    and i."group" = e."group" and i.price::jsonb = e.price
    and jsonb_typeof(i.meta_data) = 'object' and i.meta_data->'source' = e.citation
    and not exists (select 1 from jsonb_each(e.leaves) leaf
      where to_jsonb(i)->leaf.key is distinct from leaf.value)) is true)
    from expected e left join public.item i on i.id = e.id), false)
  and coalesce((select count(*) = 10 and bool_and((
    t.id is not null and t.name = d.name and t.uuid = d.uuid
    and t.content_source_id = d.source) is true)
    from dependencies d left join public.trait t on t.id = d.id), false)
  and (select count(*) = 2 from public.content_source
    where (id = 3 and name = 'Common Core' or id = 16 and name = 'Treasure Vault')
      and user_id is null and is_published is true)
  as passed
)
select original_checks.id,case when coalesce((status.value->>'recognized')::boolean,true) then coalesce((status.value->>'passed')::boolean,false) else original_checks.passed end as passed from original_checks cross join terminal_status status;
