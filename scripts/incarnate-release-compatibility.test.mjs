import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

test("Incarnate compatibility retains the complete original and only a source-only successor", async () => {
  assert.equal(
    sha256(
      await read(
        "supabase/migrations/20261008190000_tech_core_general_spells.sql",
      ),
    ),
    "5bd0c1ab04ddef5dff562eb1e9b52be6092b88e8c127cabfa27760908020f485",
  );
  const original = await read("supabase/release/tech-core-general-spells.sql");
  assert.equal(
    sha256(original),
    "97c50a7cf4a529219ff96d86c755dc24c7aa9b287b15db8107bce3e681f3102e",
  );
  const wrapper = await read(
    "supabase/release/tech-core-general-spells-incarnate-compatibility.sql",
  );
  assert.ok(
    wrapper.includes(
      "original_checks as materialized(\n" +
        original.trimEnd().slice(0, -1) +
        "\n)",
    ),
  );
  const [before, after] = [
    ...wrapper.matchAll(
      /\$tech_core_general\$([\s\S]*?)\$tech_core_general\$/g,
    ),
  ].map((match) => JSON.parse(match[1]));
  const expected = structuredClone(before);
  expected.references.find(
    ({ table, row }) => table === "trait" && row.id === 2584,
  ).row.content_source_id = 3;
  assert.deepEqual(after, expected);
  const literals = [
    ...original.matchAll(
      /\$tech_core_general\$([\s\S]*?)\$tech_core_general\$/g,
    ),
  ];
  assert.equal(literals.length, 1);
  const successor = original.replace(literals[0][1], () =>
    JSON.stringify(expected),
  );
  assert.ok(
    wrapper.includes(
      "successor_checks as materialized(\n" +
        successor.trimEnd().slice(0, -1) +
        "\n)",
    ),
  );
  assert.equal(before.rows.length, 76);
  assert.equal(before.prior_rows.length, 6);
  assert.equal(before.references.length, 92);
  assert.equal(before.sources.length, 7);
  assert.equal(before.bindings.length, 8);
  assert.equal(
    (
      await read(
        "supabase/migrations/20261011000100_incarnate_release_compatibility.sql",
      )
    ).includes("insert into"),
    false,
  );
  for (const path of [
    "{source,content_source_id}",
    "{source,source_id}",
    "{source,id}",
    "{meta_data,source,content_source_id}",
    "{meta_data,source,source_id}",
  ])
    assert.ok(
      wrapper.slice(wrapper.lastIndexOf("\nselect o.id,")).includes(path),
      path + ": outer pending guard covers nested aliases on both branches",
    );
});

test("normal release wiring preserves legacy requirements and uses the complete compatibility check", async () => {
  const requirements = JSON.parse(
    await read("supabase/release/requirements.json"),
  );
  const check = "tech-core-general-spells-citation-compatibility.sql";
  assert.equal(
    requirements["20261008190000_tech_core_general_spells.sql"].check,
    check,
  );
  assert.equal(
    requirements["20261011000100_incarnate_release_compatibility.sql"].check,
    check,
  );
  for (const name of ["20261011000100_incarnate_release_compatibility.sql"])
    assert.equal(requirements[name].order, "before-functions");
});

test("Incarnate alias uniqueness gates both complete compatibility branches", async () => {
  const wrapper = await read(
    "supabase/release/tech-core-general-spells-incarnate-compatibility.sql",
  );
  const aliasGuard =
    "and not exists(select 1 from public.trait t where t.id<>2584 and (t.uuid=3690091311596588 or (t.content_source_id in(3,15) and lower(pg_catalog.regexp_replace(coalesce(t.name,''),'^[[:space:]]+|[[:space:]]+$','','g'))='incarnate')))";
  const footer = wrapper.slice(wrapper.lastIndexOf("\nselect o.id,"));
  assert.ok(
    footer.includes(aliasGuard),
    "The shared outer alias guard must reject duplicates even when original_checks passes",
  );
  assert.ok(
    footer.indexOf(aliasGuard) <
      footer.indexOf("and not exists(select 1 from public.content_update"),
    "Alias and pending checks both gate the accepted original-or-successor state",
  );
  const migration = await read(
    "supabase/migrations/20261011000100_incarnate_release_compatibility.sql",
  );
  assert.equal(
    sha256(migration),
    "f4c2eeb9a230f14f96bef05f2278bf2bfa8cb3a4856147f1893e3a25481bd2a7",
  );
  assert.equal(
    migration.split(aliasGuard).length - 1,
    2,
    "The guard-only migration already rejects aliases in each exact state",
  );
});
