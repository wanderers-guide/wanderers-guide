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
