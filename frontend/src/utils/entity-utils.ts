import { LivingEntity } from '@typing/content';
import { VariableNum } from '@typing/variables';
import { getVariable } from '@variables/variable-manager';

export function getEntityLevel(entity: LivingEntity) {
  if (entity.level === -100) {
    return getVariable<VariableNum>('CHARACTER', 'LEVEL')?.value ?? 0;
  } else {
    return entity.level;
  }
}
