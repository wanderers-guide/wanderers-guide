/** Exact, reversible compatibility for the reviewed Scent and Enthrall curator corrections. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { RUST_CLOUD_TERMINAL_SHA256 } from "./treasure-vault-native-rust-cloud.mjs";
import { bookCountReplacement, originalBookCountBody, upgradeBookCountBody, PREVIOUS_CURATOR_TERMINAL_SHA256, BOOK_COUNT_NATIVE_CONTROLS, runNativeBookCountControls } from './treasure-vault-native-book-count.mjs';
export const CURATOR_UPGRADE_PATH =
  "20261026010000_curator_release_compatibility.sql";
export const CURATOR_TERMINAL_SHA256 =
  "a07223d6cd719e484a994ea965405c8f72820d927fb1ea3086b27b6e3981adca";
export const curatorRows = JSON.parse(
  readFileSync(
    new URL("./treasure-vault-curator-successors.json", import.meta.url),
    "utf8",
  ),
);
const sha = (text) => createHash("sha256").update(text).digest("hex");
const actual =
  "(to_jsonb(r)-'updated_at'-'search_tsv')||jsonb_build_object('uuid',r.uuid::text)";
const literal = (value) => JSON.stringify(value).replaceAll("$", "\\u0024");
const ending =
  "select phase.recognized,guard.passed from global_terminal_phase phase cross join global_terminal_guard guard;";
const fencedEnding = `select phase.recognized,guard.passed and /* curator106 */
 not exists(select 1 from public.spell s where s.uuid=4738149853371241 and s.id<>4603)
 and not exists(select 1 from public.content_update c where c.type='spell' and c.data->>'uuid'='4738149853371241'
   and (c.status->>'state' is null or c.status->>'state' not in ('APPROVED','REJECTED')))
 from global_terminal_phase phase cross join global_terminal_guard guard;`;
function expression(body, table) {
  const prefix = `select e.value as expected,'${table}'::text as table_name,r.id as actual_id,`;
  const start = body.indexOf(prefix) + prefix.length;
  assert(start >= prefix.length);
  assert.equal(body.split(prefix).length, 2);
  const end = body.indexOf(" as row from global_terminal_settings", start);
  assert(end > start);
  return { before: body.slice(start, end), start, end, prefix };
}
function projectionPrefix(row) {
  return `case when r.id=${row.id} and (${actual})=$curator_${row.id}_after$${literal(row.after)}$curator_${row.id}_after$::jsonb then $curator_${row.id}_before$${literal(row.before)}$curator_${row.id}_before$::jsonb else (`;
}
/** Every field must match one complete successor; arbitrary deltas remain failures. */
export function upgradeCuratorBody(body) {
  assert.equal(sha(body), RUST_CLOUD_TERMINAL_SHA256);
  let result = body;
  for (const row of curatorRows) {
    const match = expression(result, row.table);
    result =
      result.slice(0, match.start) +
      projectionPrefix(row) +
      match.before +
      ") end" +
      result.slice(match.end);
  }
  assert.equal(result.split(ending).length, 2);
  return upgradeBookCountBody(result.replace(ending, fencedEnding));
}
/** Restore and hash the complete predecessor, retaining all immutable native ledgers. */
export function originalCuratorBody(body) {
  let result = originalBookCountBody(body);
  assert.equal(result.split(fencedEnding).length, 2);
  result = result.replace(fencedEnding, ending);
  for (const row of [...curatorRows].reverse()) {
    const match = expression(result, row.table);
    const prefix = projectionPrefix(row);
    assert(match.before.startsWith(prefix) && match.before.endsWith(") end"));
    result =
      result.slice(0, match.start) +
      match.before.slice(prefix.length, -5) +
      result.slice(match.end);
  }
  assert.equal(sha(result), RUST_CLOUD_TERMINAL_SHA256);
  return result;
}
/** Upgrade only the exact deployed predecessor and verify full metadata after replacement. */
export function curatorUpgrade({ body, previousState, state, signature }) {
  const successor = upgradeCuratorBody(body);
  assert.equal(sha(successor), CURATOR_TERMINAL_SHA256);
  let working = body;
  const replacements = [];
  for (const row of curatorRows) {
    const match = expression(working, row.table);
    const after = projectionPrefix(row) + match.before + ") end";
    const suffix = " as row from global_terminal_settings";
    const from = match.prefix + match.before + suffix;
    assert.equal(working.split(from).length, 2);
    replacements.push([from, match.prefix + after + suffix]);
    working = working.slice(0, match.start) + after + working.slice(match.end);
  }
  replacements.push([ending, fencedEnding]);
  working = working.replace(ending, fencedEnding);
  const bookCount = bookCountReplacement(working);
  replacements.push(bookCount);
  const replaceSql = replacements
    .map(
      ([before, after], i) =>
        ` body:=replace(body,$curator_before_${i}$${before}$curator_before_${i}$,$curator_after_${i}$${after}$curator_after_${i}$);`,
    )
    .join("\n");
  return `-- Recognize only the exact reviewed Scent and Enthrall successors. No content is written.
do $curator_upgrade$
declare body text;
begin
 if (${state}) is true then return; end if;
 if (${previousState}) is not true and (${state.replaceAll(CURATOR_TERMINAL_SHA256, PREVIOUS_CURATOR_TERMINAL_SHA256)}) is not true then raise exception 'Curator helper predecessor differs'; end if;
 select prosrc into strict body from pg_catalog.pg_proc where oid=pg_catalog.to_regprocedure('${signature}');
${replaceSql}
 if pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(body,'UTF8')),'hex')<>'${CURATOR_TERMINAL_SHA256}' then raise exception 'Curator helper successor differs'; end if;
 execute 'create or replace function ${signature} returns table(recognized boolean,passed boolean) language sql stable security invoker parallel unsafe cost 100 rows 1 set search_path = '''' as '||pg_catalog.quote_literal(body)||';';
 if (${state}) is not true then raise exception 'Curator helper readback differs'; end if;
end $curator_upgrade$;
`;
}
/** Keep each previous installer byte-for-byte inside its successor wrapper. */
export function wrapCuratorUpgrade(originalSql, upgrade, state) {
  if (originalSql.startsWith("begin;\n")) {
    assert(originalSql.endsWith("commit;\n"));
    return (
      "begin;\n" +
      wrapCuratorUpgrade(originalSql.slice(7, -8), upgrade, state) +
      "commit;\n"
    );
  }
  return `-- Preserve the previous installer and add the exact curator successors.
do $curator_wrapper$
begin
 if (${state}) is true then return; end if;
 execute $curator_previous$${originalSql}$curator_previous$;
 execute $curator_next$${upgrade}$curator_next$;
end $curator_wrapper$;
`;
}

/** Exercise both exact successors and rejected drift in the caller-owned rollback fixture. */
export async function runNativeCuratorCompatibility({
  inputs,
  fixture,
  receipt,
  userId,
  checkpoint,
}) {
  const controls = [];
  const status = `select row_to_json(s) from ${inputs.helper.signature} s;`;
  const pass = { recognized: true, passed: true },
    fail = { recognized: true, passed: false };
  const quote = (value) => "'" + String(value).replaceAll("'", "''") + "'";
  const setRow = (row, version) => {
    const keys = Object.keys(row.after).filter(
      (key) =>
        JSON.stringify(row.before[key]) !== JSON.stringify(row.after[key]),
    );
    const columns = keys.map((key) => '"' + key + '"').join(",");
    return `update public.${row.table} set (${columns})=(select ${columns} from jsonb_populate_record(null::public.${row.table},${quote(JSON.stringify(row[version]))}::jsonb)) where id=${row.id};`;
  };
  async function capsule(name, sql, expected, rejects = false) {
    await checkpoint("Curator " + name);
    fixture.assertOwned();
    const before = fixture.snapshot();
    const statement = "begin;\n" + sql + "\nrollback;";
    const result = fixture.sql(statement, true);
    assert.equal(result.error == null, true, name);
    assert.equal(result.signal, null, name);
    assert.equal(
      result.status,
      rejects ? 3 : 0,
      name + ": " + fixture.redact(result.stderr),
    );
    if (rejects) assert.match(result.stderr, /ERROR:\s+P0001:/);
    else
      assert.deepEqual(
        result.stdout
          .trim()
          .split("\n")
          .map((line) => JSON.parse(line)),
        expected,
        name,
      );
    assert.deepEqual(
      fixture.snapshot(),
      before,
      name + ": full fixture restored",
    );
    controls.push({
      name,
      passed: true,
      full_state_preserved: true,
      sql_sha256: sha(statement),
    });
  }
  for (const versions of [
    ["before", "before"],
    ["after", "before"],
    ["before", "after"],
    ["after", "after"],
  ])
    await capsule(
      versions.join("-"),
      curatorRows.map((row, i) => setRow(row, versions[i])).join("\n") + status,
      [pass],
    );
  const clean = curatorRows.map((row) => setRow(row, "after")).join("\n");
  const predecessor = inputs.helper.definition
    .replace(inputs.helper.body, () => inputs.helper.rustBody)
    .replace("create function ", "create or replace function ");
  await capsule(
    "deployed-upgrade-replay",
    predecessor +
      clean +
      status +
      inputs.curatorCompatibility.upgrade +
      status +
      inputs.curatorCompatibility.upgrade +
      status,
    [fail, pass, pass],
  );
  const trackedRust = inputs.rustCloudCompatibility.sql;
  assert(
    trackedRust.startsWith("begin;\n") && trackedRust.endsWith("commit;\n"),
  );
  const trackedBody = trackedRust.slice(7, -8);
  await capsule(
    "actual-rust-installer-from-deployed-predecessor",
    predecessor + clean + trackedBody + status,
    [pass],
  );
  const sharedPredecessor = inputs.helper.definition
    .replace(inputs.helper.body, () => inputs.helper.sharedBody)
    .replace("create function ", "create or replace function ");
  await capsule(
    "actual-rust-installer-from-shared-predecessor",
    sharedPredecessor + clean + trackedBody + status,
    [pass],
  );
  const enthrall = curatorRows.find((row) => row.id === 4603);
  const collision =
    setRow(enthrall, "before") +
    `insert into public.spell(id,name,rank,rarity,content_source_id,version,uuid) values((select max(id)+1 from public.spell),'Unanchored curator UUID collision',0,'COMMON',3,'1.0',4738149853371241);`;
  await capsule("successor-uuid-collision", collision + status, [fail]);
  for (const row of curatorRows)
    await capsule(
      `description-drift-${row.id}`,
      clean +
        `update public.${row.table} set description=description||' unreviewed' where id=${row.id};` +
        status,
      [fail],
    );
  for (const [name, setup] of [
    ["enthrall-rank", "update public.spell set rank=rank+1 where id=4603;"],
    [
      "scent-operation",
      "update public.ability_block set operations='{}'::json[] where id=40547;",
    ],
    ["missing-scent", "delete from public.ability_block where id=40547;"],
    ["missing-enthrall", "delete from public.spell where id=4603;"],
    [
      "unrelated-dependency",
      "update public.item set description=description||' unreviewed' where id=12183;",
    ],
  ])
    await capsule(name, clean + setup + status, [fail]);
  for (const [name, data] of [
    ["old-uuid", { uuid: "8430406010494590" }],
    ["new-uuid", { uuid: "4738149853371241" }],
    ["id", { id: 4603 }],
    ["name", { name: "Enthrall" }],
  ]) {
    const pending = `insert into public.content_update(id,type,content_source_id,action,data,upvotes,downvotes,status,user_id) values((select coalesce(max(id),0)+1 from public.content_update),'spell',3,'UPDATE',${quote(JSON.stringify(data))}::jsonb,'{}'::json[],'{}'::json[],'{"state":"PENDING"}'::jsonb,${quote(userId)}::uuid);`;
    await capsule("pending-" + name, clean + pending + status, [fail]);
  }
  for (const [name, mutation] of [
    [
      "body",
      predecessor.replace(
        inputs.helper.rustBody,
        () => inputs.helper.rustBody + "\n",
      ),
    ],
    ["metadata", `alter function ${inputs.helper.signature} cost 1;`],
    ["acl", `grant execute on function ${inputs.helper.signature} to public;`],
  ])
    await capsule(
      "predecessor-" + name,
      predecessor + mutation + inputs.curatorCompatibility.upgrade,
      [],
      true,
    );
  await runNativeBookCountControls({inputs,fixture,capsule,userId});
  receipt.curator_compatibility = {
    passed: true,
    native_executed: true,
    controls,
    migration_sha256: sha(inputs.curatorCompatibility.sql),
  };
}

export const CURATOR_NATIVE_CONTROLS = Object.freeze([
  "before-before",
  "after-before",
  "before-after",
  "after-after",
  "deployed-upgrade-replay",
  "actual-rust-installer-from-deployed-predecessor",
  "actual-rust-installer-from-shared-predecessor",
  "successor-uuid-collision",
  "description-drift-40547",
  "description-drift-4603",
  "enthrall-rank",
  "scent-operation",
  "missing-scent",
  "missing-enthrall",
  "unrelated-dependency",
  "pending-old-uuid",
  "pending-new-uuid",
  "pending-id",
  "pending-name",
  "predecessor-body",
  "predecessor-metadata",
  "predecessor-acl",
  ...BOOK_COUNT_NATIVE_CONTROLS,
]);

/** Missing native curator controls cannot certify a release. */
export function assertCuratorNativeEvidence(receipt) {
  const proof = receipt.curator_compatibility;
  assert.equal(proof?.passed, true);
  assert.equal(proof.native_executed, true);
  assert.deepEqual(
    proof.controls.map((row) => row.name),
    CURATOR_NATIVE_CONTROLS,
  );
  const input = receipt.input_manifest.entries.find(
    (row) => row.path === "supabase/migrations/" + CURATOR_UPGRADE_PATH,
  );
  assert.ok(input);
  assert.equal(proof.migration_sha256, input.sha256);
  for (const control of proof.controls) {
    assert.equal(control.passed, true);
    assert.equal(control.full_state_preserved, true);
    assert.match(control.sql_sha256, /^[a-f0-9]{64}$/);
  }
  return true;
}
