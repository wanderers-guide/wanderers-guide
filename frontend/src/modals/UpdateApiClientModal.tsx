import { Icon } from '@common/Icon';
import { GUIDE_BLUE } from '@constants/data';
import {
  ActionIcon,
  Box,
  Button,
  Input,
  Group,
  Modal,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
  UnstyledButton,
  rem,
} from '@mantine/core';
import { ContextModalProps, modals } from '@mantine/modals';
import { useState } from 'react';
import { SelectIconModalContents } from './SelectIconModal';
import { SelectIcon, stringifyIconValue } from '@common/IconDisplay';
import { IconRefreshDot } from '@tabler/icons-react';

export default function UpdateApiClientModal({
  context,
  id,
  innerProps,
}: ContextModalProps<{
  client: { id: string; name: string; description?: string; image_url?: string; api_key: string };
  onUpdate: (id: string, name: string, description: string, image_url: string, api_key: string) => void;
  onDelete: () => void;
}>) {
  const [name, setName] = useState(innerProps.client.name);
  const [description, setDescription] = useState(innerProps.client.description || '');
  const [imageUrl, setImageUrl] = useState(innerProps.client.image_url || '');
  const [apiKey, setApiKey] = useState(innerProps.client.api_key);

  const openConfirmModal = () =>
    modals.openConfirmModal({
      title: <Title order={4}>Delete Client</Title>,
      children: <Text size='sm'>Are you sure you want to delete this client?</Text>,
      labels: { confirm: 'Confirm', cancel: 'Cancel' },
      onCancel: () => {},
      onConfirm: () => {
        innerProps.onDelete();
        context.closeModal(id);
      },
      zIndex: 1001,
    });

  return (
    <Stack style={{ position: 'relative' }}>
      <TextInput
        placeholder='API Key'
        label='API Key'
        readOnly
        value={apiKey}
        rightSection={
          <ActionIcon
            size='md'
            radius='xl'
            variant='light'
            onClick={() => {
              setApiKey(crypto.randomUUID());
            }}
          >
            <IconRefreshDot style={{ width: rem(18), height: rem(18) }} stroke={1.5} />
          </ActionIcon>
        }
      />

      <TextInput
        label='Name'
        defaultValue={name}
        placeholder='Name'
        onChange={async (e) => {
          setName(e.currentTarget.value);
        }}
      />

      <Textarea
        label='Description'
        minRows={2}
        maxRows={4}
        autosize
        defaultValue={description}
        placeholder='Description'
        onChange={(e) => {
          setDescription(e.currentTarget.value);
        }}
      />

      <SelectIcon
        strValue={imageUrl}
        setValue={(strValue) => {
          setImageUrl(strValue);
        }}
      />

      <Group justify='space-between'>
        <Button variant='light' size='compact-xs' color='red' onClick={() => openConfirmModal()}>
          Delete Client
        </Button>
        <Group justify='flex-end'>
          <Button variant='default' onClick={() => context.closeModal(id)}>
            Cancel
          </Button>
          <Button
            disabled={!name.trim()}
            onClick={() => {
              innerProps.onUpdate(innerProps.client.id, name, description, imageUrl, apiKey);
              context.closeModal(id);
            }}
          >
            Update
          </Button>
        </Group>
      </Group>
    </Stack>
  );
}
