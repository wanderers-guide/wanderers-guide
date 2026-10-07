import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

/** Artifact membership and symbolic URL validation only; native row hashes are computed by PostgreSQL. */
export function validateDualTerminalNativeMembership(completion100, display101, ledger) {
  assert.equal(ledger.schema,'wg-tv-dual-terminal-native-hashes-v1');
  assert.equal(ledger.candidates?.completion100?.spec_sha256,display101.completion_spec_sha256);
  assert.equal(ledger.candidates?.display101?.spec_sha256,createHash('sha256').update(JSON.stringify(display101)).digest('hex'),'Native digest ledger must be pinned to exact101 spec bytes; this hashes only the artifact, never PostgreSQL rows');
  assert.ok(ledger.native_derivation?.postgres_version);
  assert.equal(ledger.native_derivation.full_row_expression,"(to_jsonb(r)-'updated_at'-'search_tsv')||jsonb_build_object('uuid',r.uuid::text)");
  assert.equal(ledger.native_derivation.expected_hash_expression,"encode(sha256(convert_to(expected::text,'UTF8')),'hex')");
  assert.equal(ledger.native_derivation.template_display_normalization,'exact reviewed self-link fields to symbolic allocated_id UUID tokens after positive-ID/type/source/cardinality validation','101 template hashes must not pin rehearsal-only allocated IDs');
  const key = p => `${p.table}:${p.id}`, templateKey = p => `${p.table}:${p.uuid}`;
  const expected = [...completion100.patches,...completion100.dependencies];
  const normalized = input => {const row=structuredClone(input);delete row.updated_at;delete row.search_tsv;if(row.uuid!=null)row.uuid=String(row.uuid);return row;};
  const exactSet = (a,b,keyOf) => {
    assert.equal(a.length,b.length);assert.equal(new Set(a.map(keyOf)).size,a.length);
    assert.deepEqual(a.map(keyOf).sort(),b.map(keyOf).sort());
  };
  exactSet(ledger.entries,expected,key);exactSet(display101.catalog,expected,key);
  const displayByKey = new Map(display101.catalog.map(p=>[key(p),p]));
  const literalByKey = new Map(expected.map(p=>[key(p),p.final??p.anchor]));
  for(const p of ledger.entries){
    const literal=literalByKey.get(key(p));
    for(const field of ['id','uuid','name','content_source_id'])assert.equal(String(p[field]),String(literal[field]));
    assert.ok(Object.hasOwn(literal,'created_at'));
    assert.deepEqual(displayByKey.get(key(p)).before,normalized(literal));
    assert.equal(displayByKey.get(key(p)).after.created_at,literal.created_at,'Existing creation timestamp remains in each complete native terminal row hash');
  }
  for(const p of completion100.patches)assert.equal(p.final.created_at,p.anchor.created_at);
  exactSet(ledger.sources,completion100.sources,p=>String(p.id));exactSet(display101.sources,completion100.sources,p=>String(p.id));
  exactSet(ledger.templates,[...completion100.prerequisites,...completion100.inserts],templateKey);
  exactSet([...display101.prerequisites,...display101.inserts],[...completion100.prerequisites,...completion100.inserts],templateKey);
  for(const p of [...ledger.entries,...ledger.templates]) {
    for(const suffix of ['100','101'])assert.match(p[`sha256_${suffix}`],/^[0-9a-f]{64}$/);
  }
  for(const p of ledger.sources)assert.match(p.sha256,/^[0-9a-f]{64}$/);
  const changedExisting = ledger.entries.filter(p=>p.sha256_100!==p.sha256_101).map(key).sort();
  assert.deepEqual(changedExisting,display101.operation_owners.slice().sort(),'Only the reviewed14 operation display owners may differ between terminal catalog hashes');
  const changedTemplates = ledger.templates.filter(p=>p.sha256_100!==p.sha256_101).map(templateKey).sort();
  assert.deepEqual(changedTemplates,[...display101.prerequisites,...display101.inserts].filter(p=>p.display_fields.length).map(templateKey).sort(),'Only exact6 authored +1 lesser-insert display templates may differ');
  assert.equal(completion100.patches.length,ledger.entries.filter(p=>p.role==='owner').length);
  assert.equal(completion100.dependencies.length,ledger.entries.filter(p=>p.role==='dependency').length);
  assert.deepEqual(completion100.counts.final,display101.counts);
  assert.deepEqual(completion100.known_pending_dependencies,display101.known_pending_dependencies);
  return {catalog:expected.length,owners:completion100.patches.length,dependencies:completion100.dependencies.length,sources:completion100.sources.length,prerequisites:completion100.prerequisites.length,inserts:completion100.inserts.length};
}

/** Match complete Markdown helper URL tokens, never a prefix of another ID. */
export function symbolicSelfLinkReplacementSql(table, uuid, actualIdSql, fieldSql) {
  assert.ok(['item','creature'].includes(table));assert.match(uuid,/^[0-9]+$/);
  return `replace(${fieldSql},'](link_${table}_'||${actualIdSql}||')','](link_${table}_{{allocated_id:${uuid}}})')`;
}
