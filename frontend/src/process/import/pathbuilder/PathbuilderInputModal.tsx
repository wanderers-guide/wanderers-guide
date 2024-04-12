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
          Warning, due to differing file structure, missing export data, and some names being changed because
          Pathbuilder doesn't follow Paizo's Community Use Policy, your imported character may be missing some
          selections.
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
