import { getConditionByName } from '@conditions/condition-handler';
import { getCachedSources } from '@content/content-store';
import { isPlayingStarfinder } from '@content/system-handler';
import { Character, Inventory, InventoryItem, Item } from '@typing/content';
import { StoreID, VariableListStr } from '@typing/variables';
import { hasTraitType } from '@utils/traits';
import { getFinalAcValue, getFinalVariableValue } from '@variables/variable-display';
import { getVariable } from '@variables/variable-manager';
import * as _ from 'lodash-es';
import { SetterOrUpdater } from 'recoil';

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
export function getInvBulk(inv: Inventory) {
  let totalBulk = 0;
  for (const invItem of inv.items) {
    const bulk =
      (invItem.is_equipped
        ? invItem.item.meta_data?.bulk?.held_or_stowed ?? parseFloat(invItem.item.bulk ?? '0')
        : parseFloat(invItem.item.bulk ?? '0')) ?? 0;
    totalBulk += bulk * getItemQuantity(invItem.item);

    if (isItemContainer(invItem.item)) {
      const ignoredBulk = invItem.item.meta_data?.bulk.ignored ?? 0;
      let containerTotalBulk = 0;
      for (const containerItem of invItem.container_contents) {
        const innerBulk =
          containerItem.item.meta_data?.bulk?.held_or_stowed ?? parseFloat(containerItem.item.bulk ?? '0') ?? 0;
        containerTotalBulk += innerBulk * getItemQuantity(containerItem.item);
      }
      containerTotalBulk -= ignoredBulk;
      totalBulk += Math.max(containerTotalBulk, 0);
    }
  }
  return totalBulk;
}

/**
 * Utility function to handle adding an item to the inventory
 * @param setInventory - Inventory state setter
 * @param item - Item to add
 * @param is_formula - Whether the item is a formula
 */
export const handleAddItem = (
  setInventory: React.Dispatch<React.SetStateAction<Inventory>>,
  item: Item,
  is_formula: boolean
) => {
  setInventory((prev) => {
    const newItems = [
      ..._.cloneDeep(prev.items),
      {
        id: crypto.randomUUID(),
        item: _.cloneDeep(item),
        is_formula: is_formula,
        is_equipped: false,
        is_invested: false,
        container_contents: [],
      },
    ].sort((a, b) => a.item.name.localeCompare(b.item.name));
    return {
      ...prev,
      items: newItems,
    };
  });
};

export function checkBulkLimit(character: Character, setCharacter: SetterOrUpdater<Character | null>) {
  setTimeout(() => {
    if (!character.inventory) return;
    if (getInvBulk(character.inventory) > getBulkLimit('CHARACTER')) {
      // Add encumbered condition
      const newConditions = _.cloneDeep(character.details?.conditions ?? []);
      const encumbered = newConditions.find((c) => c.name === 'Encumbered');
      if (!encumbered) {
        newConditions.push(getConditionByName('Encumbered')!);

        // if (getInvBulk(character.inventory) > getBulkLimitImmobile('CHARACTER')) {
        //   const immobilized = newConditions.find((c) => c.name === 'Immobilized');
        //   if (!immobilized) {
        //     newConditions.push(getConditionByName('Immobilized')!);
        //   }
        // }

        setCharacter((c) => {
          if (!c) return c;
          return {
            ...c,
            details: {
              ...c.details,
              conditions: newConditions,
            },
          };
        });
      }
    } else {
      // Remove encumbered condition
      // const newConditions = _.cloneDeep(character.details?.conditions ?? []);
      // const encumbered = newConditions.find((c) => c.name === 'Encumbered');
      // if (encumbered) {
      //   newConditions.splice(newConditions.indexOf(encumbered), 1);
      //   setCharacter((c) => {
      //     if (!c) return c;
      //     return {
      //       ...c,
      //       details: {
      //         ...c.details,
      //         conditions: newConditions,
      //       },
      //     };
      //   });
      // }
    }
  }, 200);
}

export function addExtraItems(items: Item[], character: Character, setCharacter: SetterOrUpdater<Character | null>) {
  setTimeout(() => {
    if (!character.inventory) return;

    const extraItems: InventoryItem[] = [];
    (getVariable<VariableListStr>('CHARACTER', 'EXTRA_ITEM_IDS')?.value ?? []).forEach((itemId) => {
      const item = items.find((item) => `${item.id}` === itemId);
      const itemExists = !!(
        character?.inventory && getFlatInvItems(character?.inventory).find((i) => `${i.item.id}` === itemId)
      );
      if (item && !itemExists) {
        extraItems.push({
          id: 'extra-item-' + itemId,
          item: item,
          is_formula: false,
          is_equipped: isItemEquippable(item),
          is_invested: isItemInvestable(item),
          container_contents: [],
        });
      }
    });

    if (extraItems.length === 0) return;

    setCharacter((c) => {
      if (!c) return c;
      return {
        ...c,
        inventory: {
          ...c.inventory!,
          items: [...(c.inventory?.items ?? []), ...extraItems],
        },
      };
    });
  }, 100);
}

/**
 * Utility function to handle deleting an item from the inventory
 * @param setInventory - Inventory state setter
 * @param invItem - Inventory item to delete
 */
export const handleDeleteItem = (
  setInventory: React.Dispatch<React.SetStateAction<Inventory>>,
  invItem: InventoryItem
) => {
  setInventory((prev) => {
    const newItems = _.cloneDeep(prev.items.filter((item) => item.id !== invItem.id));
    // Remove from all containers
    newItems.forEach((item) => {
      if (isItemContainer(item.item)) {
        item.container_contents = item.container_contents.filter((containedItem) => containedItem.id !== invItem.id);
      }
    });
    return {
      ...prev,
      items: newItems,
    };
  });
};

/**
 * Utility function to handle updating an item in the inventory
 * @param setInventory - Inventory state setter
 * @param invItem - Inventory item to update
 */
export const handleUpdateItem = (
  setInventory: React.Dispatch<React.SetStateAction<Inventory>>,
  invItem: InventoryItem
) => {
  setInventory((prev) => {
    const newItems = _.cloneDeep(prev.items).map((item) => {
      if (item.id === invItem.id) {
        return _.cloneDeep(invItem);
      }
      return item;
    });
    // Update if it's in a container
    newItems.forEach((item) => {
      if (isItemContainer(item.item)) {
        item.container_contents = item.container_contents.map((containedItem) => {
          if (containedItem.id === invItem.id) {
            return _.cloneDeep(invItem);
          }
          return containedItem;
        });
      }
    });
    return {
      ...prev,
      items: newItems,
    };
  });
};

/**
 * Utility function to handle moving an item in the inventory
 * @param setInventory - Inventory state setter
 * @param invItem - Inventory item to move
 * @param containerItem - Container item to move to
 */
export const handleMoveItem = (
  setInventory: React.Dispatch<React.SetStateAction<Inventory>>,
  invItem: InventoryItem,
  containerItem: InventoryItem | null
) => {
  const movingItem = _.cloneDeep(invItem);
  handleDeleteItem(setInventory, invItem);
  setTimeout(() => {
    setInventory((prev) => {
      let newItems: InventoryItem[] = [];
      if (containerItem) {
        const foundContainer = _.cloneDeep(prev.items.find((item) => item.id === containerItem.id));
        if (!foundContainer) return prev;
        movingItem.is_equipped = false;
        newItems = _.cloneDeep(prev.items).map((item) => {
          if (item.id === foundContainer.id) {
            item.container_contents.push(movingItem);
          }
          return item;
        });
      } else {
        newItems = [..._.cloneDeep(prev.items), movingItem];
      }
      return {
        ...prev,
        items: newItems,
      };
    });
  }, 100);
};

/**
 * Determines the "best" armor in an inventory, based on total resulting AC
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
 * Determines the "best" shield in an inventory, based on AC bonus
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
  const hp = item.meta_data?.hp ?? 0;
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
 * Utility function to determine if an item is investable
 * @param item - Item
 * @returns - Whether the item is investable
 */
export function isItemInvestable(item: Item) {
  return hasTraitType('INVESTED', item.traits);
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

  return item.meta_data.runes.potency || item.meta_data.runes.striking || item.meta_data.runes.resilient;
}

/**
 * Utility function to determine if an item has property runes
 * @param item - Item
 * @returns - Whether the item has property runes
 */
export function isItemWithPropertyRunes(item: Item) {
  if (!item.meta_data?.runes) return false;

  return item.meta_data.runes.property && item.meta_data.runes.property.length > 0;
}

/**
 * Utility function to determine if an item should indicate quantity
 * @param item - Item
 * @returns - Whether the item is consumable
 */
export function isItemWithQuantity(item: Item) {
  return hasTraitType('CONSUMABLE', item.traits) || (item.meta_data?.quantity && item.meta_data.quantity > 1);
}

/**
 * Utility function to determine if an item is a weapon
 * @param item - Item
 * @returns - Whether the item is a weapon
 */
export function isItemWeapon(item: Item) {
  return !!item.meta_data?.damage?.damageType;
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
  return item.meta_data?.dex_cap !== undefined;
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

  const source = getCachedSources().find((source) => source.id === item.content_source_id);
  if (!source) {
    return false;
  }

  return (isItemWeapon(item) || isItemArmor(item)) && source.group.startsWith('pathfinder');
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
  return `${parseFloat(bulk.toFixed(1))}`;
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
