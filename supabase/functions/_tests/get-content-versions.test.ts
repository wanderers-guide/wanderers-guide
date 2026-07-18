// Covers the get-content-versions freshness probe and the updated_at trigger
// machinery from migration 20260718000000: stamp-on-edit, no-op suppression
// (idempotent bot re-applies must not move tokens), and the child-to-source
// roll-up that powers client cache invalidation.

import { assert, assertEquals, assertNotEquals } from 'https://deno.land/std@0.203.0/assert/mod.ts';
import { admin, assertSuccess, callFunction, seed, stackUnavailable, testUuid, withContentSource } from './seed.ts';

const skip = stackUnavailable();

// The bot-path test drives the real update-content-update flow, which
// authenticates the shared CONTENT_UPDATE_KEY. Skip (don't fail) when it isn't
// configured, matching update-content-update.test.ts.
const CONTENT_UPDATE_KEY = Deno.env.get('CONTENT_UPDATE_KEY') ?? '';
const skipBot = skip || !CONTENT_UPDATE_KEY;

/** Read a source's change token (updated_at) directly from the DB. */
async function getSourceToken(sourceId: number): Promise<string> {
  const { data, error } = await admin
    .from('content_source')
    .select('updated_at')
    .eq('id', sourceId)
    .single();
  if (error || !data?.updated_at) throw error ?? new Error(`no updated_at for source ${sourceId}`);
  return data.updated_at as string;
}

/** Insert a minimal spell into the given source, returning the row. */
async function insertTestSpell(sourceId: number, name: string) {
  const { data: spell, error } = await admin
    .from('spell')
    .insert({
      name,
      description: 'Test spell.',
      rank: 1,
      traditions: ['arcane'],
      traits: [],
      content_source_id: sourceId,
      uuid: testUuid(),
      version: '1.0.0',
    })
    .select()
    .single();
  if (error || !spell) throw error ?? new Error('failed to insert test spell');
  return spell;
}

Deno.test({
  name: 'get-content-versions: rejects missing, empty, oversized, and non-numeric ids',
  ignore: skip,
  async fn() {
    const { apiKey } = await seed();

    for (const body of [
      {},
      { ids: [] },
      { ids: Array.from({ length: 501 }, (_, i) => i + 1) },
      { ids: ['1', '2'] },
      { ids: [1, NaN] },
    ]) {
      const result = await callFunction('get-content-versions', body, { token: apiKey });
      assertEquals(result.status, 200, `unexpected HTTP status for ${JSON.stringify(body).slice(0, 60)}`);
      assertEquals(result.body?.status, 'fail', `expected JSend fail for ${JSON.stringify(body).slice(0, 60)}`);
    }
  },
});

Deno.test({
  name: 'get-content-versions: returns id/updated_at pairs for existing sources only',
  ignore: skip,
  async fn() {
    const { userId, apiKey } = await seed();

    await withContentSource(userId, async (sourceId) => {
      const result = await callFunction(
        'get-content-versions',
        { ids: [sourceId, 999999999] },
        { token: apiKey }
      );
      const data = assertSuccess<Array<{ id: number; updated_at: string }>>(result);
      assert(Array.isArray(data), `expected array, got ${JSON.stringify(data)?.slice(0, 120)}`);
      assertEquals(data.length, 1, 'bogus id must not produce an entry');
      assertEquals(data[0].id, sourceId);
      assert(typeof data[0].updated_at === 'string' && data[0].updated_at.length > 0);
      // Only the token pair, never full source rows — the endpoint exists to be tiny.
      assertEquals(Object.keys(data[0]).sort(), ['id', 'updated_at']);
    });
  },
});

Deno.test({
  name: 'updated_at triggers: child insert, real update, and delete bump the source token; no-op update does not',
  ignore: skip,
  async fn() {
    const { userId } = await seed();

    await withContentSource(userId, async (sourceId) => {
      const tokenAtStart = await getSourceToken(sourceId);

      // INSERT bumps the parent.
      const spell = await insertTestSpell(sourceId, 'Token Test Spell');
      const tokenAfterInsert = await getSourceToken(sourceId);
      assertNotEquals(tokenAfterInsert, tokenAtStart, 'child INSERT must bump the source token');

      // No-op UPDATE (identical values, the idempotent bot re-apply shape) bumps nothing.
      const { error: noopError } = await admin
        .from('spell')
        .update({ name: 'Token Test Spell', description: 'Test spell.' })
        .eq('id', spell.id);
      assert(!noopError, `no-op update failed: ${noopError?.message}`);
      const { data: spellAfterNoop } = await admin
        .from('spell')
        .select('updated_at')
        .eq('id', spell.id)
        .single();
      assertEquals(spellAfterNoop?.updated_at, spell.updated_at, 'no-op update must not stamp the row');
      assertEquals(await getSourceToken(sourceId), tokenAfterInsert, 'no-op update must not bump the source token');

      // Real UPDATE stamps the row and bumps the parent.
      const { error: updateError } = await admin
        .from('spell')
        .update({ description: 'Edited test spell.' })
        .eq('id', spell.id);
      assert(!updateError, `update failed: ${updateError?.message}`);
      const { data: spellAfterEdit } = await admin
        .from('spell')
        .select('updated_at')
        .eq('id', spell.id)
        .single();
      assertNotEquals(spellAfterEdit?.updated_at, spell.updated_at, 'real update must stamp the row');
      const tokenAfterEdit = await getSourceToken(sourceId);
      assertNotEquals(tokenAfterEdit, tokenAfterInsert, 'real update must bump the source token');

      // DELETE bumps the parent.
      const { error: deleteError } = await admin.from('spell').delete().eq('id', spell.id);
      assert(!deleteError, `delete failed: ${deleteError?.message}`);
      assertNotEquals(await getSourceToken(sourceId), tokenAfterEdit, 'child DELETE must bump the source token');
    });
  },
});

Deno.test({
  name: 'updated_at triggers: moving content between sources bumps BOTH source tokens',
  ignore: skip,
  async fn() {
    const { userId } = await seed();

    await withContentSource(userId, async (sourceA) => {
      await withContentSource(userId, async (sourceB) => {
        const spell = await insertTestSpell(sourceA, 'Migrating Spell');
        const tokenA = await getSourceToken(sourceA);
        const tokenB = await getSourceToken(sourceB);

        const { error } = await admin.from('spell').update({ content_source_id: sourceB }).eq('id', spell.id);
        assert(!error, `move failed: ${error?.message}`);

        // The old source lost content and the new one gained it; subscribers of
        // EITHER must see their cache invalidate.
        assertNotEquals(await getSourceToken(sourceA), tokenA, 'old source must bump on move-out');
        assertNotEquals(await getSourceToken(sourceB), tokenB, 'new source must bump on move-in');
      });
    });
  },
});

Deno.test({
  name: 'updated_at is server-owned: an echoed stale value via the HTTP create path is ignored',
  ignore: skip,
  async fn() {
    const { userId, apiKey } = await seed();

    await withContentSource(userId, async (sourceId) => {
      // A client (or replayed payload) sending its own updated_at must never win:
      // insertData strips it, so the column default stamps the row.
      const poisoned = '2000-01-01T00:00:00+00:00';
      const result = await callFunction(
        'create-spell',
        {
          name: 'Echo Test Spell',
          description: 'Test spell.',
          rank: 1,
          traditions: ['arcane'],
          traits: [],
          content_source_id: sourceId,
          version: '1.0.0',
          updated_at: poisoned,
        },
        { token: apiKey }
      );
      const created = assertSuccess<{ id: number }>(result, 'create-spell should succeed');

      const { data: row } = await admin.from('spell').select('updated_at').eq('id', created.id).single();
      assert(row?.updated_at, 'row should carry updated_at');
      assertNotEquals(row.updated_at, poisoned, 'echoed updated_at must not be written');
      assert(new Date(row.updated_at).getFullYear() >= 2026, 'updated_at must be a fresh server stamp');
    });
  },
});

Deno.test({
  name: 'updated_at triggers: a real bot APPROVE apply bumps the source token and ignores an echoed stale updated_at',
  ignore: skipBot,
  async fn() {
    const { userId } = await seed();

    await withContentSource(userId, async (sourceId) => {
      const { data: trait } = await admin
        .from('trait')
        .insert({ name: 'Token Before', description: 'old desc', content_source_id: sourceId, uuid: testUuid() })
        .select()
        .single();
      assert(trait, 'seed trait');
      const tokenBefore = await getSourceToken(sourceId);

      // The bot replays stored full-row payloads, so a stale updated_at echo in
      // the approved data is the realistic shape of the token-rewind hazard.
      const poisoned = '2000-01-01T00:00:00+00:00';
      const msgId = `test-cv-${crypto.randomUUID()}`;
      const { data: cu, error: cuError } = await admin
        .from('content_update')
        .insert({
          upvotes: [],
          downvotes: [],
          status: { state: 'PENDING' },
          user_id: userId,
          type: 'trait',
          ref_id: trait.id,
          content_source_id: sourceId,
          action: 'UPDATE',
          data: { name: 'Token After', description: 'new desc', updated_at: poisoned },
          discord_msg_id: msgId,
        })
        .select()
        .single();
      assert(cu && !cuError, `seed content_update failed: ${cuError?.message}`);

      try {
        await callFunction(
          'update-content-update',
          { discord_msg_id: msgId, discord_user_id: 'mod-1', discord_user_name: 'Mod One', state: 'APPROVE' },
          { token: CONTENT_UPDATE_KEY }
        );

        // Assert on DB state (the embeddings step may fail locally but runs after
        // the writes commit), matching update-content-update.test.ts.
        const { data: after } = await admin.from('trait').select('name, updated_at').eq('id', trait.id).single();
        assertEquals(after?.name, 'Token After', 'bot apply should update the trait');
        assertNotEquals(after?.updated_at, poisoned, 'echoed updated_at must not rewind the row');
        assertNotEquals(after?.updated_at, trait.updated_at, 'bot apply must stamp the row');

        assertNotEquals(await getSourceToken(sourceId), tokenBefore, 'bot apply must bump the source token');
      } finally {
        await admin.from('content_update').delete().eq('id', cu.id);
        await admin.from('trait').delete().eq('id', trait.id);
      }
    });
  },
});
