import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import {
  nativeScope,
  onlyRuleScriptChanged,
  readNativeScope,
} from "./ci-native-scope.mjs";

const previous = JSON.stringify({
  scripts: { "test:rules": "node --test first.test.mjs", build: "tsc" },
  dependencies: { zod: "4.3.6" },
});
const addedTest = JSON.stringify({
  scripts: {
    "test:rules": "node --test first.test.mjs second.test.mjs",
    build: "tsc",
  },
  dependencies: { zod: "4.3.6" },
});

test("a frontend rules fix and its regression registration skip only the native SQL matrices", () => {
  assert.equal(
    nativeScope({
      event: "pull_request",
      paths: [
        "frontend/src/process/operations/operation-controller.ts",
        "frontend/scripts/eidolon-boosts.test.mjs",
        "frontend/package.json",
        "docs/guides/content-data.mdx",
      ],
      beforePackage: previous,
      afterPackage: addedTest,
    }).run_native,
    false,
  );
});

test("native inputs, schemas, dependencies, helpers, CI and unknown paths retain full verification", () => {
  for (const path of [
    "supabase/migrations/20261026000000_mine_mod_rules.sql",
    "supabase/release/requirements.json",
    "supabase/functions/create-character/index.ts",
    "data/data.sql",
    "docker-compose.yml",
    "docker/db-init/zzz-passwords.sh",
    ".github/workflows/e2e.yml",
    "scripts/treasure-vault-native-safety.mjs",
    "frontend/src/schemas/content.ts",
    "frontend/package-lock.json",
    "frontend/tsconfig.json",
    "frontend/scripts/operation-test-harness.mjs",
    "package.json",
    "new-native-input.txt",
    "../frontend/src/safe.ts",
    "/frontend/src/safe.ts",
  ])
    assert.equal(
      nativeScope({
        event: "pull_request",
        paths: ["docs/development.mdx", path],
      }).run_native,
      true,
      path,
    );
});

test("package exceptions cannot hide dependency, build or other script changes", () => {
  assert.equal(onlyRuleScriptChanged(previous, addedTest), true);
  for (const after of [
    addedTest.replace("4.3.6", "4.4.0"),
    addedTest.replace('"tsc"', '"other-build"'),
    addedTest.replace('"build":', '"new-script":'),
    "{",
    "{}",
    "null",
  ])
    assert.equal(
      nativeScope({
        event: "pull_request",
        paths: ["frontend/package.json"],
        beforePackage: previous,
        afterPackage: after,
      }).run_native,
      true,
    );
});

test("main pushes, manual runs, empty evidence and unknown events always run native checks", () => {
  for (const event of [
    "push",
    "workflow_dispatch",
    "pull_request_target",
    undefined,
  ])
    assert.equal(
      nativeScope({ event, paths: ["frontend/src/App.tsx"] }).run_native,
      true,
    );
  for (const paths of [undefined, [], [null]])
    assert.equal(
      nativeScope({ event: "pull_request", paths }).run_native,
      true,
    );
  assert.equal(
    readNativeScope({
      CI_EVENT_NAME: "pull_request",
      CI_BASE_SHA: "missing",
      CI_HEAD_SHA: "missing",
    }).run_native,
    true,
  );
});

test("real Git endpoints include renamed-away native files and fail closed on missing revisions", () => {
  const repository = mkdtempSync(join(tmpdir(), "wg-ci-native-scope-"));
  const git = (...args) =>
    execFileSync("git", args, {
      cwd: repository,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  const commit = () => {
    git("add", ".");
    git(
      "-c",
      "user.name=CI fixture",
      "-c",
      "user.email=fixture@example.invalid",
      "commit",
      "-m",
      "fixture",
    );
    return git("rev-parse", "HEAD");
  };
  try {
    git("init", "-q");
    mkdirSync(join(repository, "frontend/src"), { recursive: true });
    mkdirSync(join(repository, "supabase"), { recursive: true });
    writeFileSync(join(repository, "frontend/src/safe.ts"), "first");
    writeFileSync(join(repository, "supabase/old.sql"), "native SQL input");
    const base = commit();
    writeFileSync(join(repository, "frontend/src/safe.ts"), "second");
    const frontend = commit();
    const scope = (head) =>
      readNativeScope(
        { CI_EVENT_NAME: "pull_request", CI_BASE_SHA: base, CI_HEAD_SHA: head },
        repository,
      );
    assert.equal(scope(frontend).run_native, false);
    git("mv", "supabase/old.sql", "frontend/src/moved.ts");
    assert.equal(scope(commit()).run_native, true);
    assert.equal(scope("a".repeat(40)).run_native, true);
  } finally {
    rmSync(repository, { recursive: true, force: true });
  }
});
