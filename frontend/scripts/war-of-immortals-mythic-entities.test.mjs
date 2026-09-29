import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { readContentRows } from './operation-test-harness.mjs';
import { calculateCreatureEntries } from './war-of-immortals-creature-runtime.mjs';

const migration = await readFile(
  new URL('../../supabase/migrations/20260929030000_war_of_immortals_mythic_entities.sql', import.meta.url),
  'utf8'
);
const entries = JSON.parse(migration.split('$entries$')[1]);
const plainText = (text) => text.replace(/\[([^\]]+)\]\(link_[^)]+\)/g, '$1').replaceAll('*', '');

const expected = [
  {
    name: 'Sublime Breath',
    level: 6,
    uuid: 8402624232398678,
    page: '201',
    aonId: 3408,
    traits: [2021, 4072],
    size: 'MEDIUM',
    perception: 16,
    attributes: { STR: 2, DEX: 4, CON: 2, INT: 4, WIS: 2, CHA: 5 },
    ac: 24,
    saves: { FORT: 11, REFLEX: 14, WILL: 17 },
    hp: 111,
    speeds: { SPEED: 25 },
    languages: [81, 90],
    attackNames: ['soft touch', 'feigned strike'],
    attackBonuses: [16, 16],
    attackMAP: [
      [16, 11, 6],
      [16, 11, 6],
    ],
    abilityNames: [
      'Immaculate Instrument',
      'Artistic Specialist',
      'Thought Slips Away',
      'Mythic Resilience',
      'Artistic Creation',
      'Artistic Destruction',
      'Change Shape',
      'Hours Go By',
      'Mythic Power',
      'Remove a Condition',
    ],
    recallKnowledge: 'DC 22 (32 if Unique applies) • Fey (Nature)',
  },
  {
    name: 'Verex-That-Was',
    level: 24,
    uuid: 8784846156440862,
    page: '207',
    aonId: 3409,
    traits: [2427, 4072],
    size: 'GARGANTUAN',
    perception: 42,
    attributes: { STR: 12, DEX: 9, CON: 11, INT: 7, WIS: 7, CHA: 4 },
    ac: 51,
    saves: { FORT: 42, REFLEX: 38, WILL: 36 },
    hp: 550,
    speeds: { SPEED: 50, SPEED_BURROW: 30 },
    languages: [93, 81, 89],
    attackNames: ['claw', 'jaws', 'tail', 'teeth'],
    attackBonuses: [44, 44, 44, 42],
    attackMAP: [
      [44, 39, 34],
      [44, 39, 34],
      [44, 40, 36],
      [42, 37, 32],
    ],
    abilityNames: [
      'Frightful Presence',
      'Mythic Immunity',
      'Mythic Resilience',
      'Symphony of Pain',
      'Battlefield Eruption',
      'Bloodboils',
      'Leap into the Fray',
      'Mythic Power',
      'Undying Myth',
      'Improved Grab',
      'Swallow Whole',
      'War Cry of Destruction',
      'Absolute Regeneration',
      'Slumbering Armageddon',
    ],
    recallKnowledge: 'DC 48 (58 if Unique applies) • Aberration (Occultism)',
  },
  {
    name: 'Weaver of Webs',
    level: 15,
    uuid: 3704851072954059,
    page: '214',
    aonId: 3410,
    traits: [2422, 4072],
    size: 'GARGANTUAN',
    perception: 32,
    attributes: { STR: 6, DEX: 4, CON: 6, INT: 8, WIS: 6, CHA: 6 },
    ac: 36,
    saves: { FORT: 26, REFLEX: 23, WILL: 29 },
    hp: 335,
    speeds: { SPEED: 60, SPEED_CLIMB: 60 },
    languages: [93, 92, 81, 99, 82, 83, 307, 88, 91],
    attackNames: ['fangs', 'tarsal claw', 'web'],
    attackBonuses: [28, 28, 24],
    attackMAP: [
      [28, 23, 18],
      [28, 23, 18],
      [24, 19, 14],
    ],
    abilityNames: [
      'Countless Eyes',
      'Greater Web Sense',
      'All-Around Vision',
      'Mythic Resistance',
      'Spilled Secrets',
      'Adopted Brood',
      'Mythic Power',
      'Remove a Condition',
      'Nightmare Cocoon',
      'Weaver Venom',
      'Webbed Conveyance',
      'Improved Grab',
    ],
    recallKnowledge: 'DC 34 (44 if Unique applies) • Beast (Arcana, Nature)',
  },
];

test('War of Immortals mythic creatures retain their source stat blocks and citations', async () => {
  const [{ row: source }] = await readContentRows([{ table: 'content_source', id: 400 }]);
  assert.equal(source.name, 'War of Immortals');
  assert.equal(entries.length, 3);
  assert.equal(new Set(entries.map(({ uuid }) => uuid)).size, 3);

  for (const spec of expected) {
    const entry = entries.find(({ name }) => name === spec.name);
    assert.ok(entry, spec.name);
    for (const key of [
      'level',
      'uuid',
      'page',
      'size',
      'perception',
      'attributes',
      'ac',
      'saves',
      'hp',
      'speeds',
      'languages',
    ]) {
      assert.deepEqual(entry[key], spec[key], `${spec.name} ${key}`);
    }
    assert.equal(entry.url, `https://2e.aonprd.com/Monsters.aspx?ID=${spec.aonId}`);
    assert.deepEqual(entry.traits, spec.traits);
    assert.equal(entry.stat_block.recall_knowledge.replace(/\[([^\]]+)\]\(link_[^)]+\)/g, '$1'), spec.recallKnowledge);
    assert.match(entry.stat_block.recall_knowledge, /\(link_trait_\d+\)/);
    assert.deepEqual(
      entry.stat_block.listed_senses,
      entry.senses.map(({ name }) => name)
    );
    assert.deepEqual(
      entry.stat_block.listed_skills,
      entry.skills.map(({ name }) => `SKILL_${name}`)
    );
    assert.deepEqual(
      entry.attacks.map(({ name }) => name),
      spec.attackNames
    );
    assert.deepEqual(
      entry.attacks.map(({ bonus }) => bonus),
      spec.attackBonuses
    );
    assert.deepEqual(
      entry.attacks.map(({ bonus, traits }) => [
        bonus,
        bonus - (traits.includes(1569) ? 4 : 5),
        bonus - (traits.includes(1569) ? 8 : 10),
      ]),
      spec.attackMAP
    );
    assert.deepEqual(
      entry.abilities.map(({ name }) => name),
      spec.abilityNames
    );
    for (const ability of entry.abilities) {
      assert.ok(
        ability.description.length > (ability.name === 'Mythic Power' ? 10 : 20),
        `${spec.name}: ${ability.name} is missing its rules`
      );
    }
  }
});

test('conditional mythic rules and point costs remain explicit rather than unconditional defenses', () => {
  const [sublime, verex, weaver] = entries;
  assert.deepEqual(sublime.item_ids, [17478]);
  assert.match(sublime.abilities.find(({ name }) => name === 'Mythic Resilience').description, /Will saves/);
  assert.equal(sublime.abilities.find(({ name }) => name === 'Remove a Condition').cost, '1 Mythic Point');
  assert.match(plainText(verex.abilities.find(({ name }) => name === 'Mythic Immunity').description), /non-mythic/);
  assert.ok(!verex.immunities.some((value) => value.includes('mythic')));
  assert.equal(verex.abilities.find(({ name }) => name === 'Battlefield Eruption').cost, '1 Mythic Point');
  assert.equal(verex.abilities.find(({ name }) => name === 'Undying Myth').cost, 'All remaining Mythic Points');
  assert.ok(verex.abilities.some(({ name }) => name === 'Absolute Regeneration'));
  assert.ok(verex.abilities.some(({ name }) => name === 'Slumbering Armageddon'));
  const swallowWhole = verex.abilities.find(({ name }) => name === 'Swallow Whole');
  assert.deepEqual(swallowWhole.traits, [1520]);
  assert.match(swallowWhole.description, /cannot attack a creature he has swallowed/);
  assert.match(swallowWhole.description, /freeing any other creature held in his jaws/);
  assert.match(plainText(weaver.abilities.find(({ name }) => name === 'Mythic Resistance').description), /non-mythic/);
  assert.ok(!weaver.resistances.some((value) => value.includes('mythic')));
  assert.match(weaver.abilities.find(({ name }) => name === 'Nightmare Cocoon').description, /1 Mythic Point/);
  assert.deepEqual(weaver.stat_block.innate_spell_frequencies, {
    '5:sending': 'AT-WILL',
    '4:darkness': 'AT-WILL',
    '4:web': 'AT-WILL',
    '2:see the unseen': 'AT-WILL',
    '7:truespeech': 'CONSTANT',
  });
});

test('every referenced trait, language, spell, and catalog item exists', async () => {
  const traitIds = new Set(
    entries.flatMap(({ traits, attacks, abilities }) => [
      ...traits,
      ...attacks.flatMap(({ traits: attackTraits }) => attackTraits),
      ...abilities.flatMap(({ traits: abilityTraits }) => abilityTraits),
    ])
  );
  const languageIds = new Set(entries.flatMap(({ languages }) => languages));
  const spellIds = new Set(entries.flatMap(({ spells }) => spells.map(({ id }) => id)));
  const itemIds = new Set(entries.flatMap(({ item_ids: ids }) => ids));
  const rows = await readContentRows([
    ...[...traitIds].map((id) => ({ table: 'trait', id })),
    ...[...languageIds].map((id) => ({ table: 'language', id })),
    ...[...spellIds].map((id) => ({ table: 'spell', id })),
    ...[...itemIds].map((id) => ({ table: 'item', id })),
  ]);
  for (const { table, row } of rows) assert.ok(row.name, `${table}:${row.id}`);
  const spells = new Map(rows.filter(({ table }) => table === 'spell').map(({ row }) => [row.id, row.name]));
  for (const entry of entries) {
    for (const spell of entry.spells) assert.equal(spells.get(spell.id).toLowerCase(), spell.name.toLowerCase());
  }
  assert.equal(rows.find(({ table, row }) => table === 'item' && row.id === 17478).row.name, 'Immaculate Instrument');
  assert.match(migration, /existing\.meta_data::jsonb is distinct from source_data/);
  assert.match(migration, /existing\.operations\) is distinct from to_jsonb\(operation_rows\)/);
  assert.doesNotMatch(migration, /update public\.(creature|content_source|item|spell|trait|language)\b/i);
});

test('ability prose links every named rules reference to its catalog entry', async () => {
  const expectedLinks = {
    link_action_19632: 'Escape',
    link_action_19727: 'High Jump',
    link_action_19735: 'Leap',
    link_action_19738: 'Long Jump',
    link_action_19855: 'Stride',
    link_action_19856: 'Strike',
    link_action_19858: 'Sustain',
    link_action_19867: 'Tumble Through',
    link_ancestry_10: 'Orc',
    link_item_17478: 'Immaculate Instrument',
    link_spell_4522: 'Cleanse Affliction',
    link_spell_4821: 'Scrying',
    link_trait_1432: 'Concentrate',
    link_trait_1442: 'Healing',
    link_trait_1448: 'Mental',
    link_trait_1458: 'Linguistic',
    link_trait_1476: 'Poison',
    link_trait_1484: 'Sonic',
    link_trait_1485: 'Void',
    link_trait_1492: 'Aura',
    link_trait_1504: 'Magical',
    link_trait_1508: 'Detection',
    link_trait_1590: 'Scrying',
    link_trait_1857: 'Disease',
    link_trait_1904: 'Death',
    link_trait_1907: 'Revelation',
    link_trait_2398: 'Unarmed',
    link_trait_4072: 'Mythic',
  };
  const prose = entries.flatMap(({ abilities }) =>
    abilities.flatMap(({ description, trigger, requirements }) => [description, trigger, requirements].filter(Boolean))
  );
  const hrefs = new Set(prose.flatMap((text) => [...text.matchAll(/\]\((link_[^)]+)\)/g)].map((match) => match[1])));
  assert.deepEqual([...hrefs].sort(), Object.keys(expectedLinks).sort());
  const targets = [...hrefs].map((href) => {
    const [, type, id] = /^link_(action|ancestry|item|spell|trait)_(\d+)$/.exec(href);
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
      /\b(?:Strikes?|Strides?|Leaps?|Escape|Tumble Through|High Jump|Long Jump|Sustain(?:ing)?|sonic|void|poison|disease|mental|linguistic|concentrate|unarmed|non-mythic|cleanse affliction|scrying|orc|orcs|aura)\b/i
    );
  }
});

test('mythic entities calculate their published defenses, Strikes, and innate spell statistics', async () => {
  const results = await calculateCreatureEntries(entries, 'entity');
  assert.equal(results.length, expected.length);
  for (const result of results) {
    const source = expected.find(({ name }) => name === result.name);
    assert.ok(source, result.name);
    assert.deepEqual(result.errors, [], `${result.name}: operation errors`);
    assert.deepEqual(result.notifications, [], `${result.name}: operation notifications`);
    assert.equal(result.ac, source.ac, `${result.name}: AC`);
    assert.equal(result.hp, source.hp, `${result.name}: HP`);
    assert.equal(result.perception, source.perception, `${result.name}: Perception`);
    assert.deepEqual(result.saves, source.saves, `${result.name}: saves`);
    assert.deepEqual(
      result.skills,
      Object.fromEntries(
        entries.find(({ name }) => name === result.name).skills.map(({ name, value }) => [name, value])
      ),
      `${result.name}: skills`
    );
    assert.deepEqual(
      result.attacks.map(({ bonus }) => bonus),
      source.attackBonuses,
      `${result.name}: Strikes`
    );
    assert.equal(result.spellAttack, result.name === 'Weaver of Webs' ? 28 : null, `${result.name}: spell attack`);
    assert.equal(result.spellDc, result.name === 'Weaver of Webs' ? 36 : null, `${result.name}: spell DC`);
  }
});
