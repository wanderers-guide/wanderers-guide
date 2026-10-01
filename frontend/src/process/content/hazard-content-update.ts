import { Hazard, HazardSchema } from '@schemas/content';
import { z } from 'zod';

const HazardContentUpdateSchema = HazardSchema.extend({
  name: z.string().trim().min(1, 'Name is required'),
  level: z.number().int(),
});

/** Validate a hazard correction while keeping its catalog identity and source fixed. */
export function prepareHazardContentUpdate(original: Hazard, edited: Hazard) {
  return HazardContentUpdateSchema.safeParse({
    ...edited,
    id: original.id,
    uuid: original.uuid,
    type: original.type,
    created_at: original.created_at,
    updated_at: original.updated_at,
    content_source_id: original.content_source_id,
    version: original.version,
    deprecated: original.deprecated,
    // Only the citation is editable; retain other metadata from the catalog row.
    meta_data: edited.meta_data?.source
      ? {
          ...original.meta_data,
          source: { ...original.meta_data?.source, ...edited.meta_data.source },
        }
      : original.meta_data,
  });
}
