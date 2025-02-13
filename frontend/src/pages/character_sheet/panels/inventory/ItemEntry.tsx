import { MoveItemMenu } from '@common/operations/item/MoveItemMenu';

import classes from '@css/FaqSimple.module.css';
import {
  handleDeleteItem,
  handleMoveItem,
  handleUpdateItem,
  isItemContainer,
  isItemImplantable,
  isItemInvestable,
} from '@items/inv-utils';
import { Accordion, Box, Stack, Text } from '@mantine/core';
import { StatButton } from '@pages/character_builder/CharBuilderCreation';
import { Inventory, InventoryItem, LivingEntity } from '@typing/content';
import { StoreID } from '@typing/variables';
import { cloneDeep } from 'lodash-es';
import { InvItemOption } from './InventoryItem';

export function ItemEntry(props: {
  invItem: InventoryItem;
  index: number;
  setInventory: React.Dispatch<React.SetStateAction<Inventory>>;
  id: StoreID;
  entity: LivingEntity | null;
  isPhone?: boolean;
  openDrawer: (data: any) => void;
  containerItems: InventoryItem[];
}) {
  const { invItem, openDrawer, containerItems } = props;

  const openDrawerWithItem = (invItem: InventoryItem) => {
    openDrawer({
      type: 'inv-item',
      data: {
        storeId: props.id,
        zIndex: 100,
        invItem: cloneDeep(invItem),
        onItemUpdate: (newInvItem: InventoryItem) => {
          handleUpdateItem(props.setInventory, newInvItem);
        },
        onItemDelete: (newInvItem: InventoryItem) => {
          handleDeleteItem(props.setInventory, newInvItem);
          openDrawer(null);
        },
        onItemMove: (invItem: InventoryItem, containerItem: InventoryItem | null) => {
          handleMoveItem(props.setInventory, invItem, containerItem);
        },
      },
      extra: { addToHistory: true },
    });
  };

  const equipItem = (invItem: InventoryItem) => {
    const newInvItem = cloneDeep(invItem);
    newInvItem.is_equipped = !newInvItem.is_equipped;
    handleUpdateItem(props.setInventory, newInvItem);
  };

  const investItem = (invItem: InventoryItem) => {
    const newInvItem = cloneDeep(invItem);

    if (isItemInvestable(newInvItem.item)) {
      newInvItem.is_invested = !newInvItem.is_invested;
    }
    if (isItemImplantable(newInvItem.item)) {
      newInvItem.is_implanted = !newInvItem.is_implanted;
    }

    handleUpdateItem(props.setInventory, newInvItem);
  };

  const commonProps = {
    openDrawerWithItem,
    equipItem,
    investItem,
    otherContainerItems: containerItems.filter((item) => item.id !== invItem.id),
  } as const;

  if (isItemContainer(invItem.item)) {
    return <ContainerItemEntry {...props} {...commonProps} />;
  } else {
    return <StandardItemEntry {...props} {...commonProps} />;
  }
}

function ContainerItemEntry(props: {
  invItem: InventoryItem;
  index: number;
  setInventory: React.Dispatch<React.SetStateAction<Inventory>>;
  id: StoreID;
  entity: LivingEntity | null;
  isPhone?: boolean;
  otherContainerItems: InventoryItem[];
  openDrawerWithItem: (invItem: InventoryItem) => void;
  equipItem: (invItem: InventoryItem) => void;
  investItem: (invItem: InventoryItem) => void;
}) {
  const { invItem, index, isPhone, openDrawerWithItem, equipItem, investItem } = props;

  return (
    <Accordion.Item className={classes.item} value={`${index}`} w='100%'>
      <Accordion.Control>
        <Box pr={5}>
          <InvItemOption
            id={props.id}
            entity={props.entity}
            isPhone={isPhone}
            hideSections
            invItem={invItem}
            onEquip={equipItem}
            onInvest={investItem}
            onViewItem={openDrawerWithItem}
          />
        </Box>
      </Accordion.Control>
      <Accordion.Panel>
        <Stack gap={5}>
          {invItem?.container_contents.map((containedItem) => (
            <StatButton
              key={containedItem.id}
              onClick={() => {
                openDrawerWithItem(containedItem);
              }}
            >
              <InvItemOption
                id={props.id}
                entity={props.entity}
                isPhone={isPhone}
                invItem={containedItem}
                preventEquip
                onInvest={investItem}
                additionalButtons={
                  <DesktopMoveItemMenu
                    invItem={containedItem}
                    otherContainerItems={props.otherContainerItems}
                    setInventory={props.setInventory}
                    isPhone={isPhone}
                  />
                }
              />
            </StatButton>
          ))}
          {invItem?.container_contents.length === 0 && (
            <Text c='gray.7' fz='sm' ta='center' fs='italic'>
              Container is empty
            </Text>
          )}
        </Stack>
      </Accordion.Panel>
    </Accordion.Item>
  );
}

function StandardItemEntry(props: {
  invItem: InventoryItem;
  index: number;
  setInventory: React.Dispatch<React.SetStateAction<Inventory>>;
  id: StoreID;
  entity: LivingEntity | null;
  isPhone?: boolean;
  otherContainerItems: InventoryItem[];
  openDrawerWithItem: (invItem: InventoryItem) => void;
  equipItem: (invItem: InventoryItem) => void;
  investItem: (invItem: InventoryItem) => void;
}) {
  const { invItem, index, isPhone, openDrawerWithItem, equipItem, investItem } = props;
  return (
    <Box mb={5}>
      <StatButton
        key={index}
        onClick={() => {
          openDrawerWithItem(invItem);
        }}
      >
        <InvItemOption
          id={props.id}
          entity={props.entity}
          isPhone={isPhone}
          invItem={invItem}
          onEquip={equipItem}
          onInvest={investItem}
          additionalButtons={
            <DesktopMoveItemMenu
              showUnstore={false}
              invItem={invItem}
              otherContainerItems={props.otherContainerItems}
              setInventory={props.setInventory}
              isPhone={isPhone}
            />
          }
        />
      </StatButton>
    </Box>
  );
}

function DesktopMoveItemMenu(props: {
  isPhone?: boolean;
  invItem: InventoryItem;
  showUnstore?: boolean;
  otherContainerItems: InventoryItem[];
  setInventory: React.Dispatch<React.SetStateAction<Inventory>>;
}) {
  if (props.isPhone) return null;

  return (
    <MoveItemMenu
      showOnlyIcon
      invItem={props.invItem}
      showUnstore={props.showUnstore}
      containerItems={props.otherContainerItems}
      onItemMove={(invItem, containerItem) => handleMoveItem(props.setInventory, invItem, containerItem)}
    />
  );
}
