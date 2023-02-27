/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

//------------------------- Processing Langs -------------------------//
function processingLangs(wscStatement, srcStruct, locationID, sourceName){

    if(wscStatement.includes("GIVE-LANG-NAME")){ // GIVE-LANG-NAME=Elven
        let langName = wscStatement.split('=')[1];
        giveLangByName(srcStruct, langName, sourceName);
    }
    else if(wscStatement.includes("GIVE-LANG-BONUS-ONLY")){// GIVE-LANG-BONUS-ONLY
        giveLang(srcStruct, locationID, sourceName, true);
    }
    else if(wscStatement.includes("GIVE-LANG")){// GIVE-LANG
        giveLang(srcStruct, locationID, sourceName, false);
    } else {
        displayError("Unknown statement (2-Lang): \'"+wscStatement+"\'");
        statementComplete();
    }

}

//////////////////////////////// Give Lang ///////////////////////////////////

function giveLang(srcStruct, locationID, sourceName, bonusOnly){

    let selectLangID = "selectLang"+locationID+"-"+srcStruct.sourceCode+"-"+srcStruct.sourceCodeSNum;
    let selectLangControlShellClass = selectLangID+'ControlShell';
    let langDescriptionID = selectLangID+"Description";

    // If ID already exists, just return. This is a temporary fix - this shouldn't be an issue in the first place.
    if($('#'+selectLangID).length != 0) { statementComplete(); return; }

    const selectionTagInfo = getTagFromData(srcStruct, sourceName, 'Unselected Language', 'UNSELECTED');

    $('#'+locationID).append('<div class="field is-grouped is-grouped-centered is-marginless my-1"><div class="select '+selectLangControlShellClass+'" data-selection-info="'+selectionTagInfo+'"><select id="'+selectLangID+'" class="selectLang"></select></div></div>');

    $('#'+locationID).append('<div class="columns is-centered is-marginless pb-2"><div id="'+langDescriptionID+'" class="column is-8 is-paddingless"></div></div>');

    $('#'+selectLangID).append('<option value="chooseDefault">Choose a Language</option>');
    $('#'+selectLangID).append('<optgroup label="──────────"></optgroup>');

    // Set saved prof choices to savedProfData
    let langArray = wscChoiceStruct.LangArray;

    let savedLang = langArray.find(lang => {
        return hasSameSrc(lang, srcStruct);
    });

    let sortedLangMap = new Map([...g_langMap.entries()].sort(
        function(a, b) {
            return a[1].IsBonus && !b[1].IsBonus ? -1 : 1;
        })
    );

    let isStillBonusLang = true;
    for(const [langID, langData] of sortedLangMap.entries()){

        if(!langData.IsBonus){
          if(isStillBonusLang){
            $('#'+selectLangID).append('<optgroup label="──────────"></optgroup>');
          }
          isStillBonusLang = false;
        }

        if(savedLang != null && savedLang.value.id == langID) {
            if(bonusOnly && !langData.IsBonus){
                $('#'+selectLangID).append('<option value="'+langData.Lang.id+'" class="is-non-available-very" selected>'+langData.Lang.name+'</option>');
            } else {
                $('#'+selectLangID).append('<option value="'+langData.Lang.id+'" selected>'+langData.Lang.name+'</option>');
            }
        } else {
            if(bonusOnly && !langData.IsBonus){
                $('#'+selectLangID).append('<option value="'+langData.Lang.id+'" class="is-non-available-very">'+langData.Lang.name+'</option>');
            } else {
                $('#'+selectLangID).append('<option value="'+langData.Lang.id+'">'+langData.Lang.name+'</option>');
            }
        }

    }

    // On lang choice change
    $('#'+selectLangID).change(function(event, triggerSave) {
        
        if($(this).val() == "chooseDefault"){
                
            $('.'+selectLangControlShellClass).removeClass("is-danger");
            $('.'+selectLangControlShellClass).addClass("is-info");

            langsUpdateWSCChoiceStruct(srcStruct, null);
            socket.emit("requestLanguageChange",
                getCharIDFromURL(),
                srcStruct,
                null);

        } else {

            $('.'+selectLangControlShellClass).removeClass("is-danger");
            $('.'+selectLangControlShellClass).removeClass("is-info");

            let langID = $(this).val();

            // Save lang
            if(triggerSave == null || triggerSave) {

                let langArray = wscChoiceStruct.LangArray;
                if(!hasDuplicateLang(langArray, langID)) {

                    $('#'+langDescriptionID).html('');

                    langsUpdateWSCChoiceStruct(srcStruct, langID);
                    socket.emit("requestLanguageChange",
                        getCharIDFromURL(),
                        srcStruct,
                        langID);

                } else {
                    $('.'+selectLangControlShellClass).addClass("is-danger");

                    $('#'+langDescriptionID).html('<p class="help is-danger text-center">You already know this language!</p>');

                }
            
            } else {

                $('#'+langDescriptionID).html('');

                langsUpdateWSCChoiceStruct(srcStruct, langID);
                socket.emit("requestLanguageChange",
                    getCharIDFromURL(),
                    srcStruct,
                    langID);

            }
            
        }

        $(this).blur();

    });

    $('#'+selectLangID).trigger("change", [false]);

    statementComplete();

}

socket.on("returnLanguageChange", function(){
    selectorUpdated();
    socket.emit("requestWSCUpdateLangs", getCharIDFromURL());
});

//////////////////////////////// Give Lang (by Lang Name) ///////////////////////////////////

function giveLangByName(srcStruct, langName, sourceName){

    socket.emit("requestLanguageChangeByName", // No longer a socket request
        getCharIDFromURL(),
        srcStruct,
        langName);

}

socket.on("returnLanguageChangeByName", function(){
    statementComplete();
});



function langsUpdateWSCChoiceStruct(srcStruct, langID){
    
  let langArray = wscChoiceStruct.LangArray;
  let langStruct = (langID != null) ? g_langMap.get(langID+"") : null;

  let foundLangData = false;
  for(let langData of langArray){
    if(hasSameSrc(langData, srcStruct)){
      foundLangData = true;
      if(langStruct != null){
        langData.value = langStruct.Lang;
      } else {
        langData.value = {};
      }
      break;
    }
  }

  if(!foundLangData && langStruct != null){
    let langData = cloneObj(srcStruct);
    langData.value = langStruct.Lang;
    langArray.push(langData);
  }

  wscChoiceStruct.LangArray = langArray;

}