import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { readContentRows } from './operation-test-harness.mjs';
import { calculateCreatureEntries } from './war-of-immortals-creature-runtime.mjs';

const migration = await readFile(
  new URL('../../supabase/migrations/20260929020000_war_of_immortals_mythic_legends.sql', import.meta.url),
  'utf8'
);
const entries = JSON.parse(migration.split('$entries$')[1]);
const plainText = (text) => text.replace(/\[([^\]]+)\]\(link_[^)]+\)/g, '$1').replaceAll('*', '');

const expected = [
  {
    name: 'Vulot',
    level: 21,
    uuid: 4812683280104077,
    page: '177',
    aonId: 3404,
    ac: 46,
    hp: 425,
    attacks: 2,
    spells: 11,
    recallKnowledge: 'DC 42 (52 if Unique applies) • Fiend (Religion)',
  },
  {
    name: 'Immortal Trickster',
    level: 11,
    uuid: 4509376621863460,
    page: '183',
    aonId: 3405,
    ac: 31,
    hp: 198,
    attacks: 2,
    spells: 8,
    recallKnowledge: 'DC 28 (38 if Unique applies) • Beast (Arcana, Nature), Humanoid (Society), Spirit (Occultism)',
  },
  {
    name: 'Agyra',
    level: 23,
    uuid: 6892231756030293,
    page: '189',
    aonId: 3406,
    ac: 49,
    hp: 475,
    attacks: 4,
    spells: 0,
    recallKnowledge: 'DC 46 (56 if Unique applies) • Beast (Arcana, Nature)',
  },
  {
    name: 'Oliphaunt of Jandelay',
    level: 25,
    uuid: 6724325327115429,
    page: '195',
    aonId: 3407,
    ac: 48,
    hp: 680,
    attacks: 4,
    spells: 2,
    recallKnowledge: 'DC 50 (60 if Unique applies) • Monitor (Religion)',
  },
];

test('mythic legends have exact source identity and complete numeric records', async () => {
  const [{ row: source }] = await readContentRows([{ table: 'content_source', id: 400 }]);
  assert.equal(source.name, 'War of Immortals');
  assert.equal(entries.length, expected.length);
  assert.equal(new Set(entries.map((entry) => entry.uuid)).size, expected.length);

  for (const reference of expected) {
    const entry = entries.find((candidate) => candidate.name === reference.name);
    assert.ok(entry, reference.name);
    for (const field of ['level', 'uuid', 'page', 'ac', 'hp']) {
      assert.equal(entry[field], reference[field], `${reference.name}: ${field}`);
    }
    assert.equal(entry.aon_id, reference.aonId);
    assert.equal(
      entry.stat_block.recall_knowledge.replace(/\[([^\]]+)\]\(link_[^)]+\)/g, '$1'),
      reference.recallKnowledge
    );
    assert.match(entry.stat_block.recall_knowledge, /\(link_trait_\d+\)/);
    assert.deepEqual(
      entry.stat_block.listed_senses,
      entry.senses.map(({ name }) => name)
    );
    assert.equal(entry.rarity, 'UNIQUE');
    assert.equal(entry.attacks.length, reference.attacks);
    assert.equal(entry.spells?.length ?? 0, reference.spells);
    assert.equal(Object.keys(entry.attributes).length, 6);
    assert.deepEqual(Object.keys(entry.saves).sort(), ['FORT', 'REFLEX', 'WILL']);
    assert.deepEqual(
      entry.stat_block.listed_skills,
      Object.keys(entry.skills)
        .map((skill) => `SKILL_${skill}`)
        .sort()
    );
    assert.equal(
      entry.abilities.find((ability) => ability.name === 'Mythic Power')?.description.includes('3 Mythic Points'),
      true
    );
    assert.ok(entry.abilities.every((ability) => ability.name && ability.description));
    assert.ok(entry.trait_ids.includes(4072));
    assert.ok(entry.attacks.every((attack) => attack.bonus > 0 && attack.dice > 0 && attack.flat >= 0));
    assert.ok(migration.includes("'https://2e.aonprd.com/Monsters.aspx?ID=' || (entry->>'aon_id')"));
  }
});

test('mythic abilities retain their conditional scope and point costs', () => {
  const byName = new Map(entries.map((entry) => [entry.name, entry]));
  const vulot = byName.get('Vulot');
  const trickster = byName.get('Immortal Trickster');
  const agyra = byName.get('Agyra');
  const oliphaunt = byName.get('Oliphaunt of Jandelay');

  assert.ok(vulot.trait_ids.includes(4214));
  assert.ok(!vulot.trait_ids.includes(1846));
  assert.match(vulot.abilities.find((ability) => ability.name === 'Mythic Immunity').description, /spells.*Strikes/);
  assert.match(vulot.abilities.find((ability) => ability.name === 'Steal Face').description, /Will DC.*1d4 rounds/);
  assert.equal(vulot.abilities.find((ability) => ability.name === 'Steal Face').cost, '1 Mythic Point');
  assert.equal(
    vulot.abilities
      .find((ability) => ability.name === 'Suffocated by a Thousand Breaths')
      .description.includes('DC 41'),
    true
  );
  assert.equal(vulot.rituals[0].name, 'Demonic Pact');

  assert.match(
    trickster.abilities.find((ability) => ability.name === 'Bond with Mortals').description,
    /doomed.*six mortals/
  );
  assert.match(
    plainText(trickster.abilities.find((ability) => ability.name === 'Mythic Resistance').description),
    /11.*non-mythic/
  );
  assert.equal(trickster.items[0], 'Wandering Pipe');
  assert.equal(trickster.abilities.find((ability) => ability.name === 'Confounding Theft').cost, '1 Mythic Point');

  assert.match(
    agyra.abilities.find((ability) => ability.name === 'Mythic Immunity').description,
    /Strikes.*does not cover spells/
  );
  assert.match(
    agyra.abilities.find((ability) => ability.name === 'Mythic Resilience').description,
    /Fortitude and Reflex/
  );
  assert.match(
    agyra.abilities.find((ability) => ability.name === 'Lightning Breath').description,
    /22d6.*DC 44.*1d4 rounds/
  );
  assert.equal(agyra.kaiju, true);
  assert.equal(agyra.stat_block.hp_note, 'regeneration 30');

  assert.match(
    oliphaunt.abilities.find((ability) => ability.name === 'Mythic Immunity').description,
    /spells.*Strikes/
  );
  assert.match(
    oliphaunt.abilities.find((ability) => ability.name === 'Mythic Defenses').description,
    /first time each round/
  );
  assert.equal(
    oliphaunt.abilities.find((ability) => ability.name === 'Undying Myth').cost,
    'All remaining Mythic Points'
  );
  assert.match(
    oliphaunt.abilities.find((ability) => ability.name === 'Trumpeting Blast').description,
    /DC 49.*DC to 51.*1d4 rounds/
  );
  assert.deepEqual(oliphaunt.attacks.find((attack) => attack.name === 'debris toss').display_traits, ['deadly 2d8']);

  for (const entry of entries) {
    assert.ok(!entry.immunities.some((name) => name.includes('mythic')));
    assert.ok(!entry.resistances.some((name) => name.includes('mythic')));
    for (const ability of entry.abilities.filter((candidate) => candidate.cost)) {
      assert.match(ability.cost, /Mythic Point/);
    }
  }
});

test('all referenced spells, languages, and existing traits resolve', async () => {
  const spellRefs = entries.flatMap((entry) => [...(entry.spells ?? []), ...(entry.rituals ?? [])]);
  const languageIds = new Set(entries.flatMap((entry) => entry.languages));
  const traitIds = new Set(
    entries.flatMap((entry) => [
      ...entry.trait_ids,
      ...entry.attacks.flatMap((attack) => attack.traits),
      ...entry.abilities.flatMap((ability) => ability.traits ?? []),
    ])
  );
  const rows = await readContentRows([
    ...[...new Set(spellRefs.map((spell) => spell.id))].map((id) => ({ table: 'spell', id })),
    ...[...languageIds].map((id) => ({ table: 'language', id })),
    ...[...traitIds].map((id) => ({ table: 'trait', id })),
  ]);
  const byKey = new Map(rows.map(({ table, row }) => [`${table}:${row.id}`, row]));
  for (const spell of spellRefs) {
    assert.equal(byKey.get(`spell:${spell.id}`)?.name.toLowerCase(), spell.name.toLowerCase());
  }
  for (const id of languageIds) assert.ok(byKey.has(`language:${id}`), `missing language ${id}`);
  for (const id of traitIds) assert.ok(byKey.has(`trait:${id}`), `missing trait ${id}`);
  assert.match(migration, /uuid = 7063249107400705 and name = 'Kaiju'/);
  assert.match(migration, /id = 4214 and uuid = 2953289258892922 and name = 'Unholy \(creature\)'/);
  assert.match(migration, /where i\.name = item_name and i\.content_source_id = source_id/);
});

test('ability prose links every named rules reference to its catalog entry', async () => {
  const expectedLinks = {
    link_action_19721: 'Fly',
    link_action_19740: 'Maneuver in Flight',
    link_action_19847: 'Sense Motive',
    link_action_19855: 'Stride',
    link_action_19856: 'Strike',
    link_spell_4727: 'Mislead',
    link_trait_1433: 'Manipulate',
    link_trait_1448: 'Mental',
    link_trait_1469: 'Auditory',
    link_trait_1484: 'Sonic',
    link_trait_1492: 'Aura',
    link_trait_1505: 'Move',
    link_trait_1569: 'Agile',
    link_trait_1576: 'Electricity',
    link_trait_1899: 'Subtle',
    link_trait_2398: 'Unarmed',
    link_trait_4072: 'Mythic',
  };
  const prose = entries.flatMap(({ abilities }) =>
    abilities.flatMap(({ description, trigger, requirements }) => [description, trigger, requirements].filter(Boolean))
  );
  const hrefs = new Set(prose.flatMap((text) => [...text.matchAll(/\]\((link_[^)]+)\)/g)].map((match) => match[1])));
  assert.deepEqual([...hrefs].sort(), Object.keys(expectedLinks).sort());
  const targets = [...hrefs].map((href) => {
    const [, type, id] = /^link_(action|spell|trait)_(\d+)$/.exec(href);
    return { table: type === 'action' ? 'ability_block' : type, id: Number(id) };
  });
  const rows = await readContentRows(targets);
  for (const { table, row } of rows) {
    const type = table === 'ability_block' ? 'action' : table;
    assert.equal(row.name, expectedLinks[`link_${type}_${row.id}`]);
    if (type === 'action') assert.equal(row.type, 'action');
  }
  for (const text of prose) {
    const unlinked = text.replace(/\[[^\]]+\]\(link_[^)]+\)/g, '');
    assert.doesNotMatch(
      unlinked,
      /\b(?:Strikes?|Strides?|Flies|Maneuver in Flight|Sense Motive|auditory|subtle|electricity|sonic|mental|aura|unarmed|agile|non-mythic|mislead)\b/i
    );
  }
});

test('migration accepts unchanged replays and rejects changed creature content', () => {
  assert.match(migration, /War of Immortals source changed/);
  assert.match(migration, /pending creature submission/);
  assert.match(migration, /Mythic legend catalog has changed/);
  assert.match(migration, /Missing (creature trait|language|spell|ritual|attack trait|ability trait|item)/);
  assert.match(
    migration,
    /actual_content := to_jsonb\(existing_creature\) - '\{id,created_at,updated_at,search_tsv\}'::text\[\]/
  );
  assert.match(migration, /'uuid', \(entry->>'uuid'\)::bigint, 'type', 'creature'/);
  assert.match(migration, /jsonb_array_elements\(actual_content->'operations'\)/);
  assert.match(migration, /jsonb_array_elements\(actual_content->'inventory'->'items'\)/);
  assert.match(migration, /actual_content is distinct from expected_content/);
  assert.match(migration, /insert into public\.creature/);
  assert.doesNotMatch(migration, /(?:update|delete from) public\.(?:creature|item|spell|trait|content_source)\b/i);
});

test('mythic legends calculate their published defenses, Strikes, and innate spell statistics', async () => {
  const published = new Map([
    [
      'Vulot',
      { perception: 38, saves: { FORT: 32, REFLEX: 35, WILL: 38 }, attacks: [37, 37], spellAttack: 35, spellDc: 44 },
    ],
    [
      'Immortal Trickster',
      { perception: 24, saves: { FORT: 21, REFLEX: 26, WILL: 23 }, attacks: [23, 23], spellAttack: 20, spellDc: 31 },
    ],
    [
      'Agyra',
      {
        perception: 38,
        saves: { FORT: 37, REFLEX: 40, WILL: 34 },
        attacks: [40, 40, 40, 42],
        spellAttack: null,
        spellDc: null,
      },
    ],
    [
      'Oliphaunt of Jandelay',
      {
        perception: 39,
        saves: { FORT: 48, REFLEX: 37, WILL: 39 },
        attacks: [45, 45, 45, 43],
        spellAttack: 36,
        spellDc: 46,
      },
    ],
  ]);

  const results = await calculateCreatureEntries(entries, 'legend');
  assert.equal(results.length, expected.length);
  for (const result of results) {
    const source = expected.find(({ name }) => name === result.name);
    const numeric = published.get(result.name);
    assert.ok(source && numeric, result.name);
    assert.deepEqual(result.errors, [], `${result.name}: operation errors`);
    assert.deepEqual(result.notifications, [], `${result.name}: operation notifications`);
    assert.equal(result.ac, source.ac, `${result.name}: AC`);
    assert.equal(result.hp, source.hp, `${result.name}: HP`);
    assert.equal(result.perception, numeric.perception, `${result.name}: Perception`);
    assert.deepEqual(result.saves, numeric.saves, `${result.name}: saves`);
    assert.deepEqual(result.skills, entries.find(({ name }) => name === result.name).skills, `${result.name}: skills`);
    assert.deepEqual(
      result.attacks.map(({ bonus }) => bonus),
      numeric.attacks,
      `${result.name}: Strikes`
    );
    assert.equal(result.spellAttack, numeric.spellAttack, `${result.name}: spell attack`);
    assert.equal(result.spellDc, numeric.spellDc, `${result.name}: spell DC`);
  }
});
