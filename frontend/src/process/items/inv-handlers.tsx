import { ItemIcon } from '@common/ItemIcon';
import { getConditionByName } from '@conditions/condition-handler';
import { showNotification } from '@mantine/notifications';
import { InventoryItem, Item, LivingEntity } from '@typing/content';
import { StoreID, VariableListStr } from '@typing/variables';
import { isCharacter } from '@utils/type-fixing';
import { getVariable } from '@variables/variable-manager';
import { labelToVariable } from '@variables/variable-utils';
import { cloneDeep, uniq, uniqBy } from 'lodash-es';
import { SetterOrUpdater } from 'recoil';
import {
  getBulkLimit,
  getDefaultContainerContents,
  getInvBulk,
  isItemContainer,
  isItemEquippable,
  isItemImplantable,
  isItemInvestable,
} from './inv-utils';

/**
 * Utility function to handle adding an item to the inventory
 * @param setEntity - LivingEntity state setter
 * @param item - Item to add
 * @param is_formula - Whether the item is a formula
 */
export const handleAddItem = async (
  setEntity: SetterOrUpdater<LivingEntity | null>,
  item: Item,
  is_formula: boolean
) => {
  const container_contents = await getDefaultContainerContents(item);
  setEntity((prev) => {
    if (!prev) return prev;

    const itemData = cloneDeep(item);
    if (itemData.meta_data) {
      itemData.meta_data.hp = itemData.meta_data.hp_max;
    }
    const newItems = [
      ...cloneDeep(prev.inventory?.items ?? []),
      {
        id: crypto.randomUUID(),
        item: itemData,
        is_formula: is_formula,
        is_equipped: false,
        is_invested: false,
        is_implanted: false,
        container_contents,
      },
    ].sort((a, b) => a.item.name.localeCompare(b.item.name));

    return {
      ...prev,
      inventory: {
        ...(prev?.inventory ?? {
          coins: {
            cp: 0,
            sp: 0,
            gp: 0,
            pp: 0,
          },
          items: [],
        }),
        items: newItems,
      },
    };
  });
  showNotification({
    title: 'Added to Inventory',
    message: `Added ${item.name}.`,
    icon: <ItemIcon item={item} size='1.0rem' color='#f8f9fa' useDefaultIcon />,
    autoClose: 1000,
  });
};

/**
 * Utility function to handle deleting an item from the inventory
 * @param setEntity - LivingEntity state setter
 * @param invItem - Inventory item to delete
 */
export const handleDeleteItem = (setEntity: SetterOrUpdater<LivingEntity | null>, invItem: InventoryItem) => {
  setEntity((prev) => {
    if (!prev) return prev;

    const newItems = cloneDeep(prev.inventory?.items.filter((item) => item.id !== invItem.id) ?? []);
    // Remove from all containers
    newItems.forEach((item) => {
      if (isItemContainer(item.item)) {
        item.container_contents = item.container_contents.filter((containedItem) => containedItem.id !== invItem.id);
      }
    });

    return {
      ...prev,
      inventory: {
        ...(prev?.inventory ?? {
          coins: {
            cp: 0,
            sp: 0,
            gp: 0,
            pp: 0,
          },
          items: [],
        }),
        items: newItems,
      },
    };
  });
};

/**
 * Utility function to handle updating an item in the inventory
 * @param setEntity - LivingEntity state setter
 * @param invItem - Inventory item to update
 */
export const handleUpdateItem = (setEntity: SetterOrUpdater<LivingEntity | null>, invItem: InventoryItem) => {
  setEntity((prev) => {
    if (!prev) return prev;

    const newItems = cloneDeep(prev.inventory?.items ?? []).map((item) => {
      if (item.id === invItem.id) {
        return cloneDeep(invItem);
      }
      return item;
    });
    // Update if it's in a container
    newItems.forEach((item) => {
      if (isItemContainer(item.item)) {
        item.container_contents = item.container_contents.map((containedItem) => {
          if (containedItem.id === invItem.id) {
            return cloneDeep(invItem);
          }
          return containedItem;
        });
      }
    });

    return {
      ...prev,
      inventory: {
        ...(prev?.inventory ?? {
          coins: {
            cp: 0,
            sp: 0,
            gp: 0,
            pp: 0,
          },
          items: [],
        }),
        items: newItems,
      },
    };
  });
};

/**
 * Utility function to handle moving an item in the inventory
 * @param setEntity - LivingEntity state setter
 * @param invItem - Inventory item to move
 * @param containerItem - Container item to move to
 */
export const handleMoveItem = (
  setEntity: SetterOrUpdater<LivingEntity | null>,
  invItem: InventoryItem,
  containerItem: InventoryItem | null
) => {
  const movingItem = cloneDeep(invItem);
  handleDeleteItem(setEntity, invItem);
  setTimeout(() => {
    setEntity((prev) => {
      if (!prev) return prev;

      let newItems: InventoryItem[] = [];
      if (containerItem) {
        const foundContainer = cloneDeep(prev.inventory?.items.find((item) => item.id === containerItem.id));
        if (!foundContainer) return prev;
        movingItem.is_equipped = false;
        newItems = cloneDeep(prev.inventory?.items ?? []).map((item) => {
          if (item.id === foundContainer.id) {
            item.container_contents.push(movingItem);
          }
          return item;
        });
      } else {
        newItems = [...cloneDeep(prev.inventory?.items ?? []), movingItem];
      }

      return {
        ...prev,
        inventory: {
          ...(prev?.inventory ?? {
            coins: {
              cp: 0,
              sp: 0,
              gp: 0,
              pp: 0,
            },
            items: [],
          }),
          items: newItems,
        },
      };
    });
  }, 100);
};

/**
 * Utility function to update the charges for an item
 * @param setEntity - LivingEntity state setter
 * @param invItem - Inventory item to update
 * @param charges - Charges to set
 */
export const handleUpdateItemCharges = (
  setEntity: React.Dispatch<React.SetStateAction<LivingEntity | null>>,
  invItem: InventoryItem,
  charges: { current?: number; max?: number }
) => {
  setEntity((char) => {
    if (!char || !char.inventory) return null;

    return {
      ...char,
      inventory: {
        ...char.inventory,
        items: char.inventory.items.map((i) => {
          if (i.id !== invItem.id) return i;

          // If it's the item, update the charges
          return {
            ...i,
            item: {
              ...i.item,
              meta_data: {
                ...i.item.meta_data!,
                charges: {
                  ...i.item.meta_data?.charges,
                  current: charges.current ?? i.item.meta_data?.charges?.current,
                  max: charges.max ?? i.item.meta_data?.charges?.max,
                },
              },
            },
          };
        }),
      },
    };
  });
};

export function checkBulkLimit(
  storeId: StoreID,
  entity: LivingEntity,
  setEntity: SetterOrUpdater<LivingEntity | null>,
  addEncumbered: boolean
) {
  setTimeout(() => {
    if (!entity.inventory) return;
    if (addEncumbered && Math.floor(getInvBulk(entity.inventory)) > getBulkLimit(storeId)) {
      // Add encumbered condition
      const newConditions = cloneDeep(entity.details?.conditions ?? []);
      const encumbered = newConditions.find((c) => c.name === 'Encumbered');
      if (!encumbered) {
        newConditions.push(getConditionByName('Encumbered', 'Over Bulk Limit')!);

        // if (Math.floor(getInvBulk(character.inventory)) > getBulkLimitImmobile(storeId)) {
        //   const immobilized = newConditions.find((c) => c.name === 'Immobilized');
        //   if (!immobilized) {
        //     newConditions.push(getConditionByName('Immobilized', 'Way Over Bulk Limit')!);
        //   }
        // }

        setEntity((c) => {
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
      const newConditions = cloneDeep(entity.details?.conditions ?? []);
      const encumbered = newConditions.find((c) => c.name === 'Encumbered' && c.source === 'Over Bulk Limit');
      if (encumbered) {
        newConditions.splice(newConditions.indexOf(encumbered), 1);
        setEntity((c) => {
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
    }
  }, 200);
}

export function addExtraItems(
  storeId: StoreID,
  items: Item[],
  entity: LivingEntity,
  setEntity: SetterOrUpdater<LivingEntity | null>
) {
  // Add extra items
  setTimeout(async () => {
    const extraItems: InventoryItem[] = [];

    let extraItemIds = getVariable<VariableListStr>(storeId, 'EXTRA_ITEM_IDS')?.value ?? [];
    if (isCharacter(entity)) {
      extraItemIds = [...extraItemIds, '9252']; // Hardcoded Fist ID
    }

    for (const itemId of extraItemIds) {
      const item = items.find((item) => `${item.id}` === itemId);
      const hasItemAdded = entity.meta_data?.given_item_ids?.includes(parseInt(itemId));
      if (item && !hasItemAdded) {
        const baseItem = item.meta_data?.base_item
          ? items.find((i) => labelToVariable(i.name) === labelToVariable(item.meta_data!.base_item!))
          : undefined;

        extraItems.push({
          id: 'extra-item-' + itemId,
          item: {
            ...item,
            meta_data: item.meta_data
              ? {
                  ...item.meta_data,
                  base_item_content: baseItem,
                }
              : undefined,
          },
          is_formula: false,
          is_equipped: isItemEquippable(item),
          is_invested: isItemInvestable(item),
          is_implanted: isItemImplantable(item),
          container_contents: await getDefaultContainerContents(item, items),
        });
      }
    }

    if (extraItems.length === 0) return;

    setEntity((c) => {
      if (!c) return c;
      return {
        ...c,
        inventory: {
          ...(c.inventory ?? {
            coins: {
              cp: 0,
              sp: 0,
              gp: 0,
              pp: 0,
            },
            items: [],
          }),
          items: uniqBy([...(c.inventory?.items ?? []), ...extraItems], 'id'),
        },
        meta_data: {
          ...c.meta_data,
          given_item_ids: uniq([...(c.meta_data?.given_item_ids ?? []), ...extraItems.map((item) => item.item.id)]),
        },
      };
    });
  }, 100);

  // Remove extra items that are no longer in the list
  setTimeout(() => {
    if (!entity.inventory) return;

    const givenItemIds = entity.meta_data?.given_item_ids ?? [];
    let extraItemIds = getVariable<VariableListStr>(storeId, 'EXTRA_ITEM_IDS')?.value ?? [];
    if (isCharacter(entity)) {
      extraItemIds = [...extraItemIds, '9252']; // Hardcoded Fist ID
    }

    const itemsToRemove = givenItemIds.filter((id) => !extraItemIds.includes(`${id}`));
    if (itemsToRemove.length === 0) return;

    setEntity((c) => {
      if (!c) return c;
      return {
        ...c,
        inventory: {
          ...c.inventory!,
          items: c.inventory!.items.filter((item) => !itemsToRemove.includes(item.item.id)),
        },
        meta_data: {
          ...c.meta_data,
          given_item_ids: c.meta_data?.given_item_ids?.filter((id) => !itemsToRemove.includes(id)),
        },
      };
    });
  }, 200);
}
