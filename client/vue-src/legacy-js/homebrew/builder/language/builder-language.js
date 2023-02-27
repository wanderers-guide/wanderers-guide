/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

let socket = io();
let g_homebrewID = null;

// ~~~~~~~~~~~~~~ // Run on Load // ~~~~~~~~~~~~~~ //
$(function () {

    $("#createButton").click(function(){
        $(this).unbind();
        finishLanguage(false);
    });

    if($("#createButton").length){// If button exists
      stopSpinnerLoader();
    }
});

function finishLanguage(isUpdate){

    let languageName = $("#inputName").val();
    let languageSpeakers = $("#inputSpeakers").val();
    let languageScript = $("#inputScript").val();
    let languageDescription = $("#inputDescription").val();

    let requestPacket = null;
    g_homebrewID = $('#builder-container').attr('data-bundle-id');
    let languageID = $('#builder-container').attr('data-language-id');
    if(isUpdate){
        requestPacket = "requestHomebrewUpdateLanguage";
    } else {
        requestPacket = "requestHomebrewAddLanguage";
    }

    socket.emit(requestPacket, g_homebrewID, {
        languageID,
        languageName,
        languageSpeakers,
        languageScript,
        languageDescription,
    });

}

socket.on("returnHomebrewCompleteLanguage", function() {
  window.location.href = '/homebrew/?edit_id='+g_homebrewID;
});