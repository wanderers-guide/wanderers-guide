with noisome as (select $noisome${
  "id": 12659,
  "rank": 4,
  "expected": {
    "id": 12659,
    "name": "Wand of Noisome Acid (4th-Level Spell)",
    "uuid": "7611411327409832",
    "content_source_id": 16,
    "level": 10,
    "price": {
      "gp": 1000
    },
    "bulk": "0.1",
    "usage": "held-in-one-hand",
    "group": "GENERAL",
    "rarity": "UNCOMMON",
    "size": "MEDIUM",
    "hands": null,
    "traits": [
      1528,
      1504,
      1665
    ],
    "availability": null,
    "operations": null,
    "version": "1.0"
  },
  "metadata_absent": [
    "deprecated",
    "unselectable",
    "focus",
    "type",
    "ritual"
  ],
  "raw": {
    "description": "This greasy stick emits a stomach-churning scent when held in a hand.\n\n**Activate** \\[\\[Cast a Spell\\]\\]\n\n**Effect** You cast \\[\\[Acid Arrow\\]\\] at 4th rank.A creature that takes initial acid damage from this spell become \\[\\[Sickened\\]\\]{Sickened 1}. Use your spell DC if the creatures attempts to recover from this sickness. This is an olfactory effect.",
    "craft_requirements": "Supply a casting of Acid Arrow at 4th rank.",
    "source": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4818",
      "book": "Treasure Vault",
      "page": "141"
    }
  },
  "before": {
    "description": "This greasy stick emits a stomach-churning scent when held in a hand.\n\n**Activate** \\[\\[Cast a Spell\\]\\]\n\n**Effect** You cast \\[\\[Acid Arrow\\]\\] at 4th rank.A creature that takes initial acid damage from this spell become sickened 1. Use your spell DC if the creatures attempts to recover from this sickness. This is an olfactory effect.",
    "craft_requirements": "Supply a casting of Acid Arrow at 4th rank.",
    "source": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4818",
      "book": "Treasure Vault",
      "page": "141"
    }
  },
  "after": {
    "description": "This greasy stick emits a stomach-churning scent when held in a hand.\n\n**Activate** [Cast a Spell](link_action_19611); **Frequency** once per day, plus overcharge\n\n**Effect** You cast 4th-rank *[acid grip](link_spell_4389)*. A creature that takes initial [acid](link_trait_1528) damage from this spell become sickened 1. Use your spell DC if the creature attempts to recover from this sickness. This is an [olfactory](link_trait_2131) effect.",
    "craft_requirements": "Supply a casting of *[acid grip](link_spell_4389)* of the appropriate rank.",
    "source": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=2284",
      "book": "Treasure Vault (Remastered)",
      "page": "141"
    }
  },
  "hashes": {
    "description": {
      "raw": "2e81ce88d96bae4f45fc2b1bde9c3055",
      "before": "5fa726a9ae0630c282adb21fb7cd94cf",
      "after": "1f256d29afabfb68e3d56ed478c5c61d"
    },
    "craft_requirements": {
      "raw": "2d7cb96abe09ffe43144a8d4f159f25d",
      "before": "2d7cb96abe09ffe43144a8d4f159f25d",
      "after": "ac1308c588ba266aa09b4ef3f6c8dc22"
    }
  }
}$noisome$::jsonb as patch),
expected(id, uuid, source, level, price, name_md5, description_md5, craft_md5, citation) as (values
  (12659,7611411327409832,16,10,'{"gp":1000}'::jsonb,'88b6dd943f307847b7e90c7f675d5ef0',null::text,null::text,
    '{"url":"https://2e.aonprd.com/Equipment.aspx?ID=4818","book":"Treasure Vault","page":"141"}'::jsonb),
  (12675,2336719364145203,16,11,'{"gp":1400}'::jsonb,'20a6294d280a4b7dfaf05520ad57ce5d',
    '020252709e385f23c384ac83dc262bb5','e91875990c04ecd9cf6437cd0c75677f',
    '{"url":"https://2e.aonprd.com/Equipment.aspx?ID=4822","book":"Treasure Vault","page":"142"}'::jsonb),
  (12676,3908476794355892,16,15,'{"gp":6500}'::jsonb,'2e75681c60942e873c5d5e06321ae605',
    '9a2a5e6219626b84df338a11259c5a02','e91875990c04ecd9cf6437cd0c75677f',
    '{"url":"https://2e.aonprd.com/Equipment.aspx?ID=4822","book":"Treasure Vault","page":"142"}'::jsonb),
  (12702,7838296050281525,16,18,'{"gp":24000}'::jsonb,'340dc82d2b3694105e04b9834912daef',null::text,null::text,
    '{"url":"https://2e.aonprd.com/Equipment.aspx?ID=4832","book":"Treasure Vault","page":"143"}'::jsonb)
)
select 'treasure-vault-wand-fields'::text as id,
  coalesce((select count(*) = 4 and bool_and((
    i.id is not null and i.uuid = e.uuid and i.content_source_id = e.source
    and i.level = e.level and i.price::jsonb = e.price and md5(i.name) = e.name_md5
    and (e.description_md5 is null or md5(i.description) = e.description_md5)
    and (e.craft_md5 is null or md5(i.craft_requirements) = e.craft_md5)
    and (case when e.id=12659 then exists(select 1 from noisome where (jsonb_typeof(i.meta_data)='object' and jsonb_build_object('description',i.description,'craft_requirements',i.craft_requirements,'source',i.meta_data->'source') in (patch->'raw',patch->'before')) or (jsonb_typeof(i.meta_data)='object' and jsonb_build_object('description',i.description,'craft_requirements',i.craft_requirements,'source',i.meta_data->'source')=patch->'after' and not exists(select 1 from jsonb_each(patch->'expected') f where (to_jsonb(i)||jsonb_build_object('uuid',i.uuid::text))->f.key is distinct from f.value) and not exists(select 1 from jsonb_array_elements_text(patch->'metadata_absent') k(key) where i.meta_data?k.key))) else i.meta_data->'source' = e.citation end)) is true)
    from expected e left join public.item i on i.id = e.id), false)
  and exists (select 1 from public.spell where id = 5322 and name = 'Chromatic Ray'
    and uuid = 8318806142210311 and rank = 4 and content_source_id = 13
    and meta_data->'source' =
      '{"url":"https://2e.aonprd.com/Spells.aspx?ID=883","book":"Secrets of Magic","page":"95"}'::jsonb)
  as passed;
