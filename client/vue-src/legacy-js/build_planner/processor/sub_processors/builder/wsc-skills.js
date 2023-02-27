/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

//------------------------- Processing Skills -------------------------//
function processingSkills(wscStatement, srcStruct, locationID, extraData){

    if(wscStatement.includes("GIVE-SKILL-INCREASE")){// GIVE-SKILL-INCREASE
        giveSkillIncrease(srcStruct, locationID, extraData);
    }
    else if(wscStatement.includes("GIVE-SKILL")){// GIVE-SKILL=T[arcana,deception]
        let value = wscStatement.split('=')[1];
        let optionals = value.match(/^.+?\[(.+?)\]$/);
        if(optionals != null){
          value = value.split('[')[0];
          optionals = optionals[1].split(',');
        }
        giveSkillProf(srcStruct, locationID, extraData, value, optionals);
    } else {
        displayError("Unknown statement (2-Skill): \'"+wscStatement+"\'");
        statementComplete('Skill - Unknown Statement');
    }

}

//////////////////////////////// Skill Increase ///////////////////////////////////

function giveSkillIncrease(srcStruct, locationID, extraData){
    giveSkill(srcStruct, locationID, extraData, 'UP');
}

function giveSkillProf(srcStruct, locationID, extraData, prof, optionals){
    giveSkill(srcStruct, locationID, extraData, prof, optionals);
}

function giveSkill(srcStruct, locationID, extraData, profType, optionals=null){

    let selectIncreaseID = "selectIncrease-"+locationID+"-"+srcStruct.sourceCode+"-"+srcStruct.sourceCodeSNum;
    let selectIncreaseControlShellClass = selectIncreaseID+'ControlShell';
    let increaseDescriptionID = "selectIncreaseDescription-"+locationID+"-"+srcStruct.sourceCode+"-"+srcStruct.sourceCodeSNum;
    let increaseCodeID = "selectIncreaseCode-"+locationID+"-"+srcStruct.sourceCode+"-"+srcStruct.sourceCodeSNum;

    // If ID already exists, just return. This is a temporary fix - this shouldn't be an issue in the first place.
    if($('#'+selectIncreaseID).length != 0) { statementComplete('Skill - Add Error'); return; }

    const selectionTagInfo = getTagFromData(srcStruct, extraData.sourceName, 'Unselected Skill', 'UNSELECTED');

    let optionalsString = JSON.stringify(optionals).replace(/"/g, '`');
    $('#'+locationID).append('<div class="field is-grouped is-grouped-centered is-marginless my-1"><div class="select '+selectIncreaseControlShellClass+'" data-selection-info="'+selectionTagInfo+'"><select id="'+selectIncreaseID+'" class="selectIncrease" data-profType="'+profType+'" data-sourceType="'+srcStruct.sourceType+'" data-sourceLevel="'+srcStruct.sourceLevel+'" data-sourceCode="'+srcStruct.sourceCode+'" data-sourceCodeSNum="'+srcStruct.sourceCodeSNum+'" data-optionals="'+optionalsString+'"></select></div></div>');

    $('#'+locationID).append('<div id="'+increaseCodeID+'" class=""></div>');
    $('#'+locationID).append('<div id="'+increaseDescriptionID+'" class="pb-1"></div>');
    
    populateSkillLists(selectIncreaseID, srcStruct, profType, optionals);

    // On click (open) of selectIncrease, re-populate skill list
    $('#'+selectIncreaseID).click(function() {
      populateSkillLists(selectIncreaseID, srcStruct, profType, optionals);
    });

    // On increase choice change
    $('#'+selectIncreaseID).change(function(event, isAutoLoad) {
        $('#'+increaseCodeID).html('');
        isAutoLoad = (isAutoLoad == null) ? false : isAutoLoad;

        if($(this).val() == "chooseDefault"){

            $('.'+selectIncreaseControlShellClass).removeClass("is-danger");
            $('.'+selectIncreaseControlShellClass).addClass("is-info");

            if(profType === 'UP') {
                $('#'+increaseDescriptionID).html('');
            }

            deleteData(DATA_SOURCE.PROFICIENCY, srcStruct);

            if(g_char_id != null){
              socket.emit("requestProficiencyChange",
                  g_char_id,
                  {srcStruct, isSkill : true, isAutoLoad},
                  null);
            } else {
              saveBuildMetaData();
            }
            
            selectorUpdated();

        } else if($(this).val() == "addLore"){

            $('.'+selectIncreaseControlShellClass).removeClass("is-danger");
            $('.'+selectIncreaseControlShellClass).removeClass("is-info");

            if(profType === 'UP') {
                $('#'+increaseDescriptionID).html('');
            }

            if(!isAutoLoad){
              setDataProficiencies(srcStruct, 'Skill', 'addLore', profType, extraData.sourceName);

              if(g_char_id != null){
                socket.emit("requestProficiencyChange",
                    g_char_id,
                    {srcStruct, isSkill : true, isAutoLoad},
                    { For : "Skill", To : 'addLore', Prof : profType, SourceName : extraData.sourceName });
              } else {
                saveBuildMetaData();
              }

              selectorUpdated();
            }
            
            processCode(
                'GIVE-LORE-CHOOSE',
                srcStruct,
                increaseCodeID,
                {source: extraData.source, sourceName: 'Add Lore (Lvl '+srcStruct.sourceLevel+')'});


        } else {

            $('.'+selectIncreaseControlShellClass).removeClass("is-info");

            let canSave = false;
            if(profType === 'UP') {
                const skill_varName = profConversion_convertOldNameToVarName($('#'+selectIncreaseID).val());
                const numUps = profToNumUp(variables_getFinalRank(skill_varName));
                if(isAutoLoad || isAbleToSelectIncrease(numUps+1, srcStruct.sourceLevel)) {
                    canSave = true;
                    $('#'+increaseDescriptionID).html('');
                } else {
                    $('.'+selectIncreaseControlShellClass).addClass("is-danger");
                    $('#'+increaseDescriptionID).html('<p class="help is-danger text-center">You cannot increase the proficiency of this skill any further at this level!</p>');
                }
            } else {
                canSave = true;
            }

            if(canSave) {
                $('.'+selectIncreaseControlShellClass).removeClass("is-danger");

                let skillName = $(this).val();
                if(skillName.includes(' Lore')){
                    skillName = skillName.toUpperCase().replace(/ /g,'_');
                }

                setDataProficiencies(srcStruct, 'Skill', skillName, profType, extraData.sourceName);

                if(g_char_id != null){
                  socket.emit("requestProficiencyChange",
                      g_char_id,
                      {srcStruct, isSkill : true, isAutoLoad},
                      { For : "Skill", To : skillName, Prof : profType, SourceName : extraData.sourceName });
                } else {
                  saveBuildMetaData();
                }
                
                selectorUpdated();
            }
            
        }

        $(this).blur();

    });

    $('#'+selectIncreaseID).trigger("change", [true]);

    statementComplete('Skill - Add');

}

function isAbleToSelectIncrease(numUps, charLevel){
    if(numUps == 3){
        return (charLevel >= 7);
    } else if (numUps == 4){
        return  (charLevel >= 15);
    } else if (numUps > 4) {
        return false;
    } else {
        return true;
    }
}

function populateSkillLists(selectIncreaseID, srcStruct, profType, optionals){

    $('#'+selectIncreaseID).html('');
    $('#'+selectIncreaseID).append('<option value="chooseDefault">Choose a Skill</option>');
    $('#'+selectIncreaseID).append('<optgroup label="──────────"></optgroup>');

    // Set saved skill choices
    let savedSkillData = getDataSingleProficiency(srcStruct);

    // Build Skill List
    let skillList = [];
    for(const [skillName, skillData] of g_skillMap.entries()){
      if(skillName == 'Lore'){ continue; }
      skillList.push(skillName);
    }
    const sortedLoreDataArray = getDataAll(DATA_SOURCE.LORE).sort(
      function(a, b) {
        return a.value > b.value ? 1 : -1;
      }
    );
    for(const loreData of sortedLoreDataArray){
      skillList.push(capitalizeWords(loreData.value)+' Lore');
    }

    // Process each skill,
    for(const skillName of skillList){

      if(optionals != null){
        if(!optionals.includes(skillName.toUpperCase())){
          continue;
        }
      }
      
      if(savedSkillData != null && savedSkillData.To != null && similarSkills(savedSkillData, skillName)) {
        $('#'+selectIncreaseID).append('<option value="'+skillName+'" selected>'+skillName+'</option>');
      } else {
        if(profToNumUp(variables_getFinalRank(profConversion_convertOldNameToVarName(skillName))) < profToNumUp(profType)){
          $('#'+selectIncreaseID).append('<option value="'+skillName+'">'+skillName+'</option>');
        } else {
          $('#'+selectIncreaseID).append('<option value="'+skillName+'" disabled="true">'+skillName+'</option>');
        }
        /*
          if(skillData.NumUps == null || skillData.NumUps < profToNumUp(profType)) {
              $('#'+selectIncreaseID).append('<option value="'+skillName+'">'+skillName+'</option>');
          } else {
            $('#'+selectIncreaseID).append('<option value="'+skillName+'" disabled="true">'+skillName+'</option>');
          }
        */
      }

    }

    if(optionals == null){
      // Add Lore Option
      $('#'+selectIncreaseID).append('<optgroup label="──────────"></optgroup>');
      if(savedSkillData != null && savedSkillData.To == 'addLore') {
          $('#'+selectIncreaseID).append('<option value="addLore" selected>Add Lore</option>');
      } else {
          $('#'+selectIncreaseID).append('<option value="addLore">Add Lore</option>');
      }
    }

    // Exists to guarantee it will be blue when at chooseDefault or not
    if($('#'+selectIncreaseID).val() == 'chooseDefault'){
        $('#'+selectIncreaseID).parent().addClass("is-info");
    } else {
        $('#'+selectIncreaseID).parent().removeClass("is-info");
    }

}

function similarSkills(savedSkillData, skillName){
    let skillNameOne = savedSkillData.To.toUpperCase().replace(/ /g,"_");
    let skillNameTwo = skillName.toUpperCase().replace(/ /g,"_");
    return (skillNameOne === skillNameTwo);
}