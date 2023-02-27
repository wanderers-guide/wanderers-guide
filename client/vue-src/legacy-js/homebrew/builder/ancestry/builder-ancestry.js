/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

let socket = io();
let g_homebrewID = null;

// ~~~~~~~~~~~~~~ // Run on Load // ~~~~~~~~~~~~~~ //
$(function () {

    $("#inputLangs").chosen();
    $("#inputBonusLangs").chosen();
    
    let heritageCount = 0;
    $("#addHeritageButton").click(function(){
        heritageCount++;

        let heritageID = "heritage"+heritageCount;

        let newHeritage = $("#heritageLayout").clone();
        newHeritage.attr('id', heritageID);
        newHeritage.removeClass('is-hidden');
        newHeritage.appendTo("#heritageContent");

        let cardHeader = $("#"+heritageID).find(".card-header");
        let cardContent = $("#"+heritageID).find(".card-content");

        cardHeader.click(function(){
            if(cardContent.is(":visible")) {
                cardContent.addClass('is-hidden');
            } else {
                cardContent.removeClass('is-hidden');
            }
        });

        let cardHeaderIcon = $("#"+heritageID).find(".card-header-icon");
        cardHeaderIcon.click(function(){
            $("#"+heritageID).remove();
        });

        let inputHeritageName = $("#"+heritageID).find(".inputHeritageName");
        inputHeritageName.change(function(){
            $("#"+heritageID).find(".card-header-title").html('Heritage - '+inputHeritageName.val());
        });

    });


    let featCount = 0;
    $("#addFeatButton").click(function(){
        featCount++;

        let featID = "feat"+featCount;

        let newFeat = $("#featLayout").clone();
        newFeat.attr('id', featID);
        newFeat.removeClass('is-hidden');
        newFeat.appendTo("#featContent");

        let cardHeader = $("#"+featID).find(".card-header");
        let cardContent = $("#"+featID).find(".card-content");

        cardHeader.click(function(){
            if(cardContent.is(":visible")) {
                cardContent.addClass('is-hidden');
            } else {
                cardContent.removeClass('is-hidden');
            }
        });

        let cardHeaderIcon = $("#"+featID).find(".card-header-icon");
        cardHeaderIcon.click(function(){
            $("#"+featID).remove();
        });

        let inputFeatName = $("#"+featID).find(".inputFeatName");
        inputFeatName.change(function(){
            $("#"+featID).find(".card-header-title").html('Ancestry Feat - '+inputFeatName.val());
        });

        $("#"+featID).find(".inputFeatTags").chosen();

    });


    $("#createButton").click(function(){
        $(this).unbind();
        finishAncestry(false);
    });

    if($("#createButton").length){// If button exists
      stopSpinnerLoader();
    }
});

function finishAncestry(isUpdate){

    let ancestryName = $("#inputName").val();
    let ancestryRarity = $("#inputRarity").val();
    let ancestryHitPoints = $("#inputHitPoints").val();
    let ancestrySize = $("#inputSize").val();
    let ancestrySpeed = $("#inputSpeed").val();
    let ancestryVisionSenseID = $("#inputVisionSense").val();
    let ancestryAdditionalSenseID = $("#inputAdditionalSense").val();
    let ancestryPhysicalFeatureOneID = $("#inputPhysicalFeatureOne").val();
    let ancestryPhysicalFeatureTwoID = $("#inputPhysicalFeatureTwo").val();
    let ancestryDescription = $("#inputDescription").val();
    let ancestryImageURL = $("#inputImageURL").val();
    let ancestryBoostsArray = $("#inputBoosts").val();
    let ancestryFlawsArray = $("#inputFlaws").val();
    let ancestryLangsArray = $("#inputLangs").val();
    let ancestryBonusLangsArray = $("#inputBonusLangs").val();

    let ancestryHeritagesArray = [];
    $(".ancestryHeritage").each(function(){
        if($(this).is(":visible")) {
            let heritageName = $(this).find(".inputHeritageName").val();
            let heritageDesc = $(this).find(".inputHeritageDesc").val();
            let heritageCode = $(this).find(".inputHeritageCode").val();
            ancestryHeritagesArray.push({
                name: heritageName,
                description: heritageDesc,
                code: heritageCode
            });
        }
    });

    let ancestryFeatsArray = [];
    $(".ancestryFeat").each(function(){
        if($(this).is(":visible")) {
            let featName = $(this).find(".inputFeatName").val();
            let featLevel = $(this).find(".inputFeatLevel").val();
            let featActions = $(this).find(".inputFeatActions").val();
            let featRarity = $(this).find(".inputFeatRarity").val();
            let featTagsArray = $(this).find(".inputFeatTags").val();
            let featPrereq = $(this).find(".inputFeatPrereq").val();
            let featReq = $(this).find(".inputFeatReq").val();
            let featFreq = $(this).find(".inputFeatFreq").val();
            let featCost = $(this).find(".inputFeatCost").val();
            let featTrigger = $(this).find(".inputFeatTrigger").val();
            let featDesc = $(this).find(".inputFeatDesc").val();
            let featSpecial = $(this).find(".inputFeatSpecial").val();
            let featSelectMultiple = ($(this).find(".inputFeatSelectMultiple:checked").val() == '1') ? 1 : 0;
            let featCode = $(this).find(".inputFeatCode").val();
            ancestryFeatsArray.push({
                name: featName,
                actions: featActions,
                level: featLevel,
                rarity: featRarity,
                prerequisites: featPrereq,
                frequency: featFreq,
                cost: featCost,
                trigger: featTrigger,
                requirements: featReq,
                description: featDesc,
                special: featSpecial,
                canSelectMultiple: featSelectMultiple,
                code: featCode,
                featTagsArray
            });
        }
    });
    
    let requestPacket = null;
    g_homebrewID = $('#builder-container').attr('data-bundle-id');
    let ancestryID = $('#builder-container').attr('data-ancestry-id');
    if(isUpdate){
        requestPacket = "requestHomebrewUpdateAncestry";
    } else {
        requestPacket = "requestHomebrewAddAncestry";
    }

    socket.emit(requestPacket, g_homebrewID, {
        ancestryID,
        ancestryName,
        ancestryRarity,
        ancestryHitPoints,
        ancestrySize,
        ancestrySpeed,
        ancestryVisionSenseID,
        ancestryAdditionalSenseID,
        ancestryPhysicalFeatureOneID,
        ancestryPhysicalFeatureTwoID,
        ancestryDescription,
        ancestryImageURL,
        ancestryBoostsArray,
        ancestryFlawsArray,
        ancestryLangsArray,
        ancestryBonusLangsArray,
        ancestryHeritagesArray,
        ancestryFeatsArray,
    });

}

socket.on("returnHomebrewCompleteAncestry", function() {
  window.location.href = '/homebrew/?edit_id='+g_homebrewID;
});