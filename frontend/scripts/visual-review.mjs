/** Local visual reviews only; fixture credentials never enter source control or screenshots. */
import { readFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import cypress from 'cypress';
const project = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const file = process.env.WG_VISUAL_SESSION_FILE;
const output = process.env.WG_VISUAL_OUTPUT_DIR;
if (!file || !output) throw new Error('Set WG_VISUAL_SESSION_FILE and WG_VISUAL_OUTPUT_DIR. See docs/development.mdx.');
const fixture = JSON.parse(await readFile(file, 'utf8'));
const baseUrl = process.env.WG_VISUAL_BASE_URL ?? 'http://127.0.0.1:5173';
for (const value of [baseUrl, fixture.origin])
  if (!['127.0.0.1', 'localhost', '[::1]'].includes(new URL(value).hostname))
    throw new Error('Visual fixture reviews require loopback origins.');
for (const role of ['owner', 'player', 'gm', 'mod', 'admin'])
  if (!fixture.accounts?.[role]?.session || !fixture.accounts[role].profile)
    throw new Error('Provide fresh synthetic sessions and profiles for every review role.');
await mkdir(output, { recursive: true });
const result = await cypress.run({
  project,
  browser: process.env.WG_VISUAL_BROWSER ?? 'chrome',
  spec: join(project, 'cypress/visual', process.argv[2] === 'pages' ? 'visual-pages.cy.js' : 'visual-surfaces.cy.js'),
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
    reviewScheme: process.env.WG_VISUAL_SCHEME ?? 'light',
    reviewFilter: process.env.WG_VISUAL_FILTER,
    reviewInteractions: process.env.WG_VISUAL_INTERACTIONS !== 'false',
    reviewMetadataFolder: join(output, 'metadata'),
    recordedCatalogFile: process.env.WG_VISUAL_CATALOG_FILE,
    fixtureAccounts: fixture.accounts,
    fixtureScenes: fixture.scenes,
    functions_url: fixture.origin + '/functions/v1',
  },
});
process.exitCode = result.totalFailed > 0 || result.failures ? 1 : 0;
