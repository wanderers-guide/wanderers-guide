-- Deprecate the legacy ranger feat while preserving its grant for saved selections.
-- Advanced Player's Guide p. 132: https://2e.aonprd.com/Feats.aspx?ID=1764
-- Uses the current Heal Companion spell, as other legacy grants use remastered spell IDs.
do $repair$
declare
  patch constant jsonb := $patches$
{
  "id": 22108,
  "name": "Heal Companion",
  "source": 14,
  "before": {
    "operations": null,
    "description": "You have a deep devotion to your animal companion that enables you to magically heal their wounds. You gain the \\[\\[Heal Companion\\]\\] warden spell and a focus pool of 1 Focus Point."
  },
  "after": {
    "operations": [
      {
        "id": "8e91d541-cacb-46ed-820a-b2a1b5538f42",
        "type": "giveSpell",
        "data": {
          "spellId": 4977,
          "type": "FOCUS",
          "castingSource": "RANGER"
        }
      },
      {
        "id": "4a5700ba-b678-53b5-8e4e-4a8fb9dbde93",
        "data": {
          "value": "RANGER:::-:::PRIMAL:::ATTRIBUTE_WIS",
          "variable": "CASTING_SOURCES"
        },
        "type": "defineCastingSource"
      },
      {
        "id": "04695e45-7d66-5e7c-b684-42d7e9f3f8d0",
        "data": {
          "value": {
            "value": "T"
          },
          "variable": "SPELL_ATTACK"
        },
        "type": "adjValue"
      },
      {
        "id": "3526be96-f368-5466-8979-6aaa9f910d38",
        "data": {
          "value": {
            "value": "T"
          },
          "variable": "SPELL_DC"
        },
        "type": "adjValue"
      },
      {
        "id": "2fc7cf29-1ae4-5810-9638-26c22494a5e8",
        "data": {
          "value": "spells",
          "variable": "PRIMARY_SHEET_TABS"
        },
        "type": "adjValue"
      }
    ],
    "description": "You have a deep devotion to your animal companion that enables you to magically heal their wounds. You gain the [Heal Companion](link_spell_4977) warden spell and a focus pool of 1 Focus Point."
  }
}
  $patches$::jsonb;
  original public.ability_block%rowtype;
begin
  select * into original from public.ability_block
    where id = 22108 and name = 'Heal Companion' and content_source_id = 14
    for update;
  if not found then
    raise exception 'Missing or changed legacy Heal Companion feat';
  end if;
  if not exists (select 1 from public.spell
    where id = 4977 and name = 'Heal Companion' and content_source_id = 1 and rank = 1) then
    raise exception 'Missing or changed Heal Companion spell';
  end if;
  if jsonb_build_object('operations', to_jsonb(original.operations), 'description', original.description) = patch->'after'
    and original.meta_data->>'deprecated' = 'true' then
    return;
  end if;
  if jsonb_build_object('operations', to_jsonb(original.operations), 'description', original.description)
    not in (patch->'before', patch->'after') then
    raise exception 'Heal Companion changed; review before repair';
  end if;
  if original.meta_data is not null and jsonb_typeof(original.meta_data::jsonb) <> 'object' then
    raise exception 'Heal Companion metadata changed; review before deprecation';
  end if;
  if exists (select 1 from public.content_update
    where type = 'ability-block' and ref_id = 22108
      and coalesce(status->>'state', 'PENDING') not in ('APPROVED', 'REJECTED')) then
    raise exception 'Heal Companion has a pending curator submission';
  end if;
  update public.ability_block set
    operations = array(select value::json from jsonb_array_elements(patch #> '{after,operations}')),
    description = patch #>> '{after,description}',
    meta_data = jsonb_set(coalesce(original.meta_data::jsonb, '{}'::jsonb), '{deprecated}', 'true'::jsonb)
    where id = original.id;
end
$repair$;
