import { characterState } from '@atoms/characterAtoms';
import { drawerState } from '@atoms/navAtoms';
import { ActionSymbol } from '@common/Actions';
import IndentedText from '@common/IndentedText';
import RichText from '@common/RichText';
import TraitsDisplay from '@common/TraitsDisplay';
import { ActionSelectionOption, FeatSelectionOption } from '@common/select/SelectContent';
import { TEXT_INDENT_AMOUNT } from '@constants/data';
import { fetchContentAll, fetchContentById } from '@content/content-store';
import { getAcParts } from '@items/armor-handler';
import { getBestArmor } from '@items/inv-utils';
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
  Button,
} from '@mantine/core';
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
import { AbilityBlock, InventoryItem } from '@typing/content';
import { VariableProf } from '@typing/variables';
import { sign } from '@utils/numbers';
import {
  displayFinalProfValue,
  getBonusText,
  getFinalAcValue,
  getProfValueParts,
  getVariableBreakdown,
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
import * as _ from 'lodash-es';
import { useRecoilState, useRecoilValue } from 'recoil';

export function StatAcDrawerTitle(props: { data: { onViewItem?: (invItem: InventoryItem) => void } }) {
  const character = useRecoilValue(characterState);
  const bestArmor = getBestArmor('CHARACTER', character?.inventory);

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

export function StatAcDrawerContent(props: { data: {} }) {
  const character = useRecoilValue(characterState);
  const bestArmor = getBestArmor('CHARACTER', character?.inventory);

  const parts = getAcParts('CHARACTER', bestArmor?.item);
  const armorName = bestArmor?.item.name ?? 'nothing';

  const acBonusParts = getVariableBreakdown('CHARACTER', 'AC_BONUS')!;

  return (
    <Box>
      <Accordion variant='separated' defaultValue=''>
        <Accordion.Item value='description'>
          <Accordion.Control icon={<IconBlockquote size='1rem' />}>Description</Accordion.Control>
          <Accordion.Panel>
            <RichText ta='justify'>
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
              {getFinalAcValue('CHARACTER', bestArmor?.item)} ={' '}
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
              {[...acBonusParts.bonuses.entries()].map(([key, bonus], index) => (
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
