import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isOperationsWorkerURL } from '../cypress/support/operations-worker-fixture.ts';
import { describeClientFailure } from '../cypress/support/client-failure.ts';
import { clearFixtureIndexedDb } from '../cypress/support/content-cache-isolation.ts';

test('fixture isolation resets only IndexedDB for configured loopback origins', async () => {
  const calls = [];
  await clearFixtureIndexedDb('http://localhost:3000/builder/123', 'http://127.0.0.1:5174/', async (request) =>
    calls.push(request)
  );
  assert.deepEqual(calls, [
    { command: 'Storage.clearDataForOrigin', params: { origin: 'http://localhost:3000', storageTypes: 'indexeddb' } },
    { command: 'Storage.clearDataForOrigin', params: { origin: 'http://127.0.0.1:5174', storageTypes: 'indexeddb' } },
  ]);
});

test('fixture isolation deduplicates the same origin and permits an absent module preview', async () => {
  const calls = [];
  await clearFixtureIndexedDb('http://localhost:3000/', 'http://localhost:3000/builder/123', async (request) =>
    calls.push(request)
  );
  assert.equal(calls.length, 1);
  await clearFixtureIndexedDb('http://[::1]:5173/', undefined, async (request) => calls.push(request));
  assert.equal(calls.length, 2);
});

for (const url of [
  'https://wanderersguide.app',
  'file:///tmp/fixture.html',
  'http://name:password@localhost:3000',
  123,
])
  test(`fixture isolation refuses an unowned or invalid origin: ${url}`, async () => {
    const calls = [];
    await assert.rejects(clearFixtureIndexedDb('http://localhost:3000', url, async (request) => calls.push(request)));
    assert.equal(calls.length, 0);
  });

test('generated browser downloads stay outside the watched app root', () => {
  const frontend = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const source = readFileSync(resolve(frontend, 'cypress.config.ts'), 'utf8');
  const folder = source.match(/^\s*downloadsFolder:\s*'([^']+)'/m)?.[1];
  assert.equal(folder, '../.agents/legacy/cypress-downloads');
  assert.equal(relative(frontend, resolve(frontend, folder)).split(sep)[0], '..');
  for (const name of ['companionJsonExport', 'contentDownloads'])
    assert(
      readFileSync(resolve(frontend, `cypress/e2e/characters/${name}.cy.ts`), 'utf8').includes(
        "Cypress.config('downloadsFolder')"
      )
    );
});

test('strict browser fixtures describe only known diagnostic categories', () => {
  for (const code of [
    'content_load_failed',
    'calculation_failed',
    'save_failed',
    'auth_failed',
    'update_failed',
    'chunk_failed',
    'unhandled_error',
    'unhandled_rejection',
  ])
    assert.equal(describeClientFailure({ code, token: 'private-session', rawError: 'private-error' }), code);
  for (const body of [null, [], 'private-session', { code: 'private-error' }, { code: 123 }, {}])
    assert.equal(describeClientFailure(body), 'unknown');
});

const origin = 'http://localhost:3000';
for (const path of [
  '/src/process/operations/operations.worker.ts?worker_file&type=module',
  '/assets/operations.worker-Cwhh3n5_.js',
  '/assets/operations.worker-GDq-4JuT.js',
  '/operations.worker.js',
]) {
  test(`native calculation fixture recognizes ${path}`, () => {
    assert.equal(isOperationsWorkerURL(path, origin), true);
  });
}

for (const path of [
  '/assets/content.worker-Cwhh3n5_.js',
  '/operations.worker.js.map',
  '/operations.worker.unrelated.js',
  '/not-operations.worker-Cwhh3n5_.js',
]) {
  test(`native calculation fixture ignores ${path}`, () => {
    assert.equal(isOperationsWorkerURL(path, origin), false);
  });
}
