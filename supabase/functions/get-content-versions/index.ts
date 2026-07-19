// @ts-ignore
import { serve } from 'std/server';
import { TableName, connect } from '../_shared/helpers.ts';

/**
 * Freshness probe for the client's persisted content cache.
 *
 * Returns the change token (`updated_at`, trigger-maintained per migration
 * 20260718000000) for each requested content source. A cached client compares
 * these against the tokens stored in its IndexedDB corpus blob on page load and
 * drops the cache on any mismatch. Called once per page load by warm-cache
 * clients, so the response must stay tiny: id + updated_at only, never full
 * source rows (~5 KB vs ~247 KB for the official source set).
 */
serve(async (req: Request) => {
  return await connect(req, async (client, body) => {
    const { ids } = body as { ids?: unknown };

    // Validate strictly: this is a public endpoint (verify_jwt = false).
    if (
      !Array.isArray(ids) ||
      ids.length === 0 ||
      ids.length > 500 ||
      !ids.every((id) => typeof id === 'number' && Number.isFinite(id))
    ) {
      return {
        status: 'fail',
        data: { message: 'ids must be a non-empty array of at most 500 numbers.' },
      };
    }

    // Column-selected direct query instead of fetchData: fetchData selects '*'
    // (the whole 247 KB source set) and this endpoint exists to be cheap.
    const { data, error } = await client
      .from('content_source' satisfies TableName)
      .select('id, updated_at')
      .in('id', ids);
    if (error) {
      console.error('Error fetching content versions:', error);
      return {
        status: 'error',
        message: 'Failed to fetch content versions.',
      };
    }

    return {
      status: 'success',
      data: data ?? [],
    };
  });
});
