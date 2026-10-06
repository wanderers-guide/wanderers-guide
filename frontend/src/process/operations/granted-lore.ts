import { AbilityBlock } from '@schemas/content';
import { labelToVariable } from '@variables/variable-utils';

/** Keep the optional subject specific to Additional Lore, including legacy copies. */
export function isAdditionalLore(feat: Pick<AbilityBlock, 'name' | 'type'> | null | undefined): boolean {
  return feat?.type === 'feat' && feat.name.trim().toLowerCase() === 'additional lore';
}

/** Accept either a subject or its full skill label, matching the existing Lore naming convention. */
export function getGrantedLoreVariable(name: string | undefined): string | undefined {
  const subject = name
    ?.trim()
    .replace(/\s+lore$/i, '')
    .trim();
  if (!subject) return undefined;
  const variable = labelToVariable(subject);
  return variable ? `SKILL_LORE_${variable}` : undefined;
}
