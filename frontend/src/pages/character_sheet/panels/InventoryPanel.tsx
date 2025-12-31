import CopperCoin from '@assets/images/currency/copper.png';
import GoldCoin from '@assets/images/currency/gold.png';
import PlatinumCoin from '@assets/images/currency/platinum.png';
import SilverCoin from '@assets/images/currency/silver.png';
import { drawerState } from '@atoms/navAtoms';
import { EllipsisText } from '@common/EllipsisText';
import { ItemIcon } from '@common/ItemIcon';
import { isItemVisible } from '@content/content-hidden';
import { getContentFast } from '@content/content-store';
import { isPlayingStarfinder } from '@content/system-handler';
import classes from '@css/FaqSimple.module.css';
import { priceToString } from '@items/currency-handler';
import {
  getBulkLimit,
  getInvBulk,
  getItemBulk,
  getItemQuantity,
  isItemContainer,
  isItemEquippable,
  isItemImplantable,
  isItemInvestable,
  isItemWeapon,
  isItemWithQuantity,
  labelizeBulk,
  reachedImplantLimit,
  reachedInvestedLimit,
} from '@items/inv-utils';
import { handleAddItem, handleDeleteItem, handleMoveItem, handleUpdateItem } from '@items/inv-handlers';
import { getWeaponStats, parseOtherDamage } from '@items/weapon-handler';
import {
  Accordion,
  ActionIcon,
  Anchor,
  Avatar,
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
import { CreateItemModal } from '@modals/CreateItemModal';
import { StatButton } from '@pages/character_builder/CharBuilderCreation';
import { IconCoins, IconMenu2, IconPlus, IconSearch, IconX } from '@tabler/icons-react';
import { Character, ContentPackage, Inventory, InventoryItem, Item, LivingEntity, Trait } from '@typing/content';
import { StoreID } from '@typing/variables';
import { isPhoneSized } from '@utils/mobile-responsive';
import { sign } from '@utils/numbers';
import { cloneDeep, truncate } from 'lodash-es';
import { useState } from 'react';
import { SetterOrUpdater, useRecoilState } from 'recoil';

export default function InventoryPanel(props: {
  id: StoreID;
  entity: LivingEntity | null;
  setEntity: SetterOrUpdater<LivingEntity | null>;
  content: ContentPackage;
  panelHeight: number;
  panelWidth: number;
  zIndex?: number;
}) {
  const theme = useMantineTheme();
  const isPhone = isPhoneSized(props.panelWidth);
  const [searchQuery, setSearchQuery] = useState('');
  const [_drawer, openDrawer] = useRecoilState(drawerState);

  const [creatingCustomItem, setCreatingCustomItem] = useState(false);

  const visibleInvItems =
    props.entity?.inventory?.items.filter(
      (invItem) => !(!isItemVisible(props.id, invItem.item) && invItem.is_equipped && isItemWeapon(invItem.item))
    ) ?? [];
  const invItems = searchQuery.trim()
    ? visibleInvItems.filter((invItem) => {
        // Custom search, alt could be to use JsSearch here
        const query = searchQuery.trim().toLowerCase();

        const checkInvItem = (invItem: InventoryItem) => {
          const searchStr = JSON.stringify({
            _: invItem.item.name,
            ___: getContentFast<Trait>('trait', invItem.item.traits ?? []).map((t) => t.name),
            ____: invItem.item.description,
            _____: invItem.item.group,
            ______: invItem.item.rarity,
          }).toLowerCase();

          return searchStr.includes(query);
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
            openContextModal({
              modal: 'buyItem',
              title: <Title order={3}>Buy {item.name}</Title>,
              innerProps: {
                inventory: props.entity?.inventory,
                item: item,
                onConfirm: async (coins: { cp: number; sp: number; gp: number; pp: number }) => {
                  if (!props.entity) return;
                  await handleAddItem(props.setEntity, item, false);

                  // Update coins
                  props.setEntity((prev) => {
                    if (!prev) return prev;
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
                        coins: coins,
                      },
                    };
                  });
                },
              },
              zIndex: 1000,
            });
          } else {
            await handleAddItem(props.setEntity, item, type === 'FORMULA');
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
          props.setEntity((prev) => {
            if (!prev) return prev;
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
                coins: coins,
              },
            };
          });
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
            placeholder='Search items'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            rightSection={
              searchQuery.trim() ? (
                <ActionIcon
                  variant='subtle'
                  size='md'
                  color='gray'
                  radius='xl'
                  aria-label='Clear search'
                  onClick={() => {
                    setSearchQuery('');
                  }}
                >
                  <IconX size='1.2rem' stroke={2} />
                </ActionIcon>
              ) : undefined
            }
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
                <ActionIcon
                  variant='light'
                  color='gray.5'
                  size='lg'
                  aria-label='Inventory Options'
                  style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                  }}
                >
                  <IconMenu2 style={{ width: '70%', height: '70%' }} stroke={1.5} />
                </ActionIcon>
              </Menu.Target>

              <Menu.Dropdown>
                <Menu.Label>
                  Bulk: {labelizeBulk(getInvBulk(props.entity?.inventory), true)} / {getBulkLimit(props.id)}{' '}
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
                Bulk: {labelizeBulk(getInvBulk(props.entity?.inventory), true)} / {getBulkLimit(props.id)}
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
              .sort((a, b) => a.item.name.localeCompare(b.item.name))
              .map((invItem, index) => (
                <Box key={index}>
                  {isItemContainer(invItem.item) ? (
                    <Accordion.Item className={classes.item} value={`${index}`} w='100%'>
                      <Accordion.Control>
                        <Box pr={5}>
                          <InvItemOption
                            id={props.id}
                            entity={props.entity}
                            isPhone={isPhone}
                            hideSections
                            invItem={invItem}
                            onEquip={(invItem) => {
                              const newInvItem = cloneDeep(invItem);
                              newInvItem.is_equipped = !newInvItem.is_equipped;
                              handleUpdateItem(props.setEntity, newInvItem);
                            }}
                            onInvest={(invItem) => {
                              const newInvItem = cloneDeep(invItem);

                              if (isItemInvestable(newInvItem.item)) {
                                newInvItem.is_invested = !newInvItem.is_invested;
                              }
                              if (isItemImplantable(newInvItem.item)) {
                                newInvItem.is_implanted = !newInvItem.is_implanted;
                              }

                              handleUpdateItem(props.setEntity, newInvItem);
                            }}
                            onViewItem={() => {
                              openDrawer({
                                type: 'inv-item',
                                data: {
                                  storeId: props.id,
                                  zIndex: 100,
                                  invItem: cloneDeep(invItem),
                                  onItemUpdate: (newInvItem: InventoryItem) => {
                                    handleUpdateItem(props.setEntity, newInvItem);
                                  },
                                  onItemDelete: (newInvItem: InventoryItem) => {
                                    handleDeleteItem(props.setEntity, newInvItem);
                                    openDrawer(null);
                                  },
                                  onItemMove: (invItem: InventoryItem, containerItem: InventoryItem | null) => {
                                    handleMoveItem(props.setEntity, invItem, containerItem);
                                  },
                                },
                                extra: { addToHistory: true },
                              });
                            }}
                          />
                        </Box>
                      </Accordion.Control>
                      <Accordion.Panel>
                        <Stack gap={5}>
                          {invItem?.container_contents.map((containedItem, index) => (
                            <StatButton
                              key={index}
                              onClick={() => {
                                openDrawer({
                                  type: 'inv-item',
                                  data: {
                                    storeId: props.id,
                                    zIndex: 100,
                                    invItem: cloneDeep(containedItem),
                                    onItemUpdate: (newInvItem: InventoryItem) => {
                                      handleUpdateItem(props.setEntity, newInvItem);
                                    },
                                    onItemDelete: (newInvItem: InventoryItem) => {
                                      handleDeleteItem(props.setEntity, newInvItem);
                                      openDrawer(null);
                                    },
                                    onItemMove: (invItem: InventoryItem, containerItem: InventoryItem | null) => {
                                      handleMoveItem(props.setEntity, invItem, containerItem);
                                    },
                                  },
                                  extra: { addToHistory: true },
                                });
                              }}
                            >
                              <InvItemOption
                                id={props.id}
                                entity={props.entity}
                                isPhone={isPhone}
                                invItem={containedItem}
                                preventEquip
                                onEquip={(invItem) => {
                                  const newInvItem = cloneDeep(invItem);
                                  newInvItem.is_equipped = !newInvItem.is_equipped;
                                  handleUpdateItem(props.setEntity, newInvItem);
                                }}
                                onInvest={(invItem) => {
                                  const newInvItem = cloneDeep(invItem);

                                  if (isItemInvestable(newInvItem.item)) {
                                    newInvItem.is_invested = !newInvItem.is_invested;
                                  }
                                  if (isItemImplantable(newInvItem.item)) {
                                    newInvItem.is_implanted = !newInvItem.is_implanted;
                                  }

                                  handleUpdateItem(props.setEntity, newInvItem);
                                }}
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
                  ) : (
                    <Box mb={5}>
                      <StatButton
                        key={index}
                        onClick={() => {
                          openDrawer({
                            type: 'inv-item',
                            data: {
                              storeId: props.id,
                              zIndex: 100,
                              invItem: cloneDeep(invItem),
                              onItemUpdate: (newInvItem: InventoryItem) => {
                                handleUpdateItem(props.setEntity, newInvItem);
                              },
                              onItemDelete: (newInvItem: InventoryItem) => {
                                handleDeleteItem(props.setEntity, newInvItem);
                                openDrawer(null);
                              },
                              onItemMove: (invItem: InventoryItem, containerItem: InventoryItem | null) => {
                                handleMoveItem(props.setEntity, invItem, containerItem);
                              },
                            },
                            extra: { addToHistory: true },
                          });
                        }}
                      >
                        <InvItemOption
                          id={props.id}
                          entity={props.entity}
                          isPhone={isPhone}
                          invItem={invItem}
                          onEquip={(invItem) => {
                            const newInvItem = cloneDeep(invItem);
                            newInvItem.is_equipped = !newInvItem.is_equipped;
                            handleUpdateItem(props.setEntity, newInvItem);
                          }}
                          onInvest={(invItem) => {
                            const newInvItem = cloneDeep(invItem);

                            if (isItemInvestable(newInvItem.item)) {
                              newInvItem.is_invested = !newInvItem.is_invested;
                            }
                            if (isItemImplantable(newInvItem.item)) {
                              newInvItem.is_implanted = !newInvItem.is_implanted;
                            }

                            handleUpdateItem(props.setEntity, newInvItem);
                          }}
                        />
                      </StatButton>
                    </Box>
                  )}
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

      {creatingCustomItem && (
        <CreateItemModal
          opened={creatingCustomItem}
          onComplete={async (item) => {
            handleAddItem(props.setEntity, item, false);
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

function CurrencySection(props: { entity: LivingEntity | null; onClick?: () => void }) {
  const pp = props.entity?.inventory?.coins.pp ?? 0;
  const gp = props.entity?.inventory?.coins.gp ?? 0;
  const sp = props.entity?.inventory?.coins.sp ?? 0;
  const cp = props.entity?.inventory?.coins.cp ?? 0;

  const displayAll = isPlayingStarfinder() ? false : true;

  return (
    <Group
      gap={15}
      wrap='nowrap'
      justify='center'
      miw={100}
      style={{
        cursor: 'pointer',
      }}
      onClick={props.onClick}
    >
      <CoinSection pp={pp} gp={gp} sp={sp} cp={cp} displayAll={displayAll} justify='center' />
    </Group>
  );
}

export function CoinSection(props: {
  cp?: number;
  sp?: number;
  gp?: number;
  pp?: number;
  displayAll?: boolean;
  justify?: 'flex-start' | 'center' | 'flex-end';
}) {
  const pp = props.pp ?? 0;
  const gp = props.gp ?? 0;
  const sp = props.sp ?? 0;
  const cp = props.cp ?? 0;
  return (
    <Group gap={15} wrap='nowrap' justify={props.justify}>
      {(pp || props.displayAll) && (
        <Group wrap='nowrap' gap={5}>
          <Text c='gray.4' fz='md' fw={600}>
            {pp.toLocaleString()}
          </Text>
          <Avatar src={PlatinumCoin} alt='Platinum Coins' radius='xs' size='xs' />
        </Group>
      )}
      {(gp || props.displayAll) && (
        <Group wrap='nowrap' gap={5}>
          <Text c='gray.4' fz='md' fw={600}>
            {gp.toLocaleString()}
          </Text>
          <Avatar src={GoldCoin} alt='Gold Coins' radius='xs' size='xs' />
        </Group>
      )}
      {(sp || (!pp && !gp && !cp)) && ( // Always show silver coins, even if 0
        <Group wrap='nowrap' gap={5}>
          <Text c='gray.4' fz='md' fw={600}>
            {sp.toLocaleString()}
          </Text>
          <Avatar src={SilverCoin} alt='Silver Coins' radius='xs' size='xs' />
        </Group>
      )}
      {(cp || props.displayAll) && (
        <Group wrap='nowrap' gap={5}>
          <Text c='gray.4' fz='md' fw={600}>
            {cp.toLocaleString()}
          </Text>
          <Avatar src={CopperCoin} alt='Copper Coins' radius='xs' size='xs' />
        </Group>
      )}
    </Group>
  );
}

function InvItemOption(props: {
  invItem: InventoryItem;
  id: StoreID;
  entity: LivingEntity | null;
  onEquip?: (invItem: InventoryItem) => void;
  onInvest?: (invItem: InventoryItem) => void;
  onViewItem?: (invItem: InventoryItem) => void;
  hideSections?: boolean;
  preventEquip?: boolean;
  isPhone?: boolean;
}) {
  const theme = useMantineTheme();

  const weaponStats = isItemWeapon(props.invItem.item) ? getWeaponStats(props.id, props.invItem.item) : null;

  return (
    <Grid
      w={'100%'}
      overflow='hidden'
      styles={{
        inner: {
          maxWidth: '70dvw',
          flexWrap: 'nowrap',
        },
      }}
    >
      <Grid.Col span='auto'>
        <Group wrap='nowrap' gap={props.isPhone ? 5 : 10}>
          <ItemIcon item={props.invItem.item} size='1.0rem' color={theme.colors.gray[6]} />
          <Text c='gray.0' fz='sm' truncate>
            {props.invItem.item.name}
          </Text>
          {isItemContainer(props.invItem.item) && props.hideSections && (
            <Button
              variant='light'
              size='compact-xs'
              radius='xl'
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                props.onViewItem?.(props.invItem);
              }}
            >
              View Item
            </Button>
          )}

          {isItemWeapon(props.invItem.item) && weaponStats && (
            <Group wrap='nowrap' gap={10} maw={300}>
              <Text c='gray.6' fz='xs' fs='italic' span>
                {sign(weaponStats.attack_bonus.total[0])}
              </Text>
              <EllipsisText c='gray.6' fz='xs' fs='italic' span>
                {truncate(
                  `${weaponStats.damage.dice}${weaponStats.damage.die}${weaponStats.damage.bonus.total > 0 ? ` + ${weaponStats.damage.bonus.total}` : ``} ${weaponStats.damage.damageType}${parseOtherDamage(weaponStats.damage.other)}${weaponStats.damage.extra ? ` + ${weaponStats.damage.extra}` : ''}`,
                  { length: props.isPhone ? 15 : 45 }
                )}
              </EllipsisText>
            </Group>
          )}
        </Group>
      </Grid.Col>
      {!props.isPhone && (
        <Grid.Col span={3}>
          <Grid overflow='hidden'>
            <Grid.Col span={2}>
              {!props.hideSections && (
                <>
                  {' '}
                  {isItemWithQuantity(props.invItem.item) && (
                    <Text ta='center' fz='xs'>
                      {getItemQuantity(props.invItem.item)}
                    </Text>
                  )}
                </>
              )}
            </Grid.Col>
            <Grid.Col span={3}>
              {!props.hideSections && (
                <>
                  {' '}
                  <Text ta='center' fz='xs'>
                    {labelizeBulk(getItemBulk(props.invItem))}
                  </Text>
                </>
              )}
            </Grid.Col>
            <Grid.Col span={7}>
              {!props.hideSections && (
                <>
                  {' '}
                  <Text ta='left' fz='xs'>
                    {priceToString(props.invItem.item.price)}
                  </Text>
                </>
              )}
            </Grid.Col>
          </Grid>
        </Grid.Col>
      )}
      <Grid.Col span={props.isPhone ? 3 : 2} offset={props.isPhone ? 0 : 1}>
        <Group justify='flex-end' wrap='nowrap' align='center' h={'100%'} gap={10}>
          {isItemInvestable(props.invItem.item) && (
            <Button
              size='compact-xs'
              variant={props.invItem.is_invested ? 'subtle' : 'outline'}
              color={props.invItem.is_invested ? 'gray.7' : undefined}
              disabled={!props.invItem.is_invested && reachedInvestedLimit(props.id, props.entity?.inventory)}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                props.onInvest?.(props.invItem);
              }}
              w={80}
            >
              {props.invItem.is_invested ? 'Divest' : 'Invest'}
            </Button>
          )}
          {isItemImplantable(props.invItem.item) && (
            <Button
              size='compact-xs'
              variant={props.invItem.is_implanted ? 'subtle' : 'outline'}
              color={props.invItem.is_implanted ? 'gray.7' : undefined}
              disabled={!props.invItem.is_implanted && reachedImplantLimit(props.id, props.entity?.inventory)}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                props.onInvest?.(props.invItem);
              }}
              w={80}
            >
              {props.invItem.is_implanted ? 'Extract' : 'Implant'}
            </Button>
          )}
          {isItemEquippable(props.invItem.item) && (
            <Button
              size='compact-xs'
              variant={props.invItem.is_equipped ? 'subtle' : 'outline'}
              color={props.invItem.is_equipped ? 'gray.7' : undefined}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                props.onEquip?.(props.invItem);
              }}
              w={80}
              disabled={props.preventEquip}
            >
              {props.invItem.is_equipped ? 'Unequip' : 'Equip'}
            </Button>
          )}
        </Group>
      </Grid.Col>
    </Grid>
  );
}
