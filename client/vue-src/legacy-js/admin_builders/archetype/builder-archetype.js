/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

let socket = io();

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

    let cardDedicationHeader = $('#dedicationFeat').find(".card-header");
    let cardDedicationContent = $('#dedicationFeat').find(".card-content");
    cardDedicationHeader.click(function(){
        if(cardDedicationContent.is(":visible")) {
            cardDedicationContent.addClass('is-hidden');
        } else {
            cardDedicationContent.removeClass('is-hidden');
        }
    });

    $('#dedicationFeat').find(".inputFeatTags").chosen();

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
            $("#"+featID).find(".card-header-title").html('Archetype Feat - '+inputFeatName.val());
        });

        $("#"+featID).find(".inputFeatTags").chosen();

    });


    $("#createButton").click(function(){
        $(this).unbind();
        finishArchetype(false);
    });

});

function finishArchetype(isUpdate){

    let archetypeName = $("#inputName").val();
    let archetypeVersion = $("#inputVersion").val();

    let archetypeIsMulticlass = ($("#inputIsMulticlass:checked").val() == '1') ? 1 : 0;

    let archetypeDescription = $("#inputDescription").val();
    let archetypeContentSrc = $("#inputContentSource").val();

    let archetypeFeatsArray = [];
    $(".archetypeFeat").each(function(){
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
            archetypeFeatsArray.push({
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


    let archetypeDedicationFeat = {
        level : $('#dedicationFeat').find(".inputFeatLevel").val(),
        actions : $('#dedicationFeat').find(".inputFeatActions").val(),
        rarity : $('#dedicationFeat').find(".inputFeatRarity").val(),
        featTagsArray : $('#dedicationFeat').find(".inputFeatTags").val(),
        prerequisites: $('#dedicationFeat').find(".inputFeatPrereq").val(),
        requirements : $('#dedicationFeat').find(".inputFeatReq").val(),
        frequency : $('#dedicationFeat').find(".inputFeatFreq").val(),
        cost : $('#dedicationFeat').find(".inputFeatCost").val(),
        trigger : $('#dedicationFeat').find(".inputFeatTrigger").val(),
        description : $('#dedicationFeat').find(".inputFeatDesc").val(),
        special : $('#dedicationFeat').find(".inputFeatSpecial").val(),
        canSelectMultiple : ($('#dedicationFeat').find(".inputFeatSelectMultiple:checked").val() == '1') ? 1 : 0,
        code : $('#dedicationFeat').find(".inputFeatCode").val(),
    };

    
    let requestPacket = null;
    let archetypeID = null;
    if(isUpdate){
        requestPacket = "requestAdminUpdateArchetype";
        archetypeID = getArchetypeEditorIDFromURL();
    } else {
        requestPacket = "requestAdminAddArchetype";
    }
    
    socket.emit(requestPacket,{
        archetypeID,
        archetypeName,
        archetypeVersion,
        archetypeIsMulticlass,
        archetypeDescription,
        archetypeDedicationFeat,
        archetypeFeatsArray,
        archetypeContentSrc
    });

}

socket.on("returnAdminCompleteArchetype", function() {
    window.location.href = '/admin/manage/archetype';
});