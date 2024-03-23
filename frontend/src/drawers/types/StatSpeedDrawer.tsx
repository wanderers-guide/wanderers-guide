import { drawerState } from '@atoms/navAtoms';
import { ActionSymbol } from '@common/Actions';
import IndentedText from '@common/IndentedText';
import RichText from '@common/RichText';
import TraitsDisplay from '@common/TraitsDisplay';
import { ActionSelectionOption, FeatSelectionOption } from '@common/select/SelectContent';
import { ICON_BG_COLOR, ICON_BG_COLOR_HOVER, TEXT_INDENT_AMOUNT } from '@constants/data';
import { fetchContentAll, fetchContentById } from '@content/content-store';
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
import { useHover } from '@mantine/hooks';
import {
  IconBadgesFilled,
  IconBlockquote,
  IconCaretLeftRight,
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
import { VariableNum, VariableProf } from '@typing/variables';
import { sign } from '@utils/numbers';
import {
  displayFinalProfValue,
  getBonusText,
  getFinalVariableValue,
  getProfValueParts,
  getVariableBreakdown,
} from '@variables/variable-display';
import { getAllSpeedVariables, getVariable, getVariableBonuses, getVariableHistory } from '@variables/variable-manager';
import {
  getProficiencyTypeValue,
  isProficiencyType,
  isProficiencyValue,
  proficiencyTypeToLabel,
  variableNameToLabel,
  variableToLabel,
} from '@variables/variable-utils';
import * as _ from 'lodash-es';
import { useState } from 'react';
import { useRecoilState } from 'recoil';

export function StatSpeedDrawerTitle(props: { data: {} }) {
  const speedVars = getAllSpeedVariables('CHARACTER');

  return (
    <>
      {speedVars && (
        <Group justify='space-between' wrap='nowrap'>
          <Group wrap='nowrap' gap={10}>
            <Box>
              <Title order={3}>{speedVars.filter((s) => s.value).length > 1 ? 'Speeds' : 'Speed'}</Title>
            </Box>
          </Group>
        </Group>
      )}
    </>
  );
}

export function StatSpeedDrawerContent(props: { data: {} }) {
  const speedVars = getAllSpeedVariables('CHARACTER');

  const [speedSectionValue, setSpeedSectionValue] = useState<string | null>(null);

  return (
    <>
      <RichText ta='justify' storeID='CHARACTER' pb={10}>
        Speed is the distance an individual can move using a single action, measured in feet. There are various kinds of
        speeds, allowing one to easily fly, swim, or dig, but the most common speed is for walking normally. Penalties
        to a speed can decrease it to a minimum of 5 feet.
      </RichText>
      {speedVars && (
        <Accordion
          value={speedSectionValue}
          onChange={setSpeedSectionValue}
          variant='separated'
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
          {speedVars.map((variable, index) => (
            <StatSpeedSection variable={variable} key={index} opened={speedSectionValue === variable.name} />
          ))}
        </Accordion>
      )}
    </>
  );
}

function StatSpeedSection(props: { variable: VariableNum; opened?: boolean }) {
  const variable = props.variable;

  // Breakdown
  const finalData = getFinalVariableValue('CHARACTER', variable.name);
  const breakdown = getVariableBreakdown('CHARACTER', variable.name);

  // Minimum speed is 5
  const finalTotal = finalData.total > 5 ? finalData.total : 5;

  if (finalData.value === 0) {
    return null;
  }

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
    const from = isProficiencyValue(hist.from) ? proficiencyTypeToLabel(hist.from.value) : hist.from;
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
    <Accordion.Item value={variable.name}>
      <Accordion.Control>
        <Group wrap='nowrap' justify='space-between' gap={0}>
          <Text c='gray.5' fw={700} fz='sm'>
            {variable.name === 'SPEED' ? `Normal` : `${variableNameToLabel(variable.name)}`}
          </Text>
          <Box mr='sm'>
            <Text fz='md' c='gray.4' fw={600} span>
              {finalTotal} feet
            </Text>
          </Box>
        </Group>
      </Accordion.Control>
      <Accordion.Panel>
        <Box>
          <Accordion variant='separated' defaultValue=''>
            {true && (
              <Accordion.Item value='breakdown'>
                <Accordion.Control icon={<IconMathSymbols size='1rem' />}>Breakdown</Accordion.Control>
                <Accordion.Panel>
                  <Group gap={8} align='center'>
                    {finalTotal} ={' '}
                    <>
                      <HoverCard shadow='md' openDelay={250} width={230} position='bottom' zIndex={10000} withArrow>
                        <HoverCard.Target>
                          <Kbd style={{ cursor: 'pointer' }}>{finalData.value}</Kbd>
                        </HoverCard.Target>
                        <HoverCard.Dropdown py={5} px={10}>
                          <Text c='gray.0' size='xs'>
                            This is your base value in the speed.
                          </Text>
                        </HoverCard.Dropdown>
                      </HoverCard>
                    </>
                    {[...breakdown.bonuses.entries()].map(([key, bonus], index) => (
                      <>
                        +
                        <HoverCard shadow='md' openDelay={250} width={230} position='bottom' zIndex={10000} withArrow>
                          <HoverCard.Target>
                            <Kbd style={{ cursor: 'pointer' }}>{bonus.value}</Kbd>
                          </HoverCard.Target>
                          <HoverCard.Dropdown py={5} px={10}>
                            <Text c='gray.0' size='xs'>
                              Your {key}. Use the greatest from the following:
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
                    {breakdown.conditionals.length > 0 && (
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
                                {breakdown.conditionals.map((item, i) => (
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
                        bullet={item.type === 'ADJUSTMENT' ? <IconPlusMinus size={12} /> : <IconFrame size={12} />}
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
                        No recorded history found for this value.
                      </Text>
                    )}
                  </Timeline>
                </Box>
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>
        </Box>
      </Accordion.Panel>
    </Accordion.Item>
  );
}
