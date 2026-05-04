// Covers the delete-content pattern. Includes the new permission check
// from Phase 1 — non-owners should get JSend fail.

import { assertEquals, assert } from 'https://deno.land/std@0.203.0/assert/mod.ts';
import { admin, callFunction, seed, stackUnavailable, testUuid, withContentSource } from './seed.ts';

const skip = stackUnavailable();

Deno.test({
  name: 'delete-content: owner can delete their own spell',
  ignore: skip,
  async fn() {
    const { userId, jwt } = await seed();
    await withContentSource(userId, async (sourceId) => {
      const { data: spell } = await admin
        .from('spell')
        .insert({
          name: 'Doomed Spell',
          description: '',
          rank: 1,
          traditions: ['arcane'],
          traits: [],
          content_source_id: sourceId,
          uuid: testUuid(),
          version: '1.0.0',
        })
        .select()
        .single();
      assert(spell);

      const result = await callFunction(
        'delete-content',
        { id: spell.id, type: 'spell' },
        { token: jwt }
      );
      assertEquals(result.status, 200);
      assertEquals(result.body?.status, 'success');

      const { data: gone } = await admin.from('spell').select().eq('id', spell.id);
      assertEquals(gone?.length ?? 0, 0, 'spell row should be gone');
    });
  },
});

Deno.test({
  name: 'delete-content: non-owner gets JSend fail (403-style)',
  ignore: skip,
  async fn() {
    const { jwt } = await seed();

    // Create a real second auth user to own the source — content_source.user_id
    // has a FK to auth.users so we can't fake a uuid here.
    const otherEmail = `other-${crypto.randomUUID().slice(0, 8)}@test.local`;
    const { data: otherAuth, error: otherErr } = await admin.auth.admin.createUser({
      email: otherEmail,
      password: 'test1234',
      email_confirm: true,
    });
    if (otherErr || !otherAuth?.user) throw otherErr ?? new Error('failed to create other test user');
    const otherOwner = otherAuth.user.id;

    const { data: source } = await admin
      .from('content_source')
      .insert({
        name: `other-owner-source-${crypto.randomUUID().slice(0, 8)}`,
        foundry_id: `other-${crypto.randomUUID().slice(0, 8)}`,
        url: 'https://example.com',
        description: 'owned by someone else',
        operations: [],
        contact_info: '',
        group: 'core',
        meta_data: {},
        is_published: true,
        user_id: otherOwner,
        keys: {},
        required_content_sources: [],
      })
      .select()
      .single();
    assert(source);

    const { data: spell } = await admin
      .from('spell')
      .insert({
        name: "Other Owner's Spell",
        description: '',
        rank: 1,
        traditions: ['arcane'],
        traits: [],
        content_source_id: source.id,
          uuid: testUuid(),
        version: '1.0.0',
      })
      .select()
      .single();
    assert(spell);

    try {
      const result = await callFunction(
        'delete-content',
        { id: spell.id, type: 'spell' },
        { token: jwt }
      );
      assertEquals(result.status, 200);
      assertEquals(result.body?.status, 'fail');
      assert(/permission/i.test(result.body?.data?.message ?? ''));

      // Confirm the spell is still there.
      const { data: stillThere } = await admin.from('spell').select('id').eq('id', spell.id);
      assertEquals(stillThere?.length, 1);
    } finally {
      await admin.from('spell').delete().eq('id', spell.id);
      await admin.from('content_source').delete().eq('id', source.id);
      await admin.auth.admin.deleteUser(otherOwner);
    }
  },
});
