import { ActionSymbol } from '@common/Actions';
import RichText from '@common/RichText';
import TraitsDisplay from '@common/TraitsDisplay';
import { fetchHazardById, getHazardQueryKey } from '@content/hazards';
import { remarkHazardReferences, preloadHazardReferences } from '@content/hazard-links';
import DrawerLoadState from '@drawers/DrawerLoadState';
import { Badge, Box, Divider, Group, Stack, Text, Title } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { Hazard } from '@schemas/content';
import { sign } from '@utils/numbers';
import { toLabel } from '@utils/strings';

type HazardDrawerData = { id?: number; hazard?: Hazard; sourceId?: number };

/** Show the hazard name and level without treating it as a living creature. */
export function HazardDrawerTitle(props: { data: HazardDrawerData }) {
  const { data: fetchedHazard } = useQuery({
    queryKey: getHazardQueryKey(props.data.id, props.data.sourceId),
    queryFn: () => fetchHazardById(props.data.id!, props.data.sourceId ? [props.data.sourceId] : undefined),
    enabled: !!props.data.id && !props.data.hazard,
  });
  const hazard = props.data.hazard ?? fetchedHazard;

  return hazard ? (
    <Group justify='space-between' align='start' wrap='wrap' gap='xs'>
      <Title order={3}>{toLabel(hazard.name)}</Title>
      <Text c='dimmed'>Hazard {hazard.level}</Text>
    </Group>
  ) : null;
}

/** Render official hazard fields from the validated, read-only catalog record. */
export function HazardDrawerContent(props: { data: HazardDrawerData }) {
  const {
    data: fetchedHazard,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: getHazardQueryKey(props.data.id, props.data.sourceId),
    queryFn: () => fetchHazardById(props.data.id!, props.data.sourceId ? [props.data.sourceId] : undefined),
    enabled: !!props.data.id && !props.data.hazard,
  });
  const hazard = props.data.hazard ?? fetchedHazard;

  const { data: referencesReady } = useQuery({
    queryKey: [
      'hazard-references',
      hazard?.id,
      hazard?.uuid,
      hazard?.updated_at,
      ...getHazardQueryKey(props.data.id, props.data.sourceId),
    ],
    queryFn: () => preloadHazardReferences(hazard!),
    enabled: !!hazard,
    staleTime: Infinity,
  });

  if (!hazard) return <DrawerLoadState loading={isFetching} onRetry={refetch} />;

  // Only enrich parsed prose after the official reference preload; authored Markdown stays intact.
  const remarkPlugins = referencesReady ? [remarkHazardReferences] : [];
  const { details } = hazard;
  const defenses = details.defenses;
  const defenseLines = defenses
    ? [
        [
          defenses.ac !== undefined ? `**AC** ${defenses.ac}` : null,
          defenses.fort !== undefined ? `**Fort** ${sign(defenses.fort)}` : null,
          defenses.ref !== undefined ? `**Ref** ${sign(defenses.ref)}` : null,
        ]
          .filter(Boolean)
          .join('; '),
        [
          defenses.hardness !== undefined ? `**Hardness** ${defenses.hardness}` : null,
          defenses.hp !== undefined
            ? `**HP** ${defenses.hp}${defenses.bt !== undefined ? ` (BT ${defenses.bt})` : ''}`
            : defenses.bt !== undefined
              ? `**BT** ${defenses.bt}`
              : null,
        ]
          .filter(Boolean)
          .join('; '),
        defenses.immunities ? `**Immunities** ${defenses.immunities}` : '',
      ].filter(Boolean)
    : [];

  return (
    <Box>
      <Stack gap='xs'>
        <Group gap='xs'>
          <TraitsDisplay traitIds={details.trait_ids ?? []} rarity={hazard.rarity} interactable />
          <Badge variant='outline' color='gray.5' size='md'>
            {toLabel(details.complexity.toLowerCase())}
          </Badge>
          {details.trait_labels.map((label) => (
            <Badge key={label} variant='outline' color='gray.5' size='md'>
              {label}
            </Badge>
          ))}
        </Group>

        <Text ta='justify'>
          <Text fw={600} span>
            Stealth
          </Text>{' '}
          <RichText span remarkPlugins={remarkPlugins}>
            {details.stealth}
          </RichText>
        </Text>
        <RichText ta='justify' remarkPlugins={remarkPlugins}>
          {details.description}
        </RichText>
        <Text ta='justify'>
          <Text fw={600} span>
            Disable
          </Text>{' '}
          <RichText span remarkPlugins={remarkPlugins}>
            {details.disable}
          </RichText>
        </Text>

        {defenseLines.length > 0 && (
          <>
            <Divider />
            <RichText ta='justify' remarkPlugins={remarkPlugins}>
              {defenseLines.join('\n\n')}
            </RichText>
          </>
        )}

        <Divider />
        <Group gap='xs' align='center' wrap='wrap'>
          <Text fw={600}>{details.activation.name}</Text>
          {details.activation.actions && <ActionSymbol cost={details.activation.actions} size='1.5rem' />}
          {details.activation.traits?.length ? (
            <RichText c='dimmed' span remarkPlugins={remarkPlugins}>
              ({details.activation.traits.join(', ')})
            </RichText>
          ) : null}
        </Group>
        <Text ta='justify'>
          <Text fw={600} span>
            Trigger
          </Text>{' '}
          <RichText span remarkPlugins={remarkPlugins}>
            {details.activation.trigger}
          </RichText>
        </Text>
        <Box>
          <Text fw={600}>Effect</Text>
          <RichText ta='justify' remarkPlugins={remarkPlugins}>
            {details.activation.effect}
          </RichText>
        </Box>

        {details.routine && (
          <Box>
            <Text fw={600}>
              Routine ({details.routine.actions} {details.routine.actions === 1 ? 'action' : 'actions'})
            </Text>
            <RichText ta='justify' remarkPlugins={remarkPlugins}>
              {details.routine.text}
            </RichText>
          </Box>
        )}
        {details.reset && (
          <Text ta='justify'>
            <Text fw={600} span>
              Reset
            </Text>{' '}
            <RichText span remarkPlugins={remarkPlugins}>
              {details.reset}
            </RichText>
          </Text>
        )}
      </Stack>
    </Box>
  );
}
