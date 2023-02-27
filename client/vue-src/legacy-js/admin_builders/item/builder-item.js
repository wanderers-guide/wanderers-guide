/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

let socket = io();
let g_itemMap = null;

// ~~~~~~~~~~~~~~ // Run on Load // ~~~~~~~~~~~~~~ //
$(function () {

    // ~ Content Sources ~ //
    for(let contSrcData of g_contentSources){
      if(g_currentContentSource === contSrcData.CodeName){
        $("#inputContentSource").append('<option value="'+contSrcData.CodeName+'" selected>'+contSrcData.TextName+'</option>');
      } else {
        $("#inputContentSource").append('<option value="'+contSrcData.CodeName+'">'+contSrcData.TextName+'</option>');
      }
    }
    // ~ ~~~~~~~~~~~~~~~ ~ //

    // ~ Item Materials ~ //
    $("#inputMaterial").append('<option value="">N/A</option>');
    for(const [materialName, materialStruct] of g_materialsMap.entries()){
      $("#inputMaterial").append('<option value="'+materialName+'">'+materialStruct.Name+'</option>');
    }
    // ~ ~~~~~~~~~~~~~~ ~ //

    $("#inputTags").chosen();

    socket.emit("requestAdminItemDetails");

});

socket.on("returnAdminItemDetails", function(itemObject){

    g_itemMap = objToMap(itemObject);
    g_itemMap = new Map([...g_itemMap.entries()].sort(
        function(a, b) {
            if (a[1].Item.level === b[1].Item.level) {
                // Name is only important when levels are the same
                return a[1].Item.name > b[1].Item.name ? 1 : -1;
            }
            return a[1].Item.level - b[1].Item.level;
        })
    );
    

    let builderTypeSelection = $("#inputBuilderType");
    builderTypeSelection.change(function(){
        let builderType = $(this).val();
        $("#inputItemCopyOfOther").off('change');
        if(builderType == "GENERAL"){
            $("#inputItemCopyOfOther").html('');
            $("#sectionItemCopyOfOther").addClass('is-hidden');

            $("#sectionWeapon").addClass('is-hidden');
            $("#sectionWeaponMelee").addClass('is-hidden');
            $("#sectionWeaponRanged").addClass('is-hidden');
            $("#sectionStorage").addClass('is-hidden');
            $("#sectionShield").addClass('is-hidden');
            $("#sectionRunestone").addClass('is-hidden');
            $("#sectionArmor").addClass('is-hidden');
            $("#sectionArmorPenalties").addClass('is-hidden');

            $("#sectionBulk").removeClass('is-hidden');
            $("#sectionSize").removeClass('is-hidden');
            $("#sectionMaterial").removeClass('is-hidden');
            $("#sectionHands").removeClass('is-hidden');
            $("#sectionIsShoddy").removeClass('is-hidden');
            $("#sectionQuantity").removeClass('is-hidden');
            $("#sectionHealth").removeClass('is-hidden');
            $("#inputCategory").val("OTHER");
        } else if(builderType == "STORAGE"){
            $("#inputItemCopyOfOther").html('');
            $("#sectionItemCopyOfOther").addClass('is-hidden');

            $("#sectionWeapon").addClass('is-hidden');
            $("#sectionWeaponMelee").addClass('is-hidden');
            $("#sectionWeaponRanged").addClass('is-hidden');
            $("#sectionStorage").removeClass('is-hidden');
            $("#sectionShield").addClass('is-hidden');
            $("#sectionRunestone").addClass('is-hidden');
            $("#sectionArmor").addClass('is-hidden');
            $("#sectionArmorPenalties").addClass('is-hidden');

            $("#sectionBulk").removeClass('is-hidden');
            $("#sectionSize").removeClass('is-hidden');
            $("#sectionMaterial").removeClass('is-hidden');
            $("#sectionHands").removeClass('is-hidden');
            $("#sectionIsShoddy").removeClass('is-hidden');
            $("#sectionQuantity").addClass('is-hidden');
            $("#sectionHealth").removeClass('is-hidden');
            $("#inputCategory").val("STORAGE");
        } else if(builderType == "WEAPON"){
            let copyOfOtherItemHTML = '<option value="">Create New Weapon</option>';
            for(const [itemID, itemDataStruct] of g_itemMap.entries()){
                if(itemDataStruct.WeaponData != null && itemDataStruct.Item.hidden === 0 && itemDataStruct.WeaponData.profName === itemDataStruct.Item.name){
                    copyOfOtherItemHTML += '<option value="'+itemID+'">'+itemDataStruct.Item.name+'</option>';
                }
            }
            $("#inputItemCopyOfOther").html(copyOfOtherItemHTML);
            $("#sectionItemCopyOfOther").removeClass('is-hidden');
            $("#inputItemCopyOfOther").change(function(){
                if($(this).val() != ''){
                    $("#sectionWeapon").addClass('is-hidden');
                    $("#sectionWeaponMelee").addClass('is-hidden');
                    $("#sectionWeaponRanged").addClass('is-hidden');
                    $("#sectionHealth").addClass('is-hidden');
                }
            });

            $("#sectionWeapon").removeClass('is-hidden');
            $("#sectionWeaponMelee").removeClass('is-hidden');
            $("#sectionWeaponRanged").removeClass('is-hidden');
            $("#sectionStorage").addClass('is-hidden');
            $("#sectionShield").addClass('is-hidden');
            $("#sectionRunestone").addClass('is-hidden');
            $("#sectionArmor").addClass('is-hidden');
            $("#sectionArmorPenalties").addClass('is-hidden');

            $("#sectionBulk").removeClass('is-hidden');
            $("#sectionSize").removeClass('is-hidden');
            $("#sectionMaterial").removeClass('is-hidden');
            $("#sectionHands").removeClass('is-hidden');
            $("#sectionIsShoddy").removeClass('is-hidden');
            $("#sectionQuantity").removeClass('is-hidden');
            $("#sectionHealth").removeClass('is-hidden');
            $("#inputCategory").val("WEAPON");
        } else if(builderType == "ARMOR"){
            let copyOfOtherItemHTML = '<option value="">Create New Armor</option>';
            for(const [itemID, itemDataStruct] of g_itemMap.entries()){
                if(itemDataStruct.ArmorData != null && itemDataStruct.Item.hidden === 0 && itemDataStruct.ArmorData.profName === itemDataStruct.Item.name){
                    copyOfOtherItemHTML += '<option value="'+itemID+'">'+itemDataStruct.Item.name+'</option>';
                }
            }
            $("#inputItemCopyOfOther").html(copyOfOtherItemHTML);
            $("#sectionItemCopyOfOther").removeClass('is-hidden');
            $("#inputItemCopyOfOther").change(function(){
                if($(this).val() != ''){
                    $("#sectionArmor").addClass('is-hidden');
                    $("#sectionArmorPenalties").addClass('is-hidden');
                    $("#sectionHealth").addClass('is-hidden');
                }
            });

            $("#sectionWeapon").addClass('is-hidden');
            $("#sectionWeaponMelee").addClass('is-hidden');
            $("#sectionWeaponRanged").addClass('is-hidden');
            $("#sectionStorage").addClass('is-hidden');
            $("#sectionShield").addClass('is-hidden');
            $("#sectionRunestone").addClass('is-hidden');
            $("#sectionArmor").removeClass('is-hidden');
            $("#sectionArmorPenalties").removeClass('is-hidden');

            $("#sectionBulk").removeClass('is-hidden');
            $("#sectionSize").removeClass('is-hidden');
            $("#sectionMaterial").removeClass('is-hidden');
            $("#sectionHands").addClass('is-hidden');
            $("#sectionIsShoddy").removeClass('is-hidden');
            $("#sectionQuantity").addClass('is-hidden');
            $("#sectionHealth").removeClass('is-hidden');
            $("#inputCategory").val("ARMOR");
        } else if(builderType == "SHIELD"){
            let copyOfOtherItemHTML = '<option value="">Create New Shield</option>';
            for(const [itemID, itemDataStruct] of g_itemMap.entries()){
                if(itemDataStruct.ShieldData != null && itemDataStruct.Item.hidden === 0 && itemDataStruct.ShieldData.profName === itemDataStruct.Item.name){
                    copyOfOtherItemHTML += '<option value="'+itemID+'">'+itemDataStruct.Item.name+'</option>';
                }
            }
            $("#inputItemCopyOfOther").html(copyOfOtherItemHTML);
            $("#sectionItemCopyOfOther").removeClass('is-hidden');
            $("#inputItemCopyOfOther").change(function(){
                if($(this).val() != ''){
                    $("#sectionShield").addClass('is-hidden');
                }
            });

            $("#sectionWeapon").addClass('is-hidden');
            $("#sectionWeaponMelee").addClass('is-hidden');
            $("#sectionWeaponRanged").addClass('is-hidden');
            $("#sectionStorage").addClass('is-hidden');
            $("#sectionShield").removeClass('is-hidden');
            $("#sectionRunestone").addClass('is-hidden');
            $("#sectionArmor").addClass('is-hidden');
            $("#sectionArmorPenalties").addClass('is-hidden');

            $("#sectionBulk").removeClass('is-hidden');
            $("#sectionSize").removeClass('is-hidden');
            $("#sectionMaterial").removeClass('is-hidden');
            $("#sectionHands").addClass('is-hidden');
            $("#sectionIsShoddy").removeClass('is-hidden');
            $("#sectionQuantity").addClass('is-hidden');
            $("#sectionHealth").removeClass('is-hidden');
            $("#inputCategory").val("SHIELD");
        } else if(builderType == "RUNE"){
            $("#inputItemCopyOfOther").html('');
            $("#sectionItemCopyOfOther").addClass('is-hidden');

            $("#sectionWeapon").addClass('is-hidden');
            $("#sectionWeaponMelee").addClass('is-hidden');
            $("#sectionWeaponRanged").addClass('is-hidden');
            $("#sectionStorage").addClass('is-hidden');
            $("#sectionShield").addClass('is-hidden');
            $("#sectionRunestone").removeClass('is-hidden');
            $("#sectionArmor").addClass('is-hidden');
            $("#sectionArmorPenalties").addClass('is-hidden');

            $("#sectionBulk").addClass('is-hidden');
            $("#sectionSize").addClass('is-hidden');
            $("#sectionMaterial").addClass('is-hidden');
            $("#sectionHands").addClass('is-hidden');
            $("#sectionIsShoddy").addClass('is-hidden');
            $("#sectionQuantity").addClass('is-hidden');
            $("#sectionHealth").addClass('is-hidden');
            $("#inputCategory").val("RUNE");
        }
    });
    builderTypeSelection.trigger("change");


    $("#createButton").click(function(){
        $(this).unbind();
        finishItem(false);
    });

});

function finishItem(isUpdate){

    let builderType = $("#inputBuilderType").val();
    let itemName = $("#inputName").val();
    let itemVersion = $("#inputVersion").val();
    let itemPrice = $("#inputPrice").val();
    let itemLevel = $("#inputLevel").val();
    let itemCategory = $("#inputCategory").val();
    let itemRarity = $("#inputRarity").val();
    let itemTagsArray = $("#inputTags").val();
    let itemUsage = $("#inputUsage").val();
    let itemDesc = $("#inputDesc").val();
    let itemCraftReq = $("#inputCraftReq").val();
    let itemCode = $("#inputCode").val();

    let itemContentSrc = $("#inputContentSource").val();

    let itemBulk = null;
    if($("#sectionBulk").is(":visible")) {
        itemBulk = $("#inputBulk").val();
    }
    let itemSize = null;
    if($("#sectionSize").is(":visible")) {
        itemSize = $("#inputSize").val();
    }
    let itemMaterial = null;
    if($("#sectionMaterial").is(":visible")) {
        itemMaterial = $("#inputMaterial").val();
    }
    let itemHands = null;
    if($("#sectionHands").is(":visible")) {
        itemHands = $("#inputHands").val();
    }

    let itemIsShoddy = null;
    if($("#sectionIsShoddy").is(":visible")) {
        itemIsShoddy = ($("#inputIsShoddy:checked").val() == '1') ? 1 : 0;
    }
    let itemHasQuantity, itemQuantity = null;
    if($("#sectionQuantity").is(":visible")) {
        itemHasQuantity = ($("#inputHasQuantity:checked").val() == '1') ? 1 : 0;
        itemQuantity = $("#inputQuantity").val();
    }

    let itemHitPoints, itemBrokenThreshold, itemHardness = null;
    if($("#sectionHealth").is(":visible")) {
        itemHitPoints = $("#inputHitPoints").val();
        itemBrokenThreshold = $("#inputBrokenThreshold").val();
        itemHardness = $("#inputHardness").val();
    }

    let itemWeaponData = null;
    if($("#sectionWeapon").is(":visible")) {
        itemWeaponData = {
            dieType: $("#inputDieType").val(),
            damageType: $("#inputDamageType").val(),
            weaponCategory: $("#inputWeaponCategory").val(),
            isMelee: ($("#inputIsMelee:checked").val() == '1') ? 1 : 0,
            meleeWeaponType: $("#inputMeleeWeaponType").val(),
            isRanged: ($("#inputIsRanged:checked").val() == '1') ? 1 : 0,
            rangedWeaponType: $("#inputRangedWeaponType").val(),
            range: $("#inputRange").val(),
            reload: $("#inputReload").val()
        };
    }

    let itemStorageData = null;
    if($("#sectionStorage").is(":visible")) {
        itemStorageData = {
            maxBulkStorage: $("#inputMaxBulkStorage").val(),
            bulkIgnored: $("#inputBulkIgnored").val(),
            ignoreSelfBulkIfWearing: ($("#inputIgnoreSelfBulkIfWearing:checked").val() == '1') ? 1 : 0
        };
    }

    let itemShieldData = null;
    if($("#sectionShield").is(":visible")) {
        itemShieldData = {
            acBonus: $("#inputShieldACBonus").val(),
            speedPenalty: $("#inputShieldSpeedPenalty").val()
        };
    }

    let itemRuneData = null;
    if($("#sectionRunestone").is(":visible")) {
        itemRuneData = {
            runeType: $("#inputRuneType").val(),
            etchedType: $("#inputEtchedType").val()
        };
    }

    let itemArmorData = null;
    if($("#sectionArmor").is(":visible")) {
        itemArmorData = {
            acBonus: $("#inputArmorACBonus").val(),
            dexCap: $("#inputArmorDexCap").val(),
            type: $("#inputArmorType").val(),
            category: $("#inputArmorCategory").val(),
            checkPenalty: $("#inputArmorCheckPenalty").val(),
            speedPenalty: $("#inputArmorSpeedPenalty").val(),
            minStrength: $("#inputArmorMinStrength").val()
        };
    }

    let itemCopyOfOther = null;
    let copyOtherID = $("#inputItemCopyOfOther").val();
    if(copyOtherID != null && copyOtherID != ''){
        itemCopyOfOther = g_itemMap.get(copyOtherID);
    }
    
    let requestPacket = null;
    let itemID = null;
    if(isUpdate){
        requestPacket = "requestAdminUpdateItem";
        itemID = getItemEditorIDFromURL();
    } else {
        requestPacket = "requestAdminAddItem";
    }

    socket.emit(requestPacket,{
        itemID,
        builderType,
        itemCopyOfOther,
        itemName,
        itemVersion,
        itemPrice,
        itemLevel,
        itemCategory,
        itemRarity,
        itemTagsArray,
        itemUsage,
        itemDesc,
        itemCraftReq,
        itemCode,
        itemBulk,
        itemSize,
        itemMaterial,
        itemHands,
        itemIsShoddy,
        itemHasQuantity,
        itemQuantity,
        itemHitPoints,
        itemBrokenThreshold,
        itemHardness,
        itemWeaponData,
        itemArmorData,
        itemShieldData,
        itemStorageData,
        itemRuneData,
        itemContentSrc
    });

}

socket.on("returnAdminCompleteItem", function() {
    window.location.href = '/admin/manage/item';
});