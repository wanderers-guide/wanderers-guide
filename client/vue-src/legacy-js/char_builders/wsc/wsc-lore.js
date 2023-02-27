/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

//--------------------- Processing Lore --------------------//
function processingLore(wscStatement, srcStruct, locationID, sourceName){

    if(wscStatement.includes("GIVE-LORE=")){ // GIVE-LORE=Sailing
        let loreName = wscStatement.split('=')[1];
        giveLore(srcStruct, loreName, sourceName);
    } else if(wscStatement.includes("GIVE-LORE-CHOOSE-INCREASING")){ // GIVE-LORE-CHOOSE-INCREASING
        giveLoreChooseIncreasing(srcStruct, locationID, sourceName);
    } else if(wscStatement.includes("GIVE-LORE-CHOOSE")){ // GIVE-LORE-CHOOSE
        giveLoreChoose(srcStruct, locationID, sourceName);
    } else {
        displayError("Unknown statement (2-Lore): \'"+wscStatement+"\'");
        statementComplete();
    }

}

//////////////////////////////// Give Lore Choose ///////////////////////////////////

function giveLoreChooseIncreasing(srcStruct, locationID, sourceName){
  // At 3rd, 7th, and 15th level automatically increase lore
  let charLevel = wscChoiceStruct.Character.level;
  if(charLevel >= 15){
    giveLoreChoose(srcStruct, locationID, sourceName, 'L');
  } else if(charLevel >= 7){
    giveLoreChoose(srcStruct, locationID, sourceName, 'M');
  } else if(charLevel >= 3){
    giveLoreChoose(srcStruct, locationID, sourceName, 'E');
  } else {
    giveLoreChoose(srcStruct, locationID, sourceName, 'T');
  }
}

function giveLoreChoose(srcStruct, locationID, sourceName, prof='T'){

    let inputLoreID = "inputLore"+locationID+"-"+srcStruct.sourceCode+"-"+srcStruct.sourceCodeSNum;
    let inputLoreControlShell = inputLoreID+'ControlShell';

    // If ID already exists, just return. This is a temporary fix - this shouldn't be an issue in the first place.
    if($('#'+inputLoreID).length != 0) { statementComplete(); return; }

    $('#'+locationID).append('<div class="field is-grouped is-grouped-centered is-marginless my-1"><div id="'+inputLoreControlShell+'" class="control"><input id="'+inputLoreID+'" class="input loreInput" type="text" maxlength="20" placeholder="Lore Type" autocomplete="off"></div></div>');

    // Set saved lore input data
    let savedLoreData = wscChoiceStruct.LoreArray.find(loreData => {
        return hasSameSrc(loreData, srcStruct);
    });

    $('#'+inputLoreID).change(function(event, isAutoLoad){
        isAutoLoad = (isAutoLoad == null) ? false : isAutoLoad;

        if($(this).val() == ''){

            $(this).removeClass("is-danger");
            $('#'+inputLoreControlShell).addClass("is-loading");
            socket.emit("requestLoreChange",
                getCharIDFromURL(),
                srcStruct,
                null,
                { ControlShellID: inputLoreControlShell, isAutoLoad},
                prof,
                sourceName);

        } else {

            let validNameRegex = /^[A-Za-z0-9 \-_']+$/;
            if(validNameRegex.test($(this).val())) {
                $(this).removeClass("is-danger");

                $('#'+inputLoreControlShell).addClass("is-loading");
                socket.emit("requestLoreChange",
                    getCharIDFromURL(),
                    srcStruct,
                    $(this).val().toUpperCase(),
                    { ControlShellID: inputLoreControlShell, isAutoLoad},
                    prof,
                    sourceName);

            } else {
                $(this).addClass("is-danger");
            }

        }

    });

    if(savedLoreData != null){
      $('#'+inputLoreID).val(capitalizeWords(savedLoreData.value));
    }
    $('#'+inputLoreID).trigger("change", [true]);

    statementComplete();

}

//////////////////////////////// Give Lore ///////////////////////////////////

function giveLore(srcStruct, loreName, sourceName){

    socket.emit("requestLoreChange",
        getCharIDFromURL(),
        srcStruct,
        loreName,
        null,
        'T',
        sourceName);

}

socket.on("returnLoreChange", function(srcStruct, loreName, inputPacket, prof){

    if(inputPacket != null){
        $('#'+inputPacket.ControlShellID).removeClass("is-loading");
    } else {
        statementComplete();
    }

    loreUpdateWSCChoiceStruct(srcStruct, loreName);
    if(loreName != null){
        //skillsUpdateWSCChoiceStruct(srcStruct, loreName+'_LORE', prof);
    } else {
        //skillsUpdateWSCChoiceStruct(srcStruct, null, null);
    }
    if(inputPacket == null || inputPacket.isAutoLoad == null || !inputPacket.isAutoLoad) {
      updateSkillMap(true);
    }

});

function loreUpdateWSCChoiceStruct(srcStruct, loreName){

    if(loreName != null){ loreName = loreName.toUpperCase(); }
    let loreArray = wscChoiceStruct.LoreArray;

    let foundLoreData = false;
    for(let loreData of loreArray){
        if(hasSameSrc(loreData, srcStruct)){
            foundLoreData = true;
            if(loreName != null){
                loreData.value = loreName;
            } else {
                loreData.value = null;
            }
            break;
        }
    }

    if(!foundLoreData){
        let loreData = cloneObj(srcStruct);
        loreData.value = loreName;
        loreArray.push(loreData);
    }

    wscChoiceStruct.LoreArray = loreArray;

}