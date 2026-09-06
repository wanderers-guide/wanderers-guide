import { CharacterSchema, ConditionSchema } from '@schemas/content';
import { z } from 'zod';

/**
 * Validate fields consumed by encounter controls. Unrelated legacy/extension JSON is
 * opaque here: editing HP must not depend on the shape of an old inventory or spell list.
 */
export const EncounterCharacterSchema = CharacterSchema.pick({
  id: true,
  name: true,
  level: true,
  hp_current: true,
})
  .extend({
    updated_at: z.string().min(1),
    details: z
      .object({ conditions: z.array(ConditionSchema).optional(), image_url: z.string().optional() })
      .passthrough()
      .nullable(),
    meta_data: z
      .object({
        reset_hp: z.boolean().optional(),
        calculated_stats: z
          .object({
            hp_max: z.number().optional(),
            ac: z.number().optional(),
            profs: z.record(z.string(), z.object({ total: z.number() }).passthrough()).optional(),
          })
          .passthrough()
          .optional(),
      })
      .passthrough()
      .nullable(),
  })
  .passthrough();
