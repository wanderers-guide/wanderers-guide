import { originalCuratorBody, curatorUpgrade, wrapCuratorUpgrade } from './treasure-vault-native-curator-successors.mjs';
import { RUST_CLOUD_TERMINAL_SHA256 as rustHash } from './treasure-vault-native-rust-cloud.mjs';
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { createHash } from "node:crypto";
import {
  loadTreasureVaultDefaultNativeInputs,
  terminalFunctionState,
} from "./treasure-vault-native-inputs.mjs";
import { SHARED_TERMINAL_SHA256 } from "./treasure-vault-native-shared-ancestries.mjs";
import {
  RUST_CLOUD_UPGRADE_PATH,
  RUST_CLOUD_TERMINAL_SHA256,
  RUST_CLOUD_NATIVE_CONTROLS,
  rustCloudRows,
  rustCloudProjection,
  upgradeRustCloudBody,
  originalRustCloudBody,
  rustCloudUpgrade,
  assertRustCloudNativeEvidence,
} from "./treasure-vault-native-rust-cloud.mjs";

const read = (path) => readFile(new URL("../" + path, import.meta.url), "utf8");
const sha = (text) => createHash("sha256").update(text).digest("hex");
const inputs = await loadTreasureVaultDefaultNativeInputs({
  root: new URL("../", import.meta.url).pathname,
});
const { helper, rustCloudCompatibility: batch } = inputs;

test("the complete terminal guard recognizes the exact cleaned Rust Cloud row", async () => {
  const migration = await read(
    "supabase/migrations/20260927245900_treasure_vault_terminal_status.sql",
  );
  const body = migration.split("as $$")[1].split("$$;")[0];
  assert.ok(
    body.includes("$rust_cloud105$"),
    "The shared guard must include the exact cleaned-row projection",
  );
});

test("the description is the only allowed difference, including the complete printed rules and citation", () => {
  assert.deepEqual(
    { ...batch.rows.after, description: batch.rows.before.description },
    batch.rows.before,
  );
  assert.equal(batch.rows.after.id, 5081);
  assert.equal(batch.rows.after.rank, 4);
  assert.equal(
    batch.rows.after.meta_data.source.url,
    "https://2e.aonprd.com/Spells.aspx?ID=1377",
  );
  assert.equal(batch.rows.after.description.match(/concealed/g).length, 2);
  assert.ok(batch.rows.after.description.includes("[metal](link_trait_2132)"));
  assert.ok(
    batch.rows.after.description.includes("[Dismiss](link_action_19627)"),
  );
  assert.doesNotMatch(
    batch.rows.after.description,
    /@UUID|\\\[|link_condition|persistent,slashing/,
  );
  assert.throws(() =>
    rustCloudProjection({
      ...batch.rows,
      after: { ...batch.rows.after, rank: 5 },
    }),
  );
  assert.throws(() =>
    rustCloudProjection({
      ...batch.rows,
      after: {
        ...batch.rows.after,
        description: batch.rows.after.description + " ",
      },
    }),
  );
  assert.throws(() => rustCloudRows({ catalog: [] }));
});

test("one exact reversible splice preserves the whole original ledger and every other predicate", () => {
  const previous = originalRustCloudBody(helper.rustBody);
  assert.equal(sha(previous), SHARED_TERMINAL_SHA256);
  assert.equal(sha(helper.rustBody), RUST_CLOUD_TERMINAL_SHA256);
  assert.equal(upgradeRustCloudBody(previous, batch.rows), helper.rustBody);
  assert.equal(
    helper.body.split("$global_dual$")[1],
    previous.split("$global_dual$")[1],
  );
  assert.throws(() => upgradeRustCloudBody(previous + "\n", batch.rows));
  assert.throws(() => originalRustCloudBody(helper.rustBody + "\n"));
});

test("the additive migration changes only the exact function, with complete metadata and grant fences", async () => {
  const generated = rustCloudUpgrade({
    rows: batch.rows,
    previousState: terminalFunctionState(SHARED_TERMINAL_SHA256),
    state: terminalFunctionState(rustHash),
    signature: helper.signature,
  });
  assert.equal(batch.sql, wrapCuratorUpgrade(`begin;\n${generated}commit;\n`,curatorUpgrade({body:helper.rustBody,previousState:terminalFunctionState(rustHash),state:helper.state,signature:helper.signature}),helper.state));
  assert.equal(
    await read("supabase/migrations/" + RUST_CLOUD_UPGRADE_PATH),
    batch.sql,
  );
  assert.doesNotMatch(
    batch.sql,
    /\b(?:update public\.|delete from|insert into|grant (?:execute|select|all|usage)|revoke (?:execute|select|all|usage))/i,
  );
  for (const predicate of [
    "p.prosecdef is false",
    "p.proleakproof is false",
    "p.proowner=",
    "a.is_grantable is false",
    "p.proconfig=",
  ])
    assert.ok(batch.sql.includes(predicate));
  assert.ok(
    batch.sql.includes(
      "if pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(body,'UTF8')),'hex')<>",
    ),
  );
  assert.deepEqual(
    JSON.parse(await read("supabase/release/requirements.json"))[
      RUST_CLOUD_UPGRADE_PATH
    ],
    { check: "treasure-vault-terminal-status.sql", order: "before-functions" },
  );
});

test("native evidence requires all 18 controls and rejects missing or changed results", () => {
  const proof = {
    passed: true,
    native_executed: true,
    migration_sha256: sha(batch.sql),
    controls: RUST_CLOUD_NATIVE_CONTROLS.map((name) => ({
      name,
      passed: true,
      full_state_preserved: true,
      no_transport_error: true,
      actual_signal: null,
      actual_exit_status: name.startsWith("predecessor-") ? 3 : 0,
      sql_sha256: "a".repeat(64),
      ...(name.startsWith("predecessor-") ? { sqlstate: "P0001" } : {}),
    })),
  };
  const receipt = {
    rust_cloud_compatibility: proof,
    input_manifest: {
      entries: [
        {
          path: "supabase/migrations/" + RUST_CLOUD_UPGRADE_PATH,
          sha256: sha(batch.sql),
        },
      ],
    },
  };
  assert.equal(RUST_CLOUD_NATIVE_CONTROLS.length, 18);
  assert.equal(assertRustCloudNativeEvidence(receipt), true);
  for (const mutate of [
    (r) => {
      delete r.rust_cloud_compatibility;
    },
    (r) => {
      r.rust_cloud_compatibility.controls.pop();
    },
    (r) => {
      r.rust_cloud_compatibility.native_executed = false;
    },
    (r) => {
      r.rust_cloud_compatibility.controls[0].full_state_preserved = false;
    },
    (r) => {
      r.rust_cloud_compatibility.controls[1].actual_exit_status = 3;
    },
    (r) => {
      r.rust_cloud_compatibility.controls.at(-1).sqlstate = "57014";
    },
    (r) => {
      r.rust_cloud_compatibility.migration_sha256 = "f".repeat(64);
    },
  ]) {
    const changed = structuredClone(receipt);
    mutate(changed);
    assert.throws(() => assertRustCloudNativeEvidence(changed));
  }
});
