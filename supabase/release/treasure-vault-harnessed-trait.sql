-- Verify the two reviewed Harnessed leaves and the intended official link targets.
with repair_spec as (
  select $harnessed$
{
  "id": 2886,
  "name": "Harnessed",
  "uuid": 6134123836252393,
  "content_source_id": 16,
  "description_before": "",
  "description_after": "This shield features a special brace or opening designed to hold lances or other [jousting](link_trait_2748) weapons. Jousters often use these shields as a backup in narrow passages and other places where they're unable to ride a mount. You can [Interact](link_action_19733) to lock a weapon with the [jousting](link_trait_2748) trait in place in the shield, enabling you to use two hands to wield the shield and weapon simultaneously. If you're not wielding the combined unit with both hands, you can use neither the weapon nor the shield.\n\nWhile you have the shield [raised](link_action_19750), you can gain the [jousting](link_trait_2748) benefit of a weapon as if you were mounted. Because a significant portion of the weapon needs to be braced behind the shield, the weapon's reach is reduced by 5 feet if it is greater than 5 feet.",
  "source_before": {
    "url": "https://2e.aonprd.com/Traits.aspx?ID=930",
    "book": "Treasure Vault",
    "page": "219"
  },
  "source_after": {
    "url": "https://2e.aonprd.com/Traits.aspx?ID=477",
    "book": "Treasure Vault (Remastered)",
    "page": "219"
  },
  "dependencies": [
    {
      "table": "trait",
      "id": 2748,
      "name": "Jousting",
      "uuid": 438922509591800,
      "content_source_id": 3,
      "citation": {
        "url": "https://2e.aonprd.com/Traits.aspx?ID=638",
        "book": "Player Core",
        "page": "282"
      }
    },
    {
      "table": "ability-block",
      "id": 19733,
      "name": "Interact",
      "uuid": 3402914292668269,
      "content_source_id": 3,
      "type": "action"
    },
    {
      "table": "ability-block",
      "id": 19750,
      "name": "Raise a Shield",
      "uuid": 1182629222392591,
      "content_source_id": 3,
      "type": "action",
      "citation": {
        "url": "https://2e.aonprd.com/Actions.aspx?ID=2316",
        "book": "Player Core",
        "page": "419"
      }
    }
  ]
}
  $harnessed$::jsonb as value
), dependency_spec as (
  select value from jsonb_array_elements((select value->'dependencies' from repair_spec))
), dependency_actual as (
  select 'trait'::text as table_name, to_jsonb(t) as row from public.trait t
    where t.id in (select (value->>'id')::bigint from dependency_spec where value->>'table' = 'trait')
  union all
  select 'ability-block', to_jsonb(a) from public.ability_block a
    where a.id in (select (value->>'id')::bigint from dependency_spec where value->>'table' = 'ability-block')
)
select 'treasure-vault-harnessed-trait'::text as id,
  coalesce((select t.name = s.value->>'name'
    and t.uuid = (s.value->>'uuid')::bigint
    and t.content_source_id = (s.value->>'content_source_id')::bigint
    and t.description = s.value->>'description_after'
    and t.meta_data->'source' = s.value->'source_after'
    from repair_spec s left join public.trait t on t.id = (s.value->>'id')::bigint), false) as passed
union all
select 'treasure-vault-harnessed-links',
  (select count(*) = 2 from public.content_source where id in (3,16)
    and user_id is null and is_published is true and (id <> 16 or name = 'Treasure Vault'))
  and coalesce((select count(*) = 3 and bool_and((
    a.row is not null and not exists (
      select 1 from jsonb_each(d.value - 'table' - 'citation') property
        where a.row->property.key is distinct from property.value
    ) and (not (d.value ? 'citation') or a.row #> '{meta_data,source}' = d.value->'citation')
  ) is true)
  from dependency_spec d left join dependency_actual a
    on a.table_name = d.value->>'table' and a.row->>'id' = d.value->>'id'), false);
