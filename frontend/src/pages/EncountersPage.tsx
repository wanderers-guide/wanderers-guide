import { sessionState } from '@atoms/supabaseAtoms';
import { Box, Center, Divider, Group, Title } from '@mantine/core';
import { useElementSize, useMediaQuery, useViewportSize } from '@mantine/hooks';
import { setPageTitle } from '@utils/document-change';
import { useNavigate } from 'react-router-dom';
import { useRecoilValue } from 'recoil';
import EncountersPanel from './campaign/panels/EncountersPanel';
import BlurBox from '@common/BlurBox';
import { isPhoneSized, phoneQuery } from '@utils/mobile-responsive';
import { IconSwords } from '@tabler/icons-react';

export function Component() {
  setPageTitle(`Encounters`);

  const isPhone = useMediaQuery(phoneQuery());
  const { ref, width, height } = useElementSize();
  const panelWidth = width ? width - 60 : 2000;
  const panelHeight = height > 800 ? 555 : 500;

  const { width: viewWidth } = useViewportSize();

  return (
    <Center>
      <Box maw={isPhoneSized(viewWidth) ? viewWidth - 30 : 1000} w='100%'>
        <BlurBox bgColor='rgba(20, 21, 23, 0.827)'>
          <Box ref={ref}>
            <Group px='sm' justify='space-between' wrap='nowrap'>
              <Group gap={10} py={5}>
                {!isPhone && <IconSwords size='1.8rem' stroke={1.5} />}
                <Title size={28} c='gray.0'>
                  Encounters
                  {/* <Text pl={10} fz='xl' fw={500} c='gray.2' span>
                  {encounters && reachedEncounterLimit ? `(${encounters.length}/${ENCOUNTER_SLOT_CAP})` : ''}
                </Text> */}
                </Title>
              </Group>
            </Group>
          </Box>
        </BlurBox>
        <Box pt='sm'>
          <BlurBox blur={10} h={panelHeight + 30} w={panelWidth + 60} p={15}>
            <Box w={panelWidth + 30}>
              <EncountersPanel panelHeight={panelHeight} panelWidth={panelWidth} />
            </Box>
          </BlurBox>
        </Box>
      </Box>
    </Center>
  );
}
