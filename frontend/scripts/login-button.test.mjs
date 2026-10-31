/** Render the actual sign-in control with Mantine, retaining its single-button semantics. */
import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createRequire } from 'node:module';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(`${root}/package.json`);
const { build } = require('esbuild');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { MantineProvider } = require('@mantine/core');
const directory = await mkdtemp(join(tmpdir(), 'wg-login-button-'));
after(() => rm(directory, { recursive: true, force: true }));

await build({
  entryPoints: [`${root}/src/nav/LoginButton.tsx`],
  outfile: join(directory, 'login-button.cjs'),
  bundle: true,
  platform: 'node',
  format: 'cjs',
  jsx: 'automatic',
  tsconfig: `${root}/tsconfig.json`,
  plugins: [
    {
      name: 'existing-frontend-packages',
      setup(builder) {
        builder.onResolve({ filter: /^[^./]/ }, ({ path }) => {
          if (path.startsWith('@utils/')) return { path: `${root}/src/utils/${path.slice(7)}.ts` };
          return { path: require.resolve(path), external: true };
        });
      },
    },
  ],
});

const { LoginButton } = require(join(directory, 'login-button.cjs'));
const render = () =>
  renderToStaticMarkup(
    React.createElement(MantineProvider, { env: 'test' }, React.createElement(LoginButton, { onClick() {} }))
  );

test('sign in and registration retain exactly one native button', () => {
  const html = render();
  assert.equal((html.match(/<button\b/g) ?? []).length, 1);
  assert.match(html, /Sign in/);
  assert.match(html, /Register/);
});

test('the existing icon is decorative, without another tab stop or button role', () => {
  const html = render();
  const icon = /<span\b[^>]*class="[^"]*mantine-ActionIcon-root[^"]*"[^>]*>/.exec(html)?.[0];
  assert(icon, 'The existing ActionIcon must render as a span');
  assert.match(icon, /aria-hidden="true"/);
  assert.doesNotMatch(icon, /\b(?:tabindex|role|disabled)=/);
});
