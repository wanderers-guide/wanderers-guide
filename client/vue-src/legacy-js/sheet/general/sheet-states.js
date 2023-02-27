/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

let sheetStateActiveMap = null;

function initSheetStates(){

  sheetStateActiveMap = new Map();
  for(const sheetState of g_sheetStatesArray){
    sheetStateActiveMap.set(sheetState.id, false);
  }

}


function getSheetStateByID(stateID){
  return g_sheetStatesArray.find(sheetState => {
    return sheetState.id == stateID;
  });
}

function getSheetStateByName(stateName){
  return g_sheetStatesArray.find(sheetState => {
    return sheetState.name.toUpperCase() == stateName.toUpperCase();
  });
}

function isSheetStateActive(stateID){
  return sheetStateActiveMap.get(stateID);
}

function setSheetStateActive(stateID, toggle){
  sheetStateActiveMap.set(stateID, toggle);
}


function getSheetStates(){

  let stateArray = [];
  for(let sheetStates of g_sheetStatesArray){
    sheetStates.isActive = isSheetStateActive(sheetStates.id);
    stateArray.push(sheetStates);
  }

  return stateArray.sort(
    function(a, b) {
      return a.name > b.name ? 1 : -1;
    }
  );

}