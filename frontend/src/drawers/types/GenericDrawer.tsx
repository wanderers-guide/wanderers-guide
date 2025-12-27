import RichText from '@common/RichText';
import ShowOperationsButton from '@drawers/ShowOperationsButton';
import { Title, Group, Box, Button } from '@mantine/core';
import { Operation } from '@typing/operations';
import { DisplayOperationSelectionOptions } from './ActionDrawer';
import { drawerState } from '@atoms/navAtoms';
import { useRecoilState } from 'recoil';
import { toLabel } from '@utils/strings';

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
            <Title order={3}>{toLabel(props.data.title)}</Title>
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
      {/* <DisplayIcon strValue={props.data?.meta_data?.image_url} /> */}
      <RichText ta='justify'>{props.data.description}</RichText>
      <DisplayOperationSelectionOptions operations={props.data.operations} />
      {props.data.showOperations && <ShowOperationsButton name={props.data.title} operations={props.data.operations} />}
    </Box>
  );
}
