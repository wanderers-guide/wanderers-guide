/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

let socket = io();
let g_homebrewID = null;

// ~~~~~~~~~~~~~~ // Run on Load // ~~~~~~~~~~~~~~ //
$(function () {

    socket.emit("requestHomebrewHeritageDetails", $('#builder-container').attr('data-bundle-id'));

});

socket.on("returnHomebrewHeritageDetails", function(heritageArray, ancestryArray){
  
    for(let ancestry of ancestryArray){
        if(ancestry.isArchived == 0){
            $('#inputHeritageFor').append('<option value="'+ancestry.name+'">'+ancestry.name+'</option>');
        }
    }

    $("#createButton").click(function(){
        $(this).unbind();
        finishHeritage(false);
    });

    if($("#createButton").length){// If button exists
      stopSpinnerLoader();
    }
});

function finishHeritage(isUpdate){

    let name = $("#inputName").val();
    let rarity = $("#inputRarity").val();
    let description = $("#inputDesc").val();
    let code = $("#inputCode").val();
    let indivAncestryName = $("#inputHeritageFor").val();
    
    let requestPacket = null;
    g_homebrewID = $('#builder-container').attr('data-bundle-id');
    let heritageID = $('#builder-container').attr('data-heritage-id');
    if(isUpdate){
        requestPacket = "requestHomebrewUpdateHeritage";
    } else {
        requestPacket = "requestHomebrewAddHeritage";
    }
    
    socket.emit(requestPacket, g_homebrewID, {
        heritageID,
        name: name+' '+indivAncestryName,
        rarity,
        description,
        code,
        indivAncestryName
    });

}

socket.on("returnHomebrewCompleteHeritage", function() {
  window.location.href = '/homebrew/?edit_id='+g_homebrewID;
});