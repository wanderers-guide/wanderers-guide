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
/** One tier mapping for personal identity and creator campaign observations. */
export function patreonTierForIds(ids: ReadonlySet<string>): PatreonTier | undefined {
  return tiers.find(([id]) => ids.has(id))?.[1];
}
export type PatreonTokens = {
  access_token: string;
  refresh_token: string;
  oauth_scopes?: string[];
  expires_in?: number;
};

/** Preserve rotated credentials even when their permissions require a new authorization. */
function parseTokens(raw: unknown): PatreonTokens {
  const parsed = tokenSchema.safeParse(raw);
  if (!parsed.success) throw new PatreonApiError('token');
  const { access_token, refresh_token } = parsed.data;
  const metadata = z.object({ scope: z.unknown().optional() }).parse(raw);
  const scopes = z.union([z.string(), z.array(z.string())]).safeParse(metadata.scope);
  const expiry = z.object({ expires_in: z.number().int().positive() }).safeParse(raw);
  return {
    access_token,
    refresh_token,
    ...(expiry.success ? { expires_in: expiry.data.expires_in } : {}),
    oauth_scopes: scopes.success
      ? Array.isArray(scopes.data)
        ? scopes.data
        : scopes.data.split(/\s+/).filter(Boolean)
      : undefined,
  };
}

/** Safe provider diagnostics; response bodies and credentials never enter errors. */
export class PatreonApiError extends Error {
  constructor(
    readonly stage: 'token' | 'identity' | 'configuration' | 'scope' | 'migration' | 'identity_mismatch' | 'membership',
    readonly status?: number
  ) {
    super('Patreon connection could not be completed.');
  }
}

/** Bound provider I/O below the frontend deadline, including response-body reads. */
export async function patreonRequest(
  path: string,
  stage: 'token' | 'identity' | 'membership',
  init: RequestInit
): Promise<unknown> {
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

/** Every grant must belong to the configured v2 client; refresh cannot migrate v1 permissions. */
export function patreonClient(clientId?: string): {
  id: string;
  secret: string;
} {
  const id = Deno.env.get('PATREON_V2_CLIENT_ID') ?? '';
  const secret = Deno.env.get('PATREON_V2_CLIENT_SECRET') ?? '';
  if (!id || !secret) throw new PatreonApiError('configuration');
  if (clientId !== undefined && clientId !== id) throw new PatreonApiError('migration');
  return { id, secret };
}

/** Exchange a one-use authorization code once; ambiguous failures must not replay it. */
export async function exchangePatreonCode(
  code: string,
  redirectURL: string
): Promise<PatreonTokens & { oauth_client_id: string }> {
  const client = patreonClient();
  const raw = await patreonRequest('/api/oauth2/token', 'token', {
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
  const tokens = parseTokens(raw);
  if (!tokens.oauth_scopes?.includes('identity')) throw new PatreonApiError('scope');
  return { ...tokens, oauth_client_id: client.id };
}

/** Refresh only v2 grants, retaining returned scope metadata for validation after persistence. */
export async function refreshPatreonToken(refreshToken: string, clientId: string): Promise<PatreonTokens> {
  const client = patreonClient(clientId);
  const raw = await patreonRequest('/api/oauth2/token', 'token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: client.id,
      client_secret: client.secret,
    }),
  });
  return parseTokens(raw);
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
  const raw = await patreonRequest(`/api/oauth2/v2/identity?${query}`, 'identity', {
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
    tier: patreonTierForIds(entitledIds),
  };
}
