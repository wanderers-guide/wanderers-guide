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
    and pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to((p.prosrc)::text,'UTF8')),'hex')='daea9d6e1e03e4adbb63c5ab1e06ad540f09b032ae32a1a0b85e421f43d07ded'
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
  execute $historical_original_dual$-- Exact owning-row condition references; RichText supplies condition links at render time.
-- Source 16, citations, metadata, operations, and every non-description field remain unchanged.
do $repair$
declare
  patches constant jsonb := $patches$
[
  {
    "id": 11727,
    "name": "Avalanche Boots",
    "uuid": "925704570733986",
    "source": 16,
    "level": 17,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4668",
      "book": "Treasure Vault",
      "page": "102"
    },
    "description": {
      "before": "6bcc71705b0b7ac078f4961b34eee563",
      "after": "5259071352adfe0bb8a44546ff3ef7a8",
      "before_text": "While the insides of these boots are comfortable, fur-lined leather, the outsides are a jumble of slate plates, giving the impression of a rockslide. You gain a +3 item bonus to Athletics checks and a +2 circumstance bonus to \\[\\[Force Open\\]\\] and \\[\\[Shove\\]\\]. When you invest the boots, you either increase your Strength score by 2 or increase it to 18, whichever is higher.\n\n**Activate** F envision\n\n**Effect** If the Shove was a success, you push your opponent up to 10 feet instead of 5 feet. If the Shove was a critical success, you push your opponent up to 20 feet, and you can then choose to knock them \\[\\[Prone\\]\\].",
      "replacements": [
        {
          "from": "\\[\\[Prone\\]\\]",
          "to": "prone",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 11772,
    "name": "Blending Brooch",
    "uuid": "6028558870698059",
    "source": 16,
    "level": 11,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4630",
      "book": "Treasure Vault",
      "page": "92"
    },
    "description": {
      "before": "b650ac1817e4bb2e3c1f3c657bc2172c",
      "after": "0896de30db623f6b182d3ccf3e58af41",
      "before_text": "**Activate** f envision\n\nThis small, matte-black pin always seems to be on the periphery of your vision, even when you stare directly at it. When you Activate the talisman, choose one creature you can see. You become \\[\\[Invisible\\]\\] to that creature unless it succeeds at a Will 28 save. This effect lasts for 1 minute or until the target hits you with an attack, whichever comes first.",
      "replacements": [
        {
          "from": "\\[\\[Invisible\\]\\]",
          "to": "invisible",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 11774,
    "name": "Blightburn Bomb (Greater)",
    "uuid": "4147634037626075",
    "source": 16,
    "level": 20,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4435",
      "book": "Treasure Vault",
      "page": "44"
    },
    "description": {
      "before": "a5100da6b8e09e3f0de1517f3035c528",
      "after": "6151a4cc7af50381d435916c2114db6c",
      "before_text": "**Activate** 1 Strike\n\nBlightburn bombs have radioactive materials sealed inside flasks treated with lead. The bomb grants a +3 item bonus to attack rolls and deals 4d6 poison damage, 4d4 persistent poison damage, and 4 poison splash damage, according to the bomb's type. A creature that takes the persistent poison damage deals the splash damage again from its current position as the radiation continues to harm nearby creatures. The persistent damage can last up to 1 minute. Blightburn bombs also expose the primary target to blightburn sickness.\n\n**Saving Throw** Fortitude 43\n\n**Onset** \\[\\[/r 1d4 #days\\]\\]{1d4 days}\n\n**Stage 1** \\[\\[Drained\\]\\]{Drained 1} (1 day)\n\n**Stage 2** drained 1 and \\[\\[Sickened\\]\\]{Sickened 1} (1 day)\n\n**Stage 3** \\[\\[Drained\\]\\]{Drained 2} and \\[\\[Sickened\\]\\]{Sickened 2} (1 week)\n\n**Stage 4** \\[\\[Drained\\]\\]{Drained 3} and \\[\\[Sickened\\]\\]{Sickened 3} (1 month)\n\n**Stage 5** increase drained condition by 1 (1 year)",
      "replacements": [
        {
          "from": "\\[\\[Drained\\]\\]{Drained 1}",
          "to": "drained 1",
          "count": 1
        },
        {
          "from": "\\[\\[Sickened\\]\\]{Sickened 1}",
          "to": "sickened 1",
          "count": 1
        },
        {
          "from": "\\[\\[Drained\\]\\]{Drained 2}",
          "to": "drained 2",
          "count": 1
        },
        {
          "from": "\\[\\[Sickened\\]\\]{Sickened 2}",
          "to": "sickened 2",
          "count": 1
        },
        {
          "from": "\\[\\[Drained\\]\\]{Drained 3}",
          "to": "drained 3",
          "count": 1
        },
        {
          "from": "\\[\\[Sickened\\]\\]{Sickened 3}",
          "to": "sickened 3",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 11775,
    "name": "Blightburn Bomb",
    "uuid": "6977801521699596",
    "source": 16,
    "level": 15,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4435",
      "book": "Treasure Vault",
      "page": "44"
    },
    "description": {
      "before": "254b25f6c657d2fa5fcdf2bbd54be7a5",
      "after": "0416a96b9b3e331578dfecb355c3fb82",
      "before_text": "**Activate** 1 Strike\n\nBlightburn bombs have radioactive materials sealed inside flasks treated with lead. The bomb grants a +2 item bonus to attack rolls and deals 3d6 poison damage, 3d4 persistent poison damage, and 3 poison splash damage, according to the bomb's type. A creature that takes the persistent poison damage deals the splash damage again from its current position as the radiation continues to harm nearby creatures. The persistent damage can last up to 1 minute. Blightburn bombs also expose the primary target to blightburn sickness.\n\n**Saving Throw** Fortitude 34\n\n**Onset** \\[\\[/r 1d4 #days\\]\\]{1d4 days}\n\n**Stage 1** \\[\\[Drained\\]\\]{Drained 1} (1 day)\n\n**Stage 2** drained 1 and \\[\\[Sickened\\]\\]{Sickened 1} (1 day)\n\n**Stage 3** \\[\\[Drained\\]\\]{Drained 2} and \\[\\[Sickened\\]\\]{Sickened 2} (1 week)\n\n**Stage 4** \\[\\[Drained\\]\\]{Drained 3} and \\[\\[Sickened\\]\\]{Sickened 3} (1 month)\n\n**Stage 5** increase drained condition by 1 (1 year)",
      "replacements": [
        {
          "from": "\\[\\[Drained\\]\\]{Drained 1}",
          "to": "drained 1",
          "count": 1
        },
        {
          "from": "\\[\\[Sickened\\]\\]{Sickened 1}",
          "to": "sickened 1",
          "count": 1
        },
        {
          "from": "\\[\\[Drained\\]\\]{Drained 2}",
          "to": "drained 2",
          "count": 1
        },
        {
          "from": "\\[\\[Sickened\\]\\]{Sickened 2}",
          "to": "sickened 2",
          "count": 1
        },
        {
          "from": "\\[\\[Drained\\]\\]{Drained 3}",
          "to": "drained 3",
          "count": 1
        },
        {
          "from": "\\[\\[Sickened\\]\\]{Sickened 3}",
          "to": "sickened 3",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 11796,
    "name": "Boulder Seed (Greater)",
    "uuid": "3258236377882296",
    "source": 16,
    "level": 18,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4436",
      "book": "Treasure Vault",
      "page": "44"
    },
    "description": {
      "before": "0f0e86956a885f6344c608a6b8dcddd6",
      "after": "fd0ef4dee479ece7ffb38aed39427a28",
      "before_text": "**Activate** 1 Strike\n\nThis bomb is made of volatile fluids that rapidly expand and harden when exposed to air. A boulder seed grants a +3 item bonus to attack rolls and deals 4d4 bludgeoning damage and 4 bludgeoning splash damage, according to the bomb's type. When activated, the bomb fills a 5-foot cube with hardened foam, it creates a boulder as hard as stone (Hardness 10, HP 40) that pushes Large or smaller targets. On a critical hit, the target also falls \\[\\[Prone\\]\\]. The splash zone fills with rubble, creating difficult terrain. The \"boulder\" the bomb creates fails all saving throws and loses 1 Hardness per round, disintegrating into fine powder when the boulder's Hardness is reduced to 0. At that time, the difficult terrain the bomb created also disappears.",
      "replacements": [
        {
          "from": "\\[\\[Prone\\]\\]",
          "to": "prone",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 11797,
    "name": "Boulder Seed",
    "uuid": "8042468708367882",
    "source": 16,
    "level": 12,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4436",
      "book": "Treasure Vault",
      "page": "44"
    },
    "description": {
      "before": "4feeddebed040df0389b96d265393266",
      "after": "50e03b98e856f5dd18ab0dd9d4e5b0db",
      "before_text": "**Activate** 1 Strike\n\nThis bomb is made of volatile fluids that rapidly expand and harden when exposed to air. A boulder seed grants a +2 item bonus to attack rolls and deals 3d4 bludgeoning damage and 3 bludgeoning splash damage, according to the bomb's type. When activated, the bomb fills a 5-foot cube with hardened foam, it creates a boulder as hard as wood (Hardness 5, HP 20) that pushes Medium or smaller targets. On a critical hit, the target also falls \\[\\[Prone\\]\\]. The splash zone fills with rubble, creating difficult terrain. The \"boulder\" the bomb creates fails all saving throws and loses 1 Hardness per round, disintegrating into fine powder when the boulder's Hardness is reduced to 0. At that time, the difficult terrain the bomb created also disappears.",
      "replacements": [
        {
          "from": "\\[\\[Prone\\]\\]",
          "to": "prone",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 11824,
    "name": "Careless Delight",
    "uuid": "8726275612272611",
    "source": 16,
    "level": 9,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4528",
      "book": "Treasure Vault",
      "page": "67"
    },
    "description": {
      "before": "c033bf1d9668e55d4ab55a0d93fd66a7",
      "after": "e142f767e4a66b5f0ad389f1a78e15f1",
      "before_text": "**Activate** 1 Interact\n\nSometimes called liquid persuasion, this sweet-tasting tincture induces euphoria that lowers inhibitions and increases trust. The status penalty from being stupefied due to this poison doubles when applied to Deception checks to Lie, Perception checks to \\[\\[Sense Motive\\]\\], and Perception DCs to detect a Lie.\n\n**Saving Throw** Fortitude 28\n\n**Onset** 1 minute\n\n**Maximum Duration** 10 minutes\n\n**Stage 1** \\[\\[Stupefied\\]\\]{Stupefied 1} (1 minute)\n\n**Stage 2** \\[\\[Stupefied\\]\\]{Stupefied 2} (1 minute)\n\n**Stage 3** \\[\\[Stupefied\\]\\]{Stupefied 3}, and the victim's attitude toward others improves by one step (1 minute)",
      "replacements": [
        {
          "from": "\\[\\[Stupefied\\]\\]{Stupefied 1}",
          "to": "stupefied 1",
          "count": 1
        },
        {
          "from": "\\[\\[Stupefied\\]\\]{Stupefied 2}",
          "to": "stupefied 2",
          "count": 1
        },
        {
          "from": "\\[\\[Stupefied\\]\\]{Stupefied 3}",
          "to": "stupefied 3",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 11831,
    "name": "Cayden's Tankard",
    "uuid": "578544378028616",
    "source": 16,
    "level": 25,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4889",
      "book": "Treasure Vault",
      "page": "178"
    },
    "description": {
      "before": "7ed9261b268a8a4003afe5a8dc6f03ff",
      "after": "9233e91101aa031e886b83d41a16b864",
      "before_text": "This ordinary-looking silver tankard functions as a _+4 major striking hopeful returning light hammer_ when wielded as a weapon. Imbued with Cayden Cailean's courage, you are immune to fear effects. Any liquid poured into the tankard transforms into a strong, alcoholic ambrosia that remains contained safely within until you drink it. Drinking the ambrosia Activates the tankard, with one of the following effects. If you aren't the one blessed to borrow the tankard, you are \\[\\[Drained\\]\\]{Drained 4} and \\[\\[Enfeebled\\]\\]{Enfeebled 4} while holding it, and its magic doesn't function for you.\n\n**Activate** R Interact\n\n**Effect** Calmly swigging a drink on the battlefield turns your foe's attempt to frighten you against them. The fear effect is counteracted for all targets, and the creature that created the effect must attempt a saving throw as if it alone were the original target of the effect.\n\n**Activate** 2 envision, Interact\n\n**Effect** You drink from the tankard, ending the \\[\\[Controlled\\]\\], \\[\\[Grabbed\\]\\], \\[\\[Immobilized\\]\\], \\[\\[Paralyzed\\]\\], \\[\\[Restrained\\]\\], and \\[\\[Slowed\\]\\] conditions on yourself and creatures of your choice within 120 feet of you, as well as anything giving such targets a circumstance penalty to Speed. Any effect causing these conditions ends, and if the source of the effect is an item, that item can't produce the effect for 1 week, provided it is of a level lower than the tankard's. If a target needs to \\[\\[Escape\\]\\] an effect imposing any of these conditions, it automatically does so on its next attempt. You can Activate this ability even if one of the listed conditions would normally prevent you from doing so (such as paralyzed).\n\n**Activate** 2 envision, Interact\n\n**Effect** You enhance yourself with a shard of Cayden's divine fortune and cast \\[\\[Indestructibility\\]\\].\n\n**Destruction** If a lawful evil creature carries _Cayden's Tankard_ into the Starstone Cathedral, drinks from it, and returns outside with it, the tankard shatters.",
      "replacements": [
        {
          "from": "\\[\\[Drained\\]\\]{Drained 4}",
          "to": "drained 4",
          "count": 1
        },
        {
          "from": "\\[\\[Enfeebled\\]\\]{Enfeebled 4}",
          "to": "enfeebled 4",
          "count": 1
        },
        {
          "from": "\\[\\[Controlled\\]\\]",
          "to": "controlled",
          "count": 1
        },
        {
          "from": "\\[\\[Grabbed\\]\\]",
          "to": "grabbed",
          "count": 1
        },
        {
          "from": "\\[\\[Immobilized\\]\\]",
          "to": "immobilized",
          "count": 1
        },
        {
          "from": "\\[\\[Paralyzed\\]\\]",
          "to": "paralyzed",
          "count": 1
        },
        {
          "from": "\\[\\[Restrained\\]\\]",
          "to": "restrained",
          "count": 1
        },
        {
          "from": "\\[\\[Slowed\\]\\]",
          "to": "slowed",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 11859,
    "name": "Clown Monarch",
    "uuid": "5531536345345289",
    "source": 16,
    "level": 5,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4530",
      "book": "Treasure Vault",
      "page": "68"
    },
    "description": {
      "before": "68cd10797c17870aa513d0a160dbb43b",
      "after": "887cfb8754938a26ad5a108e6e643ea7",
      "before_text": "**Activate** 2 Interact\n\nA victim of clown monarch is amusing to behold as they repeatedly suffer slapstick pratfalls. This poison disrupts the victim's sense of balance.\n\n**Saving Throw** Fortitude 22\n\n**Maximum Duration** 6 rounds\n\n**Stage 1** falls \\[\\[Prone\\]\\] and must succeed at a Flat 5 when attempting a Stand action or the action fails and is lost (1 round)\n\n**Stage 2** as stage 1 but a Flat 10 (1 round)\n\n**Stage 3** as stage 1 but a Flat 15 (1 round)",
      "replacements": [
        {
          "from": "\\[\\[Prone\\]\\]",
          "to": "prone",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 11860,
    "name": "Clubhead Poison",
    "uuid": "5108747944059799",
    "source": 16,
    "level": 12,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4531",
      "book": "Treasure Vault",
      "page": "68"
    },
    "description": {
      "before": "3b7512adf47e88757db752ac04a3a7ec",
      "after": "ba70ebdab8a59a6ca9eeb705d2da0bc0",
      "before_text": "**Activate** 2 Interact\n\nThis poison is named for the strain of fungi from which it's distilled. Hallucinations assail the victim's mind, causing them to see imaginary foes.\n\n**Saving Throw** Fortitude 32\n\n**Maximum Duration** 6 rounds\n\n**Stage 1** 3d8 poison, \\[\\[Off-Guard\\]\\], and can't take reactions (1 round)\n\n**Stage 2** 4d8 poison, off-guard, can't take reactions, \\[\\[Stunned\\]\\]{Stunned 1} (1 round)\n\n**Stage 3** 5d8 poison, off-guard, can't take reactions, and stunned 1 (1 round)",
      "replacements": [
        {
          "from": "\\[\\[Off-Guard\\]\\]",
          "to": "off-guard",
          "count": 1
        },
        {
          "from": "\\[\\[Stunned\\]\\]{Stunned 1}",
          "to": "stunned 1",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 11889,
    "name": "Corrosive Engravings",
    "uuid": "784469931024561",
    "source": 16,
    "level": 5,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4709",
      "book": "Treasure Vault",
      "page": "111"
    },
    "description": {
      "before": "ec0d08f29e114cc7d453a1af499e21d5",
      "after": "40535ff93e0187c7e9a446e92b83c3ad",
      "before_text": "These tin sheets are bound in brass and show significant signs of erosion. The grimoire's title is acid-etched, and flipping between the sheets leaves your fingers covered in flecks of rust and powdery metal.\n\n**Activate** F envision\n\n**Effect** If your next action is to cast an acid or poison spell that deals persistent damage, any creature who takes persistent damage from the spell is also \\[\\[Sickened\\]\\]{Sickened 2} until the persistent damage ends. Using an action to retch can reduce the sickened value as normal, but it can't reduce the sickened value below 1 until the persistent damage ends.",
      "replacements": [
        {
          "from": "\\[\\[Sickened\\]\\]{Sickened 2}",
          "to": "sickened 2",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 11899,
    "name": "Crushing Coils",
    "uuid": "1774782858444590",
    "source": 16,
    "level": 5,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4906",
      "book": "Treasure Vault",
      "page": "191"
    },
    "description": {
      "before": "106f9d11c75fbf5d27795192c4669ea4",
      "after": "902331d529ec5eb52c934c8472a24f50",
      "before_text": "Made from constrictor snakeskin, the strips of this _+1 leather armor_ wrap around you like an anaconda might wrap around its victim. The first time you roll a 1 on any attack roll or check after donning the armor, it fuses with you and constricts. It constricts anytime you roll a 1 on any attack roll or check thereafter. When the armor constricts, you're \\[\\[Restrained\\]\\] for 1 round.\n\n**Activate** 1 command, Interact\n\n**Effect** The armor wraps around you, allowing you to don it by the time the activation finishes.",
      "replacements": [
        {
          "from": "\\[\\[Restrained\\]\\]",
          "to": "restrained",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 11901,
    "name": "Curare",
    "uuid": "5321157015758660",
    "source": 16,
    "level": 8,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4532",
      "book": "Treasure Vault",
      "page": "68"
    },
    "description": {
      "before": "e30822a6889eea2b301562dbc7bb3a10",
      "after": "6407e087a61e937e6c919f1b04c5fb7a",
      "before_text": "**Activate** 2 Interact\n\nHunters all over Golarion favor curare, a potent paralytic derived from boiled tree bark.\n\n**Saving Throw** Fortitude 25\n\n**Maximum Duration** 6 rounds (but see stage 3)\n\n**Stage 1** 2d6 poison, \\[\\[Clumsy\\]\\]{Clumsy 1}, and \\[\\[Enfeebled\\]\\]{Enfeebled 1} (1 round)\n\n**Stage 2** 3d6 poison, \\[\\[Clumsy\\]\\]{Clumsy 2}, \\[\\[Enfeebled\\]\\]{Enfeebled 2}, and \\[\\[Slowed\\]\\]{Slowed 1} (1 minute)\n\n**Stage 3** 4d6 poison, clumsy 2, enfeebled 2, and slowed 1 (1 round). If the victim fails the saving throw while at stage 3, the poison ends and the victim is \\[\\[Paralyzed\\]\\] for \\[\\[/r 2d6 #Minutes\\]\\]{2d6 minutes}.",
      "replacements": [
        {
          "from": "\\[\\[Clumsy\\]\\]{Clumsy 1}",
          "to": "clumsy 1",
          "count": 1
        },
        {
          "from": "\\[\\[Enfeebled\\]\\]{Enfeebled 1}",
          "to": "enfeebled 1",
          "count": 1
        },
        {
          "from": "\\[\\[Clumsy\\]\\]{Clumsy 2}",
          "to": "clumsy 2",
          "count": 1
        },
        {
          "from": "\\[\\[Enfeebled\\]\\]{Enfeebled 2}",
          "to": "enfeebled 2",
          "count": 1
        },
        {
          "from": "\\[\\[Slowed\\]\\]{Slowed 1}",
          "to": "slowed 1",
          "count": 1
        },
        {
          "from": "\\[\\[Paralyzed\\]\\]",
          "to": "paralyzed",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 11926,
    "name": "Dezullon Fountain",
    "uuid": "7352965332877344",
    "source": 16,
    "level": 11,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4416",
      "book": "Treasure Vault",
      "page": "36"
    },
    "description": {
      "before": "b598a18f6ef619880b32601c1f31c399",
      "after": "3fff0a89a61f3741a73fb151c5110066",
      "before_text": "A _dezullon fountain_ is a distinct type of _+2 striking air repeater_ made from the still-living pitcher of a dezullon, dealing acid damage instead of the gun's normal piercing damage.\n\n**Activate** 1 command\n\n**Effect** The next creature you successfully Strike with this weapon is exposed to amnesia venom.\n\n**Amnesia Venom** (mental, poison)\n\n**Saving Throw** Fortitude 29|traits:mental,poison\n\n**Maximum Duration** 6 rounds\n\n**Stage 1** \\[\\[Off-Guard\\]\\] (1 round)\n\n**Stage 2** off-guard and \\[\\[Clumsy\\]\\]{Clumsy 1} (1 round)\n\n**Stage 3** \\[\\[Confused\\]\\], off-guard, and \\[\\[Clumsy\\]\\]{Clumsy 2} (1 round)",
      "replacements": [
        {
          "from": "\\[\\[Off-Guard\\]\\]",
          "to": "off-guard",
          "count": 1
        },
        {
          "from": "\\[\\[Clumsy\\]\\]{Clumsy 1}",
          "to": "clumsy 1",
          "count": 1
        },
        {
          "from": "\\[\\[Confused\\]\\]",
          "to": "confused",
          "count": 1
        },
        {
          "from": "\\[\\[Clumsy\\]\\]{Clumsy 2}",
          "to": "clumsy 2",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 11951,
    "name": "Dullahan Codex",
    "uuid": "1150991488142670",
    "source": 16,
    "level": 20,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4908",
      "book": "Treasure Vault",
      "page": "191"
    },
    "description": {
      "before": "6b29041a27d17a73ec2cdc211ea8c749",
      "after": "ad43e56bc723c45987914720004810f6",
      "before_text": "The origins of the notorious _Dullahan Codex_ are shrouded in mystery. Some legends claim it belongs to a dullahan whose head was taken by the Grim Reaper. Others attribute its creation to a powerful necromancer whose name has been lost to time. Whatever the truth, the grimoire has passed down through the ages, sometimes via mortal hands and other times mysteriously appearing among the possessions of its next target. It deserves its reputation for dooming those who possess it to die, but scholars debate whether the codex causes this fate or merely acts as its harbinger.\n\nThe _Dullahan Codex_ is a jet-black tome bearing a single rune embossed on its cover, and it functions as a \\[\\[Endless Grimoire (True)\\]\\]{True Endless Grimoire}. Inside, scrawled across its parchment pages in a delicate, spidery script, is a lengthy list of names that always appears in a reader's native alphabet. The grimoire isn't sentient, but it selects its owners, quickly passing out of the hands of those it doesn't choose. An intended victim's name appears on the list of names.\n\nIf your name is on the list and you touch the volume or read from its pages, you must attempt a Will 45 save.\n\n**Critical Success** The codex disappears, moving on to a new victim.\n\n**Success** The codex fuses to you.\n\n**Failure** The codex fuses to you, and you become \\[\\[Doomed\\]\\]{Doomed 1}.\n\n**Critical Failure** As failure, but you're \\[\\[Doomed\\]\\]{Doomed 2}.\n\nIf you attempt to get rid of the codex while it's fused to you, it returns to your possession within an hour. Each day the codex is fused to you, you must attempt another Will saving throw, but a critical success does nothing. The doomed value from the codex can decrease only after it's no longer fused to you; once it's fused to you, you remain its intended victim unless you complete a \\[\\[Freedom\\]\\] ritual aimed at ending this 10th-level effect. (On a critical failure with this ritual, the codex adds all casters to its list.) You can redirect the curse by inscribing another person's name in the grimoire and succeeding at a Arcana 40 or Occultism 40 check. Doing so is an evil act. If the curse is ritually ended or redirected, or the chosen victim dies, the codex moves on to a new victim.",
      "replacements": [
        {
          "from": "\\[\\[Doomed\\]\\]{Doomed 1}",
          "to": "doomed 1",
          "count": 1
        },
        {
          "from": "\\[\\[Doomed\\]\\]{Doomed 2}",
          "to": "doomed 2",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 11963,
    "name": "Elysian Dew",
    "uuid": "7948864290485660",
    "source": 16,
    "level": 12,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4615",
      "book": "Treasure Vault",
      "page": "89"
    },
    "description": {
      "before": "acb30befdf8d514e132aa02a366acf63",
      "after": "e07e750ad66c36d147e455c2a0d8db9b",
      "before_text": "**Activate** 1 Interact\n\nWhen you drink sweet, sky-blue _Elysian dew_, for 1 minute, you gain a 10-foot aura that evokes the vitality of Elysium, causing nearby objects to seem more colorful and plants to stand taller. You and any ally that starts its turn in the emanation gain 5 temporary Hit Points, a +1 item bonus to saving throws, and a +1 item bonus to Acrobatics and Athletics checks until the start of your or the ally's next turn. If you're evil and drink this potion, it fails to work, and you must succeed at a Fortitude 30 save or the potion renders you \\[\\[Drained\\]\\]{Drained 2}.\n\n\\[\\[Aura: Elysian Dew\\]\\]",
      "replacements": [
        {
          "from": "\\[\\[Drained\\]\\]{Drained 2}",
          "to": "drained 2",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 11967,
    "name": "Emetic Paste (Moderate)",
    "uuid": "2220308294088219",
    "source": 16,
    "level": 9,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4472",
      "book": "Treasure Vault",
      "page": "54"
    },
    "description": {
      "before": "711af04bbc12d105cd52019a52918797",
      "after": "daebd7e2996fff2c76adba25297ed578",
      "before_text": "**Activate** 1 Interact\n\n\\[\\[Sickened\\]\\] creatures have difficulty swallowing, so you can Activate emetic paste by applying it to your skin or that of a sickened creature within reach, typically on the throat. The paste makes it easy for the sickened creature to purge, granting it an immediate Fortitude save to reduce its sickened condition. The paste grants the target a +3 item bonus to that save and to all saving throws to reduce the sickened condition for 1 hour.",
      "replacements": [
        {
          "from": "\\[\\[Sickened\\]\\]",
          "to": "sickened",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 11971,
    "name": "Energizing Treat",
    "uuid": "4226413200766035",
    "source": 16,
    "level": 7,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4651",
      "book": "Treasure Vault",
      "page": "96"
    },
    "description": {
      "before": "c460b86383e0cf21b5d95b19cd4f542a",
      "after": "d7d08ed7400d41835c73ad48fad893cd",
      "before_text": "**Activate** 1 Interact\n\nAn energizing treat is a treat made from meat or grains. When you feed your animal companion or familiar an energizing treat, it's \\[\\[Quickened\\]\\] for 1 minute. It can use the extra action each round only for Strike, Stride, and Support actions, and it can do so only if it normally has those actions available and you take the proper action to command it.",
      "replacements": [
        {
          "from": "\\[\\[Quickened\\]\\]",
          "to": "quickened",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 11987,
    "name": "Euphoric Loop (Greater)",
    "uuid": "6750115442850256",
    "source": 16,
    "level": 13,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4556",
      "book": "Treasure Vault",
      "page": "74"
    },
    "description": {
      "before": "9554d1e8e66ab0ecfb98ae5e16ca6f32",
      "after": "a0a83627242ceacbc900a527862bacc4",
      "before_text": "**Activate** Cast a Spell\n\nThis catalyst is made from twisted sapling bark harvested under a full moon. When used to cast a \\[\\[Charm\\]\\] spell, the enchantment creates a blissful experience for all targets of the charm spell, up to 10. When the spell ends, even if you Dismiss it, the sudden mental dissonance between the charmed state and reality forces the target to attempt a Will resolve(@actor.attributes.spellDC.value) save against your spell DC.\n\n**Critical Success** The target is unaffected.\n\n**Success** The target is \\[\\[Stunned\\]\\]{Stunned 1} or, if the spell ended because of a hostile action, \\[\\[Confused\\]\\] for 1 round.\n\n**Failure** The target is \\[\\[Stunned\\]\\]{Stunned 2} or, if the spell ended because of a hostile action, confused for 1 round.\n\n**Critical Failure** The target is \\[\\[Stunned\\]\\]{Stunned 3} or, if the spell ended because of a hostile action, confused for 2 rounds.",
      "replacements": [
        {
          "from": "\\[\\[Stunned\\]\\]{Stunned 1}",
          "to": "stunned 1",
          "count": 1
        },
        {
          "from": "\\[\\[Confused\\]\\]",
          "to": "confused",
          "count": 1
        },
        {
          "from": "\\[\\[Stunned\\]\\]{Stunned 2}",
          "to": "stunned 2",
          "count": 1
        },
        {
          "from": "\\[\\[Stunned\\]\\]{Stunned 3}",
          "to": "stunned 3",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 11988,
    "name": "Euphoric Loop",
    "uuid": "3049663714269387",
    "source": 16,
    "level": 5,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4556",
      "book": "Treasure Vault",
      "page": "74"
    },
    "description": {
      "before": "01f6a437fc96bdbf44f0ba9cb6e6eb6c",
      "after": "4959993ebfd20cd2547d3a2c83f18243",
      "before_text": "**Activate** Cast a Spell\n\nThis catalyst is made from twisted sapling bark harvested under a full moon. When used to cast a \\[\\[Charm\\]\\] spell, the enchantment creates a blissful experience for one target of your choice. When the spell ends, even if you Dismiss it, the sudden mental dissonance between the charmed state and reality forces the target to attempt a Will resolve(@actor.attributes.spellDC.value) save against your spell DC.\n\n**Critical Success** The target is unaffected.\n\n**Success** The target is \\[\\[Stunned\\]\\]{Stunned 1} or, if the spell ended because of a hostile action, \\[\\[Confused\\]\\] for 1 round.\n\n**Failure** The target is \\[\\[Stunned\\]\\]{Stunned 2} or, if the spell ended because of a hostile action, confused for 1 round.\n\n**Critical Failure** The target is \\[\\[Stunned\\]\\]{Stunned 3} or, if the spell ended because of a hostile action, confused for 2 rounds.",
      "replacements": [
        {
          "from": "\\[\\[Stunned\\]\\]{Stunned 1}",
          "to": "stunned 1",
          "count": 1
        },
        {
          "from": "\\[\\[Confused\\]\\]",
          "to": "confused",
          "count": 1
        },
        {
          "from": "\\[\\[Stunned\\]\\]{Stunned 2}",
          "to": "stunned 2",
          "count": 1
        },
        {
          "from": "\\[\\[Stunned\\]\\]{Stunned 3}",
          "to": "stunned 3",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 12006,
    "name": "Falconsight Eye",
    "uuid": "7779120612797869",
    "source": 16,
    "level": 6,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4691",
      "book": "Treasure Vault",
      "page": "108"
    },
    "description": {
      "before": "cfde2a163ebbb55c46ee9afb2990de53",
      "after": "4eb590e14ad0ad3b475a0665eb41ceb0",
      "before_text": "This prosthetic eye resembles that of a bird of prey. Along with the abilities of the _magical prosthetic eye_, it allows you to strike foes at greater range and with impressive accuracy.\n\n**Activate** 1 envision\n\n**Effect** You become keenly aware of your foes, even those seemingly out of reach. For 1 minute, you can close your eyes as a free action to see through a ranged weapon you're wielding, which reduces the penalty for firing into your weapon's second range increment from –2 to 0. This effect doesn't negate the \\[\\[Blinded\\]\\] condition.",
      "replacements": [
        {
          "from": "\\[\\[Blinded\\]\\]",
          "to": "blinded",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 12012,
    "name": "Fearcracker (legacy)",
    "uuid": "6138651179720069",
    "source": 16,
    "level": 5,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4557",
      "book": "Treasure Vault",
      "page": "74"
    },
    "description": {
      "before": "ec877411d6dd99a2c960d0701bec503b",
      "after": "574287a69d8a3f4c02adc72fdbed4bd9",
      "before_text": "**Activate** Cast a Spell\n\nA fearcracker contains fragments of broken mirrors and reagents that pop and smoke when consumed. When thrown down in your space as part of a \\[\\[Mirror Image\\]\\] spell, your and your images' appearance twists nightmarishly. When an image is destroyed, it \"dies\" in a disturbing fashion, rendering the attacker \\[\\[Frightened\\]\\]{Frightened 1}. This aspect of the spell has the emotion, fear, and mental traits.",
      "replacements": [
        {
          "from": "\\[\\[Frightened\\]\\]{Frightened 1}",
          "to": "frightened 1",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 12013,
    "name": "Fearless Sash",
    "uuid": "5166068302848362",
    "source": 16,
    "level": 7,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4843",
      "book": "Treasure Vault",
      "page": "146"
    },
    "description": {
      "before": "331ea3737c2e3d4859de3005f99176b1",
      "after": "59f3c9731f767a334a6ad78eaaf8091b",
      "before_text": "A feeling of security radiates out from this sash made of fine yellow fabric. You gain a +1 status bonus to saves against fear.\n\n**Activate** 1 command\n\n**Effect** You and each ally in a 5-foot emanation reduce your \\[\\[Frightened\\]\\] values by 1.",
      "replacements": [
        {
          "from": "\\[\\[Frightened\\]\\]",
          "to": "frightened",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 12024,
    "name": "Freeze Ammunition",
    "uuid": "960541811768889",
    "source": 16,
    "level": 5,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4431",
      "book": "Treasure Vault",
      "page": "42"
    },
    "description": {
      "before": "7400fa02f2d8aef6666df2560bf199db",
      "after": "3b56442f13f70dc1eb5721ff87f90f7f",
      "before_text": "**Ammunition** any\n\n**Activate** 1 Interact\n\nFreeze ammunition carries chilling reagents that activate on contact with the target. A creature hit by activated freeze ammunition takes cold damage instead of the weapon's normal damage type, plus \\[\\[/r (2\\[splash\\])\\[cold\\]\\]\\] splash damage. Hitting a 5-foot-square surface successfully with freeze ammunition deals 2 cold splash damage and covers the space in a layer of ice. Each creature standing on the icy surface must succeed at a Reflex 20 save or Acrobatics 20 check or else fall \\[\\[Prone\\]\\]. Creatures using an action to move onto the icy surface must attempt either a Reflex save or an Acrobatics check to \\[\\[Balance\\]\\]. Creatures that Step or \\[\\[Crawl\\]\\] don't need to attempt a check or save. The ice melts after 1 minute, although unusually hot or cold temperatures can change this duration at the GM's discretion. Dealing at least 1 point of fire damage to the ice removes it instantly",
      "replacements": [
        {
          "from": "\\[\\[Prone\\]\\]",
          "to": "prone",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 12028,
    "name": "Fury Cocktail (Greater)",
    "uuid": "5584085442397161",
    "source": 16,
    "level": 18,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4450",
      "book": "Treasure Vault",
      "page": "48"
    },
    "description": {
      "before": "02fa8f82454759dc8b1463174c363055",
      "after": "cafc3013c48763a6e02be6ba9d046746",
      "before_text": "**Activate** 1 Interact\n\nA fury cocktail is a fortifying ginger beer spiked with rum and a mixer. It's rumored to have originated from a barbarian-themed festival in a popular mead hall specializing in alchemical beverages.\n\n**Benefit** You gain a +4 item bonus to melee attack rolls and an additional effect depending on the additive chosen when the brew is created. The effects last 1 hour.\n\n*   **Animalistic** Lemon juice and powdered claws or talons are added to the cocktail. You gain an unarmed attack in the brawling group of your choice between a jaws attack that deals 1d6 piercing damage or a claw attack that has the agile trait and deals 1d4 slashing damage.\n*   **Double** This cocktail is just stronger, with more ginger and more rum. You gain resistance 5 to physical damage.\n*   **Mournful** A few flower petals add a powerful aroma to the drink. You gain resistance 10 to void damage, or resistance 10 to vitality damage if you have void healing.\n*   **Skeptical** A splash of bitters gives the drink a more complex flavor. You gain a +3 item bonus to saves against magic.\n*   **Titanic** Yuzu juice and powdered giant hair are added to this cocktail. If you're Medium or smaller, you gain the following effects: you become Large, are \\[\\[Clumsy\\]\\]{Clumsy 1}, and increase your reach by 5 feet (or by 10 feet if you started out Tiny).\n*   **Wyrmhide** Pomegranate juice and elemental reagents are added to the cocktail. You gain resistance 10 to acid, cold, electricity, fire, and poison damage.\n\n**Drawback** You take a –1 penalty to AC and a –2 penalty to Reflex saves.\n\n\\[\\[Effect: Fury Cocktail (Greater)\\]\\]",
      "replacements": [
        {
          "from": "\\[\\[Clumsy\\]\\]{Clumsy 1}",
          "to": "clumsy 1",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 12039,
    "name": "Gearbinder Oil (Lesser)",
    "uuid": "1472503890128627",
    "source": 16,
    "level": 6,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4473",
      "book": "Treasure Vault",
      "page": "54"
    },
    "description": {
      "before": "248ba1866079c04b9920c2cf7356958f",
      "after": "c8de5508f8d42182ea1a4699d8366cc0",
      "before_text": "**Activate** 1 Interact\n\nGearbinder oil comes in a sealed pump that can squirt the oil a short distance. The oil is designed to flow through complex mechanisms and, agitated through mechanical action, foam up and form a paste that binds the works. The oil is effective against articulated constructs and machinery, including many constructs, clockworks, and mechanical hazards. You apply the oil to the target you want to bind, which must be within 10 feet of you. After the oil is applied, at the end of any round during which the target took an action with the attack, manipulate, or move trait, it must attempt a Fortitude 20 save. A mechanism that's \\[\\[Slowed\\]\\]{Slowed 2} or more by gearbinder oil also can't use reactions. Gearbinder oil functions for up to 6 rounds before becoming an inert, oily residue.\n\n**Critical Success** The oil becomes inert, and the effect ends.\n\n**Success** The target reduces its slowed condition by 1. If the slowed condition's value is 0, the effect ends.\n\n**Failure** The target increases its slowed condition by 1, to a maximum of \\[\\[Slowed\\]\\]{Slowed 3}.\n\n**Critical Failure** The target increases its slowed condition by 2, to a maximum of slowed 3.",
      "replacements": [
        {
          "from": "\\[\\[Slowed\\]\\]{Slowed 2}",
          "to": "slowed 2",
          "count": 1
        },
        {
          "from": "\\[\\[Slowed\\]\\]{Slowed 3}",
          "to": "slowed 3",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 12060,
    "name": "Gravemist Taper",
    "uuid": "6031426014160445",
    "source": 16,
    "level": 5,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4558",
      "book": "Treasure Vault",
      "page": "74"
    },
    "description": {
      "before": "71a86a53f1560324f6887ac3bc1495e7",
      "after": "bec34e6156893e18e629d0f7c5239571",
      "before_text": "**Activate** Cast a Spell\n\nA _gravemist taper_ is a conical candle with symbols of terror and death carved into the wax. The taper can be used as a catalyst when casting an \\[\\[Mist\\]\\] spell, burning the taper away, coloring the mist gray, and filling the mist with ghastly, shadowy shapes. The flat check to overcome the \\[\\[Concealed\\]\\] state from the mist rises to 7, and a creature who fails such a check becomes \\[\\[Frightened\\]\\]{Frightened 1}. This aspect of the spell has the emotion, fear, and mental traits.",
      "replacements": [
        {
          "from": "\\[\\[Concealed\\]\\]",
          "to": "concealed",
          "count": 1
        },
        {
          "from": "\\[\\[Frightened\\]\\]{Frightened 1}",
          "to": "frightened 1",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 12061,
    "name": "Grounding Spike",
    "uuid": "8539826978545700",
    "source": 16,
    "level": 10,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4407",
      "book": "Treasure Vault",
      "page": "34"
    },
    "description": {
      "before": "336c169424c595fe44aae074bd3c9d73",
      "after": "4acd62a7eccd5a971cbb582cde6e29af",
      "before_text": "Metal caps the bottom of this _+1 striking thundering dancer's spear_ and its point gives off the faint smell of ozone. If you hit a target that has been struck by a polarizing mace within the last round, you deal additional electricity damage to the target equal to the number of grounding spike's damage dice. If you critically hit such a target, the creature is \\[\\[Off-Guard\\]\\] until the start of your next turn.",
      "replacements": [
        {
          "from": "\\[\\[Off-Guard\\]\\]",
          "to": "off-guard",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 12096,
    "name": "Hippogriff in a Jar",
    "uuid": "617515831477348",
    "source": 16,
    "level": 5,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4482",
      "book": "Treasure Vault",
      "page": "56"
    },
    "description": {
      "before": "f447b8cdd70ce346ec069306567ea7f0",
      "after": "e0b1f049e8b5ad47724a1c0c4f55efcb",
      "before_text": "**Activate** 2 Interact\n\nThis bottle contains a shrunken hippogriff. When opened, the contents reconstitute into a Large effigy of a hippogriff. The hippogriff waits up to 1 round and allows two creatures to mount it, then Flies up to 65 feet and waits 1 more round to give the mounted creatures time to dismount. Creatures who are still mounted on the hippogriff when it dissolves fall \\[\\[Prone\\]\\] in the space where the hippogriff corpse ends its movement.",
      "replacements": [
        {
          "from": "\\[\\[Prone\\]\\]",
          "to": "prone",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 12098,
    "name": "Horrid Figurine",
    "uuid": "2410292548939842",
    "source": 16,
    "level": 8,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4726",
      "book": "Treasure Vault",
      "page": "115"
    },
    "description": {
      "before": "3b5fca8586ffaaa51f605c264f77388d",
      "after": "39b4840d526c9fce9739f7fec0672fae",
      "before_text": "Carved in a putrid jade, the color of disease, this figurine is a bloated humanoid mass of writhing vermin and serpents, all rendered in disgusting detail. The creeping pattern is carved so they seem to move and contort the more one views the figurine. When activated, the effect is amplified to a disgusting or horrifying degree. The figurine can be activated twice per day. If you try to activate it a third time during a day, it dissolves into a puddle of non-magical, putrid glue, causing you to become \\[\\[Sickened\\]\\]{Sickened 3}.\n\n**Activate** 2 command, Interact\n\n**Effect** Holding the figurine over your head and speaking one command word causes a wave of nausea in a 20-foot emanation. Each creature in the emanation must succeed at a Fortitude 24 save or become \\[\\[Sickened\\]\\]{Sickened 2}. You're immune to this effect.\n\n**Activate** 2 command, Interact\n\n**Effect** Holding the figurine over your head and speaking a different command word causes those around to tremble in fear. Each creature in a 20-foot emanation must succeed at a Will 24 save or become \\[\\[Frightened\\]\\]{Frightened 3}. You're immune to this effect.",
      "replacements": [
        {
          "from": "\\[\\[Sickened\\]\\]{Sickened 3}",
          "to": "sickened 3",
          "count": 1
        },
        {
          "from": "\\[\\[Sickened\\]\\]{Sickened 2}",
          "to": "sickened 2",
          "count": 1
        },
        {
          "from": "\\[\\[Frightened\\]\\]{Frightened 3}",
          "to": "frightened 3",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 12105,
    "name": "Immovable Potion",
    "uuid": "2156578209461492",
    "source": 16,
    "level": 10,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4620",
      "book": "Treasure Vault",
      "page": "90"
    },
    "description": {
      "before": "e2951acf281b35e65134b17695b1b053",
      "after": "78f714f951ce35d6f6010f2b08486168",
      "before_text": "**Activate** 1 Interact\n\nWhen you drink the thick, slate-colored immovable potion, you become anchored in place, even defying gravity, rendering you \\[\\[Immobilized\\]\\] for 1 minute or until you Dismiss the activation. While you are immobilized this way, the DC to move you from your place, including knocking you \\[\\[Prone\\]\\], is 40.",
      "replacements": [
        {
          "from": "\\[\\[Immobilized\\]\\]",
          "to": "immobilized",
          "count": 1
        },
        {
          "from": "\\[\\[Prone\\]\\]",
          "to": "prone",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 12106,
    "name": "Immovable",
    "uuid": "4183796929585080",
    "source": 16,
    "level": 12,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4365",
      "book": "Treasure Vault",
      "page": "12"
    },
    "description": {
      "before": "77c9092978ada4fa14441b95d2b7526b",
      "after": "22ff89d979f36887f84cff1bbc876cae",
      "before_text": "This rune utilizes magical principles used in an _\\[\\[Immovable Rod\\]\\]_.\n\n**Activate** 1 Interact\n\n**Effect** Your armor anchors you in place, even defying gravity, rendering you \\[\\[Immobilized\\]\\] until you Dismiss the Activation. While you're immobilized in this way, you can be moved only if a creature succeeds at a Athletics 40|traits:action:force-open check to \\[\\[Force Open\\]\\] your armor. You can also be moved if 8,000 pounds of pressure are placed upon you, though this is likely fatal.",
      "replacements": [
        {
          "from": "\\[\\[Immobilized\\]\\]",
          "to": "immobilized",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 12119,
    "name": "Instinct Crown (Fury)",
    "uuid": "6043174096370110",
    "source": 16,
    "level": 10,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4870",
      "book": "Treasure Vault",
      "page": "152"
    },
    "description": {
      "before": "d8c2c33083969788760a99de46802941",
      "after": "d17463310133982a208e266a301ed8b3",
      "before_text": "An _instinct crown_ is a magical headpiece imbued with the essence of instincts that barbarians draw upon in combat. Each crown is fashioned to represent the instinct it's tied to, such as a wolf's head for an animal instinct crown or a simple helmet with Jotun runes for a _giant instinct crown_. When worn, the crown allows you to tap further into your instincts, granting you even greater benefits if the crown's essence matches your instinct. You must be able to Rage to use the crown's activations.\n\n**Activate** F envision\n\n**Effect** You Rage, gaining 10 additional temporary Hit Points.\n\n**Activate** 2 command, envision\n\n**Effect** You Rage and draw upon your instinct to gain a boon. Your boundless fury allows you push past your natural limits, moving with unmatched speed. You become \\[\\[Quickened\\]\\] until the end of your rage. You can use your extra action only to Stride or Strike.",
      "replacements": [
        {
          "from": "\\[\\[Quickened\\]\\]",
          "to": "quickened",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 12133,
    "name": "Jug of Fond Remembrance",
    "uuid": "1907653507143413",
    "source": 16,
    "level": 4,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4727",
      "book": "Treasure Vault",
      "page": "115"
    },
    "description": {
      "before": "f2e04730698be5fa573438c785c0c97a",
      "after": "84ae35d818e081b072f497597009be6e",
      "before_text": "This large jug always seems to contain just enough of the holder's favorite alcohol to share with a friend. As long as you're holding the jug, you gain a +1 circumstance bonus to Diplomacy checks. If you share a sip of the liquor from the jug with a creature, you gain a +2 circumstance bonus to your next Diplomacy check to \\[\\[Make an Impression\\]\\] or \\[\\[Request\\]\\] something from that creature any time within the next month.\n\n**Activate** 1 Interact\n\n**Effect** You take a long swig on the jug and then Recall Knowledge about a creature you can see, with a +2 circumstance bonus to the check. If you fail but don't critically fail this check, you get a success instead. You're then \\[\\[Stupefied\\]\\]{Stupefied 1} for 3 rounds.",
      "replacements": [
        {
          "from": "\\[\\[Stupefied\\]\\]{Stupefied 1}",
          "to": "stupefied 1",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 12142,
    "name": "Kraken Bottle",
    "uuid": "1030515443560831",
    "source": 16,
    "level": 18,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4483",
      "book": "Treasure Vault",
      "page": "56"
    },
    "description": {
      "before": "d983dfc18ce9209ebdcfa3cbbd29845b",
      "after": "8191cfa660b2673f78245f129b584228",
      "before_text": "**Activate** 2 Interact\n\nCoiled tentacles make it all but impossible to see anything else inside this ampoule. When opened, a Gargantuan kraken bursts forth, which can appear in water instead of on the ground. Its arms attempt to grasp up to four creatures with a reach of 60 feet. The kraken repositions \\[\\[Grabbed\\]\\] creatures to a different space within its reach unless the target succeeds at a Fortitude 38 save.\n\nIf the kraken is in water, it then releases a cloud of ink in an 80-foot emanation. This cloud has no effect outside of water. Creatures inside the cloud are undetected, can't use their sense of smell, and are exposed to kraken ink poison. The cloud dissipates after 1 minute.\n\nKrakens are immune to this poison.\n\n**Saving Throw** Fortitude 39|traits:poison\n\n**Maximum Duration** 10 rounds\n\n**Stage 1** 3d6 poison damage and \\[\\[Sickened\\]\\]{Sickened 1} (1 round)\n\n**Stage 2** 4d6 poison damage and \\[\\[Sickened\\]\\]{Sickened 2} (1 round)",
      "replacements": [
        {
          "from": "\\[\\[Grabbed\\]\\]",
          "to": "grabbed",
          "count": 1
        },
        {
          "from": "\\[\\[Sickened\\]\\]{Sickened 1}",
          "to": "sickened 1",
          "count": 1
        },
        {
          "from": "\\[\\[Sickened\\]\\]{Sickened 2}",
          "to": "sickened 2",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 12162,
    "name": "Life Shot (Greater)",
    "uuid": "3116026975684982",
    "source": 16,
    "level": 14,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4432",
      "book": "Treasure Vault",
      "page": "43"
    },
    "description": {
      "before": "cef540e0fb498ed4e5b2d75611c1ae7c",
      "after": "5e72f49bd8126e99829b902ab0c98964",
      "before_text": "**Ammunition** round\n\n**Activate** 1 Interact\n\nLife shot is a special cartridge that carries a small dose of elixir of life. A creature hit by activated life shot takes no damage from the successful attack, instead receiving 7d4+10 healing{7d4+10 healing} and gaining a +2 item bonus to saving throws against diseases and poisons for 1 minute. On a critical hit, roll the healing received twice and take the better result (this is a fortune effect). A target willing to be hit by this attack is \\[\\[Off-Guard\\]\\] against it.\n\n\\[\\[Effect: Elixir of Life (Greater)\\]\\]",
      "replacements": [
        {
          "from": "\\[\\[Off-Guard\\]\\]",
          "to": "off-guard",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 12163,
    "name": "Life Shot (Lesser)",
    "uuid": "6324942867221290",
    "source": 16,
    "level": 6,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4432",
      "book": "Treasure Vault",
      "page": "43"
    },
    "description": {
      "before": "e3eacb1cfe4cb5fdf87f3fcb2902a15d",
      "after": "521880d838fcbf1b015e76ac247044be",
      "before_text": "**Ammunition** round\n\n**Activate** 1 Interact\n\nLife shot is a special cartridge that carries a small dose of elixir of life. A creature hit by activated life shot takes no damage from the successful attack, instead receiving 3d4+3 healing{3d4+3 healing} and gaining a +1 item bonus to saving throws against diseases and poisons for 1 minute. On a critical hit, roll the healing received twice and take the better result (this is a fortune effect). A target willing to be hit by this attack is \\[\\[Off-Guard\\]\\] against it.\n\n\\[\\[Effect: Elixir of Life (Lesser)\\]\\]",
      "replacements": [
        {
          "from": "\\[\\[Off-Guard\\]\\]",
          "to": "off-guard",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 12164,
    "name": "Life Shot (Major)",
    "uuid": "6885746820678841",
    "source": 16,
    "level": 16,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4432",
      "book": "Treasure Vault",
      "page": "43"
    },
    "description": {
      "before": "fb0f2150397862c8284cff214e186616",
      "after": "ef17c3f18d918b7c81e24e1ffe407867",
      "before_text": "**Ammunition** round\n\n**Activate** 1 Interact\n\nLife shot is a special cartridge that carries a small dose of elixir of life. A creature hit by activated life shot takes no damage from the successful attack, instead receiving 8d4+11 healing{8d4+11 healing} and gaining a +3 item bonus to saving throws against diseases and poisons for 1 minute. On a critical hit, roll the healing received twice and take the better result (this is a fortune effect). A target willing to be hit by this attack is \\[\\[Off-Guard\\]\\] against it.\n\n\\[\\[Effect: Elixir of Life (Major)\\]\\]",
      "replacements": [
        {
          "from": "\\[\\[Off-Guard\\]\\]",
          "to": "off-guard",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 12166,
    "name": "Life Shot (Moderate)",
    "uuid": "1161857233645080",
    "source": 16,
    "level": 10,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4432",
      "book": "Treasure Vault",
      "page": "43"
    },
    "description": {
      "before": "55aed75197ee36a55984d7a40c298d01",
      "after": "9d50dc77f108f9f6a317272c3cb02815",
      "before_text": "**Ammunition** round\n\n**Activate** 1 Interact\n\nLife shot is a special cartridge that carries a small dose of elixir of life. A creature hit by activated life shot takes no damage from the successful attack, instead receiving 5d4+7 healing{5d4+7 healing} and gaining a +2 item bonus to saving throws against diseases and poisons for 1 minute. On a critical hit, roll the healing received twice and take the better result (this is a fortune effect). A target willing to be hit by this attack is \\[\\[Off-Guard\\]\\] against it.\n\n\\[\\[Effect: Elixir of Life (Moderate)\\]\\]",
      "replacements": [
        {
          "from": "\\[\\[Off-Guard\\]\\]",
          "to": "off-guard",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 12167,
    "name": "Life Shot (True)",
    "uuid": "7177988535822777",
    "source": 16,
    "level": 20,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4432",
      "book": "Treasure Vault",
      "page": "43"
    },
    "description": {
      "before": "0c363f5dc70939b9a6d953a1132cfff0",
      "after": "0777de64d4976a4869b7635f80cdf7f7",
      "before_text": "**Ammunition** round\n\n**Activate** 1 Interact\n\nLife shot is a special cartridge that carries a small dose of elixir of life. A creature hit by activated life shot takes no damage from the successful attack, instead receiving 10d4+14 healing{10d4+14 healing} and gaining a +4 item bonus to saving throws against diseases and poisons for 1 minute. On a critical hit, roll the healing received twice and take the better result (this is a fortune effect). A target willing to be hit by this attack is \\[\\[Off-Guard\\]\\] against it.\n\n\\[\\[Effect: Elixir of Life (True)\\]\\]",
      "replacements": [
        {
          "from": "\\[\\[Off-Guard\\]\\]",
          "to": "off-guard",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 12176,
    "name": "Lodestone Bomb (Greater)",
    "uuid": "8006317605703353",
    "source": 16,
    "level": 18,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4437",
      "book": "Treasure Vault",
      "page": "44"
    },
    "description": {
      "before": "37964f26d0dde9c2ce10218842aa90d0",
      "after": "76a35ec5f40937f98e5f4ce2d70a4587",
      "before_text": "**Activate** 1 Strike\n\nLodestone bombs hold reactive ionized minerals preserved in a dormant state until broken. The bomb grants a +3 item bonus to attack rolls and deals 4d4 force damage and 3 force splash damage. In addition, a target made of metal, wearing metal armor, or using metal weapons takes 3d4 persistent,force and is \\[\\[Clumsy\\]\\]{Clumsy 1} and \\[\\[Enfeebled\\]\\]{Enfeebled 1} while taking the persistent damage. The persistent damage can last up to 1 minute.",
      "replacements": [
        {
          "from": "\\[\\[Clumsy\\]\\]{Clumsy 1}",
          "to": "clumsy 1",
          "count": 1
        },
        {
          "from": "\\[\\[Enfeebled\\]\\]{Enfeebled 1}",
          "to": "enfeebled 1",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 12177,
    "name": "Lodestone Bomb",
    "uuid": "1960473164426432",
    "source": 16,
    "level": 12,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4437",
      "book": "Treasure Vault",
      "page": "44"
    },
    "description": {
      "before": "cc3c96ad807399da3ea3d310d525f7af",
      "after": "2b4a33b8b23ad414ea55d745ab0702b9",
      "before_text": "**Activate** 1 Strike\n\nLodestone bombs hold reactive ionized minerals preserved in a dormant state until broken. The bomb grants a +2 item bonus to attack rolls and deals 3d4 force damage and 2 force splash damage. In addition, a target made of metal, wearing metal armor, or using metal weapons takes 2d4 persistent,force and is \\[\\[Clumsy\\]\\]{Clumsy 1} and \\[\\[Enfeebled\\]\\]{Enfeebled 1} while taking the persistent damage. The persistent damage can last up to 1 minute.",
      "replacements": [
        {
          "from": "\\[\\[Clumsy\\]\\]{Clumsy 1}",
          "to": "clumsy 1",
          "count": 1
        },
        {
          "from": "\\[\\[Enfeebled\\]\\]{Enfeebled 1}",
          "to": "enfeebled 1",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 12179,
    "name": "Looter's Lethargy",
    "uuid": "6629457174254296",
    "source": 16,
    "level": 2,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4540",
      "book": "Treasure Vault",
      "page": "69"
    },
    "description": {
      "before": "1d1a2c7eac64a9adb69924f106336a5d",
      "after": "c5dcfb6213569667ba752fa1ccec072b",
      "before_text": "**Activate** 3 Interact\n\nThe poison known as looter's lethargy ensures no thieves are strong enough to walk off with pilfered treasures. Commonly smeared on locks, chests, and even valuable items themselves, the poison slowly saps the strength of those who touch it. Nearby guardians can then simply follow the resulting trail of discarded valuables to find the weakened trespasser.\n\n**Saving Throw** Fortitude 19\n\n**Onset** 1 minute\n\n**Maximum Duration** 1 hour\n\n**Stage 1** reduce Bulk limit by 3 (1 minute)\n\n**Stage 2** \\[\\[Off-Guard\\]\\], reduce Bulk limit by 4 (10 minutes)\n\n**Stage 3** off-guard, reduce Bulk limit by 5 (10 minutes)",
      "replacements": [
        {
          "from": "\\[\\[Off-Guard\\]\\]",
          "to": "off-guard",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 12190,
    "name": "Majordomo Torc",
    "uuid": "4654706127841833",
    "source": 16,
    "level": 6,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4927",
      "book": "Treasure Vault",
      "page": "195"
    },
    "description": {
      "before": "a5b92f154ed67de0ac24bb4cf5cd6091",
      "after": "7b8b53704fd67ab7dd1db01884bd6cd8",
      "before_text": "**Perception** \\[\\[/r 1d20+13\\]\\]{+13}; precise vision 30 feet, imprecise hearing 30 feet\n\n**Communication** speech (Common and 1 imparted language)\n\n**Skills** Diplomacy \\[\\[/r 1d20+13\\]\\]{+13}, Nobility Lore \\[\\[/r 1d20+13\\]\\]{+13}, Society \\[\\[/r 1d20+13\\]\\]{+13}\n\n**Int** +3 **Wis** +3, **Cha** +3\n\n**Will** \\[\\[/r 1d20+14\\]\\]{+14}\n\nForged in platinum, a majordomo torc is engraved with heraldic insignias along with one language's alphabet, much like a choker of elocution. You gain a +1 item bonus to Society checks and the ability to understand, speak, and write the torc's language. Your excellent elocution reduces the DC of the flat check to perform an auditory action while \\[\\[Deafened\\]\\] from 5 to 3.\n\nUpon being invested, the torc appoints itself your majordomo and, given the chance, takes over coordinating your social calendar, engagements, and wardrobe. A majordomo torc has a prim, fussy disposition, and although it defers to you, it can grow sardonic if you frequently ignore its advice. The torc has the following activation.\n\n**Activate** 2 command, envision\n\n**Effect** The majordomo torc casts \\[\\[Befitting Attire\\]\\] on you, usually to your specifications. However the torc can also choose the appearance of the illusion for you.",
      "replacements": [
        {
          "from": "\\[\\[Deafened\\]\\]",
          "to": "deafened",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 12198,
    "name": "Maw of Hungry Shadows",
    "uuid": "7191324741794684",
    "source": 16,
    "level": 18,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4715",
      "book": "Treasure Vault",
      "page": "112"
    },
    "description": {
      "before": "d53aa3499a1f9f0ca77f8af13840ac1a",
      "after": "5e241891eb6c9e9fe4493746ead363c9",
      "before_text": "Shadows swirl around this soot-black tome, swallowing up any light that touches them. A faint whispering emanates from the grimoire's pages when opened.\n\n**Activate** 1 envision\n\n**Effect** Your shadow, and that of the tome, elongates and reaches hungrily for one foe within 30 feet, who must attempt a Fortitude save.\n\n**Critical Success** The creature is unaffected.\n\n**Success** The creature is \\[\\[Blinded\\]\\] for 1 round and \\[\\[Drained\\]\\]{Drained 1} as the shadows scrape across it.\n\n**Failure** The creature is blinded for 1 minute and \\[\\[Drained\\]\\]{Drained 2} as the shadows seize it.\n\n**Critical Failure** As failure, but the shadows also pull the creature into the tome, teleporting it to the Shadow Plane.",
      "replacements": [
        {
          "from": "\\[\\[Blinded\\]\\]",
          "to": "blinded",
          "count": 1
        },
        {
          "from": "\\[\\[Drained\\]\\]{Drained 1}",
          "to": "drained 1",
          "count": 1
        },
        {
          "from": "\\[\\[Drained\\]\\]{Drained 2}",
          "to": "drained 2",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 12210,
    "name": "Mindlance",
    "uuid": "4460414445708153",
    "source": 16,
    "level": 8,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4424",
      "book": "Treasure Vault",
      "page": "39"
    },
    "description": {
      "before": "043f713fb83b994cae968f824f1d62e5",
      "after": "3c8378091fd9462a8284c196b07c80cc",
      "before_text": "This _+1 striking arquebus_ is used by caravan guards to nonlethally—though powerfully—deter large game and bandits. When fired, the spark gun deals mental damage and adds the nonlethal trait to the attack. Each mindlance also includes a reinforced stock that benefits from any fundamental runes on the firearm. When you critically succeed at an attack roll with a mindlance, the target becomes \\[\\[Frightened\\]\\]{Frightened 2} unless it succeeds at a Will 24 save.",
      "replacements": [
        {
          "from": "\\[\\[Frightened\\]\\]{Frightened 2}",
          "to": "frightened 2",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 12213,
    "name": "Mirror Goggles (Greater)",
    "uuid": "3895742967478340",
    "source": 16,
    "level": 18,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4847",
      "book": "Treasure Vault",
      "page": "147"
    },
    "description": {
      "before": "6666b187ad9129d30b445ba8b723790e",
      "after": "b501b082fae5e0797c640ac8952a88cd",
      "before_text": "These goggles feature highly reflective lenses. While wearing the goggles, you gain a +3 item bonus to visual Perception checks and to saving throws against visual effects.\n\n**Activate** R Interact\n\n**Effect** You turn your head to reflect aspects of the triggering effect back at its creator. The creature must attempt a Fortitude 40 save as it becomes disoriented by this reflection. On a failure, the creature is \\[\\[Sickened\\]\\]{Sickened 1} (\\[\\[Sickened\\]\\]{Sickened 2} on a critical failure). The creature is temporarily immune for 1 hour.",
      "replacements": [
        {
          "from": "\\[\\[Sickened\\]\\]{Sickened 1}",
          "to": "sickened 1",
          "count": 1
        },
        {
          "from": "\\[\\[Sickened\\]\\]{Sickened 2}",
          "to": "sickened 2",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 12215,
    "name": "Mirror Goggles (Moderate)",
    "uuid": "8772573582599563",
    "source": 16,
    "level": 11,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4847",
      "book": "Treasure Vault",
      "page": "147"
    },
    "description": {
      "before": "9fa0419694ef0a845e6ad5e7fa360b68",
      "after": "742f51f56aa5eab058fd6b68a730da3f",
      "before_text": "These goggles feature highly reflective lenses. While wearing the goggles, you gain a +2 item bonus to visual Perception checks and to saving throws against visual effects.\n\n**Activate** R Interact\n\n**Effect** You turn your head to reflect aspects of the triggering effect back at its creator. The creature must attempt a Fortitude 30 save as it becomes disoriented by this reflection. On a failure, the creature is \\[\\[Sickened\\]\\]{Sickened 1} (\\[\\[Sickened\\]\\]{Sickened 2} on a critical failure). The creature is temporarily immune for 1 hour.",
      "replacements": [
        {
          "from": "\\[\\[Sickened\\]\\]{Sickened 1}",
          "to": "sickened 1",
          "count": 1
        },
        {
          "from": "\\[\\[Sickened\\]\\]{Sickened 2}",
          "to": "sickened 2",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 12216,
    "name": "Misleading",
    "uuid": "2630337807608825",
    "source": 16,
    "level": 16,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4367",
      "book": "Treasure Vault",
      "page": "13"
    },
    "description": {
      "before": "37b088fa852a9a2a4197ee9ed37a501e",
      "after": "8b2b178f0f647db47cf8a041346dd4f0",
      "before_text": "This rune attempts to obfuscate your location through illusory trickery. When you're \\[\\[Concealed\\]\\], the DC of the flat check to target you with an effect is 6 instead of 5.\n\n**Activate** 2 command, envision\n\n**Effect** The armor casts \\[\\[Mislead\\]\\], affecting you. It lasts until the end of your next turn.",
      "replacements": [
        {
          "from": "\\[\\[Concealed\\]\\]",
          "to": "concealed",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 12228,
    "name": "Mustard Powder",
    "uuid": "4645507244279286",
    "source": 16,
    "level": 5,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4541",
      "book": "Treasure Vault",
      "page": "70"
    },
    "description": {
      "before": "22818bba201f9369fe055ad1ccce48ea",
      "after": "7aa3116fcac84f6a62386486176650ee",
      "before_text": "**Activate** 1 Interact\n\nConcocted from the formulas provided by otherworldly refugees to Irrisen, mustard powder is rumored to be devastating to entire armies with proper dispersal. Recipes have quickly spread across Golarion. Mustard powder's sickened condition ends when the poison's other effects do.\n\n**Saving Throw** Fortitude 22\n\n**Maximum Duration** 6 rounds\n\n**Stage 1** 1d6 poison and \\[\\[Dazzled\\]\\] (1 round)\n\n**Stage 2** 2d4 poison, dazzled, \\[\\[Sickened\\]\\]{Sickened 1}, and unable to smell (1 round)\n\n**Stage 3** 2d6 poison, dazzled, \\[\\[Sickened\\]\\]{Sickened 2}, and unable to smell (1 round)",
      "replacements": [
        {
          "from": "\\[\\[Dazzled\\]\\]",
          "to": "dazzled",
          "count": 1
        },
        {
          "from": "\\[\\[Sickened\\]\\]{Sickened 1}",
          "to": "sickened 1",
          "count": 1
        },
        {
          "from": "\\[\\[Sickened\\]\\]{Sickened 2}",
          "to": "sickened 2",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 12253,
    "name": "Ooze Ammunition (Greater)",
    "uuid": "2484768822097062",
    "source": 16,
    "level": 12,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4433",
      "book": "Treasure Vault",
      "page": "43"
    },
    "description": {
      "before": "1c7bcfbd01c01c8c6c9b7f6182f4a33a",
      "after": "4e573911df88a17915edfe0fcd9cb347",
      "before_text": "**Ammunition** any\n\n**Activate** 1 Interact\n\nOoze ammunition is a capsule containing a sticky substance. If you hit a creature with activated ooze ammunition, it deals acid damage instead of its normal damage type, and the creature then takes a -10-foot penalty to Speed and 3d4 persistent,acid damage until it ends the effects. On a critical hit, the creature is \\[\\[Immobilized\\]\\] for 1 round in addition to the other effects. The target can end the effects by \\[\\[Escape\\]\\]{Escaping} (DC 29) the sticky foam. Other creatures can provide the actions, although doing so deals half the ammunition's persistent acid damage to the assisting creature. A creature that ends the effect still takes the persistent damage that turn.\n\n\\[\\[Effect: Ooze Ammunition (Greater)\\]\\]",
      "replacements": [
        {
          "from": "\\[\\[Immobilized\\]\\]",
          "to": "immobilized",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 12254,
    "name": "Ooze Ammunition (Lesser)",
    "uuid": "4794371300591972",
    "source": 16,
    "level": 2,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4433",
      "book": "Treasure Vault",
      "page": "43"
    },
    "description": {
      "before": "8175aad34b8bcbb015397dab55591f33",
      "after": "0dffe7048809705cb0b5c044913042ec",
      "before_text": "**Ammunition** any\n\n**Activate** 1 Interact\n\nOoze ammunition is a capsule containing a sticky substance. If you hit a creature with activated ooze ammunition, it deals acid damage instead of its normal damage type, and the creature then takes a -5-foot penalty to Speed and 1d4 persistent,acid damage until it ends the effects. On a critical hit, the creature is \\[\\[Immobilized\\]\\] for 1 round in addition to the other effects. The target can end the effects by \\[\\[Escape\\]\\]{Escaping} (DC 16) the sticky foam. Other creatures can provide the actions, although doing so deals half the ammunition's persistent acid damage to the assisting creature. A creature that ends the effect still takes the persistent damage that turn.\n\n\\[\\[Effect: Ooze Ammunition (Lesser)\\]\\]",
      "replacements": [
        {
          "from": "\\[\\[Immobilized\\]\\]",
          "to": "immobilized",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 12255,
    "name": "Ooze Ammunition (Major)",
    "uuid": "6589199283736217",
    "source": 16,
    "level": 18,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4433",
      "book": "Treasure Vault",
      "page": "43"
    },
    "description": {
      "before": "b5aeb378c57ce891408027b4fb16968d",
      "after": "2e7eca00c04681c4d3881e4a2377d7a0",
      "before_text": "**Ammunition** any\n\n**Activate** 1 Interact\n\nOoze ammunition is a capsule containing a sticky substance. If you hit a creature with activated ooze ammunition, it deals acid damage instead of its normal damage type, and the creature then takes a -15-foot penalty to Speed and 4d4 persistent,acid damage until it ends the effects. On a critical hit, the creature is \\[\\[Immobilized\\]\\] for 1 round in addition to the other effects. The target can end the effects by \\[\\[Escape\\]\\]{Escaping} (DC 38) the sticky foam. Other creatures can provide the actions, although doing so deals half the ammunition's persistent acid damage to the assisting creature. A creature that ends the effect still takes the persistent damage that turn.\n\n\\[\\[Effect: Ooze Ammunition (Major)\\]\\]",
      "replacements": [
        {
          "from": "\\[\\[Immobilized\\]\\]",
          "to": "immobilized",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 12256,
    "name": "Ooze Ammunition (Moderate)",
    "uuid": "2033114112023663",
    "source": 16,
    "level": 6,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4433",
      "book": "Treasure Vault",
      "page": "43"
    },
    "description": {
      "before": "95e7899d93a59964f0a80fc712a5a2e3",
      "after": "c7809b11943560dc8c4bc2676cd15a1e",
      "before_text": "**Ammunition** any\n\n**Activate** 1 Interact\n\nOoze ammunition is a capsule containing a sticky substance. If you hit a creature with activated ooze ammunition, it deals acid damage instead of its normal damage type, and the creature then takes a -10-foot penalty to Speed and 2d4 persistent,acid damage until it ends the effects. On a critical hit, the creature is \\[\\[Immobilized\\]\\] for 1 round in addition to the other effects. The target can end the effects by \\[\\[Escape\\]\\]{Escaping} (DC 20) the sticky foam. Other creatures can provide the actions, although doing so deals half the ammunition's persistent acid damage to the assisting creature. A creature that ends the effect still takes the persistent damage that turn.\n\n\\[\\[Effect: Ooze Ammunition (Moderate)\\]\\]",
      "replacements": [
        {
          "from": "\\[\\[Immobilized\\]\\]",
          "to": "immobilized",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 12263,
    "name": "Pale Fade",
    "uuid": "5948113490346242",
    "source": 16,
    "level": 19,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4543",
      "book": "Treasure Vault",
      "page": "70"
    },
    "description": {
      "before": "6f9117113cdeaae4f5c5b3b5d5bce43b",
      "after": "f8cfb461143575eda2b921ae89378f5f",
      "before_text": "**Activate** 2 Interact\n\nPale fade is a white ointment with a sharp, earthy scent. The poison rapidly desiccates flesh, which then crumbles and forms a cloud of pallid dust. If the victim is \\[\\[Concealed\\]\\] by this poison, then the cloud of dust also conceals other creatures from the victim.\n\n**Saving Throw** Fortitude 42\n\n**Maximum Duration** 6 rounds\n\n**Stage 1** 10d6 poison and \\[\\[Drained\\]\\]{Drained 1} (1 round)\n\n**Stage 2** 12d6 poison, drained 1, and concealed (1 round)\n\n**Stage 3** 15d6 poison, drained 1, and concealed (1 round)",
      "replacements": [
        {
          "from": "\\[\\[Concealed\\]\\]",
          "to": "concealed",
          "count": 1
        },
        {
          "from": "\\[\\[Drained\\]\\]{Drained 1}",
          "to": "drained 1",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 12266,
    "name": "Perfected Robes",
    "uuid": "3737331301044921",
    "source": 16,
    "level": 22,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4893",
      "book": "Treasure Vault",
      "page": "179"
    },
    "description": {
      "before": "a578b6f4580ca44e9ec3b99e892895a3",
      "after": "7225165fd3980bdfa99f85fe9678796a",
      "before_text": "These unadorned white robes, fastened with simple brass pins in the shape of a human hand, can't be soiled or blemished. While wearing _perfected robes_, you don't need to eat, sleep, or drink, but you can if you choose to. The robes bless you with constant \\[\\[Truesight\\]\\] (+32 counteract bonus). A creature who dons these robes without earning them is \\[\\[Clumsy\\]\\]{Clumsy 3}, \\[\\[Enfeebled\\]\\]{Enfeebled 3}, and \\[\\[Stupefied\\]\\]{Stupefied 3} while wearing them, gaining the true seeing but otherwise unable to use the robes' magic.\n\n**Activate** F envision\n\n**Effect** If your next action is to attempt a d20 roll with which you have legendary proficiency, roll twice and take the better result. This is a fortune effect.\n\n**Activate** 2 command, envision\n\n**Effect** You cast \\[\\[Avatar\\]\\], gaining the abilities for Irori.\n\n**Destruction** If the wearer ever willingly turns from the path of self-perfection into corruption or overindulgence, their _perfected robes_ crumble to nothing.",
      "replacements": [
        {
          "from": "\\[\\[Clumsy\\]\\]{Clumsy 3}",
          "to": "clumsy 3",
          "count": 1
        },
        {
          "from": "\\[\\[Enfeebled\\]\\]{Enfeebled 3}",
          "to": "enfeebled 3",
          "count": 1
        },
        {
          "from": "\\[\\[Stupefied\\]\\]{Stupefied 3}",
          "to": "stupefied 3",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 12284,
    "name": "Poison Fizz (Greater)",
    "uuid": "4708729184163253",
    "source": 16,
    "level": 15,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4459",
      "book": "Treasure Vault",
      "page": "50"
    },
    "description": {
      "before": "02744d2fec5c6542be2cb8cd81eaa02a",
      "after": "2ef70edb969449ea4ec28a00d532093f",
      "before_text": "**Activate** 1 Interact\n\nMade from a special mixture of honey and alchemical reagents, poison fizz is a zesty, sweet rock candy that pops and crackles in your mouth. For 1 hour, you have a +3 item bonus to saving throws against poison and being petrified.\n\n**Secondary Effect** 2 (poison)\n\n**Effect** You bite the poison fizz to release its poisonous liquid center and spray green mist in a 15-foot cone. This deals 5d6 poison with a Reflex 34|basic:true|traits:poison. A creature that critically fails is also \\[\\[Blinded\\]\\] until the end of your next turn and is then temporarily immune to being blinded by poison fizz for 1 hour.\n\n\\[\\[Effect: Poison Fizz (Greater)\\]\\]",
      "replacements": [
        {
          "from": "\\[\\[Blinded\\]\\]",
          "to": "blinded",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 12286,
    "name": "Poison Fizz (Moderate)",
    "uuid": "926755848108420",
    "source": 16,
    "level": 12,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4459",
      "book": "Treasure Vault",
      "page": "50"
    },
    "description": {
      "before": "b495606d63e26c3b489348a53b1ac8a6",
      "after": "142a1adec7caffb9ee046c72fb4fa279",
      "before_text": "**Activate** 1 Interact\n\nMade from a special mixture of honey and alchemical reagents, poison fizz is a zesty, sweet rock candy that pops and crackles in your mouth. For 1 hour, you have a +2 item bonus to saving throws against poison and being petrified.\n\n**Secondary Effect** 2 (poison)\n\n**Effect** You bite the poison fizz to release its poisonous liquid center and spray green mist in a 15-foot cone. This deals 4d6 poison with a Reflex 29|basic:true|traits:poison. A creature that critically fails is also \\[\\[Blinded\\]\\] until the end of your next turn and is then temporarily immune to being blinded by poison fizz for 1 hour.\n\n\\[\\[Effect: Poison Fizz\\]\\]",
      "replacements": [
        {
          "from": "\\[\\[Blinded\\]\\]",
          "to": "blinded",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 12299,
    "name": "Pummel-Growth Toxin",
    "uuid": "1501044049068081",
    "source": 16,
    "level": 13,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4544",
      "book": "Treasure Vault",
      "page": "70"
    },
    "description": {
      "before": "b7423802135019e171dfbbc8f2825c43",
      "after": "503eea162a14df1f1441e7bd2e03e185",
      "before_text": "**Activate** 2 Interact\n\nThis substance is the result of a failed alchemical experiment to regrow a severed arm. An extra outsized, uncontrolled limb of the sort used for manipulation grows from the victim's body. The limb initially flails about, throwing the creature off-balance. Once it \"matures,\" the limb pummels the victim instead. The limb can't deal its bludgeoning damage if the victim is unable to take actions. Upon recovery from the poison, the extra limb withers and falls off.\n\n**Saving Throw** Fortitude 32\n\n**Maximum Duration** 6 rounds\n\n**Stage 1** 4d6 poison, \\[\\[Clumsy\\]\\]{Clumsy 1}, and must succeed at a Flat 5 to perform an action with the manipulate trait or the action fails and is lost (1 round)\n\n**Stage 2** 4d6 poison, clumsy 1, \\[\\[Slowed\\]\\]{Slowed 1}, 2d6 bludgeoning (1 round)\n\n**Stage 3** 4d6 poison, \\[\\[Clumsy\\]\\]{Clumsy 2}, \\[\\[Slowed\\]\\]{Slowed 2}, 4d6 bludgeoning (1 round)",
      "replacements": [
        {
          "from": "\\[\\[Clumsy\\]\\]{Clumsy 1}",
          "to": "clumsy 1",
          "count": 1
        },
        {
          "from": "\\[\\[Slowed\\]\\]{Slowed 1}",
          "to": "slowed 1",
          "count": 1
        },
        {
          "from": "\\[\\[Clumsy\\]\\]{Clumsy 2}",
          "to": "clumsy 2",
          "count": 1
        },
        {
          "from": "\\[\\[Slowed\\]\\]{Slowed 2}",
          "to": "slowed 2",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 12315,
    "name": "Rebirth Potion",
    "uuid": "636933431291160",
    "source": 16,
    "level": 9,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4623",
      "book": "Treasure Vault",
      "page": "90"
    },
    "description": {
      "before": "9702506c988b9dc0e34ef822d705561a",
      "after": "2f3e172f66199b370909d078ddd9fd3e",
      "before_text": "**Activate** 1 Interact\n\nA small bit from a humanoid—such as a hair, scale, or feather—steeps in the clear liquid of a rebirth potion. When the potion is created, this bit determines the ancestry and heritage the potion changes the imbiber to. After you drink the potion, you transform into that ancestry over 8 hours during your next period of rest, finishing the transformation after the 8 hours are up. Throughout this time, you are \\[\\[Clumsy\\]\\]{Clumsy 2}, \\[\\[Enfeebled\\]\\]{Enfeebled 2}, and \\[\\[Stupefied\\]\\]{Stupefied 2}. Once the transformation is complete, the potion's magic ends and can't be counteracted. Replace your ancestry Hit Points, size, Speeds, ability boosts, ability flaws, traits, and special abilities with those of your new ancestry. You lose your ancestry feats, selecting replacements valid for your new ancestry. You have mild control over the change, but you end up with a unique appearance fitting for your new ancestry, and some quirks of your body remain, such as relative age, general health, scars, and missing digits, limbs, or organs.\n\nDrinking a rebirth potion of your current ancestry works normally, allowing you to rearrange some of the cited ancestry elements and change your appearance (provided you abide by the potion's limitations regarding health and age).",
      "replacements": [
        {
          "from": "\\[\\[Clumsy\\]\\]{Clumsy 2}",
          "to": "clumsy 2",
          "count": 1
        },
        {
          "from": "\\[\\[Enfeebled\\]\\]{Enfeebled 2}",
          "to": "enfeebled 2",
          "count": 1
        },
        {
          "from": "\\[\\[Stupefied\\]\\]{Stupefied 2}",
          "to": "stupefied 2",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 12331,
    "name": "Revealing Mist (Greater)",
    "uuid": "8342823743295041",
    "source": 16,
    "level": 7,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4476",
      "book": "Treasure Vault",
      "page": "55"
    },
    "description": {
      "before": "cc19a74734ff589546f2a5921f7cd4ab",
      "after": "19d88135e1a4e14c6ae1f8cd9f545949",
      "before_text": "**Activate** 1 Interact\n\nKept in an airtight spray bottle, revealing mist is an alchemical concoction that creates a sticky and clinging mist of chemicals in a 30-foot cone when sprayed. It doesn't affect visibility but causes \\[\\[Invisible\\]\\] creatures in the area to be \\[\\[Concealed\\]\\] rather than undetected. Revealing mist is ineffective in water or in areas with other factors affecting the spread of the mist, as determined by the GM. It remains in the area for 1 minute or until any significant wind disperses it, whichever comes first.",
      "replacements": [
        {
          "from": "\\[\\[Invisible\\]\\]",
          "to": "invisible",
          "count": 1
        },
        {
          "from": "\\[\\[Concealed\\]\\]",
          "to": "concealed",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 12332,
    "name": "Revealing Mist (Lesser)",
    "uuid": "5040957997987194",
    "source": 16,
    "level": 3,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4476",
      "book": "Treasure Vault",
      "page": "55"
    },
    "description": {
      "before": "5504b99ad406fd52ad394acb21349426",
      "after": "d92ba49efe7e5b3701fc0ee02b81dd71",
      "before_text": "**Activate** 1 Interact\n\nKept in an airtight spray bottle, revealing mist is an alchemical concoction that creates a sticky and clinging mist of chemicals in a 15-foot cone when sprayed. It doesn't affect visibility but causes \\[\\[Invisible\\]\\] creatures in the area to be \\[\\[Concealed\\]\\] rather than undetected. Revealing mist is ineffective in water or in areas with other factors affecting the spread of the mist, as determined by the GM. It remains in the area for 1 minute or until any significant wind disperses it, whichever comes first.",
      "replacements": [
        {
          "from": "\\[\\[Invisible\\]\\]",
          "to": "invisible",
          "count": 1
        },
        {
          "from": "\\[\\[Concealed\\]\\]",
          "to": "concealed",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 12341,
    "name": "Roaring Potion (Greater)",
    "uuid": "1565096681194645",
    "source": 16,
    "level": 18,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4624",
      "book": "Treasure Vault",
      "page": "90"
    },
    "description": {
      "before": "a61ee451673d4d807089e3e74676abc0",
      "after": "ae936519726d90ae18f0e8df03f1d1ad",
      "before_text": "**Activate** 1 Interact\n\nRipples move constantly through a roaring potion, a cloudy liquid that growls when you open its container. Drinking it gives you access to two other activations for 1 hour.\n\n**Activate** 1 envision\n\n**Effect** You gain the effects of a 7th-rank \\[\\[Bullhorn\\]\\] spell. You can Dismiss the activation.\n\n**Activate** 1 envision\n\n**Effect** You emit a scream in a 15-foot cone that deals @Damage\\[10d4\\[sonic\\]|traits:area-damage\\]. Each creature in the area can attempt a Fortitude 38 saving throw.\n\n**Critical Success** The creature is unaffected.\n\n**Success** The creature takes half damage.\n\n**Failure** The creature takes full damage and is \\[\\[Frightened\\]\\]{Frightened 1}.\n\n**Critical Failure** The creature takes double damage and is \\[\\[Frightened\\]\\]{Frightened 2}.",
      "replacements": [
        {
          "from": "\\[\\[Frightened\\]\\]{Frightened 1}",
          "to": "frightened 1",
          "count": 1
        },
        {
          "from": "\\[\\[Frightened\\]\\]{Frightened 2}",
          "to": "frightened 2",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 12342,
    "name": "Roaring Potion (Lesser)",
    "uuid": "7452246520225925",
    "source": 16,
    "level": 8,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4624",
      "book": "Treasure Vault",
      "page": "90"
    },
    "description": {
      "before": "8b9291e40388ab6d30ff748af8f7bfb4",
      "after": "ecce0e30a3015be5b38aff81234b7421",
      "before_text": "**Activate** 1 Interact\n\nRipples move constantly through a roaring potion, a cloudy liquid that growls when you open its container. Drinking it gives you access to two other activations for 1 hour.\n\n**Activate** 1 envision\n\n**Effect** You gain the effects of a \\[\\[Bullhorn\\]\\] spell. You can Dismiss the activation.\n\n**Activate** 1 envision\n\n**Effect** You emit a scream in a 15-foot cone that deals @Damage\\[4d4\\[sonic\\]|traits:area-damage\\]. Each creature in the area can attempt a Fortitude 24 saving throw.\n\n**Critical Success** The creature is unaffected.\n\n**Success** The creature takes half damage.\n\n**Failure** The creature takes full damage and is \\[\\[Frightened\\]\\]{Frightened 1}.\n\n**Critical Failure** The creature takes double damage and is \\[\\[Frightened\\]\\]{Frightened 2}.",
      "replacements": [
        {
          "from": "\\[\\[Frightened\\]\\]{Frightened 1}",
          "to": "frightened 1",
          "count": 1
        },
        {
          "from": "\\[\\[Frightened\\]\\]{Frightened 2}",
          "to": "frightened 2",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 12343,
    "name": "Roaring Potion (Moderate)",
    "uuid": "8193835860349576",
    "source": 16,
    "level": 13,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4624",
      "book": "Treasure Vault",
      "page": "90"
    },
    "description": {
      "before": "873c1100687e31148c2aa9e7fa01c397",
      "after": "b7aa0e0397009972e1360dbe75604bf8",
      "before_text": "**Activate** 1 Interact\n\nRipples move constantly through a roaring potion, a cloudy liquid that growls when you open its container. Drinking it gives you access to two other activations for 1 hour.\n\n**Activate** 1 envision\n\n**Effect** You gain the effects of a 5th-rank \\[\\[Bullhorn\\]\\] spell. You can Dismiss the activation.\n\n**Activate** 1 envision\n\n**Effect** You emit a scream in a 15-foot cone that deals @Damage\\[6d4\\[sonic\\]|traits:area-damage\\]. Each creature in the area can attempt a Fortitude 30 saving throw.\n\n**Critical Success** The creature is unaffected.\n\n**Success** The creature takes half damage.\n\n**Failure** The creature takes full damage and is \\[\\[Frightened\\]\\]{Frightened 1}.\n\n**Critical Failure** The creature takes double damage and is \\[\\[Frightened\\]\\]{Frightened 2}.",
      "replacements": [
        {
          "from": "\\[\\[Frightened\\]\\]{Frightened 1}",
          "to": "frightened 1",
          "count": 1
        },
        {
          "from": "\\[\\[Frightened\\]\\]{Frightened 2}",
          "to": "frightened 2",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 12377,
    "name": "Scale of Igroon",
    "uuid": "6953171332710115",
    "source": 16,
    "level": 21,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4894",
      "book": "Treasure Vault",
      "page": "180"
    },
    "description": {
      "before": "b242a2ea64704c433a6dff2076226b74",
      "after": "7d3c44995175bc5c2a3895210a855df0",
      "before_text": "Carved from a scale of the kaiju Igroon, this jagged shield refracts light around it in a shimmering haze. A scale of Igroon (Hardness 20, HP 160, BT 80) recovers 4 Hit Points at the start of its wielder's turn. When you \\[\\[Raise a Shield\\]\\], you can use the \\[\\[Shield Block\\]\\] reaction with the _scale of Igroon_ to block an attack or effect that deals acid, cold, electricity, fire, force, or sonic damage as well as physical damage.\n\n**Activate** 1 Interact\n\n**Effect** You angle the shield to refract light. Until the start of your next turn, you gain a +4 item bonus to Stealth checks to \\[\\[Hide\\]\\] and \\[\\[Sneak\\]\\] and can do so while observed. This bonus ends if you Activate another ability or use the Shield Block reaction.\n\n**Activate** 1 Interact\n\n**Effect** You angle the shield at a target within 60 feet, reflecting light into its eyes. It must attempt a Fortitude 42 save.\n\n**Critical Success** The target is unaffected.\n\n**Success** The target is \\[\\[Blinded\\]\\] until its next turn begins.\n\n**Failure** The target is blinded for 1 minute.\n\n**Critical Failure** The target is blinded for \\[\\[/r 2d4 #hours\\]\\]{2d4 hours}.\n\n**Activate** F Interact\n\n**Effect** You reflect the energy along a trajectory you choose. The effect travels only up to its remaining range, using its original parameters if it strikes other targets.\n\n**Destruction** If a deity, kaiju, spawn of a deity, titan, or being of similar power stomps on a scale of Igroon while in absolute darkness, the shield is destroyed permanently.",
      "replacements": [
        {
          "from": "\\[\\[Blinded\\]\\]",
          "to": "blinded",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 12379,
    "name": "Scholar's Drop",
    "uuid": "8676599844148252",
    "source": 16,
    "level": 6,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4462",
      "book": "Treasure Vault",
      "page": "50"
    },
    "description": {
      "before": "457f7f7dd65b5097b053f5d04b72abe0",
      "after": "48dfa51185c7c90fd0cf00650d654c96",
      "before_text": "University students in Katapesh first used the scholar's drop to gain an edge over their academic rivals, but the candy has since spread across Golarion. The flavor of this hard, sugar-coated candy is highly refreshing and based on lemon and green tea. For 1 hour, you gain a +1 item bonus to saving throws against effects that could render you \\[\\[Fatigued\\]\\].\n\n**Secondary Effect** 1\n\n**Effect** Ignore the effects of the fatigued condition for 10 minutes. The drop's other effects end for you, and when the 10 minutes are up, you're temporarily immune to scholar's drops for 1 hour. If you use this effect three times in a single day, you become temporarily immune to scholar's drops entirely until you get a full night's rest.",
      "replacements": [
        {
          "from": "\\[\\[Fatigued\\]\\]",
          "to": "fatigued",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 12401,
    "name": "Shatterstone (Greater)",
    "uuid": "7798780290692263",
    "source": 16,
    "level": 18,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4438",
      "book": "Treasure Vault",
      "page": "44"
    },
    "description": {
      "before": "60cad3dc60510993681d711e3f2b0046",
      "after": "a43b6d99c984ddd10a2245701956ee5b",
      "before_text": "**Activate** 1 Strike\n\nA shatterstone is a small ceramic orb, much like a thunderstone. Inside are reactive agents that set up an intense field of sonic vibration when the stone breaks. The bomb grants a +3 item bonus to attack rolls and deals 4d6 sonic damage and 4 sonic splash damage. Much of the sound is ultrasonic, and creatures with sonic weakness that take damage from the bomb must succeed at a Fortitude 40 save or be \\[\\[Deafened\\]\\] until the end of their next turn.",
      "replacements": [
        {
          "from": "\\[\\[Deafened\\]\\]",
          "to": "deafened",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 12402,
    "name": "Shatterstone",
    "uuid": "1183390171996376",
    "source": 16,
    "level": 12,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4438",
      "book": "Treasure Vault",
      "page": "44"
    },
    "description": {
      "before": "433b24d7bfb1814acb76e6c5b9ac1c48",
      "after": "e8815d090cc3afb43cd552bd170416a1",
      "before_text": "**Activate** 1 Strike\n\nA shatterstone is a small ceramic orb, much like a thunderstone. Inside are reactive agents that set up an intense field of sonic vibration when the stone breaks. The bomb grants a +2 item bonus to attack rolls and deals 3d6 sonic damage and 3 sonic splash damage. Much of the sound is ultrasonic, and creatures with sonic weakness that take damage from the bomb must succeed at a Fortitude 30 save or be \\[\\[Deafened\\]\\] until the end of their next turn.",
      "replacements": [
        {
          "from": "\\[\\[Deafened\\]\\]",
          "to": "deafened",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 12410,
    "name": "Skinsaw Mask",
    "uuid": "8304668112940097",
    "source": 16,
    "level": 3,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4886",
      "book": "Treasure Vault",
      "page": "155"
    },
    "description": {
      "before": "bc9ef2d5e3416766ee077e482994bed7",
      "after": "c25896a21e45467db66d37f2d13c8aa1",
      "before_text": "A patchwork of humanoid flesh makes up a _skinsaw mask_, which is stitched together with black silk or wire. It is distinctive for its bulbous orange eye- crafted from a magical glass bauble-and wide row of teeth. When worn, the mask amplifies your ability to sense fear in other creatures. You know the value of the \\[\\[Frightened\\]\\] condition of any \\[\\[Observed\\]\\] creature, and you gain a +1 item bonus to Perception checks to \\[\\[Seek\\]\\] frightened creatures. Whenever you deal precision damage to a frightened creature, you deal 1 additional precision damage. If you are not evil, you are \\[\\[Drained\\]\\]{Drained 2} while wearing the _skinsaw mask_.",
      "replacements": [
        {
          "from": "\\[\\[Frightened\\]\\]",
          "to": "frightened",
          "count": 1
        },
        {
          "from": "\\[\\[Observed\\]\\]",
          "to": "observed",
          "count": 1
        },
        {
          "from": "\\[\\[Drained\\]\\]{Drained 2}",
          "to": "drained 2",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 12411,
    "name": "Skittering Mask (Greater)",
    "uuid": "2984523373022883",
    "source": 16,
    "level": 8,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4887",
      "book": "Treasure Vault",
      "page": "155"
    },
    "description": {
      "before": "e974c49e9c4f765e71a5effbae8248ac",
      "after": "3d1fb8adc999a3d4158c573a95fc2dd9",
      "before_text": "A _skittering mask_ is a hand-carved, wooden, full-head mask that sports several holes along each side of the face. The first time each day that you begin your turn unconscious and within 25 feet of an enemy, metallic insect legs emerge from the holes in the mask and Step 15 feet away from the nearest enemy, dragging your body along with the mask. For 1 minute, each time you begin your turn unconscious and within 25 feet of an enemy, the mask Steps 15 feet away from the nearest enemy again. An ally can signal the mask with a single action, which has the auditory and concentrate traits. If the mask hears the signal, it attempts to move you towards that ally when it Steps away from the nearest enemy.\n\nIf more than one enemy is equidistant, the mask Steps away from one of them at random. The mask possesses no special senses and does not react to \\[\\[Hidden\\]\\] or \\[\\[Undetected\\]\\] enemies, nor can it distinguish that a creature not acting openly hostile is an enemy.",
      "replacements": [
        {
          "from": "\\[\\[Hidden\\]\\]",
          "to": "hidden",
          "count": 1
        },
        {
          "from": "\\[\\[Undetected\\]\\]",
          "to": "undetected",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 12412,
    "name": "Skittering Mask",
    "uuid": "1312629449489689",
    "source": 16,
    "level": 2,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4887",
      "book": "Treasure Vault",
      "page": "155"
    },
    "description": {
      "before": "8c568b7a6b964c9da8e6d9e113a8fe56",
      "after": "88f3dc8ef68f04ea6b3c71c753ebfd60",
      "before_text": "A _skittering mask_ is a hand-carved, wooden, full-head mask that sports several holes along each side of the face. The first time each day that you begin your turn unconscious and within 25 feet of an enemy, skittering metallic insect legs emerge from the holes in the mask and Step 5 feet away from the nearest enemy, dragging your body along with the mask. If more than one enemy is equidistant, the mask Steps away from one of them at random. The mask possesses no special senses and does not react to \\[\\[Hidden\\]\\] or \\[\\[Undetected\\]\\] enemies, nor can it distinguish that a creature not acting openly hostile is an enemy.",
      "replacements": [
        {
          "from": "\\[\\[Hidden\\]\\]",
          "to": "hidden",
          "count": 1
        },
        {
          "from": "\\[\\[Undetected\\]\\]",
          "to": "undetected",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 12413,
    "name": "Skunk Bomb (Greater)",
    "uuid": "6925434332775559",
    "source": 16,
    "level": 11,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4439",
      "book": "Treasure Vault",
      "page": "45"
    },
    "description": {
      "before": "a3f043bf667ecaea6dad0182c28f8f0c",
      "after": "8918528836e0782b5430bcb8bae20976",
      "before_text": "**Activate** 1 Strike\n\nSkunk bombs are made from the concentrated odors of xulgaths, hezrous, and other creatures with natural or supernatural stench. The bomb grants a +2 item bonus to attack rolls and deals 3d4 poison damage and 3 poison splash damage. Any creature hit by the bomb or in its splash area must attempt a Fortitude 28 saving throw. Creatures in the splash area treat the results of their saving throw as one step better.\n\n**Critical Success** The target is unaffected.\n\n**Success** The target is \\[\\[Sickened\\]\\]{Sickened 1}.\n\n**Failure** The target is sickened 1 and \\[\\[Slowed\\]\\]{Slowed 1} while sickened.\n\n**Critical Failure** The target is \\[\\[Blinded\\]\\] for 1 round, \\[\\[Sickened\\]\\]{Sickened 2}, and slowed 1 while sickened.\n\nCreatures sickened by the bomb emit an odor that lasts 10 minutes after the sickened condition ends (or 1 hour if they were also blinded). The odor can be removed or neutralized by using prestidigitation or similar magic or by spending 10 minutes scrubbing with ample soap and water. While the odor lasts, creatures within 30 feet can smell the target, enabling even those with a weak sense of smell to detect its presence, and all creatures gain a +1 item bonus to \\[\\[Track\\]\\] the affected creature for as long as it has the odor. A creature that has imprecise or precise scent doubles the range at which it can detect the target using this scent.",
      "replacements": [
        {
          "from": "\\[\\[Sickened\\]\\]{Sickened 1}",
          "to": "sickened 1",
          "count": 1
        },
        {
          "from": "\\[\\[Slowed\\]\\]{Slowed 1}",
          "to": "slowed 1",
          "count": 1
        },
        {
          "from": "\\[\\[Blinded\\]\\]",
          "to": "blinded",
          "count": 1
        },
        {
          "from": "\\[\\[Sickened\\]\\]{Sickened 2}",
          "to": "sickened 2",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 12414,
    "name": "Skunk Bomb (Lesser)",
    "uuid": "5115852800833693",
    "source": 16,
    "level": 1,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4439",
      "book": "Treasure Vault",
      "page": "45"
    },
    "description": {
      "before": "1098ee465629ee1f251a3d8daf7e6ff6",
      "after": "db3831d8ed219731a064dffd8d7f1492",
      "before_text": "**Activate** 1 Strike\n\nSkunk bombs are made from the concentrated odors of xulgaths, hezrous, and other creatures with natural or supernatural stench. The bomb deals 1d4 poison damage and 1 poison splash damage. Any creature hit by the bomb or in its splash area must attempt a Fortitude 15 saving throw. Creatures in the splash area treat the results of their saving throw as one step better.\n\n**Critical Success** The target is unaffected.\n\n**Success** The target is \\[\\[Sickened\\]\\]{Sickened 1}.\n\n**Failure** The target is sickened 1 and \\[\\[Slowed\\]\\]{Slowed 1} while sickened.\n\n**Critical Failure** The target is \\[\\[Blinded\\]\\] for 1 round, \\[\\[Sickened\\]\\]{Sickened 2}, and slowed 1 while sickened.\n\nCreatures sickened by the bomb emit an odor that lasts 10 minutes after the sickened condition ends (or 1 hour if they were also blinded). The odor can be removed or neutralized by using prestidigitation or similar magic or by spending 10 minutes scrubbing with ample soap and water. While the odor lasts, creatures within 30 feet can smell the target, enabling even those with a weak sense of smell to detect its presence, and all creatures gain a +1 item bonus to \\[\\[Track\\]\\] the affected creature for as long as it has the odor. A creature that has imprecise or precise scent doubles the range at which it can detect the target using this scent.",
      "replacements": [
        {
          "from": "\\[\\[Sickened\\]\\]{Sickened 1}",
          "to": "sickened 1",
          "count": 1
        },
        {
          "from": "\\[\\[Slowed\\]\\]{Slowed 1}",
          "to": "slowed 1",
          "count": 1
        },
        {
          "from": "\\[\\[Blinded\\]\\]",
          "to": "blinded",
          "count": 1
        },
        {
          "from": "\\[\\[Sickened\\]\\]{Sickened 2}",
          "to": "sickened 2",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 12415,
    "name": "Skunk Bomb (Major)",
    "uuid": "5225244616013789",
    "source": 16,
    "level": 17,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4439",
      "book": "Treasure Vault",
      "page": "45"
    },
    "description": {
      "before": "e05cf8a2b9a38124f7dfb6848d843baa",
      "after": "2ff2c4442aad3911e3a96240c79ebd3d",
      "before_text": "**Activate** 1 Strike\n\nSkunk bombs are made from the concentrated odors of xulgaths, hezrous, and other creatures with natural or supernatural stench. The bomb grants a +3 item bonus to attack rolls and deals 4d4 poison damage and 4 poison splash damage. Any creature hit by the bomb or in its splash area must attempt a Fortitude 37 saving throw. Creatures in the splash area treat the results of their saving throw as one step better.\n\n**Critical Success** The target is unaffected.\n\n**Success** The target is \\[\\[Sickened\\]\\]{Sickened 1}.\n\n**Failure** The target is sickened 1 and \\[\\[Slowed\\]\\]{Slowed 1} while sickened.\n\n**Critical Failure** The target is \\[\\[Blinded\\]\\] for 1 round, \\[\\[Sickened\\]\\]{Sickened 2}, and slowed 1 while sickened.\n\nCreatures sickened by the bomb emit an odor that lasts 10 minutes after the sickened condition ends (or 1 hour if they were also blinded). The odor can be removed or neutralized by using prestidigitation or similar magic or by spending 10 minutes scrubbing with ample soap and water. While the odor lasts, creatures within 30 feet can smell the target, enabling even those with a weak sense of smell to detect its presence, and all creatures gain a +1 item bonus to \\[\\[Track\\]\\] the affected creature for as long as it has the odor. A creature that has imprecise or precise scent doubles the range at which it can detect the target using this scent.",
      "replacements": [
        {
          "from": "\\[\\[Sickened\\]\\]{Sickened 1}",
          "to": "sickened 1",
          "count": 1
        },
        {
          "from": "\\[\\[Slowed\\]\\]{Slowed 1}",
          "to": "slowed 1",
          "count": 1
        },
        {
          "from": "\\[\\[Blinded\\]\\]",
          "to": "blinded",
          "count": 1
        },
        {
          "from": "\\[\\[Sickened\\]\\]{Sickened 2}",
          "to": "sickened 2",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 12416,
    "name": "Skunk Bomb (Moderate)",
    "uuid": "1361105339584093",
    "source": 16,
    "level": 3,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4439",
      "book": "Treasure Vault",
      "page": "45"
    },
    "description": {
      "before": "43c99f8f3df748f075ff64aaea9821c7",
      "after": "b2bf0c52cbfcd2ae229e885d90046b7b",
      "before_text": "**Activate** 1 Strike\n\nSkunk bombs are made from the concentrated odors of xulgaths, hezrous, and other creatures with natural or supernatural stench. The bomb grants a +1 item bonus to attack rolls and deals 2d4 poison damage and 2 poison splash damage. Any creature hit by the bomb or in its splash area must attempt a Fortitude 17 saving throw. Creatures in the splash area treat the results of their saving throw as one step better.\n\n**Critical Success** The target is unaffected.\n\n**Success** The target is \\[\\[Sickened\\]\\]{Sickened 1}.\n\n**Failure** The target is sickened 1 and \\[\\[Slowed\\]\\]{Slowed 1} while sickened.\n\n**Critical Failure** The target is \\[\\[Blinded\\]\\] for 1 round, \\[\\[Sickened\\]\\]{Sickened 2}, and slowed 1 while sickened.\n\nCreatures sickened by the bomb emit an odor that lasts 10 minutes after the sickened condition ends (or 1 hour if they were also blinded). The odor can be removed or neutralized by using prestidigitation or similar magic or by spending 10 minutes scrubbing with ample soap and water. While the odor lasts, creatures within 30 feet can smell the target, enabling even those with a weak sense of smell to detect its presence, and all creatures gain a +1 item bonus to \\[\\[Track\\]\\] the affected creature for as long as it has the odor. A creature that has imprecise or precise scent doubles the range at which it can detect the target using this scent.",
      "replacements": [
        {
          "from": "\\[\\[Sickened\\]\\]{Sickened 1}",
          "to": "sickened 1",
          "count": 1
        },
        {
          "from": "\\[\\[Slowed\\]\\]{Slowed 1}",
          "to": "slowed 1",
          "count": 1
        },
        {
          "from": "\\[\\[Blinded\\]\\]",
          "to": "blinded",
          "count": 1
        },
        {
          "from": "\\[\\[Sickened\\]\\]{Sickened 2}",
          "to": "sickened 2",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 12418,
    "name": "Smother Shroud",
    "uuid": "4607545521624809",
    "source": 16,
    "level": 7,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4547",
      "book": "Treasure Vault",
      "page": "70"
    },
    "description": {
      "before": "5b3dd4a72c1e7095ecbde9e03a28ace8",
      "after": "5c948bcccddd34c140990206d3bdc0d6",
      "before_text": "**Activate** 2 Interact\n\nSmother shroud robs a victim of distinguishing features, making it difficult for anyone to identify the corpse. Swelling and distention of facial features makes the victim unrecognizable. Increase the DC of any checks made to identify a creature under the effects of smother shroud by twice the stage of the poison. If the victim dies while under the effects of this poison, its corpse retains an inability to take actions with the auditory trait, and if it tries to speak and fails, it counts against responses to the talking corpse spell.\n\n**Saving Throw** Fortitude 22\n\n**Maximum Duration** 10 rounds\n\n**Stage 1** 2d4 poison and \\[\\[Dazzled\\]\\] (1 round)\n\n**Stage 2** 3d4 poison, dazzled, a –4 status penalty to Perception checks to hear and smell, and must succeed at a Flat 10 to take actions with the auditory trait or the action is lost (1 round)\n\n**Stage 3** 4d4 poison, \\[\\[Blinded\\]\\], \\[\\[Deafened\\]\\], unable to smell, unable to take actions with the auditory trait, and unable to breathe",
      "replacements": [
        {
          "from": "\\[\\[Dazzled\\]\\]",
          "to": "dazzled",
          "count": 1
        },
        {
          "from": "\\[\\[Blinded\\]\\]",
          "to": "blinded",
          "count": 1
        },
        {
          "from": "\\[\\[Deafened\\]\\]",
          "to": "deafened",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 12468,
    "name": "Spurned Lute",
    "uuid": "6523838997023638",
    "source": 16,
    "level": 5,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4918",
      "book": "Treasure Vault",
      "page": "193"
    },
    "description": {
      "before": "5c01965f1c2853412ac8fac40aaa1520",
      "after": "975a4f57a6cfe8df2a30d20f2e6d401d",
      "before_text": "Made of a deep-brown rosewood, a spurned lute is adorned with carved flowers. The lute appears to be and functions as a virtuoso instrument. (Other spurned instruments exist, but the lute is the least rare.) This lute has a jealous streak, demanding total loyalty from its \"partner\" musician. After you play the lute for the first time, it fuses to you. If you go a day without using it to \\[\\[Perform\\]\\], you become \\[\\[Stupefied\\]\\]{Stupefied 1} until you next do so. After that, when you attempt a Performance check using an instrument other than the lute, you take a –4 circumstance penalty to do so, and you must succeed at a Will 20 save or become stupefied 1 for 1 minute.",
      "replacements": [
        {
          "from": "\\[\\[Stupefied\\]\\]{Stupefied 1}",
          "to": "stupefied 1",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 12482,
    "name": "Stage Fright Missive",
    "uuid": "5475751053637342",
    "source": 16,
    "level": 5,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4599",
      "book": "Treasure Vault",
      "page": "85"
    },
    "description": {
      "before": "baf1f0a34176554810e5b0e9a9fd07f0",
      "after": "608deb92d7a0f18c21cc4373e2e11e65",
      "before_text": "**Activate** 2 envision, Interact\n\nComposing a stage fright missive usually involves creating a scathing review, insulting letter, or embarrassing image that ridicules the recipient. The activating creature must succeed at a Will 20 save or be overcome with embarrassment for 1 hour, taking a –1 status penalty to Deception, Diplomacy, Intimidation, and Performance checks. During this time, if the creature attempts to speak or perform in front of an audience, they become \\[\\[Sickened\\]\\]{Sickened 1}. When they recover from this sickened condition, the missive's effects end. You choose when composing the missive whether it remains as a non-magical document or burns to ash after imparting its magic.",
      "replacements": [
        {
          "from": "\\[\\[Sickened\\]\\]{Sickened 1}",
          "to": "sickened 1",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 12487,
    "name": "Staring Skull",
    "uuid": "3535368526839412",
    "source": 16,
    "level": 8,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4751",
      "book": "Treasure Vault",
      "page": "122"
    },
    "description": {
      "before": "5af4de9e397b3cac78fd932fa68de346",
      "after": "3e49d76dfc14286dd860c3f3e67382fd",
      "before_text": "This tattoo usually depicts a humanoid skull with staring eyes in its sockets, but any creature with two eyes and a skull is possible, such as a wolf, phoenix, or psychopomp. When your \\[\\[Dying\\]\\] condition increases to a value that would kill you, this tattoo reduces your dying value to 1 fewer than would kill you. If a death effect would kill you—provided the effect is from a creature of 8th level or lower or a spell of 4th level or lower—this tattoo activates and keeps you alive instead. You can benefit from this ability only once per day. Each time the tattoo prevents you from dying, one of its eyes disappears, the image now featuring either an empty socket or an eyepatch or other covering. After both eyes vanish, the tattoo becomes non-magical and no longer protects you. If you receive a new _staring skull_ tattoo, any other you have loses its staring eyes and becomes non-magical.",
      "replacements": [
        {
          "from": "\\[\\[Dying\\]\\]",
          "to": "dying",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 12493,
    "name": "Stumbling Fulu",
    "uuid": "4801839758949704",
    "source": 16,
    "level": 3,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4576",
      "book": "Treasure Vault",
      "page": "79"
    },
    "description": {
      "before": "153adf29d79867a4820128224466f224",
      "after": "a943c39d94c9d990b2c0419731b1cd37",
      "before_text": "**Duration** 1 hour\n\nThe kitsune who first created a _stumbling fulu_ advised the user to tuck the fulu under the target's belt for maximum effect. When the creature to which the fulu is affixed completes a Stride action, the creature must attempt a Reflex 17 save. On a failure, some element of the armor the fulu is affixed to comes undone, making the wearer \\[\\[Clumsy\\]\\]{Clumsy 1}. On a critical failure, the target falls \\[\\[Prone\\]\\] and is \\[\\[Clumsy\\]\\]{Clumsy 2}. The clumsy condition remains until the target takes a total of 1 Interact action, plus 1 additional Interact action per value of the clumsy condition above 1, to properly reclothe itself. Once the fulu activates, it burns up, its magic lasting only as long as the conditions it has imposed.",
      "replacements": [
        {
          "from": "\\[\\[Clumsy\\]\\]{Clumsy 1}",
          "to": "clumsy 1",
          "count": 1
        },
        {
          "from": "\\[\\[Prone\\]\\]",
          "to": "prone",
          "count": 1
        },
        {
          "from": "\\[\\[Clumsy\\]\\]{Clumsy 2}",
          "to": "clumsy 2",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 12496,
    "name": "Sun Dazzler",
    "uuid": "4964329723781549",
    "source": 16,
    "level": 8,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4517",
      "book": "Treasure Vault",
      "page": "65"
    },
    "description": {
      "before": "09f5d0278fcd51f33e9317bfa83c2912",
      "after": "47db1a6ce845e94a19bff1081bae0e1e",
      "before_text": "**Activate** 1 Interact\n\nThis metallic tube has a complex array of lenses and prisms at one end and a hatch at the other. The hatch can be unlocked, loaded with a \\[\\[Glow Rod\\]\\]{Sunrod}, and refastened using 3 Interact actions. A loaded sun dazzler can be activated to burn the sunrod to dust in a single focused flash, creating a 30-foot cone of scintillating light. All creatures in the cone must attempt a Fortitude 24 save, with the following effects.\n\n**Critical Success** The creature is unaffected.\n\n**Success** The creature is \\[\\[Dazzled\\]\\] for 1 round.\n\n**Failure** The creature is \\[\\[Blinded\\]\\] for 1 round or until it spends an Interact action to rub its eyes, ending the blinded condition.\n\n**Critical Failure** The creature is blinded for 1 round.",
      "replacements": [
        {
          "from": "\\[\\[Dazzled\\]\\]",
          "to": "dazzled",
          "count": 1
        },
        {
          "from": "\\[\\[Blinded\\]\\]",
          "to": "blinded",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 12498,
    "name": "Sure-Step Crampons",
    "uuid": "1982910621943248",
    "source": 16,
    "level": 6,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4844",
      "book": "Treasure Vault",
      "page": "146"
    },
    "description": {
      "before": "610e6d3573d4fd056f0bea624412906a",
      "after": "0b07be575a7d6a577de41f5942313ce6",
      "before_text": "_Sure-step crampons_ are sturdy leather boots with warm fur lining and magically augmented steel crampons that offer the wearer purchase on even the slipperiest ice slicks. They allow you to walk across ice without difficulty, ignoring the uneven ground and difficult terrain caused by ice, and reducing greater difficult terrain caused by ice to difficult terrain.\n\n**Activate** 1 Interact\n\n**Effect** You dig the crampons into the spot where you're standing, offering additional support until the next time you move. You gain a +2 circumstance bonus to your Fortitude or Reflex DC against attempts to \\[\\[Shove\\]\\] or \\[\\[Trip\\]\\] you. This bonus also applies to saving throws against spells or effects that attempt to move you or knock you \\[\\[Prone\\]\\]. The bonus lasts until you move from your current spot.",
      "replacements": [
        {
          "from": "\\[\\[Prone\\]\\]",
          "to": "prone",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 12509,
    "name": "Taster's Folly",
    "uuid": "1725921262650474",
    "source": 16,
    "level": 4,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4550",
      "book": "Treasure Vault",
      "page": "71"
    },
    "description": {
      "before": "43233c691d7e178ecfba53915e237948",
      "after": "59b096d660415c493c7de9be5c0b135d",
      "before_text": "**Activate** 1 Interact\n\nDevised to bypass detection, a dose of taster's folly consists of two compounds that aren't mixed but placed in the contents of one meal. Each compound is harmless on its own. The DC to Recall Knowledge about this poison from one of its components is 23 and attempts to use magic to detect the unmixed components require a successful DC 23 counteract check. The onset period begins only if a victim consumes both compounds during the same hour. If the two compounds mix prior to consumption, they become toxic and are detectable as such. The sickened condition can't be ended until the poison's effects end.\n\n**Saving Throw** Fortitude 21\n\n**Onset** 10 minutes\n\n**Maximum Duration** 6 minutes\n\n**Stage 1** 2d4 poison (1 minute)\n\n**Stage 2** 3d4 poison and \\[\\[Sickened\\]\\]{Sickened 1} (1 minute)\n\n**Stage 3** 4d4 poison and sickened 1 (1 minute)",
      "replacements": [
        {
          "from": "\\[\\[Sickened\\]\\]{Sickened 1}",
          "to": "sickened 1",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 12514,
    "name": "Tattletale Orb (Selenite)",
    "uuid": "483346499495579",
    "source": 16,
    "level": 15,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4919",
      "book": "Treasure Vault",
      "page": "193"
    },
    "description": {
      "before": "4fb1d94de1354d7c180b147b235c4d91",
      "after": "6af1d1a8366e20275d7112835eec030b",
      "before_text": "A tattletale orb is a polished crystal sphere that appears to function as a \\[\\[Crystal Ball (Selenite)\\]\\]. If those whom you use the orb to scry on roll better than a critical failure on their saving throw, they receive a telepathic message alerting them to the scrying. A success or better at the save allows the target to choose to allow you to scry anyway, knowing they can use an aspect of the orb against you, according to the orb's type. A creature that rolls a critical success on the saving throw also learns your name and location. Once you Activate a tattletale orb or use it to cast one of your scrying spells, it fuses to you. You must succeed at a Will save, using the scrying Will DC of a crystal ball of the orb's type, to use another such device.\n\nTattletale orbs come in the same types as crystal balls, with the same activations and powers. However, your target must roll a critical failure on the saving throw for the orb to function as normal for that type of crystal ball.\n\nThe target is temporarily immune to the orb's see invisibility for 24 hours and can choose to be \\[\\[Invisible\\]\\] to the orb's scrying during that time.",
      "replacements": [
        {
          "from": "\\[\\[Invisible\\]\\]",
          "to": "invisible",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 12519,
    "name": "Theatrical Mutagen (Greater)",
    "uuid": "5304011940133327",
    "source": 16,
    "level": 11,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4501",
      "book": "Treasure Vault",
      "page": "61"
    },
    "description": {
      "before": "88f34b5babaa614fa00d2b1d5e136a94",
      "after": "40e4b68d6179100d9b4b6978fb117465",
      "before_text": "**Activate** 1 Interact\n\nDeveloped and widely used by students at the Kitharodian Academy in Oppara, the theatrical mutagen stimulates the creative centers of your brain. This causes your movements to become exaggerated and your voice to become clear. However, the erratic surges of inspiration overload your senses, making it difficult to focus on mundane tasks. This lasts for 10 minutes.\n\n**Benefit** You gain a +3 item bonus to Acrobatics checks, Crafting checks, and Performance checks. If you're untrained in any of these skills, your proficiency bonus is equal to your level instead of +0. You also gain a +10 feet status bonus to your Speed.\n\n**Drawback** You take a –1 penalty to Perception checks and Will saves. After any round where you don't spend at least 1 action to Interact with an object, \\[\\[Perform\\]\\], Step, or Stride, you're \\[\\[Off-Guard\\]\\] until the start of your next turn.\n\n\\[\\[Effect: Theatrical Mutagen (Greater)\\]\\]",
      "replacements": [
        {
          "from": "\\[\\[Off-Guard\\]\\]",
          "to": "off-guard",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 12520,
    "name": "Theatrical Mutagen (Lesser)",
    "uuid": "1232395091233440",
    "source": 16,
    "level": 1,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4501",
      "book": "Treasure Vault",
      "page": "61"
    },
    "description": {
      "before": "c2613d04a05ec2e6481e17721b55d70b",
      "after": "7baa25e216af61578a90f711af219f2c",
      "before_text": "**Activate** 1 Interact\n\nDeveloped and widely used by students at the Kitharodian Academy in Oppara, the theatrical mutagen stimulates the creative centers of your brain. This causes your movements to become exaggerated and your voice to become clear. However, the erratic surges of inspiration overload your senses, making it difficult to focus on mundane tasks. This lasts for 1 minute.\n\n**Benefit** You gain a +1 item bonus to Acrobatics checks, Crafting checks, and Performance checks. If you're untrained in any of these skills, your proficiency bonus is equal to your level instead of +0. You also gain a +5 feet status bonus to your Speed.\n\n**Drawback** You take a –1 penalty to Perception checks and Will saves. After any round where you don't spend at least 1 action to Interact with an object, \\[\\[Perform\\]\\], Step, or Stride, you're \\[\\[Off-Guard\\]\\] until the start of your next turn.\n\n\\[\\[Effect: Theatrical Mutagen (Lesser)\\]\\]",
      "replacements": [
        {
          "from": "\\[\\[Off-Guard\\]\\]",
          "to": "off-guard",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 12521,
    "name": "Theatrical Mutagen (Major)",
    "uuid": "3902366831888139",
    "source": 16,
    "level": 17,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4501",
      "book": "Treasure Vault",
      "page": "61"
    },
    "description": {
      "before": "53900630fd36d8c55cf9c14ba4089b8c",
      "after": "19d09cdf9fdcda69d486902eb2a70c1a",
      "before_text": "**Activate** 1 Interact\n\nDeveloped and widely used by students at the Kitharodian Academy in Oppara, the theatrical mutagen stimulates the creative centers of your brain. This causes your movements to become exaggerated and your voice to become clear. However, the erratic surges of inspiration overload your senses, making it difficult to focus on mundane tasks. This lasts for 1 hour.\n\nBenefit You gain a +4 item bonus to Acrobatics checks, Crafting checks, and Performance checks. If you're untrained in any of these skills, your proficiency bonus is equal to your level instead of +0. You also gain a +10 feet status bonus to your Speed.\n\nDrawback You take a –1 penalty to Perception checks and Will saves. After any round where you don't spend at least 1 action to Interact with an object, \\[\\[Perform\\]\\], Step, or Stride, you're \\[\\[Off-Guard\\]\\] until the start of your next turn.\n\n\\[\\[Effect: Theatrical Mutagen (Major)\\]\\]",
      "replacements": [
        {
          "from": "\\[\\[Off-Guard\\]\\]",
          "to": "off-guard",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 12522,
    "name": "Theatrical Mutagen (Moderate)",
    "uuid": "7378845883140605",
    "source": 16,
    "level": 3,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4501",
      "book": "Treasure Vault",
      "page": "61"
    },
    "description": {
      "before": "4020a19bec78078c37bc2fd713ae2cc0",
      "after": "f7358b6528096d7e9e75a8dfea9ac073",
      "before_text": "**Activate** 1 Interact\n\nDeveloped and widely used by students at the Kitharodian Academy in Oppara, the theatrical mutagen stimulates the creative centers of your brain. This causes your movements to become exaggerated and your voice to become clear. However, the erratic surges of inspiration overload your senses, making it difficult to focus on mundane tasks. This lasts for 1 minute.\n\n**Benefit** You gain a +2 item bonus to Acrobatics checks, Crafting checks, and Performance checks. If you're untrained in any of these skills, your proficiency bonus is equal to your level instead of +0. You also gain a +5 feet status bonus to your Speed.\n\n**Drawback** You take a –1 penalty to Perception checks and Will saves. After any round where you don't spend at least 1 action to Interact with an object, \\[\\[Perform\\]\\], Step, or Stride, you're \\[\\[Off-Guard\\]\\] until the start of your next turn.\n\n\\[\\[Effect: Theatrical Mutagen (Moderate)\\]\\]",
      "replacements": [
        {
          "from": "\\[\\[Off-Guard\\]\\]",
          "to": "off-guard",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 12533,
    "name": "Thunderblast Slippers (Greater)",
    "uuid": "2038577180803105",
    "source": 16,
    "level": 15,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4863",
      "book": "Treasure Vault",
      "page": "151"
    },
    "description": {
      "before": "c276116e889a062fac25703f45acef89",
      "after": "4871c6e279e4fd7d582d432ed202c3c1",
      "before_text": "Unassuming in appearance, these slippers indicate their nature only with a signature strip of yellow stitching. You gain a +2 item bonus to Acrobatics checks.\n\n**Activate** 2 command, envision, Interact\n\n**Effect** You move like the wind, with precision and speed. You Stride up to 120 feet; this movement doesn't trigger reactions. When you stop, if you've moved at least 30 feet from where you started, you release a thunderous 5-foot emanation that deals @Damage\\[3d6\\[bludgeoning\\],3d6\\[sonic\\]|traits:area-damage\\]{3d6 bludgeoning damage and 3d6 sonic damage} with a basic Fortitude. A creature that critically fails its save is also knocked \\[\\[Prone\\]\\].",
      "replacements": [
        {
          "from": "\\[\\[Prone\\]\\]",
          "to": "prone",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 12534,
    "name": "Thunderblast Slippers",
    "uuid": "4479008997353398",
    "source": 16,
    "level": 9,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4863",
      "book": "Treasure Vault",
      "page": "151"
    },
    "description": {
      "before": "6858848f82e14142050c706c1fbb126b",
      "after": "c07cfdf26aab3c6e410bc5cafe7fd9ef",
      "before_text": "Unassuming in appearance, these slippers indicate their nature only with a signature strip of yellow stitching. You gain a +2 item bonus to Acrobatics checks.\n\n**Activate** <abbr cost=\"TWO-ACTIONS\" class=\"action-symbol\">2</abbr> command, envision, Interact\n\n**Effect** You move like the wind, with precision and speed. You Stride up to 60 feet; this movement doesn't trigger reactions. When you stop, if you've moved at least 30 feet from where you started, you release a thunderous 5-foot emanation that deals @Damage\\[2d6\\[bludgeoning\\],2d6\\[sonic\\]|traits:area-damage\\]{2d6 bludgeoning damage and 2d6 sonic damage} with a basic Fortitude. A creature that critically fails its save is also knocked \\[\\[Prone\\]\\].",
      "replacements": [
        {
          "from": "\\[\\[Prone\\]\\]",
          "to": "prone",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 12535,
    "name": "Thundercrasher",
    "uuid": "2524622805310747",
    "source": 16,
    "level": 5,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4427",
      "book": "Treasure Vault",
      "page": "39"
    },
    "description": {
      "before": "8c8135e3826cd391500798444a576d7d",
      "after": "9a005f620359c347ab60bb00d369bf39",
      "before_text": "While looking straight down the barrel of this _+1 striking blunderbuss_, the spark gun's magical core is visible amid several reflectors. All damage dealt by a thundercrasher is sonic damage. On a critical hit, the target must succeed at a Fortitude save against your class DC or be \\[\\[Deafened\\]\\] for 1 minute.\n\n**Activate** 2 Interact\n\n**Effect** You overload the _thundercrasher_ to emit chaotic sonic frequencies that soften earth and stone. When you next fire the _thundercrasher_ it also partially liquefies any natural earth or stone surfaces within range of its scatter trait, making the area difficult terrain.",
      "replacements": [
        {
          "from": "\\[\\[Deafened\\]\\]",
          "to": "deafened",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 12536,
    "name": "Tlil Mask (Greater)",
    "uuid": "2406197973325610",
    "source": 16,
    "level": 9,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4888",
      "book": "Treasure Vault",
      "page": "155"
    },
    "description": {
      "before": "91f85ec71cba64c364b21d95b6da1c25",
      "after": "4b39a6f594355f57c369b447504c6346",
      "before_text": "Colorful, beaded _till masks_ are commonly found on the distant continent of Arcadia, but trade between the two regions means that they can also be found in the Mwangi Expanse as curiosities. These masks usually bear floral patterns and attune your senses to plants of all varieties.\n\n**Activate** 1 envision\n\n**Effect** Your vision up to 60 feet sees through small amounts of living plant matter as though it were transparent. While this effect is active, creatures can't be \\[\\[Concealed\\]\\] from you due to living plants, such as small trees, vines, and grass. This also prevents them from Hiding or Sneaking past you using only living plants for concealment or cover. Other than the inability to use the cover to Hide or Sneak, this ability doesn't prevent plants from providing cover to creatures or blocking line of effect. It also doesn't allow you to see through dead plant matter, such as the wooden walls of a building, or thick plant matter, such as the walls of a dungeon built entirely inside an enormous living tree. The effect lasts for 10 minutes.",
      "replacements": [
        {
          "from": "\\[\\[Concealed\\]\\]",
          "to": "concealed",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 12537,
    "name": "Tlil Mask",
    "uuid": "730379165811802",
    "source": 16,
    "level": 5,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4888",
      "book": "Treasure Vault",
      "page": "155"
    },
    "description": {
      "before": "8e65a0e3dfeceb295bdf45b86c099b97",
      "after": "c4728fd46a42e549c7436f72f85fc920",
      "before_text": "Colorful, beaded _tlil masks_ are commonly found on the distant continent of Arcadia, but trade between the two regions means that they can also be found in the Mwangi Expanse as curiosities. These masks usually bear floral patterns and attune your senses to plants of all varieties.\n\n**Activate** 1 envision\n\n**Effect** Your vision up to 60 feet sees through small amounts of living plant matter as though it were transparent. While this effect is active, creatures can't be \\[\\[Concealed\\]\\] from you due to living plants, such as small trees, vines, and grass. This also prevents them from Hiding or Sneaking past you using only living plants for concealment or cover. Other than the inability to use the cover to Hide or Sneak, this ability doesn't prevent plants from providing cover to creatures or blocking line of effect. It also doesn't allow you to see through dead plant matter, such as the wooden walls of a building, or thick plant matter, such as the walls of a dungeon built entirely inside an enormous living tree. The effect lasts for 1 minute.",
      "replacements": [
        {
          "from": "\\[\\[Concealed\\]\\]",
          "to": "concealed",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 12541,
    "name": "Tome of Scintillating Sleet",
    "uuid": "7424710747203965",
    "source": 16,
    "level": 8,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4718",
      "book": "Treasure Vault",
      "page": "113"
    },
    "description": {
      "before": "9eccdbfcafdf280ca8f9855056601f6d",
      "after": "99e79259c89bcb09a9d1183a1ba525b3",
      "before_text": "The first 12 pages of this tome tell the same story in two languages: 6 pages in Skald and 6 pages in the ancient Jotun dialect used by saumen kar, a species of ice-dwelling humanoids. The story is a tale of a saumen kar stricken with snow blindness after spending too long under the sun building snow giants.\n\n**Activate** F envision\n\n**Effect** If your next action is to cast a cold spell that deals damage, all creatures damaged by the spell are also \\[\\[Dazzled\\]\\] for 3 rounds by light refracting and reflecting within and around the spell's chilling effects. If an affected creature critically failed its save against the required spell, or if you critically succeeded on your spell attack roll against the creature, it's instead \\[\\[Blinded\\]\\] for 1 round and then dazzled for 3 rounds.",
      "replacements": [
        {
          "from": "\\[\\[Dazzled\\]\\]",
          "to": "dazzled",
          "count": 1
        },
        {
          "from": "\\[\\[Blinded\\]\\]",
          "to": "blinded",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 12550,
    "name": "Toshigami Blossom",
    "uuid": "5687150503269700",
    "source": 16,
    "level": 15,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4932",
      "book": "Treasure Vault",
      "page": "197"
    },
    "description": {
      "before": "654f6508e9f3f8a37785bd07ca816178",
      "after": "b15c8873c1c29ad0ef7d3d30452dafa5",
      "before_text": "**Perception** \\[\\[/r 1d20+30\\]\\]{+30}; precise vision (darkvision) 30 feet, imprecise hearing 30 feet\n\n**Communication** telepathy (Common and two other common languages; speak with plants)\n\n**Skills** Diplomacy \\[\\[/r 1d20+28\\]\\]{+28}, Medicine \\[\\[/r 1d20+32\\]\\]{+32}, Nature \\[\\[/r 1d20+32\\]\\]{+32}\n\n**Int** +6, **Wis** +10, **Cha** +5\n\n**Will** \\[\\[/r 1d20+32\\]\\]{+32}\n\nAn encounter with a toshigami, the enigmatic kami who protect cherry trees, is rare, though often sought after and treasured by those who achieve such an encounter. Only a handful of mortals can truthfully claim to have seen a toshigami, let alone met one, though many popular fireside tales tell of virtuous souls receiving a toshigami's blessing to fight for a worthy cause. Such stories have a basis in fact; every so often, a toshigami gives a worthy mortal a flower from their ward, time-locked in perfect bloom and granted sapience. Such _toshigami blossoms_ are more sociable than their creators. Like toshigami, a blossom has a strong curiosity about the mortal world. If you wear a _toshigami blossom_, it can intercede for you, helping you make a good impression.\n\nA _toshigami blossom_ has the following activations.\n\n**Activate** 2 command, Interact\n\n**Effect** The blossom casts \\[\\[Nature's Pathway\\]\\] on you to your specifications. If you target only cherry trees, the spell is cast at 6th rank.\n\n**Activate** 2 command, envision\n\n**Effect** The blossom casts \\[\\[Soothing Blossoms\\]\\] to your specifications.\n\n**Activate** 1 command\n\n**Effect** The blossom sends a flurry of cherry blossoms outward in a 20-foot burst that lasts 1 round. You and your allies can see through these blossoms. To all other creatures, creatures within the cloud of blossoms become \\[\\[Concealed\\]\\], and creatures outside the cloud become concealed to creatures within it. When you or an ally succeeds with a Strike against a creature in the blossoms, the Strike deals an additional 1d6 mental and an additional 1d6 void to living creatures, or an additional 1d6 vitality to undead.",
      "replacements": [
        {
          "from": "\\[\\[Concealed\\]\\]",
          "to": "concealed",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 12576,
    "name": "Vaporous Pipe",
    "uuid": "3790951613607195",
    "source": 16,
    "level": 7,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4732",
      "book": "Treasure Vault",
      "page": "116"
    },
    "description": {
      "before": "c1cbcbaea9a8a88d02753768eb1adef8",
      "after": "93b927d0c84bcbe08f2c108149b53129",
      "before_text": "This hand-polished pipe is carved from oak and releases small wisps of smoke even when unlit. As long as you're holding a vaporous pipe, you don't take a circumstance penalty to Perception checks due to thick smoke, and you can't suffocate from smoke and heated air (such as within a wildfire). As long as you are holding the pipe, you also gain resistance to fire equal to half your level.\n\n**Activate** 1 Interact\n\n**Effect** You draw on the pipe and then blow a massive cloud of smoke that fills a 30-foot emanation that includes your space. All creatures within the smoke cloud are \\[\\[Concealed\\]\\] from each other and from creatures outside the smoke, though you can still see clearly within it. The smoke dissipates after 3 rounds, or after 1 round if subjected to a strong wind.",
      "replacements": [
        {
          "from": "\\[\\[Concealed\\]\\]",
          "to": "concealed",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 12631,
    "name": "Wand of Legerdemain (1st-level)",
    "uuid": "1571039557728623",
    "source": 16,
    "level": 4,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4815",
      "book": "Treasure Vault",
      "page": "140"
    },
    "description": {
      "before": "3d0cf208ab42b3133fd6f2b3c60d7f1e",
      "after": "11bb8e21b21255e324744ef287703c92",
      "before_text": "This wand of lacquered black wood has a handle wrapped in interwoven colorful ribbons. A silver bell caps the wand's tasseled pommel.\n\n**Activate** Cast a Spell\n\n**Effect** You Cast the Spell.\n\n**Activate** 1 Interact (emotion, illusion, light, mental, visual)\n\n**Effect** You make yourself the center of attention. An illusory spotlight shines bright light upon your space as you pull inane objects from the wand's tip, such as confetti, silk flowers, streamers, or a long string of colorful kerchiefs knotted end to end. Each enemy within 30 feet must attempt a Will save against your spell DC, receiving a +4 circumstance bonus to the save if you or any of your allies recently threatened it or used hostile actions against it. On a failure, the creature becomes \\[\\[Fascinated\\]\\] with you until the end of your next turn. The fascination ends if the target is subject to a hostile act, or if another creature succeeds at a Diplomacy or Intimidation check against it. The spotlight follows you wherever you move. You can't be \\[\\[Concealed\\]\\] while in the spotlight. The effect ends if you become \\[\\[Invisible\\]\\], attempt a Stealth check, or Dismiss the activation. You can Sustain this Activation for up to 1 minute. Since you need to keep performing tricks, Sustain an Activation has the manipulate trait. Sustaining extends the spotlight, and keeps fascinated creatures fascinated, but doesn't cause creatures not already fascinated to become fascinated.",
      "replacements": [
        {
          "from": "\\[\\[Fascinated\\]\\]",
          "to": "fascinated",
          "count": 1
        },
        {
          "from": "\\[\\[Concealed\\]\\]",
          "to": "concealed",
          "count": 1
        },
        {
          "from": "\\[\\[Invisible\\]\\]",
          "to": "invisible",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 12632,
    "name": "Wand of Legerdemain (2nd-level)",
    "uuid": "142928225801459",
    "source": 16,
    "level": 6,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4815",
      "book": "Treasure Vault",
      "page": "140"
    },
    "description": {
      "before": "3d0cf208ab42b3133fd6f2b3c60d7f1e",
      "after": "11bb8e21b21255e324744ef287703c92",
      "before_text": "This wand of lacquered black wood has a handle wrapped in interwoven colorful ribbons. A silver bell caps the wand's tasseled pommel.\n\n**Activate** Cast a Spell\n\n**Effect** You Cast the Spell.\n\n**Activate** 1 Interact (emotion, illusion, light, mental, visual)\n\n**Effect** You make yourself the center of attention. An illusory spotlight shines bright light upon your space as you pull inane objects from the wand's tip, such as confetti, silk flowers, streamers, or a long string of colorful kerchiefs knotted end to end. Each enemy within 30 feet must attempt a Will save against your spell DC, receiving a +4 circumstance bonus to the save if you or any of your allies recently threatened it or used hostile actions against it. On a failure, the creature becomes \\[\\[Fascinated\\]\\] with you until the end of your next turn. The fascination ends if the target is subject to a hostile act, or if another creature succeeds at a Diplomacy or Intimidation check against it. The spotlight follows you wherever you move. You can't be \\[\\[Concealed\\]\\] while in the spotlight. The effect ends if you become \\[\\[Invisible\\]\\], attempt a Stealth check, or Dismiss the activation. You can Sustain this Activation for up to 1 minute. Since you need to keep performing tricks, Sustain an Activation has the manipulate trait. Sustaining extends the spotlight, and keeps fascinated creatures fascinated, but doesn't cause creatures not already fascinated to become fascinated.",
      "replacements": [
        {
          "from": "\\[\\[Fascinated\\]\\]",
          "to": "fascinated",
          "count": 1
        },
        {
          "from": "\\[\\[Concealed\\]\\]",
          "to": "concealed",
          "count": 1
        },
        {
          "from": "\\[\\[Invisible\\]\\]",
          "to": "invisible",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 12633,
    "name": "Wand of Legerdemain (3rd-level)",
    "uuid": "5092156059476082",
    "source": 16,
    "level": 8,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4815",
      "book": "Treasure Vault",
      "page": "140"
    },
    "description": {
      "before": "3d0cf208ab42b3133fd6f2b3c60d7f1e",
      "after": "11bb8e21b21255e324744ef287703c92",
      "before_text": "This wand of lacquered black wood has a handle wrapped in interwoven colorful ribbons. A silver bell caps the wand's tasseled pommel.\n\n**Activate** Cast a Spell\n\n**Effect** You Cast the Spell.\n\n**Activate** 1 Interact (emotion, illusion, light, mental, visual)\n\n**Effect** You make yourself the center of attention. An illusory spotlight shines bright light upon your space as you pull inane objects from the wand's tip, such as confetti, silk flowers, streamers, or a long string of colorful kerchiefs knotted end to end. Each enemy within 30 feet must attempt a Will save against your spell DC, receiving a +4 circumstance bonus to the save if you or any of your allies recently threatened it or used hostile actions against it. On a failure, the creature becomes \\[\\[Fascinated\\]\\] with you until the end of your next turn. The fascination ends if the target is subject to a hostile act, or if another creature succeeds at a Diplomacy or Intimidation check against it. The spotlight follows you wherever you move. You can't be \\[\\[Concealed\\]\\] while in the spotlight. The effect ends if you become \\[\\[Invisible\\]\\], attempt a Stealth check, or Dismiss the activation. You can Sustain this Activation for up to 1 minute. Since you need to keep performing tricks, Sustain an Activation has the manipulate trait. Sustaining extends the spotlight, and keeps fascinated creatures fascinated, but doesn't cause creatures not already fascinated to become fascinated.",
      "replacements": [
        {
          "from": "\\[\\[Fascinated\\]\\]",
          "to": "fascinated",
          "count": 1
        },
        {
          "from": "\\[\\[Concealed\\]\\]",
          "to": "concealed",
          "count": 1
        },
        {
          "from": "\\[\\[Invisible\\]\\]",
          "to": "invisible",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 12634,
    "name": "Wand of Legerdemain (4th-level)",
    "uuid": "4228746469123515",
    "source": 16,
    "level": 10,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4815",
      "book": "Treasure Vault",
      "page": "140"
    },
    "description": {
      "before": "3d0cf208ab42b3133fd6f2b3c60d7f1e",
      "after": "11bb8e21b21255e324744ef287703c92",
      "before_text": "This wand of lacquered black wood has a handle wrapped in interwoven colorful ribbons. A silver bell caps the wand's tasseled pommel.\n\n**Activate** Cast a Spell\n\n**Effect** You Cast the Spell.\n\n**Activate** 1 Interact (emotion, illusion, light, mental, visual)\n\n**Effect** You make yourself the center of attention. An illusory spotlight shines bright light upon your space as you pull inane objects from the wand's tip, such as confetti, silk flowers, streamers, or a long string of colorful kerchiefs knotted end to end. Each enemy within 30 feet must attempt a Will save against your spell DC, receiving a +4 circumstance bonus to the save if you or any of your allies recently threatened it or used hostile actions against it. On a failure, the creature becomes \\[\\[Fascinated\\]\\] with you until the end of your next turn. The fascination ends if the target is subject to a hostile act, or if another creature succeeds at a Diplomacy or Intimidation check against it. The spotlight follows you wherever you move. You can't be \\[\\[Concealed\\]\\] while in the spotlight. The effect ends if you become \\[\\[Invisible\\]\\], attempt a Stealth check, or Dismiss the activation. You can Sustain this Activation for up to 1 minute. Since you need to keep performing tricks, Sustain an Activation has the manipulate trait. Sustaining extends the spotlight, and keeps fascinated creatures fascinated, but doesn't cause creatures not already fascinated to become fascinated.",
      "replacements": [
        {
          "from": "\\[\\[Fascinated\\]\\]",
          "to": "fascinated",
          "count": 1
        },
        {
          "from": "\\[\\[Concealed\\]\\]",
          "to": "concealed",
          "count": 1
        },
        {
          "from": "\\[\\[Invisible\\]\\]",
          "to": "invisible",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 12635,
    "name": "Wand of Legerdemain (5th-level)",
    "uuid": "8203978991539215",
    "source": 16,
    "level": 12,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4815",
      "book": "Treasure Vault",
      "page": "140"
    },
    "description": {
      "before": "3d0cf208ab42b3133fd6f2b3c60d7f1e",
      "after": "11bb8e21b21255e324744ef287703c92",
      "before_text": "This wand of lacquered black wood has a handle wrapped in interwoven colorful ribbons. A silver bell caps the wand's tasseled pommel.\n\n**Activate** Cast a Spell\n\n**Effect** You Cast the Spell.\n\n**Activate** 1 Interact (emotion, illusion, light, mental, visual)\n\n**Effect** You make yourself the center of attention. An illusory spotlight shines bright light upon your space as you pull inane objects from the wand's tip, such as confetti, silk flowers, streamers, or a long string of colorful kerchiefs knotted end to end. Each enemy within 30 feet must attempt a Will save against your spell DC, receiving a +4 circumstance bonus to the save if you or any of your allies recently threatened it or used hostile actions against it. On a failure, the creature becomes \\[\\[Fascinated\\]\\] with you until the end of your next turn. The fascination ends if the target is subject to a hostile act, or if another creature succeeds at a Diplomacy or Intimidation check against it. The spotlight follows you wherever you move. You can't be \\[\\[Concealed\\]\\] while in the spotlight. The effect ends if you become \\[\\[Invisible\\]\\], attempt a Stealth check, or Dismiss the activation. You can Sustain this Activation for up to 1 minute. Since you need to keep performing tricks, Sustain an Activation has the manipulate trait. Sustaining extends the spotlight, and keeps fascinated creatures fascinated, but doesn't cause creatures not already fascinated to become fascinated.",
      "replacements": [
        {
          "from": "\\[\\[Fascinated\\]\\]",
          "to": "fascinated",
          "count": 1
        },
        {
          "from": "\\[\\[Concealed\\]\\]",
          "to": "concealed",
          "count": 1
        },
        {
          "from": "\\[\\[Invisible\\]\\]",
          "to": "invisible",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 12636,
    "name": "Wand of Legerdemain (6th-level)",
    "uuid": "5608364032748675",
    "source": 16,
    "level": 14,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4815",
      "book": "Treasure Vault",
      "page": "140"
    },
    "description": {
      "before": "3d0cf208ab42b3133fd6f2b3c60d7f1e",
      "after": "11bb8e21b21255e324744ef287703c92",
      "before_text": "This wand of lacquered black wood has a handle wrapped in interwoven colorful ribbons. A silver bell caps the wand's tasseled pommel.\n\n**Activate** Cast a Spell\n\n**Effect** You Cast the Spell.\n\n**Activate** 1 Interact (emotion, illusion, light, mental, visual)\n\n**Effect** You make yourself the center of attention. An illusory spotlight shines bright light upon your space as you pull inane objects from the wand's tip, such as confetti, silk flowers, streamers, or a long string of colorful kerchiefs knotted end to end. Each enemy within 30 feet must attempt a Will save against your spell DC, receiving a +4 circumstance bonus to the save if you or any of your allies recently threatened it or used hostile actions against it. On a failure, the creature becomes \\[\\[Fascinated\\]\\] with you until the end of your next turn. The fascination ends if the target is subject to a hostile act, or if another creature succeeds at a Diplomacy or Intimidation check against it. The spotlight follows you wherever you move. You can't be \\[\\[Concealed\\]\\] while in the spotlight. The effect ends if you become \\[\\[Invisible\\]\\], attempt a Stealth check, or Dismiss the activation. You can Sustain this Activation for up to 1 minute. Since you need to keep performing tricks, Sustain an Activation has the manipulate trait. Sustaining extends the spotlight, and keeps fascinated creatures fascinated, but doesn't cause creatures not already fascinated to become fascinated.",
      "replacements": [
        {
          "from": "\\[\\[Fascinated\\]\\]",
          "to": "fascinated",
          "count": 1
        },
        {
          "from": "\\[\\[Concealed\\]\\]",
          "to": "concealed",
          "count": 1
        },
        {
          "from": "\\[\\[Invisible\\]\\]",
          "to": "invisible",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 12637,
    "name": "Wand of Legerdemain (7th-level)",
    "uuid": "1757579373563218",
    "source": 16,
    "level": 16,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4815",
      "book": "Treasure Vault",
      "page": "140"
    },
    "description": {
      "before": "3d0cf208ab42b3133fd6f2b3c60d7f1e",
      "after": "11bb8e21b21255e324744ef287703c92",
      "before_text": "This wand of lacquered black wood has a handle wrapped in interwoven colorful ribbons. A silver bell caps the wand's tasseled pommel.\n\n**Activate** Cast a Spell\n\n**Effect** You Cast the Spell.\n\n**Activate** 1 Interact (emotion, illusion, light, mental, visual)\n\n**Effect** You make yourself the center of attention. An illusory spotlight shines bright light upon your space as you pull inane objects from the wand's tip, such as confetti, silk flowers, streamers, or a long string of colorful kerchiefs knotted end to end. Each enemy within 30 feet must attempt a Will save against your spell DC, receiving a +4 circumstance bonus to the save if you or any of your allies recently threatened it or used hostile actions against it. On a failure, the creature becomes \\[\\[Fascinated\\]\\] with you until the end of your next turn. The fascination ends if the target is subject to a hostile act, or if another creature succeeds at a Diplomacy or Intimidation check against it. The spotlight follows you wherever you move. You can't be \\[\\[Concealed\\]\\] while in the spotlight. The effect ends if you become \\[\\[Invisible\\]\\], attempt a Stealth check, or Dismiss the activation. You can Sustain this Activation for up to 1 minute. Since you need to keep performing tricks, Sustain an Activation has the manipulate trait. Sustaining extends the spotlight, and keeps fascinated creatures fascinated, but doesn't cause creatures not already fascinated to become fascinated.",
      "replacements": [
        {
          "from": "\\[\\[Fascinated\\]\\]",
          "to": "fascinated",
          "count": 1
        },
        {
          "from": "\\[\\[Concealed\\]\\]",
          "to": "concealed",
          "count": 1
        },
        {
          "from": "\\[\\[Invisible\\]\\]",
          "to": "invisible",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 12638,
    "name": "Wand of Legerdemain (8th-level)",
    "uuid": "773095938864587",
    "source": 16,
    "level": 18,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4815",
      "book": "Treasure Vault",
      "page": "140"
    },
    "description": {
      "before": "3d0cf208ab42b3133fd6f2b3c60d7f1e",
      "after": "11bb8e21b21255e324744ef287703c92",
      "before_text": "This wand of lacquered black wood has a handle wrapped in interwoven colorful ribbons. A silver bell caps the wand's tasseled pommel.\n\n**Activate** Cast a Spell\n\n**Effect** You Cast the Spell.\n\n**Activate** 1 Interact (emotion, illusion, light, mental, visual)\n\n**Effect** You make yourself the center of attention. An illusory spotlight shines bright light upon your space as you pull inane objects from the wand's tip, such as confetti, silk flowers, streamers, or a long string of colorful kerchiefs knotted end to end. Each enemy within 30 feet must attempt a Will save against your spell DC, receiving a +4 circumstance bonus to the save if you or any of your allies recently threatened it or used hostile actions against it. On a failure, the creature becomes \\[\\[Fascinated\\]\\] with you until the end of your next turn. The fascination ends if the target is subject to a hostile act, or if another creature succeeds at a Diplomacy or Intimidation check against it. The spotlight follows you wherever you move. You can't be \\[\\[Concealed\\]\\] while in the spotlight. The effect ends if you become \\[\\[Invisible\\]\\], attempt a Stealth check, or Dismiss the activation. You can Sustain this Activation for up to 1 minute. Since you need to keep performing tricks, Sustain an Activation has the manipulate trait. Sustaining extends the spotlight, and keeps fascinated creatures fascinated, but doesn't cause creatures not already fascinated to become fascinated.",
      "replacements": [
        {
          "from": "\\[\\[Fascinated\\]\\]",
          "to": "fascinated",
          "count": 1
        },
        {
          "from": "\\[\\[Concealed\\]\\]",
          "to": "concealed",
          "count": 1
        },
        {
          "from": "\\[\\[Invisible\\]\\]",
          "to": "invisible",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 12639,
    "name": "Wand of Legerdemain (9th-level)",
    "uuid": "2543340744708360",
    "source": 16,
    "level": 20,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4815",
      "book": "Treasure Vault",
      "page": "140"
    },
    "description": {
      "before": "3d0cf208ab42b3133fd6f2b3c60d7f1e",
      "after": "11bb8e21b21255e324744ef287703c92",
      "before_text": "This wand of lacquered black wood has a handle wrapped in interwoven colorful ribbons. A silver bell caps the wand's tasseled pommel.\n\n**Activate** Cast a Spell\n\n**Effect** You Cast the Spell.\n\n**Activate** 1 Interact (emotion, illusion, light, mental, visual)\n\n**Effect** You make yourself the center of attention. An illusory spotlight shines bright light upon your space as you pull inane objects from the wand's tip, such as confetti, silk flowers, streamers, or a long string of colorful kerchiefs knotted end to end. Each enemy within 30 feet must attempt a Will save against your spell DC, receiving a +4 circumstance bonus to the save if you or any of your allies recently threatened it or used hostile actions against it. On a failure, the creature becomes \\[\\[Fascinated\\]\\] with you until the end of your next turn. The fascination ends if the target is subject to a hostile act, or if another creature succeeds at a Diplomacy or Intimidation check against it. The spotlight follows you wherever you move. You can't be \\[\\[Concealed\\]\\] while in the spotlight. The effect ends if you become \\[\\[Invisible\\]\\], attempt a Stealth check, or Dismiss the activation. You can Sustain this Activation for up to 1 minute. Since you need to keep performing tricks, Sustain an Activation has the manipulate trait. Sustaining extends the spotlight, and keeps fascinated creatures fascinated, but doesn't cause creatures not already fascinated to become fascinated.",
      "replacements": [
        {
          "from": "\\[\\[Fascinated\\]\\]",
          "to": "fascinated",
          "count": 1
        },
        {
          "from": "\\[\\[Concealed\\]\\]",
          "to": "concealed",
          "count": 1
        },
        {
          "from": "\\[\\[Invisible\\]\\]",
          "to": "invisible",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 12658,
    "name": "Wand of Noisome Acid (2nd-Level Spell)",
    "uuid": "8183994509694895",
    "source": 16,
    "level": 6,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4818",
      "book": "Treasure Vault",
      "page": "141"
    },
    "description": {
      "before": "d3c12d3dacc877275d6bf6c0e4b9949d",
      "after": "86bc95d48109bb1832c7f73672465553",
      "before_text": "This greasy stick emits a stomach-churning scent when held in a hand.\n\n**Activate** \\[\\[Cast a Spell\\]\\]\n\n**Effect** You cast \\[\\[Acid Arrow\\]\\] at 2nd rank. A creature that takes initial acid damage from this spell become \\[\\[Sickened\\]\\]{Sickened 1}. Use your spell DC if the creatures attempts to recover from this sickness. This is an olfactory effect.",
      "replacements": [
        {
          "from": "\\[\\[Sickened\\]\\]{Sickened 1}",
          "to": "sickened 1",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 12659,
    "name": "Wand of Noisome Acid (4th-Level Spell)",
    "uuid": "7611411327409832",
    "source": 16,
    "level": 10,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4818",
      "book": "Treasure Vault",
      "page": "141"
    },
    "description": {
      "before": "2e81ce88d96bae4f45fc2b1bde9c3055",
      "after": "5fa726a9ae0630c282adb21fb7cd94cf",
      "before_text": "This greasy stick emits a stomach-churning scent when held in a hand.\n\n**Activate** \\[\\[Cast a Spell\\]\\]\n\n**Effect** You cast \\[\\[Acid Arrow\\]\\] at 4th rank.A creature that takes initial acid damage from this spell become \\[\\[Sickened\\]\\]{Sickened 1}. Use your spell DC if the creatures attempts to recover from this sickness. This is an olfactory effect.",
      "replacements": [
        {
          "from": "\\[\\[Sickened\\]\\]{Sickened 1}",
          "to": "sickened 1",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 12660,
    "name": "Wand of Noisome Acid (6th-Level Spell)",
    "uuid": "2253459097543392",
    "source": 16,
    "level": 14,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4818",
      "book": "Treasure Vault",
      "page": "141"
    },
    "description": {
      "before": "c6335f66af29440f5e906b4166efefa8",
      "after": "617bc9ff1110fc6e669cf3a965756a2d",
      "before_text": "This greasy stick emits a stomach-churning scent when held in a hand.\n\n**Activate** \\[\\[Cast a Spell\\]\\]\n\n**Effect** You cast \\[\\[Acid Arrow\\]\\] at 6th rank. A creature that takes initial acid damage from this spell become \\[\\[Sickened\\]\\]{Sickened 1}. Use your spell DC if the creatures attempts to recover from this sickness. This is an olfactory effect.",
      "replacements": [
        {
          "from": "\\[\\[Sickened\\]\\]{Sickened 1}",
          "to": "sickened 1",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 12661,
    "name": "Wand of Noisome Acid (8th-Level Spell)",
    "uuid": "4314531124729452",
    "source": 16,
    "level": 18,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4818",
      "book": "Treasure Vault",
      "page": "141"
    },
    "description": {
      "before": "ce87ac205541aa396d22d536e5c212dd",
      "after": "764eb75dc0ebc61850b9011c4d6dca93",
      "before_text": "This greasy stick emits a stomach-churning scent when held in a hand.\n\n**Activate** \\[\\[Cast a Spell\\]\\]\n\n**Effect** You cast \\[\\[Acid Arrow\\]\\] at 8th rank. A creature that takes initial acid damage from this spell become \\[\\[Sickened\\]\\]{Sickened 1}. Use your spell DC if the creatures attempts to recover from this sickness. This is an olfactory effect.",
      "replacements": [
        {
          "from": "\\[\\[Sickened\\]\\]{Sickened 1}",
          "to": "sickened 1",
          "count": 1
        }
      ]
    }
  },
  {
    "id": 12719,
    "name": "Whelming Scrimshaw",
    "uuid": "8320473602266644",
    "source": 16,
    "level": 13,
    "citation": {
      "url": "https://2e.aonprd.com/Equipment.aspx?ID=4663",
      "book": "Treasure Vault",
      "page": "99"
    },
    "description": {
      "before": "07cda3f3a8945cac161fb5c7e7719d9c",
      "after": "a25f22ce6bbeb168bc666d2dd9de1a07",
      "before_text": "**Activate** 2 Interact\n\nAn etching of some aquatic beast dragging a figure beneath the waves adorns the ivory of a whelming scrimshaw. When you Activate this item, you break it and choose one creature within 30 feet. The target must attempt a Fortitude 30 save; amphibious and aquatic creatures are immune.\n\n**Critical Success** The creature is unaffected.\n\n**Success** The target becomes \\[\\[Sickened\\]\\]{Sickened 1} and unable to breathe until this sickened condition ends.\n\n**Failure** As success, but \\[\\[Sickened\\]\\]{Sickened 2}.\n\n**Critical Failure** As success, but \\[\\[Sickened\\]\\]{Sickened 3}.",
      "replacements": [
        {
          "from": "\\[\\[Sickened\\]\\]{Sickened 1}",
          "to": "sickened 1",
          "count": 1
        },
        {
          "from": "\\[\\[Sickened\\]\\]{Sickened 2}",
          "to": "sickened 2",
          "count": 1
        },
        {
          "from": "\\[\\[Sickened\\]\\]{Sickened 3}",
          "to": "sickened 3",
          "count": 1
        }
      ]
    }
  }
]
  $patches$::jsonb;
  noisome constant jsonb := $noisome$[
  {
    "id": 12658,
    "rank": 2,
    "expected": {
      "id": 12658,
      "name": "Wand of Noisome Acid (2nd-Level Spell)",
      "uuid": "8183994509694895",
      "content_source_id": 16,
      "level": 6,
      "price": {
        "gp": 250
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
      "description": "This greasy stick emits a stomach-churning scent when held in a hand.\n\n**Activate** \\[\\[Cast a Spell\\]\\]\n\n**Effect** You cast \\[\\[Acid Arrow\\]\\] at 2nd rank. A creature that takes initial acid damage from this spell become \\[\\[Sickened\\]\\]{Sickened 1}. Use your spell DC if the creatures attempts to recover from this sickness. This is an olfactory effect.",
      "craft_requirements": "Supply a casting of Acid Arrow at 2nd level",
      "source": {
        "url": "https://2e.aonprd.com/Equipment.aspx?ID=4818",
        "book": "Treasure Vault",
        "page": "141"
      }
    },
    "before": {
      "description": "This greasy stick emits a stomach-churning scent when held in a hand.\n\n**Activate** \\[\\[Cast a Spell\\]\\]\n\n**Effect** You cast \\[\\[Acid Arrow\\]\\] at 2nd rank. A creature that takes initial acid damage from this spell become sickened 1. Use your spell DC if the creatures attempts to recover from this sickness. This is an olfactory effect.",
      "craft_requirements": "Supply a casting of Acid Arrow at 2nd level",
      "source": {
        "url": "https://2e.aonprd.com/Equipment.aspx?ID=4818",
        "book": "Treasure Vault",
        "page": "141"
      }
    },
    "after": {
      "description": "This greasy stick emits a stomach-churning scent when held in a hand.\n\n**Activate** [Cast a Spell](link_action_19611); **Frequency** once per day, plus overcharge\n\n**Effect** You cast 2nd-rank *[acid grip](link_spell_4389)*. A creature that takes initial [acid](link_trait_1528) damage from this spell become sickened 1. Use your spell DC if the creature attempts to recover from this sickness. This is an [olfactory](link_trait_2131) effect.",
      "craft_requirements": "Supply a casting of *[acid grip](link_spell_4389)* of the appropriate rank.",
      "source": {
        "url": "https://2e.aonprd.com/Equipment.aspx?ID=2284",
        "book": "Treasure Vault (Remastered)",
        "page": "141"
      }
    },
    "hashes": {
      "description": {
        "raw": "d3c12d3dacc877275d6bf6c0e4b9949d",
        "before": "86bc95d48109bb1832c7f73672465553",
        "after": "94f3ac70dad23d4ec65d7ae65f47764a"
      },
      "craft_requirements": {
        "raw": "e96e30c364af6926b851c4694ead2da4",
        "before": "e96e30c364af6926b851c4694ead2da4",
        "after": "ac1308c588ba266aa09b4ef3f6c8dc22"
      }
    }
  },
  {
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
  },
  {
    "id": 12660,
    "rank": 6,
    "expected": {
      "id": 12660,
      "name": "Wand of Noisome Acid (6th-Level Spell)",
      "uuid": "2253459097543392",
      "content_source_id": 16,
      "level": 14,
      "price": {
        "gp": 4500
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
      "description": "This greasy stick emits a stomach-churning scent when held in a hand.\n\n**Activate** \\[\\[Cast a Spell\\]\\]\n\n**Effect** You cast \\[\\[Acid Arrow\\]\\] at 6th rank. A creature that takes initial acid damage from this spell become \\[\\[Sickened\\]\\]{Sickened 1}. Use your spell DC if the creatures attempts to recover from this sickness. This is an olfactory effect.",
      "craft_requirements": "Supply a casting of Acid Arrow at 6th rank.",
      "source": {
        "url": "https://2e.aonprd.com/Equipment.aspx?ID=4818",
        "book": "Treasure Vault",
        "page": "141"
      }
    },
    "before": {
      "description": "This greasy stick emits a stomach-churning scent when held in a hand.\n\n**Activate** \\[\\[Cast a Spell\\]\\]\n\n**Effect** You cast \\[\\[Acid Arrow\\]\\] at 6th rank. A creature that takes initial acid damage from this spell become sickened 1. Use your spell DC if the creatures attempts to recover from this sickness. This is an olfactory effect.",
      "craft_requirements": "Supply a casting of Acid Arrow at 6th rank.",
      "source": {
        "url": "https://2e.aonprd.com/Equipment.aspx?ID=4818",
        "book": "Treasure Vault",
        "page": "141"
      }
    },
    "after": {
      "description": "This greasy stick emits a stomach-churning scent when held in a hand.\n\n**Activate** [Cast a Spell](link_action_19611); **Frequency** once per day, plus overcharge\n\n**Effect** You cast 6th-rank *[acid grip](link_spell_4389)*. A creature that takes initial [acid](link_trait_1528) damage from this spell become sickened 1. Use your spell DC if the creature attempts to recover from this sickness. This is an [olfactory](link_trait_2131) effect.",
      "craft_requirements": "Supply a casting of *[acid grip](link_spell_4389)* of the appropriate rank.",
      "source": {
        "url": "https://2e.aonprd.com/Equipment.aspx?ID=2284",
        "book": "Treasure Vault (Remastered)",
        "page": "141"
      }
    },
    "hashes": {
      "description": {
        "raw": "c6335f66af29440f5e906b4166efefa8",
        "before": "617bc9ff1110fc6e669cf3a965756a2d",
        "after": "13afb9991ed5c5f5d739c7de4678360e"
      },
      "craft_requirements": {
        "raw": "b7f866c038686e172ddfb08a564ce53b",
        "before": "b7f866c038686e172ddfb08a564ce53b",
        "after": "ac1308c588ba266aa09b4ef3f6c8dc22"
      }
    }
  },
  {
    "id": 12661,
    "rank": 8,
    "expected": {
      "id": 12661,
      "name": "Wand of Noisome Acid (8th-Level Spell)",
      "uuid": "4314531124729452",
      "content_source_id": 16,
      "level": 18,
      "price": {
        "gp": 24000
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
      "description": "This greasy stick emits a stomach-churning scent when held in a hand.\n\n**Activate** \\[\\[Cast a Spell\\]\\]\n\n**Effect** You cast \\[\\[Acid Arrow\\]\\] at 8th rank. A creature that takes initial acid damage from this spell become \\[\\[Sickened\\]\\]{Sickened 1}. Use your spell DC if the creatures attempts to recover from this sickness. This is an olfactory effect.",
      "craft_requirements": "Supply a casting of Acid Arrow at 8th rank.",
      "source": {
        "url": "https://2e.aonprd.com/Equipment.aspx?ID=4818",
        "book": "Treasure Vault",
        "page": "141"
      }
    },
    "before": {
      "description": "This greasy stick emits a stomach-churning scent when held in a hand.\n\n**Activate** \\[\\[Cast a Spell\\]\\]\n\n**Effect** You cast \\[\\[Acid Arrow\\]\\] at 8th rank. A creature that takes initial acid damage from this spell become sickened 1. Use your spell DC if the creatures attempts to recover from this sickness. This is an olfactory effect.",
      "craft_requirements": "Supply a casting of Acid Arrow at 8th rank.",
      "source": {
        "url": "https://2e.aonprd.com/Equipment.aspx?ID=4818",
        "book": "Treasure Vault",
        "page": "141"
      }
    },
    "after": {
      "description": "This greasy stick emits a stomach-churning scent when held in a hand.\n\n**Activate** [Cast a Spell](link_action_19611); **Frequency** once per day, plus overcharge\n\n**Effect** You cast 8th-rank *[acid grip](link_spell_4389)*. A creature that takes initial [acid](link_trait_1528) damage from this spell become sickened 1. Use your spell DC if the creature attempts to recover from this sickness. This is an [olfactory](link_trait_2131) effect.",
      "craft_requirements": "Supply a casting of *[acid grip](link_spell_4389)* of the appropriate rank.",
      "source": {
        "url": "https://2e.aonprd.com/Equipment.aspx?ID=2284",
        "book": "Treasure Vault (Remastered)",
        "page": "141"
      }
    },
    "hashes": {
      "description": {
        "raw": "ce87ac205541aa396d22d536e5c212dd",
        "before": "764eb75dc0ebc61850b9011c4d6dca93",
        "after": "f5b82ce94b5478494583331d3dc5f7ff"
      },
      "craft_requirements": {
        "raw": "7d92bacbdb3349ccad578b41aee33220",
        "before": "7d92bacbdb3349ccad578b41aee33220",
        "after": "ac1308c588ba266aa09b4ef3f6c8dc22"
      }
    }
  }
]$noisome$::jsonb;
  prose constant jsonb := $prose${
  "items": [
    {
      "id": 11901,
      "expected": {
        "id": 11901,
        "name": "Curare",
        "bulk": "0.1",
        "level": 8,
        "rarity": "COMMON",
        "group": "GENERAL",
        "hands": null,
        "size": "MEDIUM",
        "craft_requirements": null,
        "operations": null,
        "content_source_id": 16,
        "version": "1.0",
        "uuid": "5321157015758660",
        "price": {
          "gp": 100
        },
        "availability": null
      },
      "metadata": {
        "hp": 0,
        "bulk": {},
        "runes": {},
        "damage": null,
        "hp_max": 0,
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
      "metadata_absent": [
        "deprecated",
        "unselectable",
        "important",
        "focus",
        "type",
        "ritual"
      ],
      "raw": {
        "traits": [
          1529,
          1531,
          1564,
          1476
        ],
        "usage": "held-in-two-hands",
        "description": "**Activate** 2 Interact\n\nHunters all over Golarion favor curare, a potent paralytic derived from boiled tree bark.\n\n**Saving Throw** Fortitude 25\n\n**Maximum Duration** 6 rounds (but see stage 3)\n\n**Stage 1** 2d6 poison, \\[\\[Clumsy\\]\\]{Clumsy 1}, and \\[\\[Enfeebled\\]\\]{Enfeebled 1} (1 round)\n\n**Stage 2** 3d6 poison, \\[\\[Clumsy\\]\\]{Clumsy 2}, \\[\\[Enfeebled\\]\\]{Enfeebled 2}, and \\[\\[Slowed\\]\\]{Slowed 1} (1 minute)\n\n**Stage 3** 4d6 poison, clumsy 2, enfeebled 2, and slowed 1 (1 round). If the victim fails the saving throw while at stage 3, the poison ends and the victim is \\[\\[Paralyzed\\]\\] for \\[\\[/r 2d6 #Minutes\\]\\]{2d6 minutes}.",
        "craft_requirements": null,
        "source": {
          "url": "https://2e.aonprd.com/Equipment.aspx?ID=4532",
          "book": "Treasure Vault",
          "page": "68"
        }
      },
      "legacy_states": [
        {
          "traits": [
            1529,
            1531,
            1564,
            1476
          ],
          "description": "**Activate** 2 Interact\n\nHunters all over Golarion favor curare, a potent paralytic derived from boiled tree bark.\n\n**Saving Throw** Fortitude 25\n\n**Maximum Duration** 6 rounds (but see stage 3)\n\n**Stage 1** 2d6 poison, \\[\\[Clumsy\\]\\]{Clumsy 1}, and \\[\\[Enfeebled\\]\\]{Enfeebled 1} (1 round)\n\n**Stage 2** 3d6 poison, \\[\\[Clumsy\\]\\]{Clumsy 2}, \\[\\[Enfeebled\\]\\]{Enfeebled 2}, and \\[\\[Slowed\\]\\]{Slowed 1} (1 minute)\n\n**Stage 3** 4d6 poison, clumsy 2, enfeebled 2, and slowed 1 (1 round). If the victim fails the saving throw while at stage 3, the poison ends and the victim is \\[\\[Paralyzed\\]\\] for \\[\\[/r 2d6 #Minutes\\]\\]{2d6 minutes}.",
          "usage": "held-in-two-hands",
          "craft_requirements": null,
          "source": {
            "url": "https://2e.aonprd.com/Equipment.aspx?ID=4532",
            "book": "Treasure Vault",
            "page": "68"
          }
        },
        {
          "traits": [
            1529,
            1531,
            1564,
            1476
          ],
          "description": "**Activate** 2 Interact\n\nHunters all over Golarion favor curare, a potent paralytic derived from boiled tree bark.\n\n**Saving Throw** Fortitude 25\n\n**Maximum Duration** 6 rounds (but see stage 3)\n\n**Stage 1** 2d6 poison, clumsy 1, and enfeebled 1 (1 round)\n\n**Stage 2** 3d6 poison, clumsy 2, enfeebled 2, and slowed 1 (1 minute)\n\n**Stage 3** 4d6 poison, clumsy 2, enfeebled 2, and slowed 1 (1 round). If the victim fails the saving throw while at stage 3, the poison ends and the victim is paralyzed for \\[\\[/r 2d6 #Minutes\\]\\]{2d6 minutes}.",
          "usage": "held-in-two-hands",
          "craft_requirements": null,
          "source": {
            "url": "https://2e.aonprd.com/Equipment.aspx?ID=4532",
            "book": "Treasure Vault",
            "page": "68"
          }
        },
        {
          "traits": [
            1529,
            1531,
            1564,
            1476,
            1481
          ],
          "description": "**Activate** 2 Interact\n\nHunters all over Golarion favor curare, a potent paralytic derived from boiled tree bark.\n\n**Saving Throw** Fortitude 25\n\n**Maximum Duration** 6 rounds (but see stage 3)\n\n**Stage 1** 2d6 poison, \\[\\[Clumsy\\]\\]{Clumsy 1}, and \\[\\[Enfeebled\\]\\]{Enfeebled 1} (1 round)\n\n**Stage 2** 3d6 poison, \\[\\[Clumsy\\]\\]{Clumsy 2}, \\[\\[Enfeebled\\]\\]{Enfeebled 2}, and \\[\\[Slowed\\]\\]{Slowed 1} (1 minute)\n\n**Stage 3** 4d6 poison, clumsy 2, enfeebled 2, and slowed 1 (1 round). If the victim fails the saving throw while at stage 3, the poison ends and the victim is \\[\\[Paralyzed\\]\\] for \\[\\[/r 2d6 #Minutes\\]\\]{2d6 minutes}.",
          "usage": "held-in-two-hands",
          "craft_requirements": null,
          "source": {
            "url": "https://2e.aonprd.com/Equipment.aspx?ID=4532",
            "book": "Treasure Vault",
            "page": "68"
          }
        },
        {
          "traits": [
            1529,
            1531,
            1564,
            1476,
            1481
          ],
          "description": "**Activate** 2 Interact\n\nHunters all over Golarion favor curare, a potent paralytic derived from boiled tree bark.\n\n**Saving Throw** Fortitude 25\n\n**Maximum Duration** 6 rounds (but see stage 3)\n\n**Stage 1** 2d6 poison, clumsy 1, and enfeebled 1 (1 round)\n\n**Stage 2** 3d6 poison, clumsy 2, enfeebled 2, and slowed 1 (1 minute)\n\n**Stage 3** 4d6 poison, clumsy 2, enfeebled 2, and slowed 1 (1 round). If the victim fails the saving throw while at stage 3, the poison ends and the victim is paralyzed for \\[\\[/r 2d6 #Minutes\\]\\]{2d6 minutes}.",
          "usage": "held-in-two-hands",
          "craft_requirements": null,
          "source": {
            "url": "https://2e.aonprd.com/Equipment.aspx?ID=4532",
            "book": "Treasure Vault",
            "page": "68"
          }
        }
      ],
      "before_states": [
        {
          "traits": [
            1529,
            1531,
            1564,
            1476,
            1481
          ],
          "usage": "held-in-two-hands",
          "description": "**Activate** 2 Interact\n\nHunters all over Golarion favor curare, a potent paralytic derived from boiled tree bark.\n\n**Saving Throw** Fortitude 25\n\n**Maximum Duration** 6 rounds (but see stage 3)\n\n**Stage 1** 2d6 poison, \\[\\[Clumsy\\]\\]{Clumsy 1}, and \\[\\[Enfeebled\\]\\]{Enfeebled 1} (1 round)\n\n**Stage 2** 3d6 poison, \\[\\[Clumsy\\]\\]{Clumsy 2}, \\[\\[Enfeebled\\]\\]{Enfeebled 2}, and \\[\\[Slowed\\]\\]{Slowed 1} (1 minute)\n\n**Stage 3** 4d6 poison, clumsy 2, enfeebled 2, and slowed 1 (1 round). If the victim fails the saving throw while at stage 3, the poison ends and the victim is \\[\\[Paralyzed\\]\\] for \\[\\[/r 2d6 #Minutes\\]\\]{2d6 minutes}.",
          "craft_requirements": null,
          "source": {
            "url": "https://2e.aonprd.com/Equipment.aspx?ID=4532",
            "book": "Treasure Vault",
            "page": "68"
          }
        },
        {
          "traits": [
            1529,
            1531,
            1564,
            1476,
            1481
          ],
          "usage": "held-in-two-hands",
          "description": "**Activate** 2 Interact\n\nHunters all over Golarion favor curare, a potent paralytic derived from boiled tree bark.\n\n**Saving Throw** Fortitude 25\n\n**Maximum Duration** 6 rounds (but see stage 3)\n\n**Stage 1** 2d6 poison, clumsy 1, and enfeebled 1 (1 round)\n\n**Stage 2** 3d6 poison, clumsy 2, enfeebled 2, and slowed 1 (1 minute)\n\n**Stage 3** 4d6 poison, clumsy 2, enfeebled 2, and slowed 1 (1 round). If the victim fails the saving throw while at stage 3, the poison ends and the victim is paralyzed for \\[\\[/r 2d6 #Minutes\\]\\]{2d6 minutes}.",
          "craft_requirements": null,
          "source": {
            "url": "https://2e.aonprd.com/Equipment.aspx?ID=4532",
            "book": "Treasure Vault",
            "page": "68"
          }
        }
      ],
      "after": {
        "traits": [
          1529,
          1531,
          1564,
          1476,
          1481
        ],
        "usage": "held-in-two-hands",
        "description": "**Activate** <abbr cost=\"TWO-ACTIONS\" class=\"action-symbol\">2</abbr> ([manipulate](link_trait_1433))\n\n* * *\n\nHunters all over Golarion favor curare, a potent paralytic derived from boiled tree bark.\n\n**Saving Throw** DC 25 Fortitude\n\n**Maximum Duration** 6 rounds (but see stage 3)\n\n**Stage 1** 2d6 [poison](link_trait_1476) damage, clumsy 1, and enfeebled 1 (1 round)\n\n**Stage 2** 3d6 [poison](link_trait_1476) damage, clumsy 2, enfeebled 2, and slowed 1 (1 minute)\n\n**Stage 3** 4d6 [poison](link_trait_1476) damage, clumsy 2, enfeebled 2, and slowed 1 (1 round). If the victim fails the saving throw while at Stage 3, the poison ends and the victim is paralyzed for 2d6 minutes.",
        "craft_requirements": null,
        "source": {
          "url": "https://2e.aonprd.com/Equipment.aspx?ID=1999",
          "book": "Treasure Vault (Remastered)",
          "page": "68"
        }
      },
      "hashes": {
        "before": [
          "e30822a6889eea2b301562dbc7bb3a10",
          "6407e087a61e937e6c919f1b04c5fb7a"
        ],
        "after": "0130c87981a64623dc37736b773a7bdb"
      }
    },
    {
      "id": 12024,
      "expected": {
        "id": 12024,
        "name": "Freeze Ammunition",
        "bulk": "0",
        "level": 5,
        "rarity": "COMMON",
        "group": "GENERAL",
        "hands": null,
        "size": "MEDIUM",
        "craft_requirements": null,
        "operations": null,
        "content_source_id": 16,
        "version": "1.0",
        "uuid": "960541811768889",
        "price": {
          "gp": 28
        },
        "availability": null
      },
      "metadata": {
        "hp": 0,
        "bulk": {},
        "runes": {},
        "damage": null,
        "hp_max": 0,
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
      "metadata_absent": [
        "deprecated",
        "unselectable",
        "important",
        "focus",
        "type",
        "ritual"
      ],
      "raw": {
        "traits": [
          1529,
          1531,
          1532
        ],
        "usage": "held-in-one-hand",
        "description": "**Ammunition** any\n\n**Activate** 1 Interact\n\nFreeze ammunition carries chilling reagents that activate on contact with the target. A creature hit by activated freeze ammunition takes cold damage instead of the weapon's normal damage type, plus \\[\\[/r (2\\[splash\\])\\[cold\\]\\]\\] splash damage. Hitting a 5-foot-square surface successfully with freeze ammunition deals 2 cold splash damage and covers the space in a layer of ice. Each creature standing on the icy surface must succeed at a Reflex 20 save or Acrobatics 20 check or else fall \\[\\[Prone\\]\\]. Creatures using an action to move onto the icy surface must attempt either a Reflex save or an Acrobatics check to \\[\\[Balance\\]\\]. Creatures that Step or \\[\\[Crawl\\]\\] don't need to attempt a check or save. The ice melts after 1 minute, although unusually hot or cold temperatures can change this duration at the GM's discretion. Dealing at least 1 point of fire damage to the ice removes it instantly",
        "craft_requirements": null,
        "source": {
          "url": "https://2e.aonprd.com/Equipment.aspx?ID=4431",
          "book": "Treasure Vault",
          "page": "42"
        }
      },
      "legacy_states": [
        {
          "traits": [
            1529,
            1531,
            1532
          ],
          "description": "**Ammunition** any\n\n**Activate** 1 Interact\n\nFreeze ammunition carries chilling reagents that activate on contact with the target. A creature hit by activated freeze ammunition takes cold damage instead of the weapon's normal damage type, plus \\[\\[/r (2\\[splash\\])\\[cold\\]\\]\\] splash damage. Hitting a 5-foot-square surface successfully with freeze ammunition deals 2 cold splash damage and covers the space in a layer of ice. Each creature standing on the icy surface must succeed at a Reflex 20 save or Acrobatics 20 check or else fall \\[\\[Prone\\]\\]. Creatures using an action to move onto the icy surface must attempt either a Reflex save or an Acrobatics check to \\[\\[Balance\\]\\]. Creatures that Step or \\[\\[Crawl\\]\\] don't need to attempt a check or save. The ice melts after 1 minute, although unusually hot or cold temperatures can change this duration at the GM's discretion. Dealing at least 1 point of fire damage to the ice removes it instantly",
          "usage": "held-in-one-hand",
          "craft_requirements": null,
          "source": {
            "url": "https://2e.aonprd.com/Equipment.aspx?ID=4431",
            "book": "Treasure Vault",
            "page": "42"
          }
        },
        {
          "traits": [
            1529,
            1531,
            1532
          ],
          "description": "**Ammunition** any\n\n**Activate** 1 Interact\n\nFreeze ammunition carries chilling reagents that activate on contact with the target. A creature hit by activated freeze ammunition takes cold damage instead of the weapon's normal damage type, plus \\[\\[/r (2\\[splash\\])\\[cold\\]\\]\\] splash damage. Hitting a 5-foot-square surface successfully with freeze ammunition deals 2 cold splash damage and covers the space in a layer of ice. Each creature standing on the icy surface must succeed at a Reflex 20 save or Acrobatics 20 check or else fall prone. Creatures using an action to move onto the icy surface must attempt either a Reflex save or an Acrobatics check to \\[\\[Balance\\]\\]. Creatures that Step or \\[\\[Crawl\\]\\] don't need to attempt a check or save. The ice melts after 1 minute, although unusually hot or cold temperatures can change this duration at the GM's discretion. Dealing at least 1 point of fire damage to the ice removes it instantly",
          "usage": "held-in-one-hand",
          "craft_requirements": null,
          "source": {
            "url": "https://2e.aonprd.com/Equipment.aspx?ID=4431",
            "book": "Treasure Vault",
            "page": "42"
          }
        },
        {
          "traits": [
            1529,
            1531,
            1532,
            1519
          ],
          "description": "**Ammunition** any\n\n**Activate** 1 Interact\n\nFreeze ammunition carries chilling reagents that activate on contact with the target. A creature hit by activated freeze ammunition takes cold damage instead of the weapon's normal damage type, plus \\[\\[/r (2\\[splash\\])\\[cold\\]\\]\\] splash damage. Hitting a 5-foot-square surface successfully with freeze ammunition deals 2 cold splash damage and covers the space in a layer of ice. Each creature standing on the icy surface must succeed at a Reflex 20 save or Acrobatics 20 check or else fall \\[\\[Prone\\]\\]. Creatures using an action to move onto the icy surface must attempt either a Reflex save or an Acrobatics check to \\[\\[Balance\\]\\]. Creatures that Step or \\[\\[Crawl\\]\\] don't need to attempt a check or save. The ice melts after 1 minute, although unusually hot or cold temperatures can change this duration at the GM's discretion. Dealing at least 1 point of fire damage to the ice removes it instantly",
          "usage": "held-in-one-hand",
          "craft_requirements": null,
          "source": {
            "url": "https://2e.aonprd.com/Equipment.aspx?ID=4431",
            "book": "Treasure Vault",
            "page": "42"
          }
        },
        {
          "traits": [
            1529,
            1531,
            1532,
            1519
          ],
          "description": "**Ammunition** any\n\n**Activate** 1 Interact\n\nFreeze ammunition carries chilling reagents that activate on contact with the target. A creature hit by activated freeze ammunition takes cold damage instead of the weapon's normal damage type, plus \\[\\[/r (2\\[splash\\])\\[cold\\]\\]\\] splash damage. Hitting a 5-foot-square surface successfully with freeze ammunition deals 2 cold splash damage and covers the space in a layer of ice. Each creature standing on the icy surface must succeed at a Reflex 20 save or Acrobatics 20 check or else fall prone. Creatures using an action to move onto the icy surface must attempt either a Reflex save or an Acrobatics check to \\[\\[Balance\\]\\]. Creatures that Step or \\[\\[Crawl\\]\\] don't need to attempt a check or save. The ice melts after 1 minute, although unusually hot or cold temperatures can change this duration at the GM's discretion. Dealing at least 1 point of fire damage to the ice removes it instantly",
          "usage": "held-in-one-hand",
          "craft_requirements": null,
          "source": {
            "url": "https://2e.aonprd.com/Equipment.aspx?ID=4431",
            "book": "Treasure Vault",
            "page": "42"
          }
        }
      ],
      "before_states": [
        {
          "traits": [
            1529,
            1531,
            1532,
            1519
          ],
          "usage": "held-in-one-hand",
          "description": "**Ammunition** any\n\n**Activate** 1 Interact\n\nFreeze ammunition carries chilling reagents that activate on contact with the target. A creature hit by activated freeze ammunition takes cold damage instead of the weapon's normal damage type, plus \\[\\[/r (2\\[splash\\])\\[cold\\]\\]\\] splash damage. Hitting a 5-foot-square surface successfully with freeze ammunition deals 2 cold splash damage and covers the space in a layer of ice. Each creature standing on the icy surface must succeed at a Reflex 20 save or Acrobatics 20 check or else fall \\[\\[Prone\\]\\]. Creatures using an action to move onto the icy surface must attempt either a Reflex save or an Acrobatics check to \\[\\[Balance\\]\\]. Creatures that Step or \\[\\[Crawl\\]\\] don't need to attempt a check or save. The ice melts after 1 minute, although unusually hot or cold temperatures can change this duration at the GM's discretion. Dealing at least 1 point of fire damage to the ice removes it instantly",
          "craft_requirements": null,
          "source": {
            "url": "https://2e.aonprd.com/Equipment.aspx?ID=4431",
            "book": "Treasure Vault",
            "page": "42"
          }
        },
        {
          "traits": [
            1529,
            1531,
            1532,
            1519
          ],
          "usage": "held-in-one-hand",
          "description": "**Ammunition** any\n\n**Activate** 1 Interact\n\nFreeze ammunition carries chilling reagents that activate on contact with the target. A creature hit by activated freeze ammunition takes cold damage instead of the weapon's normal damage type, plus \\[\\[/r (2\\[splash\\])\\[cold\\]\\]\\] splash damage. Hitting a 5-foot-square surface successfully with freeze ammunition deals 2 cold splash damage and covers the space in a layer of ice. Each creature standing on the icy surface must succeed at a Reflex 20 save or Acrobatics 20 check or else fall prone. Creatures using an action to move onto the icy surface must attempt either a Reflex save or an Acrobatics check to \\[\\[Balance\\]\\]. Creatures that Step or \\[\\[Crawl\\]\\] don't need to attempt a check or save. The ice melts after 1 minute, although unusually hot or cold temperatures can change this duration at the GM's discretion. Dealing at least 1 point of fire damage to the ice removes it instantly",
          "craft_requirements": null,
          "source": {
            "url": "https://2e.aonprd.com/Equipment.aspx?ID=4431",
            "book": "Treasure Vault",
            "page": "42"
          }
        }
      ],
      "after": {
        "traits": [
          1529,
          1531,
          1532,
          1519
        ],
        "usage": "",
        "description": "**Ammunition** any\n\n**Activate** <abbr cost=\"ONE-ACTION\" class=\"action-symbol\">1</abbr> ([manipulate](link_trait_1433))\n\n* * *\n\nFreeze ammunition carries chilling reagents that activate on contact with the target. A creature hit by activated freeze ammunition takes [cold](link_trait_1519) damage instead of the weapon's normal damage type, plus 2 [cold](link_trait_1519) [splash](link_trait_1532) damage. Hitting a 5-foot-square surface successfully with freeze ammunition deals 2 [cold](link_trait_1519) [splash](link_trait_1532) damage and covers the space in a layer of ice. Each creature standing on the icy surface must succeed at a DC 20 Reflex save or Acrobatics check or else fall prone. Creatures using an action to move onto the icy surface must attempt either a Reflex save or an Acrobatics check to [Balance](link_action_19608). Creatures that [Step](link_action_19853) or [Crawl](link_action_19618) don't need to attempt a check or save. The ice melts after 1 minute, although unusually hot or cold temperatures can change this duration at the GM's discretion. Dealing at least 1 point of [fire](link_trait_1542) damage to the ice removes it instantly",
        "craft_requirements": null,
        "source": {
          "url": "https://2e.aonprd.com/Equipment.aspx?ID=1898",
          "book": "Treasure Vault (Remastered)",
          "page": "42"
        }
      },
      "hashes": {
        "before": [
          "7400fa02f2d8aef6666df2560bf199db",
          "3b56442f13f70dc1eb5721ff87f90f7f"
        ],
        "after": "2499ec316ae7d669207e9340ee75e13c"
      }
    },
    {
      "id": 12507,
      "expected": {
        "id": 12507,
        "name": "Talespinner's Lyre",
        "bulk": "0.1",
        "level": 11,
        "rarity": "UNCOMMON",
        "group": "GENERAL",
        "hands": null,
        "size": "MEDIUM",
        "craft_requirements": null,
        "operations": null,
        "content_source_id": 16,
        "version": "1.0",
        "uuid": "1965816783971423",
        "price": {
          "gp": 235
        },
        "availability": null
      },
      "metadata": {
        "hp": 0,
        "bulk": {},
        "runes": {},
        "damage": null,
        "hp_max": 0,
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
      "metadata_absent": [
        "deprecated",
        "unselectable",
        "important",
        "focus",
        "type",
        "ritual"
      ],
      "raw": {
        "traits": [
          1469,
          1531,
          1447,
          1504,
          1479
        ],
        "usage": "held-in-two-hands",
        "description": "**Activate** 2 envision, Interact\n\nPlucking a talespinner's lyre while focusing on an event you witnessed causes the instrument to create an illusion in a 50-foot emanation that plays out your memory of the event in real time, complete with sights, sounds, and smells. You can Sustain the Activation for up to 1 minute to keep it playing. The scene reproduces only what's in its area, including nothing beyond that even if present in the memory. The scene is realistic, but all observers can clearly tell it's an illusion. Observers can't interact with the scene directly nor can they taste or touch elements of it to get a sensation you didn't personally experience, but they can attempt skill checks to discern more about the scene without altering its contents. For example, no one could see something you didn't, such as the true form of a creature polymorphed into a squirrel, but an observer might be able to use Perception and \\[\\[Sense Motive\\]\\] to discern the squirrel was acting unlike a squirrel should. Once the magic is used, the lyre remains as a non-magical virtuoso instrument.",
        "craft_requirements": null,
        "source": {
          "url": "https://2e.aonprd.com/Equipment.aspx?ID=4660",
          "book": "Treasure Vault",
          "page": "98"
        }
      },
      "legacy_states": [
        {
          "traits": [
            1469,
            1531,
            1447,
            1504,
            1479
          ],
          "description": "**Activate** 2 envision, Interact\n\nPlucking a talespinner's lyre while focusing on an event you witnessed causes the instrument to create an illusion in a 50-foot emanation that plays out your memory of the event in real time, complete with sights, sounds, and smells. You can Sustain the Activation for up to 1 minute to keep it playing. The scene reproduces only what's in its area, including nothing beyond that even if present in the memory. The scene is realistic, but all observers can clearly tell it's an illusion. Observers can't interact with the scene directly nor can they taste or touch elements of it to get a sensation you didn't personally experience, but they can attempt skill checks to discern more about the scene without altering its contents. For example, no one could see something you didn't, such as the true form of a creature polymorphed into a squirrel, but an observer might be able to use Perception and \\[\\[Sense Motive\\]\\] to discern the squirrel was acting unlike a squirrel should. Once the magic is used, the lyre remains as a non-magical virtuoso instrument.",
          "usage": "held-in-two-hands",
          "craft_requirements": null,
          "source": {
            "url": "https://2e.aonprd.com/Equipment.aspx?ID=4660",
            "book": "Treasure Vault",
            "page": "98"
          }
        },
        {
          "traits": [
            1469,
            1531,
            1447,
            1504,
            1479,
            2131
          ],
          "description": "**Activate** 2 envision, Interact\n\nPlucking a talespinner's lyre while focusing on an event you witnessed causes the instrument to create an illusion in a 50-foot emanation that plays out your memory of the event in real time, complete with sights, sounds, and smells. You can Sustain the Activation for up to 1 minute to keep it playing. The scene reproduces only what's in its area, including nothing beyond that even if present in the memory. The scene is realistic, but all observers can clearly tell it's an illusion. Observers can't interact with the scene directly nor can they taste or touch elements of it to get a sensation you didn't personally experience, but they can attempt skill checks to discern more about the scene without altering its contents. For example, no one could see something you didn't, such as the true form of a creature polymorphed into a squirrel, but an observer might be able to use Perception and \\[\\[Sense Motive\\]\\] to discern the squirrel was acting unlike a squirrel should. Once the magic is used, the lyre remains as a non-magical virtuoso instrument.",
          "usage": "held-in-two-hands",
          "craft_requirements": null,
          "source": {
            "url": "https://2e.aonprd.com/Equipment.aspx?ID=4660",
            "book": "Treasure Vault",
            "page": "98"
          }
        }
      ],
      "before_states": [
        {
          "traits": [
            1469,
            1531,
            1447,
            1504,
            1479,
            2131
          ],
          "usage": "held-in-two-hands",
          "description": "**Activate** 2 envision, Interact\n\nPlucking a talespinner's lyre while focusing on an event you witnessed causes the instrument to create an illusion in a 50-foot emanation that plays out your memory of the event in real time, complete with sights, sounds, and smells. You can Sustain the Activation for up to 1 minute to keep it playing. The scene reproduces only what's in its area, including nothing beyond that even if present in the memory. The scene is realistic, but all observers can clearly tell it's an illusion. Observers can't interact with the scene directly nor can they taste or touch elements of it to get a sensation you didn't personally experience, but they can attempt skill checks to discern more about the scene without altering its contents. For example, no one could see something you didn't, such as the true form of a creature polymorphed into a squirrel, but an observer might be able to use Perception and \\[\\[Sense Motive\\]\\] to discern the squirrel was acting unlike a squirrel should. Once the magic is used, the lyre remains as a non-magical virtuoso instrument.",
          "craft_requirements": null,
          "source": {
            "url": "https://2e.aonprd.com/Equipment.aspx?ID=4660",
            "book": "Treasure Vault",
            "page": "98"
          }
        }
      ],
      "after": {
        "traits": [
          1469,
          1531,
          1504,
          1479,
          2131
        ],
        "usage": "held-in-two-hands",
        "description": "**Activate** <abbr cost=\"TWO-ACTIONS\" class=\"action-symbol\">2</abbr> ([concentrate](link_trait_1432), [manipulate](link_trait_1433))\n\n* * *\n\nPlucking a talespinner's lyre while focusing on an event you witnessed causes the instrument to create an illusion in a 50-foot emanation that plays out your memory of the event in real time, complete with sights, sounds, and smells. You can [Sustain the Activation](link_action_19858) for up to 1 minute to keep it playing. The scene reproduces only what's in its area, including nothing beyond that even if present in the memory. The scene is realistic, but all observers can clearly tell it's an illusion. Observers can't interact with the scene directly nor can they taste or touch elements of it to get a sensation you didn't personally experience, but they can attempt skill checks to discern more about the scene without altering its contents. For example, no one could see something you didn't, such as the true form of a creature polymorphed into a squirrel, but an observer might be able to use Perception and [Sense Motive](link_action_19847) to discern the squirrel was acting unlike a squirrel should. Once the magic is used, the lyre remains as a non-magical [virtuoso instrument](link_item_7604).",
        "craft_requirements": null,
        "source": {
          "url": "https://2e.aonprd.com/Equipment.aspx?ID=2127",
          "book": "Treasure Vault (Remastered)",
          "page": "98"
        }
      },
      "hashes": {
        "before": [
          "75ea940b7fa3b1b314b4e4b3a764610b"
        ],
        "after": "3e7ea74f66f0d523917501e13e13768c"
      }
    },
    {
      "id": 12709,
      "expected": {
        "id": 12709,
        "name": "Warpwobble Poison",
        "bulk": "0.1",
        "level": 8,
        "rarity": "COMMON",
        "group": "GENERAL",
        "hands": null,
        "size": "MEDIUM",
        "craft_requirements": null,
        "operations": null,
        "content_source_id": 16,
        "version": "1.0",
        "uuid": "1246852420845927",
        "price": {
          "gp": 90
        },
        "availability": null
      },
      "metadata": {
        "hp": 0,
        "bulk": {},
        "runes": {},
        "damage": null,
        "hp_max": 0,
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
      "metadata_absent": [
        "deprecated",
        "unselectable",
        "important",
        "focus",
        "type",
        "ritual"
      ],
      "raw": {
        "traits": [
          1529,
          1531,
          1476
        ],
        "usage": "held-in-two-hands",
        "description": "**Activate** 2 Interact\n\nWarpwobble poison causes hallucinations of space bending and stretching, leading to vertigo and an inability to discern a stable place to move.\n\n**Saving Throw** Will 26\n\n**Maximum Duration** 6 rounds\n\n**Stage 1** treat all squares as difficult terrain (1 round)\n\n**Stage 2** treat all squares as greater difficult terrain (1 round)\n\n**Stage 3** treat all squares as uneven ground (DC 26), treating a critical success to \\[\\[Balance\\]\\] as a success, and a success as a success but moving on greater difficult terrain (1 round)",
        "craft_requirements": null,
        "source": {
          "url": "https://2e.aonprd.com/Equipment.aspx?ID=4553",
          "book": "Treasure Vault",
          "page": "71"
        }
      },
      "legacy_states": [
        {
          "traits": [
            1529,
            1531,
            1476
          ],
          "description": "**Activate** 2 Interact\n\nWarpwobble poison causes hallucinations of space bending and stretching, leading to vertigo and an inability to discern a stable place to move.\n\n**Saving Throw** Will 26\n\n**Maximum Duration** 6 rounds\n\n**Stage 1** treat all squares as difficult terrain (1 round)\n\n**Stage 2** treat all squares as greater difficult terrain (1 round)\n\n**Stage 3** treat all squares as uneven ground (DC 26), treating a critical success to \\[\\[Balance\\]\\] as a success, and a success as a success but moving on greater difficult terrain (1 round)",
          "usage": "held-in-two-hands",
          "craft_requirements": null,
          "source": {
            "url": "https://2e.aonprd.com/Equipment.aspx?ID=4553",
            "book": "Treasure Vault",
            "page": "71"
          }
        },
        {
          "traits": [
            1529,
            1531,
            1476,
            1564,
            1448
          ],
          "description": "**Activate** 2 Interact\n\nWarpwobble poison causes hallucinations of space bending and stretching, leading to vertigo and an inability to discern a stable place to move.\n\n**Saving Throw** Will 26\n\n**Maximum Duration** 6 rounds\n\n**Stage 1** treat all squares as difficult terrain (1 round)\n\n**Stage 2** treat all squares as greater difficult terrain (1 round)\n\n**Stage 3** treat all squares as uneven ground (DC 26), treating a critical success to \\[\\[Balance\\]\\] as a success, and a success as a success but moving on greater difficult terrain (1 round)",
          "usage": "held-in-two-hands",
          "craft_requirements": null,
          "source": {
            "url": "https://2e.aonprd.com/Equipment.aspx?ID=4553",
            "book": "Treasure Vault",
            "page": "71"
          }
        }
      ],
      "before_states": [
        {
          "traits": [
            1529,
            1531,
            1476,
            1564,
            1448
          ],
          "usage": "held-in-two-hands",
          "description": "**Activate** 2 Interact\n\nWarpwobble poison causes hallucinations of space bending and stretching, leading to vertigo and an inability to discern a stable place to move.\n\n**Saving Throw** Will 26\n\n**Maximum Duration** 6 rounds\n\n**Stage 1** treat all squares as difficult terrain (1 round)\n\n**Stage 2** treat all squares as greater difficult terrain (1 round)\n\n**Stage 3** treat all squares as uneven ground (DC 26), treating a critical success to \\[\\[Balance\\]\\] as a success, and a success as a success but moving on greater difficult terrain (1 round)",
          "craft_requirements": null,
          "source": {
            "url": "https://2e.aonprd.com/Equipment.aspx?ID=4553",
            "book": "Treasure Vault",
            "page": "71"
          }
        }
      ],
      "after": {
        "traits": [
          1529,
          1531,
          1476,
          1564,
          1448
        ],
        "usage": "held-in-two-hands",
        "description": "**Activate** <abbr cost=\"TWO-ACTIONS\" class=\"action-symbol\">2</abbr> ([manipulate](link_trait_1433))\n\n* * *\n\nWarpwobble poison causes hallucinations of space bending and stretching, leading to vertigo and an inability to discern a stable place to move.\n\n**Saving Throw** DC 26 Will\n\n**Maximum Duration** 6 rounds\n\n**Stage 1** treat all squares as difficult terrain (1 round)\n\n**Stage 2** treat all squares as greater difficult terrain (1 round)\n\n**Stage 3** treat all squares as uneven ground (DC 26), treating a critical success to [Balance](link_action_19608) as a success, and a success as a success but moving on greater difficult terrain (1 round)",
        "craft_requirements": null,
        "source": {
          "url": "https://2e.aonprd.com/Equipment.aspx?ID=2020",
          "book": "Treasure Vault (Remastered)",
          "page": "71"
        }
      },
      "hashes": {
        "before": [
          "912aa4024dca53ddc86a07aa84e466b1"
        ],
        "after": "e807c976027c3127991883e79e1634f4"
      }
    }
  ],
  "dependencies": [
    {
      "table": "ability_block",
      "type": "ability-block",
      "id": 19608,
      "expected": {
        "id": 19608,
        "operations": null,
        "name": "Balance",
        "actions": "ONE-ACTION",
        "level": null,
        "rarity": "COMMON",
        "prerequisites": null,
        "frequency": null,
        "cost": null,
        "trigger": null,
        "requirements": "You are in a square that contains a narrow surface, uneven ground, or another similar feature.",
        "access": null,
        "description": "You move across a narrow surface or uneven ground, attempting an Acrobatics check against its Balance DC. You are Off-Guard while on a narrow surface or uneven ground.\n\n**Critical Success** You move up to your Speed.\n\n**Success** You move up to your Speed, treating it as difficult terrain (every 5 feet costs 10 feet of movement).\n\n**Failure** You must remain stationary to keep your balance (wasting the action) or you fall. If you fall, your turn ends.\n\n**Critical Failure** You fall and your turn ends.\n\nSample Balance Tasks\n--------------------\n\n*   **Untrained** tangled roots, uneven cobblestones\n*   **Trained** wooden beam\n*   **Expert** deep, loose gravel\n*   **Master** tightrope, smooth sheet of ice\n*   **Legendary** razor's edge, chunks of floor falling in midair",
        "special": null,
        "type": "action",
        "traits": [
          1505,
          1438
        ],
        "content_source_id": 3,
        "version": "1.0",
        "uuid": "7614015615752326",
        "availability": null
      },
      "metadata": {
        "skill": "ACROBATICS",
        "source": {
          "url": "https://2e.aonprd.com/Actions.aspx?ID=2369",
          "book": "Player Core",
          "page": "233"
        },
        "foundry": {
          "rules": []
        }
      },
      "metadata_absent": [
        "deprecated",
        "unselectable",
        "important",
        "focus",
        "type",
        "ritual"
      ]
    },
    {
      "table": "ability_block",
      "type": "ability-block",
      "id": 19618,
      "expected": {
        "id": 19618,
        "operations": null,
        "name": "Crawl",
        "actions": "ONE-ACTION",
        "level": null,
        "rarity": "COMMON",
        "prerequisites": null,
        "frequency": null,
        "cost": null,
        "trigger": null,
        "requirements": "You are prone and your Speed is at least 10 feet.",
        "access": null,
        "description": "You move 5 feet by crawling and continue to stay Prone.",
        "special": null,
        "type": "action",
        "traits": [
          1505
        ],
        "content_source_id": 3,
        "version": "1.0",
        "uuid": "5129533339137004",
        "availability": null
      },
      "metadata": {
        "source": {
          "url": "https://2e.aonprd.com/Actions.aspx?ID=2293",
          "book": "Player Core",
          "page": "416"
        },
        "foundry": {
          "rules": []
        }
      },
      "metadata_absent": [
        "deprecated",
        "unselectable",
        "important",
        "focus",
        "type",
        "ritual"
      ]
    },
    {
      "table": "ability_block",
      "type": "ability-block",
      "id": 19847,
      "expected": {
        "id": 19847,
        "operations": null,
        "name": "Sense Motive",
        "actions": "ONE-ACTION",
        "level": null,
        "rarity": "COMMON",
        "prerequisites": null,
        "frequency": null,
        "cost": null,
        "trigger": null,
        "requirements": null,
        "access": null,
        "description": "You try to tell whether a creature's behavior is abnormal. Choose one creature and assess it for odd body language, signs of nervousness, and other indicators that it might be trying to deceive someone. The GM attempts a single secret Perception check for you and compares the result to the Deception DC of the creature, the DC of a spell affecting the creature's mental state, or another appropriate DC determined by the GM. You typically can't try to Sense the Motive of the same creature again until the situation changes significantly.\n\n**Critical Success** You determine the creature's true intentions and get a solid idea of any mental magic affecting it.\n\n**Success** You can tell whether the creature is behaving normally, but you don't know its exact intentions or what magic might be affecting it.\n\n**Failure** You detect what a deceptive creature wants you to believe. If they're not being deceptive, you believe they're behaving normally.\n\n**Critical Failure** You get a false sense of the creature's intentions.",
        "special": null,
        "type": "action",
        "traits": [
          1432,
          1437,
          1463
        ],
        "content_source_id": 3,
        "version": "1.0",
        "uuid": "6909398769181112",
        "availability": null
      },
      "metadata": {
        "source": {
          "url": "https://2e.aonprd.com/Actions.aspx?ID=2302",
          "book": "Player Core",
          "page": "417"
        },
        "foundry": {
          "rules": []
        }
      },
      "metadata_absent": [
        "deprecated",
        "unselectable",
        "important",
        "focus",
        "type",
        "ritual"
      ]
    },
    {
      "table": "ability_block",
      "type": "ability-block",
      "id": 19853,
      "expected": {
        "id": 19853,
        "operations": null,
        "name": "Step",
        "actions": "ONE-ACTION",
        "level": null,
        "rarity": "COMMON",
        "prerequisites": null,
        "frequency": null,
        "cost": null,
        "trigger": null,
        "requirements": "Your Speed is at least 10 feet.",
        "access": null,
        "description": "You carefully move 5 feet. Unlike most types of movement, Stepping doesn't trigger reactions, such as [Reactive Strike](link_class-feature_19201), that can be triggered by move actions or upon leaving or entering a square.\n\nYou can't Step into difficult terrain, and you can't Step using a Speed other than your land Speed.",
        "special": null,
        "type": "action",
        "traits": [
          1437,
          1505
        ],
        "content_source_id": 3,
        "version": "1.0",
        "uuid": "567734121479914",
        "availability": null
      },
      "metadata": {
        "source": {
          "url": "https://2e.aonprd.com/Actions.aspx?ID=2304",
          "book": "Player Core",
          "page": "418"
        },
        "foundry": {
          "rules": []
        }
      },
      "metadata_absent": [
        "deprecated",
        "unselectable",
        "important",
        "focus",
        "type",
        "ritual"
      ]
    },
    {
      "table": "ability_block",
      "type": "ability-block",
      "id": 19858,
      "expected": {
        "id": 19858,
        "operations": null,
        "name": "Sustain",
        "actions": "ONE-ACTION",
        "level": null,
        "rarity": "COMMON",
        "prerequisites": null,
        "frequency": null,
        "cost": null,
        "trigger": null,
        "requirements": null,
        "access": null,
        "description": "Choose one of your effects that has a sustained duration or lists a special benefit when you Sustain it. Most such effects come from spells or magic item activations. If the effect has a sustained duration, its duration extends until the end of your next turn. (Sustaining more than once in the same turn doesn't extend the duration to subsequent turns.) If an ability can be sustained but doesn't list how long, it can be sustained up to 10 minutes.\n\nAn effect might list an additional benefit that occurs if you Sustain it, and this can even appear on effects that don't have a sustained duration. If the effect has both a special benefit and a sustained duration, your Sustain action extends the duration as well as having the special benefit.\n\nIf your Sustain action is disrupted, the ability ends.",
        "special": null,
        "type": "action",
        "traits": [
          1432
        ],
        "content_source_id": 3,
        "version": "1.0",
        "uuid": "7845751305633010",
        "availability": null
      },
      "metadata": {
        "source": {
          "url": "https://2e.aonprd.com/Actions.aspx?ID=2317",
          "book": "Player Core",
          "page": "419"
        },
        "foundry": {
          "rules": []
        }
      },
      "metadata_absent": [
        "deprecated",
        "unselectable",
        "important",
        "focus",
        "type",
        "ritual"
      ]
    },
    {
      "table": "ability_block",
      "type": "ability-block",
      "id": 19733,
      "expected": {
        "id": 19733,
        "operations": null,
        "name": "Interact",
        "actions": "ONE-ACTION",
        "level": null,
        "rarity": "COMMON",
        "prerequisites": null,
        "frequency": null,
        "cost": null,
        "trigger": null,
        "requirements": null,
        "access": null,
        "description": "You use your hand or hands to manipulate an object or the terrain. You can grab an unattended or stored object, draw a weapon, swap a held item for another, open a door, or achieve a similar effect. On rare occasions, you might have to attempt a skill check to determine if your Interact action was successful.",
        "special": null,
        "type": "action",
        "traits": [
          1437,
          1433
        ],
        "content_source_id": 3,
        "version": "1.0",
        "uuid": "3402914292668269",
        "availability": null
      },
      "metadata": {
        "foundry": {
          "rules": []
        }
      },
      "metadata_absent": [
        "deprecated",
        "unselectable",
        "important",
        "focus",
        "type",
        "ritual"
      ]
    },
    {
      "table": "trait",
      "type": "trait",
      "id": 1432,
      "expected": {
        "id": 1432,
        "name": "Concentrate",
        "description": "An action with this trait requires a degree of mental concentration and discipline to perform.",
        "content_source_id": 3,
        "uuid": "3011511166869167"
      },
      "metadata": {
        "source": {
          "url": "https://2e.aonprd.com/Traits.aspx?ID=561",
          "book": "Player Core",
          "page": "454"
        }
      },
      "metadata_absent": [
        "deprecated",
        "unselectable",
        "important",
        "focus",
        "type",
        "ritual"
      ]
    },
    {
      "table": "trait",
      "type": "trait",
      "id": 1476,
      "expected": {
        "id": 1476,
        "name": "Poison",
        "description": "An effect with this trait delivers a poison or deals poison damage. An item with this trait is poisonous and might cause an affliction.",
        "content_source_id": 3,
        "uuid": "7663047166217896"
      },
      "metadata": {
        "source": {
          "url": "https://2e.aonprd.com/Traits.aspx?ID=669",
          "book": "Player Core",
          "page": "459"
        }
      },
      "metadata_absent": [
        "deprecated",
        "unselectable",
        "important",
        "focus",
        "type",
        "ritual"
      ]
    },
    {
      "table": "trait",
      "type": "trait",
      "id": 1519,
      "expected": {
        "id": 1519,
        "name": "Cold",
        "description": "Effects with this trait deal cold damage. Creatures with this trait have a connection to [magical](link_trait_1504) cold.",
        "content_source_id": 3,
        "uuid": "196418167509"
      },
      "metadata": {
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
      "metadata_absent": [
        "deprecated",
        "focus",
        "type",
        "ritual"
      ]
    },
    {
      "table": "trait",
      "type": "trait",
      "id": 1504,
      "expected": {
        "id": 1504,
        "name": "Magical",
        "description": "Something with the magical trait is imbued with magical energies not tied to a specific tradition of magic. Some items or effects are closely tied to a particular tradition of magic. In these cases, the item has the [arcane](link_trait_1459), [divine](link_trait_1475), [occult](link_trait_1514), or [primal](link_trait_1454) trait instead of the magical trait. Any of these traits indicate that the item is magical.",
        "content_source_id": 3,
        "uuid": "445811995976648"
      },
      "metadata": {
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
      "metadata_absent": [
        "deprecated",
        "focus",
        "type",
        "ritual"
      ]
    },
    {
      "table": "trait",
      "type": "trait",
      "id": 2131,
      "expected": {
        "id": 2131,
        "name": "Olfactory",
        "description": "An olfactory effect can affect only creatures that can smell it. This applies only to olfactory parts of the effect, as determined by the GM.",
        "content_source_id": 3,
        "uuid": "6785598362016579"
      },
      "metadata": {
        "source": {
          "url": "https://2e.aonprd.com/Traits.aspx?ID=664",
          "book": "Player Core",
          "page": "459"
        }
      },
      "metadata_absent": [
        "deprecated",
        "unselectable",
        "important",
        "focus",
        "type",
        "ritual"
      ]
    },
    {
      "table": "trait",
      "type": "trait",
      "id": 1479,
      "expected": {
        "id": 1479,
        "name": "Visual",
        "description": "A visual effect can affect only creatures that can see it. This applies only to visible parts of the effect, as determined by the GM.",
        "content_source_id": 3,
        "uuid": "4675954693812974"
      },
      "metadata": {
        "source": {
          "url": "https://2e.aonprd.com/Traits.aspx?ID=727",
          "book": "Player Core",
          "page": "463"
        },
        "important": true
      },
      "metadata_absent": [
        "deprecated",
        "unselectable",
        "focus",
        "type",
        "ritual"
      ]
    },
    {
      "table": "trait",
      "type": "trait",
      "id": 1447,
      "expected": {
        "id": 1447,
        "name": "Illusion",
        "description": "Effects and magic items with this trait involve false sensory stimuli.",
        "content_source_id": 3,
        "uuid": "4088330681988942"
      },
      "metadata": {
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
      "metadata_absent": [
        "deprecated",
        "focus",
        "type",
        "ritual"
      ]
    },
    {
      "table": "trait",
      "type": "trait",
      "id": 1433,
      "expected": {
        "id": 1433,
        "name": "Manipulate",
        "description": "You must physically manipulate an item or make gestures to use an action with this trait. Creatures without a suitable appendage can’t perform actions with this trait. Manipulate actions often trigger reactions.",
        "content_source_id": 3,
        "uuid": "2971108648217689"
      },
      "metadata": {
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
      "metadata_absent": [
        "deprecated",
        "focus",
        "type",
        "ritual"
      ]
    },
    {
      "table": "trait",
      "type": "trait",
      "id": 1564,
      "expected": {
        "id": 1564,
        "name": "Injury",
        "description": "An injury [poison](link_trait_1476) is activated by applying it to a weapon, and it affects the target of the first [Strike](link_action_19856) made using the poisoned weapon. If that [Strike](link_action_19856) is a success and deals piercing or slashing damage, the target must attempt a saving throw against the poison. On a failed [Strike](link_action_19856), the target is unaffected, but the poison remains on the weapon and you can try again. On a critical failure, or if the [Strike](link_action_19856) fails to deal slashing or piercing damage for some other reason, the poison is spent but the target is unaffected.",
        "content_source_id": 3,
        "uuid": "7440020828746294"
      },
      "metadata": {
        "source": {
          "url": "https://2e.aonprd.com/Traits.aspx?ID=635",
          "book": "GM Core",
          "page": "248"
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
      "metadata_absent": [
        "deprecated",
        "focus",
        "type",
        "ritual"
      ]
    },
    {
      "table": "trait",
      "type": "trait",
      "id": 1469,
      "expected": {
        "id": 1469,
        "name": "Auditory",
        "description": "Auditory actions and effects rely on sound. An action with the auditory trait can be successfully performed only if the creature using the action can speak or otherwise produce the required sounds. A spell or effect with the auditory trait has its effect only if the target can hear it. This applies only to sound-based parts of the effect, as determined by the GM. This is different from a [sonic](link_trait_1484) effect, which still affects targets who can’t hear it (such as deaf targets) as long as the effect itself makes sound.",
        "content_source_id": 3,
        "uuid": "6475190443898764"
      },
      "metadata": {
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
      "metadata_absent": [
        "deprecated",
        "focus",
        "type",
        "ritual"
      ]
    },
    {
      "table": "trait",
      "type": "trait",
      "id": 1529,
      "expected": {
        "id": 1529,
        "name": "Alchemical",
        "description": "Alchemical items are powered by reactions of alchemical reagents. Unless otherwise noted, alchemical items aren’t [magical](link_trait_1504) and don’t radiate a magical aura.\n\nAlchemical creatures are partially powered by alchemical reactions.",
        "content_source_id": 3,
        "uuid": "8219993619182426"
      },
      "metadata": {
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
      "metadata_absent": [
        "deprecated",
        "focus",
        "type",
        "ritual"
      ]
    },
    {
      "table": "trait",
      "type": "trait",
      "id": 1531,
      "expected": {
        "id": 1531,
        "name": "Consumable",
        "description": "An item with this trait can be used only once. Unless stated otherwise, it’s destroyed after activation. Consumable items include [alchemical](link_trait_1529) items and [magical](link_trait_1504) consumables such as [scrolls](link_trait_1692) and [talismans](link_trait_1544). When a character creates consumable items, they can make them in batches of four.",
        "content_source_id": 3,
        "uuid": "1807927279366527"
      },
      "metadata": {
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
      "metadata_absent": [
        "deprecated",
        "focus",
        "type",
        "ritual"
      ]
    },
    {
      "table": "trait",
      "type": "trait",
      "id": 1481,
      "expected": {
        "id": 1481,
        "name": "Incapacitation",
        "description": "An ability with this trait can take a character completely out of the fight or even kill them, and it’s harder to use on a more powerful character. If a spell has the incapacitation trait, any creature of more than twice the spell’s level treats the result of their check to prevent being incapacitated by the spell as one degree of success better, or the result of any check the spellcaster made to incapacitate them as one degree of success worse. If any other effect has the incapacitation trait, a creature of higher level than the item, creature, or hazard generating the effect gains the same benefits.",
        "content_source_id": 3,
        "uuid": "1508160825751788"
      },
      "metadata": {
        "source": {
          "url": "https://2e.aonprd.com/Traits.aspx?ID=631",
          "book": "Player Core",
          "page": "457"
        },
        "important": true
      },
      "metadata_absent": [
        "deprecated",
        "unselectable",
        "focus",
        "type",
        "ritual"
      ]
    },
    {
      "table": "trait",
      "type": "trait",
      "id": 1532,
      "expected": {
        "id": 1532,
        "name": "Splash",
        "description": "Some weapons and effects, such as [alchemical](link_trait_1529) [bombs](link_trait_1530), have the splash trait. You don’t add your Strength modifier to the damage roll for any thrown weapon with the splash trait (even if the item doesn’t have the [bomb](link_trait_1530) trait). A splash weapon or effect deals any listed splash damage to the target on a failure, success, or critical success, and to all other creatures within 5 feet of the target on a success or critical success. On a critical failure, the weapon or effect misses entirely, dealing no damage. Add splash damage together with the initial damage against the target before applying the target’s resistance or weakness. You don’t multiply splash damage on a critical hit.",
        "content_source_id": 3,
        "uuid": "5053816479032278"
      },
      "metadata": {
        "source": {
          "url": "https://2e.aonprd.com/Traits.aspx?ID=699",
          "book": "GM Core",
          "page": "244"
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
      "metadata_absent": [
        "deprecated",
        "focus",
        "type",
        "ritual"
      ]
    },
    {
      "table": "trait",
      "type": "trait",
      "id": 1448,
      "expected": {
        "id": 1448,
        "name": "Mental",
        "description": "A mental effect can alter the target’s mind. It has no effect on an object or a [mindless](link_trait_2411) creature.",
        "content_source_id": 3,
        "uuid": "3793398752936386"
      },
      "metadata": {
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
      "metadata_absent": [
        "deprecated",
        "focus",
        "type",
        "ritual"
      ]
    },
    {
      "table": "trait",
      "type": "trait",
      "id": 1542,
      "expected": {
        "id": 1542,
        "name": "Fire",
        "description": "Effects with the fire trait deal fire damage or either conjure or manipulate fire. Those that manipulate fire have no effect in an area without fire. Creatures with this trait consist primarily of fire or have a [magical](link_trait_1504) connection to that element. Planes with this trait are composed of flames that continually burn with no fuel source. Fire planes are extremely hostile to non-fire creatures.",
        "content_source_id": 3,
        "uuid": "3316639745394270"
      },
      "metadata": {
        "source": {
          "url": "https://2e.aonprd.com/Traits.aspx?ID=604",
          "book": "Player Core",
          "page": "456"
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
      "metadata_absent": [
        "deprecated",
        "focus",
        "type",
        "ritual"
      ]
    },
    {
      "table": "item",
      "type": "item",
      "id": 7604,
      "expected": {
        "id": 7604,
        "name": "Musical Instrument (Virtuoso Handheld)",
        "bulk": "1",
        "level": 3,
        "rarity": "COMMON",
        "description": "Handheld instruments include bagpipes, a small set of chimes, small drums, fiddles and viols, flutes and recorders, small harps, lutes, trumpets, and similarly sized instruments. The GM might rule that an especially large handheld instrument (like a tuba) has greater Bulk. [Heavy instruments](link_item_7603) such as large drums, a full set of chimes, and keyboard instruments are less portable and generally need to be stationary while being played.\n\nA virtuoso instrument is more finely made and gives a +1 item bonus to Performance checks using that instrument.",
        "group": "GENERAL",
        "hands": "2",
        "size": "MEDIUM",
        "craft_requirements": null,
        "usage": "held in 2 hands",
        "operations": [
          {
            "id": "1b9f63c4-4123-47f4-a871-6690f0d1a1a0",
            "type": "addBonusToValue",
            "data": {
              "variable": "SKILL_PERFORMANCE",
              "value": 1,
              "type": "item",
              "text": "while playing the virtuoso instrument."
            }
          }
        ],
        "content_source_id": 1,
        "version": "1.0",
        "uuid": "8612506017744150",
        "price": {
          "gp": 50
        },
        "traits": [],
        "availability": null
      },
      "metadata": {
        "hp": 0,
        "bulk": {},
        "runes": {},
        "damage": {
          "die": "",
          "dice": "",
          "extra": "",
          "damageType": ""
        },
        "hp_max": 0,
        "source": {
          "url": "https://2e.aonprd.com/Equipment.aspx?ID=2737",
          "book": "Player Core",
          "page": "290"
        },
        "charges": {},
        "foundry": {
          "items": [],
          "rules": [
            {
              "key": "FlatModifier",
              "type": "item",
              "label": "Virtuoso Instrument (playing it)",
              "value": 1,
              "selector": "performance",
              "predicate": [
                "playing"
              ]
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
        "image_url": "",
        "is_shoddy": false,
        "starfinder": {},
        "unselectable": false,
        "broken_threshold": 0
      },
      "metadata_absent": [
        "deprecated",
        "important",
        "focus",
        "type",
        "ritual"
      ]
    }
  ],
  "sources": [
    {
      "id": 1,
      "name": "Player Core",
      "foundry_id": "Pathfinder Player Core",
      "url": "https://paizo.com/products/btq02eoj?Pathfinder-Player-Core",
      "description": "The Pathfinder Player Core presents a new entry point to Pathfinder Second Edition, with everything a player needs to learn how to play the game! Choose from eight ancestries, eight complete character classes, and hundreds of feats and spells to make unique characters ready for deadly adventures in a world beset by magic and evil! This 464-page hardcover tome is the definitive rules resource for all Pathfinder Second Edition players!",
      "operations": [],
      "user_id": null,
      "contact_info": "",
      "require_key": false,
      "is_published": true,
      "required_content_sources": [],
      "group": "pathfinder-core",
      "artwork_url": null,
      "keys": null,
      "deprecated": null
    },
    {
      "id": 3,
      "name": "Common Core",
      "foundry_id": null,
      "url": null,
      "description": "Content that's shared between Pathfinder Second Edition and Starfinder Second Edition.",
      "operations": [],
      "user_id": null,
      "contact_info": null,
      "require_key": false,
      "is_published": true,
      "required_content_sources": [],
      "group": "common-core",
      "artwork_url": null,
      "keys": null,
      "deprecated": false
    },
    {
      "id": 16,
      "name": "Treasure Vault",
      "foundry_id": "Pathfinder Treasure Vault",
      "url": "https://paizo.com/products/btq02eav?Pathfinder-Treasure-Vault",
      "description": "Pathfinder Treasure Vault reveals the glittering hoard of a terrifying dragon, as presented by the creature’s plucky kobold assistant. This 224-page hardcover rulebook presents a catalog of new gear from nearly every category of equipment and magic item available in the Pathfinder RPG while also introducing entirely new categories of items as well. Give your character the perfect tool for the job with signature weapons, customizable relics, and wondrous items to fit your every need while preparing for any eventuality with potions, elixirs, wands, and more!",
      "operations": null,
      "user_id": null,
      "contact_info": null,
      "require_key": false,
      "is_published": true,
      "required_content_sources": [
        1
      ],
      "group": "pathfinder-core",
      "artwork_url": null,
      "keys": null,
      "deprecated": null
    }
  ]
}$prose$::jsonb;
  prose_patch jsonb; prose_state jsonb; prose_source jsonb; prose_source_row jsonb;
  prose_dependency jsonb; prose_dependency_row jsonb;
  prose_saved jsonb; prose_current jsonb;
  prose_source_captured jsonb := '{}'::jsonb; prose_dependency_captured jsonb := '{}'::jsonb;
  prose_initial_captured jsonb := '{}'::jsonb;
  prose_captured jsonb := '{}'::jsonb;
  successor jsonb; current_state jsonb;
  patch jsonb;
  replacement jsonb;
  item_row public.item%rowtype;
  reviewed_text text;
  repaired_text text;
  actual_count integer;
  changed_rows integer;
begin
  -- Freeze the curator queue through all guards, writes, and after-state replay.
  lock table public.content_update in share mode;
  -- These gates remain before every original, successor and already-terminal recognition.
  if jsonb_array_length(prose->'items')<>4 or jsonb_array_length(prose->'dependencies')<>23
    or jsonb_array_length(prose->'sources')<>3
    or (select count(distinct (p->>'table',p->>'id')) from jsonb_array_elements(prose->'dependencies') p)<>23
    or (select count(distinct p->>'id') from jsonb_array_elements(prose->'sources') p)<>3
    or (select array_agg((p->>'id')::bigint order by (p->>'id')::bigint) from jsonb_array_elements(prose->'items') p) is distinct from array[11901,12024,12507,12709]::bigint[]
    then raise exception 'Invalid reviewed equipment prose scope'; end if;
  for prose_patch in select value from jsonb_array_elements(prose->'items') loop
    if md5(prose_patch#>>'{after,description}') is distinct from prose_patch#>>'{hashes,after}'
      or jsonb_array_length(prose_patch->'before_states')<>jsonb_array_length(prose_patch#>'{hashes,before}')
      then raise exception 'Invalid equipment prose successor literal: %',prose_patch->>'id'; end if;
    for prose_state in select value from jsonb_array_elements(prose_patch->'before_states') with ordinality s(value,index) where md5(value->>'description') is distinct from prose_patch#>>array['hashes','before',(index-1)::text] loop
      raise exception 'Invalid equipment prose predecessor literal: %',prose_patch->>'id';
    end loop;
  end loop;
  -- Ordinary single-row writers lock children before the unchanged source-cache trigger.
  -- This pure initial pass precedes every source lock; original validation still follows.
  for patch in select value from jsonb_array_elements(patches) order by (value->>'id')::bigint loop
    perform 1 from public.item where id=(patch->>'id')::bigint for update;
    if not found then raise exception 'Historical owner missing during initial child lock: %',patch->>'id'; end if;
  end loop;
  for prose_dependency in select value from jsonb_array_elements(prose->'dependencies') order by value->>'table',(value->>'id')::bigint loop
    if prose_dependency->>'table'='trait' then
      perform 1 from public.trait where id=(prose_dependency->>'id')::bigint for share;
    elsif prose_dependency->>'table'='ability_block' then
      perform 1 from public.ability_block where id=(prose_dependency->>'id')::bigint for share;
    elsif prose_dependency->>'table'='item' then
      perform 1 from public.item where id=(prose_dependency->>'id')::bigint for share;
    else raise exception 'Invalid equipment prose initial dependency lock table'; end if;
    if not found then raise exception 'Equipment prose dependency missing during initial lock: %/%',prose_dependency->>'table',prose_dependency->>'id'; end if;
  end loop;
  for prose_source in select value from jsonb_array_elements(prose->'sources') order by (value->>'id')::bigint loop
    select to_jsonb(s) into prose_source_row from public.content_source s where s.id=(prose_source->>'id')::bigint for update;
    if not found or exists(select 1 from jsonb_each(prose_source) e where prose_source_row->e.key is distinct from e.value)
      then raise exception 'Equipment prose official source drift: %',prose_source->>'id'; end if;
    prose_source_captured:=jsonb_set(prose_source_captured,array[prose_source->>'id'],prose_source_row-'updated_at'-'search_tsv',true);
    if exists(select 1 from public.content_update u where coalesce(u.status->>'state','PENDING') not in ('APPROVED','REJECTED') and u.type='content-source' and (u.ref_id=(prose_source->>'id')::bigint or u.data->>'id'=prose_source->>'id' or u.data->>'name'=prose_source->>'name'))
      then raise exception 'Equipment prose source has unresolved curator submission: %',prose_source->>'id'; end if;
  end loop;
  for prose_dependency in select value from jsonb_array_elements(prose->'dependencies') order by value->>'table',(value->>'id')::bigint loop
    if prose_dependency->>'table'='trait' then
      select to_jsonb(t)||jsonb_build_object('uuid',t.uuid::text) into prose_dependency_row from public.trait t where t.id=(prose_dependency->>'id')::bigint for share;
    elsif prose_dependency->>'table'='ability_block' then
      select to_jsonb(a)||jsonb_build_object('uuid',a.uuid::text) into prose_dependency_row from public.ability_block a where a.id=(prose_dependency->>'id')::bigint for share;
    elsif prose_dependency->>'table'='item' then
      select to_jsonb(i)||jsonb_build_object('uuid',i.uuid::text) into prose_dependency_row from public.item i where i.id=(prose_dependency->>'id')::bigint for share;
    else raise exception 'Invalid equipment prose dependency table'; end if;
    if not found or jsonb_typeof(prose_dependency_row->'meta_data') is distinct from 'object'
      or exists(select 1 from jsonb_each(prose_dependency->'expected') e where prose_dependency_row->e.key is distinct from e.value)
      or exists(select 1 from jsonb_each(prose_dependency->'metadata') e where prose_dependency_row#>array['meta_data',e.key] is distinct from e.value)
      or exists(select 1 from jsonb_array_elements_text(prose_dependency->'metadata_absent') k(key) where prose_dependency_row->'meta_data'?k.key)
      then raise exception 'Equipment prose dependency drift: %/%',prose_dependency->>'table',prose_dependency->>'id'; end if;
    prose_dependency_captured:=jsonb_set(prose_dependency_captured,array[(prose_dependency->>'table')||':'||(prose_dependency->>'id')],prose_dependency_row-'updated_at'-'search_tsv',true);
    if exists(select 1 from public.content_update u where coalesce(u.status->>'state','PENDING') not in ('APPROVED','REJECTED') and u.type=prose_dependency->>'type' and (u.ref_id=(prose_dependency->>'id')::bigint or u.data->>'id'=prose_dependency->>'id' or u.data->>'uuid'=prose_dependency#>>'{expected,uuid}' or ((u.content_source_id=(prose_dependency#>>'{expected,content_source_id}')::bigint or u.data->>'content_source_id'=prose_dependency#>>'{expected,content_source_id}') and u.data->>'name'=prose_dependency#>>'{expected,name}')))
      then raise exception 'Equipment prose dependency has unresolved curator submission: %/%',prose_dependency->>'table',prose_dependency->>'id'; end if;
  end loop;
  perform id from public.content_source where id = 16 and name = 'Treasure Vault'
    and user_id is null and is_published is true for update;
  if not found then raise exception 'Missing official Treasure Vault condition source'; end if;
  if exists (select 1 from public.content_update u where u.status->>'state' = 'PENDING'
    and u.type = 'content-source' and u.ref_id = 16) then
    raise exception 'Treasure Vault source has a pending curator submission';
  end if;
  if jsonb_array_length(patches) <> 111
    or (select count(distinct value->>'id') from jsonb_array_elements(patches)) <> 111
    or (select sum((r.value->>'count')::integer) from jsonb_array_elements(patches) p
      cross join lateral jsonb_array_elements(p.value #> '{description,replacements}') r) <> 216 then
    raise exception 'Invalid reviewed condition-repair scope';
  end if;

  -- Snapshot the two shared prose owners before any historical write, without recognizing a tuple.
  -- Original before/replacement/after validation still precedes successor recognition below.
  for prose_patch in select value from jsonb_array_elements(prose->'items') p
    where exists(select 1 from jsonb_array_elements(patches) old where old->>'id'=p->>'id')
    order by (value->>'id')::bigint loop
    select to_jsonb(i)-'updated_at'-'search_tsv' into prose_saved from public.item i where i.id=(prose_patch->>'id')::bigint;
    if not found then raise exception 'Historical shared prose owner missing before writes: %',prose_patch->>'id'; end if;
    prose_initial_captured:=jsonb_set(prose_initial_captured,array[prose_patch->>'id'],prose_saved,true);
  end loop;

  for patch in select value from jsonb_array_elements(patches) order by (value->>'id')::bigint loop
    select * into item_row from public.item where id = (patch->>'id')::bigint for update;
    if not found or item_row.name is distinct from patch->>'name'
      or item_row.uuid is distinct from (patch->>'uuid')::bigint
      or item_row.content_source_id is distinct from (patch->>'source')::bigint
      or item_row.level is distinct from (patch->>'level')::integer
      or jsonb_typeof(item_row.meta_data) is distinct from 'object' then
      raise exception 'Missing or changed Treasure Vault condition item: %', patch->>'id';
    end if;
    -- Partial UPDATE/DELETE payloads are blocked by ref_id even when data is {}.
    if exists (select 1 from public.content_update u where u.type = 'item'
      and u.ref_id = item_row.id and u.status->>'state' = 'PENDING') then
      raise exception 'Condition item has a pending curator submission: %', patch->>'id';
    end if;

    -- Validate the complete reviewed before leaf and exact literals on every replay.
    reviewed_text := patch #>> '{description,before_text}';
    if md5(reviewed_text) is distinct from patch #>> '{description,before}' then
      raise exception 'Invalid condition before text/hash: %', patch->>'id';
    end if;
    repaired_text := reviewed_text;
    for replacement in select value from jsonb_array_elements(patch #> '{description,replacements}') loop
      if coalesce(length(replacement->>'from'),0) = 0 or (replacement->>'count')::integer <= 0 then
        raise exception 'Invalid condition literal: %', patch->>'id';
      end if;
      actual_count := (length(repaired_text) - length(replace(repaired_text,replacement->>'from','')))
        / length(replacement->>'from');
      if actual_count is distinct from (replacement->>'count')::integer then
        raise exception 'Condition literal count differs: %', patch->>'id';
      end if;
      repaired_text := replace(repaired_text,replacement->>'from',replacement->>'to');
    end loop;
    if md5(repaired_text) is distinct from patch #>> '{description,after}' then
      raise exception 'Invalid condition after text/hash: %', patch->>'id';
    end if;
    select value into prose_patch from jsonb_array_elements(prose->'items') where value->>'id'=patch->>'id';
    if prose_patch is not null then
      -- Historical literals above remain immutable, even on exact successor replay.
      -- Protect an initially complete B row even if an earlier write downgraded its current tuple.
      prose_saved:=prose_initial_captured->(patch->>'id');
      if jsonb_build_object('traits',prose_saved->'traits','usage',prose_saved->'usage',
        'description',prose_saved->'description','craft_requirements',prose_saved->'craft_requirements',
        'source',prose_saved#>'{meta_data,source}')=prose_patch->'after'
        and (to_jsonb(item_row)-'updated_at'-'search_tsv') is distinct from prose_saved
        then raise exception 'Historical prose successor initial captured baseline drift: %',patch->>'id'; end if;
    if not found or jsonb_typeof(item_row.meta_data) is distinct from 'object'
      or exists(select 1 from jsonb_each(prose_patch->'expected') e where (to_jsonb(item_row)||jsonb_build_object('uuid',item_row.uuid::text))->e.key is distinct from e.value)
      or exists(select 1 from jsonb_each(prose_patch->'metadata') e where item_row.meta_data->e.key is distinct from e.value)
      or exists(select 1 from jsonb_array_elements_text(prose_patch->'metadata_absent') k(key) where item_row.meta_data?k.key)
      then raise exception 'Equipment prose owner identity or mechanics drift: %',prose_patch->>'id'; end if;
    if exists(select 1 from public.content_update u where coalesce(u.status->>'state','PENDING') not in ('APPROVED','REJECTED') and u.type='item' and (u.ref_id=item_row.id or u.data->>'id'=item_row.id::text or u.data->>'uuid'=item_row.uuid::text or ((u.content_source_id=item_row.content_source_id or u.data->>'content_source_id'=item_row.content_source_id::text) and u.data->>'name'=item_row.name))) then raise exception 'Equipment prose owner has unresolved curator submission: %',prose_patch->>'id'; end if;
    prose_current:=jsonb_build_object('traits',item_row.traits,'usage',item_row.usage,'description',item_row.description,'craft_requirements',item_row.craft_requirements,'source',item_row.meta_data->'source');
    if prose_current is distinct from prose_patch->'after'
      and not exists(select 1 from jsonb_array_elements(prose_patch->'legacy_states') s where s=prose_current)
      then raise exception 'Unreviewed equipment prose coupled tuple: %',prose_patch->>'id'; end if;
      if prose_current=prose_patch->'after' then
        if (to_jsonb(item_row)-'updated_at'-'search_tsv') is distinct from prose_initial_captured->(patch->>'id')
          then raise exception 'Historical prose successor initial captured baseline drift: %',patch->>'id'; end if;
        prose_captured:=jsonb_set(prose_captured,array[patch->>'id'],prose_initial_captured->(patch->>'id'),true);
        continue;
      end if;
    end if;
    select value into successor from jsonb_array_elements(noisome) where value->>'id'=patch->>'id';
    if successor is not null then
      -- The immutable historical literals are still validated before successor recognition.
      if md5(successor#>>'{after,description}') is distinct from successor#>>'{hashes,description,after}' or md5(successor#>>'{after,craft_requirements}') is distinct from successor#>>'{hashes,craft_requirements,after}' then raise exception 'Invalid Noisome successor specification'; end if;
      current_state:=jsonb_build_object('description',item_row.description,'craft_requirements',item_row.craft_requirements,'source',item_row.meta_data->'source');
      if current_state=successor->'after' then
        if exists(select 1 from jsonb_each(successor->'expected') e where (to_jsonb(item_row)||jsonb_build_object('uuid',item_row.uuid::text))->e.key is distinct from e.value)
          or exists(select 1 from jsonb_array_elements_text(successor->'metadata_absent') k(key) where item_row.meta_data?k.key) then raise exception 'Noisome successor identity differs from reviewed entry'; end if;
        continue;
      end if;
      if current_state is distinct from successor->'raw' and current_state is distinct from successor->'before' then raise exception 'Unreviewed Noisome legacy coupled state'; end if;
    end if;
    if item_row.meta_data->'source' is distinct from patch->'citation' then raise exception 'Condition citation differs from reviewed entry: %',patch->>'id'; end if;
    if item_row.description = repaired_text then continue; end if;
    if item_row.description is distinct from reviewed_text then
      raise exception 'Condition description differs from reviewed pair: %', patch->>'id';
    end if;

    update public.item set description = repaired_text
      where id = item_row.id and description is not distinct from reviewed_text
        and name is not distinct from item_row.name and uuid is not distinct from item_row.uuid
        and content_source_id is not distinct from item_row.content_source_id
        and level is not distinct from item_row.level
        and meta_data->'source' is not distinct from item_row.meta_data->'source';
    get diagnostics changed_rows = row_count;
    if changed_rows <> 1 then raise exception 'Condition description changed during repair: %', patch->>'id'; end if;
  end loop;
  -- A later historical repair must not mutate an already-terminal prose successor.
  for prose_patch in select value from jsonb_array_elements(prose->'items') where prose_captured? (value->>'id') loop
    select to_jsonb(i)-'updated_at'-'search_tsv' into prose_saved from public.item i where i.id=(prose_patch->>'id')::bigint;
    if not found or prose_saved is distinct from prose_captured->(prose_patch->>'id') then raise exception 'Historical prose successor final captured readback drift: %',prose_patch->>'id'; end if;
  end loop;
  -- Cache timestamps may advance; every other source/dependency field must remain unchanged.
  for prose_source in select value from jsonb_array_elements(prose->'sources') loop
    select to_jsonb(s)-'updated_at'-'search_tsv' into prose_saved from public.content_source s where s.id=(prose_source->>'id')::bigint;
    if not found or prose_saved is distinct from prose_source_captured->(prose_source->>'id') then raise exception 'Equipment prose source final readback drift: %',prose_source->>'id'; end if;
  end loop;
  for prose_dependency in select value from jsonb_array_elements(prose->'dependencies') loop
    if prose_dependency->>'table'='trait' then
      select (to_jsonb(t)||jsonb_build_object('uuid',t.uuid::text))-'updated_at'-'search_tsv' into prose_saved from public.trait t where t.id=(prose_dependency->>'id')::bigint;
    elsif prose_dependency->>'table'='ability_block' then
      select (to_jsonb(a)||jsonb_build_object('uuid',a.uuid::text))-'updated_at'-'search_tsv' into prose_saved from public.ability_block a where a.id=(prose_dependency->>'id')::bigint;
    elsif prose_dependency->>'table'='item' then
      select (to_jsonb(i)||jsonb_build_object('uuid',i.uuid::text))-'updated_at'-'search_tsv' into prose_saved from public.item i where i.id=(prose_dependency->>'id')::bigint;
    else raise exception 'Invalid equipment prose final dependency table'; end if;
    if not found or prose_saved is distinct from prose_dependency_captured->((prose_dependency->>'table')||':'||(prose_dependency->>'id')) then raise exception 'Equipment prose dependency final readback drift: %/%',prose_dependency->>'table',prose_dependency->>'id'; end if;
  end loop;
end
$repair$;
$historical_original_dual$;
end $historical_dual$;
