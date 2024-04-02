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
  Table,
  useMantineTheme,
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
import { AttributeValue, VariableAttr, VariableProf, VariableValue } from '@typing/variables';
import { sign } from '@utils/numbers';
import {
  displayFinalHealthValue,
  displayFinalProfValue,
  getBonusText,
  getHealthValueParts,
  getProfValueParts,
} from '@variables/variable-display';
import {
  getAllAttributeVariables,
  getVariable,
  getVariableBonuses,
  getVariableHistory,
} from '@variables/variable-manager';
import {
  compactLabels,
  getProficiencyTypeValue,
  isProficiencyType,
  proficiencyTypeToLabel,
  variableNameToLabel,
  variableToLabel,
} from '@variables/variable-utils';
import * as _ from 'lodash-es';

export function StatHealthDrawerTitle(props: { data: {} }) {
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

export function StatHealthDrawerContent(props: { data: {} }) {
  const parts = getHealthValueParts('CHARACTER');

  return (
    <Box>
      <Accordion variant='separated' defaultValue='breakdown'>
        <Accordion.Item value='breakdown'>
          <Accordion.Control icon={<IconMathSymbols size='1rem' />}>Breakdown</Accordion.Control>
          <Accordion.Panel>
            <Group gap={8} wrap='nowrap' align='center'>
              {displayFinalHealthValue('CHARACTER')} ={' ('}
              <HoverCard shadow='md' openDelay={250} width={230} position='bottom' zIndex={10000} withArrow>
                <HoverCard.Target>
                  <Kbd style={{ cursor: 'pointer' }}>{parts.classHp}</Kbd>
                </HoverCard.Target>
                <HoverCard.Dropdown py={5} px={10}>
                  <Text c='gray.0' size='xs'>
                    This is the base hit points from your class. You gain this amount every level.
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
                    You add your Constitution modifier to the hit points you gain every level.
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
      </Accordion>
    </Box>
  );
}
