import { characterState } from '@atoms/characterAtoms';
import { drawerState } from '@atoms/navAtoms';
import BlurBox from '@common/BlurBox';
import BlurButton from '@common/BlurButton';
import { CharacterInfo } from '@common/CharacterInfo';
import { collectCharacterSpellcasting } from '@content/collect-content';
import { useMantineTheme, Group, Stack, TextInput, Box, Text } from '@mantine/core';
import { getHotkeyHandler } from '@mantine/hooks';
import { VariableAttr, VariableNum, VariableProf } from '@typing/variables';
import { getFinalHealthValue } from '@variables/variable-display';
import { getVariable } from '@variables/variable-manager';
import _ from 'lodash';
import { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRecoilState } from 'recoil';
import { confirmExperience } from '../character-utils';
import tinyInputClasses from '@css/TinyBlurInput.module.css';

export default function CharacterInfoSection() {
  const navigate = useNavigate();
  const theme = useMantineTheme();

  const [_drawer, openDrawer] = useRecoilState(drawerState);
  const [character, setCharacter] = useRecoilState(characterState);

  const expRef = useRef<HTMLInputElement>(null);
  const [exp, setExp] = useState<string | undefined>();
  useEffect(() => {
    setExp(character?.experience ? `${character.experience}` : undefined);
  }, [character]);

  const handleExperienceSubmit = () => {
    if (!character) return;
    const finalExp = confirmExperience(exp ?? '0', character, setCharacter);
    setExp(`${finalExp}`);
    expRef.current?.blur();
  };

  const handleRest = () => {
    const newCharacter = _.cloneDeep(character);
    if (!newCharacter) return;

    // Regen Health
    const conMod = getVariable<VariableAttr>('CHARACTER', 'ATTRIBUTE_CON')?.value.value ?? 0;
    const level = getVariable<VariableNum>('CHARACTER', 'LEVEL')!.value;
    let regenAmount = level * (1 > conMod ? 1 : conMod);

    const maxHealth = getFinalHealthValue('CHARACTER');
    let currentHealth = character?.hp_current;
    if (currentHealth === undefined || currentHealth < 0) {
      currentHealth = maxHealth;
    }
    if (currentHealth + regenAmount > maxHealth) {
      regenAmount = maxHealth - currentHealth;
    }
    newCharacter.hp_current = currentHealth + regenAmount;

    // Regen Stamina and Resolve
    if (true) {
      const classHP = getVariable<VariableNum>('CHARACTER', 'MAX_HEALTH_CLASS_PER_LEVEL')!.value;
      const newStamina = (Math.floor(classHP / 2) + conMod) * level;

      let keyMod = 0;
      const classDC = getVariable<VariableProf>('CHARACTER', 'CLASS_DC')!;
      if (classDC.value.attribute) {
        keyMod = getVariable<VariableAttr>('CHARACTER', classDC.value.attribute)?.value.value ?? 0;
      }
      const newResolve = keyMod;

      newCharacter.stamina_current = newStamina;
      newCharacter.resolve_current = newResolve;
    }

    // Set spells to default
    const spellData = collectCharacterSpellcasting(newCharacter);
    newCharacter.spells = newCharacter.spells ?? {
      slots: [],
      list: [],
      focus_point_current: 0,
      innate_casts: [],
    };

    // Reset Innate Spells
    newCharacter.spells = {
      ...newCharacter.spells,
      innate_casts:
        newCharacter.spells?.innate_casts.map((casts) => {
          return {
            ...casts,
            casts_current: 0,
          };
        }) ?? [],
    };

    // Reset Focus Points
    newCharacter.spells = {
      ...newCharacter.spells,
      focus_point_current: spellData.focus_points.max,
    };

    // Reset Spell Slots
    newCharacter.spells = {
      ...newCharacter.spells,
      slots:
        newCharacter.spells?.slots.map((slot) => {
          return {
            ...slot,
            exhausted: false,
          };
        }) ?? [],
    };

    // Remove Fatigued Condition
    let newConditions = _.cloneDeep(character?.details?.conditions ?? []).filter((c) => c.name !== 'Fatigued');

    // Remove Wounded condition if we're now at full health
    const wounded = newConditions.find((c) => c.name === 'Wounded');
    if (wounded && newCharacter.hp_current === maxHealth) {
      newConditions = newConditions.filter((c) => c.name !== 'Wounded');
    }

    // Decrease Drained Condition
    const drained = newConditions.find((c) => c.name === 'Drained');
    if (drained) {
      drained.value = drained.value! - 1;
      if (drained.value! <= 0) {
        newConditions = newConditions.filter((c) => c.name !== 'Drained');
      }
    }

    // Decrease Doomed Condition
    const doomed = newConditions.find((c) => c.name === 'Doomed');
    if (doomed) {
      doomed.value = doomed.value! - 1;
      if (doomed.value! <= 0) {
        newConditions = newConditions.filter((c) => c.name !== 'Doomed');
      }
    }
    newCharacter.details = {
      ...newCharacter.details,
      conditions: newConditions,
    };

    // Update the character
    setCharacter(newCharacter);
  };

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
      >
        <Group gap={20} wrap='nowrap' align='flex-start'>
          <CharacterInfo
            character={character}
            color='gray.5'
            nameCutOff={20}
            onClickAncestry={() => {
              openDrawer({
                type: 'ancestry',
                data: { id: character?.details?.ancestry?.id },
              });
            }}
            onClickBackground={() => {
              openDrawer({
                type: 'background',
                data: { id: character?.details?.background?.id },
              });
            }}
            onClickClass={() => {
              openDrawer({
                type: 'class',
                data: { id: character?.details?.class?.id },
              });
            }}
            onClickClass2={() => {
              openDrawer({
                type: 'class',
                data: { id: character?.details?.class_2?.id },
              });
            }}
          />
          <Stack gap={10} justify='flex-start' pt={3} style={{ flex: 1 }}>
            <Stack gap={5}>
              <Box>
                <BlurButton
                  size='compact-xs'
                  fw={500}
                  fullWidth
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    navigate(`/builder/${character?.id}`);
                  }}
                  href={`/builder/${character?.id}`}
                >
                  Edit
                </BlurButton>
              </Box>
              <Box>
                <BlurButton size='compact-xs' fw={500} fullWidth onClick={handleRest}>
                  Rest
                </BlurButton>
              </Box>
            </Stack>
            <Stack gap={0}>
              <Box>
                <Text fz='xs' ta='center' c='gray.3'>
                  Lvl. {character?.level}
                </Text>
              </Box>
              <Box>
                <TextInput
                  className={tinyInputClasses.input}
                  ref={expRef}
                  variant='filled'
                  size='xs'
                  radius='lg'
                  placeholder='Exp.'
                  value={exp}
                  onChange={(e) => {
                    setExp(e.currentTarget.value);
                  }}
                  onBlur={handleExperienceSubmit}
                  onKeyDown={getHotkeyHandler([
                    ['mod+Enter', handleExperienceSubmit],
                    ['Enter', handleExperienceSubmit],
                  ])}
                />
              </Box>
            </Stack>
          </Stack>
        </Group>
      </Box>
    </BlurBox>
  );
}
