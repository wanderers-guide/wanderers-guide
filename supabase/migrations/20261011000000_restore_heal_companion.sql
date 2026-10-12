-- Restore only the exact deprecated native identity used by saved selections.
-- Recover the original deprecated ID for saved selections. No editorial content changes.
-- Self-contained transaction for the ordinary migration/bootstrap path.
begin;
set local statement_timeout='20000ms';
set local lock_timeout='3000ms';
lock table public.ability_block,public.content_update in share row exclusive mode;
select id from public.content_source where id in(1,11,14) order by id for share;
select id from public.trait where id=1344 for share;
select id from public.spell where id=4977 for share;
do $restore_heal_companion$
declare
 v_expected constant jsonb := $heal_recovery_spec${"row":{"id":22108,"created_at":"2024-04-20T06:32:51.706592+00:00","operations":[{"id":"8e91d541-cacb-46ed-820a-b2a1b5538f42","data":{"type":"FOCUS","spellId":4977,"castingSource":"RANGER"},"type":"giveSpell"},{"id":"4a5700ba-b678-53b5-8e4e-4a8fb9dbde93","data":{"value":"RANGER:::-:::PRIMAL:::ATTRIBUTE_WIS","variable":"CASTING_SOURCES"},"type":"defineCastingSource"},{"id":"04695e45-7d66-5e7c-b684-42d7e9f3f8d0","data":{"value":{"value":"T"},"variable":"SPELL_ATTACK"},"type":"adjValue"},{"id":"3526be96-f368-5466-8979-6aaa9f910d38","data":{"value":{"value":"T"},"variable":"SPELL_DC"},"type":"adjValue"},{"id":"2fc7cf29-1ae4-5810-9638-26c22494a5e8","data":{"value":"spells","variable":"PRIMARY_SHEET_TABS"},"type":"adjValue"}],"name":"Heal Companion","actions":null,"level":1,"rarity":"COMMON","prerequisites":["an animal companion"],"frequency":null,"cost":null,"trigger":null,"requirements":null,"access":null,"description":"You have a deep devotion to your animal companion that enables you to magically heal their wounds. You gain the [Heal Companion](link_spell_4977) warden spell and a focus pool of 1 Focus Point.","special":null,"type":"feat","meta_data":{"source":{"url":"https://2e.aonprd.com/Feats.aspx?ID=1764","book":"Advanced Player's Guide","page":"132"},"foundry":{"rules":[]},"deprecated":true},"traits":[1344],"content_source_id":14,"version":null,"uuid":7476666523704164,"availability":null},"sources":[{"id":1,"name":"Player Core","group":"pathfinder-core","user_id":null,"deprecated":null,"require_key":false,"is_published":true,"required_content_sources":[]},{"id":11,"name":"Core Rulebook","group":"legacy","user_id":null,"deprecated":null,"require_key":false,"is_published":true,"required_content_sources":[]},{"id":14,"name":"Advanced Player's Guide (in progress)","group":"legacy","user_id":null,"deprecated":null,"require_key":false,"is_published":true,"required_content_sources":[11]}],"dependencies":[{"table":"trait","row":{"id":1344,"name":"Ranger","uuid":4013391771147273,"content_source_id":1}},{"table":"spell","row":{"id":4977,"name":"Heal Companion","rank":1,"content_source_id":1}}]}$heal_recovery_spec$::jsonb;
 v_actual jsonb;
 v_alias_count integer;
 v_sequence regclass;
 v_sequence_before jsonb;
 v_sequence_after jsonb;
begin
 if not (with settings as(select v_expected as spec) select count(*)=3 and coalesce(bool_and(jsonb_build_object('id',r.id,'name',r.name,'user_id',r.user_id,'deprecated',r.deprecated,'is_published',r.is_published,'require_key',r.require_key,'required_content_sources',r.required_content_sources,'group',r."group")=p),false)
from settings s cross join lateral jsonb_array_elements(s.spec->'sources') p left join public.content_source r on r.id=(p->>'id')::bigint) then raise exception 'Heal Companion source dependencies changed'; end if;
 if not (with settings as(select v_expected as spec) select exists(select 1 from public.trait t where jsonb_build_object('id',t.id,'name',t.name,'uuid',t.uuid,'content_source_id',t.content_source_id)=(select p->'row' from settings s cross join lateral jsonb_array_elements(s.spec->'dependencies') p where p->>'table'='trait'))
 and exists(select 1 from public.spell t where jsonb_build_object('id',t.id,'name',t.name,'rank',t.rank,'content_source_id',t.content_source_id)=(select p->'row' from settings s cross join lateral jsonb_array_elements(s.spec->'dependencies') p where p->>'table'='spell'))) then raise exception 'Heal Companion spell or trait dependencies changed'; end if;
 if exists(with settings as(select v_expected as spec) select u.id,u.type,u.ref_id,u.content_source_id,u.data->>'name' as name,u.status->>'state' as state
from public.content_update u cross join settings s
where upper(pg_catalog.regexp_replace(coalesce(u.status->>'state',''),'^[[:space:]]+|[[:space:]]+$','','g')) not in('APPROVED','REJECTED') and (
 (replace(lower(pg_catalog.regexp_replace(coalesce(u.type,''),'^[[:space:]]+|[[:space:]]+$','','g')),'_','-') in('ability-block','feat') and (
   u.ref_id=22108 or pg_catalog.regexp_replace(coalesce(u.data->>'id',''),'^[[:space:]]+|[[:space:]]+$','','g')='22108'
   or pg_catalog.regexp_replace(coalesce(u.data->>'uuid',''),'^[[:space:]]+|[[:space:]]+$','','g')='7476666523704164'
   or (lower(pg_catalog.regexp_replace(coalesce(u.data->>'name',''),'^[[:space:]]+|[[:space:]]+$','','g'))='heal companion' and
     (u.content_source_id=14 or exists(select 1 from jsonb_array_elements(jsonb_build_array(u.data->>'content_source_id',u.data->>'source_id',u.data#>>'{source,content_source_id}',u.data#>>'{source,source_id}',u.data#>>'{source,id}',u.data#>>'{meta_data,content_source_id}',u.data#>>'{meta_data,source,content_source_id}',u.data#>>'{meta_data,source,source_id}')) x where pg_catalog.regexp_replace(coalesce(x#>>'{}',''),'^[[:space:]]+|[[:space:]]+$','','g')='14')))
   or lower(pg_catalog.regexp_replace(coalesce(u.data#>>'{meta_data,source,url}',''),'^[[:space:]]+|[[:space:]]+$','','g'))='https://2e.aonprd.com/feats.aspx?id=1764'))
 or exists(select 1 from jsonb_array_elements(s.spec->'dependencies') p where replace(lower(pg_catalog.regexp_replace(coalesce(u.type,''),'^[[:space:]]+|[[:space:]]+$','','g')),'_','-')=p->>'table' and
   (u.ref_id=(p#>>'{row,id}')::bigint or pg_catalog.regexp_replace(coalesce(u.data->>'id',''),'^[[:space:]]+|[[:space:]]+$','','g')=p#>>'{row,id}'
    or pg_catalog.regexp_replace(coalesce(u.data->>'uuid',''),'^[[:space:]]+|[[:space:]]+$','','g')=p#>>'{row,uuid}'
    or (lower(pg_catalog.regexp_replace(coalesce(u.data->>'name',''),'^[[:space:]]+|[[:space:]]+$','','g'))=lower(pg_catalog.regexp_replace(coalesce(p#>>'{row,name}',''),'^[[:space:]]+|[[:space:]]+$','','g')) and
      (u.content_source_id=(p#>>'{row,content_source_id}')::bigint or exists(select 1 from jsonb_array_elements(jsonb_build_array(u.data->>'content_source_id',u.data->>'source_id',u.data#>>'{source,content_source_id}',u.data#>>'{source,source_id}',u.data#>>'{source,id}',u.data#>>'{meta_data,content_source_id}',u.data#>>'{meta_data,source,content_source_id}',u.data#>>'{meta_data,source,source_id}')) x where pg_catalog.regexp_replace(coalesce(x#>>'{}',''),'^[[:space:]]+|[[:space:]]+$','','g')=p#>>'{row,content_source_id}')))))
 or (replace(lower(pg_catalog.regexp_replace(coalesce(u.type,''),'^[[:space:]]+|[[:space:]]+$','','g')),'_','-')='content-source' and exists(select 1 from jsonb_array_elements(s.spec->'sources') p where
   u.ref_id=(p->>'id')::bigint or pg_catalog.regexp_replace(coalesce(u.data->>'id',''),'^[[:space:]]+|[[:space:]]+$','','g')=p->>'id' or lower(pg_catalog.regexp_replace(coalesce(u.data->>'name',''),'^[[:space:]]+|[[:space:]]+$','','g'))=lower(pg_catalog.regexp_replace(coalesce(p->>'name',''),'^[[:space:]]+|[[:space:]]+$','','g')))))) then raise exception 'Heal Companion recovery has a pending curator dependency'; end if;
 select count(*) into v_alias_count from (select a.id,a.uuid,a.name,a.content_source_id from public.ability_block a
where a.id=22108 or a.uuid=7476666523704164
  or (a.content_source_id=14 and lower(pg_catalog.regexp_replace(coalesce(a.name,''),'^[[:space:]]+|[[:space:]]+$','','g'))='heal companion')
  or lower(pg_catalog.regexp_replace(coalesce(a.meta_data#>>'{source,url}',''),'^[[:space:]]+|[[:space:]]+$','','g'))='https://2e.aonprd.com/feats.aspx?id=1764') a;
 select to_jsonb(a)-'updated_at'-'search_tsv' into v_actual from public.ability_block a where id=22108;
 if v_actual=v_expected->'row' and v_alias_count=1 then return; end if;
 if v_actual is not null or v_alias_count<>0 then raise exception 'Heal Companion recovery identity is no longer absent'; end if;
 if not exists(select 1 from pg_catalog.pg_trigger t
    where t.tgrelid='public.ability_block'::regclass
      and t.tgname='ability_block_bump_source_updated_at'
      and t.tgfoid=pg_catalog.to_regprocedure('public.bump_content_source_updated_at()')
      and t.tgenabled='O' and t.tgtype=29 and not t.tgisinternal
      and t.tgqual is null and t.tgnargs=0) then raise exception 'Heal Companion recovery cache trigger changed'; end if;
 v_sequence:=pg_catalog.pg_get_serial_sequence('public.ability_block','id')::regclass;
 if v_sequence is null then raise exception 'Heal Companion recovery identity sequence is missing'; end if;
 execute pg_catalog.format('select jsonb_build_object(''last_value'',last_value::text,''is_called'',is_called) from %s',v_sequence) into v_sequence_before;
 insert into public.ability_block("id","created_at","operations","name","actions","level","rarity","prerequisites","frequency","cost","trigger","requirements","access","description","special","type","meta_data","traits","content_source_id","version","uuid","availability")
 select r."id",r."created_at",r."operations",r."name",r."actions",r."level",r."rarity",r."prerequisites",r."frequency",r."cost",r."trigger",r."requirements",r."access",r."description",r."special",r."type",r."meta_data",r."traits",r."content_source_id",r."version",r."uuid",r."availability" from jsonb_populate_record(null::public.ability_block,v_expected->'row') r;
 select to_jsonb(a)-'updated_at'-'search_tsv' into strict v_actual from public.ability_block a where id=22108;
 if v_actual is distinct from v_expected->'row' then raise exception 'Heal Companion recovery readback differs'; end if;
 if (select count(*) from (select a.id,a.uuid,a.name,a.content_source_id from public.ability_block a
where a.id=22108 or a.uuid=7476666523704164
  or (a.content_source_id=14 and lower(pg_catalog.regexp_replace(coalesce(a.name,''),'^[[:space:]]+|[[:space:]]+$','','g'))='heal companion')
  or lower(pg_catalog.regexp_replace(coalesce(a.meta_data#>>'{source,url}',''),'^[[:space:]]+|[[:space:]]+$','','g'))='https://2e.aonprd.com/feats.aspx?id=1764') a)<>1 then raise exception 'Heal Companion recovery duplicate identity'; end if;
 if not exists(select 1 from public.content_source where id=14 and updated_at=pg_catalog.transaction_timestamp()) then
   raise exception 'Heal Companion recovery cache token did not refresh';
 end if;
 execute pg_catalog.format('select jsonb_build_object(''last_value'',last_value::text,''is_called'',is_called) from %s',v_sequence) into v_sequence_after;
 if v_sequence_after is distinct from v_sequence_before then raise exception 'Heal Companion recovery identity sequence changed'; end if;
end $restore_heal_companion$;
commit;
