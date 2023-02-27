/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

function addAutoBonusProgressionVariant(classStruct){
  classStruct.Abilities.push(getABP_AttackPotency(1, 2, 1));
  classStruct.Abilities.push(getABP_SkillPotencies(2, 3));
  classStruct.Abilities.push(getABP_DevastatingAttacks(3, 4, 2, 'two'));
  classStruct.Abilities.push(getABP_DefensePotency(4, 5, 1));
  // #5, Skill Potency?
  classStruct.Abilities.push(getABP_PerceptionPotency(6, 7, 1));
  classStruct.Abilities.push(getABP_SavingThrowPotency(7, 8, 1));
  // #8, Skill Potency?
  classStruct.Abilities.push(getABP_AttackPotency(9, 10, 2));
  classStruct.Abilities.push(getABP_DefensePotency(10, 11, 2));
  classStruct.Abilities.push(getABP_DevastatingAttacks(11, 12, 3, 'three'));
  classStruct.Abilities.push(getABP_PerceptionPotency(12, 13, 2));
  // #13, Skill Potency?
  classStruct.Abilities.push(getABP_SavingThrowPotency(14, 14, 2));
  // #15, Skill Potency?
  classStruct.Abilities.push(getABP_AttackPotency(16, 16, 3));
  classStruct.Abilities.push(getABP_AbilityApex(17, 17));
  // #18, Skill Potency?
  classStruct.Abilities.push(getABP_DefensePotency(19, 18, 3));
  classStruct.Abilities.push(getABP_DevastatingAttacks(20, 19, 4, 'four'));
  classStruct.Abilities.push(getABP_PerceptionPotency(21, 19, 3));
  classStruct.Abilities.push(getABP_SavingThrowPotency(22, 20, 3));
  // #23, Skill Potency?

  // Re-sort the abilities array...
  classStruct.Abilities = classStruct.Abilities.sort(
    function(a, b) {
        if (a.level === b.level) {
            // Name is only important when levels are the same
            return a.name > b.name ? 1 : -1;
        }
        return a.level - b.level;
    }
  );

  return classStruct;
}

function getABP_AttackPotency(id_offset, lvl, bonus){
  return {
    id: -2000+(-1*id_offset),
    name: "Attack Potency +"+bonus,
    level: lvl,
    description: "You gain a +"+bonus+" potency bonus to attack rolls with all weapons and unarmed attacks.",
    code: "INCREASE-ATTACKS="+bonus+"-POTENCY",
    contentSrc: "CRB",
    displayInSheet: 1,
    selectType: "NONE",
    selectOptionFor: null,
    isArchived: 0,
  };
}

function getABP_SkillPotencies(id_offset, lvl){
  return {
    id: -2000+(-1*id_offset),
    name: "Skill Potencies",
    level: lvl,
    description: "At 3rd level, choose a single skill. You gain a +1 potency bonus with that skill. At 6th level, choose a second skill to gain a +1 potency bonus. At 9th level, choose one of those skills and increase its potency bonus to +2. At 13th level, increase the potency bonus of your second skill to +2 and choose a third skill to gain a +1 potency bonus. At 15th level, increase the third skill’s potency bonus to +2 and choose a fourth skill to gain a +1 potency bonus. At 17th level, choose one of your three skills with a +2 potency bonus to increase to +3, and choose a fifth skill to gain a +1 potency bonus. Finally, at 20th level, choose one of the two skills with a +2 potency bonus to increase to +3, choose one of the three skills at a +1 potency bonus to increase to +2, and choose one new skill to gain a +1 potency bonus.\nYou can spend 1 week to retrain one of these assignments at any time.\n__On the character sheet, you can customize skills to add an extra bonus to that skill. Use that to indicate the potency bonus' that you would gain.__",
    code: "GIVE-NOTES-FIELD=You can use this area to keep track of what skills you've selected at the given levels.",
    contentSrc: "CRB",
    displayInSheet: 1,
    selectType: "NONE",
    selectOptionFor: null,
    isArchived: 0,
  };
}

function getABP_DevastatingAttacks(id_offset, lvl, diceNum, diceWord){
  return {
    id: -2000+(-1*id_offset),
    name: "Devastating Attacks ("+diceWord+" dice)",
    level: lvl,
    description: "Your weapon and unarmed strikes deal "+diceWord+" damage dice instead of one.",
    code: "INCREASE-ATTACKS_DMG_DICE="+diceNum+"-ABP",
    contentSrc: "CRB",
    displayInSheet: 1,
    selectType: "NONE",
    selectOptionFor: null,
    isArchived: 0,
  };
}

function getABP_DefensePotency(id_offset, lvl, bonus){
  return {
    id: -2000+(-1*id_offset),
    name: "Defense Potency +"+bonus,
    level: lvl,
    description: "You gain a +"+bonus+" potency bonus to AC.",
    code: "INCREASE-AC="+bonus+"-POTENCY",
    contentSrc: "CRB",
    displayInSheet: 1,
    selectType: "NONE",
    selectOptionFor: null,
    isArchived: 0,
  };
}

function getABP_PerceptionPotency(id_offset, lvl, bonus){
  return {
    id: -2000+(-1*id_offset),
    name: "Perception Potency +"+bonus,
    level: lvl,
    description: "You gain a +"+bonus+" potency bonus to Perception.",
    code: "INCREASE-PERCEPTION="+bonus+"-POTENCY",
    contentSrc: "CRB",
    displayInSheet: 1,
    selectType: "NONE",
    selectOptionFor: null,
    isArchived: 0,
  };
}

function getABP_SavingThrowPotency(id_offset, lvl, bonus){
  return {
    id: -2000+(-1*id_offset),
    name: "Saving Throw Potency +"+bonus,
    level: lvl,
    description: "You gain a +"+bonus+" potency bonus to saves.",
    code: "INCREASE-SAVE_FORT="+bonus+"-POTENCY\nINCREASE-SAVE_REFLEX="+bonus+"-POTENCY\nINCREASE-SAVE_WILL="+bonus+"-POTENCY",
    contentSrc: "CRB",
    displayInSheet: 1,
    selectType: "NONE",
    selectOptionFor: null,
    isArchived: 0,
  };
}

function getABP_AbilityApex(id_offset, lvl){
  return {
    id: -2000+(-1*id_offset),
    name: "Ability Apex",
    level: lvl,
    description: "Choose one ability score to either increase by 2 or increase to 18 (whichever grants the higher score).\n__On the basics page of the character, you can change your starting ability scores from all 10's. Use this to edit your ability scores and reflect the apex ability change you chose.__",
    code: "GIVE-NOTES-FIELD=You can use this area to keep track of what ability score you chose.",
    contentSrc: "CRB",
    displayInSheet: 1,
    selectType: "NONE",
    selectOptionFor: null,
    isArchived: 0,
  };
}
/*
function addABP_AbilityApex(classAbilities, id_offset, lvl){
  let apexAbilityID = -2000+(-1*id_offset);
  classAbilities.push({
    id: apexAbilityID,
    name: "Ability Apex",
    level: lvl,
    description: "Choose one ability score to either increase by 2 or increase to 18 (whichever grants the higher score).",
    code: null,
    contentSrc: "CRB",
    displayInSheet: 1,
    selectType: "SELECTOR",
    selectOptionFor: null,
    isArchived: 0,
  });

  classAbilities.push({
    id: apexAbilityID-30,
    name: "Ability Apex - Strength",
    level: null,
    description: "Increase your Strength score by 2 or increase it to 18 (whichever grants the higher score).",
    code: "SET-APEX-ABILITY-SCORE=STR",
    contentSrc: "CRB",
    displayInSheet: 0,
    selectType: "SELECT_OPTION",
    selectOptionFor: apexAbilityID,
    isArchived: 0,
  });
  classAbilities.push({
    id: apexAbilityID-31,
    name: "Ability Apex - Dexterity",
    level: null,
    description: "Increase your Dexterity score by 2 or increase it to 18 (whichever grants the higher score).",
    code: "SET-APEX-ABILITY-SCORE=DEX",
    contentSrc: "CRB",
    displayInSheet: 0,
    selectType: "SELECT_OPTION",
    selectOptionFor: apexAbilityID,
    isArchived: 0,
  });
  classAbilities.push({
    id: apexAbilityID-32,
    name: "Ability Apex - Constitution",
    level: null,
    description: "Increase your Constitution score by 2 or increase it to 18 (whichever grants the higher score).",
    code: "SET-APEX-ABILITY-SCORE=CON",
    contentSrc: "CRB",
    displayInSheet: 0,
    selectType: "SELECT_OPTION",
    selectOptionFor: apexAbilityID,
    isArchived: 0,
  });
  classAbilities.push({
    id: apexAbilityID-33,
    name: "Ability Apex - Intelligence",
    level: null,
    description: "Increase your Intelligence score by 2 or increase it to 18 (whichever grants the higher score).",
    code: "SET-APEX-ABILITY-SCORE=INT",
    contentSrc: "CRB",
    displayInSheet: 0,
    selectType: "SELECT_OPTION",
    selectOptionFor: apexAbilityID,
    isArchived: 0,
  });
  classAbilities.push({
    id: apexAbilityID-34,
    name: "Ability Apex - Wisdom",
    level: null,
    description: "Increase your Wisdom score by 2 or increase it to 18 (whichever grants the higher score).",
    code: "SET-APEX-ABILITY-SCORE=WIS",
    contentSrc: "CRB",
    displayInSheet: 0,
    selectType: "SELECT_OPTION",
    selectOptionFor: apexAbilityID,
    isArchived: 0,
  });
  classAbilities.push({
    id: apexAbilityID-35,
    name: "Ability Apex - Charisma",
    level: null,
    description: "Increase your Charisma score by 2 or increase it to 18 (whichever grants the higher score).",
    code: "SET-APEX-ABILITY-SCORE=CHA",
    contentSrc: "CRB",
    displayInSheet: 0,
    selectType: "SELECT_OPTION",
    selectOptionFor: apexAbilityID,
    isArchived: 0,
  });

  return classAbilities;
  
}*/