import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { after, before, test } from 'node:test';
import { AbilityBlockSchema } from '../src/schemas/content.ts';
import { createOperationEngine, readContentRows } from './operation-test-harness.mjs';

const migration = await readFile(
  new URL('../../supabase/migrations/20260930020000_war_of_immortals_bloodrager_progression.sql', import.meta.url),
  'utf8'
);
const trainedOperations = JSON.parse(migration.split('$trained_operations$')[1]);
const expertOperations = JSON.parse(migration.split('$expert_operations$')[1]);
const masterSlots = JSON.parse(migration.split('$master_slots$')[1]);
const slotOperationId = 'bdbdc81a-12a5-4b55-9d14-6090e674e69c';
const affectedIds = [38522, 39154, 39155];
const targets = [
  ...[...affectedIds, 38523, 39150].map((id) => ({ table: 'ability_block', id })),
  { table: 'trait', sourceIds: [400] },
  { table: 'class', id: 108 },
  { table: 'class_archetype', id: 34 },
];
const traditions = {
  ARCANE: { option: '6d266e7d-93ee-41c0-96c1-f4ec77043c3c', skill: 'SKILL_ARCANA' },
  DIVINE: { option: '76a890fd-327b-43f0-a1f6-76581847e2cb', skill: 'SKILL_RELIGION' },
};
let engine;
let currentRows;
let originalRows;
let patchedRows;
let patchedSnapshot;

/** Recover the reviewed before state from either an unpatched or refreshed sanitized dump. */
function reviewedBeforeState(rows) {
  const original = structuredClone(rows);
  const feat = (id) => original.find(({ table, row }) => table === 'ability_block' && row.id === id).row;
  const dedication = feat(38522);
  assert.ok([2, 4].includes(dedication.operations.length));
  if (dedication.operations.length === 4) {
    assert.deepEqual(dedication.operations.slice(2), trainedOperations);
    dedication.operations = dedication.operations.slice(0, 2);
  }
  for (const patch of expertOperations) {
    const operation = feat(39154).operations.find(({ id }) => id === patch.operation_id);
    assert.equal(operation?.data.variable, patch.variable);
    assert.ok(['U', 'E'].includes(operation.data.value.value));
    operation.data.value.value = 'U';
  }
  const slotOperation = feat(39155).operations.find(({ id }) => id === slotOperationId);
  for (const patch of masterSlots) {
    const matching = slotOperation.data.slots.filter(({ lvl, rank }) => lvl === patch.lvl && rank === patch.rank);
    assert.ok(matching.length <= 1);
    if (matching.length) assert.deepEqual(matching[0], patch);
    slotOperation.data.slots = slotOperation.data.slots.filter(
      ({ lvl, rank }) => lvl !== patch.lvl || rank !== patch.rank
    );
  }
  return original;
}

/** Apply the migration's exact reviewed changes to an isolated content snapshot. */
function applyMigration(rows) {
  const patched = structuredClone(rows);
  const feat = (id) => patched.find(({ table, row }) => table === 'ability_block' && row.id === id).row;
  const dedication = feat(38522);
  assert.equal(dedication.operations.length, 2);
  dedication.operations.push(...structuredClone(trainedOperations));
  const surging = feat(39154);
  for (const patch of expertOperations) {
    const operation = surging.operations.find(({ id }) => id === patch.operation_id);
    assert.equal(operation?.data.variable, patch.variable);
    assert.equal(operation.data.value.value, 'U');
    operation.data.value.value = 'E';
  }
  const slots = feat(39155).operations.find(({ id }) => id === slotOperationId).data.slots;
  for (const patch of masterSlots) {
    assert.ok(!slots.some(({ lvl, rank }) => lvl === patch.lvl && rank === patch.rank));
    slots.push(structuredClone(patch));
  }
  return patched;
}

before(async () => {
  engine = await createOperationEngine();
  currentRows = await readContentRows(targets);
  originalRows = reviewedBeforeState(currentRows);
  patchedRows = applyMigration(originalRows);
  patchedSnapshot = structuredClone(patchedRows);
});

after(async () => engine?.cleanup());

function slotCounts(store, level, source = 'BLOODRAGER') {
  const counts = Array(8).fill(0);
  for (const encoded of store.variables.SPELL_SLOTS.value) {
    const slot = JSON.parse(encoded);
    if (slot.source === source && slot.lvl === level) counts[slot.rank - 1] += slot.amt ?? 0;
  }
  return counts;
}

/** Execute the real feat operations and spell-stat helpers, with only remote reads replaced by fixtures. */
async function calculate(level, tradition, { rows = patchedRows, spellRank = 'U', otherSource = false } = {}) {
  engine.setFixtures(rows);
  const byTable = (table) => rows.filter((entry) => entry.table === table).map(({ row }) => row);
  const content = {
    abilityBlocks: byTable('ability_block'),
    classes: byTable('class'),
    classArchetypes: byTable('class_archetype'),
    traits: byTable('trait'),
    ancestries: [],
    backgrounds: [],
    items: [],
    languages: [],
    spells: [],
    archetypes: [],
    versatileHeritages: [],
    sources: [],
    defaultSources: { PAGE: [1, 400], INFO: [1, 400] },
  };
  const featIds = [
    38522,
    ...(level >= 4 ? [39150] : []),
    ...(level >= 12 ? [39154] : []),
    ...(level >= 18 ? [39155] : []),
  ];
  const character = {
    id: 1,
    level,
    details: {},
    inventory: { items: [] },
    operation_data: {
      selections: {
        'character_grant-38522_95b015f2-e0f0-4d5b-ac1e-43539f7cae60': traditions[tradition].option,
      },
    },
    content_sources: { enabled: [1, 400] },
    options: { custom_operations: true, ignore_bulk_limit: true },
    custom_operations: [
      { id: 'baseline-charisma', type: 'setValue', data: { variable: 'ATTRIBUTE_CHA', value: { value: 3 } } },
      ...['SPELL_ATTACK', 'SPELL_DC'].map((variable) => ({
        id: `baseline-${variable}`,
        type: 'setValue',
        data: { variable, value: { value: spellRank } },
      })),
      ...(otherSource
        ? [
            {
              id: 'other-casting-source',
              type: 'defineCastingSource',
              data: { variable: 'CASTING_SOURCES', value: 'OTHER:::SPONTANEOUS-REPERTOIRE:::OCCULT:::ATTRIBUTE_INT' },
            },
            {
              id: 'other-spell-slots',
              type: 'giveSpellSlot',
              data: { castingSource: 'OTHER', slots: [{ lvl: level, rank: 1, amt: 1 }] },
            },
          ]
        : []),
      ...featIds.map((abilityBlockId) => ({
        id: `grant-${abilityBlockId}`,
        type: 'giveAbilityBlock',
        data: { type: 'feat', abilityBlockId },
      })),
    ],
  };
  const saved = structuredClone(character);
  const result = await engine._executeCharacterOperations({ character, content, context: 'CHARACTER-SHEET' });
  assert.deepEqual(result.errors, []);
  assert.deepEqual(character, saved, 'calculation preserves saved choices');
  const stats = engine.getSpellStats('CHARACTER', null, tradition, 'ATTRIBUTE_CHA');
  return { store: result.store, stats };
}

test('the repair validates whole rows and preserves existing IDs, choices, prose and unrelated content', () => {
  assert.match(migration, /status->>'state' = 'PENDING'/);
  assert.deepEqual(
    reviewedBeforeState(patchedRows),
    originalRows,
    'a refreshed repaired dump retains the same reviewed fixture'
  );
  for (const id of affectedIds) {
    const original = originalRows.find(({ table, row }) => table === 'ability_block' && row.id === id).row;
    const changed = patchedRows.find(({ table, row }) => table === 'ability_block' && row.id === id).row;
    assert.ok(AbilityBlockSchema.safeParse(changed).success, `whole-row schema for ${changed.name}`);
    assert.deepEqual({ ...changed, operations: original.operations }, original);
    if (id === 38522) {
      assert.deepEqual(changed.operations.slice(0, 2), original.operations, 'tradition and Harvest Blood choices');
      assert.deepEqual(changed.operations.slice(2), trainedOperations);
    } else if (id === 39154) {
      assert.deepEqual(changed.operations[0], original.operations[0], 'existing expert slots');
      for (const patch of expertOperations) {
        const before = original.operations.find(({ id }) => id === patch.operation_id);
        assert.deepEqual(
          changed.operations.find(({ id }) => id === patch.operation_id),
          {
            ...before,
            data: { ...before.data, value: { ...before.data.value, value: 'E' } },
          }
        );
      }
    } else {
      const before = original.operations.find(({ id }) => id === slotOperationId);
      const after = changed.operations.find(({ id }) => id === slotOperationId);
      assert.deepEqual(after, { ...before, data: { ...before.data, slots: [...before.data.slots, ...masterSlots] } });
      assert.deepEqual(changed.operations.slice(0, 2), original.operations.slice(0, 2), 'existing master ranks');
    }
  }
  for (const entry of originalRows.filter(
    ({ table, row }) => table !== 'ability_block' || !affectedIds.includes(row.id)
  )) {
    assert.deepEqual(
      patchedRows.find(({ table, row }) => table === entry.table && row.id === entry.row.id),
      entry
    );
  }
});

test('the reviewed before state demonstrates all three Bloodrager progression failures', async () => {
  for (const tradition of Object.keys(traditions)) {
    for (const level of [2, 12]) {
      const { store } = await calculate(level, tradition, { rows: originalRows });
      assert.equal(store.variables.SPELL_ATTACK.value.value, 'U');
      assert.equal(store.variables.SPELL_DC.value.value, 'U');
    }
    for (const level of [18, 19, 20]) {
      const { store } = await calculate(level, tradition, { rows: originalRows });
      assert.deepEqual(slotCounts(store, level), [2, 2, 2, 2, 2, 2, 0, 0]);
    }
  }
});

const progression = [
  [2, 'T', [0, 0, 0, 0, 0, 0, 0, 0]],
  [4, 'T', [1, 0, 0, 0, 0, 0, 0, 0]],
  [6, 'T', [1, 1, 0, 0, 0, 0, 0, 0]],
  [8, 'T', [1, 1, 1, 0, 0, 0, 0, 0]],
  [12, 'E', [1, 1, 1, 1, 0, 0, 0, 0]],
  [14, 'E', [1, 1, 1, 1, 1, 0, 0, 0]],
  [16, 'E', [1, 1, 1, 1, 1, 1, 0, 0]],
  [18, 'M', [2, 2, 2, 2, 2, 2, 2, 0]],
  [19, 'M', [2, 2, 2, 2, 2, 2, 2, 0]],
  [20, 'M', [2, 2, 2, 2, 2, 2, 2, 2]],
];
for (const [level, rank, expectedSlots] of progression) {
  test(`Arcane and Divine Bloodragers have the correct ranks, statistics and slots at level ${level}`, async () => {
    for (const tradition of Object.keys(traditions)) {
      const { store, stats } = await calculate(level, tradition);
      assert.equal(store.variables.SPELL_ATTACK.value.value, rank);
      assert.equal(store.variables.SPELL_DC.value.value, rank);
      assert.equal(store.variables[traditions[tradition].skill].value.value, 'T');
      assert.ok(
        store.variables.CASTING_SOURCES.value.includes(
          `BLOODRAGER:::SPONTANEOUS-REPERTOIRE:::${tradition}:::ATTRIBUTE_CHA`
        )
      );
      assert.deepEqual(slotCounts(store, level), expectedSlots);
      const attack = level + { T: 2, E: 4, M: 6 }[rank] + 3;
      assert.deepEqual(stats.spell_attack.total, [attack, attack - 5, attack - 10]);
      assert.equal(stats.spell_dc.total, 10 + attack);
    }
  });
}

test('Bloodrager grants never lower existing proficiency or alter another casting source', async () => {
  for (const [level, rank, slots] of progression.filter(([level]) => [2, 12, 18, 20].includes(level))) {
    for (const tradition of Object.keys(traditions)) {
      for (const spellRank of ['E', 'M', 'L']) {
        const { store } = await calculate(level, tradition, { spellRank, otherSource: true });
        const expected =
          ['U', 'T', 'E', 'M', 'L'].indexOf(spellRank) > ['U', 'T', 'E', 'M', 'L'].indexOf(rank) ? spellRank : rank;
        assert.equal(store.variables.SPELL_ATTACK.value.value, expected);
        assert.equal(store.variables.SPELL_DC.value.value, expected);
        assert.deepEqual(slotCounts(store, level), slots);
        assert.deepEqual(slotCounts(store, level, 'OTHER'), [1, 0, 0, 0, 0, 0, 0, 0]);
        assert.ok(
          store.variables.CASTING_SOURCES.value.includes('OTHER:::SPONTANEOUS-REPERTOIRE:::OCCULT:::ATTRIBUTE_INT')
        );
      }
    }
  }
  assert.deepEqual(patchedRows, patchedSnapshot, 'calculation leaves source content unchanged');
  assert.deepEqual(currentRows, await readContentRows(targets), 'the checked-in content dump is unchanged');
});
