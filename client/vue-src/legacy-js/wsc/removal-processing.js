/* Copyright (C) 2022, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

/* Requires:

  g_featMap
  g_spellMap
  g_itemMap

  g_classMap || (g_classDetails.Abilities && g_allClassAbilityOptions && g_extraClassAbilities)

*/

function processRemovalStatements(code, codeName, bundleID){
  if(code == null) {return;}

  let allStatements = code.split(/\n/);

  let success = allStatements.length > 0;
  for(let statementRaw of allStatements){
    // Test/Check Statement for Expressions //
    let wscStatement = testExpr(statementRaw);
    if(wscStatement == null) {continue;}
    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
    let wscStatementUpper = wscStatement.toUpperCase();

    if(wscStatementUpper.includes("REMOVAL-FEAT-NAME=")){

      let name = wscStatementUpper.split('=')[1].trim();
      removalFeat(name, codeName, bundleID);

      continue;
    }

    if(wscStatementUpper.includes("REMOVAL-ITEM-NAME=")){

      let name = wscStatementUpper.split('=')[1].trim();
      removalItem(name, codeName, bundleID);

      continue;
    }

    if(wscStatementUpper.includes("REMOVAL-SPELL-NAME=")){

      let name = wscStatementUpper.split('=')[1].trim();
      removalSpell(name, codeName, bundleID);

      continue;
    }

    if(wscStatementUpper.includes("REMOVAL-CLASS-FEATURE-NAME=")){

      let name = wscStatementUpper.split('=')[1].trim();
      removalClassFeature(name, codeName, bundleID);

      continue;
    }

    // Could not identify wsc statement
    success = false;
  }
  return success;
}

function removalFeat(name, codeName, bundleID){

  for(const [featID, featStruct] of g_featMap.entries()){
    if(featStruct?.Feat?.name?.toUpperCase().trim() === name){

      if(bundleID){
        if(featStruct.Feat.homebrewID+'' !== bundleID+''){
          g_featMap.delete(featID);
        }
      } else {
        if(featStruct.Feat.contentSrc !== codeName){
          g_featMap.delete(featID);
        }
      }

    }
  }

}

function removalSpell(name, codeName, bundleID){

  for(const [spellID, spellStruct] of g_spellMap.entries()){
    if(spellStruct?.Spell?.name?.toUpperCase().trim() === name){

      if(bundleID){
        if(spellStruct.Spell.homebrewID+'' !== bundleID+''){
          g_spellMap.delete(spellID);
        }
      } else {
        if(spellStruct.Spell.contentSrc !== codeName){
          g_spellMap.delete(spellID);
        }
      }

    }
  }

}

function removalItem(name, codeName, bundleID){

  for(const [itemID, itemStruct] of g_itemMap.entries()){
    if(itemStruct?.Item?.name?.toUpperCase().trim() === name){

      if(bundleID){
        if(itemStruct.Item.homebrewID+'' !== bundleID+''){
          g_itemMap.delete(itemID);
        }
      } else {
        if(itemStruct.Item.contentSrc !== codeName){
          g_itemMap.delete(itemID);
        }
      }

    }
  }

}

function removalClassFeature(name, codeName, bundleID){

  let searchAndRemoveClassFeature = function(abilityArray, insideValue=false){
    if(abilityArray == null) { return; }
    for(let i = 0; i < abilityArray.length; i++){
      let classFeature = abilityArray[i];
      if(insideValue){
        classFeature = classFeature.value;
      }

      if(classFeature?.name?.toUpperCase().trim() === name){

        if(bundleID){
          if(classFeature.homebrewID+'' !== bundleID+''){
            abilityArray.splice(i, 1);
          }
        } else {
          if(classFeature.contentSrc !== codeName){
            abilityArray.splice(i, 1);
          }
        }

      }

    }
  };


  if(isSheetPage()){

    searchAndRemoveClassFeature(g_classDetails.Abilities);
    searchAndRemoveClassFeature(g_allClassAbilityOptions);
    searchAndRemoveClassFeature(g_extraClassAbilities, true);

  } else {

    for(const [classID, classStruct] of g_classMap.entries()){
      searchAndRemoveClassFeature(classStruct.Abilities);
    }

  }

}




