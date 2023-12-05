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
  displayFinalProfValue,
  getBonusText,
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
import _ from 'lodash';

export function StatAttrDrawerTitle(props: { data: {} }) {
  return (
    <>
      <Group justify='space-between' wrap='nowrap'>
        <Group wrap='nowrap' gap={10}>
          <Box>
            <Title order={3}>Attributes</Title>
          </Box>
        </Group>
        <Box></Box>
      </Group>
    </>
  );
}

export function StatAttrDrawerContent(props: { data: {} }) {
  const attributes = getAllAttributeVariables();
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
    const history = getVariableHistory(attribute.name);

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

  const rows = Object.keys(sourceRecords)
    .sort()
    .map((source, index) => (
      <Table.Tr key={index} ta='center'>
        {sourceRecords[source].map((record, i) => (
          <HoverCard shadow='md' openDelay={250} position='bottom' zIndex={10000}>
            <HoverCard.Target>
              <Table.Td key={i}>
                {record !== null ? record === undefined ? <>—</> : <>{sign(record)}</> : <></>}
              </Table.Td>
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
    </Box>
  );
}
