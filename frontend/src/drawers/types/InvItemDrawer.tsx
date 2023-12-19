import { characterState } from '@atoms/characterAtoms';
import { ActionSymbol } from '@common/Actions';
import IndentedText from '@common/IndentedText';
import RichText from '@common/RichText';
import TraitsDisplay from '@common/TraitsDisplay';
import { TEXT_INDENT_AMOUNT } from '@constants/data';
import { fetchContentById } from '@content/content-store';
import { isActionCost } from '@content/content-utils';
import { priceToString } from '@items/currency-handler';
import { isItemBroken } from '@items/inv-utils';
import { getWeaponStats } from '@items/weapon-handler';
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
  Button,
  Menu,
  rem,
  ActionIcon,
  Paper,
  NumberInput,
  TextInput,
  HoverCard,
} from '@mantine/core';
import { getHotkeyHandler } from '@mantine/hooks';
import {
  IconCalendar,
  IconChevronDown,
  IconEdit,
  IconHelpCircle,
  IconPackage,
  IconPhoto,
  IconSquareCheck,
  IconTrashXFilled,
  IconUsers,
} from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { InventoryItem, Item } from '@typing/content';
import { sign } from '@utils/numbers';
import { hasTraitType } from '@utils/traits';
import * as math from 'mathjs';
import { useEffect, useRef, useState } from 'react';
import { useRecoilValue } from 'recoil';

export function InvItemDrawerTitle(props: { data: { invItem: InventoryItem } }) {
  return (
    <>
      <Group justify='space-between' wrap='nowrap'>
        <Group wrap='nowrap' gap={10}>
          <Box>
            <Title order={3}>{props.data.invItem.item.name}</Title>
          </Box>
        </Group>
        <Text style={{ textWrap: 'nowrap' }}>Item {props.data.invItem.item.level}</Text>
      </Group>
    </>
  );
}

export function InvItemDrawerContent(props: {
  data: {
    invItem: InventoryItem;
    onItemUpdate: (invItem: InventoryItem) => void;
    onItemDelete: (invItem: InventoryItem) => void;
    onItemMove: (invItem: InventoryItem, containerItem: InventoryItem) => void;
  };
}) {
  const [invItem, setInvItem] = useState(props.data.invItem);

  const character = useRecoilValue(characterState);
  const containerItems = character?.inventory?.items.filter((item) => item.is_container) ?? [];

  let price = null;
  if (invItem.item.price) {
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
  if (invItem.item.bulk?.trim() && parseInt(invItem.item.bulk) !== 0) {
    UBH.push(
      <>
        <Text key={1} fw={600} c='gray.5' span>
          Bulk
        </Text>{' '}
        {invItem.item.bulk}
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
            traitIds={invItem.item.traits ?? []}
            rarity={invItem.item.rarity}
            broken={isItemBroken(invItem.item)}
            shoddy={invItem.item.meta_data?.is_shoddy}
            interactable
          />
        </Box>

        <InvItemSections
          invItem={props.data.invItem}
          onItemUpdate={(invItem) => {
            setInvItem(invItem);
            props.data.onItemUpdate(invItem);
          }}
        />

        {price && <IndentedText ta='justify'>{price}</IndentedText>}
        {UBH.length > 0 && (
          <IndentedText ta='justify'>
            {UBH.flatMap((node, index) => (index < UBH.length - 1 ? [node, '; '] : [node]))}
          </IndentedText>
        )}

        <Divider />
        <RichText ta='justify' py={5}>
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
        {/* <Divider mr={15} mb={10} /> */}
        <Group justify='flex-end' wrap='nowrap' mr={15} gap={15}>
          {containerItems.length > 0 && (
            <Menu
              transitionProps={{ transition: 'pop-top-right' }}
              position='top-end'
              width={220}
              withinPortal
              zIndex={10000}
            >
              <Menu.Target>
                <Button
                  variant='light'
                  color='teal'
                  size='compact-sm'
                  radius='xl'
                  rightSection={
                    <IconChevronDown style={{ width: rem(18), height: rem(18) }} stroke={1.5} />
                  }
                  styles={{
                    section: {
                      marginLeft: 5,
                    },
                  }}
                  pr={5}
                >
                  Move Item
                </Button>
              </Menu.Target>
              <Menu.Dropdown>
                {containerItems.map((containerItem) => (
                  <Menu.Item
                    leftSection={
                      <IconSquareCheck style={{ width: rem(16), height: rem(16) }} stroke={1.5} />
                    }
                    rightSection={
                      <Text size='xs' tt='uppercase' fw={700} c='dimmed'>
                        Ctrl + T
                      </Text>
                    }
                    onClick={() => {
                      props.data.onItemMove(props.data.invItem, containerItem);
                    }}
                  >
                    {containerItem.item.name}
                  </Menu.Item>
                ))}
              </Menu.Dropdown>
            </Menu>
          )}
          <ActionIcon variant='light' color='cyan' radius='xl' aria-label='Edit Item'>
            <IconEdit style={{ width: '70%', height: '70%' }} stroke={1.5} />
          </ActionIcon>
          <ActionIcon
            variant='light'
            color='red'
            radius='xl'
            aria-label='Remove Item'
            onClick={() => {
              props.data.onItemDelete(props.data.invItem);
            }}
          >
            <IconTrashXFilled style={{ width: '70%', height: '70%' }} stroke={1.5} />
          </ActionIcon>
        </Group>
      </Box>
    </Box>
  );
}

function InvItemSections(props: {
  invItem: InventoryItem;
  onItemUpdate: (invItem: InventoryItem) => void;
}) {
  const bt = props.invItem.item.meta_data?.broken_threshold ?? 0;
  const hardness = props.invItem.item.meta_data?.hardness ?? 0;
  const maxHp = props.invItem.item.meta_data?.hp_max ?? 0;
  const healthRef = useRef<HTMLInputElement>(null);
  const [health, setHealth] = useState<string | undefined>();
  useEffect(() => {
    setHealth(props.invItem.item.meta_data?.hp ? `${props.invItem.item.meta_data.hp}` : undefined);
  }, [props.invItem]);

  ///

  const hasQuantity = hasTraitType('CONSUMABLE', props.invItem.item.traits);
  const hasHealth = !!maxHp;
  const hasAttackAndDamage = !!props.invItem.item.meta_data?.damage;
  const hasArmor = false;

  ///

  let quantitySection = null;
  if (hasQuantity) {
    quantitySection = (
      <Paper shadow='xs' my={5} py={5} px={10} bg='dark.6' radius='md'>
        <Group wrap='nowrap'>
          <Text fw={600} c='gray.5' span>
            Quantity
          </Text>{' '}
          <NumberInput placeholder='Amount' size='xs' min={1} />
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
        result = math.evaluate(inputHealth);
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
      <Paper
        shadow='xs'
        my={5}
        py={5}
        px={10}
        bg='dark.6'
        radius='md'
        style={{ position: 'relative' }}
      >
        <Group wrap='nowrap'>
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
          <Group gap={5}>
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
        <HoverCard
          shadow='md'
          openDelay={250}
          width={200}
          zIndex={1000}
          position='top'
          withinPortal
        >
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
              An item can be broken or destroyed if it takes enough damage. Each time an item takes
              damage, reduce any damage by its Hardness value.
            </Text>
            <Text fz='xs'>
              It becomes broken when its Hit Points are equal to or lower than its Broken Threshold
              (BT); once its HP is reduced to 0, it is destroyed.
            </Text>
          </HoverCard.Dropdown>
        </HoverCard>
      </Paper>
    );
  }

  let attackAndDamageSection = null;
  if (hasAttackAndDamage) {
    const weaponStats = getWeaponStats('CHARACTER', props.invItem.item);

    const damageBonus =
      weaponStats.damage.bonus.total > 0 ? ` + ${weaponStats.damage.bonus.total}` : ``;

    attackAndDamageSection = (
      <Paper shadow='xs' my={5} py={5} px={10} bg='dark.6' radius='md'>
        <Group wrap='nowrap' grow>
          <Group wrap='nowrap' gap={10}>
            <Text fw={600} c='gray.5' span>
              Attack
            </Text>
            <Text span>
              {sign(weaponStats.attack_bonus.total[0])} / {sign(weaponStats.attack_bonus.total[1])}{' '}
              / {sign(weaponStats.attack_bonus.total[2])}
            </Text>
          </Group>
          <Group wrap='nowrap' gap={10}>
            <Text fw={600} c='gray.5' span>
              Damage
            </Text>
            <Text span>
              {weaponStats.damage.dice}
              {weaponStats.damage.die}
              {damageBonus} {weaponStats.damage.damageType}
            </Text>
          </Group>
        </Group>
      </Paper>
    );
  }

  return (
    <>
      <Stack gap={5}>
        <>{attackAndDamageSection}</>
        <>{quantitySection}</>
        <>{healthSection}</>
      </Stack>
    </>
  );
}
