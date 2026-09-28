import { assert, assertEquals } from 'https://deno.land/std@0.203.0/assert/mod.ts';
import { admin, callFunction, seed, stackUnavailable, testUuid, withContentSource } from './seed.ts';

const skip = stackUnavailable();

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
