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
    and (select count(*)=2
      and count(*) filter(where a.grantee=pg_catalog.to_regrole('postgres'))=1
      and count(*) filter(where a.grantee=pg_catalog.to_regrole('service_role'))=1
      and bool_and((a.privilege_type='EXECUTE' and a.is_grantable is false
      and a.grantor=pg_catalog.to_regrole('postgres')
      and a.grantee in(pg_catalog.to_regrole('postgres'),pg_catalog.to_regrole('service_role'))) is true)
      from pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a)
    and pg_catalog.has_function_privilege('postgres',p.oid,'EXECUTE')
    and pg_catalog.has_function_privilege('service_role',p.oid,'EXECUTE'))) is not true then
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
  execute $historical_original_dual$-- Correct reviewed physical headers without refreshing saved inventory snapshots.
do $repair$
declare
  patches constant jsonb := $patches$
[
  {
    "id": 11880,
    "anchor": {
      "id": 11880,
      "name": "Confabulator",
      "size": "MEDIUM",
      "uuid": 5280156698985116,
      "group": "GENERAL",
      "hands": null,
      "level": 3,
      "price": {
        "gp": 55
      },
      "rarity": "UNCOMMON",
      "version": "1.0",
      "meta_data": {
        "hp": 0,
        "bulk": {},
        "runes": {},
        "hp_max": 0,
        "source": {
          "url": "https://2e.aonprd.com/Equipment.aspx?ID=4700",
          "book": "Treasure Vault",
          "page": "109"
        },
        "foundry": {
          "items": [],
          "rules": [
            {
              "key": "FlatModifier",
              "type": "item",
              "value": 1,
              "selector": "performance",
              "predicate": [
                "confabstrument"
              ]
            },
            {
              "key": "RollOption",
              "label": "Confabulator Instrument",
              "domain": "performance",
              "option": "confabstrument"
            }
          ],
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
      "created_at": "2024-04-19T04:15:48.090679+00:00",
      "operations": null,
      "availability": null,
      "content_source_id": 16
    },
    "description_md5": "8a22a04c88a3a6825cc6db703fa2007f",
    "craft_requirements_md5": null,
    "before": {
      "bulk": "0",
      "usage": "affixed-to-instrument",
      "traits": [
        1447,
        1504
      ]
    },
    "after": {
      "bulk": "0.1",
      "usage": "affixed-to-instrument",
      "traits": [
        1447,
        1504
      ]
    },
    "evidence": {
      "remaster": "https://2e.aonprd.com/Equipment.aspx?ID=2166",
      "legacy": "https://2e.aonprd.com/Equipment.aspx?ID=4700&NoRedirect=1"
    }
  },
  {
    "id": 11893,
    "anchor": {
      "id": 11893,
      "name": "Crackling Bubble Gum (Greater)",
      "size": "MEDIUM",
      "uuid": 790575753270023,
      "group": "GENERAL",
      "hands": null,
      "level": 13,
      "price": {
        "gp": 450
      },
      "rarity": "COMMON",
      "version": "1.0",
      "meta_data": {
        "hp": 0,
        "bulk": {},
        "runes": {},
        "damage": null,
        "hp_max": 0,
        "source": {
          "url": "https://2e.aonprd.com/Equipment.aspx?ID=4445",
          "book": "Treasure Vault",
          "page": "47"
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
      "created_at": "2024-04-19T04:15:57.571676+00:00",
      "operations": null,
      "availability": null,
      "content_source_id": 16
    },
    "description_md5": "a904e319f0a48b11a9fd301b151db9f3",
    "craft_requirements_md5": null,
    "before": {
      "bulk": "0.1",
      "usage": "held-in-one-hand",
      "traits": [
        1529,
        1531,
        2876
      ]
    },
    "after": {
      "bulk": "0",
      "usage": "held-in-one-hand",
      "traits": [
        1529,
        1531,
        2876
      ]
    },
    "evidence": {
      "remaster": "https://2e.aonprd.com/Equipment.aspx?ID=1912",
      "legacy": "https://2e.aonprd.com/Equipment.aspx?ID=4445&NoRedirect=1"
    }
  },
  {
    "id": 11912,
    "anchor": {
      "id": 11912,
      "name": "Demolition Fulu (Greater)",
      "size": "MEDIUM",
      "uuid": 2450243131258690,
      "group": "GENERAL",
      "hands": null,
      "level": 17,
      "price": {
        "gp": 2750
      },
      "rarity": "COMMON",
      "version": "1.0",
      "meta_data": {
        "hp": 0,
        "bulk": {},
        "runes": {},
        "damage": null,
        "hp_max": 0,
        "source": {
          "url": "https://2e.aonprd.com/Equipment.aspx?ID=4563",
          "book": "Treasure Vault",
          "page": "77"
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
      "created_at": "2024-04-19T04:16:17.787095+00:00",
      "operations": null,
      "availability": null,
      "content_source_id": 16
    },
    "description_md5": "19a9f041db2f2c9d2d2e45bb80dfbab2",
    "craft_requirements_md5": null,
    "before": {
      "bulk": "0",
      "usage": "affixed-to-a-ranged-weapon",
      "traits": [
        1531,
        2854,
        1504
      ]
    },
    "after": {
      "bulk": "0",
      "usage": "affixed to an object or structure",
      "traits": [
        1531,
        2854,
        1504
      ]
    },
    "evidence": {
      "remaster": "https://2e.aonprd.com/Equipment.aspx?ID=2030",
      "legacy": "https://2e.aonprd.com/Equipment.aspx?ID=4563&NoRedirect=1"
    }
  },
  {
    "id": 11913,
    "anchor": {
      "id": 11913,
      "name": "Demolition Fulu (Lesser)",
      "size": "MEDIUM",
      "uuid": 722733143940413,
      "group": "GENERAL",
      "hands": null,
      "level": 3,
      "price": {
        "gp": 12
      },
      "rarity": "COMMON",
      "version": "1.0",
      "meta_data": {
        "hp": 0,
        "bulk": {},
        "runes": {},
        "damage": null,
        "hp_max": 0,
        "source": {
          "url": "https://2e.aonprd.com/Equipment.aspx?ID=4563",
          "book": "Treasure Vault",
          "page": "77"
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
      "created_at": "2024-04-19T04:16:18.509239+00:00",
      "operations": null,
      "availability": null,
      "content_source_id": 16
    },
    "description_md5": "acc5209d3ab07590a734397015bdc664",
    "craft_requirements_md5": null,
    "before": {
      "bulk": "0",
      "usage": "affixed-to-a-ranged-weapon",
      "traits": [
        1531,
        2854,
        1504
      ]
    },
    "after": {
      "bulk": "0",
      "usage": "affixed to an object or structure",
      "traits": [
        1531,
        2854,
        1504
      ]
    },
    "evidence": {
      "remaster": "https://2e.aonprd.com/Equipment.aspx?ID=2030",
      "legacy": "https://2e.aonprd.com/Equipment.aspx?ID=4563&NoRedirect=1"
    }
  },
  {
    "id": 11914,
    "anchor": {
      "id": 11914,
      "name": "Demolition Fulu (Moderate)",
      "size": "MEDIUM",
      "uuid": 3111234010656339,
      "group": "GENERAL",
      "hands": null,
      "level": 11,
      "price": {
        "gp": 275
      },
      "rarity": "COMMON",
      "version": "1.0",
      "meta_data": {
        "hp": 0,
        "bulk": {},
        "runes": {},
        "damage": null,
        "hp_max": 0,
        "source": {
          "url": "https://2e.aonprd.com/Equipment.aspx?ID=4563",
          "book": "Treasure Vault",
          "page": "77"
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
      "created_at": "2024-04-19T04:16:19.401721+00:00",
      "operations": null,
      "availability": null,
      "content_source_id": 16
    },
    "description_md5": "fddc355416484b9d831ef4513b01e033",
    "craft_requirements_md5": null,
    "before": {
      "bulk": "0",
      "usage": "affixed-to-a-ranged-weapon",
      "traits": [
        1531,
        2854,
        1504
      ]
    },
    "after": {
      "bulk": "0",
      "usage": "affixed to an object or structure",
      "traits": [
        1531,
        2854,
        1504
      ]
    },
    "evidence": {
      "remaster": "https://2e.aonprd.com/Equipment.aspx?ID=2030",
      "legacy": "https://2e.aonprd.com/Equipment.aspx?ID=4563&NoRedirect=1"
    }
  },
  {
    "id": 11926,
    "anchor": {
      "id": 11926,
      "name": "Dezullon Fountain",
      "size": "MEDIUM",
      "uuid": 7352965332877344,
      "group": "WEAPON",
      "hands": null,
      "level": 11,
      "price": {
        "gp": 1300
      },
      "rarity": "UNCOMMON",
      "version": "1.0",
      "meta_data": {
        "hp": 0,
        "bulk": {},
        "group": "firearm",
        "range": 30,
        "runes": {
          "potency": 2,
          "property": [],
          "striking": 1
        },
        "damage": {
          "die": "d4",
          "dice": 1,
          "damageType": "acid"
        },
        "hp_max": 0,
        "reload": "0",
        "source": {
          "url": "https://2e.aonprd.com/Equipment.aspx?ID=4416",
          "book": "Treasure Vault",
          "page": "36"
        },
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
        "base_item": "air-repeater",
        "broken_threshold": 0
      },
      "created_at": "2024-04-19T04:16:27.151199+00:00",
      "operations": null,
      "availability": null,
      "content_source_id": 16
    },
    "description_md5": "3fff0a89a61f3741a73fb151c5110066",
    "craft_requirements_md5": "2bbbc723be656f2101c49733f099e4d4",
    "before": {
      "bulk": "0.1",
      "usage": "held-in-one-hand",
      "traits": [
        1528,
        1569,
        1654,
        2863
      ]
    },
    "after": {
      "bulk": "1",
      "usage": "held in 2 hands",
      "traits": [
        1528,
        1569,
        1654,
        2863
      ]
    },
    "evidence": {
      "remaster": "https://2e.aonprd.com/Equipment.aspx?ID=1883",
      "legacy": "https://2e.aonprd.com/Equipment.aspx?ID=4416&NoRedirect=1"
    }
  },
  {
    "id": 11928,
    "anchor": {
      "id": 11928,
      "name": "Diplomat's Charcuterie",
      "size": "MEDIUM",
      "uuid": 2160353204203403,
      "group": "GENERAL",
      "hands": null,
      "level": 3,
      "price": {
        "gp": 9
      },
      "rarity": "COMMON",
      "version": "1.0",
      "meta_data": {
        "hp": 0,
        "bulk": {},
        "group": "",
        "runes": {},
        "damage": {},
        "hp_max": 0,
        "source": {
          "url": "https://2e.aonprd.com/Equipment.aspx?ID=4447",
          "book": "Treasure Vault",
          "page": "47"
        },
        "charges": {},
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
        "image_url": "",
        "is_shoddy": false,
        "starfinder": {
          "grade": "COMMERCIAL",
          "slots": []
        },
        "unselectable": false,
        "broken_threshold": 0
      },
      "created_at": "2024-04-19T04:16:28.301078+00:00",
      "operations": null,
      "availability": null,
      "content_source_id": 16
    },
    "description_md5": "d15b817c54e1c5a45dab2c60671c8682",
    "craft_requirements_md5": null,
    "before": {
      "bulk": "0.1",
      "usage": "held-in-one-hand",
      "traits": [
        1529,
        1531
      ]
    },
    "after": {
      "bulk": "0.1",
      "usage": "held in 2 hands",
      "traits": [
        1529,
        1531
      ]
    },
    "evidence": {
      "remaster": "https://2e.aonprd.com/Equipment.aspx?ID=1914",
      "legacy": "https://2e.aonprd.com/Equipment.aspx?ID=4447&NoRedirect=1"
    }
  },
  {
    "id": 11929,
    "anchor": {
      "id": 11929,
      "name": "Discord Fulu",
      "size": "MEDIUM",
      "uuid": 3216920733152927,
      "group": "GENERAL",
      "hands": null,
      "level": 5,
      "price": {
        "gp": 22
      },
      "rarity": "COMMON",
      "version": "1.0",
      "meta_data": {
        "hp": 0,
        "bulk": {},
        "runes": {},
        "damage": null,
        "hp_max": 0,
        "source": {
          "url": "https://2e.aonprd.com/Equipment.aspx?ID=4564",
          "book": "Treasure Vault",
          "page": "77"
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
      "created_at": "2024-04-19T04:16:29.227158+00:00",
      "operations": null,
      "availability": null,
      "content_source_id": 16
    },
    "description_md5": "433788d91caf60b9430e42381654f781",
    "craft_requirements_md5": null,
    "before": {
      "bulk": "0",
      "usage": "affixed-to-a-ranged-weapon",
      "traits": [
        1531,
        2854,
        1504,
        1677
      ]
    },
    "after": {
      "bulk": "0",
      "usage": "affixed to a creature",
      "traits": [
        1531,
        2854,
        1504,
        1677
      ]
    },
    "evidence": {
      "remaster": "https://2e.aonprd.com/Equipment.aspx?ID=2031",
      "legacy": "https://2e.aonprd.com/Equipment.aspx?ID=4564&NoRedirect=1"
    }
  },
  {
    "id": 11989,
    "anchor": {
      "id": 11989,
      "name": "Everyneed Pack (Greater)",
      "size": "MEDIUM",
      "uuid": 954012916485342,
      "group": "GENERAL",
      "hands": null,
      "level": 7,
      "price": {
        "gp": 100
      },
      "rarity": "UNCOMMON",
      "version": "1.0",
      "meta_data": {
        "hp": 0,
        "bulk": {},
        "runes": {},
        "hp_max": 0,
        "source": {
          "url": "https://2e.aonprd.com/Equipment.aspx?ID=4838",
          "book": "Treasure Vault",
          "page": "145"
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
      "created_at": "2024-04-19T04:17:17.040682+00:00",
      "operations": null,
      "availability": null,
      "content_source_id": 16
    },
    "description_md5": "ca5f77f11109f5992aedfc5a76f1968d",
    "craft_requirements_md5": null,
    "before": {
      "bulk": "0",
      "usage": "worn",
      "traits": [
        1527,
        1504
      ]
    },
    "after": {
      "bulk": "1",
      "usage": "worn backpack",
      "traits": [
        1527,
        1504
      ]
    },
    "evidence": {
      "remaster": "https://2e.aonprd.com/Equipment.aspx?ID=2306",
      "legacy": "https://2e.aonprd.com/Equipment.aspx?ID=4838&NoRedirect=1"
    }
  },
  {
    "id": 12020,
    "anchor": {
      "id": 12020,
      "name": "Fortress Plate",
      "size": "MEDIUM",
      "uuid": 8676331207498414,
      "group": "ARMOR",
      "hands": null,
      "level": 2,
      "price": {
        "gp": 32
      },
      "rarity": "COMMON",
      "version": "1.0",
      "meta_data": {
        "hp": 0,
        "bulk": {},
        "group": "plate",
        "runes": {
          "potency": 0,
          "property": [],
          "resilient": 0
        },
        "hp_max": 0,
        "source": {
          "url": "https://2e.aonprd.com/Armor.aspx?ID=61",
          "book": "Treasure Vault",
          "page": "10"
        },
        "dex_cap": 0,
        "foundry": {
          "items": [],
          "rules": [],
          "container_id": null
        },
        "ac_bonus": 6,
        "category": "heavy",
        "hardness": 0,
        "material": {
          "type": null,
          "grade": null
        },
        "quantity": 1,
        "strength": 4,
        "base_item": "fortress-plate",
        "check_penalty": -3,
        "speed_penalty": -10,
        "broken_threshold": 0
      },
      "created_at": "2024-04-19T04:17:37.935977+00:00",
      "operations": null,
      "availability": null,
      "content_source_id": 16
    },
    "description_md5": "32fb6be05bb5033dc298e36586c84c88",
    "craft_requirements_md5": null,
    "before": {
      "bulk": "5",
      "usage": null,
      "traits": [
        1594,
        2870
      ]
    },
    "after": {
      "bulk": "5",
      "usage": null,
      "traits": [
        1594,
        2870,
        2869
      ]
    },
    "evidence": {
      "remaster": "https://2e.aonprd.com/Armor.aspx?ID=21",
      "legacy": "https://2e.aonprd.com/Armor.aspx?ID=61&NoRedirect=1"
    }
  },
  {
    "id": 12021,
    "anchor": {
      "id": 12021,
      "name": "Fortress Shield",
      "size": "MEDIUM",
      "uuid": 3687279941431591,
      "group": "SHIELD",
      "hands": null,
      "level": 1,
      "price": {
        "gp": 20
      },
      "rarity": "COMMON",
      "version": "1.0",
      "meta_data": {
        "hp": 24,
        "bulk": {},
        "group": "",
        "runes": {},
        "damage": {
          "die": "",
          "dice": 1,
          "extra": "",
          "damageType": ""
        },
        "hp_max": 24,
        "source": {
          "url": "https://2e.aonprd.com/Shields.aspx?ID=23",
          "book": "Treasure Vault",
          "page": "21"
        },
        "charges": {},
        "foundry": {
          "items": [],
          "rules": [
            {
              "key": "RollOption",
              "domain": "ac",
              "option": "fortress-shield",
              "toggleable": true
            },
            {
              "key": "FlatModifier",
              "label": "Fortress Shield Cover",
              "value": 1,
              "selector": "ac",
              "predicate": [
                "self:effect:cover",
                "self:shield:equipped",
                "self:shield:raised",
                "fortress-shield"
              ]
            }
          ],
          "container_id": null
        },
        "ac_bonus": 3,
        "category": "",
        "cleaning": {
          "updatedAt": "2026-04-12T13:04:03.739Z"
        },
        "hardness": 6,
        "material": {
          "type": null,
          "grade": null
        },
        "quantity": 1,
        "base_item": "fortress-shield",
        "image_url": "",
        "is_shoddy": false,
        "starfinder": {},
        "unselectable": false,
        "speed_penalty": -10,
        "broken_threshold": 12
      },
      "created_at": "2024-04-19T04:17:39.456419+00:00",
      "operations": null,
      "availability": null,
      "content_source_id": 16
    },
    "description_md5": "4b4aad91a7cd98b06d3886a9d55ead5d",
    "craft_requirements_md5": null,
    "before": {
      "bulk": "5",
      "usage": "",
      "traits": []
    },
    "after": {
      "bulk": "5",
      "usage": "",
      "traits": [
        2883
      ]
    },
    "evidence": {
      "remaster": "https://2e.aonprd.com/Shields.aspx?ID=7",
      "legacy": "https://2e.aonprd.com/Shields.aspx?ID=23&NoRedirect=1"
    }
  },
  {
    "id": 12045,
    "anchor": {
      "id": 12045,
      "name": "Ghost Delivery Fulu",
      "size": "MEDIUM",
      "uuid": 2405633429083631,
      "group": "GENERAL",
      "hands": null,
      "level": 8,
      "price": {
        "gp": 100
      },
      "rarity": "COMMON",
      "version": "1.0",
      "meta_data": {
        "hp": 0,
        "bulk": {},
        "runes": {},
        "damage": null,
        "hp_max": 0,
        "source": {
          "url": "https://2e.aonprd.com/Equipment.aspx?ID=4568",
          "book": "Treasure Vault",
          "page": "77"
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
      "created_at": "2024-04-19T04:18:06.396002+00:00",
      "operations": null,
      "availability": null,
      "content_source_id": 16
    },
    "description_md5": "1009f4445fcaeab9c0e21722bf36bb09",
    "craft_requirements_md5": null,
    "before": {
      "bulk": "0",
      "usage": "held-in-one-hand",
      "traits": [
        1531,
        2854,
        1504
      ]
    },
    "after": {
      "bulk": "0",
      "usage": "affixed to structure, object, or creature",
      "traits": [
        1531,
        2854,
        1504
      ]
    },
    "evidence": {
      "remaster": "https://2e.aonprd.com/Equipment.aspx?ID=2035",
      "legacy": "https://2e.aonprd.com/Equipment.aspx?ID=4568&NoRedirect=1"
    }
  },
  {
    "id": 12061,
    "anchor": {
      "id": 12061,
      "name": "Grounding Spike",
      "size": "MEDIUM",
      "uuid": 8539826978545700,
      "group": "WEAPON",
      "hands": null,
      "level": 10,
      "price": {
        "gp": 950
      },
      "rarity": "UNCOMMON",
      "version": "1.0",
      "meta_data": {
        "hp": 0,
        "bulk": {},
        "group": "spear",
        "range": null,
        "runes": {
          "potency": 1,
          "property": [
            {
              "id": 7890,
              "name": "Thundering"
            }
          ],
          "striking": 1
        },
        "damage": {
          "die": "d6",
          "dice": 1,
          "damageType": "piercing"
        },
        "hp_max": 0,
        "reload": "",
        "source": {
          "url": "https://2e.aonprd.com/Equipment.aspx?ID=4407",
          "book": "Treasure Vault",
          "page": "34"
        },
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
        "base_item": "dancers-spear",
        "broken_threshold": 0
      },
      "created_at": "2024-04-19T04:18:17.4582+00:00",
      "operations": null,
      "availability": null,
      "content_source_id": 16
    },
    "description_md5": "4acd62a7eccd5a971cbb582cde6e29af",
    "craft_requirements_md5": null,
    "before": {
      "bulk": "1",
      "usage": "held-in-two-hands",
      "traits": [
        1619,
        1570,
        1573,
        1562,
        1690
      ]
    },
    "after": {
      "bulk": "1",
      "usage": "held in 1 hand",
      "traits": [
        1619,
        1570,
        1573,
        1562,
        1690
      ]
    },
    "evidence": {
      "remaster": "https://2e.aonprd.com/Equipment.aspx?ID=1874",
      "legacy": "https://2e.aonprd.com/Equipment.aspx?ID=4407&NoRedirect=1"
    }
  },
  {
    "id": 12094,
    "anchor": {
      "id": 12094,
      "name": "Hexing Jar",
      "size": "MEDIUM",
      "uuid": 8315013863224837,
      "group": "GENERAL",
      "hands": null,
      "level": 11,
      "price": {
        "gp": 1200
      },
      "rarity": "COMMON",
      "version": "1.0",
      "meta_data": {
        "hp": 0,
        "bulk": {},
        "runes": {},
        "hp_max": 0,
        "source": {
          "url": "https://2e.aonprd.com/Equipment.aspx?ID=4856",
          "book": "Treasure Vault",
          "page": "148"
        },
        "foundry": {
          "items": [],
          "rules": [
            {
              "key": "ChoiceSet",
              "flag": "hexingJarSelection",
              "prompt": "Select your Patron",
              "choices": [
                {
                  "label": "Baba Yaga",
                  "value": "occultism"
                },
                {
                  "label": "Curse",
                  "value": "occultism"
                },
                {
                  "label": "Fate",
                  "value": "occultism"
                },
                {
                  "label": "Fervor",
                  "value": "religion"
                },
                {
                  "label": "Mosquito Witch",
                  "value": "nature"
                },
                {
                  "label": "Night",
                  "value": "occultism"
                },
                {
                  "label": "Pacts",
                  "value": "occultism"
                },
                {
                  "label": "Rune",
                  "value": "arcana"
                },
                {
                  "label": "Wild",
                  "value": "nature"
                },
                {
                  "label": "Winter",
                  "value": "nature"
                }
              ]
            },
            {
              "key": "FlatModifier",
              "type": "item",
              "value": 2,
              "selector": "{item|flags.pf2e.rulesSelections.hexingJarSelection}"
            }
          ],
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
      "created_at": "2024-04-19T04:18:43.880737+00:00",
      "operations": null,
      "availability": null,
      "content_source_id": 16
    },
    "description_md5": "e90e2f70bfefc6f5ed115a6d250f5f0b",
    "craft_requirements_md5": "d4be394cdd5dee8f0613fb1da9eff62c",
    "before": {
      "bulk": "0",
      "usage": "held-in-one-hand",
      "traits": [
        1526,
        1527,
        1504
      ]
    },
    "after": {
      "bulk": "0",
      "usage": "worn",
      "traits": [
        1526,
        1527,
        1504
      ]
    },
    "evidence": {
      "remaster": "https://2e.aonprd.com/Equipment.aspx?ID=2324",
      "legacy": "https://2e.aonprd.com/Equipment.aspx?ID=4856&NoRedirect=1"
    }
  },
  {
    "id": 12123,
    "anchor": {
      "id": 12123,
      "name": "Inventor's Fulu",
      "size": "MEDIUM",
      "uuid": 5889773375118932,
      "group": "GENERAL",
      "hands": null,
      "level": 6,
      "price": {
        "gp": 50
      },
      "rarity": "COMMON",
      "version": "1.0",
      "meta_data": {
        "hp": 0,
        "bulk": {},
        "runes": {},
        "damage": null,
        "hp_max": 0,
        "source": {
          "url": "https://2e.aonprd.com/Equipment.aspx?ID=4570",
          "book": "Treasure Vault",
          "page": "78"
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
      "created_at": "2024-04-19T04:19:05.085134+00:00",
      "operations": null,
      "availability": null,
      "content_source_id": 16
    },
    "description_md5": "d976fefe8531bc57e8876cdb942a07bf",
    "craft_requirements_md5": null,
    "before": {
      "bulk": "0",
      "usage": "affixed-to-a-ranged-weapon",
      "traits": [
        1531,
        2854,
        1504,
        1544
      ]
    },
    "after": {
      "bulk": "0",
      "usage": "affixed to an innovation",
      "traits": [
        1531,
        2854,
        1504,
        1544
      ]
    },
    "evidence": {
      "remaster": "https://2e.aonprd.com/Equipment.aspx?ID=2037",
      "legacy": "https://2e.aonprd.com/Equipment.aspx?ID=4570&NoRedirect=1"
    }
  },
  {
    "id": 12128,
    "anchor": {
      "id": 12128,
      "name": "Journeybread (Power)",
      "size": "MEDIUM",
      "uuid": 6115534149489549,
      "group": "GENERAL",
      "hands": null,
      "level": 4,
      "price": {
        "gp": 15
      },
      "rarity": "UNCOMMON",
      "version": "1.0",
      "meta_data": {
        "hp": 0,
        "bulk": {},
        "runes": {},
        "damage": null,
        "hp_max": 0,
        "source": {
          "url": "https://2e.aonprd.com/Equipment.aspx?ID=4454",
          "book": "Treasure Vault",
          "page": "49"
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
      "created_at": "2024-04-19T04:19:08.428787+00:00",
      "operations": null,
      "availability": null,
      "content_source_id": 16
    },
    "description_md5": "536ab5576019b62a4945e624eb9d748a",
    "craft_requirements_md5": null,
    "before": {
      "bulk": "0.1",
      "usage": "held-in-one-hand",
      "traits": [
        1529,
        1531
      ]
    },
    "after": {
      "bulk": "0",
      "usage": "held-in-one-hand",
      "traits": [
        1529,
        1531
      ]
    },
    "evidence": {
      "remaster": "https://2e.aonprd.com/Equipment.aspx?ID=1921",
      "legacy": "https://2e.aonprd.com/Equipment.aspx?ID=4454&NoRedirect=1"
    }
  },
  {
    "id": 12129,
    "anchor": {
      "id": 12129,
      "name": "Journeybread",
      "size": "MEDIUM",
      "uuid": 4700928018438963,
      "group": "GENERAL",
      "hands": null,
      "level": 1,
      "price": {
        "gp": 3
      },
      "rarity": "UNCOMMON",
      "version": "1.0",
      "meta_data": {
        "hp": 0,
        "bulk": {},
        "runes": {},
        "damage": null,
        "hp_max": 0,
        "source": {
          "url": "https://2e.aonprd.com/Equipment.aspx?ID=4454",
          "book": "Treasure Vault",
          "page": "49"
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
      "created_at": "2024-04-19T04:19:08.966939+00:00",
      "operations": null,
      "availability": null,
      "content_source_id": 16
    },
    "description_md5": "7dbcd9813890a31f795f9afe862ca0fb",
    "craft_requirements_md5": null,
    "before": {
      "bulk": "0.1",
      "usage": "held-in-one-hand",
      "traits": [
        1529,
        1531
      ]
    },
    "after": {
      "bulk": "0",
      "usage": "held-in-one-hand",
      "traits": [
        1529,
        1531
      ]
    },
    "evidence": {
      "remaster": "https://2e.aonprd.com/Equipment.aspx?ID=1921",
      "legacy": "https://2e.aonprd.com/Equipment.aspx?ID=4454&NoRedirect=1"
    }
  },
  {
    "id": 12193,
    "anchor": {
      "id": 12193,
      "name": "Marvelous Pigment",
      "size": "MEDIUM",
      "uuid": 8850155066787712,
      "group": "GENERAL",
      "hands": null,
      "level": 12,
      "price": {
        "gp": 325
      },
      "rarity": "UNCOMMON",
      "version": "1.0",
      "meta_data": {
        "hp": 0,
        "bulk": {},
        "group": "",
        "runes": {},
        "damage": {},
        "hp_max": 0,
        "source": {
          "url": "https://2e.aonprd.com/Equipment.aspx?ID=4653",
          "book": "Treasure Vault",
          "page": "97"
        },
        "charges": {},
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
        "image_url": "",
        "is_shoddy": false,
        "starfinder": {},
        "unselectable": false,
        "broken_threshold": 0
      },
      "created_at": "2024-04-19T04:19:53.617859+00:00",
      "operations": null,
      "availability": null,
      "content_source_id": 16
    },
    "description_md5": "c31f6ac0800be9dfe022da6c4b511182",
    "craft_requirements_md5": null,
    "before": {
      "bulk": "0",
      "usage": "held in 1 hand",
      "traits": [
        1531,
        1504
      ]
    },
    "after": {
      "bulk": "0.1",
      "usage": "held in 1 hand",
      "traits": [
        1531,
        1504
      ]
    },
    "evidence": {
      "remaster": "https://2e.aonprd.com/Equipment.aspx?ID=2120",
      "legacy": "https://2e.aonprd.com/Equipment.aspx?ID=4653&NoRedirect=1"
    }
  },
  {
    "id": 12202,
    "anchor": {
      "id": 12202,
      "name": "Mender's Soup",
      "size": "MEDIUM",
      "uuid": 4162862239523338,
      "group": "GENERAL",
      "hands": null,
      "level": 2,
      "price": {
        "gp": 5
      },
      "rarity": "COMMON",
      "version": "1.0",
      "meta_data": {
        "hp": 0,
        "bulk": {},
        "runes": {},
        "damage": null,
        "hp_max": 0,
        "source": {
          "url": "https://2e.aonprd.com/Equipment.aspx?ID=4455",
          "book": "Treasure Vault",
          "page": "49"
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
      "created_at": "2024-04-19T04:19:59.747505+00:00",
      "operations": null,
      "availability": null,
      "content_source_id": 16
    },
    "description_md5": "c26604f70346482a3043cb61793a2789",
    "craft_requirements_md5": null,
    "before": {
      "bulk": "0.1",
      "usage": "held-in-one-hand",
      "traits": [
        1529,
        1531,
        2859
      ]
    },
    "after": {
      "bulk": "0.1",
      "usage": "held in 2 hands",
      "traits": [
        1529,
        1531,
        2859
      ]
    },
    "evidence": {
      "remaster": "https://2e.aonprd.com/Equipment.aspx?ID=1922",
      "legacy": "https://2e.aonprd.com/Equipment.aspx?ID=4455&NoRedirect=1"
    }
  },
  {
    "id": 12212,
    "anchor": {
      "id": 12212,
      "name": "Mind's Light Circlet",
      "size": "MEDIUM",
      "uuid": 6908835286887719,
      "group": "GENERAL",
      "hands": null,
      "level": 11,
      "price": {
        "gp": 1200
      },
      "rarity": "COMMON",
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
      "availability": null,
      "content_source_id": 16
    },
    "description_md5": "95aa0c4bff0d0e1bea9b83ea81b65cf7",
    "craft_requirements_md5": "a338811ee134afe315c912407aa22580",
    "before": {
      "bulk": "0",
      "usage": "wornheadwear",
      "traits": [
        1526,
        1527,
        1504
      ]
    },
    "after": {
      "bulk": "0",
      "usage": "wornheadwear",
      "traits": [
        1526,
        1527,
        1504,
        1517,
        1514
      ]
    },
    "evidence": {
      "remaster": "https://2e.aonprd.com/Equipment.aspx?ID=2328",
      "legacy": "https://2e.aonprd.com/Equipment.aspx?ID=4860&NoRedirect=1"
    },
    "successor_after": {
      "bulk": "0.1",
      "usage": "wornheadwear",
      "traits": [
        1526,
        1527,
        1504,
        1517,
        1514
      ]
    },
    "successor_migration": "20261002095000_treasure_vault_scalar_mechanics.sql"
  },
  {
    "id": 12292,
    "anchor": {
      "id": 12292,
      "name": "Potion Patch (Greater)",
      "size": "MEDIUM",
      "uuid": 679332763263936,
      "group": "GENERAL",
      "hands": null,
      "level": 13,
      "price": {
        "gp": 600
      },
      "rarity": "COMMON",
      "version": "1.0",
      "meta_data": {
        "hp": 0,
        "bulk": {},
        "group": "",
        "runes": {},
        "damage": {},
        "hp_max": 0,
        "source": {
          "url": "https://2e.aonprd.com/Equipment.aspx?ID=4656",
          "book": "Treasure Vault",
          "page": "97"
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
      "created_at": "2024-04-19T04:21:07.47214+00:00",
      "operations": null,
      "availability": null,
      "content_source_id": 16
    },
    "description_md5": "38d53a2f4c2a9073f9b6811f35a40eb6",
    "craft_requirements_md5": null,
    "before": {
      "bulk": "0.1",
      "usage": "worn",
      "traits": [
        1531,
        1504
      ]
    },
    "after": {
      "bulk": "0",
      "usage": "worn",
      "traits": [
        1531,
        1504
      ]
    },
    "evidence": {
      "remaster": "https://2e.aonprd.com/Equipment.aspx?ID=2123",
      "legacy": "https://2e.aonprd.com/Equipment.aspx?ID=4656&NoRedirect=1"
    }
  },
  {
    "id": 12331,
    "anchor": {
      "id": 12331,
      "name": "Revealing Mist (Greater)",
      "size": "MEDIUM",
      "uuid": 8342823743295041,
      "group": "GENERAL",
      "hands": null,
      "level": 7,
      "price": {
        "gp": 60
      },
      "rarity": "COMMON",
      "version": "1.0",
      "meta_data": {
        "hp": 0,
        "bulk": {},
        "runes": {},
        "damage": null,
        "hp_max": 0,
        "source": {
          "url": "https://2e.aonprd.com/Equipment.aspx?ID=4476",
          "book": "Treasure Vault",
          "page": "55"
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
      "created_at": "2024-04-19T04:21:35.289347+00:00",
      "operations": null,
      "availability": null,
      "content_source_id": 16
    },
    "description_md5": "19d88135e1a4e14c6ae1f8cd9f545949",
    "craft_requirements_md5": null,
    "before": {
      "bulk": "0",
      "usage": "held-in-one-hand",
      "traits": [
        1529,
        1531
      ]
    },
    "after": {
      "bulk": "0.1",
      "usage": "held-in-one-hand",
      "traits": [
        1529,
        1531
      ]
    },
    "evidence": {
      "remaster": "https://2e.aonprd.com/Equipment.aspx?ID=1943",
      "legacy": "https://2e.aonprd.com/Equipment.aspx?ID=4476&NoRedirect=1"
    }
  },
  {
    "id": 12338,
    "anchor": {
      "id": 12338,
      "name": "Rime Foil",
      "size": "MEDIUM",
      "uuid": 8663203364210759,
      "group": "WEAPON",
      "hands": null,
      "level": 11,
      "price": {
        "gp": 1400
      },
      "rarity": "UNCOMMON",
      "version": "1.0",
      "meta_data": {
        "hp": 0,
        "bulk": {},
        "group": "sword",
        "range": null,
        "runes": {
          "potency": 2,
          "property": [
            {
              "id": 6976,
              "name": "Frost"
            }
          ],
          "striking": 1
        },
        "damage": {
          "die": "d6",
          "dice": 1,
          "damageType": "piercing"
        },
        "hp_max": 0,
        "reload": "",
        "source": {
          "url": "https://2e.aonprd.com/Equipment.aspx?ID=4409",
          "book": "Treasure Vault",
          "page": "34"
        },
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
        "base_item": "rapier",
        "broken_threshold": 0
      },
      "created_at": "2024-04-19T04:21:39.709117+00:00",
      "operations": null,
      "availability": null,
      "content_source_id": 16
    },
    "description_md5": "abdd594cc2060ca926651e2da6e0e160",
    "craft_requirements_md5": null,
    "before": {
      "bulk": "1",
      "usage": "held-in-one-hand",
      "traits": [
        1852,
        1604,
        1570
      ]
    },
    "after": {
      "bulk": "0.1",
      "usage": "held-in-one-hand",
      "traits": [
        1852,
        1604,
        1570
      ]
    },
    "evidence": {
      "remaster": "https://2e.aonprd.com/Equipment.aspx?ID=1876",
      "legacy": "https://2e.aonprd.com/Equipment.aspx?ID=4409&NoRedirect=1"
    }
  },
  {
    "id": 12380,
    "anchor": {
      "id": 12380,
      "name": "Scizore of the Crab",
      "size": "MEDIUM",
      "uuid": 3833753185657390,
      "group": "WEAPON",
      "hands": null,
      "level": 5,
      "price": {
        "gp": 150
      },
      "rarity": "COMMON",
      "version": "1.0",
      "meta_data": {
        "hp": 0,
        "bulk": {},
        "group": "knife",
        "range": null,
        "runes": {
          "potency": 1,
          "property": [],
          "striking": 0
        },
        "damage": {
          "die": "d6",
          "dice": 1,
          "damageType": "slashing"
        },
        "hp_max": 0,
        "reload": "",
        "source": {
          "url": "https://2e.aonprd.com/Equipment.aspx?ID=4420",
          "book": "Treasure Vault",
          "page": "36"
        },
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
        "base_item": "scizore",
        "broken_threshold": 0
      },
      "created_at": "2024-04-19T04:22:10.56592+00:00",
      "operations": null,
      "availability": null,
      "content_source_id": 16
    },
    "description_md5": "37b1187e4f3110412a0bbf8a1010e555",
    "craft_requirements_md5": "2b6a88123314a12340d6ae1a1172cc34",
    "before": {
      "bulk": "0.1",
      "usage": "held-in-one-hand",
      "traits": [
        1604,
        2524,
        1572
      ]
    },
    "after": {
      "bulk": "1",
      "usage": "worn on 1 hand",
      "traits": [
        1604,
        2524,
        1572
      ]
    },
    "evidence": {
      "remaster": "https://2e.aonprd.com/Equipment.aspx?ID=1887",
      "legacy": "https://2e.aonprd.com/Equipment.aspx?ID=4420&NoRedirect=1"
    }
  },
  {
    "id": 12400,
    "anchor": {
      "id": 12400,
      "name": "Shattered Plan",
      "size": "MEDIUM",
      "uuid": 5634644184935362,
      "group": "WEAPON",
      "hands": null,
      "level": 11,
      "price": {
        "gp": 1400
      },
      "rarity": "UNCOMMON",
      "version": "1.0",
      "meta_data": {
        "hp": 0,
        "bulk": {},
        "group": "club",
        "range": 60,
        "runes": {
          "potency": 2,
          "property": [],
          "striking": 1
        },
        "damage": {
          "die": "d6",
          "dice": 1,
          "damageType": "bludgeoning"
        },
        "hp_max": 0,
        "reload": "-",
        "source": {
          "url": "https://2e.aonprd.com/Equipment.aspx?ID=4410",
          "book": "Treasure Vault",
          "page": "35"
        },
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
        "base_item": "boomerang",
        "broken_threshold": 0
      },
      "created_at": "2024-04-19T04:22:25.271936+00:00",
      "operations": null,
      "availability": null,
      "content_source_id": 16
    },
    "description_md5": "4f115f543940bb528cf0f7bbbb7531cd",
    "craft_requirements_md5": null,
    "before": {
      "bulk": "0.1",
      "usage": "held-in-one-hand",
      "traits": [
        2872,
        1575
      ]
    },
    "after": {
      "bulk": "1",
      "usage": "held-in-one-hand",
      "traits": [
        2872,
        1575
      ]
    },
    "evidence": {
      "remaster": "https://2e.aonprd.com/Equipment.aspx?ID=1877",
      "legacy": "https://2e.aonprd.com/Equipment.aspx?ID=4410&NoRedirect=1"
    }
  },
  {
    "id": 12426,
    "anchor": {
      "id": 12426,
      "name": "Solar Shellflower",
      "size": "MEDIUM",
      "uuid": 3811723121440009,
      "group": "WEAPON",
      "hands": null,
      "level": 5,
      "price": {
        "gp": 160
      },
      "rarity": "UNCOMMON",
      "version": "1.0",
      "meta_data": {
        "hp": 0,
        "bulk": {},
        "group": "firearm",
        "range": 70,
        "runes": {
          "potency": 1,
          "property": [],
          "striking": 1
        },
        "damage": {
          "die": "d6",
          "dice": 1,
          "damageType": "fire"
        },
        "hp_max": 0,
        "reload": "1",
        "source": {
          "url": "https://2e.aonprd.com/Equipment.aspx?ID=4425",
          "book": "Treasure Vault",
          "page": "39"
        },
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
        "base_item": "flintlock-musket",
        "broken_threshold": 0
      },
      "created_at": "2024-04-19T04:22:45.684378+00:00",
      "operations": null,
      "availability": null,
      "content_source_id": 16
    },
    "description_md5": "5b2dbce22fcb3fa77bb1db4f009ddd30",
    "craft_requirements_md5": null,
    "before": {
      "bulk": "1",
      "usage": "held-in-two-hands",
      "traits": [
        1686,
        3073
      ]
    },
    "after": {
      "bulk": "0.1",
      "usage": "held-in-two-hands",
      "traits": [
        1686,
        3073,
        1459,
        1542
      ]
    },
    "evidence": {
      "remaster": "https://2e.aonprd.com/Equipment.aspx?ID=1892",
      "legacy": "https://2e.aonprd.com/Equipment.aspx?ID=4425&NoRedirect=1"
    }
  },
  {
    "id": 12434,
    "anchor": {
      "id": 12434,
      "name": "Spark Dancer",
      "size": "MEDIUM",
      "uuid": 6987990810264917,
      "group": "WEAPON",
      "hands": null,
      "level": 13,
      "price": {
        "gp": 2900
      },
      "rarity": "UNCOMMON",
      "version": "1.0",
      "meta_data": {
        "hp": 0,
        "bulk": {},
        "group": "firearm",
        "range": 60,
        "runes": {
          "potency": 2,
          "property": [],
          "striking": 2
        },
        "damage": {
          "die": "d4",
          "dice": 1,
          "damageType": "fire"
        },
        "hp_max": 0,
        "reload": "1",
        "source": {
          "url": "https://2e.aonprd.com/Equipment.aspx?ID=4426",
          "book": "Treasure Vault",
          "page": "39"
        },
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
        "base_item": "pepperbox",
        "broken_threshold": 0
      },
      "created_at": "2024-04-19T04:22:51.428305+00:00",
      "operations": null,
      "availability": null,
      "content_source_id": 16
    },
    "description_md5": "17db8ecce7d0beb42444a9747e32bb1a",
    "craft_requirements_md5": null,
    "before": {
      "bulk": "1",
      "usage": "held-in-one-hand",
      "traits": [
        1653,
        3073
      ]
    },
    "after": {
      "bulk": "0.1",
      "usage": "held-in-one-hand",
      "traits": [
        1653,
        3073,
        1459,
        1542
      ]
    },
    "evidence": {
      "remaster": "https://2e.aonprd.com/Equipment.aspx?ID=1893",
      "legacy": "https://2e.aonprd.com/Equipment.aspx?ID=4426&NoRedirect=1"
    }
  },
  {
    "id": 12523,
    "anchor": {
      "id": 12523,
      "name": "Thousand-Pains Fulu (Blade)",
      "size": "MEDIUM",
      "uuid": 6130829599675322,
      "group": "GENERAL",
      "hands": null,
      "level": 8,
      "price": {
        "gp": 90
      },
      "rarity": "UNCOMMON",
      "version": "1.0",
      "meta_data": {
        "hp": 0,
        "bulk": {},
        "runes": {},
        "damage": null,
        "hp_max": 0,
        "source": {
          "url": "https://2e.aonprd.com/Equipment.aspx?ID=4577",
          "book": "Treasure Vault",
          "page": "79"
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
      "created_at": "2024-04-19T04:23:56.428194+00:00",
      "operations": null,
      "availability": null,
      "content_source_id": 16
    },
    "description_md5": "7fadb968cc65e4df55dd7dfdc61d44d5",
    "craft_requirements_md5": null,
    "before": {
      "bulk": "0",
      "usage": "held-in-one-hand",
      "traits": [
        1531,
        2854,
        1504
      ]
    },
    "after": {
      "bulk": "0",
      "usage": "affixed to a creature",
      "traits": [
        1531,
        2854,
        1504
      ]
    },
    "evidence": {
      "remaster": "https://2e.aonprd.com/Equipment.aspx?ID=2044",
      "legacy": "https://2e.aonprd.com/Equipment.aspx?ID=4577&NoRedirect=1"
    }
  },
  {
    "id": 12524,
    "anchor": {
      "id": 12524,
      "name": "Thousand-Pains Fulu (Burl)",
      "size": "MEDIUM",
      "uuid": 2887702531387909,
      "group": "GENERAL",
      "hands": null,
      "level": 17,
      "price": {
        "gp": 2700
      },
      "rarity": "UNCOMMON",
      "version": "1.0",
      "meta_data": {
        "hp": 0,
        "bulk": {},
        "runes": {},
        "damage": null,
        "hp_max": 0,
        "source": {
          "url": "https://2e.aonprd.com/Equipment.aspx?ID=4577",
          "book": "Treasure Vault",
          "page": "79"
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
      "created_at": "2024-04-19T04:23:57.006175+00:00",
      "operations": null,
      "availability": null,
      "content_source_id": 16
    },
    "description_md5": "1fc20e9f6dab4960b141c3218eba58bb",
    "craft_requirements_md5": null,
    "before": {
      "bulk": "0",
      "usage": "held-in-one-hand",
      "traits": [
        1531,
        2854,
        1504
      ]
    },
    "after": {
      "bulk": "0",
      "usage": "affixed to a creature",
      "traits": [
        1531,
        2854,
        1504
      ]
    },
    "evidence": {
      "remaster": "https://2e.aonprd.com/Equipment.aspx?ID=2044",
      "legacy": "https://2e.aonprd.com/Equipment.aspx?ID=4577&NoRedirect=1"
    }
  },
  {
    "id": 12525,
    "anchor": {
      "id": 12525,
      "name": "Thousand-Pains Fulu (Icicle)",
      "size": "MEDIUM",
      "uuid": 7107672925911430,
      "group": "GENERAL",
      "hands": null,
      "level": 14,
      "price": {
        "gp": 630
      },
      "rarity": "UNCOMMON",
      "version": "1.0",
      "meta_data": {
        "hp": 0,
        "bulk": {},
        "runes": {},
        "damage": null,
        "hp_max": 0,
        "source": {
          "url": "https://2e.aonprd.com/Equipment.aspx?ID=4577",
          "book": "Treasure Vault",
          "page": "79"
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
      "created_at": "2024-04-19T04:23:57.627956+00:00",
      "operations": null,
      "availability": null,
      "content_source_id": 16
    },
    "description_md5": "16fd351e64efb4153d20f8e73dc0c844",
    "craft_requirements_md5": null,
    "before": {
      "bulk": "0",
      "usage": "held-in-one-hand",
      "traits": [
        1531,
        2854,
        1504
      ]
    },
    "after": {
      "bulk": "0",
      "usage": "affixed to a creature",
      "traits": [
        1531,
        2854,
        1504
      ]
    },
    "evidence": {
      "remaster": "https://2e.aonprd.com/Equipment.aspx?ID=2044",
      "legacy": "https://2e.aonprd.com/Equipment.aspx?ID=4577&NoRedirect=1"
    }
  },
  {
    "id": 12526,
    "anchor": {
      "id": 12526,
      "name": "Thousand-Pains Fulu (Needle)",
      "size": "MEDIUM",
      "uuid": 5483361810605740,
      "group": "GENERAL",
      "hands": null,
      "level": 11,
      "price": {
        "gp": 270
      },
      "rarity": "UNCOMMON",
      "version": "1.0",
      "meta_data": {
        "hp": 0,
        "bulk": {},
        "runes": {},
        "damage": null,
        "hp_max": 0,
        "source": {
          "url": "https://2e.aonprd.com/Equipment.aspx?ID=4577",
          "book": "Treasure Vault",
          "page": "79"
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
      "created_at": "2024-04-19T04:23:58.179518+00:00",
      "operations": null,
      "availability": null,
      "content_source_id": 16
    },
    "description_md5": "fcaa34efdfc0b870878372f40970af1d",
    "craft_requirements_md5": null,
    "before": {
      "bulk": "0",
      "usage": "held-in-one-hand",
      "traits": [
        1531,
        2854,
        1504
      ]
    },
    "after": {
      "bulk": "0",
      "usage": "affixed to a creature",
      "traits": [
        1531,
        2854,
        1504
      ]
    },
    "evidence": {
      "remaster": "https://2e.aonprd.com/Equipment.aspx?ID=2044",
      "legacy": "https://2e.aonprd.com/Equipment.aspx?ID=4577&NoRedirect=1"
    }
  },
  {
    "id": 12527,
    "anchor": {
      "id": 12527,
      "name": "Thousand-Pains Fulu (Stone)",
      "size": "MEDIUM",
      "uuid": 5935675582387213,
      "group": "GENERAL",
      "hands": null,
      "level": 5,
      "price": {
        "gp": 30
      },
      "rarity": "UNCOMMON",
      "version": "1.0",
      "meta_data": {
        "hp": 0,
        "bulk": {},
        "runes": {},
        "damage": null,
        "hp_max": 0,
        "source": {
          "url": "https://2e.aonprd.com/Equipment.aspx?ID=4577",
          "book": "Treasure Vault",
          "page": "79"
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
      "created_at": "2024-04-19T04:23:58.762776+00:00",
      "operations": null,
      "availability": null,
      "content_source_id": 16
    },
    "description_md5": "ff543d9e309d02c0bce3ec01049c2b8c",
    "craft_requirements_md5": null,
    "before": {
      "bulk": "0",
      "usage": "held-in-one-hand",
      "traits": [
        1531,
        2854,
        1504
      ]
    },
    "after": {
      "bulk": "0",
      "usage": "affixed to a creature",
      "traits": [
        1531,
        2854,
        1504
      ]
    },
    "evidence": {
      "remaster": "https://2e.aonprd.com/Equipment.aspx?ID=2044",
      "legacy": "https://2e.aonprd.com/Equipment.aspx?ID=4577&NoRedirect=1"
    }
  },
  {
    "id": 12528,
    "anchor": {
      "id": 12528,
      "name": "Thousand-Pains Fulu (Void)",
      "size": "MEDIUM",
      "uuid": 7279499799064253,
      "group": "GENERAL",
      "hands": null,
      "level": 20,
      "price": {
        "gp": 8100
      },
      "rarity": "UNCOMMON",
      "version": "1.0",
      "meta_data": {
        "hp": 0,
        "bulk": {},
        "runes": {},
        "damage": null,
        "hp_max": 0,
        "source": {
          "url": "https://2e.aonprd.com/Equipment.aspx?ID=4577",
          "book": "Treasure Vault",
          "page": "79"
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
      "created_at": "2024-04-19T04:23:59.318624+00:00",
      "operations": null,
      "availability": null,
      "content_source_id": 16
    },
    "description_md5": "a37065b7fdc4c60746a7fced3d93ba16",
    "craft_requirements_md5": null,
    "before": {
      "bulk": "0",
      "usage": "held-in-one-hand",
      "traits": [
        1531,
        2854,
        1504
      ]
    },
    "after": {
      "bulk": "0",
      "usage": "affixed to a creature",
      "traits": [
        1531,
        2854,
        1504
      ]
    },
    "evidence": {
      "remaster": "https://2e.aonprd.com/Equipment.aspx?ID=2044",
      "legacy": "https://2e.aonprd.com/Equipment.aspx?ID=4577&NoRedirect=1"
    }
  },
  {
    "id": 12533,
    "anchor": {
      "id": 12533,
      "name": "Thunderblast Slippers (Greater)",
      "size": "MEDIUM",
      "uuid": 2038577180803105,
      "group": "GENERAL",
      "hands": null,
      "level": 15,
      "price": {
        "gp": 6500
      },
      "rarity": "COMMON",
      "version": "1.0",
      "meta_data": {
        "hp": 0,
        "bulk": {},
        "runes": {},
        "hp_max": 0,
        "source": {
          "url": "https://2e.aonprd.com/Equipment.aspx?ID=4863",
          "book": "Treasure Vault",
          "page": "151"
        },
        "foundry": {
          "items": [],
          "rules": [
            {
              "key": "FlatModifier",
              "type": "item",
              "value": 2,
              "selector": "acrobatics"
            }
          ],
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
      "created_at": "2024-04-19T04:24:05.21813+00:00",
      "operations": null,
      "availability": null,
      "content_source_id": 16
    },
    "description_md5": "4871c6e279e4fd7d582d432ed202c3c1",
    "craft_requirements_md5": null,
    "before": {
      "bulk": "0",
      "usage": "wornfootwear",
      "traits": [
        1527,
        1504,
        1484
      ]
    },
    "after": {
      "bulk": "0.1",
      "usage": "wornfootwear",
      "traits": [
        1527,
        1504,
        1484
      ]
    },
    "evidence": {
      "remaster": "https://2e.aonprd.com/Equipment.aspx?ID=2331",
      "legacy": "https://2e.aonprd.com/Equipment.aspx?ID=4863&NoRedirect=1"
    }
  },
  {
    "id": 12534,
    "anchor": {
      "id": 12534,
      "name": "Thunderblast Slippers",
      "size": "MEDIUM",
      "uuid": 4479008997353398,
      "group": "GENERAL",
      "hands": null,
      "level": 9,
      "price": {
        "gp": 650
      },
      "rarity": "COMMON",
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
          "url": "https://2e.aonprd.com/Equipment.aspx?ID=4863",
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
              "selector": "acrobatics"
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
      "created_at": "2024-04-19T04:24:05.833536+00:00",
      "operations": [
        {
          "id": "47af7c16-6d55-44e4-9bf5-9deb1e4367f5",
          "data": {
            "text": "",
            "type": "item",
            "value": "2",
            "variable": "SKILL_ACROBATICS"
          },
          "type": "addBonusToValue"
        }
      ],
      "availability": null,
      "content_source_id": 16
    },
    "description_md5": "c07cfdf26aab3c6e410bc5cafe7fd9ef",
    "craft_requirements_md5": null,
    "before": {
      "bulk": "0",
      "usage": "wornfootwear",
      "traits": [
        1527,
        1504,
        1484
      ]
    },
    "after": {
      "bulk": "0.1",
      "usage": "wornfootwear",
      "traits": [
        1527,
        1504,
        1484
      ]
    },
    "evidence": {
      "remaster": "https://2e.aonprd.com/Equipment.aspx?ID=2331",
      "legacy": "https://2e.aonprd.com/Equipment.aspx?ID=4863&NoRedirect=1"
    }
  },
  {
    "id": 12535,
    "anchor": {
      "id": 12535,
      "name": "Thundercrasher",
      "size": "MEDIUM",
      "uuid": 2524622805310747,
      "group": "WEAPON",
      "hands": null,
      "level": 5,
      "price": {
        "gp": 155
      },
      "rarity": "UNCOMMON",
      "version": "1.0",
      "meta_data": {
        "hp": 0,
        "bulk": {},
        "group": "firearm",
        "range": 40,
        "runes": {
          "potency": 1,
          "property": [],
          "striking": 1
        },
        "damage": {
          "die": "d8",
          "dice": 1,
          "damageType": "sonic"
        },
        "hp_max": 0,
        "reload": "1",
        "source": {
          "url": "https://2e.aonprd.com/Equipment.aspx?ID=4427",
          "book": "Treasure Vault",
          "page": "39"
        },
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
        "base_item": "blunderbuss",
        "broken_threshold": 0
      },
      "created_at": "2024-04-19T04:24:07.590499+00:00",
      "operations": null,
      "availability": null,
      "content_source_id": 16
    },
    "description_md5": "9a005f620359c347ab60bb00d369bf39",
    "craft_requirements_md5": null,
    "before": {
      "bulk": "2",
      "usage": "held-in-two-hands",
      "traits": [
        3073
      ]
    },
    "after": {
      "bulk": "2",
      "usage": "held-in-two-hands",
      "traits": [
        3073,
        1459
      ]
    },
    "evidence": {
      "remaster": "https://2e.aonprd.com/Equipment.aspx?ID=1894",
      "legacy": "https://2e.aonprd.com/Equipment.aspx?ID=4427&NoRedirect=1"
    }
  }
]
$patches$::jsonb;
  dependencies constant jsonb := $dependencies$[
  {
    "id": 1459,
    "name": "Arcane",
    "uuid": 2175258629482839,
    "content_source_id": 3
  },
  {
    "id": 1514,
    "name": "Occult",
    "uuid": 7684663810066007,
    "content_source_id": 3
  },
  {
    "id": 1517,
    "name": "Light",
    "uuid": 7362437638210779,
    "content_source_id": 3
  },
  {
    "id": 1542,
    "name": "Fire",
    "uuid": 3316639745394270,
    "content_source_id": 3
  },
  {
    "id": 2869,
    "name": "Entrench Ranged",
    "uuid": 8869747565614601,
    "content_source_id": 3
  },
  {
    "id": 2883,
    "name": "Hefty 2",
    "uuid": 3776296879363154,
    "content_source_id": 3
  }
]$dependencies$::jsonb;
  sources constant jsonb := $sources$[
  {
    "id": 3,
    "name": "Common Core",
    "user_id": null,
    "is_published": true
  },
  {
    "id": 16,
    "name": "Treasure Vault",
    "user_id": null,
    "is_published": true
  }
]$sources$::jsonb;
  patch jsonb;
  item_row public.item%rowtype;
  original_rows jsonb := '{}'::jsonb;
  original_row jsonb;
  expected_row jsonb;
  dependency jsonb;
  source_spec jsonb;
  dependency_row public.trait%rowtype;
  source_row public.content_source%rowtype;
  original_dependencies jsonb := '{}'::jsonb;
  original_sources jsonb := '{}'::jsonb;
  changed_rows integer;
begin
  lock table public.content_update in share mode;
  -- Child rows precede the source cache locks used by normal catalog writes.
  perform i.id from public.item i where i.id in(select (p->>'id')::bigint from jsonb_array_elements(patches) p)
    order by i.id for update;
  perform t.id from public.trait t where t.id in(select (d->>'id')::bigint from jsonb_array_elements(dependencies) d)
    order by t.id for share;
  get diagnostics changed_rows=row_count;
  if changed_rows<>jsonb_array_length(dependencies) then raise exception 'Missing header trait dependency'; end if;
  perform s.id from public.content_source s where s.id in(select (p->>'id')::bigint from jsonb_array_elements(sources) p)
    order by s.id for update;
  get diagnostics changed_rows=row_count;
  if changed_rows<>jsonb_array_length(sources) then raise exception 'Missing official header source'; end if;
  for source_spec in select value from jsonb_array_elements(sources) loop
    select * into source_row from public.content_source where id=(source_spec->>'id')::bigint;
    if not found or not(to_jsonb(source_row) @> source_spec) then raise exception 'Changed official header source'; end if;
    original_sources:=original_sources||jsonb_build_object(source_spec->>'id',to_jsonb(source_row)-'updated_at');
  end loop;
  for dependency in select value from jsonb_array_elements(dependencies) loop
    select * into dependency_row from public.trait where id=(dependency->>'id')::bigint;
    if not found or not(to_jsonb(dependency_row) @> dependency) then raise exception 'Changed header trait identity'; end if;
    original_dependencies:=original_dependencies||jsonb_build_object(dependency->>'id',to_jsonb(dependency_row)-array['updated_at','search_tsv']);
  end loop;
  if exists(select 1 from public.content_update u where coalesce(u.status->>'state','') not in ('APPROVED','REJECTED') and (
    (u.type='content-source' and exists(select 1 from jsonb_array_elements(sources) s where u.ref_id=(s->>'id')::bigint or u.data->>'id'=s->>'id' or u.data->>'name'=s->>'name'))
    or (u.type='item' and exists(select 1 from jsonb_array_elements(patches) p where
      u.ref_id=(p->>'id')::bigint or u.data->>'id'=p->>'id' or u.data->>'uuid'=p->'anchor'->>'uuid'
      or ((u.content_source_id=16 or u.data->>'content_source_id'='16') and u.data->>'name'=p->'anchor'->>'name')))
    or (u.type='trait' and exists(select 1 from jsonb_array_elements(dependencies) d where
      u.ref_id=(d->>'id')::bigint or u.data->>'id'=d->>'id' or u.data->>'uuid'=d->>'uuid'
      or ((u.content_source_id=(d->>'content_source_id')::bigint or u.data->>'content_source_id'=d->>'content_source_id') and u.data->>'name'=d->>'name'))))) then raise exception 'Treasure Vault header repair has an unresolved curator submission'; end if;

  -- Capture every owner before any update so cross-owner trigger drift is rejected too.
  for patch in select value from jsonb_array_elements(patches) order by (value->>'id')::bigint loop
    select * into item_row from public.item where id=(patch->>'id')::bigint;
    if not found or (to_jsonb(item_row)-array['search_tsv','updated_at','description','craft_requirements','bulk','usage','traits']) is distinct from patch->'anchor'
      or md5(item_row.description) is distinct from patch->>'description_md5'
      or md5(item_row.craft_requirements) is distinct from patch->>'craft_requirements_md5' then
      raise exception 'Missing or changed reviewed physical-header item: %',patch->>'id';
    end if;
    if jsonb_build_object('bulk',item_row.bulk,'usage',item_row.usage,'traits',item_row.traits) is distinct from patch->'before'
      and jsonb_build_object('bulk',item_row.bulk,'usage',item_row.usage,'traits',item_row.traits) is distinct from patch->'after'
      and jsonb_build_object('bulk',item_row.bulk,'usage',item_row.usage,'traits',item_row.traits) is distinct from patch->'successor_after' then
      raise exception 'Unreviewed physical-header tuple: %',patch->>'id';
    end if;
    original_rows:=original_rows||jsonb_build_object(patch->>'id',to_jsonb(item_row)-array['search_tsv','updated_at']);
  end loop;

  for patch in select value from jsonb_array_elements(patches) order by (value->>'id')::bigint loop
    select * into item_row from public.item where id=(patch->>'id')::bigint;
    original_row:=original_rows->(patch->>'id');
    if (to_jsonb(item_row)-array['search_tsv','updated_at']) is distinct from original_row then
      raise exception 'Physical-header owner changed during repair: %',patch->>'id';
    end if;
    if jsonb_build_object('bulk',item_row.bulk,'usage',item_row.usage,'traits',item_row.traits) is distinct from patch->'after'
      and jsonb_build_object('bulk',item_row.bulk,'usage',item_row.usage,'traits',item_row.traits) is distinct from patch->'successor_after' then
      update public.item i set bulk=patch->'after'->>'bulk',usage=patch->'after'->>'usage',
        traits=(select coalesce(array_agg(value::bigint order by ordinality),'{}'::bigint[]) from jsonb_array_elements_text(patch->'after'->'traits') with ordinality)
        where i.id=(patch->>'id')::bigint and (to_jsonb(i)-array['search_tsv','updated_at'])=original_row;
      get diagnostics changed_rows=row_count;
      if changed_rows<>1 then raise exception 'Physical-header compare-and-swap failed: %',patch->>'id'; end if;
    end if;
  end loop;
  for dependency in select value from jsonb_array_elements(dependencies) loop
    select * into dependency_row from public.trait where id=(dependency->>'id')::bigint;
    if not found or (to_jsonb(dependency_row)-array['updated_at','search_tsv']) is distinct from original_dependencies->(dependency->>'id') then
      raise exception 'Header trait dependency changed during repair';
    end if;
  end loop;
  for source_spec in select value from jsonb_array_elements(sources) loop
    select * into source_row from public.content_source where id=(source_spec->>'id')::bigint;
    if not found or (to_jsonb(source_row)-'updated_at') is distinct from original_sources->(source_spec->>'id') then
      raise exception 'Header source changed during repair';
    end if;
  end loop;

  for patch in select value from jsonb_array_elements(patches) order by (value->>'id')::bigint loop
    select * into item_row from public.item where id=(patch->>'id')::bigint;
    original_row:=original_rows->(patch->>'id');
    expected_row:=original_row||(case when jsonb_build_object('bulk',original_row->'bulk','usage',original_row->'usage','traits',original_row->'traits')=patch->'successor_after' then patch->'successor_after' else patch->'after' end);
    if not found or (to_jsonb(item_row)-array['search_tsv','updated_at']) is distinct from expected_row then
      raise exception 'Physical-header terminal preservation failed: %',patch->>'id';
    end if;
  end loop;
  if exists(select 1 from public.content_update u where coalesce(u.status->>'state','') not in ('APPROVED','REJECTED') and (
    (u.type='content-source' and exists(select 1 from jsonb_array_elements(sources) s where u.ref_id=(s->>'id')::bigint or u.data->>'id'=s->>'id' or u.data->>'name'=s->>'name'))
    or (u.type='item' and exists(select 1 from jsonb_array_elements(patches) p where
      u.ref_id=(p->>'id')::bigint or u.data->>'id'=p->>'id' or u.data->>'uuid'=p->'anchor'->>'uuid'
      or ((u.content_source_id=16 or u.data->>'content_source_id'='16') and u.data->>'name'=p->'anchor'->>'name')))
    or (u.type='trait' and exists(select 1 from jsonb_array_elements(dependencies) d where
      u.ref_id=(d->>'id')::bigint or u.data->>'id'=d->>'id' or u.data->>'uuid'=d->>'uuid'
      or ((u.content_source_id=(d->>'content_source_id')::bigint or u.data->>'content_source_id'=d->>'content_source_id') and u.data->>'name'=d->>'name'))))) then raise exception 'Physical-header curator guard changed'; end if;
end
$repair$;
$historical_original_dual$;
end $historical_dual$;
