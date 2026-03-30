import { LivingEntity } from '@schemas/content';
import { VariableNum } from '@schemas/variables';
import { getVariable } from '@variables/variable-manager';

export function getEntityLevel(entity: LivingEntity) {
  if (entity.level === -100) {
    return getVariable<VariableNum>('CHARACTER', 'LEVEL')?.value ?? 0;
  } else {
    return entity.level;
  }
}
