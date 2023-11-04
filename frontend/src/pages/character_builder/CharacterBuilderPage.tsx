import { useEffect, useState } from 'react';
import {
  Avatar,
  Text,
  Group,
  Stack,
  Button,
  Stepper,
  Box,
  Center,
  TextInput,
  NumberInput,
  Select,
  PasswordInput,
  Tabs,
  rem,
  Switch,
  ScrollArea,
  ActionIcon,
  useMantineTheme,
  LoadingOverlay,
  Title,
} from '@mantine/core';
import BlurBox from '@common/BlurBox';
import {
  IconPhoto,
  IconMessageCircle,
  IconSettings,
  IconBooks,
  IconAsset,
  IconVocabulary,
  IconWorld,
  IconBook2,
  IconBrandSafari,
  IconMap,
  IconNotebook,
  IconDots,
  IconUsers,
  IconArrowRight,
  IconArrowLeft,
  IconTools,
  IconHome,
  IconUser,
  IconHammer,
  IconPhotoPlus,
  IconUserCircle,
  IconUserScan,
  IconPhotoUp,
  IconUserPlus,
  IconRefresh,
  IconRefreshDot,
} from '@tabler/icons-react';
import { LinksGroup } from '@common/LinksGroup';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Character, ContentSource } from '@typing/content';
import { makeRequest } from '@requests/request-manager';
import { useLoaderData } from 'react-router-dom';
import { useDebouncedValue, useDidUpdate } from '@mantine/hooks';
import { modals, openContextModal } from '@mantine/modals';
import { UpdateResponse } from '@typing/requests';
import CharBuilderHome from './CharBuilderHome';
import CharBuilderCreation from './CharBuilderCreation';
import { defineEnabledContentSources } from '@content/content-controller';

export default function CharacterBuilderPage() {
  const theme = useMantineTheme();
  const [active, setActive] = useState(0);

  const { characterId } = useLoaderData() as {
    characterId: number;
  };

  const handleStepChange = (nextStep: number) => {
    const isOutOfBounds = nextStep > 3 || nextStep < 0;
    if (isOutOfBounds) {
      return;
    }
    setActive(nextStep);
  };

  const canGoToSheet = () => {
    return true;
  };

  const stepIconStyle = { width: rem(18), height: rem(18) };
  const pageHeight = 500;

  const queryClient = useQueryClient();

  const [character, setCharacter] = useState<Character>();

  // Fetch character from db
  const { data: charDetails, isFetching } = useQuery({
    queryKey: [`find-character-${characterId}`],
    queryFn: async () => {
      const charDetails = await makeRequest<{ characters: Character[]; books: ContentSource[] }>('find-characters', {
        ids: [characterId],
      });
      return charDetails;
    },
    refetchOnWindowFocus: false,
  });

  // Update character state when fetched from db
  useDidUpdate(() => {
    if (charDetails?.characters && charDetails?.characters.length > 0) {
      const newCharacter = charDetails.characters[0];
      setCharacter(newCharacter);

      // Make sure we sync the enabled content sources
      defineEnabledContentSources(newCharacter.content_sources?.enabled ?? []);
    }
  }, [charDetails]);

  // Update character in db when state changed
  const [debouncedCharacter] = useDebouncedValue(character, 200);
  useDidUpdate(() => {
    if (!debouncedCharacter) return;
    console.log(debouncedCharacter);
    mutateCharacter({
      level: debouncedCharacter.level,
      name: debouncedCharacter.name,
      details: debouncedCharacter.details,
      content_sources: debouncedCharacter.content_sources,
    });
  }, [debouncedCharacter]);

  // Update character stats
  const { mutate: mutateCharacter } = useMutation(
    async (data: { name?: string; level?: number; details?: any; content_sources?: any }) => {
      const response = await makeRequest<UpdateResponse>('update-character', {
        id: characterId,
        ...data,
      });
      return response ? response.success : false;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries([`find-character-${characterId}`]);
      },
    }
  );



  return (
    <Center>
      <Box maw={800} w='100%'>
        <Stack style={{ position: 'relative' }}>
          <ActionIcon
            variant='filled'
            color='gray'
            aria-label='Next Page'
            radius='xl'
            size='xl'
            style={{
              position: 'absolute',
              top: '45%',
              right: -70,
              visibility: active === 2 ? 'hidden' : 'visible',
            }}
            onClick={() => handleStepChange(active + 1)}
            hidden={active === 3}
          >
            <IconArrowRight style={{ width: '70%', height: '70%' }} stroke={2} />
          </ActionIcon>
          <ActionIcon
            variant='filled'
            color='gray'
            aria-label='Previous Page'
            radius='xl'
            size='xl'
            style={{
              position: 'absolute',
              top: '45%',
              left: -70,
              visibility: active === 0 ? 'hidden' : 'visible',
            }}
            onClick={() => handleStepChange(active - 1)}
          >
            <IconArrowLeft style={{ width: '70%', height: '70%' }} stroke={2} />
          </ActionIcon>
          {/* <Group justify='space-between'>
            <Group>
              <Avatar size='md' radius='xl' />
              <Text c='gray.0' fz='md'>
                Unknown Wanderer
              </Text>
            </Group>
            <Button variant='subtle' color='gray' size='compact-md' radius='xl'>
              View Character Stats
            </Button>
          </Group> */}
          <BlurBox blur={10} p='sm'>
            <Stepper active={active} onStepClick={setActive} iconSize={32}>
              <Stepper.Step
                label='Home'
                allowStepSelect={true}
                icon={<IconHome style={stepIconStyle} />}
                completedIcon={<IconHome style={stepIconStyle} />}
              >
                <ScrollArea h={pageHeight}>
                  {character && charDetails ? (
                    <CharBuilderHome
                      character={character}
                      setCharacter={setCharacter}
                      books={charDetails.books}
                    />
                  ) : (
                    <LoadingOverlay
                      visible={isFetching}
                      zIndex={1000}
                      overlayProps={{ radius: 'md', backgroundOpacity: 0 }}
                      loaderProps={{ type: 'bars' }}
                    />
                  )}
                </ScrollArea>
              </Stepper.Step>
              <Stepper.Step
                label='Builder'
                allowStepSelect={true}
                icon={<IconHammer style={stepIconStyle} />}
                completedIcon={<IconHammer style={stepIconStyle} />}
              >
                <ScrollArea h={pageHeight}>
                  {character && charDetails ? (
                    <CharBuilderCreation
                      pageHeight={pageHeight}
                      character={character}
                      setCharacter={setCharacter}
                      books={charDetails.books}
                    />
                  ) : (
                    <LoadingOverlay
                      visible={isFetching}
                      zIndex={1000}
                      overlayProps={{ radius: 'md', backgroundOpacity: 0 }}
                      loaderProps={{ type: 'bars' }}
                    />
                  )}
                </ScrollArea>
              </Stepper.Step>
              <Stepper.Step
                label='Sheet'
                allowStepSelect={canGoToSheet()}
                icon={<IconUser style={stepIconStyle} />}
                completedIcon={<IconUser style={stepIconStyle} />}
              >
                <ScrollArea h={pageHeight}>
                  <Text ta='center'>Redirecting to sheet...</Text>
                </ScrollArea>
              </Stepper.Step>

              <Stepper.Completed>
                <ScrollArea h={pageHeight}>Complete</ScrollArea>
              </Stepper.Completed>
            </Stepper>
          </BlurBox>
        </Stack>
      </Box>
    </Center>
  );
}
