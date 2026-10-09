import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { after, before, test } from 'node:test';
import uploadUtils from '../../supabase/functions/_shared/upload-utils.ts';
import { CONTENT_SCHEMAS } from './content-schemas.ts';
import { createOperationEngine, readContentRows } from './operation-test-harness.mjs';

const migrationPath = '20261008160000_tech_core_introductory_spells.sql';
const migration = await readFile(new URL(`../../supabase/migrations/${migrationPath}`, import.meta.url), 'utf8');
const release = await readFile(
  new URL('../../supabase/release/tech-core-introductory-spells.sql', import.meta.url),
  'utf8'
);
const literal = (sql) => {
  const parts = sql.split('$tech_core_spells$');
  assert.equal(parts.length, 3, 'One complete reviewed spell literal');
  return JSON.parse(parts[1]);
};
const spec = literal(migration);
const expected = [
  ['Bugfix', 0, 'TWO-ACTIONS', '149', '507-bugfix'],
  ['Detect Technology', 0, 'TWO-ACTIONS', '152', '508-detect-technology'],
  ['Emoticon', 0, 'TWO-ACTIONS', '153', '437-emoticon'],
  ['Linked Sight', 0, 'ONE-ACTION', '157', '457-linked-sight'],
  ['Junk Armor', 1, 'TWO-ACTIONS', '155', '448-junk-armor'],
  ['Junk Restraints', 1, 'TWO-ACTIONS', '156', '451-junk-restraints'],
];
let harness;
const fixtures = [];

before(async () => {
  harness = await createOperationEngine({ renderRichText: true });
  for (const dependency of spec.references) fixtures.push({ table: dependency.table, row: dependency.row });
  for (const [index, proposal] of spec.rows.entries()) {
    const row = { ...structuredClone(proposal), id: 800000 + index, created_at: '2026-10-08T16:00:00+00:00' };
    for (const binding of spec.bindings.filter((binding) => binding.uuid === row.uuid)) {
      row[binding.field] = row[binding.field].replaceAll(
        `(${binding.href})`,
        `(${binding.template.replace('{{allocated_id}}', String(row.id))})`
      );
    }
    fixtures.push({ table: 'spell', row });
  }
  harness.setFixtures(fixtures);
  harness.resetVariables('CHARACTER');
  harness.setVariable('CHARACTER', 'STARFINDER', true);
});
after(async () => {
  await harness?.cleanup();
});

test('six final Tech Core spells retain independently checked ranks, costs and Nethys citations', () => {
  assert.deepEqual(spec, literal(release));
  assert.equal(spec.schema, 'wg-tech-core-introductory-spells-v1');
  assert.equal(spec.rows.length, 6);
  assert.equal(new Set(spec.rows.map((row) => row.uuid)).size, 6);
  for (const [name, rank, cast, page, slug] of expected) {
    const proposal = spec.rows.find((row) => row.name === name);
    assert.ok(proposal, name);
    assert.equal(proposal.rank, rank);
    assert.equal(proposal.cast, cast);
    assert.equal(proposal.content_source_id, 900);
    assert.equal(proposal.uuid, uploadUtils.uniqueId(name, 'spell', rank, 900));
    assert.deepEqual(proposal.meta_data.source, {
      book: 'Tech Core',
      page,
      url: `https://2e.aonsrd.com/spells/${slug}`,
    });
    assert.equal(proposal.traits.includes(1858), rank === 0, 'WG stores cantrips at rank 0');
    assert.equal(Object.hasOwn(proposal, 'id'), false, 'Database allocates the real identity');
    assert.equal(Object.hasOwn(proposal, 'created_at'), false);
    const fixture = fixtures.find(({ table, row }) => table === 'spell' && row.name === name).row;
    CONTENT_SCHEMAS.spell.parse(fixture);
  }
  assert.equal(
    spec.rows.find((row) => row.name === 'Bugfix').targets,
    '1 creature or object with the glitching condition'
  );
  assert.equal(spec.rows.find((row) => row.name === 'Bugfix').requirements, null);
  assert.equal(spec.rows.find((row) => row.name === 'Emoticon').defense, 'AC');
  for (const name of ['Junk Armor', 'Junk Restraints'])
    assert.ok(spec.rows.find((row) => row.name === name).traits.includes(5225));
  assert.equal(
    spec.rows.some((row) => ['Junk Weapon', 'Junkbot'].includes(row.name)),
    false,
    'Unresolved source/dependency issues are not silently imported'
  );
});

test('every authored link resolves through the real helper to its official exact target', () => {
  const engine = harness;
  for (const { table, row } of fixtures.filter(({ table }) => table === 'spell')) {
    const texts = [row.description, ...row.heightened.text.map((entry) => entry.text)];
    for (const text of texts) {
      assert.doesNotMatch(text, /@UUID|@Check|@Damage|\[\[|\{\{allocated_id\}\}|900000507|—/);
      assert.doesNotMatch(text, /link_condition_/, 'Conditions remain automatic, not stored manual links');
      for (const match of text.matchAll(/\[([^\]]+)\]\(link_([a-z-]+)_(\d+)\)/g)) {
        const [, label, type, rawId] = match;
        const targetTable = type === 'action' ? 'ability_block' : type;
        const target = fixtures.find(({ table, row }) => table === targetTable && row.id === Number(rawId))?.row;
        assert.ok(target, `${row.name}: ${label} target exists`);
        if (type === 'action') assert.equal(target.type, 'action');
        assert.notEqual(target.content_source_id, 590, 'No playtest name collision');
        assert.equal(engine.convertToHardcodedLink(type, target.name, label), match[0]);
      }
    }
  }
});

test('rendered rules link every relevant occurrence without linking physical damage or generic nouns', () => {
  const engine = harness;
  const get = (name) => fixtures.find(({ table, row }) => table === 'spell' && row.name === name).row;
  const labels = (html) =>
    [...html.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/g)].map((match) => match[1].replace(/<[^>]*>/g, ''));
  const counts = (name) => {
    const result = new Map();
    for (const label of labels(engine.renderRichText(get(name).description)))
      result.set(label, (result.get(label) ?? 0) + 1);
    return result;
  };
  assert.equal(counts('Bugfix').get('counteract'), 1);
  assert.equal(counts('Bugfix').get('glitching'), 1);
  assert.equal(counts('Bugfix').get('bugfix'), 1);
  assert.equal(counts('Detect Technology').get('tech'), 1);
  assert.equal(counts('Emoticon').get('force'), 1);
  assert.equal(counts('Emoticon').get('Cast the Spell'), 1);
  assert.equal(counts('Emoticon').has('bludgeoning'), false);
  assert.equal(counts('Linked Sight').get('Sustain'), 1);
  assert.equal(counts('Junk Armor').get('Cast this Spell'), 2, 'Both casting occurrences, not just the first');
  assert.equal(counts('Junk Armor').get('Install'), 1);
  assert.equal(counts('Junk Armor').get('noisy'), 1);
  assert.equal(counts('Junk Armor').get('tech'), 1);
  const restraints = counts('Junk Restraints');
  for (const label of ['Force Open', 'Escape', 'Forcing Open', 'Escaping', 'clumsy', 'restrained'])
    assert.equal(restraints.get(label), 1, label);
  assert.equal(restraints.get('suppressed'), 2, 'Both automatic Starfinder condition occurrences');
  assert.equal(restraints.has('Force'), false, 'Force Open is not force damage');
  assert.equal(restraints.has('creature'), false);
});

test('current dependencies are exact official records and the batch never edits existing or saved content', async () => {
  const actual = await readContentRows(spec.references.map(({ table, row }) => ({ table, id: row.id })));
  for (const dependency of spec.references) {
    const row = actual.find(({ table, row }) => table === dependency.table && row.id === dependency.row.id)?.row;
    assert.ok(row);
    assert.equal(row.name, dependency.row.name);
    assert.equal(row.content_source_id, dependency.row.content_source_id);
    assert.equal(String(row.uuid), String(dependency.row.uuid));
  }
  assert.match(migration, /lock table public\.content_update in share mode/);
  assert.match(migration, /lock table public\.spell in share row exclusive mode/);
  assert.match(migration, /not in\('APPROVED','REJECTED'\)/);
  assert.match(migration, /if status\.aliases=6 and status\.exact_rows=6 then return/);
  assert.match(migration, /if status\.aliases<>0 then raise exception/);
  assert.match(migration, /nextval\(pg_get_serial_sequence\('public\.spell','id'\)\)/);
  assert.match(migration, /Tech Core spell readback differs/);
  assert.doesNotMatch(migration, /\b(?:update|delete from|truncate|alter table) public\./i);
  assert.doesNotMatch(migration, /\bsetval\s*\(/i);
  const [releasePrefix, , releaseSuffix] = release.split('$tech_core_spells$');
  assert.doesNotMatch(
    releasePrefix + releaseSuffix,
    /\b(?:insert into|update public|delete from|create |drop |nextval|setval)\b/i
  );
  const requirements = JSON.parse(
    await readFile(new URL('../../supabase/release/requirements.json', import.meta.url), 'utf8')
  );
  assert.deepEqual(requirements[migrationPath], {
    check: 'tech-core-introductory-spells.sql',
    order: 'before-functions',
  });
});
