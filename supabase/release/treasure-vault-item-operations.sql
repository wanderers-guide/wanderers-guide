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
    and pg_catalog.has_function_privilege('supabase_read_only_user',p.oid,'EXECUTE'))) as valid),
terminal_status as materialized(select case when f.valid is true then
  coalesce((select pg_catalog.to_jsonb(s) from public.treasure_vault_terminal_status_v1() s),'{"recognized":true,"passed":false}'::jsonb)
  else '{"recognized":true,"passed":false}'::jsonb end as value from terminal_function f),
original_checks as(
-- Verify the exact terminal item operation state without changing any data.
with settings as (
  select $operations096$
{
  "capture": "2026-10-02T18:19:38.179Z",
  "dependency_capture": "2026-10-02T19:42:43.554Z",
  "patches": [
    {
      "id": 11906,
      "name": "Deadweight Mutagen (Greater)",
      "anchor": {
        "id": 11906,
        "bulk": "0.1",
        "name": "Deadweight Mutagen (Greater)",
        "size": "MEDIUM",
        "uuid": "883318412448329",
        "group": "GENERAL",
        "hands": null,
        "level": 11,
        "price": {
          "gp": 300
        },
        "usage": "held in 1 hand",
        "rarity": "COMMON",
        "traits": [
          1529,
          1531,
          1553,
          1563,
          1453
        ],
        "version": "1.0",
        "meta_data": {
          "hp": 0,
          "bulk": {},
          "runes": {
            "potency": 0,
            "property": [],
            "striking": 0,
            "resilient": 0
          },
          "damage": null,
          "hp_max": 0,
          "source": {
            "url": "https://2e.aonprd.com/Equipment.aspx?ID=4494",
            "book": "Treasure Vault",
            "page": "59"
          },
          "charges": {},
          "foundry": {
            "items": [],
            "rules": [],
            "container_id": null
          },
          "cleaning": {
            "updatedAt": "2026-04-12T08:04:22.570Z"
          },
          "hardness": 0,
          "material": {
            "type": null,
            "grade": null
          },
          "quantity": 1,
          "base_item": null,
          "image_url": "",
          "is_shoddy": false,
          "starfinder": {},
          "unselectable": false,
          "broken_threshold": 0
        },
        "created_at": "2024-04-19T04:16:13.713376+00:00",
        "operations": [
          {
            "id": "1c8d9833-facb-4ecf-95a4-29827ef184d2",
            "data": {
              "text": "to Shove and Trip",
              "type": "item",
              "value": 3,
              "variable": "SKILL_ATHLETICS"
            },
            "type": "addBonusToValue"
          },
          {
            "id": "fc8b83be-964b-482d-b034-04a99ce1fba2",
            "data": {
              "text": "against attempts to Shove or Trip you and against effects that attempt to force you to move or knock you prone",
              "type": "item",
              "value": 3,
              "variable": "SAVE_FORT"
            },
            "type": "addBonusToValue"
          },
          {
            "id": "e4d5512b-0e24-40f9-a86b-47e45574dd8a",
            "data": {
              "text": "against attempts to Shove or Trip you and against effects that attempt to force you to move or knock you prone",
              "type": "item",
              "value": 3,
              "variable": "SAVE_REFLEX"
            },
            "type": "addBonusToValue"
          }
        ],
        "description": "**Activate** <abbr cost=\"ONE-ACTION\" class=\"action-symbol\">1</abbr> ([manipulate](link_trait_1433))\n\nFor 1 hour, your joints loosen and bones thicken, making your body incredibly weighty and difficult to maneuver around.\n\n**Benefit** You gain a +3 item bonus to Athletics checks to [Shove](link_action_19849) and [Trip](link_action_19865), to your Fortitude and Reflex DCs against attempts to Shove or Trip you, and to saving throws against effects that attempt to force you to move or knock you prone. You can attempt to Shove or Trip creatures up to two sizes larger than you.\n\n**Drawback** You gain the encumbered condition and can't remove it while under the effects of the mutagen.",
        "availability": null,
        "content_source_id": 16,
        "craft_requirements": null
      },
      "final": {
        "id": 11906,
        "bulk": "0.1",
        "name": "Deadweight Mutagen (Greater)",
        "size": "MEDIUM",
        "uuid": "883318412448329",
        "group": "GENERAL",
        "hands": null,
        "level": 11,
        "price": {
          "gp": 300
        },
        "usage": "held in 1 hand",
        "rarity": "COMMON",
        "traits": [
          1529,
          1531,
          1553,
          1563,
          1453
        ],
        "version": "1.0",
        "meta_data": {
          "hp": 0,
          "bulk": {},
          "runes": {
            "potency": 0,
            "property": [],
            "striking": 0,
            "resilient": 0
          },
          "damage": null,
          "hp_max": 0,
          "source": {
            "url": "https://2e.aonprd.com/Equipment.aspx?ID=4494",
            "book": "Treasure Vault",
            "page": "59"
          },
          "charges": {},
          "foundry": {
            "items": [],
            "rules": [],
            "container_id": null
          },
          "cleaning": {
            "updatedAt": "2026-04-12T08:04:22.570Z"
          },
          "hardness": 0,
          "material": {
            "type": null,
            "grade": null
          },
          "quantity": 1,
          "base_item": null,
          "image_url": "",
          "is_shoddy": false,
          "starfinder": {},
          "unselectable": false,
          "broken_threshold": 0
        },
        "created_at": "2024-04-19T04:16:13.713376+00:00",
        "operations": [
          {
            "id": "1c8d9833-facb-4ecf-95a4-29827ef184d2",
            "data": {
              "text": "to Shove and Trip",
              "type": "item",
              "value": 3,
              "variable": "SKILL_ATHLETICS"
            },
            "type": "addBonusToValue"
          },
          {
            "id": "fc8b83be-964b-482d-b034-04a99ce1fba2",
            "data": {
              "text": "against attempts to Shove or Trip you and against effects that attempt to force you to move or knock you prone",
              "type": "item",
              "value": 3,
              "variable": "SAVE_FORT"
            },
            "type": "addBonusToValue"
          },
          {
            "id": "e4d5512b-0e24-40f9-a86b-47e45574dd8a",
            "data": {
              "text": "against attempts to Shove or Trip you and against effects that attempt to force you to move or knock you prone",
              "type": "item",
              "value": 3,
              "variable": "SAVE_REFLEX"
            },
            "type": "addBonusToValue"
          },
          {
            "id": "9c49c899-b40e-4039-85e0-c611145104ef",
            "type": "addBonusToValue",
            "data": {
              "variable": "SAVE_WILL",
              "type": "item",
              "value": 3,
              "text": "against effects that attempt to force you to move or knock you prone"
            }
          }
        ],
        "description": "**Activate** <abbr cost=\"ONE-ACTION\" class=\"action-symbol\">1</abbr> ([manipulate](link_trait_1433))\n\nFor 1 hour, your joints loosen and bones thicken, making your body incredibly weighty and difficult to maneuver around.\n\n**Benefit** You gain a +3 item bonus to Athletics checks to [Shove](link_action_19849) and [Trip](link_action_19865), to your Fortitude and Reflex DCs against attempts to Shove or Trip you, and to saving throws against effects that attempt to force you to move or knock you prone. You can attempt to Shove or Trip creatures up to two sizes larger than you.\n\n**Drawback** You gain the encumbered condition and can't remove it while under the effects of the mutagen.",
        "availability": null,
        "content_source_id": 16,
        "craft_requirements": null
      },
      "primary": {
        "url": "https://2e.aonprd.com/Equipment.aspx?ID=1961",
        "captured_at": "2026-10-01T19:38:29.205Z",
        "sha256": "33d5e977fc4331e011a1c13a26c3ac48247d19916b78465ccb1ae9d2761de5ce"
      },
      "rationale": "Complete only the printed forced-movement saving-throw rider for Will. It remains a contextual/manual timed consumable benefit, never an unconditional saving throw increase. Do not invent a mutagen timer, active state or encumbered automation."
    },
    {
      "id": 12275,
      "name": "Pipes of Compulsion (Greater)",
      "anchor": {
        "id": 12275,
        "bulk": "0.1",
        "name": "Pipes of Compulsion (Greater)",
        "size": "MEDIUM",
        "uuid": "6079148181090300",
        "group": "GENERAL",
        "hands": null,
        "level": 8,
        "price": {
          "gp": 460
        },
        "usage": "held-in-two-hands",
        "rarity": "UNCOMMON",
        "traits": [
          2861,
          1514,
          1546
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
            "url": "https://2e.aonprd.com/Equipment.aspx?ID=4803",
            "book": "Treasure Vault",
            "page": "137"
          },
          "charges": {},
          "foundry": {
            "items": [],
            "rules": [
              {
                "key": "FlatModifier",
                "type": "item",
                "value": 1,
                "selector": [
                  "performance",
                  "diplomacy"
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
          "starfinder": {},
          "unselectable": false,
          "broken_threshold": 0
        },
        "created_at": "2024-04-19T04:20:52.714773+00:00",
        "operations": [
          {
            "id": "7a94a081-febf-4435-9eae-caa9aac24cf3",
            "data": {
              "text": "",
              "type": "item",
              "value": "1",
              "variable": "SKILL_PERFORMANCE"
            },
            "type": "addBonusToValue"
          },
          {
            "id": "db07ab1d-72ee-4618-bc7f-0253238b1c4f",
            "data": {
              "text": "",
              "type": "item",
              "value": "1",
              "variable": "SKILL_DIPLOMACY"
            },
            "type": "addBonusToValue"
          }
        ],
        "description": "These panpipes are made of what seems to be beat-up tin bound by frayed leather and look like they shouldn't function at all, but in skilled hands they emit a beautiful sound that beguiles the senses. While playing the pipes, you gain a +1 item bonus to Diplomacy and Performance checks.\n\n**Activate** [Cast a Spell](link_action_19611)\n\n**Effect** You expend a number of charges from this instrument to cast a spell from its list.\n\n*   **Cantrip** [daze](link_spell_4554)\n    \n*   **1st** [charm](link_spell_4516), [command](link_spell_4528), [fear](link_spell_4616)\n    \n*   **2nd** [laughing fit](link_spell_4696), [stupefy](link_spell_4862)\n    \n*   **3rd** [charm](link_spell_4516), [hypnotize](link_spell_4672), [mind reading](link_spell_4724), [ring of truth](link_spell_4809)",
        "availability": null,
        "content_source_id": 16,
        "craft_requirements": "Supply one casting of all listed levels of all listed spells."
      },
      "final": {
        "id": 12275,
        "bulk": "0.1",
        "name": "Pipes of Compulsion (Greater)",
        "size": "MEDIUM",
        "uuid": "6079148181090300",
        "group": "GENERAL",
        "hands": null,
        "level": 8,
        "price": {
          "gp": 460
        },
        "usage": "held-in-two-hands",
        "rarity": "UNCOMMON",
        "traits": [
          2861,
          1514,
          1546
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
            "url": "https://2e.aonprd.com/Equipment.aspx?ID=4803",
            "book": "Treasure Vault",
            "page": "137"
          },
          "charges": {},
          "foundry": {
            "items": [],
            "rules": [
              {
                "key": "FlatModifier",
                "type": "item",
                "value": 1,
                "selector": [
                  "performance",
                  "diplomacy"
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
          "starfinder": {},
          "unselectable": false,
          "broken_threshold": 0
        },
        "created_at": "2024-04-19T04:20:52.714773+00:00",
        "operations": [
          {
            "id": "7a94a081-febf-4435-9eae-caa9aac24cf3",
            "data": {
              "text": "while playing the pipes",
              "type": "item",
              "value": "1",
              "variable": "SKILL_PERFORMANCE"
            },
            "type": "addBonusToValue"
          },
          {
            "id": "db07ab1d-72ee-4618-bc7f-0253238b1c4f",
            "data": {
              "text": "while playing the pipes",
              "type": "item",
              "value": "1",
              "variable": "SKILL_DIPLOMACY"
            },
            "type": "addBonusToValue"
          }
        ],
        "description": "These panpipes are made of what seems to be beat-up tin bound by frayed leather and look like they shouldn't function at all, but in skilled hands they emit a beautiful sound that beguiles the senses. While playing the pipes, you gain a +1 item bonus to Diplomacy and Performance checks.\n\n**Activate** [Cast a Spell](link_action_19611)\n\n**Effect** You expend a number of charges from this instrument to cast a spell from its list.\n\n*   **Cantrip** [daze](link_spell_4554)\n    \n*   **1st** [charm](link_spell_4516), [command](link_spell_4528), [fear](link_spell_4616)\n    \n*   **2nd** [laughing fit](link_spell_4696), [stupefy](link_spell_4862)\n    \n*   **3rd** [charm](link_spell_4516), [hypnotize](link_spell_4672), [mind reading](link_spell_4724), [ring of truth](link_spell_4809)",
        "availability": null,
        "content_source_id": 16,
        "craft_requirements": "Supply one casting of all listed levels of all listed spells."
      },
      "primary": {
        "url": "https://2e.aonprd.com/Equipment.aspx?ID=2269",
        "captured_at": "2026-10-01T19:40:17.008Z",
        "sha256": "880321603422a95c22fe8f05c6e22a7755cb2eea74c1761f37da25853887536e"
      },
      "rationale": "The printed skill bonuses apply only while playing the instrument. Keep both existing operation IDs and numeric/type/skill values; make the printed playing condition explicit so holding an idle instrument cannot automatically increase unrelated checks."
    },
    {
      "id": 12276,
      "name": "Pipes of Compulsion (Major)",
      "anchor": {
        "id": 12276,
        "bulk": "0.1",
        "name": "Pipes of Compulsion (Major)",
        "size": "MEDIUM",
        "uuid": "8639834890224436",
        "group": "GENERAL",
        "hands": null,
        "level": 12,
        "price": {
          "gp": 1900
        },
        "usage": "held-in-two-hands",
        "rarity": "UNCOMMON",
        "traits": [
          2861,
          1514,
          1546
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
            "url": "https://2e.aonprd.com/Equipment.aspx?ID=4803",
            "book": "Treasure Vault",
            "page": "137"
          },
          "charges": {},
          "foundry": {
            "items": [],
            "rules": [
              {
                "key": "FlatModifier",
                "type": "item",
                "value": 2,
                "selector": [
                  "performance",
                  "diplomacy"
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
          "starfinder": {},
          "unselectable": false,
          "broken_threshold": 0
        },
        "created_at": "2024-04-19T04:20:53.327856+00:00",
        "operations": [
          {
            "id": "5be00efc-78e7-4b01-bcc0-3776d947b0fc",
            "data": {
              "text": "",
              "type": "item",
              "value": "2",
              "variable": "SKILL_PERFORMANCE"
            },
            "type": "addBonusToValue"
          },
          {
            "id": "cfc09fd6-1f2c-4e24-803f-a09a206f2186",
            "data": {
              "text": "",
              "type": "item",
              "value": "2",
              "variable": "SKILL_DIPLOMACY"
            },
            "type": "addBonusToValue"
          }
        ],
        "description": "These panpipes are made of what seems to be beat-up tin bound by frayed leather and look like they shouldn't function at all, but in skilled hands they emit a beautiful sound that beguiles the senses. While playing the pipes, you gain a +2 item bonus to Diplomacy and Performance checks.\n\n**Activate** [Cast a Spell](link_action_19611)\n\n**Effect** You expend a number of charges from this instrument to cast a spell from its list.\n\n*   **Cantrip** [daze](link_spell_4554)\n    \n*   **1st** [charm](link_spell_4516), [command](link_spell_4528), [fear](link_spell_4616)\n    \n*   **2nd** [laughing fit](link_spell_4696), [stupefy](link_spell_4862)\n    \n*   **3rd** [charm](link_spell_4516), [hypnotize](link_spell_4672), [mind reading](link_spell_4724), [ring of truth](link_spell_4809)\n    \n*   **4th** [confusion](link_spell_4533), [suggestion](link_spell_4865)\n    \n*   **5th** [charm](link_spell_4516), [glimmer of charm](link_spell_5367), [suggestion](link_spell_4865), [telepathy](link_spell_4894)",
        "availability": null,
        "content_source_id": 16,
        "craft_requirements": "Supply one casting of all listed levels of all listed spells."
      },
      "final": {
        "id": 12276,
        "bulk": "0.1",
        "name": "Pipes of Compulsion (Major)",
        "size": "MEDIUM",
        "uuid": "8639834890224436",
        "group": "GENERAL",
        "hands": null,
        "level": 12,
        "price": {
          "gp": 1900
        },
        "usage": "held-in-two-hands",
        "rarity": "UNCOMMON",
        "traits": [
          2861,
          1514,
          1546
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
            "url": "https://2e.aonprd.com/Equipment.aspx?ID=4803",
            "book": "Treasure Vault",
            "page": "137"
          },
          "charges": {},
          "foundry": {
            "items": [],
            "rules": [
              {
                "key": "FlatModifier",
                "type": "item",
                "value": 2,
                "selector": [
                  "performance",
                  "diplomacy"
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
          "starfinder": {},
          "unselectable": false,
          "broken_threshold": 0
        },
        "created_at": "2024-04-19T04:20:53.327856+00:00",
        "operations": [
          {
            "id": "5be00efc-78e7-4b01-bcc0-3776d947b0fc",
            "data": {
              "text": "while playing the pipes",
              "type": "item",
              "value": "2",
              "variable": "SKILL_PERFORMANCE"
            },
            "type": "addBonusToValue"
          },
          {
            "id": "cfc09fd6-1f2c-4e24-803f-a09a206f2186",
            "data": {
              "text": "while playing the pipes",
              "type": "item",
              "value": "2",
              "variable": "SKILL_DIPLOMACY"
            },
            "type": "addBonusToValue"
          }
        ],
        "description": "These panpipes are made of what seems to be beat-up tin bound by frayed leather and look like they shouldn't function at all, but in skilled hands they emit a beautiful sound that beguiles the senses. While playing the pipes, you gain a +2 item bonus to Diplomacy and Performance checks.\n\n**Activate** [Cast a Spell](link_action_19611)\n\n**Effect** You expend a number of charges from this instrument to cast a spell from its list.\n\n*   **Cantrip** [daze](link_spell_4554)\n    \n*   **1st** [charm](link_spell_4516), [command](link_spell_4528), [fear](link_spell_4616)\n    \n*   **2nd** [laughing fit](link_spell_4696), [stupefy](link_spell_4862)\n    \n*   **3rd** [charm](link_spell_4516), [hypnotize](link_spell_4672), [mind reading](link_spell_4724), [ring of truth](link_spell_4809)\n    \n*   **4th** [confusion](link_spell_4533), [suggestion](link_spell_4865)\n    \n*   **5th** [charm](link_spell_4516), [glimmer of charm](link_spell_5367), [suggestion](link_spell_4865), [telepathy](link_spell_4894)",
        "availability": null,
        "content_source_id": 16,
        "craft_requirements": "Supply one casting of all listed levels of all listed spells."
      },
      "primary": {
        "url": "https://2e.aonprd.com/Equipment.aspx?ID=2269",
        "captured_at": "2026-10-01T19:40:17.008Z",
        "sha256": "880321603422a95c22fe8f05c6e22a7755cb2eea74c1761f37da25853887536e"
      },
      "rationale": "The printed skill bonuses apply only while playing the instrument. Keep both existing operation IDs and numeric/type/skill values; make the printed playing condition explicit so holding an idle instrument cannot automatically increase unrelated checks."
    },
    {
      "id": 12277,
      "name": "Pipes of Compulsion",
      "anchor": {
        "id": 12277,
        "bulk": "0.1",
        "name": "Pipes of Compulsion",
        "size": "MEDIUM",
        "uuid": "360855105568689",
        "group": "GENERAL",
        "hands": null,
        "level": 4,
        "price": {
          "gp": 90
        },
        "usage": "held-in-two-hands",
        "rarity": "UNCOMMON",
        "traits": [
          2861,
          1514,
          1546
        ],
        "version": "1.0",
        "meta_data": {
          "hp": 0,
          "bulk": {},
          "group": "",
          "runes": {},
          "damage": {
            "die": "",
            "dice": "",
            "extra": "",
            "damageType": ""
          },
          "hp_max": 0,
          "source": {
            "url": "https://2e.aonprd.com/Equipment.aspx?ID=4803",
            "book": "Treasure Vault",
            "page": "137"
          },
          "charges": {},
          "foundry": {
            "items": [],
            "rules": [
              {
                "key": "FlatModifier",
                "type": "item",
                "value": 1,
                "selector": [
                  "performance",
                  "diplomacy"
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
          "base_item": null,
          "image_url": "",
          "is_shoddy": false,
          "starfinder": {},
          "unselectable": false,
          "broken_threshold": 0
        },
        "created_at": "2024-04-19T04:20:53.912771+00:00",
        "operations": [
          {
            "id": "87df7cf5-8f11-4d9d-aa54-8690e4886af3",
            "data": {
              "text": "",
              "type": "item",
              "value": "1",
              "variable": "SKILL_PERFORMANCE"
            },
            "type": "addBonusToValue"
          },
          {
            "id": "373cbbf1-e325-497d-9b5a-7ce8a89645aa",
            "data": {
              "text": "",
              "type": "item",
              "value": "1",
              "variable": "SKILL_DIPLOMACY"
            },
            "type": "addBonusToValue"
          }
        ],
        "description": "These panpipes are made of what seems to be beat-up tin bound by frayed leather and look like they shouldn't function at all, but in skilled hands they emit a beautiful sound that beguiles the senses. While playing the pipes, you gain a +1 item bonus to Diplomacy and Performance checks.\n\n**Activate** [Cast a Spell](link_action_19611)\n\n**Effect** You expend a number of charges from this instrument to cast a spell from its list.\n\n*   **Cantrip** [daze](link_spell_4554)\n    \n*   **1st** [charm](link_spell_4516), [command](link_spell_4528), [fear](link_spell_4616)",
        "availability": null,
        "content_source_id": 16,
        "craft_requirements": "Supply one casting of all listed levels of all listed spells."
      },
      "final": {
        "id": 12277,
        "bulk": "0.1",
        "name": "Pipes of Compulsion",
        "size": "MEDIUM",
        "uuid": "360855105568689",
        "group": "GENERAL",
        "hands": null,
        "level": 4,
        "price": {
          "gp": 90
        },
        "usage": "held-in-two-hands",
        "rarity": "UNCOMMON",
        "traits": [
          2861,
          1514,
          1546
        ],
        "version": "1.0",
        "meta_data": {
          "hp": 0,
          "bulk": {},
          "group": "",
          "runes": {},
          "damage": {
            "die": "",
            "dice": "",
            "extra": "",
            "damageType": ""
          },
          "hp_max": 0,
          "source": {
            "url": "https://2e.aonprd.com/Equipment.aspx?ID=4803",
            "book": "Treasure Vault",
            "page": "137"
          },
          "charges": {},
          "foundry": {
            "items": [],
            "rules": [
              {
                "key": "FlatModifier",
                "type": "item",
                "value": 1,
                "selector": [
                  "performance",
                  "diplomacy"
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
          "base_item": null,
          "image_url": "",
          "is_shoddy": false,
          "starfinder": {},
          "unselectable": false,
          "broken_threshold": 0
        },
        "created_at": "2024-04-19T04:20:53.912771+00:00",
        "operations": [
          {
            "id": "87df7cf5-8f11-4d9d-aa54-8690e4886af3",
            "data": {
              "text": "while playing the pipes",
              "type": "item",
              "value": "1",
              "variable": "SKILL_PERFORMANCE"
            },
            "type": "addBonusToValue"
          },
          {
            "id": "373cbbf1-e325-497d-9b5a-7ce8a89645aa",
            "data": {
              "text": "while playing the pipes",
              "type": "item",
              "value": "1",
              "variable": "SKILL_DIPLOMACY"
            },
            "type": "addBonusToValue"
          }
        ],
        "description": "These panpipes are made of what seems to be beat-up tin bound by frayed leather and look like they shouldn't function at all, but in skilled hands they emit a beautiful sound that beguiles the senses. While playing the pipes, you gain a +1 item bonus to Diplomacy and Performance checks.\n\n**Activate** [Cast a Spell](link_action_19611)\n\n**Effect** You expend a number of charges from this instrument to cast a spell from its list.\n\n*   **Cantrip** [daze](link_spell_4554)\n    \n*   **1st** [charm](link_spell_4516), [command](link_spell_4528), [fear](link_spell_4616)",
        "availability": null,
        "content_source_id": 16,
        "craft_requirements": "Supply one casting of all listed levels of all listed spells."
      },
      "primary": {
        "url": "https://2e.aonprd.com/Equipment.aspx?ID=2269",
        "captured_at": "2026-10-01T19:40:17.008Z",
        "sha256": "880321603422a95c22fe8f05c6e22a7755cb2eea74c1761f37da25853887536e"
      },
      "rationale": "The printed skill bonuses apply only while playing the instrument. Keep both existing operation IDs and numeric/type/skill values; make the printed playing condition explicit so holding an idle instrument cannot automatically increase unrelated checks."
    },
    {
      "id": 12477,
      "name": "Staff of Earth (Major)",
      "anchor": {
        "id": 12477,
        "bulk": "1",
        "name": "Staff of Earth (Major)",
        "size": "MEDIUM",
        "uuid": "3577883387769741",
        "group": "WEAPON",
        "hands": "1",
        "level": 12,
        "price": {
          "gp": 1800
        },
        "usage": "held in 1 hand",
        "rarity": "COMMON",
        "traits": [
          1504,
          1546,
          1831
        ],
        "version": "1.0",
        "meta_data": {
          "hp": 0,
          "bulk": {},
          "group": "club",
          "range": null,
          "runes": {
            "potency": 0,
            "property": [],
            "striking": 0
          },
          "damage": {
            "die": "d4",
            "dice": 1,
            "extra": "",
            "damageType": "bludgeoning"
          },
          "hp_max": 0,
          "reload": "",
          "source": {
            "url": "https://2e.aonprd.com/Equipment.aspx?ID=4795",
            "book": "Treasure Vault",
            "page": "135"
          },
          "charges": {},
          "foundry": {
            "bonus": 0,
            "items": [],
            "rules": [
              {
                "key": "FlatModifier",
                "type": "circumstance",
                "value": 1,
                "selector": "fortitude",
                "predicate": [
                  "action:shove"
                ]
              }
            ],
            "bonus_damage": 0,
            "container_id": null,
            "splash_damage": 0
          },
          "category": "simple",
          "hardness": 0,
          "material": {
            "type": null,
            "grade": null
          },
          "quantity": 1,
          "base_item": "staff",
          "image_url": "",
          "is_shoddy": false,
          "starfinder": {
            "slots": []
          },
          "unselectable": false,
          "broken_threshold": 0,
          "base_item_content": {
            "id": 7853,
            "bulk": "1",
            "name": "Staff",
            "size": "MEDIUM",
            "uuid": 1577800666839305,
            "group": "WEAPON",
            "hands": "1",
            "level": 0,
            "price": {},
            "usage": "",
            "rarity": "COMMON",
            "traits": [
              3630,
              1831
            ],
            "version": "1.0",
            "meta_data": {
              "hp": 0,
              "bulk": {},
              "group": "club",
              "range": null,
              "runes": {
                "property": []
              },
              "damage": {
                "die": "d4",
                "dice": 1,
                "extra": "",
                "damageType": "bludgeoning"
              },
              "hp_max": 12,
              "reload": "",
              "charges": {},
              "foundry": {
                "bonus": 0,
                "items": [],
                "rules": [],
                "bonus_damage": 0,
                "container_id": null,
                "splash_damage": 0
              },
              "category": "simple",
              "hardness": 3,
              "material": {
                "grade": null
              },
              "quantity": 1,
              "base_item": "staff",
              "image_url": "",
              "is_shoddy": false,
              "starfinder": {
                "grade": null,
                "slots": []
              },
              "unselectable": false,
              "broken_threshold": 6,
              "base_item_content": {
                "id": 7853,
                "bulk": "1",
                "name": "Staff",
                "size": "MEDIUM",
                "uuid": 1577800666839305,
                "group": "WEAPON",
                "hands": "1",
                "level": 0,
                "price": {},
                "usage": "held in one hand",
                "rarity": "COMMON",
                "traits": [
                  1831,
                  3074
                ],
                "version": "1.0",
                "meta_data": {
                  "hp": 0,
                  "bulk": {},
                  "group": "club",
                  "range": null,
                  "runes": {
                    "potency": 0,
                    "property": [],
                    "striking": 0
                  },
                  "damage": {
                    "die": "d4",
                    "dice": 1,
                    "extra": "",
                    "damageType": "bludgeoning"
                  },
                  "hp_max": 0,
                  "reload": "",
                  "charges": {},
                  "foundry": {
                    "bonus": 0,
                    "items": [],
                    "rules": [],
                    "bonus_damage": 0,
                    "container_id": null,
                    "splash_damage": 0
                  },
                  "category": "simple",
                  "hardness": 0,
                  "material": {
                    "grade": null
                  },
                  "quantity": 1,
                  "base_item": "staff",
                  "image_url": "",
                  "is_shoddy": false,
                  "starfinder": {},
                  "unselectable": false,
                  "broken_threshold": 0
                },
                "created_at": "2024-02-06T08:21:38.977535+00:00",
                "operations": null,
                "description": "This long piece of wood can aid in walking and deliver a mighty blow.",
                "availability": null,
                "content_source_id": 1,
                "craft_requirements": null
              }
            },
            "created_at": "2024-02-06T08:21:38.977535+00:00",
            "operations": null,
            "description": "This long piece of wood can aid in walking and deliver a mighty blow.",
            "availability": null,
            "content_source_id": 1,
            "craft_requirements": null
          }
        },
        "created_at": "2024-04-19T04:23:23.842994+00:00",
        "operations": [
          {
            "id": "e5d991ec-bfff-4b5e-a784-258f50f21bb5",
            "data": {
              "text": "against effects that Shove you or knock you prone",
              "type": "1",
              "value": "circumstance",
              "variable": "SAVE_FORT"
            },
            "type": "addBonusToValue"
          }
        ],
        "description": "Geometric patterns are etched into the smooth brown and gray surface of a _staff of earth_, which makes a solid thud whenever tapped against the ground. While wielding a _staff of earth_, you gain a +1 circumstance bonus to your Fortitude saves and DC against effects that [Shove](link_action_19849) you or knock you prone.\n\n**Activate** [Cast a Spell](link_action_19611); **Effect** You expend a number of charges from the staff to cast a spell from its list.\n\n*   **Cantrip** [_scatter scree_](link_spell_6765)\n    \n*   **1st** [_pummeling rubble_](link_spell_4787)\n    \n*   **2nd** [_expeditious excavation_](link_spell_7353), [_pummeling rubble_](link_spell_4787)\n    \n*   **3rd** [_earthbind_](link_spell_4588), [_shifting sand_](link_spell_7367)\n    \n*   **4th** [_expeditious excavation_](link_spell_7353), [mountain resilience](link_spell_4733), [_shape stone_](link_spell_4826)\n    \n*   **5th** [_blazing fissure_](link_spell_5125), [_wall of stone_](link_spell_4944)",
        "availability": null,
        "content_source_id": 16,
        "craft_requirements": "Supply one casting of all listed levels of all listed spells."
      },
      "final": {
        "id": 12477,
        "bulk": "1",
        "name": "Staff of Earth (Major)",
        "size": "MEDIUM",
        "uuid": "3577883387769741",
        "group": "WEAPON",
        "hands": "1",
        "level": 12,
        "price": {
          "gp": 1800
        },
        "usage": "held in 1 hand",
        "rarity": "COMMON",
        "traits": [
          1504,
          1546,
          1831
        ],
        "version": "1.0",
        "meta_data": {
          "hp": 0,
          "bulk": {},
          "group": "club",
          "range": null,
          "runes": {
            "potency": 0,
            "property": [],
            "striking": 0
          },
          "damage": {
            "die": "d4",
            "dice": 1,
            "extra": "",
            "damageType": "bludgeoning"
          },
          "hp_max": 0,
          "reload": "",
          "source": {
            "url": "https://2e.aonprd.com/Equipment.aspx?ID=4795",
            "book": "Treasure Vault",
            "page": "135"
          },
          "charges": {},
          "foundry": {
            "bonus": 0,
            "items": [],
            "rules": [
              {
                "key": "FlatModifier",
                "type": "circumstance",
                "value": 1,
                "selector": "fortitude",
                "predicate": [
                  "action:shove"
                ]
              }
            ],
            "bonus_damage": 0,
            "container_id": null,
            "splash_damage": 0
          },
          "category": "simple",
          "hardness": 0,
          "material": {
            "type": null,
            "grade": null
          },
          "quantity": 1,
          "base_item": "staff",
          "image_url": "",
          "is_shoddy": false,
          "starfinder": {
            "slots": []
          },
          "unselectable": false,
          "broken_threshold": 0,
          "base_item_content": {
            "id": 7853,
            "bulk": "1",
            "name": "Staff",
            "size": "MEDIUM",
            "uuid": 1577800666839305,
            "group": "WEAPON",
            "hands": "1",
            "level": 0,
            "price": {},
            "usage": "",
            "rarity": "COMMON",
            "traits": [
              3630,
              1831
            ],
            "version": "1.0",
            "meta_data": {
              "hp": 0,
              "bulk": {},
              "group": "club",
              "range": null,
              "runes": {
                "property": []
              },
              "damage": {
                "die": "d4",
                "dice": 1,
                "extra": "",
                "damageType": "bludgeoning"
              },
              "hp_max": 12,
              "reload": "",
              "charges": {},
              "foundry": {
                "bonus": 0,
                "items": [],
                "rules": [],
                "bonus_damage": 0,
                "container_id": null,
                "splash_damage": 0
              },
              "category": "simple",
              "hardness": 3,
              "material": {
                "grade": null
              },
              "quantity": 1,
              "base_item": "staff",
              "image_url": "",
              "is_shoddy": false,
              "starfinder": {
                "grade": null,
                "slots": []
              },
              "unselectable": false,
              "broken_threshold": 6,
              "base_item_content": {
                "id": 7853,
                "bulk": "1",
                "name": "Staff",
                "size": "MEDIUM",
                "uuid": 1577800666839305,
                "group": "WEAPON",
                "hands": "1",
                "level": 0,
                "price": {},
                "usage": "held in one hand",
                "rarity": "COMMON",
                "traits": [
                  1831,
                  3074
                ],
                "version": "1.0",
                "meta_data": {
                  "hp": 0,
                  "bulk": {},
                  "group": "club",
                  "range": null,
                  "runes": {
                    "potency": 0,
                    "property": [],
                    "striking": 0
                  },
                  "damage": {
                    "die": "d4",
                    "dice": 1,
                    "extra": "",
                    "damageType": "bludgeoning"
                  },
                  "hp_max": 0,
                  "reload": "",
                  "charges": {},
                  "foundry": {
                    "bonus": 0,
                    "items": [],
                    "rules": [],
                    "bonus_damage": 0,
                    "container_id": null,
                    "splash_damage": 0
                  },
                  "category": "simple",
                  "hardness": 0,
                  "material": {
                    "grade": null
                  },
                  "quantity": 1,
                  "base_item": "staff",
                  "image_url": "",
                  "is_shoddy": false,
                  "starfinder": {},
                  "unselectable": false,
                  "broken_threshold": 0
                },
                "created_at": "2024-02-06T08:21:38.977535+00:00",
                "operations": null,
                "description": "This long piece of wood can aid in walking and deliver a mighty blow.",
                "availability": null,
                "content_source_id": 1,
                "craft_requirements": null
              }
            },
            "created_at": "2024-02-06T08:21:38.977535+00:00",
            "operations": null,
            "description": "This long piece of wood can aid in walking and deliver a mighty blow.",
            "availability": null,
            "content_source_id": 1,
            "craft_requirements": null
          }
        },
        "created_at": "2024-04-19T04:23:23.842994+00:00",
        "operations": [
          {
            "id": "e5d991ec-bfff-4b5e-a784-258f50f21bb5",
            "data": {
              "text": "against effects that Shove you or knock you prone",
              "type": "circumstance",
              "value": "1",
              "variable": "SAVE_FORT"
            },
            "type": "addBonusToValue"
          }
        ],
        "description": "Geometric patterns are etched into the smooth brown and gray surface of a _staff of earth_, which makes a solid thud whenever tapped against the ground. While wielding a _staff of earth_, you gain a +1 circumstance bonus to your Fortitude saves and DC against effects that [Shove](link_action_19849) you or knock you prone.\n\n**Activate** [Cast a Spell](link_action_19611); **Effect** You expend a number of charges from the staff to cast a spell from its list.\n\n*   **Cantrip** [_scatter scree_](link_spell_6765)\n    \n*   **1st** [_pummeling rubble_](link_spell_4787)\n    \n*   **2nd** [_expeditious excavation_](link_spell_7353), [_pummeling rubble_](link_spell_4787)\n    \n*   **3rd** [_earthbind_](link_spell_4588), [_shifting sand_](link_spell_7367)\n    \n*   **4th** [_expeditious excavation_](link_spell_7353), [mountain resilience](link_spell_4733), [_shape stone_](link_spell_4826)\n    \n*   **5th** [_blazing fissure_](link_spell_5125), [_wall of stone_](link_spell_4944)",
        "availability": null,
        "content_source_id": 16,
        "craft_requirements": "Supply one casting of all listed levels of all listed spells."
      },
      "primary": {
        "url": "https://2e.aonprd.com/Equipment.aspx?ID=2261",
        "captured_at": "2026-10-01T19:40:14.205Z",
        "sha256": "509e44c28459bac800367207045c70ddfab54f38a1aed47fb455691c4e431c54"
      },
      "rationale": "Restore the explicit +1 circumstance Fortitude rider; the original operation swaps numeric value and type. Preserve the conditional Shove/prone text and operation identity."
    },
    {
      "id": 12559,
      "name": "Trickster's Mandolin (Greater)",
      "anchor": {
        "id": 12559,
        "bulk": "0.1",
        "name": "Trickster's Mandolin (Greater)",
        "size": "MEDIUM",
        "uuid": "5004326318681088",
        "group": "GENERAL",
        "hands": null,
        "level": 8,
        "price": {
          "gp": 460
        },
        "usage": "held-in-two-hands",
        "rarity": "COMMON",
        "traits": [
          2861,
          1447,
          1514,
          1546
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
            "url": "https://2e.aonprd.com/Equipment.aspx?ID=4805",
            "book": "Treasure Vault",
            "page": "137"
          },
          "charges": {},
          "foundry": {
            "items": [],
            "rules": [
              {
                "key": "FlatModifier",
                "type": "item",
                "value": 1,
                "selector": [
                  "deception",
                  "performance"
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
          "starfinder": {},
          "unselectable": false,
          "broken_threshold": 0
        },
        "created_at": "2024-04-19T04:24:24.491209+00:00",
        "operations": [
          {
            "id": "42759d64-fa15-4c74-bfb4-0b28f96ae928",
            "data": {
              "text": "",
              "type": "item",
              "value": "1",
              "variable": "SKILL_PERFORMANCE"
            },
            "type": "addBonusToValue"
          },
          {
            "id": "bb0b51c3-f69c-4598-be54-10578bde555a",
            "data": {
              "text": "",
              "type": "item",
              "value": "1",
              "variable": "SKILL_DECEPTION"
            },
            "type": "addBonusToValue"
          }
        ],
        "description": "Sought after by many unscrupulous bards, this instrument is surprisingly light and easy to carry, but also empowered with a number of spells carefully selected to help with fooling others or making a hasty retreat. While playing the mandolin, you gain a +1 item bonus to Deception and Performance checks.\n\n**Activate** <abbr cost=\"ONE-ACTION\" class=\"action-symbol\">1</abbr> ([concentrate](link_trait_1432)) **Effect** You change the instrument's color and shape to one you prefer, and you can turn it into a different handheld string instrument that takes two hands to play.\n\n**Activate** Cast a Spell; **Effect** You expend a number of charges from this instrument to cast a spell from its list.\n\n*   **Cantrip** [prestidigitation](link_spell_4778)\n    \n*   **1st** [illusory disguise](link_spell_4677), [item facade](link_spell_4691), [ventriloquism](link_spell_4931)\n    \n*   **2nd** [blur](link_spell_4421), [illusory creature](link_spell_4676), [illusory disguise](link_spell_4677), [invisibility](link_spell_4689)\n    \n*   **3rd** [illusory disguise](link_spell_4677), [phantom prison](link_spell_5415), [sculpt sound](link_spell_5260)",
        "availability": null,
        "content_source_id": 16,
        "craft_requirements": "Supply one casting of all listed levels of all listed spells."
      },
      "final": {
        "id": 12559,
        "bulk": "0.1",
        "name": "Trickster's Mandolin (Greater)",
        "size": "MEDIUM",
        "uuid": "5004326318681088",
        "group": "GENERAL",
        "hands": null,
        "level": 8,
        "price": {
          "gp": 460
        },
        "usage": "held-in-two-hands",
        "rarity": "COMMON",
        "traits": [
          2861,
          1447,
          1514,
          1546
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
            "url": "https://2e.aonprd.com/Equipment.aspx?ID=4805",
            "book": "Treasure Vault",
            "page": "137"
          },
          "charges": {},
          "foundry": {
            "items": [],
            "rules": [
              {
                "key": "FlatModifier",
                "type": "item",
                "value": 1,
                "selector": [
                  "deception",
                  "performance"
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
          "starfinder": {},
          "unselectable": false,
          "broken_threshold": 0
        },
        "created_at": "2024-04-19T04:24:24.491209+00:00",
        "operations": [
          {
            "id": "42759d64-fa15-4c74-bfb4-0b28f96ae928",
            "data": {
              "text": "while playing the mandolin",
              "type": "item",
              "value": "1",
              "variable": "SKILL_PERFORMANCE"
            },
            "type": "addBonusToValue"
          },
          {
            "id": "bb0b51c3-f69c-4598-be54-10578bde555a",
            "data": {
              "text": "while playing the mandolin",
              "type": "item",
              "value": "1",
              "variable": "SKILL_DECEPTION"
            },
            "type": "addBonusToValue"
          }
        ],
        "description": "Sought after by many unscrupulous bards, this instrument is surprisingly light and easy to carry, but also empowered with a number of spells carefully selected to help with fooling others or making a hasty retreat. While playing the mandolin, you gain a +1 item bonus to Deception and Performance checks.\n\n**Activate** <abbr cost=\"ONE-ACTION\" class=\"action-symbol\">1</abbr> ([concentrate](link_trait_1432)) **Effect** You change the instrument's color and shape to one you prefer, and you can turn it into a different handheld string instrument that takes two hands to play.\n\n**Activate** Cast a Spell; **Effect** You expend a number of charges from this instrument to cast a spell from its list.\n\n*   **Cantrip** [prestidigitation](link_spell_4778)\n    \n*   **1st** [illusory disguise](link_spell_4677), [item facade](link_spell_4691), [ventriloquism](link_spell_4931)\n    \n*   **2nd** [blur](link_spell_4421), [illusory creature](link_spell_4676), [illusory disguise](link_spell_4677), [invisibility](link_spell_4689)\n    \n*   **3rd** [illusory disguise](link_spell_4677), [phantom prison](link_spell_5415), [sculpt sound](link_spell_5260)",
        "availability": null,
        "content_source_id": 16,
        "craft_requirements": "Supply one casting of all listed levels of all listed spells."
      },
      "primary": {
        "url": "https://2e.aonprd.com/Equipment.aspx?ID=2271",
        "captured_at": "2026-10-01T19:40:17.829Z",
        "sha256": "76860618f28869699ab98e3308474cd7aa141ffd627e471afe84bbb7fc1deab6"
      },
      "rationale": "The printed skill bonuses apply only while playing the instrument. Keep both existing operation IDs and numeric/type/skill values; make the printed playing condition explicit so holding an idle instrument cannot automatically increase unrelated checks."
    },
    {
      "id": 12560,
      "name": "Trickster's Mandolin (Major)",
      "anchor": {
        "id": 12560,
        "bulk": "0.1",
        "name": "Trickster's Mandolin (Major)",
        "size": "MEDIUM",
        "uuid": "477545254693953",
        "group": "GENERAL",
        "hands": null,
        "level": 12,
        "price": {
          "gp": 1900
        },
        "usage": "held-in-two-hands",
        "rarity": "COMMON",
        "traits": [
          2861,
          1447,
          1514,
          1546
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
            "url": "https://2e.aonprd.com/Equipment.aspx?ID=4805",
            "book": "Treasure Vault",
            "page": "137"
          },
          "charges": {},
          "foundry": {
            "items": [],
            "rules": [
              {
                "key": "FlatModifier",
                "type": "item",
                "value": 2,
                "selector": [
                  "deception",
                  "performance"
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
          "starfinder": {},
          "unselectable": false,
          "broken_threshold": 0
        },
        "created_at": "2024-04-19T04:24:25.024099+00:00",
        "operations": [
          {
            "id": "1d5bd62c-689d-4a60-8670-e3108296049b",
            "data": {
              "text": "",
              "type": "item",
              "value": "2",
              "variable": "SKILL_PERFORMANCE"
            },
            "type": "addBonusToValue"
          },
          {
            "id": "1e1b0468-e8c2-4222-b90e-738c5201e4f0",
            "data": {
              "text": "",
              "type": "item",
              "value": "2",
              "variable": "SKILL_DECEPTION"
            },
            "type": "addBonusToValue"
          }
        ],
        "description": "Sought after by many unscrupulous bards, this instrument is surprisingly light and easy to carry, but also empowered with a number of spells carefully selected to help with fooling others or making a hasty retreat. While playing the mandolin, you gain a +2 item bonus to Deception and Performance checks.\n\n**Activate** <abbr cost=\"ONE-ACTION\" class=\"action-symbol\">1</abbr> ([concentrate](link_trait_1432)) **Effect** You change the instrument's color and shape to one you prefer, and you can turn it into a different handheld string instrument that takes two hands to play.\n\n**Activate** Cast a Spell; **Effect** You expend a number of charges from this instrument to cast a spell from its list.\n\n*   **Cantrip** [prestidigitation](link_spell_4778)\n    \n*   **1st** [illusory disguise](link_spell_4677), [item facade](link_spell_4691), [ventriloquism](link_spell_4931)\n    \n*   **2nd** [blur](link_spell_4421), [illusory creature](link_spell_4676), [illusory disguise](link_spell_4677), [invisibility](link_spell_4689)\n    \n*   **3rd** [illusory disguise](link_spell_4677), [phantom prison](link_spell_5415), [sculpt sound](link_spell_5260)\n    \n*   **4th** [confusion](link_spell_4533), [invisibility](link_spell_4689), [illusory disguise](link_spell_4677)\n    \n*   **5th** [hallucination](link_spell_4651), [illusory scene](link_spell_4679), [veil](link_spell_6195)",
        "availability": null,
        "content_source_id": 16,
        "craft_requirements": "Supply one casting of all listed levels of all listed spells."
      },
      "final": {
        "id": 12560,
        "bulk": "0.1",
        "name": "Trickster's Mandolin (Major)",
        "size": "MEDIUM",
        "uuid": "477545254693953",
        "group": "GENERAL",
        "hands": null,
        "level": 12,
        "price": {
          "gp": 1900
        },
        "usage": "held-in-two-hands",
        "rarity": "COMMON",
        "traits": [
          2861,
          1447,
          1514,
          1546
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
            "url": "https://2e.aonprd.com/Equipment.aspx?ID=4805",
            "book": "Treasure Vault",
            "page": "137"
          },
          "charges": {},
          "foundry": {
            "items": [],
            "rules": [
              {
                "key": "FlatModifier",
                "type": "item",
                "value": 2,
                "selector": [
                  "deception",
                  "performance"
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
          "starfinder": {},
          "unselectable": false,
          "broken_threshold": 0
        },
        "created_at": "2024-04-19T04:24:25.024099+00:00",
        "operations": [
          {
            "id": "1d5bd62c-689d-4a60-8670-e3108296049b",
            "data": {
              "text": "while playing the mandolin",
              "type": "item",
              "value": "2",
              "variable": "SKILL_PERFORMANCE"
            },
            "type": "addBonusToValue"
          },
          {
            "id": "1e1b0468-e8c2-4222-b90e-738c5201e4f0",
            "data": {
              "text": "while playing the mandolin",
              "type": "item",
              "value": "2",
              "variable": "SKILL_DECEPTION"
            },
            "type": "addBonusToValue"
          }
        ],
        "description": "Sought after by many unscrupulous bards, this instrument is surprisingly light and easy to carry, but also empowered with a number of spells carefully selected to help with fooling others or making a hasty retreat. While playing the mandolin, you gain a +2 item bonus to Deception and Performance checks.\n\n**Activate** <abbr cost=\"ONE-ACTION\" class=\"action-symbol\">1</abbr> ([concentrate](link_trait_1432)) **Effect** You change the instrument's color and shape to one you prefer, and you can turn it into a different handheld string instrument that takes two hands to play.\n\n**Activate** Cast a Spell; **Effect** You expend a number of charges from this instrument to cast a spell from its list.\n\n*   **Cantrip** [prestidigitation](link_spell_4778)\n    \n*   **1st** [illusory disguise](link_spell_4677), [item facade](link_spell_4691), [ventriloquism](link_spell_4931)\n    \n*   **2nd** [blur](link_spell_4421), [illusory creature](link_spell_4676), [illusory disguise](link_spell_4677), [invisibility](link_spell_4689)\n    \n*   **3rd** [illusory disguise](link_spell_4677), [phantom prison](link_spell_5415), [sculpt sound](link_spell_5260)\n    \n*   **4th** [confusion](link_spell_4533), [invisibility](link_spell_4689), [illusory disguise](link_spell_4677)\n    \n*   **5th** [hallucination](link_spell_4651), [illusory scene](link_spell_4679), [veil](link_spell_6195)",
        "availability": null,
        "content_source_id": 16,
        "craft_requirements": "Supply one casting of all listed levels of all listed spells."
      },
      "primary": {
        "url": "https://2e.aonprd.com/Equipment.aspx?ID=2271",
        "captured_at": "2026-10-01T19:40:17.829Z",
        "sha256": "76860618f28869699ab98e3308474cd7aa141ffd627e471afe84bbb7fc1deab6"
      },
      "rationale": "The printed skill bonuses apply only while playing the instrument. Keep both existing operation IDs and numeric/type/skill values; make the printed playing condition explicit so holding an idle instrument cannot automatically increase unrelated checks."
    },
    {
      "id": 12561,
      "name": "Trickster's Mandolin",
      "anchor": {
        "id": 12561,
        "bulk": "0.1",
        "name": "Trickster's Mandolin",
        "size": "MEDIUM",
        "uuid": "2351856805833475",
        "group": "GENERAL",
        "hands": null,
        "level": 4,
        "price": {
          "gp": 90
        },
        "usage": "held-in-two-hands",
        "rarity": "COMMON",
        "traits": [
          2861,
          1447,
          1514,
          1546
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
            "url": "https://2e.aonprd.com/Equipment.aspx?ID=4805",
            "book": "Treasure Vault",
            "page": "137"
          },
          "charges": {},
          "foundry": {
            "items": [],
            "rules": [
              {
                "key": "FlatModifier",
                "type": "item",
                "value": 1,
                "selector": [
                  "deception",
                  "performance"
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
          "starfinder": {},
          "unselectable": false,
          "broken_threshold": 0
        },
        "created_at": "2024-04-19T04:24:25.558358+00:00",
        "operations": [
          {
            "id": "1775e617-8b41-472c-8bff-cbd881c6b713",
            "data": {
              "text": "",
              "type": "item",
              "value": "1",
              "variable": "SKILL_PERFORMANCE"
            },
            "type": "addBonusToValue"
          },
          {
            "id": "627cbd14-dac7-4d21-8252-60f27629487b",
            "data": {
              "text": "",
              "type": "item",
              "value": "1",
              "variable": "SKILL_DECEPTION"
            },
            "type": "addBonusToValue"
          }
        ],
        "description": "Sought after by many unscrupulous bards, this instrument is surprisingly light and easy to carry, but also empowered with a number of spells carefully selected to help with fooling others or making a hasty retreat. While playing the mandolin, you gain a +1 item bonus to Deception and Performance checks.\n\n**Activate** <abbr cost=\"ONE-ACTION\" class=\"action-symbol\">1</abbr> envision\n\n**Effect** You change the instrument's color and shape to one you prefer, and you can turn it into a different handheld string instrument that takes two hands to play.\n\n**Activate** [Cast a Spell](link_action_19611)\n\n**Effect** You expend a number of charges from this instrument to cast a spell from its list.\n\n*   **Cantrip** [prestidigitation](link_spell_4778)\n    \n*   **1st** [illusory disguise](link_spell_4677), [item facade](link_spell_4691), [ventriloquism](link_spell_4931)",
        "availability": null,
        "content_source_id": 16,
        "craft_requirements": "Supply one casting of all listed levels of all listed spells."
      },
      "final": {
        "id": 12561,
        "bulk": "0.1",
        "name": "Trickster's Mandolin",
        "size": "MEDIUM",
        "uuid": "2351856805833475",
        "group": "GENERAL",
        "hands": null,
        "level": 4,
        "price": {
          "gp": 90
        },
        "usage": "held-in-two-hands",
        "rarity": "COMMON",
        "traits": [
          2861,
          1447,
          1514,
          1546
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
            "url": "https://2e.aonprd.com/Equipment.aspx?ID=4805",
            "book": "Treasure Vault",
            "page": "137"
          },
          "charges": {},
          "foundry": {
            "items": [],
            "rules": [
              {
                "key": "FlatModifier",
                "type": "item",
                "value": 1,
                "selector": [
                  "deception",
                  "performance"
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
          "starfinder": {},
          "unselectable": false,
          "broken_threshold": 0
        },
        "created_at": "2024-04-19T04:24:25.558358+00:00",
        "operations": [
          {
            "id": "1775e617-8b41-472c-8bff-cbd881c6b713",
            "data": {
              "text": "while playing the mandolin",
              "type": "item",
              "value": "1",
              "variable": "SKILL_PERFORMANCE"
            },
            "type": "addBonusToValue"
          },
          {
            "id": "627cbd14-dac7-4d21-8252-60f27629487b",
            "data": {
              "text": "while playing the mandolin",
              "type": "item",
              "value": "1",
              "variable": "SKILL_DECEPTION"
            },
            "type": "addBonusToValue"
          }
        ],
        "description": "Sought after by many unscrupulous bards, this instrument is surprisingly light and easy to carry, but also empowered with a number of spells carefully selected to help with fooling others or making a hasty retreat. While playing the mandolin, you gain a +1 item bonus to Deception and Performance checks.\n\n**Activate** <abbr cost=\"ONE-ACTION\" class=\"action-symbol\">1</abbr> envision\n\n**Effect** You change the instrument's color and shape to one you prefer, and you can turn it into a different handheld string instrument that takes two hands to play.\n\n**Activate** [Cast a Spell](link_action_19611)\n\n**Effect** You expend a number of charges from this instrument to cast a spell from its list.\n\n*   **Cantrip** [prestidigitation](link_spell_4778)\n    \n*   **1st** [illusory disguise](link_spell_4677), [item facade](link_spell_4691), [ventriloquism](link_spell_4931)",
        "availability": null,
        "content_source_id": 16,
        "craft_requirements": "Supply one casting of all listed levels of all listed spells."
      },
      "primary": {
        "url": "https://2e.aonprd.com/Equipment.aspx?ID=2271",
        "captured_at": "2026-10-01T19:40:17.829Z",
        "sha256": "76860618f28869699ab98e3308474cd7aa141ffd627e471afe84bbb7fc1deab6"
      },
      "rationale": "The printed skill bonuses apply only while playing the instrument. Keep both existing operation IDs and numeric/type/skill values; make the printed playing condition explicit so holding an idle instrument cannot automatically increase unrelated checks."
    },
    {
      "id": 12724,
      "name": "Wildwood Ink (Greater)",
      "anchor": {
        "id": 12724,
        "bulk": "0",
        "name": "Wildwood Ink (Greater)",
        "size": "MEDIUM",
        "uuid": "838205315266359",
        "group": "GENERAL",
        "hands": null,
        "level": 10,
        "price": {
          "gp": 900
        },
        "usage": "tattooed on the body",
        "rarity": "COMMON",
        "traits": [
          1527,
          1454,
          2857
        ],
        "version": "1.0",
        "meta_data": {
          "hp": 0,
          "bulk": {},
          "group": "",
          "runes": {},
          "damage": {
            "die": "",
            "dice": "",
            "extra": "",
            "damageType": ""
          },
          "hp_max": 0,
          "source": {
            "url": "https://2e.aonprd.com/Equipment.aspx?ID=4758",
            "book": "Treasure Vault",
            "page": "123"
          },
          "charges": {},
          "foundry": {
            "items": [],
            "rules": [
              {
                "key": "FlatModifier",
                "type": "item",
                "value": 2,
                "selector": "stealth"
              },
              {
                "key": "FlatModifier",
                "type": "item",
                "label": "PF2E.SpecificRule.Tattoo.WildwoodInk.Greater.InForestLabel",
                "value": 3,
                "selector": "stealth",
                "predicate": [
                  "terrain:forest"
                ]
              },
              {
                "key": "RollOption",
                "label": "PF2E.SkillVariant.Forests",
                "domain": "stealth",
                "option": "terrain:forest",
                "toggleable": true
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
          "starfinder": {},
          "unselectable": false,
          "broken_threshold": 0
        },
        "created_at": "2024-04-19T04:26:07.990465+00:00",
        "operations": [
          {
            "id": "7c166bda-a312-4316-86f3-62891ce515c7",
            "data": {
              "text": "to Stealth checks (+3 in forests)",
              "type": "item",
              "value": "2",
              "variable": "SKILL_STEALTH"
            },
            "type": "addBonusToValue"
          }
        ],
        "description": "These curving, delicate designs resemble leaves, vines, or creepers, most often wrapped around a limb, ear, or throat, or curled around specific muscles. They help you blend in among plants. You gain a +2 item bonus to Stealth checks, which increases to +3 in forests.\n\n**Activate** <abbr cost=\"REACTION\" class=\"action-symbol\">5</abbr>; **Frequency** once per day; **Trigger** A creature would detect you by [Seeking](link_action_19845); **Requirements** You're in a forest or similar natural area; **Effect** The tattoo casts [one with plants](link_spell_4746) on you before you can be noticed. The duration of this spell is 1 hour.\n\nIf you've already Activated the tattoo, you can supply a separate casting of _one with plants_ to recharge the tattoo instead of having the spell's normal effect. This allows you to Activate the tattoo again in the same day. You can do so multiple times each day, but only as many times as you continue to cast _one with plants_ to recharge the tattoo after each use.",
        "availability": null,
        "content_source_id": 16,
        "craft_requirements": null
      },
      "final": {
        "id": 12724,
        "bulk": "0",
        "name": "Wildwood Ink (Greater)",
        "size": "MEDIUM",
        "uuid": "838205315266359",
        "group": "GENERAL",
        "hands": null,
        "level": 10,
        "price": {
          "gp": 900
        },
        "usage": "tattooed on the body",
        "rarity": "COMMON",
        "traits": [
          1527,
          1454,
          2857
        ],
        "version": "1.0",
        "meta_data": {
          "hp": 0,
          "bulk": {},
          "group": "",
          "runes": {},
          "damage": {
            "die": "",
            "dice": "",
            "extra": "",
            "damageType": ""
          },
          "hp_max": 0,
          "source": {
            "url": "https://2e.aonprd.com/Equipment.aspx?ID=4758",
            "book": "Treasure Vault",
            "page": "123"
          },
          "charges": {},
          "foundry": {
            "items": [],
            "rules": [
              {
                "key": "FlatModifier",
                "type": "item",
                "value": 2,
                "selector": "stealth"
              },
              {
                "key": "FlatModifier",
                "type": "item",
                "label": "PF2E.SpecificRule.Tattoo.WildwoodInk.Greater.InForestLabel",
                "value": 3,
                "selector": "stealth",
                "predicate": [
                  "terrain:forest"
                ]
              },
              {
                "key": "RollOption",
                "label": "PF2E.SkillVariant.Forests",
                "domain": "stealth",
                "option": "terrain:forest",
                "toggleable": true
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
          "starfinder": {},
          "unselectable": false,
          "broken_threshold": 0
        },
        "created_at": "2024-04-19T04:26:07.990465+00:00",
        "operations": [
          {
            "id": "8dadd8d6-351b-4ab8-88ff-6aa459332037",
            "data": {
              "text": "",
              "type": "item",
              "value": "2",
              "variable": "SKILL_STEALTH"
            },
            "type": "addBonusToValue"
          },
          {
            "id": "7c166bda-a312-4316-86f3-62891ce515c7",
            "data": {
              "text": "while in forests",
              "type": "item",
              "value": "3",
              "variable": "SKILL_STEALTH"
            },
            "type": "addBonusToValue"
          }
        ],
        "description": "These curving, delicate designs resemble leaves, vines, or creepers, most often wrapped around a limb, ear, or throat, or curled around specific muscles. They help you blend in among plants. You gain a +2 item bonus to Stealth checks, which increases to +3 in forests.\n\n**Activate** <abbr cost=\"REACTION\" class=\"action-symbol\">5</abbr>; **Frequency** once per day; **Trigger** A creature would detect you by [Seeking](link_action_19845); **Requirements** You're in a forest or similar natural area; **Effect** The tattoo casts [one with plants](link_spell_4746) on you before you can be noticed. The duration of this spell is 1 hour.\n\nIf you've already Activated the tattoo, you can supply a separate casting of _one with plants_ to recharge the tattoo instead of having the spell's normal effect. This allows you to Activate the tattoo again in the same day. You can do so multiple times each day, but only as many times as you continue to cast _one with plants_ to recharge the tattoo after each use.",
        "availability": null,
        "content_source_id": 16,
        "craft_requirements": null
      },
      "primary": {
        "url": "https://2e.aonprd.com/Equipment.aspx?ID=2224",
        "captured_at": "2026-10-01T19:40:01.258Z",
        "sha256": "97c5ef0274cbabd3304b1445e1eb9f8a43a7c04097f42a23699d8e15ed6488d0"
      },
      "rationale": "The invested tattoo grants its baseline item bonus to all Stealth, with a higher conditional value in forests. Retain the original operation ID for the contextual forest rider, add a stable new base bonus ID, and use existing typed non-stacking modifier semantics."
    },
    {
      "id": 12725,
      "name": "Wildwood Ink (Major)",
      "anchor": {
        "id": 12725,
        "bulk": "0",
        "name": "Wildwood Ink (Major)",
        "size": "MEDIUM",
        "uuid": "3489433980458872",
        "group": "GENERAL",
        "hands": null,
        "level": 17,
        "price": {
          "gp": 15000
        },
        "usage": "tattooed on the body",
        "rarity": "COMMON",
        "traits": [
          1527,
          1454,
          2857
        ],
        "version": "1.0",
        "meta_data": {
          "hp": 0,
          "bulk": {},
          "group": "",
          "runes": {},
          "damage": {
            "die": "",
            "dice": "",
            "extra": "",
            "damageType": ""
          },
          "hp_max": 0,
          "source": {
            "url": "https://2e.aonprd.com/Equipment.aspx?ID=4758",
            "book": "Treasure Vault",
            "page": "123"
          },
          "charges": {},
          "foundry": {
            "items": [],
            "rules": [
              {
                "key": "FlatModifier",
                "type": "item",
                "value": 3,
                "selector": "stealth"
              },
              {
                "key": "FlatModifier",
                "type": "item",
                "label": "PF2E.SpecificRule.Tattoo.WildwoodInk.Major.InForestLabel",
                "value": 4,
                "selector": "stealth",
                "predicate": [
                  "terrain:forest"
                ]
              },
              {
                "key": "RollOption",
                "label": "PF2E.SkillVariant.Forests",
                "domain": "stealth",
                "option": "terrain:forest",
                "toggleable": true
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
          "starfinder": {},
          "unselectable": false,
          "broken_threshold": 0
        },
        "created_at": "2024-04-19T04:26:08.704753+00:00",
        "operations": [
          {
            "id": "0df89464-4c0d-4b35-a798-597c532ee5db",
            "data": {
              "text": "to Stealth checks (+4 in forests)",
              "type": "item",
              "value": "3",
              "variable": "SKILL_STEALTH"
            },
            "type": "addBonusToValue"
          }
        ],
        "description": "These curving, delicate designs resemble leaves, vines, or creepers, most often wrapped around a limb, ear, or throat, or curled around specific muscles. They help you blend in among plants. You gain a +3 item bonus to Stealth checks, which increases to +4 in forests.\n\n**Activate** <abbr cost=\"REACTION\" class=\"action-symbol\">5</abbr>; **Frequency** once per day; **Trigger** A creature would detect you by [Seeking](link_action_19845); **Requirements** You're in a forest or similar natural area; **Effect** The tattoo casts [one with plants](link_spell_4746) on you before you can be noticed. The duration of this spell is 8 hours.\n\nIf you've already Activated the tattoo, you can supply a separate casting of _one with plants_ to recharge the tattoo instead of having the spell's normal effect. This allows you to Activate the tattoo again in the same day. You can do so multiple times each day, but only as many times as you continue to cast _one with plants_ to recharge the tattoo after each use.",
        "availability": null,
        "content_source_id": 16,
        "craft_requirements": null
      },
      "final": {
        "id": 12725,
        "bulk": "0",
        "name": "Wildwood Ink (Major)",
        "size": "MEDIUM",
        "uuid": "3489433980458872",
        "group": "GENERAL",
        "hands": null,
        "level": 17,
        "price": {
          "gp": 15000
        },
        "usage": "tattooed on the body",
        "rarity": "COMMON",
        "traits": [
          1527,
          1454,
          2857
        ],
        "version": "1.0",
        "meta_data": {
          "hp": 0,
          "bulk": {},
          "group": "",
          "runes": {},
          "damage": {
            "die": "",
            "dice": "",
            "extra": "",
            "damageType": ""
          },
          "hp_max": 0,
          "source": {
            "url": "https://2e.aonprd.com/Equipment.aspx?ID=4758",
            "book": "Treasure Vault",
            "page": "123"
          },
          "charges": {},
          "foundry": {
            "items": [],
            "rules": [
              {
                "key": "FlatModifier",
                "type": "item",
                "value": 3,
                "selector": "stealth"
              },
              {
                "key": "FlatModifier",
                "type": "item",
                "label": "PF2E.SpecificRule.Tattoo.WildwoodInk.Major.InForestLabel",
                "value": 4,
                "selector": "stealth",
                "predicate": [
                  "terrain:forest"
                ]
              },
              {
                "key": "RollOption",
                "label": "PF2E.SkillVariant.Forests",
                "domain": "stealth",
                "option": "terrain:forest",
                "toggleable": true
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
          "starfinder": {},
          "unselectable": false,
          "broken_threshold": 0
        },
        "created_at": "2024-04-19T04:26:08.704753+00:00",
        "operations": [
          {
            "id": "89e0a027-cf52-461d-8ac2-7c89af26c619",
            "data": {
              "text": "",
              "type": "item",
              "value": "3",
              "variable": "SKILL_STEALTH"
            },
            "type": "addBonusToValue"
          },
          {
            "id": "0df89464-4c0d-4b35-a798-597c532ee5db",
            "data": {
              "text": "while in forests",
              "type": "item",
              "value": "4",
              "variable": "SKILL_STEALTH"
            },
            "type": "addBonusToValue"
          }
        ],
        "description": "These curving, delicate designs resemble leaves, vines, or creepers, most often wrapped around a limb, ear, or throat, or curled around specific muscles. They help you blend in among plants. You gain a +3 item bonus to Stealth checks, which increases to +4 in forests.\n\n**Activate** <abbr cost=\"REACTION\" class=\"action-symbol\">5</abbr>; **Frequency** once per day; **Trigger** A creature would detect you by [Seeking](link_action_19845); **Requirements** You're in a forest or similar natural area; **Effect** The tattoo casts [one with plants](link_spell_4746) on you before you can be noticed. The duration of this spell is 8 hours.\n\nIf you've already Activated the tattoo, you can supply a separate casting of _one with plants_ to recharge the tattoo instead of having the spell's normal effect. This allows you to Activate the tattoo again in the same day. You can do so multiple times each day, but only as many times as you continue to cast _one with plants_ to recharge the tattoo after each use.",
        "availability": null,
        "content_source_id": 16,
        "craft_requirements": null
      },
      "primary": {
        "url": "https://2e.aonprd.com/Equipment.aspx?ID=2224",
        "captured_at": "2026-10-01T19:40:01.258Z",
        "sha256": "97c5ef0274cbabd3304b1445e1eb9f8a43a7c04097f42a23699d8e15ed6488d0"
      },
      "rationale": "The invested tattoo grants its baseline item bonus to all Stealth, with a higher conditional value in forests. Retain the original operation ID for the contextual forest rider, add a stable new base bonus ID, and use existing typed non-stacking modifier semantics."
    },
    {
      "id": 12726,
      "name": "Wildwood Ink",
      "anchor": {
        "id": 12726,
        "bulk": "0",
        "name": "Wildwood Ink",
        "size": "MEDIUM",
        "uuid": "6421900467589436",
        "group": "GENERAL",
        "hands": null,
        "level": 4,
        "price": {
          "gp": 80
        },
        "usage": "tattooed on the body",
        "rarity": "COMMON",
        "traits": [
          1527,
          1454,
          2857
        ],
        "version": "1.0",
        "meta_data": {
          "hp": 0,
          "bulk": {},
          "group": "",
          "runes": {},
          "damage": {
            "die": "",
            "dice": "",
            "extra": "",
            "damageType": ""
          },
          "hp_max": 0,
          "source": {
            "url": "https://2e.aonprd.com/Equipment.aspx?ID=4758",
            "book": "Treasure Vault",
            "page": "123"
          },
          "charges": {},
          "foundry": {
            "items": [],
            "rules": [
              {
                "key": "FlatModifier",
                "type": "item",
                "value": 1,
                "selector": "stealth"
              },
              {
                "key": "FlatModifier",
                "type": "item",
                "label": "PF2E.SpecificRule.Tattoo.WildwoodInk.Normal.InForestLabel",
                "value": 2,
                "selector": "stealth",
                "predicate": [
                  "terrain:forest"
                ]
              },
              {
                "key": "RollOption",
                "label": "PF2E.SkillVariant.Forests",
                "domain": "stealth",
                "option": "terrain:forest",
                "toggleable": true
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
          "starfinder": {},
          "unselectable": false,
          "broken_threshold": 0
        },
        "created_at": "2024-04-19T04:26:09.335344+00:00",
        "operations": [
          {
            "id": "1bb26535-02f3-4c6d-8aed-6172aea02357",
            "data": {
              "text": "to Stealth checks (+2 in forests)",
              "type": "item",
              "value": "1",
              "variable": "SKILL_STEALTH"
            },
            "type": "addBonusToValue"
          }
        ],
        "description": "These curving, delicate designs resemble leaves, vines, or creepers, most often wrapped around a limb, ear, or throat, or curled around specific muscles. They help you blend in among plants. You gain a +1 item bonus to Stealth checks, which increases to +2 in forests.\n\n**Activate** <abbr cost=\"REACTION\" class=\"action-symbol\">5</abbr>; **Frequency** once per day; **Trigger** A creature would detect you by [Seeking](link_action_19845); **Requirements** You're in a forest or similar natural area; **Effect** The tattoo casts [one with plants](link_spell_4746) on you before you can be noticed. The duration of this spell is 10 minutes.\n\nIf you've already Activated the tattoo, you can supply a separate casting of _one with plants_ to recharge the tattoo instead of having the spell's normal effect. This allows you to Activate the tattoo again in the same day. You can do so multiple times each day, but only as many times as you continue to cast _one with plants_ to recharge the tattoo after each use.",
        "availability": null,
        "content_source_id": 16,
        "craft_requirements": null
      },
      "final": {
        "id": 12726,
        "bulk": "0",
        "name": "Wildwood Ink",
        "size": "MEDIUM",
        "uuid": "6421900467589436",
        "group": "GENERAL",
        "hands": null,
        "level": 4,
        "price": {
          "gp": 80
        },
        "usage": "tattooed on the body",
        "rarity": "COMMON",
        "traits": [
          1527,
          1454,
          2857
        ],
        "version": "1.0",
        "meta_data": {
          "hp": 0,
          "bulk": {},
          "group": "",
          "runes": {},
          "damage": {
            "die": "",
            "dice": "",
            "extra": "",
            "damageType": ""
          },
          "hp_max": 0,
          "source": {
            "url": "https://2e.aonprd.com/Equipment.aspx?ID=4758",
            "book": "Treasure Vault",
            "page": "123"
          },
          "charges": {},
          "foundry": {
            "items": [],
            "rules": [
              {
                "key": "FlatModifier",
                "type": "item",
                "value": 1,
                "selector": "stealth"
              },
              {
                "key": "FlatModifier",
                "type": "item",
                "label": "PF2E.SpecificRule.Tattoo.WildwoodInk.Normal.InForestLabel",
                "value": 2,
                "selector": "stealth",
                "predicate": [
                  "terrain:forest"
                ]
              },
              {
                "key": "RollOption",
                "label": "PF2E.SkillVariant.Forests",
                "domain": "stealth",
                "option": "terrain:forest",
                "toggleable": true
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
          "starfinder": {},
          "unselectable": false,
          "broken_threshold": 0
        },
        "created_at": "2024-04-19T04:26:09.335344+00:00",
        "operations": [
          {
            "id": "a6d8371e-ab01-46c0-8c52-e4b60fec3e64",
            "data": {
              "text": "",
              "type": "item",
              "value": "1",
              "variable": "SKILL_STEALTH"
            },
            "type": "addBonusToValue"
          },
          {
            "id": "1bb26535-02f3-4c6d-8aed-6172aea02357",
            "data": {
              "text": "while in forests",
              "type": "item",
              "value": "2",
              "variable": "SKILL_STEALTH"
            },
            "type": "addBonusToValue"
          }
        ],
        "description": "These curving, delicate designs resemble leaves, vines, or creepers, most often wrapped around a limb, ear, or throat, or curled around specific muscles. They help you blend in among plants. You gain a +1 item bonus to Stealth checks, which increases to +2 in forests.\n\n**Activate** <abbr cost=\"REACTION\" class=\"action-symbol\">5</abbr>; **Frequency** once per day; **Trigger** A creature would detect you by [Seeking](link_action_19845); **Requirements** You're in a forest or similar natural area; **Effect** The tattoo casts [one with plants](link_spell_4746) on you before you can be noticed. The duration of this spell is 10 minutes.\n\nIf you've already Activated the tattoo, you can supply a separate casting of _one with plants_ to recharge the tattoo instead of having the spell's normal effect. This allows you to Activate the tattoo again in the same day. You can do so multiple times each day, but only as many times as you continue to cast _one with plants_ to recharge the tattoo after each use.",
        "availability": null,
        "content_source_id": 16,
        "craft_requirements": null
      },
      "primary": {
        "url": "https://2e.aonprd.com/Equipment.aspx?ID=2224",
        "captured_at": "2026-10-01T19:40:01.258Z",
        "sha256": "97c5ef0274cbabd3304b1445e1eb9f8a43a7c04097f42a23699d8e15ed6488d0"
      },
      "rationale": "The invested tattoo grants its baseline item bonus to all Stealth, with a higher conditional value in forests. Retain the original operation ID for the contextual forest rider, add a stable new base bonus ID, and use existing typed non-stacking modifier semantics."
    }
  ],
  "dependencies": [
    {
      "table": "trait",
      "id": 1447,
      "name": "Illusion",
      "anchor": {
        "id": 1447,
        "name": "Illusion",
        "uuid": "4088330681988942",
        "meta_data": {
          "source": {
            "url": "https://2e.aonprd.com/Traits.aspx?ID=629",
            "book": "Player Core",
            "page": "457"
          },
          "important": false,
          "class_trait": false,
          "unselectable": false,
          "ancestry_trait": false,
          "creature_trait": true,
          "archetype_trait": false,
          "versatile_heritage_trait": false
        },
        "created_at": "2023-12-02T22:34:07.308588+00:00",
        "description": "Effects and magic items with this trait involve false sensory stimuli.",
        "content_source_id": 3
      }
    },
    {
      "table": "trait",
      "id": 1453,
      "name": "Polymorph",
      "anchor": {
        "id": 1453,
        "name": "Polymorph",
        "uuid": "710137317346589",
        "meta_data": {
          "source": {
            "url": "https://2e.aonprd.com/Traits.aspx?ID=670",
            "book": "Player Core",
            "page": "301"
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
        "created_at": "2023-12-02T22:34:34.973103+00:00",
        "description": "These effects transform the target into a new form. A target can't be under the effect of more than one polymorph effect at a time. If it comes under the effect of a second polymorph effect, the second polymorph effect attempts to [counteract](link_action_27519) the first. If it succeeds, it takes effect, and if it fails, the spell has no effect on that target. Any [Strikes](link_action_19856) specifically granted by a polymorph effect are [magical](link_trait_1504). Unless otherwise stated, polymorph spells don’t allow the target to take on the appearance of a specific individual creature.\n\nIf you take on a battle form with a polymorph spell, the special statistics can be adjusted only by circumstance bonuses, status bonuses, and penalties. Unless otherwise noted, the battle form prevents you from casting spells, speaking, and using most [manipulate](link_trait_1433) actions that require hands. (If there's doubt about whether you can use an action, the GM decides.) You lose your Speeds and gain those of the battle form. Your gear is absorbed into you; the constant abilities of your gear still function, but you can't activate any items.",
        "content_source_id": 3
      }
    },
    {
      "table": "trait",
      "id": 1454,
      "name": "Primal",
      "anchor": {
        "id": 1454,
        "name": "Primal",
        "uuid": "6202647683854077",
        "meta_data": {
          "source": {
            "url": "https://2e.aonprd.com/Traits.aspx?ID=676",
            "book": "Player Core",
            "page": "460"
          },
          "important": false,
          "class_trait": false,
          "unselectable": false,
          "ancestry_trait": false,
          "creature_trait": true,
          "archetype_trait": false,
          "versatile_heritage_trait": false
        },
        "created_at": "2023-12-02T22:34:35.876659+00:00",
        "description": "This magic comes from the primal tradition, connecting to the natural world and instinct. Anything with this trait is [magical](link_trait_1504).",
        "content_source_id": 3
      }
    },
    {
      "table": "trait",
      "id": 1504,
      "name": "Magical",
      "anchor": {
        "id": 1504,
        "name": "Magical",
        "uuid": "445811995976648",
        "meta_data": {
          "source": {
            "url": "https://2e.aonprd.com/Traits.aspx?ID=644",
            "book": "Player Core",
            "page": "458"
          },
          "important": false,
          "class_trait": false,
          "unselectable": false,
          "ancestry_trait": false,
          "creature_trait": false,
          "archetype_trait": false,
          "versatile_heritage_trait": false
        },
        "created_at": "2023-12-02T23:18:16.213808+00:00",
        "description": "Something with the magical trait is imbued with magical energies not tied to a specific tradition of magic. Some items or effects are closely tied to a particular tradition of magic. In these cases, the item has the [arcane](link_trait_1459), [divine](link_trait_1475), [occult](link_trait_1514), or [primal](link_trait_1454) trait instead of the magical trait. Any of these traits indicate that the item is magical.",
        "content_source_id": 3
      }
    },
    {
      "table": "trait",
      "id": 1514,
      "name": "Occult",
      "anchor": {
        "id": 1514,
        "name": "Occult",
        "uuid": "7684663810066007",
        "meta_data": {
          "source": {
            "url": "https://2e.aonprd.com/Traits.aspx?ID=662",
            "book": "Player Core",
            "page": "459"
          },
          "important": false,
          "class_trait": false,
          "unselectable": false,
          "ancestry_trait": false,
          "creature_trait": true,
          "archetype_trait": false,
          "versatile_heritage_trait": false
        },
        "created_at": "2023-12-02T23:22:27.613893+00:00",
        "description": "This magic comes from the occult tradition, calling upon bizarre and ephemeral mysteries. Anything with this trait is [magical](link_trait_1504).",
        "content_source_id": 3
      }
    },
    {
      "table": "trait",
      "id": 1527,
      "name": "Invested",
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
      "id": 1529,
      "name": "Alchemical",
      "anchor": {
        "id": 1529,
        "name": "Alchemical",
        "uuid": "8219993619182426",
        "meta_data": {
          "source": {
            "url": "https://2e.aonprd.com/Traits.aspx?ID=528",
            "book": "Player Core",
            "page": "452"
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
        "created_at": "2023-12-03T18:49:39.550168+00:00",
        "description": "Alchemical items are powered by reactions of alchemical reagents. Unless otherwise noted, alchemical items aren’t [magical](link_trait_1504) and don’t radiate a magical aura.\n\nAlchemical creatures are partially powered by alchemical reactions.",
        "content_source_id": 3
      }
    },
    {
      "table": "trait",
      "id": 1531,
      "name": "Consumable",
      "anchor": {
        "id": 1531,
        "name": "Consumable",
        "uuid": "1807927279366527",
        "meta_data": {
          "source": {
            "url": "https://2e.aonprd.com/Traits.aspx?ID=564",
            "book": "Player Core",
            "page": "454"
          },
          "important": false,
          "class_trait": false,
          "unselectable": false,
          "ancestry_trait": false,
          "creature_trait": false,
          "archetype_trait": false,
          "companion_type_trait": false,
          "versatile_heritage_trait": false
        },
        "created_at": "2023-12-03T18:49:42.111815+00:00",
        "description": "An item with this trait can be used only once. Unless stated otherwise, it’s destroyed after activation. Consumable items include [alchemical](link_trait_1529) items and [magical](link_trait_1504) consumables such as [scrolls](link_trait_1692) and [talismans](link_trait_1544). When a character creates consumable items, they can make them in batches of four.",
        "content_source_id": 3
      }
    },
    {
      "table": "trait",
      "id": 1546,
      "name": "Staff",
      "anchor": {
        "id": 1546,
        "name": "Staff",
        "uuid": "1053442481403873",
        "meta_data": {
          "source": {
            "url": "https://2e.aonprd.com/Traits.aspx?ID=700",
            "book": "GM Core",
            "page": "278"
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
        "created_at": "2023-12-03T18:50:52.858591+00:00",
        "description": "This [magical](link_trait_1504) staff holds spells of a particular theme and allows a spellcaster to cast additional spells by preparing it. A staff gains charges when someone prepares it for the day, adding a number of charges to the staff equal to the highest rank of spell they're able to cast. Depending on whether they're a prepared or spontanous spellcaster, they gain an additional way to add charges to the staff. The person who prepared a staff can expend the charges to cast spells from it.\n\nYou can [Cast a Spell](link_action_19611) from a staff only if you have that spell on your spell list, are able to cast spells of the appropriate rank, and expend a number of charges from the staff equal to the spell’s rank ([cantrips](link_trait_1858) do not require charges to be expended). Use your spell attack roll and spell DC when [Casting a Spell](link_action_19611) from a staff. The spell gains the appropriate trait for your magical tradition ([arcane](link_trait_1459), [divine](link_trait_1475), [occult](link_trait_1514), or [primal](link_trait_1454)) and can be affected by any modifications you can normally make when casting spells, such as [spellshape](link_trait_1465) feats. You must provide any material components, cost, or focus required by the spell, or you fail to cast it.\n\n### Preparing a Staff\n\nDuring your daily preparations, you can prepare a staff to add charges to it for free. When you do so, that staff gains a number of charges equal to the rank of your highest spell slot. You don’t need to expend any spells to add charges in this way. No one can prepare more than one staff per day, nor can a staff be prepared by more than one person per day. If the charges aren’t used within 24 hours, they’re lost, and preparing the staff anew removes any charges previously stored in it. You can prepare a staff only if you have at least one of the staff’s spells on your spell list.\n\n#### Prepared Spellcasters\n\nA prepared spellcaster—such as a cleric, druid, witch, or wizard—can place some of their own magic in a staff to increase its number of charges. When a prepared spellcaster prepares a staff, they can expend a spell slot to add a number of charges equal to the rank of the spell. They can’t expend more than one spell in this way each day. For example, if a wizard can cast 3rd-rank spells and prepared a staff, the staff would gain 3 charges, but wizard could increase this to 6 by expending one of their 3rd-rank spells, 5 by expending a 2nd-rank spell, or 4 by expending a 1st-rank spell.\n\n#### Spontaneous Spellcasters\n\nA spontaneous spellcaster—such as a bard, oracle, or sorcerer—can reduce the number of charges it takes to Activate a staff by supplementing it with their own energy. When a spontaneous spellcaster Activates a staff, they can expend 1 charge from the staff and one of their spell slots to cast a spell from the staff of the same rank (or lower) as the expended spell slot. This doesn’t change the number of actions it takes to cast the spell. For example, if a sorcerer can cast 3rd-rank spells and prepared a staff, the staff would gain 3 charges. They could expend 1 charge and one of their 3rd-rank spell slots to cast a 3rd-rank spell from the staff, or 1 charge and one of their 2nd-rank spell slots to cast a 2nd-rank spell from the staff. They could still expend 3 charges from the staff to cast a 3rd-rank spell from it without using any of their own slots, just like any other spellcaster.\n\n### Attacking with a Staff\n\nStaves are also [staff](link_item_7853) weapons. They can be etched with fundamental runes but not property runes.",
        "content_source_id": 3
      }
    },
    {
      "table": "trait",
      "id": 1553,
      "name": "Elixir",
      "anchor": {
        "id": 1553,
        "name": "Elixir",
        "uuid": "4678862691752191",
        "meta_data": {
          "source": {
            "url": "https://2e.aonprd.com/Traits.aspx?ID=589",
            "book": "Player Core",
            "page": "455"
          },
          "important": false,
          "class_trait": false,
          "unselectable": false,
          "ancestry_trait": false,
          "creature_trait": false,
          "archetype_trait": false,
          "companion_type_trait": false,
          "versatile_heritage_trait": false
        },
        "created_at": "2023-12-03T18:51:11.084096+00:00",
        "description": "Elixirs are [alchemical](link_trait_1529) liquids that are used by drinking them.",
        "content_source_id": 3
      }
    },
    {
      "table": "trait",
      "id": 1563,
      "name": "Mutagen",
      "anchor": {
        "id": 1563,
        "name": "Mutagen",
        "uuid": "5739187126356685",
        "meta_data": {
          "source": {
            "url": "https://2e.aonprd.com/Traits.aspx?ID=808",
            "book": "Player Core 2",
            "page": "289"
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
        "created_at": "2023-12-03T18:52:21.498442+00:00",
        "description": "An elixir with the mutagen trait temporarily transmogrifies the subject’s body and alters its mind. A mutagen always conveys one or more beneficial effects paired with one or more detrimental effects. Mutagens are [polymorph](link_trait_1453) effects, and a subsequent [polymorph](link_trait_1453) effect attempts to [counteract](link_action_27519) an existing effect; the [counteract](link_action_27519) check for a mutagen uses the item’s level and a modifier equal to that level’s DC – 10, as found on the Magic Item DCs Table on page 133 of _GM Core_.",
        "content_source_id": 3
      }
    },
    {
      "table": "trait",
      "id": 1831,
      "name": "Two-Hand d8",
      "anchor": {
        "id": 1831,
        "name": "Two-Hand d8",
        "uuid": "254886444091912",
        "meta_data": {
          "important": true,
          "class_trait": false,
          "unselectable": false,
          "ancestry_trait": false,
          "creature_trait": false,
          "archetype_trait": false,
          "versatile_heritage_trait": false
        },
        "created_at": "2023-12-03T19:16:28.93531+00:00",
        "description": "This weapon can be wielded with two hands to change its weapon damage die to the indicated value. This change applies to all the weapon’s damage dice.",
        "content_source_id": 3
      }
    },
    {
      "table": "trait",
      "id": 2857,
      "name": "Tattoo",
      "anchor": {
        "id": 2857,
        "name": "Tattoo",
        "uuid": "3941412709609205",
        "meta_data": {
          "important": false,
          "class_trait": false,
          "unselectable": false,
          "ancestry_trait": false,
          "creature_trait": false,
          "archetype_trait": false,
          "companion_type_trait": false,
          "versatile_heritage_trait": false
        },
        "created_at": "2024-04-19T04:12:51.547616+00:00",
        "description": "A [magical](link_trait_1504) tattoo has the tattoo trait. It's permanently a part of the subject's body, and reduces the number of items that creature can invest per day by 1. Each tattoo has the [invested](link_trait_1527) trait to indicate this limitation—a magical tattoo is like an invested item that the tattooed creature has no choice but to invest. If the tattoo loses its magic or is destroyed, it no longer reduces your investiture.\n\nJust like a physical magic item, a magical tattoo can be [counteracted](link_action_27519) by spells like [_dispel magic_](link_spell_4572) or [_detonate magic_](link_spell_4565). If destroyed, the tattoo fades from the skin.\n\nIf a creature gets a new magical tattoo when their limit on invested items has already been reduced to zero, the new tattoo's magic fails to take hold, and it becomes a non-magical tattoo instead. However, a tattooist can alter an existing tattoo when they [Craft](link_action_19617) a tattoo, modifying the old one into a different magical tattoo and removing the old effect. Magical tattoos can usually be upgraded into their greater versions by having a tattooist add to or modify the existing tattoo.",
        "content_source_id": 3
      }
    },
    {
      "table": "trait",
      "id": 2861,
      "name": "Coda",
      "anchor": {
        "id": 2861,
        "name": "Coda",
        "uuid": "4102458763152910",
        "meta_data": {
          "important": false,
          "class_trait": false,
          "unselectable": false,
          "ancestry_trait": false,
          "creature_trait": false,
          "archetype_trait": false,
          "companion_type_trait": false,
          "versatile_heritage_trait": false
        },
        "created_at": "2024-04-19T04:13:19.547704+00:00",
        "description": "Instruments with the coda trait work mostly like staves and have the [staff](link_trait_1546) trait. There are two differences: Coda instruments are in the form of musical instruments, and they can be prepared only by bards. Because they're not physically staves, you can't attack with a coda instrument, nor can you etch it with weapon runes.\n\nThe process of preparing a coda instrument involves playing significant portions of songs related to the spells within the instrument—either old standards or ones of your own creation. This leaves magical reverberations within the instrument that allow you to complete the songs by playing their coda later in the day.",
        "content_source_id": 3
      }
    }
  ],
  "sources": [
    {
      "id": 3,
      "name": "Common Core"
    },
    {
      "id": 16,
      "name": "Treasure Vault"
    }
  ],
  "ownership": "Only operations on eleven exact existing catalog items. No saved inventory, custom operations, prose, traits, identities, metadata or source counts are changed.",
  "boundaries": {
    "sense_dulling_hood": "Existing Perception penalty remains contextual because consumable activation/timer is not represented. Blanking it would impose an unsafe penalty merely for carrying the hood.",
    "deadweight": "Will is a contextual descriptor only; current consumable state and duration remain manual.",
    "instrument": "While-playing bonuses use existing conditional modifier display, not an invented playing toggle.",
    "wildwood": "Forest values remain contextual; the represented investment state safely gates the unconditional baseline."
  }
}
$operations096$::jsonb as spec
)
select 'treasure-vault-item-operations' as id,
  not exists (
    select 1 from jsonb_array_elements(spec->'patches') patch
    left join public.item i on i.id=(patch->>'id')::bigint
    where i.id is null
       or ((to_jsonb(i)-'updated_at'-'search_tsv')||jsonb_build_object('uuid',i.uuid::text)) is distinct from patch->'final'
  )
  and not exists (
    select 1 from jsonb_array_elements(spec->'dependencies') dependency
    left join public.trait t on t.id=(dependency->>'id')::bigint
    where t.id is null
       or ((to_jsonb(t)-'updated_at'-'search_tsv')||jsonb_build_object('uuid',t.uuid::text)) is distinct from dependency->'anchor'
  )
  and not exists (
    select 1 from jsonb_array_elements(spec->'sources') source
    left join public.content_source s on s.id=(source->>'id')::bigint
    where s.id is null or s.name is distinct from source->>'name' or s.user_id is not null or s.is_published is distinct from true
  )
  and not exists (
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
          select 1 from jsonb_array_elements(spec->'patches') p
          where u.type='item'
            and (u.ref_id=(p->>'id')::bigint or u.data->>'id'=p->>'id'
                 or u.data->>'uuid'=p#>>'{anchor,uuid}'
                 or ((u.content_source_id=16 or u.data->>'content_source_id'='16')
                     and lower(btrim(u.data->>'name'))=lower(btrim(p->>'name')))
                 or lower(btrim(u.data#>>'{meta_data,source,url}'))
                    in (lower(btrim(p#>>'{anchor,meta_data,source,url}')),lower(btrim(p#>>'{primary,url}'))))
        )
        or exists (
          select 1 from jsonb_array_elements(spec->'dependencies') d
          where u.type='trait'
            and (u.ref_id=(d->>'id')::bigint or u.data->>'id'=d->>'id'
                 or u.data->>'uuid'=d#>>'{anchor,uuid}'
                 or ((u.content_source_id=(d#>>'{anchor,content_source_id}')::bigint
                      or u.data->>'content_source_id'=d#>>'{anchor,content_source_id}')
                     and lower(btrim(u.data->>'name'))=lower(btrim(d->>'name'))))
        )
      )
  ) as passed
from settings
)
select original_checks.id,case when coalesce((status.value->>'recognized')::boolean,true) then coalesce((status.value->>'passed')::boolean,false) else original_checks.passed end as passed from original_checks cross join terminal_status status;
