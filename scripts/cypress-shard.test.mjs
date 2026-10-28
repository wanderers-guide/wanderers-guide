import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { discoverSpecs, partitionSpecs } from "./cypress-shard.mjs";

test("long specs are balanced across isolated runners without duplication or omission", () => {
  const specs = ["a", "b", "c", "d", "e", "new"].map(
    (name) => `cypress/e2e/${name}.cy.ts`,
  );
  const durations = Object.fromEntries(
    specs.slice(0, 5).map((spec, i) => [spec, [200, 180, 100, 90, 30][i]]),
  );
  const shards = partitionSpecs(specs, 3, durations);
  assert.deepEqual(shards.flatMap((shard) => shard.specs).sort(), specs.sort());
  assert.deepEqual(
    shards.map((shard) => shard.estimated_seconds),
    [200, 240, 220],
  );
  assert.deepEqual(partitionSpecs([...specs].reverse(), 3, durations), shards);
});

test("every current spec is included exactly once even without recorded timing", () => {
  const specs = discoverSpecs(new URL("../frontend", import.meta.url).pathname);
  const shards = partitionSpecs(specs, 3);
  assert.ok(specs.length >= 35);
  assert.deepEqual(shards.flatMap((shard) => shard.specs).sort(), specs);
  assert.equal(
    new Set(shards.flatMap((shard) => shard.specs)).size,
    specs.length,
  );
});

test("discovery includes new JS and TS specs and ignores supporting files", () => {
  const root = mkdtempSync(join(tmpdir(), "wg-cypress-shards-"));
  try {
    mkdirSync(join(root, "cypress/e2e/nested"), { recursive: true });
    for (const name of [
      "new.cy.ts",
      "new.cy.tsx",
      "new.cy.js",
      "new.cy.jsx",
      "helper.ts",
    ])
      writeFileSync(join(root, "cypress/e2e/nested", name), "");
    assert.equal(discoverSpecs(root).length, 4);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("invalid matrix settings, duplicate specs and unsafe spec arguments fail", () => {
  const spec = "cypress/e2e/one.cy.ts";
  for (const count of [0, -1, 17, 1.5])
    assert.throws(() => partitionSpecs([spec], count));
  assert.throws(() => partitionSpecs([spec], 2));
  assert.throws(() => partitionSpecs([spec, spec], 1));
  for (const path of [
    "cypress/e2e/one.cy.ts,other",
    "cypress/e2e/one.cy.ts\nother",
    "../one.cy.ts",
  ])
    assert.throws(() => partitionSpecs([path], 1));
});
