/** Exercise the real trait selector and Mantine validation with cached content fixtures. */
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
const directory = await mkdtemp(join(tmpdir(), 'wg-traits-input-'));
after(async () => {
  delete globalThis.__wgTraitsInputFixture;
  delete globalThis.__wgTraitsInputProps;
  await rm(directory, { recursive: true, force: true });
});

await build({
  entryPoints: [`${root}/src/common/TraitsInput.tsx`],
  outfile: join(directory, 'traits-input.cjs'),
  bundle: true,
  platform: 'node',
  format: 'cjs',
  jsx: 'automatic',
  tsconfig: `${root}/tsconfig.json`,
  plugins: [
    {
      name: 'cached-trait-boundaries',
      setup(builder) {
        const mocks = {
          '@tanstack/react-query':
            'export const useQuery = () => ({data: globalThis.__wgTraitsInputFixture, isFetching: false});',
          '@content/content-store':
            'export const fetchContentAll = async () => []; export const fetchContentSources = async () => [];',
          '@content/content-hidden':
            'export const isTraitVisible = (_store, trait) => trait.meta_data?.unselectable !== true;',
          '@mantine/core': `import React from ${JSON.stringify(require.resolve('react'))}; import {TagsInput as ActualTagsInput} from ${JSON.stringify(require.resolve('@mantine/core'))}; export const TagsInput = props => { globalThis.__wgTraitsInputProps = props; return React.createElement(ActualTagsInput, props); };`,
        };
        builder.onResolve({ filter: /.*/ }, (args) => {
          if (mocks[args.path]) return { path: args.path, namespace: 'fixture' };
          if (
            args.path === 'react' ||
            args.path.startsWith('react/') ||
            args.path === require.resolve('react') ||
            args.path === require.resolve('@mantine/core')
          )
            return { path: require.resolve(args.path), external: true };
        });
        builder.onLoad({ filter: /.*/, namespace: 'fixture' }, (args) => ({
          contents: mocks[args.path],
          loader: 'js',
        }));
      },
    },
  ],
});

const TraitsInput = require(join(directory, 'traits-input.cjs')).default;
const trait = (id, name = 'Solarian', source = 579) => ({ id, name, content_source_id: source, meta_data: {} });
const source = (id, name = 'Starfinder Player Core') => ({ id, name });

/** Keep the actual TagsInput mounted so duplicate options fail as they do in the item modal. */
function render(traits, sources, props = {}) {
  globalThis.__wgTraitsInputFixture = { traits, sources };
  renderToStaticMarkup(React.createElement(MantineProvider, { env: 'test' }, React.createElement(TraitsInput, props)));
  return globalThis.__wgTraitsInputProps;
}

test('same-name traits in one source can render and retain both IDs', () => {
  let values;
  const props = render([trait(1), trait(2)], [source(579)], {
    traits: [1, 2],
    onValuesChange: (value) => {
      values = value;
    },
  });
  assert.equal(new Set(props.data).size, 2);
  assert.equal(props.value.length, 2);
  props.onChange(props.value);
  assert.deepEqual(values, [1, 2]);
});

test('same-name homebrew bundles keep distinct trait choices', () => {
  let values;
  const props = render([trait(1, 'Fire', 10), trait(2, 'Fire', 11)], [source(10, 'Homebrew'), source(11, 'Homebrew')], {
    traits: [1, 2],
    onValuesChange: (value) => {
      values = value;
    },
  });
  assert.equal(new Set(props.data).size, 2);
  props.onChange(props.value);
  assert.deepEqual(values, [1, 2]);
});

test('ordinary and source-qualified labels remain unchanged', () => {
  const props = render(
    [trait(1, 'Fire', 10), trait(2, 'Fire', 11), trait(3, 'Solarian')],
    [source(10, 'Core'), source(11, 'Homebrew'), source(579)]
  );
  assert.deepEqual(props.data, ['Fire (Core)', 'Fire (Homebrew)', 'Solarian']);
});

test('repeated catalog rows do not duplicate options or make a legacy name ambiguous', () => {
  let values;
  const props = render([trait(1), trait(1)], [source(579)], {
    traits: ['Solarian'],
    onValuesChange: (value) => {
      values = value;
    },
  });
  assert.deepEqual(props.data, ['Solarian']);
  props.onChange(props.value);
  assert.deepEqual(values, [1]);
});

test('literal trait names cannot collide with generated source or ID labels', () => {
  const props = render(
    [trait(1, 'Fire', 10), trait(2, 'Fire', 11), trait(3, 'Fire (Core)'), trait(4, 'Fire (Core) (#1)')],
    [source(10, 'Core'), source(11, 'Other')]
  );
  assert.equal(new Set(props.data).size, 4);
});

test('ambiguous legacy names and free text remain unresolved rather than guessing an ID', () => {
  let values;
  let selected;
  const props = render([trait(1), trait(2)], [source(579)], {
    traits: ['Solarian', 'My custom trait'],
    onValuesChange: (value) => {
      values = value;
    },
    onTraitChange: (value) => {
      selected = value;
    },
  });
  props.onChange(props.value);
  assert.deepEqual(values, ['Solarian', 'My custom trait']);
  assert.deepEqual(selected, []);
});
