/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

//------------------------- Processing Heritage Effects -------------------------//
function processingHeritageEffects(wscStatement, srcStruct, locationID, extraData){

  if(wscStatement.includes("GIVE-HERITAGE-EFFECTS-NAME")){ // GIVE-HERITAGE-EFFECTS-NAME=Ancient Elf
      let value = wscStatement.split('=')[1];
      giveHeritageEffectsByName(srcStruct, locationID, value, extraData);
  } else if(wscStatement.includes("GIVE-HERITAGE-EFFECTS-ANCESTRY")){ // GIVE-HERITAGE-EFFECTS-ANCESTRY=Elf
    let value = wscStatement.split('=')[1];
    giveHeritageEffectsFindHeritages(srcStruct, locationID, value, extraData);
  } else {
      displayError("Unknown statement (2-HeritageEffects): \'"+wscStatement+"\'");
      statementComplete('Heritage - Unknown Statement');
  }

}


//////////////////////////////// Give Heritage Effects Selection ///////////////////////////////////
function giveHeritageEffectsFindHeritages(srcStruct, locationID, ancestryName, extraData){

  if(g_char_id != null){ // TODO - Support builds
    socket.emit("requestFindHeritagesFromAncestryName",
        g_char_id,
        srcStruct,
        ancestryName,
        { locationID, sourceName: extraData.sourceName });
  }

}

socket.on("returnFindHeritagesFromAncestryName", function(srcStruct, heritages, inputPacket){
  console.log(`Waited for 'returnFindHeritagesFromAncestryName'.`);

  let selectHeritageEffectsID = "selectHeritageEffects-"+inputPacket.locationID+"-"+srcStruct.sourceCode+"-"+srcStruct.sourceCodeSNum;
  let selectHeritageEffectsControlShellClass = selectHeritageEffectsID+'-ControlShell';
  let selectHeritageEffectsDescriptionID = selectHeritageEffectsID+"-Description";

  // If ID already exists, just return. This is a temporary fix - this shouldn't be an issue in the first place.
  if($('#'+selectHeritageEffectsID).length != 0) { statementComplete('Heritage - Add Error'); return; }

  const selectionTagInfo = getTagFromData(srcStruct, inputPacket.sourceName, 'Unselected Heritage', 'UNSELECTED');

  $('#'+inputPacket.locationID).append('<div class="field is-grouped is-grouped-centered is-marginless my-1"><div class="select '+selectHeritageEffectsControlShellClass+'" data-selection-info="'+selectionTagInfo+'"><select id="'+selectHeritageEffectsID+'" class="selectLang"></select></div></div>');

  $('#'+inputPacket.locationID).append('<div class="columns is-centered is-marginless pb-2"><div id="'+selectHeritageEffectsDescriptionID+'" class="column is-8 is-paddingless"></div></div>');

  $('#'+selectHeritageEffectsID).append('<option value="chooseDefault">Choose a Heritage</option>');
  $('#'+selectHeritageEffectsID).append('<optgroup label="──────────"></optgroup>');

  // Get saved extra heritage
  const savedHeritage = getDataSingle(DATA_SOURCE.EXTRA_HERITAGE, srcStruct);

  for(const heritage of heritages){
    if(savedHeritage != null && savedHeritage.value != null && savedHeritage.value == heritage.id) {
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

            deleteData(DATA_SOURCE.EXTRA_HERITAGE, srcStruct);

            socket.emit("requestHeritageEffectsChange",
                g_char_id,
                srcStruct,
                null,
                true);
          }

      } else {

          $('.'+selectHeritageEffectsControlShellClass).removeClass("is-info");

          $('#'+selectHeritageEffectsDescriptionID).html('');

          let heritageID = $(this).val();

          const heritage = heritages.find(heritage => {
            return heritage.id == heritageID;
          });

          // Save heritage effects
          if(triggerSave == null || triggerSave) {

            setData(DATA_SOURCE.EXTRA_HERITAGE, srcStruct, heritageID);

            socket.emit("requestHeritageEffectsChange",
                g_char_id,
                srcStruct,
                heritageID,
                true);

            socket.once("returnHeritageEffectsChange", function(){
              console.log(`Waited for 'returnHeritageEffectsChange'.`);
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

  statementComplete('Heritage - Add');

});




function giveHeritageEffectsByName(srcStruct, locationID, heritageName, extraData) {

  if(g_char_id != null){ // TODO - Support builds
    socket.emit("requestAddHeritageEffect",
        g_char_id,
        srcStruct,
        heritageName,
        { locationID, sourceName: extraData.sourceName });
  }

}

socket.on("returnAddHeritageEffect", function(srcStruct, heritage, inputPacket){
  console.log(`Waited for 'returnAddHeritageEffect'.`);
  if(heritage == null) { statementComplete('Heritage - Add By Name Null'); return; }

  displayAndProcessHeritageEffects(srcStruct, heritage, inputPacket.locationID, inputPacket.sourceName);
  
  statementComplete('Heritage - Add By Name');

});


function displayAndProcessHeritageEffects(srcStruct, heritage, locationID, sourceName){

  let heritageLocationCodeID = locationID+'-heritageCode';

  $('#'+locationID).append(`
    <div class="box lighter my-2">
      <p class="is-size-4 has-text-weight-semibold text-center">${heritage.name}</p>
      <div class="pos-relative">
        <div class="container ability-text-section fading-reveal-container is-active">
          ${processText(heritage.description, false, null)}
        </div>
        <p class="reveal-container-text is-hidden has-text-info">Show More</p>
      </div>
      <div id="${heritageLocationCodeID}"></div>
    </div>
  `);

  processCode(
    heritage.code,
    srcStruct,
    heritageLocationCodeID,
    {source: sourceName, sourceName: 'Extra Heritage'});    

}