import { readReviewedHistoricalSql } from './treasure-vault-historical-test-support.mjs';
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { AbilityBlockSchema, ContentSourceSchema, TraitSchema } from '../src/schemas/content.ts';
import { OperationSchema } from '../src/schemas/operations.ts';
import { createOperationEngine, readContentRows } from './operation-test-harness.mjs';

const migration = await readReviewedHistoricalSql(
  new URL('../../supabase/migrations/20261001220000_treasure_vault_winter_resistance.sql', import.meta.url),
  'utf8'
);
const release = await readReviewedHistoricalSql(
  new URL('../../supabase/release/treasure-vault-winter-resistance.sql', import.meta.url),
  'utf8'
);
const spec = JSON.parse(migration.split('$winter$')[1]);
const rows = await readContentRows([
  ...[51111, 29500, 20730].map((id) => ({ table: 'ability_block', id })),
  ...[3295, 3460, 3487, 3479, 1468, 1542, 1346].map((id) => ({ table: 'trait', id })),
  { table: 'content_source', id: 16 },
]);
const get = (table, id, input = rows) => input.find((entry) => entry.table === table && entry.row.id === id)?.row;
const published = get('ability_block', 51111);
const source = get('content_source', 16);
const dependency = get('trait', 3295);
const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const equal = (left, right) => {
  try {
    assert.deepEqual(left, right);
    return true;
  } catch {
    return false;
  }
};

/** Compare all pinned leaves; this clone model is not a substitute for the SQL rehearsal. */
function fields(row, expected) {
  assert.ok(row);
  for (const [key, value] of Object.entries(expected))
    assert.deepEqual(key === 'uuid' ? String(row[key]) : row[key], value, key);
}
function relevant(update) {
  if (['APPROVED', 'REJECTED'].includes(update.status?.state)) return false;
  const same = (value, expected) => value != null && String(value) === String(expected);
  return spec.targets.some(
    (target) =>
      update.type === target.type &&
      (same(update.ref_id, target.id) ||
        same(update.data?.id, target.id) ||
        (target.uuid && same(update.data?.uuid, target.uuid)) ||
        (update.data?.name === target.name &&
          (target.type === 'content-source' ||
            same(update.content_source_id, target.source) ||
            same(update.data?.content_source_id, target.source))))
  );
}
function stateOf(row, sourceRow = source, traitRow = dependency, queue = []) {
  fields(sourceRow, spec.source.expected);
  fields(traitRow, spec.dependency.expected);
  assert.ok(object(traitRow.meta_data));
  for (const [key, value] of Object.entries(spec.dependency.metadata)) assert.deepEqual(traitRow.meta_data[key], value);
  for (const key of spec.dependency.metadata_absent) assert.equal(Object.hasOwn(traitRow.meta_data, key), false);
  assert.ok(!queue.some(relevant));
  fields(row, spec.owner.expected);
  assert.ok(object(row.meta_data));
  for (const key of spec.owner.metadata_absent) assert.equal(Object.hasOwn(row.meta_data, key), false);
  const pair = { operations: row.operations, source: row.meta_data.source };
  for (const state of ['before', 'after']) if (equal(pair, spec.owner[state])) return state;
  assert.fail('Unreviewed complete Winter operations/citation state');
}
function repair(row, sourceRow = source, traitRow = dependency, queue = []) {
  stateOf(row, sourceRow, traitRow, queue);
  return {
    ...structuredClone(row),
    operations: structuredClone(spec.owner.after.operations),
    meta_data: { ...structuredClone(row.meta_data), source: structuredClone(spec.owner.after.source) },
  };
}
stateOf(published);
const original = {
  ...structuredClone(published),
  operations: structuredClone(spec.owner.before.operations),
  meta_data: { ...structuredClone(published.meta_data), source: structuredClone(spec.owner.before.source) },
};
const proposed = repair(original);
assert.deepEqual(repair(published), proposed, 'the current dump retains the reviewed complete state');
let engine;
before(async () => {
  engine = await createOperationEngine();
});
after(async () => engine?.cleanup());

test('the complete feat changes only its existing conditional qualifier and canonical source metadata', () => {
  assert.deepEqual(spec, JSON.parse(release.split('$winter$')[1]));
  assert.equal(spec.owner.expected.id, 51111);
  assert.equal(spec.owner.expected.uuid, '2502113980657498');
  assert.deepEqual(spec.owner.metadata_absent, ['unselectable', 'deprecated', 'can_select_multiple_times', 'skill']);
  assert.deepEqual(
    Object.keys(spec.owner.expected).sort(),
    Object.keys(original)
      .filter((key) => !['created_at', 'updated_at', 'operations', 'meta_data'].includes(key))
      .sort()
  );
  AbilityBlockSchema.parse(original);
  AbilityBlockSchema.parse(proposed);
  ContentSourceSchema.parse(source);
  TraitSchema.parse(dependency);
  const restored = structuredClone(proposed);
  const conditional = restored.operations[0];
  assert.equal(conditional.id, '174d1f63-c667-426b-8f34-690751fcbebe');
  assert.equal(conditional.data.conditions[0].id, 'a1c82e23-3f93-4fe3-ab5c-7b4c7fdbcd85');
  assert.deepEqual(Object.keys(conditional.data.contributionChecks), [conditional.data.conditions[0].id]);
  assert.deepEqual(conditional.data.contributionChecks[conditional.data.conditions[0].id], {
    categories: ['heritage', 'ancestry-feat', 'class-feat', 'archetype-feat'],
    excludeCurrentContent: true,
    match: 'typed-amount',
  });
  assert.deepEqual(OperationSchema.parse(conditional), conditional);
  delete conditional.data.contributionChecks;
  restored.meta_data.source = structuredClone(original.meta_data.source);
  assert.deepEqual(restored, original);
  assert.deepEqual(proposed.meta_data.source, {
    url: 'https://2e.aonprd.com/Feats.aspx?ID=4102',
    book: 'Treasure Vault (Remastered)',
    page: '185',
  });
});

test('both coupled states replay without mutation; partial states and altered fields fail closed', () => {
  for (const row of [original, proposed]) {
    const frozen = structuredClone(row);
    assert.deepEqual(repair(row), proposed);
    assert.deepEqual(repair(repair(row)), proposed);
    assert.deepEqual(row, frozen);
    for (const [key, value] of Object.entries(spec.owner.expected))
      assert.throws(() => stateOf({ ...row, [key]: value === null ? '' : null }), key);
    for (const value of [null, [], {}, 'serialized']) assert.throws(() => stateOf({ ...row, meta_data: value }));
    for (const key of spec.owner.metadata_absent)
      assert.throws(() => stateOf({ ...row, meta_data: { ...row.meta_data, [key]: null } }));
    for (const operations of [null, [], [{ ...row.operations[0], id: 'changed' }]])
      assert.throws(() => stateOf({ ...row, operations }));
  }
  assert.throws(() => stateOf({ ...original, operations: proposed.operations }));
  assert.throws(() => stateOf({ ...proposed, operations: original.operations }));
  for (const row of [original, proposed]) {
    const extended = { ...structuredClone(row), future_column: { values: [null, 42] } };
    extended.meta_data.future_extension = { nested: [null, { retain: true }] };
    const result = repair(extended);
    assert.deepEqual(result.future_column, extended.future_column);
    assert.deepEqual(result.meta_data.future_extension, extended.meta_data.future_extension);
  }
});

test('source, trait classification and pending submissions remain guards on first apply and replay', () => {
  for (const row of [original, proposed]) {
    for (const [key, value] of Object.entries(spec.source.expected))
      assert.throws(() => stateOf(row, { ...source, [key]: value === null ? '' : null }));
    for (const [key, value] of Object.entries(spec.dependency.expected))
      assert.throws(() => stateOf(row, source, { ...dependency, [key]: value === null ? '' : null }));
    for (const key of spec.dependency.metadata_absent)
      assert.throws(() =>
        stateOf(row, source, { ...dependency, meta_data: { ...dependency.meta_data, [key]: false } })
      );
    assert.throws(() => stateOf(row, source, { ...dependency, meta_data: { archetype_trait: false } }));
    for (const target of spec.targets) {
      const payloads = [
        { ref_id: target.id, data: {} },
        { data: { id: String(target.id) } },
        { data: { name: target.name, content_source_id: target.source } },
      ];
      if (target.uuid) payloads.push({ data: { uuid: target.uuid } });
      for (const payload of payloads) {
        for (const status of [null, {}, { state: 'PENDING' }, { state: 'UNKNOWN' }, { state: null }])
          assert.throws(() =>
            stateOf(row, source, dependency, [{ type: target.type, content_source_id: 999, ...payload, status }])
          );
        for (const state of ['APPROVED', 'REJECTED'])
          assert.doesNotThrow(() =>
            stateOf(row, source, dependency, [{ type: target.type, ...payload, status: { state } }])
          );
      }
    }
    assert.doesNotThrow(() =>
      stateOf(row, source, dependency, [{ type: 'ability-block', ref_id: -1, data: {}, status: {} }])
    );
  }
});

const grants = {
  winter: {
    id: 'ba7dd003-3d72-43c7-a9c5-3e4a249a1ba8',
    type: 'giveAbilityBlock',
    data: { type: 'feat', abilityBlockId: 51111 },
  },
  relic: {
    id: 'e2950000-4024-4cae-82f2-35a654a8a821',
    type: 'giveAbilityBlock',
    data: { type: 'feat', abilityBlockId: 29500 },
  },
  heritage: {
    id: 'c2073000-285d-4318-9ad0-e5fbc67b2d20',
    type: 'giveAbilityBlock',
    data: { type: 'heritage', abilityBlockId: 20730 },
  },
};

test('actual catalog after-state excludes the published relic and keeps eligible heritage in both grant orders', async () => {
  const selector = get('ability_block', 29500).operations.find((operation) => operation.type === 'select');
  const fire = selector.data.optionsPredefined.find((option) => option.title === 'Fire');
  const selections = { [`character_${grants.relic.id}_${selector.id}`]: fire.id };
  for (const [state, order, expected] of [
    ['before', ['relic', 'winter'], 14],
    ['after', ['relic', 'winter'], 7],
    ['after', ['winter', 'relic'], 7],
    ['after', ['heritage', 'winter'], 14],
    ['after', ['winter', 'heritage'], 14],
    ['after', ['winter'], 7],
    ['after', ['heritage', 'relic', 'winter'], 14],
  ]) {
    const input = structuredClone(rows);
    input.find((entry) => entry.table === 'ability_block' && entry.row.id === 51111).row = structuredClone(
      state === 'after' ? proposed : original
    );
    engine.setFixtures(input);
    const character = {
      id: 990122,
      name: 'Winter catalog regression',
      level: 14,
      details: { conditions: [] },
      inventory: { items: [], coins: { cp: 0, sp: 0, gp: 0, pp: 0 } },
      operation_data: { selections },
      content_sources: { enabled: [1, 3, 13, 16] },
      meta_data: { reset_hp: false },
      options: { custom_operations: true, ignore_bulk_limit: true },
      custom_operations: order.map((key) => grants[key]),
      companions: { list: [] },
    };
    const saved = structuredClone(character),
      catalog = structuredClone(input);
    const result = await engine._executeCharacterOperations({
      character,
      context: 'CHARACTER-SHEET',
      content: {
        abilityBlocks: input.filter((entry) => entry.table === 'ability_block').map((entry) => entry.row),
        traits: input.filter((entry) => entry.table === 'trait').map((entry) => entry.row),
        sources: [source],
        items: [],
        classes: [],
        ancestries: [],
        backgrounds: [],
        languages: [],
        spells: [],
        archetypes: [],
        versatileHeritages: [],
        classArchetypes: [],
        creatures: [],
        defaultSources: { PAGE: [1, 3, 13, 16], INFO: [1, 3, 13, 16] },
      },
    });
    assert.deepEqual(result.errors, []);
    engine.importVariableStore('CHARACTER', result.store);
    const values = result.store.variables.RESISTANCES.value
      .map((value) => engine.compileExpressions('CHARACTER', value, true))
      .filter((value) => value.startsWith('fire,'))
      .map((value) => Number(value.split(',')[1].trim()));
    assert.equal(Math.max(0, ...values), expected, `${state}/${order.join(',')}`);
    assert.deepEqual(character, saved);
    assert.deepEqual(input, catalog);
  }
});

test('SQL pins complete state, locks before no-op, uses full CAS/readback and requires the strict terminal release', () => {
  const childPrelockStart = migration.indexOf('-- Acquire reviewed content rows before source cache locks.');
  const childPrelockEnd = migration.indexOf('-- End reviewed content row prelocks.');
  assert.ok(migration.indexOf('lock table public.content_update') < childPrelockStart);
  assert.ok(
    childPrelockStart < childPrelockEnd &&
      childPrelockEnd < migration.indexOf('from public.content_source', migration.indexOf('\nbegin\n'))
  );
  const childPrelocks = migration.slice(childPrelockStart, childPrelockEnd);
  assert.doesNotMatch(childPrelocks, /\b(?:update|insert|delete)\s+public\.|\b(?:continue|return)\b/i);
  assert.match(childPrelocks, /public\.ability_block where id=\(spec#>>'\{owner,expected,id\}'\)::bigint for update;/);
  assert.match(childPrelocks, /public\.trait where id=\(spec#>>'\{dependency,expected,id\}'\)::bigint for share;/);
  const body = migration.split('$winter$')[2];
  assert.match(body, /lock table public\.content_update in share mode/);
  assert.ok(body.indexOf('pending or malformed') < body.indexOf('then return'));
  assert.match(body, /for update/);
  assert.match(body, /for share/);
  assert.match(body, /is not distinct from captured/);
  assert.match(body, /changed<>1/);
  assert.match(body, /body is distinct from expected_after/);
  assert.match(body, /write changed an unrelated source field/);
  assert.match(body, /write changed an unrelated dependency field/);
  assert.doesNotMatch(body, /update public\.(character|trait|content_source)|set (description|name|uuid)\s*=/);
  assert.match(release, /coalesce\(\(select/);
  assert.match(release, /owner,after,operations/);
  assert.match(release, /pending|coalesce\(u.status/);
});
