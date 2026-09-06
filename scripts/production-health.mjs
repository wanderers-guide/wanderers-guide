/** Bounded, read-only semantic probes. Never invoke paid work or mutate a user character. */
import { pathToFileURL } from 'node:url';
class ProbeError extends Error {}

export async function checkProduction({
  api = 'https://fdrjqcyjklatdrmjdnys.supabase.co',
  site = 'https://wanderersguide.app',
  anonKey = process.env.WG_MONITOR_ANON_KEY,
  request = fetch,
} = {}) {
  const results = [];
  const probe = async (name, action) => {
    const started = Date.now();
    try {
      await action();
      results.push({ name, passed: true, duration_ms: Date.now() - started });
    } catch (error) {
      // Keep response bodies, request headers and provider internals out of artifacts.
      results.push({ name, passed: false, duration_ms: Date.now() - started,
        reason: error instanceof ProbeError ? error.message : 'Request failed' });
    }
  };
  const read = async (url, options = {}) => {
    const response = await request(url, { ...options, signal: AbortSignal.timeout(15_000), redirect: 'error' });
    if (!response.ok) throw new ProbeError(`HTTP ${response.status}`);
    if (!response.body) throw new ProbeError('Empty response');
    const reader = response.body.getReader();
    const chunks = [];
    let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 1_000_000) throw new ProbeError('Unexpected response size');
        chunks.push(value);
      }
    } finally { await reader.cancel().catch(() => {}); }
    return Buffer.concat(chunks).toString('utf8');
  };
  const content = async (name, body, validate) => {
    const text = await read(`${api}/functions/v1/${name}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    let response;
    try { response = JSON.parse(text); } catch { throw new ProbeError('Invalid JSON'); }
    if (response.status !== 'success' || !validate(response.data)) throw new ProbeError('Semantic content check failed');
  };
  await Promise.all([
    probe('frontend', async () => {
      const html = await read(site);
      if (!/<div[^>]+id="root"/.test(html) || !/<script[^>]+type="module"/.test(html)) throw new ProbeError('App entry point missing');
    }),
    probe('auth', async () => {
      if (!anonKey) throw new ProbeError('WG_MONITOR_ANON_KEY is not configured');
      const health = JSON.parse(await read(`${api}/auth/v1/health`, { headers: { apikey: anonKey } }));
      if (typeof health.version !== 'string') throw new ProbeError('Auth health payload invalid');
    }),
    probe('content-source', () => content('find-content-source', { id: 3 }, data => data?.id === 3 && typeof data.name === 'string')),
    probe('content-versions', () => content('get-content-versions', { ids: [3] }, data => Array.isArray(data) && data.some(row => row.id === 3 && typeof row.updated_at === 'string'))),
  ]);
  return { checked_at: new Date().toISOString(), passed: results.every(result => result.passed), checks: results };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = await checkProduction();
  console.log(JSON.stringify(result, null, 2));
  if (!result.passed) process.exitCode = 1;
}
