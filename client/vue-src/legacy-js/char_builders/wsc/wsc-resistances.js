/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

//------------------------- Processing Resistances ------------------------//
function processingResistances(wscStatement, srcStruct, locationID, sourceName){

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
        statementComplete();
    }

}

//////////////////////////////// Give Resistance ///////////////////////////////////
function giveResistance(srcStruct, resistType, resistAmount){
  socket.emit("requestResistanceChange",
      getCharIDFromURL(),
      srcStruct,
      resistType,
      resistAmount);
}

socket.on("returnResistanceChange", function(data){
    statementComplete();
});

//////////////////////////////// Give Vulnerability ///////////////////////////////////
function giveVulnerability(srcStruct, vulnerableType, vulnerableAmount){
  socket.emit("requestVulnerabilityChange",
      getCharIDFromURL(),
      srcStruct,
      vulnerableType,
      vulnerableAmount);
}

socket.on("returnVulnerabilityChange", function(data){
    statementComplete();
});