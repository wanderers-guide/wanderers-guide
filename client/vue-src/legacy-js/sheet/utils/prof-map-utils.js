/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

function findItemDataByName(itemMap, profItemName, type){
    for(const [itemID, itemData] of itemMap.entries()){
        if(type == 'WEAPON' && itemData.WeaponData != null){
            if(itemData.WeaponData.profName.toUpperCase() == profItemName){
                return itemData;
            }
        } else if(type == 'ARMOR' && itemData.ArmorData != null){
            if(itemData.ArmorData.profName.toUpperCase() == profItemName){
                return itemData;
            }
        }
    }
    return null;
}

function hasFamiliarityReduceProf(itemData){
    for(let weaponFamiliarity of g_weaponFamiliaritiesArray){
        let traitName = weaponFamiliarity.value+' - ITEM';
        
        let tag = itemData.TagArray.find(tag => {
            return tag.name.toUpperCase() == traitName;
        });
        if(tag != null){
            return true;
        }
    }
    return false;
}

function buildWeaponProfMap(){

    let weaponProfMap = new Map(); // Key: ItemID Value: { NumUps, UserBonus }

    for(const [profName, profDataArray] of g_profMap.entries()){
        const finalProfData = getFinalProf(profDataArray);
        if(finalProfData.For == "Attack"){

            if(profName == 'Simple_Weapons'){
                for(const [itemID, itemData] of g_itemMap.entries()){
                    if(itemData.WeaponData != null && itemData.WeaponData.category == "SIMPLE"){

                        let prevWeapData = weaponProfMap.get(itemData.WeaponData.profName);
                        if(prevWeapData == null){ prevWeapData = { NumUps: null, UserBonus: null }; }

                        weaponProfMap.set(itemData.WeaponData.profName, {
                          NumUps : greaterProfValue(prevWeapData.NumUps,finalProfData.NumUps),
                          UserBonus : greaterProfValue(prevWeapData.UserBonus,finalProfData.UserBonus),
                        });
                    }
                }
            } else if(profName == 'Martial_Weapons'){
                for(const [itemID, itemData] of g_itemMap.entries()){
                    if(itemData.WeaponData != null && itemData.WeaponData.category == "MARTIAL"){

                        let prevWeapData = weaponProfMap.get(itemData.WeaponData.profName);
                        if(prevWeapData == null){ prevWeapData = { NumUps: null, UserBonus: null }; }

                        let numUps = finalProfData.NumUps;
                        if(hasFamiliarityReduceProf(itemData)){
                            let reducedProfData = getFinalProf(g_profMap.get('Simple_Weapons'));
                            if(reducedProfData != null){
                                numUps = reducedProfData.NumUps;
                            } else {
                                numUps = 0;
                            }
                        }

                        weaponProfMap.set(itemData.WeaponData.profName, {
                          NumUps : greaterProfValue(prevWeapData.NumUps,numUps),
                          UserBonus : greaterProfValue(prevWeapData.UserBonus,finalProfData.UserBonus),
                        });
                    }
                }
            } else if(profName == 'Advanced_Weapons'){
                for(const [itemID, itemData] of g_itemMap.entries()){
                    if(itemData.WeaponData != null && itemData.WeaponData.category == "ADVANCED"){

                        let prevWeapData = weaponProfMap.get(itemData.WeaponData.profName);
                        if(prevWeapData == null){ prevWeapData = { NumUps: null, UserBonus: null }; }

                        let numUps = finalProfData.NumUps;
                        if(hasFamiliarityReduceProf(itemData)){
                            let reducedProfData = getFinalProf(g_profMap.get('Martial_Weapons'));
                            if(reducedProfData != null){
                                numUps = reducedProfData.NumUps;
                            } else {
                                numUps = 0;
                            }
                        }

                        weaponProfMap.set(itemData.WeaponData.profName, {
                          NumUps : greaterProfValue(prevWeapData.NumUps,numUps),
                          UserBonus : greaterProfValue(prevWeapData.UserBonus,finalProfData.UserBonus),
                        });
                    }
                }
            } else if(profName == 'Unarmed_Attacks'){
                for(const [itemID, itemData] of g_itemMap.entries()){
                    if(itemData.WeaponData != null && itemData.WeaponData.category == "UNARMED"){

                        let prevWeapData = weaponProfMap.get(itemData.WeaponData.profName);
                        if(prevWeapData == null){ prevWeapData = { NumUps: null, UserBonus: null }; }

                        weaponProfMap.set(itemData.WeaponData.profName, {
                          NumUps : greaterProfValue(prevWeapData.NumUps,finalProfData.NumUps),
                          UserBonus : greaterProfValue(prevWeapData.UserBonus,finalProfData.UserBonus),
                        });
                    }
                }
            } else {
                let dProfName = profName.toUpperCase().replace(/_/g,' ');
                const itemData = findItemDataByName(g_itemMap, dProfName, 'WEAPON');
                if(itemData != null && itemData.WeaponData != null){

                    let prevWeapData = weaponProfMap.get(itemData.WeaponData.profName);
                    if(prevWeapData == null){ prevWeapData = { NumUps: null, UserBonus: null }; }

                    let numUps = finalProfData.NumUps;
                    if(hasFamiliarityReduceProf(itemData)){
                        let reducedProfData = null;
                        if(itemData.WeaponData.category == "MARTIAL"){
                          reducedProfData = getFinalProf(g_profMap.get('Simple_Weapons'));
                        } else if (itemData.WeaponData.category == "ADVANCED"){
                          reducedProfData = getFinalProf(g_profMap.get('Martial_Weapons'));
                        } else {
                          reducedProfData = finalProfData;
                        }

                        let famNumUps = 0;
                        if(reducedProfData != null){
                          famNumUps = reducedProfData.NumUps;
                        }
                        if(famNumUps > numUps){ numUps = famNumUps; }
                    }

                    weaponProfMap.set(itemData.WeaponData.profName, {
                      NumUps : greaterProfValue(prevWeapData.NumUps,numUps),
                      UserBonus : greaterProfValue(prevWeapData.UserBonus,finalProfData.UserBonus),
                    });
                }
            }

        } else if(finalProfData.For == "Group"){

          let groupName = profName.toUpperCase();

          let isSimple = false;
          let isMartial = false;
          let isAdvanced = false;
          let isUnarmed = false;
          if(groupName.startsWith('SIMPLE_')){
            groupName = groupName.replace('SIMPLE_', '');
            isSimple = true;
          }
          if(groupName.startsWith('MARTIAL_')){
            groupName = groupName.replace('MARTIAL_', '');
            isMartial = true;
          }
          if(groupName.startsWith('ADVANCED_')){
            groupName = groupName.replace('ADVANCED_', '');
            isAdvanced = true;
          }
          if(groupName.startsWith('UNARMED_')){
            groupName = groupName.replace('UNARMED_', '');
            isUnarmed = true;
          }

          for(const [itemID, itemData] of g_itemMap.entries()){
            if(itemData.WeaponData != null){
              if((itemData.WeaponData.isMelee == 1 && itemData.WeaponData.meleeWeaponType == groupName) || (itemData.WeaponData.isRanged == 1 && itemData.WeaponData.rangedWeaponType == groupName)){
                if(!isSimple && !isMartial && !isAdvanced && !isUnarmed){

                  let prevWeapData = weaponProfMap.get(itemData.WeaponData.profName);
                  if(prevWeapData == null){ prevWeapData = { NumUps: null, UserBonus: null }; }

                  weaponProfMap.set(itemData.WeaponData.profName, {
                    NumUps : greaterProfValue(prevWeapData.NumUps,finalProfData.NumUps),
                    UserBonus : greaterProfValue(prevWeapData.UserBonus,finalProfData.UserBonus),
                  });
                } else if((isSimple && itemData.WeaponData.category == "SIMPLE") || (isMartial && itemData.WeaponData.category == "MARTIAL") || (isAdvanced && itemData.WeaponData.category == "ADVANCED") || (isUnarmed && itemData.WeaponData.category == "UNARMED")) {

                  let prevWeapData = weaponProfMap.get(itemData.WeaponData.profName);
                  if(prevWeapData == null){ prevWeapData = { NumUps: null, UserBonus: null }; }

                  weaponProfMap.set(itemData.WeaponData.profName, {
                    NumUps : greaterProfValue(prevWeapData.NumUps,finalProfData.NumUps),
                    UserBonus : greaterProfValue(prevWeapData.UserBonus,finalProfData.UserBonus),
                  });
                }
              }
            }
          }
        } else if(finalProfData.For == "Trait"){

          let traitName = profName.toUpperCase().replace(/_/g,' ').trim();

          for(const [itemID, itemData] of g_itemMap.entries()){
            if(itemData.WeaponData != null){

              let trait = itemData.TagArray.find(trait => {
                return trait.name.toUpperCase() == traitName;
              });

              if(trait != null){
                let prevWeapData = weaponProfMap.get(itemData.WeaponData.profName);
                if(prevWeapData == null){ prevWeapData = { NumUps: null, UserBonus: null }; }

                weaponProfMap.set(itemData.WeaponData.profName, {
                  NumUps : greaterProfValue(prevWeapData.NumUps,finalProfData.NumUps),
                  UserBonus : greaterProfValue(prevWeapData.UserBonus,finalProfData.UserBonus),
                });
              }

            }
          }
        }
    }

    return weaponProfMap;
}

function weaponProfDetermineNumUps(itemData){

  let profNumUps = 0;
  let profData = g_weaponProfMap.get(itemData.WeaponData.profName);
  if(profData != null){
    profNumUps = profData.NumUps;
  }

  if(hasFamiliarityReduceProf(itemData)){
    let reducedProfData = null;
    if(itemData.WeaponData.category == "MARTIAL"){
      reducedProfData = getFinalProf(g_profMap.get('Simple_Weapons'));
    } else if (itemData.WeaponData.category == "ADVANCED"){
      reducedProfData = getFinalProf(g_profMap.get('Martial_Weapons'));
    } else {
      reducedProfData = profData;
    }
  
    if(reducedProfData != null){
      profNumUps = (reducedProfData.NumUps > profNumUps) ? reducedProfData.NumUps : profNumUps;
    }
  }

  return profNumUps;

}

function buildArmorProfMap(){

    let armorProfMap = new Map(); // Key: ItemID Value: { NumUps, UserBonus }

    for(const [profName, profDataArray] of g_profMap.entries()){
        const finalProfData = getFinalProf(profDataArray);
        if(finalProfData.For == "Defense"){

            if(profName == 'Light_Armor'){
                for(const [itemID, itemData] of g_itemMap.entries()){
                    if(itemData.ArmorData != null && itemData.ArmorData.category == "LIGHT"){

                        let prevArmorData = armorProfMap.get(itemData.ArmorData.profName);
                        if(prevArmorData == null){ prevArmorData = { NumUps: null, UserBonus: null }; }

                        armorProfMap.set(itemData.ArmorData.profName, {
                          NumUps : greaterProfValue(prevArmorData.NumUps,finalProfData.NumUps),
                          UserBonus : greaterProfValue(prevArmorData.UserBonus,finalProfData.UserBonus),
                        });
                    }
                }
            } else if(profName == 'Medium_Armor'){
                for(const [itemID, itemData] of g_itemMap.entries()){
                    if(itemData.ArmorData != null && itemData.ArmorData.category == "MEDIUM"){

                        let prevArmorData = armorProfMap.get(itemData.ArmorData.profName);
                        if(prevArmorData == null){ prevArmorData = { NumUps: null, UserBonus: null }; }

                        armorProfMap.set(itemData.ArmorData.profName, {
                          NumUps : greaterProfValue(prevArmorData.NumUps,finalProfData.NumUps),
                          UserBonus : greaterProfValue(prevArmorData.UserBonus,finalProfData.UserBonus),
                        });
                    }
                }
            } else if(profName == 'Heavy_Armor'){
                for(const [itemID, itemData] of g_itemMap.entries()){
                    if(itemData.ArmorData != null && itemData.ArmorData.category == "HEAVY"){

                        let prevArmorData = armorProfMap.get(itemData.ArmorData.profName);
                        if(prevArmorData == null){ prevArmorData = { NumUps: null, UserBonus: null }; }
                        
                        armorProfMap.set(itemData.ArmorData.profName, {
                          NumUps : greaterProfValue(prevArmorData.NumUps,finalProfData.NumUps),
                          UserBonus : greaterProfValue(prevArmorData.UserBonus,finalProfData.UserBonus),
                        });
                    }
                }
            } else if(profName == 'Unarmored_Defense'){
                for(const [itemID, itemData] of g_itemMap.entries()){
                    if(itemData.ArmorData != null && itemData.ArmorData.category == "UNARMORED"){

                        let prevArmorData = armorProfMap.get(itemData.ArmorData.profName);
                        if(prevArmorData == null){ prevArmorData = { NumUps: null, UserBonus: null }; }
                        
                        armorProfMap.set(itemData.ArmorData.profName, {
                          NumUps : greaterProfValue(prevArmorData.NumUps,finalProfData.NumUps),
                          UserBonus : greaterProfValue(prevArmorData.UserBonus,finalProfData.UserBonus),
                        });
                    }
                }
            } else {
                let dProfName = profName.toUpperCase().replace(/_/g,' ');
                const itemData = findItemDataByName(g_itemMap, dProfName, 'ARMOR');
                if(itemData != null && itemData.ArmorData != null){

                    let prevArmorData = armorProfMap.get(itemData.ArmorData.profName);
                    if(prevArmorData == null){ prevArmorData = { NumUps: null, UserBonus: null }; }

                    armorProfMap.set(itemData.ArmorData.profName, {
                      NumUps : greaterProfValue(prevArmorData.NumUps,finalProfData.NumUps),
                      UserBonus : greaterProfValue(prevArmorData.UserBonus,finalProfData.UserBonus),
                    });
                }
            }

        } else if(finalProfData.For == "Trait"){

          let traitName = profName.toUpperCase().replace(/_/g,' ').trim();

          for(const [itemID, itemData] of g_itemMap.entries()){
            if(itemData.ArmorData != null){

              let trait = itemData.TagArray.find(trait => {
                return trait.name.toUpperCase() == traitName;
              });

              if(trait != null){
                let prevArmorData = armorProfMap.get(itemData.ArmorData.profName);
                if(prevArmorData == null){ prevArmorData = { NumUps: null, UserBonus: null }; }

                armorProfMap.set(itemData.ArmorData.profName, {
                  NumUps : greaterProfValue(prevArmorData.NumUps,finalProfData.NumUps),
                  UserBonus : greaterProfValue(prevArmorData.UserBonus,finalProfData.UserBonus),
                });
              }

            }
          }
        }

        /*
        
         else if(finalProfData.For == "Group"){
          for(const [itemID, itemData] of g_itemMap.entries()){
            if(itemData.ArmorData != null){
              if(itemData.ArmorData.armorType == profName.toUpperCase()){
                weaponProfMap.set(itemData.ArmorData.profName, {
                  NumUps : finalProfData.NumUps,
                  UserBonus : finalProfData.UserBonus
                });
              }
            }
          }
        }
        
        */
    }

    return armorProfMap;
}

function greaterProfValue(prevValue, newValue){
  if(prevValue == null || isNaN(prevValue)){
    return newValue;
  } else if(prevValue > newValue){
    return prevValue;
  } else {
    return newValue;
  }
}