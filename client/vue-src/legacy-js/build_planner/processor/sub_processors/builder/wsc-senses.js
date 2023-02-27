/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

//--------------------- Processing Senses --------------------//
function processingSenses(wscStatement, srcStruct, locationID, extraData){
    
    if(wscStatement.includes("GIVE-SENSE-NAME")){ // GIVE-SENSE-NAME=Darkvision
        let senseName = wscStatement.split('=')[1];
        giveSense(srcStruct, senseName);
    } else {
        displayError("Unknown statement (2-Sense): \'"+wscStatement+"\'");
        statementComplete('Sense - Unknown Statement');
    }

}

//////////////////////////////// Give Sense ///////////////////////////////////

function giveSense(srcStruct, senseName){
  if(senseName.trim() == ''){ return; }

  let sense = g_allSenses.find(sense => {
    return sense.name.toUpperCase() == senseName.toUpperCase();
  });
  if(sense != null){
    setDataOnly(DATA_SOURCE.SENSE, srcStruct, sense.id);
  }

  if(g_char_id != null){
    if(sense != null){
      socket.emit("requestSensesChangeByID",
          g_char_id,
          srcStruct,
          sense.id);
    } else {
      console.error('Could not find sense: '+senseName);
    }
  } else {
    saveBuildMetaData();
  }

  statementComplete('Sense - Add By ID');

}
