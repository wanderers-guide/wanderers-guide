/**
 * Content data audit pipeline.
 *
 * Reads every row of the WG content tables straight from Supabase, validates each
 * one against the SAME Zod schema the app uses at its cache boundary
 * (`validateAndWarn` in content-store.ts), and reports what's broken. Optionally
 * applies a small set of provably-safe normalizations back to the DB.
 *
 * Why this is trustworthy: the `find-*` edge functions do a plain `select()` with
 * no joins or enrichment, so a raw table row is byte-for-byte what the frontend
 * validates. Auditing the table directly can't produce false positives that the
 * live app wouldn't also hit.
 *
 * Auth: a single Supabase Personal Access Token (env `SUPABASE_PAT`). The script
 * self-serves the project's service_role key from the Management API, then uses
 * PostgREST for bulk reads and surgical writes — no second secret to manage.
 *
 * Safety model (three gears):
 *   (default)          read-only audit → console summary + JSON report. Never writes.
 *   --write            additionally COMPUTE fixes and print the exact per-row diffs,
 *                      but still write nothing (dry run).
 *   --write --apply    actually PATCH the fixed rows. Only rows that (a) fully
 *                      validate after the fix and (b) changed only whitelisted
 *                      top-level scalar columns are ever written.
 *
 * Usage (from frontend/):
 *   SUPABASE_PAT=sbp_... npm run audit:content
 *   SUPABASE_PAT=sbp_... npm run audit:content -- --tables spell,item --limit 500
 *   SUPABASE_PAT=sbp_... npm run audit:content -- --write            # preview fixes
 *   SUPABASE_PAT=sbp_... npm run audit:content -- --write --apply    # write fixes
 */

import { z } from 'zod';
import {
  AbilityBlockSchema,
  AncestrySchema,
  ArchetypeSchema,
  BackgroundSchema,
  ClassArchetypeSchema,
  ClassSchema,
  ContentSourceSchema,
  CreatureSchema,
  ItemSchema,
  LanguageSchema,
  SpellSchema,
  TraitSchema,
  VersatileHeritageSchema,
} from '../../src/schemas/content';
import { formatZodError } from '../../src/schemas/shared';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

// ─── Targets: one entry per content table ───────────────────────────────────

interface Target {
  /** ContentType slug (for display + report keys). */
  type: string;
  /** Postgres table name. */
  table: string;
  /** The Zod schema the app validates this content against. */
  schema: z.ZodTypeAny;
}

const TARGETS: Target[] = [
  { type: 'trait', table: 'trait', schema: TraitSchema },
  { type: 'item', table: 'item', schema: ItemSchema },
  { type: 'spell', table: 'spell', schema: SpellSchema },
  { type: 'class', table: 'class', schema: ClassSchema },
  { type: 'archetype', table: 'archetype', schema: ArchetypeSchema },
  { type: 'versatile-heritage', table: 'versatile_heritage', schema: VersatileHeritageSchema },
  { type: 'class-archetype', table: 'class_archetype', schema: ClassArchetypeSchema },
  { type: 'ability-block', table: 'ability_block', schema: AbilityBlockSchema },
  { type: 'creature', table: 'creature', schema: CreatureSchema },
  { type: 'ancestry', table: 'ancestry', schema: AncestrySchema },
  { type: 'background', table: 'background', schema: BackgroundSchema },
  { type: 'language', table: 'language', schema: LanguageSchema },
  { type: 'content-source', table: 'content_source', schema: ContentSourceSchema },
];

// ─── CLI args ────────────────────────────────────────────────────────────────

interface Args {
  tables?: string[];
  limit?: number;
  write: boolean;
  apply: boolean;
  outDir: string;
}

function parseArgs(argv: string[]): Args {
  // Reports go next to the source (process.cwd() is the frontend package dir when
  // run via `npm run audit:content`), NOT next to the bundled .dist/ output.
  const args: Args = { write: false, apply: false, outDir: 'scripts/audit-content/reports' };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--tables') args.tables = argv[++i]?.split(',').map((s) => s.trim());
    else if (a === '--limit') args.limit = parseInt(argv[++i], 10);
    else if (a === '--write') args.write = true;
    else if (a === '--apply') args.apply = true;
    else if (a === '--out') args.outDir = argv[++i];
  }
  if (args.apply && !args.write) {
    console.error('--apply requires --write. Refusing to run.');
    process.exit(2);
  }
  return args;
}

// ─── Supabase access (single PAT in, service_role out) ───────────────────────

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF ?? 'fdrjqcyjklatdrmjdnys';
const PAT = process.env.SUPABASE_PAT;
const MGMT = 'https://api.supabase.com';
const PAGE_SIZE = 1000;

interface DbAccess {
  restUrl: string;
  serviceKey: string;
}

/** Exchange the PAT for the project's service_role key + REST URL. */
async function resolveDbAccess(): Promise<DbAccess> {
  if (!PAT) {
    console.error('Set SUPABASE_PAT (a Supabase Personal Access Token). Aborting.');
    process.exit(2);
  }
  const res = await fetch(`${MGMT}/v1/projects/${PROJECT_REF}/api-keys`, {
    headers: { Authorization: `Bearer ${PAT}`, 'User-Agent': 'wg-content-audit/1.0' },
  });
  if (!res.ok) {
    console.error(`Management API rejected the PAT (HTTP ${res.status}). Aborting.`);
    process.exit(2);
  }
  const keys = (await res.json()) as Array<{ name: string; api_key: string }>;
  const serviceKey = keys.find((k) => k.name === 'service_role')?.api_key;
  if (!serviceKey) {
    console.error('No service_role key returned for this project. Aborting.');
    process.exit(2);
  }
  return { restUrl: `https://${PROJECT_REF}.supabase.co/rest/v1`, serviceKey };
}

/** Read an entire table via PostgREST Range pagination. */
async function* readTable(db: DbAccess, table: string, limit?: number): AsyncGenerator<Record<string, any>> {
  let offset = 0;
  let yielded = 0;
  for (;;) {
    const end = offset + PAGE_SIZE - 1;
    const res = await fetch(`${db.restUrl}/${table}?select=*&order=id.asc`, {
      headers: {
        apikey: db.serviceKey,
        Authorization: `Bearer ${db.serviceKey}`,
        Range: `${offset}-${end}`,
        'Range-Unit': 'items',
      },
    });
    if (!res.ok) {
      console.error(`  ! read ${table} failed (HTTP ${res.status}): ${await res.text()}`);
      return;
    }
    const rows = (await res.json()) as Record<string, any>[];
    if (rows.length === 0) return;
    for (const row of rows) {
      yield row;
      if (limit && ++yielded >= limit) return;
    }
    if (rows.length < PAGE_SIZE) return;
    offset += PAGE_SIZE;
  }
}

/** PATCH a single row's whitelisted columns. Returns true on success. */
async function patchRow(
  db: DbAccess,
  table: string,
  id: number,
  patch: Record<string, any>
): Promise<boolean> {
  const res = await fetch(`${db.restUrl}/${table}?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      apikey: db.serviceKey,
      Authorization: `Bearer ${db.serviceKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    console.error(`  ! PATCH ${table} id=${id} failed (HTTP ${res.status}): ${await res.text()}`);
    return false;
  }
  return true;
}

// ─── Safe fix engine ─────────────────────────────────────────────────────────
//
// A fix is applied ONLY if it makes the row fully valid AND the resulting diff
// touches only top-level scalar columns (path length 1). Nested-JSON fixes are
// reported for human review — they need the deliberate SQL patterns documented in
// the schema-validation workflow and are too risky to auto-apply blind.

/** Paths (as dotted strings) that failed validation for a given record. */
function failingPaths(error: z.ZodError): string[] {
  const paths = new Set<string>();
  for (const issue of error.issues) {
    paths.add(issue.path.join('.'));
    // Unions surface the real failures one level down.
    if (issue.code === 'invalid_union' && Array.isArray((issue as any).errors)) {
      for (const sub of (issue as any).errors as z.ZodIssue[][]) {
        for (const e of sub) paths.add([...issue.path, ...e.path].join('.'));
      }
    }
  }
  return [...paths].filter((p) => p.length > 0);
}

function getAtPath(obj: any, path: string): any {
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}
function setAtPath(obj: any, path: string, value: any): void {
  const keys = path.split('.');
  const last = keys.pop()!;
  const parent = keys.reduce((o, k) => (o == null ? undefined : o[k]), obj);
  if (parent != null) parent[last] = value;
}

/**
 * Try to repair a failing row with conservative normalizations, re-validating
 * after each. Returns the minimal top-level column patch that makes it valid, or
 * null if no safe fix exists.
 */
function computeSafeFix(
  schema: z.ZodTypeAny,
  row: Record<string, any>,
  error: z.ZodError
): { patch: Record<string, any>; notes: string[] } | null {
  const candidate = structuredClone(row);
  const notes: string[] = [];
  const paths = failingPaths(error);

  for (const path of paths) {
    const value = getAtPath(candidate, path);
    // Normalization 1: an empty string where a non-string (usually number|null)
    // is expected → null. This is the classic "empty string in a numeric column".
    if (value === '') {
      setAtPath(candidate, path, null);
      notes.push(`${path}: "" → null`);
    }
  }

  // Enum-casing: remap a string to an allowed option it case-insensitively matches.
  for (const issue of error.issues) {
    const opts = (issue as any).options ?? (issue as any).values;
    const p = issue.path.join('.');
    const cur = getAtPath(candidate, p);
    if (Array.isArray(opts) && typeof cur === 'string') {
      const match = opts.find((o: any) => typeof o === 'string' && o.toLowerCase() === cur.toLowerCase());
      if (match && match !== cur) {
        setAtPath(candidate, p, match);
        notes.push(`${p}: ${JSON.stringify(cur)} → ${JSON.stringify(match)}`);
      }
    }
  }

  if (notes.length === 0) return null;
  if (!schema.safeParse(candidate).success) return null; // fix didn't fully repair the row

  // Build the write patch from the diff, and require every changed key to be a
  // top-level scalar column — never auto-write nested JSON.
  const patch: Record<string, any> = {};
  for (const key of Object.keys(candidate)) {
    if (JSON.stringify(candidate[key]) !== JSON.stringify(row[key])) {
      const v = candidate[key];
      if (v !== null && (typeof v === 'object' || Array.isArray(v))) return null; // nested change → hands off
      patch[key] = v;
    }
  }
  if (Object.keys(patch).length === 0) return null;
  return { patch, notes };
}

// ─── Report shapes ───────────────────────────────────────────────────────────

interface RowFailure {
  id: number;
  name: string;
  summary: string;
  paths: string[];
  fix?: { patch: Record<string, any>; notes: string[] };
}

interface TableReport {
  type: string;
  table: string;
  total: number;
  valid: number;
  invalid: number;
  fixable: number;
  applied: number;
  /** Count of failures per field-path, most common first. */
  pathCounts: Record<string, number>;
  failures: RowFailure[];
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const db = await resolveDbAccess();
  const targets = args.tables ? TARGETS.filter((t) => args.tables!.includes(t.type)) : TARGETS;

  console.log(
    `\nContent audit — project ${PROJECT_REF} — ${
      args.apply ? 'APPLY (writing fixes)' : args.write ? 'DRY-RUN fixes' : 'read-only audit'
    }\n`
  );

  const reports: TableReport[] = [];

  for (const target of targets) {
    const report: TableReport = {
      type: target.type,
      table: target.table,
      total: 0,
      valid: 0,
      invalid: 0,
      fixable: 0,
      applied: 0,
      pathCounts: {},
      failures: [],
    };

    for await (const row of readTable(db, target.table, args.limit)) {
      report.total++;
      const parsed = target.schema.safeParse(row);
      if (parsed.success) {
        report.valid++;
        continue;
      }
      report.invalid++;
      const paths = failingPaths(parsed.error);
      for (const p of paths) report.pathCounts[p] = (report.pathCounts[p] ?? 0) + 1;

      const failure: RowFailure = {
        id: row.id,
        name: row.name ?? '',
        summary: formatZodError(row, parsed.error),
        paths,
      };

      if (args.write) {
        const fix = computeSafeFix(target.schema, row, parsed.error);
        if (fix) {
          failure.fix = fix;
          report.fixable++;
          if (args.apply) {
            const ok = await patchRow(db, target.table, row.id, fix.patch);
            if (ok) report.applied++;
          }
        }
      }
      report.failures.push(failure);
    }

    // Console line per table.
    const sortedPaths = Object.entries(report.pathCounts).sort((a, b) => b[1] - a[1]);
    const top = sortedPaths.slice(0, 4).map(([p, n]) => `${p}×${n}`).join(', ');
    const fixNote = args.apply
      ? `, applied ${report.applied}/${report.fixable}`
      : args.write
        ? `, ${report.fixable} auto-fixable`
        : '';
    const status = report.invalid === 0 ? 'OK ' : '!! ';
    console.log(
      `${status}${target.type.padEnd(18)} ${report.valid}/${report.total} valid` +
        (report.invalid ? `, ${report.invalid} invalid${fixNote}${top ? ` — top: ${top}` : ''}` : '')
    );
    reports.push(report);
  }

  // Totals.
  const totals = reports.reduce(
    (acc, r) => {
      acc.total += r.total;
      acc.invalid += r.invalid;
      acc.fixable += r.fixable;
      acc.applied += r.applied;
      return acc;
    },
    { total: 0, invalid: 0, fixable: 0, applied: 0 }
  );
  console.log(
    `\nTotals: ${totals.total} rows, ${totals.invalid} invalid, ${totals.fixable} auto-fixable` +
      (args.apply ? `, ${totals.applied} applied` : '')
  );

  // Write JSON report.
  mkdirSync(args.outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outFile = join(args.outDir, `content-audit-${stamp}.json`);
  writeFileSync(outFile, JSON.stringify({ project: PROJECT_REF, generatedAt: stamp, totals, reports }, null, 2));
  console.log(`\nFull report: ${outFile}`);

  // Exit non-zero when invalid rows exist and we didn't just fix them all — makes
  // this usable as a CI gate ("fail the build if content is invalid").
  const unresolved = totals.invalid - totals.applied;
  process.exit(unresolved > 0 && !args.write ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
