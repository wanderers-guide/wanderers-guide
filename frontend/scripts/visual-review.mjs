/** Local visual reviews only; fixture credentials never enter source control or screenshots. */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import cypress from 'cypress';
const project = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const file = process.env.WG_VISUAL_SESSION_FILE;
const output = process.env.WG_VISUAL_OUTPUT_DIR;
if (!file || !output) throw new Error('Set WG_VISUAL_SESSION_FILE and WG_VISUAL_OUTPUT_DIR. See docs/development.mdx.');
const fixture = JSON.parse(await readFile(file, 'utf8'));
/** Keep failed request details from retaining disposable credentials or session tokens. */
function redactReviewError(value) {
  if (typeof value !== 'string') return value;
  let safe = value;
  for (const account of Object.values(fixture.accounts ?? {}))
    for (const secret of [account.email, account.password])
      if (typeof secret === 'string' && secret.length) safe = safe.split(secret).join('[redacted local credential]');
  return safe
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[redacted session token]')
    .replace(/Bearer\s+[A-Za-z0-9._~+\/-]+=*/gi, 'Bearer [redacted]');
}
const baseUrl = process.env.WG_VISUAL_BASE_URL ?? 'http://127.0.0.1:5173';
for (const value of [baseUrl, fixture.origin])
  if (!['127.0.0.1', 'localhost', '[::1]'].includes(new URL(value).hostname))
    throw new Error('Visual fixture reviews require loopback origins.');
for (const role of ['owner', 'player', 'gm', 'mod', 'admin'])
  if (!fixture.accounts?.[role]?.email || !fixture.accounts[role].password || !fixture.accounts[role].profile)
    throw new Error('Provide synthetic local sign-in credentials and profiles for every review role.');
await mkdir(output, { recursive: true });
const result = await cypress.run({
  project,
  browser: process.env.WG_VISUAL_BROWSER ?? 'chrome',
  spec: join(
    project,
    'cypress/visual',
    `visual-${['pages', 'navigation', 'variants'].includes(process.argv[2]) ? process.argv[2] : 'surfaces'}.cy.js`
  ),
  config: {
    baseUrl,
    specPattern: 'cypress/visual/*.cy.js',
    viewportWidth: Number(process.env.WG_VISUAL_WIDTH ?? 1280),
    viewportHeight: Number(process.env.WG_VISUAL_HEIGHT ?? 800),
    screenshotsFolder: join(output, 'screenshots'),
    video: false,
    trashAssetsBeforeRuns: false,
  },
  env: {
    reviewRole: process.env.WG_VISUAL_ROLE ?? 'owner',
    reviewInputs: process.env.WG_VISUAL_INPUTS === 'true',
    reviewScheme: process.env.WG_VISUAL_SCHEME ?? 'light',
    reviewFilter: process.env.WG_VISUAL_FILTER,
    reviewInteractions: process.env.WG_VISUAL_INTERACTIONS !== 'false',
    reviewMetadataFolder: join(output, 'metadata'),
    recordedCatalogFile: process.env.WG_VISUAL_CATALOG_FILE,
    fixtureAccounts: Object.fromEntries(
      Object.entries(fixture.accounts).map(([role, account]) => [
        role,
        {
          email: account.email,
          password: account.password,
          userId: account.userId,
          profileId: account.profileId,
          profile: account.profile,
        },
      ])
    ),
    fixtureScenes: fixture.scenes,
    functions_url: fixture.origin + '/functions/v1',
  },
});
await writeFile(
  join(output, 'result.json'),
  JSON.stringify(
    {
      scheme: process.env.WG_VISUAL_SCHEME ?? 'light',
      width: Number(process.env.WG_VISUAL_WIDTH ?? 1280),
      filter: process.env.WG_VISUAL_FILTER,
      totalTests: result.totalTests,
      totalPassed: result.totalPassed,
      totalFailed: result.totalFailed,
      tests: result.runs?.flatMap((run) =>
        run.tests?.map((test) => ({
          title: test.title,
          state: test.state,
          displayError: redactReviewError(test.displayError),
        }))
      ),
    },
    null,
    2
  )
);
process.exitCode = result.totalFailed > 0 || result.failures ? 1 : 0;
