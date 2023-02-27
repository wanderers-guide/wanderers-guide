/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

function initVariables(){

  g_variableMap.clear();

  // Level
  initializeVariable(VARIABLE.LEVEL, VAR_TYPE.INTEGER, g_character.level);

  // Ability Scores
  varInit_abilityScores();
  initializeVariable(VARIABLE.SCORE_NONE, VAR_TYPE.ABILITY_SCORE, 10);

  // Class Name
  const charClass = getCharClass();
  if(charClass != null && charClass.Class != null){
    variables_addString(VARIABLE.CLASS_NAME, charClass.Class.name);
  }

  // Speed
  varInit_speeds();

  // Profs
  let profMap = getProfMap();

  // Key Ability
  let keyBoost = getDataSingleAbilityBonus({
    sourceType: 'class',
    sourceLevel: 1,
    sourceCode: 'keyAbility',
    sourceCodeSNum: 'a'
  });
  if(keyBoost != null){
    initializeVariableProf(VARIABLE.CLASS_DC, 'SCORE_'+keyBoost.Ability, 0, profMap.get("Class_DC"));
  } else {
    initializeVariableProf(VARIABLE.CLASS_DC, VARIABLE.SCORE_NONE, 0, profMap.get("Class_DC"));
  }

  // Saves
  initializeVariableProf(VARIABLE.SAVE_FORT, VARIABLE.SCORE_CON, 0, profMap.get("Fortitude"));
  initializeVariableProf(VARIABLE.SAVE_REFLEX, VARIABLE.SCORE_DEX, 0, profMap.get("Reflex"));
  initializeVariableProf(VARIABLE.SAVE_WILL, VARIABLE.SCORE_WIS, 0, profMap.get("Will"));

  // Skills
  for(const [skillName, skillData] of g_skillMap.entries()){
    let skillCodeName = skillName.replace(/\s/g,'_');
    initializeVariableProf('SKILL_'+skillCodeName, 'SCORE_'+skillData.Skill.ability, 0, profMap.get(skillName));
  }

  // Lore Skills
  for(const loreData of getDataAll(DATA_SOURCE.LORE)){
    initializeVariableProf(`SKILL_${profConversion_convertOldName(loreData.value)}_LORE`, VARIABLE.SCORE_INT, 0, profMap.get(capitalizeWords(loreData.value)+' Lore'));
  }

  // Perception
  initializeVariableProf(VARIABLE.PERCEPTION, VARIABLE.SCORE_WIS, 0, profMap.get("Perception"));

  // Spell Attacks and DCs
  initializeVariableProf(VARIABLE.ARCANE_SPELL_ATTACK, VARIABLE.SCORE_NONE, 0, profMap.get("ArcaneSpellAttacks"));
  initializeVariableProf(VARIABLE.OCCULT_SPELL_ATTACK, VARIABLE.SCORE_NONE, 0, profMap.get("OccultSpellAttacks"));
  initializeVariableProf(VARIABLE.PRIMAL_SPELL_ATTACK, VARIABLE.SCORE_NONE, 0, profMap.get("PrimalSpellAttacks"));
  initializeVariableProf(VARIABLE.DIVINE_SPELL_ATTACK, VARIABLE.SCORE_NONE, 0, profMap.get("DivineSpellAttacks"));
  
  initializeVariableProf(VARIABLE.ARCANE_SPELL_DC, VARIABLE.SCORE_NONE, 0, profMap.get("ArcaneSpellDCs"));
  initializeVariableProf(VARIABLE.OCCULT_SPELL_DC, VARIABLE.SCORE_NONE, 0, profMap.get("OccultSpellDCs"));
  initializeVariableProf(VARIABLE.PRIMAL_SPELL_DC, VARIABLE.SCORE_NONE, 0, profMap.get("PrimalSpellDCs"));
  initializeVariableProf(VARIABLE.DIVINE_SPELL_DC, VARIABLE.SCORE_NONE, 0, profMap.get("DivineSpellDCs"));

  // Init Max HP
  let ancestryHitPoints = 0;
  if(getCharAncestry() != null){
    ancestryHitPoints = getCharAncestry().Ancestry.hitPoints;
  }
  initializeVariable(VARIABLE.MAX_HEALTH, VAR_TYPE.INTEGER, ancestryHitPoints);
  initializeVariable(VARIABLE.MAX_HEALTH_BONUS_PER_LEVEL, VAR_TYPE.INTEGER, 0);

  // Attacks
  initializeVariableProf(VARIABLE.SIMPLE_WEAPONS, VARIABLE.SCORE_NONE, 0, profMap.get("Simple_Weapons"));
  initializeVariableProf(VARIABLE.MARTIAL_WEAPONS, VARIABLE.SCORE_NONE, 0, profMap.get("Martial_Weapons"));
  initializeVariableProf(VARIABLE.ADVANCED_WEAPONS, VARIABLE.SCORE_NONE, 0, profMap.get("Advanced_Weapons"));
  initializeVariableProf(VARIABLE.UNARMED_ATTACKS, VARIABLE.SCORE_NONE, 0, profMap.get("Unarmed_Attacks"));

  // Defenses
  initializeVariableProf(VARIABLE.LIGHT_ARMOR, VARIABLE.SCORE_NONE, 0, profMap.get("Light_Armor"));
  initializeVariableProf(VARIABLE.MEDIUM_ARMOR, VARIABLE.SCORE_NONE, 0, profMap.get("Medium_Armor"));
  initializeVariableProf(VARIABLE.HEAVY_ARMOR, VARIABLE.SCORE_NONE, 0, profMap.get("Heavy_Armor"));
  initializeVariableProf(VARIABLE.UNARMORED_DEFENSE, VARIABLE.SCORE_NONE, 0, profMap.get("Unarmored_Defense"));

  // Resists & Weaks
  initializeVariable(VARIABLE.RESISTANCES, VAR_TYPE.STRING, '');
  initializeVariable(VARIABLE.WEAKNESSES, VAR_TYPE.STRING, '');

  // Languages
  initializeVariable(VARIABLE.LANGUAGES, VAR_TYPE.STRING, '');

  // Init integer values, for adding bonuses/penalties to them
  initializeVariable(VARIABLE.AC, VAR_TYPE.INTEGER, VAR_NULL);
  initializeVariable(VARIABLE.DEX_CAP, VAR_TYPE.INTEGER, VAR_NULL);
  initializeVariable(VARIABLE.ARMOR_CHECK_PENALTY, VAR_TYPE.INTEGER, VAR_NULL);
  initializeVariable(VARIABLE.ARMOR_SPEED_PENALTY, VAR_TYPE.INTEGER, VAR_NULL);

  initializeVariable(VARIABLE.INVEST_LIMIT, VAR_TYPE.INTEGER, VAR_NULL);
  initializeVariable(VARIABLE.BULK_LIMIT, VAR_TYPE.INTEGER, VAR_NULL);

  initializeVariable(VARIABLE.ATTACKS, VAR_TYPE.INTEGER, VAR_NULL);
  initializeVariable(VARIABLE.ATTACKS_DMG_DICE, VAR_TYPE.INTEGER, VAR_NULL);
  initializeVariable(VARIABLE.ATTACKS_DMG_BONUS, VAR_TYPE.INTEGER, VAR_NULL);

  initializeVariable(VARIABLE.MELEE_ATTACKS, VAR_TYPE.INTEGER, VAR_NULL);
  initializeVariable(VARIABLE.MELEE_ATTACKS_DMG_DICE, VAR_TYPE.INTEGER, VAR_NULL);
  initializeVariable(VARIABLE.MELEE_ATTACKS_DMG_BONUS, VAR_TYPE.INTEGER, VAR_NULL);
  initializeVariable(VARIABLE.AGILE_MELEE_ATTACKS_DMG_BONUS, VAR_TYPE.INTEGER, VAR_NULL);
  initializeVariable(VARIABLE.NON_AGILE_MELEE_ATTACKS_DMG_BONUS, VAR_TYPE.INTEGER, VAR_NULL);

  initializeVariable(VARIABLE.RANGED_ATTACKS, VAR_TYPE.INTEGER, VAR_NULL);
  initializeVariable(VARIABLE.RANGED_ATTACKS_DMG_DICE, VAR_TYPE.INTEGER, VAR_NULL);
  initializeVariable(VARIABLE.RANGED_ATTACKS_DMG_BONUS, VAR_TYPE.INTEGER, VAR_NULL);

  // Run All SourceBook Code //
  if(g_enabledSources != null){
    for(let enabledSource of g_enabledSources){

      // Run Removal Statements first
      processRemovalStatements(enabledSource.code, enabledSource.codeName, enabledSource.bundleID);

      processCode(
        enabledSource.code,
        {
          sourceType: 'other',
          sourceLevel: 0,
          sourceCode: 'source-book',
          sourceCodeSNum: 'a',
        },
        null, // No location
        {source: 'SourceBook', sourceName: enabledSource.name});
    }
  }
  // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ //

}



function varInit_abilityScores(){

  let srcStruct = {
    sourceType: 'other',
    sourceLevel: 1,
    sourceCode: 'none',
    sourceCodeSNum: 'a',
  };
  let bonusData = getDataSingleAbilityBonus(srcStruct);
  let charAbilityScores = null;
  if(bonusData != null) {
      let bonusArray = JSON.parse(bonusData.Bonus);
      charAbilityScores = {
          STR : 10 + parseInt(bonusArray[0]),
          DEX : 10 + parseInt(bonusArray[1]),
          CON : 10 + parseInt(bonusArray[2]),
          INT : 10 + parseInt(bonusArray[3]),
          WIS : 10 + parseInt(bonusArray[4]),
          CHA : 10 + parseInt(bonusArray[5]),
      };
  } else {
      charAbilityScores = {
          STR : 10,
          DEX : 10,
          CON : 10,
          INT : 10,
          WIS : 10,
          CHA : 10,
      };
  }

  initializeVariable(VARIABLE.SCORE_STR, VAR_TYPE.ABILITY_SCORE, charAbilityScores.STR);
  initializeVariable(VARIABLE.SCORE_DEX, VAR_TYPE.ABILITY_SCORE, charAbilityScores.DEX);
  initializeVariable(VARIABLE.SCORE_CON, VAR_TYPE.ABILITY_SCORE, charAbilityScores.CON);
  initializeVariable(VARIABLE.SCORE_INT, VAR_TYPE.ABILITY_SCORE, charAbilityScores.INT);
  initializeVariable(VARIABLE.SCORE_WIS, VAR_TYPE.ABILITY_SCORE, charAbilityScores.WIS);
  initializeVariable(VARIABLE.SCORE_CHA, VAR_TYPE.ABILITY_SCORE, charAbilityScores.CHA);
  initializeVariable(VARIABLE.SCORE_NONE, VAR_TYPE.ABILITY_SCORE, 10);

  for(const bonusData of getDataAllAbilityBonus()){
    if(bonusData.Bonus == "Boost") {
      variables_addToBonuses('SCORE_'+bonusData.Ability, 2, JSON.stringify(parameterizeSrcStruct(bonusData.source, bonusData)), 'Boost');
    } else if(bonusData.Bonus == "Flaw") {
      variables_addToBonuses('SCORE_'+bonusData.Ability, -2, JSON.stringify(parameterizeSrcStruct(bonusData.source, bonusData)), 'Flaw');
    } else {
      variables_addToBonuses('SCORE_'+bonusData.Ability, parseInt(bonusData.Bonus), JSON.stringify(parameterizeSrcStruct(bonusData.source, bonusData)), 'Unknown');
    }
  }

}


function varInit_speeds(){

  if(getCharAncestry() != null){
    initializeVariable(VARIABLE.SPEED, VAR_TYPE.INTEGER, getCharAncestry().Ancestry.speed);
  }
  for(const speedData of getDataAllOtherSpeed()){
    initializeVariable('SPEED_'+speedData.Type, VAR_TYPE.INTEGER, speedData.Amount);
  }

}


