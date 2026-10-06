/** Exercise the real RichText renderer when damage traits and conditions share a phrase. */
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createOperationEngine, readContentRows } from './operation-test-harness.mjs';

let engine;
let fire;
before(async () => {
  engine = await createOperationEngine({ renderRichText: true });
  const fixtures = await readContentRows([{ table: 'trait', id: 1542 }]);
  engine.setFixtures(fixtures);
  fire = engine.convertToHardcodedLink('trait', 'fire');
  assert.equal(fire, '[fire](link_trait_1542)');
});
after(async () => engine?.cleanup());

/** Return rendered anchors without depending on Mantine's generated class names. */
function anchors(html) {
  return [...html.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/g)].map((match) => match[1].replace(/<[^>]+>/g, ''));
}

/** Strip Mantine's style blocks so raw-markup checks inspect only the rendered content. */
function render(text, blacklist = []) {
  return engine.renderRichText(text, blacklist).replace(/<style\b[^>]*>[\s\S]*?<\/style>/g, '');
}

test('linked damage traits retain their own link alongside persistent-damage help', () => {
  const html = render(`1d6 persistent ${fire} damage.`);
  assert.deepEqual(anchors(html), ['persistent', 'fire', 'damage']);
  assert.match(html, /1d6 /);
  assert.match(html, /<\/a>\./);
  assert.doesNotMatch(html, /\[|\]|link_condition_|link_trait_|<a\b[^>]*>(?:(?!<\/a>)[\s\S])*<a\b/);
});

test('every repeated persistent phrase and trait occurrence remains individually linked', () => {
  const html = render(`persistent ${fire} damage, then persistent ${fire} damage.`);
  assert.deepEqual(anchors(html), ['persistent', 'fire', 'damage', 'persistent', 'fire', 'damage']);
});

test('ordinary persistent-damage wording retains the existing whole-phrase anchor', () => {
  for (const phrase of [
    'persistent damage',
    'persistent fire damage',
    'persistent bleed damage',
    'Persistent mental damage',
  ]) {
    assert.deepEqual(anchors(render(phrase)), [phrase]);
  }
});

test('a persistent-damage blacklist leaves the trait link intact and suppresses condition links', () => {
  assert.deepEqual(anchors(render(`persistent ${fire} damage`, ['persistent damage'])), ['fire']);
  assert.deepEqual(anchors(render('persistent fire damage', ['persistent damage'])), []);
});

test('existing condition and external links are not wrapped in another persistent-damage link', () => {
  for (const href of ['link_condition_persistent~damage', 'https://example.com/rules']) {
    const html = render(`[persistent fire damage](${href})`);
    assert.deepEqual(anchors(html), ['persistent fire damage']);
    assert.doesNotMatch(html, /\[|\]|<a\b[^>]*>(?:(?!<\/a>)[\s\S])*<a\b/);
  }
});

test('emphasis around the phrase and numeric dice are unchanged', () => {
  const html = render(`**2d6 persistent ${fire} damage**`);
  assert.deepEqual(anchors(html), ['persistent', 'fire', 'damage']);
  assert.match(html, /<strong>2d6 /);
  assert.match(html, /<\/a><\/strong>/);
});

test('ordinary damage and unrelated words do not acquire persistent-condition links', () => {
  assert.deepEqual(anchors(render(`2d6 ${fire} damage; nonpersistent fire damage; damage persists.`)), ['fire']);
});

test('condition detection preserves complete authored links and literal code examples', () => {
  const label = 'take persistent fire damage and stunned 1';
  const html = render(`[${label}](https://example.com/rules) and \`persistent fire damage; stunned 1\`.`);
  assert.deepEqual(anchors(html), [label]);
  assert.match(html, /href="https:\/\/example.com\/rules"/);
  assert.match(html, />persistent fire damage; stunned 1<\/code>/);
  assert.doesNotMatch(html, /\[persistent|\[stunned|link_condition_/);
  const fenced = render('```text\npersistent fire damage; stunned 1\n```');
  assert.deepEqual(anchors(fenced), []);
  assert.match(fenced, /persistent fire damage; stunned 1/);
  assert.doesNotMatch(fenced, /\[persistent|\[stunned|link_condition_/);
});

test('listed damage alternatives retain every trait link and persistent-condition help', () => {
  const acid = '[acid](link_trait_1528)';
  const cold = '[cold](link_trait_1519)';
  const poison = '[poison](link_trait_1476)';
  for (const conjunction of ['or', 'and']) {
    const text = `2d4 persistent ${acid}, ${cold}, ${fire}, ${conjunction} ${poison} damage.`;
    const html = render(text);
    assert.deepEqual(anchors(html), ['persistent', 'acid', 'cold', 'fire', 'poison', 'damage']);
    assert.doesNotMatch(html, /\[|\]|<a\b[^>]*>(?:(?!<\/a>)[\s\S])*<a\b/);
    assert.deepEqual(anchors(render(text, ['persistent damage'])), ['acid', 'cold', 'fire', 'poison']);
  }
  assert.deepEqual(anchors(render(`persistent ${cold} or ${fire} damage`)), ['persistent', 'cold', 'fire', 'damage']);
  assert.deepEqual(anchors(render('persistent acid, cold, or fire damage')), ['persistent acid, cold, or fire damage']);
});

test('Blood Booster shorthand gains condition help only beside a complete joined damage phrase', () => {
  const poison = '[poison](link_trait_1476)';
  for (const conjunction of ['and', 'or']) {
    const text = `persistent bleed ${conjunction} persistent ${poison} damage`;
    assert.deepEqual(anchors(render(text)), ['persistent bleed', 'persistent', 'poison', 'damage']);
    assert.deepEqual(anchors(render(text, ['persistent damage'])), ['poison']);
  }
  assert.deepEqual(anchors(render('persistent bleed')), []);
  assert.deepEqual(anchors(render(`persistent memories and persistent ${poison} damage`)), [
    'persistent',
    'poison',
    'damage',
  ]);
});

test('render-only condition options do not become attributes on visible text or links', () => {
  const html = render(`stunned 1; persistent ${fire} damage`, ['persistent damage']);
  assert.deepEqual(anchors(html), ['stunned', 'fire']);
  assert.doesNotMatch(html, /conditionBlacklist|conditionblacklist|\sstore=/);
});

test('nested result tiers retain indentation without forwarding indentation options to the page', () => {
  const html = render('**Frequency** once per day.\n\n**Success** stunned 1.\n\n**Failure** frightened 1.');
  assert.deepEqual(anchors(html), ['stunned', 'frightened']);
  assert.match(html, /margin-left:/);
  assert.match(html, /text-indent:/);
  assert.doesNotMatch(html, /indentMod|indentmod|conditionBlacklist|conditionblacklist/);
});

test('result-tier containers do not nest paragraph elements or lose emphasized trait links', () => {
  const html = render(`**Activate** once per day.\n\n**Success** 2d6 persistent *${fire}* damage.`);
  assert.deepEqual(anchors(html), ['persistent', 'fire', 'damage']);
  assert.match(html, /<em><a\b/);
  assert.doesNotMatch(html, /<p\b[^>]*>(?:(?!<\/p>)[\s\S])*<p\b/);
});
