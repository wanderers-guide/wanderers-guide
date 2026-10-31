import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isOperationsWorkerURL } from '../cypress/support/operations-worker-fixture.ts';
import { describeClientFailure } from '../cypress/support/client-failure.ts';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

for (const [specName, bypass] of [
  ['ordinary.cy.ts', true],
  ['startupRecovery.cy.ts', false],
]) {
  test(`browser worker isolation for ${specName} sets bypass=${bypass} before suite and test visits`, async () => {
    const hooks = [];
    const commands = [];
    const pending = [];
    const source = readFileSync(new URL('../cypress/support/e2e.ts', import.meta.url), 'utf8').replace(
      "import './commands'",
      ''
    );
    runInNewContext(source, {
      before: (hook) => hooks.push(hook),
      beforeEach: (hook) => hooks.push(hook),
      Cypress: {
        spec: { name: specName },
        isBrowser: () => true,
        automation: async (type, options) => commands.push({ type, options }),
      },
      cy: {
        intercept: () => {},
        then: (callback) => pending.push(callback),
      },
    });
    assert.equal(hooks.length, 2);
    for (const hook of hooks) hook();
    for (const callback of pending) await callback();
    assert.equal(commands.length, 2);
    for (const command of commands) {
      assert.equal(command.type, 'remote:debugger:protocol');
      assert.equal(command.options.command, 'Network.setBypassServiceWorker');
      assert.equal(command.options.params.bypass, bypass);
    }
  });
}

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
