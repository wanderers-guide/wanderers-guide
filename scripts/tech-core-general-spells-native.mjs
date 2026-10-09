// Plan construction is inert; native execution requires --execute-owned-native.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createOwnedNativeFixture } from './treasure-vault-native-fixture.mjs';
import { createNativeStopController, finalizeNativeStopReceipt } from './treasure-vault-native-stop.mjs';

const option = (name, fallback) =>
  process.argv.find((arg) => arg.startsWith('--' + name + '='))?.slice(name.length + 3) ?? fallback;
const root = fileURLToPath(new URL('../', import.meta.url));
const outputArgument = option('output');
assert.ok(outputArgument, 'An explicit private evidence directory is required');
const output = resolve(outputArgument);
const matrix = option('matrix', 'focused');
assert.ok(['focused', 'exhaustive'].includes(matrix));
assert.notEqual(output, root);
const execute = process.argv.includes('--execute-owned-native');
const hash = (value) => createHash('sha256').update(value).digest('hex');
const quote = (value) => "'" + String(value).replaceAll("'", "''") + "'";
const json = (value) => quote(JSON.stringify(value)) + '::jsonb';
const clone = (value) => structuredClone(value);
const inputPaths = [
  'data/schema.sql',
  'data/data.sql',
  'data/auth-trigger.sql',
  'supabase/seed.sql',
  'docker/db-init/zzz-passwords.sh',
  'supabase/migrations/20261008160000_tech_core_introductory_spells.sql',
  'supabase/release/tech-core-introductory-spells.sql',
  'supabase/migrations/20261008190000_tech_core_general_spells.sql',
  'supabase/release/tech-core-general-spells.sql',
];
const inputs = new Map(
  await Promise.all(inputPaths.map(async (path) => [resolve(root, path), await readFile(resolve(root, path), 'utf8')]))
);
const introPath = resolve(root, inputPaths[5]);
const introReleasePath = resolve(root, inputPaths[6]);
const introMigration = inputs.get(introPath);
const introRelease = inputs.get(introReleasePath);
const introSpec = JSON.parse(introMigration.split('$tech_core_spells$')[1]);
const migrationPath = resolve(root, inputPaths[7]);
const releasePath = resolve(root, inputPaths[8]);
const migration = inputs.get(migrationPath);
const release = inputs.get(releasePath);
const delimiter = '$tech_core_general$';
const splitSpec = (sql) => {
  const parts = sql.split(delimiter);
  assert.equal(parts.length, 3, 'Exactly one finite spec literal');
  return parts;
};
const spec = JSON.parse(splitSpec(migration)[1]);
assert.deepEqual(JSON.parse(splitSpec(release)[1]), spec);
assert.equal(
  hash(migration),
  '5bd0c1ab04ddef5dff562eb1e9b52be6092b88e8c127cabfa27760908020f485',
  'Reviewed physical migration bytes'
);
assert.equal(
  hash(release),
  '97c50a7cf4a529219ff96d86c755dc24c7aa9b287b15db8107bce3e681f3102e',
  'Reviewed physical release bytes'
);
assert.equal(
  hash(JSON.stringify(spec)),
  '625934ee9794b965d104ce5bfd740ee65167cb462638ef60c75b02808981b6e1',
  'Reviewed compact canonical spec, not a separate pretty JSON file'
);
assert.equal(spec.rows.length, 76);
assert.equal(spec.prior_rows.length, 6);
assert.deepEqual(spec.prior_rows, introSpec.rows);
assert.equal(spec.references.length, 92);
assert.equal(spec.sources.length, 7);
assert.equal(spec.bindings.length, 8);
assert.equal(
  spec.bindings.reduce((sum, binding) => sum + binding.occurrences, 0),
  9
);
assert.equal(spec.sources.find((row) => row.id === 900).required_content_sources, null);
assert.equal(
  spec.references.find(({ table, row }) => table === 'trait' && row.id === 4506).row.meta_data.creature_trait,
  false
);
assert.deepEqual(
  spec.sources.map((row) => row.id),
  [1, 3, 7, 15, 579, 793, 900]
);
assert.equal(new Set(spec.rows.map((row) => row.uuid)).size, 76);
assert.equal(new Set(spec.rows.map((row) => row.name)).size, 76);
for (const name of ['Animate Armor', 'Conjure Junkrod', 'Junk Grenade'])
  assert.equal(
    spec.rows.some((row) => row.name === name),
    false
  );

// Assert reuse of the reviewed query; this scaffold does not introduce another SQL validator.
const sharedStart = 'with recursive settings as materialized(select v_spec as spec),';
const sharedEnd = 'select prerequisites,aliases,exact_rows into status from state;';
const start = migration.indexOf(sharedStart);
assert.ok(start > 0);
const sharedQuery = migration.slice(start, migration.indexOf(sharedEnd, start));
assert.ok(sharedQuery.length > 1000);
assert.equal(migration.split(sharedQuery).length - 1, 2, 'Identical before/after validator');
const releaseNormalized = release.replace(delimiter + splitSpec(release)[1] + delimiter + '::jsonb', 'v_spec');
assert.ok(releaseNormalized.startsWith(sharedQuery), 'Release uses that same validator');
const migrationImplementation = [splitSpec(migration)[0], splitSpec(migration)[2]].join('');
const releaseImplementation = [splitSpec(release)[0], splitSpec(release)[2]].join('');
assert.doesNotMatch(
  migrationImplementation,
  /security\s+definer|\bgrant\b|\brevoke\b|\bcreate\s+(?:or\s+replace\s+)?(?:function|policy|role)\b|\balter\s+(?:role|policy|table)\b|\bupdate\s+\S+\s+set\b|\bdelete\s+from\b|\bexecute\s+/i
);
assert.deepEqual(
  [...migrationImplementation.matchAll(/\binsert\s+into\s+([a-z_.]+)/gi)].map((match) => match[1]),
  ['public.spell']
);
assert.doesNotMatch(
  releaseImplementation,
  /\b(?:insert\s+into|update\s+\S+\s+set|delete\s+from|grant|revoke|alter|create|execute)\b/i
);
const replaceSpec = (sql, proposed) => {
  const [before, , after] = splitSpec(sql);
  const literal = JSON.stringify(proposed);
  assert.equal(literal.includes(delimiter), false);
  return before + delimiter + literal + delimiter + after;
};
const pathGet = (row, path) => path.reduce((value, key) => value?.[key], row);
const pathSet = (row, path, value) => {
  const parent = path.slice(0, -1).reduce((node, key) => node[key], row);
  parent[path.at(-1)] = value;
};
const occurrences = (text, href) => text.split('(' + href + ')').length - 1;
const rows = [...spec.prior_rows, ...spec.rows];
const priorUuidSet = new Set(spec.prior_rows.map((row) => row.uuid));
const newUuidSet = new Set(spec.rows.map((row) => row.uuid));
for (const binding of spec.bindings) {
  const row = rows.find((candidate) => candidate.uuid === binding.owner_uuid);
  assert.equal(occurrences(pathGet(row, binding.path), binding.href), binding.occurrences);
}
// Independent full-row expectation, not a replacement for the actual SQL release query.
const expectedRows = (proposed, identities) => {
  const result = new Map([...proposed.prior_rows, ...proposed.rows].map((row) => [row.uuid, clone(row)]));
  for (const binding of proposed.bindings) {
    const row = result.get(binding.owner_uuid);
    const text = pathGet(row, binding.path);
    assert.equal(typeof text, 'string');
    assert.equal(occurrences(text, binding.href), binding.occurrences);
    const target = identities.get(binding.target_uuid);
    assert.ok(Number.isSafeInteger(target) && target > 0);
    pathSet(row, binding.path, text.replaceAll('(' + binding.href + ')', '(link_spell_' + target + ')'));
  }
  return result;
};
const insertRow = (row, idExpression = 'ctx.temporaryId') => {
  const columns = Object.keys(row);
  return (ctx) =>
    `insert into public.spell(id,${columns.map((key) => '"' + key + '"').join(',')}) select ${idExpression === 'ctx.temporaryId' ? ctx.temporaryId : idExpression},${columns.map((key) => 'r."' + key + '"').join(',')} from jsonb_populate_record(null::public.spell,${json(row)}) r;`;
};
const queue =
  (type, refId, data, source = 900, status = { state: 'PENDING' }) =>
  (ctx) => {
    const id = typeof refId === 'function' ? refId(ctx) : refId;
    const payload = typeof data === 'function' ? data(ctx) : data;
    return `insert into public.content_update(id,user_id,type,ref_id,content_source_id,action,data,upvotes,downvotes,status) values(${ctx.proposalId},${quote(ctx.userId)}::uuid,${quote(type)},${id},${source},'CREATE',${json(payload)},'{}','{}',${json(status)});`;
  };
const controlledDelete = (table, id) =>
  `set local session_replication_role=replica; delete from public.${table} where id=${id}; set local session_replication_role=origin;`;
const prereq = /Tech Core general spell prerequisites differ or have a pending curator submission/;
const partial = /Tech Core general spells are partially present or differ from the reviewed insert/;
const controls = [];
const add = (phase, name, setup, pattern = prereq, extra = {}) =>
  controls.push({ phase, name, setup, pattern, ...extra });
const first = spec.rows[0];
add('before-prior', 'requires-six-introductory-spells', '');
add('before', 'partial-exact-row', insertRow(first), partial);
add(
  'before',
  'partial-edited-row',
  insertRow({ ...first, description: first.description + ' __native_mutation__' }),
  partial
);
add(
  'before',
  'uuid-alias-other-source',
  insertRow({ ...first, name: '__native_alias__', content_source_id: 3, meta_data: {} }),
  partial
);
add(
  'before',
  'normalized-name-alias',
  insertRow({ ...first, uuid: first.uuid + 1, name: '  ' + first.name.toUpperCase() + '  ', meta_data: {} }),
  partial
);
add(
  'before',
  'global-normalized-citation-alias',
  insertRow({
    ...first,
    uuid: first.uuid + 1,
    name: '__native_alias__',
    content_source_id: 3,
    meta_data: { source: { url: '  ' + first.meta_data.source.url.toUpperCase() + '  ' } },
  }),
  partial
);
add(
  'before',
  'duplicate-identity-aliases',
  (ctx) =>
    insertRow(first)(ctx) + '\n' + insertRow({ ...first, uuid: first.uuid + 1 }, String(ctx.temporaryId + 1))(ctx),
  partial
);
for (const row of spec.prior_rows) {
  add('before', 'missing-prior-' + row.name, `delete from public.spell where uuid=${row.uuid};`);
  add(
    'before',
    'changed-prior-' + row.name,
    `update public.spell set description=description||' __native_mutation__' where uuid=${row.uuid};`
  );
}
add('before', 'prior-alias-collision', insertRow({ ...spec.prior_rows[0], uuid: spec.prior_rows[0].uuid + 1 }));
const refsForMatrix =
  matrix === 'exhaustive'
    ? spec.references
    : spec.references.filter(
        ({ table, row }) =>
          (table === 'trait' && row.id === 4506) ||
          (table === 'ability_block' && row.id === 19611) ||
          (table === 'item' && row.id === 9252)
      );
for (const { table, row } of refsForMatrix) {
  add(
    'before',
    `changed-reference-${table}-${row.id}`,
    `update public.${table} set description=coalesce(description,'')||' __native_mutation__' where id=${row.id};`
  );
  add('before', `missing-reference-${table}-${row.id}`, controlledDelete(table, row.id), prereq, {
    fixture_admin_absence_setup: true,
  });
}
add('before', 'reference-uuid-drift', 'update public.trait set uuid=uuid+1 where id=4506;');
add(
  'before',
  'reference-nested-metadata-drift',
  'update public.item set meta_data=meta_data||\'{"__native_mutation__":true}\'::jsonb where id=9252;'
);
add(
  'before',
  'tech-4506-creature-flag-not-relaxed',
  "update public.trait set meta_data=jsonb_set(meta_data,'{creature_trait}','true',true) where id=4506;"
);
for (const source of spec.sources) {
  add(
    'before',
    'unpublished-source-' + source.id,
    `update public.content_source set is_published=false where id=${source.id};`
  );
  if (matrix === 'exhaustive') {
    add('before', 'missing-source-' + source.id, controlledDelete('content_source', source.id), prereq, {
      fixture_admin_absence_setup: true,
    });
    for (const [field, value] of [
      ['name', quote(source.name + ' __native_mutation__')],
      ['url', quote((source.url ?? '') + '__native_mutation__')],
      ['"group"', quote(source.group + '__native_mutation__')],
      ['required_content_sources', 'array[900]::bigint[]'],
      ['require_key', 'true'],
      ['deprecated', 'true'],
      ['user_id', 'OWNED_USER'],
    ])
      add(
        'before',
        `changed-source-${source.id}-${field.replaceAll('"', '')}`,
        (ctx) =>
          `update public.content_source set ${field}=${value === 'OWNED_USER' ? quote(ctx.userId) + '::uuid' : value} where id=${source.id};`
      );
  }
}
add(
  'before',
  'source-900-null-dependency-not-relaxed',
  "update public.content_source set required_content_sources='{}'::bigint[] where id=900;"
);
const pendingRows = matrix === 'exhaustive' ? rows : [spec.prior_rows[0], first];
for (const row of pendingRows) {
  const label = (priorUuidSet.has(row.uuid) ? 'prior-' : 'new-') + row.name;
  add('before', 'pending-uuid-' + label, queue('spell', 0, { uuid: row.uuid }));
  add('before', 'pending-name-top-source-' + label, queue('spell', 0, { name: '  ' + row.name.toUpperCase() + '  ' }));
  add(
    'before',
    'pending-name-nested-source-' + label,
    queue('spell', 0, { name: row.name, content_source_id: 900 }, 3)
  );
  add(
    'before',
    'pending-global-citation-' + label,
    queue('spell', 0, { meta_data: { source: { url: '  ' + row.meta_data.source.url.toUpperCase() + '  ' } } }, 3)
  );
}
for (const [name, status] of [
  ['unknown', { state: 'UNREVIEWED' }],
  ['missing', {}],
  ['null-state', { state: null }],
  ['null-status', null],
]) {
  add('before', 'pending-state-' + name, queue('spell', 0, { uuid: first.uuid }, 900, status));
}
for (const { table, row } of refsForMatrix) {
  const types = [...new Set([table, table.replaceAll('_', '-'), row.type].filter(Boolean))];
  for (const type of types) {
    add('before', `pending-reference-refid-${type}-${row.id}`, queue(type, row.id, {}, row.content_source_id));
    if (matrix === 'exhaustive')
      add('before', `pending-reference-dataid-${type}-${row.id}`, queue(type, 0, { id: row.id }, 3));
  }
  if (row.uuid != null)
    add('before', `pending-reference-uuid-${table}-${row.id}`, queue(table, 0, { uuid: row.uuid }, 3));
  if (matrix === 'exhaustive') {
    add(
      'before',
      `pending-reference-name-top-source-${table}-${row.id}`,
      queue(table, 0, { name: '  ' + row.name.toUpperCase() + '  ' }, row.content_source_id)
    );
    add(
      'before',
      `pending-reference-name-nested-source-${table}-${row.id}`,
      queue(
        table,
        0,
        { name: row.name, content_source_id: row.content_source_id },
        row.content_source_id === 900 ? 3 : 900
      )
    );
    if (row.meta_data?.source?.url?.trim())
      add(
        'before',
        `pending-reference-citation-${table}-${row.id}`,
        queue(table, 0, { meta_data: { source: { url: '  ' + row.meta_data.source.url.toUpperCase() + '  ' } } }, 3)
      );
  }
}
for (const source of spec.sources) {
  add('before', 'pending-source-refid-' + source.id, queue('content-source', source.id, {}));
  if (matrix === 'exhaustive') {
    add('before', 'pending-source-dataid-' + source.id, queue('content_source', 0, { id: source.id }));
    add(
      'before',
      'pending-source-name-' + source.id,
      queue('content_source', 0, { name: '  ' + source.name.toUpperCase() + '  ' })
    );
  }
}
add(
  'before',
  'allocation-nonpositive',
  'alter sequence public.spell_id_seq minvalue 0 start with 0 restart with 0;',
  /Tech Core general spell identity must be positive and unused/,
  { transactional_sequence_restart: true }
);
add(
  'before',
  'allocation-occupied',
  (ctx) => `alter sequence public.spell_id_seq restart with ${ctx.priorIds.values().next().value};`,
  /Tech Core general spell identity must be positive and unused/,
  { transactional_sequence_restart: true }
);
add(
  'before',
  'allocation-duplicate',
  (ctx) =>
    `alter sequence public.spell_id_seq minvalue ${ctx.temporaryId + 100000000} maxvalue ${ctx.temporaryId + 100000001} start with ${ctx.temporaryId + 100000000} restart with ${ctx.temporaryId + 100000000} cycle;`,
  /Tech Core general spell identity allocation must be distinct/,
  { transactional_sequence_restart: true }
);

// Variant payloads exercise the same SQL implementation, retaining all prerequisite guards.
const bindingVariant = (change) => {
  const proposed = clone(spec);
  change(proposed);
  assert.deepEqual(proposed.references, spec.references);
  assert.deepEqual(proposed.sources, spec.sources);
  assert.deepEqual(proposed.prior_rows, spec.prior_rows);
  return proposed;
};
for (const [name, change] of [
  [
    'missing-path',
    (p) => {
      p.bindings[1].path = ['__missing_path__'];
    },
  ],
  [
    'zero-occurrence',
    (p) => {
      p.bindings[1].occurrences = 0;
    },
  ],
  [
    'too-many-occurrences',
    (p) => {
      p.bindings[1].occurrences += 1;
    },
  ],
  [
    'duplicate-binding',
    (p) => {
      p.bindings[2] = clone(p.bindings[1]);
    },
  ],
])
  add('before', 'binding-' + name, '', prereq, { variant: bindingVariant(change) });
add(
  'before',
  'binding-target-outside-allocation-map',
  '',
  /Tech Core general spell whole-reference occurrence or target differs/,
  {
    variant: bindingVariant((p) => {
      p.bindings[1].target_uuid = 999999;
    }),
    expected_sequence_advances: 76,
  }
);
add('before', 'binding-unresolved-token', '', /Tech Core general spell contains an unresolved reference/, {
  variant: bindingVariant((p) => {
    p.rows[0].description += ' @@WGTCREF999@@';
  }),
  expected_sequence_advances: 76,
});

const postRows =
  matrix === 'exhaustive' ? spec.rows : [first, spec.rows.find((row) => row.name === 'Instant Messaging')];
for (const row of postRows) {
  add(
    'after',
    'changed-imported-description-' + row.name,
    `update public.spell set description=description||' __native_mutation__' where uuid=${row.uuid};`,
    partial
  );
  add('after', 'missing-imported-' + row.name, `delete from public.spell where uuid=${row.uuid};`, partial);
}
for (const [field, value] of [
  ['traditions', "array['divine']::varchar[]"],
  ['traits', 'array[]::bigint[]'],
  ['availability', quote('__native_mutation__')],
  ['heightened', '\'{"data":{},"text":[{"amount":"(+1)","text":"__native_mutation__"}]}\'::json'],
  ['meta_data', 'meta_data||\'{"__native_mutation__":true}\'::jsonb'],
])
  add(
    'after',
    'changed-imported-field-' + field,
    `update public.spell set ${field}=${value} where uuid=${first.uuid};`,
    partial
  );
for (const row of pendingRows) {
  add(
    'after',
    'pending-actual-refid-' + row.name,
    queue('spell', (ctx) => ctx.identities.get(row.uuid), {})
  );
  add(
    'after',
    'pending-actual-dataid-' + row.name,
    queue('spell', 0, (ctx) => ({ id: ctx.identities.get(row.uuid) }))
  );
}
for (const [name, status] of [
  ['approved', { state: ' APPROVED ' }],
  ['rejected', { state: 'rejected' }],
]) {
  add(
    'after',
    'closed-curator-' + name + '-does-not-block',
    queue('spell', 0, { uuid: first.uuid }, 900, status),
    null,
    { accepted_replay: true }
  );
}

const synthetic = bindingVariant((p) => {
  for (const binding of p.bindings.slice(1)) {
    const row = p.rows.find((candidate) => candidate.uuid === binding.owner_uuid);
    pathSet(
      row,
      binding.path,
      pathGet(row, binding.path).replaceAll('(' + binding.href + ')', '(https://example.invalid/native-control)')
    );
  }
  const owner = p.rows[0];
  const targets = p.rows.filter((row) => row.name > owner.name).slice(0, 7);
  assert.equal(targets.length, 7);
  owner.description =
    '[a](link_spell_123) [again](link_spell_123) [b](link_spell_1234) [c](link_spell_12340) [unbound prefix](link_spell_12345)';
  owner.heightened = { data: {}, text: [{ amount: '(+1)', text: '[nested](link_spell_223)' }] };
  owner.requirements = '[requirement](link_spell_323)';
  owner.trigger = '[trigger](link_spell_423)';
  owner.cost = '[cost](link_spell_523)';
  const definitions = [
    [['description'], 'link_spell_123', 2],
    [['description'], 'link_spell_1234', 1],
    [['description'], 'link_spell_12340', 1],
    [['heightened', 'text', '0', 'text'], 'link_spell_223', 1],
    [['requirements'], 'link_spell_323', 1],
    [['trigger'], 'link_spell_423', 1],
    [['cost'], 'link_spell_523', 1],
  ];
  p.bindings = [
    p.bindings[0],
    ...definitions.map(([path, href, count], i) => ({
      owner_uuid: owner.uuid,
      target_uuid: targets[i].uuid,
      path,
      href,
      occurrences: count,
    })),
  ];
});
assert.equal(controls.length, new Set(controls.map((control) => control.phase + ':' + control.name)).size);
const plan = {
  schema: 'wg-tech-core-general-native-plan-v1',
  generated_at: new Date().toISOString(),
  matrix,
  native_execution_requested: execute,
  executed_native: false,
  counts: {
    new_spells: 76,
    prior_spells: 6,
    references: 92,
    sources: 7,
    reviewed_bindings: 8,
    binding_occurrences: 9,
    rejection_controls: controls.filter((c) => !c.accepted_replay).length,
    accepted_queue_controls: 2,
    before_prerequisite: controls.filter((c) => c.phase === 'before-prior').length,
    before_import: controls.filter((c) => c.phase === 'before').length,
    after_import: controls.filter((c) => c.phase === 'after').length,
  },
  guards: { source900_required_content_sources: null, tech4506_creature_trait: false },
  shared_validator_sha256: hash(sharedQuery),
  spec_hashes: {
    canonical_compact_json_sha256: hash(JSON.stringify(spec)),
    embedded_literal_sha256: hash(splitSpec(migration)[1]),
    embedded_literal_bytes: Buffer.byteLength(splitSpec(migration)[1]),
    physical_migration_sha256: hash(migration),
    physical_release_sha256: hash(release),
  },
  access_review: {
    inline_do_block: true,
    shared_persisted_database_function: false,
    security_definer: false,
    roles_grants_policies_or_rls_changes: false,
    write_target: 'public.spell INSERT only',
    actual_queue_source_reference_guards_retained: true,
    fixture_only_admin_absence_setup:
      'Negative missing-row cases briefly use SET LOCAL session_replication_role inside rollback-only owned transactions; normal mode is restored before the unchanged migration executes. This setup is not migration SQL.',
  },
  inputs: [...inputs].map(([path, text]) => ({ path, sha256: hash(text), bytes: Buffer.byteLength(text) })),
  controls: controls.map(({ name, phase, pattern, variant, setup, ...rest }) => ({
    name,
    phase,
    expected_exception: pattern?.source ?? null,
    variant_payload: Boolean(variant),
    ...rest,
  })),
  fixed_success_controls: [
    'six-prerequisite-import-and-self-link',
    'six-release-read-only-and-replay',
    'multiple-targets-repeated-whole-hrefs-prefix-and-nested-header-bindings',
    'late-failure-atomic-rollback',
    'actual-76-import-exact-bound-full-rows',
    'all-existing-binary-rows-auth-saved-queue-schema-roles-preserved',
    'release-read-only',
    'exact-replay-without-sequence-consumption',
    'captured-inputs-unchanged',
    'owned-resources-absent-after-cleanup',
  ],
  limitation:
    'Plan construction is not PostgreSQL or browser execution. Focused mode is representative; exhaustive mode explicitly selects a finite matrix totaling 1,555 rejections and is nondefault. Native fixture intentionally disables content triggers. Execution affects only its own uniquely identified disposable resources, never production or unrelated containers.',
};
await mkdir(output, { recursive: true });
await writeFile(resolve(output, 'plan.json'), JSON.stringify(plan, null, 2) + '\n', { mode: 0o600 });
if (!execute) {
  // Self-test the independent binder with deliberately unrelated identities, never stored in SQL.
  const identities = new Map(rows.map((row, index) => [row.uuid, 700000001 + index]));
  const expected = expectedRows(spec, identities);
  assert.equal(expected.size, 82);
  for (const row of expected.values()) assert.doesNotMatch(JSON.stringify(row), /\{\{allocated:|@@WGTCREF/);
  const syntheticExpected = expectedRows(synthetic, identities).get(first.uuid);
  assert.ok(syntheticExpected.description.includes('(link_spell_12345)'));
  assert.equal(syntheticExpected.description.includes('(link_spell_123)'), false);
  assert.equal(syntheticExpected.description.includes('(link_spell_1234)'), false);
  assert.ok(syntheticExpected.heightened.text[0].text.includes('(link_spell_'));
  const invalid = clone(spec);
  invalid.bindings[1].occurrences += 1;
  assert.throws(() => expectedRows(invalid, identities), assert.AssertionError);
  const ctx = {
    userId: '00000000-0000-4000-8000-000000000001',
    proposalId: 700000001,
    temporaryId: 700000002,
    priorIds: new Map(spec.prior_rows.map((row) => [row.uuid, identities.get(row.uuid)])),
    identities,
  };
  for (const control of controls) {
    const sql = typeof control.setup === 'function' ? control.setup(ctx) : control.setup;
    assert.equal(typeof sql, 'string');
    assert.doesNotMatch(sql, /\bNaN\b|\bundefined\b/);
    if (control.variant)
      assert.deepEqual(JSON.parse(splitSpec(replaceSpec(migration, control.variant))[1]), control.variant);
  }
  console.log(
    JSON.stringify({
      plan_only: true,
      native_started: false,
      matrix,
      counts: plan.counts,
      shared_validator_exact: true,
      binder_self_test: true,
      output: resolve(output, 'plan.json'),
    })
  );
  process.exit(0);
}

const receipt = {
  schema: 'wg-tech-core-general-native-receipt-v1',
  passed: false,
  matrix,
  plan_sha256: hash(JSON.stringify(plan)),
  spec_hashes: plan.spec_hashes,
  shared_validator_sha256: plan.shared_validator_sha256,
  access_review: plan.access_review,
  controls: [],
  inputs: plan.inputs,
};
const stop = createNativeStopController({ receipt });
const fixture = createOwnedNativeFixture({
  root,
  receipt,
  throwIfRequested: stop.throwIfRequested,
  bootstrapRead: (path) => {
    const captured = inputs.get(resolve(root, path));
    assert.equal(typeof captured, 'string');
    return captured;
  },
  log: async (value) => {
    if (value.kind === 'owned-container-final-logs') (receipt.owned_container_final_logs ??= []).push(value);
    process.stdout.write(JSON.stringify(value) + '\n');
  },
});
const checked = (result, name, status = 0) => {
  assert.equal(result.error == null, true, name + ': no transport error');
  assert.equal(result.signal, null, name + ': no signal');
  assert.equal(result.status, status, name + ': ' + fixture.redact(result.stderr));
  return result;
};
const stage = async (name, sql) => {
  await stop.checkpoint(name);
  return checked(fixture.sql(sql, true), name).stdout;
};
const normalized = (snapshot) => ({ ...snapshot, sha256: undefined });
const sequenceAdvanceOnly = (after, before, advances) => {
  const key = 'public.spell_id_seq';
  const oldSequence = before.sequences[key];
  assert.equal(BigInt(after.sequences[key].last_value), BigInt(oldSequence.last_value) + BigInt(advances));
  assert.deepEqual({ ...after.sequences[key], last_value: oldSequence.last_value }, oldSequence);
  assert.deepEqual(
    normalized({ ...after, sequences: { ...after.sequences, [key]: oldSequence } }),
    normalized(before),
    'Only the expected nontransactional spell identity consumption differs'
  );
};
const uuidList = (proposed) => [...proposed.prior_rows, ...proposed.rows].map((row) => row.uuid).join(',');
const readRows = (proposed) =>
  fixture.queryJson(
    `select jsonb_agg(jsonb_build_object('id',id,'uuid',uuid,'row',to_jsonb(r)-'id'-'created_at'-'updated_at'-'search_tsv') order by id) from public.spell r where uuid in(${uuidList(proposed)});`
  ) ?? [];
const assertFullReadback = (proposed, actual) => {
  assert.equal(actual.length, 82);
  assert.equal(new Set(actual.map((row) => row.id)).size, 82);
  const identities = new Map(actual.map((row) => [row.uuid, row.id]));
  const expected = expectedRows(proposed, identities);
  for (const row of actual) {
    assert.ok(Number.isSafeInteger(row.id) && row.id > 0);
    assert.deepEqual(row.row, expected.get(row.uuid), 'Complete bound row: ' + row.row.name);
    assert.doesNotMatch(JSON.stringify(row.row), /@@WGTCREF|\{\{allocated:/);
  }
  return identities;
};
const runControl = async (control, ctx) => {
  await stop.checkpoint(control.name);
  fixture.assertOwned();
  const before = fixture.snapshot();
  const sql = control.variant ? replaceSpec(migration, control.variant) : migration;
  const setup = typeof control.setup === 'function' ? control.setup(ctx) : control.setup;
  const result = checked(
    fixture.sql('BEGIN;\n' + setup + '\n' + sql + '\nROLLBACK;', true),
    control.name,
    control.accepted_replay ? 0 : 3
  );
  if (!control.accepted_replay) assert.match(result.stderr, control.pattern, control.name);
  if (control.expected_sequence_advances)
    sequenceAdvanceOnly(fixture.snapshot(), before, control.expected_sequence_advances);
  else assert.deepEqual(fixture.snapshot(), before, control.name + ': full fixture preserved');
  receipt.controls.push({
    name: control.name,
    passed: true,
    rejected: !control.accepted_replay,
    whole_tuples_preserved: true,
    sequence_advances: control.expected_sequence_advances ?? 0,
    transactional_sequence_restart: control.transactional_sequence_restart ?? false,
  });
};
const assertImportDelta = (before, after, count) => {
  assert.equal(
    Number(after.tuples['public.spell'].split(':')[0]),
    Number(before.tuples['public.spell'].split(':')[0]) + count
  );
  assert.equal(
    BigInt(after.sequences['public.spell_id_seq'].last_value),
    BigInt(before.sequences['public.spell_id_seq'].last_value) + BigInt(count)
  );
  assert.deepEqual(
    normalized(after),
    normalized({
      ...before,
      tuples: { ...before.tuples, 'public.spell': after.tuples['public.spell'] },
      sequences: { ...before.sequences, 'public.spell_id_seq': after.sequences['public.spell_id_seq'] },
    })
  );
};
try {
  await fixture.initialize(stage);
  const userId = fixture.signup();
  fixture.savedCopyFixture(userId);
  await fixture.enableEngineTransport();
  const ctx = {
    userId,
    proposalId: fixture.reserveProposalId(),
    temporaryId: Number(fixture.query('select max(id)+1000000 from public.spell;')),
  };
  assert.ok(Number.isSafeInteger(ctx.temporaryId));
  assert.equal(
    fixture.query(`select count(*) from public.spell where uuid in(${uuidList(spec)});`),
    '0',
    'Current fixture starts without either batch'
  );
  for (const control of controls.filter((c) => c.phase === 'before-prior')) await runControl(control, ctx);
  const introBefore = fixture.snapshot();
  await stage('six-prerequisite-import', introMigration);
  const introAfter = fixture.snapshot();
  assertImportDelta(introBefore, introAfter, 6);
  const priorActual = readRows({ prior_rows: [], rows: spec.prior_rows });
  assert.equal(priorActual.length, 6);
  ctx.priorIds = new Map(priorActual.map((row) => [row.uuid, row.id]));
  const boundPrior = expectedRows(
    {
      prior_rows: spec.prior_rows,
      rows: [],
      bindings: spec.bindings.filter((binding) => priorUuidSet.has(binding.owner_uuid)),
    },
    ctx.priorIds
  );
  for (const actual of priorActual) assert.deepEqual(actual.row, boundPrior.get(actual.uuid));
  assert.equal(
    (await stage('six-release-read-only', 'BEGIN READ ONLY;\n' + introRelease + '\nROLLBACK;')).trim(),
    'tech-core-introductory-spells|t'
  );
  await stage('six-exact-replay', introMigration);
  assert.deepEqual(fixture.snapshot(), introAfter);
  receipt.controls.push({
    name: 'six-prerequisite-import-full-rows-runtime-self-link-read-only-release-and-replay',
    passed: true,
    sequence_allocations: 6,
  });
  for (const control of controls.filter((c) => c.phase === 'before')) await runControl(control, ctx);

  const syntheticBefore = fixture.snapshot();
  const syntheticProbe = `select jsonb_agg(jsonb_build_object('id',id,'uuid',uuid,'row',to_jsonb(r)-'id'-'created_at'-'updated_at'-'search_tsv') order by id)::text from public.spell r where uuid in(${uuidList(synthetic)});`;
  const syntheticResult = await stage(
    'synthetic-multiple-whole-target-binding',
    'BEGIN;\n' +
      replaceSpec(migration, synthetic) +
      '\n' +
      syntheticProbe +
      '\n' +
      replaceSpec(release, synthetic) +
      '\nROLLBACK;'
  );
  const syntheticLines = syntheticResult.trim().split('\n');
  assert.equal(syntheticLines.at(-1), 'tech-core-general-spells|t');
  const syntheticActual = JSON.parse(syntheticLines.find((line) => line.startsWith('[{')));
  assertFullReadback(synthetic, syntheticActual);
  const actualOwner = syntheticActual.find((row) => row.uuid === first.uuid).row;
  assert.ok(
    actualOwner.description.includes('(link_spell_12345)'),
    'Unbound whole href with a shared prefix is unchanged'
  );
  sequenceAdvanceOnly(fixture.snapshot(), syntheticBefore, 76);
  receipt.controls.push({
    name: 'synthetic-cross-target-repeated-whole-hrefs-prefix-nested-heightened-and-header-bindings',
    passed: true,
    targets: 7,
    binding_occurrences: 8,
    expected_rollback_sequence_consumption: 76,
  });

  const lateBefore = fixture.snapshot();
  const late = checked(
    fixture.sql(
      'BEGIN;\n' +
        migration +
        "\ndo $$ begin raise exception 'Tech Core general deliberate late failure'; end $$;\nCOMMIT;",
      true
    ),
    'late-failure',
    3
  );
  assert.match(late.stderr, /Tech Core general deliberate late failure/);
  sequenceAdvanceOnly(fixture.snapshot(), lateBefore, 76);
  receipt.controls.push({
    name: 'late-failure-atomic-rollback',
    passed: true,
    all_tuples_preserved: true,
    expected_sequence_consumption: 76,
  });
  const before = fixture.snapshot();
  const existingQuery = `select count(*)||':'||md5(coalesce(string_agg(md5(pg_catalog.record_send(r)),'' order by md5(pg_catalog.record_send(r))),'')) from public.spell r where uuid is null or uuid not in(${spec.rows.map((row) => row.uuid).join(',')});`;
  const existingBefore = fixture.query(existingQuery);
  assert.equal(existingBefore, before.tuples['public.spell']);
  await stage('actual-76-import', migration);
  const after = fixture.snapshot();
  assertImportDelta(before, after, 76);
  assert.equal(
    fixture.query(existingQuery),
    existingBefore,
    'Every pre-existing binary spell tuple, including six prerequisites, is unchanged'
  );
  const actual = readRows(spec);
  ctx.identities = assertFullReadback(spec, actual);
  const newIds = spec.rows.map((row) => ctx.identities.get(row.uuid));
  assert.equal(new Set(newIds).size, 76);
  const sortedUuids = fixture.queryJson(
    `select jsonb_agg(uuid order by name) from public.spell where uuid in(${spec.rows.map((row) => row.uuid).join(',')});`
  );
  assert.equal(sortedUuids.length, 76);
  for (let i = 1; i < sortedUuids.length; i++)
    assert.equal(
      ctx.identities.get(sortedUuids[i]),
      ctx.identities.get(sortedUuids[i - 1]) + 1,
      'Real sequence allocation in the actual PostgreSQL name collation'
    );
  for (const binding of spec.bindings) {
    const owner = actual.find((row) => row.uuid === binding.owner_uuid).row;
    const boundHref = 'link_spell_' + ctx.identities.get(binding.target_uuid);
    assert.equal(occurrences(pathGet(owner, binding.path), boundHref), binding.occurrences);
    assert.equal(occurrences(pathGet(owner, binding.path), binding.href), 0);
  }
  assert.equal(
    (await stage('general-release-read-only', 'BEGIN READ ONLY;\n' + release + '\nROLLBACK;')).trim(),
    'tech-core-general-spells|t'
  );
  assert.deepEqual(fixture.snapshot(), after);
  await stage('general-exact-replay', migration);
  assert.deepEqual(
    fixture.snapshot(),
    after,
    'Replay leaves all identities, timestamps, tuples, schema and roles unchanged'
  );
  receipt.controls.push({
    name: 'actual-76-import-exact-readback-all-nine-binding-occurrences-read-only-release-and-idempotence',
    passed: true,
    new_rows: 76,
    existing_binary_rows_preserved: true,
    only_spell_tuple_and_sequence_delta: true,
    content_triggers_disabled_by_existing_native_fixture: true,
  });
  for (const control of controls.filter((c) => c.phase === 'after')) await runControl(control, ctx);
  for (const [path, captured] of inputs)
    assert.equal(await readFile(path, 'utf8'), captured, 'Captured input bytes unchanged: ' + path);
  receipt.inputs_unchanged = true;
  receipt.finite_matrix_completed = matrix === 'exhaustive';
  receipt.passed = true;
} catch (error) {
  receipt.failure = { name: error.name, message: fixture.redact(error.message) };
  process.exitCode = error.exitCode ?? 1;
} finally {
  try {
    await fixture.cleanup();
  } catch (error) {
    receipt.cleanup_failure = fixture.redact(error.message);
    receipt.passed = false;
    process.exitCode = 1;
  }
  try {
    const stopped = await finalizeNativeStopReceipt({ receipt, stop });
    if (stopped !== null) process.exitCode = stopped;
    await writeFile(resolve(output, 'receipt.json'), JSON.stringify(receipt, null, 2) + '\n', { mode: 0o600 });
    console.log(
      JSON.stringify({
        passed: receipt.passed,
        native_executed: true,
        matrix,
        finite_matrix_completed: receipt.finite_matrix_completed ?? false,
        controls: receipt.controls.length,
        output: resolve(output, 'receipt.json'),
      })
    );
  } finally {
    stop.close();
  }
}
