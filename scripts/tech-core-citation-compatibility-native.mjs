/** Actual SELECT acceptance recipes for a parent-owned hosted PostgreSQL fixture. No resource creation. */
import assert from "node:assert/strict";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  prepare,
  literal,
  sha256,
} from "./tech-core-citation-compatibility.mjs";

const quote = (value) => "'" + String(value).replaceAll("'", "''") + "'";
const ident = (value) => {
  assert.match(value, /^[a-z_]+$/);
  return '"' + value + '"';
};
const insert = (table, source) => {
  const row = Object.fromEntries(
    Object.entries(source).filter(([key]) => key !== "search_tsv"),
  );
  const columns = Object.keys(row).map(ident);
  return `INSERT INTO public.${ident(table)} (${columns.join(",")}) SELECT ${columns.join(",")} FROM jsonb_populate_record(NULL::public.${ident(table)},${literal(row)});`;
};
const transaction = (
  sql,
  readOnly = false,
) => `BEGIN${readOnly ? " READ ONLY" : ""};
SET LOCAL statement_timeout='20s'; SET LOCAL lock_timeout='3s'; SET LOCAL client_min_messages='warning';
${sql}
ROLLBACK;`;

export async function prepareNative(repository, proposalPath) {
  const candidate = prepare(repository, proposalPath);
  const { prepare: prepareHistorical } = await import(
    pathToFileURL(path.join(repository, "scripts/release-recovery-native.mjs"))
  );
  const base = prepareHistorical(repository);
  const cases = [];
  const add = (name, query, mutation, expected) =>
    cases.push({ name, query, mutation, expected });
  const cite = candidate.pairs
    .map(
      (pair) =>
        `UPDATE public.trait SET meta_data=${literal(pair.after.meta_data)} WHERE id=${pair.before.id};`,
    )
    .join("\n");
  const citeOne = (id) => {
    const pair = candidate.pairs.find((entry) => entry.before.id === id);
    return `UPDATE public.trait SET meta_data=${literal(pair.after.meta_data)} WHERE id=${id};`;
  };
  const incarnate3 =
    "UPDATE public.trait SET content_source_id=3 WHERE id=2584;";
  const queue = (data, extra = {}) =>
    insert("content_update", {
      id: 999901,
      created_at: "2024-01-01T00:00:00+00:00",
      user_id: "00000000-0000-4000-8000-000000000001",
      type: "trait",
      ref_id: null,
      content_source_id: 900,
      action: "UPDATE",
      data,
      upvotes: [],
      downvotes: [],
      status: { state: "PENDING" },
      ...extra,
    });
  for (const source of [15, 3])
    for (const citations of ["original", "successor"]) {
      const setup =
        (source === 3 ? incarnate3 + "\n" : "") +
        (citations === "successor" ? cite : "");
      add(
        `accepted-general-${citations}-Incarnate${source}`,
        "general",
        setup,
        true,
      );
      add(
        `accepted-intro-${citations}-Incarnate${source}`,
        "intro",
        setup,
        true,
      );
    }
  const emptySource = "UPDATE public.content_source SET required_content_sources='{}'::bigint[] WHERE id=900;\n";
  for (const source of [15, 3])
    for (const citations of ["original", "successor"])
      for (const query of ["intro", "general"])
        add(`empty-source-accepted-${query}-${citations}-Incarnate${source}`, query,
          emptySource + (source === 3 ? incarnate3 + "\n" : "") + (citations === "successor" ? cite : ""), true);
  for (const [name, mutation] of [
    ["nonempty", "UPDATE public.content_source SET required_content_sources=ARRAY[579]::bigint[] WHERE id=900;"],
    ["null-element", "UPDATE public.content_source SET required_content_sources=ARRAY[NULL]::bigint[] WHERE id=900;"],
    ["header-drift", "UPDATE public.content_source SET name='Changed Tech Core' WHERE id=900;"],
    ["pending-source", queue({}, {type:'content-source', ref_id:900})],
    ["reference-drift", "UPDATE public.trait SET description=description||' drift' WHERE id=5225;"],
    ["mixed-citations", citeOne(5225)],
  ])
    for (const query of ["intro", "general"])
      add(`empty-source-rejected-${query}-${name}`, query, emptySource + mutation, false);
  add(
    "accepted-original-intro-only-without-Station",
    "intro",
    "DELETE FROM public.trait WHERE id=5236;",
    true,
  );
  add(
    "rejected-general-without-Station",
    "general",
    "DELETE FROM public.trait WHERE id=5236;",
    false,
  );
  add(
    "rejected-successor-intro-without-Station",
    "intro",
    cite + "\nDELETE FROM public.trait WHERE id=5236;",
    false,
  );
  for (const id of [5225, 5236])
    for (const query of ["intro", "general"])
      add(`rejected-${query}-mixed-pair-${id}`, query, citeOne(id), false);
  add("historical-intro-red-on-exact-citations", "originalIntro", cite, false);
  add(
    "historical-general-red-on-exact-citations",
    "originalGeneral",
    cite + "\n" + incarnate3,
    false,
  );

  // Reuse every original general predicate control against the cited state. No rejection is dropped.
  const historical = base.cases.filter(
    (item) => item.kind === "predicate" && item.check === "wrapper",
  );
  assert(historical.length > 270);
  for (const control of historical)
    add(
      "retained-" + control.name,
      "general",
      cite + "\n" + control.mutation,
      control.expected,
    );
  const introSpec = JSON.parse(
    candidate.files["supabase/release/tech-core-introductory-spells.sql"].split(
      "$tech_core_spells$",
    )[1],
  );
  // The general fixture does not contain six dependencies unique to the first batch.
  // Preserve both original full-row inventories, rather than treating missing rows as a query failure.
  const referenceInventory = new Map(
    base.general.references.map(({ table, row }) => [
      table + ":" + row.id,
      row,
    ]),
  );
  const introductoryOnly = [];
  for (const { table, row } of introSpec.references) {
    const key = table + ":" + row.id;
    const existing = referenceInventory.get(key);
    if (existing)
      assert.deepEqual(
        existing,
        row,
        "Historical reference disagreement: " + key,
      );
    else {
      referenceInventory.set(key, row);
      introductoryOnly.push({ table, row });
    }
  }
  assert.equal(introductoryOnly.length, 6);
  const seed =
    base.seed +
    "\n" +
    introductoryOnly.map(({ table, row }) => insert(table, row)).join("\n");
  for (const dependency of introSpec.references)
    add(
      "intro-dependency-" + dependency.table + dependency.row.id,
      "intro",
      cite +
        `\nUPDATE public.${ident(dependency.table)} SET name=name||' OWNED drift' WHERE id=${dependency.row.id};`,
      false,
    );
  for (const source of introSpec.sources)
    add(
      "intro-source-" + source.id,
      "intro",
      cite +
        `\nUPDATE public.content_source SET name=name||' OWNED drift' WHERE id=${source.id};`,
      false,
    );
  for (const row of introSpec.rows) {
    const id = base.identity[String(row.uuid)];
    assert(Number.isSafeInteger(id) && id > 0);
    add(
      "intro-missing-spell-" + id,
      "intro",
      cite + `\nDELETE FROM public.spell WHERE id=${id};`,
      false,
    );
    add(
      "intro-changed-spell-" + id,
      "intro",
      cite +
        `\nUPDATE public.spell SET description=description||' OWNED drift' WHERE id=${id};`,
      false,
    );
  }
  const bugfixId = base.identity[String(introSpec.bindings[0].uuid)];
  add(
    "intro-bound-self-link",
    "intro",
    cite +
      `\nUPDATE public.spell SET description=replace(description,'(link_spell_${bugfixId})','(link_spell_999999)') WHERE id=${bugfixId};`,
    false,
  );

  const nestedSources = [
    ["content_source_id"],
    ["source_id"],
    ["source", "content_source_id"],
    ["source", "source_id"],
    ["source", "id"],
    ["meta_data", "content_source_id"],
    ["meta_data", "source", "content_source_id"],
    ["meta_data", "source", "source_id"],
  ];
  for (const state of ["original", "successor"]) {
    const stateSetup = state === "successor" ? cite + "\n" : "";
    for (const pair of candidate.pairs) {
      const id = pair.before.id;
      const changes = [
        ["description", `description=description||' OWNED drift'`],
        ["UUID", "uuid=uuid+1"],
        ["source", "content_source_id=579"],
        ["ID", "id=999903"],
        ["name", "name=name||' OWNED drift'"],
        ["created-at", "created_at=created_at+interval '1day'"],
        [
          "unrelated-metadata",
          `meta_data=meta_data||'{"OWNED":"drift"}'::jsonb`,
        ],
        [
          "wrong-page",
          `meta_data=${literal({ ...pair.after.meta_data, source: { ...pair.after.meta_data.source, page: "999" } })}`,
        ],
        [
          "wrong-URL",
          `meta_data=${literal({ ...pair.after.meta_data, source: { ...pair.after.meta_data.source, url: pair.after.meta_data.source.url + "?drift=1" } })}`,
        ],
      ];
      const scenarios = changes.map(([name, assignment]) => [
        name,
        `UPDATE public.trait SET ${assignment} WHERE id=${id};`,
        false,
      ]);
      const alias = { ...pair.before, id: 999902, uuid: 8000000000999902 };
      scenarios.push(
        [
          "alias-name",
          insert("trait", {
            ...alias,
            name: "\t" + pair.before.name.toUpperCase() + "\n",
          }),
          false,
        ],
        [
          "alias-global-UUID",
          insert("trait", {
            ...alias,
            uuid: pair.before.uuid,
            name: "Other owned trait",
            content_source_id: 579,
          }),
          false,
        ],
        [
          "alias-global-citation",
          insert("trait", {
            ...alias,
            name: "Other owned trait",
            content_source_id: 579,
            meta_data: {
              source: {
                url:
                  "\t" + pair.after.meta_data.source.url.toUpperCase() + "\n",
              },
            },
          }),
          false,
        ],
      );
      scenarios.push([
        "wrong-row-namespace",
        `DELETE FROM public.trait WHERE id=${id};\n` +
          insert("ability_block", {
            id,
            uuid: pair.before.uuid,
            name: pair.before.name,
            type: "feat",
            level: 1,
            content_source_id: 900,
            rarity: "COMMON",
            description: pair.before.description,
            meta_data: pair.after.meta_data,
            operations: [],
          }),
        false,
      ]);
      for (const action of ["CREATE", "UPDATE"])
        for (const [name, data, ref_id] of [
          ["ref", {}, id],
          ["data-id", { id: "\t" + id + "\n" }, null],
          [
            "data-ref-id",
            { ref_id: "\t" + id + "\n", name: "Different supplied name" },
            null,
          ],
          ["UUID", { uuid: "\t" + pair.before.uuid + "\n" }, null],
          [
            "citation",
            { meta_data: { source: { url: pair.after.meta_data.source.url } } },
            null,
          ],
        ])
          scenarios.push([
            "pending-" + action + "-" + name,
            queue(data, { ref_id, action, type: "\tTRAIT\n" }),
            false,
          ]);
      for (const keys of nestedSources) {
        const data = { name: "\t" + pair.before.name.toUpperCase() + "\n" };
        let cursor = data;
        for (const key of keys.slice(0, -1)) cursor = cursor[key] ??= {};
        cursor[keys.at(-1)] = "\t900\n";
        scenarios.push([
          "pending-nested-" + keys.join("."),
          queue(data, { content_source_id: 579 }),
          false,
        ]);
      }
      for (const status of [{ state: "UNKNOWN" }, {}, { state: null }])
        scenarios.push([
          "pending-status-" + JSON.stringify(status),
          queue({ ref_id: id }, { status }),
          false,
        ]);
      scenarios.push(
        [
          "pending-unknown-kind",
          queue(
            { ref_id: id, name: "Different supplied name" },
            { type: "unknown-content" },
          ),
          false,
        ],
        [
          "pending-unknown-kind-citation",
          queue(
            { meta_data: { source: { url: pair.after.meta_data.source.url } } },
            { type: "unknown-content" },
          ),
          false,
        ],
        ["pending-unrelated", queue({ name: "Unrelated owned trait" }), true],
        [
          "pending-valid-spell-namespace",
          queue({ id, name: pair.before.name }, { type: "spell" }),
          true,
        ],
        [
          "pending-valid-item-namespace",
          queue({ id, name: pair.before.name }, { type: "item" }),
          true,
        ],
        [
          "clock-only",
          `UPDATE public.trait SET updated_at=clock_timestamp() WHERE id=${id};`,
          true,
        ],
      );
      for (const status of ["APPROVED", "REJECTED"])
        scenarios.push([
          "closed-" + status,
          queue({ ref_id: id }, { status: { state: "\t" + status + "\n" } }),
          true,
        ]);
      for (const [name, mutation, expected] of scenarios)
        for (const query of ["intro", "general"])
          add(
            `${state}-${id}-${query}-${name}`,
            query,
            stateSetup + mutation,
            expected,
          );
    }
  }
  add(
    "general-spell-alias-count",
    "general",
    cite +
      "\n" +
      insert("spell", {
        ...base.spells[8],
        id: 999906,
        uuid: 8000000000999906,
      }),
    false,
  );
  const junk = candidate.pairs.find((pair) => pair.before.id === 5225);
  for (const [label, blank] of [
    ["NBSP", "\u00a0"],
    ["BOM", "\ufeff"],
  ])
    add(
      "successor-Unicode-pending-" + label,
      "general",
      cite +
        "\n" +
        queue(
          {
            name: blank + junk.before.name.toUpperCase() + blank,
            source_id: blank + "900" + blank,
          },
          { content_source_id: 579, type: blank + "TRAIT" + blank },
        ),
      false,
    );
  for (const status of ["APPROVED", "REJECTED"])
    add(
      "successor-Unicode-closed-" + status,
      "general",
      cite +
        "\n" +
        queue(
          { ref_id: 5225 },
          {
            status: { state: "\u00a0" + status + "\ufeff" },
          },
        ),
      true,
    );
  add(
    "successor-Unicode-alias-name",
    "general",
    cite +
      "\n" +
      insert("trait", {
        ...junk.before,
        id: 999902,
        uuid: 8000000000999902,
        name: "\u00a0JUNK\ufeff",
      }),
    false,
  );
  // The real UNIQUE constraint rejects these inserts before a SELECT can run.
  // Keep the controls, but never misreport this as an evaluated release predicate.
  for (const control of cases)
    if (control.name.endsWith("-alias-global-UUID"))
      control.schemaRejection = {
        sqlstate: "23505",
        constraint: "trait_uuid_key",
      };
  assert.equal(new Set(cases.map((item) => item.name)).size, cases.length);
  const focusedNames = new Set(
    cases
      .filter(
        (control) =>
          control.name.startsWith("accepted-") ||
          control.name.startsWith("empty-source-") ||
          control.name.startsWith("rejected-") ||
          control.name.startsWith("historical-") ||
          control.name.startsWith("intro-dependency-") ||
          control.name.startsWith("retained-incarnate-reject-dependency-"),
      )
      .map((control) => control.name),
  );
  for (const id of [5225, 5236]) {
    for (const suffix of [
      "description",
      "UUID",
      "source",
      "ID",
      "name",
      "created-at",
      "unrelated-metadata",
      "wrong-page",
      "wrong-URL",
      "wrong-row-namespace",
      "alias-name",
      "alias-global-UUID",
      "alias-global-citation",
    ])
      focusedNames.add(`successor-${id}-general-${suffix}`);
  }
  for (const suffix of [
    "alias-name",
    "alias-global-UUID",
    "alias-global-citation",
    "pending-UPDATE-data-ref-id",
    "pending-valid-spell-namespace",
    "closed-APPROVED",
    "closed-REJECTED",
    "pending-unrelated",
  ])
    focusedNames.add("original-5225-general-" + suffix);
  for (const control of cases)
    if (
      control.name.startsWith("successor-5225-general-pending-") &&
      !control.name.includes("valid-item")
    )
      focusedNames.add(control.name);
  for (const suffix of [
    "pending-UPDATE-data-ref-id",
    "pending-UPDATE-citation",
  ])
    focusedNames.add("successor-5236-general-" + suffix);
  for (const suffix of ["closed-APPROVED", "closed-REJECTED", "clock-only"])
    focusedNames.add("successor-5225-general-" + suffix);
  for (const name of [
    "intro-source-900",
    "intro-bound-self-link",
    "intro-missing-spell-" + base.spells[0].id,
    "retained-incarnate-reject-source-900",
    "retained-incarnate-reject-missing-spell-" + base.spells[10].id,
    "retained-incarnate-reject-content-drift-spell-" + base.spells.at(-1).id,
    "retained-incarnate-pending-native-spell-UUID",
    "retained-incarnate-pending-reference-ref",
    "retained-incarnate-reject-successor-description",
    "general-spell-alias-count",
  ])
    focusedNames.add(name);
  focusedNames.add(
    cases.find((control) =>
      control.name.startsWith("retained-incarnate-reject-bound-link-"),
    ).name,
  );
  for (const name of focusedNames)
    assert(
      cases.some((control) => control.name === name),
      "Unknown focused recipe " + name,
    );
  for (const control of cases)
    if (control.name.startsWith("successor-Unicode-"))
      focusedNames.add(control.name);
  const focused = cases.filter((control) => focusedNames.has(control.name));
  assert.equal(focused.length, 225);
  return {
    candidate,
    base,
    cases,
    focused,
    seed,
    introductoryOnly,
    queries: {
      intro: candidate.intro.query,
      general: candidate.general.query,
      originalIntro:
        candidate.files["supabase/release/tech-core-introductory-spells.sql"],
      originalGeneral:
        candidate.files[
          "supabase/release/tech-core-general-spells-incarnate-compatibility.sql"
        ],
    },
  };
}

/** Called only by the sealed hosted entry after real fixture creation and identity/census checks. */
export async function runNativeControls({
  prepared,
  fixture,
  checkpoint,
  save,
  userId,
  matrix = "focused",
}) {
  assert.equal(process.env.GITHUB_ACTIONS, "true");
  assert.equal(process.env.RUNNER_OS, "Linux");
  assert.equal(process.env.GITHUB_EVENT_NAME, "workflow_dispatch");
  assert.equal(process.versions.node.split(".")[0], "20");
  for (const method of ["sql", "snapshot", "assertOwned", "query"])
    assert.equal(typeof fixture[method], "function");
  assert.match(userId, /^[0-9a-f-]{36}$/i);
  assert(["focused", "exhaustive"].includes(matrix));
  const controls = matrix === "focused" ? prepared.focused : prepared.cases;
  const syntheticUser = '"user_id":"00000000-0000-4000-8000-000000000001"';
  const bindFixtureUser = (sql) =>
    sql.replaceAll(syntheticUser, '"user_id":' + JSON.stringify(userId));
  assert.equal(prepared.seed.split(syntheticUser).length - 1, 1);
  const beforeSeed = fixture.snapshot();
  fixture.assertOwned();
  fixture.sql(
    "BEGIN; SET LOCAL statement_timeout='20s';\n" +
      bindFixtureUser(prepared.seed) +
      "\nCOMMIT;",
  );
  for (const file of [
    "supabase/migrations/20260718000000_content_updated_at.sql",
    "supabase/migrations/20260729000000_noop_guard_generated_columns.sql",
  ])
    fixture.sql(prepared.base.files[file]);
  const baseline = fixture.snapshot();
  assert.equal(
    baseline.tuples["public.character"],
    beforeSeed.tuples["public.character"],
  );
  assert.deepEqual(
    baseline.sequences,
    beforeSeed.sequences,
    "Explicit synthetic IDs consume no sequences",
  );
  assert.equal(baseline.roles_sha256, beforeSeed.roles_sha256);
  await save("BASELINE.json", baseline);
  const observations = [];
  const deadline = Date.now() + 30 * 60 * 1000;
  try {
    for (const control of controls) {
      assert(Date.now() < deadline, "Bounded native acceptance deadline");
      await checkpoint(control.name);
      const sql = transaction(
        bindFixtureUser(control.mutation) +
          "\n" +
          prepared.queries[control.query],
        !control.mutation,
      );
      fixture.assertOwned();
      const result = fixture.sql(sql, Boolean(control.schemaRejection));
      assert.equal(result.error == null, true);
      assert.equal(result.signal, null);
      if (control.schemaRejection) {
        assert.equal(
          result.status,
          3,
          control.name + ": completed psql schema rejection",
        );
        assert.match(result.stderr, /23505/, control.name);
        assert.match(
          result.stderr,
          /constraint "trait_uuid_key"/,
          control.name,
        );
        assert.equal(
          result.stdout.trim(),
          "",
          control.name + ": SELECT was not evaluated",
        );
      } else {
        assert.equal(result.status, 0);
        const lines = result.stdout.trim().split("\n").filter(Boolean);
        assert.deepEqual(
          lines,
          [
            (control.query.toLowerCase().includes("intro")
              ? "tech-core-introductory-spells"
              : "tech-core-general-spells") +
              "|" +
              (control.expected ? "t" : "f"),
          ],
          control.name,
        );
      }
      assert.deepEqual(
        fixture.snapshot(),
        baseline,
        control.name +
          ": full tuples/schema/roles/sequences must remain exact after rollback",
      );
      observations.push({
        name: control.name,
        query: control.query,
        expected: control.expected,
        passed: true,
        sql_sha256: sha256(sql),
        complete_snapshot_preserved: true,
        predicate_evaluated: !control.schemaRejection,
        schema_rejection: control.schemaRejection ?? null,
      });
      if (observations.length % 25 === 0)
        await save("PROGRESS-" + observations.length + ".json", {
          completed: observations.length,
          expected: controls.length,
        });
    }
  } finally {
    await save("CONTROL-RESULTS.json", observations);
  }
  return {
    matrix,
    actual_native_controls: observations.length,
    expected_native_controls: controls.length,
    actual_predicates_evaluated: observations.filter(
      (control) => control.predicate_evaluated,
    ).length,
    actual_schema_refusals: observations.filter(
      (control) => control.schema_rejection,
    ).length,
    full_native_execution_complete: true,
    passed: true,
    complete_snapshot_preserved: true,
    saved_characters_preserved: true,
    all_sequences_preserved: true,
    limitation:
      "Owned PostgreSQL15.6 fixture with synthetic spell and moderation IDs; not production, permission/RLS or browser evidence.",
  };
}
