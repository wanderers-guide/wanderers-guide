import { Title, Text, Group, Divider, Box, Accordion, Kbd, HoverCard, List } from '@mantine/core';
import { IconMathSymbols } from '@tabler/icons-react';
import { StoreID } from '@schemas/variables';
import { sign } from '@utils/numbers';
import { displayFinalHealthValue } from '@variables/variable-display';
import {
  getFinalResolveValue,
  getFinalStaminaValue,
  getHealthValueParts,
  getResolveAttribute,
  isStaminaVariant,
} from '@variables/variable-helpers';
import { variableToLabel } from '@variables/variable-utils';
import { getVariable } from '@variables/variable-manager';

export function StatHealthDrawerTitle(props: { data: { id: StoreID } }) {
  return (
    <>
      <Group justify='space-between' wrap='nowrap'>
        <Group wrap='nowrap' gap={10}>
          <Box>
            <Title order={3}>Hit Points</Title>
          </Box>
        </Group>
        <Box></Box>
      </Group>
    </>
  );
}

export function StatHealthDrawerContent(props: { data: { id: StoreID } }) {
  const parts = getHealthValueParts(props.data.id);

  // Stamina variant: half class HP (and no Con) goes to HP; the rest becomes stamina.
  const staminaVariant = isStaminaVariant(props.data.id);
  const halfClassHp = Math.floor(parts.classHp / 2);

  return (
    <Box>
      <Accordion variant='separated' defaultValue='breakdown'>
        <Accordion.Item value='breakdown'>
          <Accordion.Control icon={<IconMathSymbols size='1rem' />}>Breakdown</Accordion.Control>
          <Accordion.Panel>
            <Group gap={8} wrap='nowrap' align='center'>
              {displayFinalHealthValue(props.data.id)} ={' ('}
              <HoverCard shadow='md' openDelay={250} width={230} position='bottom' zIndex={10000} withArrow>
                <HoverCard.Target>
                  <Kbd style={{ cursor: 'pointer' }}>{staminaVariant ? halfClassHp : parts.classHp}</Kbd>
                </HoverCard.Target>
                <HoverCard.Dropdown py={5} px={10}>
                  <Text c='gray.0' size='xs'>
                    {staminaVariant
                      ? `This is the base hit points from your class, halved for the stamina variant. You gain this amount every level (the other half becomes stamina points).`
                      : `This is the base hit points from your class. You gain this amount every level.`}
                  </Text>
                </HoverCard.Dropdown>
              </HoverCard>
              {!staminaVariant && (
                <>
                  +
                  <HoverCard shadow='md' openDelay={250} width={230} position='bottom' zIndex={10000} withArrow>
                    <HoverCard.Target>
                      <Kbd style={{ cursor: 'pointer' }}>{parts.conMod}</Kbd>
                    </HoverCard.Target>
                    <HoverCard.Dropdown py={5} px={10}>
                      <Text c='gray.0' size='xs'>
                        You add your Constitution modifier to the hit points you gain every level.
                      </Text>
                    </HoverCard.Dropdown>
                  </HoverCard>
                </>
              )}
              {') × '}
              <HoverCard shadow='md' openDelay={250} width={230} position='bottom' zIndex={10000} withArrow>
                <HoverCard.Target>
                  <Kbd style={{ cursor: 'pointer' }}>{parts.level}</Kbd>
                </HoverCard.Target>
                <HoverCard.Dropdown py={5} px={10}>
                  <Text c='gray.0' size='xs'>
                    This is your current level.
                  </Text>
                </HoverCard.Dropdown>
              </HoverCard>
              {' + '}
              <HoverCard shadow='md' openDelay={250} width={230} position='bottom' zIndex={10000} withArrow>
                <HoverCard.Target>
                  <Kbd style={{ cursor: 'pointer' }}>{parts.ancestryHp}</Kbd>
                </HoverCard.Target>
                <HoverCard.Dropdown py={5} px={10}>
                  <Text c='gray.0' size='xs'>
                    This is the base hit points from your ancestry. You gain this amount once at level 1.
                  </Text>
                </HoverCard.Dropdown>
              </HoverCard>
              {parts.bonusHp > 0 && parts.breakdown.bonusValue === 0 && (
                <>
                  {' + '}
                  <HoverCard shadow='md' openDelay={250} width={230} position='bottom' zIndex={10000} withArrow>
                    <HoverCard.Target>
                      <Kbd style={{ cursor: 'pointer' }}>{parts.bonusHp}</Kbd>
                    </HoverCard.Target>
                    <HoverCard.Dropdown py={5} px={10}>
                      <Text c='gray.0' size='xs'>
                        This is additional hit points you've gained from various sources.
                      </Text>
                    </HoverCard.Dropdown>
                  </HoverCard>
                </>
              )}
              {[...parts.breakdown.bonuses.entries()].map(([key, bonus], index) => (
                <>
                  +
                  <HoverCard shadow='md' openDelay={250} width={230} position='bottom' zIndex={10000} withArrow>
                    <HoverCard.Target>
                      <Kbd style={{ cursor: 'pointer' }}>{bonus.value}</Kbd>
                    </HoverCard.Target>
                    <HoverCard.Dropdown py={5} px={10}>
                      <Text c='gray.0' size='xs'>
                        {key.startsWith('untyped ')
                          ? `Additional untyped modifiers:`
                          : `Your ${key}. Use the greatest from the following:`}
                        <Divider pb={5} />
                        <List size='xs'>
                          {bonus.composition.map((item, i) => (
                            <List.Item key={i}>
                              {sign(item.amount)}{' '}
                              <Text pl={5} c='dimmed' span>
                                {'['}from {item.source}
                                {']'}
                              </Text>
                            </List.Item>
                          ))}
                        </List>
                      </Text>
                    </HoverCard.Dropdown>
                  </HoverCard>
                </>
              ))}
              {parts.breakdown.conditionals.length > 0 && (
                <>
                  +
                  <HoverCard shadow='md' openDelay={250} width={230} position='bottom' zIndex={10000} withArrow>
                    <HoverCard.Target>
                      <Kbd style={{ cursor: 'pointer' }} c='guide.5'>
                        *
                      </Kbd>
                    </HoverCard.Target>
                    <HoverCard.Dropdown py={5} px={10}>
                      <Text c='gray.0' size='xs'>
                        You have some conditionals! These will only apply situationally:
                        <Divider pb={5} />
                        <List size='xs'>
                          {parts.breakdown.conditionals.map((item, i) => (
                            <List.Item key={i}>
                              {item.text}
                              <br />
                              <Text c='dimmed' span>
                                {'['}from {item.source}
                                {']'}
                              </Text>
                            </List.Item>
                          ))}
                        </List>
                      </Text>
                    </HoverCard.Dropdown>
                  </HoverCard>
                </>
              )}
            </Group>
          </Accordion.Panel>
        </Accordion.Item>
        {/* Stamina variant pools — shown only when the variant is enabled */}
        {staminaVariant && (
          <Accordion.Item value='stamina'>
            <Accordion.Control icon={<IconMathSymbols size='1rem' />}>Stamina Breakdown</Accordion.Control>
            <Accordion.Panel>
              <Group gap={8} wrap='nowrap' align='center'>
                <Text span>{getFinalStaminaValue(props.data.id)}</Text> ={' ('}
                <HoverCard shadow='md' openDelay={250} width={230} position='bottom' zIndex={10000} withArrow>
                  <HoverCard.Target>
                    <Kbd style={{ cursor: 'pointer' }}>{halfClassHp}</Kbd>
                  </HoverCard.Target>
                  <HoverCard.Dropdown py={5} px={10}>
                    <Text c='gray.0' size='xs'>
                      This is half the base hit points from your class. You gain this amount of stamina points every
                      level.
                    </Text>
                  </HoverCard.Dropdown>
                </HoverCard>
                +
                <HoverCard shadow='md' openDelay={250} width={230} position='bottom' zIndex={10000} withArrow>
                  <HoverCard.Target>
                    <Kbd style={{ cursor: 'pointer' }}>{parts.conMod}</Kbd>
                  </HoverCard.Target>
                  <HoverCard.Dropdown py={5} px={10}>
                    <Text c='gray.0' size='xs'>
                      You add your Constitution modifier to the stamina points you gain every level.
                    </Text>
                  </HoverCard.Dropdown>
                </HoverCard>
                {') × '}
                <HoverCard shadow='md' openDelay={250} width={230} position='bottom' zIndex={10000} withArrow>
                  <HoverCard.Target>
                    <Kbd style={{ cursor: 'pointer' }}>{parts.level}</Kbd>
                  </HoverCard.Target>
                  <HoverCard.Dropdown py={5} px={10}>
                    <Text c='gray.0' size='xs'>
                      This is your current level.
                    </Text>
                  </HoverCard.Dropdown>
                </HoverCard>
              </Group>
            </Accordion.Panel>
          </Accordion.Item>
        )}
        {staminaVariant && (
          <Accordion.Item value='resolve'>
            <Accordion.Control icon={<IconMathSymbols size='1rem' />}>Resolve Breakdown</Accordion.Control>
            <Accordion.Panel>
              <Group gap={8} wrap='nowrap' align='center'>
                <Text span>{getFinalResolveValue(props.data.id)}</Text> =
                <HoverCard shadow='md' openDelay={250} width={230} position='bottom' zIndex={10000} withArrow>
                  <HoverCard.Target>
                    <Kbd style={{ cursor: 'pointer' }}>
                      {(() => {
                        // Label the key attribute the resolve pool is based on (e.g. "Strength")
                        const attributeName = getResolveAttribute(props.data.id);
                        const attribute = attributeName ? getVariable(props.data.id, attributeName) : null;
                        return attribute ? variableToLabel(attribute) : 'Key Attribute';
                      })()}
                    </Kbd>
                  </HoverCard.Target>
                  <HoverCard.Dropdown py={5} px={10}>
                    <Text c='gray.0' size='xs'>
                      Your maximum resolve points equal your class's key attribute modifier. Spend 1 resolve point to
                      Take a Breather (10 minutes) and restore all your stamina points.
                    </Text>
                  </HoverCard.Dropdown>
                </HoverCard>
              </Group>
            </Accordion.Panel>
          </Accordion.Item>
        )}
      </Accordion>
    </Box>
  );
}
