// Covers search-data, including the new creature branch from Phase 1.

import { assertEquals, assert } from 'https://deno.land/std@0.203.0/assert/mod.ts';
import { admin, callFunction, seed, stackUnavailable, testUuid, withContentSource } from './seed.ts';

const skip = stackUnavailable();

Deno.test({
  name: 'search-data: simple text search returns the expected envelope',
  ignore: skip,
  async fn() {
    const { jwt } = await seed();
    const result = await callFunction(
      'search-data',
      { text: 'fireball' },
      { token: jwt }
    );
    assertEquals(result.status, 200);
    assertEquals(result.body?.status, 'success');
    const data = result.body?.data;
    // All twelve content buckets must be present, even if empty.
    for (const key of [
      'ability_blocks',
      'ancestries',
      'archetypes',
      'backgrounds',
      'classes',
      'creatures',
      'items',
      'languages',
      'spells',
      'traits',
      'versatile_heritages',
      'class_archetypes',
    ]) {
      assert(Array.isArray(data?.[key]), `expected data.${key} to be an array`);
    }
  },
});

Deno.test({
  name: 'search-data: advanced creature search returns rows (Phase 1 fix)',
  ignore: skip,
  async fn() {
    const { userId, jwt } = await seed();

    await withContentSource(userId, async (sourceId) => {
      const cr = await admin.from('creature').insert({
        name: 'Test Goblin Warrior',
        level: 1,
        rarity: 'COMMON',
        details: { description: 'A test creature.' },
        operations: [],
        content_source_id: sourceId,
        uuid: testUuid(),
        version: '1.0.0',
      });
      if (cr.error) throw new Error(`creature insert failed: ${cr.error.message}`);

      const result = await callFunction(
        'search-data',
        {
          is_advanced: true,
          type: 'creature',
          name: 'Test Goblin',
          content_sources: [sourceId],
        },
        { token: jwt }
      );
      assertEquals(result.status, 200);
      assertEquals(result.body?.status, 'success');
      const creatures = result.body?.data?.creatures as Array<{ name: string }>;
      assert(Array.isArray(creatures));
      assert(
        creatures.some((c) => c.name === 'Test Goblin Warrior'),
        'expected the test creature in advanced-search results'
      );
    });
  },
});

Deno.test({
  name: 'search-data: short text (<2 chars) returns empty buckets',
  ignore: skip,
  async fn() {
    const { jwt } = await seed();
    const result = await callFunction('search-data', { text: 'a' }, { token: jwt });
    assertEquals(result.status, 200);
    assertEquals(result.body?.status, 'success');
    assertEquals(result.body?.data?.spells?.length, 0);
    assertEquals(result.body?.data?.creatures?.length, 0);
  },
});
