// Local-only replay of the observed HTTP 400/PGRST301 save response.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const repo = fileURLToPath(new URL('../../../', import.meta.url));
const require = createRequire(`${repo}/frontend/package.json`);
const { build } = require('esbuild');
const directory = await mkdtemp(join(tmpdir(), 'wg-session-audit-'));
const counters = { invokes: 0, sessionChecks: 0, notices: 0 };
class FunctionsHttpError extends Error { constructor(context) { super('HTTP error'); this.context = context; } }
globalThis.__auditHttpError = FunctionsHttpError;
globalThis.localStorage = { getItem: () => '{"id":"synthetic-user"}', removeItem: () => {} };
globalThis.__auditSupabase = {
  functions: { invoke: async () => {
    counters.invokes++;
    return { data: null, error: new FunctionsHttpError(new Response(JSON.stringify({ status: 'fail', data: { code: 'PGRST301', message: 'JWT expired' } }), { status: 400 })) };
  } },
  auth: { getSession: async () => { counters.sessionChecks++; return { data: { session: null } }; } },
};
globalThis.__auditNotice = () => counters.notices++;
const realConsoleError = console.error;
try {
  await build({ entryPoints: [`${repo}/frontend/src/request/request-manager.ts`], outfile: `${directory}/request.mjs`, bundle: true, platform: 'node', format: 'esm', plugins: [{ name: 'audit-boundaries', setup(b) {
    b.onResolve({ filter: /^(?:@supabase\/supabase-js|@utils\/error-handling|@mantine\/notifications|\.\.\/supabase-client)$/ }, args => ({ path: args.path, namespace: 'audit' }));
    b.onLoad({ filter: /.*/, namespace: 'audit' }, args => ({ contents:
      args.path.includes('supabase-js') ? 'export const FunctionsHttpError = globalThis.__auditHttpError; export class FunctionsFetchError extends Error {}; export class FunctionsRelayError extends Error {};' :
      args.path.includes('supabase-client') ? 'export const supabase = globalThis.__auditSupabase;' :
      args.path.includes('notifications') ? 'export const showNotification = globalThis.__auditNotice;' :
      'export const logError = () => {}; export const throwError = () => {};', loader: 'js' }));
  } }] });
  const { makeRequest, hasSessionExpiredNotice } = await import(pathToFileURL(`${directory}/request.mjs`).href);
  console.error = () => {}; // Suppress the expected synthetic failure log.
  const result = await makeRequest('update-character', { id: 1 });
  assert.equal(result, null);
  assert.deepEqual(counters, { invokes: 1, sessionChecks: 0, notices: 0 });
  assert.equal(hasSessionExpiredNotice(), false);
  console.log(JSON.stringify({ probe: 'expired JWT HTTP 400', result, ...counters, sessionExpiredNotice: hasSessionExpiredNotice() }));
} finally { console.error = realConsoleError; await rm(directory, { recursive: true, force: true }); }
