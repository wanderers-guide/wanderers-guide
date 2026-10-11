import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isOperationsWorkerURL } from '../cypress/support/operations-worker-fixture.ts';

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
