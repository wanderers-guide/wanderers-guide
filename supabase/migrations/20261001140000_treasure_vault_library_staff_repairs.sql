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
  execute $historical_original_dual$-- Reviewed Librarian/Socialite staff content only. Saved items and original citations remain unchanged.
do $repair$
declare
  spec constant jsonb := $library${
  "items": [
    {
      "id": 12153,
      "expected": {
        "id": 12153,
        "bulk": "1",
        "name": "Librarian Staff",
        "size": "MEDIUM",
        "uuid": "4646830949241613",
        "group": "WEAPON",
        "hands": null,
        "level": 6,
        "price": {
          "gp": 225
        },
        "usage": "held-in-one-hand",
        "rarity": "COMMON",
        "traits": [
          1559,
          1504,
          1546,
          1831
        ],
        "version": "1.0",
        "availability": null,
        "content_source_id": 16,
        "craft_requirements": "Supply one casting of all listed ranks of all listed spells."
      },
      "metadata": {
        "base_item": "staff",
        "damage": {
          "die": "d4",
          "dice": 1,
          "extra": "",
          "damageType": "bludgeoning"
        },
        "runes": {
          "potency": 0,
          "property": [],
          "striking": 0
        },
        "source": {
          "url": "https://2e.aonprd.com/Equipment.aspx?ID=4788",
          "book": "Treasure Vault",
          "page": "133"
        }
      },
      "description": {
        "before": "A _librarian staff_ is a slender pole composed of thousands of coiled and compressed book pages swirling into one another, with a mishmash of letters tumbling across its surface. The sound of rustling pages can be heard when the staff moves.\n\n**Activate** <abbr cost=\"THREE-ACTIONS\" class=\"action-symbol\">3</abbr> command, envision, Interact\n\n**Effect** You store one portable text of 1 Bulk or less—typically a book or scroll—in an extradimensional space in the staff. You can also use this activation to retrieve one text stored in the staff. The staff can store up to 50 texts.\n\n**Activate** [Cast a Spell](link_action_19611)\n\n**Effect** You expend a number of charges from the staff to cast a spell from its list.\n\n*   **Cantrip** [Approximate](link_spell_5298), [Read Aura](link_spell_4794)\n    \n*   **1st** [Pocket Library](link_spell_5416), [Quick Sort](link_spell_5427), [Share Lore](link_spell_6244)\n    \n*   **2nd** [Translate](link_spell_4905), [Timely Tutor](link_spell_5476)",
        "after": "A _librarian staff_ is a slender pole composed of thousands of coiled and compressed book pages swirling into one another, with a mishmash of letters tumbling across its surface. The sound of rustling pages can be heard when the staff moves.\n\n**Activate** <abbr cost=\"THREE-ACTIONS\" class=\"action-symbol\">3</abbr> ([concentrate](link_trait_1432), [manipulate](link_trait_1433))\n\n**Effect** You store one portable text of 1 Bulk or less—typically a book or scroll—in an extradimensional space in the staff. You can also use this activation to retrieve one text stored in the staff. The staff can store up to 50 texts.\n\n**Activate** [Cast a Spell](link_action_19611)\n\n**Effect** You expend a number of charges from the staff to cast a spell from its list.\n\n*   **Cantrip** *[approximate](link_spell_8800)*, *[read aura](link_spell_4794)*\n    \n*   **1st** *[pocket library](link_spell_7610)*, *[quick sort](link_spell_9010)*, *[share lore](link_spell_7366)*\n    \n*   **2nd** *[translate](link_spell_4905)*, *[timely tutor](link_spell_9053)*",
        "before_md5": "7c0749cbd8e3b31735b0ad9fb0ef5bee",
        "after_md5": "1b0835e6fae35555b982a60053a03212",
        "replacements": [
          {
            "from": "<abbr cost=\"THREE-ACTIONS\" class=\"action-symbol\">3</abbr> command, envision, Interact",
            "to": "<abbr cost=\"THREE-ACTIONS\" class=\"action-symbol\">3</abbr> ([concentrate](link_trait_1432), [manipulate](link_trait_1433))",
            "count": 1
          },
          {
            "from": "[Approximate](link_spell_5298)",
            "to": "*[approximate](link_spell_8800)*",
            "count": 1
          },
          {
            "from": "[Read Aura](link_spell_4794)",
            "to": "*[read aura](link_spell_4794)*",
            "count": 1
          },
          {
            "from": "[Pocket Library](link_spell_5416)",
            "to": "*[pocket library](link_spell_7610)*",
            "count": 1
          },
          {
            "from": "[Quick Sort](link_spell_5427)",
            "to": "*[quick sort](link_spell_9010)*",
            "count": 1
          },
          {
            "from": "[Share Lore](link_spell_6244)",
            "to": "*[share lore](link_spell_7366)*",
            "count": 1
          },
          {
            "from": "[Translate](link_spell_4905)",
            "to": "*[translate](link_spell_4905)*",
            "count": 1
          },
          {
            "from": "[Timely Tutor](link_spell_5476)",
            "to": "*[timely tutor](link_spell_9053)*",
            "count": 1
          }
        ]
      },
      "operations": {
        "before": null,
        "after": null
      },
      "pairs": [
        [
          8800,
          0
        ],
        [
          4794,
          0
        ],
        [
          7610,
          1
        ],
        [
          9010,
          1
        ],
        [
          7366,
          1
        ],
        [
          4905,
          2
        ],
        [
          9053,
          2
        ]
      ]
    },
    {
      "id": 12152,
      "expected": {
        "id": 12152,
        "bulk": "1",
        "name": "Librarian Staff (Greater)",
        "size": "MEDIUM",
        "uuid": "6523049172950353",
        "group": "WEAPON",
        "hands": null,
        "level": 12,
        "price": {
          "gp": 1750
        },
        "usage": "held-in-one-hand",
        "rarity": "COMMON",
        "traits": [
          1559,
          1504,
          1546,
          1831
        ],
        "version": "1.0",
        "availability": null,
        "content_source_id": 16,
        "craft_requirements": "Supply one casting of all listed levels of all listed spells."
      },
      "metadata": {
        "base_item": "staff",
        "damage": {
          "die": "d4",
          "dice": 1,
          "damageType": "bludgeoning"
        },
        "runes": {
          "potency": 0,
          "property": [],
          "striking": 0
        },
        "source": {
          "url": "https://2e.aonprd.com/Equipment.aspx?ID=4788",
          "book": "Treasure Vault",
          "page": "133"
        }
      },
      "description": {
        "before": "A _librarian staff_ is a slender pole composed of thousands of coiled and compressed book pages swirling into one another, with a mishmash of letters tumbling across its surface. The sound of rustling pages can be heard when the staff moves.\n\n**Activate** 3 command, envision, Interact\n\n**Effect** You store one portable text of 1 Bulk or less—typically a book or scroll—in an extradimensional space in the staff. You can also use this activation to retrieve one text stored in the staff. The staff can store up to 50 texts.\n\n**Activate** Cast a Spell\n\n**Effect** You expend a number of charges from the staff to cast a spell from its list.\n\n*   **Cantrip** \\[\\[Approximate\\]\\], \\[\\[Read Aura\\]\\]\n*   **1st** \\[\\[Pocket Library\\]\\], \\[\\[Quick Sort\\]\\], \\[\\[Share Lore\\]\\]\n*   **2nd** \\[\\[Translate\\]\\], \\[\\[Timely Tutor\\]\\]\n*   **3rd** \\[\\[Translate\\]\\], \\[\\[Pocket Library\\]\\], \\[\\[Quick Sort\\]\\], \\[\\[Share Lore\\]\\]\n*   **4th** \\[\\[Translate\\]\\]\n*   **5th** \\[\\[Quick Sort\\]\\], \\[\\[Share Lore\\]\\]",
        "after": "A _librarian staff_ is a slender pole composed of thousands of coiled and compressed book pages swirling into one another, with a mishmash of letters tumbling across its surface. The sound of rustling pages can be heard when the staff moves.\n\n**Activate** <abbr cost=\"THREE-ACTIONS\" class=\"action-symbol\">3</abbr> ([concentrate](link_trait_1432), [manipulate](link_trait_1433))\n\n**Effect** You store one portable text of 1 Bulk or less—typically a book or scroll—in an extradimensional space in the staff. You can also use this activation to retrieve one text stored in the staff. The staff can store up to 100 texts.\n\n**Activate** [Cast a Spell](link_action_19611)\n\n**Effect** You expend a number of charges from the staff to cast a spell from its list.\n\n*   **Cantrip** *[approximate](link_spell_8800)*, *[read aura](link_spell_4794)*\n*   **1st** *[pocket library](link_spell_7610)*, *[quick sort](link_spell_9010)*, *[share lore](link_spell_7366)*\n*   **2nd** *[translate](link_spell_4905)*, *[timely tutor](link_spell_9053)*\n*   **3rd** *[translate](link_spell_4905)*, *[pocket library](link_spell_7610)*, *[quick sort](link_spell_9010)*, *[share lore](link_spell_7366)*\n*   **4th** *[translate](link_spell_4905)*\n*   **5th** *[quick sort](link_spell_9010)*, *[share lore](link_spell_7366)*",
        "before_md5": "da94ae5565a4f19e7ceed53534491707",
        "after_md5": "61c6e09743f22952606d0eee6f39006e",
        "replacements": [
          {
            "from": "3 command, envision, Interact",
            "to": "<abbr cost=\"THREE-ACTIONS\" class=\"action-symbol\">3</abbr> ([concentrate](link_trait_1432), [manipulate](link_trait_1433))",
            "count": 1
          },
          {
            "from": "The staff can store up to 50 texts.",
            "to": "The staff can store up to 100 texts.",
            "count": 1
          },
          {
            "from": "**Activate** Cast a Spell",
            "to": "**Activate** [Cast a Spell](link_action_19611)",
            "count": 1
          },
          {
            "from": "\\[\\[Approximate\\]\\]",
            "to": "*[approximate](link_spell_8800)*",
            "count": 1
          },
          {
            "from": "\\[\\[Read Aura\\]\\]",
            "to": "*[read aura](link_spell_4794)*",
            "count": 1
          },
          {
            "from": "\\[\\[Pocket Library\\]\\]",
            "to": "*[pocket library](link_spell_7610)*",
            "count": 2
          },
          {
            "from": "\\[\\[Quick Sort\\]\\]",
            "to": "*[quick sort](link_spell_9010)*",
            "count": 3
          },
          {
            "from": "\\[\\[Share Lore\\]\\]",
            "to": "*[share lore](link_spell_7366)*",
            "count": 3
          },
          {
            "from": "\\[\\[Translate\\]\\]",
            "to": "*[translate](link_spell_4905)*",
            "count": 3
          },
          {
            "from": "\\[\\[Timely Tutor\\]\\]",
            "to": "*[timely tutor](link_spell_9053)*",
            "count": 1
          }
        ]
      },
      "operations": {
        "before": null,
        "after": null
      },
      "pairs": [
        [
          8800,
          0
        ],
        [
          4794,
          0
        ],
        [
          7610,
          1
        ],
        [
          9010,
          1
        ],
        [
          7366,
          1
        ],
        [
          4905,
          2
        ],
        [
          9053,
          2
        ],
        [
          4905,
          3
        ],
        [
          7610,
          3
        ],
        [
          9010,
          3
        ],
        [
          7366,
          3
        ],
        [
          4905,
          4
        ],
        [
          9010,
          5
        ],
        [
          7366,
          5
        ]
      ]
    },
    {
      "id": 12425,
      "expected": {
        "id": 12425,
        "bulk": "1",
        "name": "Socialite Staff",
        "size": "MEDIUM",
        "uuid": "754438803886308",
        "group": "WEAPON",
        "hands": null,
        "level": 12,
        "price": {
          "gp": 1900
        },
        "usage": "held-in-one-hand",
        "rarity": "COMMON",
        "traits": [
          1504,
          1546,
          1831
        ],
        "version": "1.0",
        "availability": null,
        "content_source_id": 16,
        "craft_requirements": "Supply one casting of all listed levels of all listed spells."
      },
      "metadata": {
        "base_item": "staff",
        "damage": {
          "die": "d4",
          "dice": 1,
          "damageType": "bludgeoning"
        },
        "runes": {
          "potency": 0,
          "property": [],
          "striking": 0
        },
        "source": {
          "url": "https://2e.aonprd.com/Equipment.aspx?ID=4791",
          "book": "Treasure Vault",
          "page": "134"
        }
      },
      "description": {
        "before": "A _socialite staff_ is designed as an ornate cane, its metal body glimmering with jewels and gold inlays. A sculpture carved from obsidian tops the head of the staff, its design depending on its wielder's taste. Common choices include birds, flowers, or family crests. While wielding a socialite staff, you gain a +2 circumstance bonus to \\[\\[Make an Impression\\]\\] on members of high society.\n\n**Activate** Cast a Spell\n\n**Effect** You expend a number of charges from the staff to cast a spell from its list.\n\n*   **Cantrip** \\[\\[Read the Air\\]\\]\n*   **1st** \\[\\[Charm\\]\\], \\[\\[Restyle\\]\\]\n*   **2nd** \\[\\[Befitting Attire\\]\\], \\[\\[Phantom Crowd\\]\\]\n*   **3rd** \\[\\[Bottomless Stomach\\]\\], \\[\\[Shift Blame\\]\\]\n*   **4th** \\[\\[Befitting Attire\\]\\], \\[\\[Suggestion\\]\\]\n*   **5th** \\[\\[Befitting Attire\\]\\], \\[\\[Charm\\]\\], \\[\\[Glimmer of Charm\\]\\], \\[\\[Suggestion\\]\\]",
        "after": "A _socialite staff_ is designed as an ornate cane, its metal body glimmering with jewels and gold inlays. A sculpture carved from obsidian tops the head of the staff, its design depending on its wielder's taste. Common choices include birds, flowers, or family crests. While wielding a socialite staff, you gain a +2 circumstance bonus to [Make an Impression](link_action_19739) on members of high society.\n\n**Activate** [Cast a Spell](link_action_19611)\n\n**Effect** You expend a number of charges from the staff to cast a spell from its list.\n\n*   **Cantrip** *[read the air](link_spell_9011)*\n*   **1st** *[charm](link_spell_4516)*, *[restyle](link_spell_9015)*\n*   **2nd** *[befitting attire](link_spell_8803)*, *[phantom crowd](link_spell_9000)*\n*   **3rd** *[bottomless stomach](link_spell_8817)*, *[shift blame](link_spell_5449)*\n*   **4th** *[befitting attire](link_spell_8803)*, *[suggestion](link_spell_4865)*\n*   **5th** *[befitting attire](link_spell_8803)*, *[charm](link_spell_4516)*, *[glimmer of charm](link_spell_5367)*, *[suggestion](link_spell_4865)*",
        "before_md5": "6757c98aa820da8ca5eb3ce712b91ed3",
        "after_md5": "6f54173b602709290d0c1125c6da12ec",
        "replacements": [
          {
            "from": "\\[\\[Make an Impression\\]\\]",
            "to": "[Make an Impression](link_action_19739)",
            "count": 1
          },
          {
            "from": "**Activate** Cast a Spell",
            "to": "**Activate** [Cast a Spell](link_action_19611)",
            "count": 1
          },
          {
            "from": "\\[\\[Read the Air\\]\\]",
            "to": "*[read the air](link_spell_9011)*",
            "count": 1
          },
          {
            "from": "\\[\\[Charm\\]\\]",
            "to": "*[charm](link_spell_4516)*",
            "count": 2
          },
          {
            "from": "\\[\\[Restyle\\]\\]",
            "to": "*[restyle](link_spell_9015)*",
            "count": 1
          },
          {
            "from": "\\[\\[Befitting Attire\\]\\]",
            "to": "*[befitting attire](link_spell_8803)*",
            "count": 3
          },
          {
            "from": "\\[\\[Phantom Crowd\\]\\]",
            "to": "*[phantom crowd](link_spell_9000)*",
            "count": 1
          },
          {
            "from": "\\[\\[Bottomless Stomach\\]\\]",
            "to": "*[bottomless stomach](link_spell_8817)*",
            "count": 1
          },
          {
            "from": "\\[\\[Shift Blame\\]\\]",
            "to": "*[shift blame](link_spell_5449)*",
            "count": 1
          },
          {
            "from": "\\[\\[Suggestion\\]\\]",
            "to": "*[suggestion](link_spell_4865)*",
            "count": 2
          },
          {
            "from": "\\[\\[Glimmer of Charm\\]\\]",
            "to": "*[glimmer of charm](link_spell_5367)*",
            "count": 1
          }
        ]
      },
      "operations": {
        "before": null,
        "after": [
          {
            "id": "d423f91c-8ef7-40a4-bfb1-b0eecbb2732e",
            "type": "addBonusToValue",
            "data": {
              "variable": "SKILL_DIPLOMACY",
              "value": 2,
              "type": "circumstance",
              "text": "to Make an Impression on members of high society"
            }
          }
        ]
      },
      "pairs": [
        [
          9011,
          0
        ],
        [
          4516,
          1
        ],
        [
          9015,
          1
        ],
        [
          8803,
          2
        ],
        [
          9000,
          2
        ],
        [
          8817,
          3
        ],
        [
          5449,
          3
        ],
        [
          8803,
          4
        ],
        [
          4865,
          4
        ],
        [
          8803,
          5
        ],
        [
          4516,
          5
        ],
        [
          5367,
          5
        ],
        [
          4865,
          5
        ]
      ]
    }
  ],
  "dependencies": [
    {
      "table": "ability-block",
      "id": 19739,
      "name": "Make an Impression",
      "source": 3,
      "states": [
        {
          "expected": {
            "id": 19739,
            "operations": null,
            "name": "Make an Impression",
            "actions": null,
            "level": null,
            "rarity": "COMMON",
            "prerequisites": null,
            "frequency": null,
            "cost": null,
            "trigger": null,
            "requirements": null,
            "access": null,
            "special": null,
            "type": "action",
            "traits": [
              1469,
              1432,
              1457,
              1458,
              1448,
              1438
            ],
            "content_source_id": 3,
            "version": "1.0",
            "uuid": "3944295765726991",
            "availability": null
          },
          "description": "With at least 1 minute of conversation, during which you engage in charismatic overtures, flattery, and other acts of goodwill, you seek to make a good impression on someone to make them temporarily agreeable. At the end of the conversation, attempt a Diplomacy check against the Will DC of one target. You can instead choose up to five targets if you take a –2 penalty. The GM might add other bonuses or penalties based on the situation. Any impression you make lasts for only the current social interaction unless the GM decides otherwise. See Changing Attitudes below for a summary of the attitude conditions.\n\n**Critical Success** The target's attitude toward you improves by two steps.\n\n**Success** The target's attitude toward you improves by one step.\n\n**Critical Failure** The target's attitude toward you decreases by one step.\n\nChanging Attitudes\n------------------\n\nYour influence on NPCs is measured with a set of attitudes that reflect how they view your character. These are only a brief summary of a creature's disposition. The GM will supply additional nuance based on the history and beliefs of the characters you're interacting with, and their attitudes can change in accordance with the story. The attitudes are detailed in the Conditions Appendix and are summarized here.\n\n*   **Helpful:** Willing to help you and responds favorably to your requests.\n*   **Friendly:** Has a good attitude toward you, but won't necessarily stick their neck out to help you.\n*   **Indifferent:** Doesn't care about you either way. (Most NPCs start out indifferent.)\n*   **Unfriendly:** Dislikes you and doesn't want to help you.\n*   **Hostile:** Actively works against you—and might attack you just because of their dislike.\n\nNo one can ever change the attitude of a player character with these skills. You can roleplay interactions with player characters, and even use Diplomacy results if the player wants a mechanical sense of how convincing or charming a character is, but players make the ultimate decisions about how their characters respond.",
          "description_md5": "47e73639db82f170c6ea0a5b46375fba",
          "citation": {
            "source": {
              "url": "https://2e.aonprd.com/Actions.aspx?ID=2392",
              "book": "Player Core",
              "page": "239"
            }
          }
        }
      ]
    },
    {
      "table": "ability-block",
      "id": 19611,
      "name": "Cast a Spell",
      "source": 3,
      "states": [
        {
          "expected": {
            "id": 19611,
            "operations": [],
            "name": "Cast a Spell",
            "actions": null,
            "level": 1,
            "rarity": "COMMON",
            "prerequisites": [],
            "frequency": null,
            "cost": null,
            "trigger": null,
            "requirements": null,
            "access": null,
            "special": null,
            "type": "action",
            "traits": [],
            "content_source_id": 3,
            "version": "1.0",
            "uuid": "3222895456836016",
            "availability": null
          },
          "description": "Spells can vary in how many actions they take, as shown in the spell’s stat block. You cast cantrips, spells from spell slots, and focus spells using the same process, but must expend the spell when casting a spell from a spell slot and must spend 1 Focus Point to cast a focus spell. Some rules will refer to the Cast a Spell activity, such as “if the next action you use is to Cast a Spell.” Any spell qualifies as a Cast a Spell activity, and any characteristics of the spell use those of the specific spell you’re casting.\n\n### **Costs and Loci**\n\nSome spells require you to pay a cost or provide a locus. If the spell lists a cost, you must have the listed money, valuable materials, or other resources to cast the spell (such as gems or magical reagents), and they're expended during the casting.\n\nA locus is an object that funnels or directs the magical energy of the spell but is not consumed in its casting. As part of Casting the Spell, you retrieve the locus (if necessary, and if you have a free hand), and you can put it away again if you so choose. Loci tend to be expensive, and you need to acquire them in advance to cast the spell, but they aren't expended like costs are. Unless noted otherwise, a locus has negligible Bulk.\n\n### **Long Casting Times**\n\nSome spells take minutes or hours to cast. You can’t use other actions or reactions while casting such a spell, though at the GM’s discretion, you might be able to speak a few sentences. As with other activities that take a long time, these spells have the exploration trait, and you can’t cast them in an encounter. If combat breaks out while you’re casting one, your spell is disrupted.\n\n### **Disrupted and Lost Spells**\n\nSome abilities and spells can disrupt a spell, causing it to have no effect and be lost. When you lose a spell, you’ve already expended the spell slot and spent the spell’s costs and actions. If a spell is disrupted during a [Sustain](link_action_19858) action, the spell immediately ends.",
          "description_md5": "47178cd6a4d7e5fdc38cb9a4d4ad1c7c",
          "citation": {}
        }
      ]
    },
    {
      "table": "trait",
      "id": 1432,
      "name": "Concentrate",
      "source": 3,
      "states": [
        {
          "expected": {
            "id": 1432,
            "name": "Concentrate",
            "content_source_id": 3,
            "uuid": "3011511166869167"
          },
          "description": "An action with this trait requires a degree of mental concentration and discipline to perform.",
          "description_md5": "301b839554eb068c69acddde67e1ba9b",
          "citation": {
            "source": {
              "url": "https://2e.aonprd.com/Traits.aspx?ID=561",
              "book": "Player Core",
              "page": "454"
            }
          }
        }
      ]
    },
    {
      "table": "trait",
      "id": 1504,
      "name": "Magical",
      "source": 3,
      "states": [
        {
          "expected": {
            "id": 1504,
            "name": "Magical",
            "content_source_id": 3,
            "uuid": "445811995976648"
          },
          "description": "Something with the magical trait is imbued with magical energies not tied to a specific tradition of magic. Some items or effects are closely tied to a particular tradition of magic. In these cases, the item has the [arcane](link_trait_1459), [divine](link_trait_1475), [occult](link_trait_1514), or [primal](link_trait_1454) trait instead of the magical trait. Any of these traits indicate that the item is magical.",
          "description_md5": "20460b9ed89c6df70f814821b22ed542",
          "citation": {
            "source": {
              "url": "https://2e.aonprd.com/Traits.aspx?ID=644",
              "book": "Player Core",
              "page": "458"
            }
          }
        }
      ]
    },
    {
      "table": "trait",
      "id": 1559,
      "name": "Extradimensional",
      "source": 3,
      "states": [
        {
          "expected": {
            "id": 1559,
            "name": "Extradimensional",
            "content_source_id": 3,
            "uuid": "8712339252565764"
          },
          "description": "This effect or item creates an extradimensional space. An extradimensional effect placed inside another extradimensional space ceases to function until it is removed.",
          "description_md5": "8816be8c307d7471e434b92a27964c71",
          "citation": {
            "source": {
              "url": "https://2e.aonprd.com/Traits.aspx?ID=596",
              "book": "Player Core",
              "page": "456"
            }
          }
        }
      ]
    },
    {
      "table": "trait",
      "id": 1433,
      "name": "Manipulate",
      "source": 3,
      "states": [
        {
          "expected": {
            "id": 1433,
            "name": "Manipulate",
            "content_source_id": 3,
            "uuid": "2971108648217689"
          },
          "description": "You must physically manipulate an item or make gestures to use an action with this trait. Creatures without a suitable appendage can’t perform actions with this trait. Manipulate actions often trigger reactions.",
          "description_md5": "cb98c18b53185299d4f6b3ba3e6755cb",
          "citation": {
            "source": {
              "url": "https://2e.aonprd.com/Traits.aspx?ID=645",
              "book": "Player Core",
              "page": "458"
            }
          }
        }
      ]
    },
    {
      "table": "trait",
      "id": 1831,
      "name": "Two-Hand d8",
      "source": 3,
      "states": [
        {
          "expected": {
            "id": 1831,
            "name": "Two-Hand d8",
            "content_source_id": 3,
            "uuid": "254886444091912"
          },
          "description": "This weapon can be wielded with two hands to change its weapon damage die to the indicated value. This change applies to all the weapon’s damage dice.",
          "description_md5": "ea1d0f8f1b4242051f82420083a8b550",
          "citation": {}
        }
      ]
    },
    {
      "table": "trait",
      "id": 1546,
      "name": "Staff",
      "source": 3,
      "states": [
        {
          "expected": {
            "id": 1546,
            "name": "Staff",
            "content_source_id": 3,
            "uuid": "1053442481403873"
          },
          "description": "This [magical](link_trait_1504) staff holds spells of a particular theme and allows a spellcaster to cast additional spells by preparing it. A staff gains charges when someone prepares it for the day, adding a number of charges to the staff equal to the highest rank of spell they're able to cast. Depending on whether they're a prepared or spontanous spellcaster, they gain an additional way to add charges to the staff. The person who prepared a staff can expend the charges to cast spells from it.\n\nYou can [Cast a Spell](link_action_19611) from a staff only if you have that spell on your spell list, are able to cast spells of the appropriate rank, and expend a number of charges from the staff equal to the spell’s rank ([cantrips](link_trait_1858) do not require charges to be expended). Use your spell attack roll and spell DC when [Casting a Spell](link_action_19611) from a staff. The spell gains the appropriate trait for your magical tradition ([arcane](link_trait_1459), [divine](link_trait_1475), [occult](link_trait_1514), or [primal](link_trait_1454)) and can be affected by any modifications you can normally make when casting spells, such as [spellshape](link_trait_1465) feats. You must provide any material components, cost, or focus required by the spell, or you fail to cast it.\n\n### Preparing a Staff\n\nDuring your daily preparations, you can prepare a staff to add charges to it for free. When you do so, that staff gains a number of charges equal to the rank of your highest spell slot. You don’t need to expend any spells to add charges in this way. No one can prepare more than one staff per day, nor can a staff be prepared by more than one person per day. If the charges aren’t used within 24 hours, they’re lost, and preparing the staff anew removes any charges previously stored in it. You can prepare a staff only if you have at least one of the staff’s spells on your spell list.\n\n#### Prepared Spellcasters\n\nA prepared spellcaster—such as a cleric, druid, witch, or wizard—can place some of their own magic in a staff to increase its number of charges. When a prepared spellcaster prepares a staff, they can expend a spell slot to add a number of charges equal to the rank of the spell. They can’t expend more than one spell in this way each day. For example, if a wizard can cast 3rd-rank spells and prepared a staff, the staff would gain 3 charges, but wizard could increase this to 6 by expending one of their 3rd-rank spells, 5 by expending a 2nd-rank spell, or 4 by expending a 1st-rank spell.\n\n#### Spontaneous Spellcasters\n\nA spontaneous spellcaster—such as a bard, oracle, or sorcerer—can reduce the number of charges it takes to Activate a staff by supplementing it with their own energy. When a spontaneous spellcaster Activates a staff, they can expend 1 charge from the staff and one of their spell slots to cast a spell from the staff of the same rank (or lower) as the expended spell slot. This doesn’t change the number of actions it takes to cast the spell. For example, if a sorcerer can cast 3rd-rank spells and prepared a staff, the staff would gain 3 charges. They could expend 1 charge and one of their 3rd-rank spell slots to cast a 3rd-rank spell from the staff, or 1 charge and one of their 2nd-rank spell slots to cast a 2nd-rank spell from the staff. They could still expend 3 charges from the staff to cast a 3rd-rank spell from it without using any of their own slots, just like any other spellcaster.\n\n### Attacking with a Staff\n\nStaves are also [staff](link_item_7853) weapons. They can be etched with fundamental runes but not property runes.",
          "description_md5": "08c57597051c2a1b9c12acba85de1dd2",
          "citation": {
            "source": {
              "url": "https://2e.aonprd.com/Traits.aspx?ID=700",
              "book": "GM Core",
              "page": "278"
            }
          }
        }
      ]
    },
    {
      "table": "spell",
      "id": 8803,
      "name": "Befitting Attire",
      "source": 842,
      "states": [
        {
          "expected": {
            "id": 8803,
            "name": "Befitting Attire",
            "rank": 2,
            "traditions": [
              "arcane",
              "occult"
            ],
            "rarity": "COMMON",
            "cast": "TWO-ACTIONS",
            "traits": [
              1432,
              1447,
              1433,
              1479
            ],
            "defense": "",
            "cost": "",
            "trigger": "",
            "requirements": "",
            "range": "30 feet",
            "area": "",
            "targets": "up to 5 willing creatures",
            "duration": "1 hour",
            "content_source_id": 842,
            "version": "1.0",
            "uuid": "7914034646794740",
            "heightened": {
              "text": [
                {
                  "amount": "(4th)",
                  "text": "You can target up to 20 creatures."
                },
                {
                  "amount": "(5th)",
                  "text": "You can target up to 100 creatures."
                }
              ],
              "data": {}
            },
            "availability": null
          },
          "description": "You cloak the targets in an illusion, shaping their clothing and worn items into ones suitable for a particular occasion. You visualize the occasion, and the spell creates illusory attire customized to each target. For instance, if you visualized a noble ball, armor would appear to be [fine clothing](link_item_6816). This doesn't change identifying details of the targets' appearances other than their clothes.\n\nAny creature that touches the attire, uses the [Seek](link_action_19845) action to examine it, or otherwise interacts with it can attempt to disbelieve your illusion.",
          "description_md5": "c50f0dfc2426a115f41cb45e115002c6",
          "citation": {
            "source": {
              "url": "https://2e.aonprd.com/Spells.aspx?ID=2634",
              "book": "Impossible Magic",
              "page": "123"
            }
          }
        }
      ]
    },
    {
      "table": "spell",
      "id": 4905,
      "name": "Translate",
      "source": 3,
      "states": [
        {
          "expected": {
            "id": 4905,
            "name": "Translate",
            "rank": 2,
            "traditions": [
              "arcane",
              "divine",
              "occult"
            ],
            "rarity": "COMMON",
            "cast": "TWO-ACTIONS",
            "traits": [
              1432,
              1433
            ],
            "defense": null,
            "cost": "",
            "trigger": null,
            "requirements": null,
            "range": "30 feet",
            "area": null,
            "targets": "1 creature",
            "duration": "1 hour",
            "content_source_id": 3,
            "version": "1.0",
            "uuid": "8419961421110303",
            "heightened": {
              "text": [
                {
                  "amount": "(3rd)",
                  "text": "The target can also speak the language."
                },
                {
                  "amount": "(4th)",
                  "text": "You can target up to 10 creatures, and targets can also speak the language."
                }
              ],
              "data": {
                "levels": {
                  "4": {
                    "target": {
                      "value": "10 creatures"
                    }
                  }
                },
                "type": "fixed"
              }
            },
            "availability": null
          },
          "description": "The target can understand the meaning of a single language it is hearing or reading when you Cast the Spell. This doesn't let it understand codes, language couched in metaphor, and the like (subject to GM discretion). If the target can hear multiple languages and knows that, it can choose which language to understand; otherwise, choose one of the languages randomly.",
          "description_md5": "ffc2ec098a0601e66d6174d77bc5f712",
          "citation": {
            "source": {
              "url": "https://2e.aonprd.com/Spells.aspx?ID=1723",
              "book": "Player Core",
              "page": "363"
            }
          }
        }
      ]
    },
    {
      "table": "spell",
      "id": 8817,
      "name": "Bottomless Stomach",
      "source": 842,
      "states": [
        {
          "expected": {
            "id": 8817,
            "name": "Bottomless Stomach",
            "rank": 3,
            "traditions": [
              "arcane",
              "occult",
              "primal"
            ],
            "rarity": "COMMON",
            "cast": "THREE-ACTIONS",
            "traits": [
              1432,
              1559,
              1433
            ],
            "defense": "",
            "cost": "",
            "trigger": "",
            "requirements": "",
            "range": "touch",
            "area": "",
            "targets": "1 willing creature",
            "duration": "1 hour",
            "content_source_id": 842,
            "version": "1.0",
            "uuid": "2649634066247113",
            "heightened": {
              "text": [
                {
                  "amount": "(5th)",
                  "text": "The duration increases to 8 hours."
                }
              ],
              "data": {}
            },
            "availability": null
          },
          "description": "You create a shimmering [extradimensional](link_trait_1559) space accessible from the target's mouth. The space can hold objects and equipment, up to a total of 10 Bulk. This extradimensional storage doesn't hamper the target's ability to eat, drink, speak (if applicable), or otherwise act, as it only opens and closes when the target chooses.\n\nThe target can Interact to swallow an object of up to 1 Bulk, which doesn't harm the object or the target. If the [extradimensional](link_trait_1559) space is full, the target can't add any more objects until first removing one or more stored objects. Organic matter and living creatures can't be stored in this space. The [extradimensional](link_trait_1559) storage is obvious to any creature who looks into the target's mouth, as the entryway shimmers slightly, though this doesn't clearly reveal the contents inside.\n\nThe target can [Interact](link_action_19733) to spit out a single object of their choice, causing the object to fall to the ground in the target's space. The target can [Interact](link_action_19733) three times in a row to spit out the entire contents of the [extradimensional](link_trait_1559) storage; the target doesn't have to take these actions all in the same turn, but if they take any other actions in between, the target has to start over. The items eject into the target's space, possibly spilling out into adjacent spaces if there's too much to fit.\n\nWhen the spell ends or the target falls unconscious, the contents of the [extradimensional](link_trait_1559) storage are disgorged in a riotous spew, landing in the nearest unoccupied space, a bit wet but otherwise unharmed.",
          "description_md5": "ba50275332955099e9f41332cd6ceb4b",
          "citation": {
            "source": {
              "url": "https://2e.aonprd.com/Spells.aspx?ID=2648",
              "book": "Impossible Magic",
              "page": "126"
            }
          }
        }
      ]
    },
    {
      "table": "spell",
      "id": 4516,
      "name": "Charm",
      "source": 3,
      "states": [
        {
          "expected": {
            "id": 4516,
            "name": "Charm",
            "rank": 1,
            "traditions": [
              "arcane",
              "occult",
              "primal"
            ],
            "rarity": "COMMON",
            "cast": "TWO-ACTIONS",
            "traits": [
              1432,
              1486,
              1481,
              1433,
              1448,
              1899
            ],
            "defense": "Will",
            "cost": "",
            "trigger": null,
            "requirements": null,
            "range": "30 feet",
            "area": null,
            "targets": "1 creature",
            "duration": "1 hour",
            "content_source_id": 3,
            "version": "1.0",
            "uuid": "1549344864617024",
            "heightened": {
              "text": [
                {
                  "amount": "(4th)",
                  "text": "The duration lasts until the next time you make your daily preparations."
                },
                {
                  "amount": "(8th)",
                  "text": "The duration lasts until the next time you make your daily preparations, and you can target up to 10 creatures."
                }
              ],
              "data": {
                "levels": {
                  "8": {
                    "target": {
                      "value": "10 creatures"
                    }
                  }
                },
                "type": "fixed"
              }
            },
            "availability": null
          },
          "description": "To the target, your words are honey and your visage seems bathed in a dreamy haze. It must attempt a Will save, with a +4 circumstance bonus if you or your allies recently threatened it or used hostile actions against it.\n\nYou can [Dismiss](link_action_19627) the spell. If you use hostile actions against the target, the spell ends. When the spell ends, the target doesn't necessarily realize it was charmed unless its friendship with you or the actions you convinced it to take clash with its expectations, meaning you could potentially convince the target to continue being your friend via mundane means.\n\n**Critical Success** The target is unaffected and aware you tried to charm it.\n\n**Success** The target is unaffected but thinks your spell was something harmless instead of _charm_, unless it identifies the spell.\n\n**Failure** The target's attitude becomes friendly toward you. If it was friendly, it becomes helpful. It can't use hostile actions against you.\n\n**Critical Failure** The target's attitude becomes helpful toward you, and it can't use hostile actions against you.",
          "description_md5": "7735a95fb952ad4ca001bd804c6c8c55",
          "citation": {
            "source": {
              "url": "https://2e.aonprd.com/Spells.aspx?ID=1463",
              "book": "Player Core",
              "page": "320"
            }
          }
        }
      ]
    },
    {
      "table": "spell",
      "id": 5367,
      "name": "Glimmer of Charm",
      "source": 13,
      "states": [
        {
          "expected": {
            "id": 5367,
            "name": "Glimmer of Charm",
            "rank": 5,
            "traditions": [
              "arcane",
              "occult",
              "primal"
            ],
            "rarity": "COMMON",
            "cast": "TWO-ACTIONS",
            "traits": [
              1492,
              1432,
              1486,
              1481,
              1433,
              1448
            ],
            "defense": null,
            "cost": "",
            "trigger": null,
            "requirements": null,
            "range": "",
            "area": "20-foot emanation",
            "targets": "",
            "duration": "1 minute",
            "content_source_id": 13,
            "version": "1.0",
            "uuid": "1581120155200585",
            "heightened": {},
            "availability": null
          },
          "description": "You're bathed in a smooth, almost glittering aura that improves the attitude of those near you. Any creature that ends its turn in the aura must attempt a Will saving throw with the following effects. No matter the result, it's then temporarily immune for 24 hours. The effect lasts until the spell ends, even after the creature leaves the aura.\n\n**Critical Success** The creature is unaffected and is aware of the aura.\n\n**Success** The creature's attitude toward you improves by one step. If that improves its attitude to at least \\[\\[Indifferent\\]\\], it can't take hostile actions against you, though the effect ends as soon as you take a hostile action against the creature or its allies.\n\n**Failure** The creature's attitude toward you improves by two steps. It can't take hostile actions against you, though the effect ends as soon as you take a hostile action against the creature or its allies.\n\n**Critical Failure** The creature's attitude becomes \\[\\[Helpful\\]\\] to you, though the effect ends as soon as you take a hostile action against the creature or its allies. While the creature is helpful, it can't take hostile actions against you.",
          "description_md5": "0d635957d52f6c8cf7c28be06685c1c4",
          "citation": {
            "source": {
              "url": "https://2e.aonprd.com/Spells.aspx?ID=919",
              "book": "Secrets of Magic",
              "page": "108"
            }
          }
        },
        {
          "expected": {
            "id": 5367,
            "name": "Glimmer of Charm",
            "rank": 5,
            "traditions": [
              "arcane",
              "occult",
              "primal"
            ],
            "rarity": "COMMON",
            "cast": "TWO-ACTIONS",
            "traits": [
              1492,
              1432,
              1486,
              1481,
              1433,
              1448
            ],
            "defense": "Will",
            "cost": "",
            "trigger": null,
            "requirements": null,
            "range": "",
            "area": "20-foot emanation",
            "targets": "",
            "duration": "sustained up to 1 minute",
            "content_source_id": 13,
            "version": "1.0",
            "uuid": "1581120155200585",
            "heightened": {},
            "availability": null
          },
          "description": "You're bathed in a smooth, almost glittering aura that improves the attitude of those near you. Any creature that ends its turn in the aura must attempt a Will saving throw with the following effects. No matter the result, it's then temporarily immune for 24 hours. The effect lasts until the spell ends, even after the creature leaves the aura.\n\n**Critical Success** The creature is unaffected and is aware of the aura.\n\n**Success** The creature's attitude toward you improves by one step. If that improves its attitude to at least indifferent, it can't take hostile actions against you, though the effect ends as soon as you take a hostile action against the creature or its allies.\n\n**Failure** The creature's attitude toward you improves by two steps. It can't take hostile actions against you, though the effect ends as soon as you take a hostile action against the creature or its allies.\n\n**Critical Failure** The creature's attitude becomes helpful to you, though the effect ends as soon as you take a hostile action against the creature or its allies. While the creature is helpful, it can't take hostile actions against you.",
          "description_md5": "bd52b95c11102e0edd400f1fc5ccc0fa",
          "citation": {
            "source": {
              "url": "https://2e.aonprd.com/Spells.aspx?ID=919",
              "book": "Secrets of Magic",
              "page": "108"
            }
          }
        }
      ]
    },
    {
      "table": "spell",
      "id": 5449,
      "name": "Shift Blame",
      "source": 13,
      "states": [
        {
          "expected": {
            "id": 5449,
            "name": "Shift Blame",
            "rank": 3,
            "traditions": [
              "arcane",
              "occult"
            ],
            "rarity": "COMMON",
            "cast": "REACTION",
            "traits": [
              1432,
              1448
            ],
            "defense": null,
            "cost": "",
            "trigger": "You or another creature attacks a creature or fails at a Deception, Diplomacy, or Intimidation check.",
            "requirements": null,
            "range": "30 feet",
            "area": null,
            "targets": "the target of the triggering attack or skill check",
            "duration": "",
            "content_source_id": 13,
            "version": "1.0",
            "uuid": "1343332467418914",
            "heightened": {
              "text": [],
              "data": {}
            },
            "availability": "LIMITED"
          },
          "description": "You alter the target's memories of the triggering event as they form. You choose another creature (which can be you) with the capacity to make the triggering attack or skill check, and you alter the target's memories to recall the creature you chose as responsible for the triggering attack or skill check. The target must attempt a Will save and is then temporarily immune for 24 hours.\n\n**Critical Success** The target knows you attempted to alter its memories.\n\n**Success** The target doesn't realize you attempted to alter its memories, though it knows you cast a spell.\n\n**Failure** You successfully alter the target's memory. It isn't forced to react to the new memories in a particular way, and it's likely to question them if they contradict other information it knows or are implausible for the situation.",
          "description_md5": "55804230986060c3475fc11ca55f0d48",
          "citation": {
            "source": {
              "url": "https://2e.aonprd.com/Spells.aspx?ID=997",
              "book": "Secrets of Magic",
              "page": "129"
            }
          }
        },
        {
          "expected": {
            "id": 5449,
            "name": "Shift Blame",
            "rank": 3,
            "traditions": [
              "arcane",
              "occult"
            ],
            "rarity": "COMMON",
            "cast": "REACTION",
            "traits": [
              1432,
              1448
            ],
            "defense": "Will",
            "cost": "",
            "trigger": "You or another creature attacks a creature or fails at a Deception, Diplomacy, or Intimidation check.",
            "requirements": null,
            "range": "30 feet",
            "area": null,
            "targets": "the target of the triggering attack or skill check",
            "duration": "",
            "content_source_id": 13,
            "version": "1.0",
            "uuid": "1343332467418914",
            "heightened": {
              "text": [],
              "data": {}
            },
            "availability": "LIMITED"
          },
          "description": "You alter the target's memories of the triggering event as they form. You choose another creature (which can be you) with the capacity to make the triggering attack or skill check, and you alter the target's memories to recall the creature you chose as responsible for the triggering attack or skill check. The target must attempt a Will save and is then temporarily immune for 24 hours.\n\n**Critical Success** The target knows you attempted to alter its memories.\n\n**Success** The target doesn't realize you attempted to alter its memories, though it knows you cast a spell.\n\n**Failure** You successfully alter the target's memory. It isn't forced to react to the new memories in a particular way, and it's likely to question them if they contradict other information it knows or are implausible for the situation.",
          "description_md5": "55804230986060c3475fc11ca55f0d48",
          "citation": {
            "source": {
              "url": "https://2e.aonprd.com/Spells.aspx?ID=997",
              "book": "Secrets of Magic",
              "page": "129"
            }
          }
        }
      ]
    },
    {
      "table": "spell",
      "id": 8800,
      "name": "Approximate",
      "source": 842,
      "states": [
        {
          "expected": {
            "id": 8800,
            "name": "Approximate",
            "rank": 0,
            "traditions": [
              "arcane",
              "divine",
              "occult",
              "primal"
            ],
            "rarity": "COMMON",
            "cast": "TWO-ACTIONS",
            "traits": [
              1858,
              1432,
              1508,
              1433
            ],
            "defense": "",
            "cost": "",
            "trigger": "",
            "requirements": "",
            "range": "10 feet",
            "area": "1 cubic foot",
            "targets": "",
            "duration": "",
            "content_source_id": 842,
            "version": "1.0",
            "uuid": "3435113785633955",
            "heightened": {
              "text": [],
              "data": {}
            },
            "availability": null
          },
          "description": "Your magic quickly flows over an area to help you count and catalog. Name a particular type of object you're looking for within the area. You gain an instant estimate of the quantity of the chosen objects that are clearly visible within the target area. The number is rounded to the largest digit. For example, you could look at a pile of 180 copper coins, and you would learn that it held about 200 coins, but you couldn't determine there were exactly 180 coins.\n\nThe type of object you name can be as specific or general as you like–\"dented copper coins\" is as viable as \"coins\"–but the distinguishing features must be obvious at a glance, and the spell is fooled by objects disguised as other objects.",
          "description_md5": "48b83887db7bec30de949f19cd3aee79",
          "citation": {
            "source": {
              "url": "https://2e.aonprd.com/Spells.aspx?ID=2631",
              "book": "Impossible Magic",
              "page": "123"
            }
          }
        }
      ]
    },
    {
      "table": "spell",
      "id": 4794,
      "name": "Read Aura",
      "source": 3,
      "states": [
        {
          "expected": {
            "id": 4794,
            "name": "Read Aura",
            "rank": 0,
            "traditions": [
              "arcane",
              "divine",
              "occult",
              "primal"
            ],
            "rarity": "COMMON",
            "cast": "1 minute",
            "traits": [
              1858,
              1432,
              1508,
              1433
            ],
            "defense": null,
            "cost": "",
            "trigger": null,
            "requirements": null,
            "range": "30 feet",
            "area": null,
            "targets": "1 object",
            "duration": "",
            "content_source_id": 3,
            "version": "1.0",
            "uuid": "6759173537294350",
            "heightened": {
              "text": [
                {
                  "amount": "(3rd)",
                  "text": "You can target up to 10 objects."
                },
                {
                  "amount": "(6th)",
                  "text": "You can target any number of objects."
                }
              ],
              "data": {
                "levels": {
                  "3": {
                    "target": {
                      "value": "10 objects"
                    }
                  },
                  "6": {
                    "target": {
                      "value": "any number of objects"
                    }
                  }
                },
                "type": "fixed"
              }
            },
            "availability": null
          },
          "description": "You focus on the target object, opening your mind to perceive magical auras. When the casting is complete, you know whether that item is [magical](link_trait_1504). You or anyone you advise about the aura gains a +2 circumstance bonus to [Identify Magic](link_action_19730) on the item. If the object is illusory, you detect this only if the effect's rank is lower than the rank of your _read aura_ spell.",
          "description_md5": "fd6fcce302e12b6a5cb5bd6137c74caa",
          "citation": {
            "source": {
              "url": "https://2e.aonprd.com/Spells.aspx?ID=1646",
              "book": "Player Core",
              "page": "352"
            }
          }
        }
      ]
    },
    {
      "table": "spell",
      "id": 9000,
      "name": "Phantom Crowd",
      "source": 842,
      "states": [
        {
          "expected": {
            "id": 9000,
            "name": "Phantom Crowd",
            "rank": 2,
            "traditions": [
              "arcane",
              "occult"
            ],
            "rarity": "COMMON",
            "cast": "TWO-ACTIONS",
            "traits": [
              1432,
              1447,
              1433,
              1479
            ],
            "defense": "",
            "cost": "",
            "trigger": "",
            "requirements": "",
            "range": "60 feet",
            "area": "10-foot-by-10-foot square",
            "targets": "",
            "duration": "sustained up to 10 minutes",
            "content_source_id": 842,
            "version": "1.0",
            "uuid": "4197355284093809",
            "heightened": {
              "text": [
                {
                  "amount": "(+1)",
                  "text": "The crowd occupies an additional 10-foot-by-10- foot square in range. The additional square doesn’t need to be adjacent to any other square. It can overlap, but there’s no additional effect in the overlapped squares."
                }
              ],
              "data": {}
            },
            "availability": null
          },
          "description": "A tightly packed crowd of humanoids appropriate to the area appear, facing you and agreeing loudly with anything you say. A creature that touches a member of the crowd or attempts a [Seek](link_action_19845) action to examine the crowd can attempt to disbelieve your illusion. The crowd is difficult terrain for anyone who hasn’t disbelieved the illusion.\n\nWhen you spend 1 or more actions to cast a [composition](link_trait_1895) spell or to perform an activity that includes a Performance check, you can also [Sustain](link_action_19858) this Spell as part of that action.",
          "description_md5": "48b3f99f7acc66b67e540f56f03033d6",
          "citation": {}
        },
        {
          "expected": {
            "id": 9000,
            "name": "Phantom Crowd",
            "rank": 2,
            "traditions": [
              "arcane",
              "occult"
            ],
            "rarity": "COMMON",
            "cast": "TWO-ACTIONS",
            "traits": [
              1432,
              1447,
              1433,
              1479
            ],
            "defense": "",
            "cost": "",
            "trigger": "",
            "requirements": "",
            "range": "60 feet",
            "area": "10-foot-by-10-foot square",
            "targets": "",
            "duration": "sustained up to 10 minutes",
            "content_source_id": 842,
            "version": "1.0",
            "uuid": "4197355284093809",
            "heightened": {
              "text": [
                {
                  "amount": "(+1)",
                  "text": "The crowd occupies an additional 10-foot-by-10- foot square in range. The additional square doesn’t need to be adjacent to any other square. It can overlap, but there’s no additional effect in the overlapped squares."
                }
              ],
              "data": {}
            },
            "availability": null
          },
          "description": "A tightly packed crowd of humanoids appropriate to the area appear, facing you and agreeing loudly with anything you say. A creature that touches a member of the crowd or attempts a [Seek](link_action_19845) action to examine the crowd can attempt to disbelieve your illusion. The crowd is difficult terrain for anyone who hasn’t disbelieved the illusion.\n\nWhen you spend 1 or more actions to cast a [composition](link_trait_1895) spell or to perform an activity that includes a Performance check, you can also [Sustain](link_action_19858) this Spell as part of that action.",
          "description_md5": "48b3f99f7acc66b67e540f56f03033d6",
          "citation": {
            "source": {
              "url": "https://2e.aonprd.com/Spells.aspx?ID=2787",
              "book": "Impossible Magic",
              "page": "157"
            }
          }
        }
      ]
    },
    {
      "table": "spell",
      "id": 9010,
      "name": "Quick Sort",
      "source": 842,
      "states": [
        {
          "expected": {
            "id": 9010,
            "name": "Quick Sort",
            "rank": 1,
            "traditions": [
              "arcane",
              "divine",
              "occult",
              "primal"
            ],
            "rarity": "COMMON",
            "cast": "THREE-ACTIONS",
            "traits": [
              1432,
              1433
            ],
            "defense": "",
            "cost": "",
            "trigger": "",
            "requirements": "",
            "range": "10 feet",
            "area": "",
            "targets": "up to 200 unattended objects in range, each of light Bulk or less",
            "duration": "up to 1 minute",
            "content_source_id": 842,
            "version": "1.0",
            "uuid": "6236332801290631",
            "heightened": {
              "text": [
                {
                  "amount": "(3rd)",
                  "text": "The spell can sort up to 500 objects in a minute, or 75 objects in a round."
                }
              ],
              "data": {}
            },
            "availability": null
          },
          "description": "You magically sort a group of objects into neat stacks or piles. You can sort the objects in two different ways. The first option is to separate them into different piles depending on an easily observed factor, such as color or shape. Alternatively, you can sort the objects into ordered stacks depending on a clearly indicated notation, such as a page number, title, or date. The objects sort themselves throughout the duration, though it takes less time per object to sort a smaller number of objects, down to a single round for 30 or fewer objects.",
          "description_md5": "b397b056be2bbfc82cca30cf8e2d3e05",
          "citation": {}
        },
        {
          "expected": {
            "id": 9010,
            "name": "Quick Sort",
            "rank": 1,
            "traditions": [
              "arcane",
              "divine",
              "occult",
              "primal"
            ],
            "rarity": "COMMON",
            "cast": "THREE-ACTIONS",
            "traits": [
              1432,
              1433
            ],
            "defense": "",
            "cost": "",
            "trigger": "",
            "requirements": "",
            "range": "10 feet",
            "area": "",
            "targets": "up to 200 unattended objects in range, each of light Bulk or less",
            "duration": "up to 1 minute",
            "content_source_id": 842,
            "version": "1.0",
            "uuid": "6236332801290631",
            "heightened": {
              "text": [
                {
                  "amount": "(3rd)",
                  "text": "The spell can sort up to 500 objects in a minute, or 75 objects in a round."
                }
              ],
              "data": {}
            },
            "availability": null
          },
          "description": "You magically sort a group of objects into neat stacks or piles. You can sort the objects in two different ways. The first option is to separate them into different piles depending on an easily observed factor, such as color or shape. Alternatively, you can sort the objects into ordered stacks depending on a clearly indicated notation, such as a page number, title, or date. The objects sort themselves throughout the duration, though it takes less time per object to sort a smaller number of objects, down to a single round for 30 or fewer objects.",
          "description_md5": "b397b056be2bbfc82cca30cf8e2d3e05",
          "citation": {
            "source": {
              "url": "https://2e.aonprd.com/Spells.aspx?ID=2797",
              "book": "Impossible Magic",
              "page": "158"
            }
          }
        }
      ]
    },
    {
      "table": "spell",
      "id": 9015,
      "name": "Restyle",
      "source": 842,
      "states": [
        {
          "expected": {
            "id": 9015,
            "name": "Restyle",
            "rank": 1,
            "traditions": [
              "arcane",
              "divine",
              "occult",
              "primal"
            ],
            "rarity": "COMMON",
            "cast": "1 minute",
            "traits": [
              1432,
              1433
            ],
            "defense": "",
            "cost": "",
            "trigger": "",
            "requirements": "",
            "range": "touch",
            "area": "",
            "targets": "1 piece of clothing currently worn by you or an ally",
            "duration": "unlimited",
            "content_source_id": 842,
            "version": "1.0",
            "uuid": "2689375792704345",
            "heightened": {
              "text": [],
              "data": {}
            },
            "availability": null
          },
          "description": "You permanently change the appearance of one piece of clothing currently worn by you or an ally to better fit your aesthetic sensibilities. You can change its color, texture, pattern, and other minor parts of its design, but the changes can’t alter the clothing’s overall shape, size, or purpose. The changes can’t increase the quality of the craftsmanship or artistry of the piece of clothing, but particularly gauche choices for the new color and pattern might decrease its aesthetic appeal. This spell transforms existing materials into the desired appearance and never alters the material or creates more material than what’s originally part of the object. The object’s statistics also remain unchanged.",
          "description_md5": "d8d73bb17692949a637168746b98760a",
          "citation": {}
        },
        {
          "expected": {
            "id": 9015,
            "name": "Restyle",
            "rank": 1,
            "traditions": [
              "arcane",
              "divine",
              "occult",
              "primal"
            ],
            "rarity": "COMMON",
            "cast": "1 minute",
            "traits": [
              1432,
              1433
            ],
            "defense": "",
            "cost": "",
            "trigger": "",
            "requirements": "",
            "range": "touch",
            "area": "",
            "targets": "1 piece of clothing currently worn by you or an ally",
            "duration": "unlimited",
            "content_source_id": 842,
            "version": "1.0",
            "uuid": "2689375792704345",
            "heightened": {
              "text": [],
              "data": {}
            },
            "availability": null
          },
          "description": "You permanently change the appearance of one piece of clothing currently worn by you or an ally to better fit your aesthetic sensibilities. You can change its color, texture, pattern, and other minor parts of its design, but the changes can’t alter the clothing’s overall shape, size, or purpose. The changes can’t increase the quality of the craftsmanship or artistry of the piece of clothing, but particularly gauche choices for the new color and pattern might decrease its aesthetic appeal. This spell transforms existing materials into the desired appearance and never alters the material or creates more material than what’s originally part of the object. The object’s statistics also remain unchanged.",
          "description_md5": "d8d73bb17692949a637168746b98760a",
          "citation": {
            "source": {
              "url": "https://2e.aonprd.com/Spells.aspx?ID=2803",
              "book": "Impossible Magic",
              "page": "160"
            }
          }
        }
      ]
    },
    {
      "table": "spell",
      "id": 9011,
      "name": "Read the Air",
      "source": 842,
      "states": [
        {
          "expected": {
            "id": 9011,
            "name": "Read the Air",
            "rank": 0,
            "traditions": [
              "divine",
              "occult"
            ],
            "rarity": "COMMON",
            "cast": "TWO-ACTIONS",
            "traits": [
              1858,
              1432,
              1433,
              1899
            ],
            "defense": "",
            "cost": "",
            "trigger": "",
            "requirements": "",
            "range": "",
            "area": "",
            "targets": "",
            "duration": "1 minute",
            "content_source_id": 842,
            "version": "1.0",
            "uuid": "2151504166891879",
            "heightened": {
              "text": [],
              "data": {}
            },
            "availability": null
          },
          "description": "You survey a social situation, showing courtesy to all around you as your intuition swiftly picks up clues about social contexts and unspoken assumptions of behavior. Your body language subconsciously changes to take advantage of this information and use it in your own interactions with those creatures.\n\nAs part of [Casting this Spell](link_action_19611), you [Recall Knowledge](link_action_19753) using Society to gain information about the social situation. You also gain a +1 status bonus to your next Diplomacy check to [Make an Impression](link_action_19739) on those creatures present when you [Cast this Spell](link_action_19611), as long as the check occurs during the duration of the spell. You can _read the air_ only once in a given social situation; casting it again has no effect.",
          "description_md5": "2eb94afbae35fdb220616c94a9c5838e",
          "citation": {}
        },
        {
          "expected": {
            "id": 9011,
            "name": "Read the Air",
            "rank": 0,
            "traditions": [
              "divine",
              "occult"
            ],
            "rarity": "COMMON",
            "cast": "TWO-ACTIONS",
            "traits": [
              1858,
              1432,
              1433,
              1899
            ],
            "defense": "",
            "cost": "",
            "trigger": "",
            "requirements": "",
            "range": "",
            "area": "",
            "targets": "",
            "duration": "1 minute",
            "content_source_id": 842,
            "version": "1.0",
            "uuid": "2151504166891879",
            "heightened": {
              "text": [],
              "data": {}
            },
            "availability": null
          },
          "description": "You survey a social situation, showing courtesy to all around you as your intuition swiftly picks up clues about social contexts and unspoken assumptions of behavior. Your body language subconsciously changes to take advantage of this information and use it in your own interactions with those creatures.\n\nAs part of [Casting this Spell](link_action_19611), you [Recall Knowledge](link_action_19753) using Society to gain information about the social situation. You also gain a +1 status bonus to your next Diplomacy check to [Make an Impression](link_action_19739) on those creatures present when you [Cast this Spell](link_action_19611), as long as the check occurs during the duration of the spell. You can _read the air_ only once in a given social situation; casting it again has no effect.",
          "description_md5": "2eb94afbae35fdb220616c94a9c5838e",
          "citation": {
            "source": {
              "url": "https://2e.aonprd.com/Spells.aspx?ID=2798",
              "book": "Impossible Magic",
              "page": "159"
            }
          }
        }
      ]
    },
    {
      "table": "spell",
      "id": 9053,
      "name": "Timely Tutor",
      "source": 842,
      "states": [
        {
          "expected": {
            "id": 9053,
            "name": "Timely Tutor",
            "rank": 2,
            "traditions": [
              "arcane",
              "occult"
            ],
            "rarity": "COMMON",
            "cast": "ONE-ACTION",
            "traits": [
              1433,
              1448
            ],
            "defense": "",
            "cost": "",
            "trigger": "",
            "requirements": "",
            "range": "touch",
            "area": "",
            "targets": "your eidolon or familiar",
            "duration": "sustained up to 1 minute",
            "content_source_id": 842,
            "version": "1.0",
            "uuid": "3548619550253440",
            "heightened": {
              "text": [],
              "data": {}
            },
            "availability": null
          },
          "description": "You serve as an astral connection between your eidolon or familiar and the Akashic Record—a demiplane consisting of a comprehensive psychic library. If you [Cast this Spell](link_action_19611) on your [familiar](link_trait_3843), your [familiar](link_trait_3843) adds your spellcasting attribute modifier on checks to [Recall Knowledge](link_action_19753) with the Lore skill of your choice, much like they do for Acrobatics and Stealth. Your familiar must have the [speech](link_feat_40567) familiar ability in order to share any information they learn with you. If you [Cast this Spell](link_action_19611) on your [eidolon](link_trait_2937), they instead become trained in the Lore skill of your choice.\n\nIf you lose physical contact with the target, their connection to the Akashic Record is severed, and the spell immediately ends.",
          "description_md5": "38009e533698822aa4cdaad7757dbb9b",
          "citation": {}
        },
        {
          "expected": {
            "id": 9053,
            "name": "Timely Tutor",
            "rank": 2,
            "traditions": [
              "arcane",
              "occult"
            ],
            "rarity": "COMMON",
            "cast": "ONE-ACTION",
            "traits": [
              1433,
              1448
            ],
            "defense": "",
            "cost": "",
            "trigger": "",
            "requirements": "",
            "range": "touch",
            "area": "",
            "targets": "your eidolon or familiar",
            "duration": "sustained up to 1 minute",
            "content_source_id": 842,
            "version": "1.0",
            "uuid": "3548619550253440",
            "heightened": {
              "text": [],
              "data": {}
            },
            "availability": null
          },
          "description": "You serve as an astral connection between your eidolon or familiar and the Akashic Record—a demiplane consisting of a comprehensive psychic library. If you [Cast this Spell](link_action_19611) on your [familiar](link_trait_3843), your [familiar](link_trait_3843) adds your spellcasting attribute modifier on checks to [Recall Knowledge](link_action_19753) with the Lore skill of your choice, much like they do for Acrobatics and Stealth. Your familiar must have the [speech](link_feat_40567) familiar ability in order to share any information they learn with you. If you [Cast this Spell](link_action_19611) on your [eidolon](link_trait_2937), they instead become trained in the Lore skill of your choice.\n\nIf you lose physical contact with the target, their connection to the Akashic Record is severed, and the spell immediately ends.",
          "description_md5": "38009e533698822aa4cdaad7757dbb9b",
          "citation": {
            "source": {
              "url": "https://2e.aonprd.com/Spells.aspx?ID=2845",
              "book": "Impossible Magic",
              "page": "167"
            }
          }
        }
      ]
    },
    {
      "table": "spell",
      "id": 4865,
      "name": "Suggestion",
      "source": 3,
      "states": [
        {
          "expected": {
            "id": 4865,
            "name": "Suggestion",
            "rank": 4,
            "traditions": [
              "arcane",
              "occult"
            ],
            "rarity": "COMMON",
            "cast": "TWO-ACTIONS",
            "traits": [
              1432,
              1481,
              1458,
              1433,
              1448,
              1899
            ],
            "defense": null,
            "cost": "",
            "trigger": null,
            "requirements": null,
            "range": "30 feet",
            "area": null,
            "targets": "1 creature",
            "duration": "varies",
            "content_source_id": 3,
            "version": "1.0",
            "uuid": "8196158280494249",
            "heightened": {
              "text": [
                {
                  "amount": "(8th)",
                  "text": "You can target up to 10 creatures."
                }
              ],
              "data": {
                "levels": {
                  "8": {
                    "target": {
                      "value": "10 creatures"
                    }
                  }
                },
                "type": "fixed"
              }
            },
            "availability": null
          },
          "description": "Your honeyed words are difficult for creatures to resist. You suggest a course of action to the target, which must be phrased in such a way as to seem like a logical course of action to the target and can't be self-destructive or obviously against the target's self-interest. The target must attempt a Will save.\n\n**Critical Success** The target is unaffected and knows you tried to control it.\n\n**Success** The target is unaffected.\n\n**Failure** The target immediately follows your suggestion. The spell has a duration of 1 minute, or until the target has completed a finite suggestion or the suggestion becomes self-destructive or has other obvious negative effects.\n\n**Critical Failure** As failure, but the base duration is 1 hour.",
          "description_md5": "c991023fe274e5dce4a9e35cc1cc23eb",
          "citation": {
            "source": {
              "url": "https://2e.aonprd.com/Spells.aspx?ID=1693",
              "book": "Player Core",
              "page": "360"
            }
          }
        },
        {
          "expected": {
            "id": 4865,
            "name": "Suggestion",
            "rank": 4,
            "traditions": [
              "arcane",
              "occult"
            ],
            "rarity": "COMMON",
            "cast": "TWO-ACTIONS",
            "traits": [
              1432,
              1481,
              1458,
              1433,
              1448,
              1899
            ],
            "defense": "Will",
            "cost": "",
            "trigger": null,
            "requirements": null,
            "range": "30 feet",
            "area": null,
            "targets": "1 creature",
            "duration": "varies",
            "content_source_id": 3,
            "version": "1.0",
            "uuid": "8196158280494249",
            "heightened": {
              "text": [
                {
                  "amount": "(8th)",
                  "text": "You can target up to 10 creatures."
                }
              ],
              "data": {
                "levels": {
                  "8": {
                    "target": {
                      "value": "10 creatures"
                    }
                  }
                },
                "type": "fixed"
              }
            },
            "availability": null
          },
          "description": "Your honeyed words are difficult for creatures to resist. You suggest a course of action to the target, which must be phrased in such a way as to seem like a logical course of action to the target and can't be self-destructive or obviously against the target's self-interest. The target must attempt a Will save.\n\n**Critical Success** The target is unaffected and knows you tried to control it.\n\n**Success** The target is unaffected.\n\n**Failure** The target immediately follows your suggestion. The spell has a duration of 1 minute, or until the target has completed a finite suggestion or the suggestion becomes self-destructive or has other obvious negative effects.\n\n**Critical Failure** As failure, but the base duration is 1 hour.",
          "description_md5": "c991023fe274e5dce4a9e35cc1cc23eb",
          "citation": {
            "source": {
              "url": "https://2e.aonprd.com/Spells.aspx?ID=1693",
              "book": "Player Core",
              "page": "360"
            }
          }
        }
      ]
    },
    {
      "table": "spell",
      "id": 7610,
      "name": "Pocket Library",
      "source": 493,
      "states": [
        {
          "expected": {
            "id": 7610,
            "name": "Pocket Library",
            "rank": 1,
            "traditions": [
              "arcane",
              "occult"
            ],
            "rarity": "RARE",
            "cast": "THREE-ACTIONS",
            "traits": [
              1432,
              1559,
              1433
            ],
            "defense": "",
            "cost": "",
            "trigger": "",
            "requirements": "",
            "range": "",
            "area": "",
            "targets": "",
            "duration": "24 hours",
            "content_source_id": 493,
            "version": "1.0",
            "uuid": "2324466460646264",
            "heightened": {
              "text": [
                {
                  "amount": "(3rd)",
                  "text": "The status bonus increases to +2 and you can reference your _pocket library_ twice before the spell ends."
                },
                {
                  "amount": "(6th)",
                  "text": "The status bonus increases to +3 and you can reference your _pocket library_ three times before the spell ends."
                },
                {
                  "amount": "(9th)",
                  "text": "The status bonus increases to +4 and you can reference your _pocket library_ four times before the spell ends."
                }
              ],
              "data": {}
            },
            "availability": null
          },
          "description": "Like Vil Seral, you collect information from all around you and store it in book form in an extradimensional library. When you [Cast this Spell](link_action_19611), choose any skill in which you are at least trained that has the [Recall Knowledge](link_action_19753) action.\n\nDuring the duration of this spell, you can call forth a tome from the extradimensional library when attempting a [Recall Knowledge](link_action_19753) check using your chosen skill. This is part of the action to [Recall Knowledge](link_action_19753). You must have a hand free to do so. The tome appears in your hand, open to an appropriate page. This grants you a +1 status bonus to the [Recall Knowledge](link_action_19753) check. If you roll a critical failure on this check, you get a failure instead. If the roll is successful and the subject is a creature, you gain additional information or context about the creature. Once you reference a book from your pocket library, the spell ends.",
          "description_md5": "e9898f4934dfbc55d9ccf3c93ec02b4f",
          "citation": {
            "source": {
              "url": "https://2e.aonprd.com/Spells.aspx?ID=2291",
              "book": "Rival Academies",
              "page": "31"
            }
          }
        }
      ]
    },
    {
      "table": "spell",
      "id": 7366,
      "name": "Share Lore",
      "source": 420,
      "states": [
        {
          "expected": {
            "id": 7366,
            "name": "Share Lore",
            "rank": 1,
            "traditions": [
              "arcane",
              "occult"
            ],
            "rarity": "COMMON",
            "cast": "1 minute",
            "traits": [
              1432,
              1433,
              1448
            ],
            "defense": "",
            "cost": "",
            "trigger": "",
            "requirements": "",
            "range": "touch",
            "area": "",
            "targets": "up to 3 creatures",
            "duration": "10 minutes",
            "content_source_id": 420,
            "version": "1.0",
            "uuid": "6308645119400906",
            "heightened": {
              "text": [
                {
                  "amount": "(3rd)",
                  "text": "The duration of the spell is 1 hour, and you can target up to five creatures."
                },
                {
                  "amount": "(5th)",
                  "text": "The duration of the spell is 8 hours, you can target up to five creatures, and you can share up to two Lore skills in which you’re trained."
                }
              ],
              "data": {}
            },
            "availability": "STANDARD"
          },
          "description": "You share your knowledge with the touched creatures. Choose one Lore skill in which you’re trained. The targets become trained in that Lore skill for the duration of the spell.",
          "description_md5": "de6969b12880a400dd98a55b67763c5a",
          "citation": {
            "source": {
              "url": "https://2e.aonprd.com/Spells.aspx?ID=2363",
              "book": "Divine Mysteries",
              "page": "259"
            }
          }
        }
      ]
    }
  ],
  "sources": [
    {
      "id": 3,
      "name": "Common Core",
      "user_id": null,
      "is_published": true,
      "require_key": false,
      "group": "common-core",
      "required_content_sources": []
    },
    {
      "id": 13,
      "name": "Secrets of Magic (in progress)",
      "user_id": null,
      "is_published": true,
      "require_key": false,
      "group": "legacy",
      "required_content_sources": [
        11
      ]
    },
    {
      "id": 16,
      "name": "Treasure Vault",
      "user_id": null,
      "is_published": true,
      "require_key": false,
      "group": "pathfinder-core",
      "required_content_sources": [
        1
      ]
    },
    {
      "id": 420,
      "name": "Divine Mysteries",
      "user_id": null,
      "is_published": true,
      "require_key": false,
      "group": "lost-omens",
      "required_content_sources": [
        1
      ]
    },
    {
      "id": 493,
      "name": "Rival Academies",
      "user_id": null,
      "is_published": true,
      "require_key": false,
      "group": "lost-omens",
      "required_content_sources": [
        1,
        256,
        13,
        842
      ]
    },
    {
      "id": 842,
      "name": "Impossible Magic",
      "user_id": null,
      "is_published": true,
      "require_key": false,
      "group": "pathfinder-core",
      "required_content_sources": [
        1
      ]
    }
  ]
}$library$::jsonb;
  source_spec jsonb; source_row jsonb; dependency jsonb; dependency_row jsonb; current_citation jsonb;
  patch jsonb; replacement jsonb; item_row public.item%rowtype; actual_pair jsonb;
  next_text text; actual_count integer; changed_rows integer;
begin

  lock table public.content_update in share mode;
  -- Acquire reviewed content rows before source cache locks.
  perform a.id from public.ability_block a where a.id in (
    select (d->>'id')::bigint from jsonb_array_elements(spec->'dependencies') d
    where d->>'table' = 'ability-block'
  ) order by a.id for share;
  perform i.id from public.item i where i.id in (
    select (p->>'id')::bigint from jsonb_array_elements(spec->'items') p
  ) order by i.id for update;
  perform s.id from public.spell s where s.id in (
    select (d->>'id')::bigint from jsonb_array_elements(spec->'dependencies') d
    where d->>'table' = 'spell'
  ) order by s.id for share;
  perform t.id from public.trait t where t.id in (
    select (d->>'id')::bigint from jsonb_array_elements(spec->'dependencies') d
    where d->>'table' = 'trait'
  ) order by t.id for share;
  -- End reviewed content row prelocks.
  for source_spec in select value from jsonb_array_elements(spec->'sources') order by (value->>'id')::bigint loop
    select to_jsonb(s) into source_row from public.content_source s where s.id=(source_spec->>'id')::bigint for update;
    if not found or exists(select 1 from jsonb_each(source_spec) e where source_row->e.key is distinct from e.value) then
      raise exception 'Missing or changed official library source: %',source_spec->>'id';
    end if;
    if exists(select 1 from public.content_update u where coalesce(u.status->>'state','PENDING') not in ('APPROVED','REJECTED') and u.type='content-source'
      and (u.ref_id=(source_spec->>'id')::bigint or u.data->>'id'=source_spec->>'id'
        or (u.ref_id is null and u.data->>'name'=source_spec->>'name'))) then
      raise exception 'Library source has a pending curator submission: %',source_spec->>'id';
    end if;
  end loop;

  if jsonb_array_length(spec->'items')<>3 or jsonb_array_length(spec->'dependencies')<>24 then
    raise exception 'Invalid reviewed library staff scope';
  end if;
  for dependency in select value from jsonb_array_elements(spec->'dependencies')
    order by value->>'table',(value->>'id')::bigint loop
    dependency_row:=null;
    case dependency->>'table'
      when 'spell' then select to_jsonb(s)||jsonb_build_object('uuid',s.uuid::text) into dependency_row
        from public.spell s where s.id=(dependency->>'id')::bigint for share;
      when 'ability-block' then select to_jsonb(a)||jsonb_build_object('uuid',a.uuid::text) into dependency_row
        from public.ability_block a where a.id=(dependency->>'id')::bigint for share;
      when 'trait' then select to_jsonb(t)||jsonb_build_object('uuid',t.uuid::text) into dependency_row
        from public.trait t where t.id=(dependency->>'id')::bigint for share;
      else raise exception 'Invalid library dependency table';
    end case;
    if dependency_row is null or jsonb_typeof(dependency_row->'meta_data') is distinct from 'object' then
      raise exception 'Missing or malformed library dependency: %',dependency->>'id';
    end if;
    current_citation:=case when (dependency_row->'meta_data')?'source'
      then jsonb_build_object('source',dependency_row#>'{meta_data,source}') else '{}'::jsonb end;
    if not exists(select 1 from jsonb_array_elements(dependency->'states') state
      where not exists(select 1 from jsonb_each(state->'expected') e where dependency_row->e.key is distinct from e.value)
        and dependency_row->>'description'=state->>'description'
        and md5(dependency_row->>'description')=state->>'description_md5'
        and current_citation=state->'citation') then
      raise exception 'Library dependency differs from reviewed complete before/after state: %',dependency->>'id';
    end if;
    if exists(select 1 from public.content_update u where coalesce(u.status->>'state','PENDING') not in ('APPROVED','REJECTED') and u.type=dependency->>'table'
      and (u.ref_id=(dependency->>'id')::bigint or (u.ref_id is null
        and (u.content_source_id=(dependency->>'source')::bigint or u.data->>'content_source_id'=dependency->>'source')
        and u.data->>'name'=dependency->>'name'))) then
      raise exception 'Library dependency has a pending curator submission: %',dependency->>'id';
    end if;
  end loop;
  for patch in select value from jsonb_array_elements(spec->'items') order by (value->>'id')::bigint loop
    select * into item_row from public.item where id=(patch->>'id')::bigint for update;
    if not found or exists(select 1 from jsonb_each(patch->'expected') e
      where (to_jsonb(item_row)||jsonb_build_object('uuid',item_row.uuid::text))->e.key is distinct from e.value)
      or jsonb_typeof(item_row.meta_data) is distinct from 'object'
      or exists(select 1 from jsonb_each(patch->'metadata') e where item_row.meta_data->e.key is distinct from e.value) then
      raise exception 'Library staff identity or mechanics differ from reviewed entry: %',patch->>'id';
    end if;
    if exists(select 1 from public.content_update u where coalesce(u.status->>'state','PENDING') not in ('APPROVED','REJECTED') and u.type='item'
      and (u.ref_id=item_row.id or (u.ref_id is null
        and (u.content_source_id=item_row.content_source_id or u.data->>'content_source_id'=item_row.content_source_id::text)
        and u.data->>'name'=item_row.name))) then
      raise exception 'Library staff has a pending curator submission: %',patch->>'id';
    end if;
    next_text:=patch#>>'{description,before}';
    if md5(next_text) is distinct from patch#>>'{description,before_md5}' then raise exception 'Invalid library before hash'; end if;
    for replacement in select value from jsonb_array_elements(patch#>'{description,replacements}') loop
      if coalesce(length(replacement->>'from'),0)=0 or (replacement->>'count')::integer<=0 then raise exception 'Invalid library replacement'; end if;
      actual_count:=(length(next_text)-length(replace(next_text,replacement->>'from','')))/length(replacement->>'from');
      if actual_count is distinct from (replacement->>'count')::integer then raise exception 'Library literal count drift'; end if;
      next_text:=replace(next_text,replacement->>'from',replacement->>'to');
    end loop;
    if next_text is distinct from patch#>>'{description,after}' or md5(next_text) is distinct from patch#>>'{description,after_md5}' then raise exception 'Invalid library after hash'; end if;
    actual_pair:=jsonb_build_object('description',item_row.description,'operations',to_jsonb(item_row.operations));
    if actual_pair=jsonb_build_object('description',patch#>>'{description,after}','operations',patch#>'{operations,after}') then continue; end if;
    if actual_pair is distinct from jsonb_build_object('description',patch#>>'{description,before}','operations',patch#>'{operations,before}') then
      raise exception 'Library staff has an unreviewed description/operations pair: %',patch->>'id';
    end if;
    update public.item set description=next_text,operations=case when id=12425
      then array(select value::json from jsonb_array_elements(patch#>'{operations,after}')) else operations end
      where id=item_row.id and description is not distinct from item_row.description
        and to_jsonb(operations) is not distinct from to_jsonb(item_row.operations);
    get diagnostics changed_rows=row_count;
    if changed_rows<>1 then
      raise exception 'Library staff CAS failed: %',patch->>'id';
    end if;
  end loop;
end
$repair$;
$historical_original_dual$;
end $historical_dual$;
