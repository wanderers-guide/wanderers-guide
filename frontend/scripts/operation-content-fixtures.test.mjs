import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import * as harness from './operation-test-harness.mjs';

test('historical content is an explicit opt-in and never replaces the current catalog reader', async () => {
  const path = new URL('../../data/data.sql', import.meta.url);
  const digest = async () =>
    createHash('sha256')
      .update(await readFile(path))
      .digest('hex');
  const before = await digest();
  const targets = [11728, 11730].map((id) => ({ table: 'item', id }));
  const current = await harness.readContentRows(targets);
  const historical = await harness.readHistoricalContentRows(targets);
  assert.deepEqual(
    current.map(({ row }) => [row.id, row.group]),
    [
      [11728, 'GENERAL'],
      [11730, 'GENERAL'],
    ]
  );
  assert.deepEqual(
    historical.map(({ row }) => [row.id, row.group]),
    [
      [11728, 'WEAPON'],
      [11730, 'WEAPON'],
    ]
  );
  assert.deepEqual(await harness.readContentRows(targets), current);
  assert.equal(await digest(), before, 'Reading old fixtures must not write or swap data/data.sql');
});

test('historical ID and source selections retain COPY decoding and reject absent historical identities', async () => {
  const targets = [
    { table: 'item', id: 11746 },
    { table: 'ability_block', id: 19611 },
    { table: 'content_source', id: 16 },
  ];
  const rows = await harness.readHistoricalContentRows(targets);
  const staff = rows.find(({ table }) => table === 'item').row;
  const cast = rows.find(({ table }) => table === 'ability_block').row;
  const source = rows.find(({ table }) => table === 'content_source').row;
  assert.deepEqual(staff.operations[0].data, {
    text: 'to checks using Animal Empathy',
    type: 'circumstance',
    value: 1,
    variable: 'SKILL_DIPLOMACY',
  });
  assert.ok(staff.traits.includes(1546));
  assert.equal(cast.type, 'action');
  assert.equal(cast.actions, null);
  assert.equal(source.is_published, true);
  assert.equal(source.user_id, null);
  const book = await harness.readHistoricalContentRows([{ table: 'item', sourceIds: [16] }]);
  assert.deepEqual(
    book.find(({ row }) => row.id === staff.id),
    { table: 'item', row: staff }
  );
  await assert.rejects(
    harness.readHistoricalContentRows([{ table: 'item', id: 23465 }]),
    /Content fixtures missing: item:23465/
  );
  const current = await harness.readContentRows([{ table: 'item', id: 23465 }]);
  assert.equal(current[0].row.name, 'Animal Pseudopod');
});

test('current Bagpipes classifications preserve actual staff casting and cannot create weapon attacks', async () => {
  const rows = await harness.readContentRows([
    ...[11728, 11730].map((id) => ({ table: 'item', id })),
    { table: 'trait', id: 1546 },
  ]);
  const engine = await harness.createOperationEngine();
  try {
    engine.setFixtures(rows);
    for (const { table, row } of rows) {
      if (table !== 'item') continue;
      const saved = structuredClone(row);
      assert.equal(row.group, 'GENERAL');
      assert.equal(engine.isItemWeapon(row), false);
      assert.equal(engine.isItemStave(row), true);
      assert.deepEqual(row, saved);
    }
  } finally {
    await engine.cleanup();
  }
});
