import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const execute = promisify(execFile);
const batches = [
  [
    "20261008160000_tech_core_introductory_spells.sql",
    "tech-core-introductory-spells-citation-compatibility.sql",
    "tech-core-introductory-spells",
  ],
  [
    "20261008190000_tech_core_general_spells.sql",
    "tech-core-general-spells-citation-compatibility.sql",
    "tech-core-general-spells",
  ],
  [
    "20261011000100_incarnate_release_compatibility.sql",
    "tech-core-general-spells-citation-compatibility.sql",
    "tech-core-general-spells",
  ],
];

/** Exercise the actual bootstrap shell script with a logging Docker boundary, never a database. */
async function bootstrap(mode) {
  const directory = await mkdtemp(join(tmpdir(), "wg-content-bootstrap-"));
  try {
    for (const path of [
      "data",
      "bin",
      "supabase/migrations",
      "supabase/release",
    ])
      await mkdir(join(directory, path), { recursive: true });
    await copyFile(
      join(root, "data/create-db-docker.sh"),
      join(directory, "data/create-db-docker.sh"),
    );
    for (const path of ["schema.sql", "data.sql", "auth-trigger.sql"])
      await writeFile(join(directory, "data", path), "-- model input\n");
    await writeFile(
      join(directory, "supabase/migrations/20261001000000_ordinary.sql"),
      "select 42;\n",
    );
    const originals = [];
    for (const [migration, check] of batches) {
      originals.push(
        await readFile(join(root, "supabase/migrations", migration), "utf8"),
      );
      await copyFile(
        join(root, "supabase/migrations", migration),
        join(directory, "supabase/migrations", migration),
      );
      await copyFile(
        join(root, "supabase/release", check),
        join(directory, "supabase/release", check),
      );
    }
    await writeFile(
      join(directory, "bin/docker"),
      `#!${process.execPath}
const fs = require('node:fs');
const args = process.argv.slice(2);
if (args[0] === 'ps') { process.stdout.write('owned-fixture-db\\n'); process.exit(0); }
if (args[0] !== 'exec' || args[2] !== 'owned-fixture-db') throw new Error('Unexpected Docker target');
const sql = fs.readFileSync(0, 'utf8');
fs.appendFileSync(process.env.WG_BOOTSTRAP_CALLS, JSON.stringify({ args, sql }) + '\\n');
if (process.env.WG_BOOTSTRAP_MODE === 'migration-error' && sql.includes('do $import_tech_spells$')) process.exit(3);
if (sql.includes('tc_citation_choices as materialized')) {
  const id = sql.includes('six-spell batch') ? 'tech-core-introductory-spells' : 'tech-core-general-spells';
  const mode = process.env.WG_BOOTSTRAP_MODE;
  const reads = fs.readFileSync(process.env.WG_BOOTSTRAP_CALLS, 'utf8').trim().split('\\n').map(JSON.parse)
    .filter(entry => entry.sql.includes('tc_citation_choices as materialized') && entry.sql.includes('six-spell batch') === sql.includes('six-spell batch')).length;
  if (mode === 'after-error' && reads > 1) process.exit(3);
  if (mode === 'error') process.exit(3);
  if (mode === 'empty') process.exit(0);
  if (mode === 'malformed' || (mode === 'after-malformed' && reads > 1)) process.stdout.write('unexpected|t\\n');
  else if (mode === 'multiple') process.stdout.write(id + '|t\\n' + id + '|t\\n');
  else process.stdout.write(id + '|' + (mode === 'absent' ? (reads === 1 ? 'f' : 't') : ['migration-error','after-error','after-malformed'].includes(mode) ? 'f' : mode) + '\\n');
}
`,
      { mode: 0o755 },
    );
    let result;
    try {
      result = await execute(
        "bash",
        [join(directory, "data/create-db-docker.sh"), "owned-fixture-db"],
        {
          cwd: directory,
          env: {
            ...process.env,
            PATH: join(directory, "bin") + ":" + process.env.PATH,
            WG_BOOTSTRAP_MODE: mode,
            WG_BOOTSTRAP_CALLS: join(directory, "calls.jsonl"),
          },
        },
      );
      result.code = 0;
    } catch (error) {
      result = error;
    }
    const calls = (await readFile(join(directory, "calls.jsonl"), "utf8"))
      .trim()
      .split("\n")
      .map(JSON.parse);
    return { code: result.code, calls, originals, stderr: result.stderr };
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

test("current compatible Tech Core batches are verified read-only instead of replaying obsolete import assumptions", async () => {
  const { code, calls, originals } = await bootstrap("t");
  assert.equal(code, 0);
  const checks = calls.filter(({ sql }) =>
    sql.includes("tc_citation_choices as materialized"),
  );
  assert.equal(checks.length, 3);
  for (const [index, { args, sql }] of checks.entries()) {
    assert.ok(args.includes("-q") && args.includes("-At"));
    const completeQuery = await readFile(
      join(root, "supabase/release", batches[index][1]),
      "utf8",
    );
    assert.equal(
      sql,
      "BEGIN READ ONLY;\n" + completeQuery + "\nROLLBACK;\n",
      "the complete registered predicate remains intact",
    );
  }
  assert.equal(
    calls.some(({ sql }) => sql === "select 42;\n"),
    true,
    "ordinary migrations still execute",
  );
  for (const original of originals)
    assert.equal(
      calls.some(({ sql }) => sql === original),
      false,
    );
});

test("a false compatibility result cannot bypass a failure in the original migration", async () => {
  const { code, calls, originals } = await bootstrap("migration-error");
  assert.equal(code, 3);
  assert.equal(calls.filter(({ sql }) => sql === originals[0]).length, 1);
  assert.equal(
    calls.some(({ sql }) => sql === originals[1]),
    false,
  );
});

test("an absent batch uses the unchanged original migration and must then pass the complete compatibility check", async () => {
  const { code, calls, originals } = await bootstrap("absent");
  assert.equal(code, 0);
  for (const original of originals.slice(0, 2))
    assert.equal(calls.filter(({ sql }) => sql === original).length, 1);
  assert.equal(
    calls.filter(({ sql }) =>
      sql.includes("tc_citation_choices as materialized"),
    ).length,
    5,
  );
  assert.equal(calls.some(({sql}) => sql === originals[2]), false, 'The obsolete guard is replaced only by its complete registered successor check');
});

for (const mode of ["f", "after-error", "after-malformed"]) {
  test(`the old migration cannot bypass ${mode} post-import compatibility`, async () => {
    const { code, calls, originals } = await bootstrap(mode);
    assert.notEqual(code, 0);
    assert.equal(calls.filter(({ sql }) => sql === originals[0]).length, 1);
    assert.equal(
      calls.some(({ sql }) => sql === originals[1]),
      false,
    );
  });
}

for (const mode of ["error", "empty", "malformed", "multiple"]) {
  test(`bootstrap fails closed on ${mode} compatibility output`, async () => {
    const { code, calls, originals } = await bootstrap(mode);
    assert.notEqual(code, 0);
    for (const original of originals)
      assert.equal(
        calls.some(({ sql }) => sql === original),
        false,
      );
  });
}
