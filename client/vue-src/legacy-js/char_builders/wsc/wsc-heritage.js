/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

//------------------------- Processing Heritage Effects -------------------------//
function processingHeritageEffects(wscStatement, srcStruct, locationID, sourceName){

  if(wscStatement.includes("GIVE-HERITAGE-EFFECTS-NAME")){ // GIVE-HERITAGE-EFFECTS-NAME=Ancient Elf
      let value = wscStatement.split('=')[1];
      giveHeritageEffectsByName(srcStruct, locationID, value, sourceName);
  } else if(wscStatement.includes("GIVE-HERITAGE-EFFECTS-ANCESTRY")){ // GIVE-HERITAGE-EFFECTS-ANCESTRY=Elf
    let value = wscStatement.split('=')[1];
    giveHeritageEffectsFindHeritages(srcStruct, locationID, value, sourceName);
  } else {
      displayError("Unknown statement (2-HeritageEffects): \'"+wscStatement+"\'");
      statementComplete();
  }

}


//////////////////////////////// Give Heritage Effects Selection ///////////////////////////////////
function giveHeritageEffectsFindHeritages(srcStruct, locationID, ancestryName, sourceName){

  socket.emit("requestFindHeritagesFromAncestryName",
      getCharIDFromURL(),
      srcStruct,
      ancestryName,
      { locationID, sourceName });

}

socket.on("returnFindHeritagesFromAncestryName", function(srcStruct, heritages, inputPacket){

  let selectHeritageEffectsID = "selectHeritageEffects-"+inputPacket.locationID+"-"+srcStruct.sourceCode+"-"+srcStruct.sourceCodeSNum;
  let selectHeritageEffectsControlShellClass = selectHeritageEffectsID+'-ControlShell';
  let selectHeritageEffectsDescriptionID = selectHeritageEffectsID+"-Description";

  // If ID already exists, just return. This is a temporary fix - this shouldn't be an issue in the first place.
  if($('#'+selectHeritageEffectsID).length != 0) { statementComplete(); return; }

  const selectionTagInfo = getTagFromData(srcStruct, inputPacket.sourceName, 'Unselected Heritage', 'UNSELECTED');

  $('#'+inputPacket.locationID).append('<div class="field is-grouped is-grouped-centered is-marginless my-1"><div class="select '+selectHeritageEffectsControlShellClass+'" data-selection-info="'+selectionTagInfo+'"><select id="'+selectHeritageEffectsID+'" class="selectLang"></select></div></div>');

  $('#'+inputPacket.locationID).append('<div class="columns is-centered is-marginless pb-2"><div id="'+selectHeritageEffectsDescriptionID+'" class="column is-8 is-paddingless"></div></div>');

  $('#'+selectHeritageEffectsID).append('<option value="chooseDefault">Choose a Heritage</option>');
  $('#'+selectHeritageEffectsID).append('<optgroup label="──────────"></optgroup>');

  // Set saved prof choices to savedProfData
  const savedHeritage = wscChoiceStruct.HeritageEffectsArray.find(heritageData => {
      return hasSameSrc(heritageData, srcStruct);
  });

  for(const heritage of heritages){
    if(savedHeritage != null && savedHeritage.value != null && savedHeritage.value.id == heritage.id) {
      $('#'+selectHeritageEffectsID).append('<option value="'+heritage.id+'" selected>'+heritage.name+'</option>');
    } else {
      $('#'+selectHeritageEffectsID).append('<option value="'+heritage.id+'">'+heritage.name+'</option>');
    }
  }

  // On heritage choice change
  $('#'+selectHeritageEffectsID).change(function(event, triggerSave) {

      if($(this).val() == "chooseDefault"){
              
          $('.'+selectHeritageEffectsControlShellClass).addClass("is-info");

          $('#'+selectHeritageEffectsDescriptionID).html('');

          // Save heritage effects
          if(triggerSave == null || triggerSave) {
            socket.emit("requestHeritageEffectsChange",
                getCharIDFromURL(),
                srcStruct,
                null,
                true);
          }

          heritageEffectsUpdateWSCChoiceStruct(srcStruct, null);

      } else {

          $('.'+selectHeritageEffectsControlShellClass).removeClass("is-info");

          $('#'+selectHeritageEffectsDescriptionID).html('');

          let heritageID = $(this).val();

          const heritage = heritages.find(heritage => {
            return heritage.id == heritageID;
          });

          // Save heritage effects
          if(triggerSave == null || triggerSave) {

            socket.emit("requestHeritageEffectsChange",
                getCharIDFromURL(),
                srcStruct,
                heritageID,
                true);

            socket.once("returnHeritageEffectsChange", function(){
              displayAndProcessHeritageEffects(
                srcStruct, heritage, selectHeritageEffectsDescriptionID, inputPacket.sourceName);
            });

          } else {

            displayAndProcessHeritageEffects(srcStruct, heritage, selectHeritageEffectsDescriptionID, inputPacket.sourceName);

          }

          
      }

      $(this).blur();

  });

  $('#'+selectHeritageEffectsID).trigger("change", [false]);

  statementComplete();

});




function giveHeritageEffectsByName(srcStruct, locationID, heritageName, sourceName) {

  socket.emit("requestAddHeritageEffect",
      getCharIDFromURL(),
      srcStruct,
      heritageName,
      { locationID, sourceName });

}

socket.on("returnAddHeritageEffect", function(srcStruct, heritage, inputPacket){
  if(heritage == null) { statementComplete(); return; }

  displayAndProcessHeritageEffects(srcStruct, heritage, inputPacket.locationID, inputPacket.sourceName);
  
  statementComplete();

});


function displayAndProcessHeritageEffects(srcStruct, heritage, locationID, sourceName){

  let heritageLocationCodeID = locationID+'-heritageCode';

  $('#'+locationID).append('<div class="box lighter my-2"><span class="is-size-4 has-text-weight-semibold">'+heritage.name+'</span><div class="container ability-text-section">'+processText(heritage.description, false, null)+'</div><div id="'+heritageLocationCodeID+'"></div></div>');

  processBuilderCode(
    heritage.code,
    srcStruct,
    heritageLocationCodeID,
    heritage.name);

  heritageEffectsUpdateWSCChoiceStruct(srcStruct, heritage);

}

function heritageEffectsUpdateWSCChoiceStruct(srcStruct, heritage){

  let heritageEffectsArray = wscChoiceStruct.HeritageEffectsArray;

  let foundHeritageData = false;
  for(let heritageData of heritageEffectsArray){
      if(hasSameSrc(heritageData, srcStruct)){
          foundHeritageData = true;
          if(heritage != null){
            heritageData.value = heritage;
          } else {
            heritageData.value = null;
          }
          break;
      }
  }

  if(!foundHeritageData && heritage != null){
    let heritageData = cloneObj(srcStruct);
    heritageData.value = heritage;
    heritageEffectsArray.push(heritageData);
  }

  wscChoiceStruct.HeritageEffectsArray = heritageEffectsArray;

}