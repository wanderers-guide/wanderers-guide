/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

function filterArchetypeSearch(){

  let nameFilter = $('#filterNameInput').val();
  let levelRelationFilter = $('#filterLevelRelationInput').val();
  let levelFilter = $('#filterLevelInput').val();
  let rarityFilter = $('#filterRarityInput').val();
  let sourceFilter = $('#filterSourceInput').val();


  let allArchetypes = new Set(g_allArchetypes);

  if(nameFilter != ''){
    console.log('Filtering by Name...');
    let parts = nameFilter.toUpperCase().split(' ');
    for(const archetype of allArchetypes){
      if(!textContainsWords(archetype.name, parts)){
        allArchetypes.delete(archetype);
      }
    }
  }

  if(levelFilter != ''){
    console.log('Filtering by Level...');
    let level = parseInt(levelFilter);
    for(const archetype of allArchetypes){
      const dedFeatStruct = g_featMap.get(archetype.dedicationFeatID+'');
      switch(levelRelationFilter) {
        case 'EQUAL': if(dedFeatStruct.Feat.level === level) {} else {allArchetypes.delete(archetype);} break;
        case 'LESS': if(dedFeatStruct.Feat.level < level) {} else {allArchetypes.delete(archetype);} break;
        case 'GREATER': if(dedFeatStruct.Feat.level > level) {} else {allArchetypes.delete(archetype);} break;
        case 'LESS-EQUAL': if(dedFeatStruct.Feat.level <= level) {} else {allArchetypes.delete(archetype);} break;
        case 'GREATER-EQUAL': if(dedFeatStruct.Feat.level >= level) {} else {allArchetypes.delete(archetype);} break;
        case 'NOT-EQUAL': if(dedFeatStruct.Feat.level !== level) {} else {allArchetypes.delete(archetype);} break;
        default: break;
      }
    }
  }

  if(rarityFilter != 'ANY'){
    console.log('Filtering by Rarity...');
    for(const archetype of allArchetypes){
      const dedFeatStruct = g_featMap.get(archetype.dedicationFeatID+'');
      if(dedFeatStruct.Feat.rarity !== rarityFilter){
        allArchetypes.delete(archetype);
      }
    }
  }

  if(sourceFilter != 'ANY'){
    console.log('Filtering by Source...');
    for(const archetype of allArchetypes){
      if(archetype.contentSrc !== sourceFilter){
        allArchetypes.delete(archetype);
      }
    }
  }

  displayArchetypeResults(allArchetypes);
}

function displayArchetypeResults(allArchetypes){
  $('#browsingList').html('');

  if(allArchetypes.size <= 0){
    $('#browsingList').html('<p class="has-text-centered is-italic">No results found!</p>');
    $('#searchResultCountContainer').html('<p class="is-italic has-txt-noted">(0 results found)</p>');
    return;
  }
  
  allArchetypes = Array.from(allArchetypes).sort(
    function(a, b) {
      const dedFeatStructA = g_featMap.get(a.dedicationFeatID+'');
      const dedFeatStructB = g_featMap.get(b.dedicationFeatID+'');
      if (dedFeatStructA.Feat.level === dedFeatStructB.Feat.level) {
        // Name is only important when levels are the same
        return dedFeatStructA.Feat.name > dedFeatStructB.Feat.name ? 1 : -1;
      }
      return dedFeatStructA.Feat.level - dedFeatStructB.Feat.level;
    }
  );

  let foundCount = 0;
  for(const archetype of allArchetypes){
    if(archetype.isArchived == 1) {continue;}
    if(g_hiddenFromBrowseContentSources.includes(archetype.contentSrc)) {continue;}
    foundCount++;

    let entryID = 'archetype-'+archetype.id;
    let name = archetype.name;

    const dedFeatStruct = g_featMap.get(archetype.dedicationFeatID+'');
    let rarity = dedFeatStruct.Feat.rarity;
    let level = dedFeatStruct.Feat.level;

    $('#browsingList').append('<div id="'+entryID+'" class="columns is-mobile border-bottom border-dark-lighter cursor-clickable"><div class="column is-8"><span class="is-size-5">'+name+'</span></div><div class="column is-4" style="position: relative;">'+convertRarityToHTML(rarity)+'<span class="is-size-7 has-txt-noted is-italic pr-2" style="position: absolute; top: 1px; right: 0px;">'+level+'</span></div></div>');

    $('#'+entryID).click(function(){
      new DisplayArchetype('tabContent', archetype.id, g_featMap);
      updateBrowseURL('id', archetype.id);
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