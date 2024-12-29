import { Icon } from '@common/Icon';
import { GUIDE_BLUE } from '@constants/data';
import {
  ActionIcon,
  Box,
  Button,
  ColorInput,
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
} from '@mantine/core';
import { ContextModalProps, modals } from '@mantine/modals';
import { useState } from 'react';
import { SelectIconModalContents } from './SelectIconModal';
import { Encounter } from '@typing/content';
import _ from 'lodash-es';
import { SelectIcon, stringifyIconValue } from '@common/IconDisplay';
import { IconBulbFilled } from '@tabler/icons-react';
import { generateEncounters } from '@ai/open-ai-handler';

export default function GenerateEncounterModal({
  context,
  id,
  innerProps,
}: ContextModalProps<{
  partySize?: number;
  partyLevel?: number;
  onComplete: (encounter: Encounter) => void;
}>) {
  const [partySize, setPartySize] = useState(innerProps.partySize);
  const [partyLevel, setPartyLevel] = useState(innerProps.partyLevel);
  const [description, setDescription] = useState('');

  const isInvalid = !partySize || partyLevel === undefined;
  return (
    <Stack style={{ position: 'relative' }}>
      <Group wrap='nowrap'>
        <NumberInput
          label='Party Size'
          placeholder='Party Size'
          w={120}
          min={0}
          value={partySize}
          onChange={(value) => {
            setPartySize(value ? parseInt(`${value}`) : undefined);
          }}
        />
        <Select
          label='Party Level'
          data={Array.from({ length: 31 }, (_, i) => i.toString())}
          w={120}
          value={partyLevel?.toString()}
          onChange={(value) => {
            setPartyLevel(value ? parseInt(value) : undefined);
          }}
        />
      </Group>

      <Textarea
        label='Description'
        placeholder='Setting, mood, ideas, etc.'
        minRows={4}
        maxRows={4}
        value={description}
        onChange={(e) => setDescription(e.currentTarget.value)}
      />
      <Button
        variant='gradient'
        gradient={{ from: 'guide', to: 'teal' }}
        // rightSection={<IconBulbFilled size='0.9rem' />}
        fullWidth
        disabled={isInvalid}
        onClick={async () => {
          if (isInvalid) return;
          const encounters = await generateEncounters(partyLevel, partySize, description);
        }}
      >
        Generate Encounters
      </Button>
    </Stack>
  );
}
