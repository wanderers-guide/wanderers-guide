-- Preserve original check IDs and predicates; use the pinned shared terminal check.
with terminal_function as materialized(select (exists(select 1 from pg_catalog.pg_proc p
  where p.oid=pg_catalog.to_regprocedure('public.treasure_vault_terminal_status_v1()')
    and pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to((p.prosrc)::text,'UTF8')),'hex')='18134f9ceb5b974368dcfba9e6a145c839b63a762014424005872665b4dce869'
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
-- Verify the exact terminal catalog state without changing any data.
with settings as (
  select $scalar095$
{
  "capture": "2026-10-02T18:19:38.179Z",
  "patches": [
    {
      "id": 11689,
      "name": "Alchemical Gauntlet",
      "path": [
        "bulk"
      ],
      "before_exists": true,
      "before": "0.1",
      "after": "0",
      "anchor": {
        "id": 11689,
        "bulk": "0.1",
        "name": "Alchemical Gauntlet",
        "size": "MEDIUM",
        "uuid": "963271068841821",
        "group": "WEAPON",
        "hands": "1",
        "level": 1,
        "price": {
          "gp": 10
        },
        "usage": "",
        "rarity": "COMMON",
        "traits": [
          1569,
          1529,
          1714
        ],
        "version": "1.0",
        "meta_data": {
          "hp": 0,
          "bulk": {},
          "group": "brawling",
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
            "url": "https://2e.aonprd.com/Equipment.aspx?ID=4504",
            "book": "Treasure Vault",
            "page": "62"
          },
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
            "type": null,
            "grade": null
          },
          "quantity": 1,
          "base_item": "gauntlet",
          "image_url": "",
          "is_shoddy": false,
          "starfinder": {},
          "unselectable": false,
          "broken_threshold": 0
        },
        "created_at": "2024-04-19T04:12:41.647439+00:00",
        "operations": null,
        "description": "An alchemical gauntlet emits small alchemical detonations when it makes contact with a foe. As an <abbr cost=\"ONE-ACTION\" class=\"action-symbol\">1</abbr> [Interact](link_action_19733) action, you can place a bomb into a metal bracket near the wrist of the gauntlet. The bomb must be one that deals energy damage, such as an [acid flask](link_item_6671), [alchemist's fire](link_item_6689), [bottled lightning](link_item_16068), [frost vial](link_item_16419), or [thunderstone](link_item_13846). The next three attacks made with the gauntlet deal 1d4 damage of the bomb's damage type in addition to the gauntlet's normal damage. If the second and third attacks aren't all made within 1 minute of the first attack, the bomb's energy is wasted. These attacks never deal [splash](link_trait_1532) damage or other special effects of the [bomb](link_trait_1530) and aren't modified by any abilities that add to or modify a bomb's effect.",
        "availability": null,
        "content_source_id": 16,
        "craft_requirements": null
      },
      "final": {
        "id": 11689,
        "bulk": "0",
        "name": "Alchemical Gauntlet",
        "size": "MEDIUM",
        "uuid": "963271068841821",
        "group": "WEAPON",
        "hands": "1",
        "level": 1,
        "price": {
          "gp": 10
        },
        "usage": "",
        "rarity": "COMMON",
        "traits": [
          1569,
          1529,
          1714
        ],
        "version": "1.0",
        "meta_data": {
          "hp": 0,
          "bulk": {},
          "group": "brawling",
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
            "url": "https://2e.aonprd.com/Equipment.aspx?ID=4504",
            "book": "Treasure Vault",
            "page": "62"
          },
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
            "type": null,
            "grade": null
          },
          "quantity": 1,
          "base_item": "gauntlet",
          "image_url": "",
          "is_shoddy": false,
          "starfinder": {},
          "unselectable": false,
          "broken_threshold": 0
        },
        "created_at": "2024-04-19T04:12:41.647439+00:00",
        "operations": null,
        "description": "An alchemical gauntlet emits small alchemical detonations when it makes contact with a foe. As an <abbr cost=\"ONE-ACTION\" class=\"action-symbol\">1</abbr> [Interact](link_action_19733) action, you can place a bomb into a metal bracket near the wrist of the gauntlet. The bomb must be one that deals energy damage, such as an [acid flask](link_item_6671), [alchemist's fire](link_item_6689), [bottled lightning](link_item_16068), [frost vial](link_item_16419), or [thunderstone](link_item_13846). The next three attacks made with the gauntlet deal 1d4 damage of the bomb's damage type in addition to the gauntlet's normal damage. If the second and third attacks aren't all made within 1 minute of the first attack, the bomb's energy is wasted. These attacks never deal [splash](link_trait_1532) damage or other special effects of the [bomb](link_trait_1530) and aren't modified by any abilities that add to or modify a bomb's effect.",
        "availability": null,
        "content_source_id": 16,
        "craft_requirements": null
      },
      "primary": {
        "url": "https://2e.aonprd.com/Equipment.aspx?ID=1971",
        "book": "Treasure Vault (Remastered)",
        "page": "62",
        "sha256": "0ca67161f5e1999a397e3f893c048c48d07531da7c8e09f5d6228d0611ea9aae",
        "captured_at": "2026-10-01T19:38:32.828Z"
      },
      "rationale": "Printed physical field agrees across legacy and remastered definitions; all other mechanics preserved."
    },
    {
      "id": 11774,
      "name": "Blightburn Bomb (Greater)",
      "path": [
        "meta_data",
        "attack_bonus"
      ],
      "before_exists": false,
      "before": null,
      "after": 3,
      "anchor": {
        "id": 11774,
        "bulk": "0.1",
        "name": "Blightburn Bomb (Greater)",
        "size": "MEDIUM",
        "uuid": "4147634037626075",
        "group": "WEAPON",
        "hands": null,
        "level": 20,
        "price": {
          "gp": 12000
        },
        "usage": "held-in-one-hand",
        "rarity": "UNCOMMON",
        "traits": [
          1529,
          1530,
          1531,
          1857,
          1476,
          1532
        ],
        "version": "1.0",
        "meta_data": {
          "hp": 0,
          "bulk": {},
          "group": "bomb",
          "range": 20,
          "runes": {
            "potency": 0,
            "property": [],
            "striking": 0
          },
          "damage": {
            "die": "d6",
            "dice": 4,
            "damageType": "poison",
            "persistent": {
              "type": "poison",
              "faces": 4,
              "number": 4
            }
          },
          "hp_max": 0,
          "reload": "-",
          "source": {
            "url": "https://2e.aonprd.com/Equipment.aspx?ID=4435",
            "book": "Treasure Vault",
            "page": "44"
          },
          "foundry": {
            "bonus": 2,
            "items": [],
            "rules": [],
            "bonus_damage": 0,
            "container_id": null,
            "splash_damage": 4
          },
          "category": "martial",
          "hardness": 0,
          "material": {
            "type": null,
            "grade": null
          },
          "quantity": 1,
          "base_item": "alchemical-bomb",
          "broken_threshold": 0
        },
        "created_at": "2024-04-19T04:14:10.180555+00:00",
        "operations": null,
        "description": "**Activate** 1 Strike\n\nBlightburn bombs have radioactive materials sealed inside flasks treated with lead. The bomb grants a +3 item bonus to attack rolls and deals 4d6 poison damage, 4d4 persistent poison damage, and 4 poison splash damage, according to the bomb's type. A creature that takes the persistent poison damage deals the splash damage again from its current position as the radiation continues to harm nearby creatures. The persistent damage can last up to 1 minute. Blightburn bombs also expose the primary target to blightburn sickness.\n\n**Saving Throw** Fortitude 43\n\n**Onset** \\[\\[/r 1d4 #days\\]\\]{1d4 days}\n\n**Stage 1** drained 1 (1 day)\n\n**Stage 2** drained 1 and sickened 1 (1 day)\n\n**Stage 3** drained 2 and sickened 2 (1 week)\n\n**Stage 4** drained 3 and sickened 3 (1 month)\n\n**Stage 5** increase drained condition by 1 (1 year)",
        "availability": null,
        "content_source_id": 16,
        "craft_requirements": null
      },
      "final": {
        "id": 11774,
        "bulk": "0.1",
        "name": "Blightburn Bomb (Greater)",
        "size": "MEDIUM",
        "uuid": "4147634037626075",
        "group": "WEAPON",
        "hands": null,
        "level": 20,
        "price": {
          "gp": 12000
        },
        "usage": "held-in-one-hand",
        "rarity": "UNCOMMON",
        "traits": [
          1529,
          1530,
          1531,
          1857,
          1476,
          1532
        ],
        "version": "1.0",
        "meta_data": {
          "hp": 0,
          "bulk": {},
          "group": "bomb",
          "range": 20,
          "runes": {
            "potency": 0,
            "property": [],
            "striking": 0
          },
          "damage": {
            "die": "d6",
            "dice": 4,
            "damageType": "poison",
            "persistent": {
              "type": "poison",
              "faces": 4,
              "number": 4
            }
          },
          "hp_max": 0,
          "reload": "-",
          "source": {
            "url": "https://2e.aonprd.com/Equipment.aspx?ID=4435",
            "book": "Treasure Vault",
            "page": "44"
          },
          "foundry": {
            "bonus": 2,
            "items": [],
            "rules": [],
            "bonus_damage": 0,
            "container_id": null,
            "splash_damage": 4
          },
          "category": "martial",
          "hardness": 0,
          "material": {
            "type": null,
            "grade": null
          },
          "quantity": 1,
          "base_item": "alchemical-bomb",
          "broken_threshold": 0,
          "attack_bonus": 3
        },
        "created_at": "2024-04-19T04:14:10.180555+00:00",
        "operations": null,
        "description": "**Activate** 1 Strike\n\nBlightburn bombs have radioactive materials sealed inside flasks treated with lead. The bomb grants a +3 item bonus to attack rolls and deals 4d6 poison damage, 4d4 persistent poison damage, and 4 poison splash damage, according to the bomb's type. A creature that takes the persistent poison damage deals the splash damage again from its current position as the radiation continues to harm nearby creatures. The persistent damage can last up to 1 minute. Blightburn bombs also expose the primary target to blightburn sickness.\n\n**Saving Throw** Fortitude 43\n\n**Onset** \\[\\[/r 1d4 #days\\]\\]{1d4 days}\n\n**Stage 1** drained 1 (1 day)\n\n**Stage 2** drained 1 and sickened 1 (1 day)\n\n**Stage 3** drained 2 and sickened 2 (1 week)\n\n**Stage 4** drained 3 and sickened 3 (1 month)\n\n**Stage 5** increase drained condition by 1 (1 year)",
        "availability": null,
        "content_source_id": 16,
        "craft_requirements": null
      },
      "primary": {
        "url": "https://2e.aonprd.com/Equipment.aspx?ID=1902",
        "book": "Treasure Vault (Remastered)",
        "page": "44",
        "sha256": "efbfb8cfab3da02781a9a850cc33f8e90e747b81c50c776c991f9526569a10a7",
        "captured_at": "2026-10-01T19:38:08.558Z"
      },
      "rationale": "Restore printed attack bonus through actual runtime leaf. Foundry.bonus, damage, splash and conditional Lodestone persistent damage remain unchanged."
    },
    {
      "id": 11775,
      "name": "Blightburn Bomb",
      "path": [
        "meta_data",
        "attack_bonus"
      ],
      "before_exists": false,
      "before": null,
      "after": 2,
      "anchor": {
        "id": 11775,
        "bulk": "0.1",
        "name": "Blightburn Bomb",
        "size": "MEDIUM",
        "uuid": "6977801521699596",
        "group": "WEAPON",
        "hands": null,
        "level": 15,
        "price": {
          "gp": 1200
        },
        "usage": "held-in-one-hand",
        "rarity": "UNCOMMON",
        "traits": [
          1529,
          1530,
          1531,
          1857,
          1476,
          1532
        ],
        "version": "1.0",
        "meta_data": {
          "hp": 0,
          "bulk": {},
          "group": "bomb",
          "range": 20,
          "runes": {
            "potency": 0,
            "property": [],
            "striking": 0
          },
          "damage": {
            "die": "d6",
            "dice": 3,
            "damageType": "poison",
            "persistent": {
              "type": "poison",
              "faces": 4,
              "number": 3
            }
          },
          "hp_max": 0,
          "reload": "-",
          "source": {
            "url": "https://2e.aonprd.com/Equipment.aspx?ID=4435",
            "book": "Treasure Vault",
            "page": "44"
          },
          "foundry": {
            "bonus": 2,
            "items": [],
            "rules": [],
            "bonus_damage": 0,
            "container_id": null,
            "splash_damage": 3
          },
          "category": "martial",
          "hardness": 0,
          "material": {
            "type": null,
            "grade": null
          },
          "quantity": 1,
          "base_item": "alchemical-bomb",
          "broken_threshold": 0
        },
        "created_at": "2024-04-19T04:14:10.836974+00:00",
        "operations": null,
        "description": "**Activate** 1 Strike\n\nBlightburn bombs have radioactive materials sealed inside flasks treated with lead. The bomb grants a +2 item bonus to attack rolls and deals 3d6 poison damage, 3d4 persistent poison damage, and 3 poison splash damage, according to the bomb's type. A creature that takes the persistent poison damage deals the splash damage again from its current position as the radiation continues to harm nearby creatures. The persistent damage can last up to 1 minute. Blightburn bombs also expose the primary target to blightburn sickness.\n\n**Saving Throw** Fortitude 34\n\n**Onset** \\[\\[/r 1d4 #days\\]\\]{1d4 days}\n\n**Stage 1** drained 1 (1 day)\n\n**Stage 2** drained 1 and sickened 1 (1 day)\n\n**Stage 3** drained 2 and sickened 2 (1 week)\n\n**Stage 4** drained 3 and sickened 3 (1 month)\n\n**Stage 5** increase drained condition by 1 (1 year)",
        "availability": null,
        "content_source_id": 16,
        "craft_requirements": null
      },
      "final": {
        "id": 11775,
        "bulk": "0.1",
        "name": "Blightburn Bomb",
        "size": "MEDIUM",
        "uuid": "6977801521699596",
        "group": "WEAPON",
        "hands": null,
        "level": 15,
        "price": {
          "gp": 1200
        },
        "usage": "held-in-one-hand",
        "rarity": "UNCOMMON",
        "traits": [
          1529,
          1530,
          1531,
          1857,
          1476,
          1532
        ],
        "version": "1.0",
        "meta_data": {
          "hp": 0,
          "bulk": {},
          "group": "bomb",
          "range": 20,
          "runes": {
            "potency": 0,
            "property": [],
            "striking": 0
          },
          "damage": {
            "die": "d6",
            "dice": 3,
            "damageType": "poison",
            "persistent": {
              "type": "poison",
              "faces": 4,
              "number": 3
            }
          },
          "hp_max": 0,
          "reload": "-",
          "source": {
            "url": "https://2e.aonprd.com/Equipment.aspx?ID=4435",
            "book": "Treasure Vault",
            "page": "44"
          },
          "foundry": {
            "bonus": 2,
            "items": [],
            "rules": [],
            "bonus_damage": 0,
            "container_id": null,
            "splash_damage": 3
          },
          "category": "martial",
          "hardness": 0,
          "material": {
            "type": null,
            "grade": null
          },
          "quantity": 1,
          "base_item": "alchemical-bomb",
          "broken_threshold": 0,
          "attack_bonus": 2
        },
        "created_at": "2024-04-19T04:14:10.836974+00:00",
        "operations": null,
        "description": "**Activate** 1 Strike\n\nBlightburn bombs have radioactive materials sealed inside flasks treated with lead. The bomb grants a +2 item bonus to attack rolls and deals 3d6 poison damage, 3d4 persistent poison damage, and 3 poison splash damage, according to the bomb's type. A creature that takes the persistent poison damage deals the splash damage again from its current position as the radiation continues to harm nearby creatures. The persistent damage can last up to 1 minute. Blightburn bombs also expose the primary target to blightburn sickness.\n\n**Saving Throw** Fortitude 34\n\n**Onset** \\[\\[/r 1d4 #days\\]\\]{1d4 days}\n\n**Stage 1** drained 1 (1 day)\n\n**Stage 2** drained 1 and sickened 1 (1 day)\n\n**Stage 3** drained 2 and sickened 2 (1 week)\n\n**Stage 4** drained 3 and sickened 3 (1 month)\n\n**Stage 5** increase drained condition by 1 (1 year)",
        "availability": null,
        "content_source_id": 16,
        "craft_requirements": null
      },
      "primary": {
        "url": "https://2e.aonprd.com/Equipment.aspx?ID=1902",
        "book": "Treasure Vault (Remastered)",
        "page": "44",
        "sha256": "efbfb8cfab3da02781a9a850cc33f8e90e747b81c50c776c991f9526569a10a7",
        "captured_at": "2026-10-01T19:38:08.558Z"
      },
      "rationale": "Restore printed attack bonus through actual runtime leaf. Foundry.bonus, damage, splash and conditional Lodestone persistent damage remain unchanged."
    },
    {
      "id": 11796,
      "name": "Boulder Seed (Greater)",
      "path": [
        "meta_data",
        "attack_bonus"
      ],
      "before_exists": false,
      "before": null,
      "after": 3,
      "anchor": {
        "id": 11796,
        "bulk": "0.1",
        "name": "Boulder Seed (Greater)",
        "size": "MEDIUM",
        "uuid": "3258236377882296",
        "group": "WEAPON",
        "hands": null,
        "level": 18,
        "price": {
          "gp": 3600
        },
        "usage": "held-in-one-hand",
        "rarity": "COMMON",
        "traits": [
          1529,
          1530,
          1531,
          1532
        ],
        "version": "1.0",
        "meta_data": {
          "hp": 0,
          "bulk": {},
          "group": "bomb",
          "range": 20,
          "runes": {
            "potency": 0,
            "property": [],
            "striking": 0
          },
          "damage": {
            "die": "d4",
            "dice": 4,
            "damageType": "bludgeoning"
          },
          "hp_max": 0,
          "reload": "-",
          "source": {
            "url": "https://2e.aonprd.com/Equipment.aspx?ID=4436",
            "book": "Treasure Vault",
            "page": "44"
          },
          "foundry": {
            "bonus": 3,
            "items": [],
            "rules": [],
            "bonus_damage": 0,
            "container_id": null,
            "splash_damage": 4
          },
          "category": "martial",
          "hardness": 0,
          "material": {
            "type": null,
            "grade": null
          },
          "quantity": 1,
          "base_item": "alchemical-bomb",
          "broken_threshold": 0
        },
        "created_at": "2024-04-19T04:14:33.281711+00:00",
        "operations": null,
        "description": "**Activate** 1 Strike\n\nThis bomb is made of volatile fluids that rapidly expand and harden when exposed to air. A boulder seed grants a +3 item bonus to attack rolls and deals 4d4 bludgeoning damage and 4 bludgeoning splash damage, according to the bomb's type. When activated, the bomb fills a 5-foot cube with hardened foam, it creates a boulder as hard as stone (Hardness 10, HP 40) that pushes Large or smaller targets. On a critical hit, the target also falls prone. The splash zone fills with rubble, creating difficult terrain. The \"boulder\" the bomb creates fails all saving throws and loses 1 Hardness per round, disintegrating into fine powder when the boulder's Hardness is reduced to 0. At that time, the difficult terrain the bomb created also disappears.",
        "availability": null,
        "content_source_id": 16,
        "craft_requirements": null
      },
      "final": {
        "id": 11796,
        "bulk": "0.1",
        "name": "Boulder Seed (Greater)",
        "size": "MEDIUM",
        "uuid": "3258236377882296",
        "group": "WEAPON",
        "hands": null,
        "level": 18,
        "price": {
          "gp": 3600
        },
        "usage": "held-in-one-hand",
        "rarity": "COMMON",
        "traits": [
          1529,
          1530,
          1531,
          1532
        ],
        "version": "1.0",
        "meta_data": {
          "hp": 0,
          "bulk": {},
          "group": "bomb",
          "range": 20,
          "runes": {
            "potency": 0,
            "property": [],
            "striking": 0
          },
          "damage": {
            "die": "d4",
            "dice": 4,
            "damageType": "bludgeoning"
          },
          "hp_max": 0,
          "reload": "-",
          "source": {
            "url": "https://2e.aonprd.com/Equipment.aspx?ID=4436",
            "book": "Treasure Vault",
            "page": "44"
          },
          "foundry": {
            "bonus": 3,
            "items": [],
            "rules": [],
            "bonus_damage": 0,
            "container_id": null,
            "splash_damage": 4
          },
          "category": "martial",
          "hardness": 0,
          "material": {
            "type": null,
            "grade": null
          },
          "quantity": 1,
          "base_item": "alchemical-bomb",
          "broken_threshold": 0,
          "attack_bonus": 3
        },
        "created_at": "2024-04-19T04:14:33.281711+00:00",
        "operations": null,
        "description": "**Activate** 1 Strike\n\nThis bomb is made of volatile fluids that rapidly expand and harden when exposed to air. A boulder seed grants a +3 item bonus to attack rolls and deals 4d4 bludgeoning damage and 4 bludgeoning splash damage, according to the bomb's type. When activated, the bomb fills a 5-foot cube with hardened foam, it creates a boulder as hard as stone (Hardness 10, HP 40) that pushes Large or smaller targets. On a critical hit, the target also falls prone. The splash zone fills with rubble, creating difficult terrain. The \"boulder\" the bomb creates fails all saving throws and loses 1 Hardness per round, disintegrating into fine powder when the boulder's Hardness is reduced to 0. At that time, the difficult terrain the bomb created also disappears.",
        "availability": null,
        "content_source_id": 16,
        "craft_requirements": null
      },
      "primary": {
        "url": "https://2e.aonprd.com/Equipment.aspx?ID=1903",
        "book": "Treasure Vault (Remastered)",
        "page": "44",
        "sha256": "80959da4baceec4da5ef5f41bb8597e7e875a114b35218b5df3d4e252c2c8fef",
        "captured_at": "2026-10-01T19:38:08.907Z"
      },
      "rationale": "Restore printed attack bonus through actual runtime leaf. Foundry.bonus, damage, splash and conditional Lodestone persistent damage remain unchanged."
    },
    {
      "id": 11797,
      "name": "Boulder Seed",
      "path": [
        "meta_data",
        "attack_bonus"
      ],
      "before_exists": false,
      "before": null,
      "after": 2,
      "anchor": {
        "id": 11797,
        "bulk": "0.1",
        "name": "Boulder Seed",
        "size": "MEDIUM",
        "uuid": "8042468708367882",
        "group": "WEAPON",
        "hands": null,
        "level": 12,
        "price": {
          "gp": 360
        },
        "usage": "held-in-one-hand",
        "rarity": "COMMON",
        "traits": [
          1529,
          1530,
          1531,
          1532
        ],
        "version": "1.0",
        "meta_data": {
          "hp": 0,
          "bulk": {},
          "group": "bomb",
          "range": 20,
          "runes": {
            "potency": 0,
            "property": [],
            "striking": 0
          },
          "damage": {
            "die": "d4",
            "dice": 3,
            "damageType": "bludgeoning"
          },
          "hp_max": 0,
          "reload": "-",
          "source": {
            "url": "https://2e.aonprd.com/Equipment.aspx?ID=4436",
            "book": "Treasure Vault",
            "page": "44"
          },
          "foundry": {
            "bonus": 2,
            "items": [],
            "rules": [],
            "bonus_damage": 0,
            "container_id": null,
            "splash_damage": 3
          },
          "category": "martial",
          "hardness": 0,
          "material": {
            "type": null,
            "grade": null
          },
          "quantity": 1,
          "base_item": "alchemical-bomb",
          "broken_threshold": 0
        },
        "created_at": "2024-04-19T04:14:33.830388+00:00",
        "operations": null,
        "description": "**Activate** 1 Strike\n\nThis bomb is made of volatile fluids that rapidly expand and harden when exposed to air. A boulder seed grants a +2 item bonus to attack rolls and deals 3d4 bludgeoning damage and 3 bludgeoning splash damage, according to the bomb's type. When activated, the bomb fills a 5-foot cube with hardened foam, it creates a boulder as hard as wood (Hardness 5, HP 20) that pushes Medium or smaller targets. On a critical hit, the target also falls prone. The splash zone fills with rubble, creating difficult terrain. The \"boulder\" the bomb creates fails all saving throws and loses 1 Hardness per round, disintegrating into fine powder when the boulder's Hardness is reduced to 0. At that time, the difficult terrain the bomb created also disappears.",
        "availability": null,
        "content_source_id": 16,
        "craft_requirements": null
      },
      "final": {
        "id": 11797,
        "bulk": "0.1",
        "name": "Boulder Seed",
        "size": "MEDIUM",
        "uuid": "8042468708367882",
        "group": "WEAPON",
        "hands": null,
        "level": 12,
        "price": {
          "gp": 360
        },
        "usage": "held-in-one-hand",
        "rarity": "COMMON",
        "traits": [
          1529,
          1530,
          1531,
          1532
        ],
        "version": "1.0",
        "meta_data": {
          "hp": 0,
          "bulk": {},
          "group": "bomb",
          "range": 20,
          "runes": {
            "potency": 0,
            "property": [],
            "striking": 0
          },
          "damage": {
            "die": "d4",
            "dice": 3,
            "damageType": "bludgeoning"
          },
          "hp_max": 0,
          "reload": "-",
          "source": {
            "url": "https://2e.aonprd.com/Equipment.aspx?ID=4436",
            "book": "Treasure Vault",
            "page": "44"
          },
          "foundry": {
            "bonus": 2,
            "items": [],
            "rules": [],
            "bonus_damage": 0,
            "container_id": null,
            "splash_damage": 3
          },
          "category": "martial",
          "hardness": 0,
          "material": {
            "type": null,
            "grade": null
          },
          "quantity": 1,
          "base_item": "alchemical-bomb",
          "broken_threshold": 0,
          "attack_bonus": 2
        },
        "created_at": "2024-04-19T04:14:33.830388+00:00",
        "operations": null,
        "description": "**Activate** 1 Strike\n\nThis bomb is made of volatile fluids that rapidly expand and harden when exposed to air. A boulder seed grants a +2 item bonus to attack rolls and deals 3d4 bludgeoning damage and 3 bludgeoning splash damage, according to the bomb's type. When activated, the bomb fills a 5-foot cube with hardened foam, it creates a boulder as hard as wood (Hardness 5, HP 20) that pushes Medium or smaller targets. On a critical hit, the target also falls prone. The splash zone fills with rubble, creating difficult terrain. The \"boulder\" the bomb creates fails all saving throws and loses 1 Hardness per round, disintegrating into fine powder when the boulder's Hardness is reduced to 0. At that time, the difficult terrain the bomb created also disappears.",
        "availability": null,
        "content_source_id": 16,
        "craft_requirements": null
      },
      "primary": {
        "url": "https://2e.aonprd.com/Equipment.aspx?ID=1903",
        "book": "Treasure Vault (Remastered)",
        "page": "44",
        "sha256": "80959da4baceec4da5ef5f41bb8597e7e875a114b35218b5df3d4e252c2c8fef",
        "captured_at": "2026-10-01T19:38:08.907Z"
      },
      "rationale": "Restore printed attack bonus through actual runtime leaf. Foundry.bonus, damage, splash and conditional Lodestone persistent damage remain unchanged."
    },
    {
      "id": 11943,
      "name": "Dragontooth Leiomano",
      "path": [
        "bulk"
      ],
      "before_exists": true,
      "before": "1",
      "after": "2",
      "anchor": {
        "id": 11943,
        "bulk": "1",
        "name": "Dragontooth Leiomano",
        "size": "MEDIUM",
        "uuid": "6117595607888199",
        "group": "WEAPON",
        "hands": null,
        "level": 13,
        "price": {
          "gp": 3000
        },
        "usage": "held in 1 hand",
        "rarity": "UNCOMMON",
        "traits": [
          1686,
          1837,
          1504
        ],
        "version": "1.0",
        "meta_data": {
          "hp": 0,
          "bulk": {},
          "group": "club",
          "range": null,
          "runes": {
            "potency": 2,
            "property": [],
            "striking": 2
          },
          "damage": {
            "die": "d6",
            "dice": 1,
            "extra": "",
            "damageType": "slashing"
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
          "category": "martial",
          "hardness": 0,
          "material": {
            "type": null,
            "grade": null
          },
          "quantity": 1,
          "base_item": "leiomano",
          "image_url": "",
          "is_shoddy": false,
          "starfinder": {},
          "unselectable": false,
          "broken_threshold": 0,
          "base_item_content": {
            "id": 12150,
            "bulk": "1",
            "name": "Leiomano",
            "size": "MEDIUM",
            "uuid": 348324992258494,
            "group": "WEAPON",
            "hands": "1",
            "level": 0,
            "price": {
              "gp": 2
            },
            "usage": "",
            "rarity": "UNCOMMON",
            "traits": [
              1686,
              1837
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
                "die": "d6",
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
              "category": "martial",
              "hardness": 3,
              "material": {
                "type": null,
                "grade": null
              },
              "quantity": 1,
              "image_url": "",
              "is_shoddy": false,
              "starfinder": {
                "grade": null,
                "slots": []
              },
              "unselectable": false,
              "broken_threshold": 6
            },
            "created_at": "2024-04-19T04:19:23.668549+00:00",
            "operations": null,
            "description": "This thick [club](link_item_6820) is inset with sharp teeth, typically from a shark, that easily tear flesh. It's the preferred weapon of many Minatan warriors.",
            "availability": null,
            "content_source_id": 16,
            "craft_requirements": null
          }
        },
        "created_at": "2024-04-19T04:16:39.455181+00:00",
        "operations": null,
        "description": "Dragon teeth line the edges of this [+2](link_item_7951) [greater striking](link_item_7860) [leiomano](link_item_12150). The leiomano deals an additional 1d6 damage of a type determined by the tradition of the dragon from which the teeth were taken: [force](link_trait_1560) for arcane, [spirit](link_trait_1556) for divine, [mental](link_trait_1448) for occult, or [fire](link_trait_1542) for primal. The weapon also gains the relevant trait (for instance, [fire](link_trait_1542) for a club made with teeth taken from an adamantine dragon).\n\n**Activate** <abbr cost=\"TWO-ACTIONS\" class=\"action-symbol\">2</abbr> ([magical](link_trait_1504), [manipulate](link_trait_1433)) **Frequency** once per minute; **Effect** You swing the leiomano, sending several of the dragon teeth shooting through the air on jets of energy. The dragon teeth deal 3d6 piercing damage and 3d6 damage of the damage type corresponding to the dragon’s tradition in a 15-foot cone (DC 29 basic Reflex save). The teeth hunt down their targets, correcting their flight in midair, which reduces any circumstance bonus from cover by 2.",
        "availability": null,
        "content_source_id": 16,
        "craft_requirements": "The initial raw materials must include teeth from a dragon."
      },
      "final": {
        "id": 11943,
        "bulk": "2",
        "name": "Dragontooth Leiomano",
        "size": "MEDIUM",
        "uuid": "6117595607888199",
        "group": "WEAPON",
        "hands": null,
        "level": 13,
        "price": {
          "gp": 3000
        },
        "usage": "held in 1 hand",
        "rarity": "UNCOMMON",
        "traits": [
          1686,
          1837,
          1504
        ],
        "version": "1.0",
        "meta_data": {
          "hp": 0,
          "bulk": {},
          "group": "club",
          "range": null,
          "runes": {
            "potency": 2,
            "property": [],
            "striking": 2
          },
          "damage": {
            "die": "d6",
            "dice": 1,
            "extra": "",
            "damageType": "slashing"
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
          "category": "martial",
          "hardness": 0,
          "material": {
            "type": null,
            "grade": null
          },
          "quantity": 1,
          "base_item": "leiomano",
          "image_url": "",
          "is_shoddy": false,
          "starfinder": {},
          "unselectable": false,
          "broken_threshold": 0,
          "base_item_content": {
            "id": 12150,
            "bulk": "1",
            "name": "Leiomano",
            "size": "MEDIUM",
            "uuid": 348324992258494,
            "group": "WEAPON",
            "hands": "1",
            "level": 0,
            "price": {
              "gp": 2
            },
            "usage": "",
            "rarity": "UNCOMMON",
            "traits": [
              1686,
              1837
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
                "die": "d6",
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
              "category": "martial",
              "hardness": 3,
              "material": {
                "type": null,
                "grade": null
              },
              "quantity": 1,
              "image_url": "",
              "is_shoddy": false,
              "starfinder": {
                "grade": null,
                "slots": []
              },
              "unselectable": false,
              "broken_threshold": 6
            },
            "created_at": "2024-04-19T04:19:23.668549+00:00",
            "operations": null,
            "description": "This thick [club](link_item_6820) is inset with sharp teeth, typically from a shark, that easily tear flesh. It's the preferred weapon of many Minatan warriors.",
            "availability": null,
            "content_source_id": 16,
            "craft_requirements": null
          }
        },
        "created_at": "2024-04-19T04:16:39.455181+00:00",
        "operations": null,
        "description": "Dragon teeth line the edges of this [+2](link_item_7951) [greater striking](link_item_7860) [leiomano](link_item_12150). The leiomano deals an additional 1d6 damage of a type determined by the tradition of the dragon from which the teeth were taken: [force](link_trait_1560) for arcane, [spirit](link_trait_1556) for divine, [mental](link_trait_1448) for occult, or [fire](link_trait_1542) for primal. The weapon also gains the relevant trait (for instance, [fire](link_trait_1542) for a club made with teeth taken from an adamantine dragon).\n\n**Activate** <abbr cost=\"TWO-ACTIONS\" class=\"action-symbol\">2</abbr> ([magical](link_trait_1504), [manipulate](link_trait_1433)) **Frequency** once per minute; **Effect** You swing the leiomano, sending several of the dragon teeth shooting through the air on jets of energy. The dragon teeth deal 3d6 piercing damage and 3d6 damage of the damage type corresponding to the dragon’s tradition in a 15-foot cone (DC 29 basic Reflex save). The teeth hunt down their targets, correcting their flight in midair, which reduces any circumstance bonus from cover by 2.",
        "availability": null,
        "content_source_id": 16,
        "craft_requirements": "The initial raw materials must include teeth from a dragon."
      },
      "primary": {
        "url": "https://2e.aonprd.com/Equipment.aspx?ID=1885",
        "book": "Treasure Vault (Remastered)",
        "page": "36",
        "sha256": "f4d9d5f23cf4bf764192de88c9745104f33c79e075d88a9d6d66cdf9edf8ff6a",
        "captured_at": "2026-10-01T19:38:02.607Z"
      },
      "rationale": "Printed physical field agrees across legacy and remastered definitions; all other mechanics preserved."
    },
    {
      "id": 11951,
      "name": "Dullahan Codex",
      "path": [
        "bulk"
      ],
      "before_exists": true,
      "before": "0.1",
      "after": "0",
      "anchor": {
        "id": 11951,
        "bulk": "0.1",
        "name": "Dullahan Codex",
        "size": "MEDIUM",
        "uuid": "1150991488142670",
        "group": "GENERAL",
        "hands": null,
        "level": 20,
        "price": {},
        "usage": "other",
        "rarity": "UNIQUE",
        "traits": [
          1558,
          2855,
          1504
        ],
        "version": "1.0",
        "meta_data": {
          "hp": 0,
          "bulk": {},
          "runes": {},
          "hp_max": 0,
          "source": {
            "url": "https://2e.aonprd.com/Equipment.aspx?ID=4908",
            "book": "Treasure Vault",
            "page": "191"
          },
          "foundry": {
            "items": [],
            "rules": [],
            "container_id": null
          },
          "hardness": 0,
          "material": {
            "type": null,
            "grade": null
          },
          "quantity": 1,
          "base_item": null,
          "broken_threshold": 0
        },
        "created_at": "2024-04-19T04:16:45.278425+00:00",
        "operations": null,
        "description": "The origins of the notorious _Dullahan Codex_ are shrouded in mystery. Some legends claim it belongs to a dullahan whose head was taken by the Grim Reaper. Others attribute its creation to a powerful necromancer whose name has been lost to time. Whatever the truth, the grimoire has passed down through the ages, sometimes via mortal hands and other times mysteriously appearing among the possessions of its next target. It deserves its reputation for dooming those who possess it to die, but scholars debate whether the codex causes this fate or merely acts as its harbinger.\n\nThe _Dullahan Codex_ is a jet-black tome bearing a single rune embossed on its cover, and it functions as a \\[\\[Endless Grimoire (True)\\]\\]{True Endless Grimoire}. Inside, scrawled across its parchment pages in a delicate, spidery script, is a lengthy list of names that always appears in a reader's native alphabet. The grimoire isn't sentient, but it selects its owners, quickly passing out of the hands of those it doesn't choose. An intended victim's name appears on the list of names.\n\nIf your name is on the list and you touch the volume or read from its pages, you must attempt a Will 45 save.\n\n**Critical Success** The codex disappears, moving on to a new victim.\n\n**Success** The codex fuses to you.\n\n**Failure** The codex fuses to you, and you become doomed 1.\n\n**Critical Failure** As failure, but you're doomed 2.\n\nIf you attempt to get rid of the codex while it's fused to you, it returns to your possession within an hour. Each day the codex is fused to you, you must attempt another Will saving throw, but a critical success does nothing. The doomed value from the codex can decrease only after it's no longer fused to you; once it's fused to you, you remain its intended victim unless you complete a \\[\\[Freedom\\]\\] ritual aimed at ending this 10th-level effect. (On a critical failure with this ritual, the codex adds all casters to its list.) You can redirect the curse by inscribing another person's name in the grimoire and succeeding at a Arcana 40 or Occultism 40 check. Doing so is an evil act. If the curse is ritually ended or redirected, or the chosen victim dies, the codex moves on to a new victim.",
        "availability": null,
        "content_source_id": 16,
        "craft_requirements": null
      },
      "final": {
        "id": 11951,
        "bulk": "0",
        "name": "Dullahan Codex",
        "size": "MEDIUM",
        "uuid": "1150991488142670",
        "group": "GENERAL",
        "hands": null,
        "level": 20,
        "price": {},
        "usage": "other",
        "rarity": "UNIQUE",
        "traits": [
          1558,
          2855,
          1504
        ],
        "version": "1.0",
        "meta_data": {
          "hp": 0,
          "bulk": {},
          "runes": {},
          "hp_max": 0,
          "source": {
            "url": "https://2e.aonprd.com/Equipment.aspx?ID=4908",
            "book": "Treasure Vault",
            "page": "191"
          },
          "foundry": {
            "items": [],
            "rules": [],
            "container_id": null
          },
          "hardness": 0,
          "material": {
            "type": null,
            "grade": null
          },
          "quantity": 1,
          "base_item": null,
          "broken_threshold": 0
        },
        "created_at": "2024-04-19T04:16:45.278425+00:00",
        "operations": null,
        "description": "The origins of the notorious _Dullahan Codex_ are shrouded in mystery. Some legends claim it belongs to a dullahan whose head was taken by the Grim Reaper. Others attribute its creation to a powerful necromancer whose name has been lost to time. Whatever the truth, the grimoire has passed down through the ages, sometimes via mortal hands and other times mysteriously appearing among the possessions of its next target. It deserves its reputation for dooming those who possess it to die, but scholars debate whether the codex causes this fate or merely acts as its harbinger.\n\nThe _Dullahan Codex_ is a jet-black tome bearing a single rune embossed on its cover, and it functions as a \\[\\[Endless Grimoire (True)\\]\\]{True Endless Grimoire}. Inside, scrawled across its parchment pages in a delicate, spidery script, is a lengthy list of names that always appears in a reader's native alphabet. The grimoire isn't sentient, but it selects its owners, quickly passing out of the hands of those it doesn't choose. An intended victim's name appears on the list of names.\n\nIf your name is on the list and you touch the volume or read from its pages, you must attempt a Will 45 save.\n\n**Critical Success** The codex disappears, moving on to a new victim.\n\n**Success** The codex fuses to you.\n\n**Failure** The codex fuses to you, and you become doomed 1.\n\n**Critical Failure** As failure, but you're doomed 2.\n\nIf you attempt to get rid of the codex while it's fused to you, it returns to your possession within an hour. Each day the codex is fused to you, you must attempt another Will saving throw, but a critical success does nothing. The doomed value from the codex can decrease only after it's no longer fused to you; once it's fused to you, you remain its intended victim unless you complete a \\[\\[Freedom\\]\\] ritual aimed at ending this 10th-level effect. (On a critical failure with this ritual, the codex adds all casters to its list.) You can redirect the curse by inscribing another person's name in the grimoire and succeeding at a Arcana 40 or Occultism 40 check. Doing so is an evil act. If the curse is ritually ended or redirected, or the chosen victim dies, the codex moves on to a new victim.",
        "availability": null,
        "content_source_id": 16,
        "craft_requirements": null
      },
      "primary": {
        "url": "https://2e.aonprd.com/Equipment.aspx?ID=2379",
        "book": "Treasure Vault (Remastered)",
        "page": "191",
        "sha256": "5865e96912b1ced2b8345a7be8ba31721c25d2f62530f9ee45a8787204538ad0",
        "captured_at": "2026-10-01T19:40:54.457Z"
      },
      "rationale": "Explicit remastered printing change; stable identity and saved snapshots preserved."
    },
    {
      "id": 12049,
      "name": "Ghosthand's Comet",
      "path": [
        "meta_data",
        "damage",
        "dice"
      ],
      "before_exists": true,
      "before": 5,
      "after": 2,
      "anchor": {
        "id": 12049,
        "bulk": "2",
        "name": "Ghosthand's Comet",
        "size": "MEDIUM",
        "uuid": "440430599045372",
        "group": "WEAPON",
        "hands": null,
        "level": 23,
        "price": {
          "gp": 71300
        },
        "usage": "held-in-two-hands",
        "rarity": "UNIQUE",
        "traits": [
          1568,
          1554,
          1670,
          2565,
          1504,
          3073
        ],
        "version": "1.0",
        "meta_data": {
          "hp": 0,
          "bulk": {},
          "group": "firearm",
          "range": 300,
          "runes": {
            "potency": 4,
            "property": [
              {
                "id": 12885,
                "name": "Bane"
              },
              {
                "id": 12954,
                "name": "Impactful (Greater)"
              }
            ],
            "striking": 3
          },
          "damage": {
            "die": "d8",
            "dice": 5,
            "damageType": "force"
          },
          "hp_max": 0,
          "reload": "0",
          "source": {
            "url": "https://2e.aonprd.com/Equipment.aspx?ID=4892",
            "book": "Treasure Vault",
            "page": "179"
          },
          "foundry": {
            "bonus": 0,
            "items": [],
            "rules": [
              {
                "key": "DamageDice",
                "label": "Bane",
                "dieSize": "d6",
                "selector": "damage",
                "predicate": [
                  "target:trait:beast"
                ],
                "diceNumber": 1
              }
            ],
            "bonus_damage": 0,
            "container_id": null,
            "splash_damage": 0
          },
          "category": "advanced",
          "hardness": 0,
          "material": {
            "type": "inubrix",
            "grade": "high"
          },
          "quantity": 1,
          "base_item": null,
          "broken_threshold": 0
        },
        "created_at": "2024-04-19T04:18:09.349497+00:00",
        "operations": null,
        "description": "The barrel of this long rifle is translucent in places, forming a swirled pattern along the metal, and its stock is formed of crimson wood. Ghosthand's Comet is a _+4 major striking beast-bane greater impactful_ advanced firearm with a range increment of 300 feet. It deals 5d8 force and has the backstabber, concussive, kickback, and fatal d12 traits. As a star gun, _Ghosthand's Comet_ runs on magic and doesn't use ammunition or black powder. The weapon is silent when fired.\n\n**Activate** F envision\n\n**Effect** For the triggering Strike, _Ghosthand's Comet_ changes its damage type to your choice of acid, cold, electricity, fire, or sonic.\n\n**Activate** 1 envision\n\n**Effect** On your next attempt at a ranged Strike with _Ghosthand's Comet_, the shot phases through any material or magical obstacle, such as a \\[\\[Wall of Force\\]\\], in its path, ignoring all cover. You must attempt the Strike by the end of your turn or this effect is lost.\n\n**Destruction** If the Grim Reaper slays the wielder of Ghosthand's Comet, the Reaper's scythe, as it strikes the killing blow, is destined to slice the star gun in half.",
        "availability": null,
        "content_source_id": 16,
        "craft_requirements": null
      },
      "final": {
        "id": 12049,
        "bulk": "2",
        "name": "Ghosthand's Comet",
        "size": "MEDIUM",
        "uuid": "440430599045372",
        "group": "WEAPON",
        "hands": null,
        "level": 23,
        "price": {
          "gp": 71300
        },
        "usage": "held-in-two-hands",
        "rarity": "UNIQUE",
        "traits": [
          1568,
          1554,
          1670,
          2565,
          1504,
          3073
        ],
        "version": "1.0",
        "meta_data": {
          "hp": 0,
          "bulk": {},
          "group": "firearm",
          "range": 300,
          "runes": {
            "potency": 4,
            "property": [
              {
                "id": 12885,
                "name": "Bane"
              },
              {
                "id": 12954,
                "name": "Impactful (Greater)"
              }
            ],
            "striking": 3
          },
          "damage": {
            "die": "d8",
            "dice": 2,
            "damageType": "force"
          },
          "hp_max": 0,
          "reload": "0",
          "source": {
            "url": "https://2e.aonprd.com/Equipment.aspx?ID=4892",
            "book": "Treasure Vault",
            "page": "179"
          },
          "foundry": {
            "bonus": 0,
            "items": [],
            "rules": [
              {
                "key": "DamageDice",
                "label": "Bane",
                "dieSize": "d6",
                "selector": "damage",
                "predicate": [
                  "target:trait:beast"
                ],
                "diceNumber": 1
              }
            ],
            "bonus_damage": 0,
            "container_id": null,
            "splash_damage": 0
          },
          "category": "advanced",
          "hardness": 0,
          "material": {
            "type": "inubrix",
            "grade": "high"
          },
          "quantity": 1,
          "base_item": null,
          "broken_threshold": 0
        },
        "created_at": "2024-04-19T04:18:09.349497+00:00",
        "operations": null,
        "description": "The barrel of this long rifle is translucent in places, forming a swirled pattern along the metal, and its stock is formed of crimson wood. Ghosthand's Comet is a _+4 major striking beast-bane greater impactful_ advanced firearm with a range increment of 300 feet. It deals 5d8 force and has the backstabber, concussive, kickback, and fatal d12 traits. As a star gun, _Ghosthand's Comet_ runs on magic and doesn't use ammunition or black powder. The weapon is silent when fired.\n\n**Activate** F envision\n\n**Effect** For the triggering Strike, _Ghosthand's Comet_ changes its damage type to your choice of acid, cold, electricity, fire, or sonic.\n\n**Activate** 1 envision\n\n**Effect** On your next attempt at a ranged Strike with _Ghosthand's Comet_, the shot phases through any material or magical obstacle, such as a \\[\\[Wall of Force\\]\\], in its path, ignoring all cover. You must attempt the Strike by the end of your turn or this effect is lost.\n\n**Destruction** If the Grim Reaper slays the wielder of Ghosthand's Comet, the Reaper's scythe, as it strikes the killing blow, is destined to slice the star gun in half.",
        "availability": null,
        "content_source_id": 16,
        "craft_requirements": null
      },
      "primary": {
        "url": "https://2e.aonprd.com/Equipment.aspx?ID=2363",
        "book": "Treasure Vault (Remastered)",
        "page": "179",
        "sha256": "ce85bd49b60b81aed57e735140137cbafe27b3c324690ea979a80f56b447dcde",
        "captured_at": "2026-10-01T19:40:48.858Z"
      },
      "rationale": "Actual weapon runtime adds major-striking3 to raw dice. Store2 so the printed final5d8 remains5 rather than being counted twice as8. Runes and conditional property damage stay unchanged."
    },
    {
      "id": 12070,
      "name": "Harrow Spellcards",
      "path": [
        "price"
      ],
      "before_exists": true,
      "before": {
        "gp": 475
      },
      "after": {
        "gp": 425
      },
      "anchor": {
        "id": 12070,
        "bulk": "0.1",
        "name": "Harrow Spellcards",
        "size": "MEDIUM",
        "uuid": "2619901708740980",
        "group": "GENERAL",
        "hands": null,
        "level": 8,
        "price": {
          "gp": 475
        },
        "usage": "",
        "rarity": "UNCOMMON",
        "traits": [
          2855,
          1504
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
            "url": "https://2e.aonprd.com/Equipment.aspx?ID=4712",
            "book": "Treasure Vault",
            "page": "112"
          },
          "charges": {},
          "foundry": {
            "items": [],
            "rules": [],
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
        "created_at": "2024-04-19T04:18:25.763924+00:00",
        "operations": null,
        "description": "Crafted of sturdy paper, each card of this harrow deck showcases a beautiful watercolor illustration with space to inscribe a spell below. When shuffled, its cards seem to fly between one another of their own accord.\n\n**Activate** <abbr cost=\"FREE-ACTION\" class=\"action-symbol\">4</abbr> ([concentrate](link_trait_1432), [fortune](link_trait_1460)) **Frequency** once per day; **Trigger** Your last action was to cast a spell prepared from this grimoire that has the [detection](link_trait_1508), [prediction](link_trait_1896), [revelation](link_trait_1907), or [scrying](link_trait_1590) trait; **Effect** You draw forth a card to gain insight into future challenges you'll face. Draw a card from a harrow deck or roll 1d6:\n\n1.  hammers (Athletics)\n    \n2.  keys (Acrobatics)\n    \n3.  shields (Survival)\n    \n4.  books (any Recall Knowledge)\n    \n5.  stars (Religion)\n    \n6.  crowns (Diplomacy)\n    \n\nThe next time you attempt a check of the same type as your result, roll twice and take the better result, as the spirits of the harrow guide your actions. If not used by your next daily preparations, this benefit disappears.",
        "availability": null,
        "content_source_id": 16,
        "craft_requirements": null
      },
      "final": {
        "id": 12070,
        "bulk": "0.1",
        "name": "Harrow Spellcards",
        "size": "MEDIUM",
        "uuid": "2619901708740980",
        "group": "GENERAL",
        "hands": null,
        "level": 8,
        "price": {
          "gp": 425
        },
        "usage": "",
        "rarity": "UNCOMMON",
        "traits": [
          2855,
          1504
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
            "url": "https://2e.aonprd.com/Equipment.aspx?ID=4712",
            "book": "Treasure Vault",
            "page": "112"
          },
          "charges": {},
          "foundry": {
            "items": [],
            "rules": [],
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
        "created_at": "2024-04-19T04:18:25.763924+00:00",
        "operations": null,
        "description": "Crafted of sturdy paper, each card of this harrow deck showcases a beautiful watercolor illustration with space to inscribe a spell below. When shuffled, its cards seem to fly between one another of their own accord.\n\n**Activate** <abbr cost=\"FREE-ACTION\" class=\"action-symbol\">4</abbr> ([concentrate](link_trait_1432), [fortune](link_trait_1460)) **Frequency** once per day; **Trigger** Your last action was to cast a spell prepared from this grimoire that has the [detection](link_trait_1508), [prediction](link_trait_1896), [revelation](link_trait_1907), or [scrying](link_trait_1590) trait; **Effect** You draw forth a card to gain insight into future challenges you'll face. Draw a card from a harrow deck or roll 1d6:\n\n1.  hammers (Athletics)\n    \n2.  keys (Acrobatics)\n    \n3.  shields (Survival)\n    \n4.  books (any Recall Knowledge)\n    \n5.  stars (Religion)\n    \n6.  crowns (Diplomacy)\n    \n\nThe next time you attempt a check of the same type as your result, roll twice and take the better result, as the spirits of the harrow guide your actions. If not used by your next daily preparations, this benefit disappears.",
        "availability": null,
        "content_source_id": 16,
        "craft_requirements": null
      },
      "primary": {
        "url": "https://2e.aonprd.com/Equipment.aspx?ID=2178",
        "book": "Treasure Vault (Remastered)",
        "page": "112",
        "sha256": "4f143d3af99f2ded0dcbb4aef224b1f777bcca1c923405aebc77a680906e1260",
        "captured_at": "2026-10-01T19:39:45.158Z"
      },
      "rationale": "Explicit remastered printing change; stable identity and saved snapshots preserved."
    },
    {
      "id": 12176,
      "name": "Lodestone Bomb (Greater)",
      "path": [
        "meta_data",
        "attack_bonus"
      ],
      "before_exists": false,
      "before": null,
      "after": 3,
      "anchor": {
        "id": 12176,
        "bulk": "0.1",
        "name": "Lodestone Bomb (Greater)",
        "size": "MEDIUM",
        "uuid": "8006317605703353",
        "group": "WEAPON",
        "hands": null,
        "level": 18,
        "price": {
          "gp": 4500
        },
        "usage": "held-in-one-hand",
        "rarity": "COMMON",
        "traits": [
          1529,
          1530,
          1531,
          1560,
          1532
        ],
        "version": "1.0",
        "meta_data": {
          "hp": 0,
          "bulk": {},
          "group": "bomb",
          "range": 20,
          "runes": {
            "potency": 0,
            "property": [],
            "striking": 0
          },
          "damage": {
            "die": "d4",
            "dice": 4,
            "damageType": "force"
          },
          "hp_max": 0,
          "reload": "-",
          "source": {
            "url": "https://2e.aonprd.com/Equipment.aspx?ID=4437",
            "book": "Treasure Vault",
            "page": "44"
          },
          "foundry": {
            "bonus": 3,
            "items": [],
            "rules": [],
            "bonus_damage": 0,
            "container_id": null,
            "splash_damage": 3
          },
          "category": "martial",
          "hardness": 0,
          "material": {
            "type": null,
            "grade": null
          },
          "quantity": 1,
          "base_item": "alchemical-bomb",
          "broken_threshold": 0
        },
        "created_at": "2024-04-19T04:19:39.581658+00:00",
        "operations": null,
        "description": "**Activate** 1 Strike\n\nLodestone bombs hold reactive ionized minerals preserved in a dormant state until broken. The bomb grants a +3 item bonus to attack rolls and deals 4d4 force damage and 3 force splash damage. In addition, a target made of metal, wearing metal armor, or using metal weapons takes 3d4 persistent,force and is clumsy 1 and enfeebled 1 while taking the persistent damage. The persistent damage can last up to 1 minute.",
        "availability": null,
        "content_source_id": 16,
        "craft_requirements": null
      },
      "final": {
        "id": 12176,
        "bulk": "0.1",
        "name": "Lodestone Bomb (Greater)",
        "size": "MEDIUM",
        "uuid": "8006317605703353",
        "group": "WEAPON",
        "hands": null,
        "level": 18,
        "price": {
          "gp": 4500
        },
        "usage": "held-in-one-hand",
        "rarity": "COMMON",
        "traits": [
          1529,
          1530,
          1531,
          1560,
          1532
        ],
        "version": "1.0",
        "meta_data": {
          "hp": 0,
          "bulk": {},
          "group": "bomb",
          "range": 20,
          "runes": {
            "potency": 0,
            "property": [],
            "striking": 0
          },
          "damage": {
            "die": "d4",
            "dice": 4,
            "damageType": "force"
          },
          "hp_max": 0,
          "reload": "-",
          "source": {
            "url": "https://2e.aonprd.com/Equipment.aspx?ID=4437",
            "book": "Treasure Vault",
            "page": "44"
          },
          "foundry": {
            "bonus": 3,
            "items": [],
            "rules": [],
            "bonus_damage": 0,
            "container_id": null,
            "splash_damage": 3
          },
          "category": "martial",
          "hardness": 0,
          "material": {
            "type": null,
            "grade": null
          },
          "quantity": 1,
          "base_item": "alchemical-bomb",
          "broken_threshold": 0,
          "attack_bonus": 3
        },
        "created_at": "2024-04-19T04:19:39.581658+00:00",
        "operations": null,
        "description": "**Activate** 1 Strike\n\nLodestone bombs hold reactive ionized minerals preserved in a dormant state until broken. The bomb grants a +3 item bonus to attack rolls and deals 4d4 force damage and 3 force splash damage. In addition, a target made of metal, wearing metal armor, or using metal weapons takes 3d4 persistent,force and is clumsy 1 and enfeebled 1 while taking the persistent damage. The persistent damage can last up to 1 minute.",
        "availability": null,
        "content_source_id": 16,
        "craft_requirements": null
      },
      "primary": {
        "url": "https://2e.aonprd.com/Equipment.aspx?ID=1904",
        "book": "Treasure Vault (Remastered)",
        "page": "44",
        "sha256": "0f49c07abaed4267c37851cc0795e9d85380571216021a7e494d175a095ce3e7",
        "captured_at": "2026-10-01T19:38:09.256Z"
      },
      "rationale": "Restore printed attack bonus through actual runtime leaf. Foundry.bonus, damage, splash and conditional Lodestone persistent damage remain unchanged."
    },
    {
      "id": 12177,
      "name": "Lodestone Bomb",
      "path": [
        "meta_data",
        "attack_bonus"
      ],
      "before_exists": false,
      "before": null,
      "after": 2,
      "anchor": {
        "id": 12177,
        "bulk": "0.1",
        "name": "Lodestone Bomb",
        "size": "MEDIUM",
        "uuid": "1960473164426432",
        "group": "WEAPON",
        "hands": null,
        "level": 12,
        "price": {
          "gp": 400
        },
        "usage": "held-in-one-hand",
        "rarity": "COMMON",
        "traits": [
          1529,
          1530,
          1531,
          1560,
          1532
        ],
        "version": "1.0",
        "meta_data": {
          "hp": 0,
          "bulk": {},
          "group": "bomb",
          "range": 20,
          "runes": {
            "potency": 0,
            "property": [],
            "striking": 0
          },
          "damage": {
            "die": "d4",
            "dice": 3,
            "damageType": "force"
          },
          "hp_max": 0,
          "reload": "-",
          "source": {
            "url": "https://2e.aonprd.com/Equipment.aspx?ID=4437",
            "book": "Treasure Vault",
            "page": "44"
          },
          "foundry": {
            "bonus": 2,
            "items": [],
            "rules": [],
            "bonus_damage": 0,
            "container_id": null,
            "splash_damage": 2
          },
          "category": "martial",
          "hardness": 0,
          "material": {
            "type": null,
            "grade": null
          },
          "quantity": 1,
          "base_item": "alchemical-bomb",
          "broken_threshold": 0
        },
        "created_at": "2024-04-19T04:19:40.281283+00:00",
        "operations": null,
        "description": "**Activate** 1 Strike\n\nLodestone bombs hold reactive ionized minerals preserved in a dormant state until broken. The bomb grants a +2 item bonus to attack rolls and deals 3d4 force damage and 2 force splash damage. In addition, a target made of metal, wearing metal armor, or using metal weapons takes 2d4 persistent,force and is clumsy 1 and enfeebled 1 while taking the persistent damage. The persistent damage can last up to 1 minute.",
        "availability": null,
        "content_source_id": 16,
        "craft_requirements": null
      },
      "final": {
        "id": 12177,
        "bulk": "0.1",
        "name": "Lodestone Bomb",
        "size": "MEDIUM",
        "uuid": "1960473164426432",
        "group": "WEAPON",
        "hands": null,
        "level": 12,
        "price": {
          "gp": 400
        },
        "usage": "held-in-one-hand",
        "rarity": "COMMON",
        "traits": [
          1529,
          1530,
          1531,
          1560,
          1532
        ],
        "version": "1.0",
        "meta_data": {
          "hp": 0,
          "bulk": {},
          "group": "bomb",
          "range": 20,
          "runes": {
            "potency": 0,
            "property": [],
            "striking": 0
          },
          "damage": {
            "die": "d4",
            "dice": 3,
            "damageType": "force"
          },
          "hp_max": 0,
          "reload": "-",
          "source": {
            "url": "https://2e.aonprd.com/Equipment.aspx?ID=4437",
            "book": "Treasure Vault",
            "page": "44"
          },
          "foundry": {
            "bonus": 2,
            "items": [],
            "rules": [],
            "bonus_damage": 0,
            "container_id": null,
            "splash_damage": 2
          },
          "category": "martial",
          "hardness": 0,
          "material": {
            "type": null,
            "grade": null
          },
          "quantity": 1,
          "base_item": "alchemical-bomb",
          "broken_threshold": 0,
          "attack_bonus": 2
        },
        "created_at": "2024-04-19T04:19:40.281283+00:00",
        "operations": null,
        "description": "**Activate** 1 Strike\n\nLodestone bombs hold reactive ionized minerals preserved in a dormant state until broken. The bomb grants a +2 item bonus to attack rolls and deals 3d4 force damage and 2 force splash damage. In addition, a target made of metal, wearing metal armor, or using metal weapons takes 2d4 persistent,force and is clumsy 1 and enfeebled 1 while taking the persistent damage. The persistent damage can last up to 1 minute.",
        "availability": null,
        "content_source_id": 16,
        "craft_requirements": null
      },
      "primary": {
        "url": "https://2e.aonprd.com/Equipment.aspx?ID=1904",
        "book": "Treasure Vault (Remastered)",
        "page": "44",
        "sha256": "0f49c07abaed4267c37851cc0795e9d85380571216021a7e494d175a095ce3e7",
        "captured_at": "2026-10-01T19:38:09.256Z"
      },
      "rationale": "Restore printed attack bonus through actual runtime leaf. Foundry.bonus, damage, splash and conditional Lodestone persistent damage remain unchanged."
    },
    {
      "id": 12212,
      "name": "Mind's Light Circlet",
      "path": [
        "bulk"
      ],
      "before_exists": true,
      "before": "0",
      "after": "0.1",
      "anchor": {
        "id": 12212,
        "bulk": "0",
        "name": "Mind's Light Circlet",
        "size": "MEDIUM",
        "uuid": "6908835286887719",
        "group": "GENERAL",
        "hands": null,
        "level": 11,
        "price": {
          "gp": 1200
        },
        "usage": "wornheadwear",
        "rarity": "COMMON",
        "traits": [
          1526,
          1527,
          1504,
          1517,
          1514
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
            "url": "https://2e.aonprd.com/Equipment.aspx?ID=4860",
            "book": "Treasure Vault",
            "page": "150"
          },
          "charges": {},
          "foundry": {
            "items": [],
            "rules": [
              {
                "key": "FlatModifier",
                "type": "item",
                "value": 2,
                "selector": "occultism"
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
        "created_at": "2024-04-19T04:20:11.133279+00:00",
        "operations": [
          {
            "id": "e4cc30c4-e35c-4c54-b696-2989cb16186d",
            "data": {
              "text": "",
              "type": "item",
              "value": "2",
              "variable": "SKILL_OCCULTISM"
            },
            "type": "addBonusToValue"
          }
        ],
        "description": "Gemstones of many colors adorn the silver of a _mind's light circlet_. When you're charged with mental power, the jewels scintillate with light, with different gems resonating based on your emotions. If you have at least 1 Focus Point, the gems cast dim light in a 10-foot radius. When you amp a spell, the light increases to bright light in a 20-foot radius (and dim light to the next 20 feet) until the start of your next turn.\n\nYou gain a +2 item bonus to Occultism checks. You also gain the following amp, which you can apply to any of your psi cantrips that have a target or area, much like an amp gained from a feat.\n\n**Amp** You transfer some of the magical luminescence from the mind's light circlet to one of the creatures. Choose a creature targeted by the spell or in its area. Until the start of your next turn, that creature sheds bright light in a 20-foot radius (and dim light to the next 20 feet) and can't be Concealed. If the creature is Invisible, it's concealed while alight, rather than being undetected.\n\n**Activate** <abbr cost=\"FREE-ACTION\" class=\"action-symbol\">4</abbr> envision\n\n**Effect** You gain 1 Focus Point, which you can use only to use a psychic amp. If not used by the end of your turn, this Focus Point is lost.",
        "availability": null,
        "content_source_id": 16,
        "craft_requirements": "You are a psychic."
      },
      "final": {
        "id": 12212,
        "bulk": "0.1",
        "name": "Mind's Light Circlet",
        "size": "MEDIUM",
        "uuid": "6908835286887719",
        "group": "GENERAL",
        "hands": null,
        "level": 11,
        "price": {
          "gp": 1200
        },
        "usage": "wornheadwear",
        "rarity": "COMMON",
        "traits": [
          1526,
          1527,
          1504,
          1517,
          1514
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
            "url": "https://2e.aonprd.com/Equipment.aspx?ID=4860",
            "book": "Treasure Vault",
            "page": "150"
          },
          "charges": {},
          "foundry": {
            "items": [],
            "rules": [
              {
                "key": "FlatModifier",
                "type": "item",
                "value": 2,
                "selector": "occultism"
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
        "created_at": "2024-04-19T04:20:11.133279+00:00",
        "operations": [
          {
            "id": "e4cc30c4-e35c-4c54-b696-2989cb16186d",
            "data": {
              "text": "",
              "type": "item",
              "value": "2",
              "variable": "SKILL_OCCULTISM"
            },
            "type": "addBonusToValue"
          }
        ],
        "description": "Gemstones of many colors adorn the silver of a _mind's light circlet_. When you're charged with mental power, the jewels scintillate with light, with different gems resonating based on your emotions. If you have at least 1 Focus Point, the gems cast dim light in a 10-foot radius. When you amp a spell, the light increases to bright light in a 20-foot radius (and dim light to the next 20 feet) until the start of your next turn.\n\nYou gain a +2 item bonus to Occultism checks. You also gain the following amp, which you can apply to any of your psi cantrips that have a target or area, much like an amp gained from a feat.\n\n**Amp** You transfer some of the magical luminescence from the mind's light circlet to one of the creatures. Choose a creature targeted by the spell or in its area. Until the start of your next turn, that creature sheds bright light in a 20-foot radius (and dim light to the next 20 feet) and can't be Concealed. If the creature is Invisible, it's concealed while alight, rather than being undetected.\n\n**Activate** <abbr cost=\"FREE-ACTION\" class=\"action-symbol\">4</abbr> envision\n\n**Effect** You gain 1 Focus Point, which you can use only to use a psychic amp. If not used by the end of your turn, this Focus Point is lost.",
        "availability": null,
        "content_source_id": 16,
        "craft_requirements": "You are a psychic."
      },
      "primary": {
        "url": "https://2e.aonprd.com/Equipment.aspx?ID=2328",
        "book": "Treasure Vault (Remastered)",
        "page": "150",
        "sha256": "c290266e327e0f101a7ec49b3f769cc9490f9cfd8fd83b68cbbc1a2bc170bb94",
        "captured_at": "2026-10-01T19:40:37.075Z"
      },
      "rationale": "Explicit remastered printing change; stable identity and saved snapshots preserved."
    },
    {
      "id": 12401,
      "name": "Shatterstone (Greater)",
      "path": [
        "meta_data",
        "attack_bonus"
      ],
      "before_exists": false,
      "before": null,
      "after": 3,
      "anchor": {
        "id": 12401,
        "bulk": "0.1",
        "name": "Shatterstone (Greater)",
        "size": "MEDIUM",
        "uuid": "7798780290692263",
        "group": "WEAPON",
        "hands": null,
        "level": 18,
        "price": {
          "gp": 3800
        },
        "usage": "held-in-one-hand",
        "rarity": "COMMON",
        "traits": [
          1529,
          1530,
          1531,
          1484,
          1532
        ],
        "version": "1.0",
        "meta_data": {
          "hp": 0,
          "bulk": {},
          "group": "bomb",
          "range": 20,
          "runes": {
            "potency": 0,
            "property": [],
            "striking": 0
          },
          "damage": {
            "die": "d6",
            "dice": 4,
            "damageType": "sonic"
          },
          "hp_max": 0,
          "reload": "-",
          "source": {
            "url": "https://2e.aonprd.com/Equipment.aspx?ID=4438",
            "book": "Treasure Vault",
            "page": "44"
          },
          "foundry": {
            "bonus": 3,
            "items": [],
            "rules": [],
            "bonus_damage": 0,
            "container_id": null,
            "splash_damage": 4
          },
          "category": "martial",
          "hardness": 0,
          "material": {
            "type": null,
            "grade": null
          },
          "quantity": 1,
          "base_item": "alchemical-bomb",
          "broken_threshold": 0
        },
        "created_at": "2024-04-19T04:22:25.909222+00:00",
        "operations": null,
        "description": "**Activate** 1 Strike\n\nA shatterstone is a small ceramic orb, much like a thunderstone. Inside are reactive agents that set up an intense field of sonic vibration when the stone breaks. The bomb grants a +3 item bonus to attack rolls and deals 4d6 sonic damage and 4 sonic splash damage. Much of the sound is ultrasonic, and creatures with sonic weakness that take damage from the bomb must succeed at a Fortitude 40 save or be deafened until the end of their next turn.",
        "availability": null,
        "content_source_id": 16,
        "craft_requirements": null
      },
      "final": {
        "id": 12401,
        "bulk": "0.1",
        "name": "Shatterstone (Greater)",
        "size": "MEDIUM",
        "uuid": "7798780290692263",
        "group": "WEAPON",
        "hands": null,
        "level": 18,
        "price": {
          "gp": 3800
        },
        "usage": "held-in-one-hand",
        "rarity": "COMMON",
        "traits": [
          1529,
          1530,
          1531,
          1484,
          1532
        ],
        "version": "1.0",
        "meta_data": {
          "hp": 0,
          "bulk": {},
          "group": "bomb",
          "range": 20,
          "runes": {
            "potency": 0,
            "property": [],
            "striking": 0
          },
          "damage": {
            "die": "d6",
            "dice": 4,
            "damageType": "sonic"
          },
          "hp_max": 0,
          "reload": "-",
          "source": {
            "url": "https://2e.aonprd.com/Equipment.aspx?ID=4438",
            "book": "Treasure Vault",
            "page": "44"
          },
          "foundry": {
            "bonus": 3,
            "items": [],
            "rules": [],
            "bonus_damage": 0,
            "container_id": null,
            "splash_damage": 4
          },
          "category": "martial",
          "hardness": 0,
          "material": {
            "type": null,
            "grade": null
          },
          "quantity": 1,
          "base_item": "alchemical-bomb",
          "broken_threshold": 0,
          "attack_bonus": 3
        },
        "created_at": "2024-04-19T04:22:25.909222+00:00",
        "operations": null,
        "description": "**Activate** 1 Strike\n\nA shatterstone is a small ceramic orb, much like a thunderstone. Inside are reactive agents that set up an intense field of sonic vibration when the stone breaks. The bomb grants a +3 item bonus to attack rolls and deals 4d6 sonic damage and 4 sonic splash damage. Much of the sound is ultrasonic, and creatures with sonic weakness that take damage from the bomb must succeed at a Fortitude 40 save or be deafened until the end of their next turn.",
        "availability": null,
        "content_source_id": 16,
        "craft_requirements": null
      },
      "primary": {
        "url": "https://2e.aonprd.com/Equipment.aspx?ID=1905",
        "book": "Treasure Vault (Remastered)",
        "page": "44",
        "sha256": "80b91f388a87ae13009f15327da553f15b9cda99156bdb39ee38d079cb75b371",
        "captured_at": "2026-10-01T19:38:09.609Z"
      },
      "rationale": "Restore printed attack bonus through actual runtime leaf. Foundry.bonus, damage, splash and conditional Lodestone persistent damage remain unchanged."
    },
    {
      "id": 12402,
      "name": "Shatterstone",
      "path": [
        "meta_data",
        "attack_bonus"
      ],
      "before_exists": false,
      "before": null,
      "after": 2,
      "anchor": {
        "id": 12402,
        "bulk": "0.1",
        "name": "Shatterstone",
        "size": "MEDIUM",
        "uuid": "1183390171996376",
        "group": "WEAPON",
        "hands": null,
        "level": 12,
        "price": {
          "gp": 380
        },
        "usage": "held-in-one-hand",
        "rarity": "COMMON",
        "traits": [
          1529,
          1530,
          1531,
          1484,
          1532
        ],
        "version": "1.0",
        "meta_data": {
          "hp": 0,
          "bulk": {},
          "group": "bomb",
          "range": 20,
          "runes": {
            "potency": 0,
            "property": [],
            "striking": 0
          },
          "damage": {
            "die": "d6",
            "dice": 3,
            "damageType": "sonic"
          },
          "hp_max": 0,
          "reload": "-",
          "source": {
            "url": "https://2e.aonprd.com/Equipment.aspx?ID=4438",
            "book": "Treasure Vault",
            "page": "44"
          },
          "foundry": {
            "bonus": 2,
            "items": [],
            "rules": [],
            "bonus_damage": 0,
            "container_id": null,
            "splash_damage": 3
          },
          "category": "martial",
          "hardness": 0,
          "material": {
            "type": null,
            "grade": null
          },
          "quantity": 1,
          "base_item": "alchemical-bomb",
          "broken_threshold": 0
        },
        "created_at": "2024-04-19T04:22:26.573077+00:00",
        "operations": null,
        "description": "**Activate** 1 Strike\n\nA shatterstone is a small ceramic orb, much like a thunderstone. Inside are reactive agents that set up an intense field of sonic vibration when the stone breaks. The bomb grants a +2 item bonus to attack rolls and deals 3d6 sonic damage and 3 sonic splash damage. Much of the sound is ultrasonic, and creatures with sonic weakness that take damage from the bomb must succeed at a Fortitude 30 save or be deafened until the end of their next turn.",
        "availability": null,
        "content_source_id": 16,
        "craft_requirements": null
      },
      "final": {
        "id": 12402,
        "bulk": "0.1",
        "name": "Shatterstone",
        "size": "MEDIUM",
        "uuid": "1183390171996376",
        "group": "WEAPON",
        "hands": null,
        "level": 12,
        "price": {
          "gp": 380
        },
        "usage": "held-in-one-hand",
        "rarity": "COMMON",
        "traits": [
          1529,
          1530,
          1531,
          1484,
          1532
        ],
        "version": "1.0",
        "meta_data": {
          "hp": 0,
          "bulk": {},
          "group": "bomb",
          "range": 20,
          "runes": {
            "potency": 0,
            "property": [],
            "striking": 0
          },
          "damage": {
            "die": "d6",
            "dice": 3,
            "damageType": "sonic"
          },
          "hp_max": 0,
          "reload": "-",
          "source": {
            "url": "https://2e.aonprd.com/Equipment.aspx?ID=4438",
            "book": "Treasure Vault",
            "page": "44"
          },
          "foundry": {
            "bonus": 2,
            "items": [],
            "rules": [],
            "bonus_damage": 0,
            "container_id": null,
            "splash_damage": 3
          },
          "category": "martial",
          "hardness": 0,
          "material": {
            "type": null,
            "grade": null
          },
          "quantity": 1,
          "base_item": "alchemical-bomb",
          "broken_threshold": 0,
          "attack_bonus": 2
        },
        "created_at": "2024-04-19T04:22:26.573077+00:00",
        "operations": null,
        "description": "**Activate** 1 Strike\n\nA shatterstone is a small ceramic orb, much like a thunderstone. Inside are reactive agents that set up an intense field of sonic vibration when the stone breaks. The bomb grants a +2 item bonus to attack rolls and deals 3d6 sonic damage and 3 sonic splash damage. Much of the sound is ultrasonic, and creatures with sonic weakness that take damage from the bomb must succeed at a Fortitude 30 save or be deafened until the end of their next turn.",
        "availability": null,
        "content_source_id": 16,
        "craft_requirements": null
      },
      "primary": {
        "url": "https://2e.aonprd.com/Equipment.aspx?ID=1905",
        "book": "Treasure Vault (Remastered)",
        "page": "44",
        "sha256": "80b91f388a87ae13009f15327da553f15b9cda99156bdb39ee38d079cb75b371",
        "captured_at": "2026-10-01T19:38:09.609Z"
      },
      "rationale": "Restore printed attack bonus through actual runtime leaf. Foundry.bonus, damage, splash and conditional Lodestone persistent damage remain unchanged."
    },
    {
      "id": 12413,
      "name": "Skunk Bomb (Greater)",
      "path": [
        "meta_data",
        "attack_bonus"
      ],
      "before_exists": false,
      "before": null,
      "after": 2,
      "anchor": {
        "id": 12413,
        "bulk": "0.1",
        "name": "Skunk Bomb (Greater)",
        "size": "MEDIUM",
        "uuid": "6925434332775559",
        "group": "WEAPON",
        "hands": null,
        "level": 11,
        "price": {
          "gp": 240
        },
        "usage": "held-in-one-hand",
        "rarity": "COMMON",
        "traits": [
          1529,
          1530,
          1531,
          2131,
          1476,
          1532
        ],
        "version": "1.0",
        "meta_data": {
          "hp": 0,
          "bulk": {},
          "group": "bomb",
          "range": 20,
          "runes": {
            "potency": 0,
            "property": [],
            "striking": 0
          },
          "damage": {
            "die": "d4",
            "dice": 3,
            "damageType": "poison"
          },
          "hp_max": 0,
          "reload": "-",
          "source": {
            "url": "https://2e.aonprd.com/Equipment.aspx?ID=4439",
            "book": "Treasure Vault",
            "page": "45"
          },
          "foundry": {
            "bonus": 2,
            "items": [],
            "rules": [],
            "bonus_damage": 0,
            "container_id": null,
            "splash_damage": 3
          },
          "category": "martial",
          "hardness": 0,
          "material": {
            "type": null,
            "grade": null
          },
          "quantity": 1,
          "base_item": "alchemical-bomb",
          "broken_threshold": 0
        },
        "created_at": "2024-04-19T04:22:35.536985+00:00",
        "operations": null,
        "description": "**Activate** 1 Strike\n\nSkunk bombs are made from the concentrated odors of xulgaths, hezrous, and other creatures with natural or supernatural stench. The bomb grants a +2 item bonus to attack rolls and deals 3d4 poison damage and 3 poison splash damage. Any creature hit by the bomb or in its splash area must attempt a Fortitude 28 saving throw. Creatures in the splash area treat the results of their saving throw as one step better.\n\n**Critical Success** The target is unaffected.\n\n**Success** The target is sickened 1.\n\n**Failure** The target is sickened 1 and slowed 1 while sickened.\n\n**Critical Failure** The target is blinded for 1 round, sickened 2, and slowed 1 while sickened.\n\nCreatures sickened by the bomb emit an odor that lasts 10 minutes after the sickened condition ends (or 1 hour if they were also blinded). The odor can be removed or neutralized by using prestidigitation or similar magic or by spending 10 minutes scrubbing with ample soap and water. While the odor lasts, creatures within 30 feet can smell the target, enabling even those with a weak sense of smell to detect its presence, and all creatures gain a +1 item bonus to \\[\\[Track\\]\\] the affected creature for as long as it has the odor. A creature that has imprecise or precise scent doubles the range at which it can detect the target using this scent.",
        "availability": null,
        "content_source_id": 16,
        "craft_requirements": null
      },
      "final": {
        "id": 12413,
        "bulk": "0.1",
        "name": "Skunk Bomb (Greater)",
        "size": "MEDIUM",
        "uuid": "6925434332775559",
        "group": "WEAPON",
        "hands": null,
        "level": 11,
        "price": {
          "gp": 240
        },
        "usage": "held-in-one-hand",
        "rarity": "COMMON",
        "traits": [
          1529,
          1530,
          1531,
          2131,
          1476,
          1532
        ],
        "version": "1.0",
        "meta_data": {
          "hp": 0,
          "bulk": {},
          "group": "bomb",
          "range": 20,
          "runes": {
            "potency": 0,
            "property": [],
            "striking": 0
          },
          "damage": {
            "die": "d4",
            "dice": 3,
            "damageType": "poison"
          },
          "hp_max": 0,
          "reload": "-",
          "source": {
            "url": "https://2e.aonprd.com/Equipment.aspx?ID=4439",
            "book": "Treasure Vault",
            "page": "45"
          },
          "foundry": {
            "bonus": 2,
            "items": [],
            "rules": [],
            "bonus_damage": 0,
            "container_id": null,
            "splash_damage": 3
          },
          "category": "martial",
          "hardness": 0,
          "material": {
            "type": null,
            "grade": null
          },
          "quantity": 1,
          "base_item": "alchemical-bomb",
          "broken_threshold": 0,
          "attack_bonus": 2
        },
        "created_at": "2024-04-19T04:22:35.536985+00:00",
        "operations": null,
        "description": "**Activate** 1 Strike\n\nSkunk bombs are made from the concentrated odors of xulgaths, hezrous, and other creatures with natural or supernatural stench. The bomb grants a +2 item bonus to attack rolls and deals 3d4 poison damage and 3 poison splash damage. Any creature hit by the bomb or in its splash area must attempt a Fortitude 28 saving throw. Creatures in the splash area treat the results of their saving throw as one step better.\n\n**Critical Success** The target is unaffected.\n\n**Success** The target is sickened 1.\n\n**Failure** The target is sickened 1 and slowed 1 while sickened.\n\n**Critical Failure** The target is blinded for 1 round, sickened 2, and slowed 1 while sickened.\n\nCreatures sickened by the bomb emit an odor that lasts 10 minutes after the sickened condition ends (or 1 hour if they were also blinded). The odor can be removed or neutralized by using prestidigitation or similar magic or by spending 10 minutes scrubbing with ample soap and water. While the odor lasts, creatures within 30 feet can smell the target, enabling even those with a weak sense of smell to detect its presence, and all creatures gain a +1 item bonus to \\[\\[Track\\]\\] the affected creature for as long as it has the odor. A creature that has imprecise or precise scent doubles the range at which it can detect the target using this scent.",
        "availability": null,
        "content_source_id": 16,
        "craft_requirements": null
      },
      "primary": {
        "url": "https://2e.aonprd.com/Equipment.aspx?ID=1906",
        "book": "Treasure Vault (Remastered)",
        "page": "45",
        "sha256": "0b1abdf5c0618d2daeb177bcae4f42e03d11853cf7b9b73f935c78e92f5c1e59",
        "captured_at": "2026-10-01T19:38:09.959Z"
      },
      "rationale": "Restore printed attack bonus through actual runtime leaf. Foundry.bonus, damage, splash and conditional Lodestone persistent damage remain unchanged."
    },
    {
      "id": 12415,
      "name": "Skunk Bomb (Major)",
      "path": [
        "meta_data",
        "attack_bonus"
      ],
      "before_exists": false,
      "before": null,
      "after": 3,
      "anchor": {
        "id": 12415,
        "bulk": "0.1",
        "name": "Skunk Bomb (Major)",
        "size": "MEDIUM",
        "uuid": "5225244616013789",
        "group": "WEAPON",
        "hands": null,
        "level": 17,
        "price": {
          "gp": 2400
        },
        "usage": "held-in-one-hand",
        "rarity": "COMMON",
        "traits": [
          1529,
          1530,
          1531,
          2131,
          1476,
          1532
        ],
        "version": "1.0",
        "meta_data": {
          "hp": 0,
          "bulk": {},
          "group": "bomb",
          "range": 20,
          "runes": {
            "potency": 0,
            "property": [],
            "striking": 0
          },
          "damage": {
            "die": "d4",
            "dice": 4,
            "damageType": "poison"
          },
          "hp_max": 0,
          "reload": "-",
          "source": {
            "url": "https://2e.aonprd.com/Equipment.aspx?ID=4439",
            "book": "Treasure Vault",
            "page": "45"
          },
          "foundry": {
            "bonus": 3,
            "items": [],
            "rules": [],
            "bonus_damage": 0,
            "container_id": null,
            "splash_damage": 4
          },
          "category": "martial",
          "hardness": 0,
          "material": {
            "type": null,
            "grade": null
          },
          "quantity": 1,
          "base_item": "alchemical-bomb",
          "broken_threshold": 0
        },
        "created_at": "2024-04-19T04:22:38.489745+00:00",
        "operations": null,
        "description": "**Activate** 1 Strike\n\nSkunk bombs are made from the concentrated odors of xulgaths, hezrous, and other creatures with natural or supernatural stench. The bomb grants a +3 item bonus to attack rolls and deals 4d4 poison damage and 4 poison splash damage. Any creature hit by the bomb or in its splash area must attempt a Fortitude 37 saving throw. Creatures in the splash area treat the results of their saving throw as one step better.\n\n**Critical Success** The target is unaffected.\n\n**Success** The target is sickened 1.\n\n**Failure** The target is sickened 1 and slowed 1 while sickened.\n\n**Critical Failure** The target is blinded for 1 round, sickened 2, and slowed 1 while sickened.\n\nCreatures sickened by the bomb emit an odor that lasts 10 minutes after the sickened condition ends (or 1 hour if they were also blinded). The odor can be removed or neutralized by using prestidigitation or similar magic or by spending 10 minutes scrubbing with ample soap and water. While the odor lasts, creatures within 30 feet can smell the target, enabling even those with a weak sense of smell to detect its presence, and all creatures gain a +1 item bonus to \\[\\[Track\\]\\] the affected creature for as long as it has the odor. A creature that has imprecise or precise scent doubles the range at which it can detect the target using this scent.",
        "availability": null,
        "content_source_id": 16,
        "craft_requirements": null
      },
      "final": {
        "id": 12415,
        "bulk": "0.1",
        "name": "Skunk Bomb (Major)",
        "size": "MEDIUM",
        "uuid": "5225244616013789",
        "group": "WEAPON",
        "hands": null,
        "level": 17,
        "price": {
          "gp": 2400
        },
        "usage": "held-in-one-hand",
        "rarity": "COMMON",
        "traits": [
          1529,
          1530,
          1531,
          2131,
          1476,
          1532
        ],
        "version": "1.0",
        "meta_data": {
          "hp": 0,
          "bulk": {},
          "group": "bomb",
          "range": 20,
          "runes": {
            "potency": 0,
            "property": [],
            "striking": 0
          },
          "damage": {
            "die": "d4",
            "dice": 4,
            "damageType": "poison"
          },
          "hp_max": 0,
          "reload": "-",
          "source": {
            "url": "https://2e.aonprd.com/Equipment.aspx?ID=4439",
            "book": "Treasure Vault",
            "page": "45"
          },
          "foundry": {
            "bonus": 3,
            "items": [],
            "rules": [],
            "bonus_damage": 0,
            "container_id": null,
            "splash_damage": 4
          },
          "category": "martial",
          "hardness": 0,
          "material": {
            "type": null,
            "grade": null
          },
          "quantity": 1,
          "base_item": "alchemical-bomb",
          "broken_threshold": 0,
          "attack_bonus": 3
        },
        "created_at": "2024-04-19T04:22:38.489745+00:00",
        "operations": null,
        "description": "**Activate** 1 Strike\n\nSkunk bombs are made from the concentrated odors of xulgaths, hezrous, and other creatures with natural or supernatural stench. The bomb grants a +3 item bonus to attack rolls and deals 4d4 poison damage and 4 poison splash damage. Any creature hit by the bomb or in its splash area must attempt a Fortitude 37 saving throw. Creatures in the splash area treat the results of their saving throw as one step better.\n\n**Critical Success** The target is unaffected.\n\n**Success** The target is sickened 1.\n\n**Failure** The target is sickened 1 and slowed 1 while sickened.\n\n**Critical Failure** The target is blinded for 1 round, sickened 2, and slowed 1 while sickened.\n\nCreatures sickened by the bomb emit an odor that lasts 10 minutes after the sickened condition ends (or 1 hour if they were also blinded). The odor can be removed or neutralized by using prestidigitation or similar magic or by spending 10 minutes scrubbing with ample soap and water. While the odor lasts, creatures within 30 feet can smell the target, enabling even those with a weak sense of smell to detect its presence, and all creatures gain a +1 item bonus to \\[\\[Track\\]\\] the affected creature for as long as it has the odor. A creature that has imprecise or precise scent doubles the range at which it can detect the target using this scent.",
        "availability": null,
        "content_source_id": 16,
        "craft_requirements": null
      },
      "primary": {
        "url": "https://2e.aonprd.com/Equipment.aspx?ID=1906",
        "book": "Treasure Vault (Remastered)",
        "page": "45",
        "sha256": "0b1abdf5c0618d2daeb177bcae4f42e03d11853cf7b9b73f935c78e92f5c1e59",
        "captured_at": "2026-10-01T19:38:09.959Z"
      },
      "rationale": "Restore printed attack bonus through actual runtime leaf. Foundry.bonus, damage, splash and conditional Lodestone persistent damage remain unchanged."
    },
    {
      "id": 12416,
      "name": "Skunk Bomb (Moderate)",
      "path": [
        "meta_data",
        "attack_bonus"
      ],
      "before_exists": false,
      "before": null,
      "after": 1,
      "anchor": {
        "id": 12416,
        "bulk": "0.1",
        "name": "Skunk Bomb (Moderate)",
        "size": "MEDIUM",
        "uuid": "1361105339584093",
        "group": "WEAPON",
        "hands": null,
        "level": 3,
        "price": {
          "gp": 12
        },
        "usage": "held-in-one-hand",
        "rarity": "COMMON",
        "traits": [
          1529,
          1530,
          1531,
          2131,
          1476,
          1532
        ],
        "version": "1.0",
        "meta_data": {
          "hp": 0,
          "bulk": {},
          "group": "bomb",
          "range": 20,
          "runes": {
            "potency": 0,
            "property": [],
            "striking": 0
          },
          "damage": {
            "die": "d4",
            "dice": 2,
            "damageType": "poison"
          },
          "hp_max": 0,
          "reload": "-",
          "source": {
            "url": "https://2e.aonprd.com/Equipment.aspx?ID=4439",
            "book": "Treasure Vault",
            "page": "45"
          },
          "foundry": {
            "bonus": 1,
            "items": [],
            "rules": [],
            "bonus_damage": 0,
            "container_id": null,
            "splash_damage": 2
          },
          "category": "martial",
          "hardness": 0,
          "material": {
            "type": null,
            "grade": null
          },
          "quantity": 1,
          "base_item": "alchemical-bomb",
          "broken_threshold": 0
        },
        "created_at": "2024-04-19T04:22:39.075582+00:00",
        "operations": null,
        "description": "**Activate** 1 Strike\n\nSkunk bombs are made from the concentrated odors of xulgaths, hezrous, and other creatures with natural or supernatural stench. The bomb grants a +1 item bonus to attack rolls and deals 2d4 poison damage and 2 poison splash damage. Any creature hit by the bomb or in its splash area must attempt a Fortitude 17 saving throw. Creatures in the splash area treat the results of their saving throw as one step better.\n\n**Critical Success** The target is unaffected.\n\n**Success** The target is sickened 1.\n\n**Failure** The target is sickened 1 and slowed 1 while sickened.\n\n**Critical Failure** The target is blinded for 1 round, sickened 2, and slowed 1 while sickened.\n\nCreatures sickened by the bomb emit an odor that lasts 10 minutes after the sickened condition ends (or 1 hour if they were also blinded). The odor can be removed or neutralized by using prestidigitation or similar magic or by spending 10 minutes scrubbing with ample soap and water. While the odor lasts, creatures within 30 feet can smell the target, enabling even those with a weak sense of smell to detect its presence, and all creatures gain a +1 item bonus to \\[\\[Track\\]\\] the affected creature for as long as it has the odor. A creature that has imprecise or precise scent doubles the range at which it can detect the target using this scent.",
        "availability": null,
        "content_source_id": 16,
        "craft_requirements": null
      },
      "final": {
        "id": 12416,
        "bulk": "0.1",
        "name": "Skunk Bomb (Moderate)",
        "size": "MEDIUM",
        "uuid": "1361105339584093",
        "group": "WEAPON",
        "hands": null,
        "level": 3,
        "price": {
          "gp": 12
        },
        "usage": "held-in-one-hand",
        "rarity": "COMMON",
        "traits": [
          1529,
          1530,
          1531,
          2131,
          1476,
          1532
        ],
        "version": "1.0",
        "meta_data": {
          "hp": 0,
          "bulk": {},
          "group": "bomb",
          "range": 20,
          "runes": {
            "potency": 0,
            "property": [],
            "striking": 0
          },
          "damage": {
            "die": "d4",
            "dice": 2,
            "damageType": "poison"
          },
          "hp_max": 0,
          "reload": "-",
          "source": {
            "url": "https://2e.aonprd.com/Equipment.aspx?ID=4439",
            "book": "Treasure Vault",
            "page": "45"
          },
          "foundry": {
            "bonus": 1,
            "items": [],
            "rules": [],
            "bonus_damage": 0,
            "container_id": null,
            "splash_damage": 2
          },
          "category": "martial",
          "hardness": 0,
          "material": {
            "type": null,
            "grade": null
          },
          "quantity": 1,
          "base_item": "alchemical-bomb",
          "broken_threshold": 0,
          "attack_bonus": 1
        },
        "created_at": "2024-04-19T04:22:39.075582+00:00",
        "operations": null,
        "description": "**Activate** 1 Strike\n\nSkunk bombs are made from the concentrated odors of xulgaths, hezrous, and other creatures with natural or supernatural stench. The bomb grants a +1 item bonus to attack rolls and deals 2d4 poison damage and 2 poison splash damage. Any creature hit by the bomb or in its splash area must attempt a Fortitude 17 saving throw. Creatures in the splash area treat the results of their saving throw as one step better.\n\n**Critical Success** The target is unaffected.\n\n**Success** The target is sickened 1.\n\n**Failure** The target is sickened 1 and slowed 1 while sickened.\n\n**Critical Failure** The target is blinded for 1 round, sickened 2, and slowed 1 while sickened.\n\nCreatures sickened by the bomb emit an odor that lasts 10 minutes after the sickened condition ends (or 1 hour if they were also blinded). The odor can be removed or neutralized by using prestidigitation or similar magic or by spending 10 minutes scrubbing with ample soap and water. While the odor lasts, creatures within 30 feet can smell the target, enabling even those with a weak sense of smell to detect its presence, and all creatures gain a +1 item bonus to \\[\\[Track\\]\\] the affected creature for as long as it has the odor. A creature that has imprecise or precise scent doubles the range at which it can detect the target using this scent.",
        "availability": null,
        "content_source_id": 16,
        "craft_requirements": null
      },
      "primary": {
        "url": "https://2e.aonprd.com/Equipment.aspx?ID=1906",
        "book": "Treasure Vault (Remastered)",
        "page": "45",
        "sha256": "0b1abdf5c0618d2daeb177bcae4f42e03d11853cf7b9b73f935c78e92f5c1e59",
        "captured_at": "2026-10-01T19:38:09.959Z"
      },
      "rationale": "Restore printed attack bonus through actual runtime leaf. Foundry.bonus, damage, splash and conditional Lodestone persistent damage remain unchanged."
    },
    {
      "id": 12435,
      "name": "Sparking Spellgun (Greater)",
      "path": [
        "bulk"
      ],
      "before_exists": true,
      "before": "0",
      "after": "0.1",
      "anchor": {
        "id": 12435,
        "bulk": "0",
        "name": "Sparking Spellgun (Greater)",
        "size": "MEDIUM",
        "uuid": "2037748120827117",
        "group": "GENERAL",
        "hands": null,
        "level": 13,
        "price": {
          "gp": 600
        },
        "usage": "held in 1 hand",
        "rarity": "COMMON",
        "traits": [
          1520,
          1531,
          1542,
          1504,
          2868
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
            "url": "https://2e.aonprd.com/Equipment.aspx?ID=4658",
            "book": "Treasure Vault",
            "page": "98"
          },
          "charges": {},
          "foundry": {
            "items": [],
            "rules": [],
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
        "created_at": "2024-04-19T04:22:52.065313+00:00",
        "operations": null,
        "description": "**Activate** <abbr cost=\"TWO-ACTIONS\" class=\"action-symbol\">2</abbr> [Interact](link_action_19733), [Strike](link_action_19856)\n\n* * *\n\nA broad wooden tube with a handle, a _sparking spellgun_ radiates warmth. You Activate the spellgun by aiming it at one creature and making your choice of a spell attack roll or a firearm attack roll against the target's AC. This spellgun has a range increment of 30 feet. The spellgun fires a small ball of sparks and fire, then crumbles to ash. The ball explodes in a flash when it hits, dealing 10d6 [fire](link_trait_1542) damage and 5d4 persistent fire damage.\n\n**Critical Success** The target takes double damage, takes double persistent damage, is blinded for 1 round, and is dazzled while the persistent damage lasts.\n\n**Success** The target takes full damage, full persistent damage, and is dazzled while the persistent damage lasts.",
        "availability": null,
        "content_source_id": 16,
        "craft_requirements": null
      },
      "final": {
        "id": 12435,
        "bulk": "0.1",
        "name": "Sparking Spellgun (Greater)",
        "size": "MEDIUM",
        "uuid": "2037748120827117",
        "group": "GENERAL",
        "hands": null,
        "level": 13,
        "price": {
          "gp": 600
        },
        "usage": "held in 1 hand",
        "rarity": "COMMON",
        "traits": [
          1520,
          1531,
          1542,
          1504,
          2868
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
            "url": "https://2e.aonprd.com/Equipment.aspx?ID=4658",
            "book": "Treasure Vault",
            "page": "98"
          },
          "charges": {},
          "foundry": {
            "items": [],
            "rules": [],
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
        "created_at": "2024-04-19T04:22:52.065313+00:00",
        "operations": null,
        "description": "**Activate** <abbr cost=\"TWO-ACTIONS\" class=\"action-symbol\">2</abbr> [Interact](link_action_19733), [Strike](link_action_19856)\n\n* * *\n\nA broad wooden tube with a handle, a _sparking spellgun_ radiates warmth. You Activate the spellgun by aiming it at one creature and making your choice of a spell attack roll or a firearm attack roll against the target's AC. This spellgun has a range increment of 30 feet. The spellgun fires a small ball of sparks and fire, then crumbles to ash. The ball explodes in a flash when it hits, dealing 10d6 [fire](link_trait_1542) damage and 5d4 persistent fire damage.\n\n**Critical Success** The target takes double damage, takes double persistent damage, is blinded for 1 round, and is dazzled while the persistent damage lasts.\n\n**Success** The target takes full damage, full persistent damage, and is dazzled while the persistent damage lasts.",
        "availability": null,
        "content_source_id": 16,
        "craft_requirements": null
      },
      "primary": {
        "url": "https://2e.aonprd.com/Equipment.aspx?ID=2125",
        "book": "Treasure Vault (Remastered)",
        "page": "98",
        "sha256": "d6dbad975b0e18d4507a57da63ded7d63b967b8a5f76a4a822c30e83b67a830e",
        "captured_at": "2026-10-01T19:39:26.717Z"
      },
      "rationale": "Printed physical field agrees across legacy and remastered definitions; all other mechanics preserved."
    },
    {
      "id": 12437,
      "name": "Sparking Spellgun (Moderate)",
      "path": [
        "bulk"
      ],
      "before_exists": true,
      "before": "0",
      "after": "0.1",
      "anchor": {
        "id": 12437,
        "bulk": "0",
        "name": "Sparking Spellgun (Moderate)",
        "size": "MEDIUM",
        "uuid": "1540460377247259",
        "group": "GENERAL",
        "hands": null,
        "level": 9,
        "price": {
          "gp": 150
        },
        "usage": "held in 1 hand",
        "rarity": "COMMON",
        "traits": [
          1520,
          1531,
          1542,
          1504,
          2868
        ],
        "version": "1.0",
        "meta_data": {
          "hp": 0,
          "bulk": {},
          "group": "",
          "runes": {},
          "damage": {},
          "hp_max": 0,
          "source": {
            "url": "https://2e.aonprd.com/Equipment.aspx?ID=4658",
            "book": "Treasure Vault",
            "page": "98"
          },
          "charges": {},
          "foundry": {
            "items": [],
            "rules": [],
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
        "created_at": "2024-04-19T04:22:53.316682+00:00",
        "operations": null,
        "description": "**Activate** <abbr cost=\"TWO-ACTIONS\" class=\"action-symbol\">2</abbr> [Interact](link_action_19733), [Strike](link_action_19856)\n\n* * *\n\nA broad wooden tube with a handle, a _sparking spellgun_ radiates warmth. You Activate the [spellgun](link_trait_2868) by aiming it at one creature and making your choice of a spell attack roll or a firearm attack roll against the target's AC. This spellgun has a range increment of 30 feet. The spellgun fires a small ball of sparks and fire, then crumbles to ash. The ball explodes in a flash when it hits, dealing 7d6 [fire](link_trait_1542) damage and 3d4 persistent [fire](link_trait_1542) damage.\n\n**Critical Success** The target takes double damage, takes double persistent damage, is blinded for 1 round, and is dazzled while the persistent damage lasts.\n\n**Success** The target takes full damage, full persistent damage, and is dazzled while the persistent damage lasts.",
        "availability": null,
        "content_source_id": 16,
        "craft_requirements": null
      },
      "final": {
        "id": 12437,
        "bulk": "0.1",
        "name": "Sparking Spellgun (Moderate)",
        "size": "MEDIUM",
        "uuid": "1540460377247259",
        "group": "GENERAL",
        "hands": null,
        "level": 9,
        "price": {
          "gp": 150
        },
        "usage": "held in 1 hand",
        "rarity": "COMMON",
        "traits": [
          1520,
          1531,
          1542,
          1504,
          2868
        ],
        "version": "1.0",
        "meta_data": {
          "hp": 0,
          "bulk": {},
          "group": "",
          "runes": {},
          "damage": {},
          "hp_max": 0,
          "source": {
            "url": "https://2e.aonprd.com/Equipment.aspx?ID=4658",
            "book": "Treasure Vault",
            "page": "98"
          },
          "charges": {},
          "foundry": {
            "items": [],
            "rules": [],
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
        "created_at": "2024-04-19T04:22:53.316682+00:00",
        "operations": null,
        "description": "**Activate** <abbr cost=\"TWO-ACTIONS\" class=\"action-symbol\">2</abbr> [Interact](link_action_19733), [Strike](link_action_19856)\n\n* * *\n\nA broad wooden tube with a handle, a _sparking spellgun_ radiates warmth. You Activate the [spellgun](link_trait_2868) by aiming it at one creature and making your choice of a spell attack roll or a firearm attack roll against the target's AC. This spellgun has a range increment of 30 feet. The spellgun fires a small ball of sparks and fire, then crumbles to ash. The ball explodes in a flash when it hits, dealing 7d6 [fire](link_trait_1542) damage and 3d4 persistent [fire](link_trait_1542) damage.\n\n**Critical Success** The target takes double damage, takes double persistent damage, is blinded for 1 round, and is dazzled while the persistent damage lasts.\n\n**Success** The target takes full damage, full persistent damage, and is dazzled while the persistent damage lasts.",
        "availability": null,
        "content_source_id": 16,
        "craft_requirements": null
      },
      "primary": {
        "url": "https://2e.aonprd.com/Equipment.aspx?ID=2125",
        "book": "Treasure Vault (Remastered)",
        "page": "98",
        "sha256": "d6dbad975b0e18d4507a57da63ded7d63b967b8a5f76a4a822c30e83b67a830e",
        "captured_at": "2026-10-01T19:39:26.717Z"
      },
      "rationale": "Printed physical field agrees across legacy and remastered definitions; all other mechanics preserved."
    },
    {
      "id": 12565,
      "name": "Trueshape Bomb (Greater)",
      "path": [
        "meta_data",
        "attack_bonus"
      ],
      "before_exists": false,
      "before": null,
      "after": 3,
      "anchor": {
        "id": 12565,
        "bulk": "0.1",
        "name": "Trueshape Bomb (Greater)",
        "size": "MEDIUM",
        "uuid": "898199962311961",
        "group": "WEAPON",
        "hands": null,
        "level": 18,
        "price": {
          "gp": 3750
        },
        "usage": "held-in-one-hand",
        "rarity": "COMMON",
        "traits": [
          1529,
          1530,
          1531,
          1476,
          1532
        ],
        "version": "1.0",
        "meta_data": {
          "hp": 0,
          "bulk": {},
          "group": "bomb",
          "range": 20,
          "runes": {
            "potency": 0,
            "property": [],
            "striking": 0
          },
          "damage": {
            "die": "d6",
            "dice": 4,
            "damageType": "poison",
            "persistent": {
              "type": "poison",
              "faces": 4,
              "number": 4
            }
          },
          "hp_max": 0,
          "reload": "-",
          "source": {
            "url": "https://2e.aonprd.com/Equipment.aspx?ID=4440",
            "book": "Treasure Vault",
            "page": "45"
          },
          "foundry": {
            "bonus": 3,
            "items": [],
            "rules": [],
            "bonus_damage": 0,
            "container_id": null,
            "splash_damage": 4
          },
          "category": "martial",
          "hardness": 0,
          "material": {
            "type": null,
            "grade": null
          },
          "quantity": 1,
          "base_item": "alchemical-bomb",
          "broken_threshold": 0
        },
        "created_at": "2024-04-19T04:24:27.933196+00:00",
        "operations": null,
        "description": "**Activate** 1 Strike\n\nConcentrated wolfsbane and other anti-shapechanger reagents fill trueshape bombs. These bombs grant a +3 item bonus to attack rolls and deal 4d6 poison damage, 4d4 persistent poison damage, and 4 poison splash damage. If the primary target is under the effects of a morph or polymorph effect, it must succeed at a Fortitude 40 saving throw, or else the effects end and the creature returns to its normal form. Targets taking persistent poison damage from this bomb must succeed at another Fortitude saving throw at the same DC to change shape using a morph or polymorph effect. The persistent damage can last up to 1 minute.",
        "availability": null,
        "content_source_id": 16,
        "craft_requirements": null
      },
      "final": {
        "id": 12565,
        "bulk": "0.1",
        "name": "Trueshape Bomb (Greater)",
        "size": "MEDIUM",
        "uuid": "898199962311961",
        "group": "WEAPON",
        "hands": null,
        "level": 18,
        "price": {
          "gp": 3750
        },
        "usage": "held-in-one-hand",
        "rarity": "COMMON",
        "traits": [
          1529,
          1530,
          1531,
          1476,
          1532
        ],
        "version": "1.0",
        "meta_data": {
          "hp": 0,
          "bulk": {},
          "group": "bomb",
          "range": 20,
          "runes": {
            "potency": 0,
            "property": [],
            "striking": 0
          },
          "damage": {
            "die": "d6",
            "dice": 4,
            "damageType": "poison",
            "persistent": {
              "type": "poison",
              "faces": 4,
              "number": 4
            }
          },
          "hp_max": 0,
          "reload": "-",
          "source": {
            "url": "https://2e.aonprd.com/Equipment.aspx?ID=4440",
            "book": "Treasure Vault",
            "page": "45"
          },
          "foundry": {
            "bonus": 3,
            "items": [],
            "rules": [],
            "bonus_damage": 0,
            "container_id": null,
            "splash_damage": 4
          },
          "category": "martial",
          "hardness": 0,
          "material": {
            "type": null,
            "grade": null
          },
          "quantity": 1,
          "base_item": "alchemical-bomb",
          "broken_threshold": 0,
          "attack_bonus": 3
        },
        "created_at": "2024-04-19T04:24:27.933196+00:00",
        "operations": null,
        "description": "**Activate** 1 Strike\n\nConcentrated wolfsbane and other anti-shapechanger reagents fill trueshape bombs. These bombs grant a +3 item bonus to attack rolls and deal 4d6 poison damage, 4d4 persistent poison damage, and 4 poison splash damage. If the primary target is under the effects of a morph or polymorph effect, it must succeed at a Fortitude 40 saving throw, or else the effects end and the creature returns to its normal form. Targets taking persistent poison damage from this bomb must succeed at another Fortitude saving throw at the same DC to change shape using a morph or polymorph effect. The persistent damage can last up to 1 minute.",
        "availability": null,
        "content_source_id": 16,
        "craft_requirements": null
      },
      "primary": {
        "url": "https://2e.aonprd.com/Equipment.aspx?ID=1907",
        "book": "Treasure Vault (Remastered)",
        "page": "45",
        "sha256": "7b32f961a08d3950b055786d6056d43416c55e30a1484192177c30df80a8645e",
        "captured_at": "2026-10-01T19:38:10.430Z"
      },
      "rationale": "Restore printed attack bonus through actual runtime leaf. Foundry.bonus, damage, splash and conditional Lodestone persistent damage remain unchanged."
    },
    {
      "id": 12566,
      "name": "Trueshape Bomb",
      "path": [
        "meta_data",
        "attack_bonus"
      ],
      "before_exists": false,
      "before": null,
      "after": 2,
      "anchor": {
        "id": 12566,
        "bulk": "0.1",
        "name": "Trueshape Bomb",
        "size": "MEDIUM",
        "uuid": "407839551038191",
        "group": "WEAPON",
        "hands": null,
        "level": 12,
        "price": {
          "gp": 375
        },
        "usage": "held-in-one-hand",
        "rarity": "COMMON",
        "traits": [
          1529,
          1530,
          1531,
          1476,
          1532
        ],
        "version": "1.0",
        "meta_data": {
          "hp": 0,
          "bulk": {},
          "group": "bomb",
          "range": 20,
          "runes": {
            "potency": 0,
            "property": [],
            "striking": 0
          },
          "damage": {
            "die": "d6",
            "dice": 3,
            "damageType": "poison",
            "persistent": {
              "type": "poison",
              "faces": 4,
              "number": 3
            }
          },
          "hp_max": 0,
          "reload": "-",
          "source": {
            "url": "https://2e.aonprd.com/Equipment.aspx?ID=4440",
            "book": "Treasure Vault",
            "page": "45"
          },
          "foundry": {
            "bonus": 2,
            "items": [],
            "rules": [],
            "bonus_damage": 0,
            "container_id": null,
            "splash_damage": 3
          },
          "category": "martial",
          "hardness": 0,
          "material": {
            "type": null,
            "grade": null
          },
          "quantity": 1,
          "base_item": "alchemical-bomb",
          "broken_threshold": 0
        },
        "created_at": "2024-04-19T04:24:28.458526+00:00",
        "operations": null,
        "description": "**Activate** 1 Strike\n\nConcentrated wolfsbane and other anti-shapechanger reagents fill trueshape bombs. These bombs grant a +2 item bonus to attack rolls and deal 3d6 poison damage, 3d4 persistent poison damage, and 3 poison splash damage. If the primary target is under the effects of a morph or polymorph effect, it must succeed at a Fortitude 30 saving throw, or else the effects end and the creature returns to its normal form. Targets taking persistent poison damage from this bomb must succeed at another Fortitude saving throw at the same DC to change shape using a morph or polymorph effect. The persistent damage can last up to 1 minute.",
        "availability": null,
        "content_source_id": 16,
        "craft_requirements": null
      },
      "final": {
        "id": 12566,
        "bulk": "0.1",
        "name": "Trueshape Bomb",
        "size": "MEDIUM",
        "uuid": "407839551038191",
        "group": "WEAPON",
        "hands": null,
        "level": 12,
        "price": {
          "gp": 375
        },
        "usage": "held-in-one-hand",
        "rarity": "COMMON",
        "traits": [
          1529,
          1530,
          1531,
          1476,
          1532
        ],
        "version": "1.0",
        "meta_data": {
          "hp": 0,
          "bulk": {},
          "group": "bomb",
          "range": 20,
          "runes": {
            "potency": 0,
            "property": [],
            "striking": 0
          },
          "damage": {
            "die": "d6",
            "dice": 3,
            "damageType": "poison",
            "persistent": {
              "type": "poison",
              "faces": 4,
              "number": 3
            }
          },
          "hp_max": 0,
          "reload": "-",
          "source": {
            "url": "https://2e.aonprd.com/Equipment.aspx?ID=4440",
            "book": "Treasure Vault",
            "page": "45"
          },
          "foundry": {
            "bonus": 2,
            "items": [],
            "rules": [],
            "bonus_damage": 0,
            "container_id": null,
            "splash_damage": 3
          },
          "category": "martial",
          "hardness": 0,
          "material": {
            "type": null,
            "grade": null
          },
          "quantity": 1,
          "base_item": "alchemical-bomb",
          "broken_threshold": 0,
          "attack_bonus": 2
        },
        "created_at": "2024-04-19T04:24:28.458526+00:00",
        "operations": null,
        "description": "**Activate** 1 Strike\n\nConcentrated wolfsbane and other anti-shapechanger reagents fill trueshape bombs. These bombs grant a +2 item bonus to attack rolls and deal 3d6 poison damage, 3d4 persistent poison damage, and 3 poison splash damage. If the primary target is under the effects of a morph or polymorph effect, it must succeed at a Fortitude 30 saving throw, or else the effects end and the creature returns to its normal form. Targets taking persistent poison damage from this bomb must succeed at another Fortitude saving throw at the same DC to change shape using a morph or polymorph effect. The persistent damage can last up to 1 minute.",
        "availability": null,
        "content_source_id": 16,
        "craft_requirements": null
      },
      "primary": {
        "url": "https://2e.aonprd.com/Equipment.aspx?ID=1907",
        "book": "Treasure Vault (Remastered)",
        "page": "45",
        "sha256": "7b32f961a08d3950b055786d6056d43416c55e30a1484192177c30df80a8645e",
        "captured_at": "2026-10-01T19:38:10.430Z"
      },
      "rationale": "Restore printed attack bonus through actual runtime leaf. Foundry.bonus, damage, splash and conditional Lodestone persistent damage remain unchanged."
    },
    {
      "id": 12703,
      "name": "Warden's Signet",
      "path": [
        "bulk"
      ],
      "before_exists": true,
      "before": "0",
      "after": "0.1",
      "anchor": {
        "id": 12703,
        "bulk": "0",
        "name": "Warden's Signet",
        "size": "MEDIUM",
        "uuid": "2451936999232750",
        "group": "GENERAL",
        "hands": null,
        "level": 11,
        "price": {
          "gp": 1250
        },
        "usage": "worn",
        "rarity": "COMMON",
        "traits": [
          1526,
          1527,
          1504
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
            "url": "https://2e.aonprd.com/Equipment.aspx?ID=4862",
            "book": "Treasure Vault",
            "page": "151"
          },
          "charges": {},
          "foundry": {
            "items": [],
            "rules": [
              {
                "key": "FlatModifier",
                "type": "item",
                "value": 2,
                "selector": "nature"
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
        "created_at": "2024-04-19T04:25:53.871263+00:00",
        "operations": [
          {
            "id": "01f09b19-5bb3-4a42-9495-ae0113bce0c0",
            "data": {
              "text": "",
              "type": "item",
              "value": "2",
              "variable": "SKILL_NATURE"
            },
            "type": "addBonusToValue"
          }
        ],
        "description": "This symbol shows your dedication to the magic practiced by some rangers. Most rangers wear it on an amulet, ring, or piercing. You gain a +2 item bonus to Nature checks.\n\n**Activate** <abbr cost=\"FREE-ACTION\" class=\"action-symbol\">4</abbr> envision\n\n**Frequency** once per day\n\n**Effect** You gain 1 Focus Point, which you can use only to cast a ranger warden spell. When you use this Focus Point, the warden's signet also casts a 4th-rank [Oaken Resilience](link_spell_4744) spell on you. If not used by the end of your turn, this Focus Point is lost.",
        "availability": null,
        "content_source_id": 16,
        "craft_requirements": "You are a ranger with at least one warden spell."
      },
      "final": {
        "id": 12703,
        "bulk": "0.1",
        "name": "Warden's Signet",
        "size": "MEDIUM",
        "uuid": "2451936999232750",
        "group": "GENERAL",
        "hands": null,
        "level": 11,
        "price": {
          "gp": 1250
        },
        "usage": "worn",
        "rarity": "COMMON",
        "traits": [
          1526,
          1527,
          1504
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
            "url": "https://2e.aonprd.com/Equipment.aspx?ID=4862",
            "book": "Treasure Vault",
            "page": "151"
          },
          "charges": {},
          "foundry": {
            "items": [],
            "rules": [
              {
                "key": "FlatModifier",
                "type": "item",
                "value": 2,
                "selector": "nature"
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
        "created_at": "2024-04-19T04:25:53.871263+00:00",
        "operations": [
          {
            "id": "01f09b19-5bb3-4a42-9495-ae0113bce0c0",
            "data": {
              "text": "",
              "type": "item",
              "value": "2",
              "variable": "SKILL_NATURE"
            },
            "type": "addBonusToValue"
          }
        ],
        "description": "This symbol shows your dedication to the magic practiced by some rangers. Most rangers wear it on an amulet, ring, or piercing. You gain a +2 item bonus to Nature checks.\n\n**Activate** <abbr cost=\"FREE-ACTION\" class=\"action-symbol\">4</abbr> envision\n\n**Frequency** once per day\n\n**Effect** You gain 1 Focus Point, which you can use only to cast a ranger warden spell. When you use this Focus Point, the warden's signet also casts a 4th-rank [Oaken Resilience](link_spell_4744) spell on you. If not used by the end of your turn, this Focus Point is lost.",
        "availability": null,
        "content_source_id": 16,
        "craft_requirements": "You are a ranger with at least one warden spell."
      },
      "primary": {
        "url": "https://2e.aonprd.com/Equipment.aspx?ID=2330",
        "book": "Treasure Vault (Remastered)",
        "page": "151",
        "sha256": "a5678ab2fe90c1794932fed478a21c90ea0b2c0d224560f250c0ca2d71faf052",
        "captured_at": "2026-10-01T19:40:37.780Z"
      },
      "rationale": "Explicit remastered printing change; stable identity and saved snapshots preserved."
    }
  ],
  "dependencies": [
    {
      "table": "trait",
      "id": 1476,
      "name": "Poison",
      "uuid": "7663047166217896",
      "content_source_id": 3
    },
    {
      "table": "trait",
      "id": 1484,
      "name": "Sonic",
      "uuid": "1815257066620819",
      "content_source_id": 3
    },
    {
      "table": "trait",
      "id": 1504,
      "name": "Magical",
      "uuid": "445811995976648",
      "content_source_id": 3
    },
    {
      "table": "trait",
      "id": 1514,
      "name": "Occult",
      "uuid": "7684663810066007",
      "content_source_id": 3
    },
    {
      "table": "trait",
      "id": 1517,
      "name": "Light",
      "uuid": "7362437638210779",
      "content_source_id": 3
    },
    {
      "table": "trait",
      "id": 1520,
      "name": "Attack",
      "uuid": "1285342290589006",
      "content_source_id": 3
    },
    {
      "table": "trait",
      "id": 1526,
      "name": "Focused",
      "uuid": "7710313926432959",
      "content_source_id": 3
    },
    {
      "table": "trait",
      "id": 1527,
      "name": "Invested",
      "uuid": "370388764978504",
      "content_source_id": 3
    },
    {
      "table": "trait",
      "id": 1529,
      "name": "Alchemical",
      "uuid": "8219993619182426",
      "content_source_id": 3
    },
    {
      "table": "trait",
      "id": 1530,
      "name": "Bomb",
      "uuid": "212456558114730",
      "content_source_id": 3
    },
    {
      "table": "trait",
      "id": 1531,
      "name": "Consumable",
      "uuid": "1807927279366527",
      "content_source_id": 3
    },
    {
      "table": "trait",
      "id": 1532,
      "name": "Splash",
      "uuid": "5053816479032278",
      "content_source_id": 3
    },
    {
      "table": "trait",
      "id": 1542,
      "name": "Fire",
      "uuid": "3316639745394270",
      "content_source_id": 3
    },
    {
      "table": "trait",
      "id": 1554,
      "name": "Backstabber",
      "uuid": "2427501881436900",
      "content_source_id": 3
    },
    {
      "table": "trait",
      "id": 1558,
      "name": "Cursed",
      "uuid": "6683897869869361",
      "content_source_id": 3
    },
    {
      "table": "trait",
      "id": 1560,
      "name": "Force",
      "uuid": "1798173688310192",
      "content_source_id": 3
    },
    {
      "table": "trait",
      "id": 1568,
      "name": "Artifact",
      "uuid": "484734232108207",
      "content_source_id": 3
    },
    {
      "table": "trait",
      "id": 1569,
      "name": "Agile",
      "uuid": "8144183238496458",
      "content_source_id": 3
    },
    {
      "table": "trait",
      "id": 1670,
      "name": "Fatal d12",
      "uuid": "1460362542592840",
      "content_source_id": 3
    },
    {
      "table": "trait",
      "id": 1686,
      "name": "Fatal d10",
      "uuid": "8904093322900135",
      "content_source_id": 3
    },
    {
      "table": "trait",
      "id": 1714,
      "name": "Free-Hand",
      "uuid": "2817197080719885",
      "content_source_id": 3
    },
    {
      "table": "trait",
      "id": 1837,
      "name": "Versatile S",
      "uuid": "4196107961433390",
      "content_source_id": 3
    },
    {
      "table": "trait",
      "id": 1857,
      "name": "Disease",
      "uuid": "5374642892495827",
      "content_source_id": 3
    },
    {
      "table": "trait",
      "id": 2131,
      "name": "Olfactory",
      "uuid": "6785598362016579",
      "content_source_id": 3
    },
    {
      "table": "trait",
      "id": 2565,
      "name": "Kickback",
      "uuid": "179187521381498",
      "content_source_id": 3
    },
    {
      "table": "trait",
      "id": 2855,
      "name": "Grimoire",
      "uuid": "7077107757295082",
      "content_source_id": 3
    },
    {
      "table": "trait",
      "id": 2868,
      "name": "Spellgun",
      "uuid": "1640530375111539",
      "content_source_id": 3
    },
    {
      "table": "trait",
      "id": 3073,
      "name": "Concussive",
      "uuid": "8087287454612738",
      "content_source_id": 3
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
  "ownership": "Only exact existing catalog scalar leaves. No descriptions, citations, identities, operations, traits, item snapshots or source counts updated.",
  "predecessor": {
    "migration": "20261002040000_treasure_vault_physical_headers.sql",
    "id": 12212,
    "expected_traits": [
      1526,
      1527,
      1504,
      1517,
      1514
    ]
  },
  "conditional_manual_boundary": {
    "item_ids": [
      12176,
      12177
    ],
    "rule": "Lodestone persistent force damage requires metallic target/equipment; absent unconditional persistent leaf is intentional and remains absent."
  }
}
$scalar095$::jsonb as spec
)
select 'treasure-vault-scalar-mechanics' as id,
  not exists (
    select 1 from jsonb_array_elements(spec->'patches') patch
    left join public.item i on i.id=(patch->>'id')::bigint
    where i.id is null
       or ((to_jsonb(i)-'updated_at'-'search_tsv')||jsonb_build_object('uuid',i.uuid::text))
          is distinct from patch->'final'
  )
  and not exists (
    select 1 from jsonb_array_elements(spec->'dependencies') dependency
    left join public.trait t on t.id=(dependency->>'id')::bigint
    where t.id is null
       or not (((to_jsonb(t)-'updated_at'-'search_tsv')||jsonb_build_object('uuid',t.uuid::text))
               @> (dependency-'table'))
  )
  and not exists (
    select 1 from jsonb_array_elements(spec->'sources') source
    left join public.content_source s on s.id=(source->>'id')::bigint
    where s.id is null or s.name is distinct from source->>'name'
       or s.user_id is not null or s.is_published is distinct from true
  )
  and not exists(select 1 from public.content_update u where coalesce(u.status->>'state','PENDING') not in ('APPROVED','REJECTED') and (exists(select 1 from jsonb_array_elements(spec->'sources') s where u.type='content-source' and (u.ref_id=(s->>'id')::bigint or u.data->>'id'=s->>'id')) or exists(select 1 from jsonb_array_elements(spec->'patches') p where u.type='item' and (u.ref_id=(p->>'id')::bigint or u.data->>'id'=p->>'id' or u.data->>'uuid'=p#>>'{anchor,uuid}' or (coalesce(u.content_source_id::text,u.data->>'content_source_id')='16' and (lower(btrim(u.data->>'name'))=lower(p->>'name') or lower(u.data#>>'{meta_data,source,url}') in (lower(p#>>'{anchor,meta_data,source,url}'),lower(p#>>'{primary,url}')))))) or exists(select 1 from jsonb_array_elements(spec->'dependencies') d where u.type='trait' and (u.ref_id=(d->>'id')::bigint or u.data->>'id'=d->>'id' or u.data->>'uuid'=d->>'uuid' or (coalesce(u.content_source_id::text,u.data->>'content_source_id')=d->>'content_source_id' and lower(btrim(u.data->>'name'))=lower(d->>'name')))))) as passed
from settings
)
select original_checks.id,case when coalesce((status.value->>'recognized')::boolean,true) then coalesce((status.value->>'passed')::boolean,false) else original_checks.passed end as passed from original_checks cross join terminal_status status;
