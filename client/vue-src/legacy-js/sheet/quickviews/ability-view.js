/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

function openAbilityQuickview(data) {
    addBackFunctionality(data);
    addContentSource(data.Ability.id, data.Ability.contentSrc, data.Ability.homebrewID);

    $('#quickViewTitle').html(data.Ability.name);
    if(data.Ability.level != null && data.Ability.level > 0) {
      $('#quickViewTitleRight').html('<span class="pr-2">Level '+data.Ability.level+'</span>');
    }
    let qContent = $('#quickViewContent');

    qContent.append('<div>'+processText(data.Ability.description, true, true, 'MEDIUM')+'</div>');

    if(data.Ability.selectType == "SELECTOR" && typeof g_classDetails !== 'undefined'){
        for(let classAbilChoice of g_classDetails.AbilityChoices){
            if(classAbilChoice.SelectorID == data.Ability.id){

                // If has srcStruct (is extra class feature), confirm it's the correct one
                if(data.Ability.srcStruct != null){
                  if(!hasSameSrc(data.Ability.srcStruct, classAbilChoice)){ continue; }
                }

                // Find ability option
                let abilityOption = g_allClassAbilityOptions.find(ability => {
                    return ability.id == classAbilChoice.OptionID;
                });
                if(abilityOption == null){ break; }
                
                let abilityOptionCardID = 'abilityOptionCard'+abilityOption.id;
                
                qContent.append('<div class="card mt-2"><div class="card-header level is-shadowless is-marginless"><div class="level-left is-size-4"><span>'+abilityOption.name+'</span></div><div class="level-right is-size-4"></div></div><div id="'+abilityOptionCardID+'" class="card-content has-text-left pt-1"></div></div>');

                 $('#'+abilityOptionCardID).append(processText(abilityOption.description, true));

                // Add Text Statements
                processAddText(abilityOption.code, abilityOptionCardID);

                // Note Field Statements
                let srcStruct = { // Hardcoded 'classAbilitySelector' sourceCode title name
                    sourceType: null,
                    sourceLevel: null,
                    sourceCode: 'classAbilitySelector-'+abilityOption.selectOptionFor,
                    sourceCodeSNum: 'a',
                };

                if(typeof displayNotesField === "function") {
                  displayNotesField($('#'+abilityOptionCardID), srcStruct);
                }

                break;

            }
        }
    }

    // Add Text Statements
    if(typeof processAddText === "function") {
      processAddText(data.Ability.code, 'quickViewContent');
    }

    // Note Field Statements
    let srcStruct = { // Hardcoded 'classAbility' sourceCode title name
        sourceType: null,
        sourceLevel: null,
        sourceCode: 'classAbility-'+data.Ability.id,
        sourceCodeSNum: 'a',
    };
    if(typeof displayNotesField === "function") {
      displayNotesField(qContent, srcStruct);
    }

    showFeatListOptions(qContent, data.Ability.code);

    if(typeof g_isDeveloper !== 'undefined' && g_isDeveloper && data.Ability.code != null && data.Ability.code.trim() != '') {
      qContent.append('<hr class="m-3">');
      qContent.append('<p class="is-size-6 is-bold pl-2">WSC Statements</p>');
      
      let codeHTML = '';
      for(let codeStatement of data.Ability.code.split(/\n/)){
        codeHTML += '<p class="is-size-7">'+codeStatement+'</p>';
      }
      qContent.append('<div class="code-block">'+codeHTML+'</div>');
    }

}


function showFeatListOptions(qContent, wscStatements){
  if(wscStatements == null) {return;}

  let statementArray = wscStatements.split(/\n/);
  
  let statementCounts = {};
  statementArray.forEach(function(x) { statementCounts[x] = (statementCounts[x] || 0)+1; });

  for(let statement in statementCounts) {
    if(statement.includes("GIVE-FEAT-FROM=")){ // GIVE-FEAT-FROM=Choose a Tradition:feat 1,feat 2,feat 2
      let value = statement.split('GIVE-FEAT-FROM=')[1];
      let valueParts = value.split(':');
      if(valueParts.length != 2){ displayError('Invalid syntax "'+statement+'"'); continue; }
      let selectorTitle = valueParts[0];
      let featNameList = handleVariableText(valueParts[1]).split(',');

      let repetitionWord = numToRepetitionWord(statementCounts[statement]);

      let listText = '**'+selectorTitle+' '+repetitionWord+'**\n';

      let detectSameBeginningDashText = function(){
        let beginningDashText = null;
        for(let featName of featNameList){
          if(beginningDashText == null){
            if(featName.includes(' - ')){
              beginningDashText = featName.split(' - ')[0];
            } else {
              return null;
            }
          } else {
            if(!featName.startsWith(beginningDashText+' - ')){
              return null;
            }
          }
        }
        return beginningDashText;
      };
      const beginningDashText = detectSameBeginningDashText();
      
      for(let featName of featNameList){
        if(featName.endsWith('}')){ featName = featName.replace('}',''); }
        let displayFeatName = featName.replace(beginningDashText+' - ', '');
        listText += '* : (feat: '+displayFeatName+' | '+featName+')\n';
      }
      qContent.append('<hr class="m-2">');
      qContent.append('<div>'+processText(listText, true, true, 'MEDIUM')+'</div>');
    }
  }
}