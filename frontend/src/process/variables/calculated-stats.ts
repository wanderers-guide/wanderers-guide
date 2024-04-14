import { getFlatInvItems, isItemEquippable, isItemInvestable } from '@items/inv-utils';
import { Item, Character, InventoryItem } from '@typing/content';
import { VariableListStr } from '@typing/variables';
import { SetterOrUpdater } from 'recoil';
import { getVariable } from './variable-manager';
import { getFinalHealthValue } from './variable-display';

export function saveCalculatedStats(character: Character, setCharacter: SetterOrUpdater<Character | null>) {
  setTimeout(() => {
    const maxHealth = getFinalHealthValue('CHARACTER');
    const maxStamina = 0;
    const maxResolve = 0;
    const finalProfs = {}; // TODO

    const calcStats = {
      hp_max: maxHealth,
      stamina_max: maxStamina,
      resolve_max: maxResolve,
      profs: finalProfs,
    };

    if (JSON.stringify(calcStats) === JSON.stringify(character.meta_data?.calculated_stats ?? {})) return;

    // Save the calculated stats
    console.log('Saving calculated stats', calcStats);
    setCharacter((c) => {
      if (!c) return c;
      return {
        ...c,
        meta_data: {
          ...c.meta_data,
          calculated_stats: calcStats,
        },
      };
    });
  }, 100);
}
