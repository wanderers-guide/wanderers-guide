/** Local database tests for the service-only, atomic work budget. Never call paid providers. */
import { assert, assertEquals } from 'https://deno.land/std@0.203.0/assert/mod.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { admin, ANON_KEY, callFunction, ensureTestUser, stackUnavailable } from './seed.ts';
const url = Deno.env.get('PUBLIC_SUPABASE_URL') ?? Deno.env.get('SUPABASE_URL') ?? 'http://127.0.0.1:54321';
const skip = stackUnavailable();

Deno.test({
  name: 'work budget: concurrent reservations never overspend; denied calls do not debit global budget',
  ignore: skip,
  async fn() {
    assert(['127.0.0.1', 'localhost'].includes(new URL(url).hostname), 'Quota mutation tests require the local stack');
    const actor = `test:${crypto.randomUUID()}`;
    const reserve = (units: number) =>
      admin.rpc('consume_edge_work_budget', {
        p_resource: 'ai',
        p_actor: actor,
        p_units: units,
      });
    try {
      const responses = await Promise.all(Array.from({ length: 20 }, () => reserve(7)));
      for (const response of responses) assertEquals(response.error, null);
      assertEquals(responses.filter((response) => response.data === true).length, 14);
      const { data: account } = await admin
        .from('edge_work_budget')
        .select('used')
        .eq('resource', 'ai')
        .eq('actor', actor)
        .single();
      assertEquals(account?.used, 98);
      const { data: before } = await admin
        .from('edge_work_budget')
        .select('used')
        .eq('resource', 'ai')
        .eq('actor', '*')
        .single();
      assertEquals((await reserve(3)).data, false);
      const { data: after } = await admin
        .from('edge_work_budget')
        .select('used')
        .eq('resource', 'ai')
        .eq('actor', '*')
        .single();
      assertEquals(after?.used, before?.used);
      const { error: resetError } = await admin
        .from('edge_work_budget')
        .update({ window_start: '2000-01-01', used: 100 })
        .eq('resource', 'ai')
        .eq('actor', actor);
      assertEquals(resetError, null);
      assertEquals((await reserve(1)).data, true, 'An expired actor window must renew');
      assert((await reserve(0)).error, 'Zero-unit work cannot bypass the budget');
    } finally {
      await admin.from('edge_work_budget').delete().eq('actor', actor);
    }
  },
});

Deno.test({
  name: 'work budget: anon and authenticated roles cannot inspect, mutate or invoke the quota',
  ignore: skip,
  async fn() {
    const { jwt } = await ensureTestUser();
    for (const token of [ANON_KEY, jwt]) {
      const client = createClient(url, ANON_KEY, {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { persistSession: false, autoRefreshToken: false },
      });
      assert((await client.from('edge_work_budget').select('*').limit(1)).error);
      assert(
        (
          await client.from('edge_work_budget').insert({
            resource: 'ai',
            actor: 'forbidden',
            window_start: '2026-09-05',
            used: 0,
          })
        ).error
      );
      assert(
        (
          await client.rpc('consume_edge_work_budget', {
            p_resource: 'ai',
            p_actor: 'forbidden',
            p_units: 1,
          })
        ).error
      );
    }
  },
});

Deno.test({
  name: 'costly handlers: the public anon key is denied before any provider work',
  ignore: skip,
  async fn() {
    for (const [endpoint, body] of [
      ['open-ai-request', { content: 'fixture' }],
      ['vector-db-populate-collection', { collection: 'name', type: 'spell', ids: [1] }],
      ['vector-db-query-collection', { collection: 'name', query: 'fixture' }],
    ] as const) {
      const result = await callFunction(endpoint, body, { token: ANON_KEY });
      assertEquals(result.status, 401);
      assertEquals(result.body?.status, 'fail');
    }
  },
});
