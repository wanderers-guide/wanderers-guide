import { assert, assertEquals } from 'https://deno.land/std@0.203.0/assert/mod.ts';
import { admin, callFunction, seed, stackUnavailable, testUuid, withContentSource } from './seed.ts';

const skip = stackUnavailable();

Deno.test({
  name: 'find-ability-block: bounded pages preserve filters, ownership and legacy shapes',
  ignore: skip,
  async fn() {
    const { userId, jwt } = await seed();
    await withContentSource(userId, async (sourceId) => {
      const hidden = await admin.from('content_source').update({ is_published: false }).eq('id', sourceId);
      if (hidden.error) throw hidden.error;
      const inserted = await admin
        .from('ability_block')
        .insert(
          [
            { name: 'Paged feat A', type: 'feat' },
            { name: 'Paged action B', type: 'action' },
            { name: 'Paged feat C', type: 'feat' },
          ].map((row) => ({
            ...row,
            content_source_id: sourceId,
            uuid: testUuid(),
            description: '',
            traits: [],
            operations: [],
          }))
        )
        .select('id,type');
      if (inserted.error) throw inserted.error;
      assert(inserted.data?.length === 3);
      const ids = inserted.data.map((row) => row.id).sort((a, b) => a - b);
      const scope = { content_sources: [sourceId] };
      const full = await callFunction('find-ability-block', scope, { token: jwt });
      assertEquals(full.body?.status, 'success');
      assertEquals(
        full.body.data.map((row: { id: number }) => row.id),
        ids
      );
      const first = await callFunction('find-ability-block', { ...scope, page_size: 2 }, { token: jwt });
      assertEquals(first.body?.status, 'success');
      assertEquals(
        first.body.data.map((row: { id: number }) => row.id),
        ids.slice(0, 2)
      );
      const second = await callFunction(
        'find-ability-block',
        { ...scope, page_size: 2, after_id: ids[1] },
        { token: jwt }
      );
      assertEquals(
        second.body.data.map((row: { id: number }) => row.id),
        ids.slice(2)
      );
      const empty = await callFunction(
        'find-ability-block',
        { ...scope, page_size: 2, after_id: ids[2] },
        { token: jwt }
      );
      assertEquals(empty.body.data, []);
      const filtered = await callFunction(
        'find-ability-block',
        { ...scope, type: 'feat', name: 'pAgEd%', page_size: 1, after_id: ids[0] },
        { token: jwt }
      );
      assertEquals(
        filtered.body.data.map((row: { id: number }) => row.id),
        [ids[2]]
      );
      const scalar = await callFunction('find-ability-block', { id: ids[0] }, { token: jwt });
      assertEquals(scalar.body.data.id, ids[0]);
      const anonymous = await callFunction('find-ability-block', { ...scope, page_size: 2 });
      assertEquals(anonymous.body?.status, 'success');
      assertEquals(anonymous.body.data, [], 'paging cannot reveal an unpublished private source');
    });
  },
});

Deno.test({
  name: 'find-ability-block: invalid page sizes and cursors fail without returning a catalog',
  ignore: skip,
  async fn() {
    for (const body of [
      { page_size: 0 },
      { page_size: 1001 },
      { page_size: 1.5 },
      { after_id: 1 },
      { page_size: 1, after_id: 1.5 },
    ]) {
      const result = await callFunction('find-ability-block', body);
      assertEquals(result.status, 200);
      assertEquals(result.body?.status, 'fail');
      assert(/Invalid pagination/.test(result.body.data.message));
    }
  },
});
