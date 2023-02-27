/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

// ========================================================================================= //
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Wanderer's Guide Code ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ //
// ========================================================================================= //

function testSheetCode(wscCode){
    return processSheetCode(wscCode, { source: 'TEST' }, true);
}

function processSheetCode(wscCode, extraData=null, isTest=false){
    if(wscCode == null) {return false;}
    if(extraData == null){ extraData = {source: 'Unknown', sourceName: ''}; }

    // Process Variables
    let varUniqueID = `sheetCode-${extraData.source}-`;
    if(extraData.source == 'ClassAbility' || extraData.source == 'ClassAbilityOption'){
      varUniqueID += extraData.abilityID;
    } else if(extraData.source == 'Feat'){
      if(extraData.srcStructKey != null){
        varUniqueID += extraData.featID+'-'+extraData.srcStructKey;
      } else {
        varUniqueID += extraData.featID;
      }
    } else {
      varUniqueID += extraData.sourceName;
    }
    wscCode = processVariables(wscCode, varUniqueID);

    let wscStatements = wscCode.split(/\n/);

    let success = true;
    for(const wscStatementRaw of wscStatements) {
        // Test/Check Statement for Expressions //
        let wscStatement = testExpr(wscStatementRaw);
        if(wscStatement == null) {continue;}
        //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
        let wscStatementUpper = wscStatement.toUpperCase();
        
        // If it's a removal statement, continue
        if(wscStatementUpper.startsWith('REMOVAL-')){
          continue;
        }

        if(wscStatementUpper.startsWith("ADD-TEXT=")){
          continue; // Ignore ADD-TEXT statements, they're processed separately
        }

        if(wscStatementUpper.startsWith("GIVE-CONDITION=")){ // GIVE-CONDITION=Clumsy:1 OR GIVE-CONDITION=Clumsy
          if(isTest) {continue;}

          let conditionName = wscStatement.split('=')[1];
          let conditionValue = null;
          if(wscStatement.includes(":")){
              let conditionNameData = conditionName.split(":");
              conditionName = conditionNameData[0];
              conditionValue = parseInt(conditionNameData[1]);
          }

          let conditionID = getConditionFromName(conditionName).id;
          let conditionParentID = getCurrentConditionIDFromName(extraData.sourceName);
          addCondition(conditionID+'', conditionValue, extraData.sourceName, conditionParentID);

          continue;
        }

        if(wscStatementUpper.startsWith("REMOVE-CONDITION=")){ // REMOVE-CONDITION=Clumsy
          if(isTest) {continue;}

          let conditionName = wscStatement.split('=')[1];

          let conditionID = getConditionFromName(conditionName).id;
          removeCondition(conditionID);

          continue;
        }

        if(wscStatementUpper.startsWith("CONDITIONAL-INCREASE-")){
            if(isTest) {continue;}
            // Ex. CONDITIONAL-INCREASE-PERCEPTION=2~status bonus to checks for initiative

            let adjustmentData = (wscStatement.split('-')[2]).split('=');
            let adjustmentTowards = adjustmentData[0];
            let adjustmentNumInfoData = (adjustmentData[1]).split('~');
            let adjustmentNum = getSheetProcNumber(adjustmentNumInfoData[0], extraData.sourceName);
            let adjustmentCondition = adjustmentNumInfoData[1];
            addConditionalStat(adjustmentTowards, signNumber(adjustmentNum)+' '+adjustmentCondition, extraData.sourceName);

            continue;
        }

        if(wscStatementUpper.startsWith("CONDITIONAL-DECREASE-")){
            if(isTest) {continue;}
            // Ex. CONDITIONAL-DECREASE-PERCEPTION=2~status penalty to checks for initiative

            let adjustmentData = (wscStatement.split('-')[2]).split('=');
            let adjustmentTowards = adjustmentData[0];
            let adjustmentNumInfoData = (adjustmentData[1]).split('~');
            let adjustmentNum = getSheetProcNumber(adjustmentNumInfoData[0], extraData.sourceName);
            let adjustmentCondition = adjustmentNumInfoData[1];
            addConditionalStat(adjustmentTowards, signNumber(-1*adjustmentNum)+' '+adjustmentCondition, extraData.sourceName);

            continue;
        }

        if(wscStatementUpper.startsWith("CONDITIONAL-")){
            if(isTest) {continue;}
            // Ex. CONDITIONAL-SAVE_FORT=When you roll a success, you get a critical success instead.

            let dataSplit = wscStatement.split('=');

            let adjustmentTowards = dataSplit[0].split('-')[1];
            let adjustmentInfo = dataSplit[1];
            addConditionalStat(adjustmentTowards, adjustmentInfo, extraData.sourceName);

            continue;
        }

        if(wscStatementUpper.startsWith("INCREASE-")){
            if(isTest) {continue;}
            // INCREASE-X=5 (Ex. INCREASE-SCORE_STR=2, INCREASE-SPEED=10-STATUS)

            let adjValData = wscStatement.split('-');
            let adjustmentData = adjValData[1].split('=');
            let adjustmentTowards = adjustmentData[0];

            let adjustmentNum = getSheetProcNumber(adjustmentData[1], extraData.sourceName);
            let adjustmentSource = 'OTHER-'+extraData.sourceName;
            if(adjValData[2] != null) {
                adjustmentSource = adjValData[2];
            }

            if(!adjustmentSource.endsWith('_BONUS') && !adjustmentSource.endsWith('_PENALTY')){
              adjustmentSource += '_BONUS';
            }

            addStatAndSrc(adjustmentTowards, adjustmentSource, adjustmentNum, extraData.sourceName);

            continue;
        }

        if(wscStatementUpper.startsWith("DECREASE-")){
            if(isTest) {continue;}
            // DECREASE-X=5 (Ex. DECREASE-SCORE_STR=2, DECREASE-SPEED=10-STATUS)

            let adjValData = wscStatement.split('-');
            let adjustmentData = adjValData[1].split('=');
            let adjustmentTowards = adjustmentData[0];

            let adjustmentNum = getSheetProcNumber(adjustmentData[1], extraData.sourceName);
            let adjustmentSource = 'OTHER-'+extraData.sourceName;
            if(adjValData[2] != null) {
                adjustmentSource = adjValData[2];
            }

            if(!adjustmentSource.endsWith('_BONUS') && !adjustmentSource.endsWith('_PENALTY')){
              adjustmentSource += '_PENALTY';
            }

            addStatAndSrc(adjustmentTowards, adjustmentSource, -1*adjustmentNum, extraData.sourceName);

            continue;
        }

        if(wscStatementUpper.startsWith("OVERRIDE-") && !wscStatementUpper.startsWith("OVERRIDE-FEAT-LEVEL=")){
            if(isTest) {continue;}
            // OVERRIDE-X=5 (Ex. OVERRIDE-PERCEPTION=10-MODIFIER)

            let adjValData = wscStatement.split('-');
            let overrideData = adjValData[1].split('=');

            let overrideTowards = overrideData[0];
            let overrideSource = adjValData[2];
            if(overrideSource == null) { overrideSource = ''; }

            let overrideNum = getSheetProcNumber(overrideData[1], extraData.sourceName);

            if(overrideTowards.endsWith('_PENALTY')){
                overrideNum = -1*overrideNum;
            }
            
            addStat(overrideTowards, overrideSource, overrideNum);

            continue;
        }

        if(wscStatementUpper.startsWith("SET-APEX-ABILITY-SCORE=")){
            if(isTest) {continue;}
            // SET-APEX-ABILITY-SCORE=X (Ex. SET-APEX-ABILITY-SCORE=DEX)

            let adjustmentData = wscStatement.split('=');
            let abilityScore = adjustmentData[1];

            let baseStat = variables_getValue('SCORE_'+abilityScore).Score;
            if(baseStat >= 18){
              g_variableMap.get('SCORE_'+abilityScore).Value.Score = baseStat+2;
            } else {
              g_variableMap.get('SCORE_'+abilityScore).Value.Score = 18;
            }

            continue;
        }

        if(wscStatementUpper.startsWith("SET-SIZE=")){
          if(isTest) {continue;}

          // SET-SIZE=X (Ex. SET-SIZE=SMALL)
          let sizeData = wscStatementUpper.split('=');
          let newSize = sizeData[1];

          if(newSize == 'TINY' || newSize == 'SMALL' || newSize == 'MEDIUM' || newSize == 'LARGE' || newSize == 'HUGE' || newSize == 'GARGANTUAN'){
            g_charSize = newSize;
          } else {
            displayError('Attempted to set character size to unknown value "'+newSize+'"');
          }

          continue;
        }

        if(wscStatementUpper.startsWith("SET-MAP=")){
          if(isTest) {continue;}
          // TIER_1 = (5/10 or 4/8 agile)
          // TIER_2 = (4/8 or 3/6 agile)
          // TIER_3 = (3/6 or 2/4 agile)
          // TIER_4 = (2/4 or 1/2 agile)
          let mapTier = wscStatementUpper.split('=')[1];

          if(mapTier == 'TIER_1' || mapTier == 'TIER_2' || mapTier == 'TIER_2_AGILE' || mapTier == 'TIER_3' || mapTier == 'TIER_4'){
            gState_MAP = mapTier;
          } else {
            displayError('Attempted to set multiple attack penalty to unknown tier "'+mapTier+'"');
          }

          continue;
        }


        if(wscStatementUpper.startsWith("DEFAULT-ON-HIT-DAMAGE=")){
          if(isTest) {continue;} //DEFAULT-ON-HIT-DAMAGE=+5d6+6 fire

          let invItemID = null;
          if(extraData.source == 'InvItem' || extraData.source == 'PropertyRune'){
            invItemID = extraData.invItemID;
          } else {
            displayError('Attempted to execute "DEFAULT-ON-HIT-DAMAGE" from a non-item source');
            continue;
          }

          let modInfo = extraData.source;
          if(extraData.source == 'PropertyRune'){
            modInfo = extraData.sourceName;
          }

          let dataParts = wscStatement.split('=');
          addWeapMod(invItemID, dataParts[1], 'DAMAGE-ON-HIT', modInfo);
          if(extraData.bagInvItemID != null){
            addWeapMod(extraData.bagInvItemID, dataParts[1], 'DAMAGE-ON-HIT', 'AttachedItem');
          }

          continue;
        }

        if(wscStatementUpper.startsWith("DEFAULT-ON-CRIT-DAMAGE=")){
          if(isTest) {continue;} //DEFAULT-ON-CRIT-DAMAGE=+5d6+6 fire

          let invItemID = null;
          if(extraData.source == 'InvItem' || extraData.source == 'PropertyRune'){
            invItemID = extraData.invItemID;
          } else {
            displayError('Attempted to execute "DEFAULT-ON-CRIT-DAMAGE" from a non-item source');
            continue;
          }

          let modInfo = extraData.source;
          if(extraData.source == 'PropertyRune'){
            modInfo = extraData.sourceName;
          }

          let dataParts = wscStatement.split('=');
          addWeapMod(invItemID, dataParts[1], 'DAMAGE-ON-CRIT', modInfo);
          if(extraData.bagInvItemID != null){
            addWeapMod(extraData.bagInvItemID, dataParts[1], 'DAMAGE-ON-CRIT', 'AttachedItem');
          }

          continue;
        }

        if(wscStatementUpper.startsWith("DEFAULT-ON-HIT-OTHER=")){
          if(isTest) {continue;} //DEFAULT-ON-HIT-OTHER=Flat-footed until next turn

          let invItemID = null;
          if(extraData.source == 'InvItem' || extraData.source == 'PropertyRune'){
            invItemID = extraData.invItemID;
          } else {
            displayError('Attempted to execute "DEFAULT-ON-HIT-OTHER" from a non-item source');
            continue;
          }

          let modInfo = extraData.source;
          if(extraData.source == 'PropertyRune'){
            modInfo = extraData.sourceName;
          }

          let dataParts = wscStatement.split('=');
          addWeapMod(invItemID, dataParts[1], 'OTHER-ON-HIT', modInfo);
          if(extraData.bagInvItemID != null){
            addWeapMod(extraData.bagInvItemID, dataParts[1], 'OTHER-ON-HIT', 'AttachedItem');
          }

          continue;
        }

        if(wscStatementUpper.startsWith("DEFAULT-ON-CRIT-OTHER=")){
          if(isTest) {continue;} //DEFAULT-ON-CRIT-OTHER=Flat-footed forever

          let invItemID = null;
          if(extraData.source == 'InvItem' || extraData.source == 'PropertyRune'){
            invItemID = extraData.invItemID;
          } else {
            displayError('Attempted to execute "DEFAULT-ON-CRIT-OTHER" from a non-item source');
            continue;
          }

          let modInfo = extraData.source;
          if(extraData.source == 'PropertyRune'){
            modInfo = extraData.sourceName;
          }

          let dataParts = wscStatement.split('=');
          addWeapMod(invItemID, dataParts[1], 'OTHER-ON-CRIT', modInfo);
          if(extraData.bagInvItemID != null){
            addWeapMod(extraData.bagInvItemID, dataParts[1], 'OTHER-ON-CRIT', 'AttachedItem');
          }

          continue;
        }

        if(wscStatementUpper.startsWith("DEFAULT-ON-HIT-CONDITIONAL=")){
          if(isTest) {continue;} //DEFAULT-ON-HIT-CONDITIONAL=Flat-footed only at dawn

          let invItemID = null;
          if(extraData.source == 'InvItem' || extraData.source == 'PropertyRune'){
            invItemID = extraData.invItemID;
          } else {
            displayError('Attempted to execute "DEFAULT-ON-HIT-CONDITIONAL" from a non-item source');
            continue;
          }

          let modInfo = extraData.source;
          if(extraData.source == 'PropertyRune'){
            modInfo = extraData.sourceName;
          }

          let dataParts = wscStatement.split('=');
          addWeapMod(invItemID, dataParts[1], 'CONDITIONAL-ON-HIT', modInfo);
          if(extraData.bagInvItemID != null){
            addWeapMod(extraData.bagInvItemID, dataParts[1], 'CONDITIONAL-ON-HIT', 'AttachedItem');
          }

          continue;
        }

        if(wscStatementUpper.startsWith("DEFAULT-ON-CRIT-CONDITIONAL=")){
          if(isTest) {continue;} //DEFAULT-ON-CRIT-CONDITIONAL=Flat-footed forever only at dawn

          let invItemID = null;
          if(extraData.source == 'InvItem' || extraData.source == 'PropertyRune'){
            invItemID = extraData.invItemID;
          } else {
            displayError('Attempted to execute "DEFAULT-ON-CRIT-CONDITIONAL" from a non-item source');
            continue;
          }

          let modInfo = extraData.source;
          if(extraData.source == 'PropertyRune'){
            modInfo = extraData.sourceName;
          }

          let dataParts = wscStatement.split('=');
          addWeapMod(invItemID, dataParts[1], 'CONDITIONAL-ON-CRIT', modInfo);
          if(extraData.bagInvItemID != null){
            addWeapMod(extraData.bagInvItemID, dataParts[1], 'CONDITIONAL-ON-CRIT', 'AttachedItem');
          }

          continue;
        }

        if(wscStatementUpper.startsWith("DEFAULT-ADJUST-RANGE=")){
          if(isTest) {continue;} //DEFAULT-ADJUST-RANGE=+30

          let invItemID = null;
          if(extraData.source == 'InvItem' || extraData.source == 'PropertyRune'){
            invItemID = extraData.invItemID;
          } else {
            displayError('Attempted to execute "DEFAULT-ADJUST-RANGE" from a non-item source');
            continue;
          }

          let modInfo = extraData.source;
          if(extraData.source == 'PropertyRune'){
            modInfo = extraData.sourceName;
          }

          let dataParts = wscStatement.split('=');
          addWeapMod(invItemID, dataParts[1], 'ADJUST-RANGE', modInfo);
          if(extraData.bagInvItemID != null){
            addWeapMod(extraData.bagInvItemID, dataParts[1], 'ADJUST-RANGE', 'AttachedItem');
          }

          continue;
        }

        if(wscStatementUpper.startsWith("DEFAULT-ADJUST-RELOAD=")){
          if(isTest) {continue;} //DEFAULT-ADJUST-RELOAD=-1

          let invItemID = null;
          if(extraData.source == 'InvItem' || extraData.source == 'PropertyRune'){
            invItemID = extraData.invItemID;
          } else {
            displayError('Attempted to execute "DEFAULT-ADJUST-RELOAD" from a non-item source');
            continue;
          }

          let modInfo = extraData.source;
          if(extraData.source == 'PropertyRune'){
            modInfo = extraData.sourceName;
          }

          let dataParts = wscStatement.split('=');
          addWeapMod(invItemID, dataParts[1], 'ADJUST-RELOAD', modInfo);
          if(extraData.bagInvItemID != null){
            addWeapMod(extraData.bagInvItemID, dataParts[1], 'ADJUST-RELOAD', 'AttachedItem');
          }

          continue;
        }

        if(wscStatementUpper.startsWith("DEFAULT-ADD-TRAIT=")){
          if(isTest) {continue;} //DEFAULT-ADD-TRAIT=Deadly d8

          let invItemID = null;
          if(extraData.source == 'InvItem' || extraData.source == 'PropertyRune'){
            invItemID = extraData.invItemID;
          } else {
            displayError('Attempted to execute "DEFAULT-ADD-TRAIT" from a non-item source');
            continue;
          }

          let modInfo = extraData.source;
          if(extraData.source == 'PropertyRune'){
            modInfo = extraData.sourceName;
          }

          let dataParts = wscStatement.split('=');
          //addWeapMod(invItemID, dataParts[1], 'ADD-TRAIT', modInfo);
          if(extraData.bagInvItemID != null){
            addWeapMod(extraData.bagInvItemID, dataParts[1], 'ADD-TRAIT', 'AttachedItem');
          }

          continue;
        }


        if(wscStatementUpper == "SET-FINESSE-MELEE-USE-DEX-DAMAGE"){
            if(isTest) {continue;}

            gState_hasFinesseMeleeUseDexDamage = true;

            continue;
        }

        if(wscStatementUpper == "SET-ARMORED-STEALTH"){
            if(isTest) {continue;}

            gState_armoredStealth = true;

            continue;
        }

        if(wscStatementUpper == "SET-MIGHTY-BULWARK"){
            if(isTest) {continue;}

            gState_mightyBulwark = true;

            continue;
        }

        if(wscStatementUpper == "SET-UNBURDENED-IRON"){
          if(isTest) {continue;}

          gState_unburdenedIron = true;

          continue;
        }

        if(wscStatementUpper == "SET-IMPROVISED-WEAPON-NO-PENALTY"){
          if(isTest) {continue;}

          gState_improvisedWeaponNoPenalty = true;

          continue;
        }

        if(wscStatementUpper == "SET-ADD-LEVEL-TO-UNTRAINED-WEAPONS"){
            if(isTest) {continue;}

            gState_addLevelToUntrainedWeaponAttack = true;

            continue;
        }

        if(wscStatementUpper == "SET-ADD-LEVEL-TO-UNTRAINED-SKILLS"){
            if(isTest) {continue;}

            gState_addLevelToUntrainedSkill = true;

            continue;
        }

        if(wscStatementUpper == "DISPLAY-COMPANION-TAB"){
            if(isTest) {continue;}

            gState_displayCompanionTab = true;

            continue;
        }

        // Could not identify wsc statement
        success = false;

    }

    // MiscFeats is run even on tests, which is how the code is run for character builder.
    //  - Probably should change this to a better system in the future.
    let miscFeatSuccess = processMiscFeatStatements(wscCode);
    if(!success && miscFeatSuccess) { success = true; }

    return success;

}


function getSheetProcNumber(strNum, sourceName){
  if(strNum == null) {
    displayError('Incorrect WSC syntax ('+sourceName+')(1-1): NaN error in sheet statement');
    return 0;
  }
  
  strNum = strNum.toUpperCase().trim();

  if(strNum.includes('HALF_LEVEL')) {
    strNum = strNum.replace(/HALF_LEVEL/g, Math.floor(g_character.level/2)+'');
  }
  if(strNum.includes('LEVEL')) {
    strNum = strNum.replace(/LEVEL/g, g_character.level+'');
  }

  if(strNum.includes('STR_MOD')) {
    strNum = strNum.replace(/STR_MOD/g, getModOfValue('STR'));
  }
  if(strNum.includes('DEX_MOD')) {
    strNum = strNum.replace(/DEX_MOD/g, getModOfValue('DEX'));
  }
  if(strNum.includes('CON_MOD')) {
    strNum = strNum.replace(/CON_MOD/g, getModOfValue('CON'));
  }
  if(strNum.includes('INT_MOD')) {
    strNum = strNum.replace(/INT_MOD/g, getModOfValue('INT'));
  }
  if(strNum.includes('WIS_MOD')) {
    strNum = strNum.replace(/WIS_MOD/g, getModOfValue('WIS'));
  }
  if(strNum.includes('CHA_MOD')) {
    strNum = strNum.replace(/CHA_MOD/g, getModOfValue('CHA'));
  }

  try {
    return parseInt(math.evaluate(strNum));
  } catch (err) {
    displayError('Incorrect WSC syntax ('+sourceName+')(1-2): NaN error in sheet statement');
    return 0;
  }
}