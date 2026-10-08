import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

export const PREVIOUS_TERMINAL_BODY_SHA256 = '306b98528f553f9089d3b46c8541b30121c9cdf1c30a48a69034842982f22c87';
export const SOURCE_CORRECTION_TERMINAL_BODY_SHA256 = '18134f9ceb5b974368dcfba9e6a145c839b63a762014424005872665b4dce869';
export const SOURCE_CORRECTION_IDS = Object.freeze([11937, 11944, 12325]);
export const SOURCE_CORRECTION_UPGRADE_PATH = '20261008105900_treasure_vault_terminal_source_corrections.sql';
export const SOURCE_CORRECTION_PATH = '20261008110000_treasure_vault_source_corrections.sql';
const rejectedSourceControls = [...Array.from({length:6},(_,index)=>'mixed-successor-'+(index+1)),...[11937,11944,12325].map(id=>'unreviewed-field-'+id),'pending-curator'];
export const SOURCE_CORRECTION_CONTROL_NAMES = Object.freeze(['exact-old-helper-upgrade','changed-old-helper-setup','changed-old-helper-rejection','all-before-to-all-after',
  ...rejectedSourceControls.flatMap(name=>[name+':setup',name+':helper',name]),'late-failure-full-rollback:setup','late-failure-full-rollback','actual-correction-full-preservation','corrected-historical-replays','corrected-read-only-checks']);
const sha = value => createHash('sha256').update(value).digest('hex');
const dragonBefore = '| Conspirator or horned | [Poison](link_trait_1476) |';
const dragonAfter = '| Conspirator or horned | Bludgeoning |';
const forkBefore = '+13, and the spell DC is 29.';
const forkAfter = '+19, and the spell DC is 29.';
const rowExpression = "(to_jsonb(r)-'updated_at'-'search_tsv')||jsonb_build_object('uuid',r.uuid::text)";

/** Derive only the three approved successors from the unchanged full101 literal. */
export function sourceCorrectionRows(spec101) {
  return SOURCE_CORRECTION_IDS.map(id => {
    const entry = spec101.catalog.find(entry => entry.table === 'item' && entry.id === id);
    assert.ok(entry, 'Every source correction has an exact101 owner');
    const before = structuredClone(entry.after), after = structuredClone(before);
    assert.equal(before.content_source_id, 16);
    const from = id === 12325 ? forkBefore : dragonBefore;
    const to = id === 12325 ? forkAfter : dragonAfter;
    assert.equal(before.description.split(from).length, 2, 'One reviewed prose leaf');
    after.description = before.description.replace(from, to);
    if (id === 12325) {
      assert.deepEqual(before.meta_data.spellheart_casting, { dc: 29 });
      after.meta_data.spellheart_casting.attack = 19;
    }
    return { table: 'item', id, before, after };
  });
}

/** All three complete corrected rows must match before historical normalization applies. */
export function sourceCorrectionCtes(patches) {
  assert.deepEqual(patches.map(patch => patch.id), SOURCE_CORRECTION_IDS);
  const spec = JSON.stringify({ patches }).replaceAll('$', '\\u0024');
  return `global_source_corrections_settings as materialized(select $source_corrections102$${spec}$source_corrections102$::jsonb as spec),
global_source_corrections as materialized(select coalesce(count(*)=3 and bool_and(r.id is not null and (${rowExpression})=p->'after'),false) as passed
  from global_source_corrections_settings s cross join lateral jsonb_array_elements(s.spec->'patches') p left join public.item r on r.id=(p->>'id')::bigint),
`;
}

/** This is comparison-only canonicalization; no table or saved item is written. */
export function sourceCorrectionProjection() {
  return `case when (select passed from global_source_corrections) and r.id in(11937,11944,12325)
 then (select p->'before' from global_source_corrections_settings s cross join lateral jsonb_array_elements(s.spec->'patches') p where (p->>'id')::bigint=r.id)
 else ${rowExpression} end`;
}

/** Preserve every original ledger byte and predicate while adding the exact successor branch. */
export function upgradeSourceCorrectionBody(body, patches) {
  assert.equal(sha(body), PREVIOUS_TERMINAL_BODY_SHA256, 'Only the exact previous helper can be upgraded');
  const marker = 'global_terminal_actual as materialized(';
  assert.equal(body.split(marker).length, 2);
  const before = `select e.value as expected,'item'::text as table_name,r.id as actual_id,${rowExpression} as row from global_terminal_settings g cross join lateral jsonb_array_elements(g.spec->'entries') e(value) left join public.item r on r.id=(e.value->>'id')::bigint where e.value->>'table'='item'`;
  const after = before.replace(rowExpression, sourceCorrectionProjection());
  assert.equal(body.split(before).length, 2);
  return body.replace(marker, sourceCorrectionCtes(patches) + marker).replace(before, after);
}

/** Restored snapshots may carry the old reviewed helper; no other definition is accepted. */
export function terminalSourceCorrectionInstaller({ definition, state, previousState, signature }) {
  return `-- Shared read-only terminal proof. Install before the first dependent repair.
begin;
do $terminal_install$
declare definition constant text:=$terminal_definition$${definition}$terminal_definition$;
begin
  if pg_catalog.to_regprocedure('${signature}') is null then
    execute definition;
  elsif (${state}) is not true then
    if (${previousState}) is not true then
      raise exception 'Treasure Vault terminal helper differs from the reviewed definition';
    end if;
    execute replace(definition,'create function ${signature}','create or replace function ${signature}');
  end if;
end $terminal_install$;
alter function ${signature} owner to postgres;
revoke all on function ${signature} from public,anon,authenticated;
grant execute on function ${signature} to postgres,service_role,supabase_read_only_user;
do $terminal_readback$
begin
  if (${state}) is not true then
    raise exception 'Treasure Vault terminal helper readback failed';
  end if;
end $terminal_readback$;
commit;
`;
}

/** Upgrade the exact deployed helper without copying its unchanged multi-megabyte ledger. */
export function terminalSourceCorrectionUpgrade({ state, previousState, patches, signature }) {
  const marker = 'global_terminal_actual as materialized(';
  const before = `select e.value as expected,'item'::text as table_name,r.id as actual_id,${rowExpression} as row from global_terminal_settings g cross join lateral jsonb_array_elements(g.spec->'entries') e(value) left join public.item r on r.id=(e.value->>'id')::bigint where e.value->>'table'='item'`;
  const after = before.replace(rowExpression, sourceCorrectionProjection());
  const definitionPrefix = `create or replace function ${signature}
returns table(recognized boolean,passed boolean)
language sql stable security invoker parallel unsafe cost 100 rows 1
set search_path = ''
as `;
  return `-- Accept the exact source-corrected terminal without changing historical data proofs.
do $terminal_source_upgrade$
declare previous_body text;corrected_body text;
begin
  if (${state}) is true then return;end if;
  if (${previousState}) is not true then
    raise exception 'Treasure Vault source-correction helper predecessor differs';
  end if;
  select p.prosrc into strict previous_body from pg_catalog.pg_proc p where p.oid=pg_catalog.to_regprocedure('${signature}');
  corrected_body:=replace(replace(previous_body,$source_marker$${marker}$source_marker$,$source_ctes$${sourceCorrectionCtes(patches)}${marker}$source_ctes$),$source_projection_before$${before}$source_projection_before$,$source_projection_after$${after}$source_projection_after$);
  if pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(corrected_body,'UTF8')),'hex')<>'${SOURCE_CORRECTION_TERMINAL_BODY_SHA256}' then
    raise exception 'Treasure Vault source-correction helper successor differs';
  end if;
  execute $source_definition$${definitionPrefix}$source_definition$||pg_catalog.quote_literal(corrected_body)||';';
  if (${state}) is not true then
    raise exception 'Treasure Vault source-correction helper readback failed';
  end if;
end $terminal_source_upgrade$;
`;
}

/** Preserve the original101 body and query verbatim, including their own-stage checks. */
export function wrapDisplaySourceCorrections({ originalSql, originalReleaseSql, patches, helperState, locks, signature }) {
  const ctes = sourceCorrectionCtes(patches);
  const migration = `-- Preserve the original display repair and accept only its exact source-corrected successor.
do $display_source_successor$
declare completion_recognized boolean;completion_passed boolean;
begin
  ${locks}
  if (${helperState}) is not true then
    raise exception 'Treasure Vault terminal helper is missing or differs from the reviewed definition';
  end if;
  if (with ${ctes.slice(0, -2)} select passed from global_source_corrections) then
    select s.recognized,s.passed into strict completion_recognized,completion_passed from ${signature} s;
    if completion_recognized is not true or completion_passed is not true then
      raise exception 'Treasure Vault source-corrected display successor is partial or unreviewed';
    end if;
    return;
  end if;
  execute $display_original_source$${originalSql}$display_original_source$;
end $display_source_successor$;
`;
  const originalQuery = originalReleaseSql.trimEnd().replace(/;$/, '');
  assert.equal(originalReleaseSql, originalQuery + ';\n');
  const release = `-- Preserve original101 predicates and accept only the exact source-corrected successor.
with ${ctes}terminal_function as materialized(select (${helperState}) as valid),
terminal_status as materialized(select case when f.valid is true then
  coalesce((select pg_catalog.to_jsonb(s) from ${signature} s),'{"recognized":true,"passed":false}'::jsonb)
  else '{"recognized":true,"passed":false}'::jsonb end as value from terminal_function f),
original_checks as(
${originalQuery}
)
select o.id,case when c.passed then coalesce((s.value->>'recognized')::boolean,false) and coalesce((s.value->>'passed')::boolean,false) else o.passed end as passed from original_checks o cross join global_source_corrections c cross join terminal_status s;
`;
  return { migration, release };
}

/** Actual PostgreSQL controls, invoked only with the runner's owned offline fixture. */
export function createNativeSourceCorrectionControls({ inputs, fixture, receipt, userId, checkpoint = async () => {} }) {
  const batch = inputs.sourceCorrections, patches = batch.patches;
  const quote = value => "'" + String(value).replaceAll("'", "''") + "'";
  const json = value => quote(JSON.stringify(value)) + '::jsonb';
  const normalize = row => {
    const value = structuredClone(row);
    delete value.updated_at; delete value.search_tsv;
    if (value.uuid != null) value.uuid = String(value.uuid);
    return value;
  };
  const rows = () => fixture.queryJson("select jsonb_agg((to_jsonb(r)-'updated_at'-'search_tsv')||jsonb_build_object('uuid',r.uuid::text) order by id) from public.item r where id in(11937,11944,12325);");
  const sources = () => fixture.queryJson("select jsonb_agg(to_jsonb(s) order by id) from public.content_source s;");
  const statusSql = `select row_to_json(s) from ${inputs.helper.signature} s;`;
  const proof = receipt.source_corrections = { passed: false, native_executed: false, controls: [], owner_ids: [...SOURCE_CORRECTION_IDS] };
  function result(name, sql, failure = null) {
    const actual = fixture.sql(sql, true);
    assert.equal(actual.error == null, true, name + ': no transport failure');
    assert.equal(actual.signal, null, name + ': no process signal');
    assert.equal(actual.status, failure ? 3 : 0, name + ': ' + fixture.redact(actual.stderr));
    if (failure) {
      assert.match(actual.stderr, /ERROR:\s+P0001:/);
      assert.match(actual.stderr, failure);
    }
    proof.native_executed = true;
    return actual;
  }
  function record(name, extra = {}) {
    proof.controls.push({ name, passed: true, actual_exit_status: 0, actual_signal: null, no_transport_error: true, full_state_preserved: true, ...extra });
  }
  async function capsule(name, sql, check = () => {}) {
    await checkpoint('source correction ' + name);
    fixture.assertOwned();
    const before = fixture.snapshot();
    const actual = result(name, 'begin;' + sql + '\nrollback;');
    check(actual.stdout);
    assert.deepEqual(fixture.snapshot(), before, name + ': full rollback including saved rows, schema, roles and sequences');
    record(name);
  }
  const setAfter = patch => `update public.item set description=${quote(patch.after.description)},meta_data=${json(patch.after.meta_data)} where id=${patch.id};`;
  async function reject(name, setup, message, helperFails = true) {
    await capsule(name + ':setup', setup);
    const before = fixture.snapshot();
    const actual = result(name, 'begin;' + setup + '\n' + batch.sql + '\nrollback;', message);
    assert.deepEqual(fixture.snapshot(), before, name + ': failed repair restores the complete fixture');
    if (helperFails) await capsule(name + ':helper', setup + '\n' + statusSql, stdout => {
      assert.deepEqual(JSON.parse(stdout.trim()), { recognized: true, passed: false });
    });
    record(name, { actual_exit_status: actual.status, sqlstate: 'P0001', setup_type_proved: true });
  }
  async function beforeUpgrade() {
    const previousBody = inputs.helper.body.replace(sourceCorrectionCtes(patches), '').replace(sourceCorrectionProjection(), rowExpression);
    assert.equal(sha(previousBody), PREVIOUS_TERMINAL_BODY_SHA256);
    const previousDefinition = inputs.helper.definition.replace(inputs.helper.body, previousBody).replace('create function ', 'create or replace function ');
    await capsule('exact-old-helper-upgrade', previousDefinition + '\n' + statusSql + '\n' + batch.upgrade.sql + '\n' + statusSql, stdout => {
      assert.deepEqual(stdout.trim().split('\n').map(line => JSON.parse(line)), [{ recognized: true, passed: true }, { recognized: true, passed: true }]);
    });
    await capsule('changed-old-helper-setup', previousDefinition + '\nalter function ' + inputs.helper.signature + ' volatile;');
    const before = fixture.snapshot();
    result('changed-old-helper-rejection', 'begin;' + previousDefinition + '\nalter function ' + inputs.helper.signature + ' volatile;\n' + batch.upgrade.sql + '\nrollback;', /source-correction helper predecessor differs/);
    assert.deepEqual(fixture.snapshot(), before);
    record('changed-old-helper-rejection', { actual_exit_status: 3, sqlstate: 'P0001' });
  }
  async function beforeRepair() {
    assert.deepEqual(rows(), patches.map(patch => patch.before));
    await capsule('all-before-to-all-after', batch.sql + '\n' + statusSql, stdout => {
      assert.deepEqual(JSON.parse(stdout.trim()), { recognized: true, passed: true });
    });
    for (let mask = 1; mask < 7; mask++) {
      const setup = patches.filter((patch, index) => mask & (1 << index)).map(setAfter).join('\n');
      await reject('mixed-successor-' + mask, setup, /source corrections differ from the complete reviewed state/);
    }
    for (const patch of patches) await reject('unreviewed-field-' + patch.id,
      `update public.item set meta_data=jsonb_set(meta_data,'{unreviewed}','true'::jsonb,true) where id=${patch.id};`,
      /source corrections differ from the complete reviewed state/);
    const proposalId = fixture.reserveProposalId();
    await reject('pending-curator', `insert into public.content_update(id,user_id,type,ref_id,content_source_id,action,data,upvotes,downvotes,status) values(${proposalId},${quote(userId)}::uuid,'item',12325,16,'UPDATE','{}'::jsonb,'{}','{}','{"state":"PENDING"}'::jsonb);`, /has a pending curator submission/);
    const priorDragonRows = patches.filter(patch => patch.id !== 12325).map(patch => `exists(select 1 from public.item r where r.id=${patch.id} and (${rowExpression})=${json(patch.after)})`).join(' and ');
    const late = `create function pg_temp.source_correction_late() returns trigger language plpgsql as $late$ begin if new.id=12325 then if not (${priorDragonRows}) then raise exception 'Earlier source correction writes were not observed';end if;raise exception 'Owned source correction late failure';end if;return new;end $late$;
create trigger source_correction_late before update on public.item for each row execute function pg_temp.source_correction_late();`;
    await reject('late-failure-full-rollback', late, /Owned source correction late failure/, false);
    return { before: fixture.snapshot(), content: fixture.readState(), sources: sources() };
  }
  function afterRepair(captured) {
    assert.deepEqual(rows(), patches.map(patch => patch.after));
    const actual = fixture.readState(), expected = structuredClone(captured.content);
    for (const patch of patches) {
      const owner = expected.item.find(row => row.id === patch.id);
      assert.deepEqual(normalize(owner), patch.before);
      owner.description = patch.after.description;
      owner.meta_data = structuredClone(patch.after.meta_data);
    }
    assert.deepEqual(Object.keys(actual).sort(), Object.keys(expected).sort());
    for (const table of Object.keys(expected)) {
      const compare = row => table === 'item' && SOURCE_CORRECTION_IDS.includes(row.id) ? normalize(row) : row;
      assert.deepEqual(actual[table].map(compare), expected[table].map(compare), 'Source correction preserves the complete ' + table + ' domain');
    }
    const sourceComparable = row => { const value = structuredClone(row); if (value.id === 16) delete value.updated_at; return value; };
    assert.deepEqual(sources().map(sourceComparable), captured.sources.map(sourceComparable));
    const after = fixture.snapshot(), before = captured.before;
    assert.deepEqual(Object.keys(after.tuples), Object.keys(before.tuples));
    for (const table of Object.keys(before.tuples)) if (!['public.item', 'public.content_source'].includes(table)) assert.equal(after.tuples[table], before.tuples[table], table + ': complete saved/Auth/queue/proof preservation');
    assert.equal(after.schema_sha256, before.schema_sha256);
    assert.equal(after.roles_sha256, before.roles_sha256);
    assert.deepEqual(after.sequences, before.sequences);
    record('actual-correction-full-preservation', { full_content_domains: true, source_count_siblings_preserved: true, saved_catalog_copies_unchanged: true });
  }
  async function afterReplay() {
    await capsule('corrected-historical-replays', inputs.completionWrapper.sql + '\n' + inputs.display.sql + '\n' + statusSql, stdout => {
      assert.deepEqual(JSON.parse(stdout.trim()), { recognized: true, passed: true });
    });
    const before = fixture.snapshot();
    for (const batch of [inputs.helper, inputs.completionWrapper, inputs.display, inputs.sourceCorrections]) {
      const rows = fixture.queryJson('begin read only;select jsonb_agg(to_jsonb(s)) from (' + batch.releaseSql.trim().replace(/;$/, '') + ') s;rollback;');
      assert.ok(rows.length && rows.every(row => row.passed === true));
    }
    assert.deepEqual(fixture.snapshot(), before);
    record('corrected-read-only-checks');
    assert.deepEqual(proof.controls.map(row=>row.name), SOURCE_CORRECTION_CONTROL_NAMES);
    proof.passed = true;
  }
  return { beforeUpgrade, beforeRepair, afterRepair, afterReplay };
}
