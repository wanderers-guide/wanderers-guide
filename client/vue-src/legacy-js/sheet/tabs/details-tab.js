/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

function openDetailsTab(data){

    $('#tabContent').append('<div class="tabs is-centered is-marginless"><ul class="details-tabs"><li><a id="detailsTabFeats">Feats</a></li><li><a id="detailsTabAbilities">Abilities</a></li><li><a id="detailsTabDescription">Description</a></li></ul></div>');

    $('#tabContent').append('<div id="detailsTabContent"></div>');

    $('#detailsTabFeats').click(function(){
        changeDetailsTab('detailsTabFeats', data);
    });

    $('#detailsTabAbilities').click(function(){
        changeDetailsTab('detailsTabAbilities', data);
    });

    $('#detailsTabDescription').click(function(){
        changeDetailsTab('detailsTabDescription', data);
    });

    $('#'+g_selectedDetailsSubTabID).click();

}

// Details Tabs //
function changeDetailsTab(type, data){
    if(!g_selectedSubTabLock) {g_selectedSubTabID = type;}
    g_selectedDetailsSubTabID = type;

    $('#detailsTabContent').html('');

    $('#detailsTabFeats').parent().removeClass("is-active");
    $('#detailsTabAbilities').parent().removeClass("is-active");
    $('#detailsTabDescription').parent().removeClass("is-active");

    $('#'+type).parent().addClass("is-active");

    switch(type) {
        case 'detailsTabFeats': displayFeatsSection(data); break;
        case 'detailsTabAbilities': displayAbilitiesSection(data); break;
        case 'detailsTabDescription': displayDescriptionSection(data); break;
        default: break;
    }

}


function displayFeatsSection(data) {

    $('#detailsTabContent').append('<div class="columns is-mobile is-marginless"><div class="column"><p class="control has-icons-left"><input id="featsSearch" class="input" type="text" autocomplete="off" placeholder="Search Feats"><span class="icon is-left"><i class="fas fa-search" aria-hidden="true"></i></span></p></div><div class="column is-narrow"><div class="select"><select id="featsFilterByType"><option value="All">All</option><option value="Class">Class</option><option value="Ancestry">Ancestry</option><option value="Skill">Skill</option><option value="Other">Other</option></select></div></div></div><div id="featsContent" class="use-custom-scrollbar" style="height: 505px; max-height: 505px; overflow-y: auto;"></div>');

    $('#featsFilterByType').val(g_selectedDetailsOptionValue);
    displayFeatContent(data);

}

function displayFeatContent(data){

    $('#featsFilterByType').off('change');
    $('#featsSearch').off('change');

    $('#featsContent').html('');

    let featsFilterByType = $('#featsFilterByType');
    if(featsFilterByType.val() == "All"){
        featsFilterByType.parent().removeClass('is-info');
    } else {
        featsFilterByType.parent().addClass('is-info');
    }
    featsFilterByType.blur();

    let featsSearch = $('#featsSearch');
    let featsSearchValue = (featsSearch.val() === "") ? null : featsSearch.val();
    if(featsSearchValue == null){
        featsSearch.removeClass('is-info');
    } else {
        featsSearch.addClass('is-info');
    }

    $('#featsFilterByType').change(function(){
        g_selectedDetailsOptionValue = $(this).val();
        displayFeatContent(data);
    });

    $('#featsSearch').change(function(){
        displayFeatContent(data);
    });

    let selectedFeatFilter = $('#featsFilterByType').val();
    if(selectedFeatFilter === "All"){
        displayClassFeats(data, featsSearchValue, false);
        displayAncestryFeats(data, featsSearchValue, false);
        displaySkillFeats(data, featsSearchValue, false);
        displayOtherFeats(data, featsSearchValue, false);
    } else if(selectedFeatFilter === "Class"){
        displayClassFeats(data, featsSearchValue);
    } else if(selectedFeatFilter === "Ancestry"){
        displayAncestryFeats(data, featsSearchValue);
    } else if(selectedFeatFilter === "Skill"){
        displaySkillFeats(data, featsSearchValue);
    } else if(selectedFeatFilter === "Other"){
        displayOtherFeats(data, featsSearchValue);
    }

}

function displayClassFeats(data, featsSearchValue, displayIfNoResults=true){
  $('#featsContent').append('<p id="featsContent-classFeats" class="is-size-5 has-txt-listing has-text-weight-bold text-left pl-5">Class</p>');
  $('#featsContent').append('<hr id="featsContent-classFeats-hr" class="hr-light" style="margin-top:-0.5em; margin-bottom:0em;">');
  let displayedFeat = featDisplayByType(data, [data.ClassDetails.Class.name], featsSearchValue);

  if(!displayIfNoResults && !displayedFeat){
    $('#featsContent-classFeats').addClass('is-hidden');
    $('#featsContent-classFeats-hr').addClass('is-hidden');
  }

}

function displayAncestryFeats(data, featsSearchValue, displayIfNoResults=true){
  $('#featsContent').append('<p id="featsContent-ancestryFeats" class="is-size-5 has-txt-listing has-text-weight-bold text-left pl-5">Ancestry</p>');
  $('#featsContent').append('<hr id="featsContent-ancestryFeats-hr" class="hr-light" style="margin-top:-0.5em; margin-bottom:0em;">');
  let displayedFeat = featDisplayByType(data, cloneObj(g_charTagsArray), featsSearchValue);

  if(!displayIfNoResults && !displayedFeat){
    $('#featsContent-ancestryFeats').addClass('is-hidden');
    $('#featsContent-ancestryFeats-hr').addClass('is-hidden');
  }

}

function displaySkillFeats(data, featsSearchValue, displayIfNoResults=true){
  $('#featsContent').append('<p id="featsContent-skillFeats" class="is-size-5 has-txt-listing has-text-weight-bold text-left pl-5">Skill</p>');
  $('#featsContent').append('<hr id="featsContent-skillFeats-hr" class="hr-light" style="margin-top:-0.5em; margin-bottom:0em;">');
  let displayedFeat = featDisplayByType(data, ['Skill'], featsSearchValue);

  if(!displayIfNoResults && !displayedFeat){
    $('#featsContent-skillFeats').addClass('is-hidden');
    $('#featsContent-skillFeats-hr').addClass('is-hidden');
  }

}

function displayOtherFeats(data, featsSearchValue, displayIfNoResults=true){
  $('#featsContent').append('<p id="featsContent-otherFeats" class="is-size-5 has-txt-listing has-text-weight-bold text-left pl-5">Other</p>');
  $('#featsContent').append('<hr id="featsContent-otherFeats-hr" class="hr-light" style="margin-top:-0.5em; margin-bottom:0em;">');
  let displayedFeat = featDisplayByType(data, null, featsSearchValue);

  if(!displayIfNoResults && !displayedFeat){
    $('#featsContent-otherFeats').addClass('is-hidden');
    $('#featsContent-otherFeats-hr').addClass('is-hidden');
  }

}

function featDisplayByType(data, sortingTagNameArray, featsSearchValue){

    let displayedFeat = false;
    let featCount = 0;
    for(const feat of data.FeatChoiceArray){
        if(feat.value == null) { continue; }
        let featData = data.FeatMap.get(feat.value.id+"");
        if(featData == null) { continue; }
        if(isFeatConcealed(feat.value.name)){ continue; }
        let featTags = featData.Tags;
        let didDisplay = false;
        if(sortingTagNameArray == null){
            // Is Other, display if feat is NOT ancestry, class, or skill
            let sortingTagNameArray = cloneObj(g_charTagsArray);
            sortingTagNameArray.push(data.ClassDetails.Class.name);
            sortingTagNameArray.push('Skill');
            let tag = featTags.find(tag => {
                return sortingTagNameArray.includes(tag.name);
            });
            if(tag == null){
                didDisplay = filterFeatsThroughSearch(feat, featTags, featCount, featsSearchValue);
            }
        } else {
            let tag = featTags.find(tag => {
                return sortingTagNameArray.includes(tag.name);
            });
            if(tag != null){
              didDisplay = filterFeatsThroughSearch(feat, featTags, featCount, featsSearchValue);
            }
        }
        if(didDisplay){
          displayedFeat = true;
        }
        featCount++;
    }

    return displayedFeat;

}

function filterFeatsThroughSearch(featData, featTags, featCount, featsSearchValue){

    let willDisplay = false;
    if(featsSearchValue != null){
        let featName = featData.value.name.toLowerCase();
        if(!featName.includes(featsSearchValue)){
            willDisplay = false;
        } else {
            willDisplay = true;
        }
    } else {
        willDisplay = true;
    }

    if(willDisplay) {
        displayFeat(featData, featTags, featCount);
    }

    return willDisplay;

}

function displayFeat(featData, featTags, featCount){

    let feat = featData.value;
    let featID = 'featDetailsEntry'+feat.id+"C"+featCount;

    let featNameInnerHTML = '';
    if(feat.level > 9){
        featNameInnerHTML += '<span class="is-size-7 has-txt-noted">'+feat.level+' - </span>';
    } else if(feat.level > 0){
        featNameInnerHTML += '<span class="is-size-7 has-txt-noted pl-2">'+feat.level+' - </span>';
    } else {
        featNameInnerHTML += '<span class="is-size-7 has-txt-noted pl-4 ml-1 is-hidden-mobile"></span>';
    }

    featNameInnerHTML += '<span class="has-txt-listing">'+feat.name+'</span>';

    switch(feat.actions) {
        case 'FREE_ACTION': featNameInnerHTML += '<span class="px-2 pf-icon">[free-action]</span>'; break;
        case 'REACTION': featNameInnerHTML += '<span class="px-2 pf-icon">[reaction]</span>'; break;
        case 'ACTION': featNameInnerHTML += '<span class="px-2 pf-icon">[one-action]</span>'; break;
        case 'TWO_ACTIONS': featNameInnerHTML += '<span class="px-2 pf-icon">[two-actions]</span>'; break;
        case 'THREE_ACTIONS': featNameInnerHTML += '<span class="px-2 pf-icon">[three-actions]</span>'; break;
        default: break;
    }

    if(feat.isArchived === 1){
        featNameInnerHTML += '<em class="pl-1">(archived)</em>';
    }

    let featTagsInnerHTML = '<div class="buttons is-marginless is-right">';
    switch(feat.rarity) {
        case 'UNCOMMON': featTagsInnerHTML += '<button class="button is-marginless mr-2 my-1 is-very-small is-uncommon">Uncommon</button>';
            break;
        case 'RARE': featTagsInnerHTML += '<button class="button is-marginless mr-2 my-1 is-very-small is-rare">Rare</button>';
            break;
        case 'UNIQUE': featTagsInnerHTML += '<button class="button is-marginless mr-2 my-1 is-very-small is-unique">Unique</button>';
            break;
        default: break;
    }

    if(feat.skillID != null){
        let skill = null;
        for(const [skillName, skillData] of g_skillMap.entries()){
            if(skillData.Skill.id == feat.skillID) {
                skill = skillData.Skill;
                break;
            }
        }
        featTagsInnerHTML += '<button class="button is-marginless mr-2 my-1 is-very-small is-info">'+skill.name+'</button>';
    }

    for(const tag of featTags){
        if(feat.level == -1 && tag.name == 'General'){ continue; }
        featTagsInnerHTML += '<button class="button is-marginless mr-2 my-1 is-very-small is-info">'+tag.name+getImportantTraitIcon(tag)+'</button>';
    }
    featTagsInnerHTML += '</div>';

    $('#featsContent').append('<div id="'+featID+'" class="columns is-mobile border-bottom border-dark-lighter cursor-clickable is-marginless mx-2"><div class="column is-paddingless pl-3"><p class="text-left pt-1">'+featNameInnerHTML+'</p></div><div class="column is-paddingless"><p class="">'+featTagsInnerHTML+'</p></div></div>');
    
    $('#'+featID).click(function(){
        openQuickView('featView', {
            Feat : feat,
            Tags : featTags,
            SrcStruct : featData,
        });
    });

    $('#'+featID).mouseenter(function(){
        $(this).addClass('has-bg-selectable-hover');
    });
    $('#'+featID).mouseleave(function(){
        $(this).removeClass('has-bg-selectable-hover');
    });

}





function displayAbilitiesSection(data) {

    $('#detailsTabContent').append('<div class="columns is-mobile is-marginless"><div class="column"><p class="control has-icons-left"><input id="abilitiesSearch" class="input" autocomplete="off" type="text" placeholder="Search Abilities"><span class="icon is-left"><i class="fas fa-search" aria-hidden="true"></i></span></p></div><div class="column is-narrow"><div class="select"><select id="abilitiesFilterByType"><option value="All">All</option><option value="Class">Class</option><option value="Ancestry">Ancestry</option><option value="Other">Other</option></select></div></div></div><div id="abilitiesContent" class="use-custom-scrollbar" style="height: 505px; max-height: 505px; overflow-y: auto;"></div>');

    if(g_selectedDetailsOptionValue === 'Skill'){
      $('#abilitiesFilterByType').val('All');
    } else {
      $('#abilitiesFilterByType').val(g_selectedDetailsOptionValue);
    }
    displayAbilitiesContent(data);

}

function displayAbilitiesContent(data){

    $('#abilitiesFilterByType').off('change');
    $('#abilitiesSearch').off('change');

    $('#abilitiesContent').html('');

    let abilitiesFilterByType = $('#abilitiesFilterByType');
    if(abilitiesFilterByType.val() == "All"){
        abilitiesFilterByType.parent().removeClass('is-info');
    } else {
        abilitiesFilterByType.parent().addClass('is-info');
    }
    abilitiesFilterByType.blur();

    let abilitiesSearch = $('#abilitiesSearch');
    let abilitiesSearchValue = (abilitiesSearch.val() === "") ? null : abilitiesSearch.val();
    if(abilitiesSearchValue == null){
        abilitiesSearch.removeClass('is-info');
    } else {
        abilitiesSearch.addClass('is-info');
    }

    $('#abilitiesFilterByType').change(function(){
        g_selectedDetailsOptionValue = $(this).val();
        displayAbilitiesContent(data);
    });

    $('#abilitiesSearch').change(function(){
        displayAbilitiesContent(data);
    });

    let selectedAbilityFilter = $('#abilitiesFilterByType').val();
    if(selectedAbilityFilter === "All"){
        displayClassAbilities(data, abilitiesSearchValue, false);
        displayAncestryAbilities(data, abilitiesSearchValue, false);
        displayOtherAbilities(data, abilitiesSearchValue, false);
    } else if(selectedAbilityFilter === "Class"){
        displayClassAbilities(data, abilitiesSearchValue);
    } else if(selectedAbilityFilter === "Ancestry"){
        displayAncestryAbilities(data, abilitiesSearchValue);
    } else if(selectedAbilityFilter === "Other"){
        displayOtherAbilities(data, abilitiesSearchValue);
    }

}

function displayClassAbilities(data, abilitiesSearchValue, displayIfNoResults=true){
    $('#abilitiesContent').append('<p id="abilitiesContent-classAbilities" class="is-size-5 has-txt-listing has-text-weight-bold text-left pl-5">Class</p>');
    $('#abilitiesContent').append('<hr id="abilitiesContent-classAbilities-hr" class="hr-light" style="margin-top:-0.5em; margin-bottom:0em;">');

    let displayedAbility = false;
    let abilCount = 0;
    if(g_classArchetype != null){
      let archetypeAbil = {
        name: g_classArchetype.name,
        description: g_classArchetype.replacementCode.initial.archetypeText,
        level: 0,
      };
      let didDisplay = filterAbilitiesThroughSearch(archetypeAbil, 'Class'+abilCount, abilitiesSearchValue);
      if(didDisplay){
        displayedAbility = true;
      }
      abilCount++;
    }

    for(let classAbil of data.ClassDetails.Abilities){
        if(classAbil.displayInSheet === 0 || classAbil.selectType == 'SELECT_OPTION' || classAbil.level > g_character.level || classAbil.level == -1){ continue; }
        let didDisplay = filterAbilitiesThroughSearch(classAbil, 'Class'+abilCount, abilitiesSearchValue);
        if(didDisplay){
          displayedAbility = true;
        }
        abilCount++;
    }

    if(!displayIfNoResults && !displayedAbility){
      $('#abilitiesContent-classAbilities').addClass('is-hidden');
      $('#abilitiesContent-classAbilities-hr').addClass('is-hidden');
    }

}

function displayAncestryAbilities(data, abilitiesSearchValue, displayIfNoResults=true){
    $('#abilitiesContent').append('<p id="abilitiesContent-ancestryAbilities" class="is-size-5 has-txt-listing has-text-weight-bold text-left pl-5">Ancestry</p>');
    $('#abilitiesContent').append('<hr id="abilitiesContent-ancestryAbilities-hr" class="hr-light" style="margin-top:-0.5em; margin-bottom:0em;">');
   
    let displayedAbility = false;
    let abilCount = 0;
    for(let phyFeat of data.PhyFeats){
        if(phyFeat.sourceType != 'ancestry'){ continue; }
        if(phyFeat.value == null) { continue; }
        let phyFeatAbil = {
            name: phyFeat.value.name,
            description: phyFeat.value.description,
            level: 1,
        };
        let didDisplay = filterAbilitiesThroughSearch(phyFeatAbil, 'AncestryPhyFeat'+abilCount, abilitiesSearchValue);
        if(didDisplay){
          displayedAbility = true;
        }
        abilCount++;
    }

    if(!displayIfNoResults && !displayedAbility){
      $('#abilitiesContent-ancestryAbilities').addClass('is-hidden');
      $('#abilitiesContent-ancestryAbilities-hr').addClass('is-hidden');
    }

}

function displayOtherAbilities(data, abilitiesSearchValue, displayIfNoResults=true){
    $('#abilitiesContent').append('<p id="abilitiesContent-otherAbilities" class="is-size-5 has-txt-listing has-text-weight-bold text-left pl-5">Other</p>');
    $('#abilitiesContent').append('<hr id="abilitiesContent-otherAbilities-hr" class="hr-light" style="margin-top:-0.5em; margin-bottom:0em;">');
    
    let displayedAbility = false;
    let abilCount = 0;
    for(let extraClassAbil of g_extraClassAbilities){
      let srcStruct = cloneObj(extraClassAbil); srcStruct.value = null;
      extraClassAbil.value.srcStruct = srcStruct;
      let didDisplay = filterAbilitiesThroughSearch(extraClassAbil.value, 'ExtraClass'+abilCount, abilitiesSearchValue);
      if(didDisplay){
        displayedAbility = true;
      }
      abilCount++;
    }
    for(let heritageEffect of g_heritageEffects){
      let ability = cloneObj(heritageEffect.value);
      ability.level = heritageEffect.sourceLevel;
      ability.name = 'Heritage Benefits - '+ability.name;
      let didDisplay = filterAbilitiesThroughSearch(ability, 'ExtraClass'+abilCount, abilitiesSearchValue);
      if(didDisplay){
        displayedAbility = true;
      }
      abilCount++;
    }

    if(!displayIfNoResults && !displayedAbility){
      $('#abilitiesContent-otherAbilities').addClass('is-hidden');
      $('#abilitiesContent-otherAbilities-hr').addClass('is-hidden');
    }

}

function filterAbilitiesThroughSearch(ability, abilIdentifier, abilitiesSearchValue){

    let willDisplay = false;
    if(abilitiesSearchValue != null){
        let abilityName = ability.name.toLowerCase();
        if(!abilityName.includes(abilitiesSearchValue)){
            willDisplay = false;
        } else {
            willDisplay = true;
        }
    } else {
        willDisplay = true;
    }

    if(willDisplay) {
        displayAbility(ability, abilIdentifier);
    }

    return willDisplay;

}

function displayAbility(ability, abilIdentifier){

    let abilityID = 'abilityDetailsEntry'+abilIdentifier;

    let abilityName = ability.name;
    if(ability.selectType == "SELECTOR"){
      for(let classAbilChoice of g_classDetails.AbilityChoices){
        if(classAbilChoice.SelectorID == ability.id){

          // If has srcStruct (is extra class feature), confirm it's the correct one
          if(ability.srcStruct != null){
            if(!hasSameSrc(ability.srcStruct, classAbilChoice)){ continue; }
          }

          // Find ability option
          let abilityOption = g_allClassAbilityOptions.find(abil => {
            return abil.id == classAbilChoice.OptionID;
          });
          if(abilityOption != null){ abilityName += ' - <span class="is-italic has-txt-partial-noted">'+abilityOption.name+'</span>'; }
          break;
        }
      }
    }

    let abilityNameInnerHTML = '<span class="has-txt-listing">'+abilityName+'</span>';
    let abilityLevelInnerHTML = (ability.level == 0 || ability.level == null) ? '' : '<span>Level '+ability.level+'</span>';

    $('#abilitiesContent').append('<div id="'+abilityID+'" class="columns is-mobile border-bottom border-dark-lighter cursor-clickable is-marginless mx-2"><div class="column is-paddingless pl-3"><p class="text-left pt-1">'+abilityNameInnerHTML+'</p></div><div class="column is-paddingless"><p class="pt-1">'+abilityLevelInnerHTML+'</p></div></div>');
    
    $('#'+abilityID).click(function(){
        openQuickView('abilityView', {
            Ability : ability
        });
    });

    $('#'+abilityID).mouseenter(function(){
        $(this).addClass('has-bg-selectable-hover');
    });
    $('#'+abilityID).mouseleave(function(){
        $(this).removeClass('has-bg-selectable-hover');
    });

}




function displayDescriptionSection(data){
    $('#detailsTabContent').append('<div id="descriptionContent" class="use-custom-scrollbar" style="height: 555px; max-height: 555px; overflow-y: auto;"></div>');

    $('#descriptionContent').append('<p class="is-size-5 has-txt-listing has-text-weight-bold text-left pl-5 pt-2">Background - '+data.Background.name+'</p>');
    $('#descriptionContent').append('<hr class="hr-light" style="margin-top:-0.5em; margin-bottom:0em;">');

    $('#descriptionContent').append('<div class="mx-3">'+processText(data.Background.description, true, true, 'SMALL')+'</div>');

    // Add Text Statements
    processAddText(data.Background.code, 'descriptionContent');

    // Note Field Statements
    let srcStructBackground = { // Hardcoded - same srcStruct as in char-builder-3.js
        sourceType: 'background',
        sourceLevel: 1,
        sourceCode: 'background',
        sourceCodeSNum: 'a',
    };
    displayNotesField($('#descriptionContent'), srcStructBackground, 2);

    if(data.Heritage != null){

        $('#descriptionContent').append('<p class="is-size-5 has-txt-listing has-text-weight-bold text-left pl-5 pt-2">Heritage - '+data.Heritage.name+' </p>');
        $('#descriptionContent').append('<hr class="hr-light" style="margin-top:-0.5em; margin-bottom:0em;">');
    
        $('#descriptionContent').append('<div class="mx-3">'+processText(data.Heritage.description, true, true, 'SMALL')+'</div>');

        // Add Text Statements
        processAddText(data.Heritage.code, 'descriptionContent');
    
        // Note Field Statements
        let srcStructHeritage = { // Hardcoded - same srcStruct as in char-builder-2.js
            sourceType: 'ancestry',
            sourceLevel: 1,
            sourceCode: 'heritage',
            sourceCodeSNum: 'a',
        };
        displayNotesField($('#descriptionContent'), srcStructHeritage, 2);

    }

    $('#descriptionContent').append('<p class="is-size-5 has-txt-listing has-text-weight-bold text-left pl-5 pt-2">Other Information</p>');
    $('#descriptionContent').append('<hr class="hr-light" style="margin-top:-0.5em; margin-bottom:0em;">');

    let charHistoryAreaID = "charHistoryArea";
    let charHistoryAreaControlShellID = "charHistoryAreaControlShell";

    $('#descriptionContent').append('<div id="'+charHistoryAreaControlShellID+'" class="control mt-1 mx-1"><textarea id="'+charHistoryAreaID+'" class="textarea has-fixed-size use-custom-scrollbar" rows="8" spellcheck="false" placeholder="Use this area to keep information about your character\'s backstory, appearance, or really anything!"></textarea></div>');

    $("#"+charHistoryAreaID).val(data.Character.details);

    $("#"+charHistoryAreaID).blur(function(){
        if(data.Character.details != $(this).val()) {

            $("#"+charHistoryAreaControlShellID).addClass("is-loading");

            socket.emit("requestDetailsSave",
                getCharIDFromURL(),
                $(this).val());
                
            data.Character.details = $(this).val();

        }
    });

}

socket.on("returnDetailsSave", function(){
    $("#charHistoryAreaControlShell").removeClass("is-loading");
});
