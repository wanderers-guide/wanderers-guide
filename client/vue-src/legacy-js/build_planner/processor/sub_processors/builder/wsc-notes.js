/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

//--------------------- Processing Notes --------------------//
function processingNotes(wscStatement, srcStruct, locationID, extraData){

    if(wscStatement.includes("GIVE-NOTES-FIELD")){ // GIVE-NOTES-FIELD=Placeholder Text
        let placeholderText = wscStatement.split('=')[1]; // - Displays notes field for feats and class abilities
        giveNotesField(srcStruct, placeholderText, locationID, extraData);
    } else {
        displayError("Unknown statement (2-Notes): \'"+wscStatement+"\'");
        statementComplete('Notes - Unknown Statement');
    }

}

//////////////////////////////// Give Notes Field ///////////////////////////////////

function giveNotesField(srcStruct, placeholderText, locationID, extraData){
    placeholderText = capitalizeWord(placeholderText);

    setData(DATA_SOURCE.NOTES_FIELD, srcStruct, 'StoredNoteField');

    if(g_char_id != null){
      socket.emit("requestNotesFieldChange",
          g_char_id,
          srcStruct,
          placeholderText,
          { locationID, sourceName: extraData.sourceName });
    } else {
      saveBuildMetaData();
    }

}

socket.on("returnNotesFieldChange", function(notesData, noteChangePacket){
    console.log(`Waited for 'returnNotesFieldChange'.`);
    statementComplete('Notes - Add');
    if(noteChangePacket == null) { return; }

    let placeholderText = noteChangePacket.sourceName+' - '+notesData.placeholderText;
    let notesText = notesData.text;
    
    let notesFieldID = g_char_id+'-notesField-'+notesData.sourceType+'-'+notesData.sourceLevel+'-'+notesData.sourceCode+'-'+notesData.sourceCodeSNum;
    let notesFieldControlShellID = notesFieldID+'ControlShell';

    // If ID already exists, just return. This is a temporary fix - this shouldn't be an issue in the first place.
    if($('#'+notesFieldID).length != 0) { return; }

    $('#'+noteChangePacket.locationID).append('<div id="'+notesFieldControlShellID+'" class="control my-1" style="max-width: 350px; margin: auto;"><textarea id="'+notesFieldID+'" class="textarea use-custom-scrollbar" rows="2" spellcheck="false" maxlength="3000" placeholder="'+placeholderText+'">'+notesText+'</textarea></div>');

    $("#"+notesFieldID).blur(function(){
        if(notesData.text != $(this).val()) {

            $("#"+notesFieldControlShellID).addClass("is-loading");
            
            notesData.text = $(this).val();

            if(g_char_id != null){
              socket.emit("requestNotesFieldSave",
                  g_char_id,
                  notesData,
                  notesFieldControlShellID);
            } else {
              saveBuildMetaData();
            }

        }
    });

});

socket.on("returnNotesFieldSave", function(notesFieldControlShellID){
    $("#"+notesFieldControlShellID).removeClass("is-loading");
});