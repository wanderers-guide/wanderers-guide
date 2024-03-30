import { ContentSource, Creature } from '@typing/content';
import { EQUIPMENT_TYPES, convertToActionCost, convertToRarity, convertToSize, getTraitIds } from './foundry-utils';
import { toMarkdown } from '@content/content-utils';

export async function uploadCreatureHandler(source: ContentSource, importData: Record<string, any>): Promise<Creature> {
  let creature = {
    id: -1,
    created_at: '',
    name: importData.name,
    level: importData.system?.details?.level?.value ?? 0,
    rarity: convertToRarity(importData.system?.traits?.rarity),
    size: convertToSize(importData.system?.traits?.size?.value),
    traits: await getTraitIds(importData.system?.traits?.value ?? [], source),
    family_type: importData.system?.details?.creatureType, // Not included anymore
    senses: importData.system?.perception?.senses,
    languages: {
      value: importData.system?.traits?.languages?.value,
      custom: importData.system?.traits?.languages?.custom,
    },
    skills: undefined as any,
    items: undefined as any,
    attributes: {
      str: importData.system.abilities.str.mod,
      dex: importData.system.abilities.dex.mod,
      con: importData.system.abilities.con.mod,
      int: importData.system.abilities.int.mod,
      wis: importData.system.abilities.wis.mod,
      cha: importData.system.abilities.cha.mod,
    },
    stats: {
      ac: {
        value: importData.system.attributes.ac.value,
        details: importData.system.attributes.ac.details,
      },
      saves: {
        fort: importData.system.saves.fortitude.value,
        ref: importData.system.saves.reflex.value,
        will: importData.system.saves.will.value,
        custom: importData.system.attributes.allSaves.value,
      },
      hp: {
        max: importData.system.attributes.hp.max,
        details: importData.system.attributes.hp.details,
        temp: importData.system.attributes.hp.temp,
      },
      perception: {
        value: importData.system.perception.mod,
        details: importData.system.perception.details,
      },
    },
    immunities: undefined as any,
    weaknesses: undefined as any,
    resistances: undefined as any,
    interaction_abilities: undefined as any,
    offensive_abilities: undefined as any,
    defensive_abilities: undefined as any,
    speeds: {
      speed: importData.system.attributes.speed.value,
      details: importData.system.attributes.speed.details,
      others: importData.system.attributes.speed.otherSpeeds,
    },
    attacks: undefined as any,
    spellcasting: undefined as any,
    description: toMarkdown(importData.system.details.publicNotes) ?? '',
    meta_data: {},
    content_source_id: source.id,
    version: '1.0',
  } satisfies Creature;

  //data.alignment = importData.system?.details?.alignment?.value;

  let skills = importData?.items.filter((item: any) => {
    return item.type == `lore`;
  });
  let skillsDataArray = [];
  for (let skill of skills) {
    skillsDataArray.push({ name: skill.name, bonus: skill?.system?.mod?.value });
  }
  creature.skills = { value: skillsDataArray };

  let inventory = importData.items.filter((item: any) => {
    return EQUIPMENT_TYPES.includes(item.type);
  });
  let itemsDataArray = [];
  for (let item of inventory) {
    let quantity = 1;
    if (item.type == `consumable`) {
      quantity = item.system.quantity;
    }

    let name = null;
    let doIndex = true;
    if (item.system.baseItem != null) {
      name = item.system.baseItem.replace(/-/g, ' ');

      if (name.includes(' armor')) {
        name = name.replace(' armor', '');
      }
    } else {
      doIndex = false;
    }

    let shieldStats = null;
    if (item.system.category == 'shield') {
      shieldStats = {
        armor: item.system.acBonus,
        hardness: item.system.hardness,
        hp: item.system.hp.max,
        bt: parseInt(item.system.hp.max) / 2,
      };
    }

    itemsDataArray.push({
      display_name: item.name,
      quantity: quantity,
      name: name,
      do_index: doIndex,
      shield_stats: shieldStats,
    });
  }
  creature.items = { value: itemsDataArray };

  let interactionAbilities = importData.items.filter((item: any) => {
    return item.type == `action` && item.system.category == `interaction`;
  });
  let interactionAbilitiesDataArray = [];
  for (let ability of interactionAbilities) {
    interactionAbilitiesDataArray.push({
      name: ability.name,
      actions: convertToActionCost(ability.system.actionType.value, ability.system.actions.value),
      traits: ability.system.traits.value,
      description: toMarkdown(ability.system.description.value) ?? '',
    });
  }
  creature.interaction_abilities = { value: interactionAbilitiesDataArray };

  if (importData.system.attributes.immunities) {
    creature.immunities = {
      value: importData.system.attributes.immunities.map((i: any) => {
        return i.type;
      }),
    };
  } else {
    creature.immunities = {
      value: [],
    };
  }
  if (importData.system.attributes.weaknesses) {
    creature.weaknesses = {
      value: importData.system.attributes.weaknesses,
    };
  } else {
    creature.weaknesses = {
      value: [],
    };
  }
  if (importData.system.attributes.resistances) {
    creature.resistances = {
      value: importData.system.attributes.resistances,
    };
  } else {
    creature.resistances = {
      value: [],
    };
  }

  let defensiveAbilities = importData.items.filter((item: any) => {
    return item.type == `action` && item.system.category == `defensive`;
  });
  let defensiveAbilitiesDataArray = [];
  for (let ability of defensiveAbilities) {
    defensiveAbilitiesDataArray.push({
      name: ability.name,
      actions: convertToActionCost(ability.system.actionType.value, ability.system.actions.value),
      traits: ability.system.traits.value,
      description: toMarkdown(ability.system.description.value) ?? '',
    });
  }
  creature.defensive_abilities = { value: defensiveAbilitiesDataArray };

  let attacks = importData.items.filter((item: any) => {
    return item.type == `melee`;
  });
  let attacksDataArray = [];
  for (let attack of attacks) {
    let damageEffects = ``;

    if (attack.system.description.value != null) {
      let matchP = /<p>@Localize\[PF2E\.PersistentDamage\.(\D+)(.+?)\.success]<\/p>/g.exec(
        attack.system.description.value
      );
      if (matchP != null) {
        damageEffects += `${matchP[2]} persistent ${matchP[1].toLowerCase()}`;
      } else {
        let match = /@Localize\[PF2E\.PersistentDamage\.(\D+)(.+?)\.success]/g.exec(attack.system.description.value);
        if (match != null) {
          damageEffects += `${match[2]} persistent ${match[1].toLowerCase()}`;
        }
      }
    }

    if (damageEffects != ``) {
      damageEffects += `, `;
    }
    damageEffects += attack.system.attackEffects.value;

    attacksDataArray.push({
      type: attack.system.weaponType.value,
      name: attack.name,
      bonus: attack.system.bonus.value,
      traits: attack.system.traits.value,
      damage: Object.values(attack.system.damageRolls),
      effects: damageEffects,
    });
  }
  creature.attacks = { value: attacksDataArray };

  let spellcastings = importData.items.filter((item: any) => {
    return item.type == `spellcastingEntry`;
  });
  let spellcastingDataArray = [];
  for (let spellcasting of spellcastings) {
    let focusPoints = 0;
    if (spellcasting.system.prepared.value == `focus`) {
      focusPoints = importData.system.resources.focus.max;
    }

    let spells = importData.items.filter((item: any) => {
      return item.type == `spell` && item.system.location.value == spellcasting._id;
    });

    let spellsDataArray = [];
    let constantSpellsDataArray = [];
    for (let spell of spells) {
      let level = spell.system.level.value;
      if (spell.system.location.heightenedLevel != null) {
        level = spell.system.location.heightenedLevel;
      }
      if (spell.system.traits.value.includes('cantrip')) {
        level = 0;
      }

      let spellName = spell.name.toLowerCase();

      if (spellName.includes(` (constant)`)) {
        spellName = spellName.replace(` (constant)`, ``);
        constantSpellsDataArray.push({
          name: spellName,
          level: level,
        });
      } else {
        let isAtWill = false;
        if (spellName.includes(` (at will)`)) {
          spellName = spellName.replace(` (at will)`, ``);
          isAtWill = true;
        }

        spellsDataArray.push({
          name: spellName,
          level: level,
          is_at_will: isAtWill,
        });
      }
    }

    spellcastingDataArray.push({
      name: spellcasting.name,
      dc: spellcasting.system.spelldc.dc,
      attack: spellcasting.system.spelldc.value,
      spells: spellsDataArray,
      constant_spells: constantSpellsDataArray,
      focus: focusPoints,
    });
  }
  creature.spellcasting = { value: spellcastingDataArray };

  let offensiveAbilities = importData.items.filter((item: any) => {
    return item.type == `action` && item.system.category == `offensive`;
  });
  let offensiveAbilitiesDataArray = [];
  for (let ability of offensiveAbilities) {
    offensiveAbilitiesDataArray.push({
      name: ability.name,
      actions: convertToActionCost(ability.system.actionType.value, ability.system.actions.value),
      traits: ability.system.traits.value,
      description: toMarkdown(ability.system.description.value) ?? '',
    });
  }
  creature.offensive_abilities = { value: offensiveAbilitiesDataArray };

  return creature;
}
