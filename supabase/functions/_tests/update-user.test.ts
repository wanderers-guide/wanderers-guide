import { assertEquals } from 'https://deno.land/std@0.203.0/assert/mod.ts';
import { admin, callFunction, seed, stackUnavailable } from './seed.ts';

Deno.test({
  name: 'update-user: settings still save while privileged and ownership fields are ignored',
  ignore: stackUnavailable(),
  async fn() {
    const { userId, publicUserId, jwt } = await seed();
    const { data: before, error } = await admin.from('public_user').select('*').eq('id', publicUserId).single();
    if (error) throw error;
    try {
      const response = await callFunction('update-user', {
        display_name: 'Settings permission fixture', summary: 'Saved through the API',
        id: -1, user_id: crypto.randomUUID(), is_admin: true, is_mod: true,
        is_developer: true, is_community_paragon: true, deactivated: true,
        patreon: { tier: 'GAME-MASTER' },
      }, { token: jwt });
      assertEquals(response.body.status, 'success');
      const { data: after } = await admin.from('public_user').select('*').eq('id', publicUserId).single();
      assertEquals(after.display_name, 'Settings permission fixture');
      assertEquals(after.user_id, userId);
      for (const key of ['is_admin','is_mod','is_developer','is_community_paragon','deactivated','patreon']) {
        assertEquals(after[key], before[key], `Server-owned field changed: ${key}`);
      }
    } finally {
      const { error: restoreError } = await admin.from('public_user')
        .update({ display_name: before.display_name, summary: before.summary }).eq('id', publicUserId);
      if (restoreError) throw restoreError;
    }
  },
});
