/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

//------------------------- Processing Langs -------------------------//
function processingLangs(wscStatement, srcStruct, locationID, extraData){

    if(wscStatement.includes("GIVE-LANG-NAME")){ // GIVE-LANG-NAME=Elven
        let langName = wscStatement.split('=')[1];
        giveLangByName(srcStruct, langName, extraData);
    }
    else if(wscStatement.includes("GIVE-LANG-BONUS-ONLY")){// GIVE-LANG-BONUS-ONLY
        giveLang(srcStruct, locationID, extraData, true);
    }
    else if(wscStatement.includes("GIVE-LANG")){// GIVE-LANG
        giveLang(srcStruct, locationID, extraData, false);
    } else {
        displayError("Unknown statement (2-Lang): \'"+wscStatement+"\'");
        statementComplete('Lang - Unknown Statement');
    }

}

//////////////////////////////// Give Lang ///////////////////////////////////

function giveLang(srcStruct, locationID, extraData, bonusOnly){

    let selectLangID = "selectLang"+locationID+"-"+srcStruct.sourceCode+"-"+srcStruct.sourceCodeSNum;
    let selectLangControlShellClass = selectLangID+'ControlShell';
    let langDescriptionID = selectLangID+"Description";

    // If ID already exists, just return. This is a temporary fix - this shouldn't be an issue in the first place.
    if($('#'+selectLangID).length != 0) { statementComplete('Lang - Add Null'); return; }

    const selectionTagInfo = getTagFromData(srcStruct, extraData.sourceName, 'Unselected Language', 'UNSELECTED');

    $('#'+locationID).append('<div class="field is-grouped is-grouped-centered is-marginless my-1"><div class="select '+selectLangControlShellClass+'" data-selection-info="'+selectionTagInfo+'"><select id="'+selectLangID+'" class="selectLang"></select></div></div>');

    $('#'+locationID).append('<div class="columns is-centered is-marginless pb-1"><div id="'+langDescriptionID+'" class="column is-8 is-paddingless"></div></div>');

    $('#'+selectLangID).append('<option value="chooseDefault">Choose a Language</option>');
    $('#'+selectLangID).append('<optgroup label="──────────"></optgroup>');

    let availableLangsHTML = '';
    let nonAvailableLangsHTML = '';

    // Set saved prof choices to savedProfData
    let savedLang = getDataSingle(DATA_SOURCE.LANGUAGE, srcStruct);

    let sortedLangArray = g_allLanguages.sort(
      function(a, b) {
        return a.name > b.name ? 1 : -1;
      }
    );
    
    for(const lang of sortedLangArray){

        let langIsBonus = false;
        if(bonusOnly){
          let currentAncestry = getCharAncestry();
          if(currentAncestry != null){
            let bonusLang = currentAncestry.BonusLanguages.find(l => {
              return l.id == lang.id;
            });
            langIsBonus = (bonusLang != null);
          }
        }

        if(savedLang != null && savedLang.value != null && savedLang.value == lang.id) {
            if(bonusOnly && !langIsBonus){
              nonAvailableLangsHTML += '<option value="'+lang.id+'" class="is-non-available-very" selected>'+lang.name+'</option>';
            } else {
              availableLangsHTML += '<option value="'+lang.id+'" selected>'+lang.name+'</option>';
            }
        } else {
            if(bonusOnly && !langIsBonus){
              nonAvailableLangsHTML += '<option value="'+lang.id+'" class="is-non-available-very">'+lang.name+'</option>';
            } else {
              availableLangsHTML += '<option value="'+lang.id+'">'+lang.name+'</option>';
            }
        }

    }

    $('#'+selectLangID).append(availableLangsHTML);
    if(bonusOnly){
      $('#'+selectLangID).append('<optgroup label="──────────"></optgroup>');
      $('#'+selectLangID).append(nonAvailableLangsHTML);
    }

    // On lang choice change
    $('#'+selectLangID).change(function(event, triggerSave) {
        
        if($(this).val() == "chooseDefault"){
                
            $('.'+selectLangControlShellClass).removeClass("is-danger");
            $('.'+selectLangControlShellClass).addClass("is-info");

            deleteData(DATA_SOURCE.LANGUAGE, srcStruct);
            
            if(g_char_id != null){
              socket.emit("requestLanguageChange",
                  g_char_id,
                  srcStruct,
                  null);
            } else {
              saveBuildMetaData();
            }

        } else {

            $('.'+selectLangControlShellClass).removeClass("is-danger");
            $('.'+selectLangControlShellClass).removeClass("is-info");

            let langID = $(this).val();

            // Save lang
            if(triggerSave == null || triggerSave) {

                if(!checkDuplicateLang(langID)) {

                    $('#'+langDescriptionID).html('');

                    setDataLanguage(srcStruct, langID);
                    
                    if(g_char_id != null){
                      socket.emit("requestLanguageChange",
                          g_char_id,
                          srcStruct,
                          langID);
                    } else {
                      saveBuildMetaData();
                    }

                } else {
                    $('.'+selectLangControlShellClass).addClass("is-danger");

                    $('#'+langDescriptionID).html('<p class="help is-danger text-center">You already know this language!</p>');

                }
            
            } else {

                $('#'+langDescriptionID).html('');

                setDataLanguage(srcStruct, langID);

                if(g_char_id != null){
                  socket.emit("requestLanguageChange",
                      g_char_id,
                      srcStruct,
                      langID);
                } else {
                  saveBuildMetaData();
                }

            }
            
        }

        $(this).blur();

    });

    $('#'+selectLangID).trigger("change", [false]);

    statementComplete('Lang - Add');

}

socket.on("returnLanguageChange", function(){
    selectorUpdated();
});

function checkDuplicateLang(langID){
  for(const [key, data] of variables_getExtrasMap(VARIABLE.LANGUAGES).entries()){
    if(data.Value == langID){
      return true;
    }
  }
  return false;
}

//////////////////////////////// Give Lang (by Lang Name) ///////////////////////////////////

function giveLangByName(srcStruct, langName, extraData){

  let language = g_allLanguages.find(language => {
    return language.name.toUpperCase() == langName.toUpperCase();
  });
  if(language != null){
    setDataLanguage(srcStruct, language.id);
  }

  if(g_char_id != null){
    if(language != null){
      socket.emit("requestLanguageChangeByID",
          g_char_id,
          srcStruct,
          language.id);
    } else {
      console.error('Could not find language: '+langName);
    }
  } else {
    saveBuildMetaData();
  }

  statementComplete('Lang - Add By Name');

}
