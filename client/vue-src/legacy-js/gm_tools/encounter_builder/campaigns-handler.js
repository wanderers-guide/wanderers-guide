/* Copyright (C) 2022, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

function addCharacterToEncounter(accessToken) {

  // Don't add a duplicate character
  let existingMember = allEncounters[currentEncounterIndex].members.find(member => {
    return member.isCharacter && member.characterData.charID == accessToken.charID;
  });
  if(existingMember) { return; }

  // If current HP is null, set it to max
  accessToken.character.currentHealth = (accessToken.character.currentHealth === null) ? accessToken.calculatedStat.maxHP : accessToken.character.currentHealth;

  // Add character as an encounter member
  allEncounters[currentEncounterIndex].members.push({
    creatureID: null,
    init: 0,
    name: accessToken.character.name,
    level: accessToken.character.level,
    currentHP: -9999,
    maxHP: -9999,
    conditions: [],
    eliteWeak: 'normal',
    commentsOpen: false,
    comments: ``,
    isCustom: false,
    customData: null,
    isCharacter: true,
    characterData: accessToken,
  });

  // Reload encounter
  reloadEncounterMembers();
  reloadBalanceResults();

}


// Data pipeline from encounter-builder.js condition handling to character update //

function processCharacter_addCondition(accessToken, conditionName, conditionValue = null) {
  
  let condition = g_allConditions.find(condition => {
    return condition.name.toLowerCase() == conditionName.toLowerCase();
  });
  if(condition){

    socket.emit(`requestCharacterUpdate-ConditionAdd`, accessToken.charID, condition.name, condition.id, conditionValue, null, null, accessToken.calculatedStat, (calcConditions) => {
      // Callback function
      accessToken.calculatedStat.conditions = calcConditions;
      reloadEncounterMembers();
      populateConditions(accessToken, `character-container-conditions-${accessToken.charID}`, true);
    });

  }

}

function processCharacter_removeCondition(accessToken, conditionName) {
  
  let condition = accessToken.calculatedStat.conditions.find(condition => {
    return condition.name.toLowerCase() == conditionName.toLowerCase();
  });
  if(condition){
    
    // Not a clean solution, needs BFS but this works.
    // Going 2 layers deep, removes condition if parent doesn't exist.

    let consMap = new Map();
    for(let con of accessToken.calculatedStat.conditions){
      if(con.conditionID == condition.conditionID) { continue; }
      consMap.set(con.entryID, con);
    }

    for(let i = 0; i < 2; i++){// repeat 2 times
      for(const [entryID, con] of consMap.entries()){
        if(con.parentEntryID && !consMap.get(con.parentEntryID+'')){
          consMap.delete(entryID);
        }
      }
    }

    let newConditions = [];
    for(const [entryID, con] of consMap.entries()){
      newConditions.push(con);
    }
    accessToken.calculatedStat.conditions = newConditions;

    reloadEncounterMembers();
    populateConditions(accessToken, `character-container-conditions-${accessToken.charID}`, true);

    socket.emit(`requestCharacterUpdate-ConditionRemove`, accessToken.charID, condition.conditionID, accessToken.calculatedStat);
  }

}

function processCharacter_updateCondition(accessToken, conditionName, newValue) {

  let condition = accessToken.calculatedStat.conditions.find(condition => {
    return condition.name.toLowerCase() == conditionName.toLowerCase();
  });
  if(condition){

    condition.value = newValue;
    reloadEncounterMembers();
    populateConditions(accessToken, `character-container-conditions-${accessToken.charID}`, true);

    socket.emit(`requestCharacterUpdate-ConditionUpdate`, accessToken.charID, condition.conditionID, newValue, condition.sourceText, condition.parentEntryID, accessToken.calculatedStat);

  }

}

// Update encounter characters on update //

socket.on("sendCharacterUpdateToGM", function (charID, updates) {

  if(allEncounters[currentEncounterIndex]?.members?.length > 0){ 
  } else {
    return;
  }

  let member = allEncounters[currentEncounterIndex].members.find(member => {
    return member.isCharacter && member.characterData.charID == charID;
  });
  if (!member) { return; }

  let accessToken = member.characterData;

  /* Data: (copy from remote-updates.js)
    hp - { value }
    temp-hp - { value }
    exp - { value }
    stamina - { value }
    resolve - { value }
    hero-points - { value }
    calculated-stats - g_calculatedStats
    char-info - charInfoJSON
    roll-history - rollHistoryJSON
  */

  for (let update of updates) {

    if (update.type == 'hp') {
      accessToken.character.currentHealth = update.data.value;
    } else if (update.type == 'temp-hp') {
      accessToken.character.tempHealth = update.data.value;
    } else if (update.type == 'exp') {
      accessToken.character.experience = update.data.value;
    } else if (update.type == 'stamina') {
      accessToken.character.currentStamina = update.data.value;
    } else if (update.type == 'resolve') {
      accessToken.character.currentResolve = update.data.value;
    } else if (update.type == 'hero-points') {
      accessToken.character.heroPoints = update.data.value;
    } else if (update.type == 'calculated-stats') {
      accessToken.calculatedStat = update.data;
    } else if (update.type == 'char-info') {
      accessToken.character.infoJSON = update.data;
    } else if (update.type == 'roll-history') {
      accessToken.character.rollHistoryJSON = update.data;
    }

  }

  enablePreventQuickViewAutoClose();
  reloadEncounterMembers();
  disablePreventQuickViewAutoClose();

  /* Note: Don't insert accessToken as a parameter because doing so causes a bug
      with jumping to a new character every update.
  */
  refreshQuickView();

});
