import BoxIcon from '@assets/images/BoxIcon';
import PerceptionIcon from '@assets/images/PerceptionIcon';
import SpeedIcon from '@assets/images/SpeedIcon';
import { drawerState } from '@atoms/navAtoms';
import BlurBox from '@common/BlurBox';
import { ICON_BG_COLOR_HOVER, ICON_BG_COLOR } from '@constants/data';
import { useMantineTheme, Group, Stack, Box, Text } from '@mantine/core';
import { useHover } from '@mantine/hooks';
import { LivingEntity } from '@typing/content';
import { StoreID } from '@typing/variables';
import { displayPrimaryVisionSense } from '@utils/senses';
import { displayFinalProfValue, displayFinalSpeedValue } from '@variables/variable-display';
import { SetterOrUpdater, useRecoilState } from 'recoil';
import { ConditionSection } from './ConditionSection';
import { getAllSpeedVariables } from '@variables/variable-manager';
import { getSpeedValue } from '@variables/variable-helpers';

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
          data: { id: props.id },
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

function SpeedSection(props: { id: StoreID; entity: LivingEntity | null }) {
  const { hovered: speedHovered, ref: speedRef } = useHover();
  const [_drawer, openDrawer] = useRecoilState(drawerState);

  const allSpeeds = getAllSpeedVariables(props.id).map((speed) => {
    const speedData = getSpeedValue(props.id, speed, props.entity);
    return {
      name: speed.name,
      base: speedData.value,
      total: speedData.total,
    };
  });
  const baseSpeed = allSpeeds.find((speed) => speed.name === 'SPEED');

  // Use base speed if it's greater than 0, otherwise use the first speed that's greater than 0
  const displaySpeed = baseSpeed && baseSpeed.base > 0 ? baseSpeed : allSpeeds.find((speed) => speed.base > 0);

  // Check if there are other speeds
  const hasOthers = allSpeeds.filter((speed) => speed.base > 0);

  return (
    <Box
      ref={speedRef}
      style={{ position: 'relative', cursor: 'pointer' }}
      onClick={() => {
        openDrawer({
          type: 'stat-speed',
          data: { id: props.id, entity: props.entity },
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
          {displayFinalSpeedValue(props.id, displaySpeed?.name || 'SPEED', props.entity)}
          <Text fz='xs' c='gray.3' span>
            {' '}
            ft.
          </Text>
        </Text>
        {hasOthers.length > 1 ? (
          <Text fz={10} c='gray.5' ta='center'>
            And Others
          </Text>
        ) : (
          <Box mb='md'></Box>
        )}
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
          data: { id: props.id, variableName: 'CLASS_DC', isDC: true },
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
          <SpeedSection id={props.id} entity={props.entity} />
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
          <SpeedSection id={props.id} entity={props.entity} />
          <ConditionSection w={125} id={props.id} entity={props.entity} setEntity={props.setEntity} />
        </Group>
      </Box>
    </BlurBox>
  );
}
