import { drawerState } from '@atoms/navAtoms';
import { isItemVisible } from '@content/content-hidden';

import { getBulkLimit, getInvBulk, handleAddItem, isItemContainer, isItemWeapon, labelizeBulk } from '@items/inv-utils';
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
import { modals, openContextModal } from '@mantine/modals';
import { BuyItemModal } from '@modals/BuyItemModal';
import { CreateItemModal } from '@modals/CreateItemModal';
import { IconCoins, IconMenu2, IconPlus, IconSearch } from '@tabler/icons-react';
import { ContentPackage, Inventory, InventoryItem, Item, LivingEntity } from '@typing/content';
import { StoreID } from '@typing/variables';
import { isPhoneSized } from '@utils/mobile-responsive';
import { cloneDeep } from 'lodash-es';
import { useState } from 'react';
import { useRecoilState } from 'recoil';
import { CurrencySection } from './inventory/CoinsSection';
import { ItemEntry } from './inventory/ItemEntry';

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
  const [creatingCustomItem, setCreatingCustomItem] = useState(false);

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
        <Group wrap='nowrap' gap={20} justify='space-between'>
          <Title order={3}>Add Items</Title>
          <Button
            variant='light'
            color={theme.colors['gray'][6]}
            size='compact-xs'
            mr={5}
            onClick={() => {
              modals.closeAll();
              setCreatingCustomItem(true);
            }}
          >
            Custom Item
          </Button>
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
      styles: {
        title: {
          width: '100%',
        },
      },
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
            {cloneDeep(invItems)
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

      {creatingCustomItem && (
        <CreateItemModal
          opened={creatingCustomItem}
          onComplete={async (item) => {
            handleAddItem(props.setInventory, item, false);
            setCreatingCustomItem(false);
          }}
          onCancel={() => {
            setCreatingCustomItem(false);
          }}
        />
      )}
    </Box>
  );
}
