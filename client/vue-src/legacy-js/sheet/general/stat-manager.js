/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

//let g_statManagerMap = null;
//let g_conditionalStatManagerMap = null;

// key(name) value([ {Source, Value}, {Source, Value} ])
/*
        Keys
        'SCORE_STR'
        'SAVE_FORT'

        Values
        'BASE' -> Number

        'PROF_BONUS' -> NumUps

        'USER_BONUS' -> Number
        'CIRCUM_BONUS' -> Number
        'STATUS_BONUS' -> Number
        'ITEM_BONUS' -> Number
        'OTHER-(SRC-NAME)_BONUS' -> Number

        'USER_PENALTY' -> Number
        'CIRCUM_PENALTY' -> Number
        'STATUS_PENALTY' -> Number
        'ITEM_PENALTY' -> Number
        'OTHER-(SRC-NAME)_PENALTY' -> Number

        'MODIFIER' -> 'STR'/'DEX'/'CON'/'INT'/'WIS'/'CHA'

*/

function initStats(){
  //g_statManagerMap = new Map();
  //g_conditionalStatManagerMap = new Map();
}

function addStat(statName, type, value){
  addStatAndSrc(statName, type, value, 'CORE');
}

function addStatAndSrc(statName, type, value, source){
  statName = statName.replace(/\s/g, "_").toUpperCase();

  // Don't add to map, just increase
  if(statName == 'HEALTH') {
    console.log(type);
    if(type.includes('_BONUS')) { g_character.currentHealth += value; }
    if(type.includes('_PENALTY')) { g_character.currentHealth -= value; }
    if(!type.includes('_BONUS') && !type.includes('_PENALTY')) { g_character.currentHealth = value; }
    socket.emit("requestCurrentHitPointsSave",
        getCharIDFromURL(),
        g_character.currentHealth);
    sendOutUpdateToGM('hp', { value: g_character.currentHealth });
    initHealthPointsAndMore();
    return;
  } else if(statName == 'TEMP_HEALTH'){
    if(type.includes('_BONUS')) { g_character.tempHealth += value; }
    if(type.includes('_PENALTY')) { g_character.tempHealth -= value; }
    if(!type.includes('_BONUS') && !type.includes('_PENALTY')) { g_character.tempHealth = value; }
    socket.emit("requestTempHitPointsSave",
        getCharIDFromURL(),
        g_character.tempHealth);
    sendOutUpdateToGM('temp-hp', { value: g_character.tempHealth });
    initHealthPointsAndMore();
    return;
  }

  variables_addToBonuses(statName, value, type, source);
}

/*
function removeStat(statName, source){
    statName = statName.replace(/\s/g, "_").toUpperCase();
    let statDataMap = g_statManagerMap.get(statName);
    if(statDataMap != null){
        statDataMap.delete(source);
    }
}

function removeStat(statName){
    statName = statName.replace(/\s/g, "_").toUpperCase();
    g_statManagerMap.delete(statName);
}*/

function getStat(statName, type){
  statName = statName.replace(/\s/g, "_").toUpperCase();
  let value = variables_getBonus(statName, type);
  if(value === 'LAND_SPEED'){
    value = getStatTotal(VARIABLE.SPEED);
  }
  return value;
}

function getStatTotal(statName, errorOnFailure=true){
  statName = statName.replace(/\s/g, "_").toUpperCase();
  return variables_getTotal(statName, errorOnFailure);
}

function getStatBonusTotal(statName){
  statName = statName.replace(/\s/g, "_").toUpperCase();
  let bonusTotal = variables_getBonusTotal(statName);
  if(bonusTotal == 0){ return null; } else { return bonusTotal; }
}

function getStatExtraBonuses(statName){
    statName = statName.replace(/\s/g, "_").toUpperCase();
    /*
    let extraBonuses = null;
    let statDataMap = g_statManagerMap.get(statName);
    if(statDataMap != null){
        extraBonuses = [];
        for(const [source, valueData] of statDataMap.entries()){
            if(source != 'PROF_BONUS' && source != 'MODIFIER' && source != 'BASE' && valueData.Value != 0){
                let cleanedSource = source.replace(/_/g, " ").toLowerCase();
                if(cleanedSource.startsWith('other-')){
                    if(cleanedSource.includes('bonus')){
                        cleanedSource = 'bonus';
                    } else if(cleanedSource.includes('penalty')){
                        cleanedSource = 'penalty';
                    }
                }
                let statSource = (valueData.Src == 'CORE') ? null : capitalizeWords(valueData.Src);
                if(statSource != null) {
                    extraBonuses.push(signNumber(valueData.Value)+' '+cleanedSource+' from '+statSource);
                } else {
                    extraBonuses.push(signNumber(valueData.Value)+' '+cleanedSource);
                }
            }
        }
    }*/
    let extraBonuses = null;
    let map = variables_getBonusesMap(statName);
    if(map != null){
      extraBonuses = [];
      for(let [type, valueData] of map){
        if(valueData.Value != 0){
          let cleanedType = type.replace(/_/g, " ").toLowerCase();
          if(cleanedType.startsWith('other-')){
            if(cleanedType.includes('bonus')){
              cleanedType = 'bonus';
            } else if(cleanedType.includes('penalty')){
              cleanedType = 'penalty';
            }
          }
          if(valueData.Src != 'CORE') {
            extraBonuses.push(signNumber(valueData.Value)+' '+cleanedType+' from '+capitalizeWords(valueData.Src));
          } else {
            extraBonuses.push(signNumber(valueData.Value)+' '+cleanedType);
          }
        }
      }
    }
    return extraBonuses;
}

function getStatMap(statName){
    statName = statName.replace(/\s/g, "_").toUpperCase();
    return variables_getBonusesMap(statName);
}

function getModOfValue(valueModName, errorOnFailure=true){
    if(valueModName == null){ return 0; }
    valueModName = valueModName+''; // Convert to string, in case a num is passed
    valueModName = valueModName.toUpperCase();
    switch(valueModName) {
        case 'STR':
            return getMod(getStatTotal(VARIABLE.SCORE_STR, errorOnFailure));
        case 'DEX':
            return getMod(getStatTotal(VARIABLE.SCORE_DEX, errorOnFailure));
        case 'CON':
            return getMod(getStatTotal(VARIABLE.SCORE_CON, errorOnFailure));
        case 'INT':
            return getMod(getStatTotal(VARIABLE.SCORE_INT, errorOnFailure));
        case 'WIS':
            return getMod(getStatTotal(VARIABLE.SCORE_WIS, errorOnFailure));
        case 'CHA':
            return getMod(getStatTotal(VARIABLE.SCORE_CHA, errorOnFailure));

        case 'PRE_STR':
            return getMod(g_preConditions_strScore);
        case 'PRE_DEX':
            return getMod(g_preConditions_dexScore);
        case 'PRE_CON':
            return getMod(g_preConditions_conScore);
        case 'PRE_INT':
            return getMod(g_preConditions_intScore);
        case 'PRE_WIS':
            return getMod(g_preConditions_wisScore);
        case 'PRE_CHA':
            return getMod(g_preConditions_chaScore);
        default:
            return null;
    }
}


// Conditionals //

function addConditionalStat(statName, condition, source){
  statName = statName.replace(/\s/g, "_").toUpperCase();
  variables_addToConditionals(statName, condition, source);
}

/*
function removeConditionalStat(statName, condition){
    statName = statName.replace(/\s/g, "_").toUpperCase();
    let statDataMap = g_conditionalStatManagerMap.get(statName);
    if(statDataMap != null){
        statDataMap.delete(condition);
    }
}

function removeConditionalStat(statName){
    statName = statName.replace(/\s/g, "_").toUpperCase();
    g_conditionalStatManagerMap.delete(statName);
}

function getConditionalStat(statName, condition){
    statName = statName.replace(/\s/g, "_").toUpperCase();
    let statDataMap = g_conditionalStatManagerMap.get(statName);
    if(statDataMap != null){
        return statDataMap.get(condition);
    } else {
        return null;
    }
}*/

function getConditionalStatMap(statName){
  statName = statName.replace(/\s/g, "_").toUpperCase();
  let map = variables_getConditionalsMap(statName);
  if(map == null){
    return new Map();
  } else {
    return map;
  }
}

function hasConditionals(statName){
  statName = statName.replace(/\s/g, "_").toUpperCase();
  return variables_hasConditionals(statName);
}