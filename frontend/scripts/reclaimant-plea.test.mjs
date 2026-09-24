import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { after, before, test } from 'node:test';
import { createOperationEngine, readContentRows } from './operation-test-harness.mjs';

const featIds = [28549, 29011, 29012];
const spellIds = [6141, 4773, 4916, 4689, 4522, 4660, 5698, 4576, 4879];
let engine;
let feats;
let content;
let originalFeats;

/** Apply the migration's exact guarded leaf changes to the sanitized content fixture. */
function repairFixture(row, repair) {
  const result = structuredClone(row);
  for (const change of repair.changes) {
    const parent = change.path.slice(0, -1).reduce((value, key) => value[key], result);
    const key = change.path.at(-1);
    if (JSON.stringify(parent[key]) === JSON.stringify(change.after)) continue;
    assert.deepEqual(parent[key], change.before, `published feat ${row.id}: ${change.path.join('.')}`);
    parent[key] = structuredClone(change.after);
  }
  return result;
}

before(async () => {
  engine = await createOperationEngine();
  const fixtures = await readContentRows([
    ...featIds.map((id) => ({ table: 'ability_block', id })),
    ...spellIds.map((id) => ({ table: 'spell', id })),
  ]);
  originalFeats = featIds.map(
    (id) => fixtures.find(({ table, row }) => table === 'ability_block' && row.id === id).row
  );
  const migration = await readFile(
    new URL('../../supabase/migrations/20260924000000_fix_reclaimant_plea.sql', import.meta.url),
    'utf8'
  );
  const repairs = JSON.parse(migration.split('$patches$')[1]);
  feats = originalFeats.map((row) =>
    repairFixture(
      row,
      repairs.find((repair) => repair.id === row.id)
    )
  );
  const spells = fixtures.filter(({ table }) => table === 'spell').map(({ row }) => row);
  content = {
    abilityBlocks: feats,
    spells,
    classes: [],
    ancestries: [],
    backgrounds: [],
    items: [],
    traits: [],
    languages: [],
    archetypes: [],
    versatileHeritages: [],
    classArchetypes: [],
    sources: [],
    defaultSources: { PAGE: [25], INFO: [25] },
  };
  engine.setFixtures([
    ...feats.map((row) => ({ table: 'ability_block', row })),
    ...spells.map((row) => ({ table: 'spell', row })),
  ]);
});
after(async () => engine?.cleanup());

/** Build persisted choices with the original operation and option identities. */
function character(level, choices) {
  const selections = {};
  const operations = [];
  choices.forEach((optionIndex, index) => {
    const feat = originalFeats[index];
    const select = feat.operations.find((operation) => operation.type === 'select');
    const option = select.data.optionsPredefined[optionIndex];
    const grant = `give-${feat.id}`;
    selections[`character_${grant}`] = String(feat.id);
    selections[`character_${grant}_${select.id}`] = option.id;
    operations.push({ id: grant, type: 'giveAbilityBlock', data: { type: 'feat', abilityBlockId: feat.id } });
  });
  return {
    id: 1,
    level,
    details: {},
    inventory: { items: [] },
    options: { custom_operations: true },
    custom_operations: operations,
    operation_data: { selections },
  };
}

async function calculate(sheet) {
  const result = await engine._executeCharacterOperations({ character: sheet, content, context: 'CHARACTER-SHEET' });
  assert.deepEqual(result.errors, []);
  return result.store.variables.SPELL_DATA.value.map(JSON.parse);
}

test('Reclaimant Plea preserves every operation, option, spell and saved choice identity', () => {
  const identities = (value) => {
    if (Array.isArray(value)) return value.flatMap(identities);
    if (!value || typeof value !== 'object') return [];
    return [
      ...('id' in value ? [value.id] : []),
      ...('spellId' in value ? [value.spellId] : []),
      ...Object.values(value).flatMap(identities),
    ];
  };
  assert.deepEqual(identities(feats), identities(originalFeats));
  for (const [index, feat] of feats.entries()) {
    const { operations: before, ...original } = originalFeats[index];
    const { operations: after, ...repaired } = feat;
    assert.deepEqual(repaired, original);
  }
});

test('the first and second Reclaimant Plea choices scale without premature rank-7 grants', async () => {
  // Knights of Lastwall p. 77: ranks 4/5/6 at levels 12/14/16; the second choice begins at 14.
  for (const level of [12, 13, 14, 15, 16, 17, 18, 20]) {
    for (const count of level < 14 ? [1] : [1, 2]) {
      for (let option = 0; option < (count === 1 ? 6 : 8); option++) {
        const choices = count === 1 ? [option] : [option === 0 ? 2 : 0, option];
        const saved = character(level, choices);
        const before = structuredClone(saved.operation_data);
        const data = await calculate(saved);
        const rank = level < 14 ? 4 : level < 16 ? 5 : 6;
        assert.equal(data.length, count, `level ${level}, choices ${choices}`);
        assert.deepEqual(data.map(({ spellId }) => spellId).sort(), choices.map((index) => spellIds[index]).sort());
        for (const spell of data) {
          assert.equal(spell.rank, rank);
          assert.equal(spell.type, 'INNATE');
          assert.equal(spell.tradition, 'DIVINE');
          assert.equal(spell.casts, 1);
        }
        assert.deepEqual(saved.operation_data, before);
      }
    }
  }
});

test('the third Reclaimant Plea choice heightens all three innate spells and survives repeated calculation', async () => {
  for (const level of [18, 19, 20]) {
    for (let option = 0; option < 9; option++) {
      const choices = [option === 0 ? 2 : 0, option === 1 ? 3 : 1, option];
      const saved = character(level, choices);
      const before = structuredClone(saved.operation_data);
      const data = await calculate(saved);
      assert.equal(data.length, 3, `level ${level}, choices ${choices}`);
      assert.deepEqual(data.map(({ spellId }) => spellId).sort(), choices.map((index) => spellIds[index]).sort());
      for (const spell of data) {
        assert.equal(spell.rank, 7);
        assert.equal(spell.type, 'INNATE');
        assert.equal(spell.tradition, 'DIVINE');
        assert.equal(spell.casts, 1);
      }
      assert.equal(engine.getVariable('CHARACTER', 'SPELL_ATTACK').value.value, 'M');
      assert.equal(engine.getVariable('CHARACTER', 'SPELL_DC').value.value, 'M');
      assert.deepEqual(await calculate(saved), data);
      assert.deepEqual(saved.operation_data, before);
    }
  }
});

test('removing the third choice restores the earlier spell ranks without erasing their selections', async () => {
  const saved = character(18, [0, 1, 8]);
  await calculate(saved);
  const before = structuredClone(saved.operation_data);
  saved.custom_operations.pop();
  const data = await calculate(saved);
  assert.equal(data.length, 2);
  assert.deepEqual(
    data.map(({ rank }) => rank),
    [6, 6]
  );
  assert.equal(engine.getVariable('CHARACTER', 'SPELL_ATTACK').value.value, 'E');
  assert.deepEqual(saved.operation_data, before);
});
