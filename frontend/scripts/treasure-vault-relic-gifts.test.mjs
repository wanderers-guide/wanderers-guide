import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { before, after, test } from 'node:test';
import { AbilityBlockSchema } from '../src/schemas/content.ts';
import { createOperationEngine, readContentRows } from './operation-test-harness.mjs';

const migration = await readFile(
  new URL('../../supabase/migrations/20261002020000_treasure_vault_relic_gifts.sql', import.meta.url),
  'utf8'
);
const release = await readFile(
  new URL('../../supabase/release/treasure-vault-relic-gifts.sql', import.meta.url),
  'utf8'
);
const spec = JSON.parse(migration.split('$gifts$')[1]);
const rows = await readContentRows([
  ...spec.blocks.map(({ id }) => ({ table: 'ability_block', id })),
  ...spec.dependencies.map(({ table, id }) => ({ table, id })),
  ...spec.sources.map(({ id }) => ({ table: 'content_source', id })),
]);
const get = (table, id) => {
  const row = rows.find((r) => r.table === table && r.row.id === id)?.row;
  assert.ok(row, `${table}:${id}`);
  return row;
};
const tuple = (row) => ({ traits: row.traits, description: row.description, source: row.meta_data.source });
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
/** Require the whole reviewed tuple and all unchanged fields before a narrow clone repair. */
function validate(row, patch, terminal = false) {
  assert.ok(row && row.meta_data && typeof row.meta_data === 'object' && !Array.isArray(row.meta_data));
  for (const [key, value] of Object.entries(patch.expected))
    assert.deepEqual(key === 'uuid' ? String(row[key]) : row[key], value, `${patch.id}/${key}`);
  for (const [key, value] of Object.entries(patch.metadata)) assert.deepEqual(row.meta_data[key], value);
  for (const key of patch.metadata_absent) assert.ok(!Object.hasOwn(row.meta_data, key));
  if (same(tuple(row), patch.after)) return 'after';
  if (!terminal && same(tuple(row), patch.before)) return 'before';
  assert.fail('Unreviewed complete relic gift tuple');
}
const originals = spec.blocks.map((patch) => {
  const row = structuredClone(get('ability_block', patch.id));
  validate(row, patch);
  Object.assign(row, { traits: patch.before.traits, description: patch.before.description });
  row.meta_data.source = patch.before.source;
  validate(row, patch);
  return row;
});
/** Apply to clones only. The separate native PostgreSQL proof validates SQL transaction behavior. */
function apply(input) {
  assert.equal(input.length, 3);
  assert.equal(new Set(input.map(({ id }) => id)).size, 3);
  for (const patch of spec.blocks)
    validate(
      input.find(({ id }) => id === patch.id),
      patch
    );
  return input.map((row) => {
    const patch = spec.blocks.find(({ id }) => id === row.id);
    const next = structuredClone(row);
    Object.assign(next, { traits: patch.after.traits, description: patch.after.description });
    next.meta_data.source = patch.after.source;
    validate(next, patch, true);
    AbilityBlockSchema.parse(next);
    return next;
  });
}
const proposed = apply(originals);
let engine;
before(async () => {
  engine = await createOperationEngine({ renderRichText: true });
});
after(async () => engine?.cleanup());

test('three exact full rows only change approved prose/trait/citation leaves; every grant, stat, prerequisite and saved operation identity remains', () => {
  assert.deepEqual(spec, JSON.parse(release.split('$gifts$')[1]));
  assert.deepEqual(
    spec.blocks.map(({ id }) => id),
    [29513, 29806, 29688]
  );
  for (const [i, row] of proposed.entries()) {
    AbilityBlockSchema.parse(row);
    const restored = {
      ...structuredClone(row),
      traits: originals[i].traits,
      description: originals[i].description,
      meta_data: { ...row.meta_data, source: originals[i].meta_data.source },
    };
    assert.deepEqual(restored, originals[i]);
    assert.deepEqual(row.operations, []);
    assert.equal(row.meta_data.source.book, 'Treasure Vault (Remastered)');
    assert.equal(row.meta_data.source.url, `https://2e.aonprd.com/Relics.aspx?ID=${[93, 104, 109][i]}`);
  }
  assert.deepEqual(proposed[0].traits, [3460, 3489, 3479, 1486, 1448, 1432]);
  assert.equal(proposed[0].actions, 'ONE-ACTION');
  assert.equal(proposed[0].frequency, 'once per hour');
  assert.match(proposed[0].description, /next 3 rounds, but ignore the spell/);
  assert.match(proposed[0].description, /no emotional fallout/);
  assert.deepEqual(proposed[1].traits, [3460, 3501, 3479, 1432, 1433]);
  assert.deepEqual(proposed[1].prerequisites, ['The relic is 5th level or higher']);
  assert.equal(proposed[1].actions, 'TWO-ACTIONS');
  assert.match(proposed[1].description, /clumsy 3, enfeebled 3, and drained 2/);
  assert.match(
    proposed[2].description,
    /Each time you gain a new gift, increase one of the \[relic's\]\(link_trait_3460\) mental attribute modifiers by 1/
  );
  assert.doesNotMatch(proposed[2].description, /scores by 2 or two by 1/);
  assert.match(proposed[2].description, /mental attribute modifiers begin at \+3, \+2, and \+1/);
  assert.match(
    proposed[2].description,
    /sanctified to \[holy\]\(link_trait_1630\) or to \[unholy\]\(link_trait_1846\)/
  );
});

test('all repeated references resolve by actual subtype and the renderer auto-links conditions without import artifacts', () => {
  const dependencies = rows.filter((r) =>
    spec.dependencies.some(({ table, id }) => table === r.table && id === r.row.id)
  );
  for (const row of proposed) {
    for (const match of row.description.matchAll(/\[([^\]]+)\]\(link_([a-z-]+)_(\d+)\)/g)) {
      const [, label, type, id] = match;
      const table = type === 'trait' ? 'trait' : 'ability_block';
      const target = dependencies.find((r) => r.table === table && r.row.id === Number(id));
      assert.ok(target, `${type}:${id}`);
      if (table === 'ability_block') assert.equal(target.row.type, type);
      engine.setFixtures([target]);
      assert.equal(engine.convertToHardcodedLink(type, target.row.name, label), match[0]);
    }
    assert.doesNotMatch(engine.renderRichText(row.description), /\[\[|@UUID|@Check|link_condition_/);
  }
  assert.equal((proposed[2].description.match(/link_trait_3460/g) ?? []).length, 9);
  const html = engine.renderRichText(proposed[1].description);
  for (const condition of ['clumsy', 'enfeebled', 'drained'])
    assert.match(html, new RegExp(`<a\\b[^>]*>${condition}<\\/a>`));
  // AoN points emotional state at Cathartic Mage; WG dedication's selector contains those same emotions.
  assert.equal(get('ability_block', 22493).name, 'Cathartic Mage Dedication');
  assert.match(proposed[0].description, /\[emotional state\]\(link_feat_22493\)/);
});

test('before and exact terminal replay preserve unknown outer metadata; hybrid tuples, UUID/source/stat drift and partial cardinality fail closed', () => {
  assert.deepEqual(apply(proposed), proposed);
  const extra = originals.map((row) => ({
    ...structuredClone(row),
    meta_data: { ...row.meta_data, reviewed_sibling: { value: 'preserved' } },
  }));
  assert.ok(apply(extra).every(({ meta_data }) => meta_data.reviewed_sibling.value === 'preserved'));
  for (const mutate of [
    (rows) => {
      rows[0].traits = spec.blocks[0].after.traits;
    },
    (rows) => {
      rows[2].description = spec.blocks[2].after.description;
    },
    (rows) => {
      rows[0].frequency = 'once per day';
    },
    (rows) => {
      rows[1].prerequisites = [];
    },
    (rows) => {
      rows[2].uuid = Number(rows[2].uuid) + 1;
    },
    (rows) => {
      rows[2].content_source_id = 7;
    },
    (rows) => {
      rows[1].meta_data.source = { ...rows[1].meta_data.source, page: '201' };
    },
    (rows) => {
      rows[2].meta_data.unselectable = true;
    },
    (rows) => {
      rows[0].operations = [{ id: 'unexpected', type: 'giveItem', data: { itemId: 6724 } }];
    },
    (rows) => {
      rows[2].meta_data = null;
    },
  ]) {
    const changed = structuredClone(originals);
    mutate(changed);
    assert.throws(() => apply(changed));
  }
  assert.throws(() => apply(originals.slice(0, 2)));
  assert.throws(() => apply([originals[0], originals[0], originals[2]]));
  assert.deepEqual(
    originals.map(tuple),
    spec.blocks.map(({ before }) => before)
  );
});

test('guarded SQL locks children first, protects pending identities, checks complete tuples, and preserves operation/source metadata with strict CAS/readback', () => {
  const body = migration.split('$gifts$')[2];
  assert.match(body, /lock table public\.content_update in share mode/);
  assert.ok(body.indexOf('public.ability_block where id') < body.indexOf('public.content_source s'));
  assert.ok(body.indexOf('pending content requires review') < body.indexOf('tuple:=jsonb_build_object'));
  assert.match(body, /coalesce\(u.status->>'state','PENDING'\) not in \('APPROVED','REJECTED'\)/);
  assert.match(body, /tuple is distinct from patch->'before' and tuple is distinct from patch->'after'/);
  assert.match(body, /captured CAS failed/);
  assert.match(body, /changed<>1/);
  assert.match(body, /immediate readback drift/);
  assert.match(body, /final owner readback drift/);
  assert.match(body, /final source baseline drift/);
  assert.match(body, /final dependency baseline drift/);
  assert.match(body, /jsonb_set\(a.meta_data,'\{source\}',patch#>'\{after,source\}',false\)/);
  assert.doesNotMatch(
    body,
    /delete from|insert into|update public\.(character|item|trait|creature|content_source)|operations=/i
  );
  assert.match(release, /\) is true\)/);
  assert.match(release, /coalesce\(/);
  assert.match(release, /as passed from settings/);
  assert.equal(spec.dependencies.length, 16);
  assert.equal(spec.sources.length, 5);
  const guards = [
    ...body.matchAll(
      /if exists\(select 1 from public\.content_update u[\s\S]*?\)\) then raise exception '[^']+'; end if;/g
    ),
  ].map(([guard]) => guard.replace(/raise exception '[^']+'/, "raise exception 'curator guard'"));
  assert.equal(guards.length, 2);
  assert.equal(guards[0], guards[1], 'Late pending submissions use the identical initial identity routes');
  assert.ok(body.indexOf('final curator guard changed') > body.indexOf('final dependency baseline drift'));
});
