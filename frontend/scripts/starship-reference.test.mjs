import assert from 'node:assert/strict';
import { after, beforeEach, test } from 'node:test';
import { createRequire } from 'node:module';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const frontend = fileURLToPath(new URL('../', import.meta.url));
const { build } = createRequire(`${frontend}/package.json`)('esbuild');
const temporary = await mkdtemp(join(tmpdir(), 'wg-starship-reference-'));
after(() => rm(temporary, { recursive: true, force: true }));
await build({
  stdin: {
    contents: `export * from './src/process/content/starships';export * from './src/process/content/starship-content-update';export {StarshipSchema,CreatureSchema,CombatantSchema} from './src/schemas/content';export {buildHrefFromContentData} from './src/process/content/hardcoded-links';`,
    resolveDir: frontend,
  },
  outfile: join(temporary, 'reference.mjs'),
  bundle: true,
  platform: 'node',
  format: 'esm',
  tsconfig: `${frontend}/tsconfig.json`,
  plugins: [
    {
      name: 'catalog-boundary',
      setup(builder) {
        builder.onResolve(
          { filter: /^(\.\/content-store|@content\/content-store|@requests\/request-manager)$/ },
          ({ path }) => ({
            path,
            namespace: 'boundary',
          })
        );
        builder.onLoad({ filter: /.*/, namespace: 'boundary' }, ({ path }) => ({
          loader: 'js',
          contents:
            path === './content-store' || path === '@content/content-store'
              ? `export const getCachedContent=()=>[];export const getDefaultSources=scope=>scope;export const getDefaultSourcesKey=scope=>globalThis.shipTest.keys[scope]??scope;export const fetchContentSources=async scope=>Array.isArray(scope)?scope.map(id=>({id})):globalThis.shipTest.sources[scope]??[];`
              : `export const makeRequest=async(route,body)=>{globalThis.shipTest.requests.push({route,body});return globalThis.shipTest.row;};`,
        }));
      },
    },
  ],
});
const runtime = await import(pathToFileURL(join(temporary, 'reference.mjs')));
const ship = () => ({
  id: 71,
  uuid: 7100,
  type: 'starship',
  created_at: '2026-10-16',
  name: 'Reference Ship',
  level: 1,
  rarity: 'COMMON',
  details: {
    description: 'A printed ship.',
    stat_block: '**HP** 27; **SP** 10\n\n**Speed** 2 zones; **Sensor Range** 5 zones',
  },
  content_source_id: 900,
  version: '1.0',
  deprecated: false,
  meta_data: { source: { book: 'Tech Core', page: '197' } },
});
beforeEach(() => {
  globalThis.shipTest = { keys: {}, sources: {}, requests: [], row: null };
});

test('ship source rules round-trip without living state or feet conversion', () => {
  assert.equal(runtime.buildHrefFromContentData('starship', 71), 'link_starship_71');
  assert.equal(runtime.buildHrefFromContentData('hazard', 72), 'link_hazard_72');
  assert.deepEqual(runtime.StarshipSchema.parse(ship()), ship());
  assert.equal(runtime.CreatureSchema.safeParse(ship()).success, false);
  assert.equal(
    runtime.CombatantSchema.safeParse({ _id: 'ship', type: 'CREATURE', ally: false, creature: ship() }).success,
    false
  );
  assert.equal(
    runtime.CombatantSchema.safeParse({ _id: 'ship', type: 'STARSHIP', ally: true, starship: ship() }).success,
    false
  );
});

test('malformed or misclassified ship references fail validation', () => {
  for (const change of [
    (row) => (row.type = 'creature'),
    (row) => (row.name = ''),
    (row) => (row.level = 1.5),
    (row) => (row.details.stat_block = ''),
    (row) => (row.details.stat_block = 4),
  ]) {
    const row = ship();
    change(row);
    assert.equal(runtime.StarshipSchema.safeParse(row).success, false);
  }
});

test('empty source scope never performs an unrestricted ship read', async () => {
  assert.equal(await runtime.fetchStarshipById(71), null);
  assert.deepEqual(globalThis.shipTest.requests, []);
});

test('ship lookup preserves explicit source and subtype without a creature cache', async () => {
  globalThis.shipTest.row = ship();
  assert.deepEqual(await runtime.fetchStarshipById(71, 900), ship());
  assert.deepEqual(globalThis.shipTest.requests, [
    { route: 'find-creature', body: { id: 71, type: 'starship', content_sources: [900] } },
  ]);
  globalThis.shipTest.row = { ...ship(), type: 'creature' };
  await assert.rejects(runtime.fetchStarshipById(71, 900));
});

test('default-source changes invalidate the ship query', () => {
  const before = runtime.getStarshipQueryKey(71);
  globalThis.shipTest.keys.PAGE = '900';
  assert.notDeepEqual(runtime.getStarshipQueryKey(71), before);
});

test('reference correction cannot rewrite source, identity, traits or actor data', () => {
  const original = ship(),
    snapshot = structuredClone(original),
    edited = ship();
  Object.assign(edited, { id: 99, uuid: 99, type: 'creature', level: 20, content_source_id: 1, name: 'Revised' });
  edited.details.stat_block = '**Speed** 3 zones';
  edited.details.trait_ids = [99];
  const result = runtime.prepareStarshipContentUpdate(original, edited);
  assert.equal(result.success, true);
  assert.equal(result.data.name, 'Revised');
  assert.equal(result.data.details.stat_block, '**Speed** 3 zones');
  assert.deepEqual({ ...result.data, name: original.name, details: original.details }, original);
  assert.deepEqual(original, snapshot);
  assert.equal(result.data.details.trait_ids, undefined);
});

test('reference UI and correction previews cannot invoke the creature calculator', async () => {
  const drawer = await readFile(`${frontend}/src/drawers/types/StarshipDrawer.tsx`, 'utf8');
  assert.doesNotMatch(drawer, /executeOperations|CreatureDrawer|confirmHealth|checkBulkLimit/);
  const previews = await readFile(`${frontend}/src/pages/ContentUpdatePage.tsx`, 'utf8');
  assert.match(previews, /StarshipSchema/);
  assert.match(previews, /fetchStarshipById/);
  assert.equal([...previews.matchAll(/mapToDrawerData\(data.referenceType/g)].length, 3);
  const reader = await readFile(`${frontend}/src/process/content/starships.ts`, 'utf8');
  assert.doesNotMatch(reader, /idStore|importFromContentPackage|executeOperations/);
});

test('default creature API and search filters remain isolated from ship references', async () => {
  const find = await readFile(`${frontend}/../supabase/functions/find-creature/index.ts`, 'utf8');
  assert.match(find, /value: type \?\? 'creature'/);
  const search = await readFile(`${frontend}/../supabase/functions/search-data/index.ts`, 'utf8');
  assert.match(search, /results.creatures = await searchCreatures\('creature'\)/);
  assert.match(search, /results.starships = await searchCreatures\('starship'\)/);
  assert.match(search, /searchTable\('creature', text, 'starship'\)/);
});
