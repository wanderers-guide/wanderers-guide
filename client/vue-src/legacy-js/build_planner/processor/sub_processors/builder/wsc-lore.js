/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

//--------------------- Processing Lore --------------------//
function processingLore(wscStatement, srcStruct, locationID, extraData){

    if(wscStatement.includes("GIVE-LORE=")){ // GIVE-LORE=Sailing
        let data = wscStatement.split('=')[1];
        let segments = data.split(':');

        giveLore(srcStruct, segments[0], extraData, segments[1]);
    } else if(wscStatement.includes("GIVE-LORE-CHOOSE-INCREASING")){ // GIVE-LORE-CHOOSE-INCREASING
        giveLoreChooseIncreasing(srcStruct, locationID, extraData);
    } else if(wscStatement.includes("GIVE-LORE-CHOOSE")){ // GIVE-LORE-CHOOSE
        giveLoreChoose(srcStruct, locationID, extraData);
    } else {
        displayError("Unknown statement (2-Lore): \'"+wscStatement+"\'");
        statementComplete('Lore - Unknown Statement');
    }

}

//////////////////////////////// Give Lore Choose ///////////////////////////////////

function giveLoreChooseIncreasing(srcStruct, locationID, extraData){
  // At 3rd, 7th, and 15th level automatically increase lore
  let charLevel = g_character.level;
  if(charLevel >= 15){
    giveLoreChoose(srcStruct, locationID, extraData, 'L');
  } else if(charLevel >= 7){
    giveLoreChoose(srcStruct, locationID, extraData, 'M');
  } else if(charLevel >= 3){
    giveLoreChoose(srcStruct, locationID, extraData, 'E');
  } else {
    giveLoreChoose(srcStruct, locationID, extraData, 'T');
  }
}

function giveLoreChoose(srcStruct, locationID, extraData, prof='T'){

    let inputLoreID = "inputLore"+locationID+"-"+srcStruct.sourceCode+"-"+srcStruct.sourceCodeSNum;
    let inputLoreControlShell = inputLoreID+'ControlShell';

    // If ID already exists, just return. This is a temporary fix - this shouldn't be an issue in the first place.
    if($('#'+inputLoreID).length != 0) { statementComplete('Lore - Add Null'); return; }

    $('#'+locationID).append('<div class="field is-grouped is-grouped-centered is-marginless my-1"><div id="'+inputLoreControlShell+'" class="control"><input id="'+inputLoreID+'" class="input loreInput" type="text" maxlength="20" placeholder="Lore Type" autocomplete="off"></div></div>');

    // Set saved lore input data
    let savedLoreData = getDataSingle(DATA_SOURCE.LORE, srcStruct);
    

    $('#'+inputLoreID).change(function(event, isAutoLoad){
        isAutoLoad = (isAutoLoad == null) ? false : isAutoLoad;

        if($(this).val() == ''){

            $(this).addClass("is-info");
            $(this).removeClass("is-danger");

            deleteData(DATA_SOURCE.LORE, srcStruct);
            deleteData(DATA_SOURCE.PROFICIENCY, srcStruct);

            if(g_char_id != null){
              $('#'+inputLoreControlShell).addClass("is-loading");
              socket.emit("requestLoreChange",
                  g_char_id,
                  srcStruct,
                  null,
                  { ControlShellID: inputLoreControlShell, isAutoLoad},
                  prof,
                  extraData.sourceName);
            } else {
              saveBuildMetaData();
            }

        } else {

            let validNameRegex = /^[A-Za-z0-9 \-_']+$/;
            if(validNameRegex.test($(this).val())) {
                $(this).removeClass("is-danger");
                $(this).removeClass("is-info");

                let loreName = $(this).val().toUpperCase();

                setData(DATA_SOURCE.LORE, srcStruct, loreName);
                setDataProficiencies(srcStruct, 'Skill', loreName+'_LORE', prof, extraData.sourceName, false);

                if(g_char_id != null){
                  $('#'+inputLoreControlShell).addClass("is-loading");
                  socket.emit("requestLoreChange",
                      g_char_id,
                      srcStruct,
                      loreName,
                      { ControlShellID: inputLoreControlShell, isAutoLoad},
                      prof,
                      extraData.sourceName);
                } else {
                  saveBuildMetaData();
                }

            } else {
                $(this).addClass("is-danger");
                $(this).removeClass("is-info");
            }

        }

    });

    if(savedLoreData != null){
      $('#'+inputLoreID).val(capitalizeWords(savedLoreData.value));
    }
    $('#'+inputLoreID).trigger("change", [true]);

    statementComplete('Lore - Add');

}

//////////////////////////////// Give Lore ///////////////////////////////////

function giveLore(srcStruct, loreName, extraData, altAbilityScore=null){

  setData(DATA_SOURCE.LORE, srcStruct,  loreName);
  setDataProficiencies(srcStruct, 'Skill', loreName+'_LORE', 'T', extraData.sourceName, false);

  if(g_char_id != null){
    socket.emit("requestLoreChange",
        g_char_id,
        srcStruct,
        loreName,
        null,
        'T',
        extraData.sourceName,
        altAbilityScore);
  } else {
    saveBuildMetaData();
  }

}

socket.on("returnLoreChange", function(srcStruct, loreName, inputPacket, prof){

  if(inputPacket != null){
    $('#'+inputPacket.ControlShellID).removeClass("is-loading");
    selectorUpdated();
  } else {
    statementComplete('Lore - Add By Name');
  }

});