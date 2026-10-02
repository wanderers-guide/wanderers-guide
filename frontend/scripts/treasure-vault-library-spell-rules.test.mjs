import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { before, after, test } from 'node:test';
import { SpellSchema, InventorySchema } from '../src/schemas/content.ts';
import { createOperationEngine, readContentRows } from './operation-test-harness.mjs';
import { inventoryItem, summoner } from './fixtures/eidolon.mjs';

const migration = await readFile(
  new URL('../../supabase/migrations/20261001160000_treasure_vault_library_spell_rules.sql', import.meta.url),
  'utf8'
);
const release = await readFile(
  new URL('../../supabase/release/treasure-vault-library-spell-rules.sql', import.meta.url),
  'utf8'
);
const spec = JSON.parse(migration.split('$rules$')[1]);
assert.deepEqual(JSON.parse(release.split('$rules$')[1]), spec);
const staffMigration = await readFile(
  new URL('../../supabase/migrations/20261001140000_treasure_vault_library_staff_repairs.sql', import.meta.url),
  'utf8'
);
const staffSpec = JSON.parse(staffMigration.split('$library$')[1]);
const rows = await readContentRows([
  ...spec.spells.map(({ id }) => ({ table: 'spell', id })),
  ...spec.sources.map(({ id }) => ({ table: 'content_source', id })),
  ...staffSpec.items.map(({ id }) => ({ table: 'item', id })),
  ...staffSpec.dependencies.map(({ table, id }) => ({ table: table.replace('-', '_'), id })),
]);
const get = (table, id) => {
  const row = rows.find((x) => x.table === table && x.row.id === id)?.row;
  assert.ok(row, `${table}:${id} missing`);
  return row;
};
const md5 = (text) => createHash('md5').update(text).digest('hex');
const projection = (row) => (Object.hasOwn(row.meta_data, 'source') ? { source: row.meta_data.source } : {});
function stateOf(row, patch) {
  for (const [key, value] of Object.entries(patch.expected))
    assert.deepEqual(key === 'uuid' ? String(row[key]) : row[key], value, `${row.id}/${key}`);
  assert.ok(row.meta_data && typeof row.meta_data === 'object' && !Array.isArray(row.meta_data));
  assert.deepEqual(projection(row), patch.citation);
  const actual = { defense: row.defense, duration: row.duration, description: row.description };
  for (const state of ['before', 'after']) if (JSON.stringify(actual) === JSON.stringify(patch[state])) return state;
  assert.fail(`Unreviewed ${row.id} complete spell state`);
}
function at(row, patch, state) {
  stateOf(row, patch);
  return { ...structuredClone(row), ...structuredClone(patch[state]) };
}
const originals = spec.spells.map((p) => at(get('spell', p.id), p, 'before'));
const proposed = spec.spells.map((p, i) => at(originals[i], p, 'after'));
let engine;
before(async () => {
  engine = await createOperationEngine({ renderRichText: true });
  engine.setFixtures(rows);
});
after(async () => engine?.cleanup());

test('three complete spell rule projections repair only proven Will defenses, Glimmer sustained duration and two imported condition wrappers', () => {
  assert.deepEqual(
    spec.spells.map((p) => p.id),
    [5449, 4865, 5367]
  );
  for (const [index, patch] of spec.spells.entries()) {
    const old = originals[index],
      next = proposed[index];
    SpellSchema.parse(old);
    SpellSchema.parse(next);
    assert.equal(old.defense, null);
    assert.equal(next.defense, 'Will');
    assert.deepEqual(at(next, patch, 'before'), old);
    assert.deepEqual(at(next, patch, 'after'), next);
    assert.deepEqual({ ...next, defense: old.defense, duration: old.duration, description: old.description }, old);
    assert.deepEqual(next.meta_data, old.meta_data);
    assert.equal(md5(old.description), patch.description.before_md5);
    let text = old.description;
    for (const replacement of patch.description.replacements) {
      assert.equal(text.split(replacement.from).length - 1, replacement.count);
      text = text.replaceAll(replacement.from, replacement.to);
    }
    assert.equal(text, next.description);
    assert.equal(md5(text), patch.description.after_md5);
  }
  assert.equal(proposed[0].duration, originals[0].duration);
  assert.equal(proposed[1].duration, originals[1].duration);
  assert.equal(originals[2].duration, '1 minute');
  assert.equal(proposed[2].duration, 'sustained up to 1 minute');
  assert.equal(proposed[0].rank, 3);
  assert.equal(proposed[0].cast, 'REACTION');
  assert.match(proposed[0].trigger, /attacks a creature/);
  assert.equal(proposed[1].rank, 4);
  assert.equal(proposed[1].cast, 'TWO-ACTIONS');
  assert.equal(proposed[2].rank, 5);
  assert.deepEqual(
    spec.spells[2].description.replacements.map((r) => [r.to, r.count]),
    [
      ['indifferent', 1],
      ['helpful', 1],
    ]
  );
});

test('all eight complete before/after combinations preserve schemas and no mixed Glimmer state is accepted', () => {
  for (let mask = 0; mask < 8; mask++)
    for (const [index, patch] of spec.spells.entries()) {
      const row = at(originals[index], patch, mask & (1 << index) ? 'after' : 'before');
      SpellSchema.parse(row);
      assert.deepEqual(at(row, patch, 'after'), proposed[index]);
    }
  for (const pair of [
    { defense: 'Will' },
    { duration: 'sustained up to 1 minute' },
    { description: proposed[2].description },
    { defense: 'Will', duration: 'sustained up to 1 minute' },
    { defense: 'Will', description: proposed[2].description },
    { duration: 'sustained up to 1 minute', description: proposed[2].description },
  ])
    assert.throws(() => stateOf({ ...originals[2], ...pair }, spec.spells[2]));
});

test('original published spell citations/source identities remain unchanged, including existing backported legacy rules', () => {
  for (const expected of spec.sources)
    for (const [key, value] of Object.entries(expected))
      assert.deepEqual(get('content_source', expected.id)[key], value);
  assert.deepEqual(
    proposed.map((s) => s.content_source_id),
    [13, 3, 13]
  );
  assert.deepEqual(
    proposed.map((s) => s.meta_data.source.url),
    [
      'https://2e.aonprd.com/Spells.aspx?ID=997',
      'https://2e.aonprd.com/Spells.aspx?ID=1693',
      'https://2e.aonprd.com/Spells.aspx?ID=919',
    ]
  );
  for (const [index, patch] of spec.spells.entries()) {
    const extended = {
      ...originals[index],
      meta_data: { ...originals[index].meta_data, untouched: { values: [1, 2, 3] } },
    };
    const result = at(extended, patch, 'after');
    assert.deepEqual(result.meta_data, extended.meta_data);
  }
});

test('actual RichText turns only the two literal wrappers into normal lower-case condition links and honors blacklist', () => {
  const old = engine.renderRichText(originals[2].description),
    next = engine.renderRichText(proposed[2].description);
  assert.doesNotMatch(next, /\[\[|link_condition_|@UUID/);
  for (const condition of ['indifferent', 'helpful']) {
    const anchor = new RegExp(`<a\\b[^>]*>${condition}<\\/a>`, 'g');
    assert.equal((next.match(anchor) ?? []).length - (old.match(anchor) ?? []).length, 1);
    assert.doesNotMatch(engine.renderRichText(proposed[2].description, [condition]), anchor);
  }
  assert.match(next, /temporarily immune for 24 hours/);
  assert.match(next, /No matter the result/);
  assert.match(next, /the effect ends as soon as/);
});

test('actual staff parser/ranks and selective catalogs remain identical for all reviewed spell-rule dependency states', () => {
  const staff = staffSpec.items.find((p) => p.id === 12425);
  const all = staffSpec.dependencies.filter((d) => d.table === 'spell').map((d) => get('spell', d.id));
  const beforeSpells = all.map((s) => originals.find((x) => x.id === s.id) ?? s),
    afterSpells = all.map((s) => proposed.find((x) => x.id === s.id) ?? s);
  const a = engine.detectSpells(staff.description.after, beforeSpells),
    b = engine.detectSpells(staff.description.after, afterSpells);
  assert.deepEqual(
    a.map(({ spell, rank }) => [spell.id, rank]),
    staff.pairs
  );
  assert.deepEqual(
    b.map(({ spell, rank }) => [spell.id, rank]),
    staff.pairs
  );
  for (const id of [5449, 4865, 5367]) assert.equal(b.find((p) => p.spell.id === id).spell.defense, 'Will');
  assert.equal(b.find((p) => p.spell.id === 5367).spell.duration, 'sustained up to 1 minute');
  const ordinary = all.filter((s) => s.content_source_id === 3);
  const extended = engine.mergeSpellDependencies(ordinary, afterSpells, [5449, 5367]);
  assert.deepEqual(
    ordinary.map((s) => s.id),
    all.filter((s) => s.content_source_id === 3).map((s) => s.id)
  );
  assert.equal(engine.mergeSpellDependencies(ordinary, afterSpells, []), ordinary);
  assert.deepEqual(
    engine.filterSpellCatalog(extended, 'shift blame', 'REACTION', () => []).map((s) => s.id),
    [5449]
  );
  assert.deepEqual(
    engine.filterSpellCatalog(extended, 'shift blame', 'TWO-ACTIONS', () => []),
    []
  );
});

test('every guarded identity/header/heightened field, malformed metadata and canonical source drift reject before and after', () => {
  for (const [index, patch] of spec.spells.entries())
    for (const row of [originals[index], proposed[index]]) {
      for (const changes of [
        { name: 'drift' },
        { uuid: null },
        { content_source_id: null },
        { rank: null },
        { cast: null },
        { traditions: [] },
        { traits: [] },
        { heightened: { unexpected: true } },
        { meta_data: null },
        { meta_data: [] },
        { meta_data: { source: null } },
        { description: null },
        { duration: null },
        { defense: 'Fortitude' },
      ])
        assert.throws(() => stateOf({ ...row, ...changes }, patch));
      assert.throws(() =>
        stateOf(
          {
            ...row,
            meta_data: { ...row.meta_data, source: { ...row.meta_data.source, url: 'https://example.invalid/' } },
          },
          patch
        )
      );
    }
});

test('saved full inventory and spell snapshots are not rewritten by creating repaired catalog clones', () => {
  const inventory = summoner(
    staffSpec.items.map((p) => inventoryItem(get('item', p.id), { is_equipped: true }))
  ).inventory;
  InventorySchema.parse(inventory);
  const saved = structuredClone({ inventory, spells: originals });
  spec.spells.forEach((p, i) => at(originals[i], p, 'after'));
  assert.deepEqual({ inventory, spells: originals }, saved);
  InventorySchema.parse(inventory);
  originals.forEach((s) => SpellSchema.parse(s));
});

test('SQL guards complete structural pairs, canonical citations/queue before replay, strict CAS and terminal release without any unrelated write', () => {
  const childPrelockStart = migration.indexOf('-- Acquire reviewed content rows before source cache locks.');
  const childPrelockEnd = migration.indexOf('-- End reviewed content row prelocks.');
  assert.ok(migration.indexOf('lock table public.content_update') < childPrelockStart);
  assert.ok(
    childPrelockStart < childPrelockEnd &&
      childPrelockEnd < migration.indexOf('from public.content_source', migration.indexOf('\nbegin\n'))
  );
  const childPrelocks = migration.slice(childPrelockStart, childPrelockEnd);
  assert.doesNotMatch(childPrelocks, /\b(?:update|insert|delete)\s+public\.|\b(?:continue|return)\b/i);
  assert.match(
    childPrelocks,
    /public\.spell s[\s\S]*?jsonb_array_elements\(spec->'spells'\)[\s\S]*?order by s\.id for update/
  );
  assert.match(migration, /lock table public\.content_update in share mode/);
  assert.match(migration, /coalesce\(u\.status->>'state','PENDING'\) not in \('APPROVED','REJECTED'\)/);
  assert.ok(
    migration.indexOf('Library shared spell has a pending curator submission') < migration.indexOf('if current_pair=')
  );
  assert.match(migration, /u\.data->>'content_source_id'=spell_row\.content_source_id::text/);
  assert.match(migration, /u\.data->>'id'=source_spec->>'id'/);
  assert.match(release, /u\.data->>'content_source_id'=p#>>'\{expected,content_source_id\}'/);
  assert.match(release, /u\.data->>'id'=c->>'id'/);
  assert.match(migration, /if current_pair is distinct from patch->'before'/);
  assert.match(migration, /if changed_rows<>1 then/);
  assert.match(migration, /Library shared spell CAS failed/);
  assert.equal((migration.match(/update public\.spell set /g) ?? []).length, 1);
  assert.doesNotMatch(migration, /update public\.(?:item|character|trait|ability_block|content_source)/);
  assert.doesNotMatch(migration, /set (?:meta_data|name|uuid|rank|traditions|traits|heightened)\s*=/);
  assert.match(release, /coalesce\(/);
  assert.match(release, /false\) passed/);
  assert.match(release, /is distinct from p->'after'/);
});
