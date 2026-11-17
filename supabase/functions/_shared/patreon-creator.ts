import { z } from 'https://esm.sh/zod@3.24.2';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { PublicUser } from './content.d.ts';
import { PatreonApiError, patreonClient, refreshPatreonToken } from './patreon-api.ts';
import { fetchCreatorMemberships } from './patreon-creator-api.ts';

const credential = z.object({
  client_id: z.string().min(1),
  access_token: z.string().min(1),
  refresh_token: z.string().min(1),
  expires_at: z.number().finite().nullable().optional(),
  oauth_scopes: z.array(z.string()).optional(),
});
const membership = z.union([
  z.object({ enabled: z.literal(false) }),
  z.object({ enabled: z.literal(true), available: z.literal(false) }),
  z.object({
    enabled: z.literal(true),
    available: z.literal(true),
    tier: z.enum(['ADVOCATE', 'WANDERER', 'LEGEND', 'GAME-MASTER']).nullable(),
    observed_at: z.string().datetime({ offset: true }),
  }),
]);

/** Keep all RPC/database errors and credential bodies out of logs and client responses. */
async function rpc(client: SupabaseClient, name: string, args: Record<string, unknown>): Promise<unknown> {
  try {
    const result = await client.rpc(name, args);
    if (result.error) throw new PatreonApiError('membership');
    return result.data;
  } catch {
    throw new PatreonApiError('membership');
  }
}

/** Overlay only this request's current tier; never rewrite the personal OAuth connection. */
export async function applyCreatorMembership(client: SupabaseClient, user: PublicUser): Promise<boolean> {
  if (Deno.env.get('PATREON_CREATOR_ENABLED') !== 'true' || !user.patreon?.patreon_user_id) return false;
  const personalV2 = Boolean(
    user.patreon.access_token && user.patreon.oauth_client_id === Deno.env.get('PATREON_V2_CLIENT_ID')
  );
  let raw: unknown;
  try {
    raw = await rpc(client, 'patreon_creator_membership', { p_user: user.user_id });
  } catch (error) {
    // A creator outage must not break an independently verifiable personal v2 grant.
    if (personalV2) return false;
    throw error;
  }
  const parsed = membership.safeParse(raw);
  if (!parsed.success) {
    if (personalV2) return false;
    throw new PatreonApiError('membership');
  }
  if (!parsed.data.enabled) return false;
  if (!parsed.data.available) {
    if (personalV2) return false;
    throw new PatreonApiError('membership');
  }
  // A just-completed personal v2 authorization can be newer than this periodic snapshot.
  // Keep its verified tier/normal live-v2 path until the next campaign reconciliation.
  if (
    user.patreon.oauth_client_id === Deno.env.get('PATREON_V2_CLIENT_ID') &&
    user.patreon.identity_verified_at &&
    parsed.data.observed_at &&
    Date.parse(user.patreon.identity_verified_at) > Date.parse(parsed.data.observed_at)
  )
    return false;
  user.patreon.tier = parsed.data.tier ?? undefined;
  user.patreon.membership_verified_at = parsed.data.observed_at;
  return true;
}

/** One fenced sync publishes only a complete campaign scan. Renewal follows current
 * Patreon tiers, including paid-through cancellations, annual plans, gifts, and trials. */
export async function syncCreatorMemberships(client: SupabaseClient): Promise<{ members: number; pages: number }> {
  const lease = crypto.randomUUID();
  const parsed = credential.safeParse(await rpc(client, 'patreon_creator_acquire', { p_lease: lease }));
  if (!parsed.success) throw new PatreonApiError('membership');
  let tokens = parsed.data;
  let refreshed = false;
  try {
    patreonClient(tokens.client_id);
    const refresh = async (): Promise<void> => {
      if (
        refreshed ||
        (await rpc(client, 'patreon_creator_begin_refresh', {
          p_lease: lease,
        })) !== true
      )
        throw new PatreonApiError('membership');
      refreshed = true;
      // An ambiguous provider exchange stays blocked in the durable store; do not replay.
      const rotated = await refreshPatreonToken(tokens.refresh_token, tokens.client_id);
      tokens = {
        client_id: tokens.client_id,
        access_token: rotated.access_token,
        refresh_token: rotated.refresh_token,
        expires_at: rotated.expires_in ? Date.now() + rotated.expires_in * 1000 : null,
        ...(rotated.oauth_scopes ? { oauth_scopes: rotated.oauth_scopes } : {}),
      };
      let saved = false;
      for (let attempt = 0; attempt < 3 && !saved; attempt++) {
        try {
          saved =
            (await rpc(client, 'patreon_creator_save', {
              p_lease: lease,
              p_tokens: tokens,
            })) === true;
        } catch {
          /* Retry only this idempotent persistence, never the OAuth exchange. */
        }
      }
      if (!saved) throw new PatreonApiError('membership');
      if (tokens.oauth_scopes && !tokens.oauth_scopes.includes('campaigns.members'))
        throw new PatreonApiError('membership');
    };
    if (tokens.expires_at && tokens.expires_at < Date.now() + 300_000) await refresh();
    let snapshot;
    try {
      snapshot = await fetchCreatorMemberships(tokens.access_token);
    } catch (error) {
      if (!(error instanceof PatreonApiError) || error.status !== 401 || refreshed) throw error;
      await refresh();
      snapshot = await fetchCreatorMemberships(tokens.access_token);
    }
    if (
      (await rpc(client, 'patreon_creator_publish', {
        p_lease: lease,
        p_members: snapshot.members,
        p_unidentified: snapshot.unidentified,
      })) !== true
    )
      throw new PatreonApiError('membership');
    return { members: snapshot.count, pages: snapshot.pages };
  } finally {
    try {
      await rpc(client, 'patreon_creator_release', { p_lease: lease });
    } catch {
      /* The lease expires; pending rotations remain blocked. */
    }
  }
}
