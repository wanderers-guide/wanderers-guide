import { AbilityBlock, Item, Spell, Trait } from '@typing/content';
import { StoreID, VariableListStr } from '@typing/variables';
import { getVariable } from '@variables/variable-manager';
import { labelToVariable } from '@variables/variable-utils';

export function isAbilityBlockVisible(id: StoreID, ab: AbilityBlock) {
  if (ab.meta_data?.unselectable === true) {
    return false;
  }
  const blacklist = (getVariable<VariableListStr>(id, 'BLACKLIST_ABILITY_BLOCKS')?.value ?? []).map((s) =>
    labelToVariable(s)
  );
  return !blacklist.includes(labelToVariable(ab.name));
}

export function isTraitVisible(id: StoreID, trait: Trait) {
  if (trait.meta_data?.unselectable === true) {
    return false;
  }
  const blacklist = (getVariable<VariableListStr>(id, 'BLACKLIST_TRAITS')?.value ?? []).map((s) => labelToVariable(s));
  return !blacklist.includes(labelToVariable(trait.name));
}

export function isSpellVisible(id: StoreID, spell: Spell) {
  if (spell.meta_data?.unselectable === true) {
    return false;
  }
  const blacklist = (getVariable<VariableListStr>(id, 'BLACKLIST_SPELLS')?.value ?? []).map((s) => labelToVariable(s));
  return !blacklist.includes(labelToVariable(spell.name));
}

export function isItemVisible(id: StoreID, item: Item) {
  if (item.meta_data?.unselectable === true) {
    return false;
  }
  const blacklist = (getVariable<VariableListStr>(id, 'BLACKLIST_ITEMS')?.value ?? []).map((s) => labelToVariable(s));
  return !blacklist.includes(labelToVariable(item.name));
}
