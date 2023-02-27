

function setDataProficiencies(srcStruct, fFor, tTo, prof, sourceName, deleteSelfData=true){

  // Data-Map
  let value = fFor+getSeparator()+tTo+getSeparator()+prof+getSeparator()+sourceName;
  setData(DATA_SOURCE.PROFICIENCY, srcStruct, value, deleteSelfData);

  // Variable-Processing
  let varName = profConversion_convertOldNameToVarName(tTo);
  variables_addRank(varName, prof, sourceName, JSON.stringify(parameterizeSrcStruct(DATA_SOURCE.PROFICIENCY, srcStruct)));

  displayStats();

}

function getDataSingleProficiency(srcStruct){
  let data = getDataSingle(DATA_SOURCE.PROFICIENCY, srcStruct);
  if(data.value != null){
    let vParts = data.value.split(getSeparator());
    data.For = vParts[0];
    data.To = vParts[1];
    data.Prof = vParts[2];
    if(vParts.length == 4){ data.SourceName = vParts[3]; } else { data.SourceName = 'Unknown'; }
  }
  return data;
}

function getDataAllProficiencies(){
  let dataArray = getDataAll(DATA_SOURCE.PROFICIENCY);
  for(let data of dataArray){
    let vParts = data.value.split(getSeparator());
    data.For = vParts[0];
    data.To = vParts[1];
    data.Prof = vParts[2];
    if(vParts.length == 4){ data.SourceName = vParts[3]; } else { data.SourceName = 'Unknown'; }
  }
  return dataArray;
}

//

function setDataAbilityBonus(srcStruct, ability, bonus){

  // Data-Map
  let value = ability+getSeparator()+bonus;
  setData(DATA_SOURCE.ABILITY_BONUS, srcStruct, value);

  // Variable-Processing
  if(bonus == 'Boost'){
    variables_addToBonuses('SCORE_'+ability, 2, JSON.stringify(parameterizeSrcStruct(DATA_SOURCE.ABILITY_BONUS, srcStruct)), 'Metadata');
  } else if(bonus == 'Flaw'){
    variables_addToBonuses('SCORE_'+ability, -2, JSON.stringify(parameterizeSrcStruct(DATA_SOURCE.ABILITY_BONUS, srcStruct)), 'Metadata');
  } else {
    variables_addToBonuses('SCORE_'+ability, parseInt(bonus), JSON.stringify(parameterizeSrcStruct(DATA_SOURCE.ABILITY_BONUS, srcStruct)), 'Metadata');
  }

  displayStats();

}

function getDataSingleAbilityBonus(srcStruct){
  let dataValue = getDataSingle(DATA_SOURCE.ABILITY_BONUS, srcStruct);
  if(dataValue != null && dataValue.value != null) {
    let vParts = dataValue.value.split(getSeparator());
    return { Ability: vParts[0], Bonus: vParts[1] };
  } else {
    return null;
  }
}

function getDataAllAbilityBonus(){
  let dataArray = getDataAll(DATA_SOURCE.ABILITY_BONUS);
  for(let data of dataArray){
    let vParts = data.value.split(getSeparator());
    data.Ability = vParts[0];
    data.Bonus = vParts[1];
  }
  return dataArray;
}

//

function setDataClassChoice(srcStruct, selectorID, optionID){
  let value = selectorID+getSeparator()+optionID;
  setData(DATA_SOURCE.CLASS_FEATURE_CHOICE, srcStruct, value);
}

function getDataAllClassChoice(){
  let dataArray = getDataAll(DATA_SOURCE.CLASS_FEATURE_CHOICE);
  for(let data of dataArray){
    let vParts = data.value.split(getSeparator());
    data.SelectorID = vParts[0];
    data.OptionID = vParts[1];
  }
  return dataArray;
}

function getDataSingleClassChoice(srcStruct){
  let data = getDataSingle(DATA_SOURCE.CLASS_FEATURE_CHOICE, srcStruct);
  if(data != null && data.value != null) {
    let vParts = data.value.split(getSeparator());
    data.SelectorID = vParts[0];
    data.OptionID = vParts[1];
    return data;
  } else {
    return null;
  }
}

//

function setDataInnateSpell(srcStruct, spellID, spellLevel, spellTradition, timesPerDay){
  let value = spellID+getSeparator()+spellLevel+getSeparator()+spellTradition+getSeparator()+timesPerDay+getSeparator()+'CHA';
      /*
          "You use your Charisma modifier as your spellcasting ability
          modifier for innate spells unless otherwise specified."
      */
  setData(DATA_SOURCE.INNATE_SPELL, srcStruct, value);
}

function getDataSingleInnateSpell(srcStruct){
  let data = getDataSingle(DATA_SOURCE.INNATE_SPELL, srcStruct);
  if(data.value != null){
    let vParts = data.value.split(getSeparator());
    data.SpellID = vParts[0];
    data.SpellLevel = vParts[1];
    data.SpellTradition = vParts[2];
    data.TimesPerDay = vParts[3];
    data.KeyAbility = vParts[4];
  }
  return data;
}

function getDataAllInnateSpell(){
  let dataArray = getDataAll(DATA_SOURCE.INNATE_SPELL);
  for(let data of dataArray){
    let vParts = data.value.split(getSeparator());
    data.SpellID = vParts[0];
    data.SpellLevel = vParts[1];
    data.SpellTradition = vParts[2];
    data.TimesPerDay = vParts[3];
    data.KeyAbility = vParts[4];
  }
  return dataArray;
}

//

function setDataLanguage(srcStruct, langID){

  // Data-Map
  setDataOnly(DATA_SOURCE.LANGUAGE, srcStruct, langID);

  // Variable-Processing
  variables_addToExtras(VARIABLE.LANGUAGES, langID, JSON.stringify(parameterizeSrcStruct(DATA_SOURCE.LANGUAGE, srcStruct)), 'Metadata');

  displayStats();

}

function getDataAllLanguage(){
  return getDataAll(DATA_SOURCE.LANGUAGE);
}

//

function setDataResistance(srcStruct, resistType, resistAmount){
  let value = resistType+getSeparator()+resistAmount;

  // Data-Map
  setData(DATA_SOURCE.RESISTANCE, srcStruct, value);

  // Variable-Processing
  variables_addToExtras(VARIABLE.RESISTANCES, value, JSON.stringify(parameterizeSrcStruct(DATA_SOURCE.RESISTANCE, srcStruct)), 'Metadata');

  displayStats();

}

function getDataAllResistance(){
  let dataArray = getDataAll(DATA_SOURCE.RESISTANCE);
  for(let data of dataArray){
    let vParts = data.value.split(getSeparator());
    data.Type = vParts[0];
    data.Amount = vParts[1];
  }
  return dataArray;
}

//

function setDataVulnerability(srcStruct, vulnerableType, vulnerableAmount){
  let value = vulnerableType+getSeparator()+vulnerableAmount;

  // Data-Map
  setData(DATA_SOURCE.WEAKNESS, srcStruct, value);

  // Variable-Processing
  variables_addToExtras(VARIABLE.WEAKNESSES, value, JSON.stringify(parameterizeSrcStruct(DATA_SOURCE.WEAKNESS, srcStruct)), 'Metadata');

  displayStats();

}

function getDataAllVulnerability(){
  let dataArray = getDataAll(DATA_SOURCE.WEAKNESS);
  for(let data of dataArray){
    let vParts = data.value.split(getSeparator());
    data.Type = vParts[0];
    data.Amount = vParts[1];
  }
  return dataArray;
}

//

function setDataOtherSpeed(srcStruct, speedType, speedAmount){
  let value = speedType+getSeparator()+speedAmount;
  setData(DATA_SOURCE.OTHER_SPEED, srcStruct, value);
}

function getDataAllOtherSpeed(){
  let dataArray = getDataAll(DATA_SOURCE.OTHER_SPEED);
  for(let data of dataArray){
    let vParts = data.value.split(getSeparator());
    data.Type = vParts[0];
    data.Amount = vParts[1];
  }
  return dataArray;
}

//

function getDataAllExtraClassFeature(){
  let dataArray = getDataAll(DATA_SOURCE.EXTRA_CLASS_FEATURE);
  for(let data of dataArray){
    let vParts = data.value.split(getSeparator());
    data.FeatureID = vParts[0];
    data.DontRunCode = vParts[1];
    if(data.DontRunCode == null) { data.DontRunCode = false; }
  }
  return dataArray;
}

//

function getSeparator(){
  return ':::';
}