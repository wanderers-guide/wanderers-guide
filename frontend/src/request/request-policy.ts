import type { RequestType } from '@schemas/requests';

// Complete catalogs can exceed 10 MB. Their transfer and JSON parsing need a
// larger budget than a record lookup, especially when several books load together.
export const CONTENT_DOWNLOAD_READS: ReadonlySet<RequestType> = new Set<RequestType>([
  'search-data',
  'find-content-source',
  'find-trait',
  'find-ability-block',
  'find-ancestry',
  'find-background',
  'find-class',
  'find-archetype',
  'find-versatile-heritage',
  'find-class-archetype',
  'find-item',
  'find-language',
  'find-creature',
  'find-spell',
]);
// A lost response can follow a committed write. Only explicitly read-only handlers
// may be retried after an ambiguous network, gateway or worker resource failure.
export const RETRYABLE_READS: ReadonlySet<string> = new Set<RequestType>([
  ...CONTENT_DOWNLOAD_READS,
  'gm-users-in-group',
  'get-user',
  'get-content-source-stats',
  'get-content-versions',
  'find-character',
  'find-content-update',
  'find-encounter',
  'find-campaign',
]);
