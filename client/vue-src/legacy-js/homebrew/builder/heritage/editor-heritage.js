/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

$(function () {

});

socket.on("returnHomebrewHeritageDetails", function(heritageArray, ancestryArray){
    
    let heritageID = $('#builder-container').attr('data-heritage-id');
    let heritage = heritageArray.find(heritage => {
        return heritage.id == heritageID;
    });

    if(heritage == null){
        window.location.href = '/homebrew';
        return;
    }

    let heritageName = heritage.name.replace(" "+heritage.indivAncestryName,"");
    $('#inputName').val(heritageName);
    $('#inputRarity').val(heritage.rarity);
    $('#inputDesc').val(heritage.description);
    $('#inputCode').val(heritage.code);
    $('#inputHeritageFor').val(heritage.indivAncestryName);

    $("#updateButton").click(function(){
        $(this).unbind();
        finishHeritage(true);
    });

    stopSpinnerLoader();
});