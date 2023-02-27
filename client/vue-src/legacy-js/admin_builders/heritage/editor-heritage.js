/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

$(function () {

});

socket.on("returnAdminHeritageDetails", function(heritageArray, ancestryArray){
    
    let heritageID = getHeritageEditorIDFromURL();
    let heritage = heritageArray.find(heritage => {
        return heritage.id == heritageID;
    });

    if(heritage == null){
        window.location.href = '/admin/manage/heritage';
        return;
    }

    let heritageName = heritage.name.replace(" "+heritage.indivAncestryName,"");
    $('#inputName').val(heritageName);
    $('#inputRarity').val(heritage.rarity);
    $('#inputDesc').val(heritage.description);
    $('#inputCode').val(heritage.code);
    $('#inputHeritageFor').val(heritage.indivAncestryName);
    $("#inputContentSource").val(heritage.contentSrc);

    $("#updateButton").click(function(){
        $(this).unbind();
        finishHeritage(true);
    });

});