/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

//--------------------- Processing Lore --------------------//
function processingProf(wscStatement, srcStruct, locationID, extraData){

    if(wscStatement.includes("GIVE-PROF-INCREASE-IN")){// GIVE-PROF-INCREASE-IN=Arcana
        let profName = wscStatement.split('=')[1];
        giveProfIncrease(srcStruct, profName, locationID, extraData);
    } else if(wscStatement.includes("GIVE-PROF-IN")){// GIVE-PROF-IN=Arcana:T
        let data = wscStatement.split('=')[1];
        let segments = data.split(':');
        giveProf(srcStruct, segments[0], segments[1], locationID, extraData);
    } else {
        displayError("Unknown statement (2-Prof): \'"+wscStatement+"\'");
        statementComplete('Prof - Unknown Statement');
    }

}

//////////////////////////////// Give Prof ///////////////////////////////////

function giveProfIncrease(srcStruct, profName, locationID, extraData){
    giveInProf(srcStruct, profName, 'UP', locationID, extraData);
}

function giveProf(srcStruct, profName, prof, locationID, extraData){
    if(prof === 'T'){
        giveProfSkillTraining(srcStruct, profName, prof, locationID, extraData);
    } else {
        giveInProf(srcStruct, profName, prof, locationID, extraData);
    }
}

function giveProfSkillTraining(srcStruct, profName, prof, locationID, extraData){

    let adjProfName = profName.replace(/\s+/g,"");
    let profProperName = null;
    let profCategory = null;

    let profData = g_profConversionMap.get(adjProfName);
    if(profData != null){
        profProperName = profData.Name;
        profCategory = profData.Category;
    }

    let numUps = profToNumUp(prof);
    if(numUps === -1){
        displayError("Not a proficiency type: \'"+prof+"\'");
        statementComplete('Prof - Add Skill Error, not prof type');
        return;
    }

    if(profCategory === 'Skill'){
        
        for(const [profName, profDataArray] of getProfMap()){
            const varName = profConversion_convertOldNameToVarName(profName);
            const profNumUps = profToNumUp(variables_getFinalRank(varName));
            if((adjProfName == varName || profConversion_convertOldNameToVarName(adjProfName) == varName) && profNumUps >= numUps){
                if(!hasSameSrcIterate(srcStruct, profDataArray)){
                    processCode(
                        'GIVE-SKILL='+prof,
                        srcStruct,
                        locationID,
                        extraData);
                    window.setTimeout(() => {
                      $('#'+locationID).append('<p class="help is-info is-italic">You are already trained in '+profName+' which means you can select a new skill to become trained in instead.</p>');
                    }, 100);
                    statementComplete('Prof - Add Skill, already has');
                    return;
                }

            }
        }

        setDataProficiencies(srcStruct, profCategory, profProperName, prof, extraData.sourceName);
  
        if(g_char_id != null){
          socket.emit("requestProficiencyChange",
              g_char_id,
              {srcStruct, isSkill : true, isStatement : true},
              { For : profCategory, To : profProperName, Prof : prof, SourceName : extraData.sourceName });
        } else {
          saveBuildMetaData();
        }

        displayProfChange(locationID, prof, profProperName);

        selectorUpdated();
        statementComplete('Prof - Add Skill');
        return;

    } else {
        giveInProf(srcStruct, profName, prof, locationID, extraData);
        return;
    }

}

function giveInProf(srcStruct, profName, prof, locationID, extraData){

    let profProperName = null;
    let profCategory = null;

    if(profName.startsWith('LORE~')){
        profName = profName.replace(/LORE\~/g,'');
        profProperName = profName.replace(/\s+/g,'_').toUpperCase()+'_LORE';
        profCategory = 'Skill';
    }

    if(profName.startsWith('WEAPON~')){
        profName = profName.replace(/WEAPON\~/g,'');
        profProperName = profName.replace(/\s+/g,'_').toUpperCase();
        profCategory = 'Attack';
    }

    if(profName.startsWith('ARMOR~')){
        profName = profName.replace(/ARMOR\~/g,'');
        profProperName = profName.replace(/\s+/g,'_').toUpperCase();
        profCategory = 'Defense';
    }

    if(profName.startsWith('GROUP~')){
      profName = profName.replace(/GROUP\~/g,'');
      profProperName = profName.replace(/\s+/g,'_').toUpperCase();
      profCategory = 'Group';
    }

    if(profName.startsWith('TRAIT~')){
      profName = profName.replace(/TRAIT\~/g,'');
      profProperName = profName.replace(/\s+/g,'_').toUpperCase();
      profCategory = 'Trait';
    }

    profName = profName.replace(/\s+/g,'');
    let profData = g_profConversionMap.get(profName);
    if(profData != null){
        profProperName = profData.Name;
        profCategory = profData.Category;
    }

    let isSkill = false;
    if(profCategory === 'Skill'){
        isSkill = true;
    }

    if(profProperName != null && profCategory != null){
        if(isSkill){
            //skillsUpdateWSCChoiceStruct(srcStruct, profProperName, prof);
        }
        setDataProficiencies(srcStruct, profCategory, profProperName, prof, extraData.sourceName);

        if(g_char_id != null){
          socket.emit("requestProficiencyChange",
              g_char_id,
              {srcStruct, isSkill : isSkill, isStatement : true},
              { For : profCategory, To : profProperName, Prof : prof, SourceName : extraData.sourceName });
        } else {
          saveBuildMetaData();
        }

        displayProfChange(locationID, prof, profProperName);

        if(isSkill){
          selectorUpdated();
        }
        statementComplete('Prof - Add');
    } else {
        displayError("Unknown proficiency: \'"+profName+"\'");
        statementComplete('Prof - Add Error, not prof type');
    }

}

function displayProfChange(locationID, prof, profName){
  if(locationID == 'profSkillsCode-'+temp_classNum) { return; }// Skip for init skill profs from class
  window.setTimeout(() => {
    let innerHTML = '<p class="help is-info"><span class="is-bold has-text-info">Proficiency Change:</span><span class="is-italic has-text-info"> You become '+profToWord(prof).toLowerCase()+' in '+profName.toLowerCase().replace(/_/g,' ').replace('class dc', 'your class DC').replace('spellattacks', ' spell attacks').replace('spelldcs', ' spell DCs')+'.</span></p>';
    if($('#'+locationID).html() != null && !$('#'+locationID).html().includes(innerHTML)) { $('#'+locationID).append(innerHTML); }
  }, 100);
}



/*
socket.on("returnProficiencyChange", function(profChangePacket){

  if(profChangePacket.isSkill){

    selectorUpdated();
    if(profChangePacket.isAutoLoad == null || !profChangePacket.isAutoLoad) {
      //updateSkillMap(true);
    }
  }
  if(profChangePacket.isStatement != null && profChangePacket.isStatement){
    statementComplete('Prof - Add');
  }

});*/
