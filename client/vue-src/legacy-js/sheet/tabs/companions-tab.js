/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

function openCompanionTab(data) {

  $('#tabContent').html('<div id="companionsContent" class="use-custom-scrollbar" style="height: 555px; max-height: 555px; overflow-y: auto;"></div>');


  for(let charAnimalComp of g_companionData.AnimalCompanions){
    if(charAnimalComp == null) { continue; }
      
    let charAnimalCompEntryID = 'charAnimalComp'+charAnimalComp.id;

    let imageURL = charAnimalComp.imageURL;
    if(imageURL.match(/\.(jpeg|jpg|gif|png|webp)$/) == null){
        imageURL = '/images/paw_icon.png';
    }

    initAnimalSpecializationArray(charAnimalComp);
    let maxHP = getAnimalCompanionMaxHealth(charAnimalComp);
    let currentHP = charAnimalComp.currentHP;
    if(currentHP == -1){ currentHP = maxHP; }

    let bulmaTextColor = getBulmaTextColorFromCurrentHP(currentHP, maxHP);

    $('#companionsContent').append('<div id="'+charAnimalCompEntryID+'" class="columns is-mobile pt-1 is-marginless"><div class="column is-paddingless is-1 border-bottom border-dark-lighter cursor-clickable"><figure class="image is-64x64 is-marginless mb-1"><img class="is-rounded companion-icon" src="'+imageURL+'"></figure></div><div class="column is-paddingless is-3-desktop is-6-mobile border-bottom border-dark-lighter cursor-clickable"><p class="pl-3 ml-2 pt-2 has-text-left is-size-4 has-txt-listing">'+charAnimalComp.name+'</p></div><div class="column is-paddingless is-4 border-bottom border-dark-lighter cursor-clickable"><p class="pt-3"><span class="is-size-5 '+bulmaTextColor+'">'+currentHP+'</span><span class="is-size-5 has-txt-noted"> / </span><span class="is-size-5 has-txt-partial-noted">'+maxHP+'</span></p></div><div class="column is-paddingless is-4 is-hidden-mobile border-bottom border-dark-lighter cursor-clickable"><p class="pt-3 is-size-5-5 is-italic has-txt-partial-noted">Animal Companion</p></div></div>');

    $('#'+charAnimalCompEntryID).click(function(){
        openQuickView('animalCompanionView', {
            CharAnimalComp: charAnimalComp
        });
    });

    $('#'+charAnimalCompEntryID).mouseenter(function(){
        $(this).addClass('has-bg-selectable-hover');
    });
    $('#'+charAnimalCompEntryID).mouseleave(function(){
        $(this).removeClass('has-bg-selectable-hover');
    });

  }

  for(let charFamiliar of g_companionData.Familiars){
    if(charFamiliar == null) { continue; }
    
    let charFamiliarEntryID = 'charFamiliar'+charFamiliar.id;
    processFamiliarAbilities(charFamiliar);

    let imageURL = charFamiliar.imageURL;
    if(imageURL.match(/\.(jpeg|jpg|gif|png|webp)$/) == null){
        imageURL = '/images/paw_icon.png';
    }

    let maxHP = getFamiliarMaxHealth(charFamiliar);
    let currentHP = charFamiliar.currentHP;
    if(currentHP == -1){ currentHP = maxHP; }

    let bulmaTextColor = getBulmaTextColorFromCurrentHP(currentHP, maxHP);

    $('#companionsContent').append('<div id="'+charFamiliarEntryID+'" class="columns is-mobile pt-1 is-marginless"><div class="column is-paddingless is-1 border-bottom border-dark-lighter cursor-clickable"><figure class="image is-64x64 is-marginless mb-1"><img class="is-rounded companion-icon" src="'+imageURL+'"></figure></div><div class="column is-paddingless is-3-desktop is-6-mobile border-bottom border-dark-lighter cursor-clickable"><p class="pl-3 ml-2 pt-2 has-text-left is-size-4 has-txt-listing">'+charFamiliar.name+'</p></div><div class="column is-paddingless is-4 border-bottom border-dark-lighter cursor-clickable"><p class="pt-3"><span class="is-size-5 '+bulmaTextColor+'">'+currentHP+'</span><span class="is-size-5 has-txt-noted"> / </span><span class="is-size-5 has-txt-partial-noted">'+maxHP+'</span></p></div><div class="column is-paddingless is-4 is-hidden-mobile border-bottom border-dark-lighter cursor-clickable"><p class="pt-3 is-size-5-5 is-italic has-txt-partial-noted">Familiar</p></div></div>');

    $('#'+charFamiliarEntryID).click(function(){
        openQuickView('familiarView', {
            CharFamiliar: charFamiliar
        });
    });

    $('#'+charFamiliarEntryID).mouseenter(function(){
        $(this).addClass('has-bg-selectable-hover');
    });
    $('#'+charFamiliarEntryID).mouseleave(function(){
        $(this).removeClass('has-bg-selectable-hover');
    });

  }


  $('#companionsContent').append('<div class="columns is-mobile is-centered is-marginless my-1"><div class="column is-narrow"><div id="addAnimalCompanionField" class="field has-addons has-addons-centered is-marginless"><div class="control"><div class="select is-small is-info"><select id="selectAnimalCompanion"></select></div></div><div class="control"><button id="addAnimalCompanion" type="submit" class="button is-small is-info is-rounded">Add</button></div></div></div><div class="column is-narrow"><div id="addFamiliarField" class="field has-addons has-addons-centered is-marginless"><div class="control"><div class="select is-small is-info"><select id="selectFamiliar"></select></div></div><div class="control"><button id="addFamiliar" type="submit" class="button is-small is-info is-rounded">Add</button></div></div></div></div>');



  // Add Animal Companion //
  $('#selectAnimalCompanion').append('<option value="chooseDefault">Animal Companion</option>');
  $('#selectAnimalCompanion').append('<optgroup label="──────────"></optgroup>');
  
  for(let animalComp of g_companionData.AllAnimalCompanions){
      $('#selectAnimalCompanion').append('<option value="'+animalComp.id+'" class="'+selectOptionRarity(animalComp.rarity)+'">'+animalComp.name+'</option>');
  }
  
  $('#addAnimalCompanion').click(function() {
      let animalCompID = $('#selectAnimalCompanion').val();
      if(animalCompID != "chooseDefault"){
          $(this).addClass('is-loading');
          socket.emit("requestAddAnimalCompanion",
              getCharIDFromURL(),
              animalCompID);
      }
  });


  // Add Familiar //
  $('#selectFamiliar').append('<option value="Familiar">Familiar</option>');

  for(let specificFamiliar of g_companionData.AllSpecificFamiliars) {
    $('#selectFamiliar').append('<option value="'+specificFamiliar.specificType+'">'+specificFamiliar.name+'</option>');
  }
  
  $('#addFamiliar').click(function() {
      let specificType = $('#selectFamiliar').val();
      $(this).addClass('is-loading');
      if(specificType == 'Familiar'){
        socket.emit("requestAddFamiliar",
          getCharIDFromURL());
      } else {
        let specificStruct = getFamiliarSpecificStruct(specificType);
        if(specificStruct != null){
          socket.emit("requestAddSpecificFamiliar",
            getCharIDFromURL(),
            specificStruct);
        }
      }
  });

}

socket.on("returnAddAnimalCompanion", function(charAnimalComp){
  g_companionData.AnimalCompanions.push(charAnimalComp);
  openCompanionTab();
});

socket.on("returnAddFamiliar", function(charFamiliar){
  g_companionData.Familiars.push(charFamiliar);
  openCompanionTab();
});