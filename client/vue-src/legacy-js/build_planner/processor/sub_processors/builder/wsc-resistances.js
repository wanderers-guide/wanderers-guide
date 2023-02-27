/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

//------------------------- Processing Resistances ------------------------//
function processingResistances(wscStatement, srcStruct, locationID, extraData){

    if(wscStatement.includes("GIVE-RESISTANCE")){// GIVE-RESISTANCE=cold:HALF_LEVEL/LEVEL/3
        let data = wscStatement.split('=')[1];
        let segments = data.split(':');
        giveResistance(srcStruct, segments[0], segments[1]);
    } else if(wscStatement.includes("GIVE-WEAKNESS")){// GIVE-WEAKNESS=cold:HALF_LEVEL/LEVEL/3
        let data = wscStatement.split('=')[1];
        let segments = data.split(':');
        giveVulnerability(srcStruct, segments[0], segments[1]);
    } else {
        displayError("Unknown statement (2-Resist/Weak): \'"+wscStatement+"\'");
        statementComplete('Resist/Weak - Unknown Statement');
    }

}

//////////////////////////////// Give Resistance ///////////////////////////////////
function giveResistance(srcStruct, resistType, resistAmount){

  setDataResistance(srcStruct, resistType, resistAmount);

  if(g_char_id != null){
    socket.emit("requestResistanceChange",
        g_char_id,
        srcStruct,
        resistType,
        resistAmount);
  } else {
    saveBuildMetaData();
  }

}

socket.on("returnResistanceChange", function(data){
    statementComplete('Resist - Add');
});

//////////////////////////////// Give Vulnerability ///////////////////////////////////
function giveVulnerability(srcStruct, vulnerableType, vulnerableAmount){

  setDataVulnerability(srcStruct, vulnerableType, vulnerableAmount);

  if(g_char_id != null){
    socket.emit("requestVulnerabilityChange",
        g_char_id,
        srcStruct,
        vulnerableType,
        vulnerableAmount);
  } else {
    saveBuildMetaData();
  }

}

socket.on("returnVulnerabilityChange", function(data){
    statementComplete('Weak - Add');
});