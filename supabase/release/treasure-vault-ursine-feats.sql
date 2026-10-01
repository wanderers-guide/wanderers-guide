-- Reviewed source-16 additions only. This is not a whole-book mechanics certification.
with feat_spec as (
  select value from jsonb_array_elements($feats$
  [
    {"legacy_url":"https://2e.aonprd.com/Feats.aspx?ID=8953","row":{"cost":"","name":"Call Ursine Ally","type":"feat","uuid":8641661906134255,"level":8,"access":"","rarity":"COMMON","traits":[3351,1454,2134],"actions":null,"special":"","trigger":"","version":"1.0","frequency":"once per hour","meta_data":{"source":{"url":"https://2e.aonprd.com/Feats.aspx?ID=4089","book":"Treasure Vault (Remastered)","page":"184"}},"operations":[],"description":"You can cast a 3rd-rank *[summon animal](link_spell_4866)* as an innate spell, but only to summon a black bear. At 10th level, the *[summon animal](link_spell_4866)* spell is heightened to 4th rank, and you can summon a grizzly bear. At 12th level, your *[summon animal](link_spell_4866)* innate spell is heightened to 5th rank, and you can summon a polar bear. At 14th level, it is heightened to 6th rank, and you can summon a cave bear.","availability":null,"requirements":"","prerequisites":[],"content_source_id":16}},
    {"legacy_url":"https://2e.aonprd.com/Feats.aspx?ID=8954","row":{"cost":"","name":"Bear Empathy","type":"feat","uuid":5152313550250344,"level":10,"access":"","rarity":"COMMON","traits":[3351,1454],"actions":null,"special":"","trigger":"","version":"1.0","frequency":"","meta_data":{"source":{"url":"https://2e.aonprd.com/Feats.aspx?ID=4090","book":"Treasure Vault (Remastered)","page":"184"}},"operations":[],"description":"You have a magical affinity for bears and can speak to them through sounds and body language. You can communicate with all bears, as well as other ursine creatures at the GM's discretion.","availability":null,"requirements":"","prerequisites":[],"content_source_id":16}},
    {"legacy_url":"https://2e.aonprd.com/Feats.aspx?ID=8955","row":{"cost":"","name":"Great Bear","type":"feat","uuid":7134592185110641,"level":12,"access":"","rarity":"COMMON","traits":[3351],"actions":null,"special":"","trigger":"","version":"1.0","frequency":"once per hour","meta_data":{"source":{"url":"https://2e.aonprd.com/Feats.aspx?ID=4091","book":"Treasure Vault (Remastered)","page":"184"}},"operations":[],"description":"When you transform, you can take on a bear's bulk and size. You can spend an additional action when using [Ursine Avenger Form](link_feat_26030) to gain the effects of a 1st-rank *[enlarge](link_spell_4601)* spell, which lasts for the spell's normal duration or until you leave your [Ursine Avenger Form](link_feat_26030), whichever comes first.","availability":null,"requirements":"","prerequisites":["Ursine Avenger Form"],"content_source_id":16}},
    {"legacy_url":"https://2e.aonprd.com/Feats.aspx?ID=8956","row":{"cost":"","name":"Terrible Transformation","type":"feat","uuid":5732112610711193,"level":14,"access":"","rarity":"COMMON","traits":[3351],"actions":null,"special":"","trigger":"","version":"1.0","frequency":"","meta_data":{"source":{"url":"https://2e.aonprd.com/Feats.aspx?ID=4092","book":"Treasure Vault (Remastered)","page":"184"}},"operations":[],"description":"You let out a mighty roar as part of your transformation. When you use [Ursine Avenger Form](link_feat_26030), you can make an Intimidation check to [Demoralize](link_action_19624) against each enemy within 30 feet that can see you, and you don't take a penalty to your [Demoralize](link_action_19624) check if the creature doesn't understand your language.","availability":null,"requirements":"","prerequisites":["Ursine Avenger Form"],"content_source_id":16}},
    {"legacy_url":"https://2e.aonprd.com/Feats.aspx?ID=8957","row":{"cost":"","name":"Fearsome Fangs","type":"feat","uuid":8910251669367082,"level":16,"access":"","rarity":"COMMON","traits":[3351],"actions":null,"special":"","trigger":"","version":"1.0","frequency":"","meta_data":{"source":{"url":"https://2e.aonprd.com/Feats.aspx?ID=4093","book":"Treasure Vault (Remastered)","page":"184"}},"operations":[],"description":"Your claws and jaws are brutally powerful and efficient, even by ursine standards. The base damage of your jaws [unarmed](link_trait_2398) attack from [Ursine Avenger Form](link_feat_26030) increases to 1d12. The base damage of your claws [unarmed](link_trait_2398) attack from [Ursine Avenger Form](link_feat_26030) increases to 1d8.","availability":null,"requirements":"","prerequisites":["Ursine Avenger Form"],"content_source_id":16}},
    {"legacy_url":"https://2e.aonprd.com/Feats.aspx?ID=8958","row":{"cost":"","name":"Mighty Bear","type":"feat","uuid":6633677401327609,"level":18,"access":"","rarity":"COMMON","traits":[3351],"actions":null,"special":"","trigger":"","version":"1.0","frequency":"","meta_data":{"source":{"url":"https://2e.aonprd.com/Feats.aspx?ID=4094","book":"Treasure Vault (Remastered)","page":"184"}},"operations":[],"description":"The power of the bear within you can expand your physical presence even further. The *[enlarge](link_spell_4601)* spell you cast with your [Great Bear](link_feat_%s) feat is heightened to 4th rank.","availability":null,"requirements":"","prerequisites":["Great Bear"],"content_source_id":16}},
    {"legacy_url":"https://2e.aonprd.com/Feats.aspx?ID=8959","row":{"cost":"","name":"Immortal Bear","type":"feat","uuid":6875755095101542,"level":20,"access":"","rarity":"COMMON","traits":[3351],"actions":null,"special":"","trigger":"","version":"1.0","frequency":"","meta_data":{"source":{"url":"https://2e.aonprd.com/Feats.aspx?ID=4095","book":"Treasure Vault (Remastered)","page":"184"}},"operations":[],"description":"Your body thrums with the primal vitality of the greatest of the ursine beasts. When in [Ursine Avenger Form](link_feat_26030), you gain fast healing 5.","availability":null,"requirements":"","prerequisites":["Ursine Avenger Form"],"content_source_id":16}}
  ]
  $feats$::jsonb)
), repair_spec as (
  select value from jsonb_array_elements($repairs$
  [
    {"id":52136,"before":["Ursine Avenger Hood Dedication"],"after":[],"row":{"operations":[],"name":"Senses of the Bear","actions":null,"level":4,"rarity":"COMMON","prerequisites":["Ursine Avenger Hood Dedication"],"frequency":"","cost":"","trigger":"","requirements":"","access":"","description":"While in ursine form, you gain low-light vision and scent (imprecise) 30 feet. If you already had low-light vision, you instead gain darkvision.","special":"","type":"feat","meta_data":{"source":{"url":"https://2e.aonprd.com/Feats.aspx?ID=8951","book":"Treasure Vault","page":"183"}},"traits":[3351],"content_source_id":16,"version":null,"uuid":5747920942476014,"availability":null}},
    {"id":52138,"before":["Ursine Avenger Hood Dedication"],"after":[],"row":{"operations":[],"name":"Bear Hug (Ursine Avenger)","actions":"ONE-ACTION","level":6,"rarity":"COMMON","prerequisites":["Ursine Avenger Hood Dedication"],"frequency":"","cost":"","trigger":"","requirements":"Your last action was a successful claw Strike","access":"","description":"You snatch at your opponent with your claws, pulling them close in a ferocious bear hug. You make another claw Strike against the same target. If this Strike hits, the target is also grabbed.","special":"","type":"feat","meta_data":{"source":{"url":"https://2e.aonprd.com/Feats.aspx?ID=8952","book":"Treasure Vault","page":"183"}},"traits":[3351],"content_source_id":16,"version":null,"uuid":799648305223526,"availability":null}}
  ]
  $repairs$::jsonb)
), dependency_spec as (
  select value from jsonb_array_elements($dependencies$
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
  $dependencies$::jsonb)
), great_bear as (
  select max(id) as id from public.ability_block
    where uuid = 7134592185110641 and content_source_id = 16 and type = 'feat' and id > 0
), expected as (
  select case when f.value->'row'->>'name' = 'Mighty Bear'
    then jsonb_set(f.value->'row', '{description}',
      to_jsonb(format(f.value->'row'->>'description', great_bear.id)), false)
    else f.value->'row' end as row
  from feat_spec f cross join great_bear
), dependency_actual as (
  select 'trait'::text as table_name, to_jsonb(t) as row from public.trait t
    where t.id in (select (value->>'id')::bigint from dependency_spec where value->>'table' = 'trait')
  union all select 'ability-block', to_jsonb(a) from public.ability_block a
    where a.id in (select (value->>'id')::bigint from dependency_spec where value->>'table' = 'ability-block')
  union all select 'archetype', to_jsonb(a) from public.archetype a
    where a.id in (select (value->>'id')::bigint from dependency_spec where value->>'table' = 'archetype')
  union all select 'item', to_jsonb(i) from public.item i
    where i.id in (select (value->>'id')::bigint from dependency_spec where value->>'table' = 'item')
  union all select 'spell', to_jsonb(s) from public.spell s
    where s.id in (select (value->>'id')::bigint from dependency_spec where value->>'table' = 'spell')
)
select 'treasure-vault-ursine-feats'::text as id,
  coalesce((select count(*) = 7 and bool_and((
    a.id > 0 and to_jsonb(a) - '{id,created_at,updated_at,search_tsv}'::text[] = e.row
  ) is true)
  from expected e left join public.ability_block a
    on a.uuid = (e.row->>'uuid')::bigint and a.content_source_id = 16), false) as passed
union all
select 'treasure-vault-ursine-prerequisites',
  coalesce((select count(*) = 2 and bool_and((
    to_jsonb(a) - '{id,created_at,updated_at,search_tsv,prerequisites}'::text[]
      = ((p.value->'row') - 'prerequisites')
    and to_jsonb(a.prerequisites) = p.value->'after'
  ) is true)
  from repair_spec p left join public.ability_block a on a.id = (p.value->>'id')::bigint), false)
union all
select 'treasure-vault-ursine-scaffolds',
  (select count(*) = 2 from public.content_source where id in (3,16)
    and user_id is null and is_published is true and (id <> 16 or name = 'Treasure Vault'))
  and coalesce((select count(*) = 15 and bool_and((
    a.row is not null and not exists (
      select 1 from jsonb_each(d.value - 'table') property
        where a.row->property.key is distinct from property.value
    )
  ) is true) from dependency_spec d left join dependency_actual a
    on a.table_name = d.value->>'table' and a.row->>'id' = d.value->>'id'), false)
union all
select 'treasure-vault-ursine-feat-count',
  coalesce((select meta_data::jsonb #> '{counts,feat}' = to_jsonb(
    (select count(*) from public.ability_block where content_source_id = 16 and type = 'feat'))
  from public.content_source where id = 16), false);
