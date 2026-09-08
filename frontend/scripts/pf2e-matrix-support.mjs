import assert from 'node:assert/strict';
import { createOperationEngine, readContentRows } from './operation-test-harness.mjs';

const sourceIds = [1, 3, 14, 256];
const contentTables = {
  abilityBlocks: 'ability_block',
  classes: 'class',
  traits: 'trait',
  ancestries: 'ancestry',
  backgrounds: 'background',
  languages: 'language',
  items: 'item',
  spells: 'spell',
  archetypes: 'archetype',
  versatileHeritages: 'versatile_heritage',
  classArchetypes: 'class_archetype',
};
const classIds = { Fighter: 20, Wizard: 26, Rogue: 25, Monk: 111 };
const itemIds = {
  Longsword: 7090,
  Dagger: 6854,
  Longbow: 7088,
  'Leather Armor': 7068,
  Breastplate: 6765,
  'Full Plate': 6985,
};

/** Catch fixture mutation instead of allowing one calculation to alter later test inputs. */
function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}

/**
 * The audit's four official sources are the local corpus, not generated fixture exports.
 * Real class features and their grants run through executeOperations; only content I/O is mocked.
 */
export async function createPf2eMatrix() {
  const engine = await createOperationEngine();
  try {
    const rows = await readContentRows([
      ...Object.values(contentTables).map((table) => ({ table, sourceIds })),
      ...sourceIds.map((id) => ({ table: 'content_source', id })),
    ]);
    const content = Object.fromEntries(
      Object.entries(contentTables).map(([key, table]) => [
        key,
        rows.filter((entry) => entry.table === table).map(({ row }) => row),
      ])
    );
    content.sources = rows.filter(({ table }) => table === 'content_source').map(({ row }) => row);
    content.defaultSources = { PAGE: sourceIds, INFO: sourceIds };
    freeze(rows);
    freeze(content);
    engine.setFixtures(rows);

    /** Select explicit identities so a homebrew/reprint name collision cannot change the oracle. */
    function fixture(table, id, name, sourceId = 1) {
      const row = rows.find((entry) => entry.table === table && entry.row.id === id)?.row;
      assert.ok(row, `Missing ${table} fixture ${id} (${name})`);
      assert.equal(row.name, name, `${table} ${id} was renamed`);
      assert.equal(row.content_source_id, sourceId, `${table} ${id} changed source`);
      return row;
    }
    const classes = Object.fromEntries(
      Object.entries(classIds).map(([name, id]) => [name, fixture('class', id, name, name === 'Monk' ? 256 : 1)])
    );
    const items = Object.fromEntries(Object.entries(itemIds).map(([name, id]) => [name, fixture('item', id, name)]));
    const dwarf = fixture('ancestry', 4, 'Dwarf');
    fixture('ability_block', 20661, 'Unburdened Iron');
    let calculations = 0;

    function condition(name, value) {
      const data = engine.getConditionByName(name);
      assert.ok(data, `Unknown condition ${name}`);
      return { ...data, ...(value === undefined ? {} : { value }) };
    }

    /** Explicit attributes/ancestry HP isolate class progression from optional builder selections. */
    function character(className, level = 5) {
      const attributes =
        className === 'Wizard'
          ? { STR: 0, DEX: 3, CON: 2, INT: 4, WIS: 0, CHA: 0 }
          : { STR: 4, DEX: 2, CON: 2, INT: 0, WIS: 1, CHA: 0 };
      const set = (variable, value) => ({ id: `matrix-set-${variable}`, type: 'setValue', data: { variable, value } });
      assert.ok(classes[className], `Unknown class fixture ${className}`);
      return {
        id: 1,
        level,
        hp_current: 20,
        details: { class: classes[className], conditions: [] },
        inventory: { items: [], coins: { cp: 0, sp: 0, gp: 0, pp: 0 } },
        content_sources: { enabled: sourceIds },
        meta_data: { reset_hp: false },
        operation_data: { selections: {} },
        options: { custom_operations: true, ignore_bulk_limit: true },
        custom_operations: [
          ...Object.entries(attributes).map(([attribute, value]) => set(`ATTRIBUTE_${attribute}`, { value })),
          set('MAX_HEALTH_ANCESTRY', 8),
          set('SPEED', 25),
        ],
      };
    }

    /** Real sheet calculation stages, with independent expected values supplied by the tests. */
    async function calculate(data, conditions = data.details.conditions ?? [], configure, context = 'CHARACTER-SHEET') {
      calculations++;
      engine.clearOperationErrorNotifications();
      await engine.executeOperations(
        { type: 'CHARACTER', data: { character: data, content, context } },
        { directExecution: true }
      );
      engine.setVariable('CHARACTER', 'PROF_WITHOUT_LEVEL', data.variants?.proficiency_without_level ?? false);
      engine.setVariable('CHARACTER', 'STAMINA_VARIANT', data.variants?.stamina ?? false);
      engine.applyEquipmentPenalties('CHARACTER', data);
      engine.applyConditions('CHARACTER', conditions);
      configure?.();
      const result = {
        ac: engine.getFinalAcValue('CHARACTER', engine.getBestArmor('CHARACTER', data.inventory)?.item),
        hp: engine.getFinalHealthValue('CHARACTER'),
        stamina: engine.getFinalStaminaValue('CHARACTER'),
        speed: engine.getSpeedValue('CHARACTER', engine.getVariable('CHARACTER', 'SPEED'), data).total,
        reflex: Number(engine.getFinalProfValue('CHARACTER', 'SAVE_REFLEX')),
        fort: Number(engine.getFinalProfValue('CHARACTER', 'SAVE_FORT')),
        sword: engine.getWeaponStats('CHARACTER', items.Longsword).attack_bonus.total[0],
        dagger: engine.getWeaponStats('CHARACTER', items.Dagger).attack_bonus.total[0],
        bow: engine.getWeaponStats('CHARACTER', items.Longbow).attack_bonus.total[0],
        spell: engine.getSpellStats('CHARACTER', null, 'ARCANE', 'ATTRIBUTE_INT').spell_attack.total[0],
        dc: engine.getSpellStats('CHARACTER', null, 'ARCANE', 'ATTRIBUTE_INT').spell_dc.total,
        errors: engine.getOperationErrorNotifications(),
      };
      assert.deepEqual(
        result.errors,
        [],
        `${data.details.class.name} level ${data.level}, ${context}: operation errors`
      );
      return result;
    }

    return {
      engine,
      character,
      condition,
      calculate,
      items,
      dwarf,
      feature: (id) => content.abilityBlocks.find((row) => row.id === id),
      rank: (name) => engine.compileProficiencyType(engine.getVariable('CHARACTER', name).value),
      bonus: (variable, amount, type, source) =>
        engine.addVariableBonus('CHARACTER', variable, amount, type, '', source),
      get calculations() {
        return calculations;
      },
      cleanup: engine.cleanup,
    };
  } catch (error) {
    await engine.cleanup();
    throw error;
  }
}
