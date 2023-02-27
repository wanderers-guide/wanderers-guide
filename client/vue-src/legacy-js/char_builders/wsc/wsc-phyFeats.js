/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

//--------------------- Processing Physical Features --------------------//
function processingPhysicalFeatures(wscStatement, srcStruct, locationID, sourceName){
    
    if(wscStatement.includes("GIVE-PHYSICAL-FEATURE-NAME")){ // GIVE-PHYSICAL-FEATURE-NAME=Tusks
        let phyFeatName = wscStatement.split('=')[1];
        givePhysicalFeature(srcStruct, phyFeatName);
    } else {
        displayError("Unknown statement (2-PhyFeat): \'"+wscStatement+"\'");
        statementComplete();
    }

}

//////////////////////////////// Give Physical Feature ///////////////////////////////////

function givePhysicalFeature(srcStruct, phyFeatName){

    socket.emit("requestPhysicalFeaturesChangeByName", // No longer socket request
        getCharIDFromURL(),
        srcStruct,
        phyFeatName);

}

socket.on("returnPhysicalFeaturesChangeByName", function(){
    statementComplete();
});