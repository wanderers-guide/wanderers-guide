import { isItemWithPropertyRunes, isItemWithUpgrades } from '@items/inv-utils';
import { Box, Button, Divider, Group, Text } from '@mantine/core';
import { Item } from '@typing/content';
import RichText from './RichText';
import { useRecoilState } from 'recoil';
import { drawerState } from '@atoms/navAtoms';

export function ItemRunesDescription(props: { item: Item }) {
  const [_drawer, openDrawer] = useRecoilState(drawerState);
  const { item } = props;

  if (!isItemWithPropertyRunes(item)) {
    return <></>;
  }

  const runes = item.meta_data?.runes?.property || [];
  runes.sort((a, b) => a.name.localeCompare(b.name));

  return (
    <>
      <Divider mb='sm' />
      {runes.map((rune, index) => (
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
