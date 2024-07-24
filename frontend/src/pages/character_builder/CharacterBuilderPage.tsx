import { characterState } from '@atoms/characterAtoms';
import BlurBox from '@common/BlurBox';
import { defineDefaultSources, resetContentStore } from '@content/content-store';
import { saveCustomization } from '@content/customization-cache';
import {
  ActionIcon,
  Box,
  Center,
  LoadingOverlay,
  ScrollArea,
  Stack,
  Stepper,
  StepperProps,
  Text,
  rem,
  useMantineTheme,
} from '@mantine/core';
import { useDebouncedValue, useDidUpdate } from '@mantine/hooks';
import { makeRequest } from '@requests/request-manager';
import { IconArrowLeft, IconArrowRight, IconHammer, IconHome, IconUser } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Character } from '@typing/content';
import { JSendResponse } from '@typing/requests';
import { isPlayable } from '@utils/character';
import { setPageTitle } from '@utils/document-change';
import { isCharacterBuilderMobile } from '@utils/screen-sizes';
import { useEffect, useState } from 'react';
import { useLoaderData, useNavigate } from 'react-router-dom';
import { useRecoilState } from 'recoil';
import CharBuilderCreation from './CharBuilderCreation';
import CharBuilderHome from './CharBuilderHome';
import { getCachedPublicUser } from '@auth/user-manager';
import _ from 'lodash-es';

export function Component() {
  setPageTitle(`Builder`);

  const theme = useMantineTheme();
  const [active, setActive] = useState(0);
  const navigate = useNavigate();

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

  useEffect(() => {
    if (active === 2) {
      navigate(`/sheet/${characterId}`);
    }
  }, [active]);

  const stepIconStyle = { width: rem(18), height: rem(18) };
  const pageHeight = 550;

  const [character, setCharacter] = useRecoilState(characterState);

  const handleFetchedCharacter = (resultCharacter: Character | null) => {
    if (resultCharacter) {
      // Make sure we sync the enabled content sources
      defineDefaultSources(resultCharacter.content_sources?.enabled ?? []);

      // Cache character customization for fast loading
      saveCustomization({
        background_image_url:
          resultCharacter.details?.background_image_url || getCachedPublicUser()?.background_image_url,
        sheet_theme: resultCharacter.details?.sheet_theme || getCachedPublicUser()?.site_theme,
      });
    } else {
      // Character not found, redirect to characters
      window.location.href = '/characters';
    }

    if (!_.isEqual(character, resultCharacter)) {
      setCharacter(resultCharacter);
    }
  };

  // Fetch character from db
  const { isLoading, isInitialLoading } = useQuery({
    queryKey: [`find-character-${characterId}`],
    queryFn: async () => {
      const resultCharacter = await makeRequest<Character>('find-character', {
        id: characterId,
      });
      handleFetchedCharacter(resultCharacter);
      return true;
    },
    refetchOnWindowFocus: false,
  });

  // Update character in db when state changed
  const [debouncedCharacter] = useDebouncedValue(character, 200);
  useDidUpdate(() => {
    if (!debouncedCharacter) return;
    mutateCharacter({
      level: debouncedCharacter.level,
      name: debouncedCharacter.name,
      details: debouncedCharacter.details,
      content_sources: debouncedCharacter.content_sources,
      operation_data: debouncedCharacter.operation_data,
      meta_data: debouncedCharacter.meta_data,
      variants: debouncedCharacter.variants,
      options: debouncedCharacter.options,
      custom_operations: debouncedCharacter.custom_operations,
      campaign_id: debouncedCharacter.campaign_id,
    });
  }, [debouncedCharacter]);

  // Update character stats
  const { mutate: mutateCharacter } = useMutation(
    async (data: {
      name?: string;
      level?: number;
      details?: any;
      content_sources?: any;
      operation_data?: any;
      meta_data?: any;
      variants?: any;
      options?: any;
      custom_operations?: any;
      campaign_id?: number;
    }) => {
      const resData = await makeRequest('update-character', {
        id: characterId,
        ...data,
      });
      if (_.isArray(resData) && resData.length > 0) {
        handleFetchedCharacter(resData[0]);
      }
      return true;
    },
    {
      onSuccess: () => {},
    }
  );

  return (
    <Center>
      <Box maw={800} w='100%' pb='sm'>
        <Stack style={{ position: 'relative' }}>
          {!isCharacterBuilderMobile() && (
            <>
              <ActionIcon
                variant='filled'
                color='gray'
                aria-label='Next Page'
                radius={60}
                size={60}
                style={{
                  backdropFilter: `blur(8px)`,
                  WebkitBackdropFilter: `blur(8px)`,
                  // Add alpha channel to hex color (browser support: https://caniuse.com/css-rrggbbaa)
                  backgroundColor: theme.colors.dark[8] + 'D3',
                  position: 'absolute',
                  top: '45%',
                  right: -100,
                  visibility: active === 2 ? 'hidden' : 'visible',
                }}
                onClick={() => handleStepChange(active + 1)}
                disabled={active === 1 && !isPlayable(character)}
              >
                <IconArrowRight size='1.7rem' stroke={2} />
              </ActionIcon>
              <ActionIcon
                variant='filled'
                color='gray'
                aria-label='Previous Page'
                radius={60}
                size={60}
                style={{
                  backdropFilter: `blur(8px)`,
                  WebkitBackdropFilter: `blur(8px)`,
                  // Add alpha channel to hex color (browser support: https://caniuse.com/css-rrggbbaa)
                  backgroundColor: theme.colors.dark[8] + 'D3',
                  position: 'absolute',
                  top: '45%',
                  left: -100,
                  visibility: active === 0 ? 'hidden' : 'visible',
                }}
                onClick={() => handleStepChange(active - 1)}
              >
                <IconArrowLeft size='1.7rem' stroke={2} />
              </ActionIcon>
            </>
          )}
          <BlurBox blur={10} p='sm'>
            <Stepper
              active={active}
              onStepClick={setActive}
              iconSize={isCharacterBuilderMobile() ? undefined : 40}
              size={isCharacterBuilderMobile() ? 'xs' : 'lg'}
              wrap={false}
            >
              <Stepper.Step
                label='Home'
                allowStepSelect={true}
                icon={<IconHome style={stepIconStyle} />}
                completedIcon={<IconHome style={stepIconStyle} />}
              >
                <ScrollArea h={pageHeight} scrollbars='y'>
                  {active === 0 && character && !isLoading ? (
                    <CharBuilderHome pageHeight={pageHeight} />
                  ) : (
                    <LoadingOverlay
                      visible={isLoading}
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
                <ScrollArea h={pageHeight} scrollbars='y'>
                  {active === 1 && character && !isLoading ? (
                    <CharBuilderCreation pageHeight={pageHeight} />
                  ) : (
                    <LoadingOverlay
                      visible={isLoading}
                      zIndex={1000}
                      overlayProps={{ radius: 'md', backgroundOpacity: 0 }}
                      loaderProps={{ type: 'bars' }}
                    />
                  )}
                </ScrollArea>
              </Stepper.Step>
              <Stepper.Step
                label='Sheet'
                allowStepSelect={isPlayable(character)}
                icon={<IconUser style={stepIconStyle} />}
                completedIcon={<IconUser style={stepIconStyle} />}
              >
                <ScrollArea h={pageHeight} scrollbars='y'>
                  <Text ta='center'>Redirecting to sheet...</Text>
                </ScrollArea>
              </Stepper.Step>

              <Stepper.Completed>
                <ScrollArea h={pageHeight} scrollbars='y'>
                  Complete
                </ScrollArea>
              </Stepper.Completed>
            </Stepper>
          </BlurBox>
        </Stack>
      </Box>
    </Center>
  );
}
