/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

let socket = io();
let g_homebrewID = null;

// ~~~~~~~~~~~~~~ // Run on Load // ~~~~~~~~~~~~~~ //
$(function () {

    $("#createButton").click(function(){
        $(this).unbind();
        finishToggleable(false);
    });

    if($("#createButton").length){// If button exists
      stopSpinnerLoader();
    }
});

function finishToggleable(isUpdate){

    let toggleableName = $("#inputName").val();
    let toggleableDescription = $("#inputDescription").val();
    let toggleableCode = $("#inputCode").val();

    let requestPacket = null;
    g_homebrewID = $('#builder-container').attr('data-bundle-id');
    let toggleableID = $('#builder-container').attr('data-toggleable-id');
    if(isUpdate){
        requestPacket = "requestHomebrewUpdateToggleable";
    } else {
        requestPacket = "requestHomebrewAddToggleable";
    }

    socket.emit(requestPacket, g_homebrewID, {
      toggleableID,
        toggleableName,
        toggleableDescription,
        toggleableCode,
    });

}

socket.on("returnHomebrewCompleteToggleable", function() {
  window.location.href = '/homebrew/?edit_id='+g_homebrewID;
});