
function getProfMap(){

  let profMap = new Map();
  for(const profData of getDataAllProficiencies()){

    // Convert lores to be the same
    if(profData.To.includes('_LORE')){
      profData.To = capitalizeWords(profData.To.replace('_LORE',' Lore'));
    }

    let profMapValue = profMap.get(profData.To);
    if(profMapValue != null){
      profMapValue.push(profData);
      profMap.set(profData.To, profMapValue);
    } else {
      profMap.set(profData.To, [profData]);
    }

  }
  return profMap;

}

function getCharClass(){
  let classStruct = cloneObj(g_classMap.get(g_character.classID+''));
  if(classStruct == null){ return null; }

  // Add support for Free Archetype Variant if enabled...
  if(gOption_hasFreeArchetype){
    classStruct = addFreeArchetypeVariant(classStruct);
  }

  // Add support for Auto Bonus Progression Variant if enabled...
  if(gOption_hasAutoBonusProgression){
    classStruct = addAutoBonusProgressionVariant(classStruct);
  }

  // Add support for Gradual Ability Boosts Variant if enabled...
  if(gOption_hasGradualAbilityBoosts){
    classStruct = addGradualAbilityBoostsVariant(classStruct);
  }

  return classStruct;
}
function getCharAncestry(){
  return cloneObj(g_ancestryMap.get(g_character.ancestryID+''));
}
function getCharHeritage(){
  if(g_character.heritageID != null){
    let ancestry = getCharAncestry();
    if(ancestry != null){
      return cloneObj(ancestry.Heritages.find(heritage => {
        return heritage.id == g_character.heritageID;
      }));
    } else {
      return null;
    }
  } else if(g_character.uniHeritageID != null){
    return cloneObj(g_uniHeritages.find(uniHeritage => {
      return uniHeritage.id == g_character.uniHeritageID;
    }));
  } else {
    return null;
  }
}
function getCharBackground(){
  if(g_character.backgroundID == null) { return null; }
  return cloneObj(g_backgrounds.find(background => {
    return background.id == g_character.backgroundID;
  }));
}



