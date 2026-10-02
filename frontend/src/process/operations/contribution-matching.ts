import { fetchContentById } from '@content/content-store';
import { TraitSchema } from '@schemas/content';
import type { ContributionCheck } from '@schemas/operations';
import type { VariableContentOrigin } from '@variables/variable-manager';
import type { VariableStore } from '@schemas/variables';
import { hasTraitType } from '@utils/traits';

/** Classify the nearest real writer; a resolved uncategorized feat is not an unresolved trait. */
export async function getContributionCategories(
  origin?: VariableContentOrigin
): Promise<ContributionCheck['categories']> {
  if (origin?.type === 'heritage') return ['heritage'];
  if (origin?.type !== 'feat') return [];
  const categories = new Set<ContributionCheck['categories'][number]>();
  if (hasTraitType('ALL-ANCESTRIES', origin.traits ?? undefined)) categories.add('ancestry-feat');
  for (const id of origin.traits ?? []) {
    const row = await fetchContentById('trait', id);
    const trait = TraitSchema.safeParse(row);
    if (!trait.success) throw new Error(`Unresolved contribution classification trait ${id}.`);
    if (trait.data.meta_data?.ancestry_trait) categories.add('ancestry-feat');
    if (trait.data.meta_data?.class_trait) categories.add('class-feat');
    if (trait.data.meta_data?.archetype_trait) categories.add('archetype-feat');
  }
  return [...categories];
}

/** Typed pairs deliberately reject blank, nonfinite, unresolved or rider-bearing amounts. */
export function parseContributionAmount(value: unknown): { type: string; amount: number } | undefined {
  if (typeof value !== 'string') return undefined;
  const parts = value.split(',');
  if (parts.length !== 2 || !parts[0].trim() || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(parts[1].trim()))
    return undefined;
  const amount = Number(parts[1].trim());
  if (!Number.isFinite(amount)) return undefined;
  return { type: parts[0].trim().toUpperCase(), amount };
}

/** Capture known expression inputs before any qualified branch writes. */
export function getContributionExpressionInputs(values: string[]): Set<string> {
  const inputs = new Set<string>();
  for (const value of values)
    for (const expression of value.match(/{{[^}]+}}/g) ?? []) {
      for (const name of expression.match(/[A-Za-z_][A-Za-z0-9_]*/g) ?? []) inputs.add(name.toUpperCase());
    }
  return inputs;
}

/** Include expression bonuses transitively; proficiency compilation has broader derived inputs. */
export function getContributionDependencies(values: string[], store: VariableStore): Set<string> {
  const names = Object.keys(store.variables);
  const inputs = getContributionExpressionInputs(values);
  for (const name of inputs) {
    // Future variables can resolve currently unknown symbols or shadow function/constant names.
    // A derived proficiency conservatively adds its wider namespace without losing those tokens.
    if (
      Object.entries(store.variables).some(([key, variable]) => key.toUpperCase() === name && variable.type === 'prof')
    ) {
      for (const known of [...names, ...Object.keys(store.bonuses)]) inputs.add(known.toUpperCase());
    }
    const expressions = Object.entries(store.bonuses)
      .filter(([key]) => key.toUpperCase() === name)
      .flatMap(([, bonuses]) => bonuses)
      .map((bonus) => bonus.value)
      .filter((value): value is string => typeof value === 'string');
    for (const dependency of getContributionExpressionInputs(expressions)) inputs.add(dependency);
  }
  return inputs;
}
