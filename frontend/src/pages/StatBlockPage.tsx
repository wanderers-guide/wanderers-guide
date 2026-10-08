import { ColorSchemeToggle } from '@common/ColorSchemeToggle';
import StatBlockSection from '@common/StatBlockSection';
import { fetchContentById } from '@content/content-store';
import DrawerBase from '@drawers/DrawerBase';
import { Box, LoadingOverlay, Stack, Text } from '@mantine/core';
import { makeRequest } from '@requests/request-manager';
import { useQuery } from '@tanstack/react-query';
import { Character, Creature, LivingEntity } from '@schemas/content';
import { getAnchorStyles } from '@utils/anchor';
import { setPageTitle } from '@utils/document-change';
import { useLoaderData } from 'react-router-dom';

export function Component() {
  const { type, id } = useLoaderData() as {
    type: string;
    id: string;
  };

  const { data, isLoading } = useQuery({
    queryKey: [`fetch-stat-block-data`, { type, id }],
    queryFn: async () => {
      if (type === 'character') {
        return await makeRequest<Character>('find-character', {
          id: id,
        });
      } else if (type === 'creature') {
        return await fetchContentById<Creature>('creature', parseInt(id));
      }
    },
  });
  const entity: LivingEntity | null = data ?? null;
  setPageTitle(entity ? `${entity.name} - Stat Block` : `Stat Block`);

  if (isLoading) {
    return <LoadingOverlay visible />;
  }
  if (!entity) {
    return (
      <Box p='xl'>
        <Stack>
          <Text ta='center' fs='italic'>
            Failed to find {type} with ID #{id}
          </Text>
        </Stack>
      </Box>
    );
  }
  return (
    <Box
      p='xl'
      style={{
        position: 'relative',
      }}
      h='100dvh'
    >
      <Box style={getAnchorStyles({ r: 15, b: 15 })}>
        <ColorSchemeToggle />
      </Box>
      <StatBlockSection entity={entity} />
      <DrawerBase />
    </Box>
  );
}
