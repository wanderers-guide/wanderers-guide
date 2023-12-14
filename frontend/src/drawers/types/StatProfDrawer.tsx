import { ActionSymbol } from '@common/Actions';
import IndentedText from '@common/IndentedText';
import RichText from '@common/RichText';
import TraitsDisplay from '@common/TraitsDisplay';
import { TEXT_INDENT_AMOUNT } from '@constants/data';
import { fetchContentById } from '@content/content-store';
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
} from '@mantine/core';
import {
  IconBadgesFilled,
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
import { VariableProf } from '@typing/variables';
import { sign } from '@utils/numbers';
import {
  displayFinalProfValue,
  getBonusText,
  getProfValueParts,
} from '@variables/variable-display';
import { getVariable, getVariableBonuses, getVariableHistory } from '@variables/variable-manager';
import {
  getProficiencyTypeValue,
  isProficiencyType,
  isProficiencyValue,
  proficiencyTypeToLabel,
  variableNameToLabel,
  variableToLabel,
} from '@variables/variable-utils';
import _ from 'lodash';

export function StatProfDrawerTitle(props: { data: { variableName: string; isDC?: boolean } }) {
  const variable = getVariable<VariableProf>('CHARACTER', props.data.variableName);

  return (
    <>
      {variable && (
        <Group justify='space-between' wrap='nowrap'>
          <Group wrap='nowrap' gap={10}>
            <Box>
              <Title order={3}>{_.startCase(variableToLabel(variable))}</Title>
            </Box>
          </Group>
          <Box>
            <Badge>{proficiencyTypeToLabel(variable.value.value)}</Badge>
          </Box>
        </Group>
      )}
    </>
  );
}

export function StatProfDrawerContent(props: { data: { variableName: string; isDC?: boolean } }) {
  const variable = getVariable<VariableProf>('CHARACTER', props.data.variableName);
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
    const from = isProficiencyValue(hist.from)
      ? proficiencyTypeToLabel(hist.from.value)
      : hist.from;
    const to = isProficiencyValue(hist.to) ? proficiencyTypeToLabel(hist.to.value) : hist.to;
    timeline.push({
      type: 'ADJUSTMENT',
      title: `${from} → ${to}`,
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

  return (
    <Box>
      <Accordion variant='separated' defaultValue=''>
        {variable.value.attribute && (
          <Accordion.Item value='breakdown'>
            <Accordion.Control icon={<IconMathSymbols size='1rem' />}>Breakdown</Accordion.Control>
            <Accordion.Panel>
              <Group gap={8} wrap='nowrap' align='center'>
                {displayFinalProfValue('CHARACTER', variable.name, props.data.isDC)} ={' '}
                {props.data.isDC && <>10 + </>}
                <HoverCard
                  shadow='md'
                  openDelay={250}
                  width={230}
                  position='bottom'
                  zIndex={10000}
                  withArrow
                >
                  <HoverCard.Target>
                    <Kbd style={{ cursor: 'pointer' }}>{parts.profValue}</Kbd>
                  </HoverCard.Target>
                  <HoverCard.Dropdown py={5} px={10}>
                    <Text c='gray.0' size='xs'>
                      You're {proficiencyTypeToLabel(variable.value.value).toLowerCase()} in this
                      proficiency, resulting in a{' '}
                      {sign(getProficiencyTypeValue(variable.value.value))} bonus.
                    </Text>
                  </HoverCard.Dropdown>
                </HoverCard>
                +
                <HoverCard
                  shadow='md'
                  openDelay={250}
                  width={230}
                  position='bottom'
                  zIndex={10000}
                  withArrow
                >
                  <HoverCard.Target>
                    <Kbd style={{ cursor: 'pointer' }}>{parts.level}</Kbd>
                  </HoverCard.Target>
                  <HoverCard.Dropdown py={5} px={10}>
                    <Text c='gray.0' size='xs'>
                      {variable.value.value === 'U' ? (
                        <>
                          Because you're{' '}
                          {proficiencyTypeToLabel(variable.value.value).toLowerCase()} in this
                          proficiency, you don't add your level.
                        </>
                      ) : (
                        <>
                          Because you're{' '}
                          {proficiencyTypeToLabel(variable.value.value).toLowerCase()} in this
                          proficiency, you add your level.
                        </>
                      )}
                    </Text>
                  </HoverCard.Dropdown>
                </HoverCard>
                {parts.attributeMod && (
                  <>
                    +
                    <HoverCard
                      shadow='md'
                      openDelay={250}
                      width={230}
                      position='bottom'
                      zIndex={10000}
                      withArrow
                    >
                      <HoverCard.Target>
                        <Kbd style={{ cursor: 'pointer' }}>{parts.attributeMod}</Kbd>
                      </HoverCard.Target>
                      <HoverCard.Dropdown py={5} px={10}>
                        <Text c='gray.0' size='xs'>
                          This proficiency is associated with the{' '}
                          {variableNameToLabel(variable.value.attribute ?? '')} attribute, so you
                          add your {variableNameToLabel(variable.value.attribute ?? '')} modifier.
                        </Text>
                      </HoverCard.Dropdown>
                    </HoverCard>
                  </>
                )}
                {[...parts.breakdown.bonuses.entries()].map(([key, bonus], index) => (
                  <>
                    +
                    <HoverCard
                      shadow='md'
                      openDelay={250}
                      width={230}
                      position='bottom'
                      zIndex={10000}
                      withArrow
                    >
                      <HoverCard.Target>
                        <Kbd style={{ cursor: 'pointer' }}>{bonus.value}</Kbd>
                      </HoverCard.Target>
                      <HoverCard.Dropdown py={5} px={10}>
                        <Text c='gray.0' size='xs'>
                          Your {key} bonus. Use the highest from the following:
                          <Divider pb={5} />
                          <List size='xs'>
                            {bonus.composition.map((item, i) => (
                              <List.Item key={i}>
                                {sign(item.amount)}{' '}
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
                ))}
                {parts.hasConditionals && (
                  <>
                    +
                    <HoverCard
                      shadow='md'
                      openDelay={250}
                      width={230}
                      position='bottom'
                      zIndex={10000}
                      withArrow
                    >
                      <HoverCard.Target>
                        <Kbd style={{ cursor: 'pointer' }} c='guide.5'>
                          *
                        </Kbd>
                      </HoverCard.Target>
                      <HoverCard.Dropdown py={5} px={10}>
                        <Text c='gray.0' size='xs'>
                          You have conditional bonuses! These will only apply situationally:
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
                    bullet={
                      item.type === 'ADJUSTMENT' ? (
                        <IconBadgesFilled size={12} />
                      ) : (
                        <IconFrame size={12} />
                      )
                    }
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
