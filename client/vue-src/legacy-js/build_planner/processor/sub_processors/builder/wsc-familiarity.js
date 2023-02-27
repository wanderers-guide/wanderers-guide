/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

//--------------------- Processing Familiarities --------------------//
function processingFamiliarities(wscStatement, srcStruct, locationID, extraData){
    
    if(wscStatement.includes("GIVE-WEAPON-FAMILIARITY")){ // GIVE-WEAPON-FAMILIARITY=Goblin
        let trait = wscStatement.split('=')[1];
        giveWeaponFamiliarity(srcStruct, trait);
    } else {
        displayError("Unknown statement (2-Familiarity): \'"+wscStatement+"\'");
        statementComplete('Familiarity - Unknown Statement');
    }

}

//////////////////////////////// Give Weapon Familiarity ///////////////////////////////////

function giveWeaponFamiliarity(srcStruct, trait){

  setData(DATA_SOURCE.WEAPON_FAMILIARITY, srcStruct, trait);

  if(g_char_id != null){
    socket.emit("requestWeaponFamiliarityChange",
        g_char_id,
        srcStruct,
        trait);
  } else {
    saveBuildMetaData();
  }

}

socket.on("returnWeaponFamiliarityChange", function(){
    statementComplete('Familiarity - Add');
});