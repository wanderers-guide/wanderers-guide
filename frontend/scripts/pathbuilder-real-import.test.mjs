import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

globalThis.window = { location: { origin: 'http://localhost' }, addEventListener() {}, removeEventListener() {} };
globalThis.document = { documentElement: { style: {} }, addEventListener() {}, removeEventListener() {} };

// This integration test replaces all network/request boundaries with fixtures.
// Keep Supabase's auth client from opening Node's real BroadcastChannel, which
// creates a referenced MessagePort and prevents the standalone test process exiting.
globalThis.BroadcastChannel = class TestBroadcastChannel {
  addEventListener() {}
  removeEventListener() {}
  postMessage() {}
  close() {}
};

// The bundled Supabase client requires a global WebSocket. Node 20 ships one
// behind a flag, so provide the `ws` polyfill when running on older runtimes.
if (typeof globalThis.WebSocket === 'undefined') {
  const { WebSocket } = await import('ws');
  globalThis.WebSocket = WebSocket;
}

import { build, stop } from 'esbuild';
import { createOperationEngine, readContentRows } from './operation-test-harness.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = fileURLToPath(new URL('../', import.meta.url));
const fixture = JSON.parse(readFileSync(join(here, 'fixtures', 'pathbuilder-kasane-1597410.json'), 'utf8'));
const capturedDerivedResponse = JSON.parse(
  readFileSync(join(here, 'fixtures', 'pathbuilder-kasane-474853-derived.json'), 'utf8')
);
assert.equal(capturedDerivedResponse.success, true);
assert.equal(capturedDerivedResponse.build.name, 'Kasane');
assert.equal(capturedDerivedResponse.build.level, 7);
assert.equal(capturedDerivedResponse.build.acTotal.acTotal, 27);
const capturedDerivedBuild = capturedDerivedResponse.build;

assert.equal(fixture.build_id, '1597410');
assert.equal(fixture.format_version, '121');
assert.equal(
  fixture.build.characterData.playerArmor.armorName,
  'be5e11f6-4459-4080-9107-8145dd57014b',
  'the captured share preserves its armor Custom File UUID even when the file is absent'
);
assert.equal(
  fixture.build.characterData.playerArmor.itemResilient,
  1,
  'the captured share provides Resilient rank 1 as itemResilient'
);

const sourceIds = [
  3, 32, 14, 34, 33, 18, 839, 611, 114, 239, 240, 241, 35, 51, 19, 20, 11, 43, 580, 12,
  420, 730, 36, 9, 21, 37, 818, 203, 38, 7, 22, 23, 731, 17, 852, 853, 859, 867, 146, 185,
  24, 842, 437, 635, 39, 25, 26, 45, 8, 873, 27, 636, 811, 46, 499, 40, 117, 186, 50, 29, 1,
  256, 276, 476, 41, 15, 748, 493, 402, 52, 13, 118, 582, 591, 147, 448, 578, 793, 579, 152,
  42, 840, 590, 172, 44, 28, 47, 48, 318, 171, 30, 16, 581, 838, 49, 85, 400, 305, 31,
];

const tableMap = {
  ability_block: 'abilityBlocks',
  class: 'classes',
  ancestry: 'ancestries',
  background: 'backgrounds',
  spell: 'spells',
  item: 'items',
  trait: 'traits',
  language: 'languages',
  archetype: 'archetypes',
  versatile_heritage: 'versatileHeritages',
  class_archetype: 'classArchetypes',
};

const rows = await readContentRows(
  Object.keys(tableMap).map((table) => ({ table, sourceIds }))
);

const content = Object.fromEntries(Object.values(tableMap).map((key) => [key, []]));
for (const { table, row } of rows) {
  content[tableMap[table]].push(row);
}
content.defaultSources = { PAGE: sourceIds, INFO: sourceIds };
content.sources = sourceIds.map((id) => ({ id }));

const contentStore = `
let packageContent = {
  abilityBlocks: [], classes: [], ancestries: [], backgrounds: [], spells: [], items: [],
  traits: [], languages: [], archetypes: [], versatileHeritages: [], classArchetypes: [],
  sources: [], defaultSources: { PAGE: [], INFO: [] },
};
export function importFromContentPackage(value) { packageContent = structuredClone(value); }
export function setFixtures() {}
export function getCachedContent(type) {
  const map = {
    'ability-block': 'abilityBlocks',
    class: 'classes',
    ancestry: 'ancestries',
    background: 'backgrounds',
    spell: 'spells',
    item: 'items',
    trait: 'traits',
    language: 'languages',
    archetype: 'archetypes',
    'versatile-heritage': 'versatileHeritages',
    'class-archetype': 'classArchetypes',
  };
  return packageContent[map[type]] ?? [];
}
export async function fetchContentById(type, id) {
  return getCachedContent(type).find((row) => row.id === id) ?? null;
}
export async function fetchContent(type, data) {
  let rows = getCachedContent(type);
  if (data?.id !== undefined) {
    const ids = Array.isArray(data.id) ? data.id : [data.id];
    rows = rows.filter((row) => ids.includes(row.id));
  }
  if (Array.isArray(data?.content_sources)) {
    rows = rows.filter((row) => data.content_sources.includes(row.content_source_id));
  }
  return rows;
}
export async function fetchContentAll(type, requestedSources) {
  const rows = getCachedContent(type);
  return rows.filter((row) =>
    !Array.isArray(requestedSources) ||
    requestedSources.length === 0 ||
    requestedSources.includes(row.content_source_id)
  );
}
export async function fetchTraitByName(name) {
  return getCachedContent('trait').find((row) => row.name.toLowerCase() === name.toLowerCase()) ?? null;
}
export async function fetchArchetypeByDedicationFeat(id) {
  return getCachedContent('archetype').find((row) => row.dedication_feat_id === id) ?? null;
}
export function getDefaultSources(view) { return packageContent.defaultSources?.[view] ?? []; }
export function getDefaultSourcesKey(view) { return getDefaultSources(view).join(','); }
export function defineDefaultSources(view, values) {
  packageContent.defaultSources[view] = values;
  return values;
}
export async function fetchContentPackage() { return structuredClone(packageContent); }
export async function fetchContentSources() { return structuredClone(packageContent.sources ?? []); }
export async function fetchAbilityBlockByName(name) {
  return getCachedContent('ability-block').find((row) => row.name.toLowerCase() === name.toLowerCase()) ?? null;
}
export async function fetchAllPrereqs() { return []; }
export async function fetchCreatureByName() { return null; }
export async function fetchItemByName() { return null; }
export async function fetchLanguageByName() { return null; }
export async function fetchSpellByName() { return null; }
export async function fetchTraits() { return []; }
export async function fetchVersHeritageByHeritage() { return null; }
export async function findRequiredContentSources() {
  return { sourceIds: [], sources: [], newSourceIds: [], newSources: [] };
}
export function getContentFast() { return []; }
export function resetContentStore() {}
export function setContentCacheActor() {}
`;

const notifications = 'export function showNotification() {} export function hideNotification() {} export function updateNotification() {}';

const creation = `
let itemId = 100000;
export async function createPathbuilderContentSource() {
  return {
    id: 902, created_at: '', user_id: '', name: 'Pathbuilder Custom',
    foundry_id: null, url: null, description: '', operations: [], contact_info: '',
    require_key: false, keys: null, is_published: false, artwork_url: '',
    required_content_sources: [], group: '', meta_data: null,
  };
}
export async function upsertItem(item) { return { ...structuredClone(item), id: ++itemId }; }
export async function upsertSpell(item) { return { ...structuredClone(item), id: ++itemId }; }
export async function deleteContent() { return null; }
export async function upsertAbilityBlock() { return null; }
export async function upsertAncestry() { return null; }
export async function upsertArchetype() { return null; }
export async function upsertBackground() { return null; }
export async function upsertClass() { return null; }
export async function upsertClassArchetype() { return null; }
export async function upsertContent() { return null; }
export async function upsertContentSource() { return null; }
export async function upsertCreature() { return null; }
export async function upsertLanguage() { return null; }
export async function upsertTrait() { return null; }
export async function upsertVersatileHeritage() { return null; }
`;

const requests = `
let importRowId = 7001;
export async function makeRequest(endpoint, body) {
  if (endpoint === 'create-pathbuilder-import' && body?.id === -1) return { id: importRowId };
  if (endpoint === 'create-pathbuilder-import') return true;
  if (endpoint === 'create-character') return { ...structuredClone(body), id: 9001 };
  return { ...structuredClone(body), id: body?.id === undefined ? 9001 : body.id };
}
`;

const contentUtils = `
export function toMarkdown(value) { return String(value ?? ''); }
export function toHTML(value) { return String(value ?? ''); }
export function toText(value) { return String(value ?? ''); }
export function isAbilityBlockType(value) {
  return ['action','feat','physical-feature','sense','class-feature','heritage','mode'].includes(value ?? '');
}
export function isActionCost(value) {
  return ['ONE-ACTION','TWO-ACTIONS','THREE-ACTIONS','REACTION','FREE-ACTION',
    'REACTION-OR-ONE-ACTION','ONE-TO-TWO-ACTIONS','ONE-TO-THREE-ACTIONS',
    'TWO-TO-THREE-ACTIONS','TWO-TO-TWO-ROUNDS','TWO-TO-THREE-ROUNDS',
    'THREE-TO-TWO-ROUNDS','THREE-TO-THREE-ROUNDS',null].includes(value);
}
export function convertToContentType(type) {
  if (type === 'hazard') return 'creature';
  if (type === 'cast-spell' || type === 'add-spell') return 'spell';
  if (type === 'inv-item') return 'item';
  return isAbilityBlockType(type) ? 'ability-block' : type;
}
export function getIconFromContentType() { return undefined; }
`;

const bundleDir = await mkdtemp(join(tmpdir(), 'wg-pathbuilder-real-import-'));
const outfile = join(bundleDir, 'importer.mjs');

try {
  await build({
    absWorkingDir: root,
    stdin: {
      contents: `
        export { importFromPathbuilderShare, preflightPathbuilderImport, buildCharacter, customEffectOperations, findVersatileHeritageOption, getSpecialSelectionsForOperation } from './src/process/import/pathbuilder/pathbuilder-share-importer.ts';
        export { importFromContentPackage } from '@content/content-store';
      `,
      resolveDir: root,
    },
    outfile,
    bundle: true,
    write: true,
    platform: 'node',
    format: 'esm',
    define: { 'import.meta.env': '{"VITE_ENV":"test","VITE_SUPABASE_URL":"http://localhost:8000","VITE_SUPABASE_KEY":"test-anon-key"}' },
    tsconfig: join(root, 'tsconfig.json'),
    plugins: [{
      name: 'pathbuilder-real-import-fixtures',
      setup(pluginBuild) {
        const entries = new Map([
          ['@content/content-store', contentStore],
          ['@content/content-creation', creation],
          ['@requests/request-manager', requests],
          ['@mantine/notifications', notifications],
          ['@content/content-utils', contentUtils],
        ]);
        for (const [key] of entries) {
          const filter = new RegExp('^' + key + '$');
          pluginBuild.onResolve({ filter }, (args) => ({ path: args.path, namespace: 'pb-real-fixture' }));
        }
        pluginBuild.onLoad({ filter: /.*/, namespace: 'pb-real-fixture' }, (args) => {
          const value = entries.get(args.path);
          if (value === undefined) throw new Error('Missing fixture module: ' + args.path);
          return { contents: value, loader: 'ts' };
        });
      },
    }],
  });

  const importer = await import(pathToFileURL(outfile).href);
  importer.importFromContentPackage(content);

  let shareRequests = 0;
  let derivedRequests = 0;

  const createFetch = (build) => async (url, init = {}) => {
    if (url.includes('/app/fetch_emailed.php')) {
      shareRequests++;
      assert.equal(init.method, 'POST');
      assert.deepEqual(JSON.parse(init.body), { id: '1597410' });
      return new Response(JSON.stringify({
        success: true,
        version: '121',
        build: JSON.stringify(build),
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    }

    if (url.includes('/json.php')) {
      derivedRequests++;
      return new Response(JSON.stringify({
        success: false,
        error: 'Build not found.',
      }), { status: 404, headers: { 'content-type': 'application/json' } });
    }

    throw new Error('Unexpected URL: ' + url);
  };

  const importBuild = async (build, selectionOverrides = {}) =>
    importer.importFromPathbuilderShare('1597410', {
      silent: true,
      selectionOverrides,
      fetchImpl: createFetch(build),
    });

  assert.equal(fixture.build.characterData.keyability, undefined);
  const rawOutcome = await importBuild(fixture.build);
  assert.equal(rawOutcome.ok, false);
  assert.match(rawOutcome.error, /key ability/i);
  assert.equal(shareRequests, 1);
  assert.equal(derivedRequests, 0);

  // The captured Pathbuilder share genuinely omits keyability. For the mechanical
  // parity test, inject the independently recovered value from the human-readable
  // oracle rather than pretending the source payload contained it.
  const certifiedBuild = structuredClone(fixture.build);
  certifiedBuild.characterData.keyability = 'str';

  // Deliberately stale synthetic target for the fail-closed regression.
  // A source mismatch must never create a character with unverified mechanics.
  // This lets the test prove that source inconsistency blocks character creation.
  const staleDerivedFixture = {
    name: 'Kasane',
    class: 'Champion',
    level: 7,
    ancestry: 'Automaton',
    heritage: 'Hunter Automaton',
    keyability: 'STR',
    abilities: { str: 18, dex: 14, con: 16, int: 10, wis: 12, cha: 16 },
    acTotal: { acTotal: 24 },
  };

  shareRequests = 0;
  derivedRequests = 0;

  // Simulate the new UI wizard explicitly answering each missing required
  // operation choice before the persistence/creation path is invoked.
  const selectionOverrides = {};
  let preflight = await importer.preflightPathbuilderImport('1597410', {
    fetchImpl: createFetch(certifiedBuild),
    derivedOverride: staleDerivedFixture,
    selectionOverrides,
  });
  assert.equal(preflight.status, 'selection-required', 'fixture should expose its omitted required choice');
  assert.match(preflight.selection.title, /deific weapon/i);
  assert.equal(preflight.snapshot.target?.ac?.total, 24, 'the mismatch-path fixture intentionally exposes stale AC 24');
  assert.equal(
    preflight.snapshot.target?.abilities.find((ability) => ability.key === 'str')?.score,
    18,
    'preflight exposes the official ability score target'
  );
  assert.equal(preflight.snapshot.current.abilities.length, 6, 'preflight exposes current WG ability modifiers');
  assert.equal(typeof preflight.snapshot.current.acTotal === 'number' || preflight.snapshot.current.acTotal === null, true);

  // Simulate the user answering each required choice in order. Later prompts can
  // appear only after earlier options have been applied to the selection tree.
  let preflightReady = false;
  const promptTitles = [];
  const promptDetails = [];
  for (let attempt = 0; attempt < 64; attempt++) {
    assert.equal(preflight.status, 'selection-required', preflight.error ?? 'Preflight failed unexpectedly.');
    promptTitles.push(preflight.selection.title);
    promptDetails.push({
      level: preflight.selection.level,
      title: preflight.selection.title,
      path: preflight.selection.path,
      optionCount: preflight.selection.options.length,
      firstOption: preflight.selection.options[0]?.label,
      matchingFreeArchetypeOptions: preflight.selection.options
        .filter((option) => /thlipit contestant dedication|lassoing lash|powerful lash/i.test(option.label))
        .map((option) => ({ value: option.value, label: option.label })),
    });
    assert.doesNotMatch(
      preflight.selection.title,
      /heritage|devotion spell|focus spell|domain spell/i,
      'heritage, Lay on Hands, and the domain-granted spell are determined by choices already recorded in the share payload'
    );
    assert.ok(
      preflight.selection.options.length > 0,
      `fixture has a required selection with no eligible options: ${JSON.stringify({
        level: preflight.selection.level,
        title: preflight.selection.title,
        path: preflight.selection.path,
        key: preflight.selection.key,
        description: preflight.selection.description,
        selectionTrace: preflight.selection.diagnostics,
        promptDetails,
      })}`
    );
    selectionOverrides[preflight.selection.key] = preflight.selection.options[0].value;
    preflight = await importer.preflightPathbuilderImport('1597410', {
      fetchImpl: createFetch(certifiedBuild),
      derivedOverride: staleDerivedFixture,
      selectionOverrides,
    });
    if (preflight.status === 'ready') {
      preflightReady = true;
      break;
    }
  }
  assert.equal(preflightReady, true, 'preflight should finish after explicit choices');
  assert.ok(promptTitles.some((title) => /deific weapon/i.test(title)), 'the genuinely omitted deific weapon choice remains manual');
  assert.equal(promptTitles.some((title) => /domain spell/i.test(title)), false, 'the chosen domain determines its spell without another player choice');
  assert.equal(
    promptTitles.some((title) => /free archetype|archetype feat|add dedication/i.test(title)),
    false,
    'the recorded Free Archetype choices must reconstruct their operation branches without manual prompts'
  );

  // Positive certification uses the actual captured json.php response (export ID
  // 474853), not the synthetic AC-24 fixture used to exercise stale-source warnings.
  const officialPreflight = await importer.preflightPathbuilderImport('1597410', {
    fetchImpl: createFetch(certifiedBuild),
    derivedOverride: capturedDerivedBuild,
    selectionOverrides,
  });
  assert.equal(officialPreflight.status, 'ready', officialPreflight.error ?? 'official preflight failed');
  assert.equal(officialPreflight.snapshot.target?.ac?.total, 27);
  assert.equal(officialPreflight.snapshot.target?.abilities.find((ability) => ability.key === 'str')?.score, 19);
  assert.equal(officialPreflight.snapshot.current.abilities.length, 6);

  // Exclude preflight reads from the assertions for the actual import call.
  shareRequests = 0;
  derivedRequests = 0;
  const outcome = await importBuild(certifiedBuild, selectionOverrides);

  assert.equal(shareRequests, 1);
  assert.equal(derivedRequests, 0);

  // Full certification path: the JSON export reports AC 24 while the share
  // payload loses its Automaton chassis armor reference. WG reconstructs the chassis
  // to AC 27 and must report that source mismatch without blocking character creation.
  shareRequests = 0;
  derivedRequests = 0;
  const certifiedOutcome = await importer.importFromPathbuilderShare('1597410', {
    silent: true,
    selectionOverrides,
    fetchImpl: createFetch(certifiedBuild),
    derivedOverride: staleDerivedFixture,
  });
  assert.equal(shareRequests, 1);
  assert.equal(derivedRequests, 0);
  assert.equal(certifiedOutcome.ok, false, 'an AC mismatch must block character creation');
  assert.match(
    certifiedOutcome.error,
    /AC mismatch: Pathbuilder JSON reports 24; Wanderer's Guide calculates 27/,
    'the rejection must include both source and calculated AC'
  );
  assert.match(certifiedOutcome.error, /share payload omitted the chassis armor name/i);

  // Regression: Pathbuilder represents the Remastered Automaton's Reinforced
  // Chassis as a synthetic worn-armor row. At level 7 it grants +4 AC, and the
  // +1 potency rune raises the total item bonus to +5 (10 + proficiency 11 +
  // capped Dexterity 1 + item bonus 5 = AC 27). A generic reference item must
  // not erase the chassis's level-scaled armor bonus.
  // Use the exact official JSON export captured for Kasane (export ID 474853).
  // It has the chassis as unarmored armor with Resilient 1 and Raiment, and it
  // preserves the source's contradictory second worn flag on the buckler.
  const chassisDerivedFixture = capturedDerivedBuild;
  assert.equal(chassisDerivedFixture.armor.length, 2);
  assert.equal(chassisDerivedFixture.armor[0].name, 'Automaton Chassi (5th level)');
  assert.equal(chassisDerivedFixture.armor[0].prof, 'unarmored');
  assert.equal(chassisDerivedFixture.armor[0].res, 'resilient');
  assert.equal(chassisDerivedFixture.armor[0].pot, 1);
  assert.deepEqual(chassisDerivedFixture.armor[0].runes, ['Raiment']);
  assert.equal(chassisDerivedFixture.armor.filter((armor) => armor.worn).length, 2);
  const chassisOutcome = await importer.importFromPathbuilderShare('1597410', {
    silent: true,
    selectionOverrides,
    fetchImpl: createFetch(certifiedBuild),
    derivedOverride: chassisDerivedFixture,
  });
  assert.equal(
    chassisOutcome.ok,
    true,
    chassisOutcome.ok ? '' : `Reinforced Chassis level-scaling regression: ${chassisOutcome.error}`
  );
  assert.equal(
    chassisOutcome.warnings.some((warning) => warning.startsWith('AC mismatch:')),
    false,
    'a matching derived AC value should not create an AC discrepancy warning'
  );
  const backpack = outcome.character.inventory.items.find((entry) => entry.item?.name === 'Backpack');
  assert.ok(backpack, 'the Pathbuilder container must remain in the imported inventory');
  const chalkStacks = backpack.container_contents.filter((entry) => entry.item?.name === 'Chalk');
  assert.equal(chalkStacks.length, 10, 'Pathbuilder quantity 10 should become ten one-unit inventory rows');
  assert.ok(chalkStacks.every((entry) => entry.item.meta_data?.quantity === 1), 'each expanded Chalk row must represent one unit, not ten');
  const rationsStacks = backpack.container_contents.filter((entry) => entry.item?.name === 'Rations (1 week)');
  assert.equal(rationsStacks.length, 2, 'the two weekly rations entries must remain two rows');
  assert.ok(rationsStacks.every((entry) => entry.item.meta_data?.quantity === 1), 'each rations row must represent one unit');

  const claw = outcome.character.inventory.items.find((entry) => entry.item?.name === 'Claw')?.item;
  assert.ok(claw, 'Automaton Armament Claw must remain present');
  assert.equal(claw.meta_data?.damage?.damageType, 'S', 'Automaton Armament Claw deals slashing damage');
  assert.deepEqual(claw.meta_data?.display_traits, ['Agile', 'Finesse', 'Magical', 'Unarmed']);
  assert.equal(claw.meta_data?.display_traits?.includes('Nonlethal'), false, 'Claw must not gain the generic Nonlethal trait');

  const chassisInventoryEntry = chassisOutcome.character.inventory.items.find(
    (entry) => entry.item.name === 'Automaton Chassi (5th level)'
  );
  assert.ok(chassisInventoryEntry, 'the reconstructed chassis should exist as equipped armor');
  assert.equal(chassisInventoryEntry.item.meta_data?.runes?.potency, 1);
  assert.equal(
    chassisInventoryEntry.item.meta_data?.runes?.resilient,
    1,
    'the derived resilient rune must survive armor reconstruction'
  );

  // Regression for the live payload: Pathbuilder shares an armor UUID absent from
  // listCustomFiles while json.php marks several armor rows as worn. The uniquely named
  // chassis row plus the Automaton/Reinforced Chassis selections must win deterministically.
  const ambiguousArmorShare = structuredClone(certifiedBuild);
  ambiguousArmorShare.characterData.playerArmor = {
    ...(ambiguousArmorShare.characterData.playerArmor ?? {}),
    armorName: 'be5e11f6-4459-4080-9107-8145dd57014b',
    potency: 1,
    listPropertyRunes: ['Raiment'],
  };
  const multipleWornChassisOutcome = await importer.importFromPathbuilderShare('1597410', {
    silent: true,
    selectionOverrides,
    fetchImpl: createFetch(ambiguousArmorShare),
    derivedOverride: {
      ...staleDerivedFixture,
      armor: [
        { name: 'Automaton Chassi (5th level)', pot: 1, res: 'resilient', runes: ['Raiment'], worn: true },
        { name: 'Clothing', worn: true },
      ],
      acTotal: { acProfBonus: 11, acAbilityBonus: 1, acItemBonus: 5, acTotal: 27, shieldBonus: '1' },
    },
  });
  assert.equal(
    multipleWornChassisOutcome.ok,
    true,
    multipleWornChassisOutcome.ok ? '' : multipleWornChassisOutcome.error
  );
  const selectedChassisFromAmbiguousRows = multipleWornChassisOutcome.character.inventory.items.find(
    (entry) => entry.is_equipped && entry.item?.name === 'Automaton Chassi (5th level)'
  )?.item;
  assert.ok(selectedChassisFromAmbiguousRows, 'the identifiable chassis must be equipped despite other worn flags');
  assert.equal(selectedChassisFromAmbiguousRows.meta_data?.category, 'unarmored_defense');
  assert.equal(selectedChassisFromAmbiguousRows.meta_data?.runes?.potency, 1);
  assert.equal(
    multipleWornChassisOutcome.warnings.some((warning) => warning.startsWith('AC mismatch:')),
    false,
    'a correctly recovered chassis should calculate the supplied AC 27 without a mismatch warning'
  );
  assert.ok(
    multipleWornChassisOutcome.warnings.some((warning) => /multiple armor rows as worn/i.test(warning)),
    'the contradictory JSON worn flags must still be reported'
  );

  // A chassis feat must not rewrite a different explicitly named armor item.
  const fullPlateOutcome = await importer.importFromPathbuilderShare('1597410', {
    silent: true,
    selectionOverrides,
    fetchImpl: createFetch(certifiedBuild),
    derivedOverride: {
      ...staleDerivedFixture,
      armor: [{ name: 'Full Plate', pot: 1, res: 'resilient', worn: true }],
      // This case tests armor identity, not a trusted AC oracle.
      acTotal: undefined,
    },
  });
  assert.equal(fullPlateOutcome.ok, true, fullPlateOutcome.ok ? '' : fullPlateOutcome.error);
  const fullPlateEntry = fullPlateOutcome.character.inventory.items.find(
    (entry) => entry.item.name === 'Full Plate'
  );
  assert.ok(fullPlateEntry, 'the explicitly identified armor should remain equipped');
  assert.notEqual(
    fullPlateEntry.item.meta_data?.category,
    'unarmored_defense',
    'the Reinforced Chassis rule must not overwrite a different armor item'
  );

  // Fail-closed identity check: a mismatched export ID blocks the import before
  // any character is created (contract layer 5 / export-identity policy).
  const mismatchedDerived = { ...staleDerivedFixture, name: 'Someone Else' };
  let blocked = null;
  try {
    blocked = await importer.importFromPathbuilderShare('1597410', {
      silent: true,
      selectionOverrides,
      fetchImpl: createFetch(certifiedBuild),
      derivedOverride: mismatchedDerived,
    });
  } catch (error) {
    blocked = { ok: false, error: error.message };
  }
  assert.equal(blocked.ok, false, 'a mismatched json.php export must block the import');
  assert.match(blocked.error, /mismatch for name/i);

  assert.equal(outcome.ok, true, outcome.ok ? '' : outcome.error);
  assert.ok(
    outcome.warnings.some((warning) => /reconstructed the automaton reinforced chassis/i.test(warning)),
    `1597410 should explain that its omitted chassis armor was reconstructed; got: ${outcome.warnings.join('; ')}`
  );
  assert.equal(
    outcome.warnings.some((warning) => warning.startsWith('AC mismatch:')),
    false,
    'without an available JSON AC target, no AC comparison should be invented'
  );
  assert.equal(outcome.character?.id, 9001);
  assert.equal(outcome.character?.name, 'Kasane');

  const importedBackpack = outcome.character.inventory.items.find((entry) => entry.item.name === 'Backpack');
  assert.ok(importedBackpack, 'the Pathbuilder backpack must remain the parent of its contents');
  const importedChalk = importedBackpack.container_contents.filter((entry) => entry.item.name === 'Chalk');
  assert.equal(importedChalk.length, 10, 'Pathbuilder Chalk quantity 10 must create ten physical units');
  assert.deepEqual(
    importedChalk.map((entry) => entry.item.meta_data?.quantity),
    Array(10).fill(1),
    'each imported unit must have quantity 1; stack quantity must not be duplicated on every row'
  );
  assert.equal(
    importedChalk.reduce((total, entry) => total + Number(entry.item.meta_data?.quantity ?? 1), 0),
    10,
    'inventory math must retain exactly ten Chalk, not one hundred'
  );
  assert.notStrictEqual(importedChalk[0].item, importedChalk[1].item, 'inventory units must not share Item objects');
  assert.notStrictEqual(importedChalk[0].item.meta_data, importedChalk[1].item.meta_data, 'inventory units must not share metadata');

  const importedClaw = outcome.character.inventory.items.find((entry) => entry.item.name === 'Claw')?.item;
  assert.ok(importedClaw, 'Automaton Armament Claw must be retained');
  assert.equal(importedClaw.meta_data?.damage?.damageType, 'S', 'Automaton Armament Claw deals slashing damage');
  assert.equal(
    importedClaw.meta_data?.display_traits?.includes('Nonlethal') ?? false,
    false,
    'Automaton Armament Claw must not gain an unsupported Nonlethal trait'
  );

  const hunterSpeedAdjustment = (outcome.character.custom_operations ?? []).filter(
    (operation) =>
      operation.type === 'adjValue' &&
      operation.data.variable === 'SPEED' &&
      operation.data.value === 5
  );
  assert.equal(hunterSpeedAdjustment.length, 1, 'Hunter Automaton base Speed adjustment must be present exactly once');

  // The raw Pathbuilder prompt and WG selector title differ, but importing must retain
  // the player's explicit Blessed Swiftness choice rather than accepting the first option.
  const blessingFeature = content.abilityBlocks.find((block) => block.name === 'Blessing of the Devoted');
  assert.ok(blessingFeature, 'test content must include the Blessing of the Devoted class feature');
  const blessingSelector = blessingFeature.operations.find(
    (operation) => operation.type === 'select' && operation.data?.title === 'Select a Blessing'
  );
  assert.ok(blessingSelector, 'Blessing of the Devoted must expose its blessing selector');
  const blessingSelectionPath = `class-feature-${blessingFeature.id}_${blessingSelector.id}`;
  const selectedBlessingId = outcome.character.operation_data?.selections?.[blessingSelectionPath];
  assert.ok(selectedBlessingId, 'the imported character must resolve its blessing selection');
  const selectedBlessingOption = blessingSelector.data.optionsPredefined.find(
    (option) => String(option.id) === String(selectedBlessingId)
  );
  assert.ok(selectedBlessingOption, 'the selected blessing must map to a legal WG option');
  const selectedBlessing = content.abilityBlocks.find(
    (block) => block.id === selectedBlessingOption.operation?.data?.abilityBlockId
  );
  assert.equal(selectedBlessing?.name, 'Blessed Swiftness', 'Pathbuilder Blessed Swiftness choice must survive 1:1 import');
  const reconstructedChassis = outcome.character.inventory.items.find(
    (entry) =>
      entry.is_equipped &&
      entry.item?.group === 'ARMOR' &&
      entry.item?.name === 'Automaton Chassi (5th level)'
  )?.item;
  assert.ok(
    reconstructedChassis,
    '1597410 omitted armor name must be reconstructed as equipped Reinforced Chassis'
  );
  assert.equal(reconstructedChassis.meta_data?.category, 'unarmored_defense');
  assert.equal(reconstructedChassis.meta_data?.ac_bonus, 4, 'level-5 chassis gives +4 base AC at level 7');
  assert.equal(
    reconstructedChassis.meta_data?.runes?.potency,
    1,
    'the share potency rune must apply to the reconstructed chassis'
  );
  assert.equal(
    reconstructedChassis.meta_data?.runes?.resilient,
    1,
    'the raw share itemResilient rank must survive import without a json.php enrichment request'
  );
  assert.equal(
    outcome.character?.custom_operations?.some(
      (operation) =>
        operation.type === 'addBonusToValue' &&
        operation.data.variable === 'AC_BONUS' &&
        operation.data.type === 'item' &&
        operation.data.value === '+1'
    ),
    false,
    'armor potency must not be duplicated as a free AC bonus when a chassis item exists'
  );

  const engine = await createOperationEngine();
  try {
    engine.setFixtures(rows);
    const packet = await engine._executeCharacterOperations({
      character: outcome.character,
      content,
      context: 'CHARACTER-SHEET',
    });
    engine.importVariableStore('CHARACTER', packet.store);

    const score = (name) => {
      const attribute = engine.getVariable('CHARACTER', `ATTRIBUTE_${name}`);
      const modifier = engine.getFinalVariableValue('CHARACTER', `ATTRIBUTE_${name}`).total;
      return 10 + modifier * 2 + (attribute?.value?.partial ? 1 : 0);
    };
    const expectedScores = Object.fromEntries(
      ['str', 'dex', 'con', 'int', 'wis', 'cha'].map((key) => [key.toUpperCase(), capturedDerivedBuild.abilities[key]])
    );
    assert.deepEqual(
      Object.fromEntries(['STR','DEX','CON','INT','WIS','CHA'].map((name) => [name, score(name)])),
      expectedScores,
      '1597410 ability scores must match the captured Pathbuilder JSON, including partial gradual boosts'
    );

    const armor = outcome.character.inventory.items.find(
      (entry) => entry.is_equipped && entry.item?.group === 'ARMOR'
    )?.item;
    assert.equal(
      engine.getFinalAcValue('CHARACTER', armor),
      27,
      '1597410 AC must match the later Pathbuilder Defense-tab screenshot; the older AC 24 fixture is stale'
    );
    assert.equal(engine.getFinalHealthValue('CHARACTER'), 99, '1597410 HP must match the PDF oracle');
    const speedValue = engine.getFinalVariableValue('CHARACTER', 'SPEED');
    const speedBonuses = engine.getVariableBonuses('CHARACTER', 'SPEED');
    assert.equal(speedValue.value, 30, '1597410 Hunter Automaton displayed quadruped Speed must adjust the baseline to 30 feet');

    const savedSelections = outcome.character.operation_data?.selections ?? {};
    const selectedFeatureNames = [...new Set(
      Object.values(savedSelections)
        .map((selection) => content.abilityBlocks.find((block) => String(block.id) === String(selection))?.name)
        .filter((name) => typeof name === 'string')
    )];
    const normalizeFeatureName = (name) =>
      name.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    const selectedFeatureNameKeys = new Set(selectedFeatureNames.map(normalizeFeatureName));
    // The remastered WG content uses "Smite" for Pathbuilder's legacy "Smite Evil".
    const legacyFeatAliases = new Map([['smite evil', 'smite']]);
    // Never certify an import when a feat chosen in Pathbuilder at or below the
    // character's current level vanished from WG's saved operation tree. Future
    // planned feats are retained in provenance but are outside the current sheet.
    const isReincarnationCategorySelector = (feat) =>
      feat.category === 'ANCESTRY' &&
      feat.qualifier === 'GENERAL' &&
      normalizeFeatureName(feat.name) === 'reincarnation feat' &&
      outcome.resolved.feats.some((candidate) =>
        candidate.level === feat.level &&
        candidate.category === 'REINCARNATION' &&
        candidate.slot.replace(/[^a-z0-9]/gi, '').toLowerCase() ===
          `${feat.name}${feat.slot}`.replace(/[^a-z0-9]/gi, '').toLowerCase()
      );
    const unrepresentedCurrentFeats = outcome.resolved.feats
      .filter((feat) => feat.level === undefined || feat.level <= outcome.resolved.identity.level)
      .filter((feat) => !isReincarnationCategorySelector(feat))
      .filter((feat) => {
        const sourceName = normalizeFeatureName(feat.name);
        const contentName = legacyFeatAliases.get(sourceName) ?? sourceName;
        return !selectedFeatureNameKeys.has(contentName);
      })
      .map((feat) => ({
        slot: feat.slot,
        level: feat.level,
        name: feat.name,
        raw: feat.raw,
        normalizedName: normalizeFeatureName(feat.name),
        codePoints: [...feat.name].map((character) => character.codePointAt(0)?.toString(16)),
      }));
    assert.deepEqual(
      unrepresentedCurrentFeats,
      [],
      'every current-level Pathbuilder feat must be represented by a saved WG ability-block selection; missing=' +
        JSON.stringify(unrepresentedCurrentFeats) +
        '; selected feature names=' + JSON.stringify(selectedFeatureNames.map((name) => ({
          name,
          normalizedName: normalizeFeatureName(name),
          codePoints: [...name].map((character) => character.codePointAt(0)?.toString(16)),
        }))) +
        '; preflight prompts=' + JSON.stringify(promptDetails)
    );
    const freeArchetypeSelectionDiagnostics = Object.entries(savedSelections)
      .filter(([path]) =>
        /9594307d-b111-437f-a55a-de101e8d46b1|354b57f0-ef29-4f53-819b-f1f211adfc7b|a525eb70-e18f-4a95-80d9-29f6aaee0d3e|f8cbab2a-f19f-4209-9207-5eb30b43d4eb|1c575456-4cb7-44eb-a153-9d6884b272a8/.test(path)
      )
      .map(([path, value]) => ({
        path,
        value,
        selectedName: content.abilityBlocks.find((block) => String(block.id) === String(value))?.name ??
          (String(value).startsWith('a525eb70') ? 'Add Dedication' :
           String(value).startsWith('354b57f0') ? 'Add Archetype Feat' : undefined),
      }));
    for (const requiredFreeArchetypeFeat of [
      'Thlipit Contestant Dedication',
      'Lassoing Lash',
      'Powerful Lash',
    ]) {
      assert.ok(
        selectedFeatureNames.includes(requiredFreeArchetypeFeat),
        'Free Archetype choice "' + requiredFreeArchetypeFeat + '" must be present in the imported operation tree; found ' +
          JSON.stringify(selectedFeatureNames.filter((name) => /thlipit|lassoing|powerful lash/i.test(name))) +
          '; Free Archetype selections=' + JSON.stringify(freeArchetypeSelectionDiagnostics) +
          '; preflight selectors=' + JSON.stringify(promptDetails)
      );
    }

    const chosenDomainName = certifiedBuild.characterData.hashMapSpecialSelections?.['Champion Feat 1']?.['Select Domain'];
    assert.equal(chosenDomainName, 'Metal', 'the golden Kasane build must retain Pathbuilder\'s explicit Metal domain choice');
    // Resolve the domain descriptor through the exact Deity's Domain feature and
    // selector path recorded by the operation engine. A global name-only search can
    // select a different legacy/Remaster Domains record when both offer "Metal".
    const domainSpellSelectionEntry = Object.entries(savedSelections).find(([path]) => {
      const selectorId = path.slice(path.lastIndexOf('_') + 1);
      return content.abilityBlocks.some(
        (block) =>
          block.name === "Deity's Domain" &&
          path.includes('_' + block.id + '_') &&
          (block.operations ?? []).some(
            (operation) =>
              operation.type === 'select' &&
              operation.id === selectorId &&
              /initial domain spell/i.test(operation.data?.title ?? '')
          )
      );
    });
    assert.ok(
      domainSpellSelectionEntry,
      'the import must save a selection for the initial domain spell under the chosen Deity\'s Domain feature'
    );
    const domainSelectorId = domainSpellSelectionEntry[0].slice(domainSpellSelectionEntry[0].lastIndexOf('_') + 1);
    const sourceDomainFeat = content.abilityBlocks.find(
      (block) =>
        block.name === "Deity's Domain" &&
        domainSpellSelectionEntry[0].includes('_' + block.id + '_') &&
        (block.operations ?? []).some(
          (operation) =>
            operation.type === 'select' &&
            operation.id === domainSelectorId &&
            /initial domain spell/i.test(operation.data?.title ?? '')
        )
    );
    assert.ok(sourceDomainFeat, 'the saved selector must identify its exact source feat record');
    const domainsBlockId = sourceDomainFeat.operations?.find(
      (operation) => operation.type === 'giveAbilityBlock'
    )?.data.abilityBlockId;
    const domainsBlock = content.abilityBlocks.find(
      (block) => String(block.id) === String(domainsBlockId)
    );
    const domainPicker = domainsBlock?.operations?.find(
      (operation) =>
        operation.type === 'select' &&
        String(operation.data?.title ?? '').trim().toLowerCase() === 'select a domain'
    );
    const chosenDomain = domainPicker?.type === 'select'
      ? domainPicker.data.optionsPredefined?.find(
          (option) =>
            option.type === 'CUSTOM' &&
            String(option.title ?? '').trim().toLowerCase() === String(chosenDomainName ?? '').trim().toLowerCase()
        )
      : undefined;
    assert.ok(chosenDomain && chosenDomain.type === 'CUSTOM', 'the linked Domains block must contain the recorded domain');

    const initialSpellReference = /\*\*Initial Spell\*\*\s*\[([^\]]+)\]\(link_spell_(\d+)\)/i.exec(chosenDomain.description);
    assert.ok(initialSpellReference, 'the selected Domains record must identify its granted initial spell');
    assert.equal(initialSpellReference[1], 'Serrate', 'Metal must grant Serrate for the captured Kasane build');

    // Pathbuilder records Metal, not a second spell choice. Confirm the operation
    // tree selected the WG-local spell linked from that exact content record.
    // Do not compare link_spell_* source IDs to WG's local Spell.id.
    const selectedInitialDomainSpell = content.spells.find(
      (spell) => String(spell.id) === String(domainSpellSelectionEntry[1])
    );
    assert.equal(
      selectedInitialDomainSpell?.name,
      initialSpellReference[1],
      'the actual operation-tree source record must select its own domain spell, not a same-named domain from another content version'
    );
    assert.ok(
      domainSpellSelectionEntry,
      'the import must save the inferred initial domain spell "' + initialSpellReference[1] +
        '" for domain "' + chosenDomainName + '"; saved spell selections=' +
        JSON.stringify(Object.entries(savedSelections).filter(([, value]) =>
          content.spells.some((spell) => String(spell.id) === String(value))
        ))
    );
    assert.ok(
      !promptTitles.some((title) => /initial.*domain.*spell/i.test(title)),
      'the import must infer the granted initial domain spell instead of prompting for it again'
    );

    const movementFeatureSelections = [
      ...new Set([...selectedFeatureNames, selectedBlessing?.name].filter((name) => typeof name === 'string')),
    ].filter((name) => /blessed|swiftness|hunter automaton|fleet/i.test(name));
    assert.equal(
      speedValue.total,
      45,
      `1597410 speed must match the PDF oracle; base=${speedValue.value}; bonuses=${JSON.stringify(speedBonuses)}; selections=${JSON.stringify(outcome.character.operation_data?.selections)}; movement feature selections=${JSON.stringify(movementFeatureSelections)}; equipped speed items=${JSON.stringify(outcome.character.inventory.items.filter((entry) => entry.is_equipped && entry.item?.operations?.some((operation) => operation.type === 'addBonusToValue' && operation.data.variable === 'SPEED')).map((entry) => ({ name: entry.item.name, operations: entry.item.operations.filter((operation) => operation.type === 'addBonusToValue' && operation.data.variable === 'SPEED') })))}`
    );

    const prof = (name) => engine.getFinalProfValue('CHARACTER', name);
    assert.equal(prof('PERCEPTION'), '+10');
    // The captured PDF and calculated JSON disagree on saves. The JSON explicitly
    // records Resilient 1 and a +1 item bonus to all saves; test the rune-backed state.
    assert.equal(prof('SAVE_FORT'), '+15');
    assert.equal(prof('SAVE_REFLEX'), '+12');
    assert.equal(prof('SAVE_WILL'), '+13');
    assert.equal(prof('SKILL_ATHLETICS'), '+18');
    assert.equal(prof('SKILL_ACROBATICS'), '+11');
    assert.equal(prof('SKILL_RELIGION'), '+10');
    assert.equal(prof('SKILL_STEALTH'), '+11');
    assert.equal(prof('SKILL_SURVIVAL'), '+12');
    assert.equal(prof('SKILL_LORE_LEGAL'), '+9');

    // Inventory is hierarchical: items stored in the Backpack are nested in
    // container_contents, so validate quantities across the complete tree.
    const flattenInventory = (items) =>
      items.flatMap((entry) => [entry, ...flattenInventory(entry.container_contents ?? [])]);
    const inventoryItems = flattenInventory(outcome.character.inventory.items);
    const inventoryNames = inventoryItems.map((entry) => entry.item?.name);
    const chalkEntries = inventoryItems.filter((entry) => entry.item?.name === 'Chalk');
    assert.equal(chalkEntries.length, 10);
    assert.equal(
      chalkEntries.reduce((sum, entry) => sum + (entry.item?.meta_data?.quantity ?? 1), 0),
      10,
      'Pathbuilder quantity 10 must remain 10 total units; expanded inventory rows must each represent one unit'
    );
    assert.ok(
      chalkEntries.every((entry) => (entry.item?.meta_data?.quantity ?? 1) === 1),
      'expanding Pathbuilder quantities must not leave the original stack quantity on every row'
    );
    // Pathbuilder labels the supply "Rations"; the intentional WG alias resolves
    // it to the canonical "Rations (1 week)" content item.
    assert.equal(inventoryNames.filter((name) => name === 'Rations (1 week)').length, 2);
    assert.equal(outcome.character.spells.list.length, 1);

    const weaponByName = (name) =>
      inventoryItems.find((entry) => entry.item?.name === name)?.item;
    const javelin = weaponByName('Javelin');
    const dagger = weaponByName('Dagger');
    const claw = weaponByName('Claw');
    const stinger = weaponByName('Stinger');
    const crimson = weaponByName('Crimson Blade');

    assert.ok(javelin, 'Javelin must exist in the imported inventory');
    assert.ok(dagger, 'Dagger must exist in the imported inventory');
    assert.ok(claw, 'Claw must exist in the imported inventory');
    assert.ok(stinger, 'Stinger must exist in the imported inventory');
    assert.ok(crimson, 'Crimson Blade must exist in the imported inventory');
    assert.equal(crimson.meta_data?.category, 'martial', "Crimson Blade must inherit the Bastard Sword's martial proficiency category");
    assert.equal(crimson.meta_data?.group, 'sword', "Crimson Blade must inherit the Bastard Sword's weapon group");

    const javelinStats = engine.getWeaponStats('CHARACTER', javelin);
    const daggerStats = engine.getWeaponStats('CHARACTER', dagger);
    const clawStats = engine.getWeaponStats('CHARACTER', claw);
    const stingerStats = engine.getWeaponStats('CHARACTER', stinger);
    const crimsonStats = engine.getWeaponStats('CHARACTER', crimson);

    assert.equal(javelinStats.attack_bonus.total[0], 14, 'javelin first attack modifier must match the Pathbuilder sheet');
    assert.equal(javelinStats.damage.dice, 2);
    assert.equal(javelinStats.damage.die, 'd6');

    assert.equal(daggerStats.attack_bonus.total[0], 16, 'dagger first attack modifier must match the Pathbuilder sheet');
    assert.equal(daggerStats.damage.dice, 2);
    assert.equal(daggerStats.damage.die, 'd4');

    assert.equal(clawStats.attack_bonus.total[0], 16, 'claw first attack modifier must match the Pathbuilder sheet');
    assert.equal(clawStats.damage.dice, 2);
    assert.equal(clawStats.damage.die, 'd4');

    assert.equal(stingerStats.attack_bonus.total[0], 16, 'stinger first attack modifier must match the Pathbuilder sheet');

    assert.deepEqual(stingerStats.attack_bonus.total, [16, 11, 6], 'Stinger uses standard multiple-attack penalty values');
    assert.equal(stingerStats.damage.dice, 2);
    assert.equal(stingerStats.damage.die, 'd6');

    assert.equal(crimsonStats.attack_bonus.total[0], 16, 'crimson first attack modifier must match the Pathbuilder sheet');
    assert.equal(crimsonStats.damage.dice, 2);
    assert.equal(crimsonStats.damage.die, 'd12');
  } finally {
    await engine.cleanup();
  }

  // ── Editor-state and naming bridges ─────────────────────────────────────────
  const combustion = { id: 5325, name: 'Combustion', rank: 3, traits: [1856] };
  const bridgeContent = { spells: [combustion], traits: [{ id: 1856, name: 'Focus' }], abilityBlocks: [], versatileHeritages: [] };
  const effectOperations = importer.customEffectOperations(
    {
      uniqueIdentifier: 'gloves-of-immolation',
      name: 'Gloves of Immolation',
      description: 'You gain the Combustion Focus Spell.',
      listCustomEffects: [
        { proficiencyName: 'Arcana', bonusAmount: 1, reference: 'arcana' },
        { proficiencyName: 'Combustion', effectType: 10, reference: 'combustion' },
      ],
    },
    1,
    [],
    bridgeContent,
    'WIZARD'
  );
  const grantedSpell = effectOperations.find((operation) => operation.type === 'giveSpell');
  assert.ok(grantedSpell, 'effectType 10 must become a giveSpell operation');
  assert.equal(grantedSpell.data.spellId, combustion.id);
  assert.equal(grantedSpell.data.type, 'FOCUS');
  assert.equal(grantedSpell.data.castingSource, 'WIZARD');
  assert.equal(grantedSpell.data.rank, 3);

  const thesisSelections = importer.getSpecialSelectionsForOperation(
    { title: 'Select a Thesis Topic' },
    1,
    { specialSelections: [{ slot: 'Arcane Thesis', prompt: 'Select Thesis', value: 'Improved Familiar Attunement' }] }
  );
  assert.deepEqual(thesisSelections, [{ name: 'Improved Familiar Attunement', level: 1 }]);

  const naariBlock = { id: 23268, name: 'Naari', type: 'heritage', operations: [], traits: [] };
  const aliasedHeritage = importer.findVersatileHeritageOption(
    { abilityBlocks: [naariBlock], versatileHeritages: [{ id: 22, name: 'Naari', heritage_id: 23268 }] },
    'Ifrit'
  );
  assert.equal(aliasedHeritage?.id, 23268);
} finally {
  try {
    // This file and operation-test-harness share esbuild's singleton service.
    // Close its worker/process so the test runner can exit on both success and failure.
    await stop();
  } finally {
    await rm(bundleDir, { recursive: true, force: true });
  }
}
