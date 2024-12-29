import { Button, Divider, Group, ScrollArea, Select, Stack, Text } from '@mantine/core';
import { ContextModalProps } from '@mantine/modals';
import { getCombatantStoreID, PopulatedCombatant } from '@pages/campaign/panels/EncountersPanel';
import { sign } from '@utils/numbers';
import { toLabel } from '@utils/strings';
import { isCharacter, isCreature, isTruthy } from '@utils/type-fixing';
import { getFinalProfValue } from '@variables/variable-display';
import { getAllSkillVariables } from '@variables/variable-manager';
import { useEffect, useState } from 'react';
import { GiDiceTwentyFacesTwenty } from 'react-icons/gi';

export default function InitiativeRollModal({
  context,
  id,
  innerProps,
}: ContextModalProps<{
  combatants: PopulatedCombatant[];
  onConfirm: (rollBonuses: Map<string, number | null>) => void;
}>) {
  const [rollBonuses, setRollBonuses] = useState(new Map<string, number | null>());

  const onChangeOption = (combatant: PopulatedCombatant, value: string | null) => {
    if (value === null || value === undefined) {
      setRollBonuses(new Map(rollBonuses.set(combatant._id, null)));
    } else {
      const options = getOptions(combatant);
      const num = options.find((opt) => opt?.value === value)?.num ?? null;
      setRollBonuses(new Map(rollBonuses.set(combatant._id, num)));
    }
  };

  // Prefill rollBonuses as needed for default perceptions
  useEffect(() => {
    for (const combatant of innerProps.combatants) {
      if (combatant.initiative === undefined) {
        onChangeOption(combatant, 'PERCEPTION');
      }
    }
  }, []);

  const getOptions = (combatant: PopulatedCombatant) => {
    if (combatant.type === 'CHARACTER' && isCharacter(combatant.data)) {
      const profTotals = combatant.data.meta_data?.calculated_stats?.profs;
      if (profTotals === undefined) return [];

      const skills = Object.keys(profTotals).filter((prof) => prof.startsWith('SKILL_'));
      const options = ['PERCEPTION', ...skills];

      return options
        .map((skill) => {
          const value = profTotals[skill];
          if (!value) return null;
          return {
            value: skill,
            label: `${toLabel(skill)}, ${sign(value.total)}`,
            num: value.total,
          };
        })
        .filter(isTruthy)
        .sort((a, b) => {
          if (a.value === 'PERCEPTION') return -1;
          if (b.value === 'PERCEPTION') return 1;
          if (a.num === b.num) {
            return a.value.localeCompare(b.value);
          } else {
            return b.num - a.num;
          }
        });
    } else if (combatant.type === 'CREATURE' && isCreature(combatant.data)) {
      const STORE_ID = getCombatantStoreID(combatant);

      const skills = getAllSkillVariables(STORE_ID).filter((skill) => skill.name !== 'SKILL_LORE____');
      const options = ['PERCEPTION', ...skills.map((skill) => skill.name)];

      return options
        .map((skill) => {
          const value = getFinalProfValue(STORE_ID, skill);
          return {
            value: skill,
            label: `${toLabel(skill)}, ${value}`,
            num: parseInt(value),
          };
        })
        .sort((a, b) => {
          if (a.value === 'PERCEPTION') return -1;
          if (b.value === 'PERCEPTION') return 1;
          if (a.num === b.num) {
            return a.value.localeCompare(b.value);
          } else {
            return b.num - a.num;
          }
        });
    } else {
      return [];
    }
  };

  return (
    <Stack style={{ position: 'relative' }}>
      <Text fz='sm'>Set which bonus to use for roll (or none to skip).</Text>
      <Divider />
      <ScrollArea h={250} scrollbars='y' px={14}>
        <Stack gap={5}>
          {innerProps.combatants.map((combatant, index) => (
            <Select
              key={index}
              label={combatant.data.name}
              placeholder='Skip'
              data={getOptions(combatant)}
              defaultValue={combatant.initiative === undefined ? 'PERCEPTION' : null}
              allowDeselect
              clearable
              onChange={(value) => onChangeOption(combatant, value)}
            />
          ))}
        </Stack>
      </ScrollArea>
      <Group justify='flex-end'>
        <Button
          size='compact-lg'
          fullWidth
          rightSection={<GiDiceTwentyFacesTwenty size={20} />}
          style={{
            fontStyle: 'italic',
          }}
          onClick={() => {
            innerProps.onConfirm(rollBonuses);
            context.closeModal(id);
          }}
        >
          Roll Initiative
        </Button>
      </Group>
    </Stack>
  );
}
