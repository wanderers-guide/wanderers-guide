import {
  ActionIcon,
  Text,
  Box,
  Button,
  Drawer,
  Group,
  NumberInput,
  Title,
  Stack,
  TextInput,
  Menu,
  Badge,
  Avatar,
  ScrollArea,
  Paper,
  Center,
  Divider,
  useMantineTheme,
  Collapse,
  Portal,
} from '@mantine/core';
import { useDebouncedState, useDebouncedValue, useDidUpdate, useDisclosure, useMediaQuery } from '@mantine/hooks';
import { tabletQuery } from '@utils/mobile-responsive';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useRefresh from '@utils/use-refresh';
import { IconShadow } from '@tabler/icons-react';
import { sign } from '@utils/numbers';
import { Carousel } from '@mantine/carousel';
import _ from 'lodash-es';
import { useRecoilState } from 'recoil';
import { characterState } from '@atoms/characterAtoms';
import { hasPatreonAccess } from '@utils/patreon';
import { getCachedPublicUser } from '@auth/user-manager';
import { displayPatronOnly } from '@utils/notifications';
import { rollDie } from '@utils/random';
import { AbilityBlock, ContentPackage, Dice } from '@typing/content';
import { openContextModal } from '@mantine/modals';
import { ModeSelectionOption, PhysicalFeatureSelectionOption } from '@common/select/SelectContent';
import { drawerState } from '@atoms/navAtoms';
import { getVariable, setVariable } from '@variables/variable-manager';
import { VariableListStr } from '@typing/variables';
import { labelToVariable } from '@variables/variable-utils';

export default function ModesDrawer(props: { opened: boolean; onClose: () => void; content: ContentPackage }) {
  const theme = useMantineTheme();
  const isTablet = useMediaQuery(tabletQuery());
  const [character, setCharacter] = useRecoilState(characterState);
  const [_drawer, openDrawer] = useRecoilState(drawerState);

  const modes = useMemo(() => {
    const givenModeIds = getVariable<VariableListStr>('CHARACTER', 'MODE_IDS')?.value || [];
    return props.content.abilityBlocks.filter((block) => block.type === 'mode' && givenModeIds.includes(block.id + ''));
  }, [props.content]);

  const hasModeActive = (mode: AbilityBlock) => {
    const modeName = labelToVariable(mode.name);
    // Toggle mode
    const activeModes = getVariable<VariableListStr>('CHARACTER', 'ACTIVE_MODES')?.value || [];
    return activeModes.includes(modeName);
  };

  return (
    <>
      <Drawer
        opened={props.opened}
        onClose={props.onClose}
        title={
          <Group wrap='nowrap' gap={10} justify='space-between'>
            <Group wrap='nowrap' gap={10}>
              <IconShadow size='1.6rem' stroke={'1.5px'} />
              <Title order={3}>Modes</Title>
            </Group>
          </Group>
        }
        size={'calc(min(100dvw, 400px))'}
        overlayProps={{ backgroundOpacity: 0.5, blur: 2 }}
        styles={{
          title: {
            width: '100%',
          },
          body: {
            height: 'calc(100% - 64px)',
          },
        }}
        transitionProps={{ duration: 200 }}
      >
        <Stack justify='space-between' h='100%'>
          <Box>
            <Divider color='dark.6' />
            {modes.map((record, index) => (
              <ModeSelectionOption
                key={index}
                mode={record}
                showButton={true}
                buttonTitle={hasModeActive(record) ? 'Disable' : 'Enable'}
                buttonProps={
                  hasModeActive(record)
                    ? {
                        variant: 'outline',
                      }
                    : {}
                }
                onClick={(a) => {
                  const modeName = labelToVariable(a.name);
                  // Toggle mode
                  let activeModes = getVariable<VariableListStr>('CHARACTER', 'ACTIVE_MODES')?.value || [];
                  if (activeModes.includes(modeName)) {
                    activeModes = activeModes.filter((m) => m !== modeName);
                  } else {
                    activeModes = [...activeModes, modeName];
                  }
                  setVariable('CHARACTER', 'ACTIVE_MODES', activeModes, 'Selected');
                  localStorage.setItem(`active-modes-${character?.id}`, JSON.stringify(activeModes));

                  // Trigger character update (to re-execute operations)
                  setTimeout(() => {
                    setCharacter((prev) => {
                      return _.cloneDeep(prev);
                    });
                  }, 100);
                }}
              />
            ))}
          </Box>
        </Stack>
      </Drawer>
    </>
  );
}
