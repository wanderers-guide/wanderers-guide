import { collectEntitySpellcasting } from '@content/collect-content';
import { Item, LivingEntity, Spell } from '@typing/content';
import { StoreID } from '@typing/variables';
import { hasTraitType } from '@utils/traits';
import _ from 'lodash-es';

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
        detectedSpells.push({ spell: _.cloneDeep(spell), rank: spell.rank });
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
        detectedSpells.push({ spell: { ..._.cloneDeep(spell), rank }, rank });
      }
    }
  }

  return detectedSpells;
}
