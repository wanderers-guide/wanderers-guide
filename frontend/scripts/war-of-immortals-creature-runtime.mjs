import { createOperationEngine, readContentRows } from './operation-test-harness.mjs';

const operation = (type, data) => ({ id: crypto.randomUUID(), type, data });
const trained = (variable) => operation('adjValue', { variable, value: { value: 'T' } });
const bonus = (variable, value) => operation('addBonusToValue', { variable, value, text: '' });

/** Project the numeric operations and embedded Strikes from one reviewed creature entry. */
function projectCreature(entry, variant) {
  const level = entry.level;
  const attributes = entry.attributes;
  const isLegend = variant === 'legend';
  const operations = Object.entries(attributes).map(([name, value]) =>
    operation('setValue', { variable: `ATTRIBUTE_${name}`, value: { value, partial: false } })
  );

  if (isLegend) {
    for (const variable of [
      'UNARMORED_DEFENSE',
      'UNARMED_ATTACKS',
      'PERCEPTION',
      'SAVE_FORT',
      'SAVE_REFLEX',
      'SAVE_WILL',
    ]) {
      operations.push(trained(variable));
    }
  }

  operations.push(
    operation(isLegend ? 'adjValue' : 'setValue', {
      variable: 'AC_BONUS',
      value: entry.ac - 10 - attributes.DEX - (isLegend ? level + 2 : 0),
    }),
    operation(isLegend ? 'adjValue' : 'setValue', {
      variable: 'MAX_HEALTH_BONUS',
      value: entry.hp - level * attributes.CON,
    }),
    bonus('PERCEPTION', entry.perception - attributes.WIS - (isLegend ? level + 2 : 0))
  );

  const saveAttributes = { FORT: 'CON', REFLEX: 'DEX', WILL: 'WIS' };
  for (const [name, value] of Object.entries(entry.saves)) {
    operations.push(bonus(`SAVE_${name}`, value - attributes[saveAttributes[name]] - (isLegend ? level + 2 : 0)));
  }

  const skillAttributes = {
    ACROBATICS: 'DEX',
    ATHLETICS: 'STR',
    DECEPTION: 'CHA',
    DIPLOMACY: 'CHA',
    NATURE: 'WIS',
    SOCIETY: 'INT',
    STEALTH: 'DEX',
    THIEVERY: 'DEX',
  };
  const skills = isLegend
    ? Object.entries(entry.skills).map(([name, value]) => ({ name, value, attribute: skillAttributes[name] }))
    : entry.skills;
  for (const { name, value, attribute } of skills) {
    operations.push(trained(`SKILL_${name}`));
    operations.push(bonus(`SKILL_${name}`, value - level - 2 - attributes[attribute]));
  }

  if (entry.spells?.length) {
    const castingSource = isLegend
      ? `${entry.name.toUpperCase().replaceAll(' ', '_')}_INNATE`
      : `${entry.name.toUpperCase()} INNATE`;
    const tradition = isLegend ? entry.tradition : 'OCCULT';
    operations.push(
      operation('defineCastingSource', {
        variable: 'CASTING_SOURCES',
        value: `${castingSource}:::null:::${tradition}:::ATTRIBUTE_CHA`,
      })
    );
    const spellRank = level >= 12 ? 4 : 2;
    if (entry.spell_attack !== undefined) {
      operations.push(bonus('SPELL_ATTACK', entry.spell_attack - level - spellRank - attributes.CHA));
    }
    operations.push(bonus('SPELL_DC', entry.spell_dc - 10 - level - spellRank - attributes.CHA));
    for (const spell of entry.spells) {
      operations.push(
        operation('giveSpell', {
          spellId: spell.id,
          type: 'INNATE',
          castingSource,
          rank: spell.rank,
          tradition,
          casts: spell.casts,
        })
      );
    }
  }

  const items = entry.attacks.map((attack, index) => {
    const ranged = (attack.kind ?? attack.attack_type) === 'ranged';
    const attackAttribute = isLegend ? attack.attribute : ranged ? 'DEX' : 'STR';
    const attackBonus = attack.bonus - attributes[attackAttribute] - (isLegend ? level + 2 : 0);
    return {
      id: index + 1,
      name: attack.name,
      group: 'WEAPON',
      level: 0,
      rarity: 'COMMON',
      traits: attack.traits,
      meta_data: {
        category: 'unarmed_attack',
        group: 'brawling',
        attack_bonus: attackBonus,
        range: ranged ? attack.range : null,
        damage: {
          damageType: isLegend ? attack.damage_type : attack.damage.type,
          dice: isLegend ? attack.dice : attack.damage.dice,
          die: isLegend ? attack.die : attack.damage.die,
          extra: '',
        },
      },
      operations: [],
      content_source_id: 400,
    };
  });

  return {
    id: entry.uuid,
    name: entry.name,
    level,
    operations,
    abilities_base: [],
    inventory: {
      items: items.map((item) => ({
        id: crypto.randomUUID(),
        item,
        is_equipped: true,
        is_invested: false,
        is_implanted: false,
        container_contents: [],
      })),
    },
    details: {},
  };
}

/** Calculate reviewed creature entries with the same operation and weapon engines as the app. */
export async function calculateCreatureEntries(entries, variant) {
  const spellIds = new Set(entries.flatMap((entry) => (entry.spells ?? []).map((spell) => spell.id)));
  const traitIds = new Set(entries.flatMap((entry) => entry.attacks.flatMap((attack) => attack.traits)));
  const fixtures = await readContentRows([
    ...[...spellIds].map((id) => ({ table: 'spell', id })),
    ...[...traitIds].map((id) => ({ table: 'trait', id })),
  ]);
  const creatures = entries.map((entry) => projectCreature(entry, variant));
  const content = {
    defaultSources: { PAGE: [1, 3, 7, 8, 256, 400], INFO: [1, 3, 7, 8, 256, 400] },
    classes: [],
    ancestries: [],
    backgrounds: [],
    abilityBlocks: [],
    archetypes: [],
    versatileHeritages: [],
    classArchetypes: [],
    sources: [],
    languages: [],
    items: creatures.flatMap((creature) => creature.inventory.items.map(({ item }) => item)),
    spells: fixtures.filter(({ table }) => table === 'spell').map(({ row }) => row),
    traits: fixtures.filter(({ table }) => table === 'trait').map(({ row }) => row),
  };
  const engine = await createOperationEngine();
  try {
    engine.setFixtures(fixtures);
    const parent = await engine._executeCharacterOperations({
      character: { id: 1, name: 'Creature calculation fixture', level: 1, details: {}, inventory: { items: [] } },
      content,
      context: 'CHARACTER-SHEET',
    });
    const results = [];
    for (const creature of creatures) {
      const entry = entries.find(({ uuid }) => uuid === creature.id);
      const id = `CREATURE_${creature.id}`;
      engine.clearOperationErrorNotifications();
      const result = await engine._executeCreatureOperations({ id, creature, content, charStore: parent.store });
      const spellStats = creature.operations.some(({ type }) => type === 'giveSpell')
        ? engine.getSpellStats(id, null, variant === 'legend' ? entry.tradition : 'OCCULT', 'ATTRIBUTE_CHA')
        : null;
      results.push({
        name: creature.name,
        errors: result.errors,
        notifications: engine.getOperationErrorNotifications(),
        ac: engine.getFinalAcValue(id),
        hp: engine.getFinalHealthValue(id),
        perception: Number(engine.getFinalProfValue(id, 'PERCEPTION')),
        saves: Object.fromEntries(
          ['FORT', 'REFLEX', 'WILL'].map((save) => [save, Number(engine.getFinalProfValue(id, `SAVE_${save}`))])
        ),
        skills: Object.fromEntries(
          (variant === 'legend' ? Object.keys(entry.skills) : entry.skills.map(({ name }) => name)).map((skill) => [
            skill,
            Number(engine.getFinalProfValue(id, `SKILL_${skill}`)),
          ])
        ),
        attacks: creature.inventory.items.map(({ item }) => ({
          name: item.name,
          bonus: engine.getWeaponStats(id, item).attack_bonus.total[0],
        })),
        spellAttack: spellStats?.spell_attack.total[0] ?? null,
        spellDc: spellStats?.spell_dc.total ?? null,
      });
    }
    return results;
  } finally {
    await engine.cleanup();
  }
}
