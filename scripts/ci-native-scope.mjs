/** Keep native database safety checks on relevant changes; unknown inputs always run them. */
import { appendFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { isDeepStrictEqual } from "node:util";
import { pathToFileURL } from "node:url";

/** Recognize frontend tests and presentation code that the native SQL harness does not consume. */
export function isFrontendOnlyPath(path) {
  return (
    path.startsWith("docs/") ||
    path.startsWith("frontend/public/") ||
    path.startsWith("frontend/cypress/") ||
    (path.startsWith("frontend/src/") &&
      !path.startsWith("frontend/src/schemas/")) ||
    /^frontend\/scripts\/[^/]+\.test\.mjs$/.test(path)
  );
}

/** Registering a rules regression does not change native dependencies or its commands. */
export function onlyRuleScriptChanged(before, after) {
  try {
    const previous = JSON.parse(before);
    const current = JSON.parse(after);
    if (
      typeof previous.scripts?.["test:rules"] !== "string" ||
      typeof current.scripts?.["test:rules"] !== "string"
    )
      return false;
    delete previous.scripts["test:rules"];
    delete current.scripts["test:rules"];
    return isDeepStrictEqual(previous, current);
  } catch {
    return false;
  }
}

/** Opt out only when every changed path is known not to affect native verification. */
export function nativeScope({ event, paths, beforePackage, afterPackage }) {
  if (event !== "pull_request")
    return {
      run_native: true,
      reason: "Full verification outside pull requests",
    };
  if (!Array.isArray(paths) || paths.length === 0)
    return {
      run_native: true,
      reason: "Changed-file evidence unavailable or empty",
    };
  for (const path of paths) {
    if (typeof path !== "string" || path.includes("..") || path.startsWith("/"))
      return { run_native: true, reason: "Unrecognized changed-file evidence" };
    if (isFrontendOnlyPath(path)) continue;
    if (
      path === "frontend/package.json" &&
      onlyRuleScriptChanged(beforePackage, afterPackage)
    )
      continue;
    return {
      run_native: true,
      reason:
        "Native input, dependency, configuration or unclassified path changed",
    };
  }
  return {
    run_native: false,
    reason:
      "Only frontend behavior, browser tests, rules-test registration or docs changed",
  };
}

/** Compare the exact PR endpoints, including deleted and renamed paths, without requiring full Git history. */
export function readNativeScope(
  environment = process.env,
  repository = process.cwd(),
) {
  const event = environment.CI_EVENT_NAME;
  if (event !== "pull_request") return nativeScope({ event });
  const base = environment.CI_BASE_SHA;
  const head = environment.CI_HEAD_SHA;
  if (
    ![base, head].every(
      (value) => typeof value === "string" && /^[a-f0-9]{40}$/.test(value),
    )
  )
    return {
      run_native: true,
      reason: "Exact PR endpoint revisions unavailable",
    };
  const git = (args) => {
    const result = spawnSync("git", args, {
      cwd: repository,
      encoding: "utf8",
      maxBuffer: 8 * 1024 * 1024,
    });
    if (result.error || result.status !== 0)
      throw new Error("Git evidence unavailable");
    return result.stdout;
  };
  try {
    const paths = git(["diff", "--name-only", "--no-renames", "-z", base, head])
      .split("\0")
      .filter(Boolean);
    const packages = paths.includes("frontend/package.json")
      ? {
          beforePackage: git(["show", `${base}:frontend/package.json`]),
          afterPackage: git(["show", `${head}:frontend/package.json`]),
        }
      : {};
    return nativeScope({ event, paths, ...packages });
  } catch {
    return {
      run_native: true,
      reason: "Git diff or dependency evidence unavailable",
    };
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const decision = readNativeScope();
  if (process.env.GITHUB_OUTPUT)
    appendFileSync(
      process.env.GITHUB_OUTPUT,
      `run_native=${decision.run_native}\n`,
    );
  console.log(JSON.stringify(decision));
}
