// Covers the private Pathbuilder content-source endpoint.
// The endpoint is deliberately separate from create-content-source so importing
// a shared build does not require the Patreon entitlement used for authoring
// arbitrary custom content sources.
//
// Invariants:
//   1. only a numeric build id is accepted.
//   2. source identity (name/url/user_id) is derived server-side.
//   3. repeated calls for the same user/build reuse the existing source.

import { assert, assertEquals } from 'https://deno.land/std@0.203.0/assert/mod.ts';
import { admin, callFunction, seed, stackUnavailable } from './seed.ts';

const skip = stackUnavailable();

Deno.test({
  name: 'create-pathbuilder-content-source: creates a private source without Patreon access',
  ignore: skip,
  async fn() {
    const { userId, jwt } = await seed();

    const result = await callFunction(
      'create-pathbuilder-content-source',
      { build_id: '1596127' },
      { token: jwt }
    );

    assertEquals(result.status, 200);
    assertEquals(result.body?.status, 'success');

    const source = result.body?.data;
    assert(source?.id, 'expected an id on the new content source');
    assertEquals(source.user_id, userId);
    assertEquals(source.name, 'Pathbuilder Custom (build 1596127)');
    assertEquals(source.url, 'https://pathbuilder2e.com/app.html?emailedBuildID=1596127');
    assertEquals(source.is_published, false);

    await admin.from('content_source').delete().eq('id', source.id);
  },
});

Deno.test({
  name: 'create-pathbuilder-content-source: is idempotent for the same user/build',
  ignore: skip,
  async fn() {
    const { jwt } = await seed();

    const first = await callFunction(
      'create-pathbuilder-content-source',
      { build_id: 1596127 },
      { token: jwt }
    );
    const second = await callFunction(
      'create-pathbuilder-content-source',
      { build_id: '1596127' },
      { token: jwt }
    );

    assertEquals(first.body?.status, 'success');
    assertEquals(second.body?.status, 'success');
    assertEquals(second.body?.data?.id, first.body?.data?.id);

    await admin.from('content_source').delete().eq('id', first.body.data.id);
  },
});

Deno.test({
  name: 'create-pathbuilder-content-source: rejects non-numeric build ids',
  ignore: skip,
  async fn() {
    const { jwt } = await seed();

    const result = await callFunction(
      'create-pathbuilder-content-source',
      { build_id: '1596127<script>' },
      { token: jwt }
    );

    assertEquals(result.body?.status, 'fail');
    assertEquals(result.body?.data?.build_id, 'A numeric Pathbuilder build id is required');
  },
});
