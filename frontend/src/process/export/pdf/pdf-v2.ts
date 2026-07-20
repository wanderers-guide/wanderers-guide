import {
  collectEntityAbilityBlocks,
  collectEntitySenses,
  collectEntitySpellcasting,
  getFocusPoints,
} from '@content/collect-content';
import { defineDefaultSources, fetchContentPackage, fetchContentSources } from '@content/content-store';
import { getCachedPublicUser } from '@auth/user-manager';
import { getAcParts } from '@items/armor-handler';
import {
  isItemWeapon,
  getFlatInvItems,
  getBestArmor,
  getBestShield,
  isItemRangedWeapon,
  labelizeBulk,
  getInvBulk,
  getItemHealth,
} from '@items/inv-utils';
import { getWeaponStats } from '@items/weapon-handler';
import { executeOperations } from '@operations/operations.main';
import { Character, AbilityBlock, Spell, InventoryItem } from '@schemas/content';
import { VariableAttr, VariableListStr, VariableStr, VariableNum, VariableProf } from '@schemas/variables';
import { actionCostToLabel } from '@utils/actions';
import { rankNumber, sign } from '@utils/numbers';
import { displayResistWeak } from '@utils/resist-weaks';
import { displaySense } from '@utils/senses';
import { hasTraitType } from '@utils/traits';
import {
  getFinalHealthValue,
  getFinalAcValue,
  getFinalProfValue,
  getProfValueParts,
  getSpeedValue,
  getVariableBreakdown,
} from '@variables/variable-helpers';
import {
  getAllAncestryTraitVariables,
  getVariable,
  getVariables,
  getAllSkillVariables,
  getAllSpeedVariables,
} from '@variables/variable-manager';
import { compileExpressions, compileProficiencyType, isProficiencyTypeGreaterOrEqual } from '@variables/variable-utils';
import stripMd from 'remove-markdown';

import { PDFDocument, PDFForm } from 'pdf-lib';
import { getSpellStats } from '@spells/spell-handler';
import { isCantrip, isRitual } from '@spells/spell-utils';
import { stripEmojis, toLabel } from '@utils/strings';
import { isTruthy } from '@utils/type-fixing';
import { chunk, groupBy, split } from 'lodash-es';

export async function pdfV2(character: Character) {
  // Load your PDF
  const url = '/files/character-sheet-v2.pdf';
  const existingPdfBytes = await fetch(url).then((res) => res.arrayBuffer());

  // Load a PDFDocument from the existing PDF bytes
  const pdfDoc = await PDFDocument.load(existingPdfBytes);

  // Get the form
  const form = pdfDoc.getForm();

  // Fill in the fields
  await fillPDF(form, character);

  // Serialize the PDFDocument to bytes (a Uint8Array)
  const pdfBytes = await pdfDoc.save();

  // Download the PDF file
  const fileName = character.name
    .trim()
    .toLowerCase()
    .replace(/([^a-z0-9]+)/gi, '-');
  downloadPDF(pdfBytes, fileName);
}

function downloadPDF(pdfBytes: Uint8Array, fileName: string) {
  // Create a Blob from the PDF bytes
  const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });

  // Create a link element for the download
  const downloadLink = document.createElement('a');
  downloadLink.href = URL.createObjectURL(blob);
  downloadLink.download = fileName + '.pdf';

  // Append the link to the document and trigger the download
  document.body.appendChild(downloadLink);
  downloadLink.click();

  // Clean up: remove the link element
  document.body.removeChild(downloadLink);
}

/**
 * The official template ships with misspelled and inconsistently named fields.
 * We write against the "correct" name and remap to what the template actually
 * contains, so the fill logic stays readable. Do not "fix" the right-hand side:
 * these misspellings are baked into character-sheet-v2.pdf itself.
 */
const TEMPLATE_FIELD_ALIASES: Record<string, string> = {
  // Proficiency checkboxes with typos in the template
  'ATHLETICS TRAINED': 'ATHELETICS TRAINED',
  'ATHLETICS EXPERT': 'ATHELETICS EXPERT',
  'ATHLETICS MASTER': 'ATHELETICS MASTER',
  'ATHLETICS LEGENDARY': 'ATHELETICS LEGENDARY',
  'MEDICINE TRAINED': 'MEDECINE TRAINED',
  'MARTIAL WEAPONS LEGENDARY': 'MARTIAL WEAPONS LEGEANDARY',
  // The template drops the S on these four
  'ADVANCED WEAPONS TRAINED': 'ADVANCED WEAPON TRAINED',
  'ADVANCED WEAPONS EXPERT': 'ADVANCED WEAPON EXPERT',
  'ADVANCED WEAPONS MASTER': 'ADVANCED WEAPON MASTER',
  'ADVANCED WEAPONS LEGENDARY': 'ADVANCED WEAPON LEGENDARY',
  // Text fields with inconsistent or misspelled names
  'LORE 1 PROFICIENCY': 'LORE 1 PFOCIENCY',
  'LORE 2 INTELLIGENCE': 'LORE CATEGORY 2 ITENLLIGENCE',
  'REFLEX ITEM': 'ITEM2',
  'MELEE STRIKE 3 ITEM': 'MELEE STRIKE 3 ITEM BONUS',
  'RANGED STRIKE 4 ITEM': 'RANGED STRIKE 4 ITEM BONUS',
  'HELD 1': 'HELD1',
  'ACTION SOURCE 3': 'ACTIONS SOURCE 3',
  'ACTION SOURCE 4': 'ACTIONS SOURCE 4',
};

/** Maps a WG attribute variable name to the word the template uses in column field names. */
const ATTRIBUTE_FIELD_WORDS: Record<string, string> = {
  ATTRIBUTE_STR: 'STRENGTH',
  ATTRIBUTE_DEX: 'DEXTERITY',
  ATTRIBUTE_CON: 'CONSTITUTION',
  ATTRIBUTE_INT: 'INTELLIGENCE',
  ATTRIBUTE_WIS: 'WISDOM',
  ATTRIBUTE_CHA: 'CHARISMA',
};

/**
 * Extracts the plain text from a TipTap JSONContent tree (the format character
 * note pages are stored in). Block-level nodes are separated with newlines.
 */
function tiptapToPlainText(node: any): string {
  if (!node) return '';
  if (node.type === 'text') return node.text ?? '';
  const blockTypes = ['paragraph', 'heading', 'listItem', 'blockquote', 'codeBlock'];
  const inner = ((node.content ?? []) as any[]).map(tiptapToPlainText).join('');
  return blockTypes.includes(node.type) ? inner + '\n' : inner;
}

async function fillPDF(form: PDFForm, character: Character) {
  // See Field names: https://www.pdfescape.com //

  // Get all content that the character uses
  const sv = defineDefaultSources('PAGE', character.content_sources?.enabled ?? []);

  // Prefetch content sources
  await fetchContentSources(sv);

  // Fetch the content package
  const content = await fetchContentPackage(sv, { fetchSources: true });
  const STORE_ID = 'CHARACTER';

  const compileText = (text: string) => {
    return stripMd(stripEmojis(compileExpressions(STORE_ID, text.trim(), true) ?? ''));
  };

  // Execute all operations (to update the variables)
  await executeOperations({
    type: 'CHARACTER',
    data: {
      character,
      content,
      context: 'CHARACTER-BUILDER',
    },
  });

  /**
   * Safe setters. Every write is wrapped so a missing field never aborts the export:
   * the template has a fixed number of rows, so overflow writes are expected to fail.
   * Names are passed through TEMPLATE_FIELD_ALIASES to hit the template's misspellings.
   */
  const setText = (fieldName: string, text: string | undefined) => {
    try {
      form.getTextField(TEMPLATE_FIELD_ALIASES[fieldName] ?? fieldName).setText(text);
    } catch (e) {
      console.warn(e);
    }
  };
  const setCheckbox = (fieldName: string) => {
    try {
      form.getCheckBox(TEMPLATE_FIELD_ALIASES[fieldName] ?? fieldName).check();
    } catch (e) {
      console.warn(e);
    }
  };

  const featData = collectEntityAbilityBlocks(STORE_ID, character, content.abilityBlocks, {
    filterBasicClassFeatures: true,
  });

  const traits = getAllAncestryTraitVariables(STORE_ID).map((v) => {
    const trait = content.traits.find((trait) => trait.id === v.value);
    return trait;
  });

  const conditions = character.details?.conditions ?? [];

  const strValue = getVariable<VariableAttr>(STORE_ID, 'ATTRIBUTE_STR')!.value;
  const dexValue = getVariable<VariableAttr>(STORE_ID, 'ATTRIBUTE_DEX')!.value;
  const conValue = getVariable<VariableAttr>(STORE_ID, 'ATTRIBUTE_CON')!.value;
  const intValue = getVariable<VariableAttr>(STORE_ID, 'ATTRIBUTE_INT')!.value;
  const wisValue = getVariable<VariableAttr>(STORE_ID, 'ATTRIBUTE_WIS')!.value;
  const chaValue = getVariable<VariableAttr>(STORE_ID, 'ATTRIBUTE_CHA')!.value;

  const resistVar = getVariable<VariableListStr>(STORE_ID, 'RESISTANCES');
  const weakVar = getVariable<VariableListStr>(STORE_ID, 'WEAKNESSES');
  const immuneVar = getVariable<VariableListStr>(STORE_ID, 'IMMUNITIES');

  const languages = getVariable<VariableListStr>(STORE_ID, 'LANGUAGE_NAMES')?.value ?? [];

  const senseData = collectEntitySenses(STORE_ID, content.abilityBlocks);

  const weapons = character.inventory?.items
    .filter((invItem) => invItem.is_equipped && isItemWeapon(invItem.item))
    .sort((a, b) => a.item.name.localeCompare(b.item.name))
    .map((invItem) => ({
      item: invItem.item,
      stats: getWeaponStats(STORE_ID, invItem.item),
    }));

  const items = character.inventory ? getFlatInvItems(character.inventory) : [];

  const spellData = collectEntitySpellcasting(STORE_ID, character);

  //////////////////////////////////////////////////////////////////////////////////

  // ── Page 1: Identity ──────────────────────────────────────────────────────────

  setText('Character Name', character.name);
  setText('Player Name', getCachedPublicUser()?.display_name ?? '');
  setText('Ancestry', character.details?.ancestry?.name);
  setText('Background', character.details?.background?.name);

  // Dual class characters show both classes
  const classNames = [character.details?.class?.name, character.details?.class_2?.name].filter(isTruthy).join(' / ');
  setText('Class', classNames);

  // Heritage(s) and ancestry traits, skipping the separator when either side is empty
  const heritageStr = featData.heritages.map((h) => h.name).join(', ');
  const traitsStr = traits
    .map((t) => t?.name)
    .filter(isTruthy)
    .join(', ');
  setText('Heritage and Traits', [heritageStr, traitsStr].filter((s) => s.length > 0).join(' | '));

  setText('Size', toLabel(getVariable<VariableStr>(STORE_ID, 'SIZE')?.value));
  setText('Background Notes', '');

  // Class archetypes and variant rules are otherwise invisible on the sheet
  const classNotes: string[] = [];
  if (character.details?.class_archetype) {
    classNotes.push(`Class Archetype: ${character.details.class_archetype.name}`);
  }
  if (character.details?.class_archetype_2) {
    classNotes.push(`Class Archetype 2: ${character.details.class_archetype_2.name}`);
  }
  if (character.variants?.free_archetype) classNotes.push('Free Archetype');
  if (character.variants?.automatic_bonus_progression) classNotes.push('Automatic Bonus Progression');
  if (character.variants?.gradual_attribute_boosts) classNotes.push('Gradual Attribute Boosts');
  setText('Class Notes', classNotes.join('\n'));

  setText('Temporary HP', character.hp_temp + '');
  setText('Current HP', character.hp_current + '');
  setText('MAXIMUM HIT POINTS', `${getFinalHealthValue(STORE_ID)}`);

  setText('LEVEL', getVariable<VariableNum>(STORE_ID, 'LEVEL')?.value + '');
  setText('XP', character.experience + '');

  if (character.hero_points > 0) {
    setCheckbox('HERO POINT 1');
  }
  if (character.hero_points > 1) {
    setCheckbox('HERO POINT 2');
  }
  if (character.hero_points > 2) {
    setCheckbox('HERO POINT 3');
  }

  // ── Attributes ────────────────────────────────────────────────────────────────

  setText('STRENGTH STAT', sign(strValue.value));
  setText('DEXTERITY STAT', sign(dexValue.value));
  setText('CONSTITUTION STAT', sign(conValue.value));
  setText('INTELLIGENCE STAT', sign(intValue.value));
  setText('WISDOM STAT', sign(wisValue.value));
  setText('CHARISMA STAT', sign(chaValue.value));

  // Set partials (the BOODST misspellings are the template's own field names)
  if (strValue.partial) {
    setCheckbox('STRENGTH PARTIAL BOOST');
  }
  if (dexValue.partial) {
    setCheckbox('DEXTERITY PARTIAL BOOST');
  }
  if (conValue.partial) {
    setCheckbox('CONSTITUTION PARTIAL BOODST');
  }
  if (intValue.partial) {
    setCheckbox('INTELLIGENCE PARTIAL BOODST');
  }
  if (wisValue.partial) {
    setCheckbox('WISDOM PARTIAL BOOST');
  }
  if (chaValue.partial) {
    setCheckbox('CHARISMA PARTIAL BOOST');
  }

  // ── Armor Class & Shield ──────────────────────────────────────────────────────

  const bestArmor = getBestArmor(STORE_ID, character.inventory ?? undefined);
  const acParts = getAcParts(STORE_ID, bestArmor?.item);

  setText('AC', getFinalAcValue(STORE_ID, bestArmor?.item) + '');
  // The sheet's formula is 10 + Dex (capped by armor) + Prof + Item. Using the
  // capped Dex from getAcParts keeps the columns summing to the printed AC.
  setText('AC CALCULATION 1 DEXTERITY', sign(acParts.dexBonus));
  setText('AC CALCULATION 2 PROFICIENCY', `${acParts.profBonus}`);
  const acItemBonus = acParts.armorBonus + acParts.bonusAc;
  setText('AC CALCULATION 3 ITEM', `${acItemBonus}${acParts.hasConditionals ? '*' : ''}`);

  // Armor check penalty applies to the four Str/Dex skills with an Armor column
  if (acParts.checkPenalty !== 0) {
    for (const armorPenaltyField of ['ACROBATICS ARMOR', 'ATHLETICS ARMOR', 'STEALTH ARMOR', 'THIEVERY ARMOR']) {
      setText(armorPenaltyField, `${acParts.checkPenalty}`);
    }
  }

  if (character.inventory) {
    const bestShield = getBestShield(STORE_ID, character.inventory);
    const bestShieldHealth = bestShield ? getItemHealth(bestShield.item) : null;

    setText('SHIELD', sign(bestShield?.item.meta_data?.ac_bonus ?? 0));
    setText('Hardness Max HP', `${bestShieldHealth?.hardness ?? 0}`);
    setText('MAX HP', `${bestShieldHealth?.hp_max ?? 0}`);
    setText('BT', `${bestShieldHealth?.bt ?? 0}`);
    setText('HP', `${bestShieldHealth?.hp_current ?? 0}`);
  }

  // ── Proficiencies ─────────────────────────────────────────────────────────────

  /**
   * Fills a proficiency row on the sheet: the total, the attribute modifier column,
   * the proficiency column (prof + level), the item column, and the T/E/M/L boxes.
   * The item column holds flat bonuses; a '*' marks conditional bonuses.
   * opts.attributeField overrides the attribute column's field name for rows where
   * the template labels it differently (e.g. 'SPELL ATTACK KEY').
   */
  const profFillIn = (variableName: string, sheetId: string, opts?: { attributeField?: string }) => {
    const variable = getVariable<VariableProf>(STORE_ID, variableName);
    const parts = getProfValueParts(STORE_ID, variableName);

    if (parts && (variable?.value.attribute || parts.attributeMod !== null)) {
      setText(sheetId, getFinalProfValue(STORE_ID, variable?.name ?? variableName));
      setText(`${sheetId} PROFICIENCY`, `${parts.profValue + parts.level}`);

      const bonusValue = parts.breakdown.bonusValue;
      const itemText = `${bonusValue !== 0 ? sign(bonusValue) : ''}${parts.hasConditionals ? '*' : ''}`;
      if (itemText.length > 0) {
        setText(`${sheetId} ITEM`, itemText);
      }

      const attributeWord = ATTRIBUTE_FIELD_WORDS[variable?.value.attribute ?? ''];
      const attributeField = opts?.attributeField ?? (attributeWord ? `${sheetId} ${attributeWord}` : undefined);
      if (attributeField) {
        setText(attributeField, sign(parts.attributeMod ?? 0));
      }
    }

    const profType = compileProficiencyType(variable?.value);
    if (isProficiencyTypeGreaterOrEqual(profType, 'T')) {
      setCheckbox(`${sheetId} TRAINED`);
    }
    if (isProficiencyTypeGreaterOrEqual(profType, 'E')) {
      setCheckbox(`${sheetId} EXPERT`);
    }
    if (isProficiencyTypeGreaterOrEqual(profType, 'M')) {
      setCheckbox(`${sheetId} MASTER`);
    }
    if (isProficiencyTypeGreaterOrEqual(profType, 'L')) {
      setCheckbox(`${sheetId} LEGENDARY`);
    }
  };

  profFillIn('LIGHT_ARMOR', 'LIGHT');
  profFillIn('MEDIUM_ARMOR', 'MEDIUM');
  profFillIn('HEAVY_ARMOR', 'HEAVY');
  profFillIn('UNARMORED_DEFENSE', 'UNARMORED');

  profFillIn('UNARMED_ATTACKS', 'UNARMED');
  profFillIn('SIMPLE_WEAPONS', 'SIMPLE WEAPONS');
  profFillIn('MARTIAL_WEAPONS', 'MARTIAL WEAPONS');
  profFillIn('ADVANCED_WEAPONS', 'ADVANCED WEAPONS');

  profFillIn('SAVE_FORT', 'FORTITUDE');
  profFillIn('SAVE_REFLEX', 'REFLEX');
  profFillIn('SAVE_WILL', 'WILL');

  profFillIn('SKILL_ACROBATICS', 'ACROBATICS');
  profFillIn('SKILL_ARCANA', 'ARCANA');
  profFillIn('SKILL_ATHLETICS', 'ATHLETICS');
  profFillIn('SKILL_CRAFTING', 'CRAFTING');
  profFillIn('SKILL_DECEPTION', 'DECEPTION');
  profFillIn('SKILL_DIPLOMACY', 'DIPLOMACY');
  profFillIn('SKILL_INTIMIDATION', 'INTIMIDATION');
  profFillIn('SKILL_MEDICINE', 'MEDICINE');
  profFillIn('SKILL_NATURE', 'NATURE');
  profFillIn('SKILL_OCCULTISM', 'OCCULTISM');
  profFillIn('SKILL_PERFORMANCE', 'PERFORMANCE');
  profFillIn('SKILL_RELIGION', 'RELIGION');
  profFillIn('SKILL_SOCIETY', 'SOCIETY');
  profFillIn('SKILL_STEALTH', 'STEALTH');
  profFillIn('SKILL_SURVIVAL', 'SURVIVAL');
  profFillIn('SKILL_THIEVERY', 'THIEVERY');

  profFillIn('PERCEPTION', 'PERCEPTION');

  // Find first two lores
  let lore1 = '';
  let lore2 = '';
  getAllSkillVariables(STORE_ID).forEach((skill) => {
    if (skill.name.startsWith('SKILL_LORE_') && skill.name !== 'SKILL_LORE____') {
      if (lore1 === '') {
        lore1 = skill.name;
      } else if (lore2 === '') {
        lore2 = skill.name;
      }
    }
  });
  if (lore1 !== '') {
    // 'LORE1' covers the total and checkboxes; 'LORE 1' covers the column fields
    profFillIn(lore1, 'LORE1');
    profFillIn(lore1, 'LORE 1');
    setText('LORE CATAGORY 1', toLabel(lore1).replace(' Lore', ''));
  }
  if (lore2 !== '') {
    profFillIn(lore2, 'LORE2');
    profFillIn(lore2, 'LORE 2');
    setText('LORE CATEGORY 2', toLabel(lore2).replace(' Lore', ''));
  }

  // ── Save breakdowns (the shared Con / Prof / Item boxes under the shields) ────

  setText('DEXTERITY', sign(dexValue.value));
  setText('CONSTITUTION', sign(conValue.value));
  setText('WISDOM', sign(wisValue.value));

  const fortParts = getProfValueParts(STORE_ID, 'SAVE_FORT');
  if (fortParts) {
    setText(`PROFICIENCY`, `${fortParts.profValue + fortParts.level}`);
  }

  const reflexParts = getProfValueParts(STORE_ID, 'SAVE_REFLEX');
  if (reflexParts) {
    setText(`PROFICIENCY2`, `${reflexParts.profValue + reflexParts.level}`);
  }

  const willParts = getProfValueParts(STORE_ID, 'SAVE_WILL');
  if (willParts) {
    setText(`PROFICIENCY3`, `${willParts.profValue + willParts.level}`);
  }

  // Conditional defense bonuses are written out in full in the Defense Notes box
  const defenseNotes: string[] = [];
  for (const [variableName, label] of [
    ['AC_BONUS', 'AC'],
    ['SAVE_FORT', 'Fort'],
    ['SAVE_REFLEX', 'Reflex'],
    ['SAVE_WILL', 'Will'],
  ] as const) {
    for (const cond of getVariableBreakdown(STORE_ID, variableName).conditionals) {
      defenseNotes.push(`${label}: ${compileText(cond.text)}`);
    }
  }
  setText('DEFENSE NOTES', [...new Set(defenseNotes)].join('\n'));

  // Same for skills and perception, in the Skill Notes column
  const skillNotes: string[] = [];
  const skillNoteVariables = [...getAllSkillVariables(STORE_ID), getVariable<VariableProf>(STORE_ID, 'PERCEPTION')];
  for (const skillVariable of skillNoteVariables.filter(isTruthy)) {
    for (const cond of getVariableBreakdown(STORE_ID, skillVariable.name).conditionals) {
      skillNotes.push(`${toLabel(skillVariable.name)}: ${compileText(cond.text)}`);
    }
  }
  setText('SKILL NOTES', [...new Set(skillNotes)].join('\n'));

  // ── Dying & Wounded ───────────────────────────────────────────────────────────

  const dying = conditions.find((c) => c.name === 'Dying');
  if (dying) {
    const dyingValue = dying.value ?? 0;
    if (dyingValue >= 1) {
      setCheckbox('DYING1');
    }
    if (dyingValue >= 2) {
      setCheckbox('DYING2');
    }
    if (dyingValue >= 3) {
      setCheckbox('DYING3');
    }
    if (dyingValue >= 4) {
      setCheckbox('DYING4');
    }
  }
  const wounded = conditions.find((c) => c.name === 'Wounded');
  if (wounded) {
    setText('WOUNDED', `${wounded.value ?? 0}`);
  }

  // ── Resistances, Conditions, Languages, Senses, Speed ─────────────────────────

  const resistSegments: string[] = [];
  if (resistVar && resistVar.value.length > 0) {
    resistSegments.push(`Resist: ${resistVar.value.map((v) => displayResistWeak(STORE_ID, v)).join(', ')}`);
  }
  if (weakVar && weakVar.value.length > 0) {
    resistSegments.push(`Weak: ${weakVar.value.map((v) => displayResistWeak(STORE_ID, v)).join(', ')}`);
  }
  if (immuneVar && immuneVar.value.length > 0) {
    resistSegments.push(`Immune: ${immuneVar.value.map((v) => displayResistWeak(STORE_ID, v)).join(', ')}`);
  }
  setText('RESISTANCE AND IMMUNITIES', resistSegments.join(' | '));

  // Conditions include their value when they have one (e.g. 'Frightened 2')
  setText(
    'CONDITIONS',
    conditions.map((c) => (c.value !== undefined && c.value !== null ? `${c.name} ${c.value}` : c.name)).join(', ')
  );

  setText('LANGUAGES', languages.map((l) => toLabel(l)).join('\n'));

  const senseLines = [
    senseData.precise.length > 0 ? `Precise: ${senseData.precise.map((v) => displaySense(v)).join(', ')}` : '',
    senseData.imprecise.length > 0 ? `Imprecise: ${senseData.imprecise.map((v) => displaySense(v)).join(', ')}` : '',
    senseData.vague.length > 0 ? `Vague: ${senseData.vague.map((v) => displaySense(v)).join(', ')}` : '',
  ].filter((s) => s.length > 0);
  setText('SENSES AND NOTES', senseLines.join('\n'));

  // Speeds go through getSpeedValue so bonuses and penalties are included
  const speedVariable = getVariable<VariableNum>(STORE_ID, 'SPEED');
  setText('SPEED', speedVariable ? `${getSpeedValue(STORE_ID, speedVariable, character).total}ft` : '');
  setText(
    'SPECIAL MOVEMENT',
    getAllSpeedVariables(STORE_ID)
      .filter((v) => v.name !== 'SPEED')
      .map((v) => ({ variable: v, speed: getSpeedValue(STORE_ID, v, character) }))
      .filter(({ variable, speed }) => variable.value > 0 || speed.bonus > 0)
      .map(({ variable, speed }) => `${toLabel(variable.name)} ${speed.total}ft`)
      .join('\n')
  );

  // ── Strikes ───────────────────────────────────────────────────────────────────

  /**
   * Splits a strike's attack bonus into the sheet's Attribute / Prof / Item columns.
   * Anything that is not the attribute or proficiency part (potency runes, item and
   * misc bonuses) lands in the item column, so the columns always sum to the total.
   */
  const getStrikeColumnParts = (stats: ReturnType<typeof getWeaponStats>) => {
    let prof = 0;
    let attr = 0;
    for (const [description, value] of stats.attack_bonus.parts.entries()) {
      if (description.includes('proficiency bonus')) {
        prof += value;
      } else if (description.includes('Strength modifier') || description.includes('Dexterity modifier')) {
        attr += value;
      }
    }
    const item = stats.attack_bonus.total[0] - prof - attr;
    return { prof, attr, item };
  };

  /** Formats a strike's damage, e.g. '2d8 + 4 S + 1d6 fire'. */
  const buildDamageString = (stats: ReturnType<typeof getWeaponStats>) => {
    const bonus = stats.damage.bonus.total;
    const bonusStr = bonus > 0 ? ` + ${bonus}` : bonus < 0 ? ` - ${Math.abs(bonus)}` : '';
    const extraStr = stats.damage.extra ? ` + ${stats.damage.extra}` : '';
    return `${stats.damage.dice}${stats.damage.die}${bonusStr} ${stats.damage.damageType}${extraStr}`;
  };

  /** Checks the B/P/S damage type box for a strike row (rows 1-5 share one naming scheme). */
  const checkDamageTypeBox = (stats: ReturnType<typeof getWeaponStats>, row: number) => {
    const letter = stats.damage.damageType;
    if (letter === 'B' || letter === 'P' || letter === 'S') {
      setCheckbox(row === 1 ? letter : `${letter}_${row}`);
    }
  };

  const strikeTraitNames = (item: (typeof items)[number]['item']) => {
    return (item.traits ?? [])
      .map((traitId) => content.traits.find((trait) => trait.id === traitId)?.name)
      .filter(isTruthy)
      .join(', ');
  };

  // The template has exactly 3 melee rows (1-3) and 2 ranged rows (4-5)
  const meleeWeapons = (weapons ?? []).filter((w) => !isItemRangedWeapon(w.item)).slice(0, 3);
  const rangedWeapons = (weapons ?? []).filter((w) => isItemRangedWeapon(w.item)).slice(0, 2);

  meleeWeapons.forEach((weapon, index) => {
    const row = index + 1;
    const columns = getStrikeColumnParts(weapon.stats);
    setText(`MELEE STRIKE ${row}`, weapon.item.name);
    setText(`MELEE STRIKE ${row} ATTACK BONUS`, sign(weapon.stats.attack_bonus.total[0]));
    // The attribute actually used (Dex for finesse weapons), so the columns add up
    setText(`MELEE STRIKE ${row} STRENGTH`, sign(columns.attr));
    setText(`MELEE STRIKE ${row} PROFICIENCY`, `${columns.prof}`);
    if (columns.item !== 0) {
      setText(`MELEE STRIKE ${row} ITEM`, `${columns.item}`);
    }
    setText(`MELEE STRIKE ${row} DAMAGE`, buildDamageString(weapon.stats));
    setText(`MELEE STRIKE ${row} TRAITS AND NOTES`, strikeTraitNames(weapon.item));
    checkDamageTypeBox(weapon.stats, row);
  });

  rangedWeapons.forEach((weapon, index) => {
    const row = index + 4;
    const columns = getStrikeColumnParts(weapon.stats);
    setText(`RANGED STRIKE ${row}`, weapon.item.name);
    setText(`RANGED STRIKE ${row} ATTACK BONUS`, sign(weapon.stats.attack_bonus.total[0]));
    // The attribute actually used (Str for brutal weapons), so the columns add up
    setText(`RANGED STRIKE ${row} DEXTERITY`, sign(columns.attr));
    setText(`RANGED STRIKE ${row} PROFICIENCY`, `${columns.prof}`);
    if (columns.item !== 0) {
      setText(`RANGED STRIKE ${row} ITEM`, `${columns.item}`);
    }
    setText(`RANGED STRIKE ${row} DAMAGE`, buildDamageString(weapon.stats));
    const rangedNotes = [
      strikeTraitNames(weapon.item),
      weapon.item.meta_data?.range ? `Range: ${weapon.item.meta_data.range}ft` : '',
      weapon.item.meta_data?.reload !== undefined && `${weapon.item.meta_data.reload}` !== ''
        ? `Reload: ${weapon.item.meta_data.reload}`
        : '',
    ].filter((s) => s.length > 0);
    setText(`RANGED STRIKE ${row} TRAITS AND NOTES`, rangedNotes.join(' | '));
    checkDamageTypeBox(weapon.stats, row);
  });

  // ── Weapon proficiencies box, critical specializations, class DC ──────────────

  // The 'Other' column: best proficiency across specific weapon groups
  const weaponGroupProfTypes = Object.values(getVariables(STORE_ID))
    .filter((v) => v.type === 'prof' && v.name.startsWith('WEAPON_GROUP_'))
    .map((v) => compileProficiencyType((v as VariableProf).value));
  for (const [profType, suffix] of [
    ['T', 'TRAINED'],
    ['E', 'EXPERT'],
    ['M', 'MASTER'],
    ['L', 'LEGENDARY'],
  ] as const) {
    if (weaponGroupProfTypes.some((t) => isProficiencyTypeGreaterOrEqual(t, profType))) {
      setCheckbox(`OTHER WEAPONS ${suffix}`);
    }
  }

  // Weapon familiarities (e.g. 'Goblin Weapons') go in the text area next to the boxes
  const weaponFamiliarity = getVariable<VariableListStr>(STORE_ID, 'WEAPON_FAMILIARITY')?.value ?? [];
  setText('UNARMED, SIMPLE, ADVANCED, OTHER', weaponFamiliarity.map((w) => toLabel(w)).join(', '));

  const critSpecGroups = getVariable<VariableListStr>(STORE_ID, 'WEAPON_CRITICAL_SPECIALIZATIONS')?.value ?? [];
  setText(
    'CRITICAL SPECIALIZATIONS',
    critSpecGroups.map((group) => toLabel(group.replace(/^WEAPON_GROUP_/i, ''))).join(', ')
  );

  setText('CLASS DC', getFinalProfValue(STORE_ID, 'CLASS_DC', true));
  const classDcParts = getProfValueParts(STORE_ID, 'CLASS_DC');
  if (classDcParts) {
    setText('CLASS DC KEY', sign(classDcParts.attributeMod ?? 0));
    setText('CLASS DC PROFICIENCY', `${classDcParts.profValue + classDcParts.level}`);
    const classDcItemText = `${classDcParts.breakdown.bonusValue !== 0 ? sign(classDcParts.breakdown.bonusValue) : ''}${classDcParts.hasConditionals ? '*' : ''}`;
    if (classDcItemText.length > 0) {
      setText('CLASS DC ITEM', classDcItemText);
    }
  }

  // ── Page 2: Feats & Features ──────────────────────────────────────────────────

  setText('ANCESTRY & HERITAGE ABILITIES', featData.physicalFeatures.map((f) => f.name).join(', '));
  setText('ANCESTRY FEAT', featData.ancestryFeats.find((f) => f.level === 1)?.name ?? '');
  setText(
    'BACKGROUND SKILL FEAT',
    featData.generalAndSkillFeats.find((f) => f.level === 1 && hasTraitType('SKILL', f.traits ?? undefined))?.name ?? ''
  );
  // Level 1 class feats and features share the big level-1 box (there is no
  // 'CLASS FEAT 0' row in the template)
  setText(
    'CLASS FEATS & FEATURES',
    [...featData.classFeats.filter((f) => f.level === 1), ...featData.classFeatures.filter((f) => f.level === 1)]
      .map((f) => f.name)
      .join('\n')
  );

  /** Writes up to 3 ability names into a page-2 level row ('<prefix>-1' .. '<prefix>-3'). */
  const featFillIn = (options: AbilityBlock[], prefixId: string) => {
    options.forEach((option, index) => {
      setText(`${prefixId}-${index + 1}`, option.name);
    });
  };

  // The left column's rows are labeled Skill / General / Ancestry Feat depending on
  // the level, but they share the 'SKILL FEAT <level>' field names. Combine all
  // feats of that level so ancestry feats picked at 5/9/13/17 actually show up.
  for (let level = 2; level <= 20; level++) {
    featFillIn(
      [
        ...featData.generalAndSkillFeats.filter((ab) => ab.level === level),
        ...featData.ancestryFeats.filter((ab) => ab.level === level),
      ],
      'SKILL FEAT ' + level
    );
  }
  // The right column's 'CLASS FEAT <n>' rows map to level n + 1 (row 1 is level 2)
  for (let level = 2; level <= 20; level++) {
    featFillIn(
      [
        ...featData.classFeats.filter((ab) => ab.level === level),
        ...featData.classFeatures.filter((ab) => ab.level === level),
      ],
      'CLASS FEAT ' + (level - 1)
    );
  }

  // ── Page 2: Inventory ─────────────────────────────────────────────────────────

  if (character.inventory) {
    setText('BULK TOTAL', labelizeBulk(getInvBulk(character.inventory), true));

    setText('COPPER', character.inventory.coins.cp + '');
    setText('SILVER', character.inventory.coins.sp + '');
    setText('GOLD', character.inventory.coins.gp + '');
    setText('PLATINUM', character.inventory.coins.pp + '');
  }

  /** Item display name with quantity when there is more than one, e.g. 'Torch x3'. */
  const itemDisplayName = (invItem: InventoryItem) => {
    const quantity = Number(invItem.item.meta_data?.quantity ?? 1);
    return quantity > 1 ? `${invItem.item.name} x${quantity}` : invItem.item.name;
  };

  let heldIndex = 0;
  let consumableIndex = 0;
  let wornIndex = 0;
  for (const invItem of items) {
    if (hasTraitType('CONSUMABLE', invItem.item.traits ?? undefined)) {
      consumableIndex++;
      setText(`CONSUMABLES ${consumableIndex}`, itemDisplayName(invItem));
      setText(`CONSUMABLES BULK ${consumableIndex}`, labelizeBulk(invItem.item.bulk ?? undefined, false));
    } else if ((invItem.is_equipped && !isItemWeapon(invItem.item)) || invItem.is_invested) {
      wornIndex++;
      setText(`WORN ${wornIndex}`, itemDisplayName(invItem));
      setText(`INVESTED ${wornIndex}`, invItem.is_invested ? 'Yes' : '');
      setText(`WORN BULK ${wornIndex}`, labelizeBulk(invItem.item.bulk ?? undefined, false));
    } else {
      heldIndex++;
      setText(`HELD ${heldIndex}`, itemDisplayName(invItem));
      setText(`HELD BULK ${heldIndex}`, labelizeBulk(invItem.item.bulk ?? undefined, false));
    }
  }

  // ── Page 3: Origin, Personality, Campaign Notes ───────────────────────────────

  setText('ETHNICITY', character.details?.info?.ethnicity);
  setText('NATIONALITY', character.details?.info?.nationality);
  setText('BIRTHPLACE', character.details?.info?.birthplace);
  setText('AGE', character.details?.info?.age);
  setText(
    'GENDER & PRONOUNS',
    [character.details?.info?.gender, character.details?.info?.pronouns].filter(isTruthy).join(', ')
  );
  setText('HEIGHT', character.details?.info?.height);
  setText('WEIGHT', character.details?.info?.weight);
  setText('Appearance', character.details?.info?.appearance);
  setText('Attitude', character.details?.info?.personality);
  setText('Deity or Philosophy', character.details?.info?.beliefs);
  setText('Edicts', '');
  setText('Anathema', '');
  setText('Likes', '');
  setText('Dislikes', '');
  setText('Catchphrases', '');

  // Campaign notes: the character's actual note pages, as plain text
  const notePages = character.notes?.pages ?? [];
  const notesTexts = notePages
    .map((page) => ({ name: page.name, text: tiptapToPlainText(page.contents).replace(/\n{3,}/g, '\n\n').trim() }))
    .filter((page) => page.text.length > 0)
    .map((page) => (notePages.length > 1 ? `${page.name}:\n${page.text}` : page.text));
  let notesText = notesTexts.join('\n\n');
  const NOTES_CHAR_LIMIT = 1500;
  if (notesText.length > NOTES_CHAR_LIMIT) {
    notesText = notesText.slice(0, NOTES_CHAR_LIMIT) + '...';
  }
  setText('Notes', notesText.length > 0 ? notesText : `See Wanderer's Guide for note pages.`);

  // Companions are the closest thing we have to allies
  setText('Allies', (character.companions?.list ?? []).map((c) => c.name).join(', '));
  setText('Enemies', '');

  const organizations: string[] = [];
  if (character.details?.info?.faction) {
    organizations.push(character.details.info.faction);
  }
  if (character.details?.info?.organized_play_id) {
    organizations.push(`Organized Play ID: ${character.details.info.organized_play_id}`);
  }
  setText('Organizations', organizations.join('\n'));

  // ── Page 3: Actions & Reactions ───────────────────────────────────────────────

  type ActionEntry = { block: AbilityBlock; source: string };

  const actionFillIn = (entry: ActionEntry, index: number) => {
    const action = entry.block;
    const CHUNK_SIZE = 10;
    function chunkString(str: string, chunkSize: number) {
      const wordArray = split(str, /\s+/);
      const chunks = chunk(wordArray, chunkSize);
      return chunks.map((chunk) => chunk.join(' '));
    }

    if (action.actions === 'REACTION' || action.actions === 'FREE-ACTION') {
      setText(`REACTION NAME ${index}`, action.name);

      if (action.actions === 'REACTION') {
        setCheckbox(index === 1 ? `reactio` : `reactio_${index}`);
      } else {
        setCheckbox(index === 1 ? `freeac` : `freeac_${index}`);
      }

      const actionTraits = (action.traits ?? []).map((v) => {
        return content.traits.find((trait) => trait.id === v);
      });
      setText(`REACTIONS TRAITS ${index}`, actionTraits.map((a) => a?.name ?? '').join(', '));
      setText(`REACTIONS SOURCE ${index}`, entry.source);

      const triggerChunks = chunkString(compileText(action.trigger ?? ''), CHUNK_SIZE);
      for (let i = 0; i < triggerChunks.length; i++) {
        setText(`REACTIONS TRIGGER ${index}-${i + 1}`, triggerChunks[i]);
      }

      setText(`REACTIONS EFFECTS ${index}-1`, compileText(action.description));
    } else {
      setText(`ACTION NAME ${index}`, action.name);
      setText(`ACTIONS COUNT ${index}`, actionCostToLabel(action.actions, true));
      const actionTraits = (action.traits ?? []).map((v) => {
        return content.traits.find((trait) => trait.id === v);
      });
      setText(`TRAIT(S)${index}`, actionTraits.map((a) => a?.name ?? '').join(', '));
      setText(`ACTION SOURCE ${index}`, entry.source);

      setText(`EFFECTS ${index}-1`, compileText(action.description));
    }
  };

  // Collect everything with an action cost, tagged with where it came from. The
  // template only has 4 action and 4 reaction slots, so put the defining class
  // abilities first and let the rest overflow.
  const actionEntries: ActionEntry[] = [
    { list: featData.classFeatures, label: 'Class Feature' },
    { list: featData.classFeats, label: 'Class Feat' },
    { list: featData.ancestryFeats, label: 'Ancestry Feat' },
    { list: featData.heritages, label: 'Heritage' },
    { list: featData.physicalFeatures, label: 'Ancestry' },
    { list: featData.generalAndSkillFeats, label: 'Feat' },
    { list: featData.otherFeats, label: 'Feat' },
  ].flatMap((category) =>
    category.list
      .filter((ab) => ab.actions !== null)
      .map((ab) => ({ block: ab, source: ab.level ? `${category.label} ${ab.level}` : category.label }))
  );

  const reactionEntries = actionEntries.filter(
    (e) => e.block.actions === 'REACTION' || e.block.actions === 'FREE-ACTION'
  );
  const activeActionEntries = actionEntries.filter(
    (e) => e.block.actions !== 'REACTION' && e.block.actions !== 'FREE-ACTION'
  );
  for (let i = 0; i < reactionEntries.length; i++) {
    actionFillIn(reactionEntries[i], i + 1);
  }
  for (let i = 0; i < activeActionEntries.length; i++) {
    actionFillIn(activeActionEntries[i], i + 1);
  }

  // ── Page 4: Spellcasting ──────────────────────────────────────────────────────

  const firstSource = spellData.sources.length > 0 ? spellData.sources[0] : undefined;
  if (firstSource) {
    try {
      if (firstSource.type.startsWith('SPONTANEOUS-')) {
        form.getRadioGroup('Magical Tradition').select('Spontaneous Caster');
      } else {
        form.getRadioGroup('Magical Tradition').select('Prepared Caster');
      }
    } catch (e) {
      console.warn(e);
    }

    const spellStats = getSpellStats(STORE_ID, null, firstSource.tradition, firstSource.attribute);

    // The template labels the attribute columns 'KEY' here instead of the attribute name
    profFillIn('SPELL_ATTACK', 'SPELL ATTACK', { attributeField: 'SPELL ATTACK KEY' });
    profFillIn('SPELL_DC', 'SPELL SAVE DC', { attributeField: 'SPELL SAVE DC KEY' });
    setText(`SPELL ATTACK`, sign(spellStats.spell_attack.total[0]));
    setText(`SPELL SAVE DC`, `${spellStats.spell_dc.total}`);
  }
  // Check the tradition box for every casting source (multiclass casters have several)
  for (const source of spellData.sources) {
    setCheckbox(source.tradition);
  }

  const spells = spellData.list
    .map((s) => {
      const spell = content.spells.find((spell) => spell.id === s.spell_id);
      if (spell) {
        return {
          ...spell,
          rank: s.rank,
          casting_source: s.source,
        };
      }
      return null;
    })
    .filter(isTruthy)
    .sort((a, b) => a.rank - b.rank);

  const focusSpells = spellData.focus
    .map((s) => {
      const spell = content.spells.find((spell) => spell.id === s.spell_id);
      if (spell) {
        return {
          ...spell,
          rank: s.rank ?? 0,
          casting_source: s.source,
        };
      }
      return null;
    })
    .filter(isTruthy)
    .sort((a, b) => a.rank - b.rank);

  const innateSpells = spellData.innate
    .map((s) => {
      const spell = content.spells.find((spell) => spell.id === s.spell_id);
      if (spell) {
        return {
          ...s,
          spell: spell,
        };
      }
      return null;
    })
    .filter(isTruthy)
    .sort((a, b) => a.rank - b.rank);

  const cantripRank = Math.ceil(character.level / 2);
  setText('CANTRIPS RANK', cantripRank + '');
  setText('FOCUS SPELL RANK', cantripRank + '');

  const cantrips = spells.filter((s) => isCantrip(s) && !isRitual(s));
  const nonCantrips = spells.filter((s) => !isCantrip(s) && !isRitual(s));
  const ritualSpells = spells.filter((s) => isRitual(s));

  // Prepared casters have a number of cantrip (rank 0) slots per day; spontaneous
  // casters can cast any cantrip they know, so fall back to the known count
  const cantripSlotCount = spellData.slots.filter((s) => s.rank === 0).length;
  setText('CANTRIPS PER DAY', `${cantripSlotCount > 0 ? cantripSlotCount : cantrips.length}`);

  const findSlotForSpell = (spell: Spell) => {
    return spellData.slots.find((s) => s.spell_id === spell.id && s.rank === spell.rank);
  };

  for (let i = 0; i < cantrips.length; i++) {
    const spell = cantrips[i];
    setText(`CANTRIP NAME ${i + 1}`, spell.name);
    setText(`CANTRIP ${i + 1} ACTIONS`, actionCostToLabel(spell.cast, true));
    if (findSlotForSpell(spell)) {
      setCheckbox(`CANTRIP ${i + 1} PREPARED`);
    }
  }

  for (let i = 0; i < nonCantrips.length; i++) {
    const spell = nonCantrips[i];
    setText(`SPELL ${i + 1}`, spell.name);
    setText(`SPELL ACTION ${i + 1}`, actionCostToLabel(spell.cast, true));
    setText(`SPELL RANK ${i + 1}`, rankNumber(spell.rank));
    if (findSlotForSpell(spell)) {
      setCheckbox(`SPELL PREPARED ${i + 1}`);
    }
  }

  const focusPoints = getFocusPoints(STORE_ID, character, spellData.focus);
  if (focusPoints.current > 0) {
    setCheckbox('FP1');
  }
  if (focusPoints.current > 1) {
    setCheckbox('FP2');
  }
  if (focusPoints.current > 2) {
    setCheckbox('FP 3');
  }

  for (let i = 0; i < focusSpells.length; i++) {
    const spell = focusSpells[i];
    setText(`FOCUS SPELL ${i + 1}`, spell.name);
    setText(`FOCUS SPELL ACTIONS ${i + 1}`, actionCostToLabel(spell.cast, true));
  }

  for (let i = 0; i < innateSpells.length; i++) {
    const record = innateSpells[i];
    if (record) {
      setText(`INNATE SPELL ${i + 1}`, record.spell.name);
      setText(`INNATE SPELL ACTION ${i + 1}`, actionCostToLabel(record.spell.cast, true));
      setText(`INNATE FREQ ${i + 1}`, `${record.casts_current}/${record.casts_max}`);
    }
  }

  for (let i = 0; i < ritualSpells.length; i++) {
    const spell = ritualSpells[i];
    setText(`RITUAL SPELL ${i + 1}`, spell.name);
    setText(`RITUAL RANK ${i + 1}`, rankNumber(spell.rank));
    setText(`RITUAL COST ${i + 1}`, spell.cost ?? undefined);
  }

  // Slots (rank 0 is the cantrip slots, already covered by the Cantrips section)
  const slotData = groupBy(spellData.slots, 'rank');
  for (const rank of Object.keys(slotData)) {
    if (rank === '0') continue;
    const slots = slotData[rank];
    setText(`SPELLS PER DAY ${rank}`, `${slots.length}`);
    setText(`SPELLS REMAINING ${rank}`, `${slots.filter((s) => s.exhausted !== true).length}`);
  }

  console.log('Complete 🎉');
}
