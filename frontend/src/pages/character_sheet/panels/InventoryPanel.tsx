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
  getFlatInvItems,
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
import { canInvestEidolonWeapon, setEidolonWeaponInvestment } from '@items/eidolon-runes';
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
  UnstyledButton,
  useMantineTheme,
  useMantineColorScheme,
} from '@mantine/core';
import { modals, openContextModal } from '@mantine/modals';
import { CreateItemModal } from '@modals/CreateItemModal';
import { IconCoins, IconMenu2, IconPlus, IconSearch, IconX } from '@tabler/icons-react';
import { Character, ContentPackage, Inventory, InventoryItem, Item, LivingEntity, Trait } from '@schemas/content';
import { StoreID } from '@schemas/variables';
import { isPhoneSized } from '@utils/mobile-responsive';
import { sign } from '@utils/numbers';
import { cloneDeep, truncate } from 'lodash-es';
import { useState } from 'react';
import { useAtom } from 'jotai';
import { SetterOrUpdater } from '@utils/type-fixing';
import { IMPRINT_BG_COLOR, IMPRINT_BORDER_COLOR } from '@constants/data';
import ImprintButton from '@common/ImprintButton';

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
  const { colorScheme } = useMantineColorScheme();
  const isPhone = isPhoneSized(props.panelWidth);
  const [searchQuery, setSearchQuery] = useState('');
  const [_drawer, openDrawer] = useAtom(drawerState);

  const [creatingCustomItem, setCreatingCustomItem] = useState(false);

  /** Uses one investment update for both ordinary equipment and the eidolon weapon. */
  const onInvestItem = (invItem: InventoryItem): void => {
    if (!invItem.is_formula && !isItemInvestable(invItem.item) && canInvestEidolonWeapon(props.id, invItem.item)) {
      props.setEntity((entity) => {
        if (!entity?.inventory) return entity;
        return {
          ...entity,
          inventory: setEidolonWeaponInvestment(entity.inventory, invItem.id, !invItem.is_invested),
        };
      });
      return;
    }
    const newInvItem = cloneDeep(invItem);
    if (isItemInvestable(newInvItem.item) || newInvItem.is_invested) newInvItem.is_invested = !newInvItem.is_invested;
    if (isItemImplantable(newInvItem.item)) newInvItem.is_implanted = !newInvItem.is_implanted;
    handleUpdateItem(props.setEntity, newInvItem);
  };

  /** Chooses the shared rune source independently of an item's ordinary investment. */
  const onShareRunes = (invItem: InventoryItem): void => {
    props.setEntity((entity) => {
      if (!entity?.inventory || !canInvestEidolonWeapon(props.id, invItem.item)) return entity;
      return {
        ...entity,
        inventory: setEidolonWeaponInvestment(
          entity.inventory,
          invItem.id,
          entity.inventory.eidolon_weapon_id !== invItem.id
        ),
      };
    });
  };

  /** Opens the same editable item drawer for top-level and contained inventory entries. */
  const onViewItem = (invItem: InventoryItem): void => {
    openDrawer({
      type: 'inv-item',
      data: {
        storeId: props.id,
        zIndex: 100,
        invItem: cloneDeep(invItem),
        onItemUpdate: (item: InventoryItem) => handleUpdateItem(props.setEntity, item),
        onItemDelete: (item: InventoryItem) => {
          handleDeleteItem(props.setEntity, item);
          openDrawer(null);
        },
        onItemMove: (item: InventoryItem, container: InventoryItem | null) =>
          handleMoveItem(props.setEntity, item, container),
      },
      extra: { addToHistory: true },
    });
  };

  /** Keeps item actions beside the name button, including in container headers. */
  const renderItem = (invItem: InventoryItem, containerHeader = false, contained = false) => (
    <InvItemOption
      id={props.id}
      entity={props.entity}
      isPhone={isPhone}
      invItem={invItem}
      hideSections={containerHeader}
      preventEquip={contained}
      onViewItem={onViewItem}
      onInvest={onInvestItem}
      onShareRunes={onShareRunes}
      onEquip={(item) => handleUpdateItem(props.setEntity, { ...item, is_equipped: !item.is_equipped })}
    />
  );

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
            color='gray'
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

                  // Close to fix a bug with currency not updating properly
                  setTimeout(() => {
                    modals.closeAll();
                  }, 100);
                },
              },
              zIndex: 1000,
            });
          } else {
            await handleAddItem(props.setEntity, item, type === 'FORMULA');

            // Close to fix a bug with currency not updating properly
            setTimeout(() => {
              modals.closeAll();
            }, 100);
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
        {props.entity?.inventory?.items.some((entry) => canInvestEidolonWeapon(props.id, entry.item)) && (
          <Text size='xs' c='dimmed'>
            Invest one equipped weapon to share fundamental runes.
          </Text>
        )}
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
                backgroundColor: IMPRINT_BG_COLOR,
                borderColor: searchQuery.trim().length > 0 ? theme.colors['guide'][8] : 'transparent',
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
                    backgroundColor: IMPRINT_BG_COLOR,
                    borderColor: IMPRINT_BORDER_COLOR,
                  }}
                >
                  <IconMenu2 style={{ width: '70%', height: '70%' }} stroke={1.5} />
                </ActionIcon>
              </Menu.Target>

              <Menu.Dropdown>
                <Menu.Label>
                  Bulk: {labelizeBulk(getInvBulk(props.entity?.inventory ?? undefined), true)} /{' '}
                  {getBulkLimit(props.id)}{' '}
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
                Bulk: {labelizeBulk(getInvBulk(props.entity?.inventory ?? undefined), true)} / {getBulkLimit(props.id)}
              </Badge>
              <CurrencySection entity={props.entity} onClick={() => openManageCoinsDrawer()} />
              <ImprintButton
                radius='xl'
                size='sm'
                fw={500}
                rightSection={<IconPlus size='1.0rem' />}
                onClick={() => openAddItemDrawer()}
              >
                Add Item
              </ImprintButton>
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
              .map((invItem) => (
                <Box key={invItem.id} mb={5}>
                  {isItemContainer(invItem.item) ? (
                    <Accordion.Item className={classes.item} value={invItem.id} w='100%'>
                      <Box px='sm' py='xs'>
                        {renderItem(invItem, true)}
                      </Box>
                      <Accordion.Panel>
                        <Stack gap={5}>
                          {invItem.container_contents.map((containedItem) => (
                            <Box
                              key={containedItem.id}
                              bg={IMPRINT_BG_COLOR}
                              px='sm'
                              py='xs'
                              style={{ border: `1px solid ${IMPRINT_BORDER_COLOR}`, borderRadius: theme.radius.md }}
                            >
                              {renderItem(containedItem, false, true)}
                            </Box>
                          ))}
                          {invItem.container_contents.length === 0 && (
                            <Text fz='sm' ta='center' fs='italic'>
                              Container is empty
                            </Text>
                          )}
                        </Stack>
                      </Accordion.Panel>
                    </Accordion.Item>
                  ) : (
                    <Box
                      bg={IMPRINT_BG_COLOR}
                      px='sm'
                      py='xs'
                      style={{ border: `1px solid ${IMPRINT_BORDER_COLOR}`, borderRadius: theme.radius.md }}
                    >
                      {renderItem(invItem)}
                    </Box>
                  )}
                </Box>
              ))}
            {invItems.length === 0 && (
              <Text c='gray.2' fz='sm' ta='center' fs='italic' py={20}>
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
  onShareRunes?: (invItem: InventoryItem) => void;
  onViewItem?: (invItem: InventoryItem) => void;
  hideSections?: boolean;
  preventEquip?: boolean;
  isPhone?: boolean;
}) {
  const theme = useMantineTheme();

  const weaponStats = isItemWeapon(props.invItem.item) ? getWeaponStats(props.id, props.invItem.item) : null;
  const sharesEidolonRunes = canInvestEidolonWeapon(props.id, props.invItem.item);
  const isSharedWeapon = props.entity?.inventory?.eidolon_weapon_id === props.invItem.id;
  const replacesInvestedWeapon =
    sharesEidolonRunes &&
    !!props.entity?.inventory &&
    getFlatInvItems(props.entity.inventory).some(
      (entry) =>
        entry.id === props.entity?.inventory?.eidolon_weapon_id && entry.is_invested && !isItemInvestable(entry.item)
    );

  const itemLabel = (
    <Group wrap='nowrap' gap={props.isPhone ? 5 : 10}>
      <ItemIcon item={props.invItem.item} size='1.0rem' color={theme.colors.gray[6]} />
      <Text c='gray.0' fz='sm' truncate>
        {props.invItem.item.name}
      </Text>
      {isItemWeapon(props.invItem.item) && weaponStats && (
        <Group wrap='nowrap' gap={10} maw={300}>
          <Text c='gray.5' fz='xs' fs='italic' span>
            {sign(weaponStats.attack_bonus.total[0])}
          </Text>
          <EllipsisText c='gray.5' fz='xs' fs='italic' span>
            {truncate(
              `${weaponStats.damage.dice}${weaponStats.damage.die}${weaponStats.damage.bonus.total > 0 ? ` + ${weaponStats.damage.bonus.total}` : ``} ${weaponStats.damage.damageType}${parseOtherDamage(weaponStats.damage.other)}${weaponStats.damage.extra ? ` + ${weaponStats.damage.extra}` : ''}`,
              { length: props.isPhone ? 15 : 45 }
            )}
          </EllipsisText>
        </Group>
      )}
    </Group>
  );

  return (
    <Grid
      w={'100%'}
      overflow='hidden'
      styles={{
        inner: {
          flexWrap: 'nowrap',
        },
      }}
    >
      <Grid.Col span='auto' miw={0}>
        {props.hideSections ? (
          <Accordion.Control w='100%' px={0} aria-label={props.invItem.item.name}>
            {itemLabel}
          </Accordion.Control>
        ) : (
          <UnstyledButton
            w='100%'
            onClick={() => props.onViewItem?.(props.invItem)}
            aria-label={`View ${props.invItem.item.name}`}
          >
            {itemLabel}
          </UnstyledButton>
        )}
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
                    {priceToString(
                      props.invItem.item.price
                        ? {
                            cp: Number(props.invItem.item.price.cp) || undefined,
                            sp: Number(props.invItem.item.price.sp) || undefined,
                            gp: Number(props.invItem.item.price.gp) || undefined,
                            pp: Number(props.invItem.item.price.pp) || undefined,
                          }
                        : undefined
                    )}
                  </Text>
                </>
              )}
            </Grid.Col>
          </Grid>
        </Grid.Col>
      )}
      <Grid.Col span='content'>
        <Group justify='flex-end' wrap='wrap' align='center' h='100%' gap='xs' w={props.isPhone ? '6rem' : undefined}>
          {props.hideSections && (
            <Button size='compact-xs' variant='light' w='6rem' onClick={() => props.onViewItem?.(props.invItem)}>
              View Item
            </Button>
          )}
          {(props.invItem.is_invested ||
            (!props.invItem.is_formula && (isItemInvestable(props.invItem.item) || sharesEidolonRunes))) && (
            <Button
              size='compact-xs'
              variant={props.invItem.is_invested ? 'subtle' : 'outline'}
              title={
                sharesEidolonRunes && !isItemInvestable(props.invItem.item)
                  ? 'Share fundamental runes with your eidolon while equipped.'
                  : undefined
              }
              color={props.invItem.is_invested ? 'gray.4' : undefined}
              disabled={
                !props.invItem.is_invested &&
                (!replacesInvestedWeapon || isItemInvestable(props.invItem.item)) &&
                reachedInvestedLimit(props.id, props.entity?.inventory ?? undefined)
              }
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                props.onInvest?.(props.invItem);
              }}
              w='6rem'
            >
              {props.invItem.is_invested ? 'Divest' : 'Invest'}
            </Button>
          )}
          {sharesEidolonRunes &&
            isItemInvestable(props.invItem.item) &&
            props.invItem.is_invested &&
            !props.invItem.is_formula && (
              <Button
                size='compact-xs'
                variant={isSharedWeapon ? 'light' : 'outline'}
                title='Choose this invested weapon as your eidolon rune source while equipped.'
                onClick={() => props.onShareRunes?.(props.invItem)}
                w='6rem'
              >
                {isSharedWeapon ? 'Stop sharing' : 'Share runes'}
              </Button>
            )}
          {isItemImplantable(props.invItem.item) && (
            <Button
              size='compact-xs'
              variant={props.invItem.is_implanted ? 'subtle' : 'outline'}
              color={props.invItem.is_implanted ? 'gray.4' : undefined}
              disabled={
                !props.invItem.is_implanted && reachedImplantLimit(props.id, props.entity?.inventory ?? undefined)
              }
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                props.onInvest?.(props.invItem);
              }}
              w='6rem'
            >
              {props.invItem.is_implanted ? 'Extract' : 'Implant'}
            </Button>
          )}
          {isItemEquippable(props.invItem.item) && (
            <Button
              size='compact-xs'
              variant={props.invItem.is_equipped ? 'subtle' : 'outline'}
              color={props.invItem.is_equipped ? 'gray.4' : undefined}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                props.onEquip?.(props.invItem);
              }}
              w='6rem'
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
