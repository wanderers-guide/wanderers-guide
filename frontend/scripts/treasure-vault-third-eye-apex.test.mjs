import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { before, after, test } from 'node:test';
import { ItemSchema } from '../src/schemas/content.ts';
import { createOperationEngine, readContentRows } from './operation-test-harness.mjs';
import { content as emptyContent, inventoryItem, summoner } from './fixtures/eidolon.mjs';

const migration = await readFile(
  new URL('../../supabase/migrations/20261002090000_treasure_vault_third_eye_apex.sql', import.meta.url),
  'utf8'
);
const release = await readFile(
  new URL('../../supabase/release/treasure-vault-third-eye-apex.sql', import.meta.url),
  'utf8'
);
const spec = JSON.parse(migration.split('$third_eye$')[1]);
const patch = spec.items[0];
const original = { ...patch.anchor, uuid: Number(patch.anchor.uuid), created_at: '', operations: patch.before };
const fixed = { ...structuredClone(original), operations: patch.after };
const conditionalId = '82d5f011-36b4-4f02-8b3c-8777f543649d';
const oldBoostId = '2d958fbe-7678-491e-9598-985fd1deb0e5';
let engine;
let fixtures;
let content;

before(async () => {
  engine = await createOperationEngine();
  fixtures = await readContentRows([{ table: 'trait', sourceIds: Array.from({ length: 10000 }, (_, id) => id) }]);
  content = { ...emptyContent, traits: fixtures.map(({ row }) => row), items: [original] };
});
after(async () => {
  await engine?.cleanup();
});

async function calculate(item, value, partial = false, flags = {}, removed = false) {
  engine.setFixtures([...fixtures, { table: 'item', row: item }]);
  const character = {
    ...summoner(removed ? [] : [inventoryItem(item, { is_invested: true, is_equipped: true, ...flags })]),
    level: 20,
    companions: { list: [] },
    options: { custom_operations: true },
    custom_operations: [
      {
        id: 'c5443301-7cb6-4240-aed3-d837da974bfd',
        type: 'setValue',
        data: { variable: 'ATTRIBUTE_WIS', value: { value, partial } },
      },
    ],
  };
  const saved = structuredClone(character);
  const result = await engine._executeCharacterOperations({
    character,
    content: { ...content, items: [item] },
    context: 'CHARACTER-SHEET',
  });
  assert.deepEqual(result.errors, []);
  assert.deepEqual(
    character,
    saved,
    'calculating item benefits never rewrites the saved inventory or custom adjustment'
  );
  return {
    wisdom: {
      ...result.store.variables.ATTRIBUTE_WIS.value,
      partial: !!result.store.variables.ATTRIBUTE_WIS.value.partial,
    },
    perceptionBonuses: (result.store.bonuses.PERCEPTION ?? []).map(({ timestamp, ...bonus }) => bonus),
  };
}

test('the existing Third Eye graph gains exactly one peer half-boost, preserving every original identity and non-operation column', () => {
  assert.deepEqual(spec, JSON.parse(release.split('$third_eye$')[1]));
  assert.equal(spec.items.length, 1);
  assert.equal(patch.id, 11696);
  assert.equal(patch.anchor.content_source_id, 16);
  ItemSchema.parse(original);
  ItemSchema.parse(fixed);
  assert.equal(fixed.operations[1].id, conditionalId);
  assert.equal(fixed.operations[1].data.falseOperations[0].id, oldBoostId);
  assert.deepEqual(fixed.operations[1].data.falseOperations[1], {
    ...original.operations[1].data.falseOperations[0],
    id: patch.additional_boost_id,
  });
  assert.notEqual(patch.additional_boost_id, oldBoostId);
  const restored = structuredClone(fixed);
  restored.operations[1].data.falseOperations.pop();
  assert.deepEqual(restored, original);
  assert.deepEqual(
    spec.sources.map(({ id }) => id),
    [1, 16]
  );
  assert.ok(spec.sources.every((source) => source.user_id === null && source.is_published && !source.require_key));
  assert.ok(!migration.includes('update public.character'));
  assert.ok(!migration.includes('update public.content_source'));
});

test('the SQL and read-only release check guard owner identity, both complete graphs, sources, pending work and exact readback', () => {
  assert.match(migration, /lock table public\.content_update in share mode/);
  assert.match(migration, /public\.item where id=.*for update/);
  assert.match(migration, /owner baseline drift/);
  assert.match(migration, /unreviewed operation graph/);
  assert.match(migration, /captured CAS failed/);
  assert.match(migration, /immediate readback drift/);
  assert.match(migration, /final owner readback drift/);
  assert.match(migration, /final pending content requires review/);
  for (const sql of [migration, release]) {
    assert.match(sql, /u\.ref_id=/);
    assert.match(sql, /u\.data->>'uuid'/);
    assert.match(sql, /u\.data->>'content_source_id'/);
    assert.match(sql, /not in \('APPROVED','REJECTED'\)/);
    assert.match(sql, /source_spec/);
    assert.match(sql, /lower\(btrim\(u\.data->>'name'\)\)/);
  }
  assert.ok(!/\b(update|insert|delete)\s/i.test(release), 'the release query only reads the database');
});

test('actual controller gives the full printed point at and above +4 and preserves fractional custom baselines across reload', async () => {
  for (const [value, partial] of [
    [-1, false],
    [0, false],
    [3, false],
    [4, false],
    [4, true],
    [4.5, false],
    [5, false],
    [5, true],
    [5.5, false],
    [6, false],
  ]) {
    const prior = await calculate(original, value, partial);
    const actual = await calculate(fixed, value, partial);
    assert.deepEqual(
      prior.wisdom,
      value < 4 ? { value: 4, partial: false } : { value: value + (partial ? 1 : 0), partial: !partial }
    );
    assert.deepEqual(actual.wisdom, value < 4 ? { value: 4, partial: false } : { value: value + 1, partial });
    assert.deepEqual(
      actual.perceptionBonuses,
      prior.perceptionBonuses,
      'the existing +2 Perception item bonus is unchanged'
    );
    assert.deepEqual(await calculate(JSON.parse(JSON.stringify(fixed)), value, partial), actual);
  }
});

test('uninvestment, formula-only ownership and removal restore the exact saved baseline; worn usage retains its existing equipment behavior', async () => {
  for (const [value, partial] of [
    [3, false],
    [4, false],
    [4, true],
    [5, false],
  ]) {
    assert.deepEqual((await calculate(fixed, value, partial, { is_invested: false })).wisdom, { value, partial });
  }
  assert.deepEqual((await calculate(fixed, 4, false, { is_equipped: false })).wisdom, { value: 5, partial: false });
  assert.deepEqual((await calculate(fixed, 4, false, { is_formula: true })).wisdom, { value: 4, partial: false });
  assert.deepEqual((await calculate(fixed, 4, false, {}, true)).wisdom, { value: 4, partial: false });
});

test('ordinary PC attribute increases above +4 remain half-boosts, including existing partial progress', async () => {
  for (const partial of [false, true]) {
    engine.resetVariables('CHARACTER');
    engine.setVariable('CHARACTER', 'ATTRIBUTE_STR', { value: 4, partial });
    await engine.runOperations('CHARACTER', { path: 'ordinary-pc-control', node: { value: null, children: {} } }, [
      {
        id: '2b24fdc6-1e5b-4e7d-9dc7-90109e850194',
        type: 'adjValue',
        data: { variable: 'ATTRIBUTE_STR', value: { value: 1 } },
      },
    ]);
    assert.deepEqual(engine.getVariable('CHARACTER', 'ATTRIBUTE_STR').value, {
      value: partial ? 5 : 4,
      partial: !partial,
    });
  }
});
