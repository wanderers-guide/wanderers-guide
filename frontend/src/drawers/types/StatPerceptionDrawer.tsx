import { drawerState } from '@atoms/navAtoms';
import { ActionSymbol } from '@common/Actions';
import IndentedText from '@common/IndentedText';
import RichText from '@common/RichText';
import TraitsDisplay from '@common/TraitsDisplay';
import { ActionSelectionOption, FeatSelectionOption } from '@common/select/SelectContent';
import { TEXT_INDENT_AMOUNT } from '@constants/data';
import { collectCharacterSenses } from '@content/collect-content';
import { fetchAbilityBlockByName, fetchContentAll, fetchContentById } from '@content/content-store';
import { convertToHardcodedLink } from '@content/hardcoded-links';
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
  Badge,
  Accordion,
  Kbd,
  Timeline,
  HoverCard,
  List,
  Anchor,
} from '@mantine/core';
import {
  IconBadgesFilled,
  IconBlockquote,
  IconCaretLeftRight,
  IconEye,
  IconFrame,
  IconGitBranch,
  IconGitCommit,
  IconGitPullRequest,
  IconMathSymbols,
  IconMessageDots,
  IconPlusMinus,
  IconTimeline,
} from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { AbilityBlock } from '@typing/content';
import { VariableBool, VariableListStr, VariableProf } from '@typing/variables';
import { sign } from '@utils/numbers';
import { displaySense } from '@utils/senses';
import { toLabel } from '@utils/strings';
import { displayFinalProfValue, getBonusText, getProfValueParts } from '@variables/variable-display';
import { getVariable, getVariableBonuses, getVariableHistory } from '@variables/variable-manager';
import {
  compileProficiencyType,
  getProficiencyTypeValue,
  isProficiencyType,
  isProficiencyValue,
  proficiencyTypeToLabel,
  variableToLabel,
} from '@variables/variable-utils';
import * as _ from 'lodash-es';
import { useMemo } from 'react';
import { useRecoilState } from 'recoil';

export function StatPerceptionDrawerTitle(props: { data: {} }) {
  const variable = getVariable<VariableProf>('CHARACTER', 'PERCEPTION');

  return (
    <>
      {variable && (
        <Group justify='space-between' wrap='nowrap'>
          <Group wrap='nowrap' gap={10}>
            <Box>
              <Title order={3}>{variableToLabel(variable)}</Title>
            </Box>
          </Group>
          <Box>
            <Badge>{proficiencyTypeToLabel(compileProficiencyType(variable.value))}</Badge>
          </Box>
        </Group>
      )}
    </>
  );
}

export function StatPerceptionDrawerContent(props: { data: {} }) {
  const [_drawer, openDrawer] = useRecoilState(drawerState);

  // Collect senses info
  const { data: abilityBlocks } = useQuery({
    queryKey: [`find-ability-blocks`],
    queryFn: async () => {
      return await fetchContentAll<AbilityBlock>('ability-block');
    },
  });
  const senses = useMemo(() => collectCharacterSenses('CHARACTER', abilityBlocks ?? []), [abilityBlocks]);

  const variable = getVariable<VariableProf>('CHARACTER', 'PERCEPTION');
  if (!variable) return null;

  // Breakdown
  const parts = getProfValueParts('CHARACTER', variable.name)!;

  // Timeline
  const history = getVariableHistory('CHARACTER', variable.name);
  const bonuses = getVariableBonuses('CHARACTER', variable.name);

  let timeline: {
    type: 'BONUS' | 'ADJUSTMENT';
    title: string;
    description: string;
    timestamp: number;
  }[] = [];
  for (const hist of history) {
    const from = isProficiencyValue(hist.from) ? proficiencyTypeToLabel(compileProficiencyType(hist.from)) : hist.from;
    const to = isProficiencyValue(hist.to) ? proficiencyTypeToLabel(compileProficiencyType(hist.to)) : hist.to;
    if (from === to) continue;
    timeline.push({
      type: 'ADJUSTMENT',
      title: from ? `${from} → ${to}` : `${to}`,
      description: `From ${hist.source}`,
      timestamp: hist.timestamp,
    });
  }
  for (const bonus of bonuses) {
    timeline.push({
      type: 'BONUS',
      title: getBonusText(bonus),
      description: `From ${bonus.source}`,
      timestamp: bonus.timestamp,
    });
  }
  timeline = timeline.sort((a, b) => a.timestamp - b.timestamp);

  const profWithoutLevel = !!getVariable<VariableBool>('CHARACTER', 'PROF_WITHOUT_LEVEL')?.value;

  return (
    <Box>
      <Accordion variant='separated' defaultValue='senses'>
        <Accordion.Item value='senses'>
          <Accordion.Control icon={<IconEye size='1rem' />}>Senses</Accordion.Control>
          <Accordion.Panel>
            <Stack gap={10}>
              <Box>
                <Title order={4}>Precise</Title>
                <Accordion
                  variant='contained'
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
                      marginBottom: 0,
                    },
                  }}
                >
                  <Accordion.Item value='description'>
                    <Accordion.Control>
                      <Group wrap='nowrap' justify='space-between' gap={0}>
                        <Text c='gray.5' fw={700} fz='sm'>
                          Description
                        </Text>
                      </Group>
                    </Accordion.Control>
                    <Accordion.Panel>
                      <RichText ta='justify' store='CHARACTER'>
                        A precise sense is one that can be used to perceive the world in nuanced detail. The only way to
                        target a creature without having drawbacks is to use a precise sense. You can usually detect a
                        creature automatically with a precise sense unless that creature is hiding or obscured by the
                        environment, in which case you can use the {convertToHardcodedLink('action', 'Seek')} basic
                        action to better detect the creature.
                      </RichText>
                    </Accordion.Panel>
                  </Accordion.Item>
                  <Accordion.Item value='options'>
                    <Accordion.Control>
                      <Group wrap='nowrap' justify='space-between' gap={0}>
                        <Text c='gray.5' fw={700} fz='sm'>
                          Active
                        </Text>
                        <Badge mr='sm' variant='outline' color='gray.5' size='xs'>
                          <Text fz='sm' c='gray.5' span>
                            {senses.precise.length}
                          </Text>
                        </Badge>
                      </Group>
                    </Accordion.Control>
                    <Accordion.Panel>
                      <List>
                        {senses.precise.map((sense, index) => (
                          <List.Item key={index}>
                            {sense.sense ? (
                              <Anchor
                                size='md'
                                onClick={() => {
                                  if (!sense.sense) return;
                                  openDrawer({
                                    type: 'sense',
                                    data: { id: sense.sense.id },
                                    extra: { addToHistory: true },
                                  });
                                }}
                              >
                                {displaySense(sense)}
                              </Anchor>
                            ) : (
                              <Text c='gray.5' size='md' span>
                                {displaySense(sense)}
                              </Text>
                            )}
                          </List.Item>
                        ))}
                        {senses.precise.length === 0 && (
                          <Text fz='sm' c='dimmed' ta='center' fs='italic'>
                            No precise senses found.
                          </Text>
                        )}
                      </List>
                    </Accordion.Panel>
                  </Accordion.Item>
                </Accordion>
              </Box>
              <Box>
                <Title order={4}>Imprecise</Title>
                <Accordion
                  variant='contained'
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
                      marginBottom: 0,
                    },
                  }}
                >
                  <Accordion.Item value='description'>
                    <Accordion.Control>
                      <Group wrap='nowrap' justify='space-between' gap={0}>
                        <Text c='gray.5' fw={700} fz='sm'>
                          Description
                        </Text>
                      </Group>
                    </Accordion.Control>
                    <Accordion.Panel>
                      <RichText ta='justify' store='CHARACTER'>
                        An imprecise sense can't detect the full range of detail that a precise sense can. You can
                        usually sense a creature automatically with an imprecise sense, but it has the hidden condition
                        instead of the observed condition. It might be undetected by you if it's using Stealth or is in
                        an environment that distorts the sense, such as a noisy room in the case of hearing. In those
                        cases, you have to use the {convertToHardcodedLink('action', 'Seek')} basic action to detect the
                        creature. At best, an imprecise sense can be used to make an undetected creature (or one you
                        didn't even know was there) merely hidden—it can't make the creature observed.
                      </RichText>
                    </Accordion.Panel>
                  </Accordion.Item>
                  <Accordion.Item value='options'>
                    <Accordion.Control>
                      <Group wrap='nowrap' justify='space-between' gap={0}>
                        <Text c='gray.5' fw={700} fz='sm'>
                          Active
                        </Text>
                        <Badge mr='sm' variant='outline' color='gray.5' size='xs'>
                          <Text fz='sm' c='gray.5' span>
                            {senses.imprecise.length}
                          </Text>
                        </Badge>
                      </Group>
                    </Accordion.Control>
                    <Accordion.Panel>
                      <List>
                        {senses.imprecise.map((sense, index) => (
                          <List.Item key={index}>
                            {sense.sense ? (
                              <Anchor
                                size='md'
                                onClick={() => {
                                  if (!sense.sense) return;
                                  openDrawer({
                                    type: 'sense',
                                    data: { id: sense.sense.id },
                                    extra: { addToHistory: true },
                                  });
                                }}
                              >
                                {displaySense(sense)}
                              </Anchor>
                            ) : (
                              <Text c='gray.5' size='md' span>
                                {displaySense(sense)}
                              </Text>
                            )}
                          </List.Item>
                        ))}
                        {senses.imprecise.length === 0 && (
                          <Text fz='sm' c='dimmed' ta='center' fs='italic'>
                            No imprecise senses found.
                          </Text>
                        )}
                      </List>
                    </Accordion.Panel>
                  </Accordion.Item>
                </Accordion>
              </Box>
              <Box>
                <Title order={4}>Vague</Title>
                <Accordion
                  variant='contained'
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
                      marginBottom: 0,
                    },
                  }}
                >
                  <Accordion.Item value='description'>
                    <Accordion.Control>
                      <Group wrap='nowrap' justify='space-between' gap={0}>
                        <Text c='gray.5' fw={700} fz='sm'>
                          Description
                        </Text>
                      </Group>
                    </Accordion.Control>
                    <Accordion.Panel>
                      <RichText ta='justify' store='CHARACTER'>
                        A vague sense is one that can alert you that something is there but isn't useful for zeroing in
                        on it to determine exactly what it is. At best, a vague sense can be used to detect the presence
                        of an unnoticed creature, making it undetected. Even then, the vague sense isn't sufficient to
                        make the creature hidden or observed.
                      </RichText>
                    </Accordion.Panel>
                  </Accordion.Item>
                  <Accordion.Item value='options'>
                    <Accordion.Control>
                      <Group wrap='nowrap' justify='space-between' gap={0}>
                        <Text c='gray.5' fw={700} fz='sm'>
                          Active
                        </Text>
                        <Badge mr='sm' variant='outline' color='gray.5' size='xs'>
                          <Text fz='sm' c='gray.5' span>
                            {senses.vague.length}
                          </Text>
                        </Badge>
                      </Group>
                    </Accordion.Control>
                    <Accordion.Panel>
                      <List>
                        {senses.vague.map((sense, index) => (
                          <List.Item key={index}>
                            {sense.sense ? (
                              <Anchor
                                size='md'
                                onClick={() => {
                                  if (!sense.sense) return;
                                  openDrawer({
                                    type: 'sense',
                                    data: { id: sense.sense.id },
                                    extra: { addToHistory: true },
                                  });
                                }}
                              >
                                {displaySense(sense)}
                              </Anchor>
                            ) : (
                              <Text c='gray.5' size='md' span>
                                {displaySense(sense)}
                              </Text>
                            )}
                          </List.Item>
                        ))}
                        {senses.vague.length === 0 && (
                          <Text fz='sm' c='dimmed' ta='center' fs='italic'>
                            No vague senses found.
                          </Text>
                        )}
                      </List>
                    </Accordion.Panel>
                  </Accordion.Item>
                </Accordion>
              </Box>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value='description'>
          <Accordion.Control icon={<IconBlockquote size='1rem' />}>Description</Accordion.Control>
          <Accordion.Panel>
            <RichText ta='justify' store='CHARACTER'>
              An individual's Perception measures their ability to notice things, search for what's hidden, and tell
              whether something about a situation is suspicious.
            </RichText>
          </Accordion.Panel>
        </Accordion.Item>

        {variable.value.attribute && (
          <Accordion.Item value='breakdown'>
            <Accordion.Control icon={<IconMathSymbols size='1rem' />}>Breakdown</Accordion.Control>
            <Accordion.Panel>
              <Group gap={8} align='center'>
                {displayFinalProfValue('CHARACTER', variable.name)} ={' '}
                <HoverCard shadow='md' openDelay={250} width={230} position='bottom' zIndex={10000} withArrow>
                  <HoverCard.Target>
                    <Kbd style={{ cursor: 'pointer' }}>{parts.profValue}</Kbd>
                  </HoverCard.Target>
                  <HoverCard.Dropdown py={5} px={10}>
                    <Text c='gray.0' size='xs'>
                      You're {proficiencyTypeToLabel(compileProficiencyType(variable.value)).toLowerCase()} in this
                      proficiency, resulting in a{' '}
                      {sign(getProficiencyTypeValue(compileProficiencyType(variable.value)))} bonus.
                    </Text>
                  </HoverCard.Dropdown>
                </HoverCard>
                +
                <HoverCard shadow='md' openDelay={250} width={230} position='bottom' zIndex={10000} withArrow>
                  <HoverCard.Target>
                    <Kbd style={{ cursor: 'pointer' }}>{parts.level}</Kbd>
                  </HoverCard.Target>
                  <HoverCard.Dropdown py={5} px={10}>
                    <Text c='gray.0' size='xs'>
                      {profWithoutLevel ? (
                        <>
                          {compileProficiencyType(variable.value) === 'U' ? (
                            <>
                              Because you're{' '}
                              {proficiencyTypeToLabel(compileProficiencyType(variable.value)).toLowerCase()} in this
                              proficiency, you have a -2 modifier because of your variant rule.
                            </>
                          ) : (
                            <>
                              Even though you're{' '}
                              {proficiencyTypeToLabel(compileProficiencyType(variable.value)).toLowerCase()} in this
                              proficiency, you don't add your level because of your variant rule.
                            </>
                          )}
                        </>
                      ) : (
                        <>
                          {compileProficiencyType(variable.value) === 'U' ? (
                            <>
                              Because you're{' '}
                              {proficiencyTypeToLabel(compileProficiencyType(variable.value)).toLowerCase()} in this
                              proficiency, you don't add your level.
                            </>
                          ) : (
                            <>
                              Because you're{' '}
                              {proficiencyTypeToLabel(compileProficiencyType(variable.value)).toLowerCase()} in this
                              proficiency, you add your level.
                            </>
                          )}
                        </>
                      )}
                    </Text>
                  </HoverCard.Dropdown>
                </HoverCard>
                {parts.attributeMod !== null && (
                  <>
                    +
                    <HoverCard shadow='md' openDelay={250} width={230} position='bottom' zIndex={10000} withArrow>
                      <HoverCard.Target>
                        <Kbd style={{ cursor: 'pointer' }}>{parts.attributeMod}</Kbd>
                      </HoverCard.Target>
                      <HoverCard.Dropdown py={5} px={10}>
                        <Text c='gray.0' size='xs'>
                          This proficiency is associated with the {toLabel(variable.value.attribute ?? '')} attribute,
                          so you add your {toLabel(variable.value.attribute ?? '')} modifier.
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
                {parts.hasConditionals && (
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
                                {item.text}{' '}
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
        )}
        <Accordion.Item value='timeline'>
          <Accordion.Control icon={<IconTimeline size='1rem' />}>Timeline</Accordion.Control>
          <Accordion.Panel>
            <Box>
              <Timeline active={timeline.length - 1} bulletSize={24} lineWidth={2}>
                {timeline.map((item, index) => (
                  <Timeline.Item
                    bullet={item.type === 'ADJUSTMENT' ? <IconBadgesFilled size={12} /> : <IconFrame size={12} />}
                    title={item.title}
                    key={index}
                  >
                    <Text size='xs' fs='italic' mt={4}>
                      {item.description}
                    </Text>
                  </Timeline.Item>
                ))}
                {timeline.length === 0 && (
                  <Text fz='sm' fs='italic'>
                    No recorded history found for this proficiency.
                  </Text>
                )}
              </Timeline>
            </Box>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </Box>
  );
}
