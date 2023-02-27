/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

$(function () {

});

socket.on("returnHomebrewItemDetails", function(itemObject){

    let itemMap = objToMap(itemObject);
    let item = itemMap.get($('#builder-container').attr('data-item-id'));

    if(item == null){
        window.location.href = '/homebrew';
        return;
    }

    $("#inputBuilderType").val(item.Item.itemStructType);
    $("#inputName").val(item.Item.name);
    $("#inputPrice").val(item.Item.price);
    $("#inputLevel").val(item.Item.level);
    $("#inputRarity").val(item.Item.rarity);
    $("#inputUsage").val(item.Item.usage);
    $("#inputDesc").val(item.Item.description);
    $("#inputCraftReq").val(item.Item.craftRequirements);
    $("#inputCode").val(item.Item.code);

    $("#inputBulk").val(item.Item.bulk);
    $("#inputSize").val(item.Item.size);
    $("#inputMaterial").val(item.Item.materialType);
    $("#inputHands").val(item.Item.hands);
    let isShoddy = (item.Item.isShoddy == 1) ? true : false;
    $("#inputIsShoddy").prop('checked', isShoddy);
    let hasQuantity = (item.Item.hasQuantity == 1) ? true : false;
    $("#inputHasQuantity").prop('checked', hasQuantity);
    $("#inputQuantity").val(item.Item.quantity);
    $("#inputHitPoints").val(item.Item.hitPoints);
    $("#inputBrokenThreshold").val(item.Item.brokenThreshold);
    $("#inputHardness").val(item.Item.hardness);
    
    if(item.WeaponData != null){
        if(item.WeaponData.profName == item.Item.name || item.WeaponData.profName == 'Alchemical Bombs'){
            $("#inputDieType").val(item.WeaponData.dieType);
            $("#inputDamageType").val(item.WeaponData.damageType);
            $("#inputWeaponCategory").val(item.WeaponData.category);
            let isMelee = (item.WeaponData.isMelee == 1) ? true : false;
            $("#inputIsMelee").prop('checked', isMelee);
            $("#inputMeleeWeaponType").val(item.WeaponData.meleeWeaponType);
            let isRanged = (item.WeaponData.isRanged == 1) ? true : false;
            $("#inputIsRanged").prop('checked', isRanged);
            $("#inputRangedWeaponType").val(item.WeaponData.rangedWeaponType);
            $("#inputRange").val(item.WeaponData.rangedRange);
            $("#inputReload").val(item.WeaponData.rangedReload);
        }
    }

    if(item.ArmorData != null){
        if(item.ArmorData.profName == item.Item.name){
            $("#inputArmorACBonus").val(item.ArmorData.acBonus);
            $("#inputArmorDexCap").val(item.ArmorData.dexCap);
            $("#inputArmorType").val(item.ArmorData.armorType);
            $("#inputArmorCategory").val(item.ArmorData.category);
            $("#inputArmorCheckPenalty").val(item.ArmorData.checkPenalty);
            $("#inputArmorSpeedPenalty").val(item.ArmorData.speedPenalty);
            $("#inputArmorMinStrength").val(item.ArmorData.minStrength);
        }
    }

    if(item.ShieldData != null){
        if(item.ShieldData.profName == item.Item.name){
            $("#inputShieldACBonus").val(item.ShieldData.acBonus);
            $("#inputShieldSpeedPenalty").val(item.ShieldData.speedPenalty);
        }
    }

    if(item.StorageData != null){
        $("#inputMaxBulkStorage").val(item.StorageData.maxBulkStorage);
        $("#inputBulkIgnored").val(item.StorageData.bulkIgnored);
        let ignoreSelfBulkIfWearing = (item.StorageData.ignoreSelfBulkIfWearing == 1) ? true : false;
        $("#inputIgnoreSelfBulkIfWearing").prop('checked', ignoreSelfBulkIfWearing);
    }

    if(item.RuneData != null){
        let runeType = (item.RuneData.isFundamental == 1) ? 'FUNDAMENTAL' : 'PROPERTY';
        $("#inputRuneType").val(runeType);
        $("#inputEtchedType").val(item.RuneData.etchedType);

        // Remove these to prevent a continued stacking
        let itemName = item.Item.name.replace(' Runestone','');
        let itemPrice = item.Item.price - 300;
        $("#inputName").val(itemName);
        $("#inputPrice").val(itemPrice);
    }
    
    $("#inputBuilderType").trigger("change");
    $("#inputCategory").val(item.Item.itemType);

    if(item.WeaponData != null && item.WeaponData.profName != item.Item.name){
        let copyItemID = null;
        for(const [itemID, itemDataStruct] of itemMap.entries()){
            if(itemDataStruct.Item.hidden == 0){
                if(itemDataStruct.Item.name === item.WeaponData.profName){
                    copyItemID = itemID;
                    item.TagArray = tagArrayDifference(item.TagArray, itemDataStruct.TagArray);
                    break;
                }
            }
        }
        if(copyItemID != null){
            $("#inputItemCopyOfOther").val(copyItemID);
            $("#inputItemCopyOfOther").trigger("change");
        }
    }

    if(item.ArmorData != null && item.ArmorData.profName != item.Item.name){
        let copyItemID = null;
        for(const [itemID, itemDataStruct] of itemMap.entries()){
            if(itemDataStruct.Item.hidden == 0){
                if(itemDataStruct.Item.name === item.ArmorData.profName){
                    copyItemID = itemID;
                    item.TagArray = tagArrayDifference(item.TagArray, itemDataStruct.TagArray);
                    break;
                }
            }
        }
        if(copyItemID != null){
            $("#inputItemCopyOfOther").val(copyItemID);
            $("#inputItemCopyOfOther").trigger("change");
        }
    }

    if(item.ShieldData != null && item.ShieldData.profName != item.Item.name){
        let copyItemID = null;
        for(const [itemID, itemDataStruct] of itemMap.entries()){
            if(itemDataStruct.Item.hidden == 0){
                if(itemDataStruct.Item.name === item.ShieldData.profName){
                    copyItemID = itemID;
                    item.TagArray = tagArrayDifference(item.TagArray, itemDataStruct.TagArray);
                    break;
                }
            }
        }
        if(copyItemID != null){
            $("#inputItemCopyOfOther").val(copyItemID);
            $("#inputItemCopyOfOther").trigger("change");
        }
    }

    for(let tag of item.TagArray){
        $("#inputTags").find('option[value='+tag.id+']').attr('selected','selected');
    }
    $("#inputTags").trigger("chosen:updated");

    $("#updateButton").click(function(){
        $(this).unbind();
        finishItem(true);
    });

    stopSpinnerLoader();
});

function tagArrayDifference(arr1, arr2) {
    let newArr1 = [];
    for(let tag of arr1){
        newArr1.push(tag.id);
    }
    let newArr2 = [];
    for(let tag of arr2){
        newArr2.push(tag.id);
    }
    let diffArr = newArr1
      .filter(x => !newArr2.includes(x))
      .concat(newArr2.filter(x => !newArr1.includes(x)));
    let finalDiffArr = [];
    for(let tagID of diffArr){
        finalDiffArr.push({id: tagID});
    }
    return finalDiffArr;
  }