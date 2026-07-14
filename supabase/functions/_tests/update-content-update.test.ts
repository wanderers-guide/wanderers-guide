// Covers the content-update approve flow — specifically the apply-then-approve
// ordering: a request is only marked APPROVED if the underlying content write
// actually succeeds. This is the regression guard for the reported
// "shows approved but didn't apply" bug (the status used to be flipped to
// APPROVED up front, before the content write, with no rollback on failure).

import { assertEquals, assert } from 'https://deno.land/std@0.203.0/assert/mod.ts';
import { admin, callFunction, seed, stackUnavailable, testUuid, withContentSource } from './seed.ts';

// The function authenticates a shared secret against Deno.env.get('CONTENT_UPDATE_KEY');
// the SAME value must be present in the edge runtime. Skip (don't fail) when it —
// or the local stack — isn't configured, matching helpers.test.ts.
const CONTENT_UPDATE_KEY = Deno.env.get('CONTENT_UPDATE_KEY') ?? '';
const skip = stackUnavailable() || !CONTENT_UPDATE_KEY;

async function seedContentUpdate(fields: Record<string, unknown>) {
  const { data, error } = await admin
    .from('content_update')
    .insert({ upvotes: [], downvotes: [], status: { state: 'PENDING' }, ...fields })
    .select()
    .single();
  if (error || !data) throw error ?? new Error('failed to seed content_update');
  return data;
}

Deno.test({
  name: 'update-content-update: APPROVE applies the change AND marks it approved',
  ignore: skip,
  async fn() {
    const { userId } = await seed();
    await withContentSource(userId, async (sourceId) => {
      const { data: trait } = await admin
        .from('trait')
        .insert({ name: 'Before', description: 'old desc', content_source_id: sourceId, uuid: testUuid() })
        .select()
        .single();
      assert(trait, 'seed trait');

      const msgId = `test-cu-${crypto.randomUUID()}`;
      const cu = await seedContentUpdate({
        user_id: userId,
        type: 'trait',
        ref_id: trait.id,
        content_source_id: sourceId,
        action: 'UPDATE',
        data: { name: 'After', description: 'new desc' },
        discord_msg_id: msgId,
      });

      try {
        await callFunction(
          'update-content-update',
          { discord_msg_id: msgId, discord_user_id: 'mod-1', discord_user_name: 'Mod One', state: 'APPROVE' },
          { token: CONTENT_UPDATE_KEY }
        );

        // Assert on DB state (not HTTP status): the embeddings step calls an external
        // vector-db that isn't available locally, but it runs AFTER the writes commit
        // and cannot roll them back.
        const { data: after } = await admin.from('trait').select('name').eq('id', trait.id).single();
        assertEquals(after?.name, 'After', 'trait content should be updated');

        const { data: cuAfter } = await admin.from('content_update').select('status').eq('id', cu.id).single();
        assertEquals(cuAfter?.status?.state, 'APPROVED', 'request should be marked approved');
      } finally {
        await admin.from('content_update').delete().eq('id', cu.id);
        await admin.from('trait').delete().eq('id', trait.id);
      }
    });
  },
});

Deno.test({
  name: 'update-content-update: accepts the shared key via legacy body auth_token (deployed bot format)',
  ignore: skip,
  async fn() {
    const { userId } = await seed();
    await withContentSource(userId, async (sourceId) => {
      const msgId = `test-cu-${crypto.randomUUID()}`;
      const cu = await seedContentUpdate({
        user_id: userId,
        type: 'trait',
        ref_id: 1,
        content_source_id: sourceId,
        action: 'UPDATE',
        data: { name: 'Anything' },
        discord_msg_id: msgId,
      });

      try {
        // The content-updates bot sends the key in the body, not the Authorization
        // header. The header-only check (deployed 2026-07-12) rejected every bot call
        // as "Invalid auth token", freezing all approvals/votes — this is the guard.
        const res = await callFunction('update-content-update', {
          auth_token: CONTENT_UPDATE_KEY,
          discord_msg_id: msgId,
          discord_user_id: 'voter-1',
          discord_user_name: 'Voter One',
          state: 'UPVOTE',
        });
        assertEquals(res.body?.status, 'success', `body-token auth must pass: ${JSON.stringify(res.body)}`);

        const { data: after } = await admin
          .from('content_update')
          .select('upvotes')
          .eq('id', cu.id)
          .single();
        assertEquals(after?.upvotes?.length, 1, 'upvote should be recorded');
      } finally {
        await admin.from('content_update').delete().eq('id', cu.id);
      }
    });
  },
});

Deno.test({
  name: 'update-content-update: rejects a wrong key in both header and body',
  ignore: skip,
  async fn() {
    const res = await callFunction(
      'update-content-update',
      {
        auth_token: 'wrong-key',
        discord_msg_id: 'irrelevant',
        discord_user_id: 'x',
        discord_user_name: 'x',
        state: 'UPVOTE',
      },
      { token: 'also-wrong' }
    );
    assertEquals(res.body?.status, 'fail');
    assertEquals(res.body?.data?.message, 'Invalid auth token');
  },
});

Deno.test({
  name: 'update-content-update: a failed apply is NOT marked approved (apply-then-approve regression)',
  ignore: skip,
  async fn() {
    const { userId } = await seed();
    await withContentSource(userId, async (sourceId) => {
      const { data: trait } = await admin
        .from('trait')
        .insert({ name: 'Unchanged', description: 'keep', content_source_id: sourceId, uuid: testUuid() })
        .select()
        .single();
      assert(trait, 'seed trait');

      const msgId = `test-cu-${crypto.randomUUID()}`;
      // data.name = null violates trait.name's NOT NULL constraint, so the content
      // write fails. Under the OLD ordering the request would already have been
      // flipped to APPROVED before this point — the exact "approved but not applied" bug.
      const cu = await seedContentUpdate({
        user_id: userId,
        type: 'trait',
        ref_id: trait.id,
        content_source_id: sourceId,
        action: 'UPDATE',
        data: { name: null },
        discord_msg_id: msgId,
      });

      try {
        const res = await callFunction(
          'update-content-update',
          { discord_msg_id: msgId, discord_user_id: 'mod-1', discord_user_name: 'Mod One', state: 'APPROVE' },
          { token: CONTENT_UPDATE_KEY }
        );

        // The function must not report success when the apply failed...
        assert(res.body?.status !== 'success', `expected non-success, got ${JSON.stringify(res.body)}`);

        // ...the request must NOT be left approved (the core regression assertion)...
        const { data: cuAfter } = await admin.from('content_update').select('status').eq('id', cu.id).single();
        assert(cuAfter?.status?.state !== 'APPROVED', 'must not be approved when the apply failed');

        // ...and the content must be untouched.
        const { data: after } = await admin.from('trait').select('name').eq('id', trait.id).single();
        assertEquals(after?.name, 'Unchanged', 'content must be unchanged on a failed apply');
      } finally {
        await admin.from('content_update').delete().eq('id', cu.id);
        await admin.from('trait').delete().eq('id', trait.id);
      }
    });
  },
});
