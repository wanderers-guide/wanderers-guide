import { collectEntitySpellcasting } from '@content/collect-content';
import { fetchContentById } from '@content/content-store';
import { getEntityLevel } from '@utils/entity-utils';
import { Item, LivingEntity, Spell } from '@schemas/content';
import { StoreID } from '@schemas/variables';
import { hasTraitType } from '@utils/traits';
import { cloneDeep } from 'lodash-es';

/**
 * Utility function to determine if a spell is a focus spell
 * @param spell - Spell
 * @returns - Whether the spell is a focus spell
 */
export function isFocusSpell(spell: Spell) {
  return hasTraitType('FOCUS', spell.traits ?? undefined) || spell.meta_data.focus;
}

/**
 * Utility function to determine if a spell is a cantrip
 * @param spell - Spell
 * @returns - Whether the spell is a cantrip
 */
export function isCantrip(spell: Spell) {
  return hasTraitType('CANTRIP', spell.traits ?? undefined);
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
        // Only a qualifier immediately before this linked spell sets its rank.
        // Other numbers and other activation lines must not heighten this spell.
        const rankMatch = text
          .slice(0, linkMatch.index)
          .match(/(?:^|\W)([1-9]|10)(?:st|nd|rd|th)-(?:rank|level)\s*[*_]*\[[^\]]+\]$/i);
        const rank = rankMatch ? Number(rankMatch[1]) : spell.rank;
        detectedSpells.push({ spell: { ...cloneDeep(spell), rank }, rank });
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

/** Exclude literal Markdown code without joining the surrounding casting prose. */
function maskSpellheartCode(text: string): string {
  let fence: { marker: string; length: number } | undefined;
  let prose = text
    .split('\n')
    .map((line: string) => {
      if (fence) {
        const closing = line.match(/^ {0,3}(`+|~+)\s*$/);
        if (closing && closing[1][0] === fence.marker && closing[1].length >= fence.length) fence = undefined;
        return ' '.repeat(line.length);
      }
      const opening = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
      if (opening && (opening[1][0] !== '`' || !opening[2].includes('`'))) {
        fence = { marker: opening[1][0], length: opening[1].length };
        return ' '.repeat(line.length);
      }
      return line;
    })
    .join('\n');

  const delimiters = [...prose.matchAll(/`+/g)];
  for (let index = 0; index < delimiters.length; index++) {
    const opening = delimiters[index];
    const escapes = prose.slice(0, opening.index).match(/\\+$/)?.[0].length ?? 0;
    if (escapes % 2 !== 0) continue;
    const closingIndex = delimiters.findIndex(
      (closing, candidateIndex) => candidateIndex > index && closing[0].length === opening[0].length
    );
    if (closingIndex === -1) continue;
    const end = delimiters[closingIndex].index + delimiters[closingIndex][0].length;
    prose = prose.slice(0, opening.index) + prose.slice(opening.index, end).replace(/[^\n]/g, ' ') + prose.slice(end);
    index = closingIndex;
  }
  return prose;
}

/** Keep flat spell references and the canonical Cast verb; other link labels are not casting prose. */
function maskSpellheartLinkExamples(text: string): string {
  const closingIndex = (start: number, opening: string, closing: string): number => {
    let depth = 1;
    for (let index = start + 1; index < text.length; index++) {
      if (text[index] === '\\') {
        index++;
      } else if (text[index] === opening) {
        depth++;
      } else if (text[index] === closing && --depth === 0) {
        return index;
      }
    }
    return -1;
  };
  let prose = text;
  for (let index = 0; index < text.length; index++) {
    if (text[index] === '\\') {
      index++;
      continue;
    }
    if (text[index] !== '[') continue;
    const labelEnd = closingIndex(index, '[', ']');
    if (labelEnd === -1 || text[labelEnd + 1] !== '(') continue;
    const hrefEnd = closingIndex(labelEnd + 1, '(', ')');
    if (hrefEnd === -1) continue;
    const literal = text.slice(index, hrefEnd + 1);
    if (!/^\[(?:\\.|[^\]\\])+\]\(link_spell_\d+\)$|^\[cast\]\(link_action_19611\)$/i.test(literal)) {
      prose = prose.slice(0, index) + literal.replace(/[^\n]/g, ' ') + prose.slice(hrefEnd + 1);
    }
    index = hrefEnd;
  }
  return prose;
}

/** Read casting activations, retaining first-link compatibility for headerless spellhearts. */
export function detectSpellheartSpells(text: string, allSpells: Spell[]): { spell: Spell; rank: number }[] {
  const prose = maskSpellheartLinkExamples(maskSpellheartCode(text));
  const activations = prose.split(/(?:^|\n)\s*(?:\*\*|__)?Activate(?:\*\*|__)?(?=\s|:)/gi).slice(1);
  // Older and homebrew descriptions may omit activation headers entirely.
  if (activations.length === 0) return detectSpells(prose, allSpells, true).slice(0, 1);
  const qualifier = String.raw`(?:[1-9]|10)(?:st|nd|rd|th)-(?:rank|level)`;
  const reference = String.raw`(?:a\s+)?(?:${qualifier}\s+)?[*_]*\[[^\]]+\]\(link_spell_\d+\)[*_]*`;
  // Linking the casting verb must not remove spells from the Spellheart panel.
  const castingVerb = String.raw`(?:cast|\[cast\]\(link_action_19611\))`;
  // A direct effect or sentence grants a cast; subordinate conditions and requirements do not.
  const effectStart = String.raw`(?:^|[.!?;]\s+|(?:\*\*|__)?\bEffect(?:\*\*|__)?\s*:?)\s*`;
  const castClause = new RegExp(
    String.raw`${effectStart}you\s+${castingVerb}\s+(${reference}(?:\s*(?:,\s*(?:(?:or|and)\s+)?|(?:or|and)\s+)${reference})*)`,
    'gi'
  );
  const linkedSpell = new RegExp(reference, 'gi');
  const detectedSpells: { spell: Spell; rank: number }[] = [];
  const seen = new Set<string>();

  for (const activation of activations) {
    const sections = activation.split(
      /(?:\*\*|__)(Effect|Requirements|Trigger|Frequency|Cost|Armor|Weapon)(?:\*\*|__)/gi
    );
    for (let index = 0; index < sections.length; index += 2) {
      if (index > 0 && sections[index - 1].toLowerCase() !== 'effect') continue;
      for (const clause of sections[index].matchAll(castClause)) {
        let castRank: number | undefined;
        for (const match of clause[1].matchAll(linkedSpell)) {
          const rankMatch = match[0].match(/([1-9]|10)(?:st|nd|rd|th)-(?:rank|level)/i);
          if (rankMatch) castRank = Number(rankMatch[1]);
          for (const detected of detectSpells(match[0], allSpells, true)) {
            // A qualifier can apply to alternatives, such as 4th-rank harm or heal.
            const rank = castRank ?? detected.rank;
            const key = `${detected.spell.id}-${rank}`;
            if (seen.has(key)) continue;
            seen.add(key);
            detectedSpells.push({ spell: { ...detected.spell, rank }, rank });
          }
        }
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

  if (spell.heightened && spell.heightened.text && spell.heightened.text.length > 0) {
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
