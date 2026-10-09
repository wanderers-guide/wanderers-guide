import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { readHistoricalContentDump } from '../../scripts/historical-content-fixture.mjs';

const frontend = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Decode a one-dimensional PostgreSQL array after the COPY layer has been unescaped. */
function parseContentArray(value) {
  if (value === '{}') return [];
  const entries = [];
  let index = 1;
  while (index < value.length - 1) {
    const quoted = value[index] === '"';
    if (quoted) index++;
    let entry = '';
    while (index < value.length - 1) {
      const character = value[index++];
      if (character === '\\') entry += value[index++];
      else if (quoted && character === '"') break;
      else if (!quoted && character === ',') break;
      else entry += character;
    }
    if (quoted && value[index] === ',') index++;
    entries.push(!quoted && entry === 'NULL' ? null : entry);
  }
  return entries;
}

/**
 * Read unmodified content from the checked-in PostgreSQL COPY dump without a database.
 * Exact IDs fail when absent; source selections load a table's official test corpus.
 * @param {Array<{ table: string, id: number } | { table: string, sourceIds: number[] }>} targets
 */
export async function readContentRows(targets) {
  return parseContentRows(targets, await readFile(join(frontend, '../data/data.sql'), 'utf8'));
}

/**
 * Opt in to the immutable pre-repair catalog for assertions about historical migration stages.
 * Current catalog and character behavior tests must keep using readContentRows instead.
 * @param {Array<{ table: string, id: number } | { table: string, sourceIds: number[] }>} targets
 */
export async function readHistoricalContentRows(targets) {
  return parseContentRows(targets, await readHistoricalContentDump());
}

/** Decode both explicit content inputs through the same PostgreSQL COPY parser. */
function parseContentRows(targets, text) {
  const wanted = new Set(targets.filter((target) => 'id' in target).map(({ table, id }) => `${table}:${id}`));
  const sources = new Map();
  for (const target of targets.filter((target) => 'sourceIds' in target)) {
    sources.set(target.table, new Set([...(sources.get(target.table) ?? []), ...target.sourceIds]));
  }
  const rows = [];
  const arrayColumns = new Set([
    'operations',
    'feature_adjustments',
    'abilities_base',
    'abilities_added',
    'traits',
    'prerequisites',
    'traditions',
    'cast',
    'required_content_sources',
    'keys',
  ]);
  const numberArrayColumns = new Set(['traits', 'required_content_sources', 'abilities_added']);
  const numberColumns = new Set([
    'id',
    'level',
    'rank',
    'trait_id',
    'content_source_id',
    'skill_training_base',
    'class_id',
    'archetype_id',
    'dedication_feat_id',
    'override_skill_training_base',
  ]);
  const booleanColumns = new Set(['deprecated', 'override_class_operations', 'require_key', 'is_published']);
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
    const matchesId = wanted.has(`${table}:${cells[columns.indexOf('id')]}`);
    const matchesSource = sources.get(table)?.has(Number(cells[columns.indexOf('content_source_id')]));
    if (!matchesId && !matchesSource) continue;
    const row = Object.fromEntries(
      columns.map((key, index) => {
        const raw = cells[index];
        if (raw === '\\N') return [key, null];
        const value = raw.replace(/\\([\\ntrbfv])/g, (_, escaped) => escapes[escaped]);
        if (arrayColumns.has(key) && value.startsWith('{')) {
          const entries = parseContentArray(value);
          return [
            key,
            key === 'operations' || key === 'abilities_base' || key === 'feature_adjustments'
              ? entries.map((entry) => (typeof entry === 'string' ? JSON.parse(entry) : entry))
              : numberArrayColumns.has(key)
                ? entries.map((entry) => (entry === null ? null : Number(entry)))
                : entries,
          ];
        }
        if (numberColumns.has(key)) return [key, Number(value)];
        if (booleanColumns.has(key)) return [key, value === 't'];
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
export async function fetchContent(type, data) { return getCachedContent(type).filter(row => (data.id === undefined || (Array.isArray(data.id) ? data.id : [data.id]).includes(row.id)) && (!Array.isArray(data.content_sources) || data.content_sources.includes(row.content_source_id))); }
export async function fetchContentAll(type, requestedSources) { return getCachedContent(type).filter(row => !Array.isArray(requestedSources) || requestedSources.length === 0 || requestedSources.includes(row.content_source_id)); }
export async function fetchTraitByName(name) { return getCachedContent('trait').find(row => row.name.toLowerCase() === name.toLowerCase()) || null; }
export async function fetchTraits(ids) { return getCachedContent('trait').filter(row => ids.includes(row.id)); }
export async function fetchArchetypeByDedicationFeat() { return null; }
export function getDefaultSources(view) { return sources[view]; }
export function getDefaultSourcesKey(view) { const scope = getDefaultSources(view); return Array.isArray(scope) ? [...scope].sort((a,b) => a-b).join(',') : scope; }
export function getContentFast(type, ids) { return getCachedContent(type).filter(row => ids.includes(row.id)); }
export function defineDefaultSources(view, values) { sources[view] = values; return values; }
export async function fetchContentPackage(requestedSources) {
  const tables = { ability_block: 'abilityBlocks', class: 'classes', ancestry: 'ancestries', background: 'backgrounds', spell: 'spells', item: 'items', trait: 'traits', language: 'languages', creature: 'creatures', archetype: 'archetypes', versatile_heritage: 'versatileHeritages', class_archetype: 'classArchetypes', content_source: 'sources' };
  const content = Object.fromEntries(Object.values(tables).map(key => [key, []]));
  for (const {table, row} of fixtures) {
    const sourceId = table === 'content_source' ? row.id : row.content_source_id;
    if (tables[table] && (!Array.isArray(requestedSources) || requestedSources.includes(sourceId))) content[tables[table]].push(row);
  }
  return {...content, defaultSources: structuredClone(sources)};
}
export function importFromContentPackage() {}
/** Fail closed if a drawer tries an unseeded lookup instead of its explicit local fixture. */
function rejectUnseededContentRead() { throw new Error('Unseeded content read in drawer fixture'); }
export { rejectUnseededContentRead as fetchAllPrereqs };
`;

/** Bundle the workspace's actual engine with a local content boundary; register cleanup with test.after(). */
export async function createOperationEngine({
  renderRichText = false,
  renderPerceptionDrawer = false,
  renderCastSpellDrawer = false,
  renderSpellDrawer = false,
  renderBindingEditor = false,
  inspectInitialStats = false,
  resolveArchetypeFixtures = false,
  exportJson = false,
} = {}) {
  const directory = await mkdtemp(join(tmpdir(), 'wg-operation-tests-'));
  try {
    const result = await build({
      absWorkingDir: frontend,
      stdin: {
        contents: `${
          renderRichText || renderPerceptionDrawer || renderCastSpellDrawer || renderSpellDrawer || renderBindingEditor
            ? `
          import React from 'react';
          import { renderToStaticMarkup } from 'react-dom/server';
          import { MantineProvider, DEFAULT_THEME } from '@mantine/core';
          import RichText from '@common/RichText';
          export function renderRichText(text, conditionBlacklist = []) {
            return renderToStaticMarkup(React.createElement(MantineProvider,
              { theme: { colors: { guide: DEFAULT_THEME.colors.blue } } },
              React.createElement(RichText, { conditionBlacklist, children: text })));
          }
          ${
            renderCastSpellDrawer
              ? `
          import { QueryClient as CastQueryClient, QueryClientProvider as CastQueryClientProvider } from '@tanstack/react-query';
          import { CastSpellDrawerContent } from '@drawers/types/CastSpellDrawer';
          export function renderCastSpellDrawer(data) {
            const client = new CastQueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
            try {
              return renderToStaticMarkup(React.createElement(MantineProvider,
                { theme: { colors: { guide: DEFAULT_THEME.colors.blue } } },
                React.createElement(CastQueryClientProvider, { client },
                  React.createElement(CastSpellDrawerContent, { data }))));
            } finally { client.clear(); }
          }
          `
              : ''
          }
          ${
            renderSpellDrawer
              ? `
          import { QueryClient as SpellQueryClient, QueryClientProvider as SpellQueryClientProvider } from '@tanstack/react-query';
          import { SpellDrawerTitle, SpellDrawerContent } from '@drawers/types/SpellDrawer';
          import { ActionDrawerTitle, ActionDrawerContent } from '@drawers/types/ActionDrawer';
          import { FeatDrawerTitle, FeatDrawerContent } from '@drawers/types/FeatDrawer';
          import { getCachedContent as getSpellDrawerFixtures } from '@content/content-store';
          /** Render actual content drawers with explicit cached content, without remote reads. */
          function renderCachedDrawer(data, kind, Title, Content) {
            const client = new SpellQueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
            const row = data[kind] ?? getSpellDrawerFixtures(kind === 'spell' ? 'spell' : 'ability-block').find(row => row.id === data.id);
            if (row) {
              client.setQueryData(['find-' + kind + '-' + data.id, { id: data.id }], row);
              const traitIds = row.traits ?? [];
              client.setQueryData(['find-traits-' + traitIds.join('_'), { traitIds }],
                getSpellDrawerFixtures('trait').filter(row => traitIds.includes(row.id)));
            }
            try {
              return renderToStaticMarkup(React.createElement(MantineProvider,
                { theme: { colors: { guide: DEFAULT_THEME.colors.blue } } },
                React.createElement(SpellQueryClientProvider, { client },
                  React.createElement(React.Fragment, null,
                    React.createElement(Title, { data }),
                    React.createElement(Content, { data })))));
            } finally { client.clear(); }
          }
          /** Render the actual catalog spell title and rules against cached fixtures. */
          export function renderSpellDrawer(data) {
            return renderCachedDrawer(data, 'spell', SpellDrawerTitle, SpellDrawerContent);
          }
          /** Render the actual action title and rules against cached fixtures. */
          export function renderActionDrawer(data) {
            return renderCachedDrawer(data, 'action', ActionDrawerTitle, ActionDrawerContent);
          }
          /** Render the actual feat title and rules against cached fixtures. */
          export function renderFeatDrawer(data) {
            return renderCachedDrawer(data, 'feat', FeatDrawerTitle, FeatDrawerContent);
          }
          `
              : ''
          }
          ${
            renderBindingEditor
              ? `
          import { BindValOperation } from '@common/operations/variables/BindValOperation';
          export function renderBindingEditor(variable, value) {
            return renderToStaticMarkup(React.createElement(MantineProvider,
              { theme: { colors: { guide: DEFAULT_THEME.colors.blue } } },
              React.createElement(BindValOperation, { variable, value, onSelect() {}, onValueChange() {}, onRemove() {} })));
          }
          `
              : ''
          }
          ${
            renderPerceptionDrawer
              ? `
          import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
          import { StatPerceptionDrawerContent } from '@drawers/types/StatPerceptionDrawer';
          import { getDefaultSourcesKey } from '@content/content-store';
          export function renderPerceptionDrawer(id, blocks = []) {
            const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
            client.setQueryData(['find-ability-blocks', { sources: getDefaultSourcesKey('PAGE') }], blocks);
            try {
              return renderToStaticMarkup(React.createElement(MantineProvider,
                { theme: { colors: { guide: DEFAULT_THEME.colors.blue } } },
                React.createElement(QueryClientProvider, { client },
                  React.createElement(StatPerceptionDrawerContent, { data: { id } }))));
            } finally { client.clear(); }
          }
          `
              : ''
          }
        `
            : ''
        }
          export * from '@operations/operation-runner';
          export * from '@operations/operation-controller';
          export { executeOperations } from '@operations/operations.main';
          export * from '@operations/selection-tree';
          export * from '@variables/variable-manager';
          export * from '@variables/variable-utils';
          export * from '@variables/variable-helpers';
          export { saveCalculatedStats } from '@variables/calculated-stats';
          export { convertToHardcodedLink, buildHrefFromContentData } from '@content/hardcoded-links';
          export { detectSpells, detectSpellheartSpells, getKnownSpellsByRank } from '@spells/spell-utils';
          export { getInventorySpellIds, getMissingSpellIds, mergeSpellDependencies, filterSpellCatalog } from '@spells/item-spell-dependencies';
          export { filterByTraitType, isItemWeapon, isItemStave } from '@items/inv-utils';
          export { meetsPrerequisites } from '@variables/prereq-detection';
          export { applyConditions, compiledConditions, getConditionByName } from '@conditions/condition-handler';
          export { getSpellStats, getItemCastingSource, getSpellheartStats, resolveSpellheartCasting } from '@spells/spell-handler';
          export * from '@spells/innate-spells';
          export { SpellheartCastingSchema, ItemSchema, InventoryItemSchema } from '@schemas/content';
          export { changeEntityConditions, confirmHealth, handleRest } from '@pages/character_sheet/entity-handler';
          export { findDefaultPresets } from '@common/dice/dice-utils';
          export { getWeaponStats } from '@items/weapon-handler';
          export { getAcParts } from '@items/armor-handler';
          export * from '@items/eidolon-runes';
          export { handleAddItem, handleDeleteItem, handleUpdateItem, handleMoveItem, addExtraItems, handleUpdateItemCharges } from '@items/inv-handlers';
          export { isItemInvestable, isItemBroken, getFlatInvItems, getItemBulk, getInvBulk, getBulkLimit, getBulkLimitImmobile, applyEquipmentPenalties, getBestArmor, getBestShield, getEquippedWeapons, reachedInvestedLimit, reachedImplantLimit, compileTraits } from '@items/inv-utils';
          export { getListStringInputValue } from '@common/operations/variables/operation-value-defaults';
          export { toggleActiveMode, getExecutableModes } from '@common/modes/mode-rules';
          export { determineFilteredSelectionList, determinePredefinedSelectionList, getSelectedOptions } from '@operations/operation-utils';
          export { getWeaponSpecialization, getWeaponSpecializations } from '@specializations/weapon-specializations';
          export { OperationSelectFiltersAbilityBlockSchema } from '@schemas/operations';
          export { collectEntityAbilityBlocks, collectEntitySenses, collectEntitySpellcasting } from '@content/collect-content';
          ${inspectInitialStats ? "export { getStatBlockDisplay } from '@variables/initial-stats-display';" : ''}
          export { displaySense } from '@utils/senses';
          export { isAbilityBlockVisible } from '@content/content-hidden';
          export { hasArchetypeClassFeatTraits, getTraitIdByType } from '@utils/traits';
          export { setFixtures, defineDefaultSources } from '@content/content-store';
          export { getOperationErrorNotifications, clearOperationErrorNotifications } from '@utils/notifications';
          ${exportJson ? "export { default as jsonV4, getJsonV4Content } from '@export/json/json-v4'; export { getJsonDownload, clearJsonDownload } from '@export/export-to-json';" : ''}
        `,
        resolveDir: frontend,
        loader: 'ts',
      },
      tsconfig: join(frontend, 'tsconfig.json'),
      bundle: true,
      write: false,
      platform: 'node',
      format: 'esm',
      ...(renderCastSpellDrawer || renderSpellDrawer ? { loader: { '.css': 'empty', '.module.css': 'empty' } } : {}),
      ...(renderRichText || renderPerceptionDrawer || renderCastSpellDrawer || renderSpellDrawer || renderBindingEditor
        ? {
            banner: {
              js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);",
            },
          }
        : {}),
      define: { 'import.meta.env': JSON.stringify({ VITE_ENV: 'production' }) },
      plugins: [
        {
          name: 'fixture-content',
          setup(pluginBuild) {
            if (renderSpellDrawer) {
              // Stat-line fixtures do not open the operation editor or its remote lookup controls.
              pluginBuild.onResolve({ filter: /^@drawers\/ShowOperationsButton$/ }, () => ({
                path: 'unopened-operation-editor',
                namespace: 'drawer-editor-boundary',
              }));
              pluginBuild.onLoad({ filter: /.*/, namespace: 'drawer-editor-boundary' }, () => ({
                contents:
                  "export default function ShowOperationsButton() { throw new Error('Drawer stat-line fixtures do not cover the operation editor'); }",
                loader: 'ts',
              }));
              // Server rendering has no DOM for DOMPurify; these drawer fixtures intentionally omit artwork.
              pluginBuild.onResolve({ filter: /^dompurify$/ }, () => ({
                path: 'empty-artwork',
                namespace: 'browser-sanitizer',
              }));
              pluginBuild.onLoad({ filter: /.*/, namespace: 'browser-sanitizer' }, () => ({
                contents:
                  "export default { sanitize(value) { if (value !== '') throw new Error('Spell drawer SSR does not cover nonempty artwork'); return ''; } };",
                loader: 'ts',
              }));
            }
            if (exportJson) {
              pluginBuild.onResolve({ filter: /^@export\/export-to-json$/ }, () => ({
                path: 'download',
                namespace: 'json-download',
              }));
              pluginBuild.onLoad({ filter: /.*/, namespace: 'json-download' }, () => ({
                contents:
                  'let download; export function downloadObjectAsJson(value, name) { download = { value: JSON.parse(JSON.stringify(value)), name }; } export function getJsonDownload() { return download; } export function clearJsonDownload() { download = undefined; }',
                loader: 'ts',
              }));
            }
            if (inspectInitialStats) {
              pluginBuild.onResolve({ filter: /^@common\/select\/SelectContent$/ }, (args) =>
                args.importer.endsWith('/initial-stats-display.tsx')
                  ? { path: 'stat-selector', namespace: 'stat-fixture' }
                  : undefined
              );
              pluginBuild.onLoad({ filter: /.*/, namespace: 'stat-fixture' }, () => ({
                contents: 'export function SelectContentButton() { return null; }',
                loader: 'ts',
              }));
            }
            if (renderBindingEditor) {
              // Omit the surrounding operation menu; render the real binding fields and variable selectors.
              pluginBuild.onResolve({ filter: /^\.\.\/Operations$/ }, (args) =>
                args.importer.endsWith('/BindValOperation.tsx')
                  ? { path: 'operation-wrapper', namespace: 'render-fixture' }
                  : undefined
              );
              pluginBuild.onLoad({ filter: /.*/, namespace: 'render-fixture' }, () => ({
                contents: 'export function OperationWrapper({ children }) { return children; }',
                loader: 'ts',
              }));
            }
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
              contents: resolveArchetypeFixtures
                ? fixtureContent.replace(
                    'export async function fetchArchetypeByDedicationFeat() { return null; }',
                    "export async function fetchArchetypeByDedicationFeat(id) { return getCachedContent('archetype').find(row => row.dedication_feat_id === id) || null; }"
                  )
                : fixtureContent,
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
