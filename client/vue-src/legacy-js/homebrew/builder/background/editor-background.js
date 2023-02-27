/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

$(function () {

  socket.emit("requestHomebrewBackgroundDetails", $('#builder-container').attr('data-bundle-id'));

});

socket.on("returnHomebrewBackgroundDetails", function(backgrounds){
    
    let backgroundID = $('#builder-container').attr('data-background-id');
    let background = backgrounds.find(background => {
        return background.id == backgroundID;
    });

    if(background == null){
        window.location.href = '/homebrew';
        return;
    }

    $("#inputName").val(background.name);
    $("#inputRarity").val(background.rarity);
    $("#inputDescription").val(background.description);
    $("#inputCode").val(background.code);

    // Background Boost
    if(background.boostOne != null){
        let boostArray = background.boostOne.split(',');
        for(let boost of boostArray){
            $('#inputBoosts option[value="'+boost+'"]').attr('selected','selected');
        }
    }

    $("#updateButton").click(function(){
        $(this).unbind();
        finishBackground(true);
    });

    stopSpinnerLoader();
});