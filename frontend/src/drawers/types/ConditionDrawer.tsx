import RichText from '@common/RichText';
import { getConditionByName } from '@conditions/condition-handler';
import { Title, Text, Image, Loader, Group, Divider, Stack, Box, Flex } from '@mantine/core';

export function ConditionDrawerTitle(props: { data: { id: string } }) {
  const condition = getConditionByName(props.data.id);

  return (
    <>
      <Group justify='space-between' wrap='nowrap'>
        <Group wrap='nowrap' gap={10}>
          <Box>
            <Title order={3}>{condition?.name ?? props.data.id}</Title>
          </Box>
          <Box></Box>
        </Group>
      </Group>
    </>
  );
}

export function ConditionDrawerContent(props: { data: { id: string } }) {
  const condition = getConditionByName(props.data.id);

  return (
    <Box>
      <RichText ta='justify' conditionBlacklist={[props.data.id.toLowerCase()]}>
        {condition?.description ?? 'Condition not found.'}
      </RichText>
    </Box>
  );
}
