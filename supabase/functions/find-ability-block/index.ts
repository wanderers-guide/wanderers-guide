// @ts-ignore
import { serve } from 'std/server';
import { connect, fetchData } from '../_shared/helpers.ts';
import type { AbilityBlock } from '../_shared/content';
import { z } from 'https://esm.sh/zod@3.24.2';

const paginationSchema = z
  .object({
    page_size: z.number().int().min(1).max(1000).optional(),
    after_id: z.number().int().min(Number.MIN_SAFE_INTEGER).max(Number.MAX_SAFE_INTEGER).optional(),
  })
  .refine((page) => page.after_id === undefined || page.page_size !== undefined);

serve(async (req: Request) => {
  return await connect(req, async (client, body) => {
    const pagination = paginationSchema.safeParse(body);
    if (!pagination.success) {
      return {
        status: 'fail',
        data: { message: 'Invalid pagination: page_size must be 1–1000 and is required with after_id.' },
      };
    }
    const page =
      pagination.data.page_size === undefined
        ? undefined
        : { size: pagination.data.page_size, afterId: pagination.data.after_id };
    let { id, type, name, content_sources, traits, prerequisites } = body as {
      id?: number | number[];
      type?: string;
      name?: string;
      content_sources?: number[];
      traits?: number[];
      prerequisites?: string[];
    };

    const results = await fetchData<AbilityBlock>(
      client,
      'ability_block',
      [
        { column: 'id', value: id },
        { column: 'type', value: type },
        { column: 'name', value: name, options: { ignoreCase: true } },
        { column: 'content_source_id', value: content_sources },
        { column: 'traits', value: traits, options: { arrayContains: true } },
        { column: 'prerequisites', value: prerequisites, options: { arrayContains: true } },
      ],
      undefined,
      page
    );

    const data = id === undefined || Array.isArray(id) ? results : results.length > 0 ? results[0] : null;
    return {
      status: 'success',
      data,
    };
  });
});
