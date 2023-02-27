/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

//--------------------- Processing Speeds --------------------//
function processingSpeeds(wscStatement, srcStruct, locationID, sourceName){
    
    if(wscStatement.includes("GIVE-SPEED")){ // GIVE-SPEED=Swim:15
        let data = wscStatement.split('=')[1]; // GIVE-SPEED=Swim:LAND_SPEED
        let segments = data.split(':');
        giveSpeed(srcStruct, segments[0], segments[1]);
    } else {
        displayError("Unknown statement (2-Speed): \'"+wscStatement+"\'");
        statementComplete();
    }

}

//////////////////////////////// Give Speed ///////////////////////////////////

function giveSpeed(srcStruct, speedType, speedAmt){

    socket.emit("requestSpeedChange",
        getCharIDFromURL(),
        srcStruct,
        speedType,
        speedAmt);

}

socket.on("returnSpeedChange", function(){
    statementComplete();
});