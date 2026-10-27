import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const source = await readFile(new URL('../src/pages/CampaignsPage.tsx', import.meta.url), 'utf8');
const body = source.match(/const handleCreateCampaign = async \(\) => \{([\s\S]*?)\n  \};/)?.[1];
assert.ok(body, 'exercise the actual campaign page handler');

for (const outcome of ['success', 'null', 'rejection']) {
  test(`both campaign creation buttons stop loading after ${outcome}`, async () => {
    const loading = { header: true, empty: true };
    const routes = [];
    const errors = [];
    let calls = 0;
    const handler = new Function(
      'createCampaign',
      'navigate',
      'setLoadingCreateCampaign',
      'setLoadingCreateZeroCampaign',
      'console',
      'showNotification',
      `return async () => {${body}};`
    )(
      async () => {
        calls++;
        if (outcome === 'rejection') throw new Error('request rejected');
        return outcome === 'success' ? { id: 42 } : null;
      },
      (route) => routes.push(route),
      (value) => {
        loading.header = value;
      },
      (value) => {
        loading.empty = value;
      },
      { error: (...args) => errors.push(args) },
      () => {}
    );
    await handler();
    assert.deepEqual(loading, { header: false, empty: false });
    assert.deepEqual(routes, outcome === 'success' ? ['/campaign/42'] : []);
    assert.equal(calls, 1, 'never replay a possibly committed creation');
    assert.equal(errors.length, outcome === 'rejection' ? 1 : 0);
  });
}
