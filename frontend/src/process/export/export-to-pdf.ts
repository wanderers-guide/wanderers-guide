import { defineDefaultSources, fetchContentPackage } from '@content/content-store';
import { getBestArmor } from '@items/inv-utils';
import { executeCharacterOperations } from '@operations/operation-controller';
import { Character } from '@typing/content';
import { VariableAttr, VariableNum, VariableProf, VariableStr } from '@typing/variables';
import { getFinalAcValue, getFinalHealthValue, getFinalProfValue } from '@variables/variable-display';
import { getAllAttributeVariables, getAllSkillVariables, getVariable } from '@variables/variable-manager';
import { isProficiencyTypeGreaterOrEqual, maxProficiencyType, variableNameToLabel } from '@variables/variable-utils';
import { PDFDocument, PDFForm, StandardFonts, rgb } from 'pdf-lib';

const VERSION = 1;

export default async function exportToPDF(character: Character) {
  if (VERSION === 1) {
    return await pdfV1(character);
  }
}

async function pdfV1(character: Character) {
  // Load your PDF
  const url = '/src/assets/files/character-sheet.pdf';
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
  // Temp
  form.getFields().forEach((field) => {
    console.log(`${field.getName()}`);
  });
  //

  // Get all content that the character uses
  defineDefaultSources(character.content_sources?.enabled ?? []);
  const content = await fetchContentPackage(undefined, true);
  const STORE_ID = 'CHARACTER';

  // Execute all operations (to update the variables)
  await executeCharacterOperations(character, content, 'CHARACTER-BUILDER');

  // Fill the fields
  form.getTextField('Character Name').setText(character.name);
  form.getTextField('Ancestry').setText(character.details?.ancestry?.name);
  form.getTextField('Background').setText(character.details?.background?.name);
  form.getTextField('Class').setText(character.details?.class?.name);
  form.getTextField('Heritage and Traits').setText('TODO');
  form.getTextField('Size').setText(getVariable<VariableStr>(STORE_ID, 'SIZE')?.value);
  form.getTextField('Background Notes').setText('TODO');
  form.getTextField('Class Notes').setText('TODO');
  form.getTextField('Temporary HP').setText(character.hp_temp + '');
  form.getTextField('Current HP').setText(character.hp_current + '');

  form.getCheckBox('B').check();
  form.getCheckBox('P').check();
  form.getCheckBox('S').check();
  form.getCheckBox('B_2').check();
  form.getCheckBox('P_2').check();
  form.getCheckBox('S_2').check();
  form.getCheckBox('B_3').check();
  form.getCheckBox('P_3').check();
  form.getCheckBox('S_3').check();
  form.getCheckBox('B_4').check();
  form.getCheckBox('P_4').check();
  form.getCheckBox('S_4').check();
  form.getCheckBox('B_5').check();
  form.getCheckBox('P_5').check();
  form.getCheckBox('S_5').check();

  // Set partial (since it's a radio group, only one can be selected)
  let firstPartialIndex = -1;
  for (let i = 0; i < getAllAttributeVariables(STORE_ID).length; i++) {
    const attr = getAllAttributeVariables(STORE_ID)[i];
    if (attr.value.partial) {
      firstPartialIndex = i;
      break;
    }
  }
  if (firstPartialIndex > -1) {
    form.getRadioGroup('Strength').select(form.getRadioGroup('Strength').getOptions()[firstPartialIndex]);
  }

  form.getTextField('AC').setText(getFinalAcValue(STORE_ID, getBestArmor(STORE_ID, character.inventory)?.item) + '');
  form.getTextField('SHIELD').setText('TODO');
  form.getTextField('Hardness Max HP').setText('TODO');
  form.getTextField('HP').setText('TODO');
  form.getTextField('MAX HP').setText('TODO'); // getFinalHealthValue()

  const profFillIn = (variableName: string, sheetId: string, profSheetId?: string) => {
    const variable = getVariable<VariableProf>(STORE_ID, variableName);
    if (variable?.value.attribute) {
      form.getTextField(sheetId).setText(getFinalProfValue(STORE_ID, variable?.name ?? ''));
    }
    if (isProficiencyTypeGreaterOrEqual(variable?.value.value ?? 'U', 'T')) {
      form.getCheckBox((profSheetId ?? sheetId) + ' TRAINED').check();
    }
    if (isProficiencyTypeGreaterOrEqual(variable?.value.value ?? 'U', 'E')) {
      form.getCheckBox((profSheetId ?? sheetId) + ' EXPERT').check();
    }
    if (isProficiencyTypeGreaterOrEqual(variable?.value.value ?? 'U', 'M')) {
      form.getCheckBox((profSheetId ?? sheetId) + ' MASTER').check();
    }
    if (isProficiencyTypeGreaterOrEqual(variable?.value.value ?? 'U', 'L')) {
      form.getCheckBox((profSheetId ?? sheetId) + ' LEGENDARY').check();
    }
  };

  profFillIn('LIGHT_ARMOR', 'LIGHT');
  profFillIn('MEDIUM_ARMOR', 'MEDIUM');
  profFillIn('HEAVY_ARMOR', 'HEAVY');
  profFillIn('UNARMORED_DEFENSE', 'UNARMORED');

  profFillIn('SAVE_FORT', 'FORTITUDE');
  profFillIn('SAVE_REFLEX', 'REFLEX');
  profFillIn('SAVE_WILL', 'WILL');

  profFillIn('SKILL_ACROBATICS', 'ACROBATICS');
  profFillIn('SKILL_ARCANA', 'ARCANA');
  profFillIn('SKILL_ATHLETICS', 'ATHLETICS', 'ATHELETICS'); // field misspelled
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
    form.getTextField('LORE CATAGORY 1').setText(variableNameToLabel(lore1).replace(' Lore', ''));
  }
  if (lore2 !== '') {
    profFillIn(lore2, 'LORE2');
    form.getTextField('LORE CATAGORY 2').setText(variableNameToLabel(lore2).replace(' Lore', ''));
  }

  // For save calcs
  form.getTextField('DEXTERITY').setText(getVariable<VariableAttr>(STORE_ID, 'ATTRIBUTE_DEX')?.value.value + '');
  form.getTextField('CONSTITUTION').setText(getVariable<VariableAttr>(STORE_ID, 'ATTRIBUTE_CON')?.value.value + '');
  form.getTextField('WISDOM').setText(getVariable<VariableAttr>(STORE_ID, 'ATTRIBUTE_WIS')?.value.value + '');

  // Dying & Wounded
  // form.getRadioGroup('DYING 1')
  // form.getRadioGroup('DYING 2').check();
  // form.getRadioGroup('DYING 3').check();
  // form.getRadioGroup('DYING 4').check();

  form.getTextField('WOUNDED').setText('TODO');

  //
  form.getTextField('RESISTANCE AND IMMUNITIES').setText('TODO');
  form.getTextField('CONDITIONS').setText('TODO');

  form.getTextField('Bulk').setText('TODO');
  form.getTextField('Attitude').setText('TODO');
  form.getTextField('Deity or Philosophy').setText('TODO');
  form.getTextField('Edicts').setText('TODO');
  form.getTextField('Anathema').setText('TODO');
  form.getTextField('Likes').setText('TODO');
  form.getTextField('Dislikes').setText('TODO');
  form.getTextField('Catchphrases').setText('TODO');
  form.getTextField('Notes').setText('TODO');
  form.getTextField('Allies').setText('TODO');
  form.getTextField('Enemies').setText('TODO');
  form.getTextField('Organizations').setText('TODO');

  form.getCheckBox('freeac').check();
  form.getCheckBox('reactio').check();
  form.getCheckBox('freeac_2').check();
  form.getCheckBox('reactio_2').check();
  form.getCheckBox('freeac_3').check();
  form.getCheckBox('reactio_3').check();
  form.getCheckBox('freeac_4').check();
  form.getCheckBox('reactio_4').check();

  console.log(form.getRadioGroup('Magical Tradition').getOptions());
}
