import { ActionSymbol } from '@common/Actions';
import IndentedText from '@common/IndentedText';
import RichText from '@common/RichText';
import TraitsDisplay from '@common/TraitsDisplay';
import { TEXT_INDENT_AMOUNT } from '@constants/data';
import { fetchContentById } from '@content/content-store';
import ShowOperationsButton from '@drawers/ShowOperationsButton';
import { Title, Text, Image, Loader, Group, Divider, Stack, Box, Flex, Button } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { AbilityBlock } from '@typing/content';
import { Operation } from '@typing/operations';
import { DisplayOperationSelectionOptions } from './ActionDrawer';
import { drawerState } from '@atoms/navAtoms';
import { useRecoilState } from 'recoil';

export type GenericData = {
  title: string;
  description: string;
  operations?: Operation[];
  showOperations?: boolean;
  onSelect?: () => void;
};
export function GenericDrawerTitle(props: { data: GenericData }) {
  const [_drawer, openDrawer] = useRecoilState(drawerState);

  return (
    <>
      <Group justify='space-between' wrap='nowrap'>
        <Group wrap='nowrap' gap={10}>
          <Box>
            <Title order={3}>{props.data.title}</Title>
          </Box>
          <Box></Box>
        </Group>
        {props.data.onSelect && (
          <Button
            variant='filled'
            radius='xl'
            mb={5}
            size='compact-sm'
            onClick={() => {
              props.data.onSelect?.();
              openDrawer(null);
            }}
          >
            Select
          </Button>
        )}
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
      <DisplayOperationSelectionOptions operations={props.data.operations} />
      {props.data.showOperations && <ShowOperationsButton name={props.data.title} operations={props.data.operations} />}
    </Box>
  );
}
