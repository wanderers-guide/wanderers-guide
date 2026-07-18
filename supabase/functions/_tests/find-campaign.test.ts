// Guards the campaign join_key exposure fix (migration 20260717000001 + find-campaign
// rewrite). Properties:
//   1. The OWNER of a campaign receives its join_key (the "reveal join key" UI needs it).
//   2. A NON-owner reading the campaign by id gets its public fields but NOT join_key.
//   3. A caller who supplies the exact join_key (the join flow) receives the campaign.
//   4. An empty request body returns nothing (no mass enumeration of all campaigns).
//   5. The anon key cannot read the join_key column over PostgREST directly.

import { assert, assertEquals } from 'https://deno.land/std@0.203.0/assert/mod.ts';
import { ANON_KEY, admin, callFunction, ensureTestUser, stackUnavailable } from './seed.ts';

const SUPABASE_URL =
  Deno.env.get('PUBLIC_SUPABASE_URL') ?? Deno.env.get('SUPABASE_URL') ?? 'http://127.0.0.1:54321';

const skip = stackUnavailable();

async function seedCampaign(userId: string, joinKey: string) {
  const { data, error } = await admin
    .from('campaign')
    .insert({ user_id: userId, name: `test-camp-${crypto.randomUUID().slice(0, 8)}`, join_key: joinKey })
    .select()
    .single();
  if (error || !data) throw error ?? new Error('failed to seed campaign');
  return data;
}

// campaign.user_id is a FK to auth.users, so a "stranger" owner must be a real user.
async function createStranger(): Promise<string> {
  const email = `stranger-${crypto.randomUUID().slice(0, 8)}@wanderersguide.test`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: 'test1234',
    email_confirm: true,
  });
  if (error || !data?.user) throw error ?? new Error('failed to create stranger user');
  return data.user.id;
}

Deno.test({
  name: 'find-campaign: the owner receives their campaign’s join_key',
  ignore: skip,
  async fn() {
    const { userId, jwt } = await ensureTestUser();
    const key = `ownerkey-${crypto.randomUUID().slice(0, 8)}`;
    const camp = await seedCampaign(userId, key);
    try {
      const res = await callFunction('find-campaign', { id: camp.id }, { token: jwt });
      assertEquals(res.body?.status, 'success');
      const found = (res.body?.data ?? []).find((c: { id: number }) => c.id === camp.id);
      assert(found, 'owner should see their own campaign');
      assertEquals(found.join_key, key, 'owner must receive join_key');
    } finally {
      await admin.from('campaign').delete().eq('id', camp.id);
    }
  },
});

Deno.test({
  name: 'find-campaign: a non-owner does NOT receive join_key (but sees public fields)',
  ignore: skip,
  async fn() {
    const { jwt } = await ensureTestUser();
    const strangerId = await createStranger(); // a campaign owned by someone else
    const key = `secretkey-${crypto.randomUUID().slice(0, 8)}`;
    const camp = await seedCampaign(strangerId, key);
    try {
      const res = await callFunction('find-campaign', { id: camp.id }, { token: jwt });
      assertEquals(res.body?.status, 'success');
      const found = (res.body?.data ?? []).find((c: { id: number }) => c.id === camp.id);
      assert(found, 'non-owner can still read campaign metadata');
      assertEquals(found.join_key, undefined, 'non-owner must NOT receive join_key');
      assert(found.name, 'campaign name is still readable');
    } finally {
      await admin.from('campaign').delete().eq('id', camp.id);
      await admin.auth.admin.deleteUser(strangerId);
    }
  },
});

Deno.test({
  name: 'find-campaign: supplying the exact join_key returns the campaign (join flow)',
  ignore: skip,
  async fn() {
    const { jwt } = await ensureTestUser();
    const strangerId = await createStranger();
    const key = `joinkey-${crypto.randomUUID().slice(0, 8)}`;
    const camp = await seedCampaign(strangerId, key);
    try {
      const res = await callFunction('find-campaign', { join_key: key }, { token: jwt });
      assertEquals(res.body?.status, 'success');
      const found = (res.body?.data ?? []).find((c: { id: number }) => c.id === camp.id);
      assert(found, 'join-by-key must find the campaign');
      assertEquals(found.join_key, key, 'the caller who supplied the key receives it back');
    } finally {
      await admin.from('campaign').delete().eq('id', camp.id);
      await admin.auth.admin.deleteUser(strangerId);
    }
  },
});

Deno.test({
  name: 'find-campaign: an empty body returns nothing (no mass enumeration)',
  ignore: skip,
  async fn() {
    const { jwt } = await ensureTestUser();
    const res = await callFunction('find-campaign', {}, { token: jwt });
    assertEquals(res.body?.status, 'success');
    assertEquals((res.body?.data ?? []).length, 0, 'empty body must not dump campaigns');
  },
});

Deno.test({
  name: 'find-campaign: anon REST cannot read the join_key column',
  ignore: skip,
  async fn() {
    const restHeaders = { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` };
    const res = await fetch(`${SUPABASE_URL}/rest/v1/campaign?select=join_key&limit=1`, {
      headers: restHeaders,
    });
    const body = await res.text();
    assert(res.status >= 400, `anon select of join_key must be refused, got HTTP ${res.status}: ${body}`);
  },
});
