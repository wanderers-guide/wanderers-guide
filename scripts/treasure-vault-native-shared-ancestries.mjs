import assert from "node:assert/strict";
import { createHash } from "node:crypto";

export const SHARED_UPGRADE_PATH =
  "20261010000000_shared_ancestry_release_compatibility.sql";
export const SHARED_MOVE_PATH = "20261010000100_shared_ancestries.sql";
export const SHARED_PREDECESSOR_SHA256 =
  "daea9d6e1e03e4adbb63c5ab1e06ad540f09b032ae32a1a0b85e421f43d07ded";
export const SHARED_TERMINAL_SHA256 =
  "fbdf75894b97980ba3382a2a74ee2dd8f28929a129b21ca423942e0aeba544b2";
const hash = (value) => createHash("sha256").update(value).digest("hex");
const actual =
  "(to_jsonb(r)-'updated_at'-'search_tsv')||jsonb_build_object('uuid',r.uuid::text)";
const literal = (value) => JSON.stringify(value).replaceAll("$", "\\u0024");
const identities = {
  ancestry: [3, 4, 5, 6, 7, 10],
  trait: [1348, 1452, 1461, 1467, 1468, 1474],
};

/** Independent receipt inventory includes the owner outside the historical ledger. */
export const SHARED_NATIVE_CONTROLS = Object.freeze([
  ...Object.entries(identities).flatMap(([table, ids]) =>
    ids.flatMap((id) => [
      `partial-${table}-${id}`,
      `unreviewed-${table}-${id}`,
    ]),
  ),
  "missing-halfling",
  "pending-id",
  "pending-old-uuid",
  "pending-new-uuid",
  "pending-common-name",
  "pending-data-source-name",
  "rival-count-without-real-feat",
  "rival-count-with-real-feat",
  "duplicate-common-identity",
  "late-full-rollback",
  "full-successor-preservation-and-replay",
]);

/** The independent certificate gate rejects absent controls and substituted SQL. */
export function assertSharedNativeEvidence(receipt) {
  const proof = receipt.shared_ancestries;
  assert.equal(proof?.passed, true);
  assert.equal(proof.native_executed, true);
  assert.equal(proof.original_ledger_preserved, true);
  assert.deepEqual(
    proof.owner_ids,
    Object.entries(identities).flatMap(([table, ids]) =>
      ids.map((id) => [table, id]),
    ),
  );
  assert.deepEqual(
    proof.controls.map((row) => row.name),
    SHARED_NATIVE_CONTROLS,
  );
  for (const row of proof.controls) {
    const positive = [
      "rival-count-with-real-feat",
      "full-successor-preservation-and-replay",
    ].includes(row.name);
    assert.equal(row.passed, true);
    assert.equal(row.full_state_preserved, true);
    assert.equal(row.no_transport_error, true);
    assert.equal(row.actual_signal, null);
    assert.equal(row.actual_exit_status, positive ? 0 : 3);
    if (!positive) assert.equal(row.sqlstate, "P0001");
  }
  for (const [path, field] of [
    ["supabase/migrations/" + SHARED_MOVE_PATH, "migration_sha256"],
    ["supabase/release/shared-ancestries.sql", "release_sql_sha256"],
  ]) {
    const input = receipt.input_manifest.entries.find(
      (row) => row.path === path,
    );
    assert.ok(input);
    assert.match(input.sha256, /^[a-f0-9]{64}$/);
    assert.equal(proof[field], input.sha256);
  }
  for (const name of [SHARED_MOVE_PATH, "shared-ancestries-exact-replay"]) {
    const stages = receipt.stages.filter((row) => row.name === name);
    assert.equal(stages.length, 1);
    assert.equal(stages[0].passed, true);
    assert.equal(stages[0].status, 0);
    assert.equal(stages[0].signal, null);
    assert.equal(stages[0].sql_sha256, proof.migration_sha256);
  }
  return true;
}

export function sharedSpecFromBody(body) {
  const parts = body.split("$shared104$");
  assert.equal(parts.length, 3);
  const value = JSON.parse(parts[1]);
  const spec = {
    rows: value.patches.map((p) => ({
      table: p.table,
      before: p.before,
      uuid: p.after.uuid,
    })),
    rival_academies: value.rival_academies,
  };
  assert.deepEqual(sharedAncestryRows(spec), value.patches);
  return spec;
}

/** Full original rows are retained; the only successors are source and derived UUID. */
export function sharedAncestryRows(spec) {
  assert.deepEqual(
    spec.rows.map((p) => [p.table, p.before.id]),
    Object.entries(identities).flatMap(([table, ids]) =>
      ids.map((id) => [table, id]),
    ),
  );
  return spec.rows.map(({ table, before, uuid }) => {
    assert.equal(before.content_source_id, 1);
    assert.match(uuid, /^[0-9]+$/);
    assert.notEqual(uuid, before.uuid);
    return {
      table,
      id: before.id,
      before,
      after: { ...before, content_source_id: 3, uuid },
    };
  });
}

export function sharedAncestryCtes(spec) {
  const patches = sharedAncestryRows(spec);
  assert.equal(spec.rival_academies.id, 493);
  assert.equal(spec.rival_academies.meta_data.counts.feat, 78);
  return `global_shared_settings as materialized(select $shared104$${literal({ patches, rival_academies: spec.rival_academies })}$shared104$::jsonb as spec),
global_shared_actual as materialized(
${Object.keys(identities)
  .map(
    (table) =>
      ` select p as expected,${actual} as row from global_shared_settings g cross join lateral jsonb_array_elements(g.spec->'patches') p left join public.${table} r on r.id=(p->>'id')::bigint where p->>'table'='${table}'`,
  )
  .join("\n union all\n")}
),
global_shared_state as materialized(select coalesce(count(*)=12 and bool_and((row=expected->'before') is true),false) as before,coalesce(count(*)=12 and bool_and((row=expected->'after') is true),false) as after from global_shared_actual),
global_shared_guard as materialized(select ((s.before or s.after)
 and not exists(select 1 from public.content_update u cross join global_shared_settings g cross join lateral jsonb_array_elements(g.spec->'patches') p
  where upper(btrim(coalesce(u.status->>'state','PENDING'))) not in('APPROVED','REJECTED') and u.type=p->>'table' and (u.ref_id=(p->>'id')::bigint or u.data->>'id'=p->>'id'
   or u.data->>'uuid' in(p#>>'{before,uuid}',p#>>'{after,uuid}') or ((u.content_source_id in(1,3) or u.data->>'content_source_id' in('1','3')) and lower(btrim(u.data->>'name'))=lower(p#>>'{before,name}'))))
${Object.keys(identities)
  .map(
    (table) =>
      ` and not exists(select 1 from public.${table} r cross join global_shared_settings g cross join lateral jsonb_array_elements(g.spec->'patches') p where p->>'table'='${table}' and r.id<>(p->>'id')::bigint and (r.uuid::text in(p#>>'{before,uuid}',p#>>'{after,uuid}') or (r.content_source_id=3 and lower(btrim(r.name))=lower(p#>>'{before,name}'))))`,
  )
  .join("\n")}
) as valid from global_shared_state s),
`;
}

function sharedProjection(table) {
  return `case when (select after from global_shared_state) and r.id in(${identities[table].join(",")}) then (select p->'before' from global_shared_settings g cross join lateral jsonb_array_elements(g.spec->'patches') p where p->>'table'='${table}' and (p->>'id')::bigint=r.id) else ${actual} end`;
}
const sourceProjection = `case when s.id=493 and (to_jsonb(s)-'updated_at')=jsonb_set((select spec->'rival_academies' from global_shared_settings),'{meta_data,counts,feat}','79'::jsonb,false) and (select count(*) from public.ability_block where content_source_id=493 and type='feat')=79 then (select spec->'rival_academies' from global_shared_settings) else to_jsonb(s)-'updated_at' end`;

/** Exact splice points leave the original ledger and every unrelated predicate intact. */
export function upgradeSharedAncestryBody(body, spec) {
  assert.equal(hash(body), SHARED_PREDECESSOR_SHA256);
  let next = body;
  const replace = (from, to) => {
    assert.equal(
      next.split(from).length,
      2,
      "One exact splice: " + from.slice(0, 70),
    );
    next = next.replace(from, to);
  };
  replace(
    "global_terminal_actual as materialized(",
    sharedAncestryCtes(spec) + "global_terminal_actual as materialized(",
  );
  for (const table of Object.keys(identities)) {
    const from = `select e.value as expected,'${table}'::text as table_name,r.id as actual_id,${actual} as row from global_terminal_settings g cross join lateral jsonb_array_elements(g.spec->'entries') e(value) left join public.${table} r on r.id=(e.value->>'id')::bigint where e.value->>'table'='${table}'`;
    replace(from, from.replace(actual, sharedProjection(table)));
  }
  replace(
    "global_terminal_guard as(select coalesce(\n",
    "global_terminal_guard as(select coalesce(\n  (select valid from global_shared_guard) and\n",
  );
  replace(
    "s.id as actual_id,to_jsonb(s)-'updated_at' as row",
    `s.id as actual_id,${sourceProjection} as row`,
  );
  return next;
}

export function originalSharedAncestryBody(body, spec) {
  let original = body.replace(sharedAncestryCtes(spec), "");
  for (const table of Object.keys(identities))
    original = original.replace(sharedProjection(table), actual);
  original = original
    .replace("  (select valid from global_shared_guard) and\n", "")
    .replace(sourceProjection, "to_jsonb(s)-'updated_at'");
  assert.equal(hash(original), SHARED_PREDECESSOR_SHA256);
  return original;
}

/** Small deployed upgrade checks the entire predecessor and resulting body plus ACL. */
export function sharedAncestryUpgrade({
  spec,
  previousState,
  state,
  signature,
}) {
  const replacements = [
    [
      "global_terminal_actual as materialized(",
      sharedAncestryCtes(spec) + "global_terminal_actual as materialized(",
    ],
    ...Object.keys(identities).map((table) => {
      const before = `select e.value as expected,'${table}'::text as table_name,r.id as actual_id,${actual} as row from global_terminal_settings g cross join lateral jsonb_array_elements(g.spec->'entries') e(value) left join public.${table} r on r.id=(e.value->>'id')::bigint where e.value->>'table'='${table}'`;
      return [before, before.replace(actual, sharedProjection(table))];
    }),
    [
      "global_terminal_guard as(select coalesce(\n",
      "global_terminal_guard as(select coalesce(\n  (select valid from global_shared_guard) and\n",
    ],
    [
      "s.id as actual_id,to_jsonb(s)-'updated_at' as row",
      `s.id as actual_id,${sourceProjection} as row`,
    ],
  ];
  return `-- Recognize only the complete reviewed shared ancestry successor. No content is written.
do $shared_upgrade$
declare body text;
begin
 if (${state}) is true then return; end if;
 if (${previousState}) is not true then raise exception 'Shared ancestry helper predecessor differs'; end if;
 select prosrc into strict body from pg_catalog.pg_proc where oid=pg_catalog.to_regprocedure('${signature}');
${replacements.map(([before, after], i) => ` body:=replace(body,$shared_before_${i}$${before}$shared_before_${i}$,$shared_after_${i}$${after}$shared_after_${i}$);`).join("\n")}
 if pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(body,'UTF8')),'hex')<>'${SHARED_TERMINAL_SHA256}' then raise exception 'Shared ancestry helper successor differs'; end if;
 execute 'create or replace function ${signature} returns table(recognized boolean,passed boolean) language sql stable security invoker parallel unsafe cost 100 rows 1 set search_path = '''' as '||pg_catalog.quote_literal(body)||';';
 if (${state}) is not true then raise exception 'Shared ancestry helper readback differs'; end if;
end $shared_upgrade$;
`;
}

/** Retain a historical installer verbatim and finish with the exact current helper. */
export function wrapSharedUpgrade(original, upgrade, state) {
  return `-- Preserve the original upgrade and recognize the exact shared ancestry successor.\ndo $shared_successor$\nbegin\n if (${state}) is true then return; end if;\n execute $shared_original$${original}$shared_original$;\n execute $shared_install$${upgrade}$shared_install$;\nend $shared_successor$;\n`;
}

export function sharedAncestryMigration({ spec, state, signature }) {
  return `-- Move the canonical shared bases without changing gameplay or saved characters.
begin;
set local lock_timeout='5s';
set local statement_timeout='60s';
lock table public.content_update in share mode;
lock table public.ancestry,public.trait in share row exclusive mode;
do $shared_move$
declare patches constant jsonb:=$shared_rows$${literal(sharedAncestryRows(spec))}$shared_rows$::jsonb;
 p jsonb; row jsonb; before_count integer:=0;after_count integer:=0;changed integer;
begin
 if (${state}) is not true then raise exception 'Shared ancestry helper differs'; end if;
 if not exists(select 1 from ${signature} where recognized is true and passed is true) then raise exception 'Shared ancestry preflight differs'; end if;
 if not exists(select 1 from public.content_source where id=3 and name='Common Core' and user_id is null and is_published is true and deprecated is not true) then raise exception 'Shared ancestry source differs'; end if;
 for p in select value from jsonb_array_elements(patches) loop
  if p->>'table' not in('ancestry','trait') then raise exception 'Unexpected shared ancestry table'; end if;
  execute format('select (to_jsonb(r)-''updated_at''-''search_tsv'')||jsonb_build_object(''uuid'',r.uuid::text) from public.%I r where id=$1 for update',p->>'table') into row using (p->>'id')::bigint;
  if row=p->'before' then before_count:=before_count+1; end if;
  if row=p->'after' then after_count:=after_count+1; end if;
 end loop;
 if before_count<>12 and after_count<>12 then raise exception 'Shared ancestry rows are partial or changed'; end if;
 if after_count=12 then return; end if;
 for p in select value from jsonb_array_elements(patches) loop
  execute format('update public.%I set content_source_id=3,uuid=$1 where id=$2',p->>'table') using (p#>>'{after,uuid}')::bigint,(p->>'id')::bigint;
  get diagnostics changed=row_count;
  if changed<>1 then raise exception 'Shared ancestry write count differs'; end if;
  execute format('select (to_jsonb(r)-''updated_at''-''search_tsv'')||jsonb_build_object(''uuid'',r.uuid::text) from public.%I r where id=$1',p->>'table') into row using (p->>'id')::bigint;
  if row is distinct from p->'after' then raise exception 'Shared ancestry readback differs'; end if;
 end loop;
 if not exists(select 1 from ${signature} where recognized is true and passed is true) then raise exception 'Shared ancestry final check differs'; end if;
end $shared_move$;
commit;
`;
}

export function sharedAncestryRelease({ spec, state, signature }) {
  return `-- Full successor rows, pending routes and global identities are checked read-only.\nwith ${sharedAncestryCtes(spec).slice(0, -2)}\nselect 'shared-ancestries' as id,coalesce((${state}) and (select after from global_shared_state) and (select valid from global_shared_guard) and exists(select 1 from ${signature} where recognized is true and passed is true),false) as passed;\n`;
}

/** Construct a valid queued proposal so rejection reaches the ancestry guard. */
export function sharedAncestryPendingSetup({ source, data, userId }) {
  assert.ok(Number.isSafeInteger(source) && source > 0);
  assert.match(userId, /^[a-f0-9-]{36}$/i);
  const quote = (value) => "'" + value.replaceAll("'", "''") + "'";
  return `insert into public.content_update(id,type,content_source_id,action,data,upvotes,downvotes,status,user_id) values((select coalesce(max(id),0)+1 from public.content_update),'ancestry',${source},'UPDATE',${quote(JSON.stringify(data))}::jsonb,'{}'::json[],'{}'::json[],'{"state":"PENDING"}'::jsonb,${quote(userId)}::uuid);`;
}

/** Match the real JSON column while preserving every other source metadata field. */
export const SHARED_RIVAL_COUNT_SETUP =
  "update public.content_source set meta_data=jsonb_set(meta_data::jsonb,'{counts,feat}','79'::jsonb,false)::json where id=493;";

/** Populate all real non-generated feat columns without consuming a sequence. */
export function sharedAncestryRivalWitnessInsert({ columns, originalFeat }) {
  const quote = (text) => "'" + text.replaceAll("'", "''") + "'";
  return `insert into public.ability_block(${columns}) select ${columns} from jsonb_populate_record(null::public.ability_block,${quote(JSON.stringify(originalFeat))}::jsonb||jsonb_build_object('id',(select max(id)+1 from public.ability_block),'uuid',(select max(uuid)+1 from public.ability_block),'name','Shared ancestry count witness'));`;
}

/** Retain the complete real ancestry shape when introducing an adversarial duplicate. */
export function sharedAncestryDuplicateInsert({ columns, row }) {
  const quote = (text) => "'" + text.replaceAll("'", "''") + "'";
  // Reviewed rows omit cache timestamps; let the real NOT NULL default supply it.
  const insertedColumns = columns
    .split(",")
    .filter((column) => column !== '"updated_at"')
    .join(",");
  return `insert into public.ancestry(${insertedColumns}) select ${insertedColumns} from jsonb_populate_record(null::public.ancestry,${quote(JSON.stringify(row))}::jsonb||jsonb_build_object('id',(select max(id)+1 from public.ancestry)));`;
}

/** Fail at the final trait so the actual migration must undo eleven earlier writes. */
export const SHARED_LATE_REJECTION_SETUP =
  "create function public.wg_shared_late_rejection() returns trigger language plpgsql as $$begin if new.id=1474 then raise exception 'Shared ancestry late test rejection';end if;return new;end$$;create trigger wg_shared_late_rejection before update on public.trait for each row execute function public.wg_shared_late_rejection();";

/** Native rejection capsules roll back, then the exact registered move runs once. */
export async function runNativeSharedAncestries({
  inputs,
  fixture,
  receipt,
  stage,
  userId,
  checkpoint = async () => {},
}) {
  const batch = inputs.sharedAncestries,
    patches = sharedAncestryRows(batch.spec);
  assert.equal(receipt.shared_ancestries, undefined);
  const proof = (receipt.shared_ancestries = {
    controls: [],
    passed: false,
    owner_ids: patches.map((p) => [p.table, p.id]),
    original_ledger_preserved: true,
    migration_sha256: hash(batch.sql),
    release_sql_sha256: hash(batch.releaseSql),
  });
  async function rejected(name, setup) {
    await checkpoint("shared ancestry " + name);
    const before = fixture.snapshot();
    const result = fixture.sql(
      `begin;${setup}\nselect row_to_json(s) from ${inputs.helper.signature} s;rollback;`,
      true,
    );
    assert.equal(result.error == null, true);
    assert.equal(result.signal, null);
    assert.equal(result.status, 0, fixture.redact(result.stderr));
    assert.deepEqual(
      JSON.parse(result.stdout.trim()),
      { recognized: true, passed: false },
      name,
    );
    assert.deepEqual(
      fixture.snapshot(),
      before,
      name + ": full owned state restored",
    );
    const writer = batch.sql
      .replace(/^begin;\n/m, "")
      .replace(/commit;\n$/, "");
    const rejectedWrite = fixture.sql(
      `begin;${setup}\n${writer}\nrollback;`,
      true,
    );
    assert.equal(rejectedWrite.error == null, true);
    assert.equal(rejectedWrite.signal, null);
    assert.equal(
      rejectedWrite.status,
      3,
      name + ": actual migration must reject",
    );
    assert.match(rejectedWrite.stderr, /ERROR:\s+P0001:/);
    assert.deepEqual(
      fixture.snapshot(),
      before,
      name + ": rejected writer restores the full fixture",
    );
    proof.controls.push({
      name,
      passed: true,
      full_state_preserved: true,
      actual_exit_status: 3,
      actual_signal: null,
      no_transport_error: true,
      sqlstate: "P0001",
    });
  }
  for (const patch of patches) {
    await rejected(
      "partial-" + patch.table + "-" + patch.id,
      `update public.${patch.table} set content_source_id=3,uuid=${patch.after.uuid} where id=${patch.id};`,
    );
    await rejected(
      "unreviewed-" + patch.table + "-" + patch.id,
      `update public.${patch.table} set description=coalesce(description,'')||' unreviewed' where id=${patch.id};`,
    );
  }
  const halfling = patches.find((p) => p.table === "ancestry" && p.id === 7);
  await rejected("missing-halfling", "delete from public.ancestry where id=7;");
  for (const [route, data, source] of [
    ["id", { id: halfling.id }, 3],
    ["old-uuid", { uuid: halfling.before.uuid }, 3],
    ["new-uuid", { uuid: halfling.after.uuid }, 3],
    ["common-name", { name: halfling.before.name }, 3],
    [
      "data-source-name",
      { name: halfling.before.name, content_source_id: 3 },
      579,
    ],
  ]) {
    // Manual adversarial IDs avoid sequence consumption in rolled-back capsules.
    await rejected(
      "pending-" + route,
      sharedAncestryPendingSetup({ source, data, userId }),
    );
  }
  await rejected("rival-count-without-real-feat", SHARED_RIVAL_COUNT_SETUP);
  await checkpoint("shared ancestry rival-count-with-real-feat");
  const rivalBefore = fixture.snapshot();
  const featColumns = fixture
    .queryJson(
      "select jsonb_agg(column_name order by ordinal_position) from information_schema.columns where table_schema='public' and table_name='ability_block' and is_generated='NEVER';",
    )
    .map((c) => '"' + c + '"')
    .join(",");
  const originalFeat = fixture.queryJson(
    "select to_jsonb(r) from public.ability_block r where content_source_id=493 and type='feat' order by id limit 1;",
  );
  const positiveWriter = batch.sql
    .replace(/^begin;\n/m, "")
    .replace(/commit;\n$/, "");
  const rival = fixture.sql(
    `begin;${sharedAncestryRivalWitnessInsert({ columns: featColumns, originalFeat })}${SHARED_RIVAL_COUNT_SETUP}select row_to_json(s) from ${inputs.helper.signature} s;${positiveWriter}select row_to_json(s) from ${inputs.helper.signature} s;rollback;`,
    true,
  );
  assert.equal(rival.error == null, true);
  assert.equal(rival.signal, null);
  assert.equal(rival.status, 0, fixture.redact(rival.stderr));
  assert.deepEqual(
    rival.stdout
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line)),
    [
      { recognized: true, passed: true },
      { recognized: true, passed: true },
    ],
  );
  assert.deepEqual(
    fixture.snapshot(),
    rivalBefore,
    "Real79 count acceptance and actual move roll back the full fixture",
  );
  proof.controls.push({
    name: "rival-count-with-real-feat",
    passed: true,
    full_state_preserved: true,
    actual_exit_status: 0,
    actual_signal: null,
    no_transport_error: true,
  });
  const columns = fixture
    .queryJson(
      "select jsonb_agg(column_name order by ordinal_position) from information_schema.columns where table_schema='public' and table_name='ancestry' and is_generated='NEVER';",
    )
    .map((c) => '"' + c + '"')
    .join(",");
  await rejected(
    "duplicate-common-identity",
    sharedAncestryDuplicateInsert({ columns, row: halfling.after }),
  );
  const rollbackBefore = fixture.snapshot();
  const writer = batch.sql.replace(/^begin;\n/m, "").replace(/commit;\n$/, "");
  const late = fixture.sql(
    `begin;${SHARED_LATE_REJECTION_SETUP}\n${writer}\nrollback;`,
    true,
  );
  assert.equal(late.error == null, true);
  assert.equal(late.signal, null);
  assert.equal(late.status, 3);
  assert.match(late.stderr, /ERROR:\s+P0001:/);
  assert.match(late.stderr, /Shared ancestry late test rejection/);
  assert.deepEqual(
    fixture.snapshot(),
    rollbackBefore,
    "All eleven earlier writes, cache timestamps and trigger DDL roll back",
  );
  proof.controls.push({
    name: "late-full-rollback",
    passed: true,
    full_state_preserved: true,
    actual_exit_status: 3,
    actual_signal: null,
    no_transport_error: true,
    sqlstate: "P0001",
  });
  const before = fixture.snapshot();
  const readDomain = (table) =>
    fixture.queryJson(
      `select jsonb_agg((to_jsonb(r)-'updated_at'-'search_tsv')${table === "content_source" ? "" : "||jsonb_build_object('uuid',r.uuid::text)"} order by id) from public.${table} r;`,
    );
  const domains = Object.fromEntries(
    ["ancestry", "trait", "content_source"].map((table) => [
      table,
      readDomain(table),
    ]),
  );
  await stage(batch.path, batch.sql);
  for (const table of Object.keys(domains)) {
    const expected = structuredClone(domains[table]);
    for (const patch of patches.filter((p) => p.table === table)) {
      const index = expected.findIndex((row) => row.id === patch.id);
      assert.deepEqual(expected[index], patch.before);
      expected[index] = patch.after;
    }
    assert.deepEqual(
      readDomain(table),
      expected,
      table + ": every unrelated field and row preserved",
    );
  }
  const after = fixture.snapshot();
  for (const table of Object.keys(before.tuples))
    if (
      !["public.ancestry", "public.trait", "public.content_source"].includes(
        table,
      )
    )
      assert.equal(
        after.tuples[table],
        before.tuples[table],
        table + ": full preservation",
      );
  assert.equal(after.schema_sha256, before.schema_sha256);
  assert.equal(after.roles_sha256, before.roles_sha256);
  assert.deepEqual(after.sequences, before.sequences);
  const release = fixture.queryJson(
    "begin read only;select jsonb_agg(to_jsonb(s)) from (" +
      batch.releaseSql.trim().replace(/;$/, "") +
      ") s;rollback;",
  );
  assert.deepEqual(release, [{ id: "shared-ancestries", passed: true }]);
  await stage("shared-ancestries-exact-replay", batch.sql);
  assert.deepEqual(
    fixture.snapshot(),
    after,
    "Full exact replay is read-only at the successor",
  );
  proof.controls.push({
    name: "full-successor-preservation-and-replay",
    passed: true,
    full_state_preserved: true,
    actual_exit_status: 0,
    actual_signal: null,
    no_transport_error: true,
  });
  assert.deepEqual(
    proof.controls.map((row) => row.name),
    SHARED_NATIVE_CONTROLS,
  );
  assert.ok(
    proof.controls.every(
      (row) => row.passed === true && row.full_state_preserved === true,
    ),
  );
  proof.passed = true;
  proof.native_executed = true;
  return proof;
}
