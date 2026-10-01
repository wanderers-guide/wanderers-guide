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
  entryPoints: [`${root}/src/process/content/hazard-links.ts`],
  outfile,
  bundle: true,
  platform: 'node',
  format: 'esm',
  tsconfig: `${root}/tsconfig.json`,
  plugins: [
    {
      name: 'hazard-reference-boundary',
      setup(builder) {
        builder.onResolve({ filter: /^\.\/(content-store|hardcoded-links)$/ }, ({ path }) => ({
          path,
          namespace: 'hazard-test',
        }));
        builder.onLoad({ filter: /.*/, namespace: 'hazard-test' }, ({ path }) => ({
          loader: 'js',
          contents:
            path === './hardcoded-links'
              ? `export function convertToHardcodedLink(type, name, displayText) {
                   const id = globalThis.hazardLinkTest.ids.get(type + ':' + name);
                   return id ? '[' + (displayText ?? name) + '](link_' + type + '_' + id + ')' : (displayText ?? name);
                 }`
              : `const fetch = (type) => async (name, sources) => {
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

const { preloadHazardReferences, linkHazardReferences } = await import(pathToFileURL(outfile));
const spellNames = ['gust of wind', 'thunderstrike', 'blazing bolt', 'spider sting', 'shatter', 'hydraulic push'];

beforeEach(() => {
  globalThis.hazardLinkTest = { calls: [], ids: new Map(), available: new Map() };
});

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
  const linked = linkHazardReferences(text);
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

  const linked = linkHazardReferences(text);
  assert.match(linked, /\[Strikes\]\(link_action_20\).*\[Strike\]\(link_action_20\)/);
  assert.match(linked, /\[Fly\]\(link_action_21\).*\[Flies\]\(link_action_21\)/);
  assert.equal((linked.match(/link_trait_22/g) ?? []).length, 2);
  assert.equal((linked.match(/link_trait_23/g) ?? []).length, 2);
  assert.match(linked, /Kaiju Environmental Complex clumsy 2 stunned 1/);
});

test('unavailable references remain readable prose', async () => {
  const text = 'The hazard Flies through a Kaiju aura.';
  await preloadHazardReferences({
    details: { stealth: '', description: text, disable: '', activation: { name: '', trigger: '', effect: '' } },
  });
  assert.equal(linkHazardReferences(text), text);
});

test('spirit damage links every occurrence without linking physical damage', async () => {
  globalThis.hazardLinkTest.available.set('trait:spirit', 1556);
  const text = '1d10 spirit damage, then Spirit damage and slashing damage.';
  await preloadHazardReferences({
    details: { stealth: '', description: text, disable: '', activation: { name: '', trigger: '', effect: '' } },
  });
  const linked = linkHazardReferences(text);
  assert.equal((linked.match(/link_trait_1556/g) ?? []).length, 2);
  assert.match(linked, /slashing damage/);
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
  const linked = linkHazardReferences(text);
  assert.equal((linked.match(/link_creature_800/g) ?? []).length, 2);
  assert.match(linked, /\[Verex-That-Was\]\(link_creature_801\)'s power/);
  assert.match(linked, /\[Oliphaunt\]\(link_creature_802\)'s trumpet/);
  assert.match(linked, /\[Oliphaunt of Jandelay\]\(link_creature_802\)/);
  assert.equal(globalThis.hazardLinkTest.calls.filter(({ type }) => type === 'creature').length, 3);
});
