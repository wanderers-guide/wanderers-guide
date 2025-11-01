import { Icon } from '@common/Icon';
import { GUIDE_BLUE } from '@constants/data';
import {
  ActionIcon,
  Box,
  Button,
  ColorInput,
  Group,
  Modal,
  Stack,
  Text,
  TextInput,
  Title,
  UnstyledButton,
} from '@mantine/core';
import { ContextModalProps, modals } from '@mantine/modals';
import { useState } from 'react';
import { SelectIconModalContents } from './SelectIconModal';
import { SelectIcon, stringifyIconValue } from '@common/IconDisplay';

export default function UpdateNotePageModal({
  context,
  id,
  innerProps,
}: ContextModalProps<{
  page: { name: string; icon: string; color: string };
  onUpdate: (name: string, icon: string, color: string) => void;
  onDelete: () => void;
}>) {
  const [title, setTitle] = useState(innerProps.page.name);
  const [icon, setIcon] = useState(innerProps.page.icon);
  const [color, setColor] = useState(innerProps.page.color);

  const openConfirmModal = () =>
    modals.openConfirmModal({
      title: <Title order={4}>Delete Page</Title>,
      children: <Text size='sm'>Are you sure you want to delete this page?</Text>,
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
        label='Title'
        defaultValue={title}
        placeholder='Title'
        onChange={async (e) => {
          setTitle(e.currentTarget.value);
        }}
        w={150}
      />

      <SelectIcon
        iconOnly
        strValue={stringifyIconValue({ type: 'icon', value: icon, color })}
        setValue={(strValue, iconValue) => {
          setIcon(iconValue.value);
          setColor(iconValue.color ?? GUIDE_BLUE);
        }}
      />

      <Group justify='space-between'>
        <Button variant='light' size='compact-xs' color='red' onClick={() => openConfirmModal()}>
          Delete Page
        </Button>
        <Group justify='flex-end'>
          <Button variant='default' onClick={() => context.closeModal(id)}>
            Cancel
          </Button>
          <Button
            disabled={!title.trim() || !icon || !color}
            onClick={() => {
              innerProps.onUpdate(title, icon, color);
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
