import { getWeaponStats, parseOtherDamage } from '@items/weapon-handler';
import { Accordion, Box, Divider, Group, HoverCard, Kbd, Text, Title, useMantineTheme } from '@mantine/core';
import { IconMathSymbols } from '@tabler/icons-react';
import { Item } from '@typing/content';
import { StoreID } from '@typing/variables';
import { sign } from '@utils/numbers';

export function StatWeaponDrawerTitle(props: { data: { id: StoreID; item: Item } }) {
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

export function StatWeaponDrawerContent(props: { data: { id: StoreID; item: Item } }) {
  const stats = getWeaponStats(props.data.id, props.data.item);
  const theme = useMantineTheme();

  return (
    <Box>
      <Accordion variant='separated' defaultValue={'attack-breakdown'}>
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

        <Accordion.Item value='damage-breakdown'>
          <Accordion.Control icon={<IconMathSymbols size='1rem' />}>Damage Breakdown</Accordion.Control>
          <Accordion.Panel>
            <Group gap={8} align='center'>
              <Group gap={0} align='center'>
                {/* Dice Amount */}
                <Group gap={8} align='center'>
                  <HoverCard shadow='md' openDelay={250} width={230} position='bottom' zIndex={10000} withArrow>
                    <HoverCard.Target>
                      <Kbd style={{ cursor: 'pointer' }}>{stats.damage.dice}</Kbd>
                    </HoverCard.Target>
                    <HoverCard.Dropdown py={5} px={10}>
                      <Text c='gray.0' size='xs'>
                        {'This is the amount of dice you roll when rolling for damage.'}
                      </Text>
                    </HoverCard.Dropdown>
                  </HoverCard>
                </Group>
                {/* Dice Type */}
                <Group gap={8} align='center'>
                  <HoverCard shadow='md' openDelay={250} width={230} position='bottom' zIndex={10000} withArrow>
                    <HoverCard.Target>
                      <Kbd style={{ cursor: 'pointer' }}>{stats.damage.die}</Kbd>
                    </HoverCard.Target>
                    <HoverCard.Dropdown py={5} px={10}>
                      <Text c='gray.0' size='xs'>
                        {'This is the type of die you roll for damage, such as d4, d6, d8, etc.'}
                      </Text>
                    </HoverCard.Dropdown>
                  </HoverCard>
                </Group>
              </Group>

              {stats.damage.bonus.total !== 0 && ' + '}

              {/* Damage Bonus */}
              {[...stats.damage.bonus.parts.keys()].map((part, index) => (
                <Group gap={8} align='center' key={index}>
                  <HoverCard shadow='md' openDelay={250} width={230} position='bottom' zIndex={10000} withArrow>
                    <HoverCard.Target>
                      <Kbd style={{ cursor: 'pointer' }}>{stats.damage.bonus.parts.get(part)}</Kbd>
                    </HoverCard.Target>
                    <HoverCard.Dropdown py={5} px={10}>
                      <Text c='gray.0' size='xs'>
                        {part}
                      </Text>
                    </HoverCard.Dropdown>
                  </HoverCard>
                  {index < [...stats.damage.bonus.parts.keys()].length - 1 ? '+' : ''}
                </Group>
              ))}

              {/* Damage Type */}
              <Group gap={8} align='center'>
                <HoverCard shadow='md' openDelay={250} width={230} position='bottom' zIndex={10000} withArrow>
                  <HoverCard.Target>
                    <Kbd style={{ cursor: 'pointer' }}>{stats.damage.damageType}</Kbd>
                  </HoverCard.Target>
                  <HoverCard.Dropdown py={5} px={10}>
                    <Text c='gray.0' size='xs'>
                      {
                        'The type of damage this weapon deals. The acronyms for bludgeoning, slashing, and piercing are B, S, and P, respectively. Some types of damage, such as vitality or spirit damage, have special rules associated with them (see Player Core pg. 407).'
                      }
                    </Text>
                  </HoverCard.Dropdown>
                </HoverCard>
              </Group>

              {/* Other Damage */}
              {stats.damage.other.length > 0 && (
                <Group gap={8} align='center'>
                  {' + '}
                  {stats.damage.other.map((part, index) => (
                    <Group gap={8} align='center' key={index}>
                      <HoverCard shadow='md' openDelay={250} width={230} position='bottom' zIndex={10000} withArrow>
                        <HoverCard.Target>
                          <Kbd style={{ cursor: 'pointer' }}>{parseOtherDamage([part], '')}</Kbd>
                        </HoverCard.Target>
                        <HoverCard.Dropdown py={5} px={10}>
                          <Text c='gray.0' size='xs'>
                            {'This weapon deals additional damage from the following:'}
                          </Text>
                          <Divider my={2} />
                          <Text c='gray.0' size='xs'>
                            {part.source ?? 'Unknown source'}
                          </Text>
                        </HoverCard.Dropdown>
                      </HoverCard>
                      {index < stats.damage.other.length - 1 ? '+' : ''}
                    </Group>
                  ))}
                </Group>
              )}

              {/* Extra Damage */}
              {stats.damage.extra && (
                <Group gap={8} align='center'>
                  {' + '}
                  <Group gap={8} align='center'>
                    <HoverCard shadow='md' openDelay={250} width={230} position='bottom' zIndex={10000} withArrow>
                      <HoverCard.Target>
                        <Kbd style={{ cursor: 'pointer' }}>{stats.damage.extra}</Kbd>
                      </HoverCard.Target>
                      <HoverCard.Dropdown py={5} px={10}>
                        <Text c='gray.0' size='xs'>
                          {'This weapon deals extra damage from a custom adjustment to the item.'}
                        </Text>
                      </HoverCard.Dropdown>
                    </HoverCard>
                  </Group>
                </Group>
              )}
            </Group>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </Box>
  );
}
