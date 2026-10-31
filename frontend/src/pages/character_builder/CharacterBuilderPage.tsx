import { useBuilderCharacter } from '@utils/use-builder-character';
import BlurBox from '@common/BlurBox';
import { glassStyle } from '@utils/colors';
import { ActionIcon, Box, Center, LoadingOverlay, ScrollArea, Stack, Stepper, Text, rem } from '@mantine/core';
import { IconArrowLeft, IconArrowRight, IconHammer, IconHome, IconUser } from '@tabler/icons-react';
import { isPlayable } from '@utils/character';
import { setPageTitle } from '@utils/document-change';
import { isCharacterBuilderMobile } from '@utils/screen-sizes';
import { useEffect, useState } from 'react';
import { useLoaderData, useNavigate } from 'react-router-dom';
import CharBuilderCreation from './CharBuilderCreation';
import CharBuilderHome from './CharBuilderHome';
import { useMediaQuery } from '@mantine/hooks';
import { phoneQuery } from '@utils/mobile-responsive';

export function Component() {
  setPageTitle(`Builder`);

  const isPhone = useMediaQuery(phoneQuery());
  const [active, setActive] = useState(0);
  const navigate = useNavigate();

  const { characterId } = useLoaderData() as {
    characterId: string;
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

  const { controller, content, calculationReady } = useBuilderCharacter(parseInt(characterId), active === 1);
  const { character, isLoaded } = controller;
  const isLoading = !isLoaded;

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
                  ...glassStyle({ bg: true }),
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
                  ...glassStyle({ bg: true }),
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
          <BlurBox>
            <Stepper
              active={active}
              onStepClick={setActive}
              iconSize={isCharacterBuilderMobile() ? 30 : 40}
              size={isCharacterBuilderMobile() ? 'xs' : 'lg'}
              wrap={false}
              styles={(t) => ({
                steps: {
                  padding: isPhone ? t.spacing.xs : t.spacing.md,
                },
                content: {
                  paddingTop: 0,
                },
              })}
            >
              <Stepper.Step
                label='Home'
                allowStepSelect={true}
                icon={<IconHome style={stepIconStyle} />}
                completedIcon={<IconHome style={stepIconStyle} />}
              >
                <Box mih={pageHeight} px='sm'>
                  {active === 0 && character && !isLoading ? (
                    <CharBuilderHome characterId={character.id} pageHeight={pageHeight} controller={controller} />
                  ) : (
                    <LoadingOverlay
                      visible={isLoading}
                      zIndex={1000}
                      overlayProps={{ radius: 'md', backgroundOpacity: 0 }}
                      loaderProps={{ type: 'bars' }}
                    />
                  )}
                </Box>
              </Stepper.Step>
              <Stepper.Step
                label='Builder'
                allowStepSelect={true}
                icon={<IconHammer style={stepIconStyle} />}
                completedIcon={<IconHammer style={stepIconStyle} />}
              >
                <Box mih={pageHeight}>
                  {active === 1 && character && !isLoading ? (
                    <CharBuilderCreation
                      characterId={character.id}
                      pageHeight={pageHeight}
                      controller={controller}
                      content={content}
                      calculationReady={calculationReady}
                    />
                  ) : (
                    <LoadingOverlay
                      visible={isLoading}
                      zIndex={1000}
                      overlayProps={{ radius: 'md', backgroundOpacity: 0 }}
                      loaderProps={{ type: 'bars' }}
                    />
                  )}
                </Box>
              </Stepper.Step>
              <Stepper.Step
                label='Sheet'
                allowStepSelect={isPlayable(character)}
                icon={<IconUser style={stepIconStyle} />}
                completedIcon={<IconUser style={stepIconStyle} />}
              >
                <Box mih={pageHeight}>
                  <Text ta='center'>Redirecting to sheet...</Text>
                </Box>
              </Stepper.Step>

              <Stepper.Completed>
                <ScrollArea h={pageHeight} scrollbars='y'>
                  Complete
                </ScrollArea>
              </Stepper.Completed>
            </Stepper>
          </BlurBox>
          {isCharacterBuilderMobile() && (
            // Keep mobile navigation inside the scrollable layout instead of below its clipped boundary.
            <Center pt='sm' style={{ visibility: active === 2 ? 'hidden' : 'visible' }}>
              <ActionIcon
                variant='filled'
                color='gray'
                aria-label='Next Page'
                radius={60}
                size={60}
                style={glassStyle({ bg: true })}
                onClick={() => handleStepChange(active + 1)}
                disabled={active === 1 && !isPlayable(character)}
              >
                <IconArrowRight size='1.7rem' stroke={2} />
              </ActionIcon>
            </Center>
          )}
        </Stack>
      </Box>
    </Center>
  );
}
