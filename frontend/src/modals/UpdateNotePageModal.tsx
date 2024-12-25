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

  const [openedModal, setOpenedModal] = useState(false);

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
      <Modal opened={openedModal} onClose={() => setOpenedModal(false)} title='Select Icon' zIndex={1000}>
        <SelectIconModalContents
          color={color}
          onSelect={(option) => {
            console.log(option);
            setIcon(option);
          }}
          onClose={() => setOpenedModal(false)}
        />
      </Modal>

      <TextInput
        label='Title'
        defaultValue={title}
        placeholder='Title'
        onChange={async (e) => {
          setTitle(e.currentTarget.value);
        }}
        w={150}
      />

      <Group wrap='nowrap' align='flex-start'>
        <Box pt={2}>
          <Text fz='xs' c='gray.4'>
            Icon
          </Text>
          <UnstyledButton
            w={'50%'}
            onClick={() => {
              setOpenedModal(true);
            }}
          >
            <ActionIcon variant='light' aria-label='Icon' size='lg' radius='xl' color={color}>
              <Icon name={icon} style={{ width: '70%', height: '70%' }} stroke={1.5} />
            </ActionIcon>
          </UnstyledButton>
        </Box>

        <ColorInput
          radius='xl'
          size='xs'
          label='Color'
          placeholder='Color'
          defaultValue={color}
          swatches={[
            '#25262b',
            '#868e96',
            '#fa5252',
            '#e64980',
            '#be4bdb',
            '#8d69f5',
            '#577deb',
            GUIDE_BLUE,
            '#15aabf',
            '#12b886',
            '#40c057',
            '#82c91e',
            '#fab005',
            '#fd7e14',
          ]}
          swatchesPerRow={7}
          onChange={(color) => {
            setColor(color);
          }}
          styles={(t) => ({
            dropdown: {
              zIndex: 1500,
            },
          })}
        />
      </Group>

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
