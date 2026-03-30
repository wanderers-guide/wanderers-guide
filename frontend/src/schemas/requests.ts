import { z } from 'zod';

// ─── RequestType ──────────────────────────────────────────────────────────────

export const RequestTypeSchema = z.enum([
  'upload-public-file',
  'handle-patreon-redirect',
  'search-data',
  'gm-add-to-group',
  'gm-remove-from-group',
  'gm-regenerate-code',
  'gm-users-in-group',
  'get-user',
  'update-user',
  'open-ai-request',
  'find-content-source',
  'create-content-source',
  'delete-content',
  'delete-user',
  'find-trait',
  'create-trait',
  'create-ability-block',
  'find-ability-block',
  'create-ancestry',
  'find-ancestry',
  'create-background',
  'find-background',
  'create-class',
  'find-class',
  'create-archetype',
  'find-archetype',
  'create-versatile-heritage',
  'find-versatile-heritage',
  'create-class-archetype',
  'find-class-archetype',
  'create-item',
  'find-item',
  'create-language',
  'find-language',
  'create-creature',
  'find-creature',
  'create-spell',
  'find-spell',
  'create-character',
  'find-character',
  'update-character',
  'create-content-update',
  'find-content-update',
  'get-content-source-stats',
  'find-encounter',
  'create-encounter',
  'find-campaign',
  'create-campaign',
  'reset-campaign-key',
  'remove-from-campaign',
  'vector-db-populate-collection',
  'vector-db-query-collection',
]);
export type RequestType = z.infer<typeof RequestTypeSchema>;

// ─── JSendResponse ────────────────────────────────────────────────────────────
// All requests follow the JSend specification: https://github.com/omniti-labs/jsend
//
// JSendResponseSchema is a factory function — pass in a data schema to get a
// fully-typed response validator, e.g. JSendResponseSchema(CharacterSchema).

export const JSendResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.union([
    z.object({ status: z.literal('success'), data: dataSchema }),
    z.object({ status: z.literal('fail'), data: dataSchema }),
    z.object({
      status: z.literal('error'),
      message: z.string(),
      data: dataSchema.optional(),
      code: z.number().optional(),
    }),
  ]);

// Generic TypeScript type — kept as a manual declaration because Zod cannot
// express generic type parameters.
export type JSendResponse<T = NonNullable<any>> =
  | { status: 'success'; data: T }
  | { status: 'fail'; data: T }
  | { status: 'error'; message: string; data?: T; code?: number };
