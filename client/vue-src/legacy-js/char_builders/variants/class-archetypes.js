/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

let g_classArchetypeTryCount = 0;
let g_classArchetypeSelectedOptions = new Map();
let g_classArchetypeChosenArchetype = null;

/* replacementCodeJSON layout:

  {
    initial: {
      detectionCode: [], // Could contain ' $OR$ '
      archetypeText,
      textChangeType: 'REPLACE' or 'ADD'
      replacementStatement,
      optionals: { replaceOnlyDetected: false, },
      extraCode,
    },
    changes: [
      detectionCode,
      extraText,
      replacementStatement,
      extraCode,
    ]
  }


  code is run based on if class archetype is chosen.
  code is adjusted based on chosen class archetype.

*/

const g_classArchetypeDetectionCodeOR = ' $OR$ ';

function resetClassArchetypes(){
  g_classArchetypeTryCount = 0;
  g_classArchetypeSelectedOptions = new Map();
  g_classArchetypeChosenArchetype = null;
}

function initClassArchetypes(classArchetypeID){
  for(let classArchetype of g_classArchetypes){

    classArchetype.replacementCode = JSON.parse(classArchetype.replacementCodeJSON);

    if(classArchetype.id == classArchetypeID){
      g_classArchetypeChosenArchetype = classArchetype;
    }

  }
}

function applyClassArchetypeChoice(classFeature){
  if(wscChoiceStruct.Character.optionClassArchetypes == 0){ return null; }

  if(classFeature.level != 1 && classFeature.level != null){ return null; }
  if(classFeature.code == null){ return null; }

  const classFeatureCodeUpper = classFeature.code.toUpperCase();

  let foundClassFeatureArchetypeChoices = function(classFeatureCodeUpper){
    let classArchetypes = [];
    for(let classArchetype of g_classArchetypes){

      let detectedCodeInClassFeature = function(){
        for(let detectionCode of classArchetype.replacementCode.initial.detectionCode){

          if(detectionCode.includes(g_classArchetypeDetectionCodeOR)){

            let detectionCodeParts = detectionCode.split(g_classArchetypeDetectionCodeOR);
            if(classFeatureCodeUpper.includes(detectionCodeParts[0].toUpperCase()) || classFeatureCodeUpper.includes(detectionCodeParts[1].toUpperCase())){
              // Found
            } else {
              return false;
            }

          } else {
            if(!classFeatureCodeUpper.includes(detectionCode.toUpperCase())){
              return false;
            }
          }
        
        }
        return true;
      };
      let foundDetectionCode = detectedCodeInClassFeature();
      
      if(foundDetectionCode){
        classArchetypes.push(classArchetype);
      }

    }
    return classArchetypes;
  };

  let foundArchetypes = foundClassFeatureArchetypeChoices(classFeatureCodeUpper);
  if(foundArchetypes.length == 0) { return null; }
  g_classArchetypeTryCount++;

  let tabsID = 'classArchetypeTabs-'+g_classArchetypeTryCount;

  let classArchetypeHTML = '';
  for(let classArchetype of foundArchetypes){
    classArchetypeHTML += `
      <li>
        <a id="${tabsID}-option-${classArchetype.id}" class="classArchetypeTab">
          ${classArchetype.name} Class Archetype
        </a>
      </li>
    `;
  }

  const tabsHTML = `
  <div class="tabs is-small is-centered is-marginless">
    <ul id="${tabsID}" class="builder-tabs">
      <li><a id="${tabsID}-option-default" class="classArchetypeTab">Normal Class Feature</a></li>
      ${classArchetypeHTML}
    </ul>
  </div>
  <div id="${tabsID}-description"></div>
  `;

  return {
    tabsID,
    tabsHTML,
  };

}

function assembleClassArchetypeTabs(tabsID, classFeatureID, originalDescription){

  $('#'+tabsID+' > li > .classArchetypeTab').off('click');
  $('#'+tabsID+' > li > .classArchetypeTab').click(function(event, autoPageLoad){
    if($(this).parent().hasClass('is-active')) { return; }
    $(this).parent().parent().find('.is-active').removeClass('is-active');
    $(this).parent().addClass('is-active');

    const tabID = $(this).attr('id');
    let classArchetypeID = tabID.replace(tabsID+'-option-', '');

    if(classArchetypeID == 'default'){
      $('#'+tabsID+'-description').html(processText(originalDescription, false, null));

      g_classArchetypeSelectedOptions.set(classFeatureID, null);

      if(autoPageLoad == null || !autoPageLoad){
        g_classArchetypeChosenArchetype = null;
        socket.emit("requestClassArchetypeChange", 
            getCharIDFromURL(),
            {
              sourceType: 'class',
              sourceLevel: 1,
              sourceCode: 'classArchetype',
              sourceCodeSNum: 'a',
            },
            null);
      }

    } else {

      // Set all other class archetypes to default
      $('.classArchetypeTab').each(function() {
        if(!$(this).attr('id').startsWith(tabsID)){
          $('#'+$(this).attr('id').split('-option-')[0]+'-option-default').trigger("click", [true]);
        }
      });

      let classArchetype = g_classArchetypes.find(classArchetype => {
        return classArchetype.id == classArchetypeID;
      });

      if(classArchetype.replacementCode.initial.textChangeType == 'REPLACE'){
        $('#'+tabsID+'-description').html(processText(classArchetype.replacementCode.initial.archetypeText, false, null));
      } else if(classArchetype.replacementCode.initial.textChangeType == 'ADD'){
        $('#'+tabsID+'-description').html(processText(`${classArchetype.replacementCode.initial.archetypeText}\n----\n${originalDescription}`, false, null));
      }

      g_classArchetypeSelectedOptions.set(classFeatureID, classArchetype);

      if(autoPageLoad == null || !autoPageLoad){
        g_classArchetypeChosenArchetype = classArchetype;
        socket.emit("requestClassArchetypeChange", 
            getCharIDFromURL(),
            {
              sourceType: 'class',
              sourceLevel: 1,
              sourceCode: 'classArchetype',
              sourceCodeSNum: 'a',
            },
            classArchetype.id);
      }

    }

    if(autoPageLoad == null || !autoPageLoad){
      
      // Update class feature code
      if(temp_classAbilities != null && temp_classNum != null){
        processBuilderCode_ClassAbilities(temp_classAbilities, temp_classNum);
      }
      // and selectors,
      $('.classAbilSelection').trigger("change", [false, true]);

    }
    
  });

  // If archetype is selected and id exists,
  if(g_classArchetypeChosenArchetype != null && $('#'+tabsID+'-option-'+g_classArchetypeChosenArchetype.id).length){
    $('#'+tabsID+'-option-'+g_classArchetypeChosenArchetype.id).trigger("click", [true]);
  } else {
    $('#'+tabsID+'-option-default').trigger("click", [true]);
  }

}

///

function replaceClassFeatureCodeFromClassArchetype(classFeatureID, classFeatureCode, srcStruct){
  if(wscChoiceStruct.Character.optionClassArchetypes == 0){ return classFeatureCode; }

  // Replace changes code
  classFeatureCode = replaceCodeFromClassArchetype(classFeatureCode, srcStruct);

  // Replace initial code
  let classArchetype = g_classArchetypeSelectedOptions.get(classFeatureID);
  if(classArchetype == null) { return classFeatureCode; }

  let newWscCode = '';

  // Replace detection statement with replacement statement
  if(classArchetype.replacementCode.initial.replacementStatement != null){

    let newWscStatements = [];
    let wscStatements = classFeatureCode.split(/\n/);
    for(let wscStatementRaw of wscStatements) {

        // Test/Check Statement for Expressions //
        let wscStatement = testExpr(wscStatementRaw);
        if(wscStatement == null) {
          newWscStatements.push(wscStatementRaw);
          continue;
        }
        // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ //

        for(const detectionCode of classArchetype.replacementCode.initial.detectionCode){

          let detectedCodeInStatement = function(){
            if(detectionCode.includes(g_classArchetypeDetectionCodeOR)){

              let detectionCodeParts = detectionCode.split(g_classArchetypeDetectionCodeOR);
              if(wscStatement.toUpperCase().includes(detectionCodeParts[0].toUpperCase()) || wscStatement.toUpperCase().includes(detectionCodeParts[1].toUpperCase())){
                return true;
              }

            } else {
              if(wscStatement.toUpperCase().includes(detectionCode.toUpperCase())){
                return true;
              }
            }
            return false;
          };

          if(detectedCodeInStatement()){

            let replacementStatement = classArchetype.replacementCode.initial.replacementStatement;
            wscStatementRaw = wscStatementRaw.replace(wscStatement, replacementStatement);
            wscStatement = replacementStatement;

          }
        }

        if(wscStatementRaw != ''){
          newWscStatements.push(wscStatementRaw);
        }
    }

    // Assemble new wscCode
    for(const newWscStatement of newWscStatements){
      newWscCode += newWscStatement+'\n';
    }
    newWscCode = newWscCode.slice(0, -1); // Trim off that last '\n'

  } else {

    newWscCode = classFeatureCode;

  }

  // Add clear metadata
  if(classArchetype.replacementCode.initial.replacementStatement != null || classArchetype.replacementCode.initial.extraCode != null){
    if(classArchetype.replacementCode.initial.clearDataAfterExtraCode != null && !classArchetype.replacementCode.initial.clearDataAfterExtraCode){
      // Don't clear
    } else {
      newWscCode = 'CLEAR-DATA-FROM-CODE-BLOCK\n'+newWscCode;
    }
  }

  // Added extra code
  if(classArchetype.replacementCode.initial.extraCode != null){
    newWscCode = classArchetype.replacementCode.initial.extraCode+'\n'+newWscCode;
  }

  /*
  
  Order will be:

    Extra Code,
    Clear,
    Original Code
  
  */

  return newWscCode;

}


function replaceCodeFromClassArchetype(wscCode, srcStruct){
  if(g_classArchetypeChosenArchetype == null) { return wscCode; }

  if(g_classArchetypeChosenArchetype.dedicationFeatName != null){

    if(wscChoiceStruct.Character.variantFreeArchetype == 0){
      if(wscCode.trim() == 'GIVE-CLASS-FEAT=2' && srcStruct.sourceLevel == 2 && srcStruct.sourceType == 'class'){
        removeUnselectedData(srcStruct);
        return `GIVE-FEAT-NAME=${g_classArchetypeChosenArchetype.dedicationFeatName}\nADD-TEXT=Because of your class archetype, you must select (feat: ${g_classArchetypeChosenArchetype.dedicationFeatName}) as your 2nd-level class feat.`;
      }
    } else {
      if(wscCode.trim() == 'GIVE-ARCHETYPE-FEAT=2' && srcStruct.sourceLevel == 2 && srcStruct.sourceType == 'class'){
        removeUnselectedData(srcStruct);
        return `GIVE-FEAT-NAME=${g_classArchetypeChosenArchetype.dedicationFeatName}\nADD-TEXT=Because of your class archetype, you must select (feat: ${g_classArchetypeChosenArchetype.dedicationFeatName}) as your 2nd-level class feat.`;
      }
    }
    
  }

  if(g_classArchetypeChosenArchetype.replacementCode.changes == null) { return wscCode; }

  let newWscCode = '';

  let extraCodes = [];
  let extraTexts = [];
  
  let newWscStatements = [];
  let wscStatements = wscCode.split(/\n/);
  for(let wscStatementRaw of wscStatements) {

    // Test/Check Statement for Expressions //
    let wscStatement = testExpr(wscStatementRaw);
    if(wscStatement == null) {
      newWscStatements.push(wscStatementRaw);
      continue;
    }
    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ //

    let findAndApplyStatementChanges = function(){
      for(const change of g_classArchetypeChosenArchetype.replacementCode.changes){
        if(wscStatement.toUpperCase().includes(change.detectionCode.toUpperCase())){
          if(change.replacementStatement != null){

            let replacementStatement = change.replacementStatement;
            wscStatementRaw = wscStatementRaw.replace(wscStatement, replacementStatement);
            wscStatement = replacementStatement;

          }
          if(change.extraCode != null){
            extraCodes.push(change.extraCode);
          }
          if(change.extraText != null){
            extraTexts.push(change.extraText);
          }
          return;
        }
      }
    };
    findAndApplyStatementChanges();
    
    if(wscStatementRaw != ''){
      newWscStatements.push(wscStatementRaw);
    }
  }

  // Assemble new wscCode
  for(const newWscStatement of newWscStatements){
    newWscCode += newWscStatement+'\n';
  }
  newWscCode = newWscCode.slice(0, -1); // Trim off that last '\n'

  // Add clear metadata
  if(wscCode != newWscCode || extraCodes.length > 0){
    if(g_classArchetypeChosenArchetype.replacementCode.initial.clearDataAfterExtraCodeForChange != null && !g_classArchetypeChosenArchetype.replacementCode.initial.clearDataAfterExtraCodeForChange){
      // Don't clear
    } else {
      newWscCode = 'CLEAR-DATA-FROM-CODE-BLOCK\n'+newWscCode;
    }
  }

  // Add extra code
  for(let extraCode of extraCodes){
    newWscCode = extraCode+'\n'+newWscCode;
  }

  // Add extra text
  for(let extraText of extraTexts){
    newWscCode += '\nADD-TEXT='+extraText;
  }

  /*
  
  Order will be:

    Extra Code,
    Clear,
    Original Code,
    Extra Text
  
  */

  return newWscCode;

}