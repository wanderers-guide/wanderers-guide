import { Button, Group, Stack, Text, TextInput } from '@mantine/core';
import { getHotkeyHandler } from '@mantine/hooks';
import { ContextModalProps } from '@mantine/modals';
import { labelToVariable, variableNameToLabel } from '@variables/variable-utils';
import { useState } from 'react';

export default function CreateDicePresetModal({
  context,
  id,
  innerProps,
}: ContextModalProps<{
  onConfirm: (name: string) => void;
}>) {
  const [name, setName] = useState('');

  const handleSubmit = () => {
    innerProps.onConfirm(name);
    context.closeModal(id);
  };

  return (
    <Stack style={{ position: 'relative' }}>
      <Text fz='sm'>What would you like to call this preset?</Text>
      <TextInput
        placeholder='Name of Preset'
        onChange={async (e) => {
          setName(e.target.value);
        }}
        onKeyDown={getHotkeyHandler([
          ['mod+Enter', handleSubmit],
          ['Enter', handleSubmit],
        ])}
      />
      <Group justify='flex-end'>
        <Button variant='default' onClick={() => context.closeModal(id)}>
          Cancel
        </Button>
        <Button disabled={!name} onClick={handleSubmit}>
          Create
        </Button>
      </Group>
    </Stack>
  );
}
