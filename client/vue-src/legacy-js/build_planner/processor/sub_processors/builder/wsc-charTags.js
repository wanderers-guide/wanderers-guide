/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

//--------------------- Processing Char Tags --------------------//
function processingCharTags(wscStatement, srcStruct, locationID, extraData){
    
    if(wscStatement.includes("GIVE-CHAR-TRAIT-NAME")){ // GIVE-CHAR-TRAIT-NAME=Elf
        let charTagName = wscStatement.split('=')[1];
        giveCharTag(srcStruct, charTagName);
    } else if(wscStatement.includes("GIVE-CHAR-TRAIT-COMMON")){ // GIVE-CHAR-TRAIT-COMMON
        displayCharTagChoice(srcStruct, locationID, extraData, true);
    } else if(wscStatement.includes("GIVE-CHAR-TRAIT")){ // GIVE-CHAR-TRAIT
        displayCharTagChoice(srcStruct, locationID, extraData);
    } else {
        displayError("Unknown statement (2-CharTrait): \'"+wscStatement+"\'");
        statementComplete('CharTrait - Unknown Statement');
    }

}

//////////////////////////////// Give Char Tag ///////////////////////////////////

function giveCharTag(srcStruct, charTagName){
    charTagName = capitalizeWords(charTagName);

    setData(DATA_SOURCE.CHAR_TRAIT, srcStruct, charTagName);

    if(g_char_id != null){
      socket.emit("requestCharTagChange",
          g_char_id,
          srcStruct,
          charTagName);
    } else {
      saveBuildMetaData();
    }
    
    statementComplete('CharTrait - Give');
}

/*
socket.on("returnCharTagChange", function(charTagsArray){
    if($('#quickviewLeftDefault').hasClass('is-active')){
        openLeftQuickView('skillsView', null);
    }
    statementComplete('CharTrait - Change');
});
*/

//////////////////////////////// Give Char Tag Selector ///////////////////////////////////

function displayCharTagChoice(srcStruct, locationID, extraData, commonOnly=false){

    let selectCharTagID = "selectCharTag"+locationID+"-"+srcStruct.sourceCode+"-"+srcStruct.sourceCodeSNum;
    let selectCharTagControlShellClass = selectCharTagID+'ControlShell';

    const selectionTagInfo = getTagFromData(srcStruct, extraData.sourceName, 'Unselected Option', 'UNSELECTED');

    $('#'+locationID).append('<div class="field my-2 text-center"><div class="select '+selectCharTagControlShellClass+'" data-selection-info="'+selectionTagInfo+'"><select id="'+selectCharTagID+'" class="selectCharTag"></select></div></div>');

    $('#'+selectCharTagID).append('<option value="chooseDefault">Choose an Ancestry</option>');
    $('#'+selectCharTagID).append('<optgroup label="──────────"></optgroup>');

    let triggerChange = false;
    // Set saved char trait choices
    const charTagsData = getDataSingle(DATA_SOURCE.CHAR_TRAIT, srcStruct);

    let selectedCharTag = null;
    if(charTagsData != null && charTagsData.value != null){
      selectedCharTag = charTagsData;
      triggerChange = true;
    }

    let sortedAncestriesMap = new Map([...g_ancestryMap.entries()].sort(
      function(a, b) {
        return a[1].Ancestry.name > b[1].Ancestry.name ? 1 : -1;
      })
    );

    if(commonOnly) {

      for(const [ancestryID, ancestryData] of sortedAncestriesMap.entries()){
        if(ancestryData.Ancestry.isArchived === 0 && ancestryData.Ancestry.rarity === 'COMMON'){
          $('#'+selectCharTagID).append('<option value="'+ancestryData.Ancestry.name+'">'+ancestryData.Ancestry.name+'</option>');
        }
      }
      $('#'+selectCharTagID).append('<optgroup label="──────────"></optgroup>');
      for(const [ancestryID, ancestryData] of sortedAncestriesMap.entries()){
        if(ancestryData.Ancestry.isArchived === 0 && ancestryData.Ancestry.rarity !== 'COMMON'){
          $('#'+selectCharTagID).append('<option value="'+ancestryData.Ancestry.name+'" class="is-non-available-very">'+ancestryData.Ancestry.name+'</option>');
        }
      }

    } else {

      for(const [ancestryID, ancestryData] of sortedAncestriesMap.entries()){
        if(ancestryData.Ancestry.isArchived === 0){
          $('#'+selectCharTagID).append('<option value="'+ancestryData.Ancestry.name+'">'+ancestryData.Ancestry.name+'</option>');
        }
      }

    }

    if(selectedCharTag != null){
        $('#'+selectCharTagID).val(selectedCharTag.value);
        if ($('#'+selectCharTagID).val() != selectedCharTag.value){
            $('#'+selectCharTagID).val('chooseDefault');
            $('#'+selectCharTagID).parent().addClass("is-info");
        }
    }

    // On char tag choice change
    $('#'+selectCharTagID).change(function(event, triggerSave, triggerReload) {
        if(triggerReload == null){ triggerReload = true; }

        let charTagName = $(this).val();

        if($(this).val() == "chooseDefault"){
            $('.'+selectCharTagControlShellClass).addClass("is-info");
            deleteData(DATA_SOURCE.CHAR_TRAIT, srcStruct);

            if(g_char_id != null){
              socket.emit("requestWSCCharTagChange",
                  g_char_id,
                  srcStruct,
                  null,
                  selectCharTagControlShellClass,
                  triggerReload);
            } else {
              saveBuildMetaData();
            }

        } else {
            $('.'+selectCharTagControlShellClass).removeClass("is-info");

            // Save char tag
            if(triggerSave == null || triggerSave) {
                $('.'+selectCharTagControlShellClass).addClass("is-loading");
                setData(DATA_SOURCE.CHAR_TRAIT, srcStruct, charTagName);

                if(g_char_id != null){
                  socket.emit("requestWSCCharTagChange",
                      g_char_id,
                      srcStruct,
                      charTagName,
                      selectCharTagControlShellClass,
                      triggerReload);
                } else {
                  saveBuildMetaData();
                }
            }

        }
        
    });

    $('#'+selectCharTagID).trigger("change", [triggerChange, false]);

    statementComplete('CharTrait - Display Choice');

}

socket.on("returnWSCCharTagChange", function(charTagsArray, selectControlShellClass, triggerReload){
    if(selectControlShellClass != null) {
        $('.'+selectControlShellClass).removeClass("is-loading");
        $('.'+selectControlShellClass+'>select').blur();
    }
    selectorUpdated();

    // Reload builder state,
    if(triggerReload){
      animatedStateLoad();
    }

});