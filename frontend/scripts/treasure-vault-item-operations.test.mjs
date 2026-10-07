import { readReviewedHistoricalSql } from './treasure-vault-historical-test-support.mjs';
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { ItemSchema, InventoryItemSchema } from '../src/schemas/content.ts';
import { createOperationEngine } from './operation-test-harness.mjs';
import { content as emptyContent, inventoryItem, summoner } from './fixtures/eidolon.mjs';

const migration = await readReviewedHistoricalSql(
  new URL('../../supabase/migrations/20261002096000_treasure_vault_item_operations.sql', import.meta.url),
  'utf8'
);
const release = await readReviewedHistoricalSql(
  new URL('../../supabase/release/treasure-vault-item-operations.sql', import.meta.url),
  'utf8'
);
const spec = JSON.parse(migration.split('$operations096$')[1]);
const normalize = (row) => {
  const result = { ...structuredClone(row), uuid: String(row.uuid) };
  delete result.updated_at;
  delete result.search_tsv;
  return result;
};
const item = (row) => ({ ...structuredClone(row), uuid: Number(row.uuid) });
const equal = (a, b) => {
  try {
    assert.deepEqual(a, b);
    return true;
  } catch {
    return false;
  }
};
const stripTimestamps = (value) => {
  if (Array.isArray(value)) return value.map(stripTimestamps);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => key !== 'timestamp')
      .map(([key, child]) => [key, stripTimestamps(child)])
  );
};
function repair(row, patch) {
  const current = normalize(row);
  assert.ok(equal(current, patch.anchor) || equal(current, patch.final), `${patch.id}/complete known state`);
  return item(patch.final);
}

let engine;
let content;
before(async () => {
  engine = await createOperationEngine();
  const traits = spec.dependencies.map((dependency) => item(dependency.anchor));
  engine.setFixtures(traits.map((row) => ({ table: 'trait', row })));
  content = {
    ...emptyContent,
    items: spec.patches.map((patch) => item(patch.anchor)),
    traits,
    defaultSources: { PAGE: [16, 3], INFO: [3] },
  };
});
after(async () => engine?.cleanup());

async function calculate(row, { removed = false, flags = {}, custom = [] } = {}) {
  const character = {
    ...summoner(removed ? [] : [inventoryItem(row, { is_equipped: true, is_invested: true, ...flags })]),
    id: 990096,
    level: 20,
    companions: { list: [] },
    content_sources: { enabled: [16, 3] },
    options: { custom_operations: true, ignore_bulk_limit: true },
    operation_data: { selections: {} },
    custom_operations: custom,
  };
  const saved = structuredClone(character);
  const result = await engine._executeCharacterOperations({
    character,
    content: { ...content, items: content.items.map((existing) => (existing.id === row.id ? row : existing)) },
    context: 'CHARACTER-SHEET',
  });
  assert.deepEqual(character, saved, 'saved inventory and custom adjustments remain unchanged');
  assert.deepEqual(result.errors, []);
  engine.importVariableStore('CHARACTER', result.store);
  return {
    store: stripTimestamps(result.store),
    bonuses: Object.fromEntries(
      ['SKILL_STEALTH', 'SKILL_PERFORMANCE', 'SKILL_DECEPTION', 'SKILL_DIPLOMACY', 'SAVE_FORT', 'SAVE_REFLEX', 'SAVE_WILL'].map(
        (name) => [
          name,
          {
            entries: stripTimestamps(engine.getVariableBonuses('CHARACTER', name)),
            parts: stripTimestamps(engine.getProfValueParts('CHARACTER', name)),
          },
        ]
      )
    ),
  };
}

test('eleven operations-only catalog corrections preserve every original operation identity and four stable additions', () => {
  assert.deepEqual(spec, JSON.parse(release.split('$operations096$')[1]));
  assert.equal(spec.patches.length, 11);
  assert.equal(spec.dependencies.length, 14);
  assert.equal(new Set(spec.patches.map((patch) => patch.id)).size, 11);
  const added = [];
  for (const patch of spec.patches) {
    const original = item(patch.anchor);
    const next = repair(original, patch);
    ItemSchema.parse(original);
    ItemSchema.parse(next);
    InventoryItemSchema.parse(inventoryItem(next));
    assert.deepEqual(repair(next, patch), next);
    assert.deepEqual({ ...normalize(next), operations: original.operations }, normalize(original));
    const oldIds = original.operations.map((operation) => operation.id);
    assert.ok(oldIds.every((id) => next.operations.some((operation) => operation.id === id)));
    assert.equal(new Set(next.operations.map((operation) => operation.id)).size, next.operations.length);
    added.push(...next.operations.filter((operation) => !oldIds.includes(operation.id)).map((operation) => operation.id));
  }
  assert.deepEqual(added.sort(), [
    '89e0a027-cf52-461d-8ac2-7c89af26c619',
    '8dadd8d6-351b-4ab8-88ff-6aa459332037',
    '9c49c899-b40e-4039-85e0-c611145104ef',
    'a6d8371e-ab01-46c0-8c52-e4b60fec3e64',
  ]);
  assert.equal(spec.dependencies.find((dependency) => dependency.id === 1546).name, 'Staff');
  assert.equal(spec.dependencies.find((dependency) => dependency.id === 2861).name, 'Coda');
});

test('complete before and terminal guards reject sibling edits, malformed graphs and unknown fields without modifying inputs', () => {
  for (const patch of spec.patches)
    for (const accepted of [patch.anchor, patch.final]) {
      for (const [key, value] of [
        ['id', -1],
        ['uuid', -1],
        ['name', 'Changed'],
        ['content_source_id', -1],
        ['description', 'Changed'],
        ['craft_requirements', 'Changed'],
        ['usage', 'Changed'],
        ['traits', [-1]],
        ['price', { cp: -1 }],
        ['bulk', '-1'],
        ['operations', []],
      ]) {
        const changed = { ...item(accepted), [key]: value };
        const saved = structuredClone(changed);
        assert.throws(() => repair(changed, patch));
        assert.deepEqual(changed, saved);
      }
      const changedGraph = item(accepted);
      changedGraph.operations[0].data.value = -99;
      assert.throws(() => repair(changedGraph, patch));
      const changedMetadata = item(accepted);
      changedMetadata.meta_data.unreviewed = true;
      assert.throws(() => repair(changedMetadata, patch));
    }
});

test('actual invested Wildwood Ink math applies each base bonus without stacking stronger item bonuses', async () => {
  for (const id of [12726, 12724, 12725]) {
    const patch = spec.patches.find((candidate) => candidate.id === id);
    const original = item(patch.anchor);
    const next = repair(original, patch);
    const baseline = Number(original.operations[0].data.value);
    const before = await calculate(original);
    const after = await calculate(next);
    assert.equal(before.bonuses.SKILL_STEALTH.parts.breakdown.bonusValue, 0);
    assert.equal(after.bonuses.SKILL_STEALTH.parts.breakdown.bonusValue, baseline);
    const forest = after.bonuses.SKILL_STEALTH.entries.find((bonus) => bonus.text);
    assert.equal(forest.value, baseline + 1);
    assert.equal(forest.type, 'item');
    assert.equal(forest.text, 'while in forests');
    const stronger = await calculate(next, {
      custom: [{ id: 'saved-stealth-adjustment', type: 'addBonusToValue', data: { variable: 'SKILL_STEALTH', value: 4, type: 'item', text: '' } }],
    });
    assert.equal(stronger.bonuses.SKILL_STEALTH.parts.breakdown.bonusValue, 4);
  }
});

test('actual instrument math keeps playing-only bonuses conditional instead of adding them while held idle', async () => {
  for (const id of [12559, 12560, 12561, 12275, 12276, 12277]) {
    const patch = spec.patches.find((candidate) => candidate.id === id);
    const original = item(patch.anchor);
    const next = repair(original, patch);
    const before = await calculate(original);
    const after = await calculate(next);
    for (const operation of next.operations) {
      assert.equal(before.bonuses[operation.data.variable].parts.breakdown.bonusValue, Number(operation.data.value));
      assert.equal(after.bonuses[operation.data.variable].parts.breakdown.bonusValue, 0);
      const contextual = after.bonuses[operation.data.variable].entries.filter((bonus) => bonus.source === next.name);
      assert.equal(contextual.length, 1);
      assert.equal(contextual[0].value, Number(operation.data.value));
      assert.equal(contextual[0].type, 'item');
      assert.equal(contextual[0].text, id >= 12559 ? 'while playing the mandolin' : 'while playing the pipes');
    }
  }
});

test('actual Staff of Earth and Deadweight Will descriptors are correctly typed without altering unconditional saves', async () => {
  const staffPatch = spec.patches.find((patch) => patch.id === 12477);
  const staffBefore = await calculate(item(staffPatch.anchor));
  const staffAfter = await calculate(item(staffPatch.final));
  const fortitude = staffAfter.bonuses.SAVE_FORT.entries.find((bonus) => bonus.source === staffPatch.name);
  assert.equal(fortitude.value, 1);
  assert.equal(fortitude.type, 'circumstance');
  assert.match(fortitude.text, /Shove.*prone/);
  assert.equal(staffAfter.bonuses.SAVE_FORT.parts.breakdown.bonusValue, staffBefore.bonuses.SAVE_FORT.parts.breakdown.bonusValue);
  const deadweightPatch = spec.patches.find((patch) => patch.id === 11906);
  const before = await calculate(item(deadweightPatch.anchor));
  const after = await calculate(item(deadweightPatch.final));
  assert.equal(before.bonuses.SAVE_WILL.entries.length, 0);
  assert.equal(after.bonuses.SAVE_WILL.parts.breakdown.bonusValue, before.bonuses.SAVE_WILL.parts.breakdown.bonusValue);
  const will = after.bonuses.SAVE_WILL.entries.find((bonus) => bonus.source === deadweightPatch.name);
  assert.equal(will.value, 3);
  assert.equal(will.type, 'item');
  assert.match(will.text, /force you to move or knock you prone/);
  for (const variable of ['SAVE_FORT', 'SAVE_REFLEX', 'SKILL_ATHLETICS'])
    assert.deepEqual(after.store.bonuses[variable], before.store.bonuses[variable]);
});

test('actual removal and represented inactive equipment states remain identical, including saved custom adjustments', async () => {
  for (const patch of spec.patches) {
    const original = item(patch.anchor);
    const next = repair(original, patch);
    const custom = [{ id: 'saved-untyped-adjustment', type: 'addBonusToValue', data: { variable: 'SAVE_FORT', value: 2, type: 'untyped', text: '' } }];
    assert.deepEqual(await calculate(next, { removed: true, custom }), await calculate(original, { removed: true, custom }));
    if (patch.id !== 11906) {
      const inactive = { flags: { is_invested: false, is_equipped: false }, custom };
      assert.deepEqual(await calculate(next, inactive), await calculate(original, inactive));
    }
  }
  assert.match(spec.boundaries.deadweight, /duration remain manual/);
  assert.match(spec.boundaries.sense_dulling_hood, /carrying the hood/);
  assert.ok(!spec.patches.some((patch) => [12386, 12387].includes(patch.id)));
});

test('SQL is operations-only, atomic and guarded; the release query is strictly read-only', () => {
  assert.match(migration, /lock table public\.content_update in share mode/);
  assert.match(migration, /order by id for update/);
  assert.match(migration, /order by id for share/);
  assert.match(migration, /Preflight every complete owner before the first write/);
  assert.match(migration, /update public\.item i\s+set operations=array/);
  assert.equal((migration.match(/update public\./g) ?? []).length, 1);
  assert.doesNotMatch(migration, /update public\.(character|creature|content_source|content_update)/i);
  for (const fragment of ['captured CAS failed', 'post-trigger owner drift', 'final owner drift', 'final dependency drift', 'final source drift', 'final curator drift'])
    assert.ok(migration.includes(fragment));
  assert.match(migration, /actual is distinct from dependency->'anchor'/);
  assert.match(migration, /upper\(btrim\(coalesce\(u\.status/);
  assert.match(migration, /u\.data->>'uuid'/);
  assert.match(migration, /u\.content_source_id=16 or u\.data->>'content_source_id'='16'/);
  assert.doesNotMatch(release, /^\s*(?:do|update|insert|delete|alter|create|lock|perform|begin|commit)\b/im);
  assert.doesNotMatch(release, /for (?:update|share)/i);
  assert.match(release, /select 'treasure-vault-item-operations' as id/);
  assert.match(release, /as passed\s+from settings;/);
  assert.match(release, /left join public\.trait/);
  assert.match(release, /left join public\.content_source/);
});
