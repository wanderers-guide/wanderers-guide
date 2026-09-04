import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const frontend = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Read selected, unmodified official content rows from the checked-in PostgreSQL COPY dump. */
export async function readContentRows(targets) {
  const wanted = new Set(targets.map(({ table, id }) => `${table}:${id}`));
  const rows = [];
  const text = await readFile(join(frontend, '../data/data.sql'), 'utf8');
  const arrayColumns = new Set(['operations', 'traits', 'prerequisites', 'traditions', 'cast']);
  const numberColumns = new Set(['id', 'level', 'trait_id', 'content_source_id', 'skill_training_base']);
  const escapes = { '\\': '\\', n: '\n', t: '\t', r: '\r', b: '\b', f: '\f', v: '\v' };
  let table;
  let columns = [];
  for (const line of text.split('\n')) {
    const header = /^COPY public\.([^ ]+) \((.*?)\)/.exec(line);
    if (header) {
      table = header[1];
      columns = header[2].split(', ').map((name) => name.replace(/^"|"$/g, ''));
      continue;
    }
    if (line === '\\.') table = undefined;
    if (!table) continue;
    const cells = line.split('\t');
    if (!wanted.has(`${table}:${cells[columns.indexOf('id')]}`)) continue;
    const row = Object.fromEntries(
      columns.map((key, index) => {
        const raw = cells[index];
        if (raw === '\\N') return [key, null];
        const value = raw.replace(/\\([\\ntrbfv])/g, (_, escaped) => escapes[escaped]);
        if (arrayColumns.has(key) && value.startsWith('{')) {
          const entries = JSON.parse(`[${value.slice(1, -1)}]`);
          return [
            key,
            key === 'operations'
              ? entries.map((entry) => (typeof entry === 'string' ? JSON.parse(entry) : entry))
              : entries,
          ];
        }
        if (numberColumns.has(key)) return [key, Number(value)];
        if (value.startsWith('{')) return [key, JSON.parse(value)];
        return [key, value];
      })
    );
    rows.push({ table, row });
    wanted.delete(`${table}:${row.id}`);
  }
  if (wanted.size) throw new Error(`Content fixtures missing: ${[...wanted].join(', ')}`);
  return rows;
}

/** Replace remote content reads with explicit test fixtures; keep the real operation and variable engines. */
const fixtureContent = `
let fixtures = [];
let sources = { PAGE: [], INFO: [] };
export function setFixtures(rows) { fixtures = rows; }
export function getCachedContent(type) { return fixtures.filter(x => x.table === type.replaceAll('-', '_')).map(x => x.row); }
export async function fetchContentById(type, id) { return getCachedContent(type).find(row => row.id === id) || null; }
export async function fetchContentAll(type, requestedSources) { return getCachedContent(type).filter(row => !Array.isArray(requestedSources) || requestedSources.length === 0 || requestedSources.includes(row.content_source_id)); }
export async function fetchTraitByName(name) { return getCachedContent('trait').find(row => row.name.toLowerCase() === name.toLowerCase()) || null; }
export async function fetchArchetypeByDedicationFeat() { return null; }
export function getDefaultSources(view) { return sources[view]; }
export function getContentFast(type, ids) { return getCachedContent(type).filter(row => ids.includes(row.id)); }
export function defineDefaultSources(view, values) { sources[view] = values; }
export function importFromContentPackage() {}
`;

/** Bundle the workspace's actual engine with a local content boundary; register cleanup with test.after(). */
export async function createOperationEngine() {
  const directory = await mkdtemp(join(tmpdir(), 'wg-operation-tests-'));
  try {
    const result = await build({
      absWorkingDir: frontend,
      stdin: {
        contents: `
          export * from '@operations/operation-runner';
          export * from '@operations/operation-controller';
          export { executeOperations } from '@operations/operations.main';
          export * from '@operations/selection-tree';
          export * from '@variables/variable-manager';
          export * from '@variables/variable-utils';
          export { getWeaponStats } from '@items/weapon-handler';
          export * from '@items/eidolon-runes';
          export { handleDeleteItem, handleUpdateItem, handleMoveItem } from '@items/inv-handlers';
          export { isItemInvestable, getFlatInvItems } from '@items/inv-utils';
          export { getListStringInputValue } from '@common/operations/variables/operation-value-defaults';
          export { determineFilteredSelectionList } from '@operations/operation-utils';
          export { hasArchetypeClassFeatTraits, getTraitIdByType } from '@utils/traits';
          export { setFixtures } from '@content/content-store';
          export { getOperationErrorNotifications, clearOperationErrorNotifications } from '@utils/notifications';
        `,
        resolveDir: frontend,
        loader: 'ts',
      },
      tsconfig: join(frontend, 'tsconfig.json'),
      bundle: true,
      write: false,
      platform: 'node',
      format: 'esm',
      define: { 'import.meta.env': JSON.stringify({ VITE_ENV: 'production' }) },
      plugins: [
        {
          name: 'fixture-content',
          setup(pluginBuild) {
            pluginBuild.onResolve({ filter: /^@utils\/notifications$/ }, () => ({
              path: 'notifications',
              namespace: 'notifications',
            }));
            pluginBuild.onLoad({ filter: /.*/, namespace: 'notifications' }, () => ({
              contents: `let messages = []; export function displayError(message) { messages.push(message); } export function getOperationErrorNotifications() { return messages; } export function clearOperationErrorNotifications() { messages = []; }`,
              loader: 'ts',
            }));
            pluginBuild.onResolve({ filter: /^@content\/content-store$/ }, () => ({
              path: 'content',
              namespace: 'fixture',
            }));
            pluginBuild.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({
              contents: fixtureContent,
              loader: 'ts',
            }));
          },
        },
      ],
    });
    const bundlePath = join(directory, 'engine.mjs');
    await writeFile(bundlePath, result.outputFiles[0].text);
    const engine = await import(pathToFileURL(bundlePath).href);
    return { ...engine, cleanup: () => rm(directory, { recursive: true, force: true }) };
  } catch (error) {
    await rm(directory, { recursive: true, force: true });
    throw error;
  }
}
