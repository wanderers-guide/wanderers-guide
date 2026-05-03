import RichText from '@common/RichText';
import { Title, Text, Group, Stack, Box, Badge, Accordion, List } from '@mantine/core';
import { convertToHardcodedLink } from '@content/hardcoded-links';
import { StoreID, VariableListStr } from '@schemas/variables';
import { displayResistWeak, getResistWeaks } from '@utils/resist-weaks';
import { getVariable } from '@variables/variable-manager';

export function StatResistWeakDrawerTitle(props: { data: { id: StoreID } }) {
  return (
    <>
      {
        <Group justify='space-between' wrap='nowrap'>
          <Group wrap='nowrap' gap={10}>
            <Box>
              <Title order={3}>Resistances & Weaknesses</Title>
            </Box>
          </Group>
        </Group>
      }
    </>
  );
}

export function StatResistWeakDrawerContent(props: { data: { id: StoreID } }) {
  const resists = getResistWeaks(props.data.id, 'RESISTANCES');
  const weaks = getResistWeaks(props.data.id, 'WEAKNESSES');
  const immuneVar = getVariable<VariableListStr>(props.data.id, 'IMMUNITIES');

  return (
    <>
      <Stack gap={10}>
        <Box>
          <Title order={4}>Resistances</Title>
          <Accordion
            variant='separated'
            defaultValue='options'
            styles={{
              label: {
                paddingTop: 5,
                paddingBottom: 5,
              },
              control: {
                paddingLeft: 13,
                paddingRight: 13,
              },
              item: {
                marginTop: 0,
                marginBottom: 5,
              },
            }}
          >
            <Accordion.Item value='description'>
              <Accordion.Control>
                <Group wrap='nowrap' justify='space-between' gap={0}>
                  <Text c='gray.2' fw={700} fz='sm'>
                    Description
                  </Text>
                </Group>
              </Accordion.Control>
              <Accordion.Panel>
                <RichText ta='justify' store={props.data.id}>
                  {`If you have resistance to a type of damage, each time you take that type of damage, reduce the amount of damage you take by the listed number (to a minimum of 0 damage).
A single effect can activate more than one resistance at a time, but subtracts each of the subject’s resistances only once. If the subject has more than one resistance to the same damage type, they apply only one, usually the highest. For a resistance to a category including multiple damage types, like resistance to ${convertToHardcodedLink('trait', 'physical')} damage, to ${convertToHardcodedLink('trait', 'spell', 'spells')}, or to all damage, if the subject is taking damage of multiple types included in the category, the subject can choose which damage type to use the resistance against.`}
                </RichText>
              </Accordion.Panel>
            </Accordion.Item>
            <Accordion.Item value='options'>
              <Accordion.Control>
                <Group wrap='nowrap' justify='space-between' gap={0}>
                  <Text c='gray.2' fw={700} fz='sm'>
                    Active
                  </Text>
                  <Badge mr='sm' variant='outline' color='gray.5' size='xs'>
                    <Text fz='sm' c='gray.2' span>
                      {resists.length}
                    </Text>
                  </Badge>
                </Group>
              </Accordion.Control>
              <Accordion.Panel>
                <List>
                  {resists.map((opt, index) => (
                    <List.Item key={index}>
                      <Text c='gray.2' size='md' span>
                        {opt}
                      </Text>
                    </List.Item>
                  ))}
                  {resists.length === 0 && (
                    <Text fz='sm' c='dimmed' ta='center' fs='italic'>
                      No resistances found.
                    </Text>
                  )}
                </List>
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>
        </Box>
        <Box>
          <Title order={4}>Weaknesses</Title>
          <Accordion
            variant='separated'
            defaultValue='options'
            styles={{
              label: {
                paddingTop: 5,
                paddingBottom: 5,
              },
              control: {
                paddingLeft: 13,
                paddingRight: 13,
              },
              item: {
                marginTop: 0,
                marginBottom: 5,
              },
            }}
          >
            <Accordion.Item value='description'>
              <Accordion.Control>
                <Group wrap='nowrap' justify='space-between' gap={0}>
                  <Text c='gray.2' fw={700} fz='sm'>
                    Description
                  </Text>
                </Group>
              </Accordion.Control>
              <Accordion.Panel>
                <RichText ta='justify' store={props.data.id}>
                  {`If you have a weakness to a certain type of damage, that type of damage is extra effective against you. Whenever you would take that type of damage, increase the amount of damage by the value of the weakness. For instance, if you are dealt 2d6 ${convertToHardcodedLink('trait', 'fire')} damage and have weakness 5 to ${convertToHardcodedLink('trait', 'fire')}, you take 2d6+5 ${convertToHardcodedLink('trait', 'fire')} damage.
A single effect can activate more than one weakness at a time, but adds each of the subject’s weaknesses only once. For example, if you made a ${convertToHardcodedLink('action', 'Strike')} with a flaming ${convertToHardcodedLink('trait', 'cold iron')} battle axe benefiting from a spell that gives it additional ${convertToHardcodedLink('trait', 'fire')} damage, and you targeted a creature with weakness to ${convertToHardcodedLink('trait', 'cold iron')}, ${convertToHardcodedLink('trait', 'fire')}, and ${convertToHardcodedLink('trait', 'slashing')}, the Strike would benefit from all three weaknesses but wouldn’t apply the fire weakness twice.
Some weaknesses can apply when a creature wouldn’t normally take damage, as determined by the GM. In such cases, you take damage equal to the weakness value when touched or affected by something with that characteristic. For example, a creature with weakness to ${convertToHardcodedLink('trait', 'water')} would take extra damage if it were targeted by a spell with the ${convertToHardcodedLink('trait', 'water')} trait or splashed with ${convertToHardcodedLink('trait', 'water')}.`}
                </RichText>
              </Accordion.Panel>
            </Accordion.Item>
            <Accordion.Item value='options'>
              <Accordion.Control>
                <Group wrap='nowrap' justify='space-between' gap={0}>
                  <Text c='gray.2' fw={700} fz='sm'>
                    Active
                  </Text>
                  <Badge mr='sm' variant='outline' color='gray.5' size='xs'>
                    <Text fz='sm' c='gray.2' span>
                      {weaks.length}
                    </Text>
                  </Badge>
                </Group>
              </Accordion.Control>
              <Accordion.Panel>
                <List>
                  {weaks.map((opt, index) => (
                    <List.Item key={index}>
                      <Text c='gray.2' size='md' span>
                        {opt}
                      </Text>
                    </List.Item>
                  ))}
                  {weaks.length === 0 && (
                    <Text fz='sm' c='dimmed' ta='center' fs='italic'>
                      No weaknesses found.
                    </Text>
                  )}
                </List>
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>
        </Box>
        <Box>
          <Title order={4}>Immunities</Title>
          <Accordion
            variant='separated'
            defaultValue='options'
            styles={{
              label: {
                paddingTop: 5,
                paddingBottom: 5,
              },
              control: {
                paddingLeft: 13,
                paddingRight: 13,
              },
              item: {
                marginTop: 0,
                marginBottom: 5,
              },
            }}
          >
            <Accordion.Item value='description'>
              <Accordion.Control>
                <Group wrap='nowrap' justify='space-between' gap={0}>
                  <Text c='gray.2' fw={700} fz='sm'>
                    Description
                  </Text>
                </Group>
              </Accordion.Control>
              <Accordion.Panel>
                <RichText ta='justify' store={props.data.id}>
                  {`When you have immunity to a specific type of damage, you ignore all damage of that type. If you have immunity to a specific condition or type of effect, you can’t be affected by that condition or any effect of that type. You can still be targeted by an ability that includes an effect or condition you are immune to; you just don’t apply that particular effect or condition.
If you have immunity to effects with a certain trait (such as ${convertToHardcodedLink('trait', 'death')} effects, ${convertToHardcodedLink('trait', 'poison')}, or ${convertToHardcodedLink('trait', 'disease')}), you are unaffected by effects with that trait. An immunity might match both a trait and a damage type (such as ${convertToHardcodedLink('trait', 'electricity')}). The immunity applies to effects with the trait as well as damage of that type. Some complex effects might have parts that affect you even if you’re immune to one of the effect’s traits; for instance, a creature immune to ${convertToHardcodedLink('trait', 'death')} effects wouldn’t ignore the ${convertToHardcodedLink('trait', 'poison')} damage or concealed condition from a toxic cloud spell.`}
                </RichText>
              </Accordion.Panel>
            </Accordion.Item>
            <Accordion.Item value='options'>
              <Accordion.Control>
                <Group wrap='nowrap' justify='space-between' gap={0}>
                  <Text c='gray.2' fw={700} fz='sm'>
                    Active
                  </Text>
                  <Badge mr='sm' variant='outline' color='gray.5' size='xs'>
                    <Text fz='sm' c='gray.2' span>
                      {immuneVar?.value.length}
                    </Text>
                  </Badge>
                </Group>
              </Accordion.Control>
              <Accordion.Panel>
                <List>
                  {immuneVar?.value.map((opt, index) => (
                    <List.Item key={index}>
                      <Text c='gray.2' size='md' span>
                        {displayResistWeak(props.data.id, opt)}
                      </Text>
                    </List.Item>
                  ))}
                  {immuneVar?.value.length === 0 && (
                    <Text fz='sm' c='dimmed' ta='center' fs='italic'>
                      No immunities found.
                    </Text>
                  )}
                </List>
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>
        </Box>
      </Stack>
    </>
  );
}
