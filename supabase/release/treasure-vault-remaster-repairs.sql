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
with reviewed_text(id,uuid,source,level,name,path,after_md5) as (values
  (11726,3907058889255350,16,12,'Autumn''s Embrace',array['meta_data','runes','property','0','rune','description']::text[],'158effecebd19a5f581682e0a37fc8a5'),
  (11792,6175930232896427,16,12,'Boreal Staff (Greater)',array['description']::text[],'f9c2513927de51e404fd9cc8a2e4e13a'),
  (11793,4506258948304121,16,17,'Boreal Staff (Major)',array['description']::text[],'c2d4f43ab199f912ffd3dc4f1312cca0'),
  (11794,5491540430241772,16,8,'Boreal Staff',array['description']::text[],'22342d7f0064fc6dd3de842d528d394e'),
  (11813,7176713891897482,16,11,'Brightbloom Posy (Greater)',array['description']::text[],'af0697ad2c4f208ddadbfd7fc66ef0c5'),
  (11814,4345449524746383,16,19,'Brightbloom Posy (Major)',array['description']::text[],'a91aebf48b743a57e7b97459e651433b'),
  (11832,2628574946957144,16,17,'Celestial Staff',array['meta_data','runes','property','0','rune','description']::text[],'b5ab4f39f567f484fbe6c9f89cf79caf'),
  (12029,7778701163006202,16,4,'Fury Cocktail (Lesser)',array['description']::text[],'85757a654e1fc86a7ee9f8835676ef11'),
  (12030,8693870649637461,16,12,'Fury Cocktail (Moderate)',array['description']::text[],'cd50822094cdfb406dcb09792ee029ff'),
  (7052,1312161067029585,7,8,'Invisibility',array['description']::text[],'158effecebd19a5f581682e0a37fc8a5')
), reviewed_fields(id,uuid,source,level,name,path,after_value) as (values
  (11925,4024487092735678,16,6,'Devil''s Bargain',array['traits']::text[],'[1527,1504,1846]'::jsonb),
  (12410,8304668112940097,16,3,'Skinsaw Mask',array['traits']::text[],'[1475,1846,1527]'::jsonb),
  (12000,7955748466843685,16,13,'Faerie Queen''s Bower',array['traits']::text[],'[1475,1630,1613,2860,1527]'::jsonb),
  (12000,7955748466843685,16,13,'Faerie Queen''s Bower',array['group']::text[],'"ARMOR"'::jsonb),
  (12605,4359396407182879,16,8,'Wand of Dazzling Rays (3rd-level)',array['traits']::text[],'[1542,1630,1517,1504,1665]'::jsonb),
  (12606,8159873792877881,16,10,'Wand of Dazzling Rays (4th-level)',array['traits']::text[],'[1542,1630,1517,1504,1665]'::jsonb),
  (12607,4782914278264481,16,12,'Wand of Dazzling Rays (5th-level)',array['traits']::text[],'[1542,1630,1517,1504,1665]'::jsonb),
  (12608,3471522184663324,16,14,'Wand of Dazzling Rays (6th-level)',array['traits']::text[],'[1542,1630,1517,1504,1665]'::jsonb),
  (12609,7118490375639855,16,16,'Wand of Dazzling Rays (7th-level)',array['traits']::text[],'[1542,1630,1517,1504,1665]'::jsonb),
  (12610,5538114626025655,16,18,'Wand of Dazzling Rays (8th-level)',array['traits']::text[],'[1542,1630,1517,1504,1665]'::jsonb),
  (12611,4716862529480946,16,20,'Wand of Dazzling Rays (9th-level)',array['traits']::text[],'[1542,1630,1517,1504,1665]'::jsonb),
  (12147,693254247930899,16,0,'Leaf Weave',array['group']::text[],'"ARMOR"'::jsonb),
  (12175,6903624769179576,16,5,'Living Leaf Weave',array['group']::text[],'"ARMOR"'::jsonb),
  (12399,1582869616288572,16,14,'Shared-Pain Sankeit',array['group']::text[],'"ARMOR"'::jsonb),
  (12399,1582869616288572,16,14,'Shared-Pain Sankeit',array['meta_data','runes','potency']::text[],'2'::jsonb),
  (12732,6932044382521709,16,0,'Wooden Breastplate',array['group']::text[],'"ARMOR"'::jsonb)
)
select 'treasure-vault-item-references'::text as id,
  (select count(*) = 10 and bool_and((
    i.uuid=r.uuid and i.content_source_id=r.source and i.level=r.level and i.name=r.name
    and md5(to_jsonb(i)#>>r.path)=r.after_md5) is true)
    from reviewed_text r join public.item i on i.id=r.id)
  and exists (select 1 from public.spell where id=8867 and name='Elemental Absorption'
    and uuid=5013391004281276 and rank=3 and content_source_id=842
    and to_jsonb(traditions)='["arcane","primal"]'::jsonb
    and meta_data->'source'='{"book":"Impossible Magic","page":"135","url":"https://2e.aonprd.com/Spells.aspx?ID=2688"}'::jsonb)
  and exists (select 1 from public.spell where id=8999 and name='Petal Storm'
    and uuid=6425751270917234 and rank=4 and content_source_id=842
    and to_jsonb(traditions)='["primal"]'::jsonb
    and meta_data->'source'='{"book":"Impossible Magic","page":"156","url":"https://2e.aonprd.com/Spells.aspx?ID=2786"}'::jsonb)
  and exists (select 1 from public.item where id=11726
    and meta_data #> '{runes,property,0,id}'='7052'::jsonb
    and meta_data #> '{runes,property,0,name}'='"Invisibility"'::jsonb
    and meta_data #> '{runes,property,0,rune,id}'='7052'::jsonb
    and meta_data #> '{runes,property,0,rune,name}'='"Invisibility"'::jsonb
    and meta_data #> '{runes,property,0,rune,content_source_id}'='7'::jsonb
    and meta_data #> '{runes,property,0,rune,level}'='8'::jsonb
    and meta_data #> '{runes,property,0,rune,uuid}'='1312161067029585'::jsonb)
  and exists (select 1 from public.item where id=11832
    and meta_data #> '{runes,property,0,id}'='7040'::jsonb
    and meta_data #> '{runes,property,0,name}'='"Holy"'::jsonb
    and meta_data #> '{runes,property,0,rune,id}'='7040'::jsonb
    and meta_data #> '{runes,property,0,rune,name}'='"Holy"'::jsonb
    and meta_data #> '{runes,property,0,rune,content_source_id}'='7'::jsonb
    and meta_data #> '{runes,property,0,rune,level}'='11'::jsonb) as passed
union all
select 'treasure-vault-equipment-fields'::text as id,
  (select count(*) = 16 and bool_and((
    i.uuid=r.uuid and i.content_source_id=r.source and i.level=r.level and i.name=r.name
    and to_jsonb(i)#>r.path=r.after_value) is true)
    from reviewed_fields r join public.item i on i.id=r.id) as passed
)
select original_checks.id,case when coalesce((status.value->>'recognized')::boolean,true) then coalesce((status.value->>'passed')::boolean,false) else original_checks.passed end as passed from original_checks cross join terminal_status status;
