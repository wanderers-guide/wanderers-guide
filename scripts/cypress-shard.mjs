/** Partition every browser spec exactly once; recorded timings balance work without selecting coverage. */
import { appendFileSync, readFileSync, readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

/** Assign long specs first to the least-loaded runner, with deterministic tie breaking. */
export function partitionSpecs(specs, count, durations = {}) {
  if (!Number.isInteger(count) || count < 1 || count > 16)
    throw new Error("Shard count must be 1–16");
  if (
    !Array.isArray(specs) ||
    specs.length < count ||
    new Set(specs).size !== specs.length
  )
    throw new Error("Every shard needs unique specs");
  for (const spec of specs)
    if (!/^cypress\/e2e\/[a-zA-Z0-9_/-]+\.cy\.(?:js|jsx|ts|tsx)$/.test(spec))
      throw new Error("Unsupported browser spec path");
  const weight = (spec) =>
    Number.isFinite(durations[spec]) && durations[spec] > 0
      ? durations[spec]
      : 60;
  const shards = Array.from({ length: count }, () => ({
    specs: [],
    estimated_seconds: 0,
  }));
  for (const spec of [...specs].sort(
    (a, b) => weight(b) - weight(a) || a.localeCompare(b),
  )) {
    const target = shards.reduce((best, shard) =>
      shard.estimated_seconds < best.estimated_seconds ? shard : best,
    );
    target.specs.push(spec);
    target.estimated_seconds += weight(spec);
  }
  return shards;
}

/** Discover the complete checked-in Cypress E2E tree, including newly added specs without timing history. */
export function discoverSpecs(frontend) {
  const specs = [];
  const visit = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.name.startsWith(".")) continue;
      const path = join(directory, entry.name);
      if (entry.isSymbolicLink())
        throw new Error("Browser spec inputs must not be symbolic links");
      if (entry.isDirectory()) visit(path);
      else if (/\.cy\.(?:js|jsx|ts|tsx)$/.test(entry.name))
        specs.push(relative(frontend, path).replaceAll("\\", "/"));
    }
  };
  visit(join(frontend, "cypress/e2e"));
  return specs.sort();
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const [indexArg, countArg] = process.argv.slice(2);
  if (
    !/^--index=\d+$/.test(indexArg ?? "") ||
    !/^--count=\d+$/.test(countArg ?? "") ||
    process.argv.length !== 4
  )
    throw new Error("Usage: cypress-shard.mjs --index=N --count=N");
  const index = Number(indexArg.split("=")[1]);
  const count = Number(countArg.split("=")[1]);
  const durations = JSON.parse(
    readFileSync(
      new URL("./cypress-spec-durations.json", import.meta.url),
      "utf8",
    ),
  );
  const shards = partitionSpecs(
    discoverSpecs(resolve("frontend")),
    count,
    durations,
  );
  if (!Number.isInteger(index) || index < 1 || index > count)
    throw new Error("Shard index is outside the matrix");
  const shard = shards[index - 1];
  if (process.env.GITHUB_OUTPUT)
    appendFileSync(
      process.env.GITHUB_OUTPUT,
      `spec=${shard.specs.join(",")}\n`,
    );
  console.log(JSON.stringify({ index, count, ...shard }));
}
