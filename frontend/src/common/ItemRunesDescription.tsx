import {
  FUNDAMENTAL_RUNES,
  isItemArmor,
  isItemWeapon,
  isItemWithPropertyRunes,
  isItemWithRunes,
  isItemWithUpgrades,
} from '@items/inv-utils';
import { Box, Button, Divider, Group, Text } from '@mantine/core';
import { Item } from '@schemas/content';
import RichText from './RichText';
import { useAtom } from 'jotai';
import { drawerState } from '@atoms/navAtoms';
import { useQuery } from '@tanstack/react-query';
import { fetchContentById } from '@content/content-store';

export function ItemRunesDescription({ item }: { item: Item }) {
  const [_drawer, openDrawer] = useAtom(drawerState);

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

      // A successful lookup can still be empty when a rune is unavailable.
      const items: Item[] = results
        .filter((r): r is PromiseFulfilledResult<Item> => r.status === 'fulfilled' && r.value !== null)
        .map((r) => r.value);

      return items;
    },
    enabled: isItemWithRunes(item),
  });

  if (!isItemWithRunes(item)) {
    return <></>;
  }

  const fundamentalRunes = data || [];

  // For old broken item runes, we just return null to not show anything in order to avoid the page from breaking.
  if (
    item.meta_data?.runes?.property &&
    item.meta_data.runes.property.length > 0 &&
    item.meta_data.runes.property.every((s) => typeof s === 'string')
  ) {
    return null;
  }
  const propertyRunes = (item.meta_data?.runes?.property || []).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <>
      {propertyRunes.length > 0 && (
        <Box pb={10}>
          <Divider mb='sm' label='Property Runes' />
          {propertyRunes.map((rune, index) => (
            <Box key={index}>
              {index > 0 && <Divider my='sm' />}
              <Group align='start' justify='space-between' pb={2}>
                <Box>
                  <Text fw={600} c='gray.2' span>
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
                      data: { id: rune.id, item: rune.rune },
                      extra: { addToHistory: true },
                    });
                  }}
                >
                  View Item
                </Button>
              </Group>
              <RichText>{rune.rune?.description}</RichText>
            </Box>
          ))}
        </Box>
      )}

      {fundamentalRunes.length > 0 && (
        <Box>
          <Divider mb='sm' label='Fundamental Runes' />
          {fundamentalRunes.map((rune, index) => (
            <Box key={index}>
              {index > 0 && <Divider my='sm' />}
              <Group align='start' justify='space-between' pb={2}>
                <Box>
                  <Text fw={600} c='gray.2' span>
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
            </Box>
          ))}
        </Box>
      )}
    </>
  );
}

/** Displays counted upgrades and fixed built-ins without modifying their saved reference arrays. */
export function ItemUpgradesDescription(props: { item: Item; builtInOnly?: boolean }) {
  const [_drawer, openDrawer] = useAtom(drawerState);
  const { item } = props;

  const slots = !props.builtInOnly && isItemWithUpgrades(item) ? [...(item.meta_data?.starfinder?.slots ?? [])] : [];
  const builtIns = [...(item.meta_data?.starfinder?.built_in_upgrades ?? [])];
  if (slots.length === 0 && builtIns.length === 0) {
    return <></>;
  }

  slots.sort((a, b) => a.name.localeCompare(b.name));
  const renderReferences = (references: { name: string; id: number; upgrade?: Item }[], fixed = false) =>
    references.map((slot, index) => (
      <Box key={index}>
        {index > 0 && <Divider my='sm' />}
        <Group align='start' justify='space-between' pb={2}>
          <Box>
            <Text fw={600} c={fixed ? undefined : 'gray.2'} span>
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
                // Fixed snapshots can retain source-specific configuration, such as electricity.
                data: fixed && slot.upgrade?.id === slot.id ? { item: slot.upgrade } : { id: slot.id },
                extra: { addToHistory: true },
              });
            }}
          >
            View Item
          </Button>
        </Group>
        <RichText>{slot.upgrade?.description}</RichText>
      </Box>
    ));

  return (
    <>
      {slots.length > 0 && (
        <>
          <Divider mb='sm' />
          {renderReferences(slots)}
        </>
      )}
      {builtIns.length > 0 && (
        <>
          <Divider mb='sm' label='Built-in Upgrades' />
          {renderReferences(builtIns, true)}
        </>
      )}
    </>
  );
}
