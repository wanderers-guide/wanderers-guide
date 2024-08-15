import BlurButton from "@common/BlurButton";
import { collectEntitySpellcasting, getFocusPoints } from "@content/collect-content";
import { Button } from "@mantine/core";
import { IconBed } from "@tabler/icons-react";
import { LivingEntity } from "@typing/content";
import { StoreID, VariableAttr, VariableNum, VariableProf } from "@typing/variables";
import { getFinalHealthValue } from "@variables/variable-display";
import { getVariable } from "@variables/variable-manager";
import _ from 'lodash-es';
import { SetterOrUpdater } from "recoil";

export default function RestButton(props: {
  id: StoreID;
  entity: LivingEntity | null;
  setEntity: SetterOrUpdater<LivingEntity | null>;
}) {
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
    <Button
      variant='light'
      size='compact-xs'
      fw={500}
      fullWidth
      onClick={handleRest}
      leftSection={<IconBed size='0.9rem' />}
    >
      Rest
    </Button>
  );
};