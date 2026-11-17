import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'https://esm.sh/zod@3.24.2';
import type { PublicUser } from './content.d.ts';
import type { PatreonTokens } from './patreon-api.ts';

type PatreonLink = NonNullable<PublicUser['patreon']>;
type Account = Pick<PublicUser, 'id' | 'user_id'>;
const latestLinkSchema = z.object({
  patreon: z
    .object({
      access_token: z.string().optional(),
      refresh_token: z.string().optional(),
      oauth_client_id: z.string().optional(),
      patreon_user_id: z.string().optional(),
      revision: z.string().uuid().nullish(),
    })
    .passthrough()
    .nullable(),
});

/** Compare a nonsecret revision, including first writes, so stale operations cannot replace newer grants. */
export async function savePatreonConnection(
  client: SupabaseClient<any, 'public', any>,
  user: Account,
  previous: PublicUser['patreon'],
  next: PatreonLink
): Promise<PatreonLink | null> {
  const revision = previous?.revision ?? undefined;
  if (
    revision !== undefined &&
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(revision)
  ) {
    throw new Error('Patreon connection revision is invalid.');
  }
  const replacement: PatreonLink = { ...next, revision: crypto.randomUUID() };
  delete replacement.membership_verified_at;
  delete replacement.connection_status;
  if (replacement.game_master?.virtual_tier) {
    const virtualTier = { ...replacement.game_master.virtual_tier };
    delete virtualTier.access_status;
    replacement.game_master = { ...replacement.game_master, virtual_tier: virtualTier };
  }
  let query = client.from('public_user').update({ patreon: replacement }).eq('id', user.id).eq('user_id', user.user_id);
  query = revision ? query.eq('patreon->>revision', revision) : query.is('patreon->>revision', null);
  const { data, error } = await query.select('id');
  // Driver failures can contain request details. Keep those details out of API errors and logs.
  if (error) throw new Error('Patreon connection persistence failed.');
  return data?.some((row: { id: number }) => row.id === user.id) ? replacement : null;
}

/** Retry metadata-only conflicts without repeating refresh or overwriting a newer OAuth grant. */
export async function saveRefreshedPatreonConnection(
  client: SupabaseClient<any, 'public', any>,
  user: Account,
  previous: PatreonLink,
  tokens: PatreonTokens
): Promise<PatreonLink | null> {
  let current = previous;
  for (let attempt = 0; attempt < 3; attempt++) {
    const next = {
      ...current,
      ...tokens,
      oauth_scopes: tokens.oauth_scopes ?? current.oauth_scopes,
    };
    const saved = await savePatreonConnection(client, user, current, next);
    if (saved) return saved;
    if (attempt === 2) return null;
    const { data, error } = await client
      .from('public_user')
      .select('patreon')
      .eq('id', user.id)
      .eq('user_id', user.user_id)
      .single();
    if (error) throw new Error('Patreon connection could not be rechecked.');
    const parsed = latestLinkSchema.safeParse(data);
    if (!parsed.success || !parsed.data.patreon) return null;
    const latest = parsed.data.patreon;
    const credentialKeys: Array<keyof PatreonLink> = [
      'access_token',
      'refresh_token',
      'oauth_client_id',
      'patreon_user_id',
    ];
    if (credentialKeys.some((key) => latest[key] !== previous[key])) return null;
    // The critical credential fields are validated above; retain all server-owned group metadata.
    current = { ...latest, revision: latest.revision ?? undefined };
  }
  return null;
}
