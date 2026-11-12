import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

/**
 * Hermetic regression coverage for custom-weapon base inference (the fix in
 * "fix(import): inherit base weapon proficiency category").
 *
 * The golden-parity suite (pathbuilder-real-import.test.mjs) proves that the
 * Crimson Blade imports as a martial bastard sword, but it needs the full
 * operation engine and the 54 MB content dump. These tests exercise the same
 * `inferBaseWeapon` decision directly against the captured share payload plus a
 * small synthetic catalog, so CI can certify the inheritance rule without any
 * network or database dependency.
 */

globalThis.window = { location: { origin: 'http://localhost' }, addEventListener() {}, removeEventListener() {} };
globalThis.document = { documentElement: { style: {} }, addEventListener() {}, removeEventListener() {} };

// Keep Supabase's auth client from opening Node's real BroadcastChannel, and
// provide the WebSocket the bundled client expects on Node < 22.
globalThis.BroadcastChannel = class TestBroadcastChannel {
  addEventListener() {}
  removeEventListener() {}
  postMessage() {}
  close() {}
};
if (typeof globalThis.WebSocket === 'undefined') {
  const { WebSocket } = await import('ws');
  globalThis.WebSocket = WebSocket;
}

const here = dirname(fileURLToPath(import.meta.url));
const root = fileURLToPath(new URL('../', import.meta.url));
const bundleDir = await mkdtemp(join(tmpdir(), 'wg-pathbuilder-base-weapon-'));
const outfile = join(bundleDir, 'base-weapon.mjs');

try {
  const { build, stop } = await import('esbuild');
  try {
    await build({
      absWorkingDir: root,
      stdin: {
        contents: `
          export { inferBaseWeapon, createReferenceItem } from './src/process/import/pathbuilder/pathbuilder-share-importer.ts';
          export { parseCustomFileJson } from './src/process/import/pathbuilder/pathbuilder-resolve.ts';
        `,
        resolveDir: root,
      },
      outfile,
      bundle: true,
      write: true,
      platform: 'node',
      format: 'esm',
      define: {
        'import.meta.env': '{"VITE_ENV":"test","VITE_SUPABASE_URL":"http://localhost:8000","VITE_SUPABASE_KEY":"test-anon-key"}',
      },
      tsconfig: join(root, 'tsconfig.json'),
    });
  } finally {
    // esbuild's JS API keeps a child service alive; stop it once bundling is done.
    await stop();
  }
} catch (error) {
  await rm(bundleDir, { recursive: true, force: true });
  throw error;
}

let mod;
try {
  mod = await import(pathToFileURL(outfile).href);
} finally {
  await rm(bundleDir, { recursive: true, force: true }).catch(() => {});
}

const { inferBaseWeapon, createReferenceItem, parseCustomFileJson } = mod;
assert.equal(typeof inferBaseWeapon, 'function', 'inferBaseWeapon must be exported for regression coverage');
assert.equal(typeof createReferenceItem, 'function', 'createReferenceItem must be exported for regression coverage');

// `createReferenceItem` persists through upsertItem -> makeRequest -> supabase.functions.invoke.
// Capture the payload instead of reaching the network so these assertions stay hermetic.
let lastUpsertedItem = null;
globalThis.fetch = async (url, init) => {
  if (String(url).includes('/functions/v1/create-item')) {
    lastUpsertedItem = JSON.parse(init.body).item ?? JSON.parse(init.body);
  }
  return new Response(JSON.stringify({ status: 'success', data: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
const traitsMap = new Map([['agile', 11], ['finesse', 12], ['magical', 13], ['nonlethal', 14], ['unarmed', 15], ['grapple', 16]]);

// ─── fixture input: the real Custom File from golden build 1597410 ────────────

const fixture = JSON.parse(readFileSync(join(here, 'fixtures', 'pathbuilder-kasane-1597410.json'), 'utf8'));
const build = fixture.build ?? fixture;
const crimsonEntry = build.listCustomFiles.find((entry) => {
  const parsed = parseCustomFileJson(entry);
  return parsed?.name === 'Crimson Blade';
});
assert.ok(crimsonEntry, 'captured payload must contain the Crimson Blade Custom File');
const crimsonBlade = parseCustomFileJson(crimsonEntry);

// ─── synthetic catalog mirroring WG content rows ──────────────────────────────

const weapon = (id, name, category, group, die, dice = 1) => ({
  id,
  name,
  group: 'WEAPON',
  bulk: '1',
  level: 0,
  meta_data: { category, group, damage: { dice, die, damageType: 'slashing' } },
});

const catalog = [
  weapon(1, 'Dagger', 'simple', 'sword', 'd4'),
  weapon(2, 'Bastard Sword', 'martial', 'sword', 'd8'),
  weapon(3, 'Longsword', 'martial', 'sword', 'd8'),
  weapon(4, 'Sword, Two-Handed', 'martial', 'sword', 'd12'),
  weapon(5, 'Claw', 'unarmed_attack', 'brawling', 'd4'),
  weapon(6, 'Fist', 'unarmed_attack', 'brawling', 'd4'),
];

// ─── tests ────────────────────────────────────────────────────────────────────

{
  // The Golden Build case: prose names "+1 striking bastard sword" with no
  // mechanical fields on the Custom File itself.
  const base = inferBaseWeapon(crimsonBlade, catalog);
  assert.equal(base?.name, 'Bastard Sword', 'Crimson Blade must match the Bastard Sword by longest unique name');
  assert.equal(base?.meta_data?.category, 'martial', 'the matched base must carry the martial proficiency category');
  assert.equal(base?.meta_data?.group, 'sword');
}

{
  // Substring containment: "Longsword" also matches only when its own name appears.
  const longsword = inferBaseWeapon(
    { uniqueIdentifier: 'x', name: 'Homebrew Blade', description: 'This weapon is a +1 striking longsword.', weaponTraits: 'Versatile P' },
    catalog
  );
  assert.equal(longsword?.name, 'Longsword');
  assert.equal(longsword?.meta_data?.category, 'martial');
}

{
  // Ambiguity policy: two distinct weapons tie on the longest matched name —
  // never guess, so the item keeps an empty category instead of inheriting noise.
  const ambiguousCatalog = [
    ...catalog,
    weapon(7, 'Bastard Sword', 'advanced', 'sword', 'd8'), // different source prints the same name
  ];
  const tiedNames = inferBaseWeapon(
    { uniqueIdentifier: 'y', name: 'Twin Blades', description: 'Counts as a dagger and a claw.', weaponTraits: '' },
    catalog
  );
  assert.equal(tiedNames?.name, 'Dagger', 'single-name candidates still resolve even when several weapons match');

  const exactTieCatalog = [
    weapon(8, 'War Club', 'simple', 'club', 'd8'),
    weapon(9, 'War Mace', 'simple', 'mace', 'd8'),
  ];
  const tie = inferBaseWeapon(
    { uniqueIdentifier: 'z', name: 'Ambiguous Weapon', description: 'Behaves as a war club or war mace.', weaponTraits: '' },
    exactTieCatalog
  );
  assert.equal(tie, undefined, 'a genuine tie between different weapon names must not guess a base weapon');
}

{
  // Same-name duplicates across sources are one logical weapon: deterministic, first row wins.
  const duplicated = [
    weapon(10, 'Bastard Sword', 'martial', 'sword', 'd8'),
    weapon(11, 'Bastard Sword', 'martial', 'sword', 'd8'),
  ];
  const base = inferBaseWeapon(crimsonBlade, [...duplicated, ...catalog]);
  assert.equal(base?.name, 'Bastard Sword');
  assert.equal(base?.meta_data?.category, 'martial');
}

{
  // No match at all: caller falls back to the Custom File's own fields.
  const none = inferBaseWeapon(
    { uniqueIdentifier: 'w', name: 'Voidscythe', description: 'A weapon of pure void energy.', weaponTraits: 'Trip, Disarm' },
    catalog
  );
  assert.equal(none, undefined);
}

{
  // Non-weapon content rows must never be considered, even when named in prose.
  const mixedCatalog = [
    ...catalog,
    { id: 99, name: 'Bastard Sword Holster', group: 'GENERAL', meta_data: { category: 'simple' } },
  ];
  const base = inferBaseWeapon(crimsonBlade, mixedCatalog);
  assert.equal(base?.name, 'Bastard Sword', 'only WEAPON-group rows may become base weapons');
}

// ─── createReferenceItem: the Step-2 fix (no fabricated 'simple' fallback) ─────

const ref = (name, raw) => ({ kind: 'unresolved', name, raw, quantity: 1 });

{
  // A reference weapon whose prose names a WG weapon inherits its category/group
  // instead of being stamped 'simple' (the old hardcoded fallback).
  const warnings = [];
  lastUpsertedItem = null;
  const created = await createReferenceItem(
    ref('Runesword Blade', 'a +1 striking bastard sword'),
    77,
    warnings,
    'weapon',
    traitsMap,
    catalog
  );
  assert.ok(created, 'the reference item must be materialized');
  assert.equal(lastUpsertedItem.meta_data.category, 'martial', 'matched references inherit the base proficiency category');
  assert.equal(lastUpsertedItem.meta_data.group, 'sword');
  assert.deepEqual(warnings, [], 'inheriting a category is not a warning condition');
}

{
  // No unique match: the category stays unset — never a fabricated 'simple' —
  // and the ambiguity is logged (contract §2 determinism requirement).
  const warnings = [];
  const logged = [];
  const originalInfo = console.info;
  console.info = (...args) => logged.push(args.join(' '));
  try {
    await createReferenceItem(ref('Voidscythe', 'a weapon of pure void energy'), 77, warnings, 'weapon', traitsMap, catalog);
  } finally {
    console.info = originalInfo;
  }
  assert.equal(lastUpsertedItem.meta_data.category, undefined, 'unmatched references must not claim simple proficiency');
  assert.ok(
    logged.some((line) => line.includes('Voidscythe') && line.includes('no unique WG base-weapon match')),
    'an unmatched reference weapon must log the ambiguity decision'
  );
}

{
  // Special unarmed references keep their dedicated unarmed metadata.
  lastUpsertedItem = null;
  await createReferenceItem(ref('Automaton Slam', 'SPECIAL UNARMED (1d8)'), 77, [], 'weapon', traitsMap, catalog);
  assert.equal(lastUpsertedItem.meta_data.category, 'unarmed_attack');
  assert.equal(lastUpsertedItem.meta_data.group, 'brawling');
  assert.deepEqual(lastUpsertedItem.meta_data.display_traits, ['Agile', 'Finesse', 'Magical', 'Nonlethal', 'Unarmed']);
  assert.equal(lastUpsertedItem.hands, '1');
}

{
  const warnings = [];
  lastUpsertedItem = null;
  await createReferenceItem(ref('Claw', 'SPECIAL UNARMED (1d4)'), 77, warnings, 'weapon', traitsMap, catalog);
  assert.equal(lastUpsertedItem.meta_data.damage.damageType, 'S', 'Automaton Armament Claw is slashing');
  assert.deepEqual(lastUpsertedItem.meta_data.display_traits, ['Agile', 'Finesse', 'Magical', 'Unarmed']);
  assert.equal(lastUpsertedItem.meta_data.display_traits.includes('Nonlethal'), false);
}

{
  const warnings = [];
  lastUpsertedItem = null;
  await createReferenceItem(ref('Pincer', 'SPECIAL UNARMED (1d6)'), 77, warnings, 'weapon', traitsMap, catalog);
  assert.equal(lastUpsertedItem.meta_data.damage.damageType, 'P', 'Automaton Armament Pincer is piercing');
  assert.deepEqual(lastUpsertedItem.meta_data.display_traits, ['Grapple', 'Magical', 'Unarmed']);
}

console.log('pathbuilder-base-weapon: all assertions passed');
