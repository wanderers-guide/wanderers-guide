/* Copyright (C) 2022, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

let g_allConditions = null;

function addCondition(accessToken, conditionName, conditionValue = null) {
  
  let condition = g_allConditions.find(condition => {
    return condition.name.toLowerCase() == conditionName.toLowerCase();
  });
  if(condition){

    socket.emit(`requestCharacterUpdate-ConditionAdd`, accessToken.charID, condition.name, condition.id, conditionValue, null, null, accessToken.calculatedStat, (calcConditions) => {
      // Callback function
      accessToken.calculatedStat.conditions = calcConditions;
      populateConditions(accessToken, `character-container-conditions-${accessToken.charID}`, false);
    });

  }

}

function removeCondition(accessToken, conditionName) {
  
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

    populateConditions(accessToken, `character-container-conditions-${accessToken.charID}`, false);

    socket.emit(`requestCharacterUpdate-ConditionRemove`, accessToken.charID, condition.conditionID, accessToken.calculatedStat);
  }

}

function updateCondition(accessToken, conditionName, newValue) {

  let condition = accessToken.calculatedStat.conditions.find(condition => {
    return condition.name.toLowerCase() == conditionName.toLowerCase();
  });
  if(condition){

    condition.value = newValue;
    populateConditions(accessToken, `character-container-conditions-${accessToken.charID}`, false);

    socket.emit(`requestCharacterUpdate-ConditionUpdate`, accessToken.charID, condition.conditionID, newValue, condition.sourceText, condition.parentEntryID, accessToken.calculatedStat);

  }

}