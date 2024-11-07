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
import { AttributeValue, StoreID, VariableAttr, VariableProf, VariableValue } from '@typing/variables';
import { sign } from '@utils/numbers';
import { toLabel } from '@utils/strings';
import { displayFinalProfValue, getBonusText, getProfValueParts } from '@variables/variable-display';
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
  variableToLabel,
} from '@variables/variable-utils';
import * as _ from 'lodash-es';

export function StatAttrDrawerTitle(props: { data: { id: StoreID; attributeName?: string } }) {
  return (
    <>
      <Group justify='space-between' wrap='nowrap'>
        <Group wrap='nowrap' gap={10}>
          <Box>
            <Title order={3}>
              {props.data.attributeName ? `Attribute: ${toLabel(props.data.attributeName)}` : 'Attributes'}
            </Title>
          </Box>
        </Group>
        <Box></Box>
      </Group>
    </>
  );
}

export function StatAttrDrawerContent(props: { data: { id: StoreID; attributeName?: string } }) {
  const attributes = getAllAttributeVariables(props.data.id);
  const theme = useMantineTheme();

  // Change structure to be an array by source
  // const sourceRecords = [];
  // for (const attribute of attributes) {
  //   const history = getVariableHistory(attribute.name);
  //   for (const record of history) {
  //     sourceRecords.push({
  //       source: record.source,
  //       attribute,
  //     });
  //   }
  // }
  const sourceRecords: Record<string, (number | null | undefined)[]> = {};

  for (const attribute of attributes) {
    const history = getVariableHistory(props.data.id, attribute.name);

    for (const [index, record] of history.entries()) {
      if (!sourceRecords[record.source]) {
        sourceRecords[record.source] = Array(attributes.length).fill(null);
      }

      const to = record.to as AttributeValue;
      const from = record.from as AttributeValue | null;
      const existingValue = sourceRecords[record.source][attributes.indexOf(attribute)] ?? 0;

      sourceRecords[record.source][attributes.indexOf(attribute)] =
        existingValue + (to.value > (from?.value ?? 0) ? 1 : -1);

      if (!from?.partial && to.partial) {
        sourceRecords[record.source][attributes.indexOf(attribute)] = undefined;
      }
    }
  }

  const rows = sortAttributes(Object.keys(sourceRecords)).map((source, index) => (
    <Table.Tr key={index} ta='center'>
      {sourceRecords[source].map((record, i) => (
        <HoverCard shadow='md' openDelay={250} position='bottom' zIndex={10000}>
          <HoverCard.Target>
            <Table.Td key={i}>{record !== null ? record === undefined ? <>–</> : <>{sign(record)}</> : <></>}</Table.Td>
          </HoverCard.Target>
          <HoverCard.Dropdown py={5} px={10}>
            <Text c='gray.0' size='xs'>
              From {source}
            </Text>
          </HoverCard.Dropdown>
        </HoverCard>
      ))}
    </Table.Tr>
  ));

  const ths = (
    <Table.Tr>
      {attributes.map((attribute, index) => (
        <Table.Th key={index} ta='center'>
          {compactLabels(variableToLabel(attribute))}
        </Table.Th>
      ))}
    </Table.Tr>
  );

  const tfs = (
    <Table.Tr>
      {attributes.map((attribute, index) => (
        <Table.Th key={index} ta='center'>
          {' '}
          ={' '}
          <Text c='gray.0' span>
            {attribute.value.value < 0 ? '-' : '+'}
          </Text>
          <Text c='gray.0' td={attribute.value.partial ? 'underline' : undefined} span>
            {Math.abs(attribute.value.value)}
          </Text>
        </Table.Th>
      ))}
    </Table.Tr>
  );

  return (
    <Box>
      <Table highlightOnHover withTableBorder withColumnBorders withRowBorders={false}>
        <Table.Thead
          style={{
            borderBottom: '1px solid ' + theme.colors.dark[6],
          }}
        >
          {ths}
        </Table.Thead>
        <Table.Tbody>{rows}</Table.Tbody>
        <Table.Tfoot
          style={{
            borderTop: '1px solid ' + theme.colors.dark[6],
          }}
        >
          {tfs}
        </Table.Tfoot>
      </Table>

      {props.data.attributeName && (
        <RichText ta='justify' store={props.data.id} pt={10}>
          {getAttributeDescription(props.data.attributeName)}
        </RichText>
      )}
    </Box>
  );
}

function getAttributeDescription(attributeName: string) {
  if (attributeName === 'ATTRIBUTE_STR') {
    return `Strength measures your character’s physical power. Strength is important if your character plans to engage in hand-to-hand combat. Your Strength modifier gets added to melee damage rolls and determines how much your character can carry.`;
  }
  if (attributeName === 'ATTRIBUTE_DEX') {
    return `Dexterity measures your character’s agility, balance, and reflexes. Dexterity is important if your character plans to make attacks with ranged weapons or use stealth to surprise foes. Your Dexterity modifier is also added to your character’s AC and Reflex saving throws.`;
  }
  if (attributeName === 'ATTRIBUTE_CON') {
    return `Constitution measures your character’s health and stamina. Constitution is important for all characters, especially those who fight in close range. Your Constitution modifier is added to your Hit Points and Fortitude saving throws.`;
  }
  if (attributeName === 'ATTRIBUTE_INT') {
    return `Intelligence measures how well your character can learn and reason. A high Intelligence allows your character to analyze situations and understand patterns, and it means they can become trained in additional skills and might be able to master additional languages.`;
  }
  if (attributeName === 'ATTRIBUTE_WIS') {
    return `Wisdom measures your character’s common sense, awareness, and intuition. High Wisdom helps your character detect hidden things and resist mental effects. Your Wisdom modifier is added to your Perception and Will saving throws.`;
  }
  if (attributeName === 'ATTRIBUTE_CHA') {
    return `Charisma measures your character’s personal magnetism and strength of personality. A high Charisma modifier helps you build relationships and influence the thoughts and moods of others with social skills.`;
  }
  return 'No description available for this attribute.';
}

function sortAttributes(sources: string[]) {
  sources = sources.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  return [
    ...sources.filter((str) => !str.toLowerCase().trim().startsWith('attribute')),
    ...sources.filter((str) => str.toLowerCase().trim().startsWith('attribute')),
  ];
}
