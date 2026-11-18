/** Preserve the historical proof while recognizing reviewed derived counts in the November snapshot. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

export const SNAPSHOT_COUNTS_PATH = '20261118010000_treasure_vault_snapshot_counts.sql';
export const SNAPSHOT_COUNTS_PREDECESSOR = '04b8c42f598632cac674719222e79824af9f0057b7473747a5de11ae7d43f58a';
export const SNAPSHOT_COUNTS_SHA256 = '991a511c5eb6e2266c9f01cd1380cdd92e65fa0d032f0896d8cf14163b660100';
export const SNAPSHOT_FEAT_COUNTS = Object.freeze([
  [1, 986, 888], // Player Core
  [8, null, 1], // Monster Core
  [420, 117, 141], // Divine Mysteries
]);

const sha = (body) => createHash('sha256').update(body).digest('hex');
const prefix = 'global_terminal_source_actual as materialized(select e.value as expected,s.id as actual_id,';
const suffix = ' as row from global_terminal_settings';
const fallback = ' else /* snapshot count predecessor */ (';

function sourceProjection(original) {
  const path = "'{meta_data,counts,feat}'";
  const actual = "(select count(*) from public.ability_block where content_source_id=s.id and type='feat')";
  const rows = SNAPSHOT_FEAT_COUNTS.map(([id, oldCount, newCount]) => {
    const row = "(to_jsonb(s)-'updated_at')";
    const projected = oldCount === null ? `${row} #- ${path}` : `jsonb_set(${row},${path},'${oldCount}'::jsonb)`;
    return `when s.id=${id} and s.meta_data::jsonb#>'{counts,feat}'='${newCount}'::jsonb and ${actual}=${newCount} then ${projected}`;
  });
  return `case ${rows.join('\n ')}${fallback}${original}) end`;
}

/** Replace only the source projection in the exact prior helper. */
export function snapshotCountsReplacement(body) {
  assert.equal(sha(body), SNAPSHOT_COUNTS_PREDECESSOR);
  assert.equal(body.split(prefix).length, 2);
  const start = body.indexOf(prefix) + prefix.length;
  const end = body.indexOf(suffix, start);
  assert(end > start);
  const expression = body.slice(start, end);
  return [prefix + expression + suffix, prefix + sourceProjection(expression) + suffix];
}

/** Recover the pinned predecessor byte for byte. */
export function originalSnapshotCountsBody(body) {
  assert.equal(sha(body), SNAPSHOT_COUNTS_SHA256);
  const start = body.indexOf(prefix) + prefix.length;
  const end = body.indexOf(suffix, start);
  const projection = body.slice(start, end);
  assert.equal(projection.split(fallback).length, 2);
  assert(projection.endsWith(') end'));
  const original = body.slice(0, start) + projection.split(fallback)[1].slice(0, -5) + body.slice(end);
  const [before, after] = snapshotCountsReplacement(original);
  assert.equal(original.replace(before, () => after), body);
  return original;
}

/** Install the successor only if the function body, metadata, owner and grants match the reviewed definition. */
export function snapshotCountsUpgrade({ body, previousState, state, signature }) {
  const [before, after] = snapshotCountsReplacement(body);
  assert.equal(sha(body.replace(before, () => after)), SNAPSHOT_COUNTS_SHA256);
  return `-- Recognize reviewed November snapshot feat counts in the historical proof only.
do $snapshot_counts_upgrade$
declare body text;
begin
 if (${state}) is true then return; end if;
 if (${previousState}) is not true then raise exception 'Snapshot count helper predecessor differs'; end if;
 select prosrc into strict body from pg_catalog.pg_proc where oid=pg_catalog.to_regprocedure('${signature}');
 body:=replace(body,$snapshot_counts_before$${before}$snapshot_counts_before$,$snapshot_counts_after$${after}$snapshot_counts_after$);
 if pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(body,'UTF8')),'hex')<>'${SNAPSHOT_COUNTS_SHA256}' then raise exception 'Snapshot count helper successor differs'; end if;
 execute 'create or replace function ${signature} returns table(recognized boolean,passed boolean) language sql stable security invoker parallel unsafe cost 100 rows 1 set search_path = '''' as '||pg_catalog.quote_literal(body);
 if (${state}) is not true then raise exception 'Snapshot count helper readback differs'; end if;
end $snapshot_counts_upgrade$;
`;
}

/** Fresh restores already install the successor. Preserve exact earlier upgrade SQL for old databases. */
export function wrapSnapshotCountsReplay(sql, state, upgrade) {
  const transaction = sql.startsWith('begin;\n');
  if (transaction) assert(sql.endsWith('commit;\n'));
  const body = transaction ? sql.slice(7, -8) : sql;
  const replay = `-- Preserve the exact historical installer and skip it only for the reviewed successor.
do $snapshot_counts_replay$
begin
 if (${state}) is true then return; end if;
 execute $snapshot_counts_historical$${body}$snapshot_counts_historical$;
 execute $snapshot_counts_successor$${upgrade}$snapshot_counts_successor$;
end $snapshot_counts_replay$;
`;
  return transaction ? `begin;\n${replay}commit;\n` : replay;
}
