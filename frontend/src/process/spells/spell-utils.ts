import { collectEntitySpellcasting } from '@content/collect-content';
import { fetchContentById } from '@content/content-store';
import { getEntityLevel } from '@pages/character_sheet/living-entity-utils';
import { Item, LivingEntity, Spell } from '@typing/content';
import { StoreID } from '@typing/variables';
import { hasTraitType } from '@utils/traits';
import { cloneDeep } from 'lodash-es';

/**
 * Utility function to determine if a spell is a focus spell
 * @param spell - Spell
 * @returns - Whether the spell is a focus spell
 */
export function isFocusSpell(spell: Spell) {
  return hasTraitType('FOCUS', spell.traits) || spell.meta_data.focus;
}

/**
 * Utility function to determine if a spell is a cantrip
 * @param spell - Spell
 * @returns - Whether the spell is a cantrip
 */
export function isCantrip(spell: Spell) {
  return hasTraitType('CANTRIP', spell.traits);
}

/**
 * Utility function to determine if a spell is a ritual
 * @param spell - Spell
 * @returns - Whether the spell is a ritual
 */
export function isRitual(spell: Spell) {
  return !!spell.meta_data.ritual;
}

/**
 * Utility function to determine if a spell is a "normal" spell
 * @param spell - Spell
 * @returns - Whether the spell is a "normal" spell
 */
export function isNormalSpell(spell: Spell) {
  return !isFocusSpell(spell) && !isRitual(spell);
}

/**
 * Utility function to determine the type of spellcasting the entity has
 * @param id - ID of the variable store
 * @param entity - Living entity
 * @returns - Type of spellcasting the entity has
 */
export function getSpellcastingType(id: StoreID, entity: LivingEntity): 'PREPARED' | 'SPONTANEOUS' | 'NONE' {
  const spellData = collectEntitySpellcasting(id, entity);

  // If you have slots, get type with the greatest slot
  let greatestSlot = { rank: 0, source: '' };
  for (const slot of spellData.slots) {
    if (slot.rank > greatestSlot.rank) {
      greatestSlot = {
        rank: slot.rank,
        source: slot.source,
      };
    }
  }
  if (greatestSlot.source) {
    if (greatestSlot.source.startsWith('PREPARED')) {
      return 'PREPARED';
    } else if (greatestSlot.source.startsWith('SPONTANEOUS')) {
      return 'SPONTANEOUS';
    }
  }

  // If no slots, just grab the first type
  for (const source of spellData.sources) {
    if (source.type.startsWith('PREPARED')) {
      return 'PREPARED';
    } else if (source.type.startsWith('SPONTANEOUS')) {
      return 'SPONTANEOUS';
    }
  }
  return 'NONE';
}

/**
 * Utility function to detect spells in text
 * @param text - Text to parse
 * @param allSpells - All spells
 * @returns - Detected spells within the text
 */
export function detectSpells(text: string, allSpells: Spell[], simpleDetect = false): { spell: Spell; rank: number }[] {
  const detectedSpells = [];

  // Simple detection:
  if (simpleDetect) {
    const linkRegex = /\(link_spell_(\d+)\)/g;
    for (const linkMatch of [...text.matchAll(linkRegex)]) {
      const spellId = parseInt(linkMatch[1]);

      const spell = allSpells.find((s) => s.id === spellId);
      if (spell) {
        detectedSpells.push({ spell: cloneDeep(spell), rank: spell.rank });
      }
    }

    return detectedSpells;
  }

  // Advanced, spell list detection:
  const matches = text.matchAll(/^\W*((\d|cantrip))(.+?)(\[(.+?)\]\((.+?)\))(.*)/gim);

  for (const match of [...matches]) {
    const line = match[0];
    let rank = parseInt(match[1]);
    if (isNaN(rank)) {
      rank = 0;
    }
    const linkRegex = /\(link_spell_(\d+)\)/g;
    for (const linkMatch of [...line.matchAll(linkRegex)]) {
      const spellId = parseInt(linkMatch[1]);

      const spell = allSpells.find((s) => s.id === spellId);
      if (spell) {
        detectedSpells.push({ spell: { ...cloneDeep(spell), rank }, rank });
      }
    }
  }

  return detectedSpells;
}

/**
 * Utility function to get the rank of a spell
 * @param spell - Spell
 * @param entity - Living entity
 * @returns - Rank of the spell
 */
export function getSpellRank(spell: Spell, entity?: LivingEntity | null) {
  if (spell && isCantrip(spell)) {
    if (entity) {
      return Math.ceil(getEntityLevel(entity) / 2);
    } else {
      return 1;
    }
  }
  if (spell && entity && isFocusSpell(spell)) {
    return Math.max(Math.ceil(getEntityLevel(entity) / 2), spell.rank);
  }
  return spell.rank;
}

/**
 * Utility function to get the heightening data of a spell
 * @param spell - Spell
 * @param entity - Living entity
 * @returns - Map of heightening data, keyed by the heightening amount, and value being the number of times it's active
 */
export async function getHeighteningData(spell: Spell, entity?: LivingEntity | null) {
  const activeHeightening = new Map<string, number>(); // (heighten amount, number of times it's active)

  const ogSpell = await fetchContentById<Spell>('spell', spell.id);
  if (!ogSpell) {
    return activeHeightening;
  }

  const spellRank = getSpellRank(spell, entity);
  const ogSpellRank = getSpellRank(ogSpell);
  const rankDiff = spellRank - ogSpellRank;

  if (spell.heightened && spell.heightened.text.length > 0) {
    for (const h of spell.heightened.text) {
      if (h.amount.startsWith('(+')) {
        const a = parseInt(h.amount.slice(2));
        activeHeightening.set(h.amount, Math.floor(rankDiff / a));
      } else if (h.amount.startsWith('(')) {
        const a = parseInt(h.amount.slice(1));
        if (spellRank >= a) {
          activeHeightening.set(h.amount, 1);
        }
      }
    }
  }

  return activeHeightening;
}
