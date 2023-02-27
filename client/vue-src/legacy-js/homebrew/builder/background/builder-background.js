/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

let socket = io();
let g_homebrewID = null;

// ~~~~~~~~~~~~~~ // Run on Load // ~~~~~~~~~~~~~~ //
$(function () {

    $("#createButton").click(function(){
        $(this).unbind();
        finishBackground(false);
    });

    if($("#createButton").length){// If button exists
      stopSpinnerLoader();
    }
});

function finishBackground(isUpdate){

    let backgroundName = $("#inputName").val();
    let backgroundRarity = $("#inputRarity").val();
    let backgroundDescription = $("#inputDescription").val();
    let backgroundBoostsArray = $("#inputBoosts").val();
    let backgroundCode = $("#inputCode").val();
    
    let backgroundBoosts = '';
    for(let backgroundBoost of backgroundBoostsArray) {
        backgroundBoosts += backgroundBoost+',';
    }
    backgroundBoosts = backgroundBoosts.slice(0, -1); // Trim off that last ','

    let requestPacket = null;
    g_homebrewID = $('#builder-container').attr('data-bundle-id');
    let backgroundID = $('#builder-container').attr('data-background-id');
    if(isUpdate){
        requestPacket = "requestHomebrewUpdateBackground";
    } else {
        requestPacket = "requestHomebrewAddBackground";
    }

    socket.emit(requestPacket, g_homebrewID, {
        backgroundID,
        backgroundName,
        backgroundRarity,
        backgroundDescription,
        backgroundBoosts,
        backgroundCode,
    });

}

socket.on("returnHomebrewCompleteBackground", function() {
  window.location.href = '/homebrew/?edit_id='+g_homebrewID;
});