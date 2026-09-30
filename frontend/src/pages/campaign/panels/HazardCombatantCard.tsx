import { drawerState } from '@atoms/navAtoms';
import { IMPRINT_BG_COLOR, IMPRINT_BORDER_COLOR } from '@constants/data';
import { ActionIcon, Box, Group, NumberInput, Stack, Switch, Text, UnstyledButton } from '@mantine/core';
import { IconAlertTriangle, IconX } from '@tabler/icons-react';
import { getHazardCurrentHp, updateHazardHp, type HazardCombatant } from '@utils/encounter-hazard';
import { sign } from '@utils/numbers';
import { useSetAtom } from 'jotai';
import { useEffect, useRef, useState } from 'react';

/** Track only the defenses listed for a hazard, independently of its catalog snapshot. */
export function HazardCombatantCard(props: {
  combatant: HazardCombatant;
  onUpdate: (update: (current: HazardCombatant) => HazardCombatant) => void;
  onRemove: () => void;
}) {
  const openDrawer = useSetAtom(drawerState);
  const { hazard, hazard_state } = props.combatant;
  const defenses = hazard.details.defenses;
  const currentHp = getHazardCurrentHp(props.combatant);
  const [hp, setHp] = useState<number | string>(currentHp ?? '');
  const [initiative, setInitiative] = useState<number | string>(props.combatant.initiative ?? '');
  const editingHp = useRef(false);
  useEffect(() => {
    if (!editingHp.current) setHp(currentHp ?? '');
  }, [currentHp]);
  useEffect(() => {
    setInitiative(props.combatant.initiative ?? '');
  }, [props.combatant.initiative]);
  const inputStyles = { input: { backgroundColor: IMPRINT_BG_COLOR, borderColor: IMPRINT_BORDER_COLOR } };
  const submitHp = () => {
    editingHp.current = false;
    const value = typeof hp === 'number' ? hp : Number(hp);
    if (hp === '' || !Number.isFinite(value)) {
      setHp(currentHp ?? '');
      return;
    }
    props.onUpdate((current) => updateHazardHp(current, value));
  };
  const submitInitiative = () => {
    const value = initiative === '' ? undefined : Number(initiative);
    if (value !== undefined && !Number.isFinite(value)) return;
    props.onUpdate((current) => ({ ...current, initiative: value }));
  };
  const stats = [
    defenses?.ac !== undefined ? `${defenses.ac} AC` : undefined,
    defenses?.fort !== undefined ? `Fort. ${sign(defenses.fort)}` : undefined,
    defenses?.ref !== undefined ? `Ref. ${sign(defenses.ref)}` : undefined,
    defenses?.hardness !== undefined ? `Hardness ${defenses.hardness}` : undefined,
    defenses?.bt !== undefined ? `BT ${defenses.bt}` : undefined,
  ]
    .filter(Boolean)
    .join(', ');
  return (
    <Group gap='sm' wrap='wrap' align='center' pr={36} pos='relative' data-hazard-id={props.combatant._id}>
      {hazard.details.complexity === 'COMPLEX' && (
        <NumberInput
          aria-label={`${hazard.name} initiative`}
          placeholder='Init.'
          w={70}
          size='sm'
          variant='filled'
          value={initiative}
          onChange={setInitiative}
          onBlur={submitInitiative}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur();
          }}
          styles={inputStyles}
        />
      )}
      <UnstyledButton
        miw={160}
        style={{ flex: '1 1 240px' }}
        onClick={() => openDrawer({ type: 'hazard', data: { hazard }, extra: { addToHistory: true } })}
      >
        <Group wrap='nowrap' gap='xs'>
          <IconAlertTriangle size={30} color='var(--mantine-color-dimmed)' />
          <Stack gap={2}>
            <Text fz='sm' fw={600}>
              {hazard.name}
            </Text>
            <Text fz='xs' c='dimmed'>
              {hazard.details.complexity === 'SIMPLE' ? 'Simple' : 'Complex'} Hazard {hazard.level}
            </Text>
            {stats && (
              <Text fz='xs' c='dimmed'>
                {stats}
              </Text>
            )}
          </Stack>
        </Group>
      </UnstyledButton>
      {currentHp !== undefined && (
        <NumberInput
          aria-label={`${hazard.name} HP`}
          size='sm'
          variant='filled'
          w={120}
          value={hp}
          min={0}
          max={defenses?.hp}
          allowDecimal={false}
          onChange={(value) => {
            editingHp.current = true;
            setHp(value);
          }}
          onBlur={submitHp}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur();
          }}
          rightSection={<Text fz='xs'>/ {defenses?.hp}</Text>}
          rightSectionWidth={45}
          rightSectionPointerEvents='none'
          hideControls
          styles={inputStyles}
        />
      )}
      <Switch
        label='Disabled'
        size='xs'
        checked={hazard_state?.disabled ?? false}
        onChange={(event) => {
          const disabled = event.currentTarget.checked;
          props.onUpdate((current) => ({ ...current, hazard_state: { ...current.hazard_state, disabled } }));
        }}
      />
      <Box pos='absolute' right={0}>
        <ActionIcon
          aria-label={`Remove ${hazard.name}`}
          variant='light'
          color='gray'
          size='sm'
          radius='xl'
          onClick={props.onRemove}
        >
          <IconX size={20} />
        </ActionIcon>
      </Box>
    </Group>
  );
}
