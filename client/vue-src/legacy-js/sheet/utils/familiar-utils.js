/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

let g_familiarAbilitiesMap = new Map();

function processFamiliarAbilities(charFamiliar){
  if(charFamiliar.abilitiesJSON == null) { return; }
  let abilitiesArray = [];
  let abilityNamesArray = JSON.parse(charFamiliar.abilitiesJSON);
  for(let abilityName of abilityNamesArray) {
    let famAbility = g_companionData.AllFamiliarAbilities.find(famAbility => {
      return famAbility.name === abilityName;
    });
    if(famAbility != null){
      abilitiesArray.push(famAbility);
    }
  }
  g_familiarAbilitiesMap.set(charFamiliar.id, abilitiesArray);
  processFamiliarAbilityCode(charFamiliar.id, abilitiesArray);
}

// Familiar Abilities - Code //
let g_familiarSpeedsMap = new Map();
let g_familiarSensesMap = new Map();
let g_familiarHPMap = new Map();

let temp_charFamiliarID = null;
function processFamiliarAbilityCode(charFamiliarID, abilitiesArray){
  temp_charFamiliarID = charFamiliarID;

  g_familiarSpeedsMap.set(temp_charFamiliarID, []);
  g_familiarSensesMap.set(temp_charFamiliarID, []);
  g_familiarHPMap.set(temp_charFamiliarID, []);

  for(let ability of abilitiesArray){
    let abilCode = ability.code;
    if(abilCode == null) { continue; }
    
    let regexFamSpeed = /FAMILIAR-GIVE-SPEED=(.+)/ig; // FAMILIAR-GIVE-SPEED=swim 25
    abilCode = abilCode.replace(regexFamSpeed, handleFamiliarSpeed);

    let regexFamSense = /FAMILIAR-GIVE-SENSE=(.+)/ig; // FAMILIAR-GIVE-SENSE=darkvision
    abilCode = abilCode.replace(regexFamSense, handleFamiliarSense);

    let regexFamMaxHP = /FAMILIAR-GIVE-MAX-HP=(\d+)/ig; // FAMILIAR-GIVE-MAX-HP=2
    abilCode = abilCode.replace(regexFamMaxHP, handleFamiliarMaxHP);

    processSheetCode(abilCode, {
      source: 'Familiar',
      sourceName: ability.name+' Familiar Ability',
      charFamiliarID: charFamiliarID,
      familiarAbilityID: ability.id,
    });

    // Handle NoteField Statements //
    let noteFieldSrcStruct = {
      sourceType: 'familiar',
      sourceLevel: 0,
      sourceCode: 'familiarAbility-'+charFamiliarID+'-'+ability.id,
      sourceCodeSNum: 'a',
    };
    let rNoteField = abilCode.match(/GIVE-NOTES-FIELD=(.+)/i);
    if(rNoteField != null){
      socket.emit("requestNotesFieldChange",
          getCharIDFromURL(),
          noteFieldSrcStruct,
          rNoteField[1],
          null);
    } else {
      socket.emit("requestNotesFieldDelete",
          getCharIDFromURL(),
          noteFieldSrcStruct);
    }

  }

}

function handleFamiliarSpeed(match, innerText){
  let speedArray = g_familiarSpeedsMap.get(temp_charFamiliarID);
  if(speedArray != null){
    speedArray.push(innerText);
    g_familiarSpeedsMap.set(temp_charFamiliarID, speedArray);
  }
  return '';
}

function handleFamiliarSense(match, innerText){
  let senseArray = g_familiarSensesMap.get(temp_charFamiliarID);
  if(senseArray != null){
    senseArray.push(innerText);
    g_familiarSensesMap.set(temp_charFamiliarID, senseArray);
  }
  return '';
}

function handleFamiliarMaxHP(match, innerText){
  let hpArray = g_familiarHPMap.get(temp_charFamiliarID);
  if(hpArray != null){
    hpArray.push(parseInt(innerText));
    g_familiarHPMap.set(temp_charFamiliarID, hpArray);
  }
  return '';
}

////

function getFamiliarMaxHealth(charFamiliar){
  let hpArray = g_familiarHPMap.get(charFamiliar.id);
  let hpIncrease = 5;
  if(hpArray != null){
    for(let hp of hpArray){
      hpIncrease += hp;
    }
  }
  return g_character.level * hpIncrease;
}

////

function getFamiliarAC(){
  // Remove circumstance or status bonuses / penalties
  /*
    CIRCUM_BONUS, STATUS_BONUS, CIRCUM_PENALTY, STATUS_PENALTY
  */
  let totalAC = g_calculatedStats.totalAC;
  let statMap = getStatMap(VARIABLE.AC);

  let removalMod = 0;

  let stat_circumBonus = statMap.get('CIRCUM_BONUS');
  if(stat_circumBonus != null) { removalMod += stat_circumBonus.Value; }

  let stat_statusBonus = statMap.get('STATUS_BONUS');
  if(stat_statusBonus != null) { removalMod += stat_statusBonus.Value; }

  let stat_circumPenalty = statMap.get('CIRCUM_PENALTY');
  if(stat_circumPenalty != null) { removalMod += stat_circumPenalty.Value; }

  let stat_statusPenalty = statMap.get('STATUS_PENALTY');
  if(stat_statusPenalty != null) { removalMod += stat_statusPenalty.Value; }

  // Account for clumsy condition which could lower AC
  let dexModChange = 0;
  if(getStatTotal(VARIABLE.SCORE_DEX) != g_preConditions_dexScore){
    let dexCap = getStatBonusTotal(VARIABLE.DEX_CAP);

    let pre_dexMod = getMod(g_preConditions_dexScore);
    let pre_dexModCapped = (dexCap != null) ? ((pre_dexMod > dexCap) ? dexCap : pre_dexMod) : pre_dexMod;

    let dexMod = getMod(getStatTotal(VARIABLE.SCORE_DEX));
    let dexModCapped = (dexCap != null) ? ((dexMod > dexCap) ? dexCap : dexMod) : dexMod;

    dexModChange = pre_dexModCapped - dexModCapped;
  }

  return totalAC - removalMod + dexModChange;
}

function getFamiliarSpellBonus(){
  let levelBonus = g_character.level;
  if(gOption_hasProfWithoutLevel) { levelBonus = 0; }
  if(g_spellBookArray != null && g_spellBookArray.length > 0){
    let spellKeyAbility = g_spellBookArray[0].SpellKeyAbility;
    if(spellKeyAbility == 'STR'){
      return levelBonus + getMod(g_preConditions_strScore);
    } else if(spellKeyAbility == 'DEX'){
      return levelBonus + getMod(g_preConditions_dexScore);
    } else if(spellKeyAbility == 'CON'){
      return levelBonus + getMod(g_preConditions_conScore);
    } else if(spellKeyAbility == 'INT'){
      return levelBonus + getMod(g_preConditions_intScore);
    } else if(spellKeyAbility == 'WIS'){
      return levelBonus + getMod(g_preConditions_wisScore);
    } else if(spellKeyAbility == 'CHA'){
      return levelBonus + getMod(g_preConditions_chaScore);
    }
  }
  return levelBonus + getMod(g_preConditions_chaScore);
}

function getFamiliarMiscBonus(){
  if(gOption_hasProfWithoutLevel) {
    return 0;
  } else {
    return g_character.level;
  }
}

function getFamiliarFortBonus(){
  return getStatTotal(VARIABLE.SAVE_FORT);
}
function getFamiliarReflexBonus(){
  return getStatTotal(VARIABLE.SAVE_REFLEX);
}
function getFamiliarWillBonus(){
  return getStatTotal(VARIABLE.SAVE_WILL);
}

function getFamiliarPerception(){
  return getFamiliarSpellBonus();
}

function getFamiliarAcrobatics(){
  return getFamiliarSpellBonus();
}

function getFamiliarStealth(){
  return getFamiliarSpellBonus();
}

////

function getFamiliarSize(){
  return 'TINY';
}

function getFamiliarSense(charFamiliar){
  let senseArray = g_familiarSensesMap.get(charFamiliar.id);
  let senseText = 'low-light vision, empathy (1 mile, only to you)';
  if(senseArray != null){
    for(let sense of senseArray){
      sense = sense.toLowerCase();
      if(sense.includes('vision')) {
        senseText = senseText.replace('low-light vision, ', sense+', ');
      } else {
        senseText += ', '+sense;
      }
    }
  }
  return senseText;
}

function getFamiliarSpeed(charFamiliar){
  let speedArray = g_familiarSpeedsMap.get(charFamiliar.id);
  let speedText = '25';
  if(speedArray != null){
    for(let speed of speedArray){
      speedText += ', '+speed;
    }
  }
  return speedText;
}



function getFamiliarSpecificStruct(specificType){
  
  let familiarStruct = g_companionData.AllSpecificFamiliars.find(struct => {
    return struct.specificType === specificType;
  });
  if(familiarStruct == null) {return null;}

  return {
    SpecificType: familiarStruct.specificType,
    Name: familiarStruct.name,
    Alignment: familiarStruct.alignment,
    Tags: JSON.parse(familiarStruct.tagsJSON),
    Description: familiarStruct.description,
    NumAbils: familiarStruct.numAbils,
    AbilsJSON: familiarStruct.abilsJSON,
    ExtraAbils: JSON.parse(familiarStruct.extraAbils)
  };

}

function displayFamiliarTraits(content, specificStruct){
  if(specificStruct == null) {return;}
  let tagsInnerHTML = '<div class="columns is-centered is-marginless"><div class="column is-9 is-paddingless"><div class="buttons is-marginless is-centered">';
  for(const tag of specificStruct.Tags){
    tagsInnerHTML += '<button class="button is-paddingless px-2 is-marginless mr-2 mb-1 is-very-small is-info tagButton">'+tag+'</button>';
  }
  tagsInnerHTML += '</div></div></div>';
  content.append(tagsInnerHTML);
}

function displayFamiliarAlignment(content, specificStruct){
  if(specificStruct == null || specificStruct.Alignment == null) {return;}
  content.append('<hr class="m-2">');
  content.append('<div class="px-3"><p class="negative-indent"><strong>Alignment</strong> '+specificStruct.Alignment+'</p></div>');
}

function displayFamiliarReqAbils(content, specificStruct){
  if(specificStruct == null) {return;}
  content.append('<div class="px-3"><p class="negative-indent"><strong>Required Number of Abilities</strong> '+specificStruct.NumAbils+'</p></div>');
}

function displayFamiliarExtraAbils(content, specificStruct){
  if(specificStruct == null) {return;}
  for(let extraAbil of specificStruct.ExtraAbils){
    content.append('<hr class="m-2">');
    content.append('<div class="px-1">'+processText(extraAbil, true, true, 'MEDIUM')+'</div>');
  }
}
