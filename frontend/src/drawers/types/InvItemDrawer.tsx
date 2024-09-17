import { characterState } from '@atoms/characterAtoms';
import IndentedText from '@common/IndentedText';
import RichText from '@common/RichText';
import TraitsDisplay from '@common/TraitsDisplay';
import { priceToString } from '@items/currency-handler';
import {
  compileTraits,
  isItemArchaic,
  isItemArmor,
  isItemBroken,
  isItemContainer,
  isItemFormula,
  isItemRangedWeapon,
  isItemShield,
  isItemWeapon,
  isItemWithPropertyRunes,
  isItemWithQuantity,
  isItemWithRunes,
  labelizeBulk,
} from '@items/inv-utils';
import { getWeaponStats, parseOtherDamage } from '@items/weapon-handler';
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Divider,
  Group,
  HoverCard,
  Image,
  Menu,
  NumberInput,
  Paper,
  ScrollArea,
  Stack,
  Text,
  TextInput,
  Title,
  rem,
} from '@mantine/core';
import { getHotkeyHandler } from '@mantine/hooks';
import { CreateItemModal } from '@modals/CreateItemModal';
import {
  IconChevronDown,
  IconEdit,
  IconHelpCircle,
  IconSquareRounded,
  IconSquareRoundedFilled,
  IconTrashXFilled,
} from '@tabler/icons-react';
import { InventoryItem } from '@typing/content';
import { sign } from '@utils/numbers';
import { toLabel } from '@utils/strings';
import useRefresh from '@utils/use-refresh';
import _ from 'lodash-es';
import { evaluate } from 'mathjs/number';
import { useEffect, useRef, useState } from 'react';
import { SetterOrUpdater, useRecoilState, useRecoilValue } from 'recoil';
import { getArmorSpecialization } from '@specializations/armor-specializations';
import { getWeaponSpecialization } from '@specializations/weapon-specializations';
import { drawerState } from '@atoms/navAtoms';
import TokenSelect from '@common/TokenSelect';
import { ItemRunesDescription } from '@common/ItemRunesDescription';
import { EllipsisText } from '@common/EllipsisText';

export function InvItemDrawerTitle(props: { data: { invItem: InventoryItem } }) {
  let type = `Item ${props.data.invItem.item.level}`;
  if (props.data.invItem.item?.meta_data?.unselectable && props.data.invItem.item.level === 0) {
    type = '';
  }

  return (
    <>
      <Group justify='space-between' wrap='nowrap'>
        <Group wrap='nowrap' gap={10}>
          <Box>
            <Title order={3}>{props.data.invItem.item.name}</Title>
          </Box>
        </Group>
        <Text style={{ textWrap: 'nowrap' }}>{type}</Text>
      </Group>
    </>
  );
}

export function InvItemDrawerContent(props: {
  data: {
    invItem: InventoryItem;
    onItemUpdate: (invItem: InventoryItem) => void;
    onItemDelete: (invItem: InventoryItem) => void;
    onItemMove: (invItem: InventoryItem, containerItem: InventoryItem | null) => void;
  };
}) {
  const onItemUpdate = (invItem: InventoryItem) => {
    props.data.onItemUpdate(invItem);
    setInvItem(invItem);
  };

  const [_drawer, openDrawer] = useRecoilState(drawerState);
  const [invItem, setInvItem] = useState(props.data.invItem);
  const [editingItem, setEditingItem] = useState(false);

  const character = useRecoilValue(characterState);
  const containerItems = (character?.inventory?.items.filter((item) => isItemContainer(item.item)) ?? []).filter(
    (i) => i.id !== invItem.id
  );

  let price = null;
  if (invItem.item.price && priceToString(invItem.item.price) !== '—') {
    price = (
      <>
        <Text key={1} fw={600} c='gray.5' span>
          Price
        </Text>{' '}
        {priceToString(invItem.item.price)}
      </>
    );
  }

  const UBH = [];
  if (invItem.item.usage) {
    UBH.push(
      <>
        <Text key={0} fw={600} c='gray.5' span>
          Usage
        </Text>{' '}
        {invItem.item.usage.replace(/-/g, ' ')}
      </>
    );
  }
  if (invItem.item.bulk !== undefined && invItem.item.bulk !== null && `${invItem.item.bulk}`.trim() !== '') {
    UBH.push(
      <>
        <Text key={1} fw={600} c='gray.5' span>
          Bulk
        </Text>{' '}
        {labelizeBulk(invItem.is_formula ? '0' : invItem.item.bulk)}
      </>
    );
  }
  if (invItem.item.hands) {
    UBH.push(
      <>
        <Text key={1} fw={600} c='gray.5' span>
          Hands
        </Text>{' '}
        {invItem.item.hands}
      </>
    );
  }

  let craftReq = null;
  if (invItem.item.craft_requirements) {
    craftReq = (
      <>
        <Text key={1} fw={600} c='gray.5' span>
          Craft Requirements
        </Text>{' '}
        {invItem.item.craft_requirements}
      </>
    );
  }

  return (
    <Box>
      {invItem.item.meta_data?.image_url && (
        <Image
          style={{
            float: 'right',
            maxWidth: 150,
            height: 'auto',
          }}
          ml='sm'
          radius='md'
          fit='contain'
          src={invItem.item.meta_data?.image_url}
        />
      )}
      <Box>
        {/* Note: Can't use a Stack here as it breaks the floating image */}
        <Box pb={2}>
          <TraitsDisplay
            traitIds={compileTraits(invItem.item)}
            rarity={invItem.item.rarity}
            broken={isItemBroken(invItem.item)}
            shoddy={invItem.item.meta_data?.is_shoddy}
            archaic={isItemArchaic(invItem.item)}
            formula={isItemFormula(invItem)}
            interactable
          />
        </Box>

        <InvItemSections invItem={invItem} onItemUpdate={(invItem) => onItemUpdate(invItem)} openDrawer={openDrawer} />

        {price && <IndentedText ta='justify'>{price}</IndentedText>}
        {UBH.length > 0 && (
          <IndentedText ta='justify'>
            {UBH.flatMap((node, index) => (index < UBH.length - 1 ? [node, '; '] : [node]))}
          </IndentedText>
        )}

        <Divider />
        <RichText ta='justify' store='CHARACTER' py={5}>
          {invItem.item.description}
        </RichText>

        {craftReq && (
          <>
            <Divider />
            <IndentedText ta='justify'>{craftReq}</IndentedText>
          </>
        )}
      </Box>
      <Box
        style={{
          position: 'absolute',
          bottom: 0,
          width: '100%',
        }}
      >
        <Group justify='space-between' wrap='nowrap'>
          <Group wrap='nowrap' gap={15} ml={0}>
            {invItem.item.meta_data?.charges?.max && (
              <Box mb={-10}>
                <TokenSelect
                  count={invItem.item.meta_data.charges.max}
                  value={invItem.item.meta_data.charges.current ?? 0}
                  onChange={(val) =>
                    onItemUpdate({
                      ...invItem,
                      item: {
                        ...invItem.item,
                        meta_data: {
                          ...invItem.item.meta_data!,
                          charges: {
                            ...invItem.item.meta_data?.charges,
                            current: val,
                          },
                        },
                      },
                    })
                  }
                  size='xs'
                  emptySymbol={
                    <ActionIcon
                      variant='transparent'
                      color='gray.1'
                      aria-label='Item Charge, Unused'
                      size='xs'
                      style={{
                        opacity: 0.7,
                        backdropFilter: 'blur(12px)',
                        WebkitBackdropFilter: 'blur(12px)',
                      }}
                    >
                      <IconSquareRounded size='1rem' />
                    </ActionIcon>
                  }
                  fullSymbol={
                    <ActionIcon
                      variant='transparent'
                      color='gray.1'
                      aria-label='Item Charge, Exhuasted'
                      size='xs'
                      style={{
                        opacity: 0.7,
                        backdropFilter: 'blur(12px)',
                        WebkitBackdropFilter: 'blur(12px)',
                      }}
                    >
                      <IconSquareRoundedFilled size='1rem' />
                    </ActionIcon>
                  }
                />
              </Box>
            )}
          </Group>
          <Group wrap='nowrap' gap={15} mr={15}>
            {!invItem.item.meta_data?.unselectable && containerItems.length > 0 && (
              <Menu
                transitionProps={{ transition: 'pop-top-right' }}
                position='top-end'
                // width={140}
                withinPortal
                zIndex={10000}
              >
                <Menu.Target>
                  <Button
                    variant='light'
                    color='teal'
                    size='compact-sm'
                    radius='xl'
                    rightSection={<IconChevronDown style={{ width: rem(18), height: rem(18) }} stroke={1.5} />}
                    styles={{
                      section: {
                        marginLeft: 5,
                      },
                    }}
                    style={{
                      backdropFilter: 'blur(8px)',
                      WebkitBackdropFilter: 'blur(8px)',
                    }}
                    pr={5}
                  >
                    Move Item
                  </Button>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Item
                    onClick={() => {
                      props.data.onItemMove(invItem, null);
                    }}
                  >
                    Unstored
                  </Menu.Item>
                  <Menu.Divider />
                  {containerItems.map((containerItem, index) => (
                    <Menu.Item
                      key={index}
                      onClick={() => {
                        props.data.onItemMove(invItem, containerItem);
                      }}
                    >
                      {containerItem.item.name}
                    </Menu.Item>
                  ))}
                </Menu.Dropdown>
              </Menu>
            )}
            <ActionIcon
              variant='light'
              color='cyan'
              radius='xl'
              aria-label='Edit Item'
              style={{
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
              }}
              onClick={() => {
                setEditingItem(true);
              }}
            >
              <IconEdit style={{ width: '70%', height: '70%' }} stroke={1.5} />
            </ActionIcon>
            {!invItem.item.meta_data?.unselectable && (
              <ActionIcon
                variant='light'
                color='red'
                radius='xl'
                aria-label='Remove Item'
                style={{
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                }}
                onClick={() => {
                  props.data.onItemDelete(invItem);
                }}
              >
                <IconTrashXFilled style={{ width: '70%', height: '70%' }} stroke={1.5} />
              </ActionIcon>
            )}
          </Group>
        </Group>
        {editingItem && (
          <CreateItemModal
            opened={editingItem}
            editItem={invItem.item}
            onComplete={async (item) => {
              const newInvItem = {
                ..._.cloneDeep(invItem),
                item,
              };
              onItemUpdate(newInvItem);
              openDrawer(null);
              setTimeout(() => {
                openDrawer({
                  type: 'inv-item',
                  data: {
                    ...props.data,
                    invItem: newInvItem,
                  },
                });
              }, 1);
            }}
            onCancel={() => {
              setEditingItem(false);
            }}
          />
        )}
      </Box>
    </Box>
  );
}

function InvItemSections(props: {
  invItem: InventoryItem;
  onItemUpdate: (invItem: InventoryItem) => void;
  openDrawer: SetterOrUpdater<any>;
}) {
  const [drawer, openDrawer] = useRecoilState(drawerState);
  const ac = props.invItem.item.meta_data?.ac_bonus;
  const dexCap = props.invItem.item.meta_data?.dex_cap;
  const strength = props.invItem.item.meta_data?.strength;
  const checkPenalty = props.invItem.item.meta_data?.check_penalty;
  const speedPenalty = props.invItem.item.meta_data?.speed_penalty;

  const bt = props.invItem.item.meta_data?.broken_threshold ?? 0;
  const hardness = props.invItem.item.meta_data?.hardness ?? 0;
  const maxHp = props.invItem.item.meta_data?.hp_max ?? 0;
  const healthRef = useRef<HTMLInputElement>(null);
  const [health, setHealth] = useState<string | undefined>();
  useEffect(() => {
    setHealth(props.invItem.item.meta_data?.hp ? `${props.invItem.item.meta_data.hp}` : undefined);
  }, [props.invItem]);

  ///

  const hasQuantity = isItemWithQuantity(props.invItem.item);
  const hasHealth = !!maxHp;
  const hasAttackAndDamage = isItemWeapon(props.invItem.item);
  const hasArmor = isItemArmor(props.invItem.item) || isItemShield(props.invItem.item);

  ///

  let quantitySection = null;
  if (hasQuantity) {
    quantitySection = (
      <Paper shadow='xs' my={5} py={5} px={10} bg='dark.6' radius='md'>
        <Group wrap='nowrap'>
          <Text fw={600} c='gray.5' span>
            Quantity
          </Text>{' '}
          <NumberInput
            placeholder='Amount'
            size='xs'
            min={1}
            defaultValue={props.invItem.item.meta_data?.quantity}
            onChange={(value) => {
              props.onItemUpdate({
                ...props.invItem,
                item: {
                  ...props.invItem.item,
                  meta_data: {
                    ...props.invItem.item.meta_data!,
                    quantity: parseInt(`${value}`) || 1,
                  },
                },
              });
            }}
          />
        </Group>
      </Paper>
    );
  }

  let healthSection = null;
  if (hasHealth) {
    const handleHealthSubmit = () => {
      const inputHealth = health ?? '0';
      let result = -1;
      try {
        result = evaluate(inputHealth);
      } catch (e) {
        result = parseInt(inputHealth);
      }
      if (isNaN(result)) result = 0;
      result = Math.floor(result);
      if (result < 0) result = 0;
      if (result > maxHp) result = maxHp;

      props.onItemUpdate({
        ...props.invItem,
        item: {
          ...props.invItem.item,
          meta_data: {
            ...props.invItem.item.meta_data!,
            hp: result,
          },
        },
      });
      setHealth(`${result}`);
      healthRef.current?.blur();
    };

    healthSection = (
      <Paper shadow='xs' my={5} py={5} px={10} bg='dark.6' radius='md' style={{ position: 'relative' }}>
        <Group gap={5}>
          <Group wrap='nowrap' gap={10} style={{ flexGrow: 1 }}>
            <Text fw={600} c='gray.5' span>
              Hit Points
            </Text>{' '}
            <TextInput
              ref={healthRef}
              w={120}
              placeholder='HP'
              value={health}
              onChange={(e) => {
                setHealth(e.target.value);
              }}
              onBlur={handleHealthSubmit}
              onKeyDown={getHotkeyHandler([
                ['mod+Enter', handleHealthSubmit],
                ['Enter', handleHealthSubmit],
              ])}
              rightSection={
                <Group>
                  <Text>/</Text>
                  <Text>{maxHp}</Text>
                </Group>
              }
              rightSectionWidth={60}
            />
          </Group>
          <Group gap={5} style={{ flexGrow: 1 }}>
            <Stack gap={0}>
              <Text ta='right' fz={10}>
                Hardness
              </Text>
              <Text ta='right' fz={10}>
                Broken Threshold
              </Text>
            </Stack>
            <Stack gap={0}>
              <Text ta='left' fw={500} c='gray.4' fz={10}>
                {hardness}
              </Text>
              <Text ta='left' fw={500} c='gray.4' fz={10}>
                {bt}
              </Text>
            </Stack>
          </Group>
        </Group>
        <HoverCard shadow='md' openDelay={250} width={200} zIndex={1000} position='top' withinPortal>
          <HoverCard.Target>
            <ActionIcon
              variant='subtle'
              aria-label='Help'
              radius='xl'
              size='sm'
              style={{
                position: 'absolute',
                top: 5,
                right: 5,
              }}
            >
              <IconHelpCircle style={{ width: '80%', height: '80%' }} stroke={1.5} />
            </ActionIcon>
          </HoverCard.Target>
          <HoverCard.Dropdown py={5} px={10}>
            <Text fz='xs'>
              An item can be broken or destroyed if it takes enough damage. Each time an item takes damage, reduce any
              damage by its Hardness value.
            </Text>
            <Text fz='xs'>
              It becomes broken when its Hit Points are equal to or lower than its Broken Threshold (BT); once its HP is
              reduced to 0, it is destroyed.
            </Text>
          </HoverCard.Dropdown>
        </HoverCard>
      </Paper>
    );
  }

  let attackAndDamageSection = null;
  if (hasAttackAndDamage) {
    const weaponStats = getWeaponStats('CHARACTER', props.invItem.item);

    console.log(weaponStats);

    const damageBonus = weaponStats.damage.bonus.total > 0 ? ` + ${weaponStats.damage.bonus.total}` : ``;

    attackAndDamageSection = (
      <Paper shadow='xs' my={5} py={5} px={10} bg='dark.6' radius='md'>
        <Group
          gap={0}
          style={{
            cursor: 'pointer',
          }}
          onClick={() => {
            openDrawer({
              type: 'stat-weapon',
              data: { item: props.invItem.item },
              extra: { addToHistory: true },
            });
          }}
        >
          <Group wrap='nowrap' gap={10} style={{ overflow: 'hidden' }}>
            <Text fw={600} c='gray.5' span style={{ overflow: 'hidden' }}>
              Attack
            </Text>
            <Text c='gray.5' span>
              {sign(weaponStats.attack_bonus.total[0])} / {sign(weaponStats.attack_bonus.total[1])} /{' '}
              {sign(weaponStats.attack_bonus.total[2])}
            </Text>
          </Group>
          <Group wrap='nowrap' gap={10} style={{ overflow: 'hidden' }} maw={300}>
            <Text fw={600} c='gray.5' span>
              Damage
            </Text>
            <EllipsisText c='gray.5' span>
              {weaponStats.damage.dice}
              {weaponStats.damage.die}
              {damageBonus} {weaponStats.damage.damageType}
              {parseOtherDamage(weaponStats.damage.other)}
              {weaponStats.damage.extra ? ` + ${weaponStats.damage.extra}` : ''}
            </EllipsisText>
          </Group>
        </Group>
      </Paper>
    );
  }

  let runesSection = null;
  if (isItemWithRunes(props.invItem.item)) {
    let strikingLabel = '';
    if (props.invItem.item.meta_data!.runes!.striking === 1) {
      strikingLabel = 'Striking';
    } else if (props.invItem.item.meta_data!.runes!.striking === 2) {
      strikingLabel = 'Greater Striking';
    } else if (props.invItem.item.meta_data!.runes!.striking === 3) {
      strikingLabel = 'Major Striking';
    }

    let resilientLabel = '';
    if (props.invItem.item.meta_data!.runes!.resilient === 1) {
      resilientLabel = 'Resilient';
    } else if (props.invItem.item.meta_data!.runes!.resilient === 2) {
      resilientLabel = 'Greater Resilient';
    } else if (props.invItem.item.meta_data!.runes!.resilient === 3) {
      resilientLabel = 'Major Resilient';
    }

    let potencyLabel = '';
    if (props.invItem.item.meta_data!.runes!.potency) {
      potencyLabel = `+${props.invItem.item.meta_data!.runes!.potency} `;
    }

    const rightLabel = strikingLabel || resilientLabel;

    runesSection = (
      <Paper shadow='xs' my={5} py={5} px={10} bg='dark.6' radius='md'>
        <Group gap={10}>
          {potencyLabel && (
            <Text fw={600} c='gray.5' span>
              {potencyLabel}
            </Text>
          )}
          <Text fw={600} c='gray.5' span>
            {rightLabel}
          </Text>

          {isItemWithPropertyRunes(props.invItem.item) && (
            <>
              {props.invItem.item.meta_data!.runes!.property?.map((rune, index) => (
                <Badge
                  key={index}
                  variant='light'
                  style={{
                    cursor: 'pointer',
                  }}
                  styles={{
                    root: {
                      textTransform: 'initial',
                    },
                  }}
                  onClick={() => {
                    props.openDrawer({
                      type: 'item',
                      data: { id: rune.id },
                      extra: { addToHistory: true },
                    });
                  }}
                >
                  {toLabel(rune.name)}
                </Badge>
              ))}
            </>
          )}
        </Group>
      </Paper>
    );
  }

  let rangeAndReloadSection = null;
  if (isItemRangedWeapon(props.invItem.item)) {
    rangeAndReloadSection = (
      <Paper shadow='xs' my={5} py={5} px={10} bg='dark.6' radius='md'>
        <Group gap={0}>
          <Group wrap='nowrap' gap={10} style={{ flexGrow: 1 }}>
            <Text fw={600} c='gray.5' span>
              Range
            </Text>
            <Text c='gray.5' span>
              {props.invItem.item.meta_data?.range} ft.
            </Text>
          </Group>
          <Group wrap='nowrap' gap={10} style={{ flexGrow: 1 }}>
            <Text fw={600} c='gray.5' span>
              Reload
            </Text>
            <Text c='gray.5' span>
              {props.invItem.item.meta_data?.reload ?? '—'}
            </Text>
          </Group>
        </Group>
      </Paper>
    );
  }

  let capacityAndUsageSection = null;
  if (props.invItem.item.meta_data?.starfinder?.capacity || props.invItem.item.meta_data?.starfinder?.usage) {
    capacityAndUsageSection = (
      <Paper shadow='xs' my={5} py={5} px={10} bg='dark.6' radius='md'>
        <Group gap={0}>
          <Group wrap='nowrap' gap={10} style={{ flexGrow: 1 }}>
            <Text fw={600} c='gray.5' span>
              Capacity
            </Text>
            <Text c='gray.5' span>
              {props.invItem.item.meta_data?.starfinder?.capacity ?? '—'}
            </Text>
          </Group>
          <Group wrap='nowrap' gap={10} style={{ flexGrow: 1 }}>
            <Text fw={600} c='gray.5' span>
              Ammo Usage
            </Text>
            <Text c='gray.5' span>
              {props.invItem.item.meta_data?.starfinder?.usage ?? '—'}
            </Text>
          </Group>
        </Group>
      </Paper>
    );
  }

  let categoryAndGroupSection = null;
  if (props.invItem.item.meta_data?.category || props.invItem.item.meta_data?.group) {
    let groupDesc =
      getWeaponSpecialization(props.invItem.item.meta_data?.group ?? '') ??
      getArmorSpecialization(props.invItem.item.meta_data?.group ?? '');
    if (groupDesc && hasAttackAndDamage) {
      if (hasAttackAndDamage) {
        groupDesc = {
          ...groupDesc,
          description: `**Critical Specialization Effect**\n\n${groupDesc.description}`,
        };
      } else {
        groupDesc = {
          ...groupDesc,
          description: `**Armor Specialization Effect**\n\n${groupDesc.description}`,
        };
      }
    }

    categoryAndGroupSection = (
      <Paper shadow='xs' my={5} py={5} px={10} bg='dark.6' radius='md'>
        <Group gap={0}>
          <Group wrap='nowrap' gap={10} style={{ flexGrow: 1 }}>
            <Text fw={600} c='gray.5' span>
              Category
            </Text>
            <Text c='gray.5' span>
              {toLabel(props.invItem.item.meta_data?.category)}
            </Text>
          </Group>
          <Group wrap='nowrap' gap={10} style={{ flexGrow: 1 }}>
            <Text fw={600} c='gray.5' span>
              Group
            </Text>
            <HoverCard
              disabled={!groupDesc}
              width={265}
              shadow='md'
              zIndex={2000}
              openDelay={250}
              withinPortal
              withArrow
            >
              <HoverCard.Target>
                <Text c='gray.5' style={{ cursor: groupDesc ? 'pointer' : undefined }} span>
                  {toLabel(props.invItem.item.meta_data?.group)}
                </Text>
              </HoverCard.Target>
              <HoverCard.Dropdown>
                <RichText ta='justify' fz='xs' store='CHARACTER'>
                  {groupDesc?.description}
                </RichText>
              </HoverCard.Dropdown>
            </HoverCard>
          </Group>
        </Group>
      </Paper>
    );
  }

  let armorSection = null;
  if (hasArmor) {
    armorSection = (
      <Paper shadow='xs' my={5} py={5} px={10} bg='dark.6' radius='md' style={{ position: 'relative' }}>
        <Group gap={0}>
          <Group wrap='nowrap' mr={20} style={{ flexGrow: 1 }}>
            <Text fw={600} c='gray.5' span>
              AC Bonus
            </Text>{' '}
            <Text c='gray.5' span>
              {sign(ac ?? 0)}
            </Text>
          </Group>
          <Group wrap='nowrap' align='flex-start' style={{ flexGrow: 1 }}>
            {(dexCap !== undefined || strength !== undefined) && (
              <Group gap={5}>
                <Stack gap={0}>
                  {dexCap !== undefined && (
                    <Text ta='right' fz={10}>
                      Dex Cap
                    </Text>
                  )}
                  {strength !== undefined && (
                    <Text ta='right' fz={10}>
                      Strength
                    </Text>
                  )}
                </Stack>
                <Stack gap={0}>
                  {dexCap !== undefined && (
                    <Text ta='left' fw={500} c='gray.4' fz={10}>
                      {sign(dexCap)}
                    </Text>
                  )}
                  {strength !== undefined && (
                    <Text ta='left' fw={500} c='gray.4' fz={10}>
                      {sign(strength)}
                    </Text>
                  )}
                </Stack>
              </Group>
            )}
            {(!!checkPenalty || !!speedPenalty) && (
              <Group gap={5}>
                <Stack gap={0}>
                  {!!checkPenalty && (
                    <Text ta='right' fz={10}>
                      Check Penalty
                    </Text>
                  )}
                  {!!speedPenalty && (
                    <Text ta='right' fz={10}>
                      Speed Penalty
                    </Text>
                  )}
                </Stack>
                <Stack gap={0}>
                  {!!checkPenalty && (
                    <Text ta='left' fw={500} c='gray.4' fz={10}>
                      {sign(checkPenalty)}
                    </Text>
                  )}
                  {!!speedPenalty && (
                    <Text ta='left' fw={500} c='gray.4' fz={10}>
                      {sign(speedPenalty)} ft.
                    </Text>
                  )}
                </Stack>
              </Group>
            )}
          </Group>
        </Group>
        <HoverCard shadow='md' openDelay={250} width={200} zIndex={1000} position='top' withinPortal>
          <HoverCard.Target>
            <ActionIcon
              variant='subtle'
              aria-label='Help'
              radius='xl'
              size='sm'
              style={{
                position: 'absolute',
                top: 5,
                right: 5,
              }}
            >
              <IconHelpCircle style={{ width: '80%', height: '80%' }} stroke={1.5} />
            </ActionIcon>
          </HoverCard.Target>
          <HoverCard.Dropdown py={5} px={10}>
            <ScrollArea h={dexCap ? 250 : undefined} pr={14} scrollbars='y'>
              {ac !== undefined && (
                <Text fz='xs'>
                  <Text fz='xs' fw={600} span>
                    AC Bonus:
                  </Text>{' '}
                  This is the item bonus you add for the armor when determining AC.
                </Text>
              )}
              {dexCap !== undefined && (
                <Text fz='xs'>
                  <Text fz='xs' fw={600} span>
                    Dex Cap:
                  </Text>{' '}
                  This is the maximum Dexterity modifier you can benefit from towards your AC while wearing the armor.
                </Text>
              )}
              {strength !== undefined && (
                <Text fz='xs'>
                  <Text fz='xs' fw={600} span>
                    Strength:
                  </Text>{' '}
                  This is the Strength modifier at which you are strong enough to overcome some of the armor’s
                  penalties. If your Strength modifier is equal to or greater than this value, you no longer take the
                  armor’s check penalty, and you decrease the Speed penalty by 5 feet.
                </Text>
              )}
              {checkPenalty !== undefined && (
                <Text fz='xs'>
                  <Text fz='xs' fw={600} span>
                    Check Penalty:
                  </Text>{' '}
                  While wearing your armor, you take this penalty to Strength- and Dexterity-based skill checks, except
                  for those that have the attack trait. If you meet the armor’s Strength threshold, you don’t take this
                  penalty.
                </Text>
              )}
              {speedPenalty !== undefined && (
                <Text fz='xs'>
                  <Text fz='xs' fw={600} span>
                    Speed Penalty:
                  </Text>{' '}
                  While wearing a suit of armor, you take the penalty listed in this entry to your Speed, as well as to
                  any other movement types you have, such as a climb Speed or swim Speed, to a minimum Speed of 5 feet.
                  If you meet the armor’s Strength threshold, you reduce the penalty by 5 feet.
                </Text>
              )}
            </ScrollArea>
          </HoverCard.Dropdown>
        </HoverCard>
      </Paper>
    );
  }

  return (
    <>
      <Stack gap={0}>
        <>{runesSection}</>
        <>{attackAndDamageSection}</>
        <>{rangeAndReloadSection}</>
        <>{armorSection}</>
        <>{capacityAndUsageSection}</>
        <>{categoryAndGroupSection}</>
        <>{quantitySection}</>
        <>{healthSection}</>
      </Stack>
    </>
  );
}
