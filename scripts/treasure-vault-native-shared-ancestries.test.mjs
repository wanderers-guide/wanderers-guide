import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { test } from "node:test";
import {
  sharedSpecFromBody,
  sharedAncestryRows,
  upgradeSharedAncestryBody,
  originalSharedAncestryBody,
  SHARED_TERMINAL_SHA256,
  SHARED_PREDECESSOR_SHA256,
  sharedAncestryUpgrade,
  SHARED_UPGRADE_PATH,
  SHARED_MOVE_PATH,
  sharedAncestryMigration,
  sharedAncestryRelease,
  SHARED_NATIVE_CONTROLS,
  sharedAncestryPendingSetup,
  SHARED_RIVAL_COUNT_SETUP,
  sharedAncestryDuplicateInsert,
} from "./treasure-vault-native-shared-ancestries.mjs";
import {
  extractReviewedTerminalHelper,
  terminalFunctionState,
  TERMINAL_HELPER,
} from "./treasure-vault-native-inputs.mjs";
const sha = (x) => createHash("sha256").update(x).digest("hex");
const read = (x) => readFile(new URL("../" + x, import.meta.url), "utf8");
const helper = extractReviewedTerminalHelper({
  migrationSql: await read("supabase/migrations/" + TERMINAL_HELPER.migration),
  releaseSql: await read("supabase/release/" + TERMINAL_HELPER.release),
});
const spec = JSON.parse(await read("supabase/release/shared-ancestries.json")),
  patches = sharedAncestryRows(spec);
const require = createRequire(
  new URL("../frontend/package.json", import.meta.url),
);
const ts = require("typescript");
const upload = ts.transpileModule(
  await read("supabase/functions/_shared/upload-utils.ts"),
  {
    compilerOptions: {
      target: ts.ScriptTarget.ESNext,
      module: ts.ModuleKind.ESNext,
    },
  },
).outputText;
const { uniqueId } = await import(
  "data:text/javascript;base64," + Buffer.from(upload).toString("base64")
);

test("queued ancestry fixtures satisfy every required database column before testing guard rejection", async () => {
  const schema = await read("data/schema.sql");
  const table = schema
    .split("CREATE TABLE public.content_update (\n")[1]
    .split("\n);")[0];
  const required = table
    .split("\n")
    .filter((line) => line.includes("NOT NULL") && !line.includes("DEFAULT"))
    .map((line) => line.trim().split(/\s+/)[0]);
  assert.ok(
    required.includes("action") &&
      required.includes("upvotes") &&
      required.includes("downvotes"),
  );
  for (const [source, data] of [
    [3, { id: 7 }],
    [3, { uuid: patches[4].before.uuid }],
    [3, { uuid: patches[4].after.uuid }],
    [3, { name: "Halfling" }],
    [579, { name: "Halfling", content_source_id: 3 }],
  ]) {
    const setup = sharedAncestryPendingSetup({
      source,
      data,
      userId: "00000000-0000-4000-8000-000000000001",
    });
    const columns = setup
      .match(/^insert into public\.content_update\(([^)]+)\)/)[1]
      .split(",");
    assert.deepEqual(
      required.filter((column) => !columns.includes(column)),
      [],
    );
    assert.ok(setup.includes(",'UPDATE',"));
    assert.ok(setup.includes("'{}'::json[],'{}'::json[]"));
    assert.ok(setup.includes("'" + JSON.stringify(data) + "'::jsonb"));
  }
});

test("the rival count fixture respects the source column's actual JSON type", async () => {
  const table = (await read("data/schema.sql"))
    .split("CREATE TABLE public.content_source (\n")[1]
    .split("\n);")[0];
  assert.match(table, /meta_data json[,\n]/);
  assert.ok(SHARED_RIVAL_COUNT_SETUP.includes("jsonb_set(meta_data::jsonb,"));
  assert.ok(SHARED_RIVAL_COUNT_SETUP.includes("false)::json where id=493;"));
});

test("the duplicate fixture supplies required ancestry fields and uses the real cache timestamp default", async () => {
  const table = (await read("data/schema.sql"))
    .split("CREATE TABLE public.ancestry (\n")[1]
    .split("\n);")[0];
  const definitions = table.split("\n").map((line) => line.trim());
  assert.match(
    definitions.find((line) => line.startsWith("updated_at ")),
    /DEFAULT .* NOT NULL/,
  );
  const columns = definitions
    .filter((line) => line.length > 0 && !line.includes("GENERATED"))
    .map((line) => line.split(/\s+/)[0]);
  const row = patches.find(
    (patch) => patch.table === "ancestry" && patch.id === 7,
  ).after;
  assert.equal(Object.hasOwn(row, "updated_at"), false);
  const setup = sharedAncestryDuplicateInsert({
    columns: columns.map((column) => '"' + column + '"').join(","),
    row,
  });
  const inserted = setup
    .match(/^insert into public\.ancestry\(([^)]+)\)/)[1]
    .split(",")
    .map((column) => column.slice(1, -1));
  assert.equal(inserted.includes("updated_at"), false);
  assert.equal(inserted.includes("search_tsv"), false);
  for (const definition of definitions.filter(
    (line) =>
      line.includes("NOT NULL") &&
      !line.includes("DEFAULT") &&
      !line.includes("GENERATED"),
  )) {
    const column = definition.split(/\s+/)[0];
    assert.ok(inserted.includes(column), column);
    assert.ok(Object.hasOwn(row, column), column);
  }
});

test("the native receipt requires all35 independent shared ancestry controls", () => {
  assert.equal(SHARED_NATIVE_CONTROLS.length, 35);
  assert.equal(new Set(SHARED_NATIVE_CONTROLS).size, 35);
  for (const name of [
    "partial-ancestry-7",
    "unreviewed-ancestry-7",
    "missing-halfling",
    "pending-new-uuid",
    "late-full-rollback",
  ])
    assert.ok(SHARED_NATIVE_CONTROLS.includes(name));
});

test("the six canonical bases retain every gameplay field and use the actual upload UUID derivation", () => {
  assert.deepEqual(sharedSpecFromBody(helper.body), spec);
  for (const p of patches) {
    assert.equal(
      p.after.uuid,
      String(
        uniqueId(
          p.before.name,
          p.table,
          p.before.level ?? p.before.rank ?? 0,
          3,
        ),
      ),
    );
    assert.deepEqual(
      { ...p.after, uuid: p.before.uuid, content_source_id: 1 },
      p.before,
    );
  }
  assert.deepEqual(
    patches.filter((p) => p.table === "ancestry").map((p) => p.before.name),
    ["Elf", "Dwarf", "Gnome", "Goblin", "Halfling", "Orc"],
  );
});

test("all4096 partial-state combinations reject except the two complete states, including Halfling7", () => {
  const accepted = [];
  for (let mask = 0; mask < 4096; mask++) {
    const rows = patches.map((p, i) => (mask & (1 << i) ? p.after : p.before));
    const valid =
      rows.every((r, i) => r === patches[i].before) ||
      rows.every((r, i) => r === patches[i].after);
    if (valid) accepted.push(mask);
  }
  assert.deepEqual(accepted, [0, 4095]);
  assert.ok(helper.body.includes("count(*)=12 and bool_and((row=expected"));
});

test("the original whole ledger, source corrections and paired classifications are reversible byte-for-byte", () => {
  const original = originalSharedAncestryBody(helper.body, spec);
  assert.equal(sha(original), SHARED_PREDECESSOR_SHA256);
  assert.equal(upgradeSharedAncestryBody(original, spec), helper.body);
  assert.equal(sha(helper.body), SHARED_TERMINAL_SHA256);
  assert.equal(
    helper.body.split("$global_dual$")[1],
    original.split("$global_dual$")[1],
  );
  assert.equal(
    helper.body.split("$catalog_compatibility103$")[1],
    original.split("$catalog_compatibility103$")[1],
  );
  assert.equal(
    helper.body.split("$source_corrections102$")[1],
    original.split("$source_corrections102$")[1],
  );
  assert.throws(() => upgradeSharedAncestryBody(original + "\n", spec));
});

test("registered SQL is exactly reproducible and rejects pending routes under both identities", async () => {
  assert.equal(
    await read("supabase/migrations/" + SHARED_UPGRADE_PATH),
    sharedAncestryUpgrade({
      spec,
      previousState: terminalFunctionState(SHARED_PREDECESSOR_SHA256),
      state: helper.state,
      signature: helper.signature,
    }),
  );
  assert.equal(
    await read("supabase/migrations/" + SHARED_MOVE_PATH),
    sharedAncestryMigration({
      spec,
      state: helper.state,
      signature: helper.signature,
    }),
  );
  assert.equal(
    await read("supabase/release/shared-ancestries.sql"),
    sharedAncestryRelease({
      spec,
      state: helper.state,
      signature: helper.signature,
    }),
  );
  for (const fragment of [
    "u.ref_id=(p->>'id')::bigint",
    "u.data->>'id'=p->>'id'",
    "p#>>'{before,uuid}',p#>>'{after,uuid}'",
    "u.content_source_id in(1,3)",
    "r.id<>(p->>'id')::bigint",
  ])
    assert.ok(helper.body.includes(fragment));
  assert.ok(helper.body.includes("type='feat')=79"));
  assert.equal(spec.rival_academies.meta_data.counts.feat, 78);
});

test("all original and successor content passes the real frontend content schemas", async () => {
  const esbuild = require("esbuild");
  const compiled = await esbuild.build({
    stdin: {
      contents:
        "export {AncestrySchema,TraitSchema} from './src/schemas/content';",
      resolveDir: new URL("../frontend/", import.meta.url).pathname,
      sourcefile: "shared-ancestry-schema-check.ts",
      loader: "ts",
    },
    bundle: true,
    write: false,
    format: "esm",
    platform: "node",
    tsconfig: new URL("../frontend/tsconfig.json", import.meta.url).pathname,
    logLevel: "silent",
  });
  const schemas = await import(
    "data:text/javascript;base64," +
      Buffer.from(compiled.outputFiles[0].text).toString("base64")
  );
  for (const p of patches)
    for (const row of [p.before, p.after]) {
      const schema =
        p.table === "ancestry" ? schemas.AncestrySchema : schemas.TraitSchema;
      const parsed = schema.safeParse({ ...row, uuid: Number(row.uuid) });
      assert.equal(parsed.success, true, JSON.stringify(parsed.error?.issues));
    }
});
