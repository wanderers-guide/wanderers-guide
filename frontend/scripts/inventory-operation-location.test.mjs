import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createOperationEngine, readContentRows } from './operation-test-harness.mjs';
import { content, inventoryItem, magicWeapon, summoner } from './fixtures/eidolon.mjs';

const coins = { cp: 0, sp: 0, gp: 0, pp: 0 };
const pipe = {
  id: 24000,
  name: 'Wandering Pipe',
  group: 'GENERAL',
  content_source_id: 400,
  usage: 'held in 1 hand',
  traits: [1527],
  meta_data: { bulk: {}, runes: { property: [] } },
  operations: [
    {
      id: '8e5c7147-8405-4b9d-a368-25941b669b92',
      type: 'addBonusToValue',
      data: { variable: 'SKILL_DECEPTION', value: 2, type: 'circumstance', text: 'while holding the pipe' },
    },
    {
      id: '280cb48d-c991-48ee-acd5-c4939cd26246',
      type: 'addBonusToValue',
      data: { variable: 'SKILL_STEALTH', value: -1, type: 'circumstance', text: 'while holding the pipe' },
    },
  ],
};
const equippedWeapon = {
  ...magicWeapon,
  id: 24001,
  name: 'Equipped test weapon',
  operations: [
    {
      id: 'test-weapon-bonus',
      type: 'addBonusToValue',
      data: { variable: 'SKILL_ATHLETICS', value: 1, type: 'item', text: '' },
    },
  ],
};

/** Put an inventory entry in a container without rewriting its saved equipment flags. */
function inPack(entry) {
  return inventoryItem(
    { id: 24002, name: 'Pack', group: 'GENERAL', meta_data: { bulk: { capacity: 4 } }, operations: [] },
    { container_contents: [entry] }
  );
}

/** Read the real book rows and use the published Wandering Pipe passive operations. */
async function fixtures() {
  const rows = await readContentRows([
    { table: 'item', id: 16929 },
    { table: 'item', id: 22344 },
  ]);
  const cloak = rows.find(({ row }) => row.id === 16929).row;
  const plushie = rows.find(({ row }) => row.id === 22344).row;
  return {
    cloak,
    plushie,
    packageContent: { ...content, items: [...content.items, cloak, plushie, pipe, equippedWeapon] },
  };
}

/** Calculate an entity through the real operation controller. */
async function calculate(engine, kind, items, packageContent, charStore) {
  const inventory = { coins, items };
  if (kind === 'character') {
    return engine._executeCharacterOperations({
      character: { ...summoner(), inventory },
      content: packageContent,
      context: 'CHARACTER-SHEET',
    });
  }
  return engine._executeCreatureOperations({
    id: 'companion',
    creature: { name: 'Companion', level: 1, operations: [], inventory },
    content: packageContent,
    charStore,
  });
}

/** Check both character and creature calculations against each inventory location. */
for (const kind of ['character', 'creature']) {
  test(`${kind} applies worn and held item operations only outside containers`, async (t) => {
    const engine = await createOperationEngine();
    t.after(() => engine.cleanup());
    const { cloak, plushie, packageContent } = await fixtures();
    const baseline = await calculate(engine, 'character', [], packageContent);
    const charStore = baseline.store;
    const run = (items) => calculate(engine, kind, items, packageContent, charStore);

    for (const usage of ['work cloak', 'worn cloak']) {
      const savedCloak = inventoryItem({ ...cloak, usage }, { is_invested: true });
      const original = structuredClone(savedCloak);
      const worn = await run([savedCloak]);
      assert.deepEqual(worn.store.variables.RESISTANCES.value, ['physical,15', 'precision,15']);
      assert.deepEqual(worn.store.variables.IMMUNITIES.value, ['electricity']);
      assert.equal(worn.store.variables.SPEED_FLY.value, 60);

      const packed = await run([inPack(savedCloak)]);
      assert.deepEqual(packed.store.variables.RESISTANCES.value, []);
      assert.deepEqual(packed.store.variables.IMMUNITIES.value, []);
      assert.equal(packed.store.variables.SPEED_FLY.value, 0);
      assert.deepEqual(packed.ors.itemResults, []);
      assert.deepEqual(savedCloak, original, 'saved item state remains unchanged');
    }

    const uninvestedCloak = await run([inventoryItem(cloak)]);
    assert.deepEqual(uninvestedCloak.store.variables.RESISTANCES.value, []);

    const heldPipe = await run([inventoryItem(pipe, { is_invested: true })]);
    assert.equal(heldPipe.store.bonuses.SKILL_DECEPTION[0].value, 2);
    assert.equal(heldPipe.store.bonuses.SKILL_STEALTH[0].value, -1);
    const packedPipe = await run([inPack(inventoryItem(pipe, { is_invested: true }))]);
    assert.equal(packedPipe.store.bonuses.SKILL_DECEPTION?.length ?? 0, 0);
    assert.equal(packedPipe.store.bonuses.SKILL_STEALTH?.length ?? 0, 0);

    const stowedPlushie = inventoryItem(plushie, { is_invested: true });
    const packedPlushie = await run([inPack(stowedPlushie)]);
    assert.equal(Number(packedPlushie.store.bonuses.SKILL_COMPUTERS[0].value), 2);
    assert.equal(packedPlushie.ors.itemResults[0].baseSource.id, 22344);
    assert.equal(
      engine.getFlatInvItems({ coins, items: [inPack(stowedPlushie)] }).filter((entry) => entry.is_invested).length,
      1,
      'stowed items still count toward the investment limit'
    );

    const equipped = await run([inventoryItem(equippedWeapon, { is_equipped: true })]);
    assert.equal(equipped.store.bonuses.SKILL_ATHLETICS[0].value, 1);
    const packedWeapon = await run([inPack(inventoryItem(equippedWeapon, { is_equipped: true }))]);
    assert.equal(packedWeapon.store.bonuses.SKILL_ATHLETICS?.length ?? 0, 0);
  });
}
