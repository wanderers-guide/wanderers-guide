/** Named read-only fixture builders replace shell commands; no browser-supplied code or paths execute. */
import { readFile } from 'node:fs/promises';
import { z } from 'zod';
import { readContentRows } from '../../scripts/operation-test-harness.mjs';

const sourcesSchema = z.array(z.number().int().positive()).min(1).max(100);
const tables = [
  'ability_block',
  'item',
  'class',
  'ancestry',
  'background',
  'spell',
  'trait',
  'language',
  'archetype',
  'versatile_heritage',
  'class_archetype',
];

/** Read exactly the official source corpus requested by the browser fixture. */
async function sources(value) {
  const ids = sourcesSchema.parse(value);
  return readContentRows([
    ...tables.map((table) => ({ table, sourceIds: ids })),
    ...ids.map((id) => ({ table: 'content_source', id })),
  ]);
}

/** Preserve the existing cache corpus in the Node process. */
async function cache() {
  const rows = await readContentRows([
    { table: 'ability_block', id: 19873 },
    { table: 'content_source', id: 3 },
  ]);
  const feat = rows.find((entry) => entry.table === 'ability_block').row;
  feat.name = 'Content Cache Fixture';
  feat.description = 'Cached description before publication.';
  return rows;
}

/** Preserve the existing runes corpus in the Node process. */
async function runes() {
  const rows = await readContentRows([...[7090, 7950, 6961].map((id) => ({ table: 'item', id }))]);
  rows.push(
    ...(await readContentRows([
      ...[...new Set(rows.flatMap(({ row }) => row.traits ?? []))].map((id) => ({ table: 'trait', id })),
      ...[...new Set(rows.map(({ row }) => row.content_source_id))].map((id) => ({ table: 'content_source', id })),
    ]))
  );
  const host = rows.find((entry) => entry.table === 'item' && entry.row.id === 7090).row;
  const flaming = rows.find((entry) => entry.table === 'item' && entry.row.id === 6961).row;
  for (const [id, property] of [
    [990010, ['Shock', 'Frost']],
    [990011, ['Shock', { id: flaming.id, name: flaming.name, rune: flaming }, 'Frost']],
  ])
    rows.push({
      table: 'item',
      row: {
        ...host,
        id,
        name: 'Legacy rune verification',
        meta_data: {
          ...host.meta_data,
          runes: { potency: 1, property },
        },
      },
    });
  return rows;
}

/** Preserve the existing hazards corpus in the Node process. */
async function hazards() {
  const entries = JSON.parse(
    (
      await readFile(
        new URL('../../../supabase/migrations/20260928020000_war_of_immortals_hazards.sql', import.meta.url),
        'utf8'
      )
    ).split('$entries$')[1]
  );
  const rows = await readContentRows([
    ...[1, 3, 400].map((id) => ({ table: 'content_source', id })),
    ...[4414, 4851, 4650, 4668, 4899, 4830].map((id) => ({ table: 'spell', id })),
    ...[19721, 19856].map((id) => ({ table: 'ability_block', id })),
  ]);
  const traits = new Set([
    ...entries.flatMap((entry) => entry.details.trait_ids),
    ...rows.flatMap(({ row }) => row.traits ?? []),
  ]);
  rows.push(...(await readContentRows([...traits].map((id) => ({ table: 'trait', id })))));
  rows.push(
    ...entries.map((entry, index) => ({
      table: 'creature',
      row: {
        id: 911001 + index,
        uuid: entry.uuid,
        created_at: '2026-09-28T00:00:00Z',
        type: 'hazard',
        name: entry.name,
        level: entry.level,
        rarity: 'RARE',
        details: entry.details,
        content_source_id: 400,
        deprecated: false,
        version: '1.0',
        meta_data: { source: { book: 'War of Immortals', page: entry.page, url: entry.url } },
      },
    }))
  );
  return rows;
}

/** Preserve the existing hazardDrawer corpus in the Node process. */
async function hazardDrawer() {
  const migration = await readFile(
    new URL('../../../supabase/migrations/20260928020000_war_of_immortals_hazards.sql', import.meta.url),
    'utf8'
  );
  const entries = JSON.parse(migration.split('$entries$')[1]);
  const rows = await readContentRows([
    ...[1, 3, 400].map((id) => ({ table: 'content_source', id })),
    ...[4414, 4851, 4650, 4668, 4899, 4830].map((id) => ({ table: 'spell', id })),
    ...[19721, 19856].map((id) => ({ table: 'ability_block', id })),
  ]);
  const traitIds = new Set([
    ...entries.flatMap((entry) => entry.details.trait_ids),
    ...rows.flatMap(({ row }) => row.traits ?? []),
    1476,
    1524,
    1576,
    1484,
    1584,
    1478,
    1846,
    1542,
    1556,
  ]);
  rows.push(...(await readContentRows([...traitIds].map((id) => ({ table: 'trait', id })))));
  rows.push(
    ...entries.map((entry, index) => ({
      table: 'creature',
      row: {
        id: 911001 + index,
        uuid: entry.uuid,
        created_at: '2026-09-28T00:00:00Z',
        type: 'hazard',
        name: entry.name,
        level: entry.level,
        rarity: 'RARE',
        details: entry.details,
        content_source_id: 400,
        deprecated: false,
        version: '1.0',
        meta_data: { source: { book: 'War of Immortals', page: entry.page, url: entry.url } },
      },
    }))
  );
  // Canonical monster identities are sufficient for reference resolution, not creature calculation tests.
  const legends = JSON.parse(
    (
      await readFile(
        new URL('../../../supabase/migrations/20260929020000_war_of_immortals_mythic_legends.sql', import.meta.url),
        'utf8'
      )
    ).split('$entries$')[1]
  );
  const entities = JSON.parse(
    (
      await readFile(
        new URL('../../../supabase/migrations/20260929030000_war_of_immortals_mythic_entities.sql', import.meta.url),
        'utf8'
      )
    ).split('$entries$')[1]
  );
  rows.push(
    ...[...legends, ...entities]
      .filter((entry) => ['Agyra', 'Verex-That-Was', 'Oliphaunt of Jandelay'].includes(entry.name))
      .map((entry) => ({
        table: 'creature',
        row: {
          id: entry.uuid,
          uuid: entry.uuid,
          created_at: '2026-09-29T00:00:00Z',
          type: 'creature',
          name: entry.name,
          level: entry.level,
          experience: 0,
          rarity: 'UNIQUE',
          inventory: null,
          hp_current: entry.hp,
          hp_temp: 0,
          stamina_current: 0,
          resolve_current: 0,
          details: {
            description: entry.name + ' reference fixture. [Agyra](link_creature_6892231756030293)',
          },
          notes: null,
          roll_history: null,
          spells: null,
          operation_data: null,
          operations: [],
          abilities_base: [],
          abilities_added: null,
          content_source_id: 400,
          deprecated: false,
          version: '1.0',
          meta_data: {
            source: {
              book: 'War of Immortals',
              page: entry.page,
              url: entry.url ?? 'https://2e.aonprd.com/Monsters.aspx?ID=' + entry.aon_id,
            },
          },
        },
      }))
  );
  return rows;
}

/** Preserve the existing hazardSnapshots corpus in the Node process. */
async function hazardSnapshots() {
  const entries = JSON.parse(
    (
      await readFile(
        new URL('../../../supabase/migrations/20260928020000_war_of_immortals_hazards.sql', import.meta.url),
        'utf8'
      )
    ).split('$entries$')[1]
  );
  return entries.map((entry, index) => ({
    id: 911001 + index,
    uuid: entry.uuid,
    created_at: '2026-09-28T00:00:00Z',
    type: 'hazard',
    name: entry.name,
    level: entry.level,
    rarity: 'RARE',
    details: entry.details,
    content_source_id: 400,
    deprecated: false,
    version: '1.0',
    meta_data: { source: { book: 'War of Immortals', page: entry.page, url: entry.url } },
  }));
}

/** @param {import('cypress').PluginEvents} on */
export function registerContentFixtures(on) {
  on('task', {
    'contentFixture:sources': sources,
    'contentFixture:cache': cache,
    'contentFixture:runes': runes,
    'contentFixture:hazards': hazards,
    'contentFixture:hazardDrawer': hazardDrawer,
    'contentFixture:hazardSnapshots': hazardSnapshots,
  });
}
