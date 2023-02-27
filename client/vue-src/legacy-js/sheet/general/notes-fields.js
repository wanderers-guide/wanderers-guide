/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

function displayNotesField(qContent, srcStruct, rows=4){

    let notesData = getNotesData(srcStruct);
    if(notesData == null){ return; }

    let placeholderText = notesData.placeholderText;
    let notesText = notesData.text;

    let notesFieldID = notesData.charID+'-'+notesData.source+'-'+notesData.sourceType+'-'+notesData.sourceLevel+'-'+notesData.sourceCode+'-'+notesData.sourceCodeSNum;
    let notesFieldControlShellID = notesFieldID+'ControlShell';
    qContent.append('<div id="'+notesFieldControlShellID+'" class="control mt-1 mx-1"><textarea id="'+notesFieldID+'" class="textarea use-custom-scrollbar" rows="'+rows+'" spellcheck="false" maxlength="3000" placeholder="'+placeholderText+'">'+notesText+'</textarea></div>');

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

}

function getNotesData(srcStruct){
    for(let notesData of g_notesFields) {
        // Checks if the note field statement's parent is the input srcStruct
        if(srcStruct.sourceCode === notesData.sourceCode){
            let sNum = notesData.sourceCodeSNum.substr(1); // Remove first char
            if(srcStruct.sourceCodeSNum === sNum || (srcStruct.sourceCodeSNum == 'a' && sNum == '')) {
                return notesData;
            }
        }
    }
    return null;
}

socket.on("returnNotesFieldSave", function(notesFieldControlShellID){
    $("#"+notesFieldControlShellID).removeClass("is-loading");
});