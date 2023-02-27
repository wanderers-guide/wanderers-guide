/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

function openFamiliarQuickview(data) {

    let qContent = $('#quickViewContent');

    let familiar = data.CharFamiliar;
    processFamiliarAbilities(familiar);

    let specificStruct = getFamiliarSpecificStruct(familiar.specificType);

    // Remove Button //
    $('#quickViewTitleRight').html('<button id="removeFamiliarBtn" class="button is-very-small is-danger is-outlined is-rounded is-pulled-right mr-1">Remove</button>');
    $('#removeFamiliarBtn').click(function(){
      new ConfirmMessage('Remove Familiar', 'Are you sure you want to permanently remove this familiar?', 'Remove', 'modal-remove-familiar-'+familiar.id, 'modal-remove-familiar-btn-'+familiar.id);
      $('#modal-remove-familiar-btn-'+familiar.id).click(function() {
        socket.emit("requestRemoveFamiliar",
            getCharIDFromURL(),
            familiar.id);
      });
    });

    // Familiar Traits //
    displayFamiliarTraits(qContent, specificStruct);

    // Name //
    qContent.append('<div class="field is-marginless mb-1"><div class="control"><input id="familiarName" class="input" type="text" maxlength="90" value="'+familiar.name+'" placeholder="Familiar Name" spellcheck="false" autocomplete="off"></div></div>');

    $("#familiarName").on("input", function(){
      let familiarName = $('#familiarName').val();
      if(familiarName != 'Familiar'){
        $('#quickViewTitle').html("Familiar - "+familiarName);
      } else {
        $('#quickViewTitle').html("Familiar");
      }
    });
    $('#familiarName').trigger("input");

    $('#familiarName').blur(function() {
        if($('#familiarName').val() != familiar.name){
            updateFamiliar(familiar);
        }
    });

    // Health //
    let maxHP = getFamiliarMaxHealth(familiar);
    let currentHP = familiar.currentHP;
    if(currentHP == -1){ currentHP = maxHP; }

    qContent.append('<div class="field has-addons has-addons-centered is-marginless"><p class="control"><input id="familiarHealthInput" class="input" type="text" size="4" min="0" max="'+maxHP+'" value="'+currentHP+'"></p><p class="control"><a class="button is-static border-darker">/</a><p class="control"><a class="button is-static is-extra border-darker">'+maxHP+'</a></p></div>');
    // Press Enter Key
    $('#familiarHealthInput').on('keypress',function(e){
      if(e.which == 13){
        $('#familiarHealthInput').blur();
      }
    });
    $('#familiarHealthInput').blur(function() {
        if($('#familiarHealthInput').val() != familiar.currentHP){
            try {
              let newCurrentHP = parseInt(math.evaluate($('#familiarHealthInput').val()));
              if(newCurrentHP > maxHP) { newCurrentHP = maxHP; }
              if(newCurrentHP < 0) { newCurrentHP = 0; }
              if(isNaN(newCurrentHP)) { throw 'Value is not a number!'; }

              familiar.currentHP = newCurrentHP;
              $('#familiarHealthInput').val(newCurrentHP);
              $('#familiarHealthInput').removeClass('is-danger');
              updateFamiliar(familiar);
            } catch (err) {
              $('#familiarHealthInput').addClass('is-danger');
            }
        } else {
          $('#familiarHealthInput').removeClass('is-danger');
        }
    });

    qContent.append('<hr class="mt-1 mb-2 mx-4" style="border-width: 3px;">');

    let percepBonus = getFamiliarPerception();
    let AC = getFamiliarAC();

    let fortBonus = getFamiliarFortBonus();
    let reflexBonus = getFamiliarReflexBonus();
    let willBonus = getFamiliarWillBonus();

    qContent.append('<div class="columns is-centered is-mobile is-marginless text-center"><div class="column is-2 is-paddingless"><p class="is-bold">Perception</p></div><div class="column is-2 is-paddingless"><p class="is-bold">AC</p></div><div class="column is-2 is-paddingless border-left border-dark-lighter"><p class="is-bold">Fort.</p></div><div class="column is-2 is-paddingless"><p class="is-bold">Reflex</p></div><div class="column is-2 is-paddingless"><p class="is-bold">Will</p></div></div>');
    qContent.append('<div class="columns is-centered is-mobile is-marginless text-center"><div class="column is-2 is-paddingless"><p class="companion-bonus-offset">'+signNumber(percepBonus)+'</p></div><div class="column is-2 is-paddingless"><p class="">'+AC+'</p></div><div class="column is-2 is-paddingless border-left border-dark-lighter"><p class="companion-bonus-offset">'+signNumber(fortBonus)+'</p></div><div class="column is-2 is-paddingless"><p class="companion-bonus-offset">'+signNumber(reflexBonus)+'</p></div><div class="column is-2 is-paddingless"><p class="companion-bonus-offset">'+signNumber(willBonus)+'</p></div></div>');

    qContent.append('<hr class="m-2">');

    qContent.append('<div class="px-4 columns is-mobile is-marginless"><div class="column is-1 is-paddingless"><span class="is-p has-txt-value-number">'+signNumber(getFamiliarAcrobatics())+'</span></div><div class="column is-paddingless"><span class="is-p pl-1">Acrobatics</span></div></div>');
    qContent.append('<div class="px-4 columns is-mobile is-marginless"><div class="column is-1 is-paddingless"><span class="is-p has-txt-value-number">'+signNumber(getFamiliarStealth())+'</span></div><div class="column is-paddingless"><span class="is-p pl-1">Stealth</span></div></div>');
    qContent.append('<div class="px-4 columns is-mobile is-marginless"><div class="column is-1 is-paddingless"><span class="is-p has-txt-value-number has-tooltip-right has-tooltip-multiline" data-tooltip="This bonus is used when your familiar makes any other skill check or attack roll.">'+signNumber(getFamiliarMiscBonus())+'</span></div><div class="column is-paddingless"><span class="is-p pl-1">Misc. Bonus</span></div></div>');

    qContent.append('<hr class="m-2">');

    qContent.append('<div class="px-3"><p class="negative-indent"><strong>Size</strong> '+capitalizeWords(getFamiliarSize())+'</p></div>');

    qContent.append('<div class="px-3"><p class="negative-indent"><strong>Speed</strong> '+getFamiliarSpeed(familiar)+'</p></div>');

    let sensesText = getFamiliarSense(familiar);
    sensesText = sensesText.replace('low-light vision', '<span class="has-text-centered has-tooltip-bottom has-tooltip-multiline" data-tooltip="A creature with low-light vision can see in dim light as though it were bright light, so it ignores the concealed condition due to dim light."><em>low-light vision</em></span>');
    sensesText = sensesText.replace('darkvision', '<span class=" has-text-centered has-tooltip-bottom has-tooltip-multiline" data-tooltip="A creature with darkvision can see perfectly well in areas of darkness and dim light, though such vision is in black and white only. However, some forms of magical darkness, such as a 4th-level darkness spell, block normal darkvision."><em>darkvision</em></span>');
    sensesText = sensesText.replace('scent', '<span class="has-text-centered has-tooltip-bottom has-tooltip-multiline" data-tooltip="Scent involves sensing creatures or objects by smell. It functions only if the creature or object being detected emits an aroma (for instance, incorporeal creatures usually do not exude an aroma). If a creature emits a heavy aroma or is upwind, the GM can double or even triple the range of scent abilities used to detect that creature, and the GM can reduce the range if a creature is downwind."><em>scent</em></span>');
    sensesText = sensesText.replace('imprecise', '<span class="has-text-centered has-tooltip-bottom has-tooltip-multiline" data-tooltip="You can usually sense a creature automatically with an imprecise sense, but it has the hidden condition instead of the observed condition. At best, an imprecise sense can be used to make an undetected creature (or one you didn’t even know was there) merely hidden – it can’t make the creature observed. For more details on imprecise senses, see page 464."><em>imprecise</em></span>');

    qContent.append('<div class="px-3"><p class=""><strong>Senses</strong> '+sensesText+'</p></div>');

    // Familiar Alignment //
    displayFamiliarAlignment(qContent, specificStruct);

    // Familiar Required Number of Abilities //
    displayFamiliarReqAbils(qContent, specificStruct);

    qContent.append('<hr class="m-2">');

    let familiarAbilityHTML = '';
    let masterAbilityHTML = '';
    for(let famAbility of g_companionData.AllFamiliarAbilities){
        if(famAbility.isMaster == 1){
          masterAbilityHTML += '<option value="'+famAbility.name+'">'+famAbility.name+'</option>';
        } else {
          familiarAbilityHTML += '<option value="'+famAbility.name+'">'+famAbility.name+'</option>';
        }
    }

    qContent.append('<div class=""><select id="selectFamiliarAbility" data-placeholder="Select Familiar Abilities" multiple>'+familiarAbilityHTML+'</select></div>');
    qContent.append('<div id="familiarAbilityDescriptions"></div>');

    qContent.append('<div class="pt-1"><select id="selectMasterAbility" data-placeholder="Select Master Abilities" multiple>'+masterAbilityHTML+'</select></div>');
    qContent.append('<div id="masterAbilityDescriptions"></div>');

    let abilityArray = g_familiarAbilitiesMap.get(familiar.id);
    if(abilityArray != null){
      for(let ability of abilityArray) {
        $('#selectFamiliarAbility option[value="'+ability.name+'"]').attr('selected','selected');
        $('#selectMasterAbility option[value="'+ability.name+'"]').attr('selected','selected');
      }
    }

    $("#selectFamiliarAbility").chosen({width: "100%"});
    $("#selectMasterAbility").chosen({width: "100%"});

    $("#selectFamiliarAbility").chosen().change(function() {
      updateFamiliar(familiar);
      openQuickView('familiarView', {
        CharFamiliar: familiar,
        ViewScroll: $('#quickviewDefault').find('.quickview-body').scrollTop(),
      }, $('#quickviewDefault').hasClass('is-active'));
    });
    $("#selectMasterAbility").chosen().change(function() {
      updateFamiliar(familiar);
      openQuickView('familiarView', {
        CharFamiliar: familiar,
        ViewScroll: $('#quickviewDefault').find('.quickview-body').scrollTop(),
      }, $('#quickviewDefault').hasClass('is-active'));
    });

    if(abilityArray != null){
      for(let ability of abilityArray) {
        let descriptionContent = null;
        if(ability.isMaster == 1) {
          descriptionContent = $('#masterAbilityDescriptions');
        } else {
          descriptionContent = $('#familiarAbilityDescriptions');
        }
        descriptionContent.append('<hr class="m-2">');
        descriptionContent.append('<div class="px-3"><p class="is-bold-very">'+ability.name+'</p></div>');
        if(ability.prerequisites != null){
          descriptionContent.append('<div class="px-4 ml-2"><p class="negative-indent"><span><strong>Prerequisites </strong></span><span>'+ability.prerequisites+'</span></p></div>');
        }
        if(ability.requirements != null){
          descriptionContent.append('<div class="px-4 ml-2"><p class="negative-indent"><span><strong>Requirements </strong></span><span>'+ability.requirements+'</span></p></div>');
        }
        descriptionContent.append('<div class="px-4">'+processText(ability.description, true, true, 'MEDIUM')+'</div>');
        
        let familiarAbilityCodeID = 'familiarAbility'+ability.id;
        descriptionContent.append('<div id="'+familiarAbilityCodeID+'"></div>');
        // Add Text Statements
        processAddText(ability.code, familiarAbilityCodeID);
        // Note Field Statements
        let srcStruct = {
            sourceType: 'familiar',
            sourceLevel: 0,
            sourceCode: 'familiarAbility-'+familiar.id+'-'+ability.id,
            sourceCodeSNum: 'a',
        };
        displayNotesField($('#'+familiarAbilityCodeID), srcStruct, 1);
      }
    }

    // Familiar Extra Abilities //
    displayFamiliarExtraAbils(qContent, specificStruct);

    qContent.append('<hr class="m-2">');

    qContent.append('<div class="field is-marginless mb-1"><div class="control"><textarea id="familiarDescription" class="textarea use-custom-scrollbar" placeholder="Familiar Description">'+familiar.description+'</textarea></div></div>');
    $('#familiarDescription').blur(function() {
        if($('#familiarDescription').val() != familiar.description){
          updateFamiliar(familiar);
        }
    });

    qContent.append('<div class="field is-marginless mb-1"><div class="control"><input id="familiarImageURL" class="input isURL" type="text" maxlength="200" value="'+familiar.imageURL+'" placeholder="Image URL" spellcheck="false" autocomplete="off"></div></div>');
    $('#familiarImageURL').blur(function() {
        if($('#familiarImageURL').val() != familiar.imageURL){
          updateFamiliar(familiar);
        }
    });
    

    if(data.ViewScroll != null){
      $('#quickviewDefault').find('.quickview-body').scrollTop(data.ViewScroll);
    }

}

function updateFamiliar(familiar) {

    let familiarAbilityArray = $('#selectFamiliarAbility').val();
    let masterAbilityArray = $('#selectMasterAbility').val();

    let updateValues = {
        Name : $('#familiarName').val(),
        CurrentHealth : $('#familiarHealthInput').val(),
        Description : $('#familiarDescription').val(),
        ImageURL : $('#familiarImageURL').val(),
        AbilitiesJSON : JSON.stringify(familiarAbilityArray.concat(masterAbilityArray)),
    };

    familiar.name = updateValues.Name;
    familiar.currentHP = updateValues.CurrentHealth;
    familiar.description = updateValues.Description;
    familiar.imageURL = updateValues.ImageURL;
    familiar.abilitiesJSON = updateValues.AbilitiesJSON;

    socket.emit("requestUpdateFamiliar",
        getCharIDFromURL(),
        familiar.id,
        updateValues);

}

socket.on("returnUpdateFamiliar", function(){
  openCompanionTab();
});

socket.on("returnRemoveFamiliar", function(charFamiliarID){

    let newFamiliars = [];
    for(let charFamiliar of g_companionData.Familiars){
        if(charFamiliar.id != charFamiliarID){
          newFamiliars.push(charFamiliar);
        }
    }
    g_companionData.Familiars = newFamiliars;

    closeQuickView();
    openCompanionTab();
});