import assert from 'node:assert/strict';
import { after, beforeEach, test } from 'node:test';
import { createRequire } from 'node:module';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const { build } = createRequire(`${root}/package.json`)('esbuild');
const directory = await mkdtemp(join(tmpdir(), 'wg-hazard-links-'));
const outfile = join(directory, 'links.mjs');

after(() => rm(directory, { recursive: true, force: true }));

await build({
  stdin: {
    contents: `
      export * from './src/process/content/hazard-links';
      import React from 'react';
      import {renderToStaticMarkup} from 'react-dom/server';
      import {MantineProvider, DEFAULT_THEME} from '@mantine/core';
      import RichText from './src/common/RichText';
      /** Render the actual component with either omitted or explicitly supplied prose transforms. */
      export function renderRichText(text, plugins) {
        const props = {children: text};
        if (plugins !== undefined) props.remarkPlugins = plugins;
        return renderToStaticMarkup(React.createElement(MantineProvider,
          {theme: {colors: {guide: DEFAULT_THEME.colors.blue}}}, React.createElement(RichText, props)));
      }
    `,
    resolveDir: root,
    loader: 'ts',
  },
  outfile,
  bundle: true,
  platform: 'node',
  format: 'esm',
  banner: { js: "import {createRequire} from 'node:module'; const require = createRequire(import.meta.url);" },
  define: { 'import.meta.env': JSON.stringify({ VITE_ENV: 'production' }) },
  tsconfig: `${root}/tsconfig.json`,
  plugins: [
    {
      name: 'hazard-reference-boundary',
      setup(builder) {
        // Plain source fixtures do not evaluate character expressions or alter character state.
        builder.onResolve({ filter: /^@variables\/variable-utils$/ }, () => ({
          path: 'expressions',
          namespace: 'render-boundary',
        }));
        builder.onResolve({ filter: /^@content\/system-handler$/ }, () => ({
          path: 'system',
          namespace: 'render-boundary',
        }));
        builder.onResolve({ filter: /^\.\.\/variables\/variable-manager$/ }, ({ importer }) =>
          importer.endsWith('/condition-handler.ts') ? { path: 'variables', namespace: 'render-boundary' } : undefined
        );
        builder.onLoad({ filter: /.*/, namespace: 'render-boundary' }, ({ path }) => ({
          loader: 'js',
          contents:
            path === 'expressions'
              ? 'export const compileExpressions = (_store, text) => text;'
              : path === 'system'
                ? 'export const isPlayingPathfinder = () => false; export const isPlayingStarfinder = () => false;'
                : 'export const getVariable = () => ({value: false}); export const addVariableBonus = () => {}; export const adjVariable = () => {}; export const getAllSaveVariables = () => []; export const getAllSkillVariables = () => []; export const getAllSpeedVariables = () => [];',
        }));
        builder.onResolve({ filter: /^(?:\.\/content-store|@content\/content-store)$/ }, ({ path }) => ({
          path,
          namespace: 'hazard-test',
        }));
        builder.onLoad({ filter: /.*/, namespace: 'hazard-test' }, () => ({
          loader: 'js',
          contents: `export const getCachedContent = type => [...globalThis.hazardLinkTest.ids].flatMap(([key, id]) => {
                   const [subtype, name] = key.split(':');
                   if (type === subtype && subtype !== 'action') return [{id, name}];
                   if (type === 'ability-block' && subtype === 'action') return [{id, name, type: subtype}];
                   return [];
                 });
                 const fetch = (type) => async (name, sources) => {
                   const state = globalThis.hazardLinkTest;
                   state.calls.push({ type, name, sources });
                   const key = type + ':' + name;
                   if (!state.available.has(key)) return null;
                   state.ids.set(key, state.available.get(key));
                   return { id: state.ids.get(key), name };
                 };
                 export const fetchSpellByName = fetch('spell');
                 export const fetchAbilityBlockByName = fetch('action');
                 export const fetchTraitByName = fetch('trait');
                 export const fetchCreatureByName = fetch('creature');`,
        }));
      },
    },
  ],
});

globalThis.hazardLinkTest = { calls: [], ids: new Map(), available: new Map() };
const { preloadHazardReferences, remarkHazardReferences, renderRichText } = await import(pathToFileURL(outfile));
const spellNames = ['gust of wind', 'thunderstrike', 'blazing bolt', 'spider sting', 'shatter', 'hydraulic push'];

beforeEach(() => {
  globalThis.hazardLinkTest = { calls: [], ids: new Map(), available: new Map() };
});

/** Render through the same Markdown/GFM plugin order as RichText and retain the parsed AST. */
function render(text, { ready = true } = {}) {
  let tree;
  const capture = () => (value) => {
    tree = structuredClone(value);
  };
  const html = renderRichText(text, [...(ready ? [remarkHazardReferences] : []), capture]).replace(
    /<style\b[^>]*>[\s\S]*?<\/style>/g,
    ''
  );
  return { html, tree };
}

/** Collect each rendered link occurrence, not just distinct destinations. */
function links(tree) {
  const output = [];
  const visit = (node) => {
    if (node.type === 'link')
      output.push({ label: node.children.map((child) => child.value ?? '').join(''), url: node.url });
    if ('children' in node) node.children.forEach(visit);
  };
  visit(tree);
  return output;
}

/** Keep the legacy expectations readable while inspecting real parsed link nodes. */
function linkedMarkdown(text) {
  return links(render(text).tree)
    .map(({ label, url }) => `[${label}](${url})`)
    .join(' ');
}

test('catalog-only hazard visit preloads all six named spells before linking each occurrence', async () => {
  for (const [index, name] of spellNames.entries()) {
    globalThis.hazardLinkTest.available.set(`spell:${name}`, index + 100);
  }
  const text =
    '1 air (gust of wind); 2 electricity (thunderstrike); 3 fire (blazing bolt); ' +
    '4 poison (spider sting); 5 sonic (shatter); 6 water (hydraulic push). Gust of wind returns.';
  const hazard = {
    details: {
      stealth: '',
      description: '',
      disable: '',
      activation: { name: '', trigger: '', effect: '' },
      routine: { text },
    },
  };

  await preloadHazardReferences(hazard);

  assert.deepEqual(
    globalThis.hazardLinkTest.calls
      .map(({ type, name }) => `${type}:${name}`)
      .filter((key) => key.startsWith('spell:')),
    spellNames.map((name) => `spell:${name}`)
  );
  assert.ok(globalThis.hazardLinkTest.calls.every(({ sources }) => sources === 'ALL-OFFICIAL-PUBLIC'));
  const linked = linkedMarkdown(text);
  for (const [index, name] of spellNames.entries()) {
    assert.ok(linked.includes(`[${name}](link_spell_${index + 100})`));
  }
  assert.ok(linked.includes('[Gust of wind](link_spell_100)'));
});

test('capitalized actions and energy traits link every occurrence, while unknown labels stay plain', async () => {
  const state = globalThis.hazardLinkTest;
  state.available.set('action:Strike', 20);
  state.available.set('action:Fly', 21);
  state.available.set('trait:electricity', 22);
  state.available.set('trait:air', 23);
  const text =
    'Two Strikes, then one Strike. Fly, and later Flies. Electricity, electricity, air, air. ' +
    'Kaiju Environmental Complex clumsy 2 stunned 1.';
  await preloadHazardReferences({
    details: {
      stealth: '',
      description: '',
      disable: '',
      activation: { name: '', traits: ['Electricity'], trigger: '', effect: text },
    },
  });

  const { tree } = render(text);
  const linked = linkedMarkdown(text);
  assert.match(linked, /\[Strikes\]\(link_action_20\).*\[Strike\]\(link_action_20\)/);
  assert.match(linked, /\[Fly\]\(link_action_21\).*\[Flies\]\(link_action_21\)/);
  assert.equal((linked.match(/link_trait_22/g) ?? []).length, 2);
  assert.equal((linked.match(/link_trait_23/g) ?? []).length, 2);
  assert.ok(!links(tree).some(({ label }) => /Kaiju|clumsy|stunned/.test(label)));
});

test('unavailable references remain readable prose', async () => {
  const text = 'The hazard Flies through a Kaiju aura.';
  await preloadHazardReferences({
    details: { stealth: '', description: text, disable: '', activation: { name: '', trigger: '', effect: '' } },
  });
  const cold = render(text, { ready: false });
  const warm = render(text);
  assert.equal(warm.html, cold.html);
  assert.deepEqual(links(warm.tree), []);
});

test('spirit damage links every occurrence without linking physical damage', async () => {
  globalThis.hazardLinkTest.available.set('trait:spirit', 1556);
  const text = '1d10 spirit damage, then Spirit damage and slashing damage.';
  await preloadHazardReferences({
    details: { stealth: '', description: text, disable: '', activation: { name: '', trigger: '', effect: '' } },
  });
  const linked = linkedMarkdown(text);
  assert.equal((linked.match(/link_trait_1556/g) ?? []).length, 2);
  assert.match(render(text).html, /slashing damage/);
  assert.ok(globalThis.hazardLinkTest.calls.every(({ sources }) => sources === 'ALL-OFFICIAL-PUBLIC'));
});

test('named source creatures link repeated and possessive references through their canonical names', async () => {
  for (const [index, name] of ['Agyra', 'Verex-That-Was', 'Oliphaunt of Jandelay'].entries()) {
    globalThis.hazardLinkTest.available.set(`creature:${name}`, 800 + index);
  }
  const text =
    "Agyra flies. Agyra rests. Verex-That-Was's power and the Oliphaunt's trumpet connect to the Oliphaunt of Jandelay.";
  await preloadHazardReferences({
    details: { stealth: '', description: text, disable: '', activation: { name: '', trigger: '', effect: '' } },
  });
  const { tree, html } = render(text);
  const linked = linkedMarkdown(text);
  assert.equal((linked.match(/link_creature_800/g) ?? []).length, 2);
  assert.ok(links(tree).some(({ label, url }) => label === 'Verex-That-Was' && url === 'link_creature_801'));
  assert.match(html, /<\/a>&#x27;s power/);
  assert.ok(links(tree).some(({ label, url }) => label === 'Oliphaunt' && url === 'link_creature_802'));
  assert.match(html, /<\/a>&#x27;s trumpet/);
  assert.match(linked, /\[Oliphaunt of Jandelay\]\(link_creature_802\)/);
  assert.equal(globalThis.hazardLinkTest.calls.filter(({ type }) => type === 'creature').length, 3);
});

test('preload readiness preserves curated anchors and enriches every remaining plain occurrence', async () => {
  const state = globalThis.hazardLinkTest;
  state.available.set('trait:fire', 1542);
  state.available.set('action:Strike', 19856);
  const text =
    'Creatures take [fire](link_trait_1542) damage, then fire and fire. [Strike](link_action_19856), then Strike.';
  const before = render(text, { ready: false });
  assert.deepEqual(
    links(before.tree).map(({ label }) => label),
    ['fire', 'Strike']
  );
  assert.equal(
    await preloadHazardReferences({
      details: {
        stealth: '',
        description: '',
        disable: '',
        activation: { name: '', trigger: '', effect: text },
      },
    }),
    true
  );
  const after = render(text);
  assert.deepEqual(links(after.tree), [
    { label: 'fire', url: 'link_trait_1542' },
    { label: 'fire', url: 'link_trait_1542' },
    { label: 'fire', url: 'link_trait_1542' },
    { label: 'Strike', url: 'link_action_19856' },
    { label: 'Strike', url: 'link_action_19856' },
  ]);
  assert.doesNotMatch(after.html, /\[|\]|\(link_|<a\b[^>]*>(?:(?!<\/a>)[\s\S])*<a\b/);
  assert.equal(state.calls.length, 2);
  assert.ok(state.calls.every(({ sources }) => sources === 'ALL-OFFICIAL-PUBLIC'));
});

test('hazard transform is idempotent and leaves authored links and code nodes untouched', () => {
  globalThis.hazardLinkTest.ids.set('trait:fire', 1542);
  const text = '[fire](link_trait_1542) and fire; `fire`; [fire](https://example.test/fire).';
  const { tree } = render(text, { ready: false });
  const paragraph = tree.children[0];
  const authored = paragraph.children.filter((node) => node.type === 'link' || node.type === 'inlineCode');
  const bytes = JSON.stringify(authored);
  const transform = remarkHazardReferences();
  transform(tree);
  const first = structuredClone(tree);
  transform(tree);
  assert.deepEqual(tree, first);
  assert.equal(JSON.stringify(authored), bytes);
  assert.ok(authored.every((node) => tree.children[0].children.includes(node)));
  assert.equal(links(tree).length, 3);
});

test('external and reference links, autolinks, images, and fenced/inline code are opaque', () => {
  globalThis.hazardLinkTest.ids.set('trait:fire', 1542);
  const text =
    '[fire](https://example.test/fire "fire title")\n\n' +
    '[fire][rules] and ![fire](https://example.test/fire.png "fire") and ![fire][image]\n\n' +
    '[rules]: https://example.test/fire "fire"\n[image]: https://example.test/fire.png\n\n' +
    '<https://example.test/fire> and https://example.test/fire\n\n`fire`\n\n```text\nfire\n```';
  const before = render(text, { ready: false });
  const after = render(text);
  assert.deepEqual(after.tree, before.tree);
  assert.equal(after.html, before.html);
  assert.match(after.html, /<code\b[^>]*>fire<\/code>/);
  assert.match(after.html, /<code\b[^>]*>fire\n<\/code>/);
  assert.doesNotMatch(after.html, /link_trait_/);
});

test('emphasis, GFM table cells, and list prose link each eligible occurrence', () => {
  globalThis.hazardLinkTest.ids.set('trait:fire', 1542);
  const text =
    '**fire** and *Fire* and ~~fire~~.\n\n- fire\n- fire\n\n| Damage | Again |\n| --- | --- |\n| fire | fire |';
  const { tree, html } = render(text);
  assert.deepEqual(
    links(tree).map(({ label }) => label),
    ['fire', 'Fire', 'fire', 'fire', 'fire', 'fire', 'fire']
  );
  assert.ok(links(tree).every(({ url }) => url === 'link_trait_1542'));
  assert.match(html, /<strong><a\b/);
  assert.match(html, /<em><a\b/);
  assert.match(html, /<del><a\b/);
  assert.match(html, /<table\b/);
  assert.match(html, /<ul\b/);
});

test('hazard trait links precede condition linking without linking conditions or physical damage', () => {
  globalThis.hazardLinkTest.ids.set('trait:fire', 1542);
  const text = 'frightened 1; persistent [fire](link_trait_1542) damage; persistent fire damage; slashing damage.';
  const { tree, html } = render(text);
  assert.deepEqual(
    links(tree).map(({ label }) => label),
    ['fire', 'fire']
  );
  const anchors = [...html.matchAll(/<a\b[^>]*>(.*?)<\/a>/g)].map((match) => match[1]);
  assert.deepEqual(anchors, ['frightened', 'persistent', 'fire', 'damage', 'persistent', 'fire', 'damage']);
  assert.match(html, /slashing damage/);
  assert.doesNotMatch(html, /\[|\]|<a\b[^>]*>(?:(?!<\/a>)[\s\S])*<a\b/);
});

test('actual RichText default output is byte-identical when optional prose plugins are omitted or empty', () => {
  globalThis.hazardLinkTest.ids.set('trait:fire', 1542);
  for (const text of [
    'fire and fire; frightened 1; persistent [fire](link_trait_1542) damage.',
    '**Success** stunned 1.\n\n[fire](https://example.test/fire) and `fire`.',
    '| Damage |\n| --- |\n| fire |\n\n- fire',
  ]) {
    const omitted = renderRichText(text);
    assert.equal(renderRichText(text, []), omitted);
    assert.equal(renderRichText(text, [() => () => {}]), omitted);
    assert.doesNotMatch(omitted, /remarkPlugins|remarkplugins/);
  }
});

test('ordinary RichText keeps cached energy prose plain while preserving authored and automatic condition links', () => {
  globalThis.hazardLinkTest.ids.set('trait:fire', 1542);
  const text =
    'fire and fire; [fire](link_trait_1542); frightened 1; persistent fire damage; ' +
    'persistent [fire](link_trait_1542) damage; slashing damage.';
  const html = renderRichText(text).replace(/<style\b[^>]*>[\s\S]*?<\/style>/g, '');
  const anchors = [...html.matchAll(/<a\b[^>]*>(.*?)<\/a>/g)].map((match) => match[1]);
  assert.deepEqual(anchors, ['fire', 'frightened', 'persistent fire damage', 'persistent', 'fire', 'damage']);
  assert.match(html, />fire and fire; /);
  assert.match(html, /slashing damage/);
  assert.doesNotMatch(html, /\[|\]|<a\b[^>]*>(?:(?!<\/a>)[\s\S])*<a\b/);
});
