/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

//------------------------- Processing Class Features -------------------------//
function processingClassFeatures(wscStatement, srcStruct, locationID, sourceName){

  if(wscStatement.includes("GIVE-CLASS-FEATURE-NAME")){ // GIVE-CLASS-FEATURE-NAME=Polymath
      let value = wscStatement.split('=')[1];
      let optionals = value.match(/^.+?\[(.+?)\]$/);
      if(optionals != null){
        value = value.split('[')[0];
        optionals = optionals[1].split(',');
      }
      let dontRunCode = (optionals != null && optionals.length > 0 && optionals[0].toUpperCase() == 'NO-CODE');
      giveClassFeatureByName(srcStruct, locationID, value, sourceName, dontRunCode);
  } else {
      displayError("Unknown statement (2-ClassFeature): \'"+wscStatement+"\'");
      statementComplete();
  }

}

//////////////////////////////// Give Class Feature ///////////////////////////////////

function giveClassFeatureByName(srcStruct, locationID, featureName, sourceName, dontRunCode=false){

  socket.emit("requestAddClassFeature",
      getCharIDFromURL(),
      srcStruct,
      featureName,
      { locationID, sourceName, dontRunCode });

}

socket.on("returnAddClassFeature", function(srcStruct, classAbility, allClassAbilityOptions, inputPacket){
  if(classAbility == null) { statementComplete(); return; }

  let classAbilityID = inputPacket.locationID+"-wsc-cf-"+srcStruct.sourceCodeSNum+"-classAbility"+classAbility.id;
  let classAbilityHeaderID = inputPacket.locationID+"-wsc-cf-"+srcStruct.sourceCodeSNum+"-classAbilityHeader"+classAbility.id;
  let classAbilityContentID = inputPacket.locationID+"-wsc-cf-"+srcStruct.sourceCodeSNum+"-classAbilityContent"+classAbility.id;
  let classAbilityCodeID = inputPacket.locationID+"-wsc-cf-"+srcStruct.sourceCodeSNum+"-classAbilityCode"+classAbility.id;

  // If ID already exists, just return. This is a temporary fix - this shouldn't be an issue in the first place.
  if($('#'+classAbilityID).length != 0) { statementComplete(); return; }

  $('#'+inputPacket.locationID).append('<div id="'+classAbilityID+'" class="box lighter my-2"></div>');

  ///
  let classAbilitySection = $('#'+classAbilityID);
  classAbilitySection.append('<span id="'+classAbilityHeaderID+'" class="is-size-4 has-text-weight-semibold">'+classAbility.name+'<span class="classAbilityUnselectedOption"></span></span>');
  classAbilitySection.append('<div id="'+classAbilityContentID+'"></div>');

  ///
  let classAbilityContent = $('#'+classAbilityContentID);
  classAbilityContent.append('<div class="container ability-text-section">'+processText(classAbility.description, false, null)+'</div>');

  classAbilityContent.append('<div class="columns is-mobile is-centered is-marginless"><div id="'+classAbilityCodeID+'" class="column is-mobile is-11 is-paddingless"></div></div>');

  ///
  if(classAbility.selectType === 'SELECTOR') {

      let classAbilityOptionSelectorID = inputPacket.locationID+'-wsc-cf-'+srcStruct.sourceCodeSNum+'-classAbilSelection'+classAbility.id;
      let descriptionID = classAbilityOptionSelectorID+'Description';
      let abilityCodeID = classAbilityOptionSelectorID+'Code';

      const selectionTagInfo = getTagFromData(srcStruct, inputPacket.sourceName, 'Unselected Option', 'UNSELECTED');

      let classAbilitySelectorInnerHTML = '';
      classAbilitySelectorInnerHTML += '<div class="field"><div class="select" data-selection-info="'+selectionTagInfo+'">';
      classAbilitySelectorInnerHTML += '<select id="'+classAbilityOptionSelectorID+'" class="classAbilSelection">';

      classAbilitySelectorInnerHTML += '<option value="chooseDefault">Choose a '+classAbility.name+'</option>';
      classAbilitySelectorInnerHTML += '<optgroup label="──────────"></optgroup>';

      let choice = wscChoiceStruct.ChoiceArray.find(choice => {
          return choice.SelectorID == classAbility.id && hasSameSrc(choice, srcStruct);
      });
      for(const classSelectionOption of allClassAbilityOptions) {
          if(classSelectionOption.selectType === 'SELECT_OPTION' && (classSelectionOption.selectOptionFor === classAbility.id || classSelectionOption.indivClassAbilName === classAbility.name)) {

              if(choice != null && choice.OptionID == classSelectionOption.id) {
                  classAbilitySelectorInnerHTML += '<option value="'+classSelectionOption.id+'" selected>'+classSelectionOption.name+'</option>';
              } else {
                  classAbilitySelectorInnerHTML += '<option value="'+classSelectionOption.id+'">'+classSelectionOption.name+'</option>';
              }

          }
      }

      classAbilitySelectorInnerHTML += '</select>';
      classAbilitySelectorInnerHTML += '</div></div>';

      classAbilitySelectorInnerHTML += '<div class="columns is-centered is-hidden"><div class="column is-mobile is-8"><article class="message is-info"><div class="message-body"><div id="'+descriptionID+'"></div><div id="'+abilityCodeID+'"></div></div></article></div></div>';

      classAbilityContent.append(classAbilitySelectorInnerHTML);


      // Class Ability Option Selector //
      $('#'+classAbilityOptionSelectorID).change(function(event, triggerSave){

        let descriptionID = $(this).attr('id')+'Description';
        let abilityCodeID = $(this).attr('id')+'Code';
        $('#'+descriptionID).html('');
        $('#'+abilityCodeID).html('');

        /* Don't use the class ability's normal srcStruct, use the code block's
        let srcStruct = {
            sourceType: 'class',// <- Issue here too with 2 classes
            sourceLevel: classAbility.level,
            sourceCode: 'classAbilitySelector-'+classAbility.id,
            sourceCodeSNum: 'a',
        };*/

        if($(this).val() == "chooseDefault"){
            $(this).parent().addClass("is-info");
            $('#'+descriptionID).parent().parent().parent().parent().addClass('is-hidden');
            
            // Save ability choice
            if(triggerSave == null || triggerSave) {
                socket.emit("requestClassChoiceChange",
                    getCharIDFromURL(),
                    srcStruct,
                    null,
                    false);
            }

            extraClassFeatureOptionsUpdateWSCChoiceStruct(null, srcStruct, false);

        } else {
            $(this).parent().removeClass("is-info");
            $('#'+descriptionID).parent().parent().parent().parent().removeClass('is-hidden');

            let chosenAbilityID = $(this).val();
            
            let chosenClassAbility = allClassAbilityOptions.find(classAbility => {
                return classAbility.id == chosenAbilityID;
            });

            $('#'+descriptionID).html(processText(chosenClassAbility.description, false, null));

            // Save ability choice
            if(triggerSave == null || triggerSave) {
                socket.emit("requestClassChoiceChange",
                    getCharIDFromURL(),
                    srcStruct,
                    { SelectorID : classAbility.id+'', OptionID : chosenAbilityID },
                    false);
            }

            if(inputPacket.dontRunCode) {
              processBuilderCode(
                  'ADD-TEXT=__You don’t gain any of this option’s other effects, just the class feature option itself.__',
                  srcStruct,
                  abilityCodeID,
                  chosenClassAbility.name);
            } else {
              // Run ability choice code
              processBuilderCode(
                  chosenClassAbility.code,
                  srcStruct,
                  abilityCodeID,
                  chosenClassAbility.name);
            }

            extraClassFeatureOptionsUpdateWSCChoiceStruct(chosenClassAbility, srcStruct, true);
            
        }
        $(this).blur();
        selectorUpdated();
    });
    $('#'+classAbilityOptionSelectorID).trigger("change", [false]);

  }

  if(inputPacket.dontRunCode) {
    processBuilderCode(
        'ADD-TEXT=__You don’t gain any of this class feature’s other effects, just the feature itself.__',
        srcStruct,
        classAbilityCodeID,
        classAbility.name);
  } else {
    processBuilderCode(
        classAbility.code,
        srcStruct,
        classAbilityCodeID,
        classAbility.name);
  }

  extraClassFeaturesUpdateWSCChoiceStruct(classAbility);

  statementComplete();
});

function extraClassFeaturesUpdateWSCChoiceStruct(newClassFeature){
  
  let existingClassFeature = wscChoiceStruct.ExtraClassFeaturesArray.find(classFeature => {
    return classFeature.value.id == newClassFeature.id;
  });
  if(existingClassFeature == null){
    wscChoiceStruct.ExtraClassFeaturesArray.push({ value: newClassFeature });
    g_expr_classAbilityArray.push(newClassFeature.name.toUpperCase().replace(/\(|\)/g,""));
  }

}

function extraClassFeatureOptionsUpdateWSCChoiceStruct(newClassFeatureOption, srcStruct, isAdd){

  if(isAdd){
    // Is Add

    let existingClassFeature = wscChoiceStruct.ExtraClassFeaturesArray.find(classFeature => {
      return classFeature.value.selectType == 'SELECT_OPTION' && hasSameSrc(classFeature.value.srcStruct, srcStruct);
    });

    if(existingClassFeature == null){
      newClassFeatureOption.srcStruct = srcStruct;

      wscChoiceStruct.ExtraClassFeaturesArray.push({ value: newClassFeatureOption });
      g_expr_classAbilityArray.push(newClassFeatureOption.name.toUpperCase().replace(/\(|\)/g,""));
    }

  } else {
    // Is Remove

    let newExtraClassFeaturesArray = [];
    let removedClassFeatureNamesArray = [];
    for(let classFeature of wscChoiceStruct.ExtraClassFeaturesArray){
      if(classFeature.value != null && classFeature.value.selectType == 'SELECT_OPTION' && hasSameSrc(classFeature.value.srcStruct, srcStruct)){
        // Is classFeatureOption, skip. Add to removed array.
        removedClassFeatureNamesArray.push(classFeature.value.name.toUpperCase());
      } else {
        newExtraClassFeaturesArray.push(classFeature);
      }
    }

    wscChoiceStruct.ExtraClassFeaturesArray = newExtraClassFeaturesArray;

    let new_expr_classAbilityArray = [];
    for(let abilityName of g_expr_classAbilityArray){
      if(!removedClassFeatureNamesArray.includes(abilityName)){
        new_expr_classAbilityArray.push(abilityName);
      }
    }
    g_expr_classAbilityArray = new_expr_classAbilityArray;

  }

}