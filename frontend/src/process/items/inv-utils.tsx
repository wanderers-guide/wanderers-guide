import { fetchContentAll, getContentFast, getDefaultSources } from '@content/content-store';
import { isPlayingStarfinder } from '@content/system-handler';
import { ContentPackage, ContentSource, Inventory, InventoryItem, Item, LivingEntity } from '@typing/content';
import { Operation } from '@typing/operations';
import { StoreID } from '@typing/variables';
import { getTraitIdByType, hasTraitType, TraitType } from '@utils/traits';
import { getFinalAcValue, getFinalVariableValue } from '@variables/variable-helpers';
import { addVariableBonus, getAllSkillVariables, getAllSpeedVariables } from '@variables/variable-manager';
import { cloneDeep, uniq } from 'lodash-es';

/**
 * Get all items in the inventory, including items in containers, as a single array
 * @param inv - Inventory
 * @returns - Flat array of items
 */
export function getFlatInvItems(inv: Inventory) {
  const flatItems = inv.items.reduce((acc, invItem) => {
    if (isItemContainer(invItem.item)) {
      const items = acc.concat(invItem.container_contents);
      items.push({
        ...invItem,
        container_contents: [],
      });
      return items;
    }
    return acc.concat(invItem);
  }, [] as InventoryItem[]);

  return flatItems;
}

/**
 * Get the total bulk of the inventory
 * @param inv - Inventory
 * @returns - Total bulk as a number
 */
export function getInvBulk(inv: Inventory | undefined) {
  let totalBulk = 0;
  for (const invItem of inv?.items ?? []) {
    totalBulk += getItemBulk(invItem);

    if (isItemContainer(invItem.item)) {
      const ignoredBulk = invItem.item.meta_data?.bulk.ignored ?? 0;
      const containerTotalBulk = invItem.container_contents.reduce(
        (acc, containerItem) => acc + getItemBulk(containerItem),
        0
      );
      totalBulk += Math.max(containerTotalBulk - ignoredBulk, 0);
    }
  }
  return totalBulk;
}

/**
 * Get the total bulk of an item with quantity
 * @param invItem - InventoryItem
 * @returns - Item bulk as a number
 */
export function getItemBulk(invItem: InventoryItem) {
  if (isItemFormula(invItem)) return 0;

  if (!invItem.item.bulk) return 0;

  let totalBulk = 0;

  if (invItem.item.bulk === 'L') {
    totalBulk = 0.1 * getItemQuantity(invItem.item);
  }

  // If the armor isn't being worn it counts as 1 bulk more
  const armorWornModifier = isItemArmor(invItem.item) && !invItem.is_equipped ? 1 : 0;

  const baseItemBulk = invItem.is_equipped
    ? (invItem.item.meta_data?.bulk?.held_or_stowed ?? (parseFloat(invItem.item.bulk ?? '0') || 0))
    : parseFloat(invItem.item.bulk ?? '0') || 0;

  totalBulk = (baseItemBulk + armorWornModifier) * getItemQuantity(invItem.item);

  // If the total bulk is less than 1 bulk, it counts as light bulk
  return totalBulk >= 0.1 && totalBulk < 1 ? 0.1 : Math.floor(totalBulk);
}

export async function getDefaultContainerContents(item: Item, allItems?: Item[], count = 1): Promise<InventoryItem[]> {
  if (count > 10) return [];
  if ((item.meta_data?.container_default_items ?? []).length === 0) return [];
  const items = allItems ? allItems : await fetchContentAll<Item>('item', getDefaultSources('PAGE'));

  const invItems: InventoryItem[] = [];
  for (const record of item.meta_data?.container_default_items ?? []) {
    const containerItem = cloneDeep(items.find((i) => i.id === record.id));
    if (!containerItem) continue;
    if (containerItem.meta_data) {
      containerItem.meta_data.quantity = record.quantity;
    }
    invItems.push({
      id: crypto.randomUUID(),
      item: containerItem,
      is_formula: false,
      is_equipped: false,
      is_invested: false,
      is_implanted: false,
      container_contents: await getDefaultContainerContents(containerItem, items, count++),
    });
  }

  return invItems;
}

export function applyEquipmentPenalties(storeId: StoreID, entity: LivingEntity) {
  const STORE_ID = storeId;

  if (!entity.inventory) return;

  const applyPenalties = (item: InventoryItem) => {
    if (item.item.meta_data) {
      const strMod = getFinalVariableValue(STORE_ID, 'ATTRIBUTE_STR').total;
      // If strength requirement exists and the character's str mod is >= to it, reduce/not include it
      if (item.item.meta_data.strength !== undefined && strMod >= item.item.meta_data.strength) {
        // Take speed penalty, reduced by 5, to all Speeds
        const speedPenalty = Math.abs(item.item.meta_data.speed_penalty ?? 0) - 5;
        if (speedPenalty > 0) {
          for (const speed of getAllSpeedVariables(STORE_ID)) {
            addVariableBonus(STORE_ID, speed.name, -1 * speedPenalty, undefined, '', `${item.item.name}`);
          }
        }

        // If armor is noisy, apply to Stealth checks even if you meet the required Strength score
        const isNoisy = hasTraitType('NOISY', item.item.traits);
        if (isNoisy) {
          const checkPenalty = Math.abs(item.item.meta_data.check_penalty ?? 0);
          if (checkPenalty > 0) {
            const stealthSkill = getAllSkillVariables(STORE_ID).find((skill) => skill.name === 'SKILL_STEALTH');
            if (stealthSkill) {
              addVariableBonus(
                STORE_ID,
                stealthSkill.name,
                -1 * checkPenalty,
                undefined,
                '', // Could include: (unless it has the attack trait)
                `${item.item.name}`
              );
            }
          }
        }
      } else {
        // If the strength requirement doesn't exist, always include penalty.
        //
        // Take check penalty to Strength- and Dexterity-based skill checks (except for those that have the attack trait)
        const checkPenalty = Math.abs(item.item.meta_data.check_penalty ?? 0);
        if (checkPenalty > 0) {
          const attrs = ['ATTRIBUTE_STR', 'ATTRIBUTE_DEX'];
          let skills = getAllSkillVariables(STORE_ID).filter((skill) => attrs.includes(skill.value.attribute ?? ''));

          // If armor is flexible, don't apply to Acrobatics or Athletics
          const isFlexible = hasTraitType('FLEXIBLE', item.item.traits);
          if (isFlexible) {
            skills = skills.filter((skill) => skill.name !== 'SKILL_ACROBATICS' && skill.name !== 'SKILL_ATHLETICS');
          }

          for (const skill of skills) {
            addVariableBonus(
              STORE_ID,
              skill.name,
              -1 * checkPenalty,
              undefined,
              '', // Could include: (unless it has the attack trait)
              `${item.item.name}`
            );
          }
        }

        // Take full speed penalty to all Speeds
        const speedPenalty = Math.abs(item.item.meta_data.speed_penalty ?? 0);
        if (speedPenalty > 0) {
          for (const speed of getAllSpeedVariables(STORE_ID)) {
            addVariableBonus(STORE_ID, speed.name, -1 * speedPenalty, undefined, '', `${item.item.name}`);
          }
        }
      }
    }
  };

  // Use the "best" armor/shield because that's the one we're assumed to be wearing
  const bestArmor = getBestArmor(STORE_ID, entity.inventory);
  const bestShield = getBestShield(STORE_ID, entity.inventory);
  if (bestArmor) applyPenalties(bestArmor);
  if (bestShield) applyPenalties(bestShield);
}

/**
 * Determines the "best" equipped armor in an inventory, based on total resulting AC
 * @param id - Variable Store ID
 * @param inv - Inventory
 * @returns - The best armor inventory item
 */
export function getBestArmor(id: StoreID, inv?: Inventory) {
  if (!inv) {
    return null;
  }
  let bestAc = 0;
  let bestArmor: InventoryItem | null = null;
  for (const invItem of inv.items) {
    if (invItem.is_equipped && isItemArmor(invItem.item)) {
      const acValue = getFinalAcValue(id, invItem.item);
      if (acValue > bestAc) {
        bestAc = acValue;
        bestArmor = invItem;
      }
    }
  }
  return bestArmor;
}

/**
 * Determines the "best" equipped shield in an inventory, based on AC bonus
 * @param id - Variable Store ID
 * @param inv - Inventory
 * @returns - The best shield inventory item
 */
export function getBestShield(id: StoreID, inv?: Inventory) {
  if (!inv) {
    return null;
  }
  let bestBonus = 0;
  let bestShield: InventoryItem | null = null;
  for (const invItem of inv.items) {
    if (invItem.is_equipped && isItemShield(invItem.item)) {
      const shieldBonus = invItem.item.meta_data?.ac_bonus ?? 0;
      if (shieldBonus > bestBonus) {
        bestBonus = shieldBonus;
        bestShield = invItem;
      }
    }
  }
  return bestShield;
}

export function getItemOperations(item: Item, content: ContentPackage) {
  const baseOps = cloneDeep(item.operations) ?? [];

  if (isItemWithRunes(item)) {
    if (isItemArmor(item)) {
      // Armor potency
      const potency = Math.min(item.meta_data?.runes?.potency ?? 0, 4);
      if (potency > 0) {
        const ops: Operation[] = [
          {
            id: 'a914f920-3bb4-49f0-aae7-92f423a7f4a4',
            type: 'addBonusToValue',
            data: {
              variable: 'AC_BONUS',
              value: potency,
              type: 'item',
              text: '',
            },
          },
        ];
        baseOps.push(...ops);
      }

      // Armor resilient
      const resilient = Math.min(item.meta_data?.runes?.resilient ?? 0, 4);
      if (resilient > 0) {
        const ops: Operation[] = [
          {
            id: '4819a316-736a-4c7f-937a-6710003b431a',
            type: 'addBonusToValue',
            data: {
              variable: 'SAVE_FORT',
              value: resilient,
              type: 'item',
              text: '',
            },
          },
          {
            id: '3f008891-b39f-440b-92ff-722d5cbe3ac7',
            type: 'addBonusToValue',
            data: {
              variable: 'SAVE_REFLEX',
              value: resilient,
              type: 'item',
              text: '',
            },
          },
          {
            id: '52kbafaa-e7db-4fa0-a845-1b727b123f8e',
            type: 'addBonusToValue',
            data: {
              variable: 'SAVE_WILL',
              value: resilient,
              type: 'item',
              text: '',
            },
          },
        ];
        baseOps.push(...ops);
      }
    }

    if (item.meta_data?.runes?.property) {
      for (const property of item.meta_data.runes.property) {
        const propertyRune = content.items.find((i) => i.id === property.id);
        if (propertyRune) {
          baseOps.push(...getItemOperations(propertyRune, content));
        }
      }
    }
  }

  if (isItemWithGradeImprovement(item)) {
    if (isItemArmor(item)) {
      const improvements = getGradeImprovements(item);
      if (improvements.ac_bonus > 0) {
        const ops: Operation[] = [
          {
            id: 'a914f220-3bb4-49f0-aae7-92f423a7f4a4',
            type: 'addBonusToValue',
            data: {
              variable: 'AC_BONUS',
              value: improvements.ac_bonus,
              type: 'item',
              text: '',
            },
          },
        ];
        baseOps.push(...ops);
      }
    }

    if (isItemWithUpgrades(item)) {
      for (const slot of item.meta_data?.starfinder?.slots ?? []) {
        const upgrade = content.items.find((i) => i.id === slot.id);
        if (upgrade) {
          baseOps.push(...getItemOperations(upgrade, content));
        }
      }
    }
  }

  if (isItemArmor(item)) {
    let value = 0;
    if (hasTraitType('RESILIENT-4', compileTraits(item))) {
      value = 4;
    } else if (hasTraitType('RESILIENT-3', compileTraits(item))) {
      value = 3;
    } else if (hasTraitType('RESILIENT-2', compileTraits(item))) {
      value = 2;
    } else if (hasTraitType('RESILIENT-1', compileTraits(item))) {
      value = 1;
    }

    if (value > 0) {
      const ops: Operation[] = [
        {
          id: '4829a316-736a-4c7f-937a-6710003b431a',
          type: 'addBonusToValue',
          data: {
            variable: 'SAVE_FORT',
            value: value,
            type: 'item',
            text: '',
          },
        },
        {
          id: '3f708891-b39f-440b-92ff-722d5cbe3ac7',
          type: 'addBonusToValue',
          data: {
            variable: 'SAVE_REFLEX',
            value: value,
            type: 'item',
            text: '',
          },
        },
        {
          id: '522bafaa-e7db-4fa0-a845-1b727b123f8e',
          type: 'addBonusToValue',
          data: {
            variable: 'SAVE_WILL',
            value: value,
            type: 'item',
            text: '',
          },
        },
      ];
      baseOps.push(...ops);
    }
  }

  return baseOps;
}

/**
 * Utility function to get the quantity of an item
 * @param item - Item
 * @returns - Quantity as a number
 */
export function getItemQuantity(item: Item) {
  return item.meta_data?.quantity ?? 1;
}

/**
 * Utility function to determine if an item is broken
 * @param item - Item
 * @returns - Whether the item is broken
 */
export function isItemBroken(item: Item) {
  const bt = item.meta_data?.broken_threshold ?? 0;
  const hp = item.meta_data?.hp;

  if (hp === undefined || hp === null) return false;
  if (bt > 0 && hp <= bt) {
    return true;
  }
  return false;
}

/**
 * Utility function to determine if an item is a container
 * @param item - Item
 * @returns - Whether the item is a container
 */
export function isItemContainer(item: Item) {
  return item.meta_data?.bulk?.capacity !== undefined;
}

/**
 * Utility function to determine if an inventory item is a formula
 * @param item - Inventory item
 * @returns - Whether the item is a formula
 */
export function isItemFormula(invItem: InventoryItem) {
  return invItem.is_formula;
}

/**
 * Utility function to determine if an item is investable
 * @param item - Item
 * @returns - Whether the item is investable
 */
export function isItemInvestable(item: Item) {
  return hasTraitType('INVESTED', item.traits);
}

/**
 * Utility function to determine if an item is implantable
 * @param item - Item
 * @returns - Whether the item is implantable
 */
export function isItemImplantable(item: Item) {
  return hasTraitType('AUGMENTATION', item.traits);
}

/**
 * Utility function to determine if an item is equippable
 * @param item - Item
 * @returns - Whether the item is equippable
 */
export function isItemEquippable(item: Item) {
  return isItemWeapon(item) || isItemArmor(item) || isItemShield(item);
}

/**
 * Utility function to determine if an item has runes
 * @param item - Item
 * @returns - Whether the item has runes
 */
export function isItemWithRunes(item: Item) {
  if (!item.meta_data?.runes) return false;

  return !!(item.meta_data.runes.potency || item.meta_data.runes.striking || item.meta_data.runes.resilient);
}

/**
 * Utility function to determine if an item has property runes
 * @param item - Item
 * @returns - Whether the item has property runes
 */
export function isItemWithPropertyRunes(item: Item) {
  if (!item.meta_data?.runes) return false;

  return (
    item.meta_data.runes.property &&
    item.meta_data.runes.property.length > 0 &&
    item.meta_data.runes.property.every((r) => r.id && r.name)
  );
}

// Fundamental Rune IDs Map
export const FUNDAMENTAL_RUNES: Record<string, number> = {
  potency_weapon_1: 7950, // Weapon Potency I
  potency_weapon_2: 7951, // Weapon Potency II
  potency_weapon_3: 7952, // Weapon Potency III
  potency_weapon_4: 19854, // Weapon Potency IV
  potency_weapon_10: 16927, // Weapon Potency (Mythic)
  potency_armor_1: 6719, // Armor Potency I
  potency_armor_2: 6720, // Armor Potency II
  potency_armor_3: 6721, // Armor Potency III
  potency_armor_10: 16924, // Armor Potency (Mythic)
  striking_1: 7862, // Striking
  striking_2: 7860, // Striking (Greater)
  striking_3: 7861, // Striking (Major)
  striking_10: 16926, // Striking (Mythic)
  resilient_1: 7703, // Resilient
  resilient_2: 7701, // Resilient (Greater)
  resilient_3: 7702, // Resilient (Major)
  resilient_10: 16925, // Resilient (Mythic)
} as const;

/**
 * Utility function to detect if an item IS a fundamental rune
 * @param item - Item
 * @returns - Whether the item is a fundamental rune
 */
export function isItemFundamentalRune(item: Item) {
  return Object.values(FUNDAMENTAL_RUNES).includes(item.id);
}

/**
 * Utility function to determine if an item has improved its grade
 * @param item - Item
 * @returns - Whether the item has improved its grade
 */
export function isItemWithGradeImprovement(item: Item) {
  return item.meta_data?.starfinder?.grade && item.meta_data.starfinder.grade !== 'COMMERCIAL';
}

/**
 * Utility function to determine if an item has upgrades
 * @param item - Item
 * @returns - Whether the item has upgrades
 */
export function isItemWithUpgrades(item: Item) {
  if (!isItemWithGradeImprovement(item) || !item.meta_data?.starfinder?.slots) return false;

  return item.meta_data.starfinder.slots.length > 0;
}

/**
 * Utility function to determine if an item should indicate quantity
 * @param item - Item
 * @returns - Whether the item is consumable
 */
export function isItemWithQuantity(item: Item) {
  const nonConsumableItemFns = [isItemWeapon, isItemArmor, isItemShield, isItemContainer, isItemInvestable];
  for (const nonConsumableFn of nonConsumableItemFns) {
    if (nonConsumableFn(item)) {
      return false;
    }
  }
  return hasTraitType('CONSUMABLE', item.traits) || (item.meta_data?.quantity && item.meta_data.quantity > 0);
}

/**
 * Utility function to determine if an item is a weapon
 * @param item - Item
 * @returns - Whether the item is a weapon
 */
export function isItemWeapon(item: Item) {
  return !!item.meta_data?.damage?.damageType && item.group === 'WEAPON';
}

/**
 * Utility function to determine if an item is a ranged weapon
 * @param item - Item
 * @returns - Whether the item is a ranged weapon
 */
export function isItemRangedWeapon(item: Item) {
  return !!item.meta_data?.range;
}

/**
 * Utility function to determine if an item is armor
 * @param item - Item
 * @returns - Whether the item is armor
 */
export function isItemArmor(item: Item) {
  return !!(item.meta_data?.dex_cap || item.meta_data?.dex_cap === 0);
}

/**
 * Utility function to determine if an item is a shield
 * @param item - Item
 * @returns - Whether the item is a shield
 */
export function isItemShield(item: Item) {
  return item.meta_data?.ac_bonus !== undefined && !isItemArmor(item);
}

/**
 * Utility function to determine if an item is an unarmed attack / meta-attack
 * @param item - Item
 * @returns - Whether the item is a meta attack
 */
export function isItemMetaAttack(item: Item) {
  return !!item.meta_data?.unselectable && isItemWeapon(item);
}

/**
 * Utility function to determine if an item is an unarmed defense / meta-defense
 * @param item - Item
 * @returns - Whether the item is a meta defense
 */
export function isItemMetaDefense(item: Item) {
  return !!item.meta_data?.unselectable && (isItemArmor(item) || isItemShield(item));
}

/**
 * Utility function to determine the main label for the item
 * @param item - Item
 * @param includeLevel - Whether to include the item level in the label
 * @returns - Item type label
 */
export function determineItemMetaType(item: Item, includeLevel?: boolean): string {
  let type = `Item ${includeLevel ? item.level : ''}`.trim();
  if (isItemMetaAttack(item)) {
    type = `Attack`;
  } else if (isItemMetaDefense(item)) {
    type = `Defense`;
  }
  return type;
}

/**
 * Utility function to determine if an item is archaic (old weapon from Pathfinder)
 * @param item - Item
 * @returns - Whether the item is archaic
 */
export function isItemArchaic(item: Item) {
  if (hasTraitType('ARCHAIC', item.traits)) {
    return true;
  }
  if (!isPlayingStarfinder()) {
    return false;
  }

  const source = getContentFast<ContentSource>('content-source', [item.content_source_id])[0];
  if (!source) {
    return false;
  }

  return (isItemWeapon(item) || isItemArmor(item)) && source.group.startsWith('pathfinder');
}

/**
 * Gets all traits that the item should have from its base item, main traits, runes, etc
 * @param item
 */
export function compileTraits(item: Item) {
  const traits = cloneDeep(item.traits ?? []);
  if (item.meta_data?.base_item_content) {
    traits.push(...(item.meta_data.base_item_content.traits ?? []));
  }

  if (isItemWithRunes(item)) {
    traits.push(getTraitIdByType('MAGICAL'));

    // Add traits from the property runes
    for (const rune of item.meta_data?.runes?.property ?? []) {
      // TODO, Could run compileTraits() on the rune, but that -could- result in endless loops
      traits.push(...(rune.rune?.traits ?? []));
    }
  }

  if (isItemWithGradeImprovement(item)) {
    const improvements = getGradeImprovements(item);
    traits.push(...improvements.trait_ids);

    // Add traits from the upgrades
    for (const slot of item.meta_data?.starfinder?.slots ?? []) {
      // TODO, Could run compileTraits() on the upgrade, but that -could- result in endless loops
      traits.push(...(slot.upgrade?.traits ?? []));
    }
  }

  return uniq(traits);
}

/**
 * Converts a bulk value to a string label
 * @param bulk - Bulk value
 * @param displayZero - Whether to display 0 bulk as 0
 * @returns - Bulk label
 */
export function labelizeBulk(bulk?: number | string, displayZero = false) {
  if (bulk === undefined || bulk === null || bulk === '') {
    if (displayZero) {
      return '0';
    } else {
      return '—';
    }
  }
  bulk = parseFloat(bulk as string);
  if (bulk === 0) {
    if (displayZero) {
      return '0';
    } else {
      return '—';
    }
  }
  if (bulk === 0.1) {
    return 'L';
  }
  const bulkFloat = parseFloat(bulk.toFixed(1));

  const _bulk = Math.floor(bulkFloat);
  const _light = Math.round((bulkFloat - _bulk) * 10);

  if (_light === 0) {
    return `${_bulk}`;
  } else {
    if (_bulk === 0) {
      return `0.${_light}`;
    } else {
      return `${_bulk}.${_light}`;
    }
  }
}

export function getBulkLimit(id: StoreID) {
  const strMod = getFinalVariableValue(id, 'ATTRIBUTE_STR').total;
  const bonus = getFinalVariableValue(id, 'BULK_LIMIT_BONUS').total;
  return 5 + strMod + bonus;
}

export function getBulkLimitImmobile(id: StoreID) {
  return getBulkLimit(id) + 5;
}

export function reachedInvestedLimit(id: StoreID, inv?: Inventory) {
  if (!inv) {
    return false;
  }
  const invItems = getFlatInvItems(inv);
  const investedItems = invItems.filter((item) => item.is_invested);
  return investedItems.length >= getInvestedLimit(id);
}

export function getInvestedLimit(id: StoreID) {
  return 10 + getFinalVariableValue(id, 'INVEST_LIMIT_BONUS').total;
}

export function reachedImplantLimit(id: StoreID, inv?: Inventory) {
  if (!inv) {
    return false;
  }
  const invItems = getFlatInvItems(inv);
  const implantedItems = invItems.filter((item) => item.is_implanted);
  return implantedItems.length >= getImplantLimit(id);
}

export function getImplantLimit(id: StoreID) {
  const conMod = getFinalVariableValue(id, 'ATTRIBUTE_CON').total;
  return 1 + conMod + getFinalVariableValue(id, 'IMPLANT_LIMIT_BONUS').total;
}

/**
 * Utility function to get the health values of an item
 * @param item - Item
 * @returns - Health values
 */
export function getItemHealth(item: Item) {
  const bt = item.meta_data?.broken_threshold ?? 0;
  const hardness = item.meta_data?.hardness ?? 0;
  const hp_max = item.meta_data?.hp_max ?? 0;
  const hp = item.meta_data?.hp ?? 0;

  const improvements = getGradeImprovements(item);

  return {
    hardness: hardness + improvements.hardness_bonus,
    hp_max: hp_max + improvements.hp_bonus,
    bt: bt + improvements.bt_bonus,
    hp_current: hp,
  };
}

export function filterByTraitType(invItems: InventoryItem[], traitType: TraitType) {
  return invItems.filter((invItem) => hasTraitType(traitType, compileTraits(invItem.item)));
}

/**
 * Utility function to get all the Starfinder improvements for based on its grade
 * @param item - Item to get grade improvements for
 * @returns - Grade improvements
 */
export function getGradeImprovements(item: Item) {
  const improvements = {
    grade: 'COMMERCIAL',
    level: 0,
    upgrade_price: 0, // in credits
    total_price: 0, // in credits
    upgrade_slots: 0,
    ac_bonus: 0,
    damage_dice: 1,
    hardness_bonus: 0,
    hp_bonus: 0,
    bt_bonus: 0,
    trait_ids: [] as number[],
  };

  if (!isItemWithGradeImprovement(item)) {
    return improvements;
  }

  improvements.grade = item.meta_data?.starfinder?.grade ?? 'COMMERCIAL';
  if (isItemArmor(item)) {
    if (item.meta_data?.starfinder?.grade === 'TACTICAL') {
      improvements.level = 5;
      improvements.upgrade_price = 1600;
      improvements.total_price = 1600;
      improvements.upgrade_slots = 0;
      improvements.ac_bonus = 1;
      improvements.trait_ids.push(getTraitIdByType('RESILIENT-1'));
    } else if (item.meta_data?.starfinder?.grade === 'ADVANCED') {
      improvements.level = 8;
      improvements.upgrade_price = 3400;
      improvements.total_price = 5000;
      improvements.upgrade_slots = 1;
      improvements.ac_bonus = 1;
      improvements.trait_ids.push(getTraitIdByType('RESILIENT-1'));
    } else if (item.meta_data?.starfinder?.grade === 'SUPERIOR') {
      improvements.level = 11;
      improvements.upgrade_price = 9000;
      improvements.total_price = 14000;
      improvements.upgrade_slots = 1;
      improvements.ac_bonus = 2;
      improvements.trait_ids.push(getTraitIdByType('RESILIENT-2'));
    } else if (item.meta_data?.starfinder?.grade === 'ELITE') {
      improvements.level = 14;
      improvements.upgrade_price = 31000;
      improvements.total_price = 45000;
      improvements.upgrade_slots = 2;
      improvements.ac_bonus = 2;
      improvements.trait_ids.push(getTraitIdByType('RESILIENT-2'));
    } else if (item.meta_data?.starfinder?.grade === 'ULTIMATE') {
      improvements.level = 18;
      improvements.upgrade_price = 195000;
      improvements.total_price = 240000;
      improvements.upgrade_slots = 3;
      improvements.ac_bonus = 3;
      improvements.trait_ids.push(getTraitIdByType('RESILIENT-3'));
    } else if (item.meta_data?.starfinder?.grade === 'PARAGON') {
      improvements.level = 20;
      improvements.upgrade_price = 460000;
      improvements.total_price = 700000;
      improvements.upgrade_slots = 3;
      improvements.ac_bonus = 3;
      improvements.trait_ids.push(getTraitIdByType('RESILIENT-3'));
    }
  } else if (isItemShield(item)) {
    if (item.meta_data?.starfinder?.grade === 'TACTICAL') {
      improvements.level = 5;
      improvements.upgrade_price = 750;
      improvements.total_price = 750;
      improvements.hardness_bonus = 3;
      improvements.hp_bonus = 46;
      improvements.bt_bonus = 23;
    } else if (item.meta_data?.starfinder?.grade === 'ADVANCED') {
      improvements.level = 8;
      improvements.upgrade_price = 2250;
      improvements.total_price = 3000;
      improvements.hardness_bonus = 3;
      improvements.hp_bonus = 56;
      improvements.bt_bonus = 28;
    } else if (item.meta_data?.starfinder?.grade === 'SUPERIOR') {
      improvements.level = 11;
      improvements.upgrade_price = 6000;
      improvements.total_price = 9000;
      improvements.hardness_bonus = 3;
      improvements.hp_bonus = 68;
      improvements.bt_bonus = 34;
    } else if (item.meta_data?.starfinder?.grade === 'ELITE') {
      improvements.level = 14;
      improvements.upgrade_price = 16000;
      improvements.total_price = 25000;
      improvements.hardness_bonus = 5;
      improvements.hp_bonus = 80;
      improvements.bt_bonus = 40;
    } else if (item.meta_data?.starfinder?.grade === 'ULTIMATE') {
      improvements.level = 18;
      improvements.upgrade_price = 55000;
      improvements.total_price = 80000;
      improvements.hardness_bonus = 6;
      improvements.hp_bonus = 100;
      improvements.bt_bonus = 50;
    } else if (item.meta_data?.starfinder?.grade === 'PARAGON') {
      improvements.level = 20;
      improvements.upgrade_price = 240000;
      improvements.total_price = 320000;
      improvements.hardness_bonus = 7;
      improvements.hp_bonus = 120;
      improvements.bt_bonus = 60;
    }
  } else if (isItemWeapon(item)) {
    if (item.meta_data?.starfinder?.grade === 'TACTICAL') {
      improvements.level = 2;
      improvements.upgrade_price = 350;
      improvements.total_price = 350;
      improvements.upgrade_slots = 0;
      improvements.damage_dice = 1;
      improvements.trait_ids.push(getTraitIdByType('TRACKING-1'));
    } else if (item.meta_data?.starfinder?.grade === 'ADVANCED') {
      improvements.level = 4;
      improvements.upgrade_price = 650;
      improvements.total_price = 1000;
      improvements.upgrade_slots = 1;
      improvements.damage_dice = 2;
      improvements.trait_ids.push(getTraitIdByType('TRACKING-1'));
    } else if (item.meta_data?.starfinder?.grade === 'SUPERIOR') {
      improvements.level = 10;
      improvements.upgrade_price = 9000;
      improvements.total_price = 10000;
      improvements.upgrade_slots = 1;
      improvements.damage_dice = 2;
      improvements.trait_ids.push(getTraitIdByType('TRACKING-2'));
    } else if (item.meta_data?.starfinder?.grade === 'ELITE') {
      improvements.level = 12;
      improvements.upgrade_price = 10000;
      improvements.total_price = 20000;
      improvements.upgrade_slots = 2;
      improvements.damage_dice = 3;
      improvements.trait_ids.push(getTraitIdByType('TRACKING-2'));
    } else if (item.meta_data?.starfinder?.grade === 'ULTIMATE') {
      improvements.level = 16;
      improvements.upgrade_price = 80000;
      improvements.total_price = 100000;
      improvements.upgrade_slots = 2;
      improvements.damage_dice = 3;
      improvements.trait_ids.push(getTraitIdByType('TRACKING-3'));
    } else if (item.meta_data?.starfinder?.grade === 'PARAGON') {
      improvements.level = 19;
      improvements.upgrade_price = 300000;
      improvements.total_price = 400000;
      improvements.upgrade_slots = 3;
      improvements.damage_dice = 4;
      improvements.trait_ids.push(getTraitIdByType('TRACKING-3'));
    }
  }

  return improvements;
}
