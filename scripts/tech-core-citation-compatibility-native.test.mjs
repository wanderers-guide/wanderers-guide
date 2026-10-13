import assert from "node:assert/strict";
import path from "node:path";
import { execFileSync } from "node:child_process";
import test from "node:test";
import {
  prepareNative,
  runNativeControls,
} from "./tech-core-citation-compatibility-native.mjs";

const directory = path.dirname(new URL(import.meta.url).pathname);
const repository =
  process.env.WG_CITATION_REPOSITORY ?? path.resolve(directory, "..");
const prepared = await prepareNative(repository, undefined);

/** Lexical quote witness only, deliberately not a PostgreSQL syntax or behavior substitute. */
function sqlTokens(sql) {
  const tokens = [];
  let index = 0;
  while (index < sql.length) {
    if (sql.startsWith("--", index)) {
      const newline = sql.indexOf("\n", index);
      index = newline < 0 ? sql.length : newline + 1;
      continue;
    }
    const tag = sql.slice(index).match(/^\$(?:[a-zA-Z_][a-zA-Z0-9_]*)?\$/)?.[0];
    if (tag) {
      const end = sql.indexOf(tag, index + tag.length);
      assert(end >= 0, "Unclosed dollar literal");
      index = end + tag.length;
      continue;
    }
    if (sql[index] === "'") {
      index++;
      let closed = false;
      while (index < sql.length) {
        if (sql[index] === "'") {
          if (sql[index + 1] === "'") {
            index += 2;
            continue;
          }
          index++;
          closed = true;
          break;
        }
        index++;
      }
      assert(closed, "Unclosed SQL string");
      continue;
    }
    const word = sql.slice(index).match(/^[a-zA-Z_][a-zA-Z0-9_]*/)?.[0];
    if (word) {
      tokens.push(word.toLowerCase());
      index += word.length;
    } else {
      if (sql[index] === ";") tokens.push(";");
      index++;
    }
  }
  return tokens;
}

test("focused actual-native recipe has200 controls, all16/92 dependency negatives and retained original controls", () => {
  assert.equal(prepared.focused.length, 200);
  assert.equal(prepared.cases.length, 692);
  assert.equal(
    prepared.focused.filter((control) =>
      control.name.startsWith("intro-dependency-"),
    ).length,
    16,
  );
  assert.equal(
    prepared.focused.filter((control) =>
      control.name.startsWith("retained-incarnate-reject-dependency-"),
    ).length,
    92,
  );
  assert.equal(
    prepared.cases.filter((control) => control.name.startsWith("retained-"))
      .length,
    306,
  );
  assert.equal(
    new Set(prepared.focused.map((control) => control.name)).size,
    200,
  );
  assert.equal(
    prepared.focused.filter((control) =>
      control.name.startsWith("accepted-general-"),
    ).length,
    4,
  );
  assert.equal(
    prepared.focused.filter((control) =>
      control.name.startsWith("accepted-intro-"),
    ).length,
    4,
  );
  assert.equal(
    prepared.focused.filter((control) => control.schemaRejection).length,
    3,
  );
  assert.equal(
    prepared.cases.filter((control) => control.schemaRejection).length,
    8,
  );
  for (const control of prepared.focused.filter(
    (control) => control.schemaRejection,
  ))
    assert.deepEqual(control.schemaRejection, {
      sqlstate: "23505",
      constraint: "trait_uuid_key",
    });
  for (const suffix of ["alias-name", "alias-global-citation"])
    assert.equal(
      prepared.focused.find(
        (control) => control.name === "successor-5225-general-" + suffix,
      ).schemaRejection,
      undefined,
    );
  assert(
    prepared.focused.find(
      (control) =>
        control.name === "accepted-original-intro-only-without-Station",
    ).expected,
  );
});

test("each complete candidate is a single read-only query with balanced quoted literals", () => {
  for (const query of Object.values(prepared.queries)) {
    const tokens = sqlTokens(query);
    assert.equal(tokens.filter((token) => token === ";").length, 1);
    for (const token of [
      "insert",
      "update",
      "delete",
      "alter",
      "create",
      "drop",
      "truncate",
      "grant",
      "revoke",
    ])
      assert(!tokens.includes(token), "Not read only: " + token);
  }
  for (const control of prepared.cases) sqlTokens(control.mutation);
  assert.throws(
    () => sqlTokens("select q.ref_id::text=e.row->>'content_source_id)"),
    /Unclosed/,
  );
});

test("focused pending matrix includes both actions and null-ref payloadref,8 sourcealiases,unknown states and typed namespace preservation", () => {
  for (const action of ["CREATE", "UPDATE"])
    for (const route of ["ref", "data-id", "data-ref-id", "UUID", "citation"])
      assert.equal(
        prepared.focused.find(
          (control) =>
            control.name ===
            `successor-5225-general-pending-${action}-${route}`,
        ).expected,
        false,
      );
  assert.equal(
    prepared.focused.filter((control) =>
      control.name.startsWith("successor-5225-general-pending-nested-"),
    ).length,
    8,
  );
  assert.equal(
    prepared.focused.filter((control) =>
      control.name.startsWith("successor-5225-general-pending-status-"),
    ).length,
    3,
  );
  for (const state of ["original", "successor"]) {
    assert.equal(
      prepared.focused.find(
        (control) =>
          control.name === state + "-5225-general-pending-UPDATE-data-ref-id",
      ).expected,
      false,
    );
    assert.equal(
      prepared.focused.find(
        (control) =>
          control.name ===
          state + "-5225-general-pending-valid-spell-namespace",
      ).expected,
      true,
    );
    for (const status of ["APPROVED", "REJECTED"])
      assert.equal(
        prepared.focused.find(
          (control) =>
            control.name === state + "-5225-general-closed-" + status,
        ).expected,
        true,
      );
    assert.equal(
      prepared.focused.find(
        (control) => control.name === state + "-5225-general-pending-unrelated",
      ).expected,
      true,
    );
  }
});

test("actual-native entry refuses a non-hosted subprocess before any supplied fixture call", () => {
  const url = new URL(
    "./tech-core-citation-compatibility-native.mjs",
    import.meta.url,
  ).href;
  const code = `import assert from 'node:assert/strict';import {runNativeControls} from ${JSON.stringify(url)};
let accessed=false;const fixture=new Proxy({},{get(){accessed=true;throw new Error('Fixture must remain inert');}});
await assert.rejects(runNativeControls({prepared:{},fixture}),/false|undefined|true/);assert.equal(accessed,false);
process.stdout.write('Refused before fixture access.');`;
  const result = execFileSync(
    process.execPath,
    ["--input-type=module", "-e", code],
    {
      encoding: "utf8",
      timeout: 5000,
      env: { ...process.env, GITHUB_ACTIONS: "false" },
    },
  );
  assert.equal(result, "Refused before fixture access.");
});
