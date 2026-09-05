import { createRequire } from 'node:module';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../../frontend', import.meta.url));
const require = createRequire(`${root}/package.json`);
const { build } = require('esbuild');
const directory = await mkdtemp(join(tmpdir(), 'wg-ops-audit-'));
const fakeWorkers = [];
class FakeWorker {
  constructor() { this.requests = []; fakeWorkers.push(this); }
  postMessage(request) { this.requests.push(request); }
  complete(index, value) {
    this.onmessage({ data: { id: this.requests[index].id, status: 'success', data: {
      store: { revision: value }, ors: { revision: value }, errors: [],
    } } });
  }
}
globalThis.Worker = FakeWorker;
globalThis.window = { Worker: FakeWorker };
Object.defineProperty(globalThis, 'navigator', { value: { hardwareConcurrency: 2 }, configurable: true });
globalThis.__auditStoreImports = [];
await build({
  entryPoints: [`${root}/src/process/operations/operations.main.ts`],
  outfile: `${directory}/main.mjs`, bundle: true, format: 'esm', platform: 'node',
  plugins: [{name: 'audit-boundaries', setup(b) {
    b.onResolve({filter: /^(?:@variables\/variable-manager|@utils\/notifications|\.\/operation-controller)$/}, args => ({path: args.path, namespace: 'audit'}));
    b.onLoad({filter: /.*/, namespace: 'audit'}, args => ({contents:
      args.path.includes('variable-manager') ? `
        export const importVariableStore = (id, store) => globalThis.__auditStoreImports.push({id, ...store});
        export const exportVariableStore = () => ({});
        export const normalizeProficiencies = () => {};
      ` : args.path.includes('notifications') ? 'export const displayError = () => {};' : `
        export const _executeCharacterOperations = () => { throw new Error('Unexpected direct call'); };
        export const _executeCreatureOperations = _executeCharacterOperations;
      `
    }));
  }}],
});
try {
  const { executeOperations } = await import(pathToFileURL(`${directory}/main.mjs`));
  const older = executeOperations({type: 'CHARACTER', data: {revision: 'older'}});
  const newer = executeOperations({type: 'CHARACTER', data: {revision: 'newer'}});
  fakeWorkers[1].complete(0, 'newer'); await newer;
  fakeWorkers[0].complete(0, 'older'); await older;
  const order = globalThis.__auditStoreImports.map(s => s.revision);
  console.log(JSON.stringify({probe: 'out-of-order completions', storeImportOrder: order, staleStoreCommitted: order.at(-1)==='older'}));
  const failed = executeOperations({type: 'CHARACTER', data: {revision: 'crashes'}});
  const worker = fakeWorkers[0];
  const hasErrorHandler = typeof worker.onerror==='function';
  if (hasErrorHandler) worker.onerror({message: 'Simulated worker load/runtime failure'});
  const state = await Promise.race([failed.then(()=> 'resolved',()=> 'rejected'),new Promise(r=>setTimeout(()=>r('pending'),100))]);
  console.log(JSON.stringify({probe: 'worker runtime failure', hasErrorHandler, hasMessageErrorHandler: typeof worker.onmessageerror==='function', promiseState: state}));
} finally { await rm(directory,{recursive:true,force:true}); }
