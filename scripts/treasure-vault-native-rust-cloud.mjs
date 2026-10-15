import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { SHARED_TERMINAL_SHA256 } from "./treasure-vault-native-shared-ancestries.mjs";

export const RUST_CLOUD_UPGRADE_PATH =
  "20261015000000_rust_cloud_release_compatibility.sql";
export const RUST_CLOUD_TERMINAL_SHA256 =
  "d79ada84f79a393fea95ef071ba7af17f4684d5e063c3b7e7777dea18c0e2326";
const sha = (text) => createHash("sha256").update(text).digest("hex");
const actual =
  "(to_jsonb(r)-'updated_at'-'search_tsv')||jsonb_build_object('uuid',r.uuid::text)";
const original = `select e.value as expected,'spell'::text as table_name,r.id as actual_id,${actual} as row from global_terminal_settings`;
const cleanedDescription =
  "Red-blown flecks of rust jitter in the air, forming a cloud of agitated particles. All creatures within the cloud become concealed, and all creatures outside the cloud become concealed to creatures within it. The cloud deals 5d10 slashing damage to any creature that starts its turn in the area, with a basic Fortitude save.\n\nMetal that rusts off of a creature adds to the cloud. When a [metal](link_trait_2132) creature takes damage from the cloud, the cloud's area increases by 5 feet (to a maximum of a 40-foot burst), and the creature starts to rust, taking 1d4 persistent slashing damage. You can [Dismiss](link_action_19627) the cloud.";

/** Derive the one allowed successor from the immutable display101 whole row. */
export function rustCloudRows(spec101) {
  const entries = spec101.catalog.filter(
    (entry) => entry.table === "spell" && entry.id === 5081,
  );
  assert.equal(entries.length, 1);
  const before = structuredClone(entries[0].after);
  before.uuid = String(before.uuid);
  assert.equal(before.name, "Rust Cloud");
  assert.equal(before.content_source_id, 15);
  assert.notEqual(before.description, cleanedDescription);
  return { before, after: { ...before, description: cleanedDescription } };
}

/** An exact full-row comparison never normalizes arbitrary prose or other spell fields. */
export function rustCloudProjection(rows) {
  assert.deepEqual(
    { ...rows.after, description: rows.before.description },
    rows.before,
  );
  assert.equal(rows.after.description, cleanedDescription);
  const literal = JSON.stringify(rows).replaceAll("$", "\\u0024");
  return `select e.value as expected,'spell'::text as table_name,r.id as actual_id,case when r.id=5081 and (${actual})=(select spec->'after' from (select $rust_cloud105$${literal}$rust_cloud105$::jsonb as spec) c) then $rust_cloud105_before$${JSON.stringify(rows.before).replaceAll("$", "\\u0024")}$rust_cloud105_before$::jsonb else ${actual} end as row from global_terminal_settings`;
}

/** Preserve every byte outside the one reviewed spell comparison clause. */
export function upgradeRustCloudBody(body, rows) {
  assert.equal(
    sha(body),
    SHARED_TERMINAL_SHA256,
    "Only the exact shared-ancestry predecessor may be upgraded",
  );
  assert.equal(body.split(original).length, 2);
  return body.replace(original, () => rustCloudProjection(rows));
}

/** Reversibility independently proves that all previous ledgers and predicates remain intact. */
export function originalRustCloudBody(body) {
  const parts = body.split("$rust_cloud105$");
  assert.equal(parts.length, 3);
  const rows = JSON.parse(parts[1]);
  const projection = rustCloudProjection(rows);
  assert.equal(body.split(projection).length, 2);
  const previous = body.replace(projection, () => original);
  assert.equal(sha(previous), SHARED_TERMINAL_SHA256);
  return previous;
}

/** Upgrade the deployed exact predecessor without copying its complete terminal ledger. */
export function rustCloudUpgrade({ rows, previousState, state, signature }) {
  return `-- Recognize only the exact cleaned Rust Cloud description. No content is written.
do $rust_cloud_upgrade$
declare body text;
begin
 if (${state}) is true then return; end if;
 if (${previousState}) is not true then raise exception 'Rust Cloud helper predecessor differs'; end if;
 select prosrc into strict body from pg_catalog.pg_proc where oid=pg_catalog.to_regprocedure('${signature}');
 body:=replace(body,$rust_before$${original}$rust_before$,$rust_after$${rustCloudProjection(rows)}$rust_after$);
 if pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(body,'UTF8')),'hex')<>'${RUST_CLOUD_TERMINAL_SHA256}' then raise exception 'Rust Cloud helper successor differs'; end if;
 execute 'create or replace function ${signature} returns table(recognized boolean,passed boolean) language sql stable security invoker parallel unsafe cost 100 rows 1 set search_path = '''' as '||pg_catalog.quote_literal(body)||';';
 if (${state}) is not true then raise exception 'Rust Cloud helper readback differs'; end if;
end $rust_cloud_upgrade$;
`;
}

/** Retain the exact previous installer inside an outer, fail-closed successor wrapper. */
export function wrapRustCloudUpgrade(originalSql, upgrade, state) {
  return `-- Preserve the previous installer and add the exact Rust Cloud successor.
do $rust_cloud_wrapper$
begin
 if (${state}) is true then return; end if;
 execute $rust_previous$${originalSql}$rust_previous$;
 execute $rust_next$${upgrade}$rust_next$;
end $rust_cloud_wrapper$;
`;
}

export const RUST_CLOUD_NATIVE_CONTROLS = Object.freeze([
  "original-description",
  "cleaned-description",
  "deployed-upgrade-and-replay",
  "cleaned-historical-replays",
  "description-drift",
  "rank-drift",
  "source-drift",
  "uuid-drift",
  "tradition-drift",
  "heightening-drift",
  "missing-spell",
  "unrelated-dependency",
  "pending-id",
  "pending-uuid",
  "pending-name",
  "predecessor-body-drift",
  "predecessor-metadata-drift",
  "predecessor-acl-drift",
]);

/** A certificate must include fresh native results, not construction-only assertions. */
export function assertRustCloudNativeEvidence(receipt) {
  const proof = receipt.rust_cloud_compatibility;
  assert.equal(proof?.passed, true);
  assert.equal(proof.native_executed, true);
  assert.deepEqual(
    proof.controls.map((row) => row.name),
    RUST_CLOUD_NATIVE_CONTROLS,
  );
  const input = receipt.input_manifest.entries.find(
    (row) => row.path === "supabase/migrations/" + RUST_CLOUD_UPGRADE_PATH,
  );
  assert.ok(input);
  assert.equal(proof.migration_sha256, input.sha256);
  for (const row of proof.controls) {
    assert.equal(row.passed, true);
    assert.equal(row.full_state_preserved, true);
    assert.equal(row.no_transport_error, true);
    assert.equal(row.actual_signal, null);
    assert.match(row.sql_sha256, /^[a-f0-9]{64}$/);
    const rejection = row.name.startsWith("predecessor-");
    assert.equal(row.actual_exit_status, rejection ? 3 : 0);
    if (rejection) assert.equal(row.sqlstate, "P0001");
  }
  return true;
}

/** All data and function mutations below are rollback-only in the caller-owned native fixture. */
export async function runNativeRustCloudCompatibility({
  inputs,
  fixture,
  receipt,
  userId,
  checkpoint,
}) {
  const batch = inputs.rustCloudCompatibility;
  assert.equal(receipt.rust_cloud_compatibility, undefined);
  fixture.assertOwned();
  const proof = (receipt.rust_cloud_compatibility = {
    controls: [],
    passed: false,
    native_executed: false,
    migration_sha256: sha(batch.sql),
  });
  const quote = (value) => "'" + String(value).replaceAll("'", "''") + "'";
  const setDescription = (description) =>
    `update public.spell set description=${quote(description)} where id=5081;`;
  const clean = setDescription(batch.rows.after.description);
  const status = `select row_to_json(s) from ${inputs.helper.signature} s;`;
  async function capsule(name, sql, expected, rejects = false) {
    await checkpoint("Rust Cloud " + name);
    fixture.assertOwned();
    const baseline = fixture.snapshot();
    const statement = `begin;\n${sql}\nrollback;\n`;
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
      baseline,
      name + ": complete fixture restored",
    );
    proof.controls.push({
      name,
      passed: true,
      full_state_preserved: true,
      no_transport_error: true,
      actual_signal: null,
      actual_exit_status: result.status,
      sql_sha256: sha(statement),
      ...(rejects ? { sqlstate: "P0001" } : {}),
    });
  }
  const pass = { recognized: true, passed: true },
    fail = { recognized: true, passed: false };
  await capsule(
    "original-description",
    setDescription(batch.rows.before.description) + status,
    [pass],
  );
  await capsule("cleaned-description", clean + status, [pass]);
  const predecessor = inputs.helper.definition
    .replace(inputs.helper.body, () => inputs.helper.sharedBody)
    .replace("create function ", "create or replace function ");
  await capsule(
    "deployed-upgrade-and-replay",
    predecessor +
      clean +
      status +
      batch.upgrade +
      status +
      batch.upgrade +
      status,
    [fail, pass, pass],
  );
  const replays = [
    ...inputs.actualWrapperMetadata,
    inputs.completionWrapper,
    inputs.display,
  ];
  assert.equal(replays.length, 41);
  const checks = replays.map((row) => row.releaseSql).join("\n");
  const historical = fixture.snapshot();
  await checkpoint("Rust Cloud complete cleaned historical replays");
  const statement = `begin;\n${clean}\n${replays.map((row) => row.sql).join("\n")}\n${checks}\nrollback;`;
  const result = fixture.sql(statement, true);
  assert.equal(result.error == null, true);
  assert.equal(result.signal, null);
  assert.equal(result.status, 0, fixture.redact(result.stderr));
  const rows = result.stdout
    .trim()
    .split("\n")
    .map((line) => line.split("|"));
  assert.ok(rows.length >= 41);
  assert.ok(
    rows.every((row) => row.length === 2 && row[0].trim() && row[1] === "t"),
  );
  assert.deepEqual(fixture.snapshot(), historical);
  proof.controls.push({
    name: "cleaned-historical-replays",
    passed: true,
    full_state_preserved: true,
    no_transport_error: true,
    actual_signal: null,
    actual_exit_status: 0,
    sql_sha256: sha(statement),
    checks: rows.length,
  });
  for (const [name, setup] of [
    [
      "description-drift",
      "update public.spell set description=description||' unreviewed' where id=5081;",
    ],
    ["rank-drift", "update public.spell set rank=5 where id=5081;"],
    [
      "source-drift",
      "update public.spell set content_source_id=3 where id=5081;",
    ],
    ["uuid-drift", "update public.spell set uuid=uuid+1 where id=5081;"],
    [
      "tradition-drift",
      "update public.spell set traditions=array['divine'] where id=5081;",
    ],
    [
      "heightening-drift",
      "update public.spell set heightened=jsonb_set(heightened::jsonb,'{data,interval}','1'::jsonb,false) where id=5081;",
    ],
    ["missing-spell", "delete from public.spell where id=5081;"],
    [
      "unrelated-dependency",
      "update public.item set description=description||' unreviewed' where id=12183;",
    ],
  ])
    await capsule(name, clean + setup + status, [fail]);
  assert.match(userId, /^[a-f0-9-]{36}$/i);
  for (const [name, data] of [
    ["id", { id: 5081 }],
    ["uuid", { uuid: batch.rows.before.uuid }],
    ["name", { name: "Rust Cloud" }],
  ]) {
    const pending = `insert into public.content_update(id,type,content_source_id,action,data,upvotes,downvotes,status,user_id) values((select coalesce(max(id),0)+1 from public.content_update),'spell',15,'UPDATE',${quote(JSON.stringify(data))}::jsonb,'{}'::json[],'{}'::json[],'{"state":"PENDING"}'::jsonb,${quote(userId)}::uuid);`;
    await capsule("pending-" + name, clean + pending + status, [fail]);
  }
  for (const [name, mutation] of [
    [
      "body",
      predecessor.replace(
        inputs.helper.sharedBody,
        () => inputs.helper.sharedBody + "\n",
      ),
    ],
    ["metadata", `alter function ${inputs.helper.signature} cost 1;`],
    ["acl", `grant execute on function ${inputs.helper.signature} to public;`],
  ])
    await capsule(
      "predecessor-" + name + "-drift",
      predecessor + mutation + batch.upgrade,
      [],
      true,
    );
  assert.deepEqual(
    proof.controls.map((row) => row.name),
    RUST_CLOUD_NATIVE_CONTROLS,
  );
  proof.native_executed = true;
  proof.passed = true;
  assertRustCloudNativeEvidence(receipt);
}
