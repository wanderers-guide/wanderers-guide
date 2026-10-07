import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { before, after, test } from 'node:test';
import { ItemSchema } from '../src/schemas/content.ts';
import { createOperationEngine, readContentRows } from './operation-test-harness.mjs';

const migration = await readFile(
  new URL('../../supabase/migrations/20261002070000_treasure_vault_immortal_bastion_prose.sql', import.meta.url),
  'utf8'
);
const release = await readFile(
  new URL('../../supabase/release/treasure-vault-immortal-bastion-prose.sql', import.meta.url),
  'utf8'
);
const spec = JSON.parse(migration.split('$bastion$')[1]);
const dependencies = await readContentRows(spec.dependencies.map(({ table, id }) => ({ table, id })));

/** Require the complete reviewed domain, then change the description of a clone only. */
function apply(row) {
  assert.ok(row);
  const anchor = { ...row, uuid: String(row.uuid) };
  for (const key of ['description', 'updated_at', 'search_tsv']) delete anchor[key];
  assert.deepEqual(anchor, spec.anchor);
  assert.ok(row.description === spec.before || row.description === spec.after);
  const next = { ...structuredClone(row), description: spec.after };
  ItemSchema.parse(next);
  return next;
}

const original = { ...structuredClone(spec.anchor), description: spec.before };
const proposed = apply(original);
let engine;
before(async () => {
  engine = await createOperationEngine({ renderRichText: true });
});
after(async () => engine?.cleanup());

test('both independently limited reactions retain every printed effect and preserve every armor mechanic and citation', () => {
  assert.deepEqual(spec, JSON.parse(release.split('$bastion$')[1]));
  ItemSchema.parse(original);
  ItemSchema.parse(proposed);
  assert.deepEqual({ ...proposed, description: original.description }, original);
  assert.equal(proposed.id, 12104);
  assert.deepEqual(proposed.traits, [1594, 2865, 1527]);
  assert.deepEqual(proposed.meta_data.runes, {
    potency: 3,
    property: [{ id: 6973, name: 'Fortification (Greater)' }],
    resilient: 2,
  });
  assert.equal(proposed.meta_data.source.url, 'https://2e.aonprd.com/Equipment.aspx?ID=4380');
  assert.equal((proposed.description.match(/\*\*Frequency\*\* once per day/g) ?? []).length, 2);
  assert.equal((proposed.description.match(/cost="REACTION"/g) ?? []).length, 2);
  assert.equal((proposed.description.match(/\*\*Trigger\*\*/g) ?? []).length, 2);
  assert.match(proposed.description, /reduced to 0 Hit Points or would die from a \[death\]/);
  assert.match(proposed.description, /gain or increase the doomed or wounded condition/);
  assert.match(proposed.description, /drop to 1 Hit Point instead of being reduced to 0 HP or dying/);
  assert.match(proposed.description, /100 temporary Hit Points that last until the start of your next turn/);
  assert.match(proposed.description, /imposes both doomed and wounded, choose only one to prevent/);
  assert.match(proposed.description, /doesn't remove either of the conditions if you already have them/);
  assert.match(
    proposed.description,
    /nor does it prevent the same triggering effect from giving or increasing the prevented condition later/
  );
  assert.match(proposed.description, /\+2 circumstance bonus to AC against melee attacks instead of \+1/);
  assert.match(proposed.description, /10 temporary Hit Points/);
  assert.doesNotMatch(proposed.description, /\[\[|@UUID|envision|—/);
});

test('every named armor, rune and repeated trait reference resolves using the real helper and correct content table', () => {
  engine.setFixtures(dependencies);
  for (const match of proposed.description.matchAll(/\[([^\]]+)\]\(link_([a-z-]+)_(\d+)\)/g)) {
    const [, label, type, rawId] = match;
    const target = dependencies.find(
      ({ table, row }) => table === type.replaceAll('-', '_') && row.id === Number(rawId)
    );
    assert.ok(target, `${type}:${rawId}`);
    assert.equal(engine.convertToHardcodedLink(type, target.row.name, label), match[0]);
  }
  assert.equal((proposed.description.match(/link_trait_1432/g) ?? []).length, 2);
});

test('actual RichText displays reaction symbols and both limitations while removing literal import junk and auto-linking every condition', () => {
  assert.match(engine.renderRichText(original.description), /\[\[Effect: Immortal Bastion\]\]/);
  const html = engine.renderRichText(proposed.description);
  assert.doesNotMatch(html, /\[\[|Effect: Immortal Bastion|action_symbol_R/);
  assert.equal((html.match(/<abbr class="action-symbol">R<\/abbr>/g) ?? []).length, 2);
  assert.equal((html.match(/Frequency/g) ?? []).length, 2);
  assert.equal((html.match(/Trigger/g) ?? []).length, 2);
  assert.match(html, /<a\b[^>]*>doomed<\/a>/);
  assert.match(html, /<a\b[^>]*>wounded<\/a>/);
});

test('replay and saved copies remain unchanged; unreviewed body, mechanics, citation, identity and source changes fail closed', () => {
  assert.deepEqual(apply(proposed), proposed);
  const savedCopy = { id: 'saved-copy', item: structuredClone(original), is_equipped: true, is_invested: true };
  const savedBefore = structuredClone(savedCopy);
  apply(original);
  assert.deepEqual(savedCopy, savedBefore);
  for (const mutate of [
    (row) => {
      row.description += '\nUnknown edit';
    },
    (row) => {
      row.level = 21;
    },
    (row) => {
      row.traits = [1594, 2865];
    },
    (row) => {
      row.price = { gp: 60000 };
    },
    (row) => {
      row.meta_data.source.url = 'https://2e.aonprd.com/Equipment.aspx?ID=1847';
    },
    (row) => {
      row.meta_data.runes.resilient = 3;
    },
    (row) => {
      row.uuid = String(Number(row.uuid) + 1);
    },
    (row) => {
      row.content_source_id = 7;
    },
    (row) => {
      row.operations = [];
    },
  ]) {
    const changed = structuredClone(original);
    mutate(changed);
    assert.throws(() => apply(changed));
  }
  const body = migration.split('$bastion$')[2];
  assert.match(body, /lock table public\.content_update in share mode/);
  assert.match(body, /coalesce\(u\.status->>'state','PENDING'\) not in \('APPROVED','REJECTED'\)/);
  assert.match(body, /captured CAS failed/);
  assert.match(body, /final owner drift/);
  assert.match(body, /final dependency drift/);
  assert.match(body, /final source drift/);
  assert.match(body, /final curator drift/);
  assert.doesNotMatch(
    body,
    /insert into|delete from|set (?:meta_data|bulk|usage|traits|operations)|update public\.(character|creature|trait|content_source)/i
  );
});
