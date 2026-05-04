// Covers the canonical create-* pattern: insert returns the row, JSend success.

import { assertEquals, assert } from 'https://deno.land/std@0.203.0/assert/mod.ts';
import { admin, callFunction, seed, stackUnavailable, withContentSource } from './seed.ts';

const skip = stackUnavailable();

Deno.test({
  name: 'create-spell: inserts a new spell and returns the row',
  ignore: skip,
  async fn() {
    const { userId, jwt } = await seed();
    await withContentSource(userId, async (sourceId) => {
      const result = await callFunction(
        'create-spell',
        {
          name: 'Created Spell',
          description: 'Made by the test harness.',
          rank: 1,
          traditions: ['arcane'],
          traits: [],
          content_source_id: sourceId,
          version: '1.0.0',
        },
        { token: jwt }
      );
      assertEquals(result.status, 200);
      assertEquals(result.body?.status, 'success');
      assert(result.body?.data?.id, 'expected an id on the new spell');
      assertEquals(result.body?.data?.name, 'Created Spell');
      // cleanup
      await admin.from('spell').delete().eq('id', result.body.data.id);
    });
  },
});
