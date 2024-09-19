import { ActionSymbol } from '@common/Actions';
import IndentedText from '@common/IndentedText';
import RichText from '@common/RichText';
import TraitsDisplay from '@common/TraitsDisplay';
import { TEXT_INDENT_AMOUNT } from '@constants/data';
import { fetchContentById, fetchItemByName } from '@content/content-store';
import { isActionCost } from '@content/content-utils';
import ShowOperationsButton from '@drawers/ShowOperationsButton';
import { priceToString } from '@items/currency-handler';
import {
  compileTraits,
  isItemArchaic,
  isItemArmor,
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
  Title,
  Text,
  Image,
  Loader,
  Group,
  Divider,
  Stack,
  Box,
  Flex,
  ActionIcon,
  HoverCard,
  NumberInput,
  Paper,
  ScrollArea,
  TextInput,
  Badge,
} from '@mantine/core';
import { getHotkeyHandler } from '@mantine/hooks';
import { IconHelpCircle } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { Item } from '@typing/content';
import { StoreID } from '@typing/variables';
import { sign } from '@utils/numbers';
import { toLabel } from '@utils/strings';
import { getArmorSpecialization } from '@specializations/armor-specializations';
import { getWeaponSpecialization } from '@specializations/weapon-specializations';
import { SetterOrUpdater, useRecoilState } from 'recoil';
import { drawerState } from '@atoms/navAtoms';
import ShowInjectedText from '@drawers/ShowInjectedText';
import { ItemRunesDescription } from '@common/ItemRunesDescription';
import { EllipsisText } from '@common/EllipsisText';

export function ItemDrawerTitle(props: { data: { id?: number; item?: Item } }) {
  const id = props.data.id;

  const { data: _item } = useQuery({
    queryKey: [`find-item-${id}`, { id }],
    queryFn: async ({ queryKey }) => {
      // @ts-ignore
      // eslint-disable-next-line
      const [_key, { id }] = queryKey;
      return await fetchContentById<Item>('item', id);
    },
    enabled: !!id,
  });
  const item = props.data.item ?? _item;

  let type = `Item ${item?.level}`;
  if (item?.meta_data?.unselectable && item.level === 0) {
    type = '';
  }

  return (
    <>
      {item && (
        <Group justify='space-between' wrap='nowrap'>
          <Group wrap='nowrap' gap={10}>
            <Box>
              <Title order={3}>
                {toLabel(item.name)}{' '}
                {item.meta_data?.quantity && item.meta_data.quantity > 1 ? `(${item.meta_data.quantity})` : ''}
              </Title>
            </Box>
          </Group>
          <Text style={{ textWrap: 'nowrap' }}>{type}</Text>
        </Group>
      )}
    </>
  );
}

export function ItemDrawerContent(props: {
  data: { id?: number; item?: Item; showOperations?: boolean; storeID?: StoreID };
}) {
  const storeID = props.data.storeID ?? 'CHARACTER';
  const id = props.data.id;
  const [_drawer, openDrawer] = useRecoilState(drawerState);

  const { data: _item } = useQuery({
    queryKey: [`find-item-with-base-${id}`, { id }],
    queryFn: async ({ queryKey }) => {
      // @ts-ignore
      // eslint-disable-next-line
      const [_key, { id }] = queryKey;
      const item = await fetchContentById<Item>('item', id);

      // Inject base item content
      if (item?.meta_data?.base_item) {
        const baseItem = await fetchItemByName(item.meta_data.base_item);
        item.meta_data.base_item_content = baseItem && baseItem.length > 0 ? baseItem[0] : undefined;
      }
      return item;
    },
    enabled: !!id,
  });

  const item = props.data.item ?? _item;

  if (!item) {
    return (
      <Loader
        type='bars'
        style={{
          position: 'absolute',
          top: '35%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      />
    );
  }

  let price = null;
  if (item.price && priceToString(item.price) !== '—') {
    price = (
      <>
        <Text key={1} fw={600} c='gray.5' span>
          Price
        </Text>{' '}
        {priceToString(item.price)}
      </>
    );
  }

  const UBH = [];
  if (item.usage) {
    UBH.push(
      <>
        <Text key={0} fw={600} c='gray.5' span>
          Usage
        </Text>{' '}
        {item.usage.replace(/-/g, ' ')}
      </>
    );
  }
  if (item.bulk !== undefined && item.bulk !== null && `${item.bulk}`.trim() !== '') {
    UBH.push(
      <>
        <Text key={1} fw={600} c='gray.5' span>
          Bulk
        </Text>{' '}
        {labelizeBulk(item.bulk)}
      </>
    );
  }
  if (item.hands) {
    UBH.push(
      <>
        <Text key={1} fw={600} c='gray.5' span>
          Hands
        </Text>{' '}
        {item.hands}
      </>
    );
  }

  let craftReq = null;
  if (item.craft_requirements) {
    craftReq = (
      <>
        <Text key={1} fw={600} c='gray.5' span>
          Craft Requirements
        </Text>{' '}
        {item.craft_requirements}
      </>
    );
  }

  return (
    <Box>
      {item.meta_data?.image_url && (
        <Image
          style={{
            float: 'right',
            maxWidth: 150,
            height: 'auto',
          }}
          ml='sm'
          radius='md'
          fit='contain'
          src={item.meta_data?.image_url}
        />
      )}
      <Box>
        {/* Note: Can't use a Stack here as it breaks the floating image */}
        <Box pb={2}>
          <TraitsDisplay
            traitIds={compileTraits(item)}
            rarity={item.rarity}
            availability={item.availability}
            archaic={isItemArchaic(item)}
            interactable
          />
        </Box>

        <MiscItemSections item={item} store={storeID} openDrawer={openDrawer} />

        {price && <IndentedText ta='justify'>{price}</IndentedText>}
        {UBH.length > 0 && (
          <IndentedText ta='justify'>
            {UBH.flatMap((node, index) => (index < UBH.length - 1 ? [node, '; '] : [node]))}
          </IndentedText>
        )}
        {true && <Divider />}
        <RichText ta='justify' py={5}>
          {item.description}
        </RichText>

        <ItemRunesDescription item={item} />

        {craftReq && (
          <>
            <Divider />
            <IndentedText ta='justify'>{craftReq}</IndentedText>
          </>
        )}
      </Box>
      <ShowInjectedText varId='CHARACTER' type='item' id={item.id} />
      {props.data.showOperations && <ShowOperationsButton name={item.name} operations={item.operations} />}
    </Box>
  );
}

function MiscItemSections(props: { item: Item; store: StoreID; openDrawer: SetterOrUpdater<any> }) {
  const ac = props.item.meta_data?.ac_bonus;
  const dexCap = props.item.meta_data?.dex_cap;
  const strength = props.item.meta_data?.strength;
  const checkPenalty = props.item.meta_data?.check_penalty;
  const speedPenalty = props.item.meta_data?.speed_penalty;

  const bt = props.item.meta_data?.broken_threshold ?? 0;
  const hardness = props.item.meta_data?.hardness ?? 0;
  const maxHp = props.item.meta_data?.hp_max ?? 0;

  ///

  const hasQuantity = isItemWithQuantity(props.item);
  const hasHealth = !!maxHp;
  const hasAttackAndDamage = isItemWeapon(props.item);
  const hasArmor = isItemArmor(props.item) || isItemShield(props.item);

  ///

  let quantitySection = null;
  if (hasQuantity && props.item.meta_data?.quantity !== 1) {
    quantitySection = (
      <Paper shadow='xs' my={5} py={5} px={10} bg='dark.6' radius='md'>
        <Group wrap='nowrap'>
          <Text fw={600} c='gray.5' span>
            Quantity
          </Text>{' '}
          <Text span>{props.item.meta_data?.quantity}</Text>
        </Group>
      </Paper>
    );
  }

  let healthSection = null;
  if (hasHealth) {
    healthSection = (
      <Paper shadow='xs' my={5} py={5} px={10} bg='dark.6' radius='md' style={{ position: 'relative' }}>
        <Group wrap='nowrap' justify='space-between'>
          <Group wrap='nowrap'>
            <Text fw={600} c='gray.5' span>
              Hit Points
            </Text>{' '}
            <Group>
              <Text>{maxHp}</Text>
            </Group>
          </Group>
          <Group gap={5} pr={60}>
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
    const weaponStats = getWeaponStats(props.store, props.item);

    const damageBonus = weaponStats.damage.bonus.total > 0 ? ` + ${weaponStats.damage.bonus.total}` : ``;

    attackAndDamageSection = (
      <Paper shadow='xs' my={5} py={5} px={10} bg='dark.6' radius='md'>
        <Group grow gap={0}>
          <Group wrap='nowrap' gap={10} style={{ overflow: 'hidden' }}>
            <Text fw={600} c='gray.5' span>
              Attack
            </Text>
            <Text c='gray.5' span>
              {sign(weaponStats.attack_bonus.total[0])}{' '}
              <Text c='gray.6' span>
                / {sign(weaponStats.attack_bonus.total[1])} / {sign(weaponStats.attack_bonus.total[2])}
              </Text>
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
  if (isItemWithRunes(props.item)) {
    let strikingLabel = '';
    if (props.item.meta_data!.runes!.striking === 1) {
      strikingLabel = 'Striking';
    } else if (props.item.meta_data!.runes!.striking === 2) {
      strikingLabel = 'Greater Striking';
    } else if (props.item.meta_data!.runes!.striking === 3) {
      strikingLabel = 'Major Striking';
    }

    let resilientLabel = '';
    if (props.item.meta_data!.runes!.resilient === 1) {
      resilientLabel = 'Resilient';
    } else if (props.item.meta_data!.runes!.resilient === 2) {
      resilientLabel = 'Greater Resilient';
    } else if (props.item.meta_data!.runes!.resilient === 3) {
      resilientLabel = 'Major Resilient';
    }

    let potencyLabel = '';
    if (props.item.meta_data!.runes!.potency) {
      potencyLabel = `+${props.item.meta_data!.runes!.potency} `;
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

          {isItemWithPropertyRunes(props.item) && (
            <>
              {props.item.meta_data!.runes!.property?.map((rune, index) => (
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
  if (isItemRangedWeapon(props.item)) {
    rangeAndReloadSection = (
      <Paper shadow='xs' my={5} py={5} px={10} bg='dark.6' radius='md'>
        <Group wrap='nowrap' grow>
          <Group wrap='nowrap' gap={10}>
            <Text fw={600} c='gray.5' span>
              Range
            </Text>
            <Text c='gray.5' span>
              {props.item.meta_data?.range} ft.
            </Text>
          </Group>
          <Group wrap='nowrap' gap={10}>
            <Text fw={600} c='gray.5' span>
              Reload
            </Text>
            <Text c='gray.5' span>
              {props.item.meta_data?.reload ?? '—'}
            </Text>
          </Group>
        </Group>
      </Paper>
    );
  }

  let capacityAndUsageSection = null;
  if (props.item.meta_data?.starfinder?.capacity || props.item.meta_data?.starfinder?.usage) {
    capacityAndUsageSection = (
      <Paper shadow='xs' my={5} py={5} px={10} bg='dark.6' radius='md'>
        <Group wrap='nowrap' grow>
          <Group wrap='nowrap' gap={10}>
            <Text fw={600} c='gray.5' span>
              Capacity
            </Text>
            <Text c='gray.5' span>
              {props.item.meta_data?.starfinder?.capacity ?? '—'}
            </Text>
          </Group>
          <Group wrap='nowrap' gap={10}>
            <Text fw={600} c='gray.5' span>
              Ammo Usage
            </Text>
            <Text c='gray.5' span>
              {props.item.meta_data?.starfinder?.usage ?? '—'}
            </Text>
          </Group>
        </Group>
      </Paper>
    );
  }

  let categoryAndGroupSection = null;
  if (props.item.meta_data?.category || props.item.meta_data?.group) {
    let groupDesc =
      getWeaponSpecialization(props.item.meta_data?.group ?? '') ??
      getArmorSpecialization(props.item.meta_data?.group ?? '');
    if (groupDesc) {
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
        <Group wrap='nowrap' grow>
          <Group wrap='nowrap' gap={10}>
            <Text fw={600} c='gray.5' span>
              Category
            </Text>
            <Text c='gray.5' span>
              {toLabel(props.item.meta_data?.category)}
            </Text>
          </Group>
          <Group wrap='nowrap' gap={10}>
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
                  {toLabel(props.item.meta_data?.group)}
                </Text>
              </HoverCard.Target>
              <HoverCard.Dropdown>
                <RichText ta='justify' fz='xs' store={props.store}>
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
        <Group wrap='nowrap'>
          <Group wrap='nowrap' mr={20}>
            <Text fw={600} c='gray.5' span>
              AC Bonus
            </Text>{' '}
            <Text c='gray.5' span>
              {sign(ac ?? 0)}
            </Text>
          </Group>
          <Group wrap='nowrap' align='flex-start'>
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
        <>{attackAndDamageSection}</>
        <>{armorSection}</>
        <>{runesSection}</>
        <>{rangeAndReloadSection}</>
        <>{capacityAndUsageSection}</>
        <>{categoryAndGroupSection}</>
        <>{quantitySection}</>
        <>{healthSection}</>
      </Stack>
    </>
  );
}
