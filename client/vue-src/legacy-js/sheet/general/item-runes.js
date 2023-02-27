/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

// HARDCODED - Note: The fundamental RuneIDs in here are hardcoded (itemRunes IDs, not itemIDs). //

function isWeaponPotencyOne(runeID){
  return runeID == 20;
}

function isWeaponPotencyTwo(runeID){
  return runeID == 27;
}

function isWeaponPotencyThree(runeID){
  return runeID == 31;
}

function isWeaponPotencyFour(runeID){
  return runeID == 112;
}

//

function isStriking(runeID){
  return runeID == 24;
}

function isGreaterStriking(runeID){
  return runeID == 29;
}

function isMajorStriking(runeID){
  return runeID == 33;
}

//

function isArmorPotencyOne(runeID){
  return runeID == 25;
}

function isArmorPotencyTwo(runeID){
  return runeID == 28;
}

function isArmorPotencyThree(runeID){
  return runeID == 32;
}

function isArmorPotencyFour(runeID){
  return runeID == 113;
}

//

function isResilient(runeID){
  return runeID == 26;
}

function isGreaterResilient(runeID){
  return runeID == 30;
}

function isMajorResilient(runeID){
  return runeID == 34;
}

//

function isWeaponPotencyRune(runeID){
    return isWeaponPotencyOne(runeID) || isWeaponPotencyTwo(runeID) || isWeaponPotencyThree(runeID) || isWeaponPotencyFour(runeID);
}

function isStrikingRune(runeID){
    return isStriking(runeID) || isGreaterStriking(runeID) || isMajorStriking(runeID);
}

//

function isArmorPotencyRune(runeID){
    return isArmorPotencyOne(runeID) || isArmorPotencyTwo(runeID) || isArmorPotencyThree(runeID) || isArmorPotencyFour(runeID);
}

function isResilientRune(runeID){
    return isResilient(runeID) || isGreaterResilient(runeID) || isMajorResilient(runeID);
}

//

function runestoneNameToRuneName(runestoneItemName){
    return runestoneItemName.replace(' Runestone','');
}



function displayRunesForItem(qContent, invItem, isWeapon){
    const runeDataStruct = g_runeDataStruct;

    let invItemAddFundamentalRuneSelectID = 'invItemAddFundamentalRuneSelect'+invItem.id;
    let invItemAddFundamentalRuneButtonID = 'invItemAddFundamentalRuneButton'+invItem.id;

    qContent.append('<div id="addFuneRuneField" class="field has-addons has-addons-centered is-marginless"><div class="control"><div class="select is-small is-success"><select id="'+invItemAddFundamentalRuneSelectID+'"></select></div></div><div class="control"><button id="'+invItemAddFundamentalRuneButtonID+'" type="submit" class="button is-small is-success is-rounded is-outlined">Add</button></div></div>');

    $('#'+invItemAddFundamentalRuneSelectID).append('<option value="chooseDefault">Add Fundamental Rune</option>');
    $('#'+invItemAddFundamentalRuneSelectID).append('<optgroup label="──────────"></optgroup>');
    
    let foundRune = false;
    if(isWeapon) {

        for(let weaponRuneItem of runeDataStruct.WeaponArray){
            if(weaponRuneItem == null){ continue; }
            if(weaponRuneItem.RuneData.isFundamental == 1) {
    
                let dontDisplay = false;
                if(gOption_hasAutoBonusProgression){ dontDisplay = true; }

                if(isWeaponPotencyRune(weaponRuneItem.RuneData.id)){
                  let hasPotency = isWeaponPotencyRune(invItem.fundPotencyRuneID);
                  if(hasPotency) {
                    dontDisplay = true;
                  }
                }
                if(isStrikingRune(weaponRuneItem.RuneData.id)){
                  let hasStriking = isStrikingRune(invItem.fundRuneID);
                  if(hasStriking) {
                    dontDisplay = true;
                  }
                }
                        
                if(!dontDisplay){
                    foundRune = true;
                    $('#'+invItemAddFundamentalRuneSelectID).append('<option value="'+weaponRuneItem.RuneData.id+'">'+runestoneNameToRuneName(weaponRuneItem.Item.name)+'</option>');
                }
            }
        }

    } else {

        for(let armorRuneItem of runeDataStruct.ArmorArray){
            if(armorRuneItem == null){ continue; }
            if(armorRuneItem.RuneData.isFundamental == 1) {
    
                let dontDisplay = false;
                if(gOption_hasAutoBonusProgression){ dontDisplay = true; }

                if(isArmorPotencyRune(armorRuneItem.RuneData.id)){
                  let hasPotency = isArmorPotencyRune(invItem.fundPotencyRuneID);
                  if(hasPotency) {
                    dontDisplay = true;
                  }
                }
                if(isResilientRune(armorRuneItem.RuneData.id)){
                  let hasResilient = isResilientRune(invItem.fundRuneID);
                  if(hasResilient) {
                    dontDisplay = true;
                  }
                }
                        
                if(!dontDisplay){
                    foundRune = true;
                    $('#'+invItemAddFundamentalRuneSelectID).append('<option value="'+armorRuneItem.RuneData.id+'">'+runestoneNameToRuneName(armorRuneItem.Item.name)+'</option>');
                }
            }
        }

    }

    if(!foundRune){
        $('#addFuneRuneField').addClass('is-hidden');
    } else {
        $('#'+invItemAddFundamentalRuneButtonID).click(function() {
            let runeID = $('#'+invItemAddFundamentalRuneSelectID).val();
            if(runeID != "chooseDefault"){
                $(this).addClass('is-loading');
                socket.emit("requestAddFundamentalRune",
                    invItem.id,
                    runeID);
            }
        });
    }

    displayRunesInQuickview(qContent, invItem, runeDataStruct, isWeapon);

}



function displayRunesInQuickview(qContent, invItem, runeDataStruct, isWeapon){

    // If using AutoBonusProgression, remove all fundmental runes and just show potency rune slots at the correct levels.
    if(gOption_hasAutoBonusProgression){

      if(isWeapon) {

        if(invItem.fundPotencyRuneID != null && isWeaponPotencyFour(invItem.fundPotencyRuneID)){

          addPropertyRuneSelection(qContent, invItem, runeDataStruct.WeaponArray, 1);
          addPropertyRuneSelection(qContent, invItem, runeDataStruct.WeaponArray, 2);
          addPropertyRuneSelection(qContent, invItem, runeDataStruct.WeaponArray, 3);
          addPropertyRuneSelection(qContent, invItem, runeDataStruct.WeaponArray, 4);
  
        } else if(g_character.level >= 16 || (invItem.fundPotencyRuneID != null && isWeaponPotencyThree(invItem.fundPotencyRuneID))){

          addPropertyRuneSelection(qContent, invItem, runeDataStruct.WeaponArray, 1);
          addPropertyRuneSelection(qContent, invItem, runeDataStruct.WeaponArray, 2);
          addPropertyRuneSelection(qContent, invItem, runeDataStruct.WeaponArray, 3);
  
        } else if(g_character.level >= 10 || (invItem.fundPotencyRuneID != null && isWeaponPotencyTwo(invItem.fundPotencyRuneID))){
  
          addPropertyRuneSelection(qContent, invItem, runeDataStruct.WeaponArray, 1);
          addPropertyRuneSelection(qContent, invItem, runeDataStruct.WeaponArray, 2);
  
        } else if(g_character.level >= 2 || (invItem.fundPotencyRuneID != null && isWeaponPotencyOne(invItem.fundPotencyRuneID))){
  
          addPropertyRuneSelection(qContent, invItem, runeDataStruct.WeaponArray, 1);
  
        }

      } else {

        if(invItem.fundPotencyRuneID != null && isArmorPotencyFour(invItem.fundPotencyRuneID)){

          addPropertyRuneSelection(qContent, invItem, runeDataStruct.ArmorArray, 1);
          addPropertyRuneSelection(qContent, invItem, runeDataStruct.ArmorArray, 2);
          addPropertyRuneSelection(qContent, invItem, runeDataStruct.ArmorArray, 3);
          addPropertyRuneSelection(qContent, invItem, runeDataStruct.ArmorArray, 4);
  
        } else if(g_character.level >= 18 || (invItem.fundPotencyRuneID != null && isArmorPotencyThree(invItem.fundPotencyRuneID))){

          addPropertyRuneSelection(qContent, invItem, runeDataStruct.ArmorArray, 1);
          addPropertyRuneSelection(qContent, invItem, runeDataStruct.ArmorArray, 2);
          addPropertyRuneSelection(qContent, invItem, runeDataStruct.ArmorArray, 3);
  
        } else if(g_character.level >= 11 || (invItem.fundPotencyRuneID != null && isArmorPotencyTwo(invItem.fundPotencyRuneID))){
  
          addPropertyRuneSelection(qContent, invItem, runeDataStruct.ArmorArray, 1);
          addPropertyRuneSelection(qContent, invItem, runeDataStruct.ArmorArray, 2);
  
        } else if(g_character.level >= 5 || (invItem.fundPotencyRuneID != null && isArmorPotencyOne(invItem.fundPotencyRuneID))){
  
          addPropertyRuneSelection(qContent, invItem, runeDataStruct.ArmorArray, 1);
  
        }

      }

      return;
    }

    if(invItem.fundRuneID != null){
        let fundRuneID = invItem.fundRuneID;
        if(isStriking(fundRuneID)){

            let runeName = "Striking";
            let runeDescription = "A striking rune stores destructive magic in the weapon, increasing the weapon damage dice it deals to two instead of one.";
            addFundamentalRuneEntry(qContent, invItem, fundRuneID, runeName, runeDescription);

        }

        if(isGreaterStriking(fundRuneID)){

            let runeName = "Greater Striking";
            let runeDescription = "A greater striking rune stores destructive magic in the weapon, increasing the weapon damage dice it deals to three instead of one.";
            addFundamentalRuneEntry(qContent, invItem, fundRuneID, runeName, runeDescription);

        }

        if(isMajorStriking(fundRuneID)){

            let runeName = "Major Striking";
            let runeDescription = "A major striking rune stores destructive magic in the weapon, increasing the weapon damage dice it deals to four instead of one.";
            addFundamentalRuneEntry(qContent, invItem, fundRuneID, runeName, runeDescription);

        }

        ////

        if(isResilient(fundRuneID)){

            let runeName = "Resilient";
            let runeDescription = "Resilient runes imbue armor with additional protective magic. This grants the wearer a +1 item bonus to saving throws.";
            addFundamentalRuneEntry(qContent, invItem, fundRuneID, runeName, runeDescription);

        }

        if(isGreaterResilient(fundRuneID)){

            let runeName = "Greater Resilient";
            let runeDescription = "Resilient runes imbue armor with additional protective magic. This grants the wearer a +2 item bonus to saving throws.";
            addFundamentalRuneEntry(qContent, invItem, fundRuneID, runeName, runeDescription);

        }

        if(isMajorResilient(fundRuneID)){

            let runeName = "Major Resilient";
            let runeDescription = "Resilient runes imbue armor with additional protective magic. This grants the wearer a +3 item bonus to saving throws.";
            addFundamentalRuneEntry(qContent, invItem, fundRuneID, runeName, runeDescription);

        }

    }
    if(invItem.fundPotencyRuneID != null){
        let potencyRuneID = invItem.fundPotencyRuneID;
        if(isWeaponPotencyOne(potencyRuneID)){
            
            let runeName = "+1 Weapon Potency";
            let runeDescription = "Magical enhancements make this weapon strike true. Attack rolls with this weapon gain a +1 item bonus, and the weapon can be etched with one property rune.";
            addFundamentalRuneEntry(qContent, invItem, potencyRuneID, runeName, runeDescription);

            addPropertyRuneSelection(qContent, invItem, runeDataStruct.WeaponArray, 1);

        }

        if(isWeaponPotencyTwo(potencyRuneID)){
            
            let runeName = "+2 Weapon Potency";
            let runeDescription = "Magical enhancements make this weapon strike true. Attack rolls with this weapon gain a +2 item bonus, and the weapon can be etched with two property runes.";
            addFundamentalRuneEntry(qContent, invItem, potencyRuneID, runeName, runeDescription);

            addPropertyRuneSelection(qContent, invItem, runeDataStruct.WeaponArray, 1);
            addPropertyRuneSelection(qContent, invItem, runeDataStruct.WeaponArray, 2);

        }

        if(isWeaponPotencyThree(potencyRuneID)){
            
            let runeName = "+3 Weapon Potency";
            let runeDescription = "Magical enhancements make this weapon strike true. Attack rolls with this weapon gain a +3 item bonus, and the weapon can be etched with three property runes.";
            addFundamentalRuneEntry(qContent, invItem, potencyRuneID, runeName, runeDescription);

            addPropertyRuneSelection(qContent, invItem, runeDataStruct.WeaponArray, 1);
            addPropertyRuneSelection(qContent, invItem, runeDataStruct.WeaponArray, 2);
            addPropertyRuneSelection(qContent, invItem, runeDataStruct.WeaponArray, 3);

        }

        if(isWeaponPotencyFour(potencyRuneID)){
            
          let runeName = "+4 Weapon Potency";
          let runeDescription = "Magical enhancements make this weapon strike true. Attack rolls with this weapon gain a +4 item bonus, and the weapon can be etched with four property runes.";
          addFundamentalRuneEntry(qContent, invItem, potencyRuneID, runeName, runeDescription);

          addPropertyRuneSelection(qContent, invItem, runeDataStruct.WeaponArray, 1);
          addPropertyRuneSelection(qContent, invItem, runeDataStruct.WeaponArray, 2);
          addPropertyRuneSelection(qContent, invItem, runeDataStruct.WeaponArray, 3);
          addPropertyRuneSelection(qContent, invItem, runeDataStruct.WeaponArray, 4);

        }

        ////

        if(isArmorPotencyOne(potencyRuneID)){
            
            let runeName = "+1 Armor Potency";
            let runeDescription = "Magic wards deflect attacks. Increase the armor’s item bonus to AC by 1. The armor can be etched with one property rune.";
            addFundamentalRuneEntry(qContent, invItem, potencyRuneID, runeName, runeDescription);

            addPropertyRuneSelection(qContent, invItem, runeDataStruct.ArmorArray, 1);

        }

        if(isArmorPotencyTwo(potencyRuneID)){
            
            let runeName = "+2 Armor Potency";
            let runeDescription = "Magic wards deflect attacks. Increase the armor’s item bonus to AC by 2. The armor can be etched with two property runes.";
            addFundamentalRuneEntry(qContent, invItem, potencyRuneID, runeName, runeDescription);

            addPropertyRuneSelection(qContent, invItem, runeDataStruct.ArmorArray, 1);
            addPropertyRuneSelection(qContent, invItem, runeDataStruct.ArmorArray, 2);

        }

        if(isArmorPotencyThree(potencyRuneID)){
            
            let runeName = "+3 Armor Potency";
            let runeDescription = "Magic wards deflect attacks. Increase the armor’s item bonus to AC by 3. The armor can be etched with three property rune.";
            addFundamentalRuneEntry(qContent, invItem, potencyRuneID, runeName, runeDescription);

            addPropertyRuneSelection(qContent, invItem, runeDataStruct.ArmorArray, 1);
            addPropertyRuneSelection(qContent, invItem, runeDataStruct.ArmorArray, 2);
            addPropertyRuneSelection(qContent, invItem, runeDataStruct.ArmorArray, 3);

        }

        if(isArmorPotencyFour(potencyRuneID)){
            
          let runeName = "+4 Armor Potency";
          let runeDescription = "Magic wards deflect attacks. Increase the armor’s item bonus to AC by 4. The armor can be etched with four property rune.";
          addFundamentalRuneEntry(qContent, invItem, potencyRuneID, runeName, runeDescription);

          addPropertyRuneSelection(qContent, invItem, runeDataStruct.ArmorArray, 1);
          addPropertyRuneSelection(qContent, invItem, runeDataStruct.ArmorArray, 2);
          addPropertyRuneSelection(qContent, invItem, runeDataStruct.ArmorArray, 3);
          addPropertyRuneSelection(qContent, invItem, runeDataStruct.ArmorArray, 4);

      }

    }

}

function addFundamentalRuneEntry(qContent, invItem, runeID, runeName, runeDescription){

    let runeEntryID = 'runeEntry'+runeID;
    let runeEntryDeleteID = runeEntryID+'Delete';
    qContent.append('<div class="has-text-centered mt-1"><p class="is-inline"><a class="has-txt-value-number has-tooltip-bottom has-tooltip-multiline" data-tooltip="'+processTextRemoveIndexing(runeDescription)+'">'+runeName+'</a></p><a id="'+runeEntryDeleteID+'" class="is-size-6"><span class="icon is-small has-text-danger ml-3"><i class="fal fa-minus-circle fa-sm"></i></span></a></div>');

    $('#'+runeEntryDeleteID).click(function() {
        socket.emit("requestRemoveFundamentalRune",
            invItem.id,
            runeID);
    });

}

function getPropertyRuneIDBySlot(invItem, propertyRuneSlot){
    switch(propertyRuneSlot) {
        case 1:
            return invItem.propRune1ID;
        case 2:
            return invItem.propRune2ID;
        case 3:
            return invItem.propRune3ID;
        case 4:
            return invItem.propRune4ID;
        default:
            return null;
    }
}

function addPropertyRuneSelection(qContent, invItem, runeArray, propertyRuneSlot){

    let propertyRuneSelectionID = 'propertyRuneSelection'+propertyRuneSlot;
    qContent.append('<div class="has-text-centered p-1"><div class="select is-small is-success"><select id="'+propertyRuneSelectionID+'"></select></div></div>');

    $('#'+propertyRuneSelectionID).append('<option value="chooseDefault">Add Property Rune</option>');
    $('#'+propertyRuneSelectionID).append('<optgroup label="──────────"></optgroup>');

    let existingPropRuneID = getPropertyRuneIDBySlot(invItem, propertyRuneSlot);
    for(let weaponRuneItem of runeArray){
        if(weaponRuneItem == null){ continue; }
        if(weaponRuneItem.RuneData.isFundamental == 0) {
            if(existingPropRuneID != null && existingPropRuneID == weaponRuneItem.RuneData.id){
                $('#'+propertyRuneSelectionID).append('<option value="'+weaponRuneItem.RuneData.id+'" selected>'+runestoneNameToRuneName(weaponRuneItem.Item.name)+' - Lvl '+weaponRuneItem.Item.level+'</option>');
            } else {
                $('#'+propertyRuneSelectionID).append('<option value="'+weaponRuneItem.RuneData.id+'">'+runestoneNameToRuneName(weaponRuneItem.Item.name)+' - Lvl '+weaponRuneItem.Item.level+'</option>');
            }
        }
    }

    if(existingPropRuneID != null){
        
        let runeItem = runeArray.find(itemDataStruct => {
            return itemDataStruct.RuneData.id == existingPropRuneID;
        }).Item;

        let propertyRuneDescriptionNameID = 'propertyRuneDescriptionName'+propertyRuneSlot;
        let propertyRuneDescriptionChevronID = 'propertyRuneDescriptionChevron'+propertyRuneSlot;
        let propertyRuneDescriptionSectionID = 'propertyRuneDescriptionSection'+propertyRuneSlot;

        qContent.append(`<p id="${propertyRuneDescriptionNameID}" class="has-text-centered is-size-7"><strong class="cursor-clickable">Description</strong><sub class="icon is-small pl-1 cursor-clickable"><i id="${propertyRuneDescriptionChevronID}" class="fas fa-lg fa-chevron-down"></i></sub></p>`);
        qContent.append(`<div class="columns is-marginless"><div class="column is-paddingless is-8 is-offset-2"><hr class="mx-1 my-0"><div id="${propertyRuneDescriptionSectionID}" class="is-hidden"></div></div></div>`);

        let usageText = (runeItem.usage != null) ? '<p class="has-text-centered is-size-7"><strong>Usage: </strong>'+runeItem.usage+'</p>' : '';
        $('#'+propertyRuneDescriptionSectionID).append(usageText+processText(runeItem.description, true, true, 'SMALL')+'<hr class="m-1">');

        $('#'+propertyRuneDescriptionNameID).click(function() {
          if($("#"+propertyRuneDescriptionSectionID).hasClass("is-hidden")) {
            $("#"+propertyRuneDescriptionSectionID).removeClass('is-hidden');
            $("#"+propertyRuneDescriptionChevronID).removeClass('fa-chevron-down');
            $("#"+propertyRuneDescriptionChevronID).addClass('fa-chevron-up');
          } else {
            $("#"+propertyRuneDescriptionSectionID).addClass('is-hidden');
            $("#"+propertyRuneDescriptionChevronID).removeClass('fa-chevron-up');
            $("#"+propertyRuneDescriptionChevronID).addClass('fa-chevron-down');
          }
        });

        /* If existingPropRuneID isn't null, a property rune is active */
        $('#'+propertyRuneSelectionID).parent().removeClass('is-success');
        $('#'+propertyRuneSelectionID).parent().addClass('is-success-dark');

    }
    
    $('#'+propertyRuneSelectionID).change(function() {
        let propRuneID = $('#'+propertyRuneSelectionID).val();
        if(propRuneID != "chooseDefault" && existingPropRuneID != propRuneID){
            socket.emit("requestAddPropertyRune",
                invItem.id,
                propRuneID,
                propertyRuneSlot);
        } else if(existingPropRuneID != null){
            socket.emit("requestRemovePropertyRune",
                invItem.id,
                propertyRuneSlot);
        }
    });
    
}

function getInvItemLevel(item, invItem){

  let highestLevel = item.Item.level;

  let runeArray = null;
  if(item.WeaponData != null) {
    runeArray = g_runeDataStruct.WeaponArray;
  } else if(item.ArmorData != null) {
    runeArray = g_runeDataStruct.ArmorArray;
  } else {
    return highestLevel;
  }

  let runeIDArray = [];
  runeIDArray.push(invItem.fundPotencyRuneID);
  runeIDArray.push(invItem.fundRuneID);
  runeIDArray.push(invItem.propRune1ID);
  runeIDArray.push(invItem.propRune2ID);
  runeIDArray.push(invItem.propRune3ID);
  runeIDArray.push(invItem.propRune4ID);

  for(let runeID of runeIDArray){
    if(runeID != null){
      let rune = runeArray.find(rune => {
        return rune != null && rune.RuneData.id == runeID;
      });
      if(rune != null){
        if(rune.Item.level > highestLevel){
          highestLevel = rune.Item.level;
        }
      }
    }
  }

  return highestLevel;

}
