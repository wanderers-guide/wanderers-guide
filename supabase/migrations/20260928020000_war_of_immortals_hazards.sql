do $hazards$
declare
  entries constant jsonb := $entries$
  [
    {
      "name": "Boneburst",
      "level": 14,
      "uuid": 5254284387800808,
      "page": "209",
      "url": "https://2e.aonprd.com/Hazards.aspx?ID=464",
      "details": {
        "complexity": "COMPLEX",
        "trait_ids": [1504, 1846],
        "trait_labels": [],
        "stealth": "+38 (master) to notice that clouds of debris are coalescing into swirling, faceless shapes held together by rust-red fog and spectral, dripping clots of gore",
        "description": "A low howl rises from the ground, gathering strength as scraps of ancient armor, bone fragments, and clumps of earth rise into the air. Crimson vapor holds the faceless shape together, never coalescing into an identifiable form, but merely writhing through ever-changing images of torment and destruction.",
        "disable": "DC 38 Occultism (master) to temporarily negate the psychic resonances around each fragment, causing the agglomeration to fall apart, or DC 33 Religion (expert) to temporarily interrupt Verex-That-Was's unholy power with divine energy from another source. If a boneburst takes 40 points of damage from a single source and it isn't destroyed, it is rendered dormant for 1 round.",
        "defenses": {
          "ac": 33,
          "fort": 30,
          "ref": 28,
          "hardness": 20,
          "hp": 90,
          "bt": 45,
          "immunities": "critical hits, object immunities, precision damage"
        },
        "activation": {
          "name": "Gathering Mist",
          "actions": "REACTION",
          "trigger": "A living creature approaches within 50 feet of a dormant boneburst.",
          "effect": "The boneburst awakens, roiling up from the ground, and rolls initiative."
        },
        "routine": {
          "actions": 2,
          "text": "An awakened boneburst occupies a 20-foot square; it is reduced to a 10-foot square when it reaches its BT. It can occupy the same space as other creatures, but not other bonebursts. On its initiative, the boneburst Flies up to 30 feet toward the nearest living creature as its first action. As its second action, the boneburst then coalesces around any living creature within its space, invisible shards of bone tearing at their flesh.\n\nEach living creature in its space takes 2d10+18 slashing damage and 1d10 spirit damage (DC 35 basic Reflex save). If no living creatures are within its space, the boneburst can use its second action to Fly up to 30 feet."
        },
        "reset": "If the boneburst spends 5 consecutive rounds without coalescing around a living creature, it falls dormant, sinking back into the earth. After it falls dormant or is disabled, the boneburst gathers energy over the course of the next hour, after which it can be triggered again."
      }
    },
    {
      "name": "Lightning's Dance",
      "level": 11,
      "uuid": 2597532321321096,
      "page": "191",
      "url": "https://2e.aonprd.com/Hazards.aspx?ID=460",
      "details": {
        "complexity": "COMPLEX",
        "trait_ids": [4072, 1454],
        "trait_labels": ["Kaiju"],
        "stealth": "+20 (expert) or DC 33 (master) to notice sparks dancing around normally non-conductive surfaces",
        "description": "Electricity suffuses an area where Agyra has used her lightning breath multiple times.",
        "disable": "DC 35 Crafting (master) to fashion a makeshift lightning rod, DC 33 Nature (expert) to dissipate the electrical charge harmlessly into the air",
        "activation": {
          "name": "Static Shock",
          "actions": "REACTION",
          "traits": ["Electricity"],
          "trigger": "A creature approaches within 10 feet of the hazard's center.",
          "effect": "Electricity wells up from the ground and nearby material. Each creature in the hazard's area must attempt a DC 33 Fortitude save, and the hazard then rolls initiative. A character wearing metal armor or wielding a metal shield or weapon of at least 1 Bulk treats the result of their saving throw as one step worse.\n\n**Critical Success** The creature is unaffected.\n\n**Success** The creature is clumsy 1 for 1 round.\n\n**Failure** The creature is clumsy 2 for 2 rounds.\n\n**Critical Failure** The creature is clumsy 2 for 4 rounds and stunned 1 for 1 round."
        },
        "routine": {
          "actions": 2,
          "text": "Bolts of lightning flash out. The hazard makes two lightning bolt Strikes at two different creatures within 120 feet of the hazard's center. If only one creature is in range, the hazard makes only one Strike.\n\n**Ranged** <abbr cost=\"ONE-ACTION\" class=\"action-symbol\">1</abbr> lightning bolt +24 (range increment 120 feet), Damage 2d12+15 electricity"
        },
        "reset": "The hazard deactivates and immediately resets if it has no targets for 1 round; it also resets if Agyra uses her lightning breath multiple times in a single combat in the area."
      }
    },
    {
      "name": "Primal Chaos Aura",
      "level": 5,
      "uuid": 1758515304135316,
      "page": "191",
      "url": "https://2e.aonprd.com/Hazards.aspx?ID=461",
      "details": {
        "complexity": "COMPLEX",
        "trait_ids": [1504, 4072, 1454],
        "trait_labels": ["Kaiju"],
        "stealth": "+11 or DC 26 to feel a tingle in the air and smell a rich, chlorophyll-green fragrance with no discernible source",
        "description": "Primal magic becomes unpredictable near areas where Agyra lairs, sometimes to hazardous effect.",
        "disable": "DC 22 Nature to negate the aura's effect for 1 round by temporarily drawing off the excess power and channeling it back into surrounding terrain, DC 26 Nature (expert) to completely disperse the lingering magic",
        "activation": {
          "name": "Wild Surge",
          "actions": "REACTION",
          "traits": ["Primal", "Vitality"],
          "trigger": "A character casts a primal spell within the hazard's area.",
          "effect": "Each living creature in the area gains 2d4 temporary Hit Points that last for 1 minute as life energy wells up around them, and the hazard rolls initiative."
        },
        "routine": {
          "actions": 2,
          "text": "On its initiative, the hazard gathers primal energy from the surroundings as its first action. Roll 1d6 to determine the type of energy gathered. The hazard uses its second action to replicate the associated spell (2nd rank, DC 23, spell attack modifier +15). The spell's target or targets are chosen randomly from creatures in the area. Any spell cast by this hazard is primal.\n\n1 air (gust of wind); 2 electricity (thunderstrike); 3 fire (blazing bolt); 4 poison (spider sting); 5 sonic (shatter); 6 water (hydraulic push)"
        },
        "reset": "The hazard deactivates and immediately resets if it has no targets for 1 round; it also resets if Agyra slumbers for 1 week within 100 feet."
      }
    },
    {
      "name": "Trump of the Oliphaunt",
      "level": 12,
      "uuid": 2013769588148619,
      "page": "196",
      "url": "https://2e.aonprd.com/Hazards.aspx?ID=463",
      "details": {
        "complexity": "COMPLEX",
        "trait_ids": [4072],
        "trait_labels": ["Environmental"],
        "stealth": "+25 (master) to notice the tension of a low vibration forming in the area from the imminent release of the Oliphaunt's trumpet",
        "description": "An overwhelming trumpeting sound vibrates and suffuses the area, causing everything to slow.",
        "disable": "DC 38 Arcana (expert), Maelstrom Lore (expert), Occultism (master), or Religion (master) to recognize and shore up the area against the localized planar instability causing a connection to the Oliphaunt of Jandelay. Four successes are needed to strengthen the area enough against the instability to end the hazard.",
        "activation": {
          "name": "Bone-Shattering Rhythms",
          "actions": "REACTION",
          "trigger": "Three or more characters enter the area of planar instability.",
          "effect": "Pent-up magical energy from another world begins to release in waves of overwhelming sound. The hazard rolls initiative."
        },
        "routine": {
          "actions": 1,
          "text": "Each creature in the area must attempt a DC 36 Fortitude save. A creature with the slowed condition from this hazard takes a -2 circumstance penalty on further saves against this effect.\n\n**Critical Success** The creature is unaffected.\n\n**Success** The creature takes 2d6+6 sonic damage and is deafened for 1 round.\n\n**Failure** The creature takes 4d6+13 sonic damage and is slowed 1 for 2 rounds.\n\n**Critical Failure** The creature takes 8d6+26 sonic damage and is slowed 2 for 2 rounds."
        },
        "reset": "The area becomes unstable again after 24 hours."
      }
    },
    {
      "name": "Wind Surge",
      "level": 7,
      "uuid": 1465735844144675,
      "page": "191",
      "url": "https://2e.aonprd.com/Hazards.aspx?ID=462",
      "details": {
        "complexity": "SIMPLE",
        "trait_ids": [4072, 1454],
        "trait_labels": ["Kaiju"],
        "stealth": "DC 27 (expert) to note stirrings in the wind",
        "description": "Hurricane-force winds rip through the area as Agyra flies past.",
        "disable": "DC 27 Athletics (expert) or Acrobatics (expert) to crouch and contort out of the wind's way (disables the hazard for only yourself), DC 30 Survival to point out a safe space from the winds for up to 3 creatures",
        "activation": {
          "name": "Hurricane Flyby",
          "actions": "REACTION",
          "traits": ["Air"],
          "trigger": "Agyra flies overhead for at least 120 feet in a straight line.",
          "effect": "Supernaturally powerful winds batter the area in a line that is 120 feet long and 30 feet wide and 30 feet tall. Each creature in the line must attempt a DC 29 Reflex save. Moving above ground against the direction of the line is greater difficult terrain for 1 minute.\n\n**Critical Success** The creature is pushed 10 feet along the line.\n\n**Success** The creature takes 5d6 bludgeoning damage and is pushed 15 feet along the line.\n\n**Failure** The creature takes 10d6 bludgeoning damage, is pushed 30 feet along the line, and is knocked prone.\n\n**Critical Failure** The creature takes 20d6 bludgeoning damage, is pushed 45 feet along the line, is knocked prone, and is stunned 1 for 1 round.\n\nIf the line overlaps a body of water, the winds cause massive waves that deal 6d6 bludgeoning damage to creatures in the water or within 15 feet of the waterline (DC 29 basic Reflex save). On a critical failure, a creature is also swept 30 feet away from the waterline and 15 feet beneath the water's surface."
        }
      }
    }
  ]
  $entries$::jsonb;
  entry jsonb;
  existing public.creature;
  source_data jsonb;
begin
  if not exists (
    select 1 from public.content_source
    where id = 400 and name = 'War of Immortals' and is_published
  ) then
    raise exception 'War of Immortals source changed; review before importing hazards';
  end if;

  for entry in select value from jsonb_array_elements(entries) loop
    if exists (
      select 1 from jsonb_array_elements_text(entry->'details'->'trait_ids') as trait_id(value)
      left join public.trait on public.trait.id = trait_id.value::bigint
      where public.trait.id is null
    ) then
      raise exception 'Hazard % references an unavailable trait', entry->>'name';
    end if;

    source_data := jsonb_build_object('source', jsonb_build_object(
      'book', 'War of Immortals', 'page', entry->>'page', 'url', entry->>'url'
    ));

    select * into existing from public.creature
    where uuid = (entry->>'uuid')::bigint for update;
    if found then
      if existing.name is distinct from entry->>'name'
        or existing.level is distinct from (entry->>'level')::integer
        or existing.rarity is distinct from 'RARE'
        or existing.content_source_id is distinct from 400
        or existing.type is distinct from 'hazard'
        or existing.meta_data is distinct from source_data
        or existing.details::jsonb is distinct from entry->'details'
        or existing.deprecated is distinct from false then
        raise exception 'Existing War of Immortals hazard % changed; review before importing', entry->>'name';
      end if;
      continue;
    end if;

    if exists (
      select 1 from public.creature
      where content_source_id = 400 and name = entry->>'name'
    ) then
      raise exception 'War of Immortals hazard name % is already occupied', entry->>'name';
    end if;

    insert into public.creature (
      name, level, rarity, meta_data, content_source_id, uuid, details, deprecated, type
    ) values (
      entry->>'name', (entry->>'level')::integer, 'RARE', source_data,
      400, (entry->>'uuid')::bigint, (entry->'details')::json, false, 'hazard'
    );
  end loop;

  update public.content_source
  set meta_data = jsonb_set(
    coalesce(meta_data::jsonb, '{}'::jsonb),
    '{counts}',
    coalesce(meta_data::jsonb->'counts', '{}'::jsonb) || '{"hazard":5}'::jsonb,
    true
  )::json
  where id = 400;
end
$hazards$;
