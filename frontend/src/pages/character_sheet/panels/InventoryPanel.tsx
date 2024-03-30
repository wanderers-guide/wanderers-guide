import { characterState } from '@atoms/characterAtoms';
import { drawerState } from '@atoms/navAtoms';
import { ItemIcon } from '@common/ItemIcon';
import { priceToString } from '@items/currency-handler';
import {
  isItemWeapon,
  handleAddItem,
  labelizeBulk,
  getInvBulk,
  getBulkLimit,
  isItemContainer,
  handleUpdateItem,
  handleDeleteItem,
  handleMoveItem,
  isItemWithQuantity,
  getItemQuantity,
  isItemInvestable,
  reachedInvestedLimit,
  isItemEquippable,
} from '@items/inv-utils';
import { getWeaponStats } from '@items/weapon-handler';
import {
  useMantineTheme,
  Stack,
  Group,
  TextInput,
  Badge,
  Button,
  ScrollArea,
  Grid,
  Accordion,
  Anchor,
  Avatar,
  Box,
  Text,
} from '@mantine/core';
import { BuyItemModal } from '@modals/BuyItemModal';
import { StatButton } from '@pages/character_builder/CharBuilderCreation';
import { IconSearch, IconPlus } from '@tabler/icons-react';
import { ContentPackage, Inventory, Item, InventoryItem, Character } from '@typing/content';
import _ from 'lodash';
import { useState } from 'react';
import { useRecoilState, useRecoilValue } from 'recoil';
import classes from '@css/FaqSimple.module.css';
import CopperCoin from '@assets/images/currency/copper.png';
import GoldCoin from '@assets/images/currency/gold.png';
import PlatinumCoin from '@assets/images/currency/platinum.png';
import SilverCoin from '@assets/images/currency/silver.png';
import { sign } from '@utils/numbers';

export default function InventoryPanel(props: {
  content: ContentPackage;
  panelHeight: number;
  inventory: Inventory;
  setInventory: React.Dispatch<React.SetStateAction<Inventory>>;
}) {
  const theme = useMantineTheme();
  const [character, setCharacter] = useRecoilState(characterState);
  const [searchQuery, setSearchQuery] = useState('');
  const [_drawer, openDrawer] = useRecoilState(drawerState);

  const [confirmBuyItem, setConfirmBuyItem] = useState<{ item: Item }>();

  const visibleInvItems = props.inventory.items.filter(
    (invItem) => !(invItem.item.meta_data?.unselectable === true && invItem.is_equipped && isItemWeapon(invItem.item))
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
    openDrawer({
      type: 'add-item',
      data: {
        onClick: (item: Item, type: 'GIVE' | 'BUY' | 'FORMULA') => {
          if (!character) return;
          if (type === 'BUY') {
            setConfirmBuyItem({ item });
          } else {
            handleAddItem(props.setInventory, item, type === 'FORMULA');
          }
        },
      },
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
            Bulk: {labelizeBulk(getInvBulk(props.inventory), true)} / {getBulkLimit('CHARACTER')}
          </Badge>
          <CurrencySection
            character={character}
            onClick={() => {
              openDrawer({
                type: 'manage-coins',
                data: {
                  coins: character?.inventory?.coins,
                  onUpdate: (coins: { cp: number; sp: number; gp: number; pp: number }) => {
                    props.setInventory((prev) => ({
                      ...prev,
                      coins: coins,
                    }));
                  },
                },
              });
            }}
          />
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
        <ScrollArea h={props.panelHeight - 50} scrollbars='y'>
          {invItems.length !== 0 && (
            <Grid w={'100%'}>
              <Grid.Col span='auto'>
                <Text ta='left' fz='xs' pl={5}>
                  Name
                </Text>
              </Grid.Col>
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
              .sort((a, b) => a.item.name.localeCompare(b.item.name))
              .map((invItem, index) => (
                <Box key={index}>
                  {isItemContainer(invItem.item) ? (
                    <Accordion.Item className={classes.item} value={`${index}`} w='100%'>
                      <Accordion.Control>
                        <Box pr={5}>
                          <InvItemOption
                            hideSections
                            invItem={invItem}
                            onEquip={(invItem) => {
                              const newInvItem = _.cloneDeep(invItem);
                              newInvItem.is_equipped = !newInvItem.is_equipped;
                              handleUpdateItem(props.setInventory, newInvItem);
                            }}
                            onInvest={(invItem) => {
                              const newInvItem = _.cloneDeep(invItem);
                              newInvItem.is_invested = !newInvItem.is_invested;
                              handleUpdateItem(props.setInventory, newInvItem);
                            }}
                            onViewItem={() => {
                              openDrawer({
                                type: 'inv-item',
                                data: {
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
                                    zIndex: 100,
                                    invItem: _.cloneDeep(containedItem),
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
                                });
                              }}
                            >
                              <InvItemOption
                                invItem={containedItem}
                                preventEquip
                                onEquip={(invItem) => {
                                  const newInvItem = _.cloneDeep(invItem);
                                  newInvItem.is_equipped = !newInvItem.is_equipped;
                                  handleUpdateItem(props.setInventory, newInvItem);
                                }}
                                onInvest={(invItem) => {
                                  const newInvItem = _.cloneDeep(invItem);
                                  newInvItem.is_invested = !newInvItem.is_invested;
                                  handleUpdateItem(props.setInventory, newInvItem);
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
                          });
                        }}
                      >
                        <InvItemOption
                          invItem={invItem}
                          onEquip={(invItem) => {
                            const newInvItem = _.cloneDeep(invItem);
                            newInvItem.is_equipped = !newInvItem.is_equipped;
                            handleUpdateItem(props.setInventory, newInvItem);
                          }}
                          onInvest={(invItem) => {
                            const newInvItem = _.cloneDeep(invItem);
                            newInvItem.is_invested = !newInvItem.is_invested;
                            handleUpdateItem(props.setInventory, newInvItem);
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
      {confirmBuyItem && (
        <BuyItemModal
          open={!!confirmBuyItem}
          inventory={props.inventory}
          item={confirmBuyItem.item}
          onConfirm={(coins) => {
            if (!character) return;
            handleAddItem(props.setInventory, confirmBuyItem.item, false);

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

function CurrencySection(props: { character: Character | null; onClick?: () => void }) {
  const pp = props.character?.inventory?.coins.pp ?? 0;
  const gp = props.character?.inventory?.coins.gp ?? 0;
  const sp = props.character?.inventory?.coins.sp ?? 0;
  const cp = props.character?.inventory?.coins.cp ?? 0;

  const displayAll = true; //!pp && !gp && !sp && !cp;

  return (
    <Group
      gap={15}
      wrap='nowrap'
      justify='center'
      miw={200}
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
      {(sp || props.displayAll) && (
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
  onEquip?: (invItem: InventoryItem) => void;
  onInvest?: (invItem: InventoryItem) => void;
  onViewItem?: (invItem: InventoryItem) => void;
  hideSections?: boolean;
  preventEquip?: boolean;
}) {
  const theme = useMantineTheme();
  const character = useRecoilValue(characterState);

  const weaponStats = isItemWeapon(props.invItem.item) ? getWeaponStats('CHARACTER', props.invItem.item) : null;

  return (
    <Grid w={'100%'}>
      <Grid.Col span='auto'>
        <Group wrap='nowrap' gap={10}>
          <ItemIcon item={props.invItem.item} size='1.0rem' color={theme.colors.gray[6]} />
          <Text c='gray.0' fz='sm'>
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
            <Group wrap='nowrap' gap={10}>
              <Text c='gray.6' fz='xs' fs='italic' span>
                {sign(weaponStats.attack_bonus.total[0])}
              </Text>
              <Text c='gray.6' fz='xs' fs='italic' span>
                {weaponStats.damage.dice}
                {weaponStats.damage.die}
                {weaponStats.damage.bonus.total > 0 ? ` + ${weaponStats.damage.bonus.total}` : ``}{' '}
                {weaponStats.damage.damageType}
                {/* {weaponStats.damage.extra ? `+ ${weaponStats.damage.extra}` : ''} */}
              </Text>
            </Group>
          )}
        </Group>
      </Grid.Col>
      <Grid.Col span={3}>
        <Grid>
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
                  {labelizeBulk(props.invItem.item.bulk)}
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
      <Grid.Col span={2} offset={1}>
        <Group justify='flex-end' wrap='nowrap' align='center' h={'100%'} gap={10}>
          {isItemInvestable(props.invItem.item) && (
            <Button
              size='compact-xs'
              variant={props.invItem.is_invested ? 'subtle' : 'outline'}
              color={props.invItem.is_invested ? 'gray.7' : undefined}
              disabled={!props.invItem.is_invested && reachedInvestedLimit('CHARACTER', character?.inventory)}
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
