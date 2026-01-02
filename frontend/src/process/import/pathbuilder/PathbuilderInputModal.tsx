import { Button, Group, Modal, NumberInput, Stack, Text, TextInput, Title } from '@mantine/core';
import { useState } from 'react';

export default function PathbuilderInputModal(props: {
  open: boolean;
  onConfirm: (pathbuilderId: number) => void;
  onClose: () => void;
}) {
  const [pathbuilderId, setPathbuilderId] = useState<number>();

  return (
    <Modal
      opened={props.open}
      onClose={() => props.onClose()}
      title={<Title order={3}>Import from Pathbuilder 2e</Title>}
      zIndex={1000}
    >
      <Stack style={{ position: 'relative' }} gap={20}>
        <NumberInput
          label='Pathbuilder 2e JSON ID'
          placeholder='123456'
          value={pathbuilderId}
          onChange={(val) => setPathbuilderId(parseInt(`${val}`))}
        />

        <Text fs='italic' fz='sm'>
          Warning: Some selections may be missing after import. This can occur due to incomplete export data and name
          changes due to Pathbuilder not complying with Paizo’s Community Use Policy.
        </Text>

        <Group justify='flex-end'>
          <Button variant='default' onClick={props.onClose}>
            Cancel
          </Button>
          <Button
            disabled={!pathbuilderId}
            onClick={() => {
              if (!pathbuilderId) return;
              props.onConfirm(pathbuilderId);
            }}
          >
            Import
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
