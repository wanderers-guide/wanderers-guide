import { drawerState } from '@atoms/navAtoms';
import { MoveItemMenu } from '@common/operations/item/MoveItemMenu';
import { isItemVisible } from '@content/content-hidden';

import classes from '@css/FaqSimple.module.css';
import {
  getBulkLimit,
  getInvBulk,
  handleAddItem,
  handleDeleteItem,
  handleMoveItem,
  handleUpdateItem,
  isItemContainer,
  isItemImplantable,
  isItemInvestable,
  isItemWeapon,
  labelizeBulk,
} from '@items/inv-utils';
import {
  Accordion,
  ActionIcon,
  Anchor,
  Badge,
  Box,
  Button,
  Grid,
  Group,
  Menu,
  rem,
  ScrollArea,
  Stack,
  Text,
  TextInput,
  Title,
  useMantineTheme,
} from '@mantine/core';
import { openContextModal } from '@mantine/modals';
import { BuyItemModal } from '@modals/BuyItemModal';
import { StatButton } from '@pages/character_builder/CharBuilderCreation';
import { IconCoins, IconMenu2, IconPlus, IconSearch } from '@tabler/icons-react';
import { ContentPackage, Inventory, InventoryItem, Item, LivingEntity } from '@typing/content';
import { StoreID } from '@typing/variables';
import { isPhoneSized } from '@utils/mobile-responsive';
import _ from 'lodash-es';
import { Key, useState } from 'react';
import { useRecoilState } from 'recoil';
import { CurrencySection } from './inventory/CoinsSection';
import { InvItemOption } from './inventory/InventoryItem';

export default function InventoryPanel(props: {
  id: StoreID;
  entity: LivingEntity | null;
  content: ContentPackage;
  panelHeight: number;
  panelWidth: number;
  inventory: Inventory;
  setInventory: React.Dispatch<React.SetStateAction<Inventory>>;
  zIndex?: number;
}) {
  const theme = useMantineTheme();
  const isPhone = isPhoneSized(props.panelWidth);
  const [searchQuery, setSearchQuery] = useState('');
  const [_drawer, openDrawer] = useRecoilState(drawerState);

  const [confirmBuyItem, setConfirmBuyItem] = useState<{ item: Item }>();

  const visibleInvItems = props.inventory.items.filter(
    (invItem) => !(!isItemVisible(props.id, invItem.item) && invItem.is_equipped && isItemWeapon(invItem.item))
  );
  const invItems = searchQuery.trim()
    ? visibleInvItems.filter((invItem) => {
        // Custom search, alt could be to use JsSearch here
        const query = searchQuery.trim().toLowerCase();

        const checkInvItem = (invItem: InventoryItem) => {
          if (invItem.item.name.toLowerCase().includes(query)) return true;
          if (invItem.item.description.toLowerCase().includes(query)) return true;
          if (invItem.item.group.toLowerCase().includes(query)) return true;
          return false;
        };

        if (checkInvItem(invItem)) return true;
        if (invItem.container_contents.some((containedItem) => checkInvItem(containedItem))) return true;
        return false;
      })
    : visibleInvItems;

  const openAddItemDrawer = () => {
    openContextModal({
      modal: 'addItems',
      title: (
        <Group wrap='nowrap' gap={20}>
          <Title order={3}>Add Items</Title>
        </Group>
      ),
      innerProps: {
        onAddItem: async (item: Item, type: 'GIVE' | 'BUY' | 'FORMULA') => {
          if (!props.entity) return;
          if (type === 'BUY') {
            setConfirmBuyItem({ item });
          } else {
            await handleAddItem(props.setInventory, item, type === 'FORMULA');
          }
        },
      },
      zIndex: props.zIndex ?? 499,
    });
  };

  const openManageCoinsDrawer = () => {
    openDrawer({
      type: 'manage-coins',
      data: {
        coins: props.entity?.inventory?.coins,
        onUpdate: (coins: { cp: number; sp: number; gp: number; pp: number }) => {
          props.setInventory((prev) => ({
            ...prev,
            coins: coins,
          }));
        },
      },
      extra: { addToHistory: true },
    });
  };

  return (
    <Box h='100%'>
      <Stack gap={5}>
        <Group>
          <TextInput
            style={{ flex: 1 }}
            leftSection={<IconSearch size='0.9rem' />}
            placeholder={`Search items`}
            onChange={(event) => setSearchQuery(event.target.value)}
            styles={{
              input: {
                backgroundColor: 'rgba(0, 0, 0, 0.3)',
                borderColor: searchQuery.trim().length > 0 ? theme.colors['guide'][8] : undefined,
              },
            }}
          />
          {isPhone ? (
            <Menu shadow='md' width={140} zIndex={props.zIndex ?? 499}>
              <Menu.Target>
                <ActionIcon variant='light' color='gray' size='lg' aria-label='Inventory Options'>
                  <IconMenu2 style={{ width: '70%', height: '70%' }} stroke={1.5} />
                </ActionIcon>
              </Menu.Target>

              <Menu.Dropdown>
                <Menu.Label>
                  Bulk: {labelizeBulk(getInvBulk(props.inventory), true)} / {getBulkLimit(props.id)}{' '}
                </Menu.Label>
                <Menu.Item
                  leftSection={<IconPlus style={{ width: rem(14), height: rem(14) }} />}
                  onClick={() => openAddItemDrawer()}
                >
                  Add Item
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconCoins style={{ width: rem(14), height: rem(14) }} />}
                  onClick={() => openManageCoinsDrawer()}
                >
                  Manage Currency
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          ) : (
            <Group wrap='nowrap'>
              <Badge
                variant='light'
                color='gray'
                size='lg'
                styles={{
                  root: {
                    textTransform: 'initial',
                  },
                }}
              >
                Bulk: {labelizeBulk(getInvBulk(props.inventory), true)} / {getBulkLimit(props.id)}
              </Badge>
              <CurrencySection entity={props.entity} onClick={() => openManageCoinsDrawer()} />
              <Button
                color='dark.5'
                style={{ borderColor: theme.colors.dark[4] }}
                radius='xl'
                size='sm'
                fw={500}
                rightSection={<IconPlus size='1.0rem' />}
                onClick={() => openAddItemDrawer()}
              >
                Add Item
              </Button>
            </Group>
          )}
        </Group>
        <ScrollArea h={props.panelHeight - 50} scrollbars='y'>
          {invItems.length !== 0 && (
            <Grid w={'100%'}>
              <Grid.Col span='auto'>
                <Text ta='left' fz='xs' pl={5}>
                  Name
                </Text>
              </Grid.Col>
              {!isPhone && (
                <Grid.Col span={3}>
                  <Grid>
                    <Grid.Col span={2}>
                      <Text ta='center' fz='xs'>
                        Qty
                      </Text>
                    </Grid.Col>
                    <Grid.Col span={3}>
                      <Text ta='center' fz='xs'>
                        Bulk
                      </Text>
                    </Grid.Col>
                    <Grid.Col span={7}>
                      <Text ta='left' fz='xs'>
                        Price
                      </Text>
                    </Grid.Col>
                  </Grid>
                </Grid.Col>
              )}
              <Grid.Col span={2} offset={1}>
                <Group justify='flex-end' wrap='nowrap' align='center' h={'100%'} gap={10}></Group>
              </Grid.Col>
            </Grid>
          )}
          <Accordion
            variant='separated'
            styles={{
              label: {
                paddingTop: 5,
                paddingBottom: 5,
              },
              control: {
                paddingLeft: 13,
                paddingRight: 13,
              },
              item: {
                marginTop: 0,
                marginBottom: 5,
              },
            }}
          >
            {_.cloneDeep(invItems)
              .sort((a: InventoryItem, b: InventoryItem) => a.item.name.localeCompare(b.item.name))
              .map((invItem: InventoryItem, index: number) => (
                <Box key={index}>
                  <ItemEntry
                    invItem={invItem}
                    index={index}
                    setInventory={props.setInventory}
                    id={props.id}
                    entity={props.entity}
                    isPhone={isPhone}
                    openDrawer={openDrawer}
                    containerItems={invItems.filter((item) => isItemContainer(item.item))}
                  />
                </Box>
              ))}
            {invItems.length === 0 && (
              <Text c='gray.5' fz='sm' ta='center' fs='italic' py={20}>
                Your inventory is empty,{' '}
                <Anchor fz='sm' fs='italic' onClick={() => openAddItemDrawer()}>
                  add some items
                </Anchor>
                !
              </Text>
            )}
          </Accordion>
        </ScrollArea>
      </Stack>
      {confirmBuyItem && (
        <BuyItemModal
          open={!!confirmBuyItem}
          inventory={props.inventory}
          item={confirmBuyItem.item}
          onConfirm={async (coins) => {
            if (!props.entity) return;
            await handleAddItem(props.setInventory, confirmBuyItem.item, false);

            // Update coins
            props.setInventory((prev) => {
              return {
                ...prev,
                coins,
              };
            });
          }}
          onClose={() => setConfirmBuyItem(undefined)}
        />
      )}
    </Box>
  );
}

function ItemEntry(props: {
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
        invItem: _.cloneDeep(invItem),
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
    const newInvItem = _.cloneDeep(invItem);
    newInvItem.is_equipped = !newInvItem.is_equipped;
    handleUpdateItem(props.setInventory, newInvItem);
  };

  const investItem = (invItem: InventoryItem) => {
    const newInvItem = _.cloneDeep(invItem);

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
                additionalButtons={<DesktopMoveItemMenu {...props} />}
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
          additionalButtons={<DesktopMoveItemMenu {...props} />}
        />
      </StatButton>
    </Box>
  );
}

function DesktopMoveItemMenu(props: {
  isPhone?: boolean;
  invItem: InventoryItem;
  otherContainerItems: InventoryItem[];
  setInventory: React.Dispatch<React.SetStateAction<Inventory>>;
}) {
  if (props.isPhone) return null;

  return (
    <MoveItemMenu
      showOnlyIcon
      invItem={props.invItem}
      containerItems={props.otherContainerItems}
      onItemMove={(invItem, containerItem) => handleMoveItem(props.setInventory, invItem, containerItem)}
    />
  );
}
