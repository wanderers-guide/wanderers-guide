import { Inventory, InventoryItem, Item } from '@typing/content';

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

export function isItemBroken(item: Item) {
  const bt = item.meta_data?.broken_threshold ?? 0;
  const hp = item.meta_data?.hp ?? 0;
  if (bt > 0 && hp < bt) {
    return true;
  }
  return false;
}
