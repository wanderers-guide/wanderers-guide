import { Inventory, InventoryItem } from '@typing/content';

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
