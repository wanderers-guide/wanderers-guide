/** Read-only audit of stored content against the same schemas as validate:content. */
import { closeSync, fchmodSync, mkdirSync, openSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { parseArgs } from 'node:util';
import { CONTENT_SCHEMAS } from './content-schemas';

type Row = Record<string, unknown> & { id: number };
type TableReport = { type: string; scanned: number; invalid: number; complete: boolean };
const report = {
  startedAt: new Date().toISOString(),
  complete: false,
  tables: [] as TableReport[],
  issues: [] as { type: string; id: number; path: string; message: string }[],
  error: undefined as string | undefined,
};

async function main() {
  const { values } = parseArgs({
    options: { tables: { type: 'string' }, out: { type: 'string' }, help: { type: 'boolean' } },
    allowPositionals: false,
  });
  if (values.help) {
    console.log('audit:content [--tables item,spell] [--out report.json]');
    console.log('Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. GET requests only.');
    console.log(`Types: ${Object.keys(CONTENT_SCHEMAS).join(', ')}`);
    return;
  }
  const types = values.tables?.split(',').map((type) => type.trim()) ?? Object.keys(CONTENT_SCHEMAS);
  if (!types.length || types.some((type) => !Object.hasOwn(CONTENT_SCHEMAS, type))) {
    throw new Error('Unknown content type. Run with --help to list supported types.');
  }
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const origin = new URL(process.env.SUPABASE_URL ?? '');
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname);
  if (!key || (origin.protocol !== 'https:' && !(local && origin.protocol === 'http:'))) {
    throw new Error('Supply SUPABASE_URL (HTTPS, or local HTTP) and SUPABASE_SERVICE_ROLE_KEY.');
  }
  if (origin.username || origin.password || origin.search || origin.hash || origin.pathname !== '/') {
    throw new Error('SUPABASE_URL must be an origin without credentials, path, query, or fragment.');
  }
  const output = values.out ?? 'scripts/reports/content-audit.json';

  /** Reject unreadable/malformed pages instead of silently reporting a clean table. */
  async function read(table: string, params: Record<string, string>): Promise<Row[]> {
    const url = new URL(`/rest/v1/${table}`, origin);
    url.search = new URLSearchParams(params).toString();
    const response = await fetch(url, {
      method: 'GET',
      headers: { apikey: key!, Authorization: `Bearer ${key}` },
      redirect: 'error',
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) throw new Error(`${table}: read failed (HTTP ${response.status}).`);
    const rows: unknown = await response.json();
    if (!Array.isArray(rows) || rows.some((row) => !row || !Number.isSafeInteger(row.id))) {
      throw new Error(`${table}: expected an array of rows with integer IDs.`);
    }
    return rows;
  }

  try {
    for (const type of new Set(types)) {
      const table = type.replaceAll('-', '_');
      const summary: TableReport = { type, scanned: 0, invalid: 0, complete: false };
      report.tables.push(summary);
      // Bound inserts during the scan. This is a live scan, not a transactional snapshot.
      const upper = (await read(table, { select: 'id', order: 'id.desc', limit: '1' }))[0]?.id;
      let cursor: number | undefined;
      while (upper !== undefined) {
        const params: Record<string, string> = { select: '*', order: 'id.asc', limit: '1000', id: `lte.${upper}` };
        if (cursor !== undefined) params.and = `(id.gt.${cursor})`;
        const rows = await read(table, params);
        if (!rows.length) break;
        for (const row of rows) {
          if ((cursor !== undefined && row.id <= cursor) || row.id > upper) {
            throw new Error(`${table}: pagination did not advance within the requested ID range.`);
          }
          cursor = row.id;
          summary.scanned++;
          const result = CONTENT_SCHEMAS[type].safeParse(row);
          if (result.success) continue;
          summary.invalid++;
          for (const issue of result.error.issues) {
            report.issues.push({ type, id: row.id, path: issue.path.join('.'), message: issue.message });
          }
        }
        // Keep going even after a short page: the server may cap pages below 1,000 rows.
      }
      summary.complete = true;
      console.log(`${type}: ${summary.scanned - summary.invalid}/${summary.scanned} valid`);
    }
    report.complete = true;
    process.exitCode = report.issues.length ? 1 : 0;
  } catch (error) {
    report.error = error instanceof Error ? error.message : 'Audit failed.';
    console.error(`INCOMPLETE: ${report.error}`);
    process.exitCode = 2;
  }
  mkdirSync(dirname(output), { recursive: true });
  const file = openSync(output, 'w', 0o600);
  try {
    // Also restrict existing report files before writing unpublished content identifiers.
    fchmodSync(file, 0o600);
    writeFileSync(file, JSON.stringify(report, null, 2) + '\n');
  } finally {
    closeSync(file);
  }
  console.log(`${report.complete ? 'Complete' : 'Incomplete'} report: ${output}`);
}

main().catch(() => {
  // Avoid echoing URLs, credentials, or arbitrary CLI input from native error messages.
  console.error('Audit could not run. Check arguments, credentials, URL, and report path; see --help.');
  process.exitCode = 2;
});
