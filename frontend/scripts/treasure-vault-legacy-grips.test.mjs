import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { ItemSchema, InventoryItemSchema } from '../src/schemas/content.ts';
import { inventoryItem } from './fixtures/eidolon.mjs';

const migration = await readFile(
  new URL('../../supabase/migrations/20261002098000_treasure_vault_legacy_grips.sql', import.meta.url),
  'utf8'
);
const release = await readFile(
  new URL('../../supabase/release/treasure-vault-legacy-grips.sql', import.meta.url),
  'utf8'
);
const spec = JSON.parse(migration.split('$grips098$')[1]);
const normalize = (row) => {
  const next = { ...structuredClone(row), uuid: String(row.uuid) };
  delete next.updated_at;
  delete next.search_tsv;
  return next;
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

/** Model the coupled two-owner preflight, not arbitrary per-field partial repair. */
function repair(rows) {
  const current = rows.map(normalize);
  const baseline = spec.patches.every((p) =>
    equal(
      current.find((r) => r.id === p.id),
      p.anchor
    )
  );
  const final = spec.patches.every((p) =>
    equal(
      current.find((r) => r.id === p.id),
      p.final
    )
  );
  assert.ok(baseline || final);
  return spec.patches.map((p) => item(p.final));
}

/** Model normalized queued identities while keeping cross-table numeric collisions outside this lane. */
function queued(update) {
  if (
    ['APPROVED', 'REJECTED'].includes(
      String(update.status?.state ?? 'PENDING')
        .trim()
        .toUpperCase()
    )
  )
    return false;
  const data = update.data ?? {};
  const normalized = (v) =>
    String(v ?? '')
      .trim()
      .toLowerCase();
  if (update.type === 'content-source')
    return spec.sources.some(
      (s) => Number(update.ref_id) === s.id || Number(data.id) === s.id || normalized(data.name) === normalized(s.name)
    );
  return [
    ...spec.patches.map((p) => ({ ...p, type: 'item' })),
    ...spec.dependencies.map((p) => ({ ...p, type: 'trait' })),
  ].some((p) => {
    if (update.type !== p.type) return false;
    const urls = [p.anchor.meta_data?.source?.url, ...(p.primary ?? []).map((x) => x.url)]
      .filter(Boolean)
      .map(normalized);
    return (
      Number(update.ref_id) === p.id ||
      Number(data.id) === p.id ||
      String(data.uuid) === p.anchor.uuid ||
      ((Number(update.content_source_id) === p.anchor.content_source_id ||
        Number(data.content_source_id) === p.anchor.content_source_id) &&
        normalized(data.name) === normalized(p.name)) ||
      urls.includes(normalized(data.meta_data?.source?.url))
    );
  });
}

test('only two printed Hands/Usage pairs change while complete catalog and saved-copy schemas retain all other leaves', () => {
  assert.deepEqual(spec, JSON.parse(release.split('$grips098$')[1]));
  assert.deepEqual(
    spec.patches.map((p) => p.id),
    [11810, 12532]
  );
  assert.equal(spec.dependencies.length, 6);
  for (const p of spec.patches) {
    ItemSchema.parse(item(p.anchor));
    ItemSchema.parse(item(p.final));
    assert.equal(p.anchor.hands, null);
    assert.equal(p.anchor.usage, 'held-in-one-hand');
    assert.equal(p.final.hands, '1');
    assert.equal(p.final.usage, '');
    assert.deepEqual({ ...p.final, hands: p.anchor.hands, usage: p.anchor.usage }, p.anchor);
    assert.deepEqual(p.final.meta_data, p.anchor.meta_data);
    assert.deepEqual(p.final.operations, p.anchor.operations);
    assert.deepEqual(p.final.traits, p.anchor.traits);
    assert.match(p.primary[0].url, /Weapons\.aspx\?ID=(620|655)&NoRedirect=1$/);
    const saved = inventoryItem(item(p.anchor), { is_equipped: true });
    const original = structuredClone(saved);
    InventoryItemSchema.parse(saved);
    InventoryItemSchema.parse(inventoryItem(item(p.final), { is_equipped: true }));
    repair(spec.patches.map((x) => item(x.anchor)));
    assert.deepEqual(saved, original);
  }
});

test('complete atomic baseline and terminal replay are accepted but every partial pair or owner sibling drift aborts', () => {
  const original = spec.patches.map((p) => item(p.anchor)),
    terminal = spec.patches.map((p) => item(p.final));
  assert.deepEqual(repair(original), terminal);
  assert.deepEqual(repair(terminal), terminal);
  assert.throws(() => repair([original[0], terminal[1]]));
  assert.throws(() => repair([terminal[0], original[1]]));
  for (const accepted of [original, terminal])
    for (let index = 0; index < accepted.length; index++) {
      for (const [key, value] of Object.entries({
        hands: '2',
        usage: 'held in 2 hands',
        name: 'Changed',
        uuid: 1,
        content_source_id: 1,
        description: 'Changed',
        traits: [],
        operations: [],
        price: { gp: 99 },
        created_at: 'Changed',
        unknown_field: true,
      })) {
        const changed = structuredClone(accepted);
        changed[index][key] = value;
        assert.throws(() => repair(changed), `${index}/${key}`);
      }
      const changed = structuredClone(accepted);
      changed[index].meta_data.unreviewed_sibling = true;
      assert.throws(() => repair(changed));
      const half = structuredClone(accepted);
      half[index].hands = accepted === original ? '1' : null;
      assert.throws(() => repair(half));
    }
});

test('normalized queued owner, dependency and source identities reject including UUID, source-name and both citation URL forms', () => {
  for (const p of [
    ...spec.patches.map((p) => ({ ...p, type: 'item' })),
    ...spec.dependencies.map((p) => ({ ...p, type: 'trait' })),
  ]) {
    for (const submission of [
      { ref_id: p.id },
      { data: { id: p.id } },
      { data: { uuid: Number(p.anchor.uuid) } },
      { content_source_id: p.anchor.content_source_id, data: { name: ` ${p.name.toUpperCase()} ` } },
      { data: { content_source_id: p.anchor.content_source_id, name: p.name } },
      ...(p.anchor.meta_data?.source?.url
        ? [{ data: { meta_data: { source: { url: p.anchor.meta_data.source.url } } } }]
        : []),
      ...(p.primary ?? []).map((x) => ({ data: { meta_data: { source: { url: x.url } } } })),
    ]) {
      assert.equal(queued({ type: p.type, ...submission }), true);
      assert.equal(queued({ type: p.type, status: { state: ' approved ' }, ...submission }), false);
      assert.equal(queued({ type: 'spell', ...submission }), false);
    }
  }
  for (const source of spec.sources)
    assert.equal(queued({ type: 'content-source', data: { name: source.name.toUpperCase() } }), true);
  assert.equal(
    queued({ type: 'item', ref_id: -1, data: { id: -1, uuid: -1, name: 'Unrelated', content_source_id: 16 } }),
    false
  );
});

test('SQL has fixed two-column writes, complete CAS and post-trigger guards; release remains read-only', () => {
  assert.doesNotMatch(release, /^\s*(?:do|update|insert|delete|alter|create|lock|perform|begin|commit)\b/im);
  assert.match(release, /select 'treasure-vault-legacy-grips' as id/);
  assert.match(migration, /set hands=patch#>>'\{final,hands\}',usage=patch#>>'\{final,usage\}'/);
  assert.match(migration, /baseline_owners>0 and terminal_owners>0/);
  assert.match(migration, /is distinct from patch->'final'/);
  assert.match(migration, /captured_sources/);
  assert.match(migration, /queue_actual is distinct from queue_before/);
  assert.match(migration, /order by id for update/);
  assert.match(migration, /where i.id=.*captured->\(patch->>'id'\)/);
  assert.doesNotMatch(migration, /update public\.(?:character|creature|content_update|content_source)\b/i);
  assert.doesNotMatch(migration, /set (?:description|operations|meta_data|traits|price)=/i);
});
