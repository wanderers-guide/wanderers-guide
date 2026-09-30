/** Node-only, localhost-only integration fixtures. No service credential enters the browser. */
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import type { Hazard } from '../../src/schemas/content';

type Fixture = {
  key: string;
  users: Array<{ id: string; email: string }>;
  campaignId?: number;
  encounterId?: number;
  characterId?: number;
  gm?: { email: string; password: string; token: string };
  playerToken?: string;
};

/** Register bounded synthetic GM/player setup and verified cleanup for the real API/browser tests. */
export function registerCampaignFixtures(on: Cypress.PluginEvents, config: Cypress.PluginConfigOptions): void {
  const fixtures = new Map<string, Fixture>();
  const base = new URL(String(config.env.functions_url));
  base.pathname = '/';
  base.search = '';
  base.hash = '';
  const assertLocal = (): void => {
    if (
      !['localhost', '127.0.0.1', '[::1]'].includes(base.hostname) ||
      base.protocol !== 'http:' ||
      base.username ||
      base.password
    )
      throw new Error('Campaign fixtures require a local HTTP Supabase origin');
    if (!process.env.SERVICE_ROLE_KEY) throw new Error('Campaign fixtures require Node-only SERVICE_ROLE_KEY');
  };
  const admin = () => {
    assertLocal();
    return createClient(base.href, process.env.SERVICE_ROLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  };
  const fixtureFor = (key: string): Fixture => {
    const fixture = fixtures.get(key);
    if (!fixture) throw new Error('Unknown synthetic campaign fixture');
    return fixture;
  };
  const call = async (token: string, name: string, body: Record<string, unknown>): Promise<any> => {
    assertLocal();
    const response = await fetch(new URL(`functions/v1/${name}`, base), {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    });
    const result = await response.json();
    if (!response.ok || result.status !== 'success') throw new Error(`Synthetic campaign ${name} failed`);
    return result.data;
  };
  const signIn = async (email: string, password: string): Promise<string> => {
    assertLocal();
    const response = await fetch(new URL('auth/v1/token?grant_type=password', base), {
      method: 'POST',
      headers: { apikey: process.env.SERVICE_ROLE_KEY!, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      signal: AbortSignal.timeout(30000),
    });
    const result = await response.json();
    if (!response.ok || typeof result.access_token !== 'string') throw new Error('Synthetic account login failed');
    return result.access_token;
  };
  const cleanup = async (fixture: Fixture): Promise<void> => {
    const client = admin();
    // Verify the exact generated accounts before deleting anything owned by them.
    for (const user of fixture.users) {
      const { data, error } = await client.auth.admin.getUserById(user.id);
      if (error || data.user.email !== user.email || !user.email.startsWith(`wg-campaign-${fixture.key}-`))
        throw new Error('Synthetic campaign ownership verification failed');
    }
    for (const table of ['encounter', 'character', 'campaign']) {
      const owners = fixture.users.map((user) => user.id);
      if (!owners.length) continue;
      // All records owned by these freshly generated accounts belong to this fixture,
      // including a create response lost before its row ID could be retained.
      const { error } = await client.from(table).delete().in('user_id', owners);
      if (error) throw new Error(`Synthetic ${table} cleanup failed`);
      const { data, error: readError } = await client.from(table).select('id').in('user_id', owners);
      if (readError || data?.length) throw new Error(`Synthetic ${table} cleanup verification failed`);
    }
    for (const user of fixture.users) {
      const { error } = await client.auth.admin.deleteUser(user.id);
      if (error) throw new Error('Synthetic account cleanup failed');
      const { data } = await client.auth.admin.getUserById(user.id);
      if (data?.user) throw new Error('Synthetic account cleanup verification failed');
    }
    fixtures.delete(fixture.key);
  };

  on('task', {
    async 'campaignFixture:create'() {
      const client = admin();
      const fixture: Fixture = { key: randomUUID(), users: [] };
      fixtures.set(fixture.key, fixture);
      try {
        const password = randomUUID();
        for (const role of ['gm', 'player']) {
          const email = `wg-campaign-${fixture.key}-${role}@wanderersguide.test`;
          const { data, error } = await client.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { display_name: `Campaign ${role}` },
          });
          if (error || !data.user) throw new Error('Synthetic campaign account creation failed');
          fixture.users.push({ id: data.user.id, email });
          const token = await signIn(email, password);
          if (role === 'gm') fixture.gm = { email, password, token };
          else fixture.playerToken = token;
        }
        const campaign = await call(fixture.gm!.token, 'create-campaign', { name: 'Connection test campaign' });
        fixture.campaignId = campaign.id;
        await call(fixture.playerToken!, 'find-campaign', { join_key: campaign.join_key });
        const character = await call(fixture.playerToken!, 'create-character', {
          name: 'Connection test player',
          level: 1,
          campaign_id: fixture.campaignId,
          hp_current: 20,
          hp_temp: 0,
          hero_points: 1,
          stamina_current: 0,
          resolve_current: 0,
          details: { conditions: [], info: { appearance: 'Original appearance' } },
          content_sources: { enabled: [1] },
          inventory: { items: [], coins: { cp: 0, sp: 0, gp: 0, pp: 0 } },
          meta_data: { reset_hp: false, calculated_stats: { hp_max: 20, ac: 10, profs: {} } },
        });
        fixture.characterId = character.id;
        if (character.campaign_id !== fixture.campaignId) throw new Error('Synthetic player did not join its campaign');
        const encounter = await call(fixture.gm!.token, 'create-encounter', {
          name: 'Connection test encounter',
          icon: 'combat',
          color: 'blue',
          campaign_id: fixture.campaignId,
          combatants: { list: [{ _id: randomUUID(), type: 'CHARACTER', ally: true, character: fixture.characterId }] },
          meta_data: { party_level: 1, party_size: 1 },
        });
        fixture.encounterId = encounter.id;
        return {
          key: fixture.key,
          campaignId: fixture.campaignId,
          characterId: fixture.characterId,
          gm: { email: fixture.gm!.email, password },
        };
      } catch (error) {
        await cleanup(fixture);
        throw error;
      }
    },
    async 'campaignFixture:hazardRoundTrip'({ key, hazards }: { key: string; hazards: Hazard[] }) {
      const fixture = fixtureFor(key);
      assert.equal(hazards.length, 5);
      assert.ok(hazards.every((hazard) => hazard.type === 'hazard' && hazard.content_source_id === 400));
      const readEncounter = async () => {
        const rows = await call(fixture.gm!.token, 'find-encounter', { id: fixture.encounterId });
        assert.equal(rows.length, 1);
        assert.equal(rows[0].user_id, fixture.users[0].id);
        return rows[0];
      };
      const original = await readEncounter();
      const snapshots = [...hazards, hazards.find((hazard) => hazard.name === 'Boneburst')!];
      const instances = snapshots.map((hazard, index) => ({
        _id: randomUUID(),
        type: 'HAZARD',
        ally: false,
        hazard,
        ...(hazard.details.complexity === 'COMPLEX' ? { initiative: 21 + index } : {}),
        hazard_state: {
          ...(hazard.details.defenses?.hp === undefined
            ? {}
            : { hp_current: index === 0 ? 45 : hazard.details.defenses.hp }),
          disabled: index === 0,
        },
      }));
      const list = [...original.combatants.list, ...instances];
      await call(fixture.gm!.token, 'create-encounter', { ...original, combatants: { list } });
      const saved = await readEncounter();
      assert.deepEqual(saved.combatants.list, list);
      assert.deepEqual(saved.meta_data, original.meta_data);
      const remaining = list.filter((entry) => entry._id !== instances[0]._id);
      await call(fixture.gm!.token, 'create-encounter', { ...saved, combatants: { list: remaining } });
      const reloaded = await readEncounter();
      assert.deepEqual(reloaded.combatants.list, remaining);
      assert.deepEqual(reloaded.combatants.list[0], original.combatants.list[0]);
      assert.deepEqual(reloaded.meta_data, original.meta_data);
      return { hazardsSaved: instances.length, hazardsRemaining: instances.length - 1, characterPreserved: true };
    },
    async 'campaignFixture:playerUpdate'({ key, appearance, hp }: { key: string; appearance?: string; hp?: number }) {
      const fixture = fixtureFor(key);
      const character = await call(fixture.playerToken!, 'find-character', { id: fixture.characterId });
      const result = await call(fixture.playerToken!, 'update-character', {
        id: fixture.characterId,
        expected_updated_at: character.updated_at,
        ...(appearance === undefined
          ? {}
          : { details: { ...character.details, info: { ...character.details?.info, appearance } } }),
        ...(hp === undefined ? {} : { hp_current: hp }),
      });
      if (!Array.isArray(result) || result[0]?.id !== fixture.characterId)
        throw new Error('Synthetic player update was not confirmed');
      return result[0];
    },
    async 'campaignFixture:read'(key: string) {
      const fixture = fixtureFor(key);
      return call(fixture.playerToken!, 'find-character', { id: fixture.characterId });
    },
    async 'campaignFixture:cleanup'(key: string) {
      const fixture = fixtures.get(key);
      if (fixture) await cleanup(fixture);
      return null;
    },
  });
  // A failed spec hook must not leave the generated accounts or campaign behind.
  on('after:run', async () => {
    for (const fixture of fixtures.values()) await cleanup(fixture);
  });
}
