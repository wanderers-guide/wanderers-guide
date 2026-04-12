import { sessionState } from '@atoms/supabaseAtoms';
import { Box, Center, Divider, Group, Title } from '@mantine/core';
import { useElementSize, useMediaQuery, useViewportSize } from '@mantine/hooks';
import { setPageTitle } from '@utils/document-change';
import { useNavigate } from 'react-router-dom';
import { useAtomValue } from 'jotai';
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
        <BlurBox>
          <Box ref={ref}>
            {/* Header */}
            <Group px='md' py='sm' justify='space-between' wrap='nowrap'>
              <Group gap={10} wrap='nowrap'>
                {!isPhone && <IconSwords size='1.8rem' stroke={1.5} />}
                <Title size={28}>Encounters</Title>
              </Group>
            </Group>
            <Divider />
            {/* Body */}
            <Box p='md'>
              <EncountersPanel panelHeight={panelHeight} panelWidth={panelWidth} />
            </Box>
          </Box>
        </BlurBox>
      </Box>
    </Center>
  );
}
