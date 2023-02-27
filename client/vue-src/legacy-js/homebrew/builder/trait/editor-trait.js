/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

$(function () {

  socket.emit("requestHomebrewTraitDetails", $('#builder-container').attr('data-bundle-id'));

});

socket.on("returnHomebrewTraitDetails", function(traits){
    
    let traitID = $('#builder-container').attr('data-trait-id');
    let trait = traits.find(trait => {
        return trait.id == traitID;
    });

    if(trait == null){
        window.location.href = '/homebrew';
        return;
    }

    $("#inputName").val(trait.name);
    $("#inputDescription").val(trait.description);

    $("#updateButton").click(function(){
        $(this).unbind();
        finishTrait(true);
    });

    stopSpinnerLoader();
});