

const DATA_SOURCE = {
  ABILITY_BONUS: 'abilityBonus',
  OTHER_SPEED: 'otherSpeeds',
  RESISTANCE: 'resistance',
  WEAKNESS: 'vulnerability',
  INNATE_SPELL: 'innateSpell',
  LANGUAGE: 'languages',
  CLASS_FEATURE_CHOICE: 'classChoice',
  CLASS_ARCHETYPE_CHOICE: 'classArchetypeChoice',
  PROFICIENCY: 'proficiencies',
  LORE: 'loreCategories',
  CHAR_TRAIT: 'charTag',
  UNSELECTED_DATA: 'unselectedData',
  FEAT_CHOICE: 'chosenFeats',
  EXTRA_CLASS_FEATURE: 'classAbilityExtra',
  EXTRA_HERITAGE: 'heritageExtra',
  DOMAIN: 'domains',
  ADVANCED_DOMAIN: 'advancedDomains',
  FOCUS_SPELL: 'focusSpell',
  FOCUS_POINT: 'focusPoint',
  NOTES_FIELD: 'notesField',
  PHYSICAL_FEATURE: 'phyFeats',
  SENSE: 'senses',
  WEAPON_SPECIAL: 'weaponSpecialization',
  ARMOR_SPECIAL: 'armorSpecialization',
  WEAPON_CRIT_SPECIAL: 'weaponCriticalSpecialization',
  WEAPON_FAMILIARITY: 'weaponFamiliarity',
  SCFS: 'scfs',
};

let g_dataMap = null;

function initDataMap(charMetaData){
  g_dataMap = new Map();
  for(let metaData of charMetaData){

    // Don't load init class profs (for backwards compatibility with old builder).
    if(metaData.source == DATA_SOURCE.PROFICIENCY && metaData.sourceCode.startsWith('inits-') && metaData.sourceCode != 'inits-bonus-prof' && metaData.value.endsWith('Initial Class')){
      continue;
    }

    let srcStruct = {
      source: metaData.source+'',
      sourceType: metaData.sourceType+'',
      sourceLevel: metaData.sourceLevel+'',
      sourceCode: metaData.sourceCode+'',
      sourceCodeSNum: metaData.sourceCodeSNum+'',
    };
    g_dataMap.set(JSON.stringify(srcStruct), metaData.value);
  }
}

function setData(in_source, in_srcStruct, in_value, deleteSelfData=true){
  let new_srcStruct = parameterizeSrcStruct(in_source, in_srcStruct);
  deleteDataSNumChildren(new_srcStruct);

  if(deleteSelfData){
    for(const [JSON_srcStruct, value] of g_dataMap.entries()){
      let srcStruct = JSON.parse(JSON_srcStruct);
      if(srcStruct.sourceType == new_srcStruct.sourceType
          && srcStruct.sourceLevel == new_srcStruct.sourceLevel
          && srcStruct.sourceCode == new_srcStruct.sourceCode
          && srcStruct.sourceCodeSNum == new_srcStruct.sourceCodeSNum){
        g_dataMap.delete(JSON_srcStruct);
        deleteVarDataFromSrcStruct(JSON_srcStruct);
      }
    }
  }

  g_dataMap.set(JSON.stringify(new_srcStruct), in_value);
  displayStats();
}

function setDataOnly(in_source, in_srcStruct, in_value){
  g_dataMap.set(JSON.stringify(parameterizeSrcStruct(in_source, in_srcStruct)), in_value);
  displayStats();
}

function getDataSingle(in_source, in_srcStruct){
  let new_srcStruct = parameterizeSrcStruct(in_source, in_srcStruct);
  let value = cloneObj(g_dataMap.get(JSON.stringify(new_srcStruct)));
  
  // If value isn't set, default to build data (if character has one)
  if(value == null && g_buildInfo != null){
    let buildSrcStruct = g_buildInfo.buildData.find(buildSrcStruct => {
      // Check all srcStruct parts, including source
      return (buildSrcStruct.source == new_srcStruct.source 
        && buildSrcStruct.sourceType == new_srcStruct.sourceType 
        && buildSrcStruct.sourceLevel == new_srcStruct.sourceLevel 
        && buildSrcStruct.sourceCode == new_srcStruct.sourceCode
        && buildSrcStruct.sourceCodeSNum == new_srcStruct.sourceCodeSNum);
    });
    if(buildSrcStruct != null){
      value = buildSrcStruct.value;

      if(buildSrcStruct.value != null){
        g_dataMap.set(JSON.stringify(parameterizeSrcStruct(buildSrcStruct.source, buildSrcStruct)), buildSrcStruct.value);
        socket.emit("requestMetaDataSetOnly",
            g_char_id,
            buildSrcStruct.source,
            buildSrcStruct,
            buildSrcStruct.value);
      }

    }
  }

  new_srcStruct.value = value;
  return new_srcStruct;
}

function getDataAll(in_source){
  let dataArray = [];
  for(const [JSON_srcStruct, value] of g_dataMap.entries()){
    let newStruct = JSON.parse(JSON_srcStruct);
    if(newStruct.source == in_source){
      newStruct.value = value;
      dataArray.push(newStruct);
    }
  }
  return dataArray;
}

// Delete Data //
function deleteVarDataFromSrcStruct(JSON_srcStruct, varType=null){
  for(let [varName, varData] of g_variableMap.entries()){
    if(varType != null && varData.Type != varType) { continue; }

    if(varData.Type == VAR_TYPE.INTEGER){
      varData.Bonuses.delete(JSON_srcStruct);
    } else if(varData.Type == VAR_TYPE.STRING){
      varData.Extras.delete(JSON_srcStruct);
    } else if(varData.Type == VAR_TYPE.ABILITY_SCORE){
      varData.Value.Bonuses.delete(JSON_srcStruct);
    } else if(varData.Type == VAR_TYPE.PROFICIENCY){
      varData.Value.RankHistory.delete(JSON_srcStruct);
    }

  }
}

function deleteData(in_source, in_srcStruct){
  deleteDataSNumChildren(in_srcStruct);
  deleteDataOnly(in_source, in_srcStruct);
}

function deleteDataOnly(in_source, in_srcStruct){
  g_dataMap.delete(JSON.stringify(parameterizeSrcStruct(in_source, in_srcStruct)));
  deleteVarDataFromSrcStruct(JSON.stringify(parameterizeSrcStruct(in_source, in_srcStruct)));
  displayStats();
}

function deleteDataBySourceStruct(in_srcStruct){
  deleteDataSNumChildren(in_srcStruct);
  for(const [JSON_srcStruct, value] of g_dataMap.entries()){
    let srcStruct = JSON.parse(JSON_srcStruct);
    if(srcStruct.sourceType == in_srcStruct.sourceType
        && srcStruct.sourceLevel == in_srcStruct.sourceLevel
        && srcStruct.sourceCode == in_srcStruct.sourceCode
        && srcStruct.sourceCodeSNum == in_srcStruct.sourceCodeSNum){
      g_dataMap.delete(JSON_srcStruct);
      deleteVarDataFromSrcStruct(JSON_srcStruct);
    }
  }
  displayStats();
}

function deleteDataSNumChildren(in_srcStruct){
  for(const [JSON_srcStruct, value] of g_dataMap.entries()){
    let srcStruct = JSON.parse(JSON_srcStruct);
    if(srcStruct.sourceCodeSNum.endsWith(in_srcStruct.sourceCodeSNum)
        && srcStruct.sourceCodeSNum != in_srcStruct.sourceCodeSNum
        && srcStruct.sourceType == in_srcStruct.sourceType
        && srcStruct.sourceLevel == in_srcStruct.sourceLevel
        && srcStruct.sourceCode == in_srcStruct.sourceCode){
      g_dataMap.delete(JSON_srcStruct);
      deleteVarDataFromSrcStruct(JSON_srcStruct);
    }
  }
  displayStats();
}

function deleteDataBySource(in_source){
  for(const [JSON_srcStruct, value] of g_dataMap.entries()){
    let srcStruct = JSON.parse(JSON_srcStruct);
    if(srcStruct.source == in_source){
      g_dataMap.delete(JSON_srcStruct);
      deleteVarDataFromSrcStruct(JSON_srcStruct);
    }
  }
  displayStats();
}

function deleteDataBySourceType(in_sourceType){
  for(const [JSON_srcStruct, value] of g_dataMap.entries()){
    let srcStruct = JSON.parse(JSON_srcStruct);
    if(srcStruct.sourceType == in_sourceType){
      g_dataMap.delete(JSON_srcStruct);
      deleteVarDataFromSrcStruct(JSON_srcStruct);
    }
  }
  displayStats();
}

function deleteDataBySourceAndType(in_source, in_sourceType){
  for(const [JSON_srcStruct, value] of g_dataMap.entries()){
    let srcStruct = JSON.parse(JSON_srcStruct);
    if(srcStruct.source == in_source && srcStruct.sourceType == in_sourceType){
      g_dataMap.delete(JSON_srcStruct);
      deleteVarDataFromSrcStruct(JSON_srcStruct);
    }
  }
  displayStats();
}

function deleteDataByGreaterThanSourceLevel(in_level){
  for(const [JSON_srcStruct, value] of g_dataMap.entries()){
    let srcStruct = JSON.parse(JSON_srcStruct);
    if(srcStruct.sourceLevel > in_level){
      g_dataMap.delete(JSON_srcStruct);
      deleteVarDataFromSrcStruct(JSON_srcStruct);
    }
  }
  displayStats();
}

function deleteDataBySourceCode(in_sourceCode){
  for(const [JSON_srcStruct, value] of g_dataMap.entries()){
    let srcStruct = JSON.parse(JSON_srcStruct);
    if(srcStruct.sourceCode == in_sourceCode){
      g_dataMap.delete(JSON_srcStruct);
      deleteVarDataFromSrcStruct(JSON_srcStruct);
    }
  }
  displayStats();
}