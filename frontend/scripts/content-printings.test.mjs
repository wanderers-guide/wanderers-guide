import assert from 'node:assert/strict';
import { test } from 'node:test';
import { selectPreferredPrintings } from '../src/process/content/content-printings.ts';
import {
  ContentEntryPrintingSchema,
  ContentSourcePrintingSchema,
  ContentSourceSchema,
  ItemSchema,
} from '../src/schemas/content.ts';
import { readContentRows } from './operation-test-harness.mjs';

const source = (id, rules_edition, published_on = '2024-01-01', role = 'RULEBOOK', book_key = `book-${id}`) => ({
  id,
  user_id: null,
  is_published: true,
  meta_data: { printing: { book_key, printing: 1, published_on, role, rules_edition } },
});
const row = (id, content_source_id, name = 'Same name', printing = {}) => ({
  id,
  content_source_id,
  name,
  level: 1,
  meta_data: { printing },
});
// Reviewed relationships below are test annotations, never production verification claims.
const replacement = (original, relationship = 'REMASTER', type = 'item') => ({
  type,
  id: original.id,
  content_source_id: original.content_source_id,
  relationship,
  verification: {
    original: { book: 'Original test printing', url: 'https://2e.aonprd.com/Equipment.aspx?ID=4712&NoRedirect=1' },
    replacement: { book: 'Successor test printing', url: 'https://2e.aonprd.com/Equipment.aspx?ID=2178' },
    reviewed_on: '2026-10-07',
  },
});
const successor = (id, content_source_id, original, relationship = 'REMASTER') =>
  row(id, content_source_id, 'Renamed entry', { replaces: [replacement(original, relationship)] });
const ids = (entries) => entries.map((entry) => entry.id);
const legacy = source(16, 'LEGACY', '2023-02-01');
const remaster = source(900, 'REMASTER', '2025-02-01');

test('verified Treasure Vault replacements preserve renamed IDs, full books, and saved choices', () => {
  const original = row(12193, 16, 'Marvelous Pigment');
  const current = successor(50000, 900, original);
  const entries = [original, current];
  const before = structuredClone(entries);
  assert.deepEqual(ids(selectPreferredPrintings('item', entries, [legacy, remaster])), [50000]);
  assert.deepEqual(
    ids(selectPreferredPrintings('item', entries, [legacy, remaster], { preserveIds: [12193] })),
    [12193, 50000]
  );
  assert.deepEqual(
    ids(selectPreferredPrintings('item', entries, [legacy, remaster], { sourceId: 16 })),
    [12193, 50000]
  );
  assert.deepEqual(entries, before);
  assert.equal(selectPreferredPrintings('item', entries, [legacy, remaster])[0], current);
});

test('names, levels, edition labels and IDs alone never establish replacement', () => {
  const original = row(1, 16);
  const unrelated = row(2, 900);
  assert.deepEqual(ids(selectPreferredPrintings('item', [original, unrelated], [legacy, remaster])), [1, 2]);
});

test('disabled, absent, unpublished or unclassified replacements leave the enabled original', () => {
  const original = row(1, 16);
  const current = successor(2, 900, original);
  assert.deepEqual(ids(selectPreferredPrintings('item', [original], [legacy])), [1]);
  for (const sources of [
    [legacy],
    [legacy, { ...remaster, is_published: false }],
    [legacy, { ...remaster, meta_data: {} }],
  ]) {
    assert.deepEqual(ids(selectPreferredPrintings('item', [original, current], sources)), [1, 2]);
  }
  assert.deepEqual(ids(selectPreferredPrintings('item', [current], [remaster])), [2]);
});

test('homebrew cannot hide official content or be hidden by an official replacement', () => {
  const original = row(1, 16);
  const current = successor(2, 900, original);
  const homebrew = { ...remaster, user_id: 'a-homebrew-owner' };
  assert.deepEqual(ids(selectPreferredPrintings('item', [original, current], [legacy, homebrew])), [1, 2]);
  assert.deepEqual(
    ids(selectPreferredPrintings('item', [original, current], [{ ...legacy, user_id: 'owner' }, remaster])),
    [1, 2]
  );
});

test('an equivalent rulebook remains preferred over a newer adventure reprint', () => {
  const original = row(1, 16);
  const current = successor(2, 900, original, 'EQUIVALENT_REPRINT');
  const sources = [
    source(16, 'REMASTER', '2020-01-01', 'RULEBOOK'),
    source(900, 'REMASTER', '2026-01-01', 'ADVENTURE'),
  ];
  assert.deepEqual(ids(selectPreferredPrintings('item', [original, current], sources)), [1]);
});

test('equivalent printings use explicit publication dates and same-book printing numbers', () => {
  const original = row(1, 16);
  const current = successor(2, 900, original, 'EQUIVALENT_REPRINT');
  const sources = [source(16, 'REMASTER', '2020-01-01'), source(900, 'REMASTER', '2026-01-01')];
  assert.deepEqual(ids(selectPreferredPrintings('item', [original, current], sources)), [2]);
  sources[0].meta_data.printing.published_on = '2026-01-01';
  assert.deepEqual(ids(selectPreferredPrintings('item', [original, current], sources)), [1, 2]);
  sources[1].meta_data.printing.book_key = sources[0].meta_data.printing.book_key;
  sources[1].meta_data.printing.printing = 2;
  assert.deepEqual(ids(selectPreferredPrintings('item', [original, current], sources)), [2]);
});

test('legacy backports override the edition of their containing book', () => {
  const original = row(1, 16, 'Backported legacy rule', { rules_edition: 'LEGACY' });
  const current = successor(2, 900, original, 'EQUIVALENT_REPRINT');
  const sources = [source(16, 'REMASTER', '2026-01-01'), source(900, 'REMASTER', '2024-01-01')];
  assert.deepEqual(ids(selectPreferredPrintings('item', [original, current], sources)), [2]);
});

test('branched replacements retain all candidates until an unambiguous successor exists', () => {
  const original = row(1, 16);
  const one = successor(2, 900, original);
  const two = successor(3, 901, original);
  const sources = [legacy, remaster, source(901, 'REMASTER')];
  assert.deepEqual(ids(selectPreferredPrintings('item', [original, one, two], sources)), [1, 2, 3]);
});

test('contradictory cycles stay visible even when a policy would rank one member higher', () => {
  const original = row(1, 16);
  const current = successor(2, 900, original);
  original.meta_data.printing.replaces = [replacement(current)];
  assert.deepEqual(ids(selectPreferredPrintings('item', [original, current], [legacy, remaster])), [1, 2]);
});

test('wrong type, subtype, source identity, missing evidence and malformed metadata never hide rows', () => {
  const original = row(1, 16);
  const current = successor(2, 900, original);
  const cases = [];
  for (const field of [{ type: 'spell' }, { content_source_id: 999 }, { verification: undefined }]) {
    const changed = structuredClone(current);
    Object.assign(changed.meta_data.printing.replaces[0], field);
    cases.push(changed);
  }
  cases.push({ ...current, type: 'hazard' });
  cases.push({ ...current, meta_data: { printing: { replaces: 'not-a-list' } } });
  cases.push({ ...current, deprecated: true });
  for (const changed of cases)
    assert.deepEqual(ids(selectPreferredPrintings('item', [original, changed], [legacy, remaster])), [1, 2]);
});

test('duplicate identities remain literal rather than selecting arbitrary records', () => {
  const original = row(1, 16);
  const current = successor(2, 900, original);
  assert.deepEqual(
    ids(selectPreferredPrintings('item', [original, current, { ...current }], [legacy, remaster])),
    [1, 2, 2]
  );
  assert.deepEqual(ids(selectPreferredPrintings('item', [original, current], [legacy, remaster, remaster])), [1, 2]);
});

test('printing metadata validates dates, evidence and identity while preserving source extensions', async () => {
  assert.equal(
    ContentSourcePrintingSchema.safeParse({ ...legacy.meta_data.printing, published_on: '2026-02-30' }).success,
    false
  );
  assert.equal(ContentEntryPrintingSchema.safeParse({ replaces: [replacement(row(1, 16))] }).success, true);
  const invalid = replacement(row(1, 16));
  invalid.verification.original.url = 'javascript:alert(1)';
  assert.equal(ContentEntryPrintingSchema.safeParse({ replaces: [invalid] }).success, false);
  const [{ row: existing }] = await readContentRows([{ table: 'content_source', id: 16 }]);
  const parsed = ContentSourceSchema.parse({
    ...existing,
    meta_data: { ...existing.meta_data, printing: legacy.meta_data.printing, extension: 1 },
  });
  assert.deepEqual(parsed.meta_data.printing, legacy.meta_data.printing);
  assert.equal(parsed.meta_data.extension, 1);
});

test('all three actual War of Immortals armor reprints retain both catalog records', async () => {
  const captured = await readContentRows([{ table: 'item', sourceIds: [16, 400] }]);
  const before = structuredClone(captured);
  for (const name of ['Lattice Armor', 'Niyaháat', 'Sankeit']) {
    const pair = captured.filter(({ row }) => row.name === name && row.group === 'ARMOR').map(({ row }) => row);
    assert.equal(pair.length, 2, name);
    const original = pair.find((entry) => entry.content_source_id === 16);
    const reprint = pair.find((entry) => entry.content_source_id === 400);
    const annotated = structuredClone(reprint);
    annotated.meta_data.printing = { replaces: [replacement(original, 'EQUIVALENT_REPRINT')] };
    assert.deepEqual(ItemSchema.parse(annotated).meta_data.printing, annotated.meta_data.printing);
    // Policy mechanics only: these synthetic annotations do not certify equivalence.
    const sources = [source(16, 'LEGACY', '2023-02-01'), source(400, 'REMASTER', '2024-10-01')];
    assert.deepEqual(ids(selectPreferredPrintings('item', [original, annotated], sources)), [reprint.id]);
    assert.deepEqual(
      ids(selectPreferredPrintings('item', [original, annotated], sources, { preserveIds: [original.id] })),
      [original.id, reprint.id]
    );
  }
  assert.deepEqual(captured, before);
});

test('the current unclassified Treasure Vault corpus keeps every historical ID', async () => {
  const [{ row: book }] = await readContentRows([{ table: 'content_source', id: 16 }]);
  const rows = (await readContentRows([{ table: 'item', sourceIds: [16] }])).map((entry) => entry.row);
  assert.equal(book.meta_data?.printing, undefined);
  assert.deepEqual(selectPreferredPrintings('item', rows, [book]), rows);
});

test('malformed original edition metadata prevents replacement rather than falling back to a book label', () => {
  const original = row(1, 16, 'Unknown edition', { rules_edition: 'unknown' });
  const current = successor(2, 900, original);
  assert.deepEqual(ids(selectPreferredPrintings('item', [original, current], [legacy, remaster])), [1, 2]);
});
