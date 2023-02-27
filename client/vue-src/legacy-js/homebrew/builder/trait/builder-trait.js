/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

let socket = io();
let g_homebrewID = null;

// ~~~~~~~~~~~~~~ // Run on Load // ~~~~~~~~~~~~~~ //
$(function () {

    $("#createButton").click(function(){
        $(this).unbind();
        finishTrait(false);
    });

    if($("#createButton").length){// If button exists
      stopSpinnerLoader();
    }
});

function finishTrait(isUpdate){

    let traitName = $("#inputName").val();
    let traitDescription = $("#inputDescription").val();

    let requestPacket = null;
    g_homebrewID = $('#builder-container').attr('data-bundle-id');
    let traitID = $('#builder-container').attr('data-trait-id');
    if(isUpdate){
        requestPacket = "requestHomebrewUpdateTrait";
    } else {
        requestPacket = "requestHomebrewAddTrait";
    }

    socket.emit(requestPacket, g_homebrewID, {
        traitID,
        traitName,
        traitDescription,
    });

}

socket.on("returnHomebrewCompleteTrait", function() {
  window.location.href = '/homebrew/?edit_id='+g_homebrewID;
});