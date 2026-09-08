import type { ContentPackage, ContentSource, ContentType, SourceValue, Trait } from '@schemas/content';
import { COMMON_CORE_ID } from '@constants/data';
import { SourceValueSchema } from '@schemas/shared';

const TABLES = {
  'ability-block': 'abilityBlocks',
  ancestry: 'ancestries',
  archetype: 'archetypes',
  background: 'backgrounds',
  class: 'classes',
  'class-archetype': 'classArchetypes',
  'content-source': 'sources',
  creature: 'creatures',
  item: 'items',
  language: 'languages',
  spell: 'spells',
  trait: 'traits',
  'versatile-heritage': 'versatileHeritages',
} as const satisfies Record<ContentType, keyof ContentPackage>;

type PackageRow = { id: number; name: string; content_source_id?: number };

/** Match the endpoint's case-insensitive SQL LIKE name filter, including explicit wildcards. */
function namePattern(pattern: string): RegExp {
  let expression = '';
  let escaped = false;
  for (const character of pattern) {
    if (!escaped && character === '\\') {
      escaped = true;
      continue;
    }
    expression +=
      !escaped && character === '%'
        ? '.*'
        : !escaped && character === '_'
          ? '.'
          : character.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    escaped = false;
  }
  if (escaped) throw new Error('Invalid trailing escape in a content name filter.');
  return new RegExp(`^${expression}$`, 'is');
}

/** Read only the complete content supplied for this calculation, without another account or network lookup. */
export function createOperationContentReader(content: ContentPackage) {
  for (const [type, field] of Object.entries(TABLES)) {
    if (field !== 'sources' && !Array.isArray(content[field]))
      throw new Error(`Calculation is missing ${type} content.`);
  }
  const page = SourceValueSchema.parse(content.defaultSources?.PAGE);
  const enabled = Array.isArray(page) ? new Set([COMMON_CORE_ID, ...page]) : null;
  const scopedTables = new Map<ContentType, PackageRow[]>();
  const indexedTables = new Map<ContentType, Map<number, PackageRow>>();
  const lookupTraits = content.lookupTraits
    ? [...content.lookupTraits].sort((left, right) => left.id - right.id)
    : undefined;

  const table = (type: ContentType, required: boolean): PackageRow[] => {
    const cached = scopedTables.get(type);
    if (cached) return cached;
    const field = TABLES[type];
    if (!field) return [];
    const rows = content[field];
    if (!Array.isArray(rows)) {
      if (required) throw new Error(`Calculation is missing ${type} content.`);
      return [];
    }
    const scoped = rows.filter((row) => {
      const sourceId =
        type === 'content-source' ? row.id : 'content_source_id' in row ? row.content_source_id : undefined;
      return !enabled || (typeof sourceId === 'number' && enabled.has(sourceId));
    });
    scopedTables.set(type, scoped);
    return scoped;
  };
  const sources = (scope: SourceValue): ContentSource[] => {
    const rows = table('content-source', true) as ContentSource[];
    if (Array.isArray(scope)) return rows.filter((source) => scope.includes(source.id));
    if (scope === 'ALL-USER-ACCESSIBLE') return rows;
    return rows.filter((source) => {
      if (scope === 'ALL-OFFICIAL-PUBLIC') return source.user_id === null && source.is_published;
      if (scope === 'ALL-HOMEBREW-PUBLIC') return source.user_id !== null && source.is_published;
      if (scope === 'ALL-PUBLIC') return source.is_published;
      return source.user_id !== null;
    });
  };
  return {
    sources,
    /** Match find-trait's implicit scope, ID precedence, trimming and first-row behavior. */
    lookupTrait(data: Record<string, unknown>): Trait[] | undefined {
      if (!lookupTraits) return undefined;
      if (data.id) {
        const ids = new Set((Array.isArray(data.id) ? data.id : [data.id]).map(Number));
        const rows = lookupTraits.filter((row) => ids.has(row.id));
        return Array.isArray(data.id) && data.name === undefined ? rows : rows.slice(0, 1);
      }
      if (typeof data.name === 'string') {
        const match = data.name ? namePattern(data.name.trim()) : null;
        const row = lookupTraits.find((row) => !match || match.test(row.name));
        return row ? [row] : [];
      }
      return undefined;
    },
    /** Optional prose/cache lookups retain their existing empty result for unknown subtypes. */
    cached<T>(type: ContentType): T[] {
      // Fetch boundaries already validated these rows. Preserve extension fields and
      // the content store's existing caller-selected return type without cloning them.
      return table(type, false) as T[];
    },
    fetch<T>(type: ContentType, data: Record<string, unknown>): T[] {
      let rows = table(type, type !== 'content-source' || data.id === undefined);
      if (data.id !== undefined) {
        let index = indexedTables.get(type);
        if (!index) {
          index = new Map(rows.map((row) => [row.id, row]));
          indexedTables.set(type, index);
        }
        const ids = new Set((Array.isArray(data.id) ? data.id : [data.id]).map(Number));
        rows = [...ids].map((id) => index.get(id)).filter((row): row is PackageRow => !!row);
      }
      const scope = data.content_sources === undefined ? undefined : SourceValueSchema.parse(data.content_sources);
      if (type !== 'content-source' && scope !== undefined) {
        const ids = Array.isArray(scope)
          ? new Set(scope)
          : scope === page || scope === 'ALL-USER-ACCESSIBLE'
            ? null
            : new Set(sources(scope).map((source) => source.id));
        if (ids)
          rows = rows.filter((row) => typeof row.content_source_id === 'number' && ids.has(row.content_source_id));
      }
      for (const [key, value] of Object.entries(data)) {
        if (value === undefined || key === 'content_sources' || key === 'id') continue;
        if (key === 'homebrew') {
          if (!data.id && value === false) rows = rows.filter((row) => 'user_id' in row && row.user_id === null);
          continue;
        }
        const nameMatch = key === 'name' && typeof value === 'string' ? namePattern(value) : null;
        rows = rows.filter((row) => {
          const column = key === 'published' ? 'is_published' : key;
          const actual = Reflect.get(row, column);
          if (nameMatch) return nameMatch.test(row.name);
          if (Array.isArray(value)) {
            if (key === 'traits' || key === 'prerequisites')
              return Array.isArray(actual) && value.every((item) => actual.includes(item));
            return value.includes(actual);
          }
          return actual === value;
        });
      }
      return rows as T[];
    },
  };
}

let workerContent: ReturnType<typeof createOperationContentReader> | undefined;

/** The regular browser cache is unchanged unless the dedicated worker installs a job package. */
export function getWorkerContentReader(): typeof workerContent {
  return workerContent;
}

/** Install one worker job's package and always release it before another calculation runs. */
export async function withWorkerContentPackage<T>(content: ContentPackage, execute: () => Promise<T>): Promise<T> {
  if (typeof document !== 'undefined') throw new Error('Calculation package overrides are restricted to workers.');
  if (workerContent) throw new Error('A calculation content package is already active.');
  workerContent = createOperationContentReader(content);
  try {
    return await execute();
  } finally {
    workerContent = undefined;
  }
}
