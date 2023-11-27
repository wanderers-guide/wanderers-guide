import { Text, TextInput, Stack, Button, Group } from '@mantine/core';
import { ContextModalProps } from '@mantine/modals';
import { Character } from '@typing/content';
import _ from 'lodash';
import { isValidImage } from '@utils/images';
import { useState } from 'react';
import { labelToVariable, variableNameToLabel } from '@variables/variable-utils';

export function AddNewLoreModal({
  context,
  id,
  innerProps,
}: ContextModalProps<{
  onConfirm: (loreName: string) => void;
}>) {
  const [loreName, setLoreName] = useState('');

  return (
    <Stack style={{ position: 'relative' }}>
      <Text>You become trained in the following lore of your choice.</Text>
      <TextInput
        placeholder='Name of Lore'
        onChange={async (e) => {
          setLoreName(e.target.value);
        }}
      />
      {loreName && variableNameToLabel(labelToVariable(loreName)) !== loreName.trim() && (
        <Text>Resulting Name: {variableNameToLabel(labelToVariable(loreName))}</Text>
      )}
      <Group justify='flex-end'>
        <Button variant='default' onClick={() => context.closeModal(id)}>
          Cancel
        </Button>
        <Button
          disabled={!loreName}
          onClick={() => {
            innerProps.onConfirm(labelToVariable(loreName));
            context.closeModal(id);
          }}
        >
          Train in Lore
        </Button>
      </Group>
    </Stack>
  );
}
