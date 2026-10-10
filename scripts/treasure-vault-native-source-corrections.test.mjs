import { originalSharedAncestryBody, sharedSpecFromBody, sharedAncestryUpgrade, wrapSharedUpgrade, SHARED_PREDECESSOR_SHA256, SHARED_TERMINAL_SHA256 } from './treasure-vault-native-shared-ancestries.mjs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { PREVIOUS_TERMINAL_BODY_SHA256, SOURCE_CORRECTION_TERMINAL_BODY_SHA256, SOURCE_CORRECTION_CONTROL_NAMES, sourceCorrectionRows, sourceCorrectionCtes, sourceCorrectionProjection, upgradeSourceCorrectionBody, terminalSourceCorrectionUpgrade, createNativeSourceCorrectionControls, catalogCompatibilityRows, catalogCompatibilityCtes, catalogCompatibilityProjection, upgradeCatalogCompatibilityBody, CATALOG_COMPATIBILITY_TERMINAL_BODY_SHA256, terminalCatalogCompatibilityUpgrade, wrapSourceCorrectionUpgrade } from './treasure-vault-native-source-corrections.mjs';
import { extractReviewedTerminalHelper, extractReviewedDisplaySourceWrapper, terminalFunctionState, APPROVED_CANDIDATES } from './treasure-vault-native-inputs.mjs';

const sha = value => createHash('sha256').update(value).digest('hex');
const helperSql = await readFile(new URL('../supabase/migrations/20260927245900_treasure_vault_terminal_status.sql', import.meta.url), 'utf8');
const actualBody = helperSql.split('$terminal_definition$')[1].split('$$')[1];
const sharedSpec = sharedSpecFromBody(actualBody);
const body = originalSharedAncestryBody(actualBody, sharedSpec);
const displaySql = await readFile(new URL('../supabase/migrations/20261002101000_treasure_vault_complete_display.sql', import.meta.url), 'utf8');
const patches = sourceCorrectionRows(JSON.parse(displaySql.split('$display101$')[1]));
const catalogPatches = catalogCompatibilityRows(JSON.parse(displaySql.split('$display101$')[1]));
const helperReleaseSql = await readFile(new URL('../supabase/release/treasure-vault-terminal-status.sql', import.meta.url), 'utf8');
const displayReleaseSql = await readFile(new URL('../supabase/release/treasure-vault-complete-display.sql', import.meta.url), 'utf8');
const helper = extractReviewedTerminalHelper({ migrationSql: helperSql, releaseSql: helperReleaseSql });
const sourceBody = body.replace(catalogCompatibilityCtes(catalogPatches), '').replace(catalogCompatibilityProjection(), sourceCorrectionProjection());
const same = (left, right) => {
  try { assert.deepEqual(left, right); return true; } catch { return false; }
};

test('the independent Bagpipes pair changes only the exact top-level group', () => {
  assert.deepEqual(catalogPatches.map(patch => patch.id), [11728, 11730]);
  for (const { before, after } of catalogPatches) {
    assert.equal(before.group, 'WEAPON');
    assert.equal(after.group, 'GENERAL');
    assert.deepEqual({ ...after, group: before.group }, before);
    assert.equal(before.content_source_id, 16);
  }
  assert.match(catalogCompatibilityCtes(catalogPatches), /count\(\*\)=2 and bool_and/);
  assert.doesNotMatch(catalogCompatibilityCtes(catalogPatches), /update public\.|delete from|insert into/i);
});

test('the complete Bagpipes pair requires globally unique UUID matches without relaxing either full row', () => {
  const ctes = catalogCompatibilityCtes(catalogPatches);
  assert.match(ctes, /left join public\.item r on r\.uuid=\(p#>>'\{after,uuid\}'\)::bigint/);
  assert.match(ctes, /count\(\*\)=2 and bool_and\(r\.id is not null and \(\(to_jsonb\(r\)-'updated_at'-'search_tsv'\)\|\|jsonb_build_object\('uuid',r\.uuid::text\)\)=p->'after'\)/);
  assert.doesNotMatch(ctes, /left join public\.item r on r\.id=|r\.content_source_id\s*=/);
  assert.ok(sourceCorrectionCtes(patches).includes("left join public.item r on r.id=(p->>'id')::bigint"), 'The separate three-record correction mask remains unchanged');
  for (const id of [11728, 11730]) {
    assert.ok(SOURCE_CORRECTION_CONTROL_NAMES.includes(`catalog-duplicate-uuid-${id}:helper`));
    assert.ok(SOURCE_CORRECTION_CONTROL_NAMES.includes(`catalog-duplicate-uuid-${id}`));
  }
});

test('independent complete masks allow exactly four states and never partial members', () => {
  const accepted = [];
  for (let sourceMask = 0; sourceMask < 8; sourceMask++) for (let pairMask = 0; pairMask < 4; pairMask++) {
    const actual = [...patches.map((patch, index) => structuredClone(sourceMask & (1 << index) ? patch.after : patch.before)), ...catalogPatches.map((patch, index) => structuredClone(pairMask & (1 << index) ? patch.after : patch.before))];
    const saved = structuredClone(actual);
    const sourceComplete = actual.slice(0, 3).every((row, index) => same(row, patches[index].after));
    const pairComplete = actual.slice(3).every((row, index) => same(row, catalogPatches[index].after));
    const compared = [...(sourceComplete ? patches.map(patch => patch.before) : actual.slice(0, 3)), ...(pairComplete ? catalogPatches.map(patch => patch.before) : actual.slice(3))];
    const valid = compared.every((row, index) => same(row, [...patches, ...catalogPatches][index].before));
    assert.equal(valid, [0, 7].includes(sourceMask) && [0, 3].includes(pairMask));
    if (valid) accepted.push([sourceMask, pairMask]);
    assert.deepEqual(actual, saved);
  }
  assert.deepEqual(accepted, [[0, 0], [0, 3], [7, 0], [7, 3]]);
  for (const owner of [0, 1]) for (const field of ['name', 'uuid', 'content_source_id', 'created_at', 'description', 'operations', 'meta_data', 'group']) {
    const actual = catalogPatches.map(patch => structuredClone(patch.after));
    actual[owner][field] = field === 'meta_data' ? { ...actual[owner].meta_data, unreviewed: true } : 'unreviewed';
    assert.equal(actual.every((row, index) => same(row, catalogPatches[index].after)), false, `${owner}:${field} is not normalized`);
  }
});

test('catalog compatibility retains the complete source-correction and original proof bytes', () => {
  assert.equal(sha(body), CATALOG_COMPATIBILITY_TERMINAL_BODY_SHA256);
  assert.equal(sha(sourceBody), SOURCE_CORRECTION_TERMINAL_BODY_SHA256);
  assert.equal(upgradeCatalogCompatibilityBody(sourceBody, catalogPatches), body);
  assert.throws(() => upgradeCatalogCompatibilityBody(sourceBody + '\n', catalogPatches));
  assert.equal(body.split('$global_dual$')[1], sourceBody.split('$global_dual$')[1]);
});

test('the exact successors change only two table cells and the Major Fork attack leaves', () => {
  assert.deepEqual(patches.map(patch => patch.id), [11937, 11944, 12325]);
  for (const { id, before, after } of patches) {
    const restored = structuredClone(after);
    restored.description = before.description;
    if (id === 12325) {
      assert.deepEqual(after.meta_data.spellheart_casting, { dc: 29, attack: 19 });
      delete restored.meta_data.spellheart_casting.attack;
    } else {
      assert.equal(after.description, before.description.replace('| Conspirator or horned | [Poison](link_trait_1476) |', '| Conspirator or horned | Bludgeoning |'));
    }
    assert.deepEqual(restored, before);
  }
});

test('comparison-only successor canonicalization rejects every partially corrected combination', () => {
  for (let mask = 0; mask < 8; mask++) {
    const actual = patches.map((patch, index) => structuredClone(mask & (1 << index) ? patch.after : patch.before));
    const saved = structuredClone(actual);
    const corrected = actual.every((row, index) => same(row, patches[index].after));
    const compared = corrected ? patches.map(patch => patch.before) : actual;
    assert.equal(compared.every((row, index) => same(row, patches[index].before)), mask === 0 || mask === 7);
    assert.deepEqual(actual, saved, 'No actual row is mutated by a read-only comparison');
  }
  for (let owner = 0; owner < 3; owner++) {
    const actual = patches.map(patch => structuredClone(patch.after));
    actual[owner].meta_data.unreviewed = true;
    assert.equal(actual.every((row, index) => same(row, patches[index].after)), false);
  }
});

test('the proposed helper retains the exact original ledger and every other predicate byte', () => {
  assert.equal(sha(sourceBody), SOURCE_CORRECTION_TERMINAL_BODY_SHA256);
  const previous = sourceBody.replace(sourceCorrectionCtes(patches), '').replace(sourceCorrectionProjection(), "(to_jsonb(r)-'updated_at'-'search_tsv')||jsonb_build_object('uuid',r.uuid::text)");
  assert.equal(sha(previous), PREVIOUS_TERMINAL_BODY_SHA256);
  const next = upgradeSourceCorrectionBody(previous, patches);
  assert.equal(sha(next), SOURCE_CORRECTION_TERMINAL_BODY_SHA256);
  const restored = next.replace(sourceCorrectionCtes(patches), '').replace(sourceCorrectionProjection(), "(to_jsonb(r)-'updated_at'-'search_tsv')||jsonb_build_object('uuid',r.uuid::text)");
  assert.equal(restored, previous);
  assert.equal(next, sourceBody);
  assert.equal(next.split('$global_dual$')[1], previous.split('$global_dual$')[1]);
  assert.throws(() => upgradeSourceCorrectionBody(previous + '\n', patches));
  assert.match(sourceCorrectionCtes(patches), /count\(\*\)=3 and bool_and/);
});

test('the display compatibility wrapper preserves the exact original101 body and release predicates', () => {
  const extracted = extractReviewedDisplaySourceWrapper({ migrationSql: displaySql, releaseSql: displayReleaseSql, helper });
  assert.equal(sha(extracted.originalSql), APPROVED_CANDIDATES.display101.migration_sha256);
  assert.equal(sha(extracted.originalReleaseSql), APPROVED_CANDIDATES.display101.release_sha256);
  for (const [migrationSql, releaseSql] of [
    [displaySql.replace('return;', 'null;'), displayReleaseSql],
    [displaySql.replace('lock table public.content_update in share mode;', 'null;'), displayReleaseSql],
    [displaySql.replace(SHARED_TERMINAL_SHA256, PREVIOUS_TERMINAL_BODY_SHA256), displayReleaseSql],
    [displaySql, displayReleaseSql.replace('case when c.passed or b.passed then', 'case when true then')],
    [displaySql.replace('$display_original_source$', '$display_original_source$\n-- unreviewed\n'), displayReleaseSql],
  ]) assert.throws(() => extractReviewedDisplaySourceWrapper({ migrationSql, releaseSql, helper }));
});

test('the late upgrade is reproducible and accepts only the exact reviewed predecessor metadata', async () => {
  const actual = await readFile(new URL('../supabase/migrations/20261008105900_treasure_vault_terminal_source_corrections.sql', import.meta.url), 'utf8');
  const previousState = terminalFunctionState(PREVIOUS_TERMINAL_BODY_SHA256);
  const sourceState = terminalFunctionState(SOURCE_CORRECTION_TERMINAL_BODY_SHA256);
  const originalSql = terminalSourceCorrectionUpgrade({ state: sourceState, previousState, patches, signature: helper.signature });
  const originalReleaseSql = `-- Only inspect the exact source-corrected helper definition and unchanged grants.\nselect 'treasure-vault-terminal-source-corrections' as id,coalesce((${sourceState}),false) as passed;\n`;
  const oldState = terminalFunctionState(SHARED_PREDECESSOR_SHA256);
  const oldCatalog = terminalCatalogCompatibilityUpgrade({state:oldState,previousState,sourceState,sourcePatches:patches,patches:catalogPatches,signature:helper.signature});
  const upgrade = sharedAncestryUpgrade({spec:sharedSpec,previousState:oldState,state:helper.state,signature:helper.signature});
  assert.equal(actual, wrapSharedUpgrade(wrapSourceCorrectionUpgrade({originalSql,originalReleaseSql,state:oldState}).migration,oldCatalog+upgrade,helper.state));
  assert.equal(actual.split('$source_upgrade_original$')[1], originalSql, 'Original source upgrade body remains byte-identical');
  assert.throws(() => wrapSourceCorrectionUpgrade({ originalSql: originalSql + '\n', originalReleaseSql, state: helper.state }));
  assert.throws(() => wrapSourceCorrectionUpgrade({ originalSql, originalReleaseSql: originalReleaseSql + '\n', state: helper.state }));
  assert.ok(actual.includes(previousState));
  assert.match(actual, /corrected_body[\s\S]*source-correction helper successor differs/);
  assert.doesNotMatch(actual, /update public\.|delete from|insert into|grant |revoke /i);
});

test('the exact paired catalog upgrade is reproducible and does not write content or grants', async () => {
  const actual = await readFile(new URL('../supabase/migrations/20261008105800_treasure_vault_terminal_catalog_compatibility.sql', import.meta.url), 'utf8');
  const previousState = terminalFunctionState(PREVIOUS_TERMINAL_BODY_SHA256), sourceState = terminalFunctionState(SOURCE_CORRECTION_TERMINAL_BODY_SHA256);
  const oldState = terminalFunctionState(SHARED_PREDECESSOR_SHA256);
  const original = terminalCatalogCompatibilityUpgrade({state:oldState,previousState,sourceState,sourcePatches:patches,patches:catalogPatches,signature:helper.signature});
  const upgrade = sharedAncestryUpgrade({spec:sharedSpec,previousState:oldState,state:helper.state,signature:helper.signature});
  assert.equal(actual,wrapSharedUpgrade(original,upgrade,helper.state));
  assert.ok(actual.includes(previousState) && actual.includes(sourceState) && actual.includes(helper.state));
  assert.doesNotMatch(actual, /update public\.|delete from|insert into|grant |revoke /i);
});

test('native source controls are mandatory in routine CI and preserve scoped reporting', async () => {
  const safety = await readFile(new URL('./treasure-vault-native-safety.mjs', import.meta.url), 'utf8');
  assert.ok(SOURCE_CORRECTION_CONTROL_NAMES.length > 39);
  assert.equal(new Set(SOURCE_CORRECTION_CONTROL_NAMES).size, SOURCE_CORRECTION_CONTROL_NAMES.length);
  for (const invocation of ['await sourceCorrections.beforeUpgrade();','await sourceCorrections.beforeRepair();','sourceCorrections.afterRepair(captured);','await sourceCorrections.afterReplay();']) assert.ok(safety.includes(invocation));
  assert.ok(safety.includes('source.controls.map(row=>row.name), SOURCE_CORRECTION_CONTROL_NAMES'));
  const receipt = {}, forbidden = () => assert.fail('Construction cannot execute SQL or touch a container');
  createNativeSourceCorrectionControls({ inputs: { helper, sourceCorrections: { patches } }, fixture: { sql: forbidden, snapshot: forbidden }, receipt, userId: 'unused' });
  assert.equal(receipt.source_corrections.passed, false);
  assert.equal(receipt.source_corrections.native_executed, false);
  assert.deepEqual(receipt.source_corrections.controls, []);
});
