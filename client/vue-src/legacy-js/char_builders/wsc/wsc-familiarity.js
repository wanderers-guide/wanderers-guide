/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

//--------------------- Processing Familiarities --------------------//
function processingFamiliarities(wscStatement, srcStruct, locationID, sourceName){
    
    if(wscStatement.includes("GIVE-WEAPON-FAMILIARITY")){ // GIVE-WEAPON-FAMILIARITY=Goblin
        let trait = wscStatement.split('=')[1];
        giveWeaponFamiliarity(srcStruct, trait);
    } else {
        displayError("Unknown statement (2-Familiarity): \'"+wscStatement+"\'");
        statementComplete();
    }

}

//////////////////////////////// Give Weapon Familiarity ///////////////////////////////////

function giveWeaponFamiliarity(srcStruct, trait){

    socket.emit("requestWeaponFamiliarityChange",
        getCharIDFromURL(),
        srcStruct,
        trait);

}

socket.on("returnWeaponFamiliarityChange", function(){
    statementComplete();
});