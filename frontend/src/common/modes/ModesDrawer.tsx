import { Box, Drawer, Group, Title, Stack, Divider, useMantineTheme } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { tabletQuery, wideDesktopQuery } from '@utils/mobile-responsive';
import { useMemo } from 'react';
import { IconShadow } from '@tabler/icons-react';
import { cloneDeep } from 'lodash-es';
import { useRecoilState } from 'recoil';
import { characterState } from '@atoms/characterAtoms';
import { AbilityBlock, ContentPackage } from '@typing/content';
import { ModeSelectionOption } from '@common/select/SelectContent';
import { drawerState } from '@atoms/navAtoms';
import { getVariable, setVariable } from '@variables/variable-manager';
import { VariableListStr } from '@typing/variables';
import { labelToVariable } from '@variables/variable-utils';

export default function ModesDrawer(props: { opened: boolean; onClose: () => void; content: ContentPackage }) {
  const theme = useMantineTheme();
  const isTablet = useMediaQuery(tabletQuery());
  const isWideDesktop = useMediaQuery(wideDesktopQuery());
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
        closeOnClickOutside={!isWideDesktop}
        withOverlay={!isWideDesktop}
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
                      return cloneDeep(prev);
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
