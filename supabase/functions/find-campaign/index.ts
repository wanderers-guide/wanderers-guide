// @ts-ignore
import { serve } from 'std/server';
import type { Campaign } from '../_shared/content';
import { connect, createServiceClient, fetchData } from '../_shared/helpers.ts';

interface FindCampaignsBody {
  id?: number | number[];
  user_id?: string;
  join_key?: string;
}

serve(async (req: Request) => {
  return await connect(req, async (client, body, token) => {
    let { id, user_id, join_key } = body as FindCampaignsBody;

    // Require at least one identifying filter. Previously an empty body forwarded three
    // undefined filters (all dropped by fetchData) and returned EVERY campaign — including
    // each one's secret join_key — to any authenticated caller. Never dump the table.
    const hasId = !(id === undefined || id === null || (Array.isArray(id) && id.length === 0));
    if (!hasId && !user_id && !join_key) {
      return { status: 'success', data: [] };
    }

    // Identify the caller (null for an anon-key caller with no user session).
    const {
      data: { user },
    } = await client.auth.getUser(token);
    const callerUserId = user?.id ?? null;

    // An anon caller may only look a campaign up by supplying its exact join_key (the join
    // flow). Without a session and without the key there is nothing legitimate to return —
    // and this preserves the old behavior where anon (no RLS policy) saw no campaigns.
    if (!callerUserId && !join_key) {
      return { status: 'success', data: [] };
    }

    // Read with a service-role client: join_key is no longer SELECT-able by
    // anon/authenticated (migration 20260717000001), so the request-scoped client's
    // all-column select would fail. Authorization is enforced explicitly below.
    const admin = createServiceClient();
    const results = await fetchData<Campaign>(admin, 'campaign', [
      { column: 'id', value: id },
      { column: 'user_id', value: user_id },
      { column: 'join_key', value: join_key },
    ]);

    // If the caller proved knowledge of a campaign's join key, record a short-lived join
    // grant. The character_campaign_membership trigger (migration 20260718000000) reads
    // this to authorize the subsequent character write that sets campaign_id — turning
    // "knows the join key" into server-verified permission to join. The join flow already
    // calls this endpoint with the key, so no client change is needed. Best-effort: a
    // failed grant write must never break the lookup itself.
    if (callerUserId && join_key) {
      const grants = results
        .filter((c) => c.join_key === join_key)
        .map((c) => ({
          user_id: callerUserId,
          campaign_id: c.id,
          granted_at: new Date().toISOString(),
        }));
      if (grants.length > 0) {
        const { error } = await admin
          .from('campaign_join_grant')
          .upsert(grants, { onConflict: 'user_id,campaign_id' });
        if (error) console.error('[find-campaign] join grant upsert failed:', error.message);
      }
    }

    // Only the owner, or a caller who already supplied the exact key, receives join_key.
    // Everyone else gets the campaign with the secret stripped.
    const sanitized = results.map((c) => {
      const isOwner = !!callerUserId && c.user_id === callerUserId;
      const suppliedExactKey = !!join_key && c.join_key === join_key;
      if (isOwner || suppliedExactKey) return c;
      const { join_key: _omitted, ...rest } = c;
      return rest as Campaign;
    });

    return {
      status: 'success',
      data: sanitized.sort((a, b) => a.id - b.id),
    };
  });
});
