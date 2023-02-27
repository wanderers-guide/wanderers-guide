/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

let socket = io();
let g_homebrewID = null;

// ~~~~~~~~~~~~~~ // Run on Load // ~~~~~~~~~~~~~~ //
$(function () {

    $("#inputTags").chosen();

    $("#createButton").click(function(){
        $(this).unbind();
        finishSpell(false);
    });

    if($("#createButton").length){// If button exists
      stopSpinnerLoader();
    }
});

function finishSpell(isUpdate){

    let spellName = $("#inputName").val();
    let spellIsFocus = ($("#inputIsFocusSpell:checked").val() == '1') ? 1 : 0;
    let spellLevel = $("#inputLevel").val();
    let spellRarity = $("#inputRarity").val();
    let spellTraditions = $("#inputTraditions").val();
    let spellCasting = $("#inputCasting").val();
    let spellComponents = $("#inputCastingComponents").val();
    let spellCost = $("#inputCost").val();
    let spellTrigger = $("#inputTrigger").val(); 
    let spellRequirements = $("#inputRequirements").val();
    let spellTagsArray = $("#inputTags").val();
    let spellRange = $("#inputRange").val();
    let spellArea = $("#inputArea").val();
    let spellTargets = $("#inputTargets").val();
    let spellSavingThrow = $("#inputSavingThrow").val();
    let spellDuration = $("#inputDuration").val();
    let spellDesc = $("#inputDesc").val();
    let spellHeightenedOneVal = $("#inputHeightenedOneVal").val();
    let spellHeightenedOneText = $("#inputHeightenedOneText").val();
    let spellHeightenedTwoVal = $("#inputHeightenedTwoVal").val();
    let spellHeightenedTwoText = $("#inputHeightenedTwoText").val();
    let spellHeightenedThreeVal = $("#inputHeightenedThreeVal").val();
    let spellHeightenedThreeText = $("#inputHeightenedThreeText").val();
    let spellHeightenedFourVal = $("#inputHeightenedFourVal").val();
    let spellHeightenedFourText = $("#inputHeightenedFourText").val();
    
    let requestPacket = null;
    g_homebrewID = $('#builder-container').attr('data-bundle-id');
    let spellID = $('#builder-container').attr('data-spell-id');
    if(isUpdate){
      requestPacket = "requestHomebrewUpdateSpell";
    } else {
      requestPacket = "requestHomebrewAddSpell";
    }

    socket.emit(requestPacket, g_homebrewID, {
        spellID,
        spellName,
        spellIsFocus,
        spellLevel,
        spellRarity,
        spellTraditions,
        spellCasting,
        spellComponents,
        spellCost,
        spellTrigger,
        spellRequirements,
        spellTagsArray,
        spellRange,
        spellArea,
        spellTargets,
        spellSavingThrow,
        spellDuration,
        spellDesc,
        spellHeightenedOneVal,
        spellHeightenedOneText,
        spellHeightenedTwoVal,
        spellHeightenedTwoText,
        spellHeightenedThreeVal,
        spellHeightenedThreeText,
        spellHeightenedFourVal,
        spellHeightenedFourText,
    });

}

socket.on("returnHomebrewCompleteSpell", function() {
  window.location.href = '/homebrew/?edit_id='+g_homebrewID;
});