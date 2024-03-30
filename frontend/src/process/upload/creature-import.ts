import { AbilityBlock, ContentSource, Creature, Rarity, Size } from '@typing/content';
import {
  EQUIPMENT_TYPES,
  convertToActionCost,
  convertToRarity,
  convertToSize,
  extractFromDescription,
  getItemIds,
  getLanguageIds,
  getSpellIds,
  getTraitIds,
  stripFoundryLinking,
} from './foundry-utils';
import { toMarkdown, toText } from '@content/content-utils';
import {
  Operation,
  OperationAddBonusToValue,
  OperationAdjValue,
  OperationDefineCastingSource,
  OperationGiveItem,
  OperationGiveLanguage,
  OperationGiveSpell,
  OperationGiveSpellSlot,
  OperationSetValue,
} from '@typing/operations';
import { createDefaultOperation } from '@operations/operation-utils';
import { labelToVariable } from '@variables/variable-utils';

export async function newImportHandler(source: ContentSource, json: Record<string, any>): Promise<Creature> {
  const creature = {
    id: -1,
    created_at: '',
    name: toText(json.name) ?? '',
    level: json.system?.details?.level?.value,
    rarity: convertToRarity(json.system?.traits?.rarity),
    traits: await getTraitIds(json.system?.traits?.value ?? [], source),
    size: convertToSize(json.system?.traits?.size?.value),
    inventory: undefined,
    notes: undefined,
    details: {
      image_url: undefined,
      background_image_url: undefined,
      conditions: undefined,
      description: toMarkdown(json.system?.details?.publicNotes) ?? '',
    },
    roll_history: undefined,
    operations: undefined,
    abilities: undefined,
    spells: {
      slots: [],
      list: [],
      focus_point_current: 0,
      innate_casts: [],
    },
    meta_data: undefined,
    content_source_id: source.id,
    version: '1.0',
  } satisfies Creature as Creature;

  let operations: Operation[] = [];

  // Attributes
  operations = addAttributes(operations, json);
  // AC
  operations = addAC(operations, json);
  // Saves
  operations = addSaves(operations, json);
  // HP
  operations = addHP(operations, json);
  // Resists, Weaknesses, Immunities
  operations = addResistsWeaks(operations, json);
  // Speeds
  operations = addSpeeds(operations, json);
  // Languages
  operations = await addLanguages(operations, json, source);
  // Perception & Senses
  operations = addPerceptionSenses(operations, json);
  // Skills
  operations = addSkills(operations, json);
  // Spells
  operations = await addSpells(operations, json);
  // Items
  operations = await addEquipment(operations, json);

  creature.operations = operations;

  // Abilities
  creature.abilities = await getAbilities(json, source);

  return creature;
}

function addAttributes(operations: Operation[], json: Record<string, any>) {
  operations.push({
    ...createDefaultOperation<OperationSetValue>('setValue'),
    data: {
      variable: 'ATTRIBUTE_STR',
      value: { value: json.system.abilities.str.mod, partial: false },
    },
  } satisfies OperationSetValue);
  operations.push({
    ...createDefaultOperation<OperationSetValue>('setValue'),
    data: {
      variable: 'ATTRIBUTE_DEX',
      value: { value: json.system.abilities.dex.mod, partial: false },
    },
  } satisfies OperationSetValue);
  operations.push({
    ...createDefaultOperation<OperationSetValue>('setValue'),
    data: {
      variable: 'ATTRIBUTE_CON',
      value: { value: json.system.abilities.con.mod, partial: false },
    },
  } satisfies OperationSetValue);
  operations.push({
    ...createDefaultOperation<OperationSetValue>('setValue'),
    data: {
      variable: 'ATTRIBUTE_INT',
      value: { value: json.system.abilities.int.mod, partial: false },
    },
  } satisfies OperationSetValue);
  operations.push({
    ...createDefaultOperation<OperationSetValue>('setValue'),
    data: {
      variable: 'ATTRIBUTE_WIS',
      value: { value: json.system.abilities.wis.mod, partial: false },
    },
  } satisfies OperationSetValue);
  operations.push({
    ...createDefaultOperation<OperationSetValue>('setValue'),
    data: {
      variable: 'ATTRIBUTE_CHA',
      value: { value: json.system.abilities.cha.mod, partial: false },
    },
  } satisfies OperationSetValue);
  return operations;
}

function addAC(operations: Operation[], json: Record<string, any>) {
  operations.push({
    ...createDefaultOperation<OperationSetValue>('setValue'),
    data: {
      variable: 'AC_TOTAL',
      value: json.system.attributes.ac.value,
    },
  } satisfies OperationSetValue);
  if (json.system.attributes.ac.details) {
    operations.push({
      ...createDefaultOperation<OperationAddBonusToValue>('addBonusToValue'),
      data: {
        variable: 'AC_TOTAL',
        value: undefined,
        type: undefined,
        text: json.system.attributes.ac.details,
      },
    } satisfies OperationAddBonusToValue);
  }
  return operations;
}

function addSaves(operations: Operation[], json: Record<string, any>) {
  operations.push({
    ...createDefaultOperation<OperationSetValue>('setValue'),
    data: {
      variable: 'SAVE_FORT_TOTAL',
      value: json.system.saves.fortitude.value,
    },
  } satisfies OperationSetValue);
  if (json.system.saves.fortitude.saveDetail) {
    operations.push({
      ...createDefaultOperation<OperationAddBonusToValue>('addBonusToValue'),
      data: {
        variable: 'SAVE_FORT_TOTAL',
        value: undefined,
        type: undefined,
        text: json.system.saves.fortitude.saveDetail,
      },
    } satisfies OperationAddBonusToValue);
  }
  operations.push({
    ...createDefaultOperation<OperationSetValue>('setValue'),
    data: {
      variable: 'SAVE_REF_TOTAL',
      value: json.system.saves.reflex.value,
    },
  } satisfies OperationSetValue);
  if (json.system.saves.reflex.saveDetail) {
    operations.push({
      ...createDefaultOperation<OperationAddBonusToValue>('addBonusToValue'),
      data: {
        variable: 'SAVE_REF_TOTAL',
        value: undefined,
        type: undefined,
        text: json.system.saves.reflex.saveDetail,
      },
    } satisfies OperationAddBonusToValue);
  }
  operations.push({
    ...createDefaultOperation<OperationSetValue>('setValue'),
    data: {
      variable: 'SAVE_WILL_TOTAL',
      value: json.system.saves.will.value,
    },
  } satisfies OperationSetValue);
  if (json.system.saves.will.saveDetail) {
    operations.push({
      ...createDefaultOperation<OperationAddBonusToValue>('addBonusToValue'),
      data: {
        variable: 'SAVE_WILL_TOTAL',
        value: undefined,
        type: undefined,
        text: json.system.saves.will.saveDetail,
      },
    } satisfies OperationAddBonusToValue);
  }

  // All saves conditional
  if (json.system.attributes.allSaves.value) {
    operations.push({
      ...createDefaultOperation<OperationAddBonusToValue>('addBonusToValue'),
      data: {
        variable: 'SAVE_FORT_TOTAL',
        value: undefined,
        type: undefined,
        text: json.system.attributes.allSaves.value,
      },
    } satisfies OperationAddBonusToValue);
    operations.push({
      ...createDefaultOperation<OperationAddBonusToValue>('addBonusToValue'),
      data: {
        variable: 'SAVE_REF_TOTAL',
        value: undefined,
        type: undefined,
        text: json.system.attributes.allSaves.value,
      },
    } satisfies OperationAddBonusToValue);
    operations.push({
      ...createDefaultOperation<OperationAddBonusToValue>('addBonusToValue'),
      data: {
        variable: 'SAVE_WILL_TOTAL',
        value: undefined,
        type: undefined,
        text: json.system.attributes.allSaves.value,
      },
    } satisfies OperationAddBonusToValue);
  }

  return operations;
}

function addHP(operations: Operation[], json: Record<string, any>) {
  operations.push({
    ...createDefaultOperation<OperationSetValue>('setValue'),
    data: {
      variable: 'HEALTH_MAX_TOTAL',
      value: json.system.attributes.hp.max,
    },
  } satisfies OperationSetValue);
  if (json.system.attributes.hp.details) {
    operations.push({
      ...createDefaultOperation<OperationAddBonusToValue>('addBonusToValue'),
      data: {
        variable: 'HEALTH_MAX_TOTAL',
        value: undefined,
        type: undefined,
        text: json.system.attributes.hp.details,
      },
    } satisfies OperationAddBonusToValue);
  }

  operations.push({
    ...createDefaultOperation<OperationSetValue>('setValue'),
    data: {
      variable: 'HEALTH_TEMP_TOTAL',
      value: json.system.attributes.hp.temp,
    },
  } satisfies OperationSetValue);

  return operations;
}

function addResistsWeaks(operations: Operation[], json: Record<string, any>) {
  const constructValue = (data: Record<string, any>) => {
    const exceptions = data.exceptions && data.exceptions.length > 0 ? ` (except ${data.exceptions.join(', ')})` : '';
    return `${data.type}${exceptions}, ${data.value}`;
  };

  for (const immunity of json.system.attributes.immunities ?? []) {
    operations.push({
      ...createDefaultOperation<OperationAdjValue>('adjValue'),
      data: {
        variable: 'IMMUNITIES',
        value: constructValue(immunity),
      },
    } satisfies OperationAdjValue);
  }

  for (const weakness of json.system.attributes.weaknesses ?? []) {
    operations.push({
      ...createDefaultOperation<OperationAdjValue>('adjValue'),
      data: {
        variable: 'WEAKNESSES',
        value: constructValue(weakness),
      },
    } satisfies OperationAdjValue);
  }

  for (const resistance of json.system.attributes.resistances ?? []) {
    operations.push({
      ...createDefaultOperation<OperationAdjValue>('adjValue'),
      data: {
        variable: 'RESISTANCES',
        value: constructValue(resistance),
      },
    } satisfies OperationAdjValue);
  }

  return operations;
}

function addSpeeds(operations: Operation[], json: Record<string, any>) {
  operations.push({
    ...createDefaultOperation<OperationSetValue>('setValue'),
    data: {
      variable: 'SPEED',
      value: json.system.attributes.speed.value,
    },
  } satisfies OperationSetValue);

  for (const speed of json.system.attributes.speed.otherSpeeds ?? []) {
    operations.push({
      ...createDefaultOperation<OperationSetValue>('setValue'),
      data: {
        variable: `SPEED_${labelToVariable(speed.type)}`,
        value: speed.value,
      },
    } satisfies OperationSetValue);
  }

  return operations;
}

async function addLanguages(operations: Operation[], json: Record<string, any>, source: ContentSource) {
  // TODO, we don't include languages.details but prob should

  const languageIds = await getLanguageIds(json.system.details.languages.value ?? [], source);
  for (const languageId of languageIds) {
    operations.push({
      ...createDefaultOperation<OperationGiveLanguage>('giveLanguage'),
      data: {
        languageId: languageId,
      },
    } satisfies OperationGiveLanguage);
  }

  return operations;
}

function addPerceptionSenses(operations: Operation[], json: Record<string, any>) {
  operations.push({
    ...createDefaultOperation<OperationSetValue>('setValue'),
    data: {
      variable: 'PERCEPTION_TOTAL',
      value: json.system.perception.mod,
    },
  } satisfies OperationSetValue);
  if (json.system.perception.details) {
    operations.push({
      ...createDefaultOperation<OperationAddBonusToValue>('addBonusToValue'),
      data: {
        variable: 'PERCEPTION_TOTAL',
        value: undefined,
        type: undefined,
        text: json.system.perception.details,
      },
    } satisfies OperationAddBonusToValue);
  }

  const constructValues = (data: Record<string, any>) => {
    const variable = data.acuity
      ? data.acuity === 'imprecise'
        ? 'SENSES_IMPRECISE'
        : data.acuity === 'vague'
          ? 'SENSES_VAGUE'
          : 'SENSES_PRECISE'
      : 'SENSES_PRECISE';
    const range = data.range ? `, ${data.range}` : '';
    return {
      variable: variable,
      value: `${data.type}${range}`,
    };
  };

  for (const sense of json.system.perception.senses ?? []) {
    const result = constructValues(sense);
    operations.push({
      ...createDefaultOperation<OperationAdjValue>('adjValue'),
      data: {
        variable: result.variable,
        value: result.value,
      },
    } satisfies OperationAdjValue);
  }

  return operations;
}

function addSkills(operations: Operation[], json: Record<string, any>) {
  for (const skill of findJsonItems(json, 'lore')) {
    const variable = skill.name.endsWith(' Lore')
      ? `SKILL_LORE_${labelToVariable(skill.name.replace(' Lore', ''))}_TOTAL`
      : `SKILL_${labelToVariable(skill.name)}_TOTAL`;

    operations.push({
      ...createDefaultOperation<OperationSetValue>('setValue'),
      data: {
        variable: variable,
        value: skill.system.mod.value,
      },
    } satisfies OperationSetValue);
  }

  return operations;
}

async function addSpells(operations: Operation[], json: Record<string, any>) {
  const convertCastingType = (type: string) => {
    if (type === 'innate') return null;
    if (type === 'focus') return '-';
    if (type === 'prepared') return 'PREPARED-TRADITION';
    if (type === 'spontaneous') return 'SPONTANEOUS-REPERTOIRE';
    return null;
  };

  const castingDataMap = new Map<string, { source: string; type: string; tradition: string }>();
  for (const casting of findJsonItems(json, 'spellcastingEntry')) {
    const source = labelToVariable(casting.name);
    const type = convertCastingType(casting.system.prepared?.value);
    const tradition = labelToVariable(casting.system.tradition.value);
    castingDataMap.set(casting._id, {
      source: source,
      type: type ?? '',
      tradition: tradition,
    });

    if (type) {
      operations.push({
        ...createDefaultOperation<OperationDefineCastingSource>('defineCastingSource'),
        data: {
          variable: 'CASTING_SOURCES',
          value: `${source}:::${type}:::${tradition}:::ATTRIBUTE_CHA`,
        },
      } satisfies OperationDefineCastingSource);
    }

    if (casting.system.spelldc?.value) {
      operations.push({
        ...createDefaultOperation<OperationSetValue>('setValue'),
        data: {
          variable: 'SPELL_ATTACK_TOTAL',
          value: casting.system.spelldc.value,
        },
      } satisfies OperationSetValue);
    }
    if (casting.system.spelldc?.dc) {
      operations.push({
        ...createDefaultOperation<OperationSetValue>('setValue'),
        data: {
          variable: 'SPELL_DC_TOTAL',
          value: casting.system.spelldc.dc,
        },
      } satisfies OperationSetValue);
    }

    if (casting.system.slots) {
      const keys = Object.keys(casting.system.slots);
      for (const key of keys) {
        const rank = parseInt(key.replace('slot', ''));
        operations.push({
          ...createDefaultOperation<OperationGiveSpellSlot>('giveSpellSlot'),
          data: {
            castingSource: source,
            slots: Array.from({ length: 20 }, (_, i) => ({
              lvl: i + 1,
              rank: rank,
              amt: casting.system.slots[key].max,
            })),
            // TODO, handle prepared spells by ID
          },
        } satisfies OperationGiveSpellSlot);
      }
    }
  }

  for (const spell of findJsonItems(json, 'spell')) {
    const data = castingDataMap.get(spell.system.location.value);
    if (!data) continue;

    const spellIds = await getSpellIds([spell.system.slug]);
    console.warn('Failed to find spell: ', spell.system.slug);
    if (spellIds.length === 0) continue;

    operations.push({
      ...createDefaultOperation<OperationGiveSpell>('giveSpell'),
      data: {
        spellId: spellIds[0],
        type: data.type === '-' ? 'FOCUS' : data.type === '' ? 'INNATE' : 'NORMAL',
        castingSource: data.source,
        rank: spell.system.location.heightenedLevel,
        tradition: data.tradition as any,
        casts: 1,
      },
    } satisfies OperationGiveSpell);
  }

  return operations;
}

async function addEquipment(operations: Operation[], json: Record<string, any>) {
  const itemIds = await getItemIds(findJsonItems(json, 'equipment').map((item) => item.name as string));

  for (const itemId of itemIds) {
    operations.push({
      ...createDefaultOperation<OperationGiveItem>('giveItem'),
      data: {
        itemId: itemId,
      },
    } satisfies OperationGiveItem);
  }

  return operations;
}

async function getAbilities(json: Record<string, any>, source: ContentSource): Promise<AbilityBlock[]> {
  const abilities: AbilityBlock[] = [];
  for (const ability of findJsonItems(json, 'action')) {
    const descValues = extractFromDescription(
      stripFoundryLinking(ability.system?.description?.value, json.system?.details?.level?.value)
    );

    abilities.push({
      id: -1,
      created_at: '',
      name: toText(ability.name) ?? '',
      actions: convertToActionCost(ability.system?.actionType?.value, ability.system?.actions?.value),
      level: json.system?.details?.level?.value,
      rarity: convertToRarity(ability.system?.traits?.rarity),
      frequency: toText(descValues?.frequency),
      trigger: descValues?.trigger || toText(ability.system?.trigger?.value),
      requirements: toText(descValues?.requirements),
      access: undefined,
      description: toMarkdown(descValues.description) ?? '',
      special: toMarkdown(descValues.special),
      prerequisites: undefined,
      type: 'action',
      meta_data: {
        foundry: {
          category: ability.system?.category,
        },
      },
      traits: await getTraitIds(ability.system?.traits?.value ?? [], source),
      content_source_id: source.id,
      version: '1.0',
    } satisfies AbilityBlock);
  }

  return abilities;
}

function findJsonItems(json: Record<string, any>, type: string): Record<string, any>[] {
  return json?.items?.filter((item: any) => item.type === type) ?? [];
}

// export async function uploadCreatureHandler(source: ContentSource, importData: Record<string, any>): Promise<Creature> {
//   let creature = {
//     id: -1,
//     created_at: '',
//     name: importData.name,
//     level: importData.system?.details?.level?.value ?? 0,
//     rarity: convertToRarity(importData.system?.traits?.rarity),
//     size: convertToSize(importData.system?.traits?.size?.value),
//     traits: await getTraitIds(importData.system?.traits?.value ?? [], source),
//     family_type: importData.system?.details?.creatureType, // Not included anymore
//     senses: importData.system?.perception?.senses,
//     languages: {
//       value: importData.system?.traits?.languages?.value,
//       custom: importData.system?.traits?.languages?.custom,
//     },
//     skills: undefined as any,
//     items: undefined as any,
//     attributes: {
//       str: importData.system.abilities.str.mod,
//       dex: importData.system.abilities.dex.mod,
//       con: importData.system.abilities.con.mod,
//       int: importData.system.abilities.int.mod,
//       wis: importData.system.abilities.wis.mod,
//       cha: importData.system.abilities.cha.mod,
//     },
//     stats: {
//       ac: {
//         value: importData.system.attributes.ac.value,
//         details: importData.system.attributes.ac.details,
//       },
//       saves: {
//         fort: importData.system.saves.fortitude.value,
//         ref: importData.system.saves.reflex.value,
//         will: importData.system.saves.will.value,
//         custom: importData.system.attributes.allSaves.value,
//       },
//       hp: {
//         max: importData.system.attributes.hp.max,
//         details: importData.system.attributes.hp.details,
//         temp: importData.system.attributes.hp.temp,
//       },
//       perception: {
//         value: importData.system.perception.mod,
//         details: importData.system.perception.details,
//       },
//     },
//     immunities: undefined as any,
//     weaknesses: undefined as any,
//     resistances: undefined as any,
//     interaction_abilities: undefined as any,
//     offensive_abilities: undefined as any,
//     defensive_abilities: undefined as any,
//     speeds: {
//       speed: importData.system.attributes.speed.value,
//       details: importData.system.attributes.speed.details,
//       others: importData.system.attributes.speed.otherSpeeds,
//     },
//     attacks: undefined as any,
//     spellcasting: undefined as any,
//     description: toMarkdown(importData.system.details.publicNotes) ?? '',
//     meta_data: {},
//     content_source_id: source.id,
//     version: '1.0',
//   } satisfies Creature;

//   //data.alignment = importData.system?.details?.alignment?.value;

//   let skills = importData?.items.filter((item: any) => {
//     return item.type == `lore`;
//   });
//   let skillsDataArray = [];
//   for (let skill of skills) {
//     skillsDataArray.push({ name: skill.name, bonus: skill?.system?.mod?.value });
//   }
//   creature.skills = { value: skillsDataArray };

//   let inventory = importData.items.filter((item: any) => {
//     return EQUIPMENT_TYPES.includes(item.type);
//   });
//   let itemsDataArray = [];
//   for (let item of inventory) {
//     let quantity = 1;
//     if (item.type == `consumable`) {
//       quantity = item.system.quantity;
//     }

//     let name = null;
//     let doIndex = true;
//     if (item.system.baseItem != null) {
//       name = item.system.baseItem.replace(/-/g, ' ');

//       if (name.includes(' armor')) {
//         name = name.replace(' armor', '');
//       }
//     } else {
//       doIndex = false;
//     }

//     let shieldStats = null;
//     if (item.system.category == 'shield') {
//       shieldStats = {
//         armor: item.system.acBonus,
//         hardness: item.system.hardness,
//         hp: item.system.hp.max,
//         bt: parseInt(item.system.hp.max) / 2,
//       };
//     }

//     itemsDataArray.push({
//       display_name: item.name,
//       quantity: quantity,
//       name: name,
//       do_index: doIndex,
//       shield_stats: shieldStats,
//     });
//   }
//   creature.items = { value: itemsDataArray };

//   let interactionAbilities = importData.items.filter((item: any) => {
//     return item.type == `action` && item.system.category == `interaction`;
//   });
//   let interactionAbilitiesDataArray = [];
//   for (let ability of interactionAbilities) {
//     interactionAbilitiesDataArray.push({
//       name: ability.name,
//       actions: convertToActionCost(ability.system.actionType.value, ability.system.actions.value),
//       traits: ability.system.traits.value,
//       description: toMarkdown(ability.system.description.value) ?? '',
//     });
//   }
//   creature.interaction_abilities = { value: interactionAbilitiesDataArray };

//   if (importData.system.attributes.immunities) {
//     creature.immunities = {
//       value: importData.system.attributes.immunities.map((i: any) => {
//         return i.type;
//       }),
//     };
//   } else {
//     creature.immunities = {
//       value: [],
//     };
//   }
//   if (importData.system.attributes.weaknesses) {
//     creature.weaknesses = {
//       value: importData.system.attributes.weaknesses,
//     };
//   } else {
//     creature.weaknesses = {
//       value: [],
//     };
//   }
//   if (importData.system.attributes.resistances) {
//     creature.resistances = {
//       value: importData.system.attributes.resistances,
//     };
//   } else {
//     creature.resistances = {
//       value: [],
//     };
//   }

//   let defensiveAbilities = importData.items.filter((item: any) => {
//     return item.type == `action` && item.system.category == `defensive`;
//   });
//   let defensiveAbilitiesDataArray = [];
//   for (let ability of defensiveAbilities) {
//     defensiveAbilitiesDataArray.push({
//       name: ability.name,
//       actions: convertToActionCost(ability.system.actionType.value, ability.system.actions.value),
//       traits: ability.system.traits.value,
//       description: toMarkdown(ability.system.description.value) ?? '',
//     });
//   }
//   creature.defensive_abilities = { value: defensiveAbilitiesDataArray };

//   let attacks = importData.items.filter((item: any) => {
//     return item.type == `melee`;
//   });
//   let attacksDataArray = [];
//   for (let attack of attacks) {
//     let damageEffects = ``;

//     if (attack.system.description.value != null) {
//       let matchP = /<p>@Localize\[PF2E\.PersistentDamage\.(\D+)(.+?)\.success]<\/p>/g.exec(
//         attack.system.description.value
//       );
//       if (matchP != null) {
//         damageEffects += `${matchP[2]} persistent ${matchP[1].toLowerCase()}`;
//       } else {
//         let match = /@Localize\[PF2E\.PersistentDamage\.(\D+)(.+?)\.success]/g.exec(attack.system.description.value);
//         if (match != null) {
//           damageEffects += `${match[2]} persistent ${match[1].toLowerCase()}`;
//         }
//       }
//     }

//     if (damageEffects != ``) {
//       damageEffects += `, `;
//     }
//     damageEffects += attack.system.attackEffects.value;

//     attacksDataArray.push({
//       type: attack.system.weaponType.value,
//       name: attack.name,
//       bonus: attack.system.bonus.value,
//       traits: attack.system.traits.value,
//       damage: Object.values(attack.system.damageRolls),
//       effects: damageEffects,
//     });
//   }
//   creature.attacks = { value: attacksDataArray };

//   let spellcastings = importData.items.filter((item: any) => {
//     return item.type == `spellcastingEntry`;
//   });
//   let spellcastingDataArray = [];
//   for (let spellcasting of spellcastings) {
//     let focusPoints = 0;
//     if (spellcasting.system.prepared.value == `focus`) {
//       focusPoints = importData.system.resources.focus.max;
//     }

//     let spells = importData.items.filter((item: any) => {
//       return item.type == `spell` && item.system.location.value == spellcasting._id;
//     });

//     let spellsDataArray = [];
//     let constantSpellsDataArray = [];
//     for (let spell of spells) {
//       let level = spell.system.level.value;
//       if (spell.system.location.heightenedLevel != null) {
//         level = spell.system.location.heightenedLevel;
//       }
//       if (spell.system.traits.value.includes('cantrip')) {
//         level = 0;
//       }

//       let spellName = spell.name.toLowerCase();

//       if (spellName.includes(` (constant)`)) {
//         spellName = spellName.replace(` (constant)`, ``);
//         constantSpellsDataArray.push({
//           name: spellName,
//           level: level,
//         });
//       } else {
//         let isAtWill = false;
//         if (spellName.includes(` (at will)`)) {
//           spellName = spellName.replace(` (at will)`, ``);
//           isAtWill = true;
//         }

//         spellsDataArray.push({
//           name: spellName,
//           level: level,
//           is_at_will: isAtWill,
//         });
//       }
//     }

//     spellcastingDataArray.push({
//       name: spellcasting.name,
//       dc: spellcasting.system.spelldc.dc,
//       attack: spellcasting.system.spelldc.value,
//       spells: spellsDataArray,
//       constant_spells: constantSpellsDataArray,
//       focus: focusPoints,
//     });
//   }
//   creature.spellcasting = { value: spellcastingDataArray };

//   let offensiveAbilities = importData.items.filter((item: any) => {
//     return item.type == `action` && item.system.category == `offensive`;
//   });
//   let offensiveAbilitiesDataArray = [];
//   for (let ability of offensiveAbilities) {
//     offensiveAbilitiesDataArray.push({
//       name: ability.name,
//       actions: convertToActionCost(ability.system.actionType.value, ability.system.actions.value),
//       traits: ability.system.traits.value,
//       description: toMarkdown(ability.system.description.value) ?? '',
//     });
//   }
//   creature.offensive_abilities = { value: offensiveAbilitiesDataArray };

//   return creature;
// }
