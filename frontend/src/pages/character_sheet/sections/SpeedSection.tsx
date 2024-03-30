import BoxIcon from '@assets/images/BoxIcon';
import PerceptionIcon from '@assets/images/PerceptionIcon';
import SpeedIcon from '@assets/images/SpeedIcon';
import { characterState } from '@atoms/characterAtoms';
import { drawerState } from '@atoms/navAtoms';
import BlurBox from '@common/BlurBox';
import { ICON_BG_COLOR_HOVER, ICON_BG_COLOR } from '@constants/data';
import { useMantineTheme, Group, Stack, Box, Text } from '@mantine/core';
import { useHover } from '@mantine/hooks';
import { displayFinalProfValue, getFinalVariableValue } from '@variables/variable-display';
import { useNavigate } from 'react-router-dom';
import { useRecoilState } from 'recoil';

export default function SpeedSection() {
  const navigate = useNavigate();
  const theme = useMantineTheme();

  const { hovered: perceptionHovered, ref: perceptionRef } = useHover();
  const { hovered: speedHovered, ref: speedRef } = useHover();
  const { hovered: classDcHovered, ref: classDcRef } = useHover();

  const [_drawer, openDrawer] = useRecoilState(drawerState);
  const [character, setCharacter] = useRecoilState(characterState);

  return (
    <BlurBox blur={10}>
      <Box
        pt='xs'
        pb={5}
        px='xs'
        style={{
          borderTopLeftRadius: theme.radius.md,
          borderTopRightRadius: theme.radius.md,
          position: 'relative',
        }}
        h='100%'
      >
        <Group wrap='nowrap' gap={5} align='flex-start' grow>
          <Box
            ref={perceptionRef}
            style={{ position: 'relative', cursor: 'pointer' }}
            onClick={() => {
              openDrawer({
                type: 'stat-perception',
                data: {},
              });
            }}
          >
            <Box
              style={{
                position: 'absolute',
                top: '55%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
              }}
            >
              <PerceptionIcon size={80} color={perceptionHovered ? ICON_BG_COLOR_HOVER : ICON_BG_COLOR} />
            </Box>
            <Stack gap={10}>
              <Text ta='center' fz='sm' fw={500} c='gray.0'>
                Perception
              </Text>
              <Text ta='center' fz='lg' c='gray.0' fw={500} lh='1.5em'>
                {displayFinalProfValue('CHARACTER', 'PERCEPTION')}
              </Text>
              <Text fz='xs' c='gray.5' ta='center'>
                Normal Vision
              </Text>
            </Stack>
          </Box>
          <Box
            ref={speedRef}
            style={{ position: 'relative', cursor: 'pointer' }}
            onClick={() => {
              openDrawer({
                type: 'stat-speed',
                data: {},
              });
            }}
          >
            <Box
              style={{
                position: 'absolute',
                top: '60%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
              }}
            >
              <SpeedIcon size={75} color={speedHovered ? ICON_BG_COLOR_HOVER : ICON_BG_COLOR} />
            </Box>
            <Stack gap={10}>
              <Text ta='center' fz='sm' fw={500} c='gray.0'>
                Speed
              </Text>
              <Text ta='center' fz='lg' c='gray.0' fw={500} lh='1.5em' pl={15}>
                {getFinalVariableValue('CHARACTER', 'SPEED').total}
                <Text fz='xs' c='gray.3' span>
                  {' '}
                  ft.
                </Text>
              </Text>
              <Text fz='xs' c='gray.5' ta='center'>
                And Others
              </Text>
            </Stack>
          </Box>
          <Box
            ref={classDcRef}
            style={{ position: 'relative', cursor: 'pointer' }}
            onClick={() => {
              openDrawer({
                type: 'stat-prof',
                data: { variableName: 'CLASS_DC', isDC: true },
              });
            }}
          >
            <Box
              style={{
                position: 'absolute',
                top: '85%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
              }}
            >
              <BoxIcon size={50} color={classDcHovered ? ICON_BG_COLOR_HOVER : ICON_BG_COLOR} />
            </Box>
            <Stack gap={10}>
              <Text ta='center' fz='sm' fw={500} c='gray.0'>
                Class DC
              </Text>
              <Text ta='center' fz='lg' c='gray.0' fw={500} lh='1.5em'>
                {displayFinalProfValue('CHARACTER', 'CLASS_DC', true)}
              </Text>
            </Stack>
          </Box>
        </Group>
      </Box>
    </BlurBox>
  );
}
