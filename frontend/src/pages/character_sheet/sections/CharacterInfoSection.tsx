import { characterState } from '@atoms/characterAtoms';
import { drawerState } from '@atoms/navAtoms';
import BlurBox from '@common/BlurBox';
import BlurButton from '@common/BlurButton';
import { CharacterInfo } from '@common/CharacterInfo';
import { collectEntitySpellcasting, getFocusPoints } from '@content/collect-content';
import { useMantineTheme, Group, Stack, TextInput, Box, Text } from '@mantine/core';
import { getHotkeyHandler } from '@mantine/hooks';
import { StoreID, VariableAttr, VariableNum, VariableProf } from '@typing/variables';
import { getFinalHealthValue } from '@variables/variable-display';
import { getVariable } from '@variables/variable-manager';
import _ from 'lodash-es';
import { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SetterOrUpdater, useRecoilState } from 'recoil';
import { confirmExperience } from '../living-entity-utils';
import tinyInputClasses from '@css/TinyBlurInput.module.css';
import { Character, LivingEntity } from '@typing/content';
import { isCharacter } from '@utils/type-fixing';

export default function EntityInfoSection(props: {
  id: StoreID;
  entity: LivingEntity | null;
  setEntity: SetterOrUpdater<LivingEntity | null>;
}) {
  const navigate = useNavigate();
  const theme = useMantineTheme();

  const [_drawer, openDrawer] = useRecoilState(drawerState);

  const expRef = useRef<HTMLInputElement>(null);
  const [exp, setExp] = useState<string | undefined>();
  useEffect(() => {
    setExp(props.entity?.experience ? `${props.entity.experience}` : undefined);
  }, [props.entity]);

  const handleExperienceSubmit = () => {
    if (!props.entity) return;
    const finalExp = confirmExperience(exp ?? '0', props.entity, props.setEntity);
    setExp(`${finalExp}`);
    expRef.current?.blur();
  };

  const handleRest = () => {
    const newEntity = _.cloneDeep(props.entity);
    if (!newEntity) return;

    // Regen Health
    const conMod = getVariable<VariableAttr>(props.id, 'ATTRIBUTE_CON')?.value.value ?? 0;
    const level = getVariable<VariableNum>(props.id, 'LEVEL')!.value;
    let regenAmount = level * (1 > conMod ? 1 : conMod);

    const maxHealth = getFinalHealthValue(props.id);
    let currentHealth = props.entity?.hp_current;
    if (currentHealth === undefined || currentHealth < 0) {
      currentHealth = maxHealth;
    }
    if (currentHealth + regenAmount > maxHealth) {
      regenAmount = maxHealth - currentHealth;
    }
    newEntity.hp_current = currentHealth + regenAmount;

    // Regen Stamina and Resolve
    if (true) {
      const classHP = getVariable<VariableNum>(props.id, 'MAX_HEALTH_CLASS_PER_LEVEL')!.value;
      const newStamina = (Math.floor(classHP / 2) + conMod) * level;

      let keyMod = 0;
      const classDC = getVariable<VariableProf>(props.id, 'CLASS_DC')!;
      if (classDC.value.attribute) {
        keyMod = getVariable<VariableAttr>(props.id, classDC.value.attribute)?.value.value ?? 0;
      }
      const newResolve = keyMod;

      newEntity.stamina_current = newStamina;
      newEntity.resolve_current = newResolve;
    }

    // Set spells to default
    const spellData = collectEntitySpellcasting(props.id, newEntity);
    newEntity.spells = newEntity.spells ?? {
      slots: [],
      list: [],
      focus_point_current: 0,
      innate_casts: [],
    };

    // Reset Innate Spells
    newEntity.spells = {
      ...newEntity.spells,
      innate_casts:
        newEntity.spells?.innate_casts.map((casts) => {
          return {
            ...casts,
            casts_current: 0,
          };
        }) ?? [],
    };

    // Reset Focus Points
    const focusPoints = getFocusPoints(props.id, newEntity, spellData.focus);
    newEntity.spells = {
      ...newEntity.spells,
      focus_point_current: focusPoints.max,
    };

    // Reset Spell Slots
    newEntity.spells = {
      ...newEntity.spells,
      slots:
        newEntity.spells?.slots.map((slot) => {
          return {
            ...slot,
            exhausted: false,
          };
        }) ?? [],
    };

    // Remove Fatigued Condition
    let newConditions = _.cloneDeep(props.entity?.details?.conditions ?? []).filter((c) => c.name !== 'Fatigued');

    // Remove Wounded condition if we're now at full health
    const wounded = newConditions.find((c) => c.name === 'Wounded');
    if (wounded && newEntity.hp_current === maxHealth) {
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
    newEntity.details = {
      ...newEntity.details,
      conditions: newConditions,
    };

    // Update the character
    props.setEntity(newEntity);
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
          {isCharacter(props.entity) ? (
            <CharacterInfo
              character={props.entity}
              color='gray.5'
              nameCutOff={20}
              onClickAncestry={() => {
                openDrawer({
                  type: 'ancestry',
                  data: { id: (props.entity as Character)?.details?.ancestry?.id },
                });
              }}
              onClickBackground={() => {
                openDrawer({
                  type: 'background',
                  data: { id: (props.entity as Character)?.details?.background?.id },
                });
              }}
              onClickClass={() => {
                openDrawer({
                  type: 'class',
                  data: { id: (props.entity as Character)?.details?.class?.id },
                });
              }}
              onClickClass2={() => {
                openDrawer({
                  type: 'class',
                  data: { id: (props.entity as Character)?.details?.class_2?.id },
                });
              }}
            />
          ) : (
            <></>
          )}
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
                    if (isCharacter(props.entity)) {
                      navigate(`/builder/${props.entity?.id}`);
                    }
                  }}
                  href={isCharacter(props.entity) ? `/builder/${props.entity?.id}` : undefined}
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
                  Lvl. {props.entity?.level}
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
