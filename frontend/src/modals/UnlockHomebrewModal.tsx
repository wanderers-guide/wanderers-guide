import { Button, Group, Modal, Stack, Text, TextInput, Title, rem } from '@mantine/core';
import { getHotkeyHandler } from '@mantine/hooks';
import { ContextModalProps } from '@mantine/modals';
import { showNotification } from '@mantine/notifications';
import { IconKey } from '@tabler/icons-react';
import { ContentSource } from '@typing/content';
import { useState } from 'react';

export default function UnlockHomebrewModal(props: {
  opened: boolean;
  source: ContentSource;
  onSuccess: () => void;
  onClose: () => void;
}) {
  const [accessKey, setAccessKey] = useState('');

  const handleSubmit = () => {
    if (accessKey.trim() === props.source.keys?.access_key?.trim()) {
      props.onSuccess();
    } else {
      showNotification({
        id: 'invalid-key',
        title: 'Invalid Key',
        message: `Please enter the correct key provided by the author.`,
        color: 'red',
      });
    }
  };

  return (
    <Modal
      opened={props.opened}
      onClose={() => props.onClose()}
      title={<Title order={3}>Locked Bundle</Title>}
      closeOnClickOutside={false}
      closeOnEscape={false}
      keepMounted={false}
      zIndex={1000}
    >
      <Stack style={{ position: 'relative' }}>
        <Text fz='sm'>Please enter the access key provided by the author.</Text>
        <TextInput
          leftSection={<IconKey style={{ width: rem(14), height: rem(14) }} stroke={1.5} />}
          placeholder='Access Key'
          onChange={async (e) => {
            setAccessKey(e.target.value);
          }}
          onKeyDown={getHotkeyHandler([
            ['mod+Enter', handleSubmit],
            ['Enter', handleSubmit],
          ])}
        />
        <Group justify='flex-end'>
          <Button
            variant='default'
            onClick={() => {
              props.onClose();
            }}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Unlock</Button>
        </Group>
      </Stack>
    </Modal>
  );
}
