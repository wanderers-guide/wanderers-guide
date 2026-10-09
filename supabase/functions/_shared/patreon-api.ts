import { z } from 'https://esm.sh/zod@3.24.2';

const tokenSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1),
});
const reference = z.object({ id: z.string().min(1), type: z.string() });
const memberSchema = z.object({
  id: z.string(),
  type: z.literal('member'),
  relationships: z.object({
    campaign: z.object({ data: reference }),
    currently_entitled_tiers: z.object({ data: z.array(reference) }),
  }),
});
const identitySchema = z.object({
  data: z.object({
    id: z.string().min(1),
    type: z.literal('user'),
    attributes: z.object({
      full_name: z.string().nullish(),
      email: z.string().nullish(),
    }),
    relationships: z.object({
      memberships: z.object({ data: z.array(reference) }),
    }),
  }),
  included: z.array(reference.passthrough()).default([]),
});
const tiers = [
  ['22622808', 'GAME-MASTER'],
  ['6299276', 'LEGEND'],
  ['5628112', 'WANDERER'],
  ['5612688', 'ADVOCATE'],
] as const;
export type PatreonTier = (typeof tiers)[number][1];
export type PatreonTokens = z.infer<typeof tokenSchema>;

/** Safe provider diagnostics; response bodies and credentials never enter errors. */
export class PatreonApiError extends Error {
  constructor(
    readonly stage: 'token' | 'identity' | 'configuration',
    readonly status?: number
  ) {
    super('Patreon connection could not be completed.');
  }
}

/** Bound provider I/O below the frontend deadline, including response-body reads. */
async function request(path: string, stage: 'token' | 'identity', init: RequestInit): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(`https://www.patreon.com${path}`, {
      ...init,
      signal: controller.signal,
      redirect: 'error',
      headers: {
        ...init.headers,
        'User-Agent': 'WanderersGuide - Patreon integration',
        Accept: 'application/json',
      },
    });
    if (!response.ok) {
      throw new PatreonApiError(stage, response.status);
    }
    return await response.json();
  } catch (error) {
    if (error instanceof PatreonApiError) throw error;
    throw new PatreonApiError(stage);
  } finally {
    clearTimeout(timer);
  }
}

/** New grants use v2 credentials; stored grants keep their original OAuth client. */
export function patreonClient(clientId?: string): {
  id: string;
  secret: string;
} {
  const legacy = {
    id: Deno.env.get('PATREON_CLIENT_ID') ?? '',
    secret: Deno.env.get('PATREON_CLIENT_SECRET') ?? '',
  };
  const v2Id = Deno.env.get('PATREON_V2_CLIENT_ID');
  const v2Secret = Deno.env.get('PATREON_V2_CLIENT_SECRET');
  if (Boolean(v2Id) !== Boolean(v2Secret)) throw new PatreonApiError('configuration');
  const current = { id: v2Id || legacy.id, secret: v2Secret || legacy.secret };
  const client =
    clientId === undefined || clientId === current.id
      ? current
      : clientId === legacy.id || clientId === ''
        ? legacy
        : null;
  if (!client?.id || !client.secret) throw new PatreonApiError('configuration');
  return client;
}

/** Exchange a one-use authorization code once; ambiguous failures must not replay it. */
export async function exchangePatreonCode(
  code: string,
  redirectURL: string
): Promise<PatreonTokens & { oauth_client_id: string }> {
  const client = patreonClient();
  const raw = await request('/api/oauth2/token', 'token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectURL,
      client_id: client.id,
      client_secret: client.secret,
    }),
  });
  const parsed = tokenSchema.safeParse(raw);
  if (!parsed.success) throw new PatreonApiError('token');
  return { ...parsed.data, oauth_client_id: client.id };
}

/** Refresh with the issuing client, including existing pre-migration grants. */
export async function refreshPatreonToken(refreshToken: string, clientId: string): Promise<PatreonTokens> {
  const client = patreonClient(clientId);
  const raw = await request('/api/oauth2/token', 'token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: client.id,
      client_secret: client.secret,
    }),
  });
  const parsed = tokenSchema.safeParse(raw);
  if (!parsed.success) throw new PatreonApiError('token');
  return parsed.data;
}

/** Read the top-level identity and only its current entitlement to WG's campaign. */
export async function fetchPatreonIdentity(accessToken: string): Promise<{
  patreon_user_id: string;
  patreon_name?: string;
  patreon_email?: string;
  tier?: PatreonTier;
}> {
  const query = new URLSearchParams({
    include: 'memberships.currently_entitled_tiers,memberships.campaign',
    'fields[user]': 'full_name,email',
  });
  const raw = await request(`/api/oauth2/v2/identity?${query}`, 'identity', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const parsed = identitySchema.safeParse(raw);
  if (!parsed.success) throw new PatreonApiError('identity');
  const { data, included } = parsed.data;
  const entitledIds = new Set<string>();
  for (const ref of data.relationships.memberships.data) {
    if (ref.type !== 'member') throw new PatreonApiError('identity');
    const member = memberSchema.safeParse(included.find((x) => x.type === 'member' && x.id === ref.id));
    if (!member.success) throw new PatreonApiError('identity');
    if (
      member.data.relationships.campaign.data.type !== 'campaign' ||
      member.data.relationships.campaign.data.id !== '4805226'
    )
      continue;
    for (const tier of member.data.relationships.currently_entitled_tiers.data) {
      if (tier.type === 'tier') entitledIds.add(tier.id);
    }
  }
  return {
    patreon_user_id: data.id,
    patreon_name: data.attributes.full_name ?? undefined,
    patreon_email: data.attributes.email ?? undefined,
    tier: tiers.find(([id]) => entitledIds.has(id))?.[1],
  };
}
