// find-character is the only endpoint today that uses connect()'s
// supportsCharacterAPI option. Verifies that an API key without an explicit
// character access grant is rejected, and that adding the grant unblocks it.

import { assertEquals, assert } from 'https://deno.land/std@0.203.0/assert/mod.ts';
import { admin, callFunction, seed, stackUnavailable } from './seed.ts';

const skip = stackUnavailable();

Deno.test({
  name: 'find-character: own characters readable via JWT',
  ignore: skip,
  async fn() {
    const { userId, jwt } = await seed();
    const { data: char } = await admin
      .from('character')
      .insert({ name: 'Test Hero', user_id: userId, level: 1, experience: 0 })
      .select()
      .single();
    assert(char, 'failed to insert test character');

    try {
      const result = await callFunction('find-character', { id: char.id }, { token: jwt });
      assertEquals(result.status, 200);
      assertEquals(result.body?.status, 'success');
      assertEquals(result.body?.data?.id, char.id);
    } finally {
      await admin.from('character').delete().eq('id', char.id);
    }
  },
});

Deno.test({
  name: 'find-character: API key without grant returns 403',
  ignore: skip,
  async fn() {
    const { userId, apiKey } = await seed();
    // Insert a character WITHOUT an api_clients access grant.
    const { data: char } = await admin
      .from('character')
      .insert({ name: 'Locked Hero', user_id: userId, level: 1, experience: 0 })
      .select()
      .single();
    assert(char);

    try {
      const result = await callFunction('find-character', { id: char.id }, { token: apiKey });
      assertEquals(result.status, 403);
      assertEquals(result.body?.status, 'fail');
    } finally {
      await admin.from('character').delete().eq('id', char.id);
    }
  },
});

Deno.test({
  name: 'find-character: API key WITH grant succeeds',
  ignore: skip,
  async fn() {
    const { userId, apiKey, clientId, publicUserId } = await seed();
    const { data: char } = await admin
      .from('character')
      .insert({
        name: 'Granted Hero',
        user_id: userId,
        level: 1,
        experience: 0,
        details: {
          api_clients: {
            client_access: [
              { clientId, publicUserId: `${publicUserId}`, addedAt: Date.now() },
            ],
          },
        },
      })
      .select()
      .single();
    assert(char);

    try {
      const result = await callFunction('find-character', { id: char.id }, { token: apiKey });
      assertEquals(result.status, 200);
      assertEquals(result.body?.status, 'success');
      assertEquals(result.body?.data?.id, char.id);
    } finally {
      await admin.from('character').delete().eq('id', char.id);
    }
  },
});
