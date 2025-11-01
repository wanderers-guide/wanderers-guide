import { Icon } from '@common/Icon';
import { GUIDE_BLUE } from '@constants/data';
import {
  ActionIcon,
  Box,
  Button,
  ColorInput,
  FileButton,
  Group,
  Modal,
  NumberInput,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
  UnstyledButton,
  VisuallyHidden,
} from '@mantine/core';
import { ContextModalProps, modals } from '@mantine/modals';
import { useRef, useState } from 'react';
import { SelectIconModalContents } from './SelectIconModal';
import { Encounter } from '@typing/content';
import { SelectIcon, stringifyIconValue } from '@common/IconDisplay';
import { cloneDeep } from 'lodash-es';
import { IconDownload, IconUpload } from '@tabler/icons-react';
import { downloadObjectAsJson } from '@export/export-to-json';
import { getFileContents } from '@import/json/import-from-json';
import { hideNotification, showNotification } from '@mantine/notifications';

export default function UpdateEncounterModal({
  context,
  id,
  innerProps,
}: ContextModalProps<{
  encounter: Encounter;
  onUpdate: (encounter: Encounter) => void;
  onDelete: () => void;
}>) {
  const [title, setTitle] = useState(innerProps.encounter.name);
  const [icon, setIcon] = useState(innerProps.encounter.icon);
  const [color, setColor] = useState(innerProps.encounter.color);
  const [partySize, setPartySize] = useState(innerProps.encounter.meta_data.party_size);
  const [partyLevel, setPartyLevel] = useState(innerProps.encounter.meta_data.party_level);
  const [description, setDescription] = useState(innerProps.encounter.meta_data.description);

  const openConfirmModal = () =>
    modals.openConfirmModal({
      title: <Title order={4}>Delete Encounter</Title>,
      children: <Text size='sm'>Are you sure you want to delete this encounter?</Text>,
      labels: { confirm: 'Confirm', cancel: 'Cancel' },
      onCancel: () => {},
      onConfirm: () => {
        innerProps.onDelete();
        context.closeModal(id);
      },
      zIndex: 1001,
    });

  const importEncounterRef = useRef<HTMLButtonElement>(null);
  async function importEncounter(file: File) {
    const contents = await getFileContents(file);
    let encounter: Encounter | null = null;
    try {
      const obj = JSON.parse(contents);

      if (obj.version === 1) {
        encounter = obj.encounter;
      } else {
        throw new Error();
      }
    } catch (e) {
      hideNotification(`importing-${file.name}`);
      showNotification({
        title: 'Import failed',
        message: 'Invalid JSON file',
        color: 'red',
        icon: null,
        autoClose: false,
      });
    }
    return encounter;
  }
  const openConfirmImportModal = (encounter: Encounter) =>
    modals.openConfirmModal({
      title: <Title order={4}>Import Encounter</Title>,
      children: <Text size='sm'>Are you sure you want to import? It will override the existing encounter.</Text>,
      labels: { confirm: 'Override', cancel: 'Cancel' },
      onCancel: () => {},
      onConfirm: () => {
        innerProps.onUpdate(encounter);
        context.closeModal(id);
      },
      zIndex: 1001,
    });

  async function exportEncounter(encounter: Encounter) {
    const exportObject = {
      version: 1,
      encounter: encounter,
    };

    const fileName = encounter.name
      .trim()
      .toLowerCase()
      .replace(/([^a-z0-9]+)/gi, '-');
    downloadObjectAsJson(exportObject, fileName);
  }

  return (
    <Stack style={{ position: 'relative' }}>
      <Group wrap='nowrap'>
        <TextInput
          label='Title'
          defaultValue={title}
          placeholder='Title'
          onChange={async (e) => {
            setTitle(e.currentTarget.value);
          }}
          w={180}
        />
        <NumberInput
          label='Party Size'
          placeholder='Party Size'
          w={100}
          min={0}
          value={partySize}
          onChange={(value) => {
            setPartySize(value ? parseInt(`${value}`) : undefined);
          }}
        />
        <Select
          label='Party Level'
          data={Array.from({ length: 31 }, (_, i) => i.toString())}
          w={100}
          value={partyLevel?.toString()}
          onChange={(value) => {
            setPartyLevel(value ? parseInt(value) : undefined);
          }}
        />
      </Group>

      <Textarea
        label='Description'
        placeholder='Context, notes, etc.'
        value={description}
        onChange={(e) => setDescription(e.currentTarget.value)}
        autosize
        minRows={3}
        maxRows={3}
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
        <Group gap={5}>
          <VisuallyHidden>
            {/* This is a hack to get the FileButton to work with the button component */}
            <FileButton
              onChange={async (file) => {
                if (!file) return;
                const encounter = await importEncounter(file);
                if (encounter) {
                  openConfirmImportModal(encounter);
                }
              }}
              accept='application/JSON'
            >
              {(props) => (
                <Button ref={importEncounterRef} {...props}>
                  Import
                </Button>
              )}
            </FileButton>
          </VisuallyHidden>
          <Button variant='light' size='compact-xs' color='gray' onClick={() => importEncounterRef.current?.click()}>
            Import
          </Button>
          <Button variant='light' size='compact-xs' color='gray' onClick={() => exportEncounter(innerProps.encounter)}>
            Export
          </Button>
          <Button variant='light' size='compact-xs' color='red' onClick={() => openConfirmModal()}>
            Delete
          </Button>
        </Group>
        <Group justify='flex-end'>
          <Button variant='default' onClick={() => context.closeModal(id)}>
            Cancel
          </Button>
          <Button
            disabled={!title.trim() || !icon || !color}
            onClick={() => {
              innerProps.onUpdate({
                ...cloneDeep(innerProps.encounter),
                name: title,
                icon,
                color,
                meta_data: {
                  ...cloneDeep(innerProps.encounter).meta_data,
                  description,
                  party_size: partySize,
                  party_level: partyLevel,
                },
              });
              context.closeModal(id);
            }}
          >
            Save
          </Button>
        </Group>
      </Group>
    </Stack>
  );
}
