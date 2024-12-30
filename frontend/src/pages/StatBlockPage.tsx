import StatBlockSection from '@common/StatBlockSection';
import { GUIDE_BLUE } from '@constants/data';
import { defineDefaultSources, fetchContentById } from '@content/content-store';
import { defineDefaultSourcesForUser } from '@content/homebrew';
import DrawerBase from '@drawers/DrawerBase';
import { ActionIcon, Box, Button, createTheme, LoadingOverlay, MantineProvider, Stack, Text } from '@mantine/core';
import { makeRequest } from '@requests/request-manager';
import { IconMoon, IconSun } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { Character, Creature, LivingEntity } from '@typing/content';
import { getShadesFromColor } from '@utils/colors';
import { setPageTitle } from '@utils/document-change';
import { useState } from 'react';
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

  const [isLightMode, _setLightMode] = useState(false);
  const toggleLightMode = (lightMode: boolean) => {
    const htmlElement = document.documentElement;
    if (lightMode) {
      htmlElement.classList.add('inverted');
    } else {
      htmlElement.classList.remove('inverted');
    }
    _setLightMode(lightMode);
  };

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
    <MantineProvider
      // Simple copy of main WG theme:
      theme={createTheme({
        colors: {
          // @ts-ignore
          guide: getShadesFromColor(GUIDE_BLUE),
          dark: [
            '#C1C2C5',
            '#A6A7AB',
            '#909296',
            '#5c5f66',
            '#373A40',
            '#2C2E33',
            '#25262b',
            '#1A1B1E',
            '#141517',
            '#101113',
          ],
        },
        cursorType: 'pointer',
        primaryColor: 'guide',
        defaultRadius: 'md',
        fontFamily: 'Montserrat, sans-serif',
        fontFamilyMonospace: 'Ubuntu Mono, monospace',
      })}
      defaultColorScheme='dark'
    >
      <DrawerBase />
      <Box
        p='xl'
        style={{
          position: 'relative',
        }}
        h='100dvh'
      >
        <ActionIcon
          variant='light'
          size='lg'
          radius='xl'
          aria-label='Toggle Light/Dark Mode'
          style={{
            position: 'absolute',
            bottom: 15,
            right: 15,
          }}
          onClick={() => {
            toggleLightMode(!isLightMode);
          }}
        >
          {isLightMode ? (
            <IconSun style={{ width: '70%', height: '70%' }} stroke={1.5} />
          ) : (
            <IconMoon style={{ width: '70%', height: '70%' }} stroke={1.5} />
          )}
        </ActionIcon>
        <StatBlockSection entity={entity} />
        <DrawerBase />
      </Box>
    </MantineProvider>
  );
}
