/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

//--------------------- Processing Notes --------------------//
function processingNotes(wscStatement, srcStruct, locationID, sourceName){

    if(wscStatement.includes("GIVE-NOTES-FIELD")){ // GIVE-NOTES-FIELD=Placeholder Text
        let placeholderText = wscStatement.split('=')[1]; // - Displays notes field for feats and class abilities
        giveNotesField(srcStruct, placeholderText, locationID, sourceName);
    } else {
        displayError("Unknown statement (2-Notes): \'"+wscStatement+"\'");
        statementComplete();
    }

}

//////////////////////////////// Give Notes Field ///////////////////////////////////

function giveNotesField(srcStruct, placeholderText, locationID, sourceName){
    placeholderText = capitalizeWord(placeholderText);

    socket.emit("requestNotesFieldChange",
        getCharIDFromURL(),
        srcStruct,
        placeholderText,
        { locationID, sourceName });

}

socket.on("returnNotesFieldChange", function(notesData, noteChangePacket){
    statementComplete();
    if(noteChangePacket == null) { return; }

    let placeholderText = noteChangePacket.sourceName+' - '+notesData.placeholderText;
    let notesText = notesData.text;
    
    let notesFieldID = getCharIDFromURL()+'-notesField-'+notesData.sourceType+'-'+notesData.sourceLevel+'-'+notesData.sourceCode+'-'+notesData.sourceCodeSNum;
    let notesFieldControlShellID = notesFieldID+'ControlShell';

    // If ID already exists, just return. This is a temporary fix - this shouldn't be an issue in the first place.
    if($('#'+notesFieldID).length != 0) { return; }

    $('#'+noteChangePacket.locationID).append('<div id="'+notesFieldControlShellID+'" class="control my-1" style="max-width: 350px; margin: auto;"><textarea id="'+notesFieldID+'" class="textarea use-custom-scrollbar" rows="2" spellcheck="false" maxlength="3000" placeholder="'+placeholderText+'">'+notesText+'</textarea></div>');

    $("#"+notesFieldID).blur(function(){
        if(notesData.text != $(this).val()) {

            $("#"+notesFieldControlShellID).addClass("is-loading");
            
            notesData.text = $(this).val();

            socket.emit("requestNotesFieldSave",
                getCharIDFromURL(),
                notesData,
                notesFieldControlShellID);

        }
    });

});

socket.on("returnNotesFieldSave", function(notesFieldControlShellID){
    $("#"+notesFieldControlShellID).removeClass("is-loading");
});