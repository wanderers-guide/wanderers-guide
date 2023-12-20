import { Inventory, InventoryItem, Item } from '@typing/content';
import { hasTraitType } from '@utils/traits';

export function getFlatInvItems(inv: Inventory) {
  const flatItems = inv.items.reduce((acc, item) => {
    if (item.is_container) {
      const items = acc.concat(item.container_contents);
      items.push({
        ...item,
        container_contents: [],
      });
      return items;
    }
    return acc.concat(item);
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
    totalBulk += bulk * invItem.quantity;

    if (invItem.is_container) {
      const ignoredBulk = invItem.item.meta_data?.bulk.ignored ?? 0;
      let containerTotalBulk = 0;
      for (const containerItem of invItem.container_contents) {
        const innerBulk =
          containerItem.item.meta_data?.bulk?.held_or_stowed ??
          parseFloat(containerItem.item.bulk ?? '0') ??
          0;
        containerTotalBulk += innerBulk * containerItem.quantity;
      }
      containerTotalBulk -= ignoredBulk;
      totalBulk += Math.max(containerTotalBulk, 0);
    }
  }
  return totalBulk;
}

export function isItemBroken(item: Item) {
  const bt = item.meta_data?.broken_threshold ?? 0;
  const hp = item.meta_data?.hp ?? 0;
  if (bt > 0 && hp < bt) {
    return true;
  }
  return false;
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
  return `${bulk.toFixed(1)}`;
}
