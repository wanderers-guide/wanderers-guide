// Covers the update-* pattern, plus verifying that forbidden keys are stripped,
// plus the optimistic-concurrency guard (expected_updated_at): success, genuine
// conflict, and the RLS-denied cases that must NOT be reported as conflicts
// (a misreport makes read-only viewers merge-and-retry in an infinite loop).

import { assertEquals, assert } from 'https://deno.land/std@0.203.0/assert/mod.ts';
import { ANON_KEY, admin, callFunction, seed, stackUnavailable } from './seed.ts';

const skip = stackUnavailable();

/** Create (or reuse) a second authenticated user — a NON-owner for RLS tests. */
async function ensureSecondUser(): Promise<{ jwt: string }> {
  const email = 'test-second@wanderersguide.app';
  const password = 'test1234';
  const { error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createError && !/already|exists|registered/i.test(createError.message)) {
    throw createError;
  }
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.7.1');
  const anon = createClient(
    Deno.env.get('PUBLIC_SUPABASE_URL') ?? Deno.env.get('SUPABASE_URL') ?? 'http://127.0.0.1:54321',
    ANON_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
  const { data, error } = await anon.auth.signInWithPassword({ email, password });
  if (error || !data?.session) throw error ?? new Error('second user sign-in failed');
  return { jwt: data.session.access_token };
}

Deno.test({
  name: 'update-character: changes name and persists',
  ignore: skip,
  async fn() {
    const { userId, jwt } = await seed();
    const { data: char } = await admin
      .from('character')
      .insert({ name: 'Before', user_id: userId, level: 1, experience: 0 })
      .select()
      .single();
    assert(char);

    try {
      const result = await callFunction(
        'update-character',
        { id: char.id, name: 'After' },
        { token: jwt }
      );
      assertEquals(result.status, 200);
      assertEquals(result.body?.status, 'success');

      const { data: refreshed } = await admin
        .from('character')
        .select('name')
        .eq('id', char.id)
        .single();
      assertEquals(refreshed?.name, 'After');
    } finally {
      await admin.from('character').delete().eq('id', char.id);
    }
  },
});

Deno.test({
  name: 'update-character: forbidden keys (id, created_at) are not overwritten',
  ignore: skip,
  async fn() {
    const { userId, jwt } = await seed();
    const { data: char } = await admin
      .from('character')
      .insert({ name: 'Untouched ID', user_id: userId, level: 1, experience: 0 })
      .select()
      .single();
    assert(char);
    const originalCreated = char.created_at;

    try {
      const result = await callFunction(
        'update-character',
        {
          id: char.id,
          name: 'Updated',
          created_at: '1970-01-01T00:00:00Z',
        },
        { token: jwt }
      );
      assertEquals(result.status, 200);
      const { data: refreshed } = await admin
        .from('character')
        .select('id, name, created_at')
        .eq('id', char.id)
        .single();
      assertEquals(refreshed?.id, char.id);
      assertEquals(refreshed?.name, 'Updated');
      assertEquals(refreshed?.created_at, originalCreated);
    } finally {
      await admin.from('character').delete().eq('id', char.id);
    }
  },
});

Deno.test({
  name: 'update-character: guarded write with a fresh token succeeds and bumps updated_at',
  ignore: skip,
  async fn() {
    const { userId, jwt } = await seed();
    const { data: char } = await admin
      .from('character')
      .insert({ name: 'Guarded', user_id: userId, level: 1, experience: 0 })
      .select()
      .single();
    assert(char);
    assert(char.updated_at, 'updated_at column must exist (migration applied)');

    try {
      const result = await callFunction(
        'update-character',
        { id: char.id, name: 'Guarded v2', expected_updated_at: char.updated_at },
        { token: jwt }
      );
      assertEquals(result.status, 200);
      assertEquals(result.body?.status, 'success');
      const rows = result.body?.data;
      assert(Array.isArray(rows) && rows.length === 1, 'guarded success returns the row');
      assertEquals(rows[0].name, 'Guarded v2');
      assert(rows[0].updated_at !== char.updated_at, 'trigger must bump updated_at');
    } finally {
      await admin.from('character').delete().eq('id', char.id);
    }
  },
});

Deno.test({
  name: 'update-character: stale token returns __conflict with the current row (no overwrite)',
  ignore: skip,
  async fn() {
    const { userId, jwt } = await seed();
    const { data: char } = await admin
      .from('character')
      .insert({ name: 'Conflicted', user_id: userId, level: 1, experience: 0 })
      .select()
      .single();
    assert(char);

    try {
      // A concurrent writer bumps the row after our snapshot.
      const { data: bumped } = await admin
        .from('character')
        .update({ name: 'Concurrent Write' })
        .eq('id', char.id)
        .select()
        .single();
      assert(bumped && bumped.updated_at !== char.updated_at);

      const result = await callFunction(
        'update-character',
        { id: char.id, name: 'Stale Write', expected_updated_at: char.updated_at },
        { token: jwt }
      );
      assertEquals(result.status, 200);
      assertEquals(result.body?.status, 'success');
      assertEquals(result.body?.data?.__conflict, true);
      assertEquals(result.body?.data?.character?.name, 'Concurrent Write');
      assertEquals(result.body?.data?.character?.updated_at, bumped.updated_at);

      // The stale write must NOT have been applied.
      const { data: after } = await admin
        .from('character')
        .select('name')
        .eq('id', char.id)
        .single();
      assertEquals(after?.name, 'Concurrent Write');
    } finally {
      await admin.from('character').delete().eq('id', char.id);
    }
  },
});

Deno.test({
  name: 'update-character: read-only viewer of a public character gets __forbidden, not __conflict',
  ignore: skip,
  async fn() {
    const { userId } = await seed();
    const { data: char } = await admin
      .from('character')
      .insert({
        name: 'Public Char',
        user_id: userId,
        level: 1,
        experience: 0,
        options: { is_public: true },
      })
      .select()
      .single();
    assert(char);

    try {
      // Anonymous viewer (browser sends the anon key as the bearer token).
      const anonResult = await callFunction(
        'update-character',
        { id: char.id, name: 'Anon Write', expected_updated_at: char.updated_at },
        { token: ANON_KEY }
      );
      assertEquals(anonResult.status, 200);
      assertEquals(anonResult.body?.status, 'success');
      assertEquals(anonResult.body?.data?.__forbidden, true, 'anon viewer must get __forbidden');
      assertEquals(anonResult.body?.data?.__conflict, undefined);

      // Authenticated NON-owner viewer.
      const { jwt: otherJwt } = await ensureSecondUser();
      const otherResult = await callFunction(
        'update-character',
        { id: char.id, name: 'Other Write', expected_updated_at: char.updated_at },
        { token: otherJwt }
      );
      assertEquals(otherResult.status, 200);
      assertEquals(otherResult.body?.data?.__forbidden, true, 'non-owner must get __forbidden');

      // Neither write applied; token untouched (RLS denial must not bump the row).
      const { data: after } = await admin
        .from('character')
        .select('name, updated_at')
        .eq('id', char.id)
        .single();
      assertEquals(after?.name, 'Public Char');
      assertEquals(after?.updated_at, char.updated_at);
    } finally {
      await admin.from('character').delete().eq('id', char.id);
    }
  },
});

Deno.test({
  name: 'update-character: guarded write on an invisible character gets __forbidden (NOT_VISIBLE)',
  ignore: skip,
  async fn() {
    const { userId } = await seed();
    // Private character — a stranger can neither UPDATE nor SELECT it.
    const { data: char } = await admin
      .from('character')
      .insert({ name: 'Private Char', user_id: userId, level: 1, experience: 0 })
      .select()
      .single();
    assert(char);

    try {
      const { jwt: otherJwt } = await ensureSecondUser();
      const result = await callFunction(
        'update-character',
        { id: char.id, name: 'Sneaky Write', expected_updated_at: char.updated_at },
        { token: otherJwt }
      );
      assertEquals(result.status, 200);
      assertEquals(result.body?.data?.__forbidden, true);
      assertEquals(result.body?.data?.reason, 'NOT_VISIBLE');
    } finally {
      await admin.from('character').delete().eq('id', char.id);
    }
  },
});
