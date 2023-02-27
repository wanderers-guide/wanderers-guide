/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

$(function () {

  socket.emit("requestHomebrewLanguageDetails", $('#builder-container').attr('data-bundle-id'));

});

socket.on("returnHomebrewLanguageDetails", function(languages){
    
    let languageID = $('#builder-container').attr('data-language-id');
    let language = languages.find(language => {
        return language.id == languageID;
    });

    if(language == null){
        window.location.href = '/homebrew';
        return;
    }

    $("#inputName").val(language.name);
    $("#inputSpeakers").val(language.speakers);
    $("#inputScript").val(language.script);
    $("#inputDescription").val(language.description);

    $("#updateButton").click(function(){
        $(this).unbind();
        finishLanguage(true);
    });

    stopSpinnerLoader();
});