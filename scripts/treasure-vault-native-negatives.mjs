import assert from 'node:assert/strict';

/**
 * Pure phase-aware test recipes. Importing or constructing this module executes no
 * SQL and reads no files. Every batch comes from the strict checked-in loader.
 * Only prepare() requests real fixture-generated proposal/content IDs, before
 * the caller takes its rollback baseline; setup INSERTs use IDs explicitly.
 * The original migration's nextval effects are separately declared and checked,
 * never reset or represented as transactional sequence rollback.
 */
export const CONTROL_SOURCE_PINS = Object.freeze({
  historical_recipe_source: '290861253b88f7c9488e1de23a18c2459a2d47c7fa2a3b74d274893199ca6af6',
  completion_recipe_source: '46edc103f72f26ca534a9eedf2d230dba9de1829388c6a88750906f12e2c8ecc',
  display_recipe_source: '2acedd8c62499b6426e662c988fe00eacdc764edb67436f733cf2a14aef02853',
});

const definitions = {
  seeds: ['20261002010000_treasure_vault_relic_seeds.sql', 'seeds'],
  gifts: ['20261002020000_treasure_vault_relic_gifts.sql', 'gifts'],
  chair: ['20261002030000_treasure_vault_oozeform_chair.sql', 'oozeform'],
  physical: ['20261002040000_treasure_vault_physical_headers.sql', 'patches'],
  repository: ['20261002050000_treasure_vault_repository_selections.sql', 'repository'],
  advancements: ['20261002060000_animal_companion_full_increases.sql', 'advancements'],
  bastion: ['20261002070000_treasure_vault_immortal_bastion_prose.sql', 'bastion'],
  traitDefinitions: ['20261002080000_treasure_vault_equipment_trait_definitions.sql', 'traits'],
  thirdEye: ['20261002090000_treasure_vault_third_eye_apex.sql', 'third_eye'],
  scalar: ['20261002095000_treasure_vault_scalar_mechanics.sql', 'scalar095'],
  itemOperations: ['20261002096000_treasure_vault_item_operations.sql', 'operations096'],
  artifactAccess: ['20261002097000_treasure_vault_artifact_access.sql', 'artifact097'],
  legacyGrips: ['20261002098000_treasure_vault_legacy_grips.sql', 'grips098'],
  embeddedDisplay: ['20261002099000_treasure_vault_embedded_display_links.sql', 'display099'],
  equipment: ['20261001230000_treasure_vault_missing_equipment.sql', 'equipment'],
};
const q = value => "'" + String(value).replaceAll("'", "''") + "'";
const j = value => q(JSON.stringify(value)) + '::jsonb';
const allowedTables = new Set(['item','trait','ability_block','ancestry','background','creature','class','class_archetype','spell','archetype','language','versatile_heritage','content_source','content_update']);
const key = row => `${row.table}:${row.id}`;
const templateKey = row => `${row.table}:${row.uuid}`;
const get = (row, path) => path.reduce((value, name) => value[name], row);
const set = (row, path, value) => { const target = path.slice(0, -1).reduce((value, name) => value[name], row); target[path.at(-1)] = value; };
const normal = row => { const out = structuredClone(row); delete out.updated_at; delete out.search_tsv; out.uuid = String(out.uuid); return out; };
const TABLES = allowedTables;

/** Pure fresh malformed-result inventory; the actual phase reader executes each edge. */
export function nativeStrictReleaseEdges() { return [
  {name:'strict-null',check:"select 'a'::text id,null::boolean passed",ids:['a']},
  {name:'strict-empty',check:"select 'a'::text id,true passed where false",ids:['a']},
  {name:'strict-false',check:"select 'a'::text id,false passed",ids:['a']},
  {name:'strict-duplicate',check:"select 'a'::text id,true passed union all select 'a',true",ids:['a']},
  {name:'strict-wrong-id',check:"select 'b'::text id,true passed",ids:['a']},
  {name:'strict-empty-id',check:"select ''::text id,true passed",ids:null},
  {name:'strict-whitespace-id',check:"select ' \t '::text id,true passed",ids:null},
]; }

/** Extract original literals already verified by the default loader, never wrapper literals or private proposals. */
export function originalNativeBatches(inputs) {
  assert.equal(inputs.input_provenance.mode, 'checked-in-default');
  assert.equal(inputs.originalHistorical.length, 39);
  const batches = {};
  for (const [name, [path, tag]] of Object.entries(definitions)) {
    const original = inputs.originalHistorical.find(row => row.path === path);
    assert.ok(original, `Mandatory reviewed original ${path}`);
    const parts = original.sql.split('$' + tag + '$');
    assert.equal(parts.length, 3);
    batches[name] = { ...original, spec: JSON.parse(parts[1]), check: original.check };
  }
  return batches;
}

/** The owner fixture must prove userId is a real GoTrue signup; this module never fabricates Auth. */
export function createNativeNegativeGroups({ inputs, userId, reserveProposalId, reserveContentId, readState, queryJson }) {
  assert.match(userId, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  assert.notEqual(userId, '00000000-0000-0000-0000-000000000001');
  assert.equal(typeof reserveProposalId, 'function');
  assert.equal(typeof reserveContentId, 'function');
  assert.equal(typeof readState, 'function');
  assert.equal(typeof queryJson, 'function');
  const query = queryJson;
  const batches = originalNativeBatches(inputs);
  const { seeds, gifts, chair, physical, repository, advancements, bastion, traitDefinitions, thirdEye, scalar, itemOperations, artifactAccess, legacyGrips, embeddedDisplay, equipment } = batches;
  const sequence = [seeds,gifts,chair,physical,repository,advancements,bastion,traitDefinitions,thirdEye,scalar,itemOperations,artifactAccess,legacyGrips,embeddedDisplay];
  /** Remove captured RESTRICT/required SET NULL links so the original dependency guard is exercised. */
  function missingDependencySetup(table, id) {
    assert.ok(allowedTables.has(table));
    assert.ok(Number.isSafeInteger(id) && id > 0);
    const statements = [];
    if (table === 'trait') {
      const captured = readState();
      for (const linkedTable of ['ancestry', 'archetype', 'versatile_heritage']) {
        assert.ok(Array.isArray(captured[linkedTable]), `Missing captured ${linkedTable} link domain`);
        const linkedIds = captured[linkedTable].filter(row => row.trait_id === id).map(row => row.id);
        assert.ok(linkedIds.every(linkedId => Number.isSafeInteger(linkedId) && linkedId > 0));
        assert.equal(new Set(linkedIds).size, linkedIds.length);
        for (const linkedId of linkedIds.sort((a, b) => a - b))
          statements.push(`delete from public.${linkedTable} where id=${linkedId};`);
      }
    }
    statements.push(`delete from public.${table} where id=${id};`);
    return statements.join('');
  }
  function collector(label) {
    const cases = [], requests = new Map(), contentRequests = new Map();
    let pendingIndex = 0, contentIndex = 0;
    function contentId(table) {
      assert.ok(['item', 'creature'].includes(table), 'Only actual setup content sequences');
      const token = '{{native_content_id:' + (++contentIndex) + '}}';
      contentRequests.set(token, {table});
      return token;
    }
    function pending(type, ref, data = {}, status = { state: 'PENDING' }, source = 16, explicitId = null) {
      assert.match(type, /^[a-z-]+$/); assert.ok(Number.isSafeInteger(source) && source > 0);
      if (ref != null) assert.ok(Number.isSafeInteger(ref) && ref > 0);
      if (explicitId != null) assert.ok(Number.isSafeInteger(explicitId) && explicitId > 0);
      const token = '{{native_pending:' + (++pendingIndex) + '}}';
      requests.set(token, { type, ref, data: structuredClone(data), status: structuredClone(status), source, explicitId });
      return token;
    }
    function negative(name, batch, setup, match, includeRelease = true) {
      assert.equal(typeof setup, 'string');
      assert.ok(match instanceof RegExp);
      // These original bodies allocate identity values before a late rejection.
      // All other recipes reject before an allocation path or update rows only.
      const consumption = new Map([
        ['seed-existing-item-trigger-drift', {item: 1}],
        ['seed-source-trigger-drift', {item: seeds.spec.items.length}],
        ['seed-migration-only-late-pending-insert', {item: seeds.spec.items.length}],
        ...['earlier-owner','dependency','source','prerequisite','queue','matching-pending']
          .map(route => ['completion100-late-' + route, {item: inputs.completion.spec.inserts.length}]),
      ]);
      const expectedNextvalCalls = consumption.get(name) ?? {};
      const recipe = {
        name, phase: label, batch, expectedSqlState: 'P0001', match, includeRelease, assertions: [],
        prepare() {
          let statement = setup;
          const reservations = [];
          for (const [token, request] of contentRequests) if (statement.includes(token)) {
            const id = reserveContentId(request.table);
            assert.ok(Number.isSafeInteger(id) && id > 0, 'Real content sequence allocation, reserved before rollback baseline');
            reservations.push({kind: 'content', table: request.table, id});
            statement = statement.replaceAll(token, String(id));
          }
          for (const [token, request] of requests) if (statement.includes(token)) {
            const id = request.explicitId ?? reserveProposalId();
            assert.ok(Number.isSafeInteger(id) && id > 0, 'Real proposal sequence allocation, reserved before rollback baseline');
            reservations.push({kind: request.explicitId == null ? 'proposal' : 'known-proposal-identity', table: 'content_update', id});
            const insert = 'insert into public.content_update(id,user_id,type,ref_id,content_source_id,action,data,upvotes,downvotes,status) values(' +
              id + ',' + q(userId) + ',' + q(request.type) + ',' + (request.ref ?? 'null') + ',' + request.source +
              ",'UPDATE'," + j(request.data) + "::json,'{}','{}'," + j(request.status) + '::json);';
            statement = statement.replaceAll(token, insert);
          }
          assert.doesNotMatch(statement, /\{\{native_(?:pending|content_id):/);
          return { setup: statement, batch, expectedSqlState: recipe.expectedSqlState, match, includeRelease, assertions: recipe.assertions,
            reservations, sequence_expectation: {expected_nextval_calls: {...expectedNextvalCalls}, all_other_sequences_unchanged: true,
              basis: 'Exact extracted original batch INSERT path; caller must verify actual sequence consumption, not reset counters.'} };
        },
      };
      assert.ok(!cases.some(row => row.name === name), 'No duplicate control name ' + name);
      cases.push(recipe);
      return recipe;
    }
    function attachLastAssertion(assertion) {
      assert.ok(cases.length); assert.equal(typeof assertion, 'function'); cases.at(-1).assertions.push(assertion);
    }
    const trigger = (table, event, body) => {
      assert.ok(allowedTables.has(table)); assert.ok(['insert','update','delete'].includes(event));
      return 'create function proof.interfere() returns trigger language plpgsql as $f$ begin ' + body +
        ' return new; end $f$;create trigger zz_proof_interfere after ' + event + ' on public.' + table +
        ' for each row execute function proof.interfere();';
    };
    return { cases, pending, contentId, negative, trigger, attachLastAssertion };
  }
  function unrelatedSpell() {
    const excluded = new Set(inputs.contract.expected_entries.filter(row => row.table === 'spell').map(row => row.id));
    const actual = readState().spell.find(row => !excluded.has(row.id));
    assert.ok(actual && Number.isSafeInteger(actual.id) && actual.id > 0);
    return actual;
  }
  function beforeOriginal(path) {
    const active = sequence.find(row => row.path === path); assert.ok(active, 'Only explicit14 predecessor phases');
    const plan = collector('before:' + path);
    const { negative, pending, contentId, trigger } = plan;
    const unrelatedSpell = (() => {
      const excluded = new Set(inputs.contract.expected_entries.filter(row => row.table === 'spell').map(row => row.id));
      const row = readState().spell.find(row => !excluded.has(row.id));
      assert.ok(row && Number.isSafeInteger(row.id) && row.id > 0); return row;
    })();

    if (active === seeds) {
  negative(
    "seed-missing-dependency",
    seeds,
    "delete from public.ability_block where id=29695;",
    /dependency drift/,
  );
  negative(
    "seed-source-unpublished",
    seeds,
    "update public.content_source set is_published=false where id=16;",
    /source drift/,
  );
  negative(
    "seed-actual-count-drift",
    seeds,
    "delete from public.item where id=11880;",
    /baseline count drift/,
  );
  negative(
    "seed-cache-count-drift",
    seeds,
    "update public.content_source set meta_data=jsonb_set(meta_data::jsonb,'{counts,item}','1112')::json where id=16;",
    /baseline count drift/,
  );
  negative(
    "seed-cache-trait-count-drift",
    seeds,
    "update public.content_source set meta_data=jsonb_set(meta_data::jsonb,'{counts,trait}','44')::json where id=16;",
    /baseline count drift/,
  );
  negative(
    "seed-actual-trait-cardinality-drift",
    seeds,
    "delete from public.trait where id=2872;",
    /actual trait count drift/,
  );
  negative(
    "seed-actual-creature-cardinality-drift",
    seeds,
    "delete from public.creature where content_source_id=16;",
    /baseline count drift/,
    false,
  );
  negative(
    "seed-pending-name",
    seeds,
    pending("item", null, { name: "Fortune's Favor", content_source_id: 16 }),
    /pending content/,
  );
  negative(
    "seed-pending-case-insensitive-citation",
    seeds,
    pending("item", null, {
      name: "Unrelated alias",
      meta_data: {
        source: { url: "https://2e.aonprd.com/EQUIPMENT.ASPX?ID=4935" },
      },
    }),
    /pending content/,
  );
  negative(
    "seed-pending-unknown-state",
    seeds,
    pending("trait", 3460, {}, {}),
    /pending content/,
  );
  const seedRow = seeds.spec.items[0].row,
    seedInsert = `insert into public.item(id,name,bulk,level,rarity,description,"group",hands,size,craft_requirements,usage,meta_data,operations,content_source_id,version,uuid,price,traits,availability)select ${contentId('item')},r.name,r.bulk,r.level,r.rarity,r.description,r."group",r.hands,r.size,r.craft_requirements,r.usage,r.meta_data,array(select value::json from jsonb_array_elements(${j(seedRow.operations)})),r.content_source_id,r.version,r.uuid,r.price,r.traits,r.availability from jsonb_populate_record(null::public.item,${j(seedRow)})r;`;
  negative("seed-partial-import", seeds, seedInsert, /incomplete import/);
  negative(
    "seed-existing-item-trigger-drift",
    seeds,
    trigger(
      "item",
      "insert",
      "if new.uuid=944653220160268 then update public.item set name=name||' changed' where id=11880; end if;",
    ),
    /baseline changed/,
  );
  negative(
    "seed-source-trigger-drift",
    seeds,
    trigger(
      "item",
      "insert",
      "if new.uuid=944653220160268 then update public.content_source set description=description||' changed' where id=16; end if;",
    ),
    /count CAS failed|source baseline changed/,
  );
  negative(
    "seed-migration-only-late-pending-insert",
    seeds,
    trigger(
      "item",
      "insert",
      `if new.uuid=8797079847352829 then ${pending("item", null, { name: "Fortune's Favor", content_source_id: 16 })} end if;`,
    ),
    /final curator guard changed/,
    false,
  );
    }
    if (active === gifts) {
  for (const [name, setup] of [
    [
      "gift-frequency-drift",
      "update public.ability_block set frequency='once per day' where id=29513;",
    ],
    [
      "gift-null-metadata",
      "update public.ability_block set meta_data=null where id=29806;",
    ],
    [
      "gift-body-drift",
      "update public.ability_block set description=description||' changed' where id=29688;",
    ],
    [
      "gift-hybrid-tuple",
      `update public.ability_block set traits=array(select jsonb_array_elements_text(${j(gifts.spec.blocks[0].after.traits)})::bigint) where id=29513;`,
    ],
  ])
    negative(name, gifts, setup, /identity\/mechanics drift|complete tuple/);
  for (const [name, setup] of [
    ["gift-pending-ref", pending("ability-block", 29513)],
    [
      "gift-pending-uuid",
      pending("ability-block", null, {
        uuid: gifts.spec.blocks[2].expected.uuid,
      }),
    ],
    [
      "gift-pending-name",
      pending("ability-block", null, {
        name: "Sands of the Hourglass",
        content_source_id: 16,
      }),
    ],
    ["gift-pending-dependency", pending("trait", 3460, {}, {})],
    ["gift-pending-source", pending("content-source", 16)],
  ])
    negative(name, gifts, setup, /pending content/);
  negative(
    "gift-earlier-owner-late-trigger-drift",
    gifts,
    trigger(
      "ability_block",
      "update",
      "if new.id=29806 then update public.ability_block set description=description||' changed' where id=29513; end if;",
    ),
    /final owner readback/,
  );
  negative(
    "gift-dependency-late-trigger-drift",
    gifts,
    trigger(
      "ability_block",
      "update",
      "if new.id=29806 then update public.trait set description=description||' changed' where id=3460; end if;",
    ),
    /final dependency baseline/,
  );
  negative(
    "gift-source-late-trigger-drift",
    gifts,
    trigger(
      "ability_block",
      "update",
      "if new.id=29806 then update public.content_source set description=description||' changed' where id=16; end if;",
    ),
    /final source baseline/,
  );
  negative(
    "gift-same-transaction-pending-insert",
    gifts,
    trigger(
      "ability_block",
      "update",
      `if new.id=29806 then ${pending("ability-block", 29513)} end if;`,
    ),
    /final curator guard changed/,
    true,
  );
  negative(
    "gift-migration-only-late-pending-insert",
    gifts,
    trigger(
      "ability_block",
      "update",
      `if new.id=29806 then ${pending("ability-block", 29513)} end if;`,
    ),
    /final curator guard changed/,
    false,
  );
    }
    if (active === physical) {
  const p = physical.spec.find((p) => p.id === 11926);
  for (const [name, setup] of [
    ["physical-null-bulk", "update public.item set bulk=null where id=11926;"],
    [
      "physical-hybrid",
      `update public.item set bulk=${q(p.after.bulk)} where id=11926;`,
    ],
    [
      "physical-description-drift",
      "update public.item set description=description||' changed' where id=11880;",
    ],
    ["physical-stat-drift", "update public.item set level=99 where id=11880;"],
    [
      "physical-metadata-drift",
      "update public.item set meta_data=jsonb_set(meta_data,'{unselectable}','true') where id=11880;",
    ],
    [
      "physical-created-at-drift",
      "update public.item set created_at=created_at+interval '1 second' where id=11880;",
    ],
    [
      "physical-source-unpublished",
      "update public.content_source set is_published=false where id=16;",
    ],
  ])
    negative(
      name,
      physical,
      setup,
      /reviewed physical-header|Unreviewed physical-header|official header source/,
    );
  for (const [name, setup] of [
    ["physical-pending-ref", pending("item", 11880)],
    [
      "physical-pending-uuid",
      pending("item", null, { uuid: String(physical.spec[0].anchor.uuid) }),
    ],
    [
      "physical-pending-name",
      pending("item", null, {
        name: physical.spec[0].anchor.name,
        content_source_id: 16,
      }),
    ],
    ["physical-pending-unknown-state", pending("item", 11880, {}, {})],
  ])
    negative(name, physical, setup, /unresolved curator/);
  negative(
    "physical-earlier-owner-late-trigger-drift",
    physical,
    trigger(
      "item",
      "update",
      "if new.id=12534 then update public.item set description=description||' changed' where id=11880; end if;",
    ),
    /terminal preservation/,
  );
  negative(
    "physical-same-transaction-pending-insert",
    physical,
    trigger(
      "item",
      "update",
      `if new.id=12534 then ${pending("item", 11880)} end if;`,
    ),
    /curator guard changed/,
  );
  negative(
    "physical-migration-only-late-pending-insert",
    physical,
    trigger(
      "item",
      "update",
      `if new.id=12534 then ${pending("item", 11880)} end if;`,
    ),
    /curator guard changed/,
    false,
  );
  negative(
    "physical-header-trait-missing",
    physical,
    "delete from public.trait where id=1459;",
    /Missing header trait dependency/,
  );
  negative(
    "physical-header-trait-identity-drift",
    physical,
    "update public.trait set name='Changed Arcane' where id=1459;",
    /Changed header trait identity/,
  );
  negative(
    "physical-header-trait-pending",
    physical,
    pending("trait", 1459, {}, {}),
    /unresolved curator/,
  );
  negative(
    "physical-header-source3-pending",
    physical,
    pending("content-source", 3, {}, {}),
    /unresolved curator/,
  );
  negative(
    "physical-header-trait-late-drift",
    physical,
    trigger(
      "item",
      "update",
      "if new.id=12535 then update public.trait set description=description||' changed' where id=1459; end if;",
    ),
    /Header trait dependency changed/,
  );
  negative(
    "physical-header-source3-late-drift",
    physical,
    trigger(
      "item",
      "update",
      "if new.id=12535 then update public.content_source set description=description||' changed' where id=3; end if;",
    ),
    /source.*changed|source preservation/i,
  );
    }
  for (const batch of sequence) {
    if (batch !== active) continue;
    if (batch === repository || batch === advancements) {
      const tag = batch.release.replace(/\.sql$/, ""),
        last = batch.spec.blocks.at(-1),
        source = batch.spec.sources[0];
      for (const owner of batch.spec.blocks) {
        for (const [suffix, setup] of [
          ["missing", `delete from public.ability_block where id=${owner.id};`],
          [
            "identity",
            `update public.ability_block set uuid=uuid+1 where id=${owner.id};`,
          ],
          [
            "prose",
            `update public.ability_block set description=description||' changed' where id=${owner.id};`,
          ],
          [
            "metadata",
            `update public.ability_block set meta_data=jsonb_set(coalesce(meta_data,'{}'),'{unknown}','true') where id=${owner.id};`,
          ],
          [
            "partial-graph",
            `update public.ability_block set operations='{}'::json[] where id=${owner.id};`,
          ],
          [
            "unknown-graph",
            `update public.ability_block set operations=operations||array['{"id":"unknown","type":"adjValue","data":{"variable":"ATTRIBUTE_WIS","value":{"value":2}}}'::json] where id=${owner.id};`,
          ],
        ])
          negative(
            `${tag}-${owner.id}-${suffix}`,
            batch,
            setup,
            /owner|operation/i,
          );
        for (const [suffix, setup] of [
          [
            "ref",
            pending(
              "ability-block",
              owner.id,
              {},
              {},
              Number(owner.anchor.content_source_id),
            ),
          ],
          [
            "data-id",
            pending(
              "ability-block",
              null,
              { id: owner.id },
              {},
              Number(owner.anchor.content_source_id),
            ),
          ],
          [
            "uuid",
            pending(
              "ability-block",
              null,
              { uuid: owner.anchor.uuid },
              {},
              Number(owner.anchor.content_source_id),
            ),
          ],
          [
            "name",
            pending(
              "ability-block",
              null,
              {
                name: owner.anchor.name,
                content_source_id: owner.anchor.content_source_id,
              },
              {},
              Number(owner.anchor.content_source_id),
            ),
          ],
          [
            "normalized-name",
            pending(
              "ability-block",
              null,
              {
                name: "  " + owner.anchor.name.toUpperCase() + "  ",
                content_source_id: owner.anchor.content_source_id,
              },
              {},
              Number(owner.anchor.content_source_id),
            ),
          ],
        ])
          negative(
            `${tag}-${owner.id}-pending-${suffix}`,
            batch,
            setup,
            /pending/i,
          );
      }
      negative(
        tag + "-source-drift",
        batch,
        `update public.content_source set is_published=false where id=${source.id};`,
        /source drift/i,
      );
      negative(
        tag + "-pending-source",
        batch,
        pending("content-source", source.id, {}, {}, source.id),
        /pending/i,
      );
      negative(
        tag + "-pending-normalized-source-name",
        batch,
        pending(
          "content-source",
          null,
          { name: "  " + source.name.toUpperCase() + "  " },
          {},
          source.id,
        ),
        /pending/i,
      );
      negative(
        tag + "-late-earlier-owner",
        batch,
        trigger(
          "ability_block",
          "update",
          `if new.id=${last.id} and pg_trigger_depth()=1 then update public.ability_block set description=description||' changed' where id=${batch.spec.blocks[0].id};end if;`,
        ),
        /readback|baseline|CAS/i,
      );
      negative(
        tag + "-late-source",
        batch,
        trigger(
          "ability_block",
          "update",
          `if new.id=${last.id} then update public.content_source set description=description||' changed' where id=${source.id};end if;`,
        ),
        /source baseline/i,
      );
      negative(
        tag + "-migration-only-late-pending",
        batch,
        trigger(
          "ability_block",
          "update",
          `if new.id=${last.id} then ${pending("ability-block", batch.spec.blocks[0].id, {}, {}, Number(source.id))}end if;`,
        ),
        /final pending/i,
        false,
      );
    }
    if (batch === bastion || batch === traitDefinitions) {
      const owners = batch === bastion ? [batch.spec] : batch.spec.blocks,
        table = batch === bastion ? "item" : "trait",
        type = table,
        tag = batch.release.replace(/\.sql$/, ""),
        last = owners.at(-1),
        source = batch.spec.sources[0];
      for (const owner of owners) {
        for (const [suffix, setup] of [
          ["missing", `delete from public.${table} where id=${owner.id};`],
          [
            "identity",
            `update public.${table} set uuid=uuid+1 where id=${owner.id};`,
          ],
          [
            "prose",
            `update public.${table} set description=description||' changed' where id=${owner.id};`,
          ],
          [
            "metadata",
            `update public.${table} set meta_data=jsonb_set(coalesce(meta_data::jsonb,'{}'),'{unknown}','true') where id=${owner.id};`,
          ],
        ])
          negative(
            `${tag}-${owner.id}-${suffix}`,
            batch,
            setup,
            /anchor|description|tuple/i,
          );
        for (const [suffix, setup] of [
          ["ref", pending(type, owner.id, {}, {})],
          ["data-id", pending(type, null, { id: owner.id }, {})],
          ["uuid", pending(type, null, { uuid: owner.anchor.uuid }, {})],
          [
            "normalized-name",
            pending(
              type,
              null,
              {
                name: "  " + owner.anchor.name.toUpperCase() + "  ",
                content_source_id: 16,
              },
              {},
            ),
          ],
        ])
          negative(
            `${tag}-${owner.id}-pending-${suffix}`,
            batch,
            setup,
            /pending/i,
          );
      }
      for (const dep of batch.spec.dependencies) {
        negative(
          `${tag}-missing-dependency-${dep.table}-${dep.id}`,
          batch,
          `delete from public.${dep.table} where id=${dep.id};`,
          /dependency changed/i,
        );
        negative(
          `${tag}-changed-dependency-${dep.table}-${dep.id}`,
          batch,
          `update public.${dep.table} set name=name||' changed' where id=${dep.id};`,
          /dependency changed/i,
        );
        negative(
          `${tag}-pending-dependency-${dep.table}-${dep.id}`,
          batch,
          pending(
            dep.table.replaceAll("_", "-"),
            dep.id,
            {},
            {},
            dep.content_source_id,
          ),
          /pending/i,
        );
      }
      negative(
        tag + "-source-drift",
        batch,
        `update public.content_source set is_published=false where id=${source.id};`,
        /sources changed/i,
      );
      negative(
        tag + "-pending-source",
        batch,
        pending("content-source", source.id, {}, {}, source.id),
        /pending/i,
      );
      negative(
        tag + "-late-earlier-owner",
        batch,
        trigger(
          table,
          "update",
          `if new.id=${last.id} and pg_trigger_depth()=1 then update public.${table} set description=description||' changed' where id=${owners[0].id};end if;`,
        ),
        /final owner|CAS/i,
      );
      const dep = batch.spec.dependencies[0];
      negative(
        tag + "-late-dependency",
        batch,
        trigger(
          table,
          "update",
          `if new.id=${last.id} and pg_trigger_depth()=1 then update public.${dep.table} set description=description||' changed' where id=${dep.id};end if;`,
        ),
        /final dependency/i,
      );
      negative(
        tag + "-late-source",
        batch,
        trigger(
          table,
          "update",
          `if new.id=${last.id} then update public.content_source set description=description||' changed' where id=${source.id};end if;`,
        ),
        /final source/i,
      );
      negative(
        tag + "-migration-only-late-pending",
        batch,
        trigger(
          table,
          "update",
          `if new.id=${last.id} then ${pending(type, owners[0].id, {}, {})}end if;`,
        ),
        /final curator/i,
        false,
      );
    }
    if (batch === thirdEye) {
      const owner = thirdEye.spec.items[0];
      for (const [name, setup] of [
        ["owner-missing", `delete from public.item where id=${owner.id};`],
        [
          "identity-name",
          `update public.item set name=name||' changed' where id=${owner.id};`,
        ],
        [
          "identity-uuid",
          `update public.item set uuid=uuid+1 where id=${owner.id};`,
        ],
        [
          "prose-drift",
          `update public.item set description=description||' changed' where id=${owner.id};`,
        ],
        [
          "metadata-drift",
          `update public.item set meta_data=jsonb_set(meta_data,'{unselectable}','true') where id=${owner.id};`,
        ],
        [
          "unknown-operation",
          `update public.item set operations=operations||array['{"id":"unknown","type":"adjValue","data":{"variable":"ATTRIBUTE_WIS","value":{"value":2}}}'::json] where id=${owner.id};`,
        ],
        [
          "partial-operation",
          `update public.item set operations=array[operations[1]] where id=${owner.id};`,
        ],
        [
          "source-drift",
          "update public.content_source set is_published=false where id=1;",
        ],
      ])
        negative(
          "third-eye-" + name,
          thirdEye,
          setup,
          /owner|source|operation/i,
        );
      for (const [name, setup] of [
        ["ref", pending("item", owner.id)],
        ["data-id", pending("item", null, { id: owner.id })],
        ["uuid", pending("item", null, { uuid: owner.anchor.uuid })],
        [
          "normalized-name",
          pending("item", null, {
            name: "  " + owner.anchor.name.toUpperCase() + "  ",
            content_source_id: 16,
          }),
        ],
        ["unknown-state", pending("item", owner.id, {}, {})],
        ["source", pending("content-source", 1)],
      ])
        negative("third-eye-pending-" + name, thirdEye, setup, /pending/i);
      negative(
        "third-eye-late-owner-drift",
        thirdEye,
        trigger(
          "item",
          "update",
          `if new.id=${owner.id} and pg_trigger_depth()=1 then update public.item set description=description||' changed' where id=${owner.id};end if;`,
        ),
        /readback|baseline|CAS/i,
      );
      negative(
        "third-eye-late-source-drift",
        thirdEye,
        trigger(
          "item",
          "update",
          `if new.id=${owner.id} then update public.content_source set description=description||' changed' where id=1;end if;`,
        ),
        /source baseline/i,
      );
      negative(
        "third-eye-migration-only-late-pending",
        thirdEye,
        trigger(
          "item",
          "update",
          `if new.id=${owner.id} then ${pending("item", owner.id)} end if;`,
        ),
        /final pending/i,
        false,
      );
    }
    if (batch === scalar) {
      const owner = scalar.spec.patches[0],
        trait = scalar.spec.dependencies[0];
      for (const [name, setup] of [
        ["owner-missing", `delete from public.item where id=${owner.id};`],
        [
          "name-drift",
          `update public.item set name=name||' changed' where id=${owner.id};`,
        ],
        [
          "uuid-drift",
          `update public.item set uuid=uuid+1 where id=${owner.id};`,
        ],
        [
          "source-owner-drift",
          `update public.item set content_source_id=3 where id=${owner.id};`,
        ],
        [
          "prose-drift",
          `update public.item set description=description||' changed' where id=${owner.id};`,
        ],
        [
          "trait-owner-drift",
          `update public.item set traits=traits||array[1459::bigint] where id=${owner.id};`,
        ],
        [
          "foundry-metadata-drift",
          `update public.item set meta_data=jsonb_set(meta_data,'{foundry,bonus}','99') where id=${owner.id};`,
        ],
        [
          "hybrid-terminal-owner",
          `update public.item set bulk=${q(owner.after)},price='{"gp":11}' where id=${owner.id};`,
        ],
        ["trait-missing", `delete from public.trait where id=${trait.id};`],
        [
          "trait-identity-drift",
          `update public.trait set name=name||' changed' where id=${trait.id};`,
        ],
        [
          "source-unpublished",
          "update public.content_source set is_published=false where id=16;",
        ],
      ])
        negative(
          "scalar-" + name,
          scalar,
          setup,
          /owner changed|dependency changed|sources changed/i,
        );
      for (const [name, setup] of [
        ["ref", pending("item", owner.id)],
        ["data-id", pending("item", null, { id: owner.id })],
        ["uuid", pending("item", null, { uuid: owner.anchor.uuid })],
        [
          "normalized-name",
          pending("item", null, {
            name: "  " + owner.name.toUpperCase() + "  ",
            content_source_id: 16,
          }),
        ],
        [
          "citation",
          pending("item", null, {
            meta_data: { source: { url: owner.primary.url } },
          }),
        ],
        ["unknown-state", pending("item", owner.id, {}, {})],
        ["trait", pending("trait", trait.id, {}, {}, trait.content_source_id)],
        ["source", pending("content-source", 3)],
      ])
        negative("scalar-pending-" + name, scalar, setup, /pending curator/i);
      negative(
        "scalar-late-earlier-owner-drift",
        scalar,
        trigger(
          "item",
          "update",
          `if new.id=12703 then update public.item set description=description||' changed' where id=${owner.id};end if;`,
        ),
        /final owner drift/i,
      );
      negative(
        "scalar-late-trait-drift",
        scalar,
        trigger(
          "item",
          "update",
          `if new.id=12703 then update public.trait set description=description||' changed' where id=${trait.id};end if;`,
        ),
        /final dependency drift/i,
      );
      negative(
        "scalar-late-source-drift",
        scalar,
        trigger(
          "item",
          "update",
          "if new.id=12703 then update public.content_source set description=description||' changed' where id=3;end if;",
        ),
        /final source drift/i,
      );
      negative(
        "scalar-migration-only-late-pending",
        scalar,
        trigger(
          "item",
          "update",
          `if new.id=12703 then ${pending("item", owner.id)} end if;`,
        ),
        /final curator drift/i,
        false,
      );
    }
    if (batch === itemOperations) {
      for (const owner of itemOperations.spec.patches) {
        const wrong = structuredClone(owner.final.operations);
        wrong.at(-1).data.variable = "UNREVIEWED_VARIABLE";
        const wrongType = structuredClone(owner.final.operations);
        wrongType.at(-1).type = "setValue";
        const wrongValue = structuredClone(owner.final.operations);
        wrongValue.at(-1).data.value = 99;
        const wrongId = structuredClone(owner.final.operations);
        wrongId.at(-1).id = "unreviewed-operation-id";
        const opsSql = (operations) =>
          `array(select value::json from jsonb_array_elements(${j(operations)}))`;
        for (const [name, setup] of [
          ["missing", `delete from public.item where id=${owner.id};`],
          [
            "sibling-prose",
            `update public.item set description=description||' changed' where id=${owner.id};`,
          ],
          [
            "sibling-metadata",
            `update public.item set meta_data=jsonb_set(meta_data,'{unselectable}','true') where id=${owner.id};`,
          ],
          [
            "hybrid",
            `update public.item set operations=${opsSql(owner.final.operations.slice(1))} where id=${owner.id};`,
          ],
          [
            "wrong-variable",
            `update public.item set operations=${opsSql(wrong)} where id=${owner.id};`,
          ],
          [
            "wrong-type",
            `update public.item set operations=${opsSql(wrongType)} where id=${owner.id};`,
          ],
          [
            "wrong-value",
            `update public.item set operations=${opsSql(wrongValue)} where id=${owner.id};`,
          ],
          [
            "wrong-id",
            `update public.item set operations=${opsSql(wrongId)} where id=${owner.id};`,
          ],
          ["pending-ref", pending("item", owner.id)],
          ["pending-data-id", pending("item", null, { id: owner.id })],
          ["pending-uuid", pending("item", null, { uuid: owner.anchor.uuid })],
          [
            "pending-normalized-name",
            pending("item", null, {
              name: "  " + owner.name.toUpperCase() + "  ",
              content_source_id: 16,
            }),
          ],
        ])
          negative(
            `item-operations-${owner.id}-${name}`,
            itemOperations,
            setup,
            /owner changed|pending curator/i,
          );
      }
      for (const dependency of itemOperations.spec.dependencies) {
        for (const [name, setup] of [
          ["missing", `delete from public.trait where id=${dependency.id};`],
          [
            "full-drift",
            `update public.trait set description=description||' changed' where id=${dependency.id};`,
          ],
          [
            "pending-normalized-name",
            pending(
              "trait",
              null,
              {
                name: "  " + dependency.name.toUpperCase() + "  ",
                content_source_id: dependency.anchor.content_source_id,
              },
              {},
              dependency.anchor.content_source_id,
            ),
          ],
        ])
          negative(
            `item-operations-dependency-${dependency.id}-${name}`,
            itemOperations,
            setup,
            /dependency changed|pending curator/i,
          );
      }
      const first = itemOperations.spec.patches[0],
        last = itemOperations.spec.patches.at(-1),
        trait = itemOperations.spec.dependencies[0];
      for (const source of itemOperations.spec.sources) {
        negative(
          `item-operations-source-${source.id}-drift`,
          itemOperations,
          `update public.content_source set is_published=false where id=${source.id};`,
          /sources changed/i,
        );
        negative(
          `item-operations-source-${source.id}-pending-normalized-name`,
          itemOperations,
          pending("content-source", null, {
            name: "  " + source.name.toUpperCase() + "  ",
          }),
          /pending curator/i,
        );
      }
      negative(
        "item-operations-late-current-owner",
        itemOperations,
        trigger(
          "item",
          "update",
          `if new.id=${first.id} and pg_trigger_depth()=1 then update public.item set description=description||' changed' where id=${first.id};end if;`,
        ),
        /post-trigger owner drift/i,
      );
      negative(
        "item-operations-late-earlier-owner",
        itemOperations,
        trigger(
          "item",
          "update",
          `if new.id=${last.id} then update public.item set description=description||' changed' where id=${first.id};end if;`,
        ),
        /final owner drift/i,
      );
      negative(
        "item-operations-late-dependency",
        itemOperations,
        trigger(
          "item",
          "update",
          `if new.id=${last.id} then update public.trait set description=description||' changed' where id=${trait.id};end if;`,
        ),
        /final dependency drift/i,
      );
      negative(
        "item-operations-late-source",
        itemOperations,
        trigger(
          "item",
          "update",
          `if new.id=${last.id} then update public.content_source set description=description||' changed' where id=3;end if;`,
        ),
        /final source drift/i,
      );
      negative(
        "item-operations-migration-only-late-pending",
        itemOperations,
        trigger(
          "item",
          "update",
          `if new.id=${last.id} then ${pending("item", first.id)}end if;`,
        ),
        /final curator drift/i,
        false,
      );
    }
    if (batch === embeddedDisplay) {
      const terminalSql = (owner) =>
        `update public.item set ${owner.changed_columns.map((column) => `${column}=${column === "operations" ? `array(select value::json from jsonb_array_elements(${j(owner.final.operations)}))` : `${j(owner.final[column])}::jsonb`}`).join(",")} where id=${owner.id};`;
      for (let mask = 1; mask < 15; mask++)
        negative(
          `embedded-display-partial-owner-mask-${mask}`,
          embeddedDisplay,
          embeddedDisplay.spec.patches
            .filter((_, index) => mask & (1 << index))
            .map(terminalSql)
            .join("\n"),
          /mixed atomic owner domain/i,
        );
      for (const owner of embeddedDisplay.spec.patches) {
        const controls = [
          ["missing", `delete from public.item where id=${owner.id};`],
          [
            "identity",
            `update public.item set uuid=uuid+1 where id=${owner.id};`,
          ],
          [
            "sibling-prose",
            `update public.item set description=description||' changed' where id=${owner.id};`,
          ],
          [
            "sibling-metadata",
            `update public.item set meta_data=jsonb_set(meta_data::jsonb,'{unreviewed}','true') where id=${owner.id};`,
          ],
          ["pending-ref", pending("item", owner.id)],
          ["pending-data-id", pending("item", null, { id: owner.id })],
          ["pending-uuid", pending("item", null, { uuid: owner.anchor.uuid })],
          [
            "pending-normalized-name",
            pending(
              "item",
              null,
              {
                name: "  " + owner.anchor.name.toUpperCase() + "  ",
                content_source_id: 16,
              },
              { state: "  pending  " },
            ),
          ],
          [
            "pending-unknown-state",
            pending("item", owner.id, {}, { state: "REVIEW" }),
          ],
          ["pending-missing-state", pending("item", owner.id, {}, {})],
          ...owner.url_aliases.map((url, index) => [
            `pending-primary-alias-${index}`,
            pending("item", null, { meta_data: { source: { url } } }),
          ]),
          ...owner.url_aliases.map((url, index) => [
            `pending-normalized-primary-alias-${index}`,
            pending("item", null, {
              meta_data: { source: { url: "  " + url.toUpperCase() + "  " } },
            }),
          ]),
        ];
        if (owner.changed_columns.includes("operations")) {
          const wrong = structuredClone(owner.anchor.operations);
          wrong[0].id = "unreviewed-operation-id";
          controls.push([
            "operation-id-drift",
            `update public.item set operations=array(select value::json from jsonb_array_elements(${j(wrong)})) where id=${owner.id};`,
          ]);
        }
        for (const [suffix, setup] of controls)
          negative(
            `embedded-display-${owner.id}-${suffix}`,
            embeddedDisplay,
            setup,
            /owner missing|unreviewed owner|pending content/i,
          );
      }
      for (const dependency of embeddedDisplay.spec.dependencies) {
        for (const [suffix, setup] of [
          [
            "missing",
            `delete from public.${dependency.table} where id=${dependency.id};`,
          ],
          [
            "full-drift",
            `update public.${dependency.table} set description=description||' changed' where id=${dependency.id};`,
          ],
          [
            "pending-ref",
            pending(dependency.table.replaceAll("_", "-"), dependency.id),
          ],
          [
            "pending-normalized-name",
            pending(
              dependency.table === "ability_block"
                ? dependency.anchor.type
                : dependency.table,
              null,
              {
                name: "  " + dependency.anchor.name.toUpperCase() + "  ",
                content_source_id: dependency.anchor.content_source_id,
              },
              {},
              dependency.anchor.content_source_id,
            ),
          ],
          ...(dependency.table === "ability_block"
            ? [
                [
                  "pending-action-alias",
                  pending(dependency.anchor.type, dependency.id),
                ],
              ]
            : []),
          ...dependency.url_aliases.map((url, index) => [
            `pending-primary-alias-${index}`,
            pending(dependency.table.replaceAll("_", "-"), null, {
              meta_data: { source: { url } },
            }),
          ]),
          ...dependency.url_aliases.map((url, index) => [
            `pending-normalized-primary-alias-${index}`,
            pending(dependency.table.replaceAll("_", "-"), null, {
              meta_data: { source: { url: "  " + url.toUpperCase() + "  " } },
            }),
          ]),
        ])
          negative(
            `embedded-display-dependency-${dependency.table}-${dependency.id}-${suffix}`,
            embeddedDisplay,
            setup,
            /dependency drift|pending content/i,
          );
      }
      for (const source of embeddedDisplay.spec.sources) {
        negative(
          `embedded-display-source-${source.id}-identity`,
          embeddedDisplay,
          `update public.content_source set is_published=false where id=${source.id};`,
          /source drift/i,
        );
        negative(
          `embedded-display-source-${source.id}-pending`,
          embeddedDisplay,
          pending("content-source", null, {
            name: "  " + source.name.toUpperCase() + "  ",
          }),
          /pending content/i,
        );
        if (source.url)
          for (const [route, data] of [
            ["url", { url: "  " + source.url.toUpperCase() + "  " }],
            [
              "metadata-url",
              {
                meta_data: {
                  source: { url: "  " + source.url.toUpperCase() + "  " },
                },
              },
            ],
          ])
            negative(
              `embedded-display-source-${source.id}-pending-normalized-${route}`,
              embeddedDisplay,
              pending("content-source", null, data),
              /pending content/i,
            );
      }
      for (const [key, wrong] of [
        ["item", 1118],
        ["trait", 25],
        ["creature", 1],
      ])
        negative(
          `embedded-display-source-count-${key}`,
          embeddedDisplay,
          `update public.content_source set meta_data=jsonb_set(meta_data::jsonb,'{counts,${key}}','${wrong}')::json where id=16;`,
          /source counts drift/i,
        );
      const first = embeddedDisplay.spec.patches[0],
        last = embeddedDisplay.spec.patches.at(-1),
        dependency = embeddedDisplay.spec.dependencies[0];
      for (const [suffix, body, expected] of [
        [
          "late-current-owner",
          `if new.id=${first.id} and pg_trigger_depth()=1 then update public.item set description=description||' changed' where id=${first.id};end if;`,
          /immediate readback drift/i,
        ],
        [
          "late-earlier-owner",
          `if new.id=${last.id} then update public.item set description=description||' changed' where id=${first.id};end if;`,
          /final owner readback drift/i,
        ],
        [
          "late-dependency",
          `if new.id=${last.id} then update public.${dependency.table} set description=description||' changed' where id=${dependency.id};end if;`,
          /final dependency drift/i,
        ],
        [
          "late-source",
          `if new.id=${last.id} then update public.content_source set description=description||' changed' where id=3;end if;`,
          /source baseline drift/i,
        ],
        [
          "migration-only-late-pending",
          `if new.id=${last.id} then ${pending("item", first.id)}end if;`,
          /queue preservation drift|final pending/i,
        ],
        [
          "migration-only-late-unrelated-queue",
          `if new.id=${last.id} then ${pending("spell", unrelatedSpell.id, {}, {}, unrelatedSpell.content_source_id)}end if;`,
          /queue preservation drift/i,
        ],
      ])
        negative(
          `embedded-display-${suffix}`,
          embeddedDisplay,
          trigger("item", "update", body),
          expected,
          !suffix.startsWith("migration-only"),
        );
    }
    if (batch === legacyGrips) {
      const terminalSql = (owner) =>
        `update public.item set hands=${q(owner.final.hands)},usage=${q(owner.final.usage)} where id=${owner.id};`;
      for (const owner of legacyGrips.spec.patches) {
        for (const [suffix, setup] of [
          ["missing", `delete from public.item where id=${owner.id};`],
          [
            "identity",
            `update public.item set uuid=uuid+1 where id=${owner.id};`,
          ],
          [
            "sibling-prose",
            `update public.item set description=description||' changed' where id=${owner.id};`,
          ],
          [
            "sibling-metadata",
            `update public.item set meta_data=jsonb_set(meta_data::jsonb,'{unreviewed}','true')::json where id=${owner.id};`,
          ],
          [
            "wrong-hands",
            `update public.item set hands='2' where id=${owner.id};`,
          ],
          [
            "wrong-usage",
            `update public.item set usage='held-in-two-hands' where id=${owner.id};`,
          ],
          [
            "hands-only-hybrid",
            `update public.item set hands=${q(owner.final.hands)} where id=${owner.id};`,
          ],
          [
            "usage-only-hybrid",
            `update public.item set usage=${q(owner.final.usage)} where id=${owner.id};`,
          ],
          ["one-owner-terminal-partial-domain", terminalSql(owner)],
          ["pending-ref", pending("item", owner.id)],
          ["pending-data-id", pending("item", null, { id: owner.id })],
          ["pending-uuid", pending("item", null, { uuid: owner.anchor.uuid })],
          [
            "pending-normalized-name",
            pending("item", null, {
              name: "  " + owner.name.toUpperCase() + "  ",
              content_source_id: owner.anchor.content_source_id,
            }),
          ],
          [
            "pending-primary-url",
            pending("item", null, {
              meta_data: { source: { url: owner.primary[0].url } },
            }),
          ],
        ])
          negative(
            `legacy-grips-${owner.id}-${suffix}`,
            legacyGrips,
            setup,
            /owner changed|partial atomic domain|pending curator/i,
          );
      }
      for (const dependency of legacyGrips.spec.dependencies) {
        for (const [suffix, setup] of [
          ["missing", missingDependencySetup("trait", dependency.id)],
          [
            "full-drift",
            `update public.trait set description=description||' changed' where id=${dependency.id};`,
          ],
          ["pending-ref", pending("trait", dependency.id)],
          [
            "pending-normalized-name",
            pending(
              "trait",
              null,
              {
                name: "  " + dependency.name.toUpperCase() + "  ",
                content_source_id: dependency.anchor.content_source_id,
              },
              {},
              dependency.anchor.content_source_id,
            ),
          ],
        ])
          negative(
            `legacy-grips-dependency-${dependency.id}-${suffix}`,
            legacyGrips,
            setup,
            suffix === "missing"
              ? new RegExp(`Treasure Vault grips dependency changed: ${dependency.id}(?:\\s|$)`)
              : /dependency changed|pending curator/i,
          );
      }
      for (const source of legacyGrips.spec.sources) {
        negative(
          `legacy-grips-source-${source.id}-identity`,
          legacyGrips,
          `update public.content_source set is_published=false where id=${source.id};`,
          /source/i,
        );
        negative(
          `legacy-grips-source-${source.id}-pending`,
          legacyGrips,
          pending("content-source", null, {
            name: "  " + source.name.toUpperCase() + "  ",
          }),
          /pending curator/i,
        );
      }
      const first = legacyGrips.spec.patches[0],
        last = legacyGrips.spec.patches.at(-1),
        dependency = legacyGrips.spec.dependencies[0];
      for (const [suffix, table, event, body, expected] of [
        [
          "late-current-owner",
          "item",
          "update",
          `if new.id=${first.id} and pg_trigger_depth()=1 then update public.item set description=description||' changed' where id=${first.id};end if;`,
          /post-trigger owner drift/i,
        ],
        [
          "late-earlier-owner",
          "item",
          "update",
          `if new.id=${last.id} then update public.item set description=description||' changed' where id=${first.id};end if;`,
          /final owner drift/i,
        ],
        [
          "late-dependency",
          "item",
          "update",
          `if new.id=${last.id} then update public.trait set description=description||' changed' where id=${dependency.id};end if;`,
          /final dependency drift/i,
        ],
        [
          "late-source",
          "item",
          "update",
          `if new.id=${last.id} then update public.content_source set description=description||' changed' where id=14;end if;`,
          /final source drift/i,
        ],
        [
          "migration-only-late-pending",
          "item",
          "update",
          `if new.id=${last.id} then ${pending("item", first.id)}end if;`,
          /final curator drift/i,
        ],
        [
          "migration-only-late-unrelated-queue",
          "item",
          "update",
          `if new.id=${last.id} then ${pending("spell", unrelatedSpell.id, {}, {}, unrelatedSpell.content_source_id)}end if;`,
          /final curator drift/i,
        ],
      ])
        negative(
          `legacy-grips-${suffix}`,
          legacyGrips,
          trigger(table, event, body),
          expected,
          !suffix.startsWith("migration-only"),
        );
    }
    if (batch === artifactAccess) {
      const operationSql = (operations) =>
        `array(select value::json from jsonb_array_elements(${j(operations)}))`;
      const terminalSql = (owner) =>
        owner.path === "operations"
          ? `update public.${owner.table} set operations=${operationSql(owner.final.operations)} where id=${owner.id};`
          : `update public.archetype set dedication_feat_id=${owner.final.dedication_feat_id} where id=${owner.id};`;
      for (const owner of artifactAccess.spec.patches) {
        const routes = [owner.type];
        if (owner.table === "ability_block") routes.push("ability-block");
        const controls = [
          [
            "missing",
            `delete from public.${owner.table} where id=${owner.id};`,
          ],
          [
            "identity",
            `update public.${owner.table} set uuid=uuid+1 where id=${owner.id};`,
          ],
          [
            "sibling-prose",
            `update public.${owner.table} set description=description||' changed' where id=${owner.id};`,
          ],
          [
            "sibling-metadata",
            `update public.${owner.table} set meta_data=jsonb_set(coalesce(meta_data::jsonb,'{}'),'{unreviewed}','true')::json where id=${owner.id};`,
          ],
          ["one-owner-terminal-partial-domain", terminalSql(owner)],
        ];
        if (owner.path === "operations") {
          const wrong = structuredClone(owner.final.operations);
          wrong[0].id = "unreviewed-operation-id";
          controls.push([
            "hybrid-operation",
            `update public.${owner.table} set operations=${operationSql(owner.final.operations.slice(1))} where id=${owner.id};`,
          ]);
          controls.push([
            "unknown-operation-id",
            `update public.${owner.table} set operations=${operationSql(wrong)} where id=${owner.id};`,
          ]);
        } else {
          // Use an actual feat so the setup reaches the owner guard rather than a foreign-key error.
          const wrongDedication = readState().ability_block.find(
            (row) => row.type === "feat" &&
              row.id !== owner.anchor.dedication_feat_id &&
              row.id !== owner.final.dedication_feat_id,
          );
          assert.ok(wrongDedication && Number.isSafeInteger(wrongDedication.id) && wrongDedication.id > 0,
            "The wrong-dedication control requires an existing unrelated feat");
          controls.push([
            "wrong-dedication",
            `update public.archetype set dedication_feat_id=${wrongDedication.id} where id=${owner.id};`,
          ]);
        }
        for (const [name, setup] of controls)
          negative(
            `artifact-access-${owner.table}-${owner.id}-${name}`,
            artifactAccess,
            setup,
            /owner missing|owner changed|partial domain/i,
          );
        for (const route of routes) {
          for (const [name, setup] of [
            ["ref", pending(route, owner.id)],
            ["data-id", pending(route, null, { id: owner.id })],
            ["uuid", pending(route, null, { uuid: owner.anchor.uuid })],
            [
              "normalized-name",
              pending(
                route,
                null,
                {
                  name: "  " + owner.name.toUpperCase() + "  ",
                  content_source_id: owner.anchor.content_source_id,
                },
                {},
                owner.anchor.content_source_id,
              ),
            ],
            [
              "primary-url",
              pending(route, null, {
                meta_data: {
                  source: {
                    url: "  " + owner.primary[0].url.toUpperCase() + "  ",
                  },
                },
              }),
            ],
          ])
            negative(
              `artifact-access-${owner.id}-${route}-pending-${name}`,
              artifactAccess,
              setup,
              /pending curator/i,
            );
        }
      }
      for (const dependency of artifactAccess.spec.dependencies) {
        for (const [name, setup] of [
          [
            "missing",
            missingDependencySetup(dependency.table, dependency.id),
          ],
          [
            "full-drift",
            `update public.${dependency.table} set description=description||' changed' where id=${dependency.id};`,
          ],
          [
            "pending-normalized-name",
            pending(
              dependency.type,
              null,
              {
                name: "  " + dependency.name.toUpperCase() + "  ",
                content_source_id: dependency.anchor.content_source_id,
              },
              {},
              dependency.anchor.content_source_id,
            ),
          ],
          ...(dependency.table === "ability_block"
            ? [
                [
                  "pending-top-level-alias",
                  pending("ability-block", dependency.id),
                ],
              ]
            : []),
        ])
          negative(
            `artifact-access-dependency-${dependency.table}-${dependency.id}-${name}`,
            artifactAccess,
            setup,
            name === "missing"
              ? new RegExp(`Treasure Vault artifact dependency changed: ${dependency.table}:${dependency.id}(?:\\s|$)`)
              : /dependency changed|pending curator/i,
          );
      }
      for (const source of artifactAccess.spec.sources) {
        negative(
          `artifact-access-source-${source.id}-identity`,
          artifactAccess,
          `update public.content_source set is_published=false where id=${source.id};`,
          /sources changed/i,
        );
        negative(
          `artifact-access-source-${source.id}-pending`,
          artifactAccess,
          pending("content-source", null, {
            name: "  " + source.name.toUpperCase() + "  ",
          }),
          /pending curator/i,
        );
      }
      const first = artifactAccess.spec.patches[0],
        last = artifactAccess.spec.patches.at(-1),
        dependency = artifactAccess.spec.dependencies[0];
      negative(
        "artifact-access-all-but-last-terminal-partial-domain",
        artifactAccess,
        artifactAccess.spec.patches.slice(0, -1).map(terminalSql).join("\n"),
        /partial domain/i,
      );
      negative(
        "artifact-access-late-current-owner",
        artifactAccess,
        trigger(
          first.table,
          "update",
          `if new.id=${first.id} and pg_trigger_depth()=1 then update public.${first.table} set description=description||' changed' where id=${first.id};end if;`,
        ),
        /post-trigger owner drift/i,
      );
      negative(
        "artifact-access-late-earlier-owner",
        artifactAccess,
        trigger(
          last.table,
          "update",
          `if new.id=${last.id} then update public.${first.table} set description=description||' changed' where id=${first.id};end if;`,
        ),
        /final owner drift/i,
      );
      negative(
        "artifact-access-late-dependency",
        artifactAccess,
        trigger(
          last.table,
          "update",
          `if new.id=${last.id} then update public.${dependency.table} set description=description||' changed' where id=${dependency.id};end if;`,
        ),
        /final dependency drift/i,
      );
      negative(
        "artifact-access-late-source",
        artifactAccess,
        trigger(
          last.table,
          "update",
          `if new.id=${last.id} then update public.content_source set description=description||' changed' where id=3;end if;`,
        ),
        /final source drift/i,
      );
      negative(
        "artifact-access-migration-only-late-pending",
        artifactAccess,
        trigger(
          last.table,
          "update",
          `if new.id=${last.id} then ${pending(first.type, first.id)}end if;`,
        ),
        /final curator drift/i,
        false,
      );
    }
  }

    return { cases: plan.cases, phase: plan.cases[0]?.phase ?? 'before:' + path, original: active,
      limits: active === chair ? ['The old14 runner had no independent pre030 rejection family; runtime binding/cardinality is covered by current100/101 and the mandatory shared-history controls.'] : [] };
  }
  function afterOriginal(path) {
    const batch = sequence.find(row => row.path === path); assert.ok(batch);
    const plan = collector('after:' + path), { negative, pending } = plan;
    const positiveReplays = [];
    if (batch === seeds || batch === chair) {
      positiveReplays.push(equipment, seeds);
      for (const owner of [equipment, seeds]) {
        negative(
          owner.path + "-successor-edited-seed",
          owner,
          "update public.item set description=description||' changed' where uuid=944653220160268;",
          /terminal|unreviewed/i,
        );
        negative(
          owner.path + "-successor-missing-seed",
          owner,
          "delete from public.item where uuid=944653220160268;",
          /terminal|incomplete/i,
        );
        negative(
          owner.path + "-successor-wrong-cache",
          owner,
          "update public.content_source set meta_data=jsonb_set(meta_data::jsonb,'{counts,trait}','45')::json where id=16;",
          /terminal|baseline/i,
        );
        negative(
          owner.path + "-successor-pending-seed",
          owner,
          pending("item", null, { uuid: "944653220160268" }, {}),
          /pending/i,
        );
        if (batch === chair) {
          negative(
            owner.path + "-chair-missing-attack",
            owner,
            "delete from public.item where uuid=3341821474558316;",
            /terminal/i,
          );
          negative(
            owner.path + "-chair-missing-creature",
            owner,
            "delete from public.creature where uuid=722858796387375;",
            /terminal/i,
          );
          negative(
            owner.path + "-chair-edited-creature",
            owner,
            "update public.creature set details=jsonb_set(details::jsonb,'{description}','\"changed\"')::json where uuid=722858796387375;",
            /terminal/i,
          );
          negative(
            owner.path + "-chair-hybrid-cache",
            owner,
            "update public.content_source set meta_data=jsonb_set(meta_data::jsonb,'{counts,creature}','1')::json where id=16;",
            /terminal/i,
          );
          negative(
            owner.path + "-chair-pending-creature",
            owner,
            pending("creature", null, { uuid: "722858796387375" }, {}),
            /pending/i,
          );
        }
      }
    }
    if (batch === scalar) {
  negative(
    "physical-reviewed095-wrong-bulk",
    physical,
    "update public.item set bulk='0.2' where id=12212;",
    /Unreviewed physical-header tuple/i,
  );
  negative(
    "physical-reviewed095-hybrid-traits",
    physical,
    "update public.item set traits=array[1526,1527,1504]::bigint[] where id=12212;",
    /Unreviewed physical-header tuple/i,
  );
  negative(
    "physical-reviewed095-prose-drift",
    physical,
    "update public.item set description=description||' changed' where id=12212;",
    /reviewed physical-header/i,
  );
  negative(
    "physical-reviewed095-unknown-sibling",
    physical,
    `update public.item set price='{"gp":999}' where id=12212;`,
    /reviewed physical-header/i,
  );
  negative(
    "physical-reviewed095-pending-owner",
    physical,
    pending("item", 12212, {}, {}),
    /unresolved curator/i,
  );

    }
    return { phase: 'after:' + path, cases: plan.cases, positiveReplays,
      assertions: ['Every positive replay preserves exact sequence state. Rejections preserve complete public tuples, generated fields, timestamps and saved data; verify only explicitly declared original nextval consumption after fixture-ID reservation.'] };
  }

  function beforeCompletion() {
    const plan = collector('before100'), model = {};
    collectCompletionControls({ completion: inputs.completion, ...plan, q, j, receipt: model, query });
    return { phase: 'before100', cases: plan.cases, branch_shapes: model.completion_control_branch_shapes,
      limits: ['Original extracted100 guard cases. Shared-wrapper/global-terminal rejection is independently mandatory.', 'Known queue rows are optional-absent; incorrect-present tests never alter a captured expected MD5.'] };
  }
  function beforeDisplay() {
    const plan = collector('before101');
    collectDisplayControls({ display: inputs.display, ...plan, q, j, all: readState, query });
    return { phase: 'before101', cases: plan.cases,
      limits: ['Every UNIQUE-drop adversarial capsule must restore the actual constraint; the attached postcondition runs after rollback.', 'Alternate positive allocations/static-prefix cases are listed as a separate required family, not silently claimed here.'] };
  }
  /** Prove absence and removal of an intentionally incorrect row without importing private curator bodies. */
  function knownQueueLifecycle(phase) {
    assert.ok(['100','101'].includes(phase));
    const batch = phase === '100' ? inputs.completion : inputs.display;
    return inputs.contract.known_pending_dependencies.map(known => {
      const plan = collector('known-optional:' + phase);
      const pending = plan.pending(known.type, known.ref_id,
        {...known.identity,description:'Intentionally incorrect proposed body'},
        {state:known.state}, known.content_source_id, known.id);
      const recipe = plan.negative('known-optional-' + phase + '-' + known.id,batch,pending,/known pending dependency changed/i,false);
      return {
        name: recipe.name, phase: 'terminal' + phase, batch,
        prepare() {
          return { insert_incorrect_present: recipe.prepare().setup,
            remove: 'delete from public.content_update where id=' + known.id + ';',
            helper_status_sql: 'select row_to_json(s) from ' + inputs.helper.signature + ' s;',
            expected_before: {recognized:true,passed:true},
            expected_incorrect_present: {recognized:true,passed:false},
            expected_removed: {recognized:true,passed:true} };
        },
        limits: ['Removal positive uses an intentionally incorrect owned fixture proposal; exact private known-body acceptance is not claimed.', 'Reserve/supply only real Auth identity; keep the entire lifecycle inside a rollback capsule and verify full state afterward.'],
      };
    });
  }
  return {
    batches, beforeOriginal, afterOriginal, beforeCompletion, beforeDisplay, knownQueueLifecycle,
    strictReleaseEdges: nativeStrictReleaseEdges(),
    external_required_controls: [
      {family:'historical023-fresh-four-insert-bootstrap',module:'treasure-vault-native-fresh-equipment.mjs',reason:'Actual own-stage rollback branch must prove complete typed literals, real allocations and full restoration.'},
      {family:'historical14-positive-catalog-and-saved-copy-projection',module:'treasure-vault-native-positive-projections.mjs',reason:'Independent approved full-content/source projections, never inferred from these negative recipe results.'},
      {family:'alternate-display101-allocations-and-static-helper-prefix',module:'treasure-vault-native-allocations.mjs',reason:'A genuinely separate full chronology verifies runtime bindings; lexical prefix evidence is explicitly not a fabricated native allocation.'},
      {family:'concurrent-writers-count-phantoms-and-lock-order',module:'treasure-vault-native-writers.mjs',reason:'Two real owned sessions, native observed barriers and exact script-error SQLSTATE evidence.'},
      {family:'all39-global-shared-helper-history-metadata-and-War34',module:'treasure-vault-native-history.mjs',reason:'All actual wrappers at own stages and both terminals plus helper metadata/common matrix are mandatory.'},
      {family:'shared-helper-all-pending-alias-routes',module:'treasure-vault-native-pending-aliases.mjs',reason:'Both terminal structural route matrices must use actual FK-valid GoTrue identity and full rollback proof.'},
    ],
    untested_private_limits:[{family:'exact-known-private-queue-body-present-acceptance',reason:'Sanitized CI intentionally omits private submissions. Absence/removal and incorrect-present rejection are covered; no fabricated expected-MD5 positive row is imported.'}],
    caller_contract: [
      'User identity must be created and verified by owned real GoTrue, with the real public_user trigger.',
      'prepare() reserves and records real proposal/content IDs before the rollback baseline; setup INSERTs use those exact actual IDs, never remapped catalog identities.',
      'Execute setup first and distinguish type/FK/parser failures from the expected original guard SQLSTATE/message. Such setup errors are failures, never green guards.',
      'After every rejection, compare complete public tuples and saved data, exact helper metadata, and attached schema restoration assertions; verify declared original nextval consumption and exact equality of all other sequences.',
      'Every positive replay must preserve every sequence exactly. Never reset nextval counters to make rejection tests appear transactional.',
      'Apply/replay original batch positives and actual39+100 wrappers independently. Never infer full native coverage from recipe counts.',
      'Default checked-in mode has no private paths, candidate fallback, old receipt reuse, catalog ID mapping or synthetic known-MD5 substitution.',
    ],
  };
}
/** Resolve all eleven complete template identities before using any allocated ID. */
function runtimeTemplates(spec, state, terminal) {
  const templates = [...spec.prerequisites, ...spec.inserts];
  assert.equal(templates.length, 11);
  const actuals = new Map();
  for (const template of templates) {
    assert.ok(['item', 'creature'].includes(template.table));
    const matches = state[template.table].filter(row => String(row.uuid) === template.uuid);
    assert.equal(matches.length, 1, 'Global UUID cardinality, including other sources');
    const row = matches[0];
    assert.ok(Number.isSafeInteger(row.id) && row.id > 0);
    assert.equal(row.content_source_id, 16); assert.equal(row.name, template.name);
    if (template.table === 'creature') assert.equal(row.type, 'creature');
    actuals.set(templateKey(template), row);
  }
  const rendered = new Map();
  for (const template of templates) {
    const expected = structuredClone(template.row);
    if (template.binding) {
      const operations = expected.operations.filter(op => op.id === template.binding.operation_id);
      assert.equal(operations.length, 1); assert.equal(operations[0].type, 'giveItem');
      operations[0].data.itemId = actuals.get(`item:${template.binding.item_uuid}`).id;
    }
    for (const field of template.display_fields) if (terminal) {
      let text = field.after_template;
      for (const binding of field.bindings) {
        const target = actuals.get(`${binding.table}:${binding.uuid}`);
        assert.ok(target); assert.equal(target.name, binding.name); assert.equal(target.content_source_id, binding.content_source_id);
        text = text.replaceAll(`{{allocated_id:${binding.uuid}}}`, String(target.id));
      }
      assert.doesNotMatch(text, /\{\{allocated_id:/); set(expected, field.path, text);
    }
    const row = actuals.get(templateKey(template));
    assert.deepEqual(normal(row), { ...expected, id: row.id, created_at: row.created_at }, 'Every non-generated template field and actual binding must equal the approved phase');
    rendered.set(templateKey(template), expected);
  }
  return { templates, actuals, rendered };
}


/** Exercise final100 rejection controls only through the owned offline fixture callbacks. */
function collectCompletionControls({ completion, negative, pending, contentId, trigger, q, j, receipt, query }) {
  const spec = completion.spec;
  const fail = /Treasure Vault completion/i;
  const groups = new Map();
  for (const owner of spec.patches) groups.set(`${owner.table}:${JSON.stringify(owner.changed_columns)}`, owner);
  assert.equal(groups.size, 30);
  const finalOwner = (owner) => {
    const columns = owner.changed_columns.map((key) => `"${key}"=typed."${key}"`).join(',');
    return `update public.${owner.table} r set ${columns} from jsonb_populate_record(null::public.${owner.table},${j(owner.final)})typed where r.id=${owner.id};`;
  };
  for (const [group, owner] of groups) {
    negative(`completion100-branch-${group}-unknown-sibling`, completion, `update public.${owner.table} set name=name||' proof drift' where id=${owner.id};`, fail, false);
    negative(`completion100-branch-${group}-partial-terminal`, completion, finalOwner(owner), /partial or unknown atomic domain/i, false);
  }
  for (const table of [...new Set(spec.dependencies.map((d) => d.table))]) {
    const dependency = spec.dependencies.find((d) => d.table === table);
    negative(`completion100-${table}-dependency-whole-row`, completion, `update public.${table} set name=name||' proof drift' where id=${dependency.id};`, /dependency changed/i, false);
    negative(`completion100-${table}-dependency-created-at`, completion, `update public.${table} set created_at=created_at+interval '1 second' where id=${dependency.id};`, /dependency changed/i, false);
    negative(`completion100-${table}-dependency-pending-normalized-name`, completion, pending(dependency.type, null, {name:`  ${dependency.name.toUpperCase()}  `,content_source_id:dependency.anchor.content_source_id}, {state:' pending '}, dependency.anchor.content_source_id), /pending curator conflict/i, false);
  }
  for (const table of [...new Set(spec.patches.map((p) => p.table))]) {
    const owner = spec.patches.find((p) => p.table === table);
    negative(`completion100-${table}-owner-created-at`, completion, `update public.${table} set created_at=created_at+interval '1 second' where id=${owner.id};`, /owner changed/i, false);
    negative(`completion100-${table}-owner-pending-ref`, completion, pending(owner.type, owner.id, {}, {}, owner.anchor.content_source_id), /pending curator conflict/i, false);
  }
  const columns = Object.keys(spec.inserts[0].row).sort();
  const inserted = (row) => `insert into public.item(id,${columns.map((k)=>`"${k}"`)}) select ${contentId('item')},${columns.map((k)=>`typed."${k}"`)} from jsonb_populate_record(null::public.item,${j(row)})typed;`;
  for (const insert of spec.inserts) {
    negative(`completion100-${insert.uuid}-partial-insert`, completion, inserted(insert.row), /partial or unknown atomic domain/i, false);
    negative(`completion100-${insert.uuid}-global-uuid-other-source`, completion, inserted({...insert.row,name:'Unrelated proof name '+insert.uuid,content_source_id:3}), /inserted UUID conflict/i, false);
    negative(`completion100-${insert.uuid}-normalized-name-collision`, completion, inserted({...insert.row,uuid:'8000000000000001',name:`  ${insert.name.toUpperCase()}  `}), /inserted name collision/i, false);
    negative(`completion100-${insert.uuid}-pending-url-only`, completion, pending('item',null,{meta_data:{source:{url:`  ${insert.row.meta_data.source.url.toUpperCase()}  `}}},{},3), /pending curator conflict/i, false);
  }
  for (const source of spec.sources) {
    negative(`completion100-source-${source.id}-full-row`, completion, `update public.content_source set description=coalesce(description,'')||' proof drift' where id=${source.id};`, /partial or unknown atomic domain/i, false);
  }
  for (const known of spec.known_pending_dependencies) {
    for (const [route, data, status, ref] of [
      ['body', {...known.identity,description:'Intentionally incorrect proposed body'}, {state:known.state}, known.ref_id],
      ['identity', {...known.identity,uuid:'1'}, {state:known.state}, known.ref_id],
      ['state', {...known.identity}, {state:'APPROVED'}, known.ref_id],
      ['ref', {...known.identity}, {state:known.state}, 1],
    ]) negative(`completion100-known-queue-${known.id}-${route}`, completion, pending(known.type,ref,data,status,known.content_source_id,known.id), /known pending dependency changed/i, false);
    negative(`completion100-known-queue-${known.id}-extra-conflict`, completion, pending(known.type,known.ref_id,{}, {},known.content_source_id), /pending curator conflict/i, false);
  }
  const creature = spec.prerequisites.find((p)=>p.binding);
  for (const prerequisite of spec.prerequisites) {
    const column = prerequisite.table==='creature'?'details':'meta_data';
    negative(`completion100-prerequisite-${prerequisite.uuid}-full-row`, completion, `update public.${prerequisite.table} set ${column}=jsonb_set(coalesce(${column}::jsonb,'{}'),'{proof_unreviewed}','true')::json where uuid=${q(prerequisite.uuid)};`, /prerequisite changed/i, false);
    const substituteFailure = prerequisite.table==='item' && prerequisite.uuid===creature.binding.item_uuid ? /prerequisite attack identity/i : /prerequisite UUID cardinality/i;
    negative(`completion100-prerequisite-${prerequisite.uuid}-same-count-substitute`, completion, `update public.${prerequisite.table} set uuid=8000000000000002,name='Unreviewed same-count substitute' where uuid=${q(prerequisite.uuid)};`, substituteFailure, false);
    const actualId = query(`select to_jsonb(id) from public.${prerequisite.table} where uuid::text=${q(prerequisite.uuid)};`);
    assert.ok(Number.isSafeInteger(actualId) && actualId > 0);
    negative(`completion100-prerequisite-${prerequisite.uuid}-pending-actual-id`, completion, pending(prerequisite.type,actualId,{}, {},16), /pending curator conflict/i, false);
  }
  negative('completion100-prerequisite-wrong-attack-binding', completion, `update public.creature set operations=array(select case when op->>'id'=${q(creature.binding.operation_id)} then jsonb_set(op::jsonb,'{data,itemId}','1',false)::json else op::json end from unnest(operations)op)where uuid=${q(creature.uuid)};`, /prerequisite changed/i, false);
  for (const key of ['item','trait','creature']) negative(`completion100-cache-${key}-unknown`,completion,`update public.content_source set meta_data=jsonb_set(meta_data::jsonb,'{counts,${key}}','999')::json where id=16;`,/partial or unknown atomic domain/i,false);
  const last = spec.patches.at(-1), first = spec.patches[0], dependency = spec.dependencies[0];
  for (const [name, body, match] of [
    ['current-owner',`update public.${last.table} set name=name||' late proof drift' where id=${last.id};`,/post-trigger owner drift|final owner drift/i],
    ['earlier-owner',`update public.${first.table} set name=name||' late proof drift' where id=${first.id};`,/final owner drift/i],
    ['dependency',`update public.${dependency.table} set name=name||' late proof drift' where id=${dependency.id};`,/final dependency drift/i],
    ['source',"update public.content_source set description=description||' late proof drift' where id=3;",/final source drift/i],
    ['prerequisite',`update public.item set name=name||' late proof drift' where uuid=${q(spec.prerequisites.find((p)=>p.table==='item').uuid)};`,/final prerequisite drift/i],
    ['queue',pending('spell',1,{name:'Unrelated late synthetic proposal'}, {},1),/curator queue changed/i],
    ['matching-pending',pending(first.type,first.id,{}, {},first.anchor.content_source_id),/curator queue changed|final curator drift/i],
  ]) negative(`completion100-late-${name}`,completion,trigger(last.table,'update',`if new.id=${last.id} and pg_trigger_depth()=1 then ${body}end if;`),match,false);
  receipt.completion_control_branch_shapes = [...groups.keys()].sort();
}

/** Author all101 controls privately; callbacks are supplied only by the owned fixture. */
function collectDisplayControls({ display, negative, pending, contentId, trigger, q, j, all, query, attachLastAssertion }) {
  const spec = display.spec, state = all(), runtime = runtimeTemplates(spec, state, false);
  const changedCatalog = spec.catalog.filter(row => row.display_fields.length);
  const changedTemplates = runtime.templates.filter(row => row.display_fields.length);
  assert.equal(changedCatalog.length, 14); assert.equal(changedTemplates.length, 7); assert.equal(spec.write_count, 21);
  const update = (table, id, row, columns) => {
    assert.ok(TABLES.has(table));
    return `update public.${table} r set ${columns.map(c => `"${c}"=typed."${c}"`).join(',')} from jsonb_populate_record(null::public.${table},${j(row)})typed where r.id=${id};`;
  };
  const writes = changedCatalog.map(owner => ({ label: key(owner), sql: update(owner.table, owner.id, owner.after, ['operations']) }));
  for (const template of changedTemplates) {
    const row = structuredClone(runtime.rendered.get(templateKey(template)));
    for (const field of template.display_fields) {
      let text = field.after_template;
      for (const binding of field.bindings) text = text.replaceAll(`{{allocated_id:${binding.uuid}}}`, String(runtime.actuals.get(`${binding.table}:${binding.uuid}`).id));
      set(row, field.path, text);
    }
    writes.push({ label: templateKey(template), sql: update(template.table, runtime.actuals.get(templateKey(template)).id, row, [...new Set(template.display_fields.map(field => field.path[0]))]) });
  }
  const reject = (name, setup, match = /TV display101/i) => negative(`display101-${name}`, display, setup, match, false);
  for (const write of writes) {
    reject(`partial-only-${write.label}`, write.sql, /mixed atomic display domain/i);
    reject(`partial-all-except-${write.label}`, writes.filter(other => other !== write).map(other => other.sql).join('\n'), /mixed atomic display domain/i);
  }
  for (const owner of changedCatalog) {
    reject(`${key(owner)}-full-row`, `update public.item set price='{"gp":999999}' where id=${owner.id};`, /full catalog owner\/dependency changed/i);
    reject(`${key(owner)}-created-at`, `update public.item set created_at=created_at+interval '1 second' where id=${owner.id};`, /full catalog owner\/dependency changed/i);
    reject(`${key(owner)}-pending`, pending(owner.type, owner.id), /pending curator conflict/i);
  }
  for (const table of [...new Set(spec.catalog.map(owner => owner.table))]) {
    const dependency = spec.catalog.find(owner => owner.table === table && !owner.display_fields.length);
    reject(`${table}-dependency`, `update public.${table} set name=name||' proof drift' where id=${dependency.id};`, /full catalog owner\/dependency changed/i);
    reject(`${table}-pending-subtype`, pending(dependency.type, dependency.id, {}, {}, dependency.before.content_source_id), /pending curator conflict/i);
    if (table === 'ability_block') reject(`${table}-pending-top-level`, pending('ability-block', dependency.id, {}, {}, dependency.before.content_source_id), /pending curator conflict/i);
  }
  for (const source of spec.sources) reject(`source-${source.id}`, `update public.content_source set description=coalesce(description,'')||' proof drift' where id=${source.id};`, /complete source domain changed/i);
  for (const template of runtime.templates) {
    const id = runtime.actuals.get(templateKey(template)).id;
    reject(`${templateKey(template)}-missing`, `delete from public.${template.table} where id=${id};`);
    reject(`${templateKey(template)}-wrong-source`, `update public.${template.table} set content_source_id=3 where id=${id};`);
    reject(`${templateKey(template)}-wrong-UUID`, `update public.${template.table} set uuid=8000000000000001 where id=${id};`);
    reject(`${templateKey(template)}-nonpositive-ID`, `update public.${template.table} set id=-30001 where id=${id};`);
    reject(`${templateKey(template)}-pending-allocated-ID`, pending(template.type, id), /pending curator conflict/i);
    const actual = structuredClone(runtime.actuals.get(templateKey(template)));
    for (const field of ['id', 'created_at', 'updated_at', 'search_tsv']) delete actual[field];
    actual.content_source_id = 3; actual.name += ' duplicate proof';
    const columns = Object.keys(actual);
    const constraint = template.table === 'item' ? 'item_uuid_key' : 'creature_upload_uuid_key';
    reject(`${templateKey(template)}-global-duplicate-UUID`, `alter table public.${template.table} drop constraint ${constraint};insert into public.${template.table}(id,${columns.map(c => `"${c}"`).join(',')})select ${contentId(template.table)},${columns.map(c => `typed."${c}"`).join(',')} from jsonb_populate_record(null::public.${template.table},${j(actual)})typed;`, /UUID cardinality/i);
    attachLastAssertion(() => assert.equal(query(`select to_jsonb(exists(select 1 from pg_constraint where conname=${q(constraint)}));`), true, 'Rollback restores the actual UNIQUE constraint'));
  }
  const chair = runtime.templates.find(template => template.binding), chairId = runtime.actuals.get(templateKey(chair)).id;
  reject('chair-wrong-attack', `update public.creature set operations=array(select case when op->>'id'=${q(chair.binding.operation_id)} then jsonb_set(op::jsonb,'{data,itemId}','1',false)::json else op::json end from unnest(operations)op)where id=${chairId};`, /full authored template changed/i);
  reject('chair-wrong-type', `update public.creature set type='hazard' where id=${chairId};`, /full authored template changed/i);
  for (const known of spec.known_pending_dependencies) for (const [route, data, status, ref] of [
    ['body', {...known.identity,description:'Intentionally incorrect proposed body'}, {state:known.state}, known.ref_id],
    ['identity', {...known.identity,uuid:'1'}, {state:known.state}, known.ref_id],
    ['state', {...known.identity}, {state:'APPROVED'}, known.ref_id],
    ['ref', {...known.identity}, {state:known.state}, 1],
  ]) reject(`known-queue-${known.id}-${route}`, pending(known.type,ref,data,status,known.content_source_id,known.id), /known pending dependency changed|pending curator conflict/i);
  for (const known of spec.known_pending_dependencies)
    reject(`known-queue-${known.id}-extra`, pending(known.type,known.ref_id,{}, {},known.content_source_id), /pending curator conflict/i);
  const source = spec.sources[0];
  reject('pending-source-normalized-URL', pending('content-source', null, { url: `  ${source.row.url.toUpperCase()}  ` }, {}, source.id), /pending curator conflict/i);
  reject('pending-source-normalized-metadata-URL', pending('content-source', null, { meta_data: { source: { url: `  ${source.row.url.toUpperCase()}  ` } } }, {}, source.id), /pending curator conflict/i);
  for (const template of changedTemplates) for (const field of template.display_fields.filter(field => field.bindings.length)) {
    const binding = field.bindings[0], row = structuredClone(runtime.rendered.get(templateKey(template))), id = runtime.actuals.get(templateKey(template)).id;
    const targetId = runtime.actuals.get(`${binding.table}:${binding.uuid}`).id;
    let text = field.after_template;
    for (const target of field.bindings) text = text.replaceAll(`{{allocated_id:${target.uuid}}}`, String(runtime.actuals.get(`${target.table}:${target.uuid}`).id));
    for (const [name, wrong] of [
      ['wrong-ID', text.replace(`](link_${binding.table}_${targetId})`, `](link_${binding.table}_${targetId === 1 ? 2 : 1})`) ],
      ['wrong-type', text.replace(`](link_${binding.table}_${targetId})`, `](link_spell_${targetId})`) ],
      ['missing-occurrence', text.replace(`](link_${binding.table}_${targetId})`, ')') ],
      ['extra-occurrence', text + ` [extra](link_${binding.table}_${targetId})`],
    ]) { set(row, field.path, wrong); reject(`${templateKey(template)}-${field.path.join('.')}-${name}`, update(template.table, id, row, [field.path[0]])); }
  }
  const last = changedTemplates.toSorted((a, b) => a.table.localeCompare(b.table) || a.uuid.localeCompare(b.uuid)).at(-1);
  const lastId = runtime.actuals.get(templateKey(last)).id, first = changedCatalog[0], dependency = spec.catalog.find(owner => owner.table === 'ancestry');
  const outsideId = query(`select to_jsonb(min(id)) from public.item where id not in(${spec.catalog.filter(owner => owner.table === 'item').map(owner => owner.id).join(',')}) and content_source_id<>16;`);
  assert.ok(Number.isSafeInteger(outsideId) && outsideId > 0, 'The out-of-membership late-write negative must have an actual target');
  for (const [name, body, match] of [
    ['earlier-owner', `update public.item set name=name||' late drift' where id=${first.id};`, /final catalog drift/i],
    ['dependency', `update public.ancestry set name=name||' late drift' where id=${dependency.id};`, /final catalog drift|complete catalog preservation drift/i],
    ['outside-membership', `update public.item set name=name||' late drift' where id=${outsideId};`, /complete catalog preservation drift/i],
    ['source', "update public.content_source set description=coalesce(description,'')||' late drift' where id=3;", /whole source preservation drift/i],
    ['matching-queue', pending(first.type, first.id), /whole queue preservation drift/i],
    ['unrelated-queue', pending('spell', 1, { name: 'Unrelated synthetic late submission' }, {}, 1), /whole queue preservation drift/i],
  ]) reject(`late-${name}`, trigger(last.table, 'update', `if new.id=${lastId} and pg_trigger_depth()=1 then ${body}end if;`), match);
}
