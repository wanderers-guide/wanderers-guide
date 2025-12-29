import {
  FUNDAMENTAL_RUNES,
  isItemArmor,
  isItemWeapon,
  isItemWithPropertyRunes,
  isItemWithRunes,
  isItemWithUpgrades,
} from '@items/inv-utils';
import { Box, Button, Divider, Group, Text } from '@mantine/core';
import { Item } from '@typing/content';
import RichText from './RichText';
import { useRecoilState } from 'recoil';
import { drawerState } from '@atoms/navAtoms';
import { useQuery } from '@tanstack/react-query';
import { fetchContentById } from '@content/content-store';

export function ItemRunesDescription({ item }: { item: Item }) {
  const [_drawer, openDrawer] = useRecoilState(drawerState);

  const { data, isFetching } = useQuery({
    queryKey: [`get-item-fundamentals-runes`, { itemId: item.id }],
    queryFn: async () => {
      const itemIds: number[] = [];

      // Get potency rune item
      const potencyNum = item.meta_data?.runes?.potency;
      if (potencyNum) {
        if (isItemWeapon(item)) {
          itemIds.push(FUNDAMENTAL_RUNES[`potency_weapon_${potencyNum}`]);
        } else if (isItemArmor(item)) {
          itemIds.push(FUNDAMENTAL_RUNES[`potency_armor_${potencyNum}`]);
        }
      }

      // Get striking rune item
      const strikingNum = item.meta_data?.runes?.striking;
      if (strikingNum) {
        itemIds.push(FUNDAMENTAL_RUNES[`striking_${strikingNum}`]);
      }

      // Get resilient rune item
      const resilientNum = item.meta_data?.runes?.resilient;
      if (resilientNum) {
        itemIds.push(FUNDAMENTAL_RUNES[`resilient_${resilientNum}`]);
      }

      // Fetch all items
      const results = await Promise.allSettled(itemIds.map((id) => fetchContentById<Item>('item', id)));

      // Keep only successful fetches
      const items: Item[] = results
        .filter((r): r is PromiseFulfilledResult<Item> => r.status === 'fulfilled')
        .map((r) => r.value);

      return items;
    },
    enabled: isItemWithRunes(item),
  });

  if (!isItemWithRunes(item)) {
    return <></>;
  }

  const fundamentalRunes = data || [];
  const propertyRunes = (item.meta_data?.runes?.property || []).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <>
      {propertyRunes.length > 0 && (
        <Box pb={10}>
          <Divider mb='sm' label='Property Runes' />
          {propertyRunes.map((rune, index) => (
            <>
              {index > 0 && <Divider my='sm' />}
              <Group align='start' justify='space-between' pb={2}>
                <Box>
                  <Text fw={600} c='gray.5' span>
                    {rune.name}
                  </Text>
                </Box>
                <Button
                  variant='light'
                  size='compact-xs'
                  radius='xl'
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    openDrawer({
                      type: 'item',
                      data: { id: rune.id },
                      extra: { addToHistory: true },
                    });
                  }}
                >
                  View Item
                </Button>
              </Group>
              <RichText>{rune.rune?.description}</RichText>
            </>
          ))}
        </Box>
      )}

      {fundamentalRunes.length > 0 && (
        <Box>
          <Divider mb='sm' label='Fundamental Runes' />
          {fundamentalRunes.map((rune, index) => (
            <>
              {index > 0 && <Divider my='sm' />}
              <Group align='start' justify='space-between' pb={2}>
                <Box>
                  <Text fw={600} c='gray.5' span>
                    {rune.name}
                  </Text>
                </Box>
                <Button
                  variant='light'
                  size='compact-xs'
                  radius='xl'
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    openDrawer({
                      type: 'item',
                      data: { id: rune.id },
                      extra: { addToHistory: true },
                    });
                  }}
                >
                  View Item
                </Button>
              </Group>
              <RichText>{rune?.description}</RichText>
            </>
          ))}
        </Box>
      )}
    </>
  );
}

export function ItemUpgradesDescription(props: { item: Item }) {
  const [_drawer, openDrawer] = useRecoilState(drawerState);
  const { item } = props;

  if (!isItemWithUpgrades(item)) {
    return <></>;
  }

  const slots = item.meta_data?.starfinder?.slots || [];
  slots.sort((a, b) => a.name.localeCompare(b.name));

  return (
    <>
      <Divider mb='sm' />
      {slots.map((slot, index) => (
        <>
          {index > 0 && <Divider my='sm' />}
          <Group align='start' justify='space-between' pb={2}>
            <Box>
              <Text fw={600} c='gray.5' span>
                {slot.name}
              </Text>
            </Box>
            <Button
              variant='light'
              size='compact-xs'
              radius='xl'
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                openDrawer({
                  type: 'item',
                  data: { id: slot.id },
                  extra: { addToHistory: true },
                });
              }}
            >
              View Item
            </Button>
          </Group>
          <RichText>{slot.upgrade?.description}</RichText>
        </>
      ))}
    </>
  );
}
