import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { symbolicSelfLinkReplacementSql, validateDualTerminalNativeMembership } from './treasure-vault-native-ledger-model.mjs';

/** Actual-row exporter. It cannot initialize, mutate or connect to a database. */
const sha = value => createHash('sha256').update(value).digest('hex');
const key = row => `${row.table}:${row.id}`;
const templateKey = row => `${row.table}:${row.uuid}`;
const allowedTables = ['ability_block', 'ancestry', 'archetype', 'background', 'class', 'class_archetype', 'creature', 'item', 'language', 'spell', 'trait', 'versatile_heritage'];
const quote = value => `'${String(value).replaceAll("'", "''")}'`;
const literal = value => {
  const body = JSON.stringify(value);
  assert.ok(!body.includes('$authentic_ledger$'));
  return `$authentic_ledger$${body}$authentic_ledger$::jsonb`;
};
const normalSql = alias => `((to_jsonb(${alias})-'updated_at'-'search_tsv')||jsonb_build_object('uuid',${alias}.uuid::text))`;
const digestSql = expression => `pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to((${expression})::text,'UTF8')),'hex')`;
const projectionSql = (row, keys) => `(select jsonb_object_agg(f.key,f.value) from jsonb_each(${row}) f where ${keys} ? f.key)`;
const normal = input => { const row = structuredClone(input); delete row.updated_at; delete row.search_tsv; if (row.uuid != null) row.uuid = String(row.uuid); return row; };
const get = (row, path) => path.reduce((value, field) => value[field], row);
const set = (row, path, value) => { let at = row; for (const field of path.slice(0, -1)) at = at[field]; at[path.at(-1)] = value; };

/** All statements are SELECTs over the caller's positively identified owned database. */
export function createAuthenticDualExporter({ contract, completion, display, query, output, receipt, verifyHistoricalFiles, checkpoint=async()=>{} }) {
  assert.equal(contract.schema, 'wg-tv-dual-terminal-native-hashes-v1');
  assert.deepEqual(contract.counts, { owners: 1127, dependencies: 1222, catalog: 2349, sources: 31, prerequisites: 7, inserts: 4, changed_catalog_hashes: 14, changed_template_hashes: 7, symbolic_fields: 6, symbolic_self_occurrences: 9 });
  assert.equal(contract.expected_entries.length, 2349);
  assert.equal(contract.expected_sources.length, 31);
  assert.equal(contract.expected_templates.length, 11);
  assert.equal(contract.historical_files.length, 39);
  assert.equal(new Set(contract.expected_entries.map(key)).size, 2349);
  assert.equal(new Set(contract.expected_templates.map(templateKey)).size, 11);
  const displayOwnerKeys = new Set(display.spec.operation_owners);
  assert.equal(display.spec.operation_owners.length, 14);
  assert.equal(displayOwnerKeys.size, 14);
  assert.deepEqual([...displayOwnerKeys].sort(), contract.expected_entries.filter(row => row.phase101_keys).map(key).sort(), 'Only exact reviewed101 operation owners join the mutation scope');
  for (const row of contract.expected_entries.filter(row => row.phase101_keys)) assert.deepEqual(row.phase101_keys, ['operations']);
  const phases = new Map(), statements = [];
  const run = sql => {
    assert.match(sql, /^\s*(?:with|select)\b/i);
    statements.push(sql);
    const text = query(sql);
    return text.split('\n').filter(Boolean).map(line => JSON.parse(line));
  };

  /** Chunk actual tuple equality and hashes, not a giant full-body aggregate. */
  async function catalogPhase(phase) {
    const rowField = phase === 'before100' ? 'row_before_100' : `row_${phase}`;
    const result = new Map();
    for (const table of [...new Set(contract.expected_entries.map(row => row.table))].sort()) {
      assert.ok(allowedTables.includes(table));
      const owners = contract.expected_entries.filter(row => row.table === table);
      for (let start = 0; start < owners.length; start += 64) {
        await checkpoint(`native ledger ${phase}:${table}:${start}`);
        const expected = owners.slice(start, start + 64).map(row => ({ id: row.id, row: row[rowField], phase100_keys: row.phase100_keys ?? null, phase101_keys: row.phase101_keys ?? null }));
        const sql = `with expected as materialized(select value p from jsonb_array_elements(${literal(expected)})),actual as materialized(select e.p,r.id actual_id,${normalSql('r')} row from expected e left join public.${table} r on r.id=(e.p->>'id')::bigint)
select jsonb_build_object('id',p->'id','matched',actual_id is not null and row=p->'row','sha256',${digestSql('row')},'phase100',case when jsonb_typeof(p->'phase100_keys')='array' then ${digestSql(projectionSql('row', "p->'phase100_keys'"))} end,'phase101',case when jsonb_typeof(p->'phase101_keys')='array' then ${digestSql(projectionSql('row', "p->'phase101_keys'"))} end)::text from actual order by actual_id;`;
        const readback = run(sql);
        assert.equal(readback.length, expected.length);
        for (const row of readback) {
          assert.equal(row.matched, true, `Complete authentic ${phase} tuple mismatch: ${table}:${row.id}`);
          assert.match(row.sha256, /^[a-f0-9]{64}$/);
          assert.equal(result.has(`${table}:${row.id}`), false);
          result.set(`${table}:${row.id}`, row);
        }
      }
    }
    assert.equal(result.size, 2349);
    return result;
  }

  /** Positive unique global UUIDs are established before chair or self normalization. */
  async function allocatedTemplates(phase) {
    const templates = phase === 'before100' ? contract.expected_templates.filter(row => row.role === 'prerequisite') : contract.expected_templates;
    const actuals = new Map();
    for (const template of templates) {
      await checkpoint(`native identity ${phase}:${templateKey(template)}`);
      assert.ok(['item', 'creature'].includes(template.table));
      assert.match(template.uuid, /^[0-9]+$/);
      const rows = run(`select (${normalSql('r')})::text from public.${template.table} r where r.uuid::text=${quote(template.uuid)};`);
      assert.equal(rows.length, 1, `Global allocated UUID cardinality: ${templateKey(template)}`);
      const row = rows[0];
      assert.ok(Number.isSafeInteger(row.id) && row.id > 0);
      assert.equal(row.content_source_id, 16);
      assert.equal(row.name, template.name);
      if (template.table === 'creature') assert.equal(row.type, 'creature');
      assert.equal(row.uuid, template.uuid);
      actuals.set(templateKey(template), row);
    }
    if (phase === 'before100') for (const template of contract.expected_templates.filter(row => row.role === 'insert')) {
      assert.equal(query(`select count(*) from public.${template.table} where uuid::text=${quote(template.uuid)};`), '0', 'All four100 UUIDs are absent at the authentic predecessor');
    }
    let occurrences = 0;
    const result = new Map();
    for (const template of templates) {
      await checkpoint(`native template ${phase}:${templateKey(template)}`);
      const actual = actuals.get(templateKey(template)), terminal = phase === '101';
      const expected = structuredClone(terminal ? template.row_101 : template.row_100);
      let normalizedSql = `${normalSql('r')}-'id'-'created_at'`;
      if (template.binding) {
        const target = actuals.get(`item:${template.binding.item_uuid}`);
        assert.ok(target);
        const operations = actual.operations.filter(op => op.id === template.binding.operation_id);
        assert.equal(operations.length, 1); assert.equal(operations[0].type, 'giveItem');
        assert.equal(operations[0].data.itemId, target.id);
        const operation = expected.operations.find(op => op.id === template.binding.operation_id);
        assert.equal(operation.type, 'giveItem'); assert.equal(operation.data.itemId, -30001);
        operation.data.itemId = target.id;
        normalizedSql = `jsonb_set(${normalizedSql},'{operations}',(select jsonb_agg(case when op->>'id'=${quote(template.binding.operation_id)} then jsonb_set(op,'{data,itemId}','-30001'::jsonb,false) else op end order by ordinal) from jsonb_array_elements(to_jsonb(r.operations)) with ordinality operations(op,ordinal)),false)`;
      }
      const grouped = new Map();
      for (const field of template.symbolic_fields) {
        const target = actuals.get(`${field.table}:${field.uuid}`);
        assert.ok(target, 'Every symbolic reference target is a previously validated allocated UUID');
        assert.equal(field.type, field.table);
        const symbolicURL = `](link_${field.type}_${field.token})`, actualURL = `](link_${field.type}_${target.id})`;
        if (terminal) {
          const original = get(template.row_101, field.path);
          const amount = original.split(symbolicURL).length - 1;
          assert.ok(amount > 0); assert.equal(get(actual, field.path).split(actualURL).length - 1, amount);
          occurrences += amount;
          set(expected, field.path, get(expected, field.path).replaceAll(symbolicURL, actualURL));
        }
        const pathKey = JSON.stringify(field.path);
        grouped.set(pathKey, [...(grouped.get(pathKey) ?? []), { ...field, actualId: target.id }]);
      }
      assert.deepEqual(actual, { ...expected, id: actual.id, created_at: actual.created_at }, `Full allocated tuple/readback equality ${phase}:${templateKey(template)}`);
      if (terminal) for (const [pathKey, fields] of grouped) {
        const path = JSON.parse(pathKey); for (const piece of path) assert.match(String(piece), /^[a-zA-Z0-9_-]+$/);
        const sqlPath = quote(`{${path.join(',')}}`) + '::text[]';
        let fieldSql = `${normalSql('r')}#>>${sqlPath}`;
        for (const field of fields) fieldSql = symbolicSelfLinkReplacementSql(field.table, field.uuid, quote(field.actualId), fieldSql);
        normalizedSql = `jsonb_set(${normalizedSql},${sqlPath},to_jsonb((${fieldSql})::text),false)`;
      }
      const symbolic = terminal ? template.row_101 : template.row_100;
      const keys = template.phase101_keys ?? null;
      const row = run(`with actual as materialized(select ${normalizedSql} row from public.${template.table} r where r.uuid::text=${quote(template.uuid)})select jsonb_build_object('matched',row=${literal(symbolic)},'sha256',${digestSql('row')},'phase101',case when ${literal(keys)}<>'null'::jsonb then ${digestSql(projectionSql('row', literal(keys)))} end)::text from actual;`);
      assert.equal(row.length, 1); assert.equal(row[0].matched, true);
      assert.match(row[0].sha256, /^[a-f0-9]{64}$/);
      result.set(templateKey(template), { ...row[0], actual_id: actual.id, actual_created_at: actual.created_at });
    }
    assert.equal(result.size, phase === 'before100' ? 7 : 11);
    if (phase === '101') assert.equal(occurrences, 9);
    return result;
  }

  async function sourcePhase(phase) {
    await checkpoint('native source '+phase);
    const field = phase === 'before100' ? 'row_before_100' : `row_${phase}`;
    const expected = contract.expected_sources.map(source => ({ id: source.id, row: source[field] }));
    const rows = run(`with expected as materialized(select value p from jsonb_array_elements(${literal(expected)}))select jsonb_build_object('id',p->'id','matched',s.id is not null and to_jsonb(s)-'updated_at'=p->'row','sha256',${digestSql("to_jsonb(s)-'updated_at'")})::text from expected e left join public.content_source s on s.id=(e.p->>'id')::bigint order by s.id;`);
    assert.equal(rows.length, 31);
    for (const row of rows) { assert.equal(row.matched, true, `Complete source ${phase}:${row.id}`); assert.match(row.sha256, /^[a-f0-9]{64}$/); }
    return new Map(rows.map(row => [row.id, row]));
  }

  /** Preserve every row outside the closed owner/template/source domains exactly. */
  async function unaffectedDigest() {
    const tables = JSON.parse(query("select coalesce(json_agg(tablename order by tablename),'[]'::json) from pg_tables where schemaname='public';"));
    const digests = {};
    for (const table of tables) {
      await checkpoint('native unchanged '+table);
      assert.match(table, /^[a-z_]+$/);
      const ids = contract.expected_entries.filter(row => row.table === table && (row.role === 'owner' || displayOwnerKeys.has(key(row)))).map(row => row.id);
      const uuids = contract.expected_templates.filter(row => row.table === table).map(row => row.uuid);
      if (table === 'content_source') ids.push(...contract.expected_sources.map(row => row.id));
      const exclusions = [ids.length ? `r.id not in(${ids.join(',')})` : null, uuids.length ? `r.uuid::text not in(${uuids.map(quote).join(',')})` : null].filter(Boolean);
      digests[table] = query(`select count(*)||':'||md5(coalesce(string_agg(md5(to_jsonb(r)::text),'' order by md5(to_jsonb(r)::text)),'')) from public."${table}" r${exclusions.length ? ' where ' + exclusions.join(' and ') : ''};`);
    }
    return { sha256: sha(JSON.stringify(digests)), entries: digests };
  }

  async function capture(phase) {
    assert.ok(['before100', '100', '101'].includes(phase)); assert.equal(phases.has(phase), false);
    assert.equal(query('select count(*) from public.content_update;'), '0', 'Actual sanitized queue remains empty');
    const before = await unaffectedDigest();
    receipt.native_unaffected_checks ??= [];
    const check = { phase, before, after: null, changed_tables: [] };
    receipt.native_unaffected_checks.push(check);
    const value = { entries: await catalogPhase(phase), templates: await allocatedTemplates(phase), sources: await sourcePhase(phase), unaffected: before };
    const after = await unaffectedDigest();
    check.after = after;
    check.changed_tables = Object.keys(before.entries).filter(table => before.entries[table] !== after.entries[table]);
    assert.equal(after.sha256, before.sha256, 'SELECT-only capture preserves every unrelated tuple');
    if (phases.has('before100')) {
      const predecessor = phases.get('before100').unaffected;
      check.changed_since_predecessor = Object.keys(predecessor.entries).filter(table => predecessor.entries[table] !== value.unaffected.entries[table]);
      assert.equal(value.unaffected.sha256, predecessor.sha256, 'Every unrelated public row/saved snapshot/queue is exactly unchanged by100/101');
    }
    phases.set(phase, value);
    receipt.native_phase_captures ??= [];
    receipt.native_phase_captures.push({ phase, catalog: value.entries.size, sources: value.sources.size, templates: value.templates.size, unrelated_public_state_sha256: before.sha256, literal_readback_equality: true, queue_count: 0 });
    console.log(`actual-native-${phase}: ${value.entries.size} complete tuples, ${value.sources.size} sources, ${value.templates.size} allocated templates verified`);
  }

  async function finish() {
    assert.equal(phases.size, 3); await verifyHistoricalFiles(contract.historical_files);
    const predecessor = phases.get('before100'), first = phases.get('100'), last = phases.get('101');
    const entries = contract.expected_entries.map(expected => {
      const baseline = predecessor.entries.get(key(expected)), row100 = first.entries.get(key(expected)), row101 = last.entries.get(key(expected));
      return { table: expected.table, id: expected.id, type: expected.type, role: expected.role, uuid: expected.row_101.uuid, name: expected.row_101.name, content_source_id: expected.row_101.content_source_id, sha256_before_100: baseline.sha256, sha256_100: row100.sha256, sha256_101: row101.sha256, ...(expected.phase100_keys ? { phase100_keys: expected.phase100_keys, phase100_before_sha256: baseline.phase100, phase100_after_sha256: row100.phase100 } : {}), ...(expected.phase101_keys ? { phase101_keys: expected.phase101_keys, phase101_before_sha256: row100.phase101, phase101_after_sha256: row101.phase101 } : {}) };
    });
    const sources = contract.expected_sources.map(expected => ({ id: expected.id, name: expected.name, sha256_before_100: predecessor.sources.get(expected.id).sha256, sha256: first.sources.get(expected.id).sha256, sha256_101: last.sources.get(expected.id).sha256 }));
    for (const source of sources) assert.equal(source.sha256, source.sha256_101);
    const templates = contract.expected_templates.map(expected => ({ ...expected, sha256_100: first.templates.get(templateKey(expected)).sha256, sha256_101: last.templates.get(templateKey(expected)).sha256, ...(expected.role === 'prerequisite' ? { sha256_before_100: predecessor.templates.get(templateKey(expected)).sha256 } : {}), ...(expected.phase101_keys ? { phase101_before_sha256: first.templates.get(templateKey(expected)).phase101, phase101_after_sha256: last.templates.get(templateKey(expected)).phase101 } : {}) }));
    const derivationSql = statements.join('\n\n') + '\n';
    const ledger = { schema: contract.schema, candidates: contract.candidates, historical_files: contract.historical_files, native_derivation: { ...contract.native_derivation, postgres_version: query('select version();'), derivation_sql_sha256: sha(derivationSql), literal_readback_equality: true, actual_row_hashes: true, authentic_full_ci_chronology: true, queue_imports: false, generated_id_mapping: false, symbolic_normalization: 'Only complete ](link_TYPE_ID) tokens, never prefixes or other fields' }, counts: contract.counts, entries, sources, templates, known_pending_dependencies: contract.known_pending_dependencies, actual_allocations: contract.expected_templates.map(expected => ({ table: expected.table, uuid: expected.uuid, id: last.templates.get(templateKey(expected)).actual_id, created_at: last.templates.get(templateKey(expected)).actual_created_at })) };
    assert.deepEqual(validateDualTerminalNativeMembership(completion.spec, display.spec, ledger), { catalog: 2349, owners: 1127, dependencies: 1222, sources: 31, prerequisites: 7, inserts: 4 });
    const path = output + '.dual-native-hashes.json', text = JSON.stringify(ledger, null, 2) + '\n';
    await writeFile(path, text, { flag: 'wx', mode: 0o600 });
    await writeFile(path + '.derivation.sql', derivationSql, { flag: 'wx', mode: 0o600 });
    receipt.authentic_dual_native_hashes = { path, sha256: sha(text), derivation_sql_sha256: sha(derivationSql), catalog: 2349, sources: 31, templates: 11, predecessor_templates: 7, symbolic_fields: 6, symbolic_occurrences: 9, actual_row_hashes: true, no_generated_id_mapping: true, no_queue_imports: true };
    return ledger;
  }
  return { capture, finish };
}
