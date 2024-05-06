import BoxIcon from '@assets/images/BoxIcon';
import PerceptionIcon from '@assets/images/PerceptionIcon';
import SpeedIcon from '@assets/images/SpeedIcon';
import { characterState } from '@atoms/characterAtoms';
import { drawerState } from '@atoms/navAtoms';
import BlurBox from '@common/BlurBox';
import { ICON_BG_COLOR_HOVER, ICON_BG_COLOR } from '@constants/data';
import { collectCharacterSenses } from '@content/collect-content';
import { useMantineTheme, Group, Stack, Box, Text } from '@mantine/core';
import { useHover } from '@mantine/hooks';
import { LivingEntity } from '@typing/content';
import { StoreID, VariableListStr } from '@typing/variables';
import { compactSenses, displayPrimaryVisionSense } from '@utils/senses';
import { displayFinalProfValue, displayFinalVariableValue } from '@variables/variable-display';
import { SetterOrUpdater, useRecoilState } from 'recoil';
import { ConditionSection } from './ConditionSection';

function PerceptionSection(props: { id: StoreID }) {
  const { hovered: perceptionHovered, ref: perceptionRef } = useHover();
  const [_drawer, openDrawer] = useRecoilState(drawerState);

  return (
    <Box
      ref={perceptionRef}
      style={{ position: 'relative', cursor: 'pointer' }}
      onClick={() => {
        openDrawer({
          type: 'stat-perception',
          data: {},
          extra: { addToHistory: true },
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
          {displayFinalProfValue(props.id, 'PERCEPTION')}
        </Text>
        <Text fz={10} c='gray.5' ta='center' truncate>
          {displayPrimaryVisionSense(props.id)}
        </Text>
      </Stack>
    </Box>
  );
}

function SpeedSection(props: { id: StoreID }) {
  const { hovered: speedHovered, ref: speedRef } = useHover();
  const [_drawer, openDrawer] = useRecoilState(drawerState);

  return (
    <Box
      ref={speedRef}
      style={{ position: 'relative', cursor: 'pointer' }}
      onClick={() => {
        openDrawer({
          type: 'stat-speed',
          data: {},
          extra: { addToHistory: true },
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
          {displayFinalVariableValue(props.id, 'SPEED')}
          <Text fz='xs' c='gray.3' span>
            {' '}
            ft.
          </Text>
        </Text>
        <Text fz={10} c='gray.5' ta='center'>
          And Others
        </Text>
      </Stack>
    </Box>
  );
}

function ClassDcSection(props: { id: StoreID }) {
  const { hovered: classDcHovered, ref: classDcRef } = useHover();
  const [_drawer, openDrawer] = useRecoilState(drawerState);

  return (
    <Box
      ref={classDcRef}
      style={{ position: 'relative', cursor: 'pointer' }}
      onClick={() => {
        openDrawer({
          type: 'stat-prof',
          data: { variableName: 'CLASS_DC', isDC: true },
          extra: { addToHistory: true },
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
          {displayFinalProfValue(props.id, 'CLASS_DC', true)}
        </Text>
      </Stack>
    </Box>
  );
}

export default function MainSpeedSection(props: {
  id: StoreID;
  entity: LivingEntity | null;
  setEntity: SetterOrUpdater<LivingEntity | null>;
}) {
  const theme = useMantineTheme();

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
          <PerceptionSection id={props.id} />
          <SpeedSection id={props.id} />
          <ClassDcSection id={props.id} />
        </Group>
      </Box>
    </BlurBox>
  );
}

export function AltSpeedSection(props: {
  id: StoreID;
  entity: LivingEntity | null;
  setEntity: SetterOrUpdater<LivingEntity | null>;
}) {
  const theme = useMantineTheme();

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
          <PerceptionSection id={props.id} />
          <SpeedSection id={props.id} />
          <ConditionSection w={125} id={props.id} entity={props.entity} setEntity={props.setEntity} />
        </Group>
      </Box>
    </BlurBox>
  );
}
