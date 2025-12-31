import { characterState } from '@atoms/characterAtoms';
import RichText from '@common/RichText';
import { getAcParts } from '@items/armor-handler';
import { getBestArmor } from '@items/inv-utils';
import { Title, Text, Group, Divider, Box, Accordion, Kbd, HoverCard, List, Button } from '@mantine/core';
import { IconBlockquote, IconMathSymbols } from '@tabler/icons-react';
import { Inventory, InventoryItem } from '@typing/content';
import { StoreID } from '@typing/variables';
import { sign } from '@utils/numbers';
import { getFinalAcValue, getVariableBreakdown } from '@variables/variable-helpers';
import { useRecoilValue } from 'recoil';

export function StatAcDrawerTitle(props: {
  data: { id: StoreID; inventory?: Inventory; onViewItem?: (invItem: InventoryItem) => void };
}) {
  const _character = useRecoilValue(characterState);
  const inventory = props.data.inventory ?? _character?.inventory;

  const bestArmor = getBestArmor(props.data.id, inventory);

  const itemName = bestArmor?.item.name ?? 'Unarmored';

  return (
    <>
      <Group justify='space-between' wrap='nowrap'>
        <Group wrap='nowrap' gap={10}>
          <Box>
            <Title order={3}>AC: {itemName}</Title>
          </Box>
        </Group>
        <Box>
          {bestArmor && (
            <Button
              variant='light'
              size='compact-xs'
              radius='xl'
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                props.data.onViewItem?.(bestArmor);
              }}
            >
              View Item
            </Button>
          )}
        </Box>
      </Group>
    </>
  );
}

export function StatAcDrawerContent(props: { data: { id: StoreID; inventory?: Inventory } }) {
  const _character = useRecoilValue(characterState);
  const inventory = props.data.inventory ?? _character?.inventory;

  const bestArmor = getBestArmor(props.data.id, inventory);

  const parts = getAcParts(props.data.id, bestArmor?.item);
  const armorName = bestArmor?.item.name ?? 'nothing';

  const acBonusParts = getVariableBreakdown(props.data.id, 'AC_BONUS')!;

  return (
    <Box>
      <Accordion variant='separated' defaultValue=''>
        <Accordion.Item value='description'>
          <Accordion.Control icon={<IconBlockquote size='1rem' />}>Description</Accordion.Control>
          <Accordion.Panel>
            <RichText ta='justify' store={props.data.id}>
              Armor Class represents how difficult this individual is to hit and damage in combat. This metric is the
              combination of their ability to dodge, their natural toughness, and the protection provided by their
              armor.
            </RichText>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value='breakdown'>
          <Accordion.Control icon={<IconMathSymbols size='1rem' />}>Breakdown</Accordion.Control>
          <Accordion.Panel>
            <Group gap={8} align='center'>
              {getFinalAcValue(props.data.id, bestArmor?.item)} ={' '}
              <>
                <>10 + </>
                <HoverCard shadow='md' openDelay={250} width={230} position='bottom' zIndex={10000} withArrow>
                  <HoverCard.Target>
                    <Kbd style={{ cursor: 'pointer' }}>{parts.profBonus}</Kbd>
                  </HoverCard.Target>
                  <HoverCard.Dropdown py={5} px={10}>
                    <Text c='gray.0' size='xs'>
                      Your proficiency bonus from wearing {armorName}.
                    </Text>
                  </HoverCard.Dropdown>
                </HoverCard>
              </>
              <>
                +
                <HoverCard shadow='md' openDelay={250} width={230} position='bottom' zIndex={10000} withArrow>
                  <HoverCard.Target>
                    <Kbd style={{ cursor: 'pointer' }}>{parts.dexBonus}</Kbd>
                  </HoverCard.Target>
                  <HoverCard.Dropdown py={5} px={10}>
                    <Text c='gray.0' size='xs'>
                      Your Armor Class is associated with the Dexterity attribute, so you add your Dexterity modifier
                      (with a maximum benefit determined by the armor's Dex Cap).
                    </Text>
                  </HoverCard.Dropdown>
                </HoverCard>
              </>
              <>
                +
                <HoverCard shadow='md' openDelay={250} width={230} position='bottom' zIndex={10000} withArrow>
                  <HoverCard.Target>
                    <Kbd style={{ cursor: 'pointer' }}>{parts.armorBonus}</Kbd>
                  </HoverCard.Target>
                  <HoverCard.Dropdown py={5} px={10}>
                    <Text c='gray.0' size='xs'>
                      The item bonus provided by the armor you're wearing.
                    </Text>
                  </HoverCard.Dropdown>
                </HoverCard>
              </>
              {acBonusParts.baseValue !== 0 && (
                <>
                  +
                  <HoverCard shadow='md' openDelay={250} width={230} position='bottom' zIndex={10000} withArrow>
                    <HoverCard.Target>
                      <Kbd style={{ cursor: 'pointer' }}>{acBonusParts.baseValue}</Kbd>
                    </HoverCard.Target>
                    <HoverCard.Dropdown py={5} px={10}>
                      <Text c='gray.0' size='xs'>
                        An additional base modifier adjusting your Armor Class.
                      </Text>
                    </HoverCard.Dropdown>
                  </HoverCard>
                </>
              )}
              {[...acBonusParts.bonuses.entries()].map(([key, bonus], index) => (
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
              {acBonusParts.conditionals.length > 0 && (
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
                          {acBonusParts.conditionals.map((item, i) => (
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
      </Accordion>
    </Box>
  );
}
