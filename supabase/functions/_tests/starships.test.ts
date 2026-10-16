import { assert, assertEquals } from 'https://deno.land/std@0.203.0/assert/mod.ts';
import { admin, callFunction, seed, stackUnavailable, testUuid, withContentSource } from './seed.ts';

/** Reference-only ships must never leak into ordinary creature reads or writes. */
Deno.test({
  name: 'starships: scoped reference reads, search, and creature-editor isolation',
  ignore: stackUnavailable(),
  async fn() {
    const { userId, jwt } = await seed();
    await withContentSource(userId, async (sourceId) => {
      const name = `Shipprobe${crypto.randomUUID().replaceAll('-', '')}`;
      const details = {
        description: 'A synthetic reference ship.',
        stat_block: '**HP** 27; **SP** 10\n\n**Speed** 2 zones; **Sensor Range** 5 zones',
      };
      const { data: ship, error } = await admin.from('creature').insert({
        name,
        level: 1,
        rarity: 'COMMON',
        type: 'starship',
        details,
        content_source_id: sourceId,
        uuid: testUuid(),
      }).select('id').single();
      if (error) throw error;
      assert(ship);

      for (const type of [undefined, 'creature', 'hazard']) {
        const result = await callFunction('find-creature', {
          id: ship.id, type, content_sources: [sourceId],
        }, { token: jwt });
        assertEquals(result.body?.status, 'success');
        assertEquals(result.body?.data, null);
      }
      const found = await callFunction('find-creature', {
        id: ship.id, type: 'starship', content_sources: [sourceId],
      }, { token: jwt });
      assertEquals(found.body?.status, 'success');
      assertEquals(found.body?.data?.details, details);
      const excluded = await callFunction('find-creature', {
        id: ship.id, type: 'starship', content_sources: [sourceId + 1],
      }, { token: jwt });
      assertEquals(excluded.body?.status, 'success');
      assertEquals(excluded.body?.data, null);

      for (const query of [
        { text: name },
        { is_advanced: true, type: 'starship', name },
      ]) {
        const search = await callFunction('search-data', {
          ...query, content_sources: [sourceId],
        }, { token: jwt });
        assertEquals(search.body?.status, 'success');
        assert(search.body?.data?.starships?.some((row: { id: number }) => row.id === ship.id));
        assertEquals(search.body?.data?.creatures?.length, 0);
        assertEquals(search.body?.data?.hazards?.length, 0);
      }
      const ordinarySearch = await callFunction('search-data', {
        is_advanced: true, type: 'creature', name, content_sources: [sourceId],
      }, { token: jwt });
      assertEquals(ordinarySearch.body?.status, 'success');
      assertEquals(ordinarySearch.body?.data?.creatures?.length, 0);
      assertEquals(ordinarySearch.body?.data?.starships?.length, 0);

      const edit = await callFunction('create-creature', {
        id: ship.id, name: 'Changed', level: 1, content_source_id: sourceId,
      }, { token: jwt });
      assertEquals(edit.body?.status, 'fail');
      const { data: unchanged, error: readError } = await admin.from('creature')
        .select('name,type,details').eq('id', ship.id).single();
      if (readError) throw readError;
      assertEquals(unchanged, { name, type: 'starship', details });
    });
  },
});
