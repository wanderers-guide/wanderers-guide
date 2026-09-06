import { ExtendedProficiencyType, ProficiencyType, ProficiencyTypeSchema, ProficiencyValue } from '@schemas/variables';
import { z } from 'zod';

const RANKS: readonly ProficiencyType[] = ['U', 'T', 'E', 'M', 'L'];

export const SkillEffectContextSchema = z.object({ key: z.string(), level: z.number(), order: z.number() });
export type SkillEffectContext = z.infer<typeof SkillEffectContextSchema>;
export type SkillAdjustment = {
  context: SkillEffectContext;
  value: ExtendedProficiencyType;
  attribute?: string;
  assignment?: boolean;
};
export const SkillSelectionPreviewSchema = z.object({
  from: ProficiencyTypeSchema,
  to: ProficiencyTypeSchema,
  limitedByLevel: z.boolean(),
});
export type SkillSelectionPreview = z.infer<typeof SkillSelectionPreviewSchema>;

/** A spent skill increase is limited by the level when it was earned. Rank grants may exceed this cap. */
export function getSkillIncreaseCap(level: number): ProficiencyType {
  return level >= 15 ? 'L' : level >= 7 ? 'M' : 'E';
}

/** Calculate both the applied rank and the selector preview from one transition rule. */
export function previewSkillAdjustment(
  from: ProficiencyType,
  value: ExtendedProficiencyType,
  level: number
): SkillSelectionPreview {
  const current = RANKS.indexOf(from);
  if (value === '1') {
    const next = Math.min(current + 1, RANKS.length - 1);
    const limitedByLevel = next > RANKS.indexOf(getSkillIncreaseCap(level));
    return { from, to: limitedByLevel ? from : RANKS[next], limitedByLevel };
  }
  if (value === '-1') return { from, to: RANKS[Math.max(0, current - 1)], limitedByLevel: false };
  return { from, to: RANKS[Math.max(current, RANKS.indexOf(value))], limitedByLevel: false };
}

/** Training/grants precede spent increases at the same level; independent occurrences retain their order. */
export function compareSkillAdjustments(left: SkillAdjustment, right: SkillAdjustment): number {
  const isStep = (value: ExtendedProficiencyType): number => (value === '1' || value === '-1' ? 1 : 0);
  return (
    left.context.level - right.context.level ||
    isStep(left.value) - isStep(right.value) ||
    left.context.order - right.context.order
  );
}

/**
 * Replay earned ranks in order. An increase consumed reaching expert cannot reappear on a later master grant.
 * Preserve the public base-rank/increase representation so existing sheets and exported stores stay compatible.
 */
export function resolveSkillAdjustments(
  baseline: ProficiencyValue,
  adjustments: readonly SkillAdjustment[]
): ProficiencyValue {
  let granted = baseline.value;
  let rank = RANKS[Math.max(0, Math.min(RANKS.length - 1, RANKS.indexOf(granted) + (baseline.increases ?? 0)))];
  let attribute = baseline.attribute;
  for (const adjustment of [...adjustments].sort(compareSkillAdjustments)) {
    if (adjustment.assignment && adjustment.value !== '1' && adjustment.value !== '-1') {
      granted = adjustment.value;
      rank = adjustment.value;
    } else {
      rank = previewSkillAdjustment(rank, adjustment.value, adjustment.context.level).to;
      if (adjustment.value !== '1' && adjustment.value !== '-1') {
        granted = RANKS[Math.max(RANKS.indexOf(granted), RANKS.indexOf(adjustment.value))];
      }
    }
    if (adjustment.attribute) attribute = adjustment.attribute;
  }
  return { value: granted, increases: RANKS.indexOf(rank) - RANKS.indexOf(granted), attribute };
}
