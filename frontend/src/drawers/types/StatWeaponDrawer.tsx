import { drawerState } from '@atoms/navAtoms';
import { ActionSymbol } from '@common/Actions';
import IndentedText from '@common/IndentedText';
import RichText from '@common/RichText';
import TraitsDisplay from '@common/TraitsDisplay';
import { ActionSelectionOption, FeatSelectionOption } from '@common/select/SelectContent';
import { TEXT_INDENT_AMOUNT } from '@constants/data';
import { fetchContentAll, fetchContentById } from '@content/content-store';
import { convertToHardcodedLink } from '@content/hardcoded-links';
import { getWeaponStats } from '@items/weapon-handler';
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
import { AbilityBlock, Item } from '@typing/content';
import { VariableBool, VariableProf } from '@typing/variables';
import { sign } from '@utils/numbers';
import { displayFinalProfValue, getBonusText, getProfValueParts } from '@variables/variable-display';
import { getVariable, getVariableBonuses, getVariableHistory } from '@variables/variable-manager';
import {
  getProficiencyTypeValue,
  isProficiencyType,
  isProficiencyValue,
  labelToVariable,
  proficiencyTypeToLabel,
  variableNameToLabel,
  variableToLabel,
} from '@variables/variable-utils';
import * as _ from 'lodash-es';
import { useRecoilState } from 'recoil';

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
