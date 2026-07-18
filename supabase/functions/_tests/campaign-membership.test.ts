// Guards the campaign-membership fix (migration 20260718000000 + the find-campaign join
// grant). A character's campaign_id may only be set to a campaign the caller owns or has a
// recent join grant for; otherwise the change is silently dropped (the existing value is
// kept) — it must NEVER reject the save. Properties:
//   1. Attaching to a stranger's campaign WITHOUT a grant is blocked (campaign_id unchanged).
//   2. After find-campaign({join_key}) creates a grant, the same attach SUCCEEDS.
//   3. Leaving (campaign_id -> null) always works.
//   4. The campaign owner can attach their own character.
//   5. A normal save that doesn't touch campaign_id is completely unaffected.

import { assert, assertEquals } from 'https://deno.land/std@0.203.0/assert/mod.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { ANON_KEY, admin, callFunction, ensureTestUser, stackUnavailable } from './seed.ts';

const SUPABASE_URL =
  Deno.env.get('PUBLIC_SUPABASE_URL') ?? Deno.env.get('SUPABASE_URL') ?? 'http://127.0.0.1:54321';
const CONTENT_UPDATE_KEY = Deno.env.get('CONTENT_UPDATE_KEY') ?? '';
const skip = stackUnavailable();

async function createStranger(): Promise<string> {
  const email = `stranger-${crypto.randomUUID().slice(0, 8)}@wanderersguide.test`;
  const { data, error } = await admin.auth.admin.createUser({ email, password: 'test1234', email_confirm: true });
  if (error || !data?.user) throw error ?? new Error('failed to create stranger');
  return data.user.id;
}
async function seedCampaign(ownerId: string, joinKey: string) {
  const { data, error } = await admin
    .from('campaign')
    .insert({ user_id: ownerId, name: `camp-${crypto.randomUUID().slice(0, 8)}`, join_key: joinKey })
    .select()
    .single();
  if (error || !data) throw error ?? new Error('failed to seed campaign');
  return data;
}
async function seedCharacter(ownerId: string) {
  const { data, error } = await admin
    .from('character')
    .insert({ user_id: ownerId, name: `char-${crypto.randomUUID().slice(0, 8)}`, level: 1 })
    .select()
    .single();
  if (error || !data) throw error ?? new Error('failed to seed character');
  return data;
}
async function campaignIdOf(characterId: number): Promise<number | null> {
  const { data } = await admin.from('character').select('campaign_id').eq('id', characterId).single();
  return data?.campaign_id ?? null;
}

Deno.test({
  name: 'campaign-membership: attach is blocked without a grant, allowed after find-campaign, and leaving always works',
  ignore: skip,
  async fn() {
    const { userId, jwt } = await ensureTestUser();
    // A client acting AS the test user (so the trigger sees auth.uid() = the user).
    const asUser = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const strangerId = await createStranger();
    const joinKey = `key-${crypto.randomUUID().slice(0, 8)}`;
    const strangerCampaign = await seedCampaign(strangerId, joinKey);
    const character = await seedCharacter(userId);

    try {
      // 1. Attack: attach my character to the stranger's campaign, no grant -> blocked.
      await asUser.from('character').update({ campaign_id: strangerCampaign.id }).eq('id', character.id);
      assertEquals(
        await campaignIdOf(character.id),
        null,
        'attaching to a stranger campaign without a grant must be dropped'
      );

      // 2. Legit join: find-campaign with the key creates a grant, then the attach succeeds.
      const res = await callFunction('find-campaign', { join_key: joinKey }, { token: jwt });
      assertEquals(res.body?.status, 'success');
      await asUser.from('character').update({ campaign_id: strangerCampaign.id }).eq('id', character.id);
      assertEquals(
        await campaignIdOf(character.id),
        strangerCampaign.id,
        'after a valid join grant, the attach must succeed'
      );

      // 3. Leaving is always allowed.
      await asUser.from('character').update({ campaign_id: null }).eq('id', character.id);
      assertEquals(await campaignIdOf(character.id), null, 'leaving a campaign must always work');
    } finally {
      await admin.from('character').delete().eq('id', character.id);
      await admin.from('campaign_join_grant').delete().eq('user_id', userId);
      await admin.from('campaign').delete().eq('id', strangerCampaign.id);
      await admin.auth.admin.deleteUser(strangerId);
    }
  },
});

Deno.test({
  name: 'campaign-membership: the campaign owner can attach, and a normal save leaves campaign_id untouched',
  ignore: skip,
  async fn() {
    const { userId, jwt } = await ensureTestUser();
    const asUser = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const ownKey = `key-${crypto.randomUUID().slice(0, 8)}`;
    const ownCampaign = await seedCampaign(userId, ownKey); // owned by the test user
    const character = await seedCharacter(userId);

    try {
      // 4. Owner attaches their own character -> allowed (no grant needed).
      await asUser.from('character').update({ campaign_id: ownCampaign.id }).eq('id', character.id);
      assertEquals(
        await campaignIdOf(character.id),
        ownCampaign.id,
        'the campaign owner must be able to attach their own character'
      );

      // 5. A normal save that changes something else leaves campaign_id untouched.
      await asUser.from('character').update({ name: 'renamed-in-test' }).eq('id', character.id);
      assertEquals(
        await campaignIdOf(character.id),
        ownCampaign.id,
        'a save that does not change campaign_id must preserve it'
      );
      const { data: after } = await admin.from('character').select('name').eq('id', character.id).single();
      assertEquals(after?.name, 'renamed-in-test', 'the rest of the save must apply normally');
    } finally {
      await admin.from('character').delete().eq('id', character.id);
      await admin.from('campaign').delete().eq('id', ownCampaign.id);
    }
  },
});
