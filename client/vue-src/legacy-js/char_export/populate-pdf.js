/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/
let socket = io();

const { PDFDocument } = PDFLib;

export function setup() {
  socket.on("returnCharExportPDFInfo", function (charInfo, extraData) {
    try {
      charExportGeneratePDF(charInfo, extraData);
    } catch (err) {
      console.error("Failed to generate character PDF:");
      console.error(err);
    }
  });
}

export function getMod(abilScore) {
  let mod = Math.floor((abilScore - 10) / 2);
  return mod;
}

export function getNumZeroIfNull(number) {
  return number != null ? number : 0;
}

export function initCharacterExportToPDF(activeModalCharID) {
  startSpinnerSubLoader();
  socket.emit("requestCharExportPDFInfo", activeModalCharID);
}

let g_featMap = null;

// HARDCODED Names of final profs and PDF fields

// Field names: https://www.pdfescape.com

async function charExportGeneratePDF(charInfo, extraData) {
  g_featMap = objToMap(extraData.featsObject);

  const formUrl = "/pdf/character_sheet.pdf";
  const formPdfBytes = await fetch(formUrl).then((res) => res.arrayBuffer());

  const pdfDoc = await PDFDocument.load(formPdfBytes);

  const form = pdfDoc.getForm();

  const profMap = objToMap(charInfo.profs);

  const nameField = form.getTextField("Character Name");
  const playerNameField = form.getTextField("Player Name");
  const xpField = form.getTextField("Experience Points XP");
  const ancestryHeritageField = form.getTextField("Ancestry and Heritage");
  const backgroundField = form.getTextField("Background");
  const classField = form.getTextField("Class");
  const sizeField = form.getTextField("Size");
  const alignmentField = form.getTextField("Alignment");
  const traitsField = form.getTextField("Traits");
  const deityField = form.getTextField("Deity");
  const levelField = form.getTextField("Level");
  const heroPointsField = form.getTextField("Text2");

  const strModField = form.getTextField("Text4");
  const dexModField = form.getTextField("Text5");
  const conModField = form.getTextField("Text6");
  const intModField = form.getTextField("Text7");
  const wisModField = form.getTextField("Text8");
  const chaModField = form.getTextField("Text9");

  const strScoreField = form.getTextField("STRENGTH");
  const dexScoreField = form.getTextField("DEXTERITY");
  const conScoreField = form.getTextField("CONSTITUTION");
  const intScoreField = form.getTextField("INTELLIGENCE");
  const wisScoreField = form.getTextField("WISDOM");
  const chaScoreField = form.getTextField("CHARISMA");

  let strMod = 0;
  let dexMod = 0;
  let conMod = 0;
  let intMod = 0;
  let wisMod = 0;
  let chaMod = 0;

  let totalAbilityScores = JSON.parse(charInfo.stats.totalAbilityScores);
  for (let abilityScore of totalAbilityScores) {
    switch (abilityScore.Name) {
      case "Strength":
        strMod = getMod(abilityScore.Score);
        strScoreField.setText(abilityScore.Score + "");
        strModField.setText(signNumber(strMod) + "");
        break;
      case "Dexterity":
        dexMod = getMod(abilityScore.Score);
        dexScoreField.setText(abilityScore.Score + "");
        dexModField.setText(signNumber(dexMod) + "");
        break;
      case "Constitution":
        conMod = getMod(abilityScore.Score);
        conScoreField.setText(abilityScore.Score + "");
        conModField.setText(signNumber(conMod) + "");
        break;
      case "Intelligence":
        intMod = getMod(abilityScore.Score);
        intScoreField.setText(abilityScore.Score + "");
        intModField.setText(signNumber(intMod) + "");
        break;
      case "Wisdom":
        wisMod = getMod(abilityScore.Score);
        wisScoreField.setText(abilityScore.Score + "");
        wisModField.setText(signNumber(wisMod) + "");
        break;
      case "Charisma":
        chaMod = getMod(abilityScore.Score);
        chaScoreField.setText(abilityScore.Score + "");
        chaModField.setText(signNumber(chaMod) + "");
        break;
      default:
        break;
    }
  }

  const totalSpeedField = form.getTextField("Text18");
  const otherSpeedsField = form.getTextField("MOVEMENT TYPES NOTES");

  const totalClassDCField = form.getTextField("Text10");

  // //
  const totalACField = form.getTextField("Text3");

  const acDexModField = form.getTextField("Text12");
  const acCapField = form.getTextField("Text13");
  const acProfBonusField = form.getTextField("PROF");
  const acProfTrainedField = form.getCheckBox("Check Box4");
  const acProfExpertField = form.getCheckBox("Check Box5");
  const acProfMasterField = form.getCheckBox("Check Box6");
  const acProfLegendaryField = form.getCheckBox("Check Box7");
  const acItemBonusField = form.getTextField("ITEM");

  const unarmoredTBox = form.getCheckBox("Check Box28");
  const unarmoredEBox = form.getCheckBox("Check Box29");
  const unarmoredMBox = form.getCheckBox("Check Box30");
  const unarmoredLBox = form.getCheckBox("Check Box31");
  setProfCheckBox(
    profMap.get("Unarmored_Defense"),
    unarmoredTBox,
    unarmoredEBox,
    unarmoredMBox,
    unarmoredLBox,
  );

  const lightArmorTBox = form.getCheckBox("Check Box32");
  const lightArmorEBox = form.getCheckBox("Check Box33");
  const lightArmorMBox = form.getCheckBox("Check Box34");
  const lightArmorLBox = form.getCheckBox("Check Box35");
  setProfCheckBox(
    profMap.get("Light_Armor"),
    lightArmorTBox,
    lightArmorEBox,
    lightArmorMBox,
    lightArmorLBox,
  );

  const mediumArmorTBox = form.getCheckBox("Check Box36");
  const mediumArmorEBox = form.getCheckBox("Check Box37");
  const mediumArmorMBox = form.getCheckBox("Check Box38");
  const mediumArmorLBox = form.getCheckBox("Check Box39");
  setProfCheckBox(
    profMap.get("Medium_Armor"),
    mediumArmorTBox,
    mediumArmorEBox,
    mediumArmorMBox,
    mediumArmorLBox,
  );

  const heavyArmorTBox = form.getCheckBox("Check Box40");
  const heavyArmorEBox = form.getCheckBox("Check Box41");
  const heavyArmorMBox = form.getCheckBox("Check Box42");
  const heavyArmorLBox = form.getCheckBox("Check Box43");
  setProfCheckBox(
    profMap.get("Heavy_Armor"),
    heavyArmorTBox,
    heavyArmorEBox,
    heavyArmorMBox,
    heavyArmorLBox,
  );

  const shieldACBonusField = form.getTextField("Text16");
  const shieldHardnessField = form.getTextField("HARDNESS");
  const shieldHealthAndBTField = form.getTextField("BT");
  const shieldCurrentHPField = form.getTextField("CURRENT HP");

  // //
  const maxHPField = form.getTextField("Text1");
  const currentHPField = form.getTextField("CURRENT MAX");
  const tempHPField = form.getTextField("TEMPORARY");

  const dyingField = form.getTextField("DYING");
  const woundedField = form.getTextField("WOUNDED");

  const resistancesField = form.getTextField("RESISTANCES AND IMMUNITIES");

  const conditionsField = form.getTextField("CONDITIONS");

  const totalPerceptionField = form.getTextField("Text17");
  totalPerceptionField.setText(signNumber(charInfo.stats.totalPerception));

  const perceptionWisModField = form.getTextField("WIS_2");
  const perceptionProfBonusField = form.getTextField("PROF_5");
  const perceptionItemBonusField = form.getTextField("ITEM_5");

  const percepTBox = form.getCheckBox("Check Box24");
  const percepEBox = form.getCheckBox("Check Box25");
  const percepMBox = form.getCheckBox("Check Box26");
  const percepLBox = form.getCheckBox("Check Box27");
  setProfCheckBox(
    profMap.get("Perception"),
    percepTBox,
    percepEBox,
    percepMBox,
    percepLBox,
  );

  const sensesField = form.getTextField("SENSES");
  let sensesText = "";
  for (let sense of charInfo.build.senses) {
    sensesText += sense.value.name + ", ";
  }
  sensesText = sensesText.slice(0, -2); // Trim off that last ', '
  sensesField.setText(sensesText);

  // Saves

  let totalSaves = JSON.parse(charInfo.stats.totalSaves);

  const totalFortField = form.getTextField("Text11");
  totalFortField.setText(signNumber(totalSaves[0].Bonus) + "");

  const fortConModField = form.getTextField("CON");
  const fortProfBonusField = form.getTextField("PROF_2");
  const fortItemBonusField = form.getTextField("ITEM_2");

  const fortTBox = form.getCheckBox("Check Box8");
  const fortEBox = form.getCheckBox("Check Box9");
  const fortMBox = form.getCheckBox("Check Box10");
  const fortLBox = form.getCheckBox("Check Box11");
  setProfCheckBox(
    profMap.get("Fortitude"),
    fortTBox,
    fortEBox,
    fortMBox,
    fortLBox,
  );

  const totalReflexField = form.getTextField("Text14");
  totalReflexField.setText(signNumber(totalSaves[1].Bonus) + "");

  const reflexDexModField = form.getTextField("DEX");
  const reflexProfBonusField = form.getTextField("PROF_3");
  const reflexItemBonusField = form.getTextField("ITEM_3");

  const reflexTBox = form.getCheckBox("Check Box12");
  const reflexEBox = form.getCheckBox("Check Box13");
  const reflexMBox = form.getCheckBox("Check Box14");
  const reflexLBox = form.getCheckBox("Check Box15");
  setProfCheckBox(
    profMap.get("Reflex"),
    reflexTBox,
    reflexEBox,
    reflexMBox,
    reflexLBox,
  );

  const totalWillField = form.getTextField("Text15");
  totalWillField.setText(signNumber(totalSaves[1].Bonus) + "");

  const willWisModField = form.getTextField("WIS");
  const willProfBonusField = form.getTextField("PROF_4");
  const willItemBonusField = form.getTextField("ITEM_4");

  const willTBox = form.getCheckBox("Check Box16");
  const willEBox = form.getCheckBox("Check Box17");
  const willMBox = form.getCheckBox("Check Box18");
  const willLBox = form.getCheckBox("Check Box19");
  setProfCheckBox(profMap.get("Will"), willTBox, willEBox, willMBox, willLBox);

  // Melee
  const weap1NameField = form.getTextField("Weapon");
  const weap1HitBonusField = form.getTextField("Text37");
  const weap1DmgDiceField = form.getTextField("DICE");
  const weap1TraitsField = form.getTextField("TRAITS");
  const weap1StrField = form.getTextField("STR_2");

  const weap2NameField = form.getTextField("Weapon_2");
  const weap2HitBonusField = form.getTextField("Text38");
  const weap2DmgDiceField = form.getTextField("DICE_2");
  const weap2TraitsField = form.getTextField("TRAITS_2");
  const weap2StrField = form.getTextField("STR_5");

  const weap3NameField = form.getTextField("Weapon_3");
  const weap3HitBonusField = form.getTextField("Text39");
  const weap3DmgDiceField = form.getTextField("DICE_3");
  const weap3TraitsField = form.getTextField("TRAITS_3");
  const weap3StrField = form.getTextField("STR_7");

  // Ranged
  const weap4NameField = form.getTextField("Weapon_4");
  const weap4HitBonusField = form.getTextField("Text40");
  const weap4DmgDiceField = form.getTextField("DICE_4");
  const weap4TraitsField = form.getTextField("TRAITS_4");
  const weap4SpeField = form.getTextField("undefined");

  const weap5NameField = form.getTextField("Weapon_5");
  const weap5HitBonusField = form.getTextField("Text41");
  const weap5DmgDiceField = form.getTextField("DICE_5");
  const weap5TraitsField = form.getTextField("TRAITS_5");
  const weap5SpeField = form.getTextField("undefined_2");

  const weap6NameField = form.getTextField("Weapon_6");
  const weap6HitBonusField = form.getTextField("Text42");
  const weap6DmgDiceField = form.getTextField("DICE_6");
  const weap6TraitsField = form.getTextField("TRAITS_6");
  const weap6SpeField = form.getTextField("undefined_3");

  let weapons = JSON.parse(charInfo.stats.weapons);
  if (weapons.length >= 1) {
    weap1NameField.setText(weapons[0].Name);
    weap1HitBonusField.setText(weapons[0].Bonus);
    weap1DmgDiceField.setText(weapons[0].Damage);
  }
  if (weapons.length >= 2) {
    weap2NameField.setText(weapons[1].Name);
    weap2HitBonusField.setText(weapons[1].Bonus);
    weap2DmgDiceField.setText(weapons[1].Damage);
  }
  if (weapons.length >= 3) {
    weap3NameField.setText(weapons[2].Name);
    weap3HitBonusField.setText(weapons[2].Bonus);
    weap3DmgDiceField.setText(weapons[2].Damage);
  }
  if (weapons.length >= 4) {
    weap4NameField.setText(weapons[3].Name);
    weap4HitBonusField.setText(weapons[3].Bonus);
    weap4DmgDiceField.setText(weapons[3].Damage);
  }
  if (weapons.length >= 5) {
    weap5NameField.setText(weapons[4].Name);
    weap5HitBonusField.setText(weapons[4].Bonus);
    weap5DmgDiceField.setText(weapons[4].Damage);
  }
  if (weapons.length >= 6) {
    weap6NameField.setText(weapons[5].Name);
    weap6HitBonusField.setText(weapons[5].Bonus);
    weap6DmgDiceField.setText(weapons[5].Damage);
  }

  // Skills

  let totalSkills = JSON.parse(charInfo.stats.totalSkills);

  const acroBonusField = form.getTextField("Text19");
  acroBonusField.setText(signNumber(totalSkills[0].Bonus) + "");

  const arcanaBonusField = form.getTextField("Text20");
  arcanaBonusField.setText(signNumber(totalSkills[1].Bonus) + "");

  const athBonusField = form.getTextField("Text21");
  athBonusField.setText(signNumber(totalSkills[2].Bonus) + "");

  const craftBonusField = form.getTextField("Text22");
  craftBonusField.setText(signNumber(totalSkills[3].Bonus) + "");

  const decepBonusField = form.getTextField("Text23");
  decepBonusField.setText(signNumber(totalSkills[4].Bonus) + "");

  const diploBonusField = form.getTextField("Text24");
  diploBonusField.setText(signNumber(totalSkills[5].Bonus) + "");

  const intimBonusField = form.getTextField("Text25");
  intimBonusField.setText(signNumber(totalSkills[6].Bonus) + "");

  const medicineBonusField = form.getTextField("Text28");
  medicineBonusField.setText(signNumber(totalSkills[7].Bonus) + "");

  const natureBonusField = form.getTextField("Text29");
  natureBonusField.setText(signNumber(totalSkills[8].Bonus) + "");

  const occultBonusField = form.getTextField("Text30");
  occultBonusField.setText(signNumber(totalSkills[9].Bonus) + "");

  const performBonusField = form.getTextField("Text31");
  performBonusField.setText(signNumber(totalSkills[10].Bonus) + "");

  const religionBonusField = form.getTextField("Text32");
  religionBonusField.setText(signNumber(totalSkills[11].Bonus) + "");

  const societyBonusField = form.getTextField("Text33");
  societyBonusField.setText(signNumber(totalSkills[12].Bonus) + "");

  const stealthBonusField = form.getTextField("Text34");
  stealthBonusField.setText(signNumber(totalSkills[13].Bonus) + "");

  const survivalBonusField = form.getTextField("Text35");
  survivalBonusField.setText(signNumber(totalSkills[14].Bonus) + "");

  const thieveryBonusField = form.getTextField("Text36");
  thieveryBonusField.setText(signNumber(totalSkills[15].Bonus) + "");

  const oneLoreNameField = form.getTextField("INTIMIDATION");
  const oneLoreBonusField = form.getTextField("Text26");
  let lore1Data = totalSkills[16];
  if (lore1Data != null) {
    oneLoreNameField.setText(lore1Data.Name.replace(" Lore", ""));
    oneLoreBonusField.setText(signNumber(lore1Data.Bonus) + "");
  }

  const twoLoreNameField = form.getTextField("LORE");
  const twoLoreBonusField = form.getTextField("Text27");
  let lore2Data = totalSkills[17];
  if (lore2Data != null) {
    twoLoreNameField.setText(lore2Data.Name.replace(" Lore", ""));
    twoLoreBonusField.setText(signNumber(lore2Data.Bonus) + "");
  }

  // Weap Prof
  const simpleWeapTBox = form.getCheckBox("Check Box140");
  const simpleWeapEBox = form.getCheckBox("Check Box141");
  const simpleWeapMBox = form.getCheckBox("Check Box142");
  const simpleWeapLBox = form.getCheckBox("Check Box143");
  setProfCheckBox(
    profMap.get("Simple_Weapons"),
    simpleWeapTBox,
    simpleWeapEBox,
    simpleWeapMBox,
    simpleWeapLBox,
  );

  const martialWeapTBox = form.getCheckBox("Check Box144");
  const martialWeapEBox = form.getCheckBox("Check Box145");
  const martialWeapMBox = form.getCheckBox("Check Box146");
  const martialWeapLBox = form.getCheckBox("Check Box147");
  setProfCheckBox(
    profMap.get("Martial_Weapons"),
    martialWeapTBox,
    martialWeapEBox,
    martialWeapMBox,
    martialWeapLBox,
  );

  // Get profs of attacks from metadata
  let otherAttackProfMap = new Map();
  let attackProfValueDatas = [];
  for (let metadata of charInfo.metaData) {
    if (
      metadata.source == "proficiencies" &&
      metadata.value.startsWith("Attack")
    ) {
      if (
        metadata.value.includes("Simple_Weapons") ||
        metadata.value.includes("Martial_Weapons")
      ) {
        continue;
      }
      // HARDCODED metadata separator in Regex
      attackProfValueDatas.push(metadata.value.match(/Attack:::(.+?):::/)[1]);
    }
  }
  for (const [profName, prof] of profMap) {
    if (attackProfValueDatas.includes(profName)) {
      let profOtherAttacks = otherAttackProfMap.get(prof);
      const profNamePretty = profName.replace(/_/g, " ");
      if (profOtherAttacks != null) {
        otherAttackProfMap.set(prof, profOtherAttacks + ", " + profNamePretty);
      } else {
        otherAttackProfMap.set(prof, profNamePretty);
      }
    }
  }

  let count = 0;
  for (const [prof, profNames] of otherAttackProfMap.entries()) {
    if (count == 0) {
      const other1WeapTBox = form.getCheckBox("Check Box148");
      const other1WeapEBox = form.getCheckBox("Check Box149");
      const other1WeapMBox = form.getCheckBox("Check Box150");
      const other1WeapLBox = form.getCheckBox("Check Box151");
      setProfCheckBox(
        prof,
        other1WeapTBox,
        other1WeapEBox,
        other1WeapMBox,
        other1WeapLBox,
      );

      const other1WeapField = form.getTextField("Weapon Proficiencies");
      other1WeapField.setText(profNames);
    }
    if (count == 1) {
      const other2WeapTBox = form.getCheckBox("Check Box152");
      const other2WeapEBox = form.getCheckBox("Check Box153");
      const other2WeapMBox = form.getCheckBox("Check Box154");
      const other2WeapLBox = form.getCheckBox("Check Box155");
      setProfCheckBox(
        prof,
        other2WeapTBox,
        other2WeapEBox,
        other2WeapMBox,
        other2WeapLBox,
      );

      const other2WeapField = form.getTextField("L");
      other2WeapField.setText(profNames);
    }
    count++;
  }

  // Langs
  const languagesField = form.getTextField("Languages");
  let langNameStr = "";
  for (let language of charInfo.build.languages) {
    if (language.value != null) {
      langNameStr += language.value.name + ", ";
    }
  }
  langNameStr = langNameStr.slice(0, -2); // Trim off that last ', '
  languagesField.setText(langNameStr);

  /// Feats and Features ///

  // Ancestry Feats
  const ancestryFeatSpecialField = form.getTextField("Text43");

  const ancestryFeatHeritageField = form.getTextField("Text88");
  ancestryFeatHeritageField.setText(
    findFeatName(charInfo.build.feats, "ancestry", 1, "heritage"),
  );

  const ancestryFeat1Field = form.getTextField("Text89");
  ancestryFeat1Field.setText(findFeatName(charInfo.build.feats, "ancestry", 1));

  const ancestryFeat5Field = form.getTextField("Text90");
  ancestryFeat5Field.setText(findFeatName(charInfo.build.feats, "ancestry", 5));

  const ancestryFeat9Field = form.getTextField("Text91");
  ancestryFeat9Field.setText(findFeatName(charInfo.build.feats, "ancestry", 9));

  const ancestryFeat13Field = form.getTextField("Text92");
  ancestryFeat13Field.setText(
    findFeatName(charInfo.build.feats, "ancestry", 13),
  );

  const ancestryFeat17Field = form.getTextField("Text93");
  ancestryFeat17Field.setText(
    findFeatName(charInfo.build.feats, "ancestry", 17),
  );

  // Skill Feats
  const skillFeatBackgroundField = form.getTextField("Text50");
  skillFeatBackgroundField.setText(
    findFeatName(charInfo.build.feats, "background", 1),
  );

  const skillFeat2Field = form.getTextField("Text51");
  skillFeat2Field.setText(
    findFeatNameWithTrait(charInfo.build.feats, "skill", "class", 2),
  );

  const skillFeat4Field = form.getTextField("Text52");
  skillFeat4Field.setText(
    findFeatNameWithTrait(charInfo.build.feats, "skill", "class", 4),
  );

  const skillFeat6Field = form.getTextField("Text53");
  skillFeat6Field.setText(
    findFeatNameWithTrait(charInfo.build.feats, "skill", "class", 6),
  );

  const skillFeat8Field = form.getTextField("Text54");
  skillFeat8Field.setText(
    findFeatNameWithTrait(charInfo.build.feats, "skill", "class", 8),
  );

  const skillFeat10Field = form.getTextField("Text55");
  skillFeat10Field.setText(
    findFeatNameWithTrait(charInfo.build.feats, "skill", "class", 10),
  );

  const skillFeat12Field = form.getTextField("Text56");
  skillFeat12Field.setText(
    findFeatNameWithTrait(charInfo.build.feats, "skill", "class", 12),
  );

  const skillFeat14Field = form.getTextField("Text57");
  skillFeat14Field.setText(
    findFeatNameWithTrait(charInfo.build.feats, "skill", "class", 14),
  );

  const skillFeat16Field = form.getTextField("Text58");
  skillFeat16Field.setText(
    findFeatNameWithTrait(charInfo.build.feats, "skill", "class", 16),
  );

  const skillFeat18Field = form.getTextField("Text59");
  skillFeat18Field.setText(
    findFeatNameWithTrait(charInfo.build.feats, "skill", "class", 18),
  );

  const skillFeat20Field = form.getTextField("Text60");
  skillFeat20Field.setText(
    findFeatNameWithTrait(charInfo.build.feats, "skill", "class", 20),
  );

  // General Feats

  const generalFeat3Field = form.getTextField("Text61");
  generalFeat3Field.setText(
    findFeatNameWithTrait(charInfo.build.feats, "general", "class", 3),
  );

  const generalFeat7Field = form.getTextField("Text62");
  generalFeat7Field.setText(
    findFeatNameWithTrait(charInfo.build.feats, "general", "class", 7),
  );

  const generalFeat11Field = form.getTextField("Text63");
  generalFeat11Field.setText(
    findFeatNameWithTrait(charInfo.build.feats, "general", "class", 11),
  );

  const generalFeat15Field = form.getTextField("Text64");
  generalFeat15Field.setText(
    findFeatNameWithTrait(charInfo.build.feats, "general", "class", 15),
  );

  const generalFeat19Field = form.getTextField("Text65");
  generalFeat19Field.setText(
    findFeatNameWithTrait(charInfo.build.feats, "general", "class", 19),
  );

  // Class Feats (check if NOT skill trait)

  const classFeat1Field = form.getTextField("Text68");
  classFeat1Field.setText(
    findFeatNameWithTrait(charInfo.build.feats, "skill", "class", 1, true),
  );

  const classFeat2Field = form.getTextField("Text69");
  classFeat2Field.setText(
    findFeatNameWithTrait(charInfo.build.feats, "skill", "class", 2, true),
  );

  const classFeat4Field = form.getTextField("Text71");
  classFeat4Field.setText(
    findFeatNameWithTrait(charInfo.build.feats, "skill", "class", 4, true),
  );

  const classFeat6Field = form.getTextField("Text73");
  classFeat6Field.setText(
    findFeatNameWithTrait(charInfo.build.feats, "skill", "class", 6, true),
  );

  const classFeat8Field = form.getTextField("Text75");
  classFeat8Field.setText(
    findFeatNameWithTrait(charInfo.build.feats, "skill", "class", 8, true),
  );

  const classFeat10Field = form.getTextField("Text77");
  classFeat10Field.setText(
    findFeatNameWithTrait(charInfo.build.feats, "skill", "class", 10, true),
  );

  const classFeat12Field = form.getTextField("Text79");
  classFeat12Field.setText(
    findFeatNameWithTrait(charInfo.build.feats, "skill", "class", 12, true),
  );

  const classFeat14Field = form.getTextField("Text81");
  classFeat14Field.setText(
    findFeatNameWithTrait(charInfo.build.feats, "skill", "class", 14, true),
  );

  const classFeat16Field = form.getTextField("Text83");
  classFeat16Field.setText(
    findFeatNameWithTrait(charInfo.build.feats, "skill", "class", 16, true),
  );

  const classFeat18Field = form.getTextField("Text85");
  classFeat18Field.setText(
    findFeatNameWithTrait(charInfo.build.feats, "skill", "class", 18, true),
  );

  const classFeat20Field = form.getTextField("Text87");
  classFeat20Field.setText(
    findFeatNameWithTrait(charInfo.build.feats, "skill", "class", 20, true),
  );

  // Class Features

  ////

  nameField.setText(charInfo.character.name);

  let heritageAndAncestryName = "";
  if (charInfo.character._heritage == null) {
    heritageAndAncestryName = charInfo.character._ancestry.name;
  } else {
    heritageAndAncestryName = charInfo.character._heritage.name;
  }
  ancestryHeritageField.setText(heritageAndAncestryName);

  if (charInfo.character._class != null) {
    classField.setText(charInfo.character._class.name);
  }

  if (charInfo.character._background != null) {
    backgroundField.setText(charInfo.character._background.name);
  }

  //

  totalACField.setText(charInfo.stats.totalAC + "");
  totalSpeedField.setText(charInfo.stats.totalSpeed + "");

  maxHPField.setText(charInfo.stats.maxHP + "");
  currentHPField.setText(
    getNumZeroIfNull(charInfo.character.currentHealth) + "",
  );
  tempHPField.setText(getNumZeroIfNull(charInfo.character.tempHealth) + "");

  heroPointsField.setText(charInfo.character.heroPoints + "");
  levelField.setText(charInfo.character.level + "");
  xpField.setText(getNumZeroIfNull(charInfo.character.experience) + "");

  if (charInfo.Ancestry != null) {
    sizeField.setText(charInfo.Ancestry.size.charAt(0));
  }

  totalClassDCField.setText(charInfo.stats.totalClassDC + "");

  let charConditionsString = "";
  for (const condition of charInfo.conditions) {
    charConditionsString += condition._conditionName;
    if (condition.value != null) {
      charConditionsString += " " + condition.value;
    }
    charConditionsString += ", ";
  }
  charConditionsString = charConditionsString.slice(0, -2); // Trim off that last ', '
  conditionsField.setText(charConditionsString);

  let charTraitString = "";
  for (let charTrait of charInfo.charTraits) {
    charTraitString += charTrait.value + ", ";
  }
  charTraitString = charTraitString.slice(0, -2); // Trim off that last ', '
  traitsField.setText(charTraitString);

  // Inventory

  const itemsField = form.getTextField("WORN ITEMS");
  const bulkField = form.getTextField("BULK");
  const investField = form.getTextField("INVEST MAX 10");
  let itemsStr = "";
  let bulkStr = "";
  let bulkCount = 0;
  let investCount = 0;

  let copperCount = 0;
  let silverCount = 0;
  let goldCount = 0;
  let platinumCount = 0;

  for (let invItem of charInfo.invItems) {
    if (invItem.name == "Copper (cp)") {
      copperCount += invItem.quantity;
      continue;
    }
    if (invItem.name == "Silver (sp)") {
      silverCount += invItem.quantity;
      continue;
    }
    if (invItem.name == "Gold (gp)") {
      goldCount += invItem.quantity;
      continue;
    }
    if (invItem.name == "Platinum (pp)") {
      platinumCount += invItem.quantity;
      continue;
    }

    itemsStr += invItem.name + "\n";
    bulkStr += invItem.bulk + "\n";
    bulkCount += invItem.bulk;
    if (invItem.isInvested == 1) {
      investCount++;
    }
  }
  bulkCount = round(bulkCount, 1);

  itemsField.setText(itemsStr);
  bulkField.setText(bulkStr + "");
  investField.setText(investCount + "");

  const totalField = form.getTextField("Text44");
  totalField.setText(bulkCount + "");

  const encumberedBulkField = form.getTextField("Text49");
  encumberedBulkField.setText(strMod + 5 + "");

  const maximumBulkField = form.getTextField("Text94");
  maximumBulkField.setText(strMod + 10 + "");

  const cpField = form.getTextField("Text45");
  cpField.setText(copperCount + "");
  const spField = form.getTextField("Text46");
  spField.setText(silverCount + "");
  const gpField = form.getTextField("Text47");
  gpField.setText(goldCount + "");
  const ppField = form.getTextField("Text48");
  ppField.setText(platinumCount + "");

  // Character Extra Info

  let extraInfo = JSON.parse(charInfo.character.infoJSON);

  if (extraInfo?.ethnicity) {
    form.getTextField("ETHNICITY").setText(extraInfo.ethnicity);
  }
  if (extraInfo?.nationality) {
    form.getTextField("NATIONALITY").setText(extraInfo.nationality);
  }
  if (extraInfo?.age) {
    form.getTextField("AGE").setText(extraInfo.age);
  }
  let genderPronouns = "";
  if (extraInfo?.gender) {
    genderPronouns += extraInfo.gender;
  }
  if (extraInfo?.pronouns) {
    if (genderPronouns == "") {
      genderPronouns += extraInfo.pronouns;
    } else {
      genderPronouns += " & " + extraInfo.pronouns;
    }
  }
  form.getTextField("GENDER PRONOUNS").setText(genderPronouns);

  if (extraInfo?.appearance) {
    form.getTextField("APPEARANCE").setText(extraInfo.appearance);
  }
  if (extraInfo?.personality) {
    form.getTextField("ATTITUDE").setText(extraInfo.personality);
  }
  if (extraInfo?.beliefs) {
    form.getTextField("BELIEFS").setText(extraInfo.beliefs);
  }

  const pdfBytes = await pdfDoc.save();

  // Trigger the browser to download the PDF document
  download(
    pdfBytes,
    charInfo.character.name + " - Character Sheet.pdf",
    "application/pdf",
  );

  $(".modal-card-close").trigger("click");
  stopSpinnerSubLoader();
}

export function setProfCheckBox(
  prof,
  trainedBox,
  expertBox,
  masterBox,
  legendaryBox,
) {
  switch (prof) {
    case "U":
      return;
    case "T":
      trainedBox.check();
      return;
    case "E":
      trainedBox.check();
      expertBox.check();
      return;
    case "M":
      trainedBox.check();
      expertBox.check();
      masterBox.check();
      return;
    case "L":
      trainedBox.check();
      expertBox.check();
      masterBox.check();
      legendaryBox.check();
      return;
    default:
      return;
  }
}

export function findFeat(
  featsArray,
  sourceType,
  sourceLevel,
  sourceCode = null,
) {
  let featData;
  if (sourceCode == null) {
    featData = featsArray.find((featData) => {
      return (
        featData.source == "chosenFeats" &&
        featData.sourceType == sourceType &&
        featData.sourceLevel == sourceLevel
      );
    });
  } else {
    featData = featsArray.find((featData) => {
      return (
        featData.source == "chosenFeats" &&
        featData.sourceType == sourceType &&
        featData.sourceLevel == sourceLevel &&
        featData.sourceCode == sourceCode
      );
    });
  }

  if (featData != null && featData.value != null) {
    return featData.value;
  } else {
    return null;
  }
}

export function findFeatName(
  featsArray,
  sourceType,
  sourceLevel,
  sourceCode = null,
) {
  let feat = findFeat(featsArray, sourceType, sourceLevel, sourceCode);
  if (feat != null) {
    return feat.name;
  } else {
    return "";
  }
}

export function findFeatNameWithTrait(
  featsArray,
  traitName,
  sourceType,
  sourceLevel,
  not = false,
) {
  for (let featData of featsArray) {
    if (
      featData.source == "chosenFeats" &&
      featData.sourceType == sourceType &&
      featData.sourceLevel == sourceLevel &&
      featData.value != null
    ) {
      let featStruct = g_featMap.get(featData.value.id + "");
      let tag = featStruct.Tags.find((tag) => {
        return tag.name.toLowerCase() == traitName.toLowerCase();
      });
      if (tag != null && !not) {
        return featData.value.name;
      } else if (not) {
        return featData.value.name;
      }
    }
  }
  return "";
}
