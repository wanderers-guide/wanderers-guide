/**
 * Single-row content repair — the write half of the audit pipeline.
 *
 * Fetches ONE content row, applies the registered repair rules for its type,
 * re-validates the result against the same Zod schema the app uses, shows the
 * exact before/after diff, and (only with --apply) writes the changed columns
 * back to the database.
 *
 * This is for DATA fixes — a genuinely malformed value in a specific row — as
 * opposed to schema fixes (which are code changes to the Zod schemas). The
 * guarantee: a row is only written if it FULLY validates after the repair, so a
 * fix can never make a row worse than the auditor found it.
 *
 * Auth: one Supabase PAT in `SUPABASE_PAT` (self-serves the service_role key).
 *
 * Usage (from frontend/):
 *   SUPABASE_PAT=sbp_... npm run fix:content -- --type class --id 160          # dry-run
 *   SUPABASE_PAT=sbp_... npm run fix:content -- --type class --id 160 --apply  # write
 *   SUPABASE_PAT=sbp_... npm run fix:content -- --type item --ids 12764,12765 --apply
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

// ─── Targets ─────────────────────────────────────────────────────────────────

interface Target {
  table: string;
  schema: z.ZodTypeAny;
}
const TARGETS: Record<string, Target> = {
  trait: { table: 'trait', schema: TraitSchema },
  item: { table: 'item', schema: ItemSchema },
  spell: { table: 'spell', schema: SpellSchema },
  class: { table: 'class', schema: ClassSchema },
  archetype: { table: 'archetype', schema: ArchetypeSchema },
  'versatile-heritage': { table: 'versatile_heritage', schema: VersatileHeritageSchema },
  'class-archetype': { table: 'class_archetype', schema: ClassArchetypeSchema },
  'ability-block': { table: 'ability_block', schema: AbilityBlockSchema },
  creature: { table: 'creature', schema: CreatureSchema },
  ancestry: { table: 'ancestry', schema: AncestrySchema },
  background: { table: 'background', schema: BackgroundSchema },
  language: { table: 'language', schema: LanguageSchema },
  'content-source': { table: 'content_source', schema: ContentSourceSchema },
};

// ─── Repair rules ────────────────────────────────────────────────────────────
//
// A rule mutates a cloned row in place and pushes human-readable notes for every
// change. Rules must be conservative and reversible-in-spirit; the re-validation
// gate below is the real safety net — a repaired row that still doesn't validate
// is never written.

/** Median class HP-per-level across all classes; the safest default for a broken one. */
const DEFAULT_CLASS_HP_PER_LEVEL = 8;

type Repair = (type: string, row: Record<string, any>, notes: string[]) => void;

const REPAIRS: Repair[] = [
  // A `setValue MAX_HEALTH_CLASS_PER_LEVEL` with a null value = the class has no HP
  // per level, so its characters get no class HP (a live bug). Restore a number.
  // 8 is the PF2e median; flagged so the content owner can adjust if it should differ.
  function fixNullClassHp(type, row, notes) {
    if (type !== 'class') return;
    for (const op of row.operations ?? []) {
      if (
        op?.type === 'setValue' &&
        op?.data?.variable === 'MAX_HEALTH_CLASS_PER_LEVEL' &&
        (op.data.value === null || op.data.value === undefined)
      ) {
        op.data.value = DEFAULT_CLASS_HP_PER_LEVEL;
        notes.push(
          `operations[${row.operations.indexOf(op)}].data.value: null → ${DEFAULT_CLASS_HP_PER_LEVEL} ` +
            `(MAX_HEALTH_CLASS_PER_LEVEL; PF2e median — confirm if this class should differ)`
        );
      }
    }
  },

  // Empty strings in numeric meta_data fields (attack_bonus, charges.max, starfinder.usage).
  // These are now nullable in the schema, so "" → null makes them valid and semantically
  // correct ("no value"). Only touches these specific known-numeric leaves.
  function fixEmptyNumericMeta(type, row, notes) {
    if (type !== 'item' || !row.meta_data) return;
    const md = row.meta_data;
    const setNull = (obj: any, key: string, path: string) => {
      if (obj && obj[key] === '') {
        obj[key] = null;
        notes.push(`meta_data.${path}: "" → null`);
      }
    };
    setNull(md, 'attack_bonus', 'attack_bonus');
    if (md.charges) setNull(md.charges, 'max', 'charges.max');
    if (md.charges) setNull(md.charges, 'current', 'charges.current');
    if (md.starfinder) setNull(md.starfinder, 'usage', 'starfinder.usage');
  },
];

// ─── Supabase access (same single-PAT flow as the auditor) ───────────────────

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF ?? 'fdrjqcyjklatdrmjdnys';
const PAT = process.env.SUPABASE_PAT;
const MGMT = 'https://api.supabase.com';

async function resolveDbAccess(): Promise<{ restUrl: string; serviceKey: string }> {
  if (!PAT) {
    console.error('Set SUPABASE_PAT. Aborting.');
    process.exit(2);
  }
  const res = await fetch(`${MGMT}/v1/projects/${PROJECT_REF}/api-keys`, {
    headers: { Authorization: `Bearer ${PAT}`, 'User-Agent': 'wg-content-fix/1.0' },
  });
  if (!res.ok) {
    console.error(`Management API rejected the PAT (HTTP ${res.status}).`);
    process.exit(2);
  }
  const keys = (await res.json()) as Array<{ name: string; api_key: string }>;
  const serviceKey = keys.find((k) => k.name === 'service_role')?.api_key;
  if (!serviceKey) {
    console.error('No service_role key for this project.');
    process.exit(2);
  }
  return { restUrl: `https://${PROJECT_REF}.supabase.co/rest/v1`, serviceKey };
}

async function fetchRow(db: { restUrl: string; serviceKey: string }, table: string, id: number) {
  const res = await fetch(`${db.restUrl}/${table}?id=eq.${id}&select=*`, {
    headers: { apikey: db.serviceKey, Authorization: `Bearer ${db.serviceKey}` },
  });
  if (!res.ok) throw new Error(`fetch ${table} id=${id} → HTTP ${res.status}`);
  const rows = (await res.json()) as Record<string, any>[];
  return rows[0] ?? null;
}

async function patchRow(
  db: { restUrl: string; serviceKey: string },
  table: string,
  id: number,
  patch: Record<string, any>
) {
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
  if (!res.ok) throw new Error(`PATCH ${table} id=${id} → HTTP ${res.status}: ${await res.text()}`);
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const argv = process.argv.slice(2);
  let type = '';
  const ids: number[] = [];
  let apply = false;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--type') type = argv[++i];
    else if (argv[i] === '--id') ids.push(parseInt(argv[++i], 10));
    else if (argv[i] === '--ids') ids.push(...argv[++i].split(',').map((s) => parseInt(s.trim(), 10)));
    else if (argv[i] === '--apply') apply = true;
  }
  const target = TARGETS[type];
  if (!target || ids.length === 0) {
    console.error('Usage: --type <contentType> --id <n> [--ids a,b] [--apply]');
    console.error(`Known types: ${Object.keys(TARGETS).join(', ')}`);
    process.exit(2);
  }

  const db = await resolveDbAccess();
  console.log(`\nRepair — ${type} — ${apply ? 'APPLY (writing)' : 'DRY-RUN'}\n`);

  let fixed = 0;
  let skipped = 0;
  for (const id of ids) {
    const row = await fetchRow(db, target.table, id);
    if (!row) {
      console.log(`  ${type} id=${id}: not found`);
      continue;
    }

    const before = target.schema.safeParse(row);
    if (before.success) {
      console.log(`  ${type} id=${id} "${row.name ?? ''}": already valid, nothing to do`);
      continue;
    }

    // Repair a clone, then re-validate.
    const candidate = structuredClone(row);
    const notes: string[] = [];
    for (const repair of REPAIRS) repair(type, candidate, notes);

    const after = target.schema.safeParse(candidate);
    console.log(`  ${type} id=${id} "${row.name ?? ''}":`);
    console.log(`    was invalid: ${formatZodError(row, before.error)}`);
    if (notes.length === 0) {
      console.log('    no repair rule matched — needs manual review');
      skipped++;
      continue;
    }
    for (const n of notes) console.log(`    fix: ${n}`);
    if (!after.success) {
      console.log(`    STILL invalid after fix — NOT writing: ${formatZodError(candidate, after.error)}`);
      skipped++;
      continue;
    }
    console.log('    validates after fix ✓');

    // Only write the columns that actually changed.
    const patch: Record<string, any> = {};
    for (const key of Object.keys(candidate)) {
      if (JSON.stringify(candidate[key]) !== JSON.stringify(row[key])) patch[key] = candidate[key];
    }
    console.log(`    changed columns: ${Object.keys(patch).join(', ')}`);

    if (apply) {
      await patchRow(db, target.table, id, patch);
      // Read back and re-validate to confirm the write landed and is valid.
      const confirmed = await fetchRow(db, target.table, id);
      const ok = target.schema.safeParse(confirmed).success;
      console.log(`    written; re-validated from DB: ${ok ? 'valid ✓' : 'STILL INVALID ✗'}`);
      fixed++;
    } else {
      console.log('    (dry-run — pass --apply to write)');
      fixed++;
    }
  }

  console.log(`\n${apply ? 'Applied' : 'Would fix'}: ${fixed}, skipped (needs review): ${skipped}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
