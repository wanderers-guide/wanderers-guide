/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

//--------------------- Processing Specializations --------------------//
function processingSpecializations(wscStatement, srcStruct, locationID, extraData){
    
    if(wscStatement.includes("GIVE-WEAPON-SPECIALIZATION")){ // GIVE-WEAPON-SPECIALIZATION
        giveWeaponSpecialization(srcStruct, 1);
    } else if(wscStatement.includes("GIVE-GREATER-WEAPON-SPECIALIZATION")){ // GIVE-GREATER-WEAPON-SPECIALIZATION
        giveWeaponSpecialization(srcStruct, 2);
    } else if(wscStatement.includes("GIVE-WEAPON-CRITICAL-SPECIALIZATION")){ // GIVE-WEAPON-CRITICAL-SPECIALIZATION=
        let weapName = wscStatement.split('=')[1];
        giveWeaponCriticalSpecialization(srcStruct, weapName);
    } else if(wscStatement.includes("GIVE-ARMOR-SPECIALIZATION")){ // GIVE-ARMOR-SPECIALIZATION=
        let armorName = wscStatement.split('=')[1];
        giveArmorSpecialization(srcStruct, armorName);
    } else {
        displayError("Unknown statement (2-Specialization): \'"+wscStatement+"\'");
        statementComplete('Specialization - Unknown Statement');
    }

}

//////////////////////////////// Give Weapon Specialization ///////////////////////////////////
// GIVE-WEAPON-SPECIALIZATION
// GIVE-GREATER-WEAPON-SPECIALIZATION

function giveWeaponSpecialization(srcStruct, type){

  setData(DATA_SOURCE.WEAPON_SPECIAL, srcStruct, type);

  if(g_char_id != null){
    socket.emit("requestWeaponSpecializationChange",
        g_char_id,
        srcStruct,
        type);
  } else {
    saveBuildMetaData();
  }

}

socket.on("returnWeaponSpecializationChange", function(){
    statementComplete('Specialization - Add Weapon');
});

//////////////////////////////// Give Armor Specialization ///////////////////////////////////
// GIVE-ARMOR-SPECIALIZATION=TRAIT~Dwarf
// GIVE-ARMOR-SPECIALIZATION=NAME~Leather
// GIVE-ARMOR-SPECIALIZATION=Light_Armor

function giveArmorSpecialization(srcStruct, armorName){

  setData(DATA_SOURCE.ARMOR_SPECIAL, srcStruct, armorName);

  if(g_char_id != null){
    socket.emit("requestArmorSpecializationChange",
        g_char_id,
        srcStruct,
        armorName);
  } else {
    saveBuildMetaData();
  }

}

socket.on("returnArmorSpecializationChange", function(){
    statementComplete('Specialization - Add Armor');
});

//////////////////////////////// Give Critical Specialization ///////////////////////////////////
// GIVE-WEAPON-CRITICAL-SPECIALIZATION=TRAIT~Dwarf
// GIVE-WEAPON-CRITICAL-SPECIALIZATION=NAME~Spear
// GIVE-WEAPON-CRITICAL-SPECIALIZATION=GROUP~Polearm
// GIVE-WEAPON-CRITICAL-SPECIALIZATION=PROF~E
// GIVE-WEAPON-CRITICAL-SPECIALIZATION=Simple_Weapons


function giveWeaponCriticalSpecialization(srcStruct, weapName){

  setData(DATA_SOURCE.WEAPON_CRIT_SPECIAL, srcStruct, weapName);

  if(g_char_id != null){
    socket.emit("requestWeaponCriticalSpecializationChange",
        g_char_id,
        srcStruct,
        weapName);
  } else {
    saveBuildMetaData();
  }

}

socket.on("returnWeaponCriticalSpecializationChange", function(){
    statementComplete('Specialization - Add Weapon Crit');
});