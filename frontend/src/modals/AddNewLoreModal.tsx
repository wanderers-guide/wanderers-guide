import { Button, Group, Stack, Text, TextInput } from '@mantine/core';
import { getHotkeyHandler } from '@mantine/hooks';
import { ContextModalProps } from '@mantine/modals';
import { labelToVariable, variableNameToLabel } from '@variables/variable-utils';
import { useState } from 'react';

export default function AddNewLoreModal({
  context,
  id,
  innerProps,
}: ContextModalProps<{
  onConfirm: (loreName: string) => void;
}>) {
  const [loreName, setLoreName] = useState('');

  console.log('got here');

  const handleSubmit = () => {
    innerProps.onConfirm(labelToVariable(loreName));
    context.closeModal(id);
  };

  return (
    <Stack style={{ position: 'relative' }}>
      <Text fz='sm'>You become trained in the following lore of your choice.</Text>
      <TextInput
        placeholder='Name of Lore'
        onChange={async (e) => {
          setLoreName(e.target.value);
        }}
        onKeyDown={getHotkeyHandler([
          ['mod+Enter', handleSubmit],
          ['Enter', handleSubmit],
        ])}
      />
      {loreName && variableNameToLabel(labelToVariable(loreName)) !== loreName.trim() && (
        <Text fz='sm'>Resulting Name: {variableNameToLabel(labelToVariable(loreName))}</Text>
      )}
      <Group justify='flex-end'>
        <Button variant='default' onClick={() => context.closeModal(id)}>
          Cancel
        </Button>
        <Button disabled={!loreName} onClick={handleSubmit}>
          Train in Lore
        </Button>
      </Group>
    </Stack>
  );
}
