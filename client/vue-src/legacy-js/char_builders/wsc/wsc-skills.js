/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

//------------------------- Processing Skills -------------------------//
function processingSkills(wscStatement, srcStruct, locationID, sourceName){

    if(wscStatement.includes("GIVE-SKILL-INCREASE")){// GIVE-SKILL-INCREASE
        giveSkillIncrease(srcStruct, locationID, sourceName);
    }
    else if(wscStatement.includes("GIVE-SKILL")){// GIVE-SKILL=T[arcana,deception]
        let value = wscStatement.split('=')[1];
        let optionals = value.match(/^.+?\[(.+?)\]$/);
        if(optionals != null){
          value = value.split('[')[0];
          optionals = optionals[1].split(',');
        }
        giveSkillProf(srcStruct, locationID, sourceName, value, optionals);
    } else {
        displayError("Unknown statement (2-Skill): \'"+wscStatement+"\'");
        statementComplete();
    }

}

//////////////////////////////// Skill Increase ///////////////////////////////////

function giveSkillIncrease(srcStruct, locationID, sourceName){
    giveSkill(srcStruct, locationID, sourceName, 'UP');
}

function giveSkillProf(srcStruct, locationID, sourceName, prof, optionals){
    giveSkill(srcStruct, locationID, sourceName, prof, optionals);
}

function giveSkill(srcStruct, locationID, sourceName, profType, optionals=null){

    let selectIncreaseID = "selectIncrease-"+locationID+"-"+srcStruct.sourceCode+"-"+srcStruct.sourceCodeSNum;
    let selectIncreaseControlShellClass = selectIncreaseID+'ControlShell';
    let increaseDescriptionID = "selectIncreaseDescription-"+locationID+"-"+srcStruct.sourceCode+"-"+srcStruct.sourceCodeSNum;
    let increaseCodeID = "selectIncreaseCode-"+locationID+"-"+srcStruct.sourceCode+"-"+srcStruct.sourceCodeSNum;

    // If ID already exists, just return. This is a temporary fix - this shouldn't be an issue in the first place.
    if($('#'+selectIncreaseID).length != 0) { statementComplete(); return; }

    const selectionTagInfo = getTagFromData(srcStruct, sourceName, 'Unselected Skill', 'UNSELECTED');

    let optionalsString = JSON.stringify(optionals).replace(/"/g, '`');
    $('#'+locationID).append('<div class="field is-grouped is-grouped-centered is-marginless my-1"><div class="select '+selectIncreaseControlShellClass+'" data-selection-info="'+selectionTagInfo+'"><select id="'+selectIncreaseID+'" class="selectIncrease" data-profType="'+profType+'" data-sourceType="'+srcStruct.sourceType+'" data-sourceLevel="'+srcStruct.sourceLevel+'" data-sourceCode="'+srcStruct.sourceCode+'" data-sourceCodeSNum="'+srcStruct.sourceCodeSNum+'" data-optionals="'+optionalsString+'"></select></div></div>');

    $('#'+locationID).append('<div id="'+increaseCodeID+'" class=""></div>');
    $('#'+locationID).append('<div id="'+increaseDescriptionID+'" class="pb-1"></div>');
    
    populateSkillLists(selectIncreaseID, srcStruct, profType, optionals);

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

            //skillsUpdateWSCChoiceStruct(srcStruct, null, null);
            socket.emit("requestProficiencyChange",
                getCharIDFromURL(),
                {srcStruct, isSkill : true, isAutoLoad},
                null);

        } else if($(this).val() == "addLore"){

            $('.'+selectIncreaseControlShellClass).removeClass("is-danger");
            $('.'+selectIncreaseControlShellClass).removeClass("is-info");

            if(profType === 'UP') {
                $('#'+increaseDescriptionID).html('');
            }

            //skillsUpdateWSCChoiceStruct(srcStruct, 'addLore', profType);
            socket.emit("requestProficiencyChange",
                getCharIDFromURL(),
                {srcStruct, isSkill : true, isAutoLoad},
                { For : "Skill", To : 'addLore', Prof : profType, SourceName : sourceName });
            processBuilderCode(
                'GIVE-LORE-CHOOSE',
                srcStruct,
                increaseCodeID,
                'Skill Training');

        } else {

            $('.'+selectIncreaseControlShellClass).removeClass("is-info");

            let canSave = false;
            if(profType === 'UP') {
                let skillName = $('#'+selectIncreaseID).val();
                let numUps = g_skillMap.get(skillName).NumUps;
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

                //skillsUpdateWSCChoiceStruct(srcStruct, skillName, profType);
                socket.emit("requestProficiencyChange",
                    getCharIDFromURL(),
                    {srcStruct, isSkill : true, isAutoLoad},
                    { For : "Skill", To : skillName, Prof : profType, SourceName : sourceName });
            }
            
        }

        $(this).blur();

    });

    $('#'+selectIncreaseID).trigger("change", [true]);

    statementComplete();

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
    let savedSkillData = wscChoiceStruct.ProfArray.find(prof => {
        return hasSameSrc(prof, srcStruct);
    });

    for(const [skillName, skillData] of g_skillMap.entries()){

        if(optionals != null){
          if(!optionals.includes(skillName.toUpperCase())){
            continue;
          }
        }
        
        if(savedSkillData != null && savedSkillData.To != null && similarSkills(savedSkillData, skillName)) {
            $('#'+selectIncreaseID).append('<option value="'+skillName+'" selected>'+skillName+'</option>');
        } else {
            if(skillData.NumUps < profToNumUp(profType)) {
                $('#'+selectIncreaseID).append('<option value="'+skillName+'">'+skillName+'</option>');
            } else {
              $('#'+selectIncreaseID).append('<option value="'+skillName+'" class="is-non-available">'+skillName+'</option>');
            }
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