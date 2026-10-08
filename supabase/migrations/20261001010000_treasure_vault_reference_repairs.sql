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
  execute $historical_original_dual$do $repair$
declare
  patches constant jsonb := $patches$
  [
    {"id":11726,"name":"Autumn's Embrace","uuid":"3907058889255350","source":16,"level":12,"path":["meta_data","runes","property","0","rune","description"],"before":"e379cfcc3e699ddf7d6f4241678e50fd","after":"158effecebd19a5f581682e0a37fc8a5","replacements":[{"from":"**Activate—**[**Go Invisible**](link_spell_3390)","to":"**Activate—Go Invisible**","count":1}]},
    {"id":11792,"name":"Boreal Staff (Greater)","uuid":"6175930232896427","source":16,"level":12,"path":["description"],"before":"72fa9067e4e0f71e99ff930537fff968","after":"f9c2513927de51e404fd9cc8a2e4e13a","replacements":[{"from":"[elemental absorption](link_spell_7046)","to":"[elemental absorption](link_spell_8867)","count":1}]},
    {"id":11793,"name":"Boreal Staff (Major)","uuid":"4506258948304121","source":16,"level":17,"path":["description"],"before":"85e11eb6b6e6f34d4d924bb26d078cb7","after":"c2d4f43ab199f912ffd3dc4f1312cca0","replacements":[{"from":"[elemental absorption](link_spell_7046)","to":"[elemental absorption](link_spell_8867)","count":1}]},
    {"id":11794,"name":"Boreal Staff","uuid":"5491540430241772","source":16,"level":8,"path":["description"],"before":"e687e32677fcb829a030d86bd9800321","after":"22342d7f0064fc6dd3de842d528d394e","replacements":[{"from":"[elemental absorption](link_spell_7046)","to":"[elemental absorption](link_spell_8867)","count":1}]},
    {"id":11813,"name":"Brightbloom Posy (Greater)","uuid":"7176713891897482","source":16,"level":11,"path":["description"],"before":"ced8d766c8670003648c9fe9aff7d9f1","after":"af0697ad2c4f208ddadbfd7fc66ef0c5","replacements":[{"from":"[petal storm](link_spell_6370)","to":"[petal storm](link_spell_8999)","count":1}]},
    {"id":11814,"name":"Brightbloom Posy (Major)","uuid":"4345449524746383","source":16,"level":19,"path":["description"],"before":"5faaf78616a86df71b9729c7bcf82254","after":"a91aebf48b743a57e7b97459e651433b","replacements":[{"from":"[petal storm](link_spell_6370)","to":"6th-rank [petal storm](link_spell_8999)","count":1}]},
    {"id":11832,"name":"Celestial Staff","uuid":"2628574946957144","source":16,"level":17,"path":["meta_data","runes","property","0","rune","description"],"before":"1e970306bba222cf7ea156e789cf552e","after":"b5ab4f39f567f484fbe6c9f89cf79caf","replacements":[{"from":"**Activate—**[**Holy Healing**](link_spell_3371)","to":"**Activate—Holy Healing**","count":1}]},
    {"id":12029,"name":"Fury Cocktail (Lesser)","uuid":"7778701163006202","source":16,"level":4,"path":["description"],"before":"a08a8347b36158a9891f75ac967d46eb","after":"85757a654e1fc86a7ee9f8835676ef11","replacements":[{"from":"[reach](link_trait_192)","to":"reach","count":1},{"from":"\n\n[[Effect: Fury Cocktail (Lesser)]]","to":"","count":1}]},
    {"id":12030,"name":"Fury Cocktail (Moderate)","uuid":"8693870649637461","source":16,"level":12,"path":["description"],"before":"800a97a597fab695a829b5738246fec8","after":"cd50822094cdfb406dcb09792ee029ff","replacements":[{"from":"[reach](link_trait_192)","to":"reach","count":1},{"from":"\n\n[[Effect: Fury Cocktail (Moderate)]]","to":"","count":1}]},
    {"id":7052,"name":"Invisibility","uuid":"1312161067029585","source":7,"path":["description"],"before":"e379cfcc3e699ddf7d6f4241678e50fd","after":"158effecebd19a5f581682e0a37fc8a5","replacements":[{"from":"**Activate—**[**Go Invisible**](link_spell_3390)","to":"**Activate—Go Invisible**","count":1}],"level":8}
  ]
  $patches$::jsonb;
  targets constant jsonb := $targets$
  [
    {"id":8867,"name":"Elemental Absorption","uuid":"5013391004281276","rank":3,"source":842,"traditions":["arcane","primal"],"citation":{"book":"Impossible Magic","page":"135","url":"https://2e.aonprd.com/Spells.aspx?ID=2688"}},
    {"id":8999,"name":"Petal Storm","uuid":"6425751270917234","rank":4,"source":842,"traditions":["primal"],"citation":{"book":"Impossible Magic","page":"156","url":"https://2e.aonprd.com/Spells.aspx?ID=2786"}}
  ]
  $targets$::jsonb;
  patch jsonb;
  replacement jsonb;
  target jsonb;
  item_row public.item%rowtype;
  spell_row public.spell%rowtype;
  field_path text[];
  before_text text;
  corrected text;
  rune_identity jsonb;
  changed_rows integer;
begin
  -- Keep new curator submissions from racing a reviewed repair.
  lock table public.content_update in share mode;
  -- Acquire every reviewed child before source locks or cache-trigger writes.
  perform i.id from public.item i where i.id in (
    select (value->>'id')::bigint from jsonb_array_elements(patches)
  ) order by i.id for update;
  perform id from public.spell where id in (8867,8999) order by id for update;
  perform id from public.content_source where id in (7,16,842)
    and user_id is null and is_published is true order by id for update;
  get diagnostics changed_rows = row_count;
  if changed_rows <> 3 then raise exception 'Missing official Treasure Vault dependencies'; end if;

  for target in select value from jsonb_array_elements(targets) loop
    select * into spell_row from public.spell where id = (target->>'id')::bigint for update;
    if not found or spell_row.name is distinct from target->>'name'
      or spell_row.uuid is distinct from (target->>'uuid')::bigint
      or spell_row.rank is distinct from (target->>'rank')::integer
      or spell_row.content_source_id is distinct from (target->>'source')::bigint
      or to_jsonb(spell_row.traditions) is distinct from target->'traditions' then
      raise exception 'Missing or changed item spell: %', target->>'name';
    end if;
    if exists (select 1 from public.content_update where type = 'spell'
      and ref_id = spell_row.id and status->>'state' = 'PENDING') then
      raise exception 'Item spell has a pending curator submission: %', target->>'name';
    end if;
    if spell_row.meta_data->'source' is distinct from target->'citation' then
      if spell_row.meta_data->'source' is not null and spell_row.meta_data->'source' <> 'null'::jsonb then
        raise exception 'Changed item spell citation: %', target->>'name';
      end if;
      update public.spell
        set meta_data = jsonb_set(coalesce(meta_data,'{}'::jsonb),'{source}',target->'citation',true)
        where id = spell_row.id and meta_data is not distinct from spell_row.meta_data;
      get diagnostics changed_rows = row_count;
      if changed_rows <> 1 then raise exception 'Item spell changed during citation repair'; end if;
    end if;
  end loop;

  for patch in select value from jsonb_array_elements(patches) order by (value->>'id')::bigint loop
    select * into item_row from public.item where id = (patch->>'id')::bigint for update;
    if not found or item_row.name is distinct from patch->>'name'
      or item_row.uuid is distinct from (patch->>'uuid')::bigint
      or item_row.content_source_id is distinct from (patch->>'source')::bigint
      or item_row.level is distinct from (patch->>'level')::integer then
      raise exception 'Missing or changed Treasure Vault item: %', patch->>'name';
    end if;
    if exists (select 1 from public.content_update where type = 'item'
      and ref_id = item_row.id and status->>'state' = 'PENDING') then
      raise exception 'Item has a pending curator submission: %', patch->>'name';
    end if;
    select array_agg(value order by ordinality) into field_path
      from jsonb_array_elements_text(patch->'path') with ordinality;
    if (patch->>'id')::bigint in (11726,11832) then
      rune_identity := case (patch->>'id')::bigint
        when 11726 then '{"id":7052,"name":"Invisibility","source":7,"level":8,"uuid":1312161067029585}'::jsonb
        else '{"id":7040,"name":"Holy","source":7,"level":11}'::jsonb end;
      if item_row.meta_data #> '{runes,property,0,id}' is distinct from rune_identity->'id'
        or item_row.meta_data #> '{runes,property,0,name}' is distinct from rune_identity->'name'
        or item_row.meta_data #> '{runes,property,0,rune,id}' is distinct from rune_identity->'id'
        or item_row.meta_data #> '{runes,property,0,rune,name}' is distinct from rune_identity->'name'
        or item_row.meta_data #> '{runes,property,0,rune,content_source_id}' is distinct from rune_identity->'source'
        or item_row.meta_data #> '{runes,property,0,rune,level}' is distinct from rune_identity->'level'
        or (rune_identity ? 'uuid' and
          item_row.meta_data #> '{runes,property,0,rune,uuid}' is distinct from rune_identity->'uuid') then
        raise exception 'Embedded rune differs from reviewed entry: %', patch->>'name';
      end if;
    end if;
    before_text := to_jsonb(item_row) #>> field_path;
    if md5(before_text) = patch->>'after' then continue; end if;
    if md5(before_text) is distinct from patch->>'before' then
      raise exception 'Item text differs from reviewed entry: %', patch->>'name';
    end if;
    corrected := before_text;
    for replacement in select value from jsonb_array_elements(patch->'replacements') loop
      if replacement->>'from' = '' or
        (length(corrected)-length(replace(corrected,replacement->>'from',''))) /
          length(replacement->>'from') <> (replacement->>'count')::integer then
        raise exception 'Changed item text fragment: %', patch->>'name';
      end if;
      corrected := replace(corrected,replacement->>'from',replacement->>'to');
    end loop;
    if md5(corrected) is distinct from patch->>'after' then
      raise exception 'Item text did not match reviewed result: %', patch->>'name';
    end if;
    if field_path = array['description']::text[] then
      update public.item set description = corrected
        where id = item_row.id and description is not distinct from item_row.description;
    elsif field_path = array['meta_data','runes','property','0','rune','description']::text[] then
      update public.item set meta_data = jsonb_set(meta_data,field_path[2:],to_jsonb(corrected),false)
        where id = item_row.id and meta_data is not distinct from item_row.meta_data;
    else
      raise exception 'Unsupported item text repair path';
    end if;
    get diagnostics changed_rows = row_count;
    if changed_rows <> 1 then raise exception 'Item changed during text repair'; end if;
  end loop;
end
$repair$;
$historical_original_dual$;
end $historical_dual$;
