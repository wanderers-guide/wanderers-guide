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
    and pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to((p.prosrc)::text,'UTF8')),'hex')='306b98528f553f9089d3b46c8541b30121c9cdf1c30a48a69034842982f22c87'
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
  execute $historical_original_dual$-- Restore archetype artifact access and the printed Fervent Spell activation.
do $repair$
declare
  spec constant jsonb := $artifact097$
{
  "capture": "2026-10-02T20:25:49.577Z",
  "patches": [
    {
      "table": "ability_block",
      "id": 29515,
      "type": "feat",
      "name": "Fervent Spell",
      "path": "operations",
      "anchor": {
        "id": 29515,
        "cost": "",
        "name": "Fervent Spell",
        "type": "feat",
        "uuid": "1452394365003138",
        "level": 9,
        "access": "",
        "rarity": "COMMON",
        "traits": [
          3460,
          3489,
          3480,
          1486,
          1448
        ],
        "actions": "ONE-ACTION",
        "special": "",
        "trigger": "",
        "version": null,
        "frequency": "",
        "meta_data": {
          "source": {
            "url": "https://2e.aonprd.com/Relics.aspx?ID=207",
            "book": "Treasure Vault",
            "page": "199"
          }
        },
        "created_at": "2024-06-15T07:42:05.753328+00:00",
        "operations": [
          {
            "id": "ba2ad9c1-aabc-48f9-80f3-e81b190f7eb9",
            "data": {
              "id": 29513,
              "text": "**Fervent Spell** You have access to the spell provided by the emotional state, which you can [cast](link_action_19611) using your own spell slots. You also have access to the following activation.\n\n**Activate** <abbr cost=\"ONE-ACTION\" class=\"action-symbol\">1</abbr> ([auditory](link_trait_1469), [concentrate](link_trait_1432), [manipulate](link_trait_1433)); **Effect** The [relic](link_trait_3460) [Casts the Spell](link_action_19611) associated with its [emotional fervor](link_feat_22493) at the spell's lowest rank.",
              "type": "feat"
            },
            "type": "injectText"
          }
        ],
        "description": "**Gift Type** Major\n\n**Aspect** emotion\n\nWhile the [relic's](link_trait_3460) [fervor](link_feat_29513) gift lasts, you have access to the spell provided by the emotional state, which you can [cast](link_action_19611) using your own spell slots. You also have access to the following activation.\n\n**Activate** <abbr cost=\"ONE-ACTION\" class=\"action-symbol\">1</abbr> ([auditory](link_trait_1469), [concentrate](link_trait_1432), [manipulate](link_trait_1433)); **Effect** The [relic](link_trait_3460) [Casts the Spell](link_action_19611) associated with its [emotional fervor](link_feat_22493) at the spell's lowest rank.",
        "availability": null,
        "requirements": "",
        "prerequisites": [
          "fervor gift"
        ],
        "content_source_id": 16
      },
      "final": {
        "id": 29515,
        "cost": "",
        "name": "Fervent Spell",
        "type": "feat",
        "uuid": "1452394365003138",
        "level": 9,
        "access": "",
        "rarity": "COMMON",
        "traits": [
          3460,
          3489,
          3480,
          1486,
          1448
        ],
        "actions": "ONE-ACTION",
        "special": "",
        "trigger": "",
        "version": null,
        "frequency": "",
        "meta_data": {
          "source": {
            "url": "https://2e.aonprd.com/Relics.aspx?ID=207",
            "book": "Treasure Vault",
            "page": "199"
          }
        },
        "created_at": "2024-06-15T07:42:05.753328+00:00",
        "operations": [
          {
            "id": "ba2ad9c1-aabc-48f9-80f3-e81b190f7eb9",
            "data": {
              "id": 29513,
              "text": "**Fervent Spell** You have access to the spell provided by the emotional state, which you can [cast](link_action_19611) using your own spell slots. You also have access to the following activation.\n\n**Activate** <abbr cost=\"ONE-ACTION\" class=\"action-symbol\">1</abbr> ([concentrate](link_trait_1432), [manipulate](link_trait_1433)); **Effect** The [relic](link_trait_3460) [Casts the Spell](link_action_19611) associated with its [emotional fervor](link_feat_22493) at the spell's lowest rank.",
              "type": "feat"
            },
            "type": "injectText"
          }
        ],
        "description": "**Gift Type** Major\n\n**Aspect** emotion\n\nWhile the [relic's](link_trait_3460) [fervor](link_feat_29513) gift lasts, you have access to the spell provided by the emotional state, which you can [cast](link_action_19611) using your own spell slots. You also have access to the following activation.\n\n**Activate** <abbr cost=\"ONE-ACTION\" class=\"action-symbol\">1</abbr> ([auditory](link_trait_1469), [concentrate](link_trait_1432), [manipulate](link_trait_1433)); **Effect** The [relic](link_trait_3460) [Casts the Spell](link_action_19611) associated with its [emotional fervor](link_feat_22493) at the spell's lowest rank.",
        "availability": null,
        "requirements": "",
        "prerequisites": [
          "fervor gift"
        ],
        "content_source_id": 16
      },
      "primary": [
        {
          "url": "https://2e.aonprd.com/Relics.aspx?ID=95",
          "sha256": "35a39b146c7c45caa38393837b4c0db9679d40cd7316322e313d800c1a552d40",
          "captured_at": "2026-10-01T19:41:21.115Z",
          "text": "Fervent SpellMajor GiftEmotion Mental Source Treasure Vault (Remastered) pg. 199Aspect emotion; Prerequisite fervor giftWhile the relic's fervor gift lasts, you have access to the spell provided by the emotional state, which you can cast using your own spell slots. You also have access to the following activation.Activate [one-action] (concentrate, manipulate); Effect The relic Casts the Spell associated with its emotional fervor at the spell's lowest rank."
        }
      ],
      "rationale": "Remove the obsolete auditory activation trait from the actual Fervor injection, retaining the existing target and operation identity."
    },
    {
      "table": "archetype",
      "id": 110,
      "type": "archetype",
      "name": "Gelid Shard",
      "path": "dedication_feat_id",
      "anchor": {
        "id": 110,
        "name": "Gelid Shard",
        "uuid": "8035651534465539",
        "rarity": "COMMON",
        "version": "1.0",
        "trait_id": 3295,
        "meta_data": {
          "source": {
            "url": "https://2e.aonprd.com/Archetypes.aspx?ID=383",
            "book": "Treasure Vault",
            "page": "184"
          }
        },
        "created_at": "2024-05-10T15:58:26.646806+00:00",
        "deprecated": null,
        "artwork_url": "",
        "description": "The Varki wizard T'aak Chamin once traveled from the Lands of the Linnorm Kings northward, past the Winterwall Glacier and deep into the frozen wastes of the Crown of the World. T'aak was seeking immortality without the risk of undeath, and he followed the hints and clues of ancient legends that spoke of “the frozen immortals,” and of ancient magics of ice crafting that were once commonly traded between these rumored immortals and the Erutaki people, who share ancestral roots with the Varki.\n\nLittle is known of T'aak's journeys in the northern wastes, though all accounts that record anything of the wizard and his trek indicate that the man who returned was different in many ways than the man who first traveled north. T'aak spoke of beings known as saumen kar, of a “great whale” sealed beneath the ice, and of strange corruptions. An account left by his wife mentions that T'aak often awoke screaming about “malignant sludge” and a “disease clawing at the ancient gates.” Despite all this, T'aak's primary quest did result in at least one notable accomplishment: the crafting of the first [_gelid shard_](link_item_12041).\n\n[_Gelid shards_](link_item_12041) are [arcane](link_trait_1459) focuses of refined [magical](link_trait_1504) [cold](link_trait_1519) in physical form. Unfortunately for their creator, [_gelid shard_](link_item_12041) do not grant immortality, though mortal creatures bonded to them do often have slightly longer lifespans thanks to the preserving cold that inundates and surrounds them.",
        "content_source_id": 16,
        "dedication_feat_id": 25723
      },
      "final": {
        "id": 110,
        "name": "Gelid Shard",
        "uuid": "8035651534465539",
        "rarity": "COMMON",
        "version": "1.0",
        "trait_id": 3295,
        "meta_data": {
          "source": {
            "url": "https://2e.aonprd.com/Archetypes.aspx?ID=383",
            "book": "Treasure Vault",
            "page": "184"
          }
        },
        "created_at": "2024-05-10T15:58:26.646806+00:00",
        "deprecated": null,
        "artwork_url": "",
        "description": "The Varki wizard T'aak Chamin once traveled from the Lands of the Linnorm Kings northward, past the Winterwall Glacier and deep into the frozen wastes of the Crown of the World. T'aak was seeking immortality without the risk of undeath, and he followed the hints and clues of ancient legends that spoke of “the frozen immortals,” and of ancient magics of ice crafting that were once commonly traded between these rumored immortals and the Erutaki people, who share ancestral roots with the Varki.\n\nLittle is known of T'aak's journeys in the northern wastes, though all accounts that record anything of the wizard and his trek indicate that the man who returned was different in many ways than the man who first traveled north. T'aak spoke of beings known as saumen kar, of a “great whale” sealed beneath the ice, and of strange corruptions. An account left by his wife mentions that T'aak often awoke screaming about “malignant sludge” and a “disease clawing at the ancient gates.” Despite all this, T'aak's primary quest did result in at least one notable accomplishment: the crafting of the first [_gelid shard_](link_item_12041).\n\n[_Gelid shards_](link_item_12041) are [arcane](link_trait_1459) focuses of refined [magical](link_trait_1504) [cold](link_trait_1519) in physical form. Unfortunately for their creator, [_gelid shard_](link_item_12041) do not grant immortality, though mortal creatures bonded to them do often have slightly longer lifespans thanks to the preserving cold that inundates and surrounds them.",
        "content_source_id": 16,
        "dedication_feat_id": 51105
      },
      "primary": [
        {
          "url": "https://2e.aonprd.com/Rules.aspx?ID=1960",
          "sha256": "001579f45f0bf3a19a9c40e11c07839aebbb4c0d8cf450b786165a0ef6ccc301",
          "captured_at": "2026-10-01T19:41:24.257Z",
          "printed_rule": "Possession and investment grant archetype access as a standard dedication, without spending a class feat on a dedication. First Frost remains a paid archetype feat."
        }
      ],
      "rationale": "Associate the archetype with its hidden dedication marker so the existing dedication expansion grants the canonical archetype trait."
    },
    {
      "table": "item",
      "id": 12041,
      "type": "item",
      "name": "Gelid Shard",
      "path": "operations",
      "anchor": {
        "id": 12041,
        "bulk": "0",
        "name": "Gelid Shard",
        "size": "MEDIUM",
        "uuid": "8754698536326669",
        "group": "GENERAL",
        "hands": null,
        "level": 2,
        "price": {},
        "usage": "other",
        "rarity": "RARE",
        "traits": [
          1459,
          1568,
          1519,
          1527
        ],
        "version": "1.0",
        "meta_data": {
          "hp": 0,
          "bulk": {},
          "group": "",
          "runes": {},
          "damage": {
            "die": "",
            "dice": 1,
            "extra": "",
            "damageType": ""
          },
          "hp_max": 0,
          "source": {
            "url": "https://2e.aonprd.com/Equipment.aspx?ID=4898",
            "book": "Treasure Vault",
            "page": "184"
          },
          "charges": {},
          "foundry": {
            "items": [],
            "rules": [
              {
                "key": "Resistance",
                "type": "cold",
                "value": "@actor.level"
              },
              {
                "key": "FlatModifier",
                "type": "circumstance",
                "value": 2,
                "selector": "saving-throw",
                "predicate": [
                  "emotion"
                ]
              }
            ],
            "container_id": null
          },
          "category": "",
          "hardness": 0,
          "material": {
            "type": null,
            "grade": null
          },
          "quantity": 1,
          "base_item": null,
          "image_url": "",
          "is_shoddy": false,
          "starfinder": {
            "slots": []
          },
          "unselectable": false,
          "broken_threshold": 0
        },
        "created_at": "2024-04-19T04:17:59.858542+00:00",
        "operations": [
          {
            "id": "1ea4abe0-2aab-45f0-a5c7-1edd7f3c0210",
            "data": {
              "value": "cold, {{level}}",
              "variable": "RESISTANCES"
            },
            "type": "adjValue"
          },
          {
            "id": "d4b7796e-a060-4103-b4a9-c4846b9286ce",
            "data": {
              "text": "against [emotion](link_trait_1486) effects",
              "type": "status",
              "value": 2,
              "variable": "SAVE_FORT"
            },
            "type": "addBonusToValue"
          },
          {
            "id": "394ee897-9a5e-42db-bcf0-879f513e45bf",
            "data": {
              "text": "against [emotion](link_trait_1486) effects",
              "type": "status",
              "value": 2,
              "variable": "SAVE_REFLEX"
            },
            "type": "addBonusToValue"
          },
          {
            "id": "2b29bc66-3b77-4e3a-81eb-a443d7df12d7",
            "data": {
              "text": "against [emotion](link_trait_1486) effects",
              "type": "status",
              "value": 2,
              "variable": "SAVE_WILL"
            },
            "type": "addBonusToValue"
          }
        ],
        "description": "This crystal shard shimmers with its own light even as it seems to draw the heat out of its surroundings. Plunging it into your heart grants you the tranquil lethality of deepest winter, but the more you draw upon its power, the colder your heart grows. Your frozen heart dulls your emotions. When you gain a bonus from an emotion effect, that bonus is reduced by 1, to a minimum of 0. At 10th level, the bonus is reduced by 2. Your dulled emotions make it hard to relate to others; the DC of checks to [Make an Impression](link_action_19739) or [Request](link_action_19844) a favor of other creatures, or to [Aid](link_action_19604) in such attempts, is increased by +2. You gain resistance to cold equal to your level and a +2 status bonus to all saves against emotion effects.\n\n**Destruction** The _gelid shard_ must be left exposed in the Plane of Fire for a week and a day, then smashed with an adamantine hammer by someone who felt true love for the shard's creator.",
        "availability": null,
        "content_source_id": 16,
        "craft_requirements": null
      },
      "final": {
        "id": 12041,
        "bulk": "0",
        "name": "Gelid Shard",
        "size": "MEDIUM",
        "uuid": "8754698536326669",
        "group": "GENERAL",
        "hands": null,
        "level": 2,
        "price": {},
        "usage": "other",
        "rarity": "RARE",
        "traits": [
          1459,
          1568,
          1519,
          1527
        ],
        "version": "1.0",
        "meta_data": {
          "hp": 0,
          "bulk": {},
          "group": "",
          "runes": {},
          "damage": {
            "die": "",
            "dice": 1,
            "extra": "",
            "damageType": ""
          },
          "hp_max": 0,
          "source": {
            "url": "https://2e.aonprd.com/Equipment.aspx?ID=4898",
            "book": "Treasure Vault",
            "page": "184"
          },
          "charges": {},
          "foundry": {
            "items": [],
            "rules": [
              {
                "key": "Resistance",
                "type": "cold",
                "value": "@actor.level"
              },
              {
                "key": "FlatModifier",
                "type": "circumstance",
                "value": 2,
                "selector": "saving-throw",
                "predicate": [
                  "emotion"
                ]
              }
            ],
            "container_id": null
          },
          "category": "",
          "hardness": 0,
          "material": {
            "type": null,
            "grade": null
          },
          "quantity": 1,
          "base_item": null,
          "image_url": "",
          "is_shoddy": false,
          "starfinder": {
            "slots": []
          },
          "unselectable": false,
          "broken_threshold": 0
        },
        "created_at": "2024-04-19T04:17:59.858542+00:00",
        "operations": [
          {
            "id": "1ea4abe0-2aab-45f0-a5c7-1edd7f3c0210",
            "data": {
              "value": "cold, {{level}}",
              "variable": "RESISTANCES"
            },
            "type": "adjValue"
          },
          {
            "id": "d4b7796e-a060-4103-b4a9-c4846b9286ce",
            "data": {
              "text": "against [emotion](link_trait_1486) effects",
              "type": "status",
              "value": 2,
              "variable": "SAVE_FORT"
            },
            "type": "addBonusToValue"
          },
          {
            "id": "394ee897-9a5e-42db-bcf0-879f513e45bf",
            "data": {
              "text": "against [emotion](link_trait_1486) effects",
              "type": "status",
              "value": 2,
              "variable": "SAVE_REFLEX"
            },
            "type": "addBonusToValue"
          },
          {
            "id": "2b29bc66-3b77-4e3a-81eb-a443d7df12d7",
            "data": {
              "text": "against [emotion](link_trait_1486) effects",
              "type": "status",
              "value": 2,
              "variable": "SAVE_WILL"
            },
            "type": "addBonusToValue"
          },
          {
            "id": "8d8f5c32-6d3f-4dd7-b540-c5c2d76feb6c",
            "type": "giveAbilityBlock",
            "data": {
              "type": "feat",
              "abilityBlockId": 51105
            }
          }
        ],
        "description": "This crystal shard shimmers with its own light even as it seems to draw the heat out of its surroundings. Plunging it into your heart grants you the tranquil lethality of deepest winter, but the more you draw upon its power, the colder your heart grows. Your frozen heart dulls your emotions. When you gain a bonus from an emotion effect, that bonus is reduced by 1, to a minimum of 0. At 10th level, the bonus is reduced by 2. Your dulled emotions make it hard to relate to others; the DC of checks to [Make an Impression](link_action_19739) or [Request](link_action_19844) a favor of other creatures, or to [Aid](link_action_19604) in such attempts, is increased by +2. You gain resistance to cold equal to your level and a +2 status bonus to all saves against emotion effects.\n\n**Destruction** The _gelid shard_ must be left exposed in the Plane of Fire for a week and a day, then smashed with an adamantine hammer by someone who felt true love for the shard's creator.",
        "availability": null,
        "content_source_id": 16,
        "craft_requirements": null
      },
      "primary": [
        {
          "url": "https://2e.aonprd.com/Rules.aspx?ID=1960",
          "sha256": "001579f45f0bf3a19a9c40e11c07839aebbb4c0d8cf450b786165a0ef6ccc301",
          "captured_at": "2026-10-01T19:41:24.257Z",
          "printed_rule": "Possession and investment grant archetype access as a standard dedication, without spending a class feat on a dedication. First Frost remains a paid archetype feat."
        }
      ],
      "rationale": "An invested archetype artifact grants its hidden dedication access marker, not the paid First Frost feat."
    }
  ],
  "dependencies": [
    {
      "table": "ability_block",
      "id": 19611,
      "name": "Cast a Spell",
      "type": "action",
      "anchor": {
        "id": 19611,
        "cost": null,
        "name": "Cast a Spell",
        "type": "action",
        "uuid": "3222895456836016",
        "level": 1,
        "access": null,
        "rarity": "COMMON",
        "traits": [],
        "actions": null,
        "special": null,
        "trigger": null,
        "version": "1.0",
        "frequency": null,
        "meta_data": {
          "foundry": {
            "rules": []
          }
        },
        "created_at": "2023-12-13T20:30:43.277321+00:00",
        "operations": [],
        "description": "Spells can vary in how many actions they take, as shown in the spell’s stat block. You cast cantrips, spells from spell slots, and focus spells using the same process, but must expend the spell when casting a spell from a spell slot and must spend 1 Focus Point to cast a focus spell. Some rules will refer to the Cast a Spell activity, such as “if the next action you use is to Cast a Spell.” Any spell qualifies as a Cast a Spell activity, and any characteristics of the spell use those of the specific spell you’re casting.\n\n### **Costs and Loci**\n\nSome spells require you to pay a cost or provide a locus. If the spell lists a cost, you must have the listed money, valuable materials, or other resources to cast the spell (such as gems or magical reagents), and they're expended during the casting.\n\nA locus is an object that funnels or directs the magical energy of the spell but is not consumed in its casting. As part of Casting the Spell, you retrieve the locus (if necessary, and if you have a free hand), and you can put it away again if you so choose. Loci tend to be expensive, and you need to acquire them in advance to cast the spell, but they aren't expended like costs are. Unless noted otherwise, a locus has negligible Bulk.\n\n### **Long Casting Times**\n\nSome spells take minutes or hours to cast. You can’t use other actions or reactions while casting such a spell, though at the GM’s discretion, you might be able to speak a few sentences. As with other activities that take a long time, these spells have the exploration trait, and you can’t cast them in an encounter. If combat breaks out while you’re casting one, your spell is disrupted.\n\n### **Disrupted and Lost Spells**\n\nSome abilities and spells can disrupt a spell, causing it to have no effect and be lost. When you lose a spell, you’ve already expended the spell slot and spent the spell’s costs and actions. If a spell is disrupted during a [Sustain](link_action_19858) action, the spell immediately ends.",
        "availability": null,
        "requirements": null,
        "prerequisites": [],
        "content_source_id": 3
      }
    },
    {
      "table": "ability_block",
      "id": 22493,
      "name": "Cathartic Mage Dedication",
      "type": "feat",
      "anchor": {
        "id": 22493,
        "cost": null,
        "name": "Cathartic Mage Dedication",
        "type": "feat",
        "uuid": "3294312627250973",
        "level": 2,
        "access": null,
        "rarity": "UNCOMMON",
        "traits": [
          1439,
          1445
        ],
        "actions": null,
        "special": "You can't select another dedication feat until you've gained two other feats from the cathartic mage archetype.",
        "trigger": null,
        "version": null,
        "frequency": null,
        "meta_data": {
          "source": {
            "url": "https://2e.aonprd.com/Feats.aspx?ID=2963",
            "book": "Secrets of Magic",
            "page": "194"
          },
          "foundry": {
            "rules": [
              {
                "key": "GrantItem",
                "uuid": "Compendium.pf2e.actionspf2e.Item.Catharsis"
              },
              {
                "key": "GrantItem",
                "uuid": "Compendium.pf2e.actionspf2e.Item.Settle Emotions"
              },
              {
                "key": "ChoiceSet",
                "flag": "catharticMageDedication",
                "prompt": "PF2E.SpecificRule.CatharticMage.EmotionalState.Prompt",
                "choices": [
                  {
                    "value": "Compendium.pf2e.classfeatures.Item.Catharsis Emotion (Anger)"
                  },
                  {
                    "value": "Compendium.pf2e.classfeatures.Item.Catharsis Emotion (Awe)"
                  },
                  {
                    "value": "Compendium.pf2e.classfeatures.Item.Catharsis Emotion (Dedication)"
                  },
                  {
                    "value": "Compendium.pf2e.classfeatures.Item.Catharsis Emotion (Fear)"
                  },
                  {
                    "value": "Compendium.pf2e.classfeatures.Item.Catharsis Emotion (Hatred)"
                  },
                  {
                    "value": "Compendium.pf2e.classfeatures.Item.Catharsis Emotion (Joy)"
                  },
                  {
                    "value": "Compendium.pf2e.classfeatures.Item.Catharsis Emotion (Love)"
                  },
                  {
                    "value": "Compendium.pf2e.classfeatures.Item.Catharsis Emotion (Misery)"
                  },
                  {
                    "value": "Compendium.pf2e.classfeatures.Item.Catharsis Emotion (Pride)"
                  },
                  {
                    "value": "Compendium.pf2e.classfeatures.Item.Catharsis Emotion (Remorse)"
                  }
                ],
                "adjustName": false
              },
              {
                "key": "GrantItem",
                "uuid": "{item|flags.pf2e.rulesSelections.catharticMageDedication}"
              }
            ]
          }
        },
        "created_at": "2024-04-20T06:53:31.046939+00:00",
        "operations": [
          {
            "id": "dfd51d9f-468e-4abc-902a-609514cb4edc",
            "data": {
              "type": "feat",
              "abilityBlockId": 40629
            },
            "type": "giveAbilityBlock"
          },
          {
            "id": "ce0e0ebb-0309-467c-92ad-7476c888e628",
            "data": {
              "type": "feat",
              "abilityBlockId": 40630
            },
            "type": "giveAbilityBlock"
          },
          {
            "id": "a501b8aa-8e37-4b14-b5ef-709030dba159",
            "data": {
              "title": "Select a Tradition",
              "modeType": "PREDEFINED",
              "optionType": "CUSTOM",
              "optionsPredefined": [
                {
                  "id": "81059e5e-4667-438c-9479-864400ebe085",
                  "type": "CUSTOM",
                  "title": "Arcane Cathartic Mage",
                  "operations": [
                    {
                      "id": "647379e7-9f5c-498b-9dda-c4e257a404d4",
                      "data": {
                        "value": "CATHARTIC_MAGE:::SPONTANEOUS-REPERTOIRE:::ARCANE:::ATTRIBUTE_CHA",
                        "variable": "CASTING_SOURCES"
                      },
                      "type": "defineCastingSource"
                    },
                    {
                      "id": "fc1aa318-48e8-41d0-bdcb-c049efd72c9a",
                      "data": {
                        "title": "Select an Arcane Cantrip",
                        "modeType": "FILTERED",
                        "optionType": "SPELL",
                        "optionsFilters": {
                          "id": "56e4cead-c3ca-4e02-a46c-e4b6d37fc409",
                          "type": "SPELL",
                          "level": {
                            "max": 0,
                            "min": null
                          },
                          "traits": [],
                          "spellData": {
                            "type": "NORMAL",
                            "castingSource": "CATHARTIC_MAGE"
                          },
                          "traditions": [
                            "Arcane"
                          ]
                        },
                        "optionsPredefined": []
                      },
                      "type": "select"
                    }
                  ],
                  "description": ""
                },
                {
                  "id": "b13a9845-7f5a-4990-8fb5-2c669331d5d7",
                  "type": "CUSTOM",
                  "title": "Divine Cathartic Mage",
                  "operations": [
                    {
                      "id": "2a26fe10-3a09-4e62-8a2b-77ac439c667d",
                      "data": {
                        "value": "CATHARTIC_MAGE:::SPONTANEOUS-REPERTOIRE:::DIVINE:::ATTRIBUTE_CHA",
                        "variable": "CASTING_SOURCES"
                      },
                      "type": "defineCastingSource"
                    },
                    {
                      "id": "07a88a20-457f-4db8-ad46-01a528097356",
                      "data": {
                        "title": "Select a Divine Cantrip",
                        "modeType": "FILTERED",
                        "optionType": "SPELL",
                        "optionsFilters": {
                          "id": "8a9c6484-a443-4ae1-ab20-3d75a6a6eec3",
                          "type": "SPELL",
                          "level": {
                            "max": 0
                          },
                          "traits": [],
                          "spellData": {
                            "type": "NORMAL",
                            "castingSource": "CATHARTIC_MAGE"
                          },
                          "traditions": [
                            "Divine"
                          ]
                        },
                        "optionsPredefined": []
                      },
                      "type": "select"
                    }
                  ],
                  "description": ""
                },
                {
                  "id": "8eb48200-6a7f-40c3-b61e-0ad4557a40d9",
                  "type": "CUSTOM",
                  "title": "Occult Cathartic Mage",
                  "operations": [
                    {
                      "id": "263e7869-17dc-4d54-875f-d9854547677d",
                      "data": {
                        "value": "CATHARTIC_MAGE:::SPONTANEOUS-REPERTOIRE:::OCCULT:::ATTRIBUTE_CHA",
                        "variable": "CASTING_SOURCES"
                      },
                      "type": "defineCastingSource"
                    },
                    {
                      "id": "edeb4b46-42eb-473d-9087-431b8136caeb",
                      "data": {
                        "title": "Select an Occult Cantrip",
                        "modeType": "FILTERED",
                        "optionType": "SPELL",
                        "optionsFilters": {
                          "id": "4c67971e-0698-47c9-8a5b-12d662d5794a",
                          "type": "SPELL",
                          "level": {
                            "max": 0
                          },
                          "traits": [],
                          "spellData": {
                            "type": "NORMAL",
                            "castingSource": "CATHARTIC_MAGE"
                          },
                          "traditions": [
                            "Occult"
                          ]
                        },
                        "optionsPredefined": []
                      },
                      "type": "select"
                    }
                  ],
                  "description": ""
                },
                {
                  "id": "55bbfdb4-e950-406f-b406-96df484d5af3",
                  "type": "CUSTOM",
                  "title": "Primal Cathartic Mage",
                  "operations": [
                    {
                      "id": "1ac3cbcd-f135-4a10-b9d2-43738e0262af",
                      "data": {
                        "value": "CATHARTIC_MAGE:::SPONTANEOUS-REPERTOIRE:::PRIMAL:::ATTRIBUTE_CHA",
                        "variable": "CASTING_SOURCES"
                      },
                      "type": "defineCastingSource"
                    },
                    {
                      "id": "5c3d17e5-70f7-4c3f-ba37-ec6325908129",
                      "data": {
                        "title": "Select a Primal Cantrip",
                        "modeType": "FILTERED",
                        "optionType": "SPELL",
                        "optionsFilters": {
                          "id": "98b93a71-1912-410a-a761-d0c9ac628e6f",
                          "type": "SPELL",
                          "level": {
                            "max": 0
                          },
                          "traits": [],
                          "spellData": {
                            "type": "NORMAL",
                            "castingSource": "CATHARTIC_MAGE"
                          },
                          "traditions": [
                            "Primal"
                          ]
                        },
                        "optionsPredefined": []
                      },
                      "type": "select"
                    }
                  ],
                  "description": ""
                }
              ]
            },
            "type": "select"
          },
          {
            "id": "e977a31c-84ce-405d-beda-1efd02d56a6e",
            "data": {
              "value": {
                "value": "T"
              },
              "variable": "SPELL_ATTACK"
            },
            "type": "adjValue"
          },
          {
            "id": "d8ef14c8-d402-429d-aacd-79e45679703b",
            "data": {
              "value": {
                "value": "T"
              },
              "variable": "SPELL_DC"
            },
            "type": "adjValue"
          },
          {
            "id": "82958f2b-2a90-4a78-a109-21350b15c159",
            "data": {
              "value": "spells",
              "variable": "PRIMARY_SHEET_TABS"
            },
            "type": "adjValue"
          }
        ],
        "description": "You've learned to harness a particular emotion and mix it into your magic. Choose an emotion to be your catharsis emotion.\n\nIf you don't already cast spells from spell slots, you learn to cast spontaneous spells and gain the [Cast a Spell](link_action_19611) activity. You gain a spell repertoire with one cantrip of your choice, from a spell list of your choice. You choose this cantrip from the common spells on your chosen spell list or from other spells to which you have access on that list. You're trained in spell attack rolls and spell DCs for that tradition. Your key spellcasting ability for these spells is Charisma.\n\nIf you can already cast spells from spell slots, you learn one additional cantrip from your spellcasting tradition. If you're a prepared caster, you can prepare this spell in addition to your usual cantrips per day; if you're a spontaneous caster, you add this cantrip to your spell repertoire.\n\nYou gain the [Catharsis](link_feat_40629) reaction and the [Settle Emotions](link_feat_40630) activity.\n\n* * *\n\n**Emotional States:**\n\nCatharsis Emotion (Anger)\n\nCatharsis Emotion (Awe)\n\nCatharsis Emotion (Dedication)\n\nCatharsis Emotion (Fear)\n\nCatharsis Emotion (Hatred)\n\nCatharsis Emotion (Joy)\n\nCatharsis Emotion (Love)\n\nCatharsis Emotion (Misery)\n\nCatharsis Emotion (Pride)\n\nCatharsis Emotion (Remorse)",
        "availability": null,
        "requirements": null,
        "prerequisites": [
          "Charisma +2 or ability to cast spells from spell slots"
        ],
        "content_source_id": 13
      }
    },
    {
      "table": "ability_block",
      "id": 25723,
      "name": "First Frost",
      "type": "feat",
      "anchor": {
        "id": 25723,
        "cost": "",
        "name": "First Frost",
        "type": "feat",
        "uuid": "1886338270451949",
        "level": 2,
        "access": "",
        "rarity": "COMMON",
        "traits": [
          3295
        ],
        "actions": null,
        "special": "",
        "trigger": "",
        "version": null,
        "frequency": "",
        "meta_data": {
          "source": {
            "url": "https://2e.aonprd.com/Feats.aspx?ID=8960",
            "book": "Treasure Vault",
            "page": "185"
          }
        },
        "created_at": "2024-05-06T10:29:17.657994+00:00",
        "operations": [
          {
            "id": "37fc7e3e-146e-4cb6-8fc0-315a1c3ebb3f",
            "data": {
              "value": "GELID_SHARD:::SPONTANEOUS-REPERTOIRE:::ARCANE:::ATTRIBUTE_CHA",
              "variable": "CASTING_SOURCES"
            },
            "type": "defineCastingSource"
          },
          {
            "id": "12e6d71a-540f-49db-a115-7f78a22677b5",
            "data": {
              "value": {
                "value": "T"
              },
              "variable": "SPELL_ATTACK"
            },
            "type": "adjValue"
          },
          {
            "id": "9e91ce4f-0139-4413-93c2-929a69222747",
            "data": {
              "value": {
                "value": "T"
              },
              "variable": "SPELL_DC"
            },
            "type": "adjValue"
          },
          {
            "id": "9cb8046c-4292-4be4-97d4-bec99edc52e1",
            "data": {
              "rank": 0,
              "type": "NORMAL",
              "spellId": 4636,
              "castingSource": "GELID_SHARD"
            },
            "type": "giveSpell"
          },
          {
            "id": "a623f17c-6486-4646-a5f2-9585fd3d2df0",
            "data": {
              "rank": 0,
              "type": "NORMAL",
              "spellId": 5829,
              "castingSource": "GELID_SHARD"
            },
            "type": "giveSpell"
          }
        ],
        "description": "The [_gelid shard_](link_item_12041) within your heart may sap your ability to feel and experience emotion, but it also lets you create and manipulate cold. You learn to cast spontaneous spells and gain the [Cast a Spell](link_action_19611) activity. You gain a spell repertoire with the [_frost's touch_](link_spell_5829) and [_frostbite_](link_spell_4636) cantrips. You're trained in spell attack rolls and spell DCs for arcane spells. Your key spellcasting ability is Charisma.",
        "availability": null,
        "requirements": "",
        "prerequisites": [
          "Gelid Shard Dedication"
        ],
        "content_source_id": 16
      }
    },
    {
      "table": "ability_block",
      "id": 29513,
      "name": "Fervor",
      "type": "feat",
      "anchor": {
        "id": 29513,
        "cost": "",
        "name": "Fervor",
        "type": "feat",
        "uuid": "1690381693754808",
        "level": 1,
        "access": "",
        "rarity": "COMMON",
        "traits": [
          3460,
          3489,
          3479,
          1486,
          1448,
          1432
        ],
        "actions": "ONE-ACTION",
        "special": "",
        "trigger": "",
        "version": null,
        "frequency": "once per hour",
        "meta_data": {
          "source": {
            "url": "https://2e.aonprd.com/Relics.aspx?ID=93",
            "book": "Treasure Vault (Remastered)",
            "page": "199"
          }
        },
        "created_at": "2024-06-15T07:40:03.178202+00:00",
        "operations": [],
        "description": "**Gift Type** Minor\n\n**Aspect** emotion\n\nYou gain the emotional fervor benefits for your [relic's](link_trait_3460) [emotional state](link_feat_22493) for the next 3 rounds, but ignore the spell associated with the fervor. The feeling wears off quickly, so you experience no emotional fallout.",
        "availability": null,
        "requirements": "",
        "prerequisites": [],
        "content_source_id": 16
      }
    },
    {
      "table": "ability_block",
      "id": 51105,
      "name": "Gelid Shard Dedication",
      "type": "feat",
      "anchor": {
        "id": 51105,
        "cost": "",
        "name": "Gelid Shard Dedication",
        "type": "feat",
        "uuid": "8596826607543012",
        "level": 2,
        "access": "",
        "rarity": "COMMON",
        "traits": [
          1445
        ],
        "actions": null,
        "special": "",
        "trigger": "",
        "version": null,
        "frequency": "",
        "meta_data": {
          "unselectable": true
        },
        "created_at": "2025-12-05T22:45:31.086493+00:00",
        "operations": [],
        "description": "The Varki wizard T'aak Chamin once traveled from the Lands of the Linnorm Kings northward, past the Winterwall Glacier and deep into the frozen wastes of the Crown of the World. T'aak was seeking immortality without the risk of undeath, and he followed the hints and clues of ancient legends that spoke of “the frozen immortals,” and of ancient magics of ice crafting that were once commonly traded between these rumored immortals and the Erutaki people, who share ancestral roots with the Varki.\n\nLittle is known of T'aak's journeys in the northern wastes, though all accounts that record anything of the wizard and his trek indicate that the man who returned was different in many ways than the man who first traveled north. T'aak spoke of beings known as saumen kar, of a “great whale” sealed beneath the ice, and of strange corruptions. An account left by his wife mentions that T'aak often awoke screaming about “malignant sludge” and a “disease clawing at the ancient gates.” Despite all this, T'aak's primary quest did result in at least one notable accomplishment: the crafting of the first gelid shard.\n\nGelid shards are arcane focuses of refined magical cold in physical form. Unfortunately for their creator, gelid shards do not grant immortality, though mortal creatures bonded to them do often have slightly longer lifespans thanks to the preserving cold that inundates and surrounds them.",
        "availability": null,
        "requirements": "",
        "prerequisites": [
          "You are in possession of and have invested a Gelid Shard"
        ],
        "content_source_id": 16
      }
    },
    {
      "table": "ability_block",
      "id": 51106,
      "name": "Snowcaster",
      "type": "feat",
      "anchor": {
        "id": 51106,
        "cost": "",
        "name": "Snowcaster",
        "type": "feat",
        "uuid": "380068990842631",
        "level": 4,
        "access": "",
        "rarity": "COMMON",
        "traits": [
          3295
        ],
        "actions": null,
        "special": "",
        "trigger": "",
        "version": null,
        "frequency": "",
        "meta_data": {
          "source": {
            "url": "https://2e.aonprd.com/Feats.aspx?ID=8961",
            "book": "Treasure Vault",
            "page": "185"
          }
        },
        "created_at": "2025-12-05T22:46:01.430786+00:00",
        "operations": [
          {
            "id": "5f1e65a0-7910-4be4-8e27-4d5d3b29518a",
            "data": {
              "slots": [
                {
                  "amt": 1,
                  "lvl": 1,
                  "rank": 1
                },
                {
                  "amt": 1,
                  "lvl": 2,
                  "rank": 1
                },
                {
                  "amt": 1,
                  "lvl": 3,
                  "rank": 1
                },
                {
                  "amt": 1,
                  "lvl": 4,
                  "rank": 1
                },
                {
                  "amt": 1,
                  "lvl": 5,
                  "rank": 1
                },
                {
                  "amt": 1,
                  "lvl": 6,
                  "rank": 1
                },
                {
                  "amt": 1,
                  "lvl": 7,
                  "rank": 1
                },
                {
                  "amt": 1,
                  "lvl": 8,
                  "rank": 1
                },
                {
                  "amt": 1,
                  "lvl": 9,
                  "rank": 1
                },
                {
                  "amt": 1,
                  "lvl": 10,
                  "rank": 1
                },
                {
                  "amt": 1,
                  "lvl": 11,
                  "rank": 1
                },
                {
                  "amt": 1,
                  "lvl": 12,
                  "rank": 1
                },
                {
                  "amt": 1,
                  "lvl": 13,
                  "rank": 1
                },
                {
                  "amt": 1,
                  "lvl": 14,
                  "rank": 1
                },
                {
                  "amt": 1,
                  "lvl": 15,
                  "rank": 1
                },
                {
                  "amt": 1,
                  "lvl": 16,
                  "rank": 1
                },
                {
                  "amt": 1,
                  "lvl": 17,
                  "rank": 1
                },
                {
                  "amt": 1,
                  "lvl": 18,
                  "rank": 1
                },
                {
                  "amt": 1,
                  "lvl": 19,
                  "rank": 1
                },
                {
                  "amt": 1,
                  "lvl": 20,
                  "rank": 1
                },
                {
                  "amt": 1,
                  "lvl": 6,
                  "rank": 2
                },
                {
                  "amt": 1,
                  "lvl": 7,
                  "rank": 2
                },
                {
                  "amt": 1,
                  "lvl": 8,
                  "rank": 2
                },
                {
                  "amt": 1,
                  "lvl": 9,
                  "rank": 2
                },
                {
                  "amt": 1,
                  "lvl": 10,
                  "rank": 2
                },
                {
                  "amt": 1,
                  "lvl": 11,
                  "rank": 2
                },
                {
                  "amt": 1,
                  "lvl": 12,
                  "rank": 2
                },
                {
                  "amt": 1,
                  "lvl": 13,
                  "rank": 2
                },
                {
                  "amt": 1,
                  "lvl": 14,
                  "rank": 2
                },
                {
                  "amt": 1,
                  "lvl": 15,
                  "rank": 2
                },
                {
                  "amt": 1,
                  "lvl": 16,
                  "rank": 2
                },
                {
                  "amt": 1,
                  "lvl": 17,
                  "rank": 2
                },
                {
                  "amt": 1,
                  "lvl": 18,
                  "rank": 2
                },
                {
                  "amt": 1,
                  "lvl": 19,
                  "rank": 2
                },
                {
                  "amt": 1,
                  "lvl": 20,
                  "rank": 2
                },
                {
                  "amt": 1,
                  "lvl": 8,
                  "rank": 3
                },
                {
                  "amt": 1,
                  "lvl": 9,
                  "rank": 3
                },
                {
                  "amt": 1,
                  "lvl": 10,
                  "rank": 3
                },
                {
                  "amt": 1,
                  "lvl": 11,
                  "rank": 3
                },
                {
                  "amt": 1,
                  "lvl": 12,
                  "rank": 3
                },
                {
                  "amt": 1,
                  "lvl": 13,
                  "rank": 3
                },
                {
                  "amt": 1,
                  "lvl": 14,
                  "rank": 3
                },
                {
                  "amt": 1,
                  "lvl": 15,
                  "rank": 3
                },
                {
                  "amt": 1,
                  "lvl": 16,
                  "rank": 3
                },
                {
                  "amt": 1,
                  "lvl": 17,
                  "rank": 3
                },
                {
                  "amt": 1,
                  "lvl": 18,
                  "rank": 3
                },
                {
                  "amt": 1,
                  "lvl": 19,
                  "rank": 3
                },
                {
                  "amt": 1,
                  "lvl": 20,
                  "rank": 3
                }
              ],
              "castingSource": "GELID_SHARD"
            },
            "type": "giveSpellSlot"
          }
        ],
        "description": "Your magical power grows as the shard's icy influence spreads ever deeper into your being. You gain the basic spellcasting benefits. Each time you gain a spell slot of a new rank from this archetype, add a spell of the appropriate spell rank (including heightened versions of lower-rank spells) to your repertoire, either a common spell of the arcane tradition that has the [cold](link_trait_1519) trait or another cold spell you have access to.",
        "availability": null,
        "requirements": "",
        "prerequisites": [
          "Gelid Shard Dedication"
        ],
        "content_source_id": 16
      }
    },
    {
      "table": "ability_block",
      "id": 51107,
      "name": "Snowstep",
      "type": "feat",
      "anchor": {
        "id": 51107,
        "cost": "",
        "name": "Snowstep",
        "type": "feat",
        "uuid": "2830746164812151",
        "level": 6,
        "access": "",
        "rarity": "COMMON",
        "traits": [
          3295
        ],
        "actions": null,
        "special": "",
        "trigger": "",
        "version": null,
        "frequency": "",
        "meta_data": {
          "source": {
            "url": "https://2e.aonprd.com/Feats.aspx?ID=8962",
            "book": "Treasure Vault",
            "page": "185"
          }
        },
        "created_at": "2025-12-05T22:46:03.136107+00:00",
        "operations": [],
        "description": "Snow and ice are no hindrance to you. You ignore difficult terrain caused by snow and ice, treat greater difficult terrain created by snow and ice as difficult terrain, and leave no tracks when moving through areas of snow or ice.",
        "availability": null,
        "requirements": "",
        "prerequisites": [
          "Gelid Shard Dedication"
        ],
        "content_source_id": 16
      }
    },
    {
      "table": "ability_block",
      "id": 51108,
      "name": "Frozen Breadth",
      "type": "feat",
      "anchor": {
        "id": 51108,
        "cost": "",
        "name": "Frozen Breadth",
        "type": "feat",
        "uuid": "9006994983744265",
        "level": 8,
        "access": "",
        "rarity": "COMMON",
        "traits": [
          3295
        ],
        "actions": null,
        "special": "",
        "trigger": "",
        "version": null,
        "frequency": "",
        "meta_data": {
          "source": {
            "url": "https://2e.aonprd.com/Feats.aspx?ID=8963",
            "book": "Treasure Vault",
            "page": "185"
          }
        },
        "created_at": "2025-12-05T22:46:04.297378+00:00",
        "operations": [
          {
            "id": "9bd13856-ddd5-4615-9227-d255a99c95dd",
            "data": {
              "slots": [
                {
                  "amt": 1,
                  "lvl": 8,
                  "rank": 1
                },
                {
                  "amt": 1,
                  "lvl": 9,
                  "rank": 1
                },
                {
                  "amt": 1,
                  "lvl": 10,
                  "rank": 1
                },
                {
                  "amt": 1,
                  "lvl": 11,
                  "rank": 1
                },
                {
                  "amt": 1,
                  "lvl": 12,
                  "rank": 1
                },
                {
                  "amt": 1,
                  "lvl": 13,
                  "rank": 1
                },
                {
                  "amt": 1,
                  "lvl": 14,
                  "rank": 1
                },
                {
                  "amt": 1,
                  "lvl": 15,
                  "rank": 1
                },
                {
                  "amt": 1,
                  "lvl": 16,
                  "rank": 1
                },
                {
                  "amt": 1,
                  "lvl": 17,
                  "rank": 1
                },
                {
                  "amt": 1,
                  "lvl": 18,
                  "rank": 1
                },
                {
                  "amt": 1,
                  "lvl": 19,
                  "rank": 1
                },
                {
                  "amt": 1,
                  "lvl": 20,
                  "rank": 1
                }
              ],
              "castingSource": "GELID_SHARD"
            },
            "type": "giveSpellSlot"
          },
          {
            "id": "819d29e3-d40d-4726-a8cc-31757e366b76",
            "data": {
              "conditions": [
                {
                  "id": "591248df-357f-4a77-a154-7ffc3f16b756",
                  "data": {
                    "name": "FEAT_NAMES",
                    "type": "list-str",
                    "value": []
                  },
                  "name": "FEAT_NAMES",
                  "type": "list-str",
                  "value": "expert snowcasting",
                  "operator": "INCLUDES"
                }
              ],
              "trueOperations": [
                {
                  "id": "cd85ef84-564d-4eb1-a84c-13a0c2e47428",
                  "data": {
                    "slots": [
                      {
                        "amt": 1,
                        "lvl": 12,
                        "rank": 2
                      },
                      {
                        "amt": 1,
                        "lvl": 14,
                        "rank": 3
                      },
                      {
                        "amt": 1,
                        "lvl": 16,
                        "rank": 4
                      },
                      {
                        "amt": 1,
                        "lvl": 13,
                        "rank": 2
                      },
                      {
                        "amt": 1,
                        "lvl": 14,
                        "rank": 2
                      },
                      {
                        "amt": 1,
                        "lvl": 15,
                        "rank": 2
                      },
                      {
                        "amt": 1,
                        "lvl": 16,
                        "rank": 2
                      },
                      {
                        "amt": 1,
                        "lvl": 17,
                        "rank": 2
                      },
                      {
                        "amt": 1,
                        "lvl": 18,
                        "rank": 2
                      },
                      {
                        "amt": 1,
                        "lvl": 15,
                        "rank": 3
                      },
                      {
                        "amt": 1,
                        "lvl": 16,
                        "rank": 3
                      },
                      {
                        "amt": 1,
                        "lvl": 17,
                        "rank": 3
                      },
                      {
                        "amt": 1,
                        "lvl": 18,
                        "rank": 3
                      },
                      {
                        "amt": 1,
                        "lvl": 19,
                        "rank": 2
                      },
                      {
                        "amt": 1,
                        "lvl": 20,
                        "rank": 2
                      },
                      {
                        "amt": 1,
                        "lvl": 19,
                        "rank": 3
                      },
                      {
                        "amt": 1,
                        "lvl": 20,
                        "rank": 3
                      },
                      {
                        "amt": 1,
                        "lvl": 17,
                        "rank": 4
                      },
                      {
                        "amt": 1,
                        "lvl": 18,
                        "rank": 4
                      },
                      {
                        "amt": 1,
                        "lvl": 19,
                        "rank": 4
                      },
                      {
                        "amt": 1,
                        "lvl": 20,
                        "rank": 4
                      }
                    ],
                    "castingSource": "GELID_SHARD"
                  },
                  "type": "giveSpellSlot"
                }
              ],
              "falseOperations": []
            },
            "type": "conditional"
          },
          {
            "id": "28fd2872-4546-4c24-bd2a-be805000baa9",
            "data": {
              "conditions": [
                {
                  "id": "a98f5783-f1ec-44a2-aaf7-95b431259834",
                  "data": {
                    "name": "FEAT_NAMES",
                    "type": "list-str",
                    "value": []
                  },
                  "name": "FEAT_NAMES",
                  "type": "list-str",
                  "value": "master snowcasting",
                  "operator": "INCLUDES"
                }
              ],
              "trueOperations": [
                {
                  "id": "9002602a-c21e-41ef-b5ce-80f9aba63b31",
                  "data": {
                    "slots": [
                      {
                        "amt": 1,
                        "lvl": 20,
                        "rank": 5
                      },
                      {
                        "amt": 1,
                        "lvl": 19,
                        "rank": 5
                      },
                      {
                        "amt": 1,
                        "lvl": 18,
                        "rank": 5
                      },
                      {
                        "amt": null,
                        "lvl": 19,
                        "rank": 6
                      },
                      {
                        "amt": 1,
                        "lvl": 20,
                        "rank": 6
                      }
                    ],
                    "castingSource": "GELID_SHARD"
                  },
                  "type": "giveSpellSlot"
                }
              ],
              "falseOperations": []
            },
            "type": "conditional"
          }
        ],
        "description": "Your attunement to arcane cold enhances the depths of your growing power. Increase the number of spells in your repertoire and number of spell slots you gain from gelid shard archetype feats by 1 for each spell rank other than your two highest gelid shard spell slots.",
        "availability": null,
        "requirements": "",
        "prerequisites": [
          "Snowcaster"
        ],
        "content_source_id": 16
      }
    },
    {
      "table": "ability_block",
      "id": 51109,
      "name": "Winter's Embrace",
      "type": "feat",
      "anchor": {
        "id": 51109,
        "cost": "",
        "name": "Winter's Embrace",
        "type": "feat",
        "uuid": "7855958191531541",
        "level": 10,
        "access": "",
        "rarity": "COMMON",
        "traits": [
          3295
        ],
        "actions": null,
        "special": "",
        "trigger": "",
        "version": null,
        "frequency": "",
        "meta_data": {
          "source": {
            "url": "https://2e.aonprd.com/Feats.aspx?ID=8964",
            "book": "Treasure Vault",
            "page": "185"
          }
        },
        "created_at": "2025-12-05T22:46:13.318871+00:00",
        "operations": [
          {
            "id": "60a9a015-4ad4-4965-923f-6f3b641d9d4c",
            "data": {
              "text": "against effects that inflict the dazzled condition",
              "type": "status",
              "value": "1",
              "variable": "SAVE_FORT"
            },
            "type": "addBonusToValue"
          },
          {
            "id": "1f4e7601-1977-41e0-b1c1-24cd2d44984a",
            "data": {
              "text": "against effects that inflict the dazzled condition",
              "type": "status",
              "value": "1",
              "variable": "SAVE_REFLEX"
            },
            "type": "addBonusToValue"
          },
          {
            "id": "e67f2657-43b9-4ced-b1e2-f6575366217d",
            "data": {
              "text": "against effects that inflict the dazzled condition",
              "type": "status",
              "value": "1",
              "variable": "SAVE_WILL"
            },
            "type": "addBonusToValue"
          }
        ],
        "description": "Your eyes are accustomed to the harsh glare of the sun on snow and ice. You gain a +1 status bonus to saving throws against effects that inflict the dazzled condition. Snow doesn't impair your vision; you ignore concealment from snowfall. Your skin becomes cold to the touch, and sometimes frost forms on you. You are protected from severe cold and heat.",
        "availability": null,
        "requirements": "",
        "prerequisites": [
          "Gelid Shard Dedication"
        ],
        "content_source_id": 16
      }
    },
    {
      "table": "ability_block",
      "id": 51110,
      "name": "Expert Snowcasting",
      "type": "feat",
      "anchor": {
        "id": 51110,
        "cost": "",
        "name": "Expert Snowcasting",
        "type": "feat",
        "uuid": "5785857052278010",
        "level": 12,
        "access": "",
        "rarity": "COMMON",
        "traits": [
          3295
        ],
        "actions": null,
        "special": "",
        "trigger": "",
        "version": null,
        "frequency": "",
        "meta_data": {
          "source": {
            "url": "https://2e.aonprd.com/Feats.aspx?ID=8965",
            "book": "Treasure Vault",
            "page": "185"
          }
        },
        "created_at": "2025-12-05T22:46:20.343096+00:00",
        "operations": [
          {
            "id": "20203efe-c08f-4319-9595-364c39b430c3",
            "data": {
              "slots": [
                {
                  "amt": 1,
                  "lvl": 12,
                  "rank": 4
                },
                {
                  "amt": 1,
                  "lvl": 13,
                  "rank": 4
                },
                {
                  "amt": 1,
                  "lvl": 14,
                  "rank": 4
                },
                {
                  "amt": 1,
                  "lvl": 15,
                  "rank": 4
                },
                {
                  "amt": 1,
                  "lvl": 16,
                  "rank": 4
                },
                {
                  "amt": 1,
                  "lvl": 17,
                  "rank": 4
                },
                {
                  "amt": 1,
                  "lvl": 18,
                  "rank": 4
                },
                {
                  "amt": 1,
                  "lvl": 19,
                  "rank": 4
                },
                {
                  "amt": 1,
                  "lvl": 20,
                  "rank": 4
                },
                {
                  "amt": 1,
                  "lvl": 14,
                  "rank": 5
                },
                {
                  "amt": 1,
                  "lvl": 15,
                  "rank": 5
                },
                {
                  "amt": 1,
                  "lvl": 16,
                  "rank": 5
                },
                {
                  "amt": 1,
                  "lvl": 17,
                  "rank": 5
                },
                {
                  "amt": 1,
                  "lvl": 18,
                  "rank": 5
                },
                {
                  "amt": 1,
                  "lvl": 19,
                  "rank": 5
                },
                {
                  "amt": 1,
                  "lvl": 20,
                  "rank": 5
                },
                {
                  "amt": 1,
                  "lvl": 16,
                  "rank": 6
                },
                {
                  "amt": 1,
                  "lvl": 17,
                  "rank": 6
                },
                {
                  "amt": 1,
                  "lvl": 18,
                  "rank": 6
                },
                {
                  "amt": 1,
                  "lvl": 19,
                  "rank": 6
                },
                {
                  "amt": 1,
                  "lvl": 20,
                  "rank": 6
                }
              ],
              "castingSource": "GELID_SHARD"
            },
            "type": "giveSpellSlot"
          },
          {
            "id": "72e5dcc7-fb39-47fe-9dd9-2dadaaef7b25",
            "data": {
              "value": {
                "value": "E"
              },
              "variable": "SPELL_ATTACK"
            },
            "type": "adjValue"
          },
          {
            "id": "cb21a288-7e3b-494c-a987-0c3ab66fffdb",
            "data": {
              "value": {
                "value": "E"
              },
              "variable": "SPELL_DC"
            },
            "type": "adjValue"
          }
        ],
        "description": "You draw ever more magical cold into your being, learning how to manipulate it to your whims. You gain the expert spellcasting benefits.",
        "availability": null,
        "requirements": "",
        "prerequisites": [
          "Snowcaster"
        ],
        "content_source_id": 16
      }
    },
    {
      "table": "ability_block",
      "id": 51111,
      "name": "Winter's Kiss",
      "type": "feat",
      "anchor": {
        "id": 51111,
        "cost": "",
        "name": "Winter's Kiss",
        "type": "feat",
        "uuid": "2502113980657498",
        "level": 14,
        "access": "",
        "rarity": "COMMON",
        "traits": [
          3295
        ],
        "actions": null,
        "special": "",
        "trigger": "",
        "version": null,
        "frequency": "",
        "meta_data": {
          "source": {
            "url": "https://2e.aonprd.com/Feats.aspx?ID=4102",
            "book": "Treasure Vault (Remastered)",
            "page": "185"
          }
        },
        "created_at": "2025-12-05T22:47:07.784364+00:00",
        "operations": [
          {
            "id": "174d1f63-c667-426b-8f34-690751fcbebe",
            "data": {
              "conditions": [
                {
                  "id": "a1c82e23-3f93-4fe3-ab5c-7b4c7fdbcd85",
                  "data": {
                    "name": "RESISTANCES",
                    "type": "list-str",
                    "value": []
                  },
                  "name": "RESISTANCES",
                  "type": "list-str",
                  "value": "fire, {{level/2}}",
                  "operator": "INCLUDES"
                }
              ],
              "trueOperations": [
                {
                  "id": "5a39d98e-ee5f-454d-a318-95fdf2a40864",
                  "data": {
                    "value": "fire, {{level}}",
                    "variable": "RESISTANCES"
                  },
                  "type": "adjValue"
                }
              ],
              "falseOperations": [
                {
                  "id": "1b05397e-dee5-43d2-8e41-5dc0e95c78c4",
                  "data": {
                    "value": "fire, {{level/2}}",
                    "variable": "RESISTANCES"
                  },
                  "type": "adjValue"
                }
              ],
              "contributionChecks": {
                "a1c82e23-3f93-4fe3-ab5c-7b4c7fdbcd85": {
                  "match": "typed-amount",
                  "categories": [
                    "heritage",
                    "ancestry-feat",
                    "class-feat",
                    "archetype-feat"
                  ],
                  "excludeCurrentContent": true
                }
              }
            },
            "type": "conditional"
          }
        ],
        "description": "Whether in the heart of a volcanic passageway or the glacial tundras of the Crown of the World, the only temperature you ever personally experience is an oddly comfortable chill. You are now protected from extreme cold and extreme heat, and you gain resistance to fire equal to half your level. If you would already have resistance to fire equal to half your level from a heritage, ancestry feat, class feat, or another archetype feat, you instead gain resistance to fire equal to your level.",
        "availability": null,
        "requirements": "",
        "prerequisites": [
          "Winter's Embrace"
        ],
        "content_source_id": 16
      }
    },
    {
      "table": "ability_block",
      "id": 51112,
      "name": "Greater Snow Step",
      "type": "feat",
      "anchor": {
        "id": 51112,
        "cost": "",
        "name": "Greater Snow Step",
        "type": "feat",
        "uuid": "6517547399278009",
        "level": 16,
        "access": "",
        "rarity": "COMMON",
        "traits": [
          3295
        ],
        "actions": null,
        "special": "",
        "trigger": "",
        "version": null,
        "frequency": "",
        "meta_data": {
          "source": {
            "url": "https://2e.aonprd.com/Feats.aspx?ID=8967",
            "book": "Treasure Vault",
            "page": "185"
          }
        },
        "created_at": "2025-12-05T22:47:09.079293+00:00",
        "operations": [],
        "description": "You can't be impeded by environmental effects that rely on cold or its byproducts. You ignore greater difficult terrain caused by snow and ice.",
        "availability": null,
        "requirements": "",
        "prerequisites": [
          "Snowstep"
        ],
        "content_source_id": 16
      }
    },
    {
      "table": "ability_block",
      "id": 51113,
      "name": "Master Snowcasting",
      "type": "feat",
      "anchor": {
        "id": 51113,
        "cost": "",
        "name": "Master Snowcasting",
        "type": "feat",
        "uuid": "1414636698071430",
        "level": 18,
        "access": "",
        "rarity": "COMMON",
        "traits": [
          3295
        ],
        "actions": null,
        "special": "",
        "trigger": "",
        "version": null,
        "frequency": "",
        "meta_data": {
          "source": {
            "url": "https://2e.aonprd.com/Feats.aspx?ID=8968",
            "book": "Treasure Vault",
            "page": "185"
          }
        },
        "created_at": "2025-12-05T22:47:11.99227+00:00",
        "operations": [
          {
            "id": "f6152d41-19ef-443d-a95b-e12fac9fb2ab",
            "data": {
              "value": {
                "value": "M"
              },
              "variable": "SPELL_ATTACK"
            },
            "type": "adjValue"
          },
          {
            "id": "7daf6c4c-2bf2-4da9-ad68-fdd7b7dd293f",
            "data": {
              "value": {
                "value": "M"
              },
              "variable": "SPELL_DC"
            },
            "type": "adjValue"
          },
          {
            "id": "75bd7f06-f814-431f-8243-acd3e3d3be42",
            "data": {
              "slots": [
                {
                  "amt": 1,
                  "lvl": 20,
                  "rank": 8
                },
                {
                  "amt": 1,
                  "lvl": 20,
                  "rank": 7
                },
                {
                  "amt": 1,
                  "lvl": 19,
                  "rank": 7
                },
                {
                  "amt": 1,
                  "lvl": 18,
                  "rank": 7
                }
              ],
              "castingSource": "GELID_SHARD"
            },
            "type": "giveSpellSlot"
          }
        ],
        "description": "You have unlocked the deeper magic of your gelid shard, gaining access to new levels of spells. You gain the [master spellcasting](link_feat_22553) benefits.",
        "availability": null,
        "requirements": "",
        "prerequisites": [
          "Expert Snowcasting"
        ],
        "content_source_id": 16
      }
    },
    {
      "table": "ability_block",
      "id": 51114,
      "name": "Icy Apotheosis",
      "type": "feat",
      "anchor": {
        "id": 51114,
        "cost": "",
        "name": "Icy Apotheosis",
        "type": "feat",
        "uuid": "5945111591002278",
        "level": 20,
        "access": "",
        "rarity": "COMMON",
        "traits": [
          3295
        ],
        "actions": null,
        "special": "",
        "trigger": "",
        "version": null,
        "frequency": "",
        "meta_data": {
          "source": {
            "url": "https://2e.aonprd.com/Feats.aspx?ID=8969",
            "book": "Treasure Vault",
            "page": "185"
          }
        },
        "created_at": "2025-12-05T22:47:13.708048+00:00",
        "operations": [
          {
            "id": "25cf98f0-c253-40cc-9d39-de369b840c1b",
            "data": {
              "text": "You automatically succeed against effects that have the cold trait.",
              "variable": "SAVE_FORT"
            },
            "type": "addBonusToValue"
          },
          {
            "id": "5503ef71-3260-4bd7-bf35-3b34155519ec",
            "data": {
              "text": "You automatically succeed against effects that have the cold trait.",
              "variable": "SAVE_REFLEX"
            },
            "type": "addBonusToValue"
          },
          {
            "id": "c224d0bb-a51a-4aa8-9a69-4fb6c6681bb0",
            "data": {
              "text": "You automatically succeed against effects that have the cold trait.",
              "variable": "SAVE_WILL"
            },
            "type": "addBonusToValue"
          },
          {
            "id": "d81bc382-96c5-4c1d-94ca-10b0d8242a3f",
            "data": {
              "value": "cold",
              "variable": "IMMUNITIES"
            },
            "type": "adjValue"
          },
          {
            "id": "5948b9cb-c16a-401c-a46a-03265651499d",
            "data": {
              "traitId": 1519
            },
            "type": "giveTrait"
          }
        ],
        "description": "You are as much a creature of cold as whatever ancestry you were born to. You are immune to cold damage and gain the [cold](link_trait_1519) trait. You automatically succeed on saving throws against effects that have the cold trait.",
        "availability": null,
        "requirements": "",
        "prerequisites": [
          "Gelid Shard Dedication"
        ],
        "content_source_id": 16
      }
    },
    {
      "table": "spell",
      "id": 4636,
      "name": "Frostbite",
      "type": "spell",
      "anchor": {
        "id": 4636,
        "area": null,
        "cast": "TWO-ACTIONS",
        "cost": "",
        "name": "Frostbite",
        "rank": 0,
        "uuid": "6666610303869653",
        "range": "60 feet",
        "rarity": "COMMON",
        "traits": [
          1858,
          1519,
          1432,
          1433
        ],
        "defense": "basic Fortitude",
        "targets": "1 creature",
        "trigger": null,
        "version": "1.0",
        "duration": "",
        "meta_data": {
          "damage": [],
          "source": {
            "url": "https://2e.aonprd.com/Spells.aspx?ID=1539",
            "book": "Player Core",
            "page": "332"
          },
          "foundry": {
            "rules": [],
            "is_focus": false
          }
        },
        "created_at": "2024-03-23T20:37:32.597975+00:00",
        "heightened": {
          "data": {
            "type": "interval",
            "damage": {
              "3bsJUDEgedKhPx6T": "1d4"
            },
            "interval": 1
          },
          "text": [
            {
              "text": "The damage increases by 1d4 and the weakness on a critical failure increases by 1.",
              "amount": "(+1)"
            }
          ]
        },
        "traditions": [
          "arcane",
          "primal"
        ],
        "description": "An orb of biting cold coalesces around your target, freezing its body. The target takes 2d4 (⬆️{{ceil(level/2)+1}}d4) [cold](link_trait_1519) damage with a basic Fortitude save. On a critical failure, the target also gains weakness 1 (⬆️{{ceil(level/2)}}) to bludgeoning until the start of your next turn.",
        "availability": null,
        "requirements": null,
        "content_source_id": 3
      }
    },
    {
      "table": "spell",
      "id": 5829,
      "name": "Frost's Touch",
      "type": "spell",
      "anchor": {
        "id": 5829,
        "area": "",
        "cast": "ONE-ACTION",
        "cost": "",
        "name": "Frost's Touch",
        "rank": 0,
        "uuid": "971139597583762",
        "range": "30 feet",
        "rarity": "RARE",
        "traits": [
          1459,
          1858,
          1519
        ],
        "defense": "",
        "targets": "1 object",
        "trigger": "",
        "version": "1.0",
        "duration": "",
        "meta_data": {
          "source": {
            "url": "https://2e.aonprd.com/Spells.aspx?ID=2619",
            "book": "Treasure Vault",
            "page": "185"
          }
        },
        "created_at": "2024-05-06T10:31:19.048838+00:00",
        "heightened": {
          "data": {},
          "text": [
            {
              "text": "You can create simple objects of ice with up to 1 Bulk and of a level not exceeding 1. Such objects must be rigid. You can only have one such object created at a time; if you create another, the previous object melts instantly.",
              "amount": "(3rd)"
            },
            {
              "text": "Items you create can be up to 4 Bulk and 4th level.",
              "amount": "(5th)"
            },
            {
              "text": "Items you create can be up to 8 Bulk and 8th level.",
              "amount": "(7th)"
            },
            {
              "text": "Items you create can be up to 20 Bulk and 12th level.",
              "amount": "(9th)"
            }
          ]
        },
        "traditions": [],
        "description": "Your [_gelid shard_](link_item_12041) drinks down nearby heat in a futile attempt to sate itself and achieve a level of frigid cold unheard of on the Material Plane. This allows you to cool a drink, make a hot pot safe to handle, or other, similar minor effects. Once cooled, the object's temperature is subject to its environment as usual. You can also solidify ambient moisture into a solid object; this temporary object is of negligible Bulk, made of non-magical ice. The object looks crude and artificial and is extremely fragile—it can't be used as a tool, weapon, or spell component. Once created, it melts as normal for ice for the ambient conditions.",
        "availability": null,
        "requirements": "",
        "content_source_id": 16
      }
    },
    {
      "table": "trait",
      "id": 1432,
      "name": "Concentrate",
      "type": "trait",
      "anchor": {
        "id": 1432,
        "name": "Concentrate",
        "uuid": "3011511166869167",
        "meta_data": {
          "source": {
            "url": "https://2e.aonprd.com/Traits.aspx?ID=561",
            "book": "Player Core",
            "page": "454"
          }
        },
        "created_at": "2023-12-02T22:32:54.192399+00:00",
        "description": "An action with this trait requires a degree of mental concentration and discipline to perform.",
        "content_source_id": 3
      }
    },
    {
      "table": "trait",
      "id": 1433,
      "name": "Manipulate",
      "type": "trait",
      "anchor": {
        "id": 1433,
        "name": "Manipulate",
        "uuid": "2971108648217689",
        "meta_data": {
          "source": {
            "url": "https://2e.aonprd.com/Traits.aspx?ID=645",
            "book": "Player Core",
            "page": "458"
          },
          "important": true,
          "class_trait": false,
          "unselectable": false,
          "ancestry_trait": false,
          "creature_trait": false
        },
        "created_at": "2023-12-02T22:32:55.850689+00:00",
        "description": "You must physically manipulate an item or make gestures to use an action with this trait. Creatures without a suitable appendage can’t perform actions with this trait. Manipulate actions often trigger reactions.",
        "content_source_id": 3
      }
    },
    {
      "table": "trait",
      "id": 1445,
      "name": "Dedication",
      "type": "trait",
      "anchor": {
        "id": 1445,
        "name": "Dedication",
        "uuid": "5613420393776712",
        "meta_data": {
          "source": {
            "url": "https://2e.aonprd.com/Traits.aspx?ID=572",
            "book": "Player Core",
            "page": "215"
          },
          "important": false,
          "class_trait": false,
          "unselectable": false,
          "ancestry_trait": false,
          "creature_trait": false,
          "archetype_trait": false,
          "versatile_heritage_trait": false
        },
        "created_at": "2023-12-02T22:33:57.426393+00:00",
        "description": "Each archetype’s dedication feat represents your character’s dedicated effort learning a new set of abilities, making it impossible to split your focus and pursue another archetype at the same time. Once you take a dedication feat, you can’t select a different dedication feat until you complete your dedication by taking two other feats from your current archetype. You can’t retrain a dedication feat as long as you have any other feats from that archetype.",
        "content_source_id": 3
      }
    },
    {
      "table": "trait",
      "id": 1448,
      "name": "Mental",
      "type": "trait",
      "anchor": {
        "id": 1448,
        "name": "Mental",
        "uuid": "3793398752936386",
        "meta_data": {
          "source": {
            "url": "https://2e.aonprd.com/Traits.aspx?ID=647",
            "book": "Player Core",
            "page": "458"
          },
          "important": true,
          "class_trait": false,
          "unselectable": false,
          "ancestry_trait": false,
          "creature_trait": true,
          "archetype_trait": false,
          "versatile_heritage_trait": false
        },
        "created_at": "2023-12-02T22:34:10.831185+00:00",
        "description": "A mental effect can alter the target’s mind. It has no effect on an object or a [mindless](link_trait_2411) creature.",
        "content_source_id": 3
      }
    },
    {
      "table": "trait",
      "id": 1459,
      "name": "Arcane",
      "type": "trait",
      "anchor": {
        "id": 1459,
        "name": "Arcane",
        "uuid": "2175258629482839",
        "meta_data": {
          "source": {
            "url": "https://2e.aonprd.com/Traits.aspx?ID=534",
            "book": "Player Core",
            "page": "452"
          },
          "important": false,
          "class_trait": false,
          "unselectable": false,
          "ancestry_trait": false,
          "creature_trait": true,
          "archetype_trait": false,
          "versatile_heritage_trait": false
        },
        "created_at": "2023-12-02T22:34:52.061274+00:00",
        "description": "This magic comes from the arcane tradition, which is built on logic and rationality. Anything with this trait is [magical](link_trait_1504).",
        "content_source_id": 3
      }
    },
    {
      "table": "trait",
      "id": 1469,
      "name": "Auditory",
      "type": "trait",
      "anchor": {
        "id": 1469,
        "name": "Auditory",
        "uuid": "6475190443898764",
        "meta_data": {
          "source": {
            "url": "https://2e.aonprd.com/Traits.aspx?ID=541",
            "book": "Player Core",
            "page": "453"
          },
          "important": true,
          "class_trait": false,
          "unselectable": false,
          "ancestry_trait": false,
          "creature_trait": false,
          "archetype_trait": false,
          "companion_type_trait": false,
          "versatile_heritage_trait": false
        },
        "created_at": "2023-12-02T22:36:54.899421+00:00",
        "description": "Auditory actions and effects rely on sound. An action with the auditory trait can be successfully performed only if the creature using the action can speak or otherwise produce the required sounds. A spell or effect with the auditory trait has its effect only if the target can hear it. This applies only to sound-based parts of the effect, as determined by the GM. This is different from a [sonic](link_trait_1484) effect, which still affects targets who can’t hear it (such as deaf targets) as long as the effect itself makes sound.",
        "content_source_id": 3
      }
    },
    {
      "table": "trait",
      "id": 1486,
      "name": "Emotion",
      "type": "trait",
      "anchor": {
        "id": 1486,
        "name": "Emotion",
        "uuid": "3036864546165598",
        "meta_data": {
          "source": {
            "url": "https://2e.aonprd.com/Traits.aspx?ID=590",
            "book": "Player Core",
            "page": "455"
          },
          "important": true,
          "class_trait": false,
          "unselectable": false,
          "ancestry_trait": false,
          "creature_trait": false,
          "archetype_trait": false,
          "versatile_heritage_trait": false
        },
        "created_at": "2023-12-02T22:40:26.472081+00:00",
        "description": "This effect alters a creature’s emotions. Effects with this trait always have the [mental](link_trait_1448) trait as well. Creatures with special training or that have mechanical or artificial intelligence are immune to emotion effects.",
        "content_source_id": 3
      }
    },
    {
      "table": "trait",
      "id": 1519,
      "name": "Cold",
      "type": "trait",
      "anchor": {
        "id": 1519,
        "name": "Cold",
        "uuid": "196418167509",
        "meta_data": {
          "source": {
            "url": "https://2e.aonprd.com/Traits.aspx?ID=555",
            "book": "Player Core",
            "page": "454"
          },
          "important": false,
          "class_trait": false,
          "unselectable": false,
          "ancestry_trait": false,
          "creature_trait": true,
          "archetype_trait": false,
          "companion_type_trait": false,
          "versatile_heritage_trait": false
        },
        "created_at": "2023-12-02T23:27:36.874355+00:00",
        "description": "Effects with this trait deal cold damage. Creatures with this trait have a connection to [magical](link_trait_1504) cold.",
        "content_source_id": 3
      }
    },
    {
      "table": "trait",
      "id": 1527,
      "name": "Invested",
      "type": "trait",
      "anchor": {
        "id": 1527,
        "name": "Invested",
        "uuid": "370388764978504",
        "meta_data": {
          "source": {
            "url": "https://2e.aonprd.com/Traits.aspx?ID=637",
            "book": "GM Core",
            "page": "219"
          },
          "important": true,
          "class_trait": false,
          "unselectable": false,
          "ancestry_trait": false,
          "creature_trait": false,
          "archetype_trait": false,
          "companion_type_trait": false,
          "versatile_heritage_trait": false
        },
        "created_at": "2023-12-03T18:49:32.887981+00:00",
        "description": "A character can [invest](link_action_20775) only 10 magical items that have the invested trait. None of the [magical](link_trait_1504) effects of the item apply if the character hasn’t invested it, nor can it be activated, though the character still gains any normal benefits from wearing the physical item (like a hat keeping rain off their head).",
        "content_source_id": 3
      }
    },
    {
      "table": "trait",
      "id": 1568,
      "name": "Artifact",
      "type": "trait",
      "anchor": {
        "id": 1568,
        "name": "Artifact",
        "uuid": "484734232108207",
        "meta_data": {
          "source": {
            "url": "https://2e.aonprd.com/Traits.aspx?ID=537",
            "book": "GM Core",
            "page": "300"
          }
        },
        "created_at": "2023-12-03T18:52:40.614916+00:00",
        "description": "Items with this trait are artifacts. These magic items can’t be crafted by normal means, and they can’t be damaged by normal means. Artifacts are always rare or unique.",
        "content_source_id": 3
      }
    },
    {
      "table": "trait",
      "id": 1858,
      "name": "Cantrip",
      "type": "trait",
      "anchor": {
        "id": 1858,
        "name": "Cantrip",
        "uuid": "7837841754363754",
        "meta_data": null,
        "created_at": "2023-12-13T08:04:05.408784+00:00",
        "description": "A spell you can cast at will that is automatically heightened to half your level rounded up.",
        "content_source_id": 3
      }
    },
    {
      "table": "trait",
      "id": 3295,
      "name": "Gelid Shard Archetype",
      "type": "trait",
      "anchor": {
        "id": 3295,
        "name": "Gelid Shard Archetype",
        "uuid": "1200181923993124",
        "meta_data": {
          "archetype_trait": true
        },
        "created_at": "2024-05-10T15:58:26.399528+00:00",
        "description": "This indicates content from the gelid shard archetype.",
        "content_source_id": 16
      }
    },
    {
      "table": "trait",
      "id": 3460,
      "name": "Relic",
      "type": "trait",
      "anchor": {
        "id": 3460,
        "name": "Relic",
        "uuid": "2735161210254535",
        "meta_data": {
          "important": false,
          "class_trait": false,
          "unselectable": false,
          "ancestry_trait": false,
          "creature_trait": false,
          "archetype_trait": false,
          "versatile_heritage_trait": false
        },
        "created_at": "2024-06-04T00:08:05.490005+00:00",
        "description": "Some extraordinary magic items grow in power along with a character, gaining abilities that add to an adventurer's legend. These are called relics, and owning one can define a character more than any other magic item.\n\nRelics begin as a simple item, called a relic seed, which is little more than a functional item with a minor magical effect associated with it. As the owner of the relic grows in power, so does the relic. It develops gifts, which are new magical abilities and activations. These abilities might be themed to the relic, the character, or the nature of the campaign. If a relic is passed to another character, this process begins anew, sometimes granting the same abilities again over time, but possibly unlocking entirely new powers. If someone else takes the relic from its owner, it usually works for a while, though it might lose its power incrementally over time if not returned to its owner. How the relic changes in such a circumstance is up to you and should fit the story.\n\nThe decision to add relics to the game is entirely up to you as the GM. If you decide to add them, you'll need to adjust treasure somewhat. It's also wise to consider how many players you expect to end up with relics. Will they each get one? Or will there be just one or two tied to the theme of the campaign?\n\nDiscovering a Relic\n-------------------\n\nSome relics might begin as ordinary items with a rich history. They might be part of a character's starting gear, only to have their true powers uncovered later during play. Other relics can be acquired during play as part of the ongoing story. Regardless of their origin, these powerful items might not appear to be much at first, but they contain the potential to become something truly great.\n\nFor example, an old, tarnished amulet found around the neck of a buried king might turn out to be an item of deep historical significance that awakens to great power. The seemingly ordinary family sword, passed down to each new generation, might unlock hidden potential through the deeds of its owner.\n\nThe PCs might immediately recognize a relic for its ability, or they might carry it for a time before its true nature becomes apparent. The story of a relic should be a tale of discovery. At first, a relic's wielder likely doesn't fully understand the item's power, or might be unable to use it, learning of its abilities only after a momentous event or fortuitous breakthrough. Ultimately, relics are powerful tools in service of the story, working as a valuable tie to the narrative, but their growth and development are in your hands. Because of the place relics hold in the story, they aren't available for purchase, nor can they be crafted.\n\nPay attention to the characters' backstories for potential relics, and look for spots in your narrative that might be suitable for campaign relics. If you're planning to use relics in your game, let the players know in advance, since their ideas and plans can guide you and give them greater investment in the relics.\n\n### Background Relics\n\nA background relic is tied to the history of a character, and its form and abilities should draw inspiration from the story of their character’s life or the past of the item. The relic could be a gift from a friend or mentor, an heirloom from the character’s family, a found object from their upbringing, or even the first item they ever crafted. The player should select the form of the relic (a battered longsword, a copper ring, or a threadbare red cloak, for example).\n\n### Campaign Relics\n\nA campaign relic is drawn from the ongoing story of the campaign. You decide the entirety of the item, from its form to its aspects (described below) as part of the story of the campaign. Use campaign relics to reinforce and foreshadow the themes of your game. Relics come to those who need them to do great deeds, after all, so finding a relic with the perfect aspects for your future challenges is entirely likely. Unlike background relics, campaign relics typically have magical abilities when first found.\n\n#### Relic Aspects\n\nEach relic is associated with aspects—typically two—that speak to its overall concept and purpose. The individual gifts each have an associated aspect. You should almost always select gifts that have an aspect matching one of those found on the relic. For example, a brass dagger recovered from the Medina Mudii'a might have the [fire](link_trait_3491) and [mind](link_trait_3497) aspects, which means that it could have the [flare bolt](link_feat_29523) gift (which has the [fire aspect](link_trait_3491)), but not the [rolling geode](link_feat_29506) gift (which has the [earth aspect](link_trait_3488)).\n\nUsually, you can determine at least one aspect of a relic easily by looking at the history of the item or personality of the character. For example, if a player decides that their background relic is a rusty mace wielded by the character's great grandmother in battle against rising undead hordes, the mace might have the [life aspect](link_trait_3494), as it was used to slay countless undead creatures. There's no harm in letting the player choose an aspect for a background relic; through play, the item will reveal another aspect associated with it. In the previous example, the mace might reveal itself to have powers against demons as well, in which case its aspects might be celestial and life.\n\n**Advancing a Relic**\n\nAs a relic's bearer performs mighty deeds and advances their story, the relic gets stronger. The most basic advancement for a relic is its level, which always matches that of its owner. Weapons and armor can gain fundamental runes normally. You decide what, if any, property runes can be added to a given relic; by default, they can't have property runes, like any other specific item.\n\nThe more complex advancement comes from gifts. The Relic Gifts table shows the typical number of gifts a relic should have at a given level, but relics don't follow this strictly. Rather, gifts arise according to the pace of the story, the needs of the campaign, and the relationship between the character and the relic. Generally speaking, this results in a relic gaining one gift for every 4 levels its bearer has, but this might fluctuate as the campaign progresses. For example, a relic might gain its first gift at 4th level after the bearer defeats a powerful foe. It might then gain its second at 7th, after they perform a special ritual. That same relic might not gain another gift until 13th level and then again at 16th as the player reaches other major milestones.\n\nThe gift types—[minor](link_trait_3479), [major](link_trait_3480), and [grand](link_trait_3481)—indicate their general power level. Again, the table indicates what's generally appropriate at certain levels, but you can alter them as you see fit. You should usually avoid giving a [minor gift](link_trait_3479) at 10th level or higher, because it just won't be that impressive, though some of them scale well enough to be interesting at higher levels. The Gold Piece Equivalent entry for each gift helps you determine how much you should reduce treasure when using relics (see Adjusting Treasure below).\n\n**Table 2–22: Relic Gifts**\n\n| Number of Gifts | Minimum Level | Gift Type | Gold Piece Equivalent |\n\n|---|---|---|---|\n\n| 1 | 1st | Minor | 20 gp |\n\n| 2 | 5th | Minor | 160 gp |\n\n| 3 | 9th | Major | 700 gp |\n\n| 4 | 13th | Major | 3,000 gp |\n\n| 5 | 17th | Grand | 15,000 gp |\n\nYou decide what gifts a relic gains, generally by either selecting a single gift or offering two paths for the relic to grow and allowing the player to choose, but this should be informed by the story and the nature of the character bearing the relic. A relic should complement the bearer, bolstering the bearer's strengths and helping to overcome their weaknesses. Within that framework, you should try to maintain a cohesive theme for the relic.\n\n**Adjusting Treasure**\n\nWhen you incorporate relics into your game, you can adjust the treasure gained by the party down to account for the relics increasing in power. Essentially, some of the treasure from the Party Treasure by Level table on page 59 should be replaced with relic seeds and gifts instead. You can use the relic's minimum level, replacing a permanent item of that level, or you can use the gp equivalent. Keep in mind that relic gifts are often a little more powerful than other items with the same Price even when they start out, and they often scale without any additional costs, so PCs with relics will usually be a bit more powerful.\n\nIf you prefer, you can grant relics in addition to other rewards. This means PCs will be much more powerful, but you're rewarding their investment in the story.\n\n**Making Relic Seeds**\n\nA relic seed can be quite simple: imagine a standard item with two aspects and an appearance that matches the theme. You can also use an existing magic item for a campaign relic; pick two aspects for it, and tweak its appearance or characteristics to make it clearly different from other items of its type. You can choose a tradition for the seed and apply that trait to the seed and all the gifts of the seed. This tradition might be derived from the background of the item, or it might appear or change through story moments involving the relic.\n\nIf you want a relic to have an additional special benefit, you can design it to grant a bonus to a skill, typically a +1 item bonus for a 3rd-level relic.\n\n**Relic Gifts**\n\nGifts are divided up into three tiers. [Minor gifts](link_trait_3479) grant useful, often scaling abilities and are available early in a character's career. [Major gifts](link_trait_3480) define a relic, determining its true purpose and granting powerful abilities. [Grand gifts](link_trait_3481) are the pinnacle of power, and most relics never have more than one.\n\nThe more gifts there are of one aspect, the more the relic reflects that aspect, and the more influence the aspect has on the character who wields it. An item with multiple [shadow](link_trait_3499) gifts might begin to lose its color. With four or five, the character that wields it might take on an ashen tone and the relic might become entirely made of shadow.\n\n**Gift Saves and Spell Attack Modifiers**\n\nMany gifts allow for a saving throw or have other abilities that change as the relic goes up in level. The DC for any saving throw called for by a gift is the higher of its owner’s class DC or spell DC. The spell attack modifier of a gift is 10 lower than that DC. A relic’s counteract modifier is equal to its owner’s counteract modifier.\n\n> ### Player-Driven Relics\n> \n> Though these rules assume you as the GM are providing relic gifts as a form of treasure with input from the players, you can instead have the players make all the decisions for their relics. Encourage the players to choose different styles of items and aspects to match their characters' themes, rather than simply choosing the most powerful combination of options. Have players describe how their relic gets more powerful in the story. What acts from previous sessions lent the relic power? What special meditations or practices did they perform to unlock new gifts? How does it feel to have the relic grow?\n> \n> As the item and the character level up, the player chooses which gifts the item gets from the list as a part of character advancement. You still adjust treasure as normal for incorporating relics into your game. In fact, if the player tries to optimize the combinations, they will likely be more powerful than under the standard method\n> \n> ### Runes as Gifts\n> \n> You can substitute runes for gifts. If you choose to allow property runes on the relic, you'll want them to take up rune slots. Otherwise, you can give as many or few as you prefer, just like any other gifts. Runes are sorted into [minor](link_trait_3479), [major](link_trait_3480), and [grand](link_trait_3481) categories, but you should use their normal level and Price when you adjust treasure, instead of the number and levels on the Relic Gifts table. If you're using the player-driven relics variant, it's recommended you do not include this option.\n> \n> #### [Air](link_trait_3482)\n> \n> Armor ([Major](link_trait_3480)) [energy-resistant](link_item_6927) or [greater energy resistant](link_item_6926) (cold or electricity), [invisibility](link_item_7052); Armor ([Grand](link_trait_3481)) [winged](link_item_7958)\n> \n> Weapon ([Minor](link_trait_3479)) [returning](link_item_7708); Weapon ([Major](link_trait_3480)) [animated](link_item_6703), [shock](link_item_7761), [thundering](link_item_7890); Weapon ([Grand](link_trait_3481)) [greater shock](link_item_7760), [greater thundering](link_item_7889)\n> \n> #### [Celestial](link_trait_3485)\n> \n> Weapon ([Major](link_trait_3480)) [holy](link_item_7040)\n> \n> #### [Death](link_trait_3486)\n> \n> Weapon ([Minor](link_trait_3479)) [ghost touch](link_item_6992), [wounding](link_item_7962)\n> \n> #### [Earth](link_trait_3488)\n> \n> Armor ([Minor](link_trait_3479)) [energy-resistant](link_item_6927) or [greater energy resistant](link_item_6926) (acid); Armor ([Major](link_trait_3480)) [fortification](link_item_6974); Armor ([Grand](link_trait_3481)) [greater fortification](link_item_6973)\n> \n> Weapon ([Minor](link_trait_3479)) [shifting](link_item_7755)\n> \n> #### [Fiend](link_trait_3490)\n> \n> Armor ([Minor](link_trait_3479)) [energy-resistant](link_item_6927) or [greater energy resistant](link_item_6926) (acid, cold, or fire)\n> \n> Weapon ([Major](link_trait_3480)) [unholy](link_item_7911)\n> \n> #### [Fire](link_trait_3491)\n> \n> Armor ([Minor](link_trait_3479)) [energy-resistant](link_item_6927) or [greater energy resistant](link_item_6926) (fire)\n> \n> Weapon ([Minor](link_trait_3479)) [flaming](link_item_6961); Weapon ([Major](link_trait_3480)) [greater flaming](link_item_6960)\n> \n> #### [Life](link_trait_3494)\n> \n> Weapon ([Minor](link_trait_3479)) [vitalizing](link_item_7920); Weapon ([Major](link_trait_3480)) [greater vitalizing](link_item_7919)\n> \n> #### [Mind](link_trait_3497)\n> \n> Armor ([Minor](link_trait_3479)) [raiment](link_item_7683); Armor ([Major](link_trait_3480)) [invisibility](link_item_7052)\n> \n> #### [Plant](link_trait_3498)\n> \n> Weapon ([Minor](link_trait_3479)) [shifting](link_item_7755)\n> \n> #### [Shadow](link_trait_3499)\n> \n> Armor ([Minor](link_trait_3479)) [shadow](link_item_7751); Armor ([Major](link_trait_3480)) [greater shadow](link_item_7748);\n> \n> Armor ([Grand](link_trait_3481)) [major shadow](link_item_7749)\n> \n> #### [Water](link_trait_3502)\n> \n> Armor ([Minor](link_trait_3479)) [energy-resistant](link_item_6927) or [greater energy resistant](link_item_6926) (cold or fire), [slick](link_item_7784); Armor ([Major](link_trait_3480)) [greater](link_item_7782) or [major slick](link_item_7783)\n> \n> Weapon ([Minor](link_trait_3479)) [shifting](link_item_7755)",
        "content_source_id": 7
      }
    },
    {
      "table": "trait",
      "id": 3479,
      "name": "Minor Gift",
      "type": "trait",
      "anchor": {
        "id": 3479,
        "name": "Minor Gift",
        "uuid": "1932552509696843",
        "meta_data": {
          "important": false,
          "class_trait": false,
          "unselectable": false,
          "ancestry_trait": false,
          "creature_trait": false,
          "archetype_trait": false,
          "versatile_heritage_trait": false
        },
        "created_at": "2024-06-09T06:07:21.367147+00:00",
        "description": "Relic advancement comes from gifts. The gift types indicate their general power level. This trait identifies a [Minor Gift](link_feat_34194) type.",
        "content_source_id": 7
      }
    },
    {
      "table": "trait",
      "id": 3480,
      "name": "Major Gift",
      "type": "trait",
      "anchor": {
        "id": 3480,
        "name": "Major Gift",
        "uuid": "6327511303319062",
        "meta_data": {
          "important": false,
          "class_trait": false,
          "unselectable": false,
          "ancestry_trait": false,
          "creature_trait": false,
          "archetype_trait": false,
          "versatile_heritage_trait": false
        },
        "created_at": "2024-06-09T06:07:53.309877+00:00",
        "description": "Relic advancement comes from gifts. The gift types indicate their general power level. This trait identifies a [Major Gift](link_feat_34195) type.",
        "content_source_id": 7
      }
    },
    {
      "table": "trait",
      "id": 3489,
      "name": "Aspect Emotion",
      "type": "trait",
      "anchor": {
        "id": 3489,
        "name": "Aspect Emotion",
        "uuid": "4222561294876350",
        "meta_data": {
          "important": false,
          "class_trait": false,
          "unselectable": false,
          "ancestry_trait": false,
          "creature_trait": false,
          "archetype_trait": false,
          "versatile_heritage_trait": false
        },
        "created_at": "2024-06-09T06:12:40.691173+00:00",
        "description": "Relics are associated with aspects that speak to its overall concept and purpose. The [individual gifts](link_feat_34210) each have an associated aspect. This trait identifies an association to the Emotion aspect.",
        "content_source_id": 16
      }
    }
  ],
  "sources": [
    {
      "id": 3,
      "name": "Common Core"
    },
    {
      "id": 7,
      "name": "GM Core"
    },
    {
      "id": 13,
      "name": "Secrets of Magic (in progress)"
    },
    {
      "id": 16,
      "name": "Treasure Vault"
    }
  ],
  "ownership": "Only two existing operations arrays and one existing archetype dedication pointer. Saved inventory, selections, other operations, identities, prose, metadata, traits and source counters are unchanged.",
  "boundaries": {
    "stowed": "Printed archetype artifacts cannot be removed or uninvested normally. Current usage other models an invested heart-embedded artifact, not ordinary worn gear. A contradictory invested-and-container flag retains existing passive benefits and artifact access; no generic container eligibility is changed.",
    "saved_old": "Canonical changes never rewrite saved item graphs. An existing copy retains its old graph and requires explicit manual content update to acquire this marker.",
    "source_off": "Saved invested item effects continue; new book feat selections disappear when source16 is disabled.",
    "artifact_limit": "Only-one-archetype-artifact and destruction/retraining remain manual rules, not new state or global dedication rules.",
    "first_frost": "Never free-granted by the item; the player must spend and select the level2 archetype feat."
  }
}
$artifact097$::jsonb;
  patch jsonb;
  dependency jsonb;
  actual jsonb;
  captured jsonb := '{}'::jsonb;
  captured_dependencies jsonb := '{}'::jsonb;
  captured_sources jsonb;
  changed integer;
  baseline_owners integer := 0;
  terminal_owners integer := 0;
begin
  lock table public.content_update in share mode;
  perform id from public.item where id in (select (p->>'id')::bigint from jsonb_array_elements(spec->'patches') p where p->>'table'='item') order by id for update;
  perform id from public.ability_block where id in (select (p->>'id')::bigint from jsonb_array_elements(spec->'patches') p where p->>'table'='ability_block') order by id for update;
  perform id from public.archetype where id in (select (p->>'id')::bigint from jsonb_array_elements(spec->'patches') p where p->>'table'='archetype') order by id for update;
  perform id from public.trait where id in (select (d->>'id')::bigint from jsonb_array_elements(spec->'dependencies') d where d->>'table'='trait') order by id for share;
  perform id from public.ability_block where id in (select (d->>'id')::bigint from jsonb_array_elements(spec->'dependencies') d where d->>'table'='ability_block') order by id for share;
  perform id from public.spell where id in (select (d->>'id')::bigint from jsonb_array_elements(spec->'dependencies') d where d->>'table'='spell') order by id for share;
  perform s.id from public.content_source s join jsonb_array_elements(spec->'sources') p on s.id=(p->>'id')::bigint where s.name=p->>'name' and s.user_id is null and s.is_published is true order by s.id for update;
  get diagnostics changed=row_count;
  if changed<>jsonb_array_length(spec->'sources') then raise exception 'Treasure Vault artifact sources changed'; end if;
  if exists (
    select 1 from public.content_update u
    where upper(btrim(coalesce(u.status->>'state','PENDING'))) not in ('APPROVED','REJECTED')
      and (
        exists (
          select 1 from jsonb_array_elements(spec->'sources') s
          where u.type='content-source'
            and (u.ref_id=(s->>'id')::bigint or u.data->>'id'=s->>'id'
                 or lower(btrim(u.data->>'name'))=lower(btrim(s->>'name')))
        )
        or exists (
          select 1 from jsonb_array_elements((spec->'patches')||(spec->'dependencies')) p
          where (u.type=p->>'type' or (p->>'table'='ability_block' and u.type='ability-block'))
            and (u.ref_id=(p->>'id')::bigint or u.data->>'id'=p->>'id'
                 or u.data->>'uuid'=p#>>'{anchor,uuid}'
                 or ((u.content_source_id=(p#>>'{anchor,content_source_id}')::bigint
                      or u.data->>'content_source_id'=p#>>'{anchor,content_source_id}')
                     and lower(btrim(u.data->>'name'))=lower(btrim(p->>'name')))
                 or (coalesce(p#>>'{anchor,meta_data,source,url}','')<>''
                     and lower(btrim(u.data#>>'{meta_data,source,url}'))=lower(btrim(p#>>'{anchor,meta_data,source,url}')))
                 or exists (select 1 from jsonb_array_elements(coalesce(p->'primary','[]'::jsonb)) evidence
                            where lower(btrim(u.data#>>'{meta_data,source,url}'))=lower(btrim(evidence->>'url'))))
        )
      )
  ) then raise exception 'Treasure Vault artifact pending curator submission'; end if;
  for dependency in select value from jsonb_array_elements(spec->'dependencies') loop
    if dependency->>'table'='trait' then
      select (to_jsonb(t)-'updated_at'-'search_tsv')||jsonb_build_object('uuid',t.uuid::text) into actual from public.trait t where t.id=(dependency->>'id')::bigint;
    elsif dependency->>'table'='ability_block' then
      select (to_jsonb(a)-'updated_at'-'search_tsv')||jsonb_build_object('uuid',a.uuid::text) into actual from public.ability_block a where a.id=(dependency->>'id')::bigint;
    elsif dependency->>'table'='spell' then
      select (to_jsonb(s)-'updated_at'-'search_tsv')||jsonb_build_object('uuid',s.uuid::text) into actual from public.spell s where s.id=(dependency->>'id')::bigint;
    else raise exception 'Treasure Vault artifact unsupported dependency table';
    end if;
    if actual is distinct from dependency->'anchor' then raise exception 'Treasure Vault artifact dependency changed: %:%',dependency->>'table',dependency->>'id'; end if;
    captured_dependencies:=jsonb_set(captured_dependencies,array[(dependency->>'table')||':'||(dependency->>'id')],actual,true);
  end loop;
  select jsonb_object_agg(s.id::text,to_jsonb(s)-'updated_at') into captured_sources from public.content_source s where s.id in (select (p->>'id')::bigint from jsonb_array_elements(spec->'sources') p);
  -- Preflight every complete owner before the first write; reject unknown and partial states.
  for patch in select value from jsonb_array_elements(spec->'patches') loop
    if patch->>'table'='item' then
      select (to_jsonb(i)-'updated_at'-'search_tsv')||jsonb_build_object('uuid',i.uuid::text) into actual from public.item i where i.id=(patch->>'id')::bigint;
    elsif patch->>'table'='ability_block' then
      select (to_jsonb(a)-'updated_at'-'search_tsv')||jsonb_build_object('uuid',a.uuid::text) into actual from public.ability_block a where a.id=(patch->>'id')::bigint;
    elsif patch->>'table'='archetype' then
      select (to_jsonb(a)-'updated_at'-'search_tsv')||jsonb_build_object('uuid',a.uuid::text) into actual from public.archetype a where a.id=(patch->>'id')::bigint;
    else raise exception 'Treasure Vault artifact unsupported owner table';
    end if;
    if actual is null then raise exception 'Treasure Vault artifact owner missing'; end if;
    if actual=patch->'anchor' then baseline_owners:=baseline_owners+1;
    elsif actual=patch->'final' then terminal_owners:=terminal_owners+1;
    else raise exception 'Treasure Vault artifact owner changed: %:%',patch->>'table',patch->>'id';
    end if;
    captured:=jsonb_set(captured,array[(patch->>'table')||':'||(patch->>'id')],actual,true);
  end loop;
  if baseline_owners>0 and terminal_owners>0 then raise exception 'Treasure Vault artifact partial domain'; end if;
  for patch in select value from jsonb_array_elements(spec->'patches') loop
    if captured->((patch->>'table')||':'||(patch->>'id')) is distinct from patch->'final' then
      if patch->>'table'='item' then
        update public.item i set operations=array(select value::json from jsonb_array_elements(patch#>'{final,operations}') with ordinality e(value,position) order by position)
        where i.id=(patch->>'id')::bigint and ((to_jsonb(i)-'updated_at'-'search_tsv')||jsonb_build_object('uuid',i.uuid::text))=captured->((patch->>'table')||':'||(patch->>'id'));
      elsif patch->>'table'='ability_block' then
        update public.ability_block a set operations=array(select value::json from jsonb_array_elements(patch#>'{final,operations}') with ordinality e(value,position) order by position)
        where a.id=(patch->>'id')::bigint and ((to_jsonb(a)-'updated_at'-'search_tsv')||jsonb_build_object('uuid',a.uuid::text))=captured->((patch->>'table')||':'||(patch->>'id'));
      elsif patch->>'table'='archetype' then
        update public.archetype a set dedication_feat_id=(patch#>>'{final,dedication_feat_id}')::bigint
        where a.id=(patch->>'id')::bigint and ((to_jsonb(a)-'updated_at'-'search_tsv')||jsonb_build_object('uuid',a.uuid::text))=captured->((patch->>'table')||':'||(patch->>'id'));
      end if;
      get diagnostics changed=row_count;
      if changed<>1 then raise exception 'Treasure Vault artifact captured CAS failed'; end if;
    end if;
    if patch->>'table'='item' then
      select (to_jsonb(i)-'updated_at'-'search_tsv')||jsonb_build_object('uuid',i.uuid::text) into actual from public.item i where i.id=(patch->>'id')::bigint;
    elsif patch->>'table'='ability_block' then
      select (to_jsonb(a)-'updated_at'-'search_tsv')||jsonb_build_object('uuid',a.uuid::text) into actual from public.ability_block a where a.id=(patch->>'id')::bigint;
    elsif patch->>'table'='archetype' then
      select (to_jsonb(a)-'updated_at'-'search_tsv')||jsonb_build_object('uuid',a.uuid::text) into actual from public.archetype a where a.id=(patch->>'id')::bigint;
    else raise exception 'Treasure Vault artifact unsupported owner table';
    end if;
    if actual is distinct from patch->'final' then raise exception 'Treasure Vault artifact post-trigger owner drift'; end if;
  end loop;
  for patch in select value from jsonb_array_elements(spec->'patches') loop
    if patch->>'table'='item' then
      select (to_jsonb(i)-'updated_at'-'search_tsv')||jsonb_build_object('uuid',i.uuid::text) into actual from public.item i where i.id=(patch->>'id')::bigint;
    elsif patch->>'table'='ability_block' then
      select (to_jsonb(a)-'updated_at'-'search_tsv')||jsonb_build_object('uuid',a.uuid::text) into actual from public.ability_block a where a.id=(patch->>'id')::bigint;
    elsif patch->>'table'='archetype' then
      select (to_jsonb(a)-'updated_at'-'search_tsv')||jsonb_build_object('uuid',a.uuid::text) into actual from public.archetype a where a.id=(patch->>'id')::bigint;
    else raise exception 'Treasure Vault artifact unsupported owner table';
    end if;
    if actual is distinct from patch->'final' then raise exception 'Treasure Vault artifact final owner drift'; end if;
  end loop;
  for dependency in select value from jsonb_array_elements(spec->'dependencies') loop
    if dependency->>'table'='trait' then
      select (to_jsonb(t)-'updated_at'-'search_tsv')||jsonb_build_object('uuid',t.uuid::text) into actual from public.trait t where t.id=(dependency->>'id')::bigint;
    elsif dependency->>'table'='ability_block' then
      select (to_jsonb(a)-'updated_at'-'search_tsv')||jsonb_build_object('uuid',a.uuid::text) into actual from public.ability_block a where a.id=(dependency->>'id')::bigint;
    elsif dependency->>'table'='spell' then
      select (to_jsonb(s)-'updated_at'-'search_tsv')||jsonb_build_object('uuid',s.uuid::text) into actual from public.spell s where s.id=(dependency->>'id')::bigint;
    else raise exception 'Treasure Vault artifact unsupported dependency table';
    end if;
    if actual is distinct from captured_dependencies->((dependency->>'table')||':'||(dependency->>'id')) then raise exception 'Treasure Vault artifact final dependency drift'; end if;
  end loop;
  select jsonb_object_agg(s.id::text,to_jsonb(s)-'updated_at') into actual from public.content_source s where s.id in (select (p->>'id')::bigint from jsonb_array_elements(spec->'sources') p);
  if actual is distinct from captured_sources then raise exception 'Treasure Vault artifact final source drift'; end if;
  if exists (
    select 1 from public.content_update u
    where upper(btrim(coalesce(u.status->>'state','PENDING'))) not in ('APPROVED','REJECTED')
      and (
        exists (
          select 1 from jsonb_array_elements(spec->'sources') s
          where u.type='content-source'
            and (u.ref_id=(s->>'id')::bigint or u.data->>'id'=s->>'id'
                 or lower(btrim(u.data->>'name'))=lower(btrim(s->>'name')))
        )
        or exists (
          select 1 from jsonb_array_elements((spec->'patches')||(spec->'dependencies')) p
          where (u.type=p->>'type' or (p->>'table'='ability_block' and u.type='ability-block'))
            and (u.ref_id=(p->>'id')::bigint or u.data->>'id'=p->>'id'
                 or u.data->>'uuid'=p#>>'{anchor,uuid}'
                 or ((u.content_source_id=(p#>>'{anchor,content_source_id}')::bigint
                      or u.data->>'content_source_id'=p#>>'{anchor,content_source_id}')
                     and lower(btrim(u.data->>'name'))=lower(btrim(p->>'name')))
                 or (coalesce(p#>>'{anchor,meta_data,source,url}','')<>''
                     and lower(btrim(u.data#>>'{meta_data,source,url}'))=lower(btrim(p#>>'{anchor,meta_data,source,url}')))
                 or exists (select 1 from jsonb_array_elements(coalesce(p->'primary','[]'::jsonb)) evidence
                            where lower(btrim(u.data#>>'{meta_data,source,url}'))=lower(btrim(evidence->>'url'))))
        )
      )
  ) then raise exception 'Treasure Vault artifact final curator drift'; end if;
end
$repair$;
$historical_original_dual$;
end $historical_dual$;
