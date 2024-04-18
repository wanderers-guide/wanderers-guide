import BlurButton from '@common/BlurButton';
import { Badge, Button, Text } from '@mantine/core';
import ViewOperationsModal from '@modals/ViewOperationsModal';
import { Operation } from '@typing/operations';
import { useState } from 'react';

export default function ShowOperationsButton(props: { name: string; operations?: Operation[] }) {
  const [opened, setOpened] = useState(false);

  if (!props.operations || props.operations.length === 0) return null;

  return (
    <>
      <Button
        mt={10}
        variant='light'
        size='compact-sm'
        fullWidth
        rightSection={
          <Badge mr='sm' variant='outline' color='guide.5' size='xs'>
            <Text fz='sm' c='guide.5' span>
              {props.operations.length}
            </Text>
          </Badge>
        }
        onClick={() => setOpened(true)}
      >
        Operations
      </Button>
      <ViewOperationsModal
        opened={opened}
        onClose={() => setOpened(false)}
        operations={props.operations}
        title={`Operations - ${props.name}`}
      />
    </>
  );
}
