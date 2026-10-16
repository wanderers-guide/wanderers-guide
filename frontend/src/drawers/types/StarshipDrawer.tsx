import RichText from '@common/RichText';
import TraitsDisplay from '@common/TraitsDisplay';
import { fetchStarshipById, getStarshipQueryKey } from '@content/starships';
import DrawerLoadState from '@drawers/DrawerLoadState';
import { Badge, Divider, Group, Stack, Text, Title } from '@mantine/core';
import type { Starship } from '@schemas/content';
import { useQuery } from '@tanstack/react-query';

type StarshipDrawerData = { id?: number; sourceId?: number; starship?: Starship };

/** Share one validated query between the title and source-only stat block. */
function useStarship(data: StarshipDrawerData) {
  return useQuery({
    queryKey: getStarshipQueryKey(data.id, data.sourceId),
    queryFn: () => fetchStarshipById(data.id!, data.sourceId),
    enabled: !!data.id && !data.starship,
  });
}

/** Keep the ordinary stat-block heading while clearly identifying the ship scale. */
export function StarshipDrawerTitle(props: { data: StarshipDrawerData }) {
  const { data } = useStarship(props.data);
  const ship = props.data.starship ?? data;
  return ship ? (
    <Group justify='space-between' align='start' wrap='wrap' gap='xs'>
      <Title order={3}>{ship.name}</Title>
      <Text c='dimmed'>Starship {ship.level}</Text>
    </Group>
  ) : null;
}

/** Display printed ship rules without health controls, inventory effects, or creature adjustment. */
export function StarshipDrawerContent(props: { data: StarshipDrawerData }) {
  const { data, isFetching, refetch } = useStarship(props.data);
  const ship = props.data.starship ?? data;
  if (!ship) return <DrawerLoadState loading={isFetching} onRetry={refetch} />;
  return (
    <Stack gap='xs'>
      <Group gap='xs' wrap='wrap'>
        <TraitsDisplay traitIds={ship.details.trait_ids ?? []} rarity={ship.rarity} interactable />
        {ship.details.trait_labels?.map((label) => (
          <Badge key={label} variant='outline' color='gray.5'>
            {label}
          </Badge>
        ))}
      </Group>
      {ship.details.description && <RichText>{ship.details.description}</RichText>}
      <Divider />
      <RichText>{ship.details.stat_block}</RichText>
    </Stack>
  );
}
