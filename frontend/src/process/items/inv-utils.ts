import { Inventory, InventoryItem, Item } from '@typing/content';
import { StoreID } from '@typing/variables';
import { hasTraitType } from '@utils/traits';
import { getFinalAcValue } from '@variables/variable-display';
import _ from 'lodash';

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
          containerItem.item.meta_data?.bulk?.held_or_stowed ??
          parseFloat(containerItem.item.bulk ?? '0') ??
          0;
        containerTotalBulk += innerBulk * getItemQuantity(containerItem.item);
      }
      containerTotalBulk -= ignoredBulk;
      totalBulk += Math.max(containerTotalBulk, 0);
    }
  }
  return totalBulk;
}

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
        quantity: 1,
        is_formula: is_formula,
        is_equipped: false,
        is_invested: false,
        is_container: false,
        container_contents: [],
      },
    ].sort((a, b) => a.item.name.localeCompare(b.item.name));
    return {
      ...prev,
      items: newItems,
    };
  });
};

export const handleDeleteItem = (
  setInventory: React.Dispatch<React.SetStateAction<Inventory>>,
  invItem: InventoryItem
) => {
  setInventory((prev) => {
    const newItems = _.cloneDeep(prev.items.filter((item) => item.id !== invItem.id));
    // Remove from all containers
    newItems.forEach((item) => {
      if (isItemContainer(item.item)) {
        item.container_contents = item.container_contents.filter(
          (containedItem) => containedItem.id !== invItem.id
        );
      }
    });
    return {
      ...prev,
      items: newItems,
    };
  });
};

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

export function getItemQuantity(item: Item) {
  return item.meta_data?.quantity ?? 1;
}

export function isItemBroken(item: Item) {
  const bt = item.meta_data?.broken_threshold ?? 0;
  const hp = item.meta_data?.hp ?? 0;
  if (bt > 0 && hp <= bt) {
    return true;
  }
  return false;
}

export function isItemContainer(item: Item) {
  return item.meta_data?.bulk?.capacity !== undefined;
}

export function isItemInvestable(item: Item) {
  return hasTraitType('INVESTED', item.traits);
}

export function isItemEquippable(item: Item) {
  return isItemWeapon(item) || isItemArmor(item) || isItemShield(item);
}

export function isItemWithQuantity(item: Item) {
  return hasTraitType('CONSUMABLE', item.traits);
}

export function isItemWeapon(item: Item) {
  return !!item.meta_data?.damage;
}

export function isItemArmor(item: Item) {
  return item.meta_data?.dex_cap !== undefined;
}

export function isItemShield(item: Item) {
  return item.meta_data?.ac_bonus !== undefined && !isItemArmor(item);
}

export function labelizeBulk(bulk?: number | string, displayZero = false) {
  if (bulk === undefined) {
    if (displayZero) {
      return '0';
    } else {
      return '–';
    }
  }
  bulk = parseFloat(bulk as string);
  if (bulk === 0) {
    if (displayZero) {
      return '0';
    } else {
      return '–';
    }
  }
  if (bulk === 0.1) {
    return 'L';
  }
  return `${parseFloat(bulk.toFixed(1))}`;
}
