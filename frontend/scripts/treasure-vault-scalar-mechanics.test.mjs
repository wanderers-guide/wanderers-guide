import { readReviewedHistoricalSql } from './treasure-vault-historical-test-support.mjs';
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { ItemSchema } from '../src/schemas/content.ts';
import { convertToGp, purchase } from '../src/process/items/currency-handler.ts';
import { createOperationEngine } from './operation-test-harness.mjs';
import { inventoryItem } from './fixtures/eidolon.mjs';

const migration = await readReviewedHistoricalSql(
  new URL('../../supabase/migrations/20261002095000_treasure_vault_scalar_mechanics.sql', import.meta.url),
  'utf8'
);
const release = await readReviewedHistoricalSql(
  new URL('../../supabase/release/treasure-vault-scalar-mechanics.sql', import.meta.url),
  'utf8'
);
const spec = JSON.parse(migration.split('$scalar095$')[1]);
const equal = (a, b) => {
  try {
    assert.deepEqual(a, b);
    return true;
  } catch {
    return false;
  }
};
const normalize = (row) => {
  const result = { ...structuredClone(row), uuid: String(row.uuid) };
  delete result.updated_at;
  delete result.search_tsv;
  return result;
};
const item = (row) => ({ ...structuredClone(row), uuid: Number(row.uuid) });

/** Mirror exact full-row guards without writing catalog or saved inventory data. */
function repair(row, patch) {
  const current = normalize(row);
  assert.ok(equal(current, patch.anchor) || equal(current, patch.final), `${patch.id}/complete known state`);
  return item(patch.final);
}

let engine;
before(async () => {
  engine = await createOperationEngine();
  engine.setFixtures(
    spec.dependencies.map(({ table, ...row }) => ({ table, row: { ...row, uuid: Number(row.uuid) } }))
  );
  engine.resetVariables('CHARACTER');
});
after(async () => engine?.cleanup());

test('22 exact catalog leaves preserve identities, citations, prose, operations, property runes and unrelated metadata', () => {
  assert.deepEqual(spec, JSON.parse(release.split('$scalar095$')[1]));
  assert.doesNotMatch(release, /^\s*(?:do|update|insert|delete|alter|create|lock|perform|begin|commit)\b/im);
  assert.match(release, /select 'treasure-vault-scalar-mechanics' as id/);
  assert.match(release, /as passed\s+from settings;/);
  assert.match(release, /is distinct from patch->'final'/);
  assert.equal(spec.patches.length, 22);
  assert.equal(spec.patches.filter((p) => p.path.join('.') === 'meta_data.attack_bonus').length, 13);
  assert.equal(spec.patches.filter((p) => p.path.join('.') === 'bulk').length, 7);
  assert.equal(spec.patches.filter((p) => p.path.join('.') === 'price').length, 1);
  assert.equal(spec.patches.filter((p) => p.path.join('.') === 'meta_data.damage.dice').length, 1);
  for (const patch of spec.patches) {
    const original = item(patch.anchor),
      next = repair(original, patch);
    ItemSchema.parse(original);
    ItemSchema.parse(next);
    assert.deepEqual(repair(next, patch), next);
    const undone = normalize(next);
    let parent = undone;
    for (const key of patch.path.slice(0, -1)) parent = parent[key];
    if (patch.before_exists) parent[patch.path.at(-1)] = structuredClone(patch.before);
    else delete parent[patch.path.at(-1)];
    assert.deepEqual(undone, normalize(original));
    assert.deepEqual(next.operations, original.operations);
    assert.equal(next.description, original.description);
    assert.equal(next.craft_requirements, original.craft_requirements);
    assert.deepEqual(next.meta_data.source, original.meta_data.source);
    assert.deepEqual(next.meta_data.runes, original.meta_data.runes);
    assert.deepEqual(next.meta_data.foundry, original.meta_data.foundry);
  }
  const mind = spec.patches.find((p) => p.id === 12212);
  assert.deepEqual(mind.anchor.traits, spec.predecessor.expected_traits);
  assert.deepEqual(mind.anchor.traits, [1526, 1527, 1504, 1517, 1514]);
});

test('unknown fields and sibling changes fail closed for complete baseline and terminal rows without mutating inputs', () => {
  for (const patch of spec.patches)
    for (const accepted of [patch.anchor, patch.final]) {
      const row = item(accepted);
      for (const [key, value] of [
        ['id', -1],
        ['uuid', -1],
        ['name', 'Changed'],
        ['content_source_id', -1],
        ['description', 'Changed'],
        ['craft_requirements', 'Changed'],
        ['operations', []],
        ['usage', 'Changed'],
        ['traits', [-1]],
        ['price', { cp: -1 }],
        ['bulk', '-1'],
      ]) {
        if (equal(row[key], value)) continue;
        const changed = { ...structuredClone(row), [key]: value },
          saved = structuredClone(changed);
        assert.throws(() => repair(changed, patch));
        assert.deepEqual(changed, saved);
      }
      const changed = structuredClone(row);
      changed.meta_data.unreviewed = true;
      assert.throws(() => repair(changed, patch));
      const changedFoundry = structuredClone(row);
      changedFoundry.meta_data.foundry.bonus = -1;
      assert.throws(() => repair(changedFoundry, patch));
    }
});

test('actual bomb attack math restores each printed bonus without changing damage or stacking stronger item bonuses', () => {
  for (const patch of spec.patches.filter((p) => p.path.join('.') === 'meta_data.attack_bonus')) {
    const original = item(patch.anchor),
      next = repair(original, patch);
    const beforeStats = engine.getWeaponStats('CHARACTER', original);
    const afterStats = engine.getWeaponStats('CHARACTER', next);
    assert.deepEqual(beforeStats.attack_bonus.total, [0, -5, -10]);
    assert.deepEqual(afterStats.attack_bonus.total, [patch.after, patch.after - 5, patch.after - 10]);
    assert.deepEqual(afterStats.damage, beforeStats.damage);
    const stronger = structuredClone(next);
    stronger.meta_data.runes.potency = 4;
    assert.equal(engine.getWeaponStats('CHARACTER', stronger).attack_bonus.total[0], 4);
    assert.deepEqual(next.meta_data.damage, original.meta_data.damage);
    assert.deepEqual(next.meta_data.foundry, original.meta_data.foundry);
  }
  for (const id of [12176, 12177]) {
    const next = spec.patches.find((p) => p.id === id).final;
    assert.equal(next.meta_data.damage.persistent, undefined);
    assert.match(next.description, /target made of metal|wearing metal armor/);
  }
});

test('Ghosthand major striking is counted once and the comparison weapon remains correct', () => {
  const patch = spec.patches.find((p) => p.id === 12049);
  const original = item(patch.anchor),
    next = repair(original, patch);
  const beforeStats = engine.getWeaponStats('CHARACTER', original);
  const afterStats = engine.getWeaponStats('CHARACTER', next);
  assert.equal(beforeStats.damage.dice, 8);
  assert.equal(afterStats.damage.dice, 5);
  assert.equal(afterStats.damage.die, 'd8');
  assert.equal(afterStats.damage.damageType, 'force');
  assert.deepEqual(afterStats.attack_bonus, beforeStats.attack_bonus);
  assert.deepEqual({ ...afterStats.damage, dice: beforeStats.damage.dice }, beforeStats.damage);
  assert.equal(next.meta_data.runes.striking, 3);
  assert.equal(next.meta_data.runes.potency, 4);
  assert.equal(next.meta_data.damage.dice + next.meta_data.runes.striking, 5);
});

test('actual bulk and purchase helpers reflect only the reviewed printed quantities', () => {
  for (const patch of spec.patches.filter((p) => p.path.join('.') === 'bulk')) {
    const original = item(patch.anchor),
      next = repair(original, patch);
    assert.notEqual(engine.getItemBulk(inventoryItem(original)), engine.getItemBulk(inventoryItem(next)));
    for (const quantity of [1, 10, 11]) {
      const stack = { ...structuredClone(next), meta_data: { ...next.meta_data, quantity } };
      const raw = Number(next.bulk) * quantity;
      const expected = raw >= 0.1 && raw < 1 ? 0.1 : Math.floor(raw);
      assert.equal(engine.getItemBulk(inventoryItem(stack)), expected);
      assert.equal(engine.getItemBulk({ ...inventoryItem(stack), is_formula: true }), 0);
    }
  }
  const harrow = spec.patches.find((p) => p.id === 12070);
  assert.equal(convertToGp(harrow.anchor.price), 475);
  assert.equal(convertToGp(harrow.final.price), 425);
  assert.equal(purchase(harrow.anchor.price, { gp: 425, pp: 0, sp: 0, cp: 0 }), null);
  assert.deepEqual(purchase(harrow.final.price, { gp: 425, pp: 0, sp: 0, cp: 0 }), { gp: 0, pp: 0, sp: 0, cp: 0 });
});

test('SQL locks the complete domain, rejects pending curator work and verifies captured sources/dependencies atomically', () => {
  for (const sql of [migration]) {
    assert.match(sql, /lock table public\.content_update in share mode/);
    assert.match(sql, /order by id for update/);
    assert.match(sql, /order by id for share/);
    assert.match(sql, /u\.data->>'uuid'/);
    assert.match(sql, /captured CAS failed/);
    assert.match(sql, /final owner drift/);
    assert.match(sql, /final dependency drift/);
    assert.match(sql, /final source drift/);
    assert.match(sql, /final curator drift/);
    assert.doesNotMatch(sql, /update public\.(character|creature|content_source|content_update)/i);
  }
  assert.match(release, /u\.data->>'uuid'/);
  assert.match(release, /left join public\.trait/);
  assert.match(release, /left join public\.content_source/);
  assert.doesNotMatch(release, /for (?:update|share)/i);
});
