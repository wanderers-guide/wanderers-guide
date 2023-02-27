/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

$(function () {

  socket.emit("requestHomebrewToggleableDetails", $('#builder-container').attr('data-bundle-id'));

});

socket.on("returnHomebrewToggleableDetails", function(toggleables){
    
    let toggleableID = $('#builder-container').attr('data-toggleable-id');
    let toggleable = toggleables.find(toggleable => {
        return toggleable.id == toggleableID;
    });

    if(toggleable == null){
        window.location.href = '/homebrew';
        return;
    }

    $("#inputName").val(toggleable.name);
    $("#inputDescription").val(toggleable.description);
    $("#inputCode").val(toggleable.code);

    $("#updateButton").click(function(){
        $(this).unbind();
        finishToggleable(true);
    });

    stopSpinnerLoader();
});