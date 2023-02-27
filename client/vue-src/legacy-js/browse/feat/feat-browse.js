/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

function filterFeatSearch(){

  let nameFilter = $('#filterNameInput').val();
  let tagsFilter = $('#filterTagsInput').val();
  let prereqFilter = $('#filterFeatPrereqInput').val();
  let descFilter = $('#filterDescInput').val();
  let actionsFilter = $('#filterActionsInput').val();
  let levelRelationFilter = $('#filterLevelRelationInput').val();
  let levelFilter = $('#filterLevelInput').val();
  let rarityFilter = $('#filterRarityInput').val();
  let skillFilter = $('#filterFeatSkillInput').val();
  let sourceFilter = $('#filterSourceInput').val();

  let featMap = new Map(g_featMap);

  if(nameFilter != ''){
    console.log('Filtering by Name...');
    let parts = nameFilter.toUpperCase().split(' ');
    for(const [featID, featStruct] of featMap.entries()){
      if(!textContainsWords(featStruct.Feat.name, parts)){
        featMap.delete(featID);
      }
    }
  }

  if(tagsFilter.length > 0){
    console.log('Filtering by Traits...');
    for(const [featID, featStruct] of featMap.entries()){
      let foundTags = featStruct.Tags.filter(tag => {
        return tagsFilter.includes(tag.id+"");
      });
      if(foundTags.length !== tagsFilter.length){
        featMap.delete(featID);
      }
    }
  }

  if(prereqFilter != ''){
    console.log('Filtering by Prereqs...');
    let parts = prereqFilter.toUpperCase().split(' ');
    for(const [featID, featStruct] of featMap.entries()){
      if(!textContainsWords(featStruct.Feat.prerequisites, parts)){
        featMap.delete(featID);
      }
    }
  }

  if(descFilter != ''){
    console.log('Filtering by Description...');
    let parts = descFilter.toUpperCase().split(' ');
    for(const [featID, featStruct] of featMap.entries()){
      if(!textContainsWords(featStruct.Feat.description, parts)){
        featMap.delete(featID);
      }
    }
  }
  
  if(actionsFilter != 'ANY'){
    console.log('Filtering by Actions...');
    for(const [featID, featStruct] of featMap.entries()){
      if(featStruct.Feat.actions !== actionsFilter){
        featMap.delete(featID);
      }
    }
  }
  
  if(levelFilter != ''){
    console.log('Filtering by Level...');
    let level = parseInt(levelFilter);
    for(const [featID, featStruct] of featMap.entries()){
      switch(levelRelationFilter) {
        case 'EQUAL': if(featStruct.Feat.level === level) {} else {featMap.delete(featID);} break;
        case 'LESS': if(featStruct.Feat.level < level) {} else {featMap.delete(featID);} break;
        case 'GREATER': if(featStruct.Feat.level > level) {} else {featMap.delete(featID);} break;
        case 'LESS-EQUAL': if(featStruct.Feat.level <= level) {} else {featMap.delete(featID);} break;
        case 'GREATER-EQUAL': if(featStruct.Feat.level >= level) {} else {featMap.delete(featID);} break;
        case 'NOT-EQUAL': if(featStruct.Feat.level !== level) {} else {featMap.delete(featID);} break;
        default: break;
      }
    }
  }

  if(rarityFilter != 'ANY'){
    console.log('Filtering by Rarity...');
    for(const [featID, featStruct] of featMap.entries()){
      if(featStruct.Feat.rarity !== rarityFilter){
        featMap.delete(featID);
      }
    }
  }

  if(skillFilter != 'ANY'){
    console.log('Filtering by Skill...');
    for(const [featID, featStruct] of featMap.entries()){
      if(featStruct.Feat.skillID != skillFilter){
        featMap.delete(featID);
      }
    }
  }

  if(sourceFilter != 'ANY'){
    console.log('Filtering by Source...');
    for(const [featID, featStruct] of featMap.entries()){
      if(featStruct.Feat.contentSrc !== sourceFilter){
        featMap.delete(featID);
      }
    }
  }

  displayFeatResults(featMap);
}

function displayFeatResults(featMap){
  $('#browsingList').html('');

  if(featMap.size <= 0){
    $('#browsingList').html('<p class="has-text-centered is-italic">No results found!</p>');
    $('#searchResultCountContainer').html('<p class="is-italic has-txt-noted">(0 results found)</p>');
    return;
  }

  featMap = new Map([...featMap.entries()].sort(
    function(a, b) {
        if (a[1].Feat.level === b[1].Feat.level) {
            // Name is only important when levels are the same
            return a[1].Feat.name > b[1].Feat.name ? 1 : -1;
        }
        return a[1].Feat.level - b[1].Feat.level;
    })
  );

  let foundCount = 0;
  for(const [featID, featStruct] of featMap.entries()){
    if(featStruct.Feat.genericType == 'BASIC-ACTION'
      || featStruct.Feat.genericType == 'SKILL-ACTION'
      || featStruct.Feat.genericType == 'CREATURE-ACTION'
      || featStruct.Feat.genericType == 'COMPANION-ACTION') {continue;}
    if(featStruct.Feat.isArchived == 1) {continue;}
    if(g_hiddenFromBrowseContentSources.includes(featStruct.Feat.contentSrc)) {continue;}
    foundCount++;

    let entryID = 'feat-'+featID;
    let name = featStruct.Feat.name;
    let actions = featStruct.Feat.actions;

    let rarity = featStruct.Feat.rarity;
    let level = featStruct.Feat.level;
    if(level <= 0 || level >= 99) { level = ''; }

    $('#browsingList').append('<div id="'+entryID+'" class="columns is-mobile border-bottom border-dark-lighter cursor-clickable"><div class="column is-8"><span class="is-size-5">'+name+'</span>'+convertActionToHTML(actions)+'</div><div class="column is-4" style="position: relative;">'+convertRarityToHTML(rarity)+'<span class="is-size-7 has-txt-noted is-italic pr-2" style="position: absolute; top: 1px; right: 0px;">'+level+'</span></div></div>');

    $('#'+entryID).click(function(){
      openQuickView('featView', {
        Feat : featStruct.Feat,
        Tags : featStruct.Tags
      });
      updateBrowseURL('id', featID);
    });

    $('#'+entryID).mouseenter(function(){
      $(this).addClass('has-bg-selectable-hover');
    });
    $('#'+entryID).mouseleave(function(){
      $(this).removeClass('has-bg-selectable-hover');
    });

  }
  $('#searchResultCountContainer').html('<p class="is-italic has-txt-noted">('+foundCount+' results found)</p>');
  $('#browsingList').scrollTop();
}


