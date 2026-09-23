import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createRequire } from 'node:module';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const { build } = createRequire(`${root}/package.json`)('esbuild');
const directory = await mkdtemp(join(tmpdir(), 'wg-theme-color-'));
const outfile = join(directory, 'theme-color.mjs');

after(() => rm(directory, { recursive: true, force: true }));

await build({
  entryPoints: [`${root}/src/utils/theme-color.ts`],
  outfile,
  bundle: true,
  platform: 'node',
  format: 'esm',
  tsconfig: `${root}/tsconfig.json`,
  define: { 'import.meta.env': JSON.stringify({ VITE_ENV: 'test' }) },
});

const { generateThemeColors, resolveThemeColor } = await import(pathToFileURL(outfile));

test('valid custom colors still generate their own palette', () => {
  assert.notDeepEqual(generateThemeColors('#fa5252'), generateThemeColors());
});

test('persisted partial and malformed colors fall back without throwing', () => {
  const fallback = generateThemeColors();

  assert.deepEqual(generateThemeColors('#'), fallback);
  assert.deepEqual(generateThemeColors('not-a-color'), fallback);
  assert.equal(resolveThemeColor('#'), resolveThemeColor());
  assert.equal(resolveThemeColor('#fa5252'), '#fa5252');
});
