/** Complete release-check construction without database or provider access. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const PROPOSAL_SHA =
  "7d09a3abdaa491318b1d2cf0369ed38bac8cb81b9ca1eb733509b857280dc0e5";
export const ORIGINALS = {
  "supabase/release/tech-core-introductory-spells.sql":
    "77e72a8fca79b7317d3110a7f927a0a884164e575e843913e379c0f48ae8b7a7",
  "supabase/release/tech-core-general-spells.sql":
    "97c50a7cf4a529219ff96d86c755dc24c7aa9b287b15db8107bce3e681f3102e",
  "supabase/release/tech-core-general-spells-incarnate-compatibility.sql":
    "6f1e5f5d111bfc02c2dfe5058b62fb28d92197c733c179d687947a53447b7b6e",
  "supabase/release/requirements.json":
    "3114e79dda95e2b9916678f6bcc2bfcb8b84babb8a2357627c9553be333f4b08",
};
export const CITATIONS = {
  5225: {
    book: "Tech Core",
    page: "143",
    url: "https://2e.aonsrd.com/traits/349-junk",
  },
  5236: {
    book: "Tech Core",
    page: "179",
    url: "https://2e.aonsrd.com/traits/362-station",
  },
};
export const QUERY_FILES = {
  intro: "tech-core-introductory-spells-citation-compatibility.sql",
  general: "tech-core-general-spells-citation-compatibility.sql",
};
export const sha256 = (value) =>
  createHash("sha256").update(value).digest("hex");
export const stable = (row) =>
  Object.fromEntries(
    Object.entries(row).filter(
      ([key]) => !["updated_at", "search_tsv"].includes(key),
    ),
  );
export const literal = (value) => {
  const text = JSON.stringify(value);
  assert(!text.includes("$tc_citation_pairs$"));
  return "$tc_citation_pairs$" + text + "$tc_citation_pairs$::jsonb";
};
const norm = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase();
// Match JavaScript trim exactly, including Unicode blanks, without locale-dependent SQL classes.
export const NORMALIZATION_WHITESPACE = [
  9,
  10,
  11,
  12,
  13,
  32,
  160,
  5760,
  ...Array.from({ length: 11 }, (_, index) => 8192 + index),
  8232,
  8233,
  8239,
  8287,
  12288,
  65279,
];
const sqlWhitespace = NORMALIZATION_WHITESPACE.map(
  (value) => "\\" + value.toString(16).padStart(4, "0"),
).join("");
const trimSQL = (value) => `btrim(coalesce(${value},''),U&'${sqlWhitespace}')`;
const normalizedSQL = (value) => `lower(${trimSQL(value)})`;
const sources = (data) => [
  data?.content_source_id,
  data?.source_id,
  data?.source?.content_source_id,
  data?.source?.source_id,
  data?.source?.id,
  data?.meta_data?.content_source_id,
  data?.meta_data?.source?.content_source_id,
  data?.meta_data?.source?.source_id,
];
const knownNamespaces = [
  "trait",
  "spell",
  "item",
  "ability-block",
  "feat",
  "action",
  "class-feature",
  "physical-feature",
  "mode",
  "heritage",
  "sense",
  "ancestry",
  "archetype",
  "background",
  "class",
  "class-archetype",
  "creature",
  "language",
  "versatile-heritage",
  "content-source",
];

/** Pure model of ONLY the new outer guard, not an alternative to the complete SQL predicate. */
export function pendingCitationMatch(update, pair) {
  if (["approved", "rejected"].includes(norm(update.status?.state)))
    return false;
  const type = norm(update.type).replaceAll("_", "-");
  const qualified =
    String(update.content_source_id ?? "").trim() ===
      String(pair.before.content_source_id) ||
    sources(update.data).some(
      (value) =>
        String(value ?? "").trim() === String(pair.before.content_source_id),
    );
  if (type !== "trait" && !(qualified && !knownNamespaces.includes(type)))
    return false;
  const data = update.data ?? {};
  return (
    [update.ref_id, data.id, data.ref_id].some(
      (value) => String(value ?? "").trim() === String(pair.before.id),
    ) ||
    String(data.uuid ?? "").trim() === String(pair.before.uuid) ||
    (qualified && norm(data.name) === norm(pair.before.name)) ||
    norm(data.meta_data?.source?.url) === norm(pair.after.meta_data.source.url)
  );
}

/** Exact whole-row pair choice; Station may be absent only during the original introductory stage. */
export function citationState(rows, pairs, intro = false) {
  // Object field order is not significant for PostgreSQL JSONB. Normalize keys for this finite model.
  const canonical = (value) =>
    Array.isArray(value)
      ? value.map(canonical)
      : value && typeof value === "object"
        ? Object.fromEntries(
            Object.keys(value)
              .sort()
              .map((key) => [key, canonical(value[key])]),
          )
        : value;
  const equal = (a, b) =>
    a != null &&
    JSON.stringify(canonical(stable(a))) ===
      JSON.stringify(canonical(stable(b)));
  const original = pairs.every((pair) => {
    const actual = rows.find((row) => row.id === pair.before.id);
    return (
      equal(actual, pair.before) ||
      (intro && pair.before.id === 5236 && actual == null)
    );
  });
  const successor = pairs.every((pair) =>
    equal(
      rows.find((row) => row.id === pair.before.id),
      pair.after,
    ),
  );
  return { original, successor, accepted: original || successor };
}

export function citationAliasMatch(row, pair) {
  return (
    row.id !== pair.before.id &&
    (row.uuid === pair.before.uuid ||
      (row.content_source_id === pair.before.content_source_id &&
        norm(row.name) === norm(pair.before.name)) ||
      norm(row.meta_data?.source?.url) ===
        norm(pair.after.meta_data.source.url))
  );
}

function prefix(pairs, intro) {
  const refs = "jsonb_array_elements(spec)";
  const type = `replace(${normalizedSQL("u.type")},'_','-')`;
  const sourceList =
    "jsonb_build_array(u.data->>'content_source_id',u.data->>'source_id',u.data#>>'{source,content_source_id}',u.data#>>'{source,source_id}',u.data#>>'{source,id}',u.data#>>'{meta_data,content_source_id}',u.data#>>'{meta_data,source,content_source_id}',u.data#>>'{meta_data,source,source_id}')";
  const qualified = `(u.content_source_id=(p#>>'{before,content_source_id}')::bigint or exists(select 1 from jsonb_array_elements(${sourceList}) x where ${trimSQL("x#>>'{}'")}=p#>>'{before,content_source_id}'))`;
  const optionalStation = intro
    ? " or (p#>>'{before,id}'='5236' and actual is null)"
    : "";
  return `-- Complete historical checks with only two exact whole-row citation successors.
with tc_citation_choices as materialized(select ${literal(pairs)} as spec),
tc_citation_rows as materialized(select p,to_jsonb(t)-'updated_at'-'search_tsv' as actual
  from tc_citation_choices cross join lateral ${refs} p left join public.trait t on t.id=(p#>>'{before,id}')::bigint),
tc_citation_state as materialized(select
  coalesce(count(*)=2 and bool_and(coalesce(actual=p->'before'${optionalStation},false)),false) as original,
  coalesce(count(*)=2 and bool_and(coalesce(actual=p->'after',false)),false) as successor from tc_citation_rows),
tc_citation_selected as materialized(select p#>>'{before,id}' as id,
  case when (select successor from tc_citation_state) then p->'after' else p->'before' end as row from tc_citation_rows),
tc_citation_aliases as materialized(select exists(select 1 from tc_citation_choices cross join lateral ${refs} p
  join public.trait t on t.id<>(p#>>'{before,id}')::bigint and (
    t.uuid=(p#>>'{before,uuid}')::bigint
    or (t.content_source_id=(p#>>'{before,content_source_id}')::bigint and ${normalizedSQL("t.name")}=${normalizedSQL("p#>>'{before,name}'")})
    or ${normalizedSQL("t.meta_data#>>'{source,url}'")}=${normalizedSQL("p#>>'{after,meta_data,source,url}'")})) as present),
tc_citation_pending as materialized(select exists(select 1 from public.content_update u cross join tc_citation_choices cross join lateral ${refs} p
  where upper(${trimSQL("u.status->>'state'")}) not in('APPROVED','REJECTED')
    and (${type}='trait' or (${type} not in(${knownNamespaces.map((value) => "'" + value + "'").join(",")}) and ${qualified}))
    and (u.ref_id=(p#>>'{before,id}')::bigint
      or ${trimSQL("u.data->>'id'")}=p#>>'{before,id}'
      or ${trimSQL("u.data->>'ref_id'")}=p#>>'{before,id}'
      or ${trimSQL("u.data->>'uuid'")}=p#>>'{before,uuid}'
      or (${qualified} and ${normalizedSQL("u.data->>'name'")}=${normalizedSQL("p#>>'{before,name}'")})
      or ${normalizedSQL("u.data#>>'{meta_data,source,url}'")}=${normalizedSQL("p#>>'{after,meta_data,source,url}'")})) as present),
release_checks as materialized(
`;
}

/** Retain historical checks with exact citation choices and equivalent empty Tech Core dependencies. */
export function buildQuery(original, pairs, tag, intro) {
  const substitutions = [];
  const pattern = new RegExp(
    "\\$" + tag + "\\$([\\s\\S]*?)\\$" + tag + "\\$::jsonb",
    "g",
  );
  let transformed = original.replace(pattern, (whole, text) => {
    const spec = JSON.parse(text);
    assert.equal(spec.references.length, intro ? 16 : 92);
    let expression = whole;
    for (const pair of pairs) {
      const index = spec.references.findIndex(
        (entry) => entry.table === "trait" && entry.row.id === pair.before.id,
      );
      if (index < 0) {
        assert(intro && pair.before.id === 5236);
        continue;
      }
      assert.deepEqual(spec.references[index].row, pair.before);
      expression = `jsonb_set(${expression},'{references,${index},row}',(select row from tc_citation_selected where id='${pair.before.id}'),false)`;
    }
    if (!intro) {
      assert.equal(spec.sources[6].id, 900);
      assert.equal(spec.sources[6].required_content_sources, null);
      // Only an exactly empty array selects the alternate expectation. Nonempty arrays still mismatch null.
      expression = `jsonb_set(${expression},'{sources,6,required_content_sources}',(select case when s.required_content_sources='{}'::bigint[] then '[]'::jsonb else 'null'::jsonb end from public.content_source s where s.id=900),false)`;
    }
    substitutions.push({ original: whole, transformed: expression });
    return expression;
  });
  assert.equal(substitutions.length, intro ? 1 : 2);
  if (intro) {
    const previous = 's.required_content_sources is null';
    const replacement = 'coalesce(cardinality(s.required_content_sources),0)=0';
    assert.equal(transformed.split(previous).length, 2);
    transformed = transformed.replace(previous, replacement);
    substitutions.push({original:previous, transformed:replacement});
  }
  assert(transformed.trimEnd().endsWith(";"));
  const query =
    prefix(pairs, intro) +
    transformed.trimEnd().slice(0, -1) +
    `
)
select id,passed and ((select original from tc_citation_state) or (select successor from tc_citation_state))
  and not(select present from tc_citation_aliases) and not(select present from tc_citation_pending) as passed from release_checks;
`;
  // Reversing only the declared compatibility substitutions recovers the complete source exactly.
  let reversed = transformed;
  for (const entry of substitutions)
    reversed = reversed.replace(entry.transformed, () => entry.original);
  assert.equal(reversed, original);
  return { query, transformed, substitutions };
}

export function prepare(repository, proposalPath) {
  repository = path.resolve(repository);
  const files = Object.fromEntries(
    Object.keys(ORIGINALS).map((relative) => [
      relative,
      fs.readFileSync(path.join(repository, relative), "utf8"),
    ]),
  );
  for (const [relative, expected] of Object.entries(ORIGINALS))
    if (!relative.endsWith("requirements.json"))
      assert.equal(sha256(files[relative]), expected, relative);
  const originalCheckPaths = {
    "20261008160000_tech_core_introductory_spells.sql":
      "tech-core-introductory-spells.sql",
    "20261008190000_tech_core_general_spells.sql":
      "tech-core-general-spells-incarnate-compatibility.sql",
    "20261011000100_incarnate_release_compatibility.sql":
      "tech-core-general-spells-incarnate-compatibility.sql",
  };
  const originalRequirements = JSON.parse(
    files["supabase/release/requirements.json"],
  );
  const rustUpgrade = '20261015000000_rust_cloud_release_compatibility.sql';
  const rustRequirement = originalRequirements[rustUpgrade];
  assert.deepEqual(rustRequirement, {check:'treasure-vault-terminal-status.sql',order:'before-functions'});
  delete originalRequirements[rustUpgrade];
  const curatorUpgrade = '20261026010000_curator_release_compatibility.sql';
  const curatorRequirement = originalRequirements[curatorUpgrade];
  assert.deepEqual(curatorRequirement, {check:'treasure-vault-terminal-status.sql',order:'before-functions'});
  delete originalRequirements[curatorUpgrade];
  const mineUpgrade = '20261026000000_mine_mod_rules.sql';
  const mineRequirement = originalRequirements[mineUpgrade];
  assert.deepEqual(mineRequirement, {check:'mine-mod-rules.sql',order:'before-functions'});
  delete originalRequirements[mineUpgrade];
  for (const [migration, original] of Object.entries(originalCheckPaths)) {
    assert(
      [
        original,
        migration.includes("introductory")
          ? QUERY_FILES.intro
          : QUERY_FILES.general,
      ].includes(originalRequirements[migration].check),
    );
    originalRequirements[migration].check = original;
  }
  assert.equal(
    sha256(JSON.stringify(originalRequirements, null, 2) + "\n"),
    ORIGINALS["supabase/release/requirements.json"],
    "Only the three checked registration paths may differ",
  );
  originalRequirements[rustUpgrade] = rustRequirement;
  originalRequirements[mineUpgrade] = mineRequirement;
  originalRequirements[curatorUpgrade] = curatorRequirement;
  let suppliedRows;
  if (proposalPath) {
    const proposalBytes = fs.readFileSync(proposalPath);
    assert.equal(sha256(proposalBytes), PROPOSAL_SHA);
    suppliedRows = JSON.parse(proposalBytes).rows;
  } else {
    // Checked-in tests use only the two public trait identities, never an ignored book draft.
    const query = fs.readFileSync(
      path.join(repository, "supabase/release", QUERY_FILES.intro),
      "utf8",
    );
    const parts = query.split("$tc_citation_pairs$");
    assert.equal(parts.length, 3);
    const embedded = JSON.parse(parts[1]);
    assert.equal(embedded.length, 2);
    suppliedRows = embedded.map((pair) => ({
      table: "trait",
      id: pair.before.id,
      ...pair,
    }));
  }
  const originalGeneral = JSON.parse(
    files["supabase/release/tech-core-general-spells.sql"].split(
      "$tech_core_general$",
    )[1],
  );
  const pairs = [5225, 5236].map((id) => {
    const source = suppliedRows.find(
      (entry) => entry.table === "trait" && entry.id === id,
    );
    assert(source);
    const before = originalGeneral.references.find(
      (entry) => entry.table === "trait" && entry.row.id === id,
    ).row;
    assert.deepEqual(stable(source.before), before);
    const after = structuredClone(before);
    after.meta_data.source = CITATIONS[id];
    assert.deepEqual(
      stable(source.after),
      after,
      "No unrelated successor field is permitted",
    );
    return { before, after };
  });
  const intro = buildQuery(
    files["supabase/release/tech-core-introductory-spells.sql"],
    pairs,
    "tech_core_spells",
    true,
  );
  const general = buildQuery(
    files[
      "supabase/release/tech-core-general-spells-incarnate-compatibility.sql"
    ],
    pairs,
    "tech_core_general",
    false,
  );
  const oldRequirements = originalRequirements;
  const requirements = structuredClone(oldRequirements);
  const changes = [
    ["20261008160000_tech_core_introductory_spells.sql", QUERY_FILES.intro],
    ["20261008190000_tech_core_general_spells.sql", QUERY_FILES.general],
    ["20261011000100_incarnate_release_compatibility.sql", QUERY_FILES.general],
  ].map(([migration, check]) => {
    const before = structuredClone(requirements[migration]);
    assert(before && before.order === "before-functions");
    requirements[migration].check = check;
    return { migration, before, after: requirements[migration] };
  });
  assert.equal(Object.keys(requirements).length, 111);
  assert.equal(
    new Set(Object.values(requirements).map((entry) => entry.check)).size,
    71,
  );
  if (!proposalPath) {
    assert.equal(
      files["supabase/release/requirements.json"],
      JSON.stringify(requirements, null, 2) + "\n",
    );
    for (const [name, query] of [
      [QUERY_FILES.intro, intro.query],
      [QUERY_FILES.general, general.query],
    ])
      assert.equal(
        fs.readFileSync(
          path.join(repository, "supabase/release", name),
          "utf8",
        ),
        query,
        name + ": complete deterministic query bytes",
      );
  }
  return {
    repository,
    files,
    pairs,
    intro,
    general,
    requirements,
    original_requirements: oldRequirements,
    changes,
    historical_pins: Object.entries(files).map(([relative, text]) => ({
      relative,
      bytes: Buffer.byteLength(text),
      sha256: sha256(text),
    })),
    scope: "PRIVATE_PROPOSAL_NOT_APPLIED",
    application_data_writes: false,
    native_SQL_executed: false,
  };
}
