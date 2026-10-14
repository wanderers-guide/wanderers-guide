import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  prepare,
  citationState,
  citationAliasMatch,
  pendingCitationMatch,
  CITATIONS,
  ORIGINALS,
  sha256,
  QUERY_FILES,
  NORMALIZATION_WHITESPACE,
} from "./tech-core-citation-compatibility.mjs";

const directory = path.dirname(new URL(import.meta.url).pathname);
const repository =
  process.env.WG_CITATION_REPOSITORY ?? path.resolve(directory, "..");
const proposal = undefined;
const plan = prepare(repository, proposal);
const clone = (value) => structuredClone(value);
const before = () => plan.pairs.map((pair) => clone(pair.before));
const after = () => plan.pairs.map((pair) => clone(pair.after));

test("only the two complete citation leaves change, preserving every other native field", () => {
  assert.deepEqual(
    plan.pairs.map((pair) => pair.before.id),
    [5225, 5236],
  );
  for (const pair of plan.pairs) {
    const expected = clone(pair.before);
    expected.meta_data.source = CITATIONS[pair.before.id];
    assert.deepEqual(pair.after, expected);
  }
});

test("original and complete cited pair pass; neither mixed pair passes", () => {
  for (const intro of [false, true]) {
    assert.deepEqual(citationState(before(), plan.pairs, intro), {
      original: true,
      successor: false,
      accepted: true,
    });
    assert.deepEqual(citationState(after(), plan.pairs, intro), {
      original: false,
      successor: true,
      accepted: true,
    });
    for (const index of [0, 1]) {
      const mixed = before();
      mixed[index] = after()[index];
      assert.equal(citationState(mixed, plan.pairs, intro).accepted, false);
    }
  }
});

test("the original intro-only stage accepts absent Station, never absent Junk or half of a successor", () => {
  assert.equal(citationState([before()[0]], plan.pairs, true).accepted, true);
  assert.equal(citationState([before()[0]], plan.pairs, false).accepted, false);
  assert.equal(citationState([after()[0]], plan.pairs, true).accepted, false);
  assert.equal(citationState([before()[1]], plan.pairs, true).accepted, false);
});

test("unknown citations, partial citation objects and unrelated whole-row changes fail", () => {
  const changes = [
    (row) => (row.meta_data.source.page = "999"),
    (row) => delete row.meta_data.source.book,
    (row) => (row.meta_data.source.url += "?drift=1"),
    (row) => (row.meta_data.important = !row.meta_data.important),
    (row) => (row.description += " drift"),
    (row) => (row.content_source_id = 579),
    (row) => row.uuid++,
    (row) => (row.created_at = "2026-10-09T00:00:00+00:00"),
    (row) => (row.name += " drift"),
  ];
  for (const index of [0, 1])
    for (const change of changes) {
      const rows = after();
      change(rows[index]);
      assert.equal(citationState(rows, plan.pairs, true).accepted, false);
      assert.equal(citationState(rows, plan.pairs, false).accepted, false);
    }
  const clocks = after();
  for (const row of clocks) {
    row.updated_at = "2026-10-12T00:00:00+00:00";
    row.search_tsv = "generated";
  }
  assert.equal(
    citationState(clocks, plan.pairs).accepted,
    true,
    "Only the same two historically ignored generated/clock columns are ignored",
  );
});

test("all historical query clauses and both exact Incarnate choices are retained", () => {
  for (const [key, old] of [
    ["intro", plan.files["supabase/release/tech-core-introductory-spells.sql"]],
    [
      "general",
      plan.files[
        "supabase/release/tech-core-general-spells-incarnate-compatibility.sql"
      ],
    ],
  ]) {
    let restored = plan[key].transformed;
    for (const entry of plan[key].substitutions)
      restored = restored.replace(entry.transformed, () => entry.original);
    assert.equal(restored, old);
    assert(
      plan[key].query.includes(plan[key].transformed.trimEnd().slice(0, -1)),
    );
  }
  const original =
    plan.files[
      "supabase/release/tech-core-general-spells-incarnate-compatibility.sql"
    ];
  const specs = [
    ...original.matchAll(
      /\$tech_core_general\$([\s\S]*?)\$tech_core_general\$/g,
    ),
  ].map((match) => JSON.parse(match[1]));
  assert.deepEqual(
    specs.map(
      (spec) =>
        spec.references.find(
          (entry) => entry.table === "trait" && entry.row.id === 2584,
        ).row.content_source_id,
    ),
    [15, 3],
  );
  for (const spec of specs)
    assert.deepEqual(
      [
        spec.references.length,
        spec.sources.length,
        spec.rows.length,
        spec.prior_rows.length,
        spec.bindings.length,
      ],
      [92, 7, 76, 6, 8],
    );
  const intro = JSON.parse(
    plan.files["supabase/release/tech-core-introductory-spells.sql"].split(
      "$tech_core_spells$",
    )[1],
  );
  assert.deepEqual(
    [
      intro.references.length,
      intro.sources.length,
      intro.rows.length,
      intro.bindings.length,
    ],
    [16, 3, 6, 1],
  );
});

test("only Tech Core's two empty dependency representations are compatible", () => {
  assert.match(plan.intro.transformed, /coalesce\(cardinality\(s\.required_content_sources\),0\)=0/);
  assert.equal(plan.general.substitutions.length, 2);
  for (const entry of plan.general.substitutions) {
    assert.match(entry.transformed, /\{sources,6,required_content_sources\}/);
    assert.match(entry.transformed, /required_content_sources='\{\}'::bigint\[\]/);
    assert.match(entry.transformed, /then '\[\]'::jsonb else 'null'::jsonb end/);
  }
});

test("only three registered check paths change, retaining all108 requirements and70 distinct full checks", () => {
  const old = structuredClone(plan.original_requirements);
  assert.equal(Object.keys(plan.requirements).length, 108);
  assert.equal(
    new Set(Object.values(plan.requirements).map((entry) => entry.check)).size,
    70,
  );
  for (const change of plan.changes) {
    assert.deepEqual(change.before, old[change.migration]);
    old[change.migration].check = change.after.check;
  }
  assert.deepEqual(old, plan.requirements);
  assert.equal(plan.changes.length, 3);
  assert.equal(plan.changes[0].after.check, QUERY_FILES.intro);
  assert.equal(plan.changes[1].after.check, QUERY_FILES.general);
  assert.equal(plan.changes[2].after.check, QUERY_FILES.general);
});

test("normalized identity, source/name and citation aliases reject in either citation state", () => {
  assert.equal(new Set(NORMALIZATION_WHITESPACE).size, 25);
  for (const code of NORMALIZATION_WHITESPACE) {
    const blank = String.fromCodePoint(code);
    assert.equal(blank.trim(), "");
    for (const pair of plan.pairs) {
      assert(
        citationAliasMatch(
          {
            ...pair.before,
            id: 999900,
            uuid: 8000000000999900,
            name: blank + pair.before.name + blank,
          },
          pair,
        ),
      );
      assert(
        pendingCitationMatch(
          {
            type: blank + "trait" + blank,
            content_source_id: 579,
            status: { state: blank + "PENDING" + blank },
            data: {
              name: blank + pair.before.name + blank,
              source_id: blank + "900" + blank,
            },
          },
          pair,
        ),
      );
      assert(
        !pendingCitationMatch(
          {
            type: "trait",
            status: { state: blank + "APPROVED" + blank },
            data: { ref_id: pair.before.id },
          },
          pair,
        ),
      );
    }
  }
  for (const pair of plan.pairs)
    for (const base of [pair.before, pair.after]) {
      assert.equal(citationAliasMatch(base, pair), false);
      for (const alias of [
        {
          ...base,
          id: 999900,
          uuid: 8000000000999900,
          name: "\t" + base.name.toUpperCase() + "\n",
        },
        {
          ...base,
          id: 999900,
          content_source_id: 579,
          name: "Other",
          uuid: base.uuid,
        },
        {
          ...base,
          id: 999900,
          content_source_id: 579,
          name: "Other",
          uuid: 8000000000999900,
          meta_data: {
            source: {
              url: "\t" + pair.after.meta_data.source.url.toUpperCase() + "\n",
            },
          },
        },
      ])
        assert.equal(citationAliasMatch(alias, pair), true);
      assert.equal(
        citationAliasMatch(
          {
            ...base,
            id: 999900,
            uuid: 8000000000999900,
            content_source_id: 579,
            meta_data: {},
          },
          pair,
        ),
        false,
      );
    }
});

test("CREATE and UPDATE null-ref moderation protects all three ID routes, UUID and successor citation", () => {
  for (const pair of plan.pairs)
    for (const action of ["CREATE", "UPDATE"]) {
      for (const update of [
        { ref_id: pair.before.id, data: {} },
        { data: { id: "\t" + pair.before.id + "\n" } },
        {
          data: {
            ref_id: "\t" + pair.before.id + "\n",
            name: "Unrelated supplied name",
          },
        },
        { data: { uuid: "\t" + pair.before.uuid + "\n" } },
        {
          data: {
            meta_data: {
              source: {
                url:
                  "\t" + pair.after.meta_data.source.url.toUpperCase() + "\n",
              },
            },
          },
        },
      ])
        assert.equal(
          pendingCitationMatch(
            {
              type: "\tTRAIT\n",
              status: { state: "PENDING" },
              action,
              ...update,
            },
            pair,
          ),
          true,
        );
    }
});

test("all eight nested source/name aliases, unknown status and unknown source-qualified namespace fail closed", () => {
  const paths = [
    ["content_source_id"],
    ["source_id"],
    ["source", "content_source_id"],
    ["source", "source_id"],
    ["source", "id"],
    ["meta_data", "content_source_id"],
    ["meta_data", "source", "content_source_id"],
    ["meta_data", "source", "source_id"],
  ];
  for (const pair of plan.pairs)
    for (const keys of paths) {
      const data = { name: "\t" + pair.before.name.toUpperCase() + "\n" };
      let cursor = data;
      for (const key of keys.slice(0, -1)) cursor = cursor[key] ??= {};
      cursor[keys.at(-1)] = "\t900\n";
      for (const status of [
        { state: "UNKNOWN" },
        {},
        null,
        { state: "PENDING" },
      ])
        for (const type of ["trait", "not-a-known-content-kind"])
          assert.equal(
            pendingCitationMatch({ type, status, data }, pair),
            true,
          );
    }
});

test("closed and unrelated proposals stay accepted; valid wrong namespaces are not trait collisions", () => {
  for (const pair of plan.pairs) {
    for (const state of ["APPROVED", "REJECTED"])
      assert.equal(
        pendingCitationMatch(
          {
            type: "trait",
            status: { state: "\t" + state + "\n" },
            data: { ref_id: pair.before.id },
          },
          pair,
        ),
        false,
      );
    for (const type of ["spell", "feat", "ability-block", "item"])
      assert.equal(
        pendingCitationMatch(
          {
            type,
            content_source_id: 900,
            data: { id: pair.before.id, name: pair.before.name },
          },
          pair,
        ),
        false,
      );
    assert.equal(
      pendingCitationMatch(
        {
          type: "trait",
          content_source_id: 900,
          data: { name: "Unrelated native trait" },
        },
        pair,
      ),
      false,
    );
    assert.equal(
      pendingCitationMatch(
        {
          type: "unknown",
          content_source_id: 579,
          data: { name: pair.before.name, ref_id: pair.before.id },
        },
        pair,
      ),
      false,
    );
  }
});

test("private preparation never mutates historical source bytes", () => {
  for (const [relative, expected] of Object.entries(ORIGINALS))
    if (!relative.endsWith("requirements.json"))
      assert.equal(
        sha256(fs.readFileSync(path.join(repository, relative))),
        expected,
      );
  assert.equal(plan.native_SQL_executed, false);
  assert.equal(plan.application_data_writes, false);
});
