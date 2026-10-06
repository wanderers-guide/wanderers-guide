import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { originalNativeBatches } from './treasure-vault-native-negatives.mjs';

const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const quote = value => "'" + String(value).replaceAll("'", "''") + "'";
const get = (row, path) => path.reduce((value, part) => value?.[part], row);
const same = (left, right) => { try { assert.deepEqual(left, right); return true; } catch { return false; } };
const normalized = row => {
  const value = structuredClone(row);
  delete value.updated_at; delete value.search_tsv;
  if (value.uuid != null) value.uuid = String(value.uuid);
  return value;
};
const set = (row, path, value) => {
  assert.ok(path.length && path.every(part => typeof part === 'string' || Number.isSafeInteger(part)));
  const parent = path.slice(0, -1).reduce((parent, part) => {
    assert.ok(parent != null && typeof parent === 'object' && Object.hasOwn(parent, part), 'Exact existing parent for approved leaf');
    return parent[part];
  }, row);
  parent[path.at(-1)] = structuredClone(value);
};

/** Positive expectations are independently projected from immutable approved leaves, never release results. */
export function createHistoricalPositiveProjections({ inputs, fixture, receipt }) {
  assert.equal(inputs.input_provenance.mode, 'checked-in-default');
  const batches = originalNativeBatches(inputs);
  const names = ['seeds','gifts','chair','physical','repository','advancements','bastion','traitDefinitions','thirdEye','scalar','itemOperations','artifactAccess','legacyGrips','embeddedDisplay'];
  const byPath = new Map(names.map(name => [batches[name].path, name]));
  assert.equal(byPath.size, 14);
  for (const method of ['readState','queryJson','snapshot']) assert.equal(typeof fixture[method], 'function');
  const sources = () => fixture.queryJson("select coalesce(jsonb_agg(to_jsonb(s) order by id),'[]'::jsonb) from public.content_source s;");
  const sequenceFor = table => {
    assert.ok(['item','creature'].includes(table));
    const value = fixture.queryJson(`select to_jsonb(pg_get_serial_sequence('public.${table}','id'));`);
    assert.match(value, /^public\.[a-z_]+$/); return value;
  };

  /** This captures the true own-stage state before executing its actual wrapper. */
  function capture(path) {
    const family = byPath.get(path); assert.ok(family, 'Only exact fourteen approved historical phases');
    const batch = batches[family], spec = batch.spec;
    const before = fixture.snapshot(), content = fixture.readState(), sourceBefore = sources();
    const expected = structuredClone(content), expectedSources = structuredClone(sourceBefore);
    const affected = new Map(), touchedSources = new Set(), insertions = [], changes = [];
    const source = id => { const rows = expectedSources.filter(row => row.id === id); assert.equal(rows.length, 1); return rows[0]; };
    function existing(table, id) {
      assert.ok(Object.hasOwn(expected, table)); assert.ok(Number.isSafeInteger(id) && id > 0);
      const rows = expected[table].filter(row => row.id === id); assert.equal(rows.length, 1, `${table}:${id} exact owner`);
      return rows[0];
    }
    function mutate(table, id, leaves) {
      const row = existing(table, id), original = structuredClone(row);
      assert.ok(leaves.length);
      for (const leaf of leaves) set(row, leaf.path, leaf.value);
      if (!same(normalized(original), normalized(row))) {
        affected.set(`${table}:${id}`, {table,id}); touchedSources.add(original.content_source_id);
        changes.push({table,id,paths:leaves.map(leaf => leaf.path),before:normalized(original),after:normalized(row)});
      }
    }
    function operations(table, blocks) {
      for (const block of blocks) {
        const row = existing(table, block.id);
        assert.ok(same(row.operations, block.before) || same(row.operations, block.after), 'Approved operation baseline or exact replay');
        mutate(table, block.id, [{path:['operations'],value:block.after}]);
      }
    }
    function fullLeaves(table, patch, fields) {
      assert.ok(fields.length);
      for (const field of fields) assert.ok(Object.hasOwn(patch.final, field));
      mutate(table, patch.id, fields.map(field => ({path:[field],value:patch.final[field]})));
    }
    function addTemplate(table, row, binding = null) {
      assert.ok(['item','creature'].includes(table));
      const matches = content[table].filter(value => String(value.uuid) === String(row.uuid));
      assert.ok(matches.length <= 1, 'Exact template UUID cardinality');
      // PostgreSQL typing is independent of the executed migration; no after-row supplies expected payload.
      const typed = fixture.queryJson(`select to_jsonb(r) from jsonb_populate_record(null::public.${table},${quote(JSON.stringify(row))}::jsonb) r;`);
      insertions.push({table,row:typed,binding,existing:matches[0] ?? null});
      if (!matches.length) touchedSources.add(row.content_source_id);
    }
    function countLeaves(counts, keys) {
      const row = source(16);
      for (const key of keys) set(row, ['meta_data','counts',key], counts[key]);
      if (!same(row, sourceBefore.find(value => value.id === 16))) touchedSources.add(16);
    }

    if (family === 'seeds') {
      for (const item of spec.items) addTemplate('item', item.row);
      countLeaves(spec.terminal_counts, ['item','trait']);
    } else if (family === 'gifts') {
      for (const block of spec.blocks) {
        const row = existing('ability_block', block.id);
        assert.ok(row.meta_data != null && typeof row.meta_data === 'object');
        mutate('ability_block', block.id, [
          {path:['traits'],value:block.after.traits}, {path:['description'],value:block.after.description},
          {path:['meta_data','source'],value:block.after.source},
        ]);
      }
    } else if (family === 'chair') {
      addTemplate('item', spec.item);
      addTemplate('creature', spec.creature, {operation_id:spec.attack_operation_id,item_uuid:String(spec.item.uuid)});
      countLeaves(spec.terminal_counts, ['item','creature']);
    } else if (family === 'physical') {
      assert.equal(Array.isArray(spec), true);
      for (const patch of spec) {
        const row = existing('item', patch.id), tuple = {bulk:row.bulk,usage:row.usage,traits:row.traits};
        const target = patch.successor_after && same(tuple, patch.successor_after) ? patch.successor_after : patch.after;
        mutate('item', patch.id, ['bulk','usage','traits'].map(field => ({path:[field],value:target[field]})));
      }
    } else if (family === 'repository' || family === 'advancements') {
      operations('ability_block', spec.blocks);
    } else if (family === 'bastion') {
      mutate('item', spec.id, [{path:['description'],value:spec.after}]);
    } else if (family === 'traitDefinitions') {
      for (const block of spec.blocks) mutate('trait', block.id, [
        {path:['description'],value:block.after.description}, {path:['meta_data'],value:block.after.metadata},
      ]);
    } else if (family === 'thirdEye') {
      operations('item', spec.items);
    } else if (family === 'scalar') {
      for (const patch of spec.patches) {
        assert.ok(Array.isArray(patch.path));
        assert.ok(['bulk','meta_data','price','traits'].includes(patch.path[0]), 'Only reviewed scalar column families');
        mutate('item', patch.id, [{path:patch.path,value:patch.after}]);
      }
    } else if (family === 'itemOperations') {
      for (const patch of spec.patches) fullLeaves('item', patch, ['operations']);
    } else if (family === 'artifactAccess') {
      for (const patch of spec.patches) {
        assert.ok(['item','ability_block','archetype'].includes(patch.table));
        assert.ok(['operations','dedication_feat_id'].includes(patch.path));
        fullLeaves(patch.table, patch, [patch.path]);
      }
    } else if (family === 'legacyGrips') {
      for (const patch of spec.patches) {
        assert.equal(patch.table, 'item'); assert.deepEqual(patch.changed_columns, ['hands','usage']);
        fullLeaves('item', patch, ['hands','usage']);
      }
    } else if (family === 'embeddedDisplay') {
      for (const patch of spec.patches) {
        assert.equal(patch.table, 'item');
        for (const leaf of patch.leaves) {
          const path = leaf.path.split('.').map(part => /^[0-9]+$/.test(part) ? Number(part) : part);
          assert.ok(['operations','meta_data'].includes(path[0]));
          assert.ok(same(get(existing('item', patch.id), path), leaf.before) || same(get(existing('item', patch.id), path), leaf.after));
          mutate('item', patch.id, [{path,value:leaf.after}]);
        }
      }
    } else assert.fail('No unimplemented positive family may count green');

    /** Full owner projection and unrelated/saved/source/queue preservation after the actual stage. */
    function verify() {
      const actual = fixture.readState(), sourceAfter = sources(), after = fixture.snapshot();
      const allocations = [], expectedCalls = {};
      for (const template of insertions) {
        const matches = actual[template.table].filter(row => String(row.uuid) === String(template.row.uuid));
        assert.equal(matches.length, 1, 'Exact actual allocated template');
        const row = matches[0]; assert.ok(Number.isSafeInteger(row.id) && row.id > 0);
        assert.ok(typeof row.created_at === 'string' && Number.isFinite(Date.parse(row.created_at)), 'Actual generated creation time');
        const desired = structuredClone(template.row);
        if (template.binding) {
          const item = actual.item.filter(value => String(value.uuid) === template.binding.item_uuid); assert.equal(item.length, 1);
          assert.ok(Number.isSafeInteger(item[0].id) && item[0].id > 0);
          const ops = desired.operations.filter(op => op.id === template.binding.operation_id); assert.equal(ops.length, 1);
          ops[0].data.itemId = item[0].id;
        }
        const payload = value => { const out = normalized(value); delete out.id; delete out.created_at; return out; };
        assert.deepEqual(payload(row), payload(desired), 'All non-generated insert columns equal independent typed authored literal');
        if (template.existing) {
          assert.deepEqual(row, template.existing, 'An already-authored exact template is not rewritten on replay');
        } else {
          assert.equal(content[template.table].some(value => value.id === row.id), false, 'No prior catalog identity overwritten');
          expected[template.table].push({...desired,id:row.id,created_at:row.created_at,updated_at:row.updated_at,search_tsv:row.search_tsv});
          affected.set(`${template.table}:${row.id}`, {table:template.table,id:row.id});
          expectedCalls[template.table] = (expectedCalls[template.table] ?? 0) + 1;
          allocations.push({table:template.table,id:row.id,uuid:String(row.uuid),created_at:row.created_at});
        }
      }
      for (const table of Object.keys(expected)) {
        assert.ok(Object.hasOwn(actual, table));
        const comparable = row => affected.has(`${table}:${row.id}`) ? normalized(row) : row;
        assert.deepEqual(actual[table].map(comparable).sort((a,b)=>a.id-b.id), expected[table].map(comparable).sort((a,b)=>a.id-b.id), `${family}: entire ${table} domain, not only touched owners`);
      }
      assert.deepEqual(Object.keys(actual).sort(), Object.keys(expected).sort());
      const sourceComparable = row => {
        const out = structuredClone(row); if (touchedSources.has(row.id)) delete out.updated_at; return out;
      };
      assert.deepEqual(sourceAfter.map(sourceComparable), expectedSources.map(sourceComparable), 'All source columns/count siblings; only affected cache timestamps exempt');
      const alteredTupleTables = new Set([...affected.values()].map(row => `public.${row.table}`));
      if (touchedSources.size) alteredTupleTables.add('public.content_source');
      assert.deepEqual(Object.keys(after.tuples).sort(), Object.keys(before.tuples).sort());
      for (const table of Object.keys(before.tuples)) if (!alteredTupleTables.has(table)) assert.equal(after.tuples[table], before.tuples[table], `${table}: all unrelated/Auth/saved/proof/queue rows preserved`);
      assert.equal(after.schema_sha256, before.schema_sha256); assert.equal(after.roles_sha256, before.roles_sha256);
      assert.deepEqual(Object.keys(after.sequences).sort(), Object.keys(before.sequences).sort());
      const permitted = new Map(Object.entries(expectedCalls).map(([table,count]) => [sequenceFor(table), {table,count}]));
      const observed = new Set();
      for (const [path, initial] of Object.entries(before.sequences)) {
        const value = after.sequences[path], allocation = permitted.get(path);
        if (!allocation) { assert.deepEqual(value, initial, 'Every unrelated sequence remains exact'); continue; }
        assert.equal(initial.cache, '1'); assert.equal(initial.cycle, false);
        const ids = Array.from({length:allocation.count}, (_, index) => Number(BigInt(initial.last_value) + BigInt(initial.increment) * BigInt(index + (initial.is_called ? 1 : 0))));
        assert.ok(ids.every(id => Number.isSafeInteger(id) && id > 0));
        const terminalId = ids.at(-1); observed.add(path);
        assert.deepEqual(allocations.filter(row => row.table === allocation.table).map(row => row.id).sort((a,b)=>a-b), ids.sort((a,b)=>a-b), 'Actual IDs derive from untouched real sequence, not fixture remapping');
        assert.deepEqual(value, {...initial,last_value:String(terminalId),is_called:true}, 'Only independently expected migration identity allocation');
      }
      assert.equal(observed.size, permitted.size, 'Every expected content allocation sequence exists');
      const entry = {path,family,passed:true,expected_projection_sha256:hash(changes),changes:changes.map(({table,id,paths})=>({table,id,paths})),actual_insert_allocations:allocations,expected_nextval_calls:expectedCalls,complete_content_domains:true,all_source_domains:true,unrelated_Auth_saved_queue_schema_roles_preserved:true,exemptions:{changed_owners:['updated_at','search_tsv'],affected_source_ids:[...touchedSources].sort((a,b)=>a-b),affected_sources:['updated_at'],new_rows:['actual positive sequence ID','actual created_at default','updated_at','search_tsv']},expected_from:'Independent approved literal leaf projection; no migration/release result used as expected content'};
      (receipt.historical_positive_projections ??= []).push(entry);
      return entry;
    }
    return {path,family,before_sha256:before.sha256,verify};
  }
  function complete() {
    const rows = receipt.historical_positive_projections ?? [];
    assert.equal(rows.length, 14); assert.equal(new Set(rows.map(row => row.path)).size, 14);
    assert.deepEqual(rows.map(row => row.path).sort(), [...byPath.keys()].sort());
    assert.ok(rows.every(row => row.passed));
    return {historical14:true,independent_complete_owner_projection:true,full_unrelated_saved_source_queue_preservation:true};
  }
  return {capture,complete,paths:[...byPath.keys()]};
}
