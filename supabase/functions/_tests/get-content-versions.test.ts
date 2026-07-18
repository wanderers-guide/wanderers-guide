// Covers the get-content-versions freshness probe and the updated_at trigger
// machinery from migration 20260718000000: stamp-on-edit, no-op suppression
// (idempotent bot re-applies must not move tokens), and the child-to-source
// roll-up that powers client cache invalidation.

import { assert, assertEquals, assertNotEquals } from 'https://deno.land/std@0.203.0/assert/mod.ts';
import { admin, assertSuccess, callFunction, seed, stackUnavailable, testUuid, withContentSource } from './seed.ts';

const skip = stackUnavailable();

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
