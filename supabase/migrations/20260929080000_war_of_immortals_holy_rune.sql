do $repair$
declare
  weapon public.item%rowtype;
  holy public.item%rowtype;
  property_runes jsonb;
  expected jsonb;
begin
  select * into weapon from public.item where id = 17101 for update;
  if not found or weapon.name is distinct from 'Freedom''s Flame'
     or weapon.content_source_id is distinct from 400 or weapon.level is distinct from 21
     or weapon."group" is distinct from 'WEAPON'
     or weapon.meta_data #>> '{source,url}' is distinct from 'https://2e.aonprd.com/Equipment.aspx?ID=3509'
     or weapon.meta_data #>> '{runes,potency}' is distinct from '4'
     or weapon.meta_data #>> '{runes,striking}' is distinct from '3' then
    raise exception 'Missing or changed Freedom''s Flame';
  end if;

  select * into holy from public.item where id = 7040;
  if not found or holy.name is distinct from 'Holy' or holy.content_source_id is distinct from 7
     or holy."group" is distinct from 'RUNE' or holy.level is distinct from 11
     or holy.meta_data #>> '{source,url}' is distinct from 'https://2e.aonprd.com/Equipment.aspx?ID=2842'
     or to_jsonb(holy.traits) is distinct from '[1504,1630]'::jsonb
     or holy.meta_data::jsonb #> '{damage}' is distinct from
       '{"die":"d4","dice":1,"extra":"","damageType":"spirit"}'::jsonb
     or holy.operations is not null then
    raise exception 'Missing or changed GM Core Holy rune';
  end if;

  if holy.description like '%[**Holy Healing**](link_spell_3371)%' then
    if exists (select 1 from public.content_update
      where type = 'item' and ref_id = holy.id and status->>'state' = 'PENDING') then
      raise exception 'Holy rune has a pending curator submission';
    end if;
    holy.description := replace(holy.description, '[**Holy Healing**](link_spell_3371)', '**Holy Healing**');
    update public.item set description = holy.description where id = holy.id;
  elsif holy.description not like '%**Holy Healing**%'
     or holy.description like '%link_spell_3371%' then
    raise exception 'Changed Holy Healing activation';
  end if;

  expected := jsonb_build_array(jsonb_build_object(
    'id', holy.id,
    'name', holy.name,
    'rune', to_jsonb(holy) - 'updated_at' - 'search_tsv'
  ));
  property_runes := weapon.meta_data::jsonb #> '{runes,property}';
  if property_runes = expected then return; end if;
  if property_runes is distinct from '[]'::jsonb then
    raise exception 'Changed Freedom''s Flame property runes';
  end if;
  if exists (select 1 from public.content_update
    where type = 'item' and ref_id = weapon.id and status->>'state' = 'PENDING') then
    raise exception 'Freedom''s Flame has a pending curator submission';
  end if;
  update public.item
     set meta_data = jsonb_set(weapon.meta_data::jsonb, '{runes,property}', expected, false)::json
   where id = weapon.id;
end
$repair$;
