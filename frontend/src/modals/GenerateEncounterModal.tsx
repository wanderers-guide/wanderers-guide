import { Icon } from '@common/Icon';
import { GUIDE_BLUE } from '@constants/data';
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  ColorInput,
  Divider,
  Group,
  Modal,
  NumberInput,
  Pill,
  ScrollArea,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
  UnstyledButton,
  useMantineTheme,
} from '@mantine/core';
import { ContextModalProps, modals } from '@mantine/modals';
import { useState } from 'react';
import { SelectIconModalContents } from './SelectIconModal';
import { Combatant, Encounter } from '@typing/content';
import _ from 'lodash-es';
import { SelectIcon, stringifyIconValue } from '@common/IconDisplay';
import { IconBulbFilled, IconSparkles } from '@tabler/icons-react';
import { generateEncounters } from '@ai/open-ai-handler';
import { showNotification } from '@mantine/notifications';
import { set } from 'node_modules/cypress/types/lodash';
import { useRecoilState } from 'recoil';
import { drawerState } from '@atoms/navAtoms';
import RichText from '@common/RichText';
import { calculateDifficulty } from '@pages/campaign/panels/EncountersPanel';

export default function GenerateEncounterModal({
  context,
  id,
  innerProps,
}: ContextModalProps<{
  partySize?: number;
  partyLevel?: number;
  onComplete: (encounter: Encounter) => void;
}>) {
  const theme = useMantineTheme();
  const [partySize, setPartySize] = useState(innerProps.partySize);
  const [partyLevel, setPartyLevel] = useState(innerProps.partyLevel);
  const [description, setDescription] = useState('');

  const [loading, setLoading] = useState(false);
  const [encounters, setEncounters] = useState<Encounter[]>([]);

  const isInvalid = !partySize || partyLevel === undefined || description.trim().length === 0;
  return (
    <Stack style={{ position: 'relative' }} gap={10}>
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
        rightSection={<IconSparkles size='0.9rem' />}
        fullWidth
        disabled={isInvalid}
        loading={loading}
        onClick={async () => {
          if (isInvalid) return;
          setLoading(true);
          const results = await generateEncounters(partyLevel, partySize, description);
          setLoading(false);

          if (!results) {
            showNotification({
              id: 'generation-failed',
              title: 'Generation Failed',
              message: `Failed to generate encounters, please try again later.`,
              color: 'red',
            });
            return;
          }

          setEncounters((prev) => [...prev, ...results]);
        }}
      >
        Generate Encounters
      </Button>

      {encounters.length > 0 && (
        <Card
          withBorder
          radius='md'
          pl={15}
          py={15}
          pr={5}
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            borderColor: theme.colors['dark'][8],
          }}
        >
          <ScrollArea h={315} scrollbars='y' pr={10}>
            <Stack>
              {encounters.map((encounter, i) => (
                <EncounterCard
                  key={i}
                  encounter={encounter}
                  onClick={() => {
                    innerProps.onComplete(encounter);
                    context.closeModal(id);
                  }}
                />
              ))}
            </Stack>
          </ScrollArea>
        </Card>
      )}
    </Stack>
  );
}

function EncounterCard(props: { encounter: Encounter; onClick: () => void }) {
  const theme = useMantineTheme();
  const [_drawer, openDrawer] = useRecoilState(drawerState);

  function getCreatureCounts(combatants: Combatant[]) {
    const grouped = _.groupBy(combatants, (c) => c.creature?.id);
    return _.map(grouped, (group, id) => ({
      creature: group[0].creature,
      amount: group.length,
    }));
  }

  const difficulty = calculateDifficulty(
    props.encounter,
    props.encounter.combatants.list.map((c) => ({
      ...c,
      data: c.creature!,
    }))
  );

  return (
    <Box
      style={{
        backgroundColor: theme.colors.dark[7],
        border: `2px solid ${theme.colors.dark[7]}`,
        borderRadius: theme.radius.md,
      }}
      p='xs'
    >
      <Stack gap={10}>
        <Group justify='space-between' wrap='nowrap'>
          <Title order={5}>{props.encounter.name}</Title>
          <Badge
            variant='dot'
            color={difficulty.color}
            size='lg'
            styles={{
              root: {
                textTransform: 'initial',
                fontSize: '0.6rem',
              },
            }}
          >
            {difficulty.status} ({difficulty.xp} XP)
          </Badge>
        </Group>
        <Pill.Group>
          {getCreatureCounts(props.encounter.combatants.list).map((record, i) => (
            <Pill
              key={i}
              size='sm'
              styles={{
                label: {
                  cursor: 'pointer',
                },
                root: {
                  border: `1px solid ${theme.colors.dark[4]}`,
                  backgroundColor: theme.colors.dark[6],
                },
              }}
              onClick={() => {
                openDrawer({
                  type: 'creature',
                  data: { id: record.creature?.id },
                });
              }}
            >
              {record.amount}x {record.creature?.name}
            </Pill>
          ))}
        </Pill.Group>
        <Box>
          <RichText ta='justify' fz='xs'>
            {props.encounter.meta_data.description || 'No description given.'}
          </RichText>
        </Box>
        <Button variant='light' onClick={props.onClick}>
          Create Encounter
        </Button>
      </Stack>
    </Box>
  );
}
