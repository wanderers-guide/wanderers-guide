/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

//------------------------- Processing Feats -------------------------//
function processingFeats(wscStatement, srcStruct, locationID, sourceName){
    
    if(wscStatement.includes("GIVE-GENERAL-FEAT=")){ // GIVE-GENERAL-FEAT=3[metamagic]
        let value = wscStatement.split('=')[1];
        let optionals = value.match(/^.+?\[(.+?)\]$/);
        if(optionals != null){
            optionals = optionals[1].split(',');
        }
        let level;
        if(value.startsWith('LEVEL')){
            level = wscChoiceStruct.Character.level;
        } else if(value.startsWith('HALF_LEVEL')){
            level = Math.floor(wscChoiceStruct.Character.level/2);
        } else {
            level = parseInt(value);
        }
        giveGeneralFeat(srcStruct, locationID, level, optionals, sourceName);
    }
    else if(wscStatement.includes("GIVE-FEAT=")){ // GIVE-FEAT=3[metamagic]
        let value = wscStatement.split('=')[1];
        let optionals = value.match(/^.+?\[(.+?)\]$/);
        if(optionals != null){
            optionals = optionals[1].split(',');
        }
        let level;
        if(value.startsWith('LEVEL')){
            level = wscChoiceStruct.Character.level;
        } else if(value.startsWith('HALF_LEVEL')){
            level = Math.floor(wscChoiceStruct.Character.level/2);
        } else {
            level = parseInt(value);
        }
        giveFeat(srcStruct, locationID, level, optionals, sourceName);
    }
    else if(wscStatement.includes("GIVE-ANCESTRY-FEAT=")){ // GIVE-ANCESTRY-FEAT=3[metamagic]
        let value = wscStatement.split('=')[1];
        let optionals = value.match(/^.+?\[(.+?)\]$/);
        if(optionals != null){
            optionals = optionals[1].split(',');
        }
        let level;
        if(value.startsWith('LEVEL')){
            level = wscChoiceStruct.Character.level;
        } else if(value.startsWith('HALF_LEVEL')){
            level = Math.floor(wscChoiceStruct.Character.level/2);
        } else {
            level = parseInt(value);
        }
        let charTagsArray = [];
        for(let dataTag of wscChoiceStruct.CharTagsArray){
            charTagsArray.push(dataTag.value);
        }
        giveAncestryFeat(srcStruct, locationID, level, charTagsArray, optionals, sourceName);
    }
    else if(wscStatement.includes("GIVE-CLASS-FEAT=")){ // GIVE-CLASS-FEAT=3[metamagic]
        let value = wscStatement.split('=')[1];
        let optionals = value.match(/^.+?\[(.+?)\]$/);
        if(optionals != null){
            optionals = optionals[1].split(',');
        }
        let level;
        if(value.startsWith('LEVEL')){
            level = wscChoiceStruct.Character.level;
        } else if(value.startsWith('HALF_LEVEL')){
            level = Math.floor(wscChoiceStruct.Character.level/2);
        } else {
            level = parseInt(value);
        }
        let className = (wscChoiceStruct.ClassDetails.Class != null) ? wscChoiceStruct.ClassDetails.Class.name : null;
        giveClassFeat(srcStruct, locationID, level, className, optionals, sourceName);
    }
    else if(wscStatement.includes("GIVE-ARCHETYPE-FEAT=")){ // GIVE-ARCHETYPE-FEAT=3[metamagic]
        let value = wscStatement.split('=')[1];
        let optionals = value.match(/^.+?\[(.+?)\]$/);
        if(optionals != null){
            optionals = optionals[1].split(',');
        }
        let level;
        if(value.startsWith('LEVEL')){
            level = wscChoiceStruct.Character.level;
        } else if(value.startsWith('HALF_LEVEL')){
            level = Math.floor(wscChoiceStruct.Character.level/2);
        } else {
            level = parseInt(value);
        }
        giveArchetypeFeat(srcStruct, locationID, level, optionals, sourceName);
    }
    else if(wscStatement.includes("GIVE-SKILL-FEAT=")){ // GIVE-SKILL-FEAT=3[metamagic]
        let value = wscStatement.split('=')[1];
        let optionals = value.match(/^.+?\[(.+?)\]$/);
        if(optionals != null){
            optionals = optionals[1].split(',');
        }
        let level;
        if(value.startsWith('LEVEL')){
            level = wscChoiceStruct.Character.level;
        } else if(value.startsWith('HALF_LEVEL')){
            level = Math.floor(wscChoiceStruct.Character.level/2);
        } else {
            level = parseInt(value);
        }
        giveSkillFeat(srcStruct, locationID, level, optionals, sourceName);
    } 
    else if(wscStatement.includes("GIVE-FEAT-FROM=")){ // GIVE-FEAT-FROM=Choose a Tradition:feat 1,feat 2,feat 2
        let value = wscStatement.split('=')[1];
        let valueParts = value.split(':');
        let chooseTitle = valueParts[0];
        let customListParts = valueParts[1].split(',');
        giveFeatCustomList(srcStruct, locationID, chooseTitle, customListParts, sourceName);
    }
    else if(wscStatement.includes("GIVE-FEAT-NAME=")){ // GIVE-FEAT-NAME=Ancestral_Paragon
        let value = wscStatement.split('=')[1];
        
        let featName = null;
        let optionals = value.match(/^.+?\[(.+?)\]$/);
        if(optionals != null){
            optionals = optionals[1].split(',');
            featName = value.split('[')[0];
        } else {
          featName = value;
        }

        featName = featName.replace(/_/g," ");
        giveFeatByName(srcStruct, featName, locationID, optionals, sourceName);
    } else {
        displayError("Unknown statement (2-Feat): \'"+wscStatement+"\'");
        statementComplete();
    }

}


////////////////////////////////// Choose Feats /////////////////////////////////////////////

function giveFeatCustomList(srcStruct, locationID, chooseTitle, customList, sourceName){

    chooseTitle = capitalizeWords(chooseTitle).replace(/( The )/,' the ').replace(/( A )/,' a ').replace(/( An )/,' an ');
    displayFeatChoice(
        srcStruct,
        locationID,
        chooseTitle,
        [],
        100,
        [],
        sourceName,
        'AUTO_PAGE_LOAD',
        customList
    );

    statementComplete();

}

function giveFeat(srcStruct, locationID, featLevel, optionalTags, sourceName){

    displayFeatChoice(
        srcStruct,
        locationID,
        "Choose a Feat",
        [],
        featLevel,
        optionalTags,
        sourceName
    );

    statementComplete();

}

function giveGeneralFeat(srcStruct, locationID, featLevel, optionalTags, sourceName){

    displayFeatChoice(
        srcStruct,
        locationID,
        "Choose a General Feat",
        ["General"],
        featLevel,
        optionalTags,
        sourceName
    );

    statementComplete();

}

function giveSkillFeat(srcStruct, locationID, featLevel, optionalTags, sourceName){

    displayFeatChoice(
        srcStruct,
        locationID,
        "Choose a Skill Feat",
        ["Skill"],
        featLevel,
        optionalTags,
        sourceName
    );

    statementComplete();

}

function giveAncestryFeat(srcStruct, locationID, featLevel, charTagsArray, optionalTags, sourceName){
    
    displayFeatChoice(
        srcStruct,
        locationID,
        "Choose an Ancestry Feat",
        charTagsArray,
        featLevel,
        optionalTags,
        sourceName
    );

    statementComplete();

}

function giveArchetypeFeat(srcStruct, locationID, featLevel, optionalTags, sourceName){

    giveClassFeat(srcStruct, locationID, featLevel, null, optionalTags, sourceName, true);

}

function giveClassFeat(srcStruct, locationID, featLevel, className, optionalTags, sourceName, isArchetypeOnlyFeat=false){

    // Include sourceCodeSNum at the end for if a code field gives multiple class feats
    let classFeatTabsID = locationID+'-classFeatTabs-'+srcStruct.sourceCode+'-'+srcStruct.sourceCodeSNum;
    let containerLocationID = locationID+'-ClassFeatContainer-'+srcStruct.sourceCode+'-'+srcStruct.sourceCodeSNum;

    let classTabClass = locationID+'-classFeatClassTab-'+srcStruct.sourceCode+'-'+srcStruct.sourceCodeSNum;
    let archetypesTabClass = locationID+'-classFeatArchetypesTab-'+srcStruct.sourceCode+'-'+srcStruct.sourceCodeSNum;
    let dedicationTabClass = locationID+'-classFeatDedicationTab-'+srcStruct.sourceCode+'-'+srcStruct.sourceCodeSNum;

    $('#'+locationID).append('<div class="tabs is-small is-centered is-marginless use-custom-scrollbar"><ul id="'+classFeatTabsID+'" class="builder-tabs classFeatTabs" data-arch-tab-class="'+archetypesTabClass+'"></ul></div>');
    let tabsContent = $('#'+classFeatTabsID);
    tabsContent.html(''); // <- Fixes bug with multiple tabs being created

    if(!isArchetypeOnlyFeat) {
      tabsContent.append('<li><a class="'+classTabClass+'">'+className+' Class</a></li>');
    }

    let charArchetypesArray = [];
    for(let featChoice of wscChoiceStruct.FeatArray){
        if(featChoice.value != null) {
            let feat = g_featMap.get(featChoice.value.id+"");
            if(feat != null){
                let dedicationTag = feat.Tags.find(featTag => {
                    return featTag.name === 'Dedication';
                });
                if(dedicationTag != null){
                    charArchetypesArray.push(featChoice.value.id);
                }
            }
        }
    }

    for(let charArchetypeDedFeatID of charArchetypesArray){
        let archetype = g_archetypes.find(archetype => {
            return archetype.dedicationFeatID == charArchetypeDedFeatID;
        });
        if(archetype != null){
            tabsContent.append('<li><a class="'+archetypesTabClass+' '+archetypesTabClass+'-'+archetype.name.replace(/\W/g,'_')+'" name="'+archetype.name+'">'+archetype.name+' Archetype</a></li>');
        }
    }

    tabsContent.append('<li><a class="'+dedicationTabClass+'">Add Dedication</a></li>');

    $('#'+locationID).append('<div class="py-2" id="'+containerLocationID+'"></div>');

    if(!isArchetypeOnlyFeat) {
      $('.'+classTabClass).click(function(event, autoPageLoad){
        event.stopImmediatePropagation();
        if (autoPageLoad != 'AUTO_PAGE_LOAD') { autoPageLoad = null; }
        if($(this).parent().hasClass('is-active')) { return; }

        $('#'+containerLocationID).html('');
        $('#'+classFeatTabsID).find('.is-active').removeClass('is-active');
        $(this).parent().addClass('is-active');

        displayFeatChoice(
            srcStruct,
            containerLocationID,
            "Choose a Class Feat",
            [className],
            featLevel,
            optionalTags,
            sourceName,
            autoPageLoad
        );

      });
    }

    $('.'+archetypesTabClass).click(function(event, autoPageLoad){
        event.stopImmediatePropagation();
        if (autoPageLoad != 'AUTO_PAGE_LOAD') { autoPageLoad = null; }
        if($(this).parent().hasClass('is-active')) { return; }

        $('#'+containerLocationID).html('');
        $('#'+classFeatTabsID).find('.is-active').removeClass('is-active');
        $(this).parent().addClass('is-active');
        let archetypeName = $(this).attr('name');

        displayFeatChoice(
            srcStruct,
            containerLocationID,
            "Choose an Archetype Feat",
            [archetypeName+' Archetype'],
            featLevel,
            optionalTags,
            sourceName,
            autoPageLoad
        );

    });

    $('.'+dedicationTabClass).click(function(event){
        event.stopImmediatePropagation();
        if($(this).parent().hasClass('is-active')) { return; }

        $('#'+containerLocationID).html('');
        $('#'+classFeatTabsID).find('.is-active').removeClass('is-active');
        $(this).parent().addClass('is-active');

        displayFeatChoice(
            srcStruct,
            containerLocationID,
            "Choose a Dedication",
            ['Dedication'],
            featLevel,
            optionalTags,
            sourceName
        );

    });

    let clickedTab = false;
    let featData = wscChoiceStruct.FeatArray.find(featData => {
        return hasSameSrc(featData, srcStruct);
    });
    if(featData != null && featData.value != null){
        if(charArchetypesArray.includes(featData.value.id)){
            // Click Dedication Tab
            $('.'+dedicationTabClass).trigger("click");
            clickedTab = true;

            // Remove Self-Archetype Tab
            let archetype = g_archetypes.find(archetype => {
                return archetype.dedicationFeatID == featData.value.id;
            });
            if(archetype != null) {
                let selfArchetypeTabClass = archetypesTabClass+'-'+archetype.name.replace(/\W/g,'_');
                $('#'+classFeatTabsID).find('.'+selfArchetypeTabClass).parent().remove();
            }
        } else {
            let feat = g_featMap.get(featData.value.id+"");
            if(feat != null){
                for(let charArchetypeDedFeatID of charArchetypesArray){
                    let archetype = g_archetypes.find(archetype => {
                        return archetype.dedicationFeatID == charArchetypeDedFeatID;
                    });
                    if(archetype != null){
                        let archetypeTag = feat.Tags.find(featTag => {
                            return featTag.name === archetype.name+' Archetype';
                        });
                        if(archetypeTag != null){
                            // Click Archetype Tab
                            $('.'+archetypesTabClass+'-'+archetype.name.replace(/\W/g,'_')).trigger("click", ['AUTO_PAGE_LOAD']);
                            clickedTab = true;
                            break;
                        }
                    }
                }
            }
        }
    }

    if(!isArchetypeOnlyFeat) {
      if(!clickedTab){
        $('.'+classTabClass).trigger("click", ['AUTO_PAGE_LOAD']);
      }
    } else {
      if(!clickedTab){
        $('.'+dedicationTabClass).trigger("click", ['AUTO_PAGE_LOAD']);
      }
    }

    statementComplete();

}

function displayFeatChoice(srcStruct, locationID, selectionName, tagsArray, featLevel, optionalTags, sourceName,
        autoPageLoad = 'AUTO_PAGE_LOAD', customList = null) {

    // Make optional tags lowercase
    if(optionalTags != null){
        for (let i = 0; i < optionalTags.length; i++) {
            optionalTags[i] = optionalTags[i].toLowerCase().trim();
        }
    }
    // Make custom list feat names lowercase
    if(customList != null){
        for (let i = 0; i < customList.length; i++) {
            customList[i] = customList[i].toLowerCase().trim();
        }
    }

    let className = (wscChoiceStruct.ClassDetails.Class != null) ? wscChoiceStruct.ClassDetails.Class.name : null;
    
    let featSelectionMap = new Map();
    for(const featStruct of g_featMap){
        let feat = featStruct[1];
        if(feat.Feat.level < 1 && customList == null){ continue; }

        // You cannot select the dedication for your own class
        if(className != null && feat.Feat.name === className+' Dedication'){ continue; }

        let hasCorrectTags = false;
        if(customList == null) {
            let sameOpsTagsArray = [];
            for(let featTag of feat.Tags){
                if(tagsArray.length > 0){
                    if(tagsArray.includes(featTag.name)){
                        hasCorrectTags = true;
                    }
                } else {
                    hasCorrectTags = true;
                }
                if(optionalTags != null){
                    let featTagNameLower = featTag.name.toLowerCase();
                    if(optionalTags.includes(featTagNameLower)){
                        sameOpsTagsArray.push(featTagNameLower);
                    }
                }
            }
            if(optionalTags != null && hasCorrectTags){
                hasCorrectTags = (optionalTags.sort().join(',') === sameOpsTagsArray.sort().join(','));
            }
        } else {
            if(customList.includes(feat.Feat.name.toLowerCase())){
                hasCorrectTags = true;
            }
        }

        /* If feat is an archetype feat, has the skill trait, and tagsArray doesn't include the skill trait,
          do not include feat. This follows the rule about archetype skill feats CRB pg. 219.
        */
        if(!tagsArray.includes('Skill') && feat.Tags.find(tag => { return tag.name.includes(' Archetype'); }) != null && feat.Tags.find(tag => { return tag.name == 'Skill'; }) != null){
          hasCorrectTags = false;
        }

        if(feat.Feat.level <= featLevel && hasCorrectTags){

          let selectionArray = featSelectionMap.get(feat.Feat.level);
          if(selectionArray == null) { selectionArray = []; }
          selectionArray.push(feat);
          featSelectionMap.set(feat.Feat.level, selectionArray);

        }

    }

    giveFeatSelection(locationID, srcStruct, selectionName, featSelectionMap, sourceName);

}


//////////////////////////////// Give Feat (by Name) ///////////////////////////////////

function giveFeatByName(srcStruct, featName, locationID, optionalTags, sourceName){
    featName = featName.replace(/_/g," ");
    featName = featName.replace(/’/g,"'");

    // Make optional tags lowercase
    if(optionalTags != null){
      for (let i = 0; i < optionalTags.length; i++) {
          optionalTags[i] = optionalTags[i].toLowerCase().trim();
      }
    }

    let featEntry = null;
    g_featMap.forEach(function(value, key, map){
        if(value.Feat.isArchived === 0) {
            if(value.Feat.name.toUpperCase() === featName){

              if(optionalTags != null) {
                let hasCorrectTags = false;
                let sameOpsTagsArray = [];
                for(let featTag of value.Tags){
                    let featTagNameLower = featTag.name.toLowerCase();
                    if(optionalTags.includes(featTagNameLower)){
                        sameOpsTagsArray.push(featTagNameLower);
                    }
                }
                hasCorrectTags = (optionalTags.sort().join(',') === sameOpsTagsArray.sort().join(','));

                if(hasCorrectTags) {
                  featEntry = value;
                  return;
                }
              } else {
                featEntry = value;
                return;
              }
            }
        }
    });
    if(featEntry == null){
        if(!isFeatHidden(featName)){
          if(optionalTags != null) {
            displayError("Cannot find feat with the given traits: \'"+featName+" ["+optionalTags+"]\'");
          } else {
            displayError("Cannot find feat: \'"+featName+"\'");
          }
        }
        statementComplete();
        return;
    }

    let featCodeSectionID = "featCode-"+locationID+"-"+srcStruct.sourceCode+"-"+srcStruct.sourceCodeSNum;
    $('#'+locationID).append('<div id="'+featCodeSectionID+'"></div>');

    featsUpdateWSCChoiceStruct(srcStruct, featEntry.Feat);
    socket.emit("requestFeatChangeByName",
        getCharIDFromURL(),
        {srcStruct, feat: featEntry, codeLocationID: featCodeSectionID});

}

socket.on("returnFeatChangeByName", function(featChangePacket){
  // If leftStatsQuickview is open, refresh it
  if($('#quickviewLeftDefault').hasClass('is-active')){
    openLeftQuickView('skillsView', null);
  }

  processBuilderCode(
      featChangePacket.feat.Feat.code,
      featChangePacket.srcStruct,
      featChangePacket.codeLocationID,
      featChangePacket.feat.Feat.name);
  
  statementComplete();
});