import { assert, assertEquals } from 'https://deno.land/std@0.203.0/assert/mod.ts';
import { admin, callFunction, seed, stackUnavailable, testUuid, withContentSource } from './seed.ts';

const skip = stackUnavailable();
const contentUpdateKey = Deno.env.get('CONTENT_UPDATE_KEY') ?? '';

/** A synthetic manual stat block exercises all optional fields without a scalar HP maximum. */
function manualDetails() {
  return {
    complexity: 'COMPLEX',
    trait_labels: ['Environmental'],
    stealth: '+7',
    description: 'A test colony covers the chamber.',
    disable: 'Engineering DC 18',
    defenses: {
      hp_note: '6 per 5-foot cube',
      weaknesses: 'fire 5',
      resistances: 'physical 5',
    },
    passive_abilities: [
      { name: 'Colony', text: 'First passive.' },
      { name: 'Colony', text: 'Second passive.' },
    ],
    activation: {
      name: 'Awaken',
      actions: 'REACTION',
      traits: ['Acid'],
      trigger: 'A creature enters.',
      requirements: 'The chamber is open.',
      effect: 'The colony awakens.',
    },
    routine: { actions: 2, text: 'The colony grows and bursts.' },
    secondary_activities: [
      {
        name: 'Pulse',
        actions: 'ONE-ACTION',
        traits: ['Acid'],
        effect: 'First effect.',
      },
      {
        name: 'Pulse',
        actions: 'FREE-ACTION',
        trigger: 'A creature moves.',
        requirements: 'A door is open.',
        effect: 'Second effect.',
      },
    ],
    reset: 'The colony resets after 1 hour.',
  };
}

Deno.test({
  name: 'hazards: creature and hazard API results stay separate',
  ignore: skip,
  async fn() {
    const { userId, jwt } = await seed();

    await withContentSource(userId, async (sourceId) => {
      const marker = crypto.randomUUID().replaceAll('-', '').slice(0, 12);
      const creatureName = `Creatureprobe${marker}`;
      const hazardName = `Hazardprobe${marker}`;
      const { data: creature, error: creatureError } = await admin
        .from('creature')
        .insert({
          name: creatureName,
          level: 1,
          rarity: 'COMMON',
          details: { description: 'A test creature.' },
          content_source_id: sourceId,
          uuid: testUuid(),
        })
        .select('id,type')
        .single();
      if (creatureError) throw creatureError;
      assertEquals(creature.type, 'creature');

      const { error: invalidTypeError } = await admin.from('creature').insert({
        name: `Invalidprobe${marker}`,
        level: 1,
        rarity: 'COMMON',
        type: 'trap',
        details: { description: 'An invalid record.' },
        content_source_id: sourceId,
        uuid: testUuid(),
      });
      assertEquals(invalidTypeError?.code, '23514');

      const { data: hazard, error: hazardError } = await admin
        .from('creature')
        .insert({
          name: hazardName,
          level: 2,
          rarity: 'UNCOMMON',
          type: 'hazard',
          details: {
            complexity: 'SIMPLE',
            trait_labels: ['Mechanical', 'Trap'],
            stealth: '+10',
            description: 'A test hazard.',
            disable: 'Thievery DC 18',
            activation: {
              name: 'Snapping Door',
              trigger: 'A creature opens the door.',
              effect: 'The door snaps shut.',
            },
          },
          content_source_id: sourceId,
          uuid: testUuid(),
        })
        .select('id,type')
        .single();
      if (hazardError) throw hazardError;

      const defaultFind = await callFunction(
        'find-creature',
        { id: hazard.id, content_sources: [sourceId] },
        { token: jwt }
      );
      assertEquals(defaultFind.body?.status, 'success');
      assertEquals(defaultFind.body?.data, null);

      const hazardFind = await callFunction(
        'find-creature',
        { id: hazard.id, type: 'hazard', content_sources: [sourceId] },
        { token: jwt }
      );
      assertEquals(hazardFind.body?.status, 'success');
      assertEquals(hazardFind.body?.data?.type, 'hazard');
      assertEquals(hazardFind.body?.data?.name, hazardName);
      for (const field of ['defenses', 'passive_abilities', 'secondary_activities']) {
        assertEquals(field in hazardFind.body.data.details, false);
      }
      assertEquals('requirements' in hazardFind.body.data.details.activation, false);

      const creatureFind = await callFunction(
        'find-creature',
        { id: creature.id, content_sources: [sourceId] },
        { token: jwt }
      );
      assertEquals(creatureFind.body?.data?.type, 'creature');

      const advancedCreatures = await callFunction(
        'search-data',
        { is_advanced: true, type: 'creature', content_sources: [sourceId] },
        { token: jwt }
      );
      assertEquals(advancedCreatures.body?.status, 'success');
      assert(advancedCreatures.body?.data?.creatures?.some((row: { id: number }) => row.id === creature.id));
      assertEquals(
        advancedCreatures.body?.data?.creatures?.some((row: { id: number }) => row.id === hazard.id),
        false
      );
      assertEquals(advancedCreatures.body?.data?.hazards?.length, 0);

      const advancedHazards = await callFunction(
        'search-data',
        { is_advanced: true, type: 'hazard', content_sources: [sourceId] },
        { token: jwt }
      );
      assertEquals(advancedHazards.body?.status, 'success');
      assert(advancedHazards.body?.data?.hazards?.some((row: { id: number }) => row.id === hazard.id));
      assertEquals(
        advancedHazards.body?.data?.hazards?.some((row: { id: number }) => row.id === creature.id),
        false
      );
      assertEquals(advancedHazards.body?.data?.creatures?.length, 0);

      const simpleSearch = await callFunction(
        'search-data',
        { text: hazardName, content_sources: [sourceId] },
        { token: jwt }
      );
      assertEquals(simpleSearch.body?.status, 'success');
      assert(simpleSearch.body?.data?.hazards?.some((row: { id: number }) => row.id === hazard.id));
      assertEquals(
        simpleSearch.body?.data?.creatures?.some((row: { id: number }) => row.id === hazard.id),
        false
      );

      const rejectedEdit = await callFunction(
        'create-creature',
        { id: hazard.id, name: 'Changed Hazard', level: 2, content_source_id: sourceId },
        { token: jwt }
      );
      assertEquals(rejectedEdit.body?.status, 'fail');

      const { data: unchanged, error: readError } = await admin
        .from('creature')
        .select('name,type')
        .eq('id', hazard.id)
        .single();
      if (readError) throw readError;
      assertEquals(unchanged.name, hazardName);
      assertEquals(unchanged.type, 'hazard');

      const newCreature = await callFunction(
        'create-creature',
        {
          name: `Creaturecount${marker}`,
          level: 1,
          rarity: 'COMMON',
          details: { description: 'Another test creature.' },
          content_source_id: sourceId,
        },
        { token: jwt }
      );
      assertEquals(newCreature.body?.status, 'success');

      const { data: source, error: sourceError } = await admin
        .from('content_source')
        .select('meta_data')
        .eq('id', sourceId)
        .single();
      if (sourceError) throw sourceError;
      assertEquals(source.meta_data?.counts?.creature, 2);
    });
  },
});

Deno.test({
  name: 'hazards: optional manual rules round-trip through scoped find and advanced search',
  ignore: skip,
  async fn() {
    const { userId, jwt } = await seed();
    await withContentSource(userId, async (sourceId) => {
      const details = manualDetails();
      const { data: hazard, error } = await admin
        .from('creature')
        .insert({
          name: `Manualhazard${crypto.randomUUID()}`,
          level: 2,
          rarity: 'COMMON',
          type: 'hazard',
          details,
          content_source_id: sourceId,
          uuid: testUuid(),
        })
        .select('id')
        .single();
      if (error) throw error;
      assert(hazard);
      const found = await callFunction(
        'find-creature',
        { id: hazard.id, type: 'hazard', content_sources: [sourceId] },
        { token: jwt }
      );
      assertEquals(found.body?.status, 'success');
      assertEquals(found.body?.data?.details, details);
      assertEquals('hp' in found.body.data.details.defenses, false);
      const excluded = await callFunction(
        'find-creature',
        { id: hazard.id, type: 'hazard', content_sources: [sourceId + 1] },
        { token: jwt }
      );
      assertEquals(excluded.body?.status, 'success');
      assertEquals(excluded.body?.data, null);
      const search = await callFunction(
        'search-data',
        { is_advanced: true, type: 'hazard', content_sources: [sourceId] },
        { token: jwt }
      );
      assertEquals(search.body?.status, 'success');
      const row = search.body?.data?.hazards?.find((entry: { id: number }) => entry.id === hazard.id);
      assert(row);
      assertEquals(row.details, details);
      assertEquals(search.body?.data?.creatures?.length, 0);
    });
  },
});

Deno.test({
  name: 'hazards: the existing content approval route retains ordered optional rules',
  ignore: skip || !contentUpdateKey,
  async fn() {
    const { userId } = await seed();
    await withContentSource(userId, async (sourceId) => {
      const before = manualDetails();
      const details = structuredClone(before);
      details.passive_abilities?.reverse();
      details.secondary_activities?.splice(0, 1);
      details.activation.requirements = 'The chamber has been opened.';
      const { data: hazard, error } = await admin
        .from('creature')
        .insert({
          name: `Approvalhazard${crypto.randomUUID()}`,
          level: 2,
          rarity: 'COMMON',
          type: 'hazard',
          details: before,
          content_source_id: sourceId,
          uuid: testUuid(),
        })
        .select('id,name,uuid,content_source_id,type')
        .single();
      if (error) throw error;
      assert(hazard);
      const messageId = `test-hazard-${crypto.randomUUID()}`;
      const { data: update, error: updateError } = await admin
        .from('content_update')
        .insert({
          user_id: userId,
          type: 'creature',
          ref_id: hazard.id,
          content_source_id: sourceId,
          action: 'UPDATE',
          data: { details },
          discord_msg_id: messageId,
          upvotes: [],
          downvotes: [],
          status: { state: 'PENDING' },
        })
        .select('id,data')
        .single();
      if (updateError) throw updateError;
      assert(update);
      try {
        assertEquals(update.data, { details });
        await callFunction(
          'update-content-update',
          {
            discord_msg_id: messageId,
            discord_user_id: 'test-mod',
            discord_user_name: 'Test Mod',
            state: 'APPROVE',
          },
          { token: contentUpdateKey }
        );
        // Approval is checked by readback because external indexing follows the write.
        const { data: saved, error: savedError } = await admin
          .from('creature')
          .select('id,name,uuid,content_source_id,type,details')
          .eq('id', hazard.id)
          .single();
        if (savedError) throw savedError;
        assertEquals(saved, { ...hazard, details });
        const { data: approved, error: approvedError } = await admin
          .from('content_update')
          .select('status')
          .eq('id', update.id)
          .single();
        if (approvedError) throw approvedError;
        assertEquals(approved?.status?.state, 'APPROVED');
      } finally {
        await admin.from('content_update').delete().eq('id', update.id);
      }
    });
  },
});
