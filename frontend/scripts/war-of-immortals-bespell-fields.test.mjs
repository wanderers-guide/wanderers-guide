import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { after, test } from 'node:test';
import { AbilityBlockSchema } from '../src/schemas/content.ts';
import { createOperationEngine, readContentRows } from './operation-test-harness.mjs';
import { assertReviewedTransition } from './war-of-immortals-test-support.mjs';

const migration = await readFile(
  new URL('../../supabase/migrations/20260927200000_war_of_immortals_bespell_fields.sql', import.meta.url),
  'utf8'
);
const requirement = 'Your most recent action was to cast a non-cantrip spell';
const traditionMigrationName = '20261006000000_war_of_immortals_bespell_tradition.sql';
const traditionMigration = await readFile(
  new URL(`../../supabase/migrations/${traditionMigrationName}`, import.meta.url),
  'utf8'
);
const beforeMd5 = 'db6fb7cda1e9da511159acb17e9622a7';
const afterMd5 = '6bc8441098606f315ea12e4e983de326';
const fromText = 'gains the [arcane](link_trait_1459) trait';
const toText =
  'gains the [arcane](link_trait_1459) or [divine](link_trait_1475) trait matching your bloodrager spellcasting tradition';
const md5 = (value) => createHash('md5').update(value).digest('hex');
let engine;
after(async () => engine?.cleanup());

/** Accept only the reviewed description states when the sanitized snapshot refreshes. */
function correctedDescription(description) {
  const state = assertReviewedTransition(md5(description), beforeMd5, afterMd5, 'Bloodrager tradition text');
  return state === 'after' ? description : description.replace(fromText, toText);
}

test('Bloodrager Bespell Strikes displays the published action cost, frequency, and requirement', async () => {
  const rows = (await readContentRows([39157, 19948, 31445].map((id) => ({ table: 'ability_block', id })))).map(
    ({ row }) => row
  );
  const bloodrager = rows.find(({ id }) => id === 39157);
  assert.equal(bloodrager.name, 'Bespell Strikes');
  assert.equal(bloodrager.type, 'feat');
  assert.equal(bloodrager.level, 8);
  assert.equal(bloodrager.content_source_id, 400);
  assert.deepEqual(bloodrager.operations, []);

  for (const peer of rows.filter(({ id }) => id !== 39157)) {
    assert.equal(peer.actions, 'FREE-ACTION');
    assert.equal(peer.frequency, 'once per turn');
    assert.equal(peer.requirements.replace(/\s+/g, ' ').replace(/\.$/, ''), requirement);
  }

  assertReviewedTransition(bloodrager.actions, null, 'FREE-ACTION', 'Bloodrager action cost');
  assertReviewedTransition(bloodrager.frequency, '', 'once per turn', 'Bloodrager frequency');
  assertReviewedTransition(bloodrager.requirements, '', requirement, 'Bloodrager requirement');
});

test('Bloodrager field repair is scoped and preserves the feat description and operations', () => {
  assert.match(migration, /where id = 39157\s+for update/);
  assert.match(migration, /existing\.name is distinct from 'Bespell Strikes'/);
  assert.match(migration, /existing\.type is distinct from 'feat'/);
  assert.match(migration, /existing\.level is distinct from 8/);
  assert.match(migration, /existing\.content_source_id is distinct from 400/);
  assert.match(migration, /existing\.actions is null\s+and existing\.frequency = ''\s+and existing\.requirements = ''/);
  assert.match(migration, /type = 'ability-block' and ref_id = 39157 and status->>'state' = 'PENDING'/);
  assert.match(
    migration,
    /update public\.ability_block\s+set actions = 'FREE-ACTION',\s+frequency = 'once per turn',\s+requirements = 'Your most recent action was to cast a non-cantrip spell'\s+where id = 39157/
  );
  assert.match(migration, /and actions is null\s+and frequency = ''\s+and requirements = ''/);
});

test('Bloodrager Bespell Strikes follows either spellcasting tradition and preserves the complete feat', async () => {
  const [{ row }] = await readContentRows([{ table: 'ability_block', id: 39157 }]);
  const proposed = { ...structuredClone(row), description: correctedDescription(row.description) };
  assert.equal(String(proposed.uuid), '5320033208115637');
  assert.equal(md5(proposed.description), afterMd5);
  assert.equal(correctedDescription(proposed.description), proposed.description);
  assert.ok(AbilityBlockSchema.safeParse(proposed).success);
  assert.deepEqual({ ...proposed, description: row.description }, row);
  assert.throws(() => correctedDescription(`${row.description} Unreviewed edit.`));
});

test('Bloodrager tradition wording renders both existing trait links while other class versions retain their rules', async () => {
  engine = await createOperationEngine({ renderRichText: true });
  const rows = await readContentRows([
    ...[39157, 19948, 31445, 31739].map((id) => ({ table: 'ability_block', id })),
    ...[1459, 1475, 1560, 2398].map((id) => ({ table: 'trait', id })),
    { table: 'item', id: 9252 },
    { table: 'ability_block', id: 19856 },
  ]);
  engine.setFixtures(rows);
  const row = rows.find(({ table, row }) => table === 'ability_block' && row.id === 39157).row;
  const html = engine.renderRichText(correctedDescription(row.description));
  for (const name of ['arcane', 'divine']) {
    const link = engine.convertToHardcodedLink('trait', name);
    assert.ok(toText.includes(link));
    assert.match(html, new RegExp(`>${name}</`));
  }
  assert.match(html, /trait matching your bloodrager spellcasting tradition/);
  assert.match(rows.find(({ row }) => row.id === 19948).row.description, /gains the \[arcane\]/);
  assert.match(rows.find(({ row }) => row.id === 31445).row.description, /gains the \[divine\]/);
  assert.match(rows.find(({ row }) => row.id === 31739).row.description, /bloodline’s magical tradition/);
});

test('Bloodrager tradition repair rejects content drift and pending submissions and is registered for release', async () => {
  const requirements = JSON.parse(
    await readFile(new URL('../../supabase/release/requirements.json', import.meta.url), 'utf8')
  );
  const release = await readFile(
    new URL('../../supabase/release/war-of-immortals-bespell-tradition.sql', import.meta.url),
    'utf8'
  );
  assert.match(traditionMigration, /where id = 39157 for update/);
  assert.match(traditionMigration, /existing\.uuid is distinct from 5320033208115637/);
  assert.match(traditionMigration, /existing\.content_source_id is distinct from 400/);
  assert.match(traditionMigration, /status->>'state' = 'PENDING'/);
  assert.ok(traditionMigration.indexOf("status->>'state' = 'PENDING'") < traditionMigration.indexOf('= after_md5'));
  assert.match(traditionMigration, /md5\(existing\.description\) is distinct from before_md5/);
  assert.match(traditionMigration, /where id = 39157 and description = existing\.description/);
  assert.doesNotMatch(traditionMigration, /set (meta_data|uuid|traits|operations|actions|frequency)\s*=/);
  assert.deepEqual(requirements[traditionMigrationName], {
    check: 'war-of-immortals-bespell-tradition.sql',
    order: 'before-functions',
  });
  assert.match(release, new RegExp(afterMd5));
});
