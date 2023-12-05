import { ActionSymbol } from '@common/Actions';
import IndentedText from '@common/IndentedText';
import RichText from '@common/RichText';
import TraitsDisplay from '@common/TraitsDisplay';
import { TEXT_INDENT_AMOUNT } from '@constants/data';
import { fetchContentById } from '@content/content-store';
import { Title, Text, Image, Loader, Group, Divider, Stack, Box, Flex } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { AbilityBlock } from '@typing/content';
import { Operation } from '@typing/operations';

export type GenericData = {
  title: string;
  description: string;
  operations?: Operation[];
};
export function GenericDrawerTitle(props: { data: GenericData }) {
  return (
    <>
      <Group justify='space-between' wrap='nowrap'>
        <Group wrap='nowrap' gap={10}>
          <Box>
            <Title order={3}>{props.data.title}</Title>
          </Box>
          <Box></Box>
        </Group>
      </Group>
    </>
  );
}

export function GenericDrawerContent(props: { data: GenericData }) {
  return (
    <Box>
      {/* {action.meta_data?.image_url && (
        <Image
          style={{
            float: 'right',
            maxWidth: 150,
            height: 'auto',
          }}
          ml='sm'
          radius='md'
          fit='contain'
          src={action.meta_data?.image_url}
        />
      )} */}
      <RichText ta='justify'>{props.data.description}</RichText>
    </Box>
  );
}
