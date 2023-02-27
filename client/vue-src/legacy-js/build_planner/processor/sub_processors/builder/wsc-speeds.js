/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

//--------------------- Processing Speeds --------------------//
function processingSpeeds(wscStatement, srcStruct, locationID, extraData){
    
    if(wscStatement.startsWith("GIVE-SPEED")){ // GIVE-SPEED=Swim:15
        let data = wscStatement.split('=')[1]; // GIVE-SPEED=Swim:LAND_SPEED
        let segments = data.split(':');
        giveSpeed(srcStruct, segments[0], segments[1]);
    } else {
        displayError("Unknown statement (2-Speed): \'"+wscStatement+"\'");
        statementComplete('Speed - Unknown Statement');
    }

}

//////////////////////////////// Give Speed ///////////////////////////////////

function giveSpeed(srcStruct, speedType, speedAmt){

  setDataOtherSpeed(srcStruct, speedType, speedAmt);

  if(g_char_id != null){
    socket.emit("requestSpeedChange",
        g_char_id,
        srcStruct,
        speedType,
        speedAmt);
  } else {
    saveBuildMetaData();
  }

}

socket.on("returnSpeedChange", function(){
    statementComplete('Speed - Add');
});