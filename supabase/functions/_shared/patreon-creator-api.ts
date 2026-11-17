import { z } from 'https://esm.sh/zod@3.24.2';
import { PatreonApiError, patreonRequest, patreonTierForIds } from './patreon-api.ts';

export const WG_PATREON_CAMPAIGN = '4805226';
const ref = (type: string) => z.object({ id: z.string().min(1), type: z.literal(type) });
const member = z.object({
  id: z.string().min(1),
  type: z.literal('member'),
  attributes: z.object({
    next_charge_date: z.string().nullable().optional(),
    last_charge_date: z.string().nullable().optional(),
    last_charge_status: z.string().nullable().optional(),
    patron_status: z.string().nullable().optional(),
  }),
  relationships: z.object({
    user: z.object({ data: ref('user').nullable() }),
    campaign: z.object({ data: ref('campaign') }),
    currently_entitled_tiers: z.object({ data: z.array(ref('tier')) }),
  }),
});
const page = z.object({
  data: z.array(member),
  meta: z.object({
    pagination: z.object({
      cursors: z.object({ next: z.string().min(1).nullish() }).optional(),
      total: z.number().int().nonnegative().optional(),
    }),
  }),
  links: z.object({ next: z.string().nullable().optional() }).optional(),
});
export type CreatorObservation = {
  member_id: string;
  tier: ReturnType<typeof patreonTierForIds> | null;
  next_charge_date: string | null;
  last_charge_date: string | null;
  last_charge_status: string | null;
  patron_status: string | null;
};
export type CreatorSnapshot = {
  members: Record<string, CreatorObservation>;
  unidentified: boolean;
  pages: number;
  count: number;
};

/** Finish every cursor before publishing anything. Dates/status never override paid-through tiers. */
export async function fetchCreatorMemberships(accessToken: string): Promise<CreatorSnapshot> {
  const members: CreatorSnapshot['members'] = Object.create(null);
  const seen = new Set<string>();
  const memberIds = new Set<string>();
  let cursor: string | undefined;
  let unidentified = false;
  let pages = 0;
  let count = 0;
  const deadline = Date.now() + 75_000;
  do {
    if (++pages > 60 || Date.now() > deadline) throw new PatreonApiError('membership');
    const query = new URLSearchParams({
      include: 'user,campaign,currently_entitled_tiers',
      'fields[member]': 'next_charge_date,last_charge_date,last_charge_status,patron_status',
      'page[count]': '1000',
    });
    if (cursor) query.set('page[cursor]', cursor);
    const raw = await patreonRequest(`/api/oauth2/v2/campaigns/${WG_PATREON_CAMPAIGN}/members?${query}`, 'membership', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const parsed = page.safeParse(raw);
    if (!parsed.success) throw new PatreonApiError('membership');
    for (const record of parsed.data.data) {
      if (record.relationships.campaign.data.id !== WG_PATREON_CAMPAIGN || memberIds.has(record.id))
        throw new PatreonApiError('membership');
      memberIds.add(record.id);
      count++;
      const userId = record.relationships.user.data?.id;
      if (!userId) {
        unidentified = true;
        continue;
      }
      if (Object.hasOwn(members, userId)) throw new PatreonApiError('membership');
      const ids = new Set(record.relationships.currently_entitled_tiers.data.map((x) => x.id));
      members[userId] = {
        member_id: record.id,
        tier: patreonTierForIds(ids) ?? null,
        next_charge_date: record.attributes.next_charge_date ?? null,
        last_charge_date: record.attributes.last_charge_date ?? null,
        last_charge_status: record.attributes.last_charge_status ?? null,
        patron_status: record.attributes.patron_status ?? null,
      };
    }
    cursor = parsed.data.meta.pagination.cursors?.next ?? undefined;
    if (!cursor && parsed.data.links?.next) throw new PatreonApiError('membership');
    if (cursor) {
      if (seen.has(cursor)) throw new PatreonApiError('membership');
      seen.add(cursor);
      // Respect the token's 100 requests/minute limit, without following provider-supplied URLs.
      await new Promise((resolve) => setTimeout(resolve, 650));
    } else if (parsed.data.meta.pagination.total !== undefined && count !== parsed.data.meta.pagination.total) {
      throw new PatreonApiError('membership');
    }
  } while (cursor);
  return { members, unidentified, pages, count };
}
