// Covers the update-* pattern, plus verifying that forbidden keys are stripped.

import { assertEquals, assert } from 'https://deno.land/std@0.203.0/assert/mod.ts';
import { admin, callFunction, seed, stackUnavailable } from './seed.ts';

const skip = stackUnavailable();

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
