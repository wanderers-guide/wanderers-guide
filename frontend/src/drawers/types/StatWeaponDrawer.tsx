import { getWeaponStats } from '@items/weapon-handler';
import { Title, Text, Group, Box, Accordion, Kbd, HoverCard } from '@mantine/core';
import { IconMathSymbols } from '@tabler/icons-react';
import { Item } from '@typing/content';
import { sign } from '@utils/numbers';
import * as _ from 'lodash-es';

export function StatWeaponDrawerTitle(props: { data: { item: Item } }) {
  return (
    <>
      {
        <Group justify='space-between' wrap='nowrap'>
          <Group wrap='nowrap' gap={10}>
            <Box>
              <Title order={3}>{props.data.item.name}</Title>
            </Box>
          </Group>
          <Box></Box>
        </Group>
      }
    </>
  );
}

export function StatWeaponDrawerContent(props: { data: { item: Item } }) {
  const stats = getWeaponStats('CHARACTER', props.data.item);

  return (
    <Box>
      <Accordion variant='separated' defaultValue='attack-breakdown'>
        <Accordion.Item value='attack-breakdown'>
          <Accordion.Control icon={<IconMathSymbols size='1rem' />}>Attack Breakdown</Accordion.Control>
          <Accordion.Panel>
            <Group gap={8} align='center'>
              {sign(stats.attack_bonus.total[0])} =
              {[...stats.attack_bonus.parts.keys()].map((part, index) => (
                <Group gap={8} align='center' key={index}>
                  <HoverCard shadow='md' openDelay={250} width={230} position='bottom' zIndex={10000} withArrow>
                    <HoverCard.Target>
                      <Kbd style={{ cursor: 'pointer' }}>{stats.attack_bonus.parts.get(part)}</Kbd>
                    </HoverCard.Target>
                    <HoverCard.Dropdown py={5} px={10}>
                      <Text c='gray.0' size='xs'>
                        {part}
                      </Text>
                    </HoverCard.Dropdown>
                  </HoverCard>
                  {index < [...stats.attack_bonus.parts.keys()].length - 1 ? '+' : ''}
                </Group>
              ))}
            </Group>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </Box>
  );
}
