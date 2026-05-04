// Covers the canonical find-* pattern: id, filter, ilike-by-name, JSend envelope.

import { assertEquals, assert } from 'https://deno.land/std@0.203.0/assert/mod.ts';
import { admin, callFunction, seed, stackUnavailable, testUuid, withContentSource } from './seed.ts';

const skip = stackUnavailable();

Deno.test({
  name: 'find-spell: returns array when no id is given',
  ignore: skip,
  async fn() {
    const { apiKey } = await seed();
    const result = await callFunction('find-spell', {}, { token: apiKey });
    assertEquals(result.status, 200);
    assertEquals(result.body?.status, 'success');
    assert(Array.isArray(result.body?.data));
  },
});

Deno.test({
  name: 'find-spell: returns single object (or null) when id is a number',
  ignore: skip,
  async fn() {
    const { userId, apiKey } = await seed();

    await withContentSource(userId, async (sourceId) => {
      // Insert one spell so we have something to look up.
      const { data: spell } = await admin
        .from('spell')
        .insert({
          name: 'Test Fireball',
          description: 'Test spell.',
          rank: 3,
          traditions: ['arcane'],
          traits: [],
          content_source_id: sourceId,
          uuid: testUuid(),
          version: '1.0.0',
        })
        .select()
        .single();
      assert(spell, 'failed to insert test spell');

      const result = await callFunction('find-spell', { id: spell.id }, { token: apiKey });
      assertEquals(result.status, 200);
      assertEquals(result.body?.status, 'success');
      assertEquals(result.body?.data?.id, spell.id);
      assertEquals(result.body?.data?.name, 'Test Fireball');
    });
  },
});

Deno.test({
  name: 'find-spell: filters by content_sources',
  ignore: skip,
  async fn() {
    const { userId, apiKey } = await seed();

    await withContentSource(userId, async (sourceId) => {
      const insertResult = await admin.from('spell').insert([
        {
          name: 'Lookup Spell A',
          description: '',
          rank: 1,
          traditions: ['arcane'],
          traits: [],
          content_source_id: sourceId,
          uuid: testUuid(),
          version: '1.0.0',
        },
        {
          name: 'Lookup Spell B',
          description: '',
          rank: 2,
          traditions: ['arcane'],
          traits: [],
          content_source_id: sourceId,
          uuid: testUuid(),
          version: '1.0.0',
        },
      ]);
      if (insertResult.error) throw new Error(`spell insert failed: ${insertResult.error.message}`);

      const result = await callFunction(
        'find-spell',
        { content_sources: [sourceId] },
        { token: apiKey }
      );
      assertEquals(result.status, 200, `unexpected status: ${JSON.stringify(result)}`);
      assertEquals(result.body?.status, 'success');
      const data = result.body?.data as Array<{ name: string }>;
      assert(Array.isArray(data), `expected array, got ${typeof data}: ${JSON.stringify(data)?.slice(0,200)}`);
      const names = data.map((d) => d.name);
      assert(names.includes('Lookup Spell A'), `Spell A missing from ${JSON.stringify(names)}`);
      assert(names.includes('Lookup Spell B'));
    });
  },
});

Deno.test({
  name: 'find-spell: name filter is case-insensitive (ilike)',
  ignore: skip,
  async fn() {
    const { userId, apiKey } = await seed();
    await withContentSource(userId, async (sourceId) => {
      await admin.from('spell').insert({
        name: 'CaseSensitive Spell',
        description: '',
        rank: 1,
        traditions: ['arcane'],
        traits: [],
        content_source_id: sourceId,
          uuid: testUuid(),
        version: '1.0.0',
      });

      const result = await callFunction(
        'find-spell',
        { name: 'casesensitive spell', content_sources: [sourceId] },
        { token: apiKey }
      );
      assertEquals(result.status, 200);
      const data = result.body?.data as Array<{ name: string }>;
      assert(data.some((d) => d.name === 'CaseSensitive Spell'));
    });
  },
});
