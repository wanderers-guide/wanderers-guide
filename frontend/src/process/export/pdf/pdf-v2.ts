import {
  collectEntityAbilityBlocks,
  collectEntitySenses,
  collectEntitySpellcasting,
  getFocusPoints,
} from '@content/collect-content';
import { defineDefaultSources, fetchContentPackage, fetchContentSources } from '@content/content-store';
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
import { executeCharacterOperations } from '@operations/operation-controller';
import { Character, AbilityBlock, Spell } from '@typing/content';
import { VariableAttr, VariableListStr, VariableStr, VariableNum, VariableProf } from '@typing/variables';
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
} from '@variables/variable-display';
import {
  getAllAncestryTraitVariables,
  getVariable,
  getAllAttributeVariables,
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
import { chunk, flattenDeep, groupBy, split } from 'lodash-es';

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
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });

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

async function fillPDF(form: PDFForm, character: Character) {
  // See Field names: https://www.pdfescape.com //

  // Get all content that the character uses
  defineDefaultSources(character.content_sources?.enabled ?? []);

  // Prefetch content sources
  await fetchContentSources();

  // Fetch the content package
  const content = await fetchContentPackage(undefined, { fetchSources: true });
  const STORE_ID = 'CHARACTER';

  const compileText = (text: string) => {
    return stripMd(stripEmojis(compileExpressions(STORE_ID, text.trim(), true) ?? ''));
  };

  // Execute all operations (to update the variables)
  await executeCharacterOperations(character, content, 'CHARACTER-BUILDER');

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

  // Fill the fields
  form.getTextField('Character Name').setText(character.name);
  form.getTextField('Ancestry').setText(character.details?.ancestry?.name);
  form.getTextField('Background').setText(character.details?.background?.name);
  form.getTextField('Class').setText(character.details?.class?.name);
  form
    .getTextField('Heritage and Traits')
    .setText(`${featData.heritages.map((h) => h.name).join(', ')} | ${traits.map((t) => t?.name).join(', ')}`);
  form.getTextField('Size').setText(toLabel(getVariable<VariableStr>(STORE_ID, 'SIZE')?.value));
  form.getTextField('Background Notes').setText('');
  form.getTextField('Class Notes').setText('');

  form.getTextField('Temporary HP').setText(character.hp_temp + '');
  form.getTextField('Current HP').setText(character.hp_current + '');
  form.getTextField('MAXIMUM HIT POINTS').setText(`${getFinalHealthValue(STORE_ID)}`);

  form.getTextField('LEVEL').setText(getVariable<VariableNum>(STORE_ID, 'LEVEL')?.value + '');
  form.getTextField('XP').setText(character.experience + '');

  if (character.hero_points > 0) {
    form.getCheckBox('HERO POINT 1').check();
  }
  if (character.hero_points > 1) {
    form.getCheckBox('HERO POINT 2').check();
  }
  if (character.hero_points > 2) {
    form.getCheckBox('HERO POINT 3').check();
  }

  form.getTextField('STRENGTH STAT').setText(sign(strValue.value));
  form.getTextField('DEXTERITY STAT').setText(sign(dexValue.value));
  form.getTextField('CONSTITUTION STAT').setText(sign(conValue.value));
  form.getTextField('INTELLIGENCE STAT').setText(sign(intValue.value));
  form.getTextField('WISDOM STAT').setText(sign(wisValue.value));
  form.getTextField('CHARISMA STAT').setText(sign(chaValue.value));

  // Set partials
  if (strValue.partial) {
    form.getCheckBox('STRENGTH PARTIAL BOOST').check();
  }
  if (dexValue.partial) {
    form.getCheckBox('DEXTERITY PARTIAL BOOST').check();
  }
  if (conValue.partial) {
    form.getCheckBox('CONSTITUTION PARTIAL BOODST').check();
  }
  if (intValue.partial) {
    form.getCheckBox('INTELLIGENCE PARTIAL BOODST').check();
  }
  if (wisValue.partial) {
    form.getCheckBox('WISDOM PARTIAL BOOST').check();
  }
  if (chaValue.partial) {
    form.getCheckBox('CHARISMA PARTIAL BOOST').check();
  }

  // Other times attributes are used
  form.getTextField('AC CALCULATION 1 DEXTERITY').setText(sign(dexValue.value));

  //

  if (character.inventory) {
    const bestShield = getBestShield(STORE_ID, character.inventory);
    const bestShieldHealth = bestShield ? getItemHealth(bestShield.item) : null;

    form.getTextField('AC').setText(getFinalAcValue(STORE_ID, getBestArmor(STORE_ID, character.inventory)?.item) + '');
    form.getTextField('SHIELD').setText(sign(bestShield?.item.meta_data?.ac_bonus ?? 0));

    form.getTextField('Hardness Max HP').setText(`${bestShieldHealth?.hardness ?? 0}`);
    form.getTextField('MAX HP').setText(`${bestShieldHealth?.hp_max ?? 0}`);
    form.getTextField('BT').setText(`${bestShieldHealth?.bt ?? 0}`);
    form.getTextField('HP').setText(`${bestShieldHealth?.hp_current ?? 0}`);
  }

  const profFillIn = (variableName: string, sheetId: string) => {
    const variable = getVariable<VariableProf>(STORE_ID, variableName);
    if (variable?.value.attribute) {
      try {
        form.getTextField(sheetId).setText(getFinalProfValue(STORE_ID, variable?.name ?? ''));
      } catch (e) {
        console.warn(e);
      }

      const parts = getProfValueParts(STORE_ID, variable?.name ?? '');
      if (parts) {
        try {
          form.getTextField(`${sheetId} PROFICIENCY`).setText(`${parts.profValue + parts.level}`);
          if (parts.hasConditionals) {
            form.getTextField(`${sheetId} ITEM`).setText(`*`);
          }

          if (variable.value.attribute === 'ATTRIBUTE_STR') {
            form.getTextField(`${sheetId} STRENGTH`).setText(sign(parts.attributeMod ?? 0));
          } else if (variable.value.attribute === 'ATTRIBUTE_DEX') {
            form.getTextField(`${sheetId} DEXTERITY`).setText(sign(parts.attributeMod ?? 0));
          } else if (variable.value.attribute === 'ATTRIBUTE_CON') {
            form.getTextField(`${sheetId} CONSTITUTION`).setText(sign(parts.attributeMod ?? 0));
          } else if (variable.value.attribute === 'ATTRIBUTE_INT') {
            form.getTextField(`${sheetId} INTELLIGENCE`).setText(sign(parts.attributeMod ?? 0));
          } else if (variable.value.attribute === 'ATTRIBUTE_WIS') {
            form.getTextField(`${sheetId} WISDOM`).setText(sign(parts.attributeMod ?? 0));
          } else if (variable.value.attribute === 'ATTRIBUTE_CHA') {
            form.getTextField(`${sheetId} CHARISMA`).setText(sign(parts.attributeMod ?? 0));
          }
        } catch (e) {
          console.warn(e);
        }
      }
    }
    try {
      if (isProficiencyTypeGreaterOrEqual(compileProficiencyType(variable?.value), 'T')) {
        form.getCheckBox(sheetId + ' TRAINED').check();
      }
      if (isProficiencyTypeGreaterOrEqual(compileProficiencyType(variable?.value), 'E')) {
        form.getCheckBox(sheetId + ' EXPERT').check();
      }
      if (isProficiencyTypeGreaterOrEqual(compileProficiencyType(variable?.value), 'M')) {
        form.getCheckBox(sheetId + ' MASTER').check();
      }
      if (isProficiencyTypeGreaterOrEqual(compileProficiencyType(variable?.value), 'L')) {
        form.getCheckBox(sheetId + ' LEGENDARY').check();
      }
    } catch (e) {
      console.warn(e);
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
    profFillIn(lore1, 'LORE1');
    profFillIn(lore1, 'LORE 1');
    form.getTextField('LORE CATAGORY 1').setText(toLabel(lore1).replace(' Lore', ''));

    const lore1Parts = getProfValueParts(STORE_ID, lore1);
    if (lore1Parts) {
      form.getTextField(`LORE 1 INTELLIGENCE`).setText(`${sign(lore1Parts.attributeMod ?? 0)}`);
      form.getTextField(`LORE 1 PFOCIENCY`).setText(`${lore1Parts.profValue + lore1Parts.level}`);
    }
  }
  if (lore2 !== '') {
    profFillIn(lore2, 'LORE2');
    profFillIn(lore2, 'LORE 2');
    form.getTextField('LORE CATEGORY 2').setText(toLabel(lore2).replace(' Lore', ''));

    const lore2Parts = getProfValueParts(STORE_ID, lore2);
    if (lore2Parts) {
      form.getTextField(`LORE CATEGORY 2 ITENLLIGENCE`).setText(`${sign(lore2Parts.attributeMod ?? 0)}`);
    }
  }

  // For save calcs
  form.getTextField('DEXTERITY').setText(sign(dexValue.value));
  form.getTextField('CONSTITUTION').setText(sign(conValue.value));
  form.getTextField('WISDOM').setText(sign(wisValue.value));

  const fortParts = getProfValueParts(STORE_ID, 'SAVE_FORT');
  if (fortParts) {
    form.getTextField(`PROFICIENCY`).setText(`${fortParts.profValue + fortParts.level}`);
  }

  const reflexParts = getProfValueParts(STORE_ID, 'SAVE_REFLEX');
  if (reflexParts) {
    form.getTextField(`PROFICIENCY2`).setText(`${reflexParts.profValue + reflexParts.level}`);
  }

  const willParts = getProfValueParts(STORE_ID, 'SAVE_WILL');
  if (willParts) {
    form.getTextField(`PROFICIENCY3`).setText(`${willParts.profValue + willParts.level}`);
  }

  // Dying & Wounded
  const dying = conditions.find((c) => c.name === 'Dying');
  if (dying) {
    const dyingValue = dying.value ?? 0;
    if (dyingValue >= 1) {
      form.getCheckBox('DYING1').check();
    }
    if (dyingValue >= 2) {
      form.getCheckBox('DYING2').check();
    }
    if (dyingValue >= 3) {
      form.getCheckBox('DYING3').check();
    }
    if (dyingValue >= 4) {
      form.getCheckBox('DYING4').check();
    }
  }
  const wounded = conditions.find((c) => c.name === 'Wounded');
  if (wounded) {
    form.getTextField('WOUNDED').setText(`${wounded.value ?? 0}`);
  }

  //
  let resistWeakImmune = '';
  if (resistVar && resistVar.value.length > 0) {
    resistWeakImmune += `Resist: ${resistVar?.value.map((v) => displayResistWeak(STORE_ID, v)).join(', ') ?? ''}`;
  }
  if (weakVar && weakVar.value.length > 0) {
    resistWeakImmune += ` | Weak: ${weakVar?.value.map((v) => displayResistWeak(STORE_ID, v)).join(', ') ?? ''}`;
  }
  if (immuneVar && immuneVar.value.length > 0) {
    resistWeakImmune += ` | Immune: ${immuneVar?.value.map((v) => displayResistWeak(STORE_ID, v)).join(', ') ?? ''}`;
  }

  form.getTextField('RESISTANCE AND IMMUNITIES').setText(resistWeakImmune);
  form.getTextField('CONDITIONS').setText(conditions.map((c) => c.name).join(', '));

  form.getTextField('LANGUAGES').setText(languages.map((l) => toLabel(l)).join('\n'));

  const preciseVague =
    `Precise: ${senseData.precise.map((v) => displaySense(v)).join(', ') ?? ''}\nImprecise: ${senseData.imprecise.map((v) => displaySense(v)).join(', ') ?? ''}\nVague: ${senseData.vague.map((v) => displaySense(v)).join(', ') ?? ''}`.trim();
  form.getTextField('SENSES AND NOTES').setText(preciseVague);

  form.getTextField('SPEED').setText(getVariable<VariableNum>(STORE_ID, 'SPEED')?.value + 'ft');
  form.getTextField('SPECIAL MOVEMENT').setText(
    getAllSpeedVariables(STORE_ID)
      .filter((v) => v.value > 0 && v.name !== 'SPEED')
      .map((v) => `${toLabel(v.name)} ${v.value}ft`)
      .join('\n')
  );

  // Weapons attacks
  let weaponIndex = 0;
  const meleeWeapons = (weapons ?? []).filter((w) => !isItemRangedWeapon(w.item));
  const rangedWeapons = (weapons ?? []).filter((w) => isItemRangedWeapon(w.item));
  for (const weapon of meleeWeapons) {
    try {
      weaponIndex++;
      form.getTextField(`MELEE STRIKE ${weaponIndex}`).setText(weapon.item.name);
      form.getTextField(`MELEE STRIKE ${weaponIndex} ATTACK BONUS`).setText(sign(weapon.stats.attack_bonus.total[0]));
      form.getTextField(`MELEE STRIKE ${weaponIndex} STRENGTH`).setText(sign(strValue.value));
      form
        .getTextField(`MELEE STRIKE ${weaponIndex} DAMAGE`)
        .setText(
          `${weapon.stats.damage.dice}${weapon.stats.damage.die}${weapon.stats.damage.bonus.total > 0 ? ` + ${weapon.stats.damage.bonus.total}` : ``}${' '}${weapon.stats.damage.damageType}`
        );
      const weaponTraits = (weapon.item.traits ?? []).map((v) => {
        return content.traits.find((trait) => trait.id === v);
      });
      form
        .getTextField(`MELEE STRIKE ${weaponIndex} TRAITS AND NOTES`)
        .setText(weaponTraits.map((v) => v?.name).join(', '));
    } catch (e) {
      console.warn(e);
    }
  }
  for (const weapon of rangedWeapons) {
    try {
      weaponIndex++;
      form.getTextField(`RANGED STRIKE ${weaponIndex}`).setText(weapon.item.name);
      form.getTextField(`RANGED STRIKE ${weaponIndex} ATTACK BONUS`).setText(sign(weapon.stats.attack_bonus.total[0]));
      form.getTextField(`RANGED STRIKE ${weaponIndex} DEXTERITY`).setText(sign(dexValue.value));
      form
        .getTextField(`RANGED STRIKE ${weaponIndex} DAMAGE`)
        .setText(
          `${weapon.stats.damage.dice}${weapon.stats.damage.die}${weapon.stats.damage.bonus.total > 0 ? ` + ${weapon.stats.damage.bonus.total}` : ``}${' '}${weapon.stats.damage.damageType}`
        );
      const weaponTraits = (weapon.item.traits ?? []).map((v) => {
        return content.traits.find((trait) => trait.id === v);
      });
      form
        .getTextField(`RANGED STRIKE ${weaponIndex} TRAITS AND NOTES`)
        .setText(
          `${weaponTraits.map((v) => v?.name).join(', ')} | Range: ${weapon.item.meta_data?.range}ft | Reload: ${weapon.item.meta_data?.reload}`
        );
    } catch (e) {
      console.warn(e);
    }
  }

  form.getTextField('CLASS DC').setText(getFinalProfValue(STORE_ID, 'CLASS_DC', true));

  form.getTextField('ANCESTRY & HERITAGE ABILITIES').setText(featData.physicalFeatures.map((f) => f.name).join(', '));
  form.getTextField('ANCESTRY FEAT').setText(featData.ancestryFeats.find((f) => f.level === 1)?.name ?? '');
  form
    .getTextField('BACKGROUND SKILL FEAT')
    .setText(featData.generalAndSkillFeats.find((f) => f.level === 1 && hasTraitType('SKILL', f.traits))?.name ?? '');
  form.getTextField('CLASS FEATS & FEATURES').setText(
    featData.classFeatures
      .filter((f) => f.level === 1)
      .map((f) => f.name)
      .join('\n')
  );

  const featFillIn = (options: AbilityBlock[], prefixId: string) => {
    options.forEach((option, index) => {
      try {
        form.getTextField(`${prefixId}-${index + 1}`).setText(option.name);
      } catch (e) {
        console.warn(e);
      }
    });
  };

  for (let i = 1; i <= 20; i++) {
    featFillIn(
      featData.generalAndSkillFeats.filter((ab) => ab.level === i),
      'SKILL FEAT ' + i
    );
  }
  for (let i = 1; i <= 20; i++) {
    featFillIn(
      featData.classFeats.filter((ab) => ab.level === i),
      'CLASS FEAT ' + (i - 1)
    );
    featFillIn(
      featData.classFeatures.filter((ab) => ab.level === i),
      'CLASS FEAT ' + (i - 1)
    );
  }

  if (character.inventory) {
    form.getTextField('BULK TOTAL').setText(labelizeBulk(getInvBulk(character.inventory), true));

    form.getTextField('COPPER').setText(character.inventory.coins.cp + '');
    form.getTextField('SILVER').setText(character.inventory.coins.sp + '');
    form.getTextField('GOLD').setText(character.inventory.coins.gp + '');
    form.getTextField('PLATINUM').setText(character.inventory.coins.pp + '');
  }

  let heldIndex = 0;
  let consumableIndex = 0;
  let wornIndex = 0;
  for (const invItem of items) {
    try {
      if (hasTraitType('CONSUMABLE', invItem.item.traits)) {
        consumableIndex++;
        form
          .getTextField(`CONSUMABLES ${consumableIndex}`)
          .setText(`${invItem.item.name} x${invItem.item.meta_data?.quantity ?? 1}`);
        form.getTextField(`CONSUMABLES BULK ${consumableIndex}`).setText(labelizeBulk(invItem.item.bulk, false));
      } else if ((invItem.is_equipped && !isItemWeapon(invItem.item)) || invItem.is_invested) {
        wornIndex++;
        form.getTextField(`WORN ${wornIndex}`).setText(invItem.item.name);
        form.getTextField(`INVESTED ${wornIndex}`).setText(invItem.is_invested ? 'Yes' : '');
        form.getTextField(`WORN BULK ${wornIndex}`).setText(labelizeBulk(invItem.item.bulk, false));
      } else {
        heldIndex++;
        if (heldIndex === 1) {
          form.getTextField(`HELD1`).setText(invItem.item.name);
        } else {
          form.getTextField(`HELD ${heldIndex}`).setText(invItem.item.name);
        }
        form.getTextField(`HELD BULK ${heldIndex}`).setText(labelizeBulk(invItem.item.bulk, false));
      }
    } catch (e) {
      console.warn(e);
    }
  }

  form.getTextField('ETHNICITY').setText(character.details?.info?.ethnicity);
  form.getTextField('NATIONALITY').setText(character.details?.info?.nationality);
  form.getTextField('BIRTHPLACE').setText(character.details?.info?.birthplace);
  form.getTextField('AGE').setText(character.details?.info?.age);
  form
    .getTextField('GENDER & PRONOUNS')
    .setText(`${character.details?.info?.gender ?? ''}, ${character.details?.info?.pronouns ?? ''}`);
  form.getTextField('HEIGHT').setText(character.details?.info?.height);
  form.getTextField('WEIGHT').setText(character.details?.info?.weight);
  form.getTextField('Appearance').setText(character.details?.info?.appearance);
  form.getTextField('Attitude').setText('');
  form.getTextField('Deity or Philosophy').setText(character.details?.info?.beliefs);
  form.getTextField('Edicts').setText('');
  form.getTextField('Anathema').setText('');
  form.getTextField('Likes').setText('');
  form.getTextField('Dislikes').setText('');
  form.getTextField('Catchphrases').setText('');

  form.getTextField('Notes').setText(`See Wanderer's Guide for note pages.`);
  form.getTextField('Allies').setText('');
  form.getTextField('Enemies').setText('');
  form.getTextField('Organizations').setText(character.details?.info?.organized_play_id);

  const actionFillIn = (action: AbilityBlock, index: number) => {
    const CHUNK_SIZE = 10;
    function chunkString(str: string, chunkSize: number) {
      const wordArray = split(str, /\s+/);
      const chunks = chunk(wordArray, chunkSize);
      return chunks.map((chunk) => chunk.join(' '));
    }

    if (action.actions === 'REACTION' || action.actions === 'FREE-ACTION') {
      try {
        form.getTextField(`REACTION NAME ${index}`).setText(action.name);

        if (index === 1) {
          if (action.actions === 'REACTION') {
            form.getCheckBox(`reactio`).check();
          } else {
            form.getCheckBox(`freeac`).check();
          }
        } else {
          if (action.actions === 'REACTION') {
            form.getCheckBox(`reactio_${index}`).check();
          } else {
            form.getCheckBox(`freeac_${index}`).check();
          }
        }

        const actionTraits = (action.traits ?? []).map((v) => {
          return content.traits.find((trait) => trait.id === v);
        });
        try {
          form.getTextField(`REACTIONS TRAITS ${index}`).setText(actionTraits.map((a) => a?.name ?? '').join(', '));
        } catch (e) {
          console.warn(e);
        }

        const triggerChunks = chunkString(compileText(action.trigger ?? ''), CHUNK_SIZE);
        for (let i = 0; i < triggerChunks.length; i++) {
          try {
            form.getTextField(`REACTIONS TRIGGER ${index}-${i + 1}`).setText(triggerChunks[i]);
          } catch (e) {
            console.warn(e);
          }
        }

        form.getTextField(`REACTIONS EFFECTS ${index}-1`).setText(compileText(action.description));
      } catch (e) {
        console.warn(e);
      }
    } else {
      try {
        form.getTextField(`ACTION NAME ${index}`).setText(action.name);
        form.getTextField(`ACTIONS COUNT ${index}`).setText(actionCostToLabel(action.actions, true));
        const actionTraits = (action.traits ?? []).map((v) => {
          return content.traits.find((trait) => trait.id === v);
        });
        form.getTextField(`TRAIT(S)${index}`).setText(actionTraits.map((a) => a?.name ?? '').join(', '));

        form.getTextField(`EFFECTS ${index}-1`).setText(compileText(action.description));
      } catch (e) {
        console.warn(e);
      }
    }
  };

  const featsWithActions = flattenDeep(Object.values(featData)).filter((ab) => ab.actions !== null);
  const reactionFeats = featsWithActions.filter((a) => a.actions === 'REACTION' || a.actions === 'FREE-ACTION');
  const nonReactionFeats = featsWithActions.filter((a) => a.actions !== 'REACTION' && a.actions !== 'FREE-ACTION');
  for (let i = 0; i < reactionFeats.length; i++) {
    actionFillIn(reactionFeats[i], i + 1);
  }
  for (let i = 0; i < nonReactionFeats.length; i++) {
    actionFillIn(nonReactionFeats[i], i + 1);
  }

  // Spellcasting

  const firstSource = spellData.sources.length > 0 ? spellData.sources[0] : undefined;
  if (firstSource) {
    if (firstSource.type.startsWith('SPONTANEOUS-')) {
      form.getRadioGroup('Magical Tradition').select('Spontaneous Caster');
    } else {
      form.getRadioGroup('Magical Tradition').select('Prepared Caster');
    }

    const spellStats = getSpellStats(STORE_ID, null, firstSource.tradition, firstSource.attribute);

    //
    profFillIn('SPELL_ATTACK', 'SPELL ATTACK');
    profFillIn('SPELL_DC', 'SPELL SAVE DC');
    form.getTextField(`SPELL ATTACK`).setText(sign(spellStats.spell_attack.total[0]));
    form.getTextField(`SPELL SAVE DC`).setText(`${spellStats.spell_dc.total}`);

    try {
      form.getCheckBox(firstSource.tradition).check();
    } catch (e) {
      console.warn(e);
    }
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
  form.getTextField('CANTRIPS RANK').setText(cantripRank + '');
  form.getTextField('FOCUS SPELL RANK').setText(cantripRank + '');

  const cantrips = spells.filter((s) => isCantrip(s) && !isRitual(s));
  const nonCantrips = spells.filter((s) => !isCantrip(s) && !isRitual(s));
  const ritualSpells = spells.filter((s) => isRitual(s));

  form.getTextField('CANTRIPS PER DAY').setText(cantrips.length + '');

  const findSlotForSpell = (spell: Spell) => {
    return spellData.slots.find((s) => s.spell_id === spell.id && s.rank === spell.rank);
  };

  for (let i = 0; i < cantrips.length; i++) {
    try {
      const spell = cantrips[i];
      form.getTextField(`CANTRIP NAME ${i + 1}`).setText(spell.name);
      form.getTextField(`CANTRIP ${i + 1} ACTIONS`).setText(actionCostToLabel(spell.cast, true));
      if (findSlotForSpell(spell)) {
        form.getCheckBox(`CANTRIP ${i + 1} PREPARED`).check();
      }
    } catch (e) {
      console.warn(e);
    }
  }

  for (let i = 0; i < nonCantrips.length; i++) {
    try {
      const spell = nonCantrips[i];
      form.getTextField(`SPELL ${i + 1}`).setText(spell.name);
      form.getTextField(`SPELL ACTION ${i + 1}`).setText(actionCostToLabel(spell.cast, true));
      form.getTextField(`SPELL RANK ${i + 1}`).setText(rankNumber(spell.rank));
      if (findSlotForSpell(spell)) {
        form.getCheckBox(`SPELL PREPARED ${i + 1}`).check();
      }
    } catch (e) {
      console.warn(e);
    }
  }

  const focusPoints = getFocusPoints(STORE_ID, character, spellData.focus);
  if (focusPoints.current > 0) {
    form.getCheckBox('FP1').check();
  }
  if (focusPoints.current > 1) {
    form.getCheckBox('FP2').check();
  }
  if (focusPoints.current > 2) {
    form.getCheckBox('FP 3').check();
  }

  for (let i = 0; i < focusSpells.length; i++) {
    try {
      const spell = focusSpells[i];
      form.getTextField(`FOCUS SPELL ${i + 1}`).setText(spell.name);
      form.getTextField(`FOCUS SPELL ACTIONS ${i + 1}`).setText(actionCostToLabel(spell.cast, true));
    } catch (e) {
      console.warn(e);
    }
  }

  for (let i = 0; i < innateSpells.length; i++) {
    try {
      const record = innateSpells[i];
      if (record) {
        form.getTextField(`INNATE SPELL ${i + 1}`).setText(record.spell.name);
        form.getTextField(`INNATE SPELL ACTION ${i + 1}`).setText(actionCostToLabel(record.spell.cast, true));
        form.getTextField(`INNATE FREQ ${i + 1}`).setText(`${record.casts_current}/${record.casts_max}`);
      }
    } catch (e) {
      console.warn(e);
    }
  }

  for (let i = 0; i < ritualSpells.length; i++) {
    try {
      const spell = ritualSpells[i];
      form.getTextField(`RITUAL SPELL ${i + 1}`).setText(spell.name);
      form.getTextField(`RITUAL RANK ${i + 1}`).setText(rankNumber(spell.rank));
      form.getTextField(`RITUAL COST ${i + 1}`).setText(spell.cost);
    } catch (e) {
      console.warn(e);
    }
  }

  // Slots
  const slotData = groupBy(spellData.slots, 'rank');
  for (const rank in Object.keys(slotData)) {
    const slots = slotData[rank];
    try {
      form.getTextField(`SPELLS PER DAY ${rank}`).setText(`${slots.length}`);
      form.getTextField(`SPELLS REMAINING ${rank}`).setText(`${slots.filter((s) => s.exhausted !== true).length}`);
    } catch (e) {
      console.warn(e);
    }
  }

  console.log('Complete 🎉');
}
