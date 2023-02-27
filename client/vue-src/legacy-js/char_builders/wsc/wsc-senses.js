/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

//--------------------- Processing Senses --------------------//
function processingSenses(wscStatement, srcStruct, locationID, sourceName){
    
    if(wscStatement.includes("GIVE-SENSE-NAME")){ // GIVE-SENSE-NAME=Darkvision
        let senseName = wscStatement.split('=')[1];
        giveSense(srcStruct, senseName);
    } else {
        displayError("Unknown statement (2-Sense): \'"+wscStatement+"\'");
        statementComplete();
    }

}

//////////////////////////////// Give Sense ///////////////////////////////////

function giveSense(srcStruct, senseName){

    socket.emit("requestSensesChangeByName", // No longer socket request
        getCharIDFromURL(),
        srcStruct,
        senseName);

}

socket.on("returnSensesChangeByName", function(){
    statementComplete();
});