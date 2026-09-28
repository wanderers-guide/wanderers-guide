import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { readContentRows } from './operation-test-harness.mjs';

const migration = await readFile(
  new URL('../../supabase/migrations/20260928020000_war_of_immortals_hazards.sql', import.meta.url),
  'utf8'
);
const entries = JSON.parse(migration.split('$entries$')[1]);

const expected = [
  ['Boneburst', 14, 209, 464, 'COMPLEX', 2],
  ["Lightning's Dance", 11, 191, 460, 'COMPLEX', 2],
  ['Primal Chaos Aura', 5, 191, 461, 'COMPLEX', 2],
  ['Trump of the Oliphaunt', 12, 196, 463, 'COMPLEX', 1],
  ['Wind Surge', 7, 191, 462, 'SIMPLE', null],
];

test('War of Immortals imports every indexed hazard with its own source citation', async () => {
  const [{ row: source }] = await readContentRows([{ table: 'content_source', id: 400 }]);
  assert.equal(source.name, 'War of Immortals');
  assert.equal(entries.length, expected.length);
  assert.equal(new Set(entries.map(({ uuid }) => uuid)).size, expected.length);

  for (const [name, level, page, aonId, complexity, routineActions] of expected) {
    const entry = entries.find((candidate) => candidate.name === name);
    assert.ok(entry, name);
    assert.equal(entry.level, level);
    assert.equal(entry.page, String(page));
    assert.equal(entry.url, `https://2e.aonprd.com/Hazards.aspx?ID=${aonId}`);
    assert.equal(entry.details.complexity, complexity);
    assert.equal(entry.details.routine?.actions ?? null, routineActions);
    assert.equal(entry.details.activation.actions, 'REACTION');
    for (const text of [
      entry.details.stealth,
      entry.details.description,
      entry.details.disable,
      entry.details.activation.trigger,
      entry.details.activation.effect,
    ]) {
      assert.ok(typeof text === 'string' && text.length > 10, `${name} is missing rule text`);
    }
    if (routineActions) {
      assert.ok(entry.details.routine.text.length > 40);
      assert.ok(entry.details.reset.length > 20);
    } else {
      assert.equal(entry.details.routine, undefined);
      assert.equal(entry.details.reset, undefined);
    }
  }
});

test('linked traits and spell references resolve to existing official content', async () => {
  const traitIds = new Set(entries.flatMap(({ details }) => details.trait_ids));
  const rows = await readContentRows([
    ...[...traitIds].map((id) => ({ table: 'trait', id })),
    ...[4650, 4899, 4414, 4851, 4830, 4668].map((id) => ({ table: 'spell', id })),
  ]);
  const traits = new Map(rows.filter(({ table }) => table === 'trait').map(({ row }) => [row.id, row.name]));
  for (const id of traitIds) assert.ok(traits.has(id), `missing trait ${id}`);
  assert.deepEqual(
    rows.filter(({ table }) => table === 'spell').map(({ row }) => row.name.toLowerCase()).sort(),
    ['gust of wind', 'thunderstrike', 'blazing bolt', 'spider sting', 'shatter', 'hydraulic push'].sort()
  );
  assert.ok(migration.includes("400, (entry->>'uuid')::bigint, (entry->'details')::json, false, 'hazard'"));
  assert.doesNotMatch(migration, /update public\.(creature|character)\b/i);
});
