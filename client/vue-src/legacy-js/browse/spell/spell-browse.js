/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

function filterSpellSearch(){

  let nameFilter = $('#filterNameInput').val();
  let tagsFilter = $('#filterTagsInput').val();
  let areaFilter = $('#filterAreaInput').val();
  let rangeFilter = $('#filterRangeInput').val();
  let targetsFilter = $('#filterTargetsInput').val();
  let descFilter = $('#filterDescInput').val();
  let traditionFilter = $('#filterSpellTraditionInput').val();
  let castTimeFilter = $('#filterCastTimeInput').val();
  let componentsFilter = $('#filterComponentsInput').val();
  let levelRelationFilter = $('#filterLevelRelationInput').val();
  let levelFilter = $('#filterLevelInput').val();
  let savingThrowFilter = $('#filterSpellSavingThrowInput').val();
  let heightenFilter = $('#filterSpellHeightenInput').val();
  let focusFilter = $('#filterSpellFocusInput').val();
  let rarityFilter = $('#filterRarityInput').val();
  let sourceFilter = $('#filterSourceInput').val();

  let spellMap = new Map(g_spellMap);

  if(nameFilter != ''){
    console.log('Filtering by Name...');
    let parts = nameFilter.toUpperCase().split(' ');
    for(const [spellID, spellStruct] of spellMap.entries()){
      if(!textContainsWords(spellStruct.Spell.name, parts)){
        spellMap.delete(spellID);
      }
    }
  }

  if(tagsFilter.length > 0){
    console.log('Filtering by Traits...');
    for(const [spellID, spellStruct] of spellMap.entries()){
      let foundTags = spellStruct.Tags.filter(tag => {
        return tagsFilter.includes(tag.id+"");
      });
      if(foundTags.length !== tagsFilter.length){
        spellMap.delete(spellID);
      }
    }
  }

  if(areaFilter != ''){
    console.log('Filtering by Area...');
    let parts = areaFilter.toUpperCase().split(' ');
    for(const [spellID, spellStruct] of spellMap.entries()){
      if(!textContainsWords(spellStruct.Spell.area, parts)){
        spellMap.delete(spellID);
      }
    }
  }

  if(rangeFilter != ''){
    console.log('Filtering by Range...');
    let parts = rangeFilter.toUpperCase().split(' ');
    for(const [spellID, spellStruct] of spellMap.entries()){
      if(!textContainsWords(spellStruct.Spell.range, parts)){
        spellMap.delete(spellID);
      }
    }
  }

  if(targetsFilter != ''){
    console.log('Filtering by Targets...');
    let parts = targetsFilter.toUpperCase().split(' ');
    for(const [spellID, spellStruct] of spellMap.entries()){
      if(!textContainsWords(spellStruct.Spell.targets, parts)){
        spellMap.delete(spellID);
      }
    }
  }

  if(descFilter != ''){
    console.log('Filtering by Description...');
    let parts = descFilter.toUpperCase().split(' ');
    for(const [spellID, spellStruct] of spellMap.entries()){

      let spellDesc = textContainsWords(spellStruct.Spell.description, parts);
      let h1Desc = textContainsWords(spellStruct.Spell.heightenedOneText, parts);
      let h2Desc = textContainsWords(spellStruct.Spell.heightenedTwoText, parts);
      let h3Desc = textContainsWords(spellStruct.Spell.heightenedThreeText, parts);
      let h4Desc = textContainsWords(spellStruct.Spell.heightenedFourText, parts);

      if(!spellDesc && !h1Desc && !h2Desc && !h3Desc && !h4Desc){
        spellMap.delete(spellID);
      }
    }
  }

  if(traditionFilter != 'ANY'){
    console.log('Filtering by Tradition...');
    for(const [spellID, spellStruct] of spellMap.entries()){
      if(!spellStruct.Spell.traditions.includes(traditionFilter)){
        spellMap.delete(spellID);
      }
    }
  }
  
  if(castTimeFilter != 'ANY'){
    console.log('Filtering by Cast Time...');
    for(const [spellID, spellStruct] of spellMap.entries()){
      if(spellStruct.Spell.cast !== castTimeFilter){
        spellMap.delete(spellID);
      }
    }
  }

  if(componentsFilter != 'ANY'){
    console.log('Filtering by Components...');
    for(const [spellID, spellStruct] of spellMap.entries()){
      if(!spellStruct.Spell.castingComponents.includes(componentsFilter)){
        spellMap.delete(spellID);
      }
    }
  }
  
  if(levelFilter != ''){
    console.log('Filtering by Level...');
    let level = parseInt(levelFilter);
    for(const [spellID, spellStruct] of spellMap.entries()){
      switch(levelRelationFilter) {
        case 'EQUAL': if(spellStruct.Spell.level === level) {} else {spellMap.delete(spellID);} break;
        case 'LESS': if(spellStruct.Spell.level < level) {} else {spellMap.delete(spellID);} break;
        case 'GREATER': if(spellStruct.Spell.level > level) {} else {spellMap.delete(spellID);} break;
        case 'LESS-EQUAL': if(spellStruct.Spell.level <= level) {} else {spellMap.delete(spellID);} break;
        case 'GREATER-EQUAL': if(spellStruct.Spell.level >= level) {} else {spellMap.delete(spellID);} break;
        case 'NOT-EQUAL': if(spellStruct.Spell.level !== level) {} else {spellMap.delete(spellID);} break;
        default: break;
      }
    }
  }

  if(savingThrowFilter != 'ANY'){
    console.log('Filtering by Saving Throw...');
    for(const [spellID, spellStruct] of spellMap.entries()){
      if(spellStruct.Spell.savingThrow !== savingThrowFilter){
        spellMap.delete(spellID);
      }
    }
  }

  if(heightenFilter != 'ANY'){
    console.log('Filtering by Heighten...');
    for(const [spellID, spellStruct] of spellMap.entries()){

      if(heightenFilter == 'NONE'){
        if(spellStruct.Spell.heightenedOneVal == null && spellStruct.Spell.heightenedTwoVal == null && spellStruct.Spell.heightenedThreeVal == null && spellStruct.Spell.heightenedFourVal == null) {
          // Found spell with no heightening
        } else {
          spellMap.delete(spellID);
        }
      } else {
        if(spellStruct.Spell.heightenedOneVal !== heightenFilter && spellStruct.Spell.heightenedTwoVal !== heightenFilter && spellStruct.Spell.heightenedThreeVal !== heightenFilter && spellStruct.Spell.heightenedFourVal !== heightenFilter) {
          spellMap.delete(spellID);
        }
      }

    }
  }

  if(focusFilter != 'ANY'){
    console.log('Filtering by Focus...');
    for(const [spellID, spellStruct] of spellMap.entries()){
      if(spellStruct.Spell.isFocusSpell != focusFilter){
        spellMap.delete(spellID);
      }
    }
  }

  if(rarityFilter != 'ANY'){
    console.log('Filtering by Rarity...');
    for(const [spellID, spellStruct] of spellMap.entries()){
      if(spellStruct.Spell.rarity !== rarityFilter){
        spellMap.delete(spellID);
      }
    }
  }

  if(sourceFilter != 'ANY'){
    console.log('Filtering by Source...');
    for(const [spellID, spellStruct] of spellMap.entries()){
      if(spellStruct.Spell.contentSrc !== sourceFilter){
        spellMap.delete(spellID);
      }
    }
  }

  displaySpellResults(spellMap);
}

function displaySpellResults(spellMap){
  $('#browsingList').html('');

  if(spellMap.size <= 0){
    $('#browsingList').html('<p class="has-text-centered is-italic">No results found!</p>');
    $('#searchResultCountContainer').html('<p class="is-italic has-txt-noted">(0 results found)</p>');
    return;
  }

  spellMap = new Map([...spellMap.entries()].sort(
    function(a, b) {
        if (a[1].Spell.level === b[1].Spell.level) {
            // Name is only important when levels are the same
            return a[1].Spell.name > b[1].Spell.name ? 1 : -1;
        }
        return a[1].Spell.level - b[1].Spell.level;
    })
  );

  let foundCount = 0;
  for(const [spellID, spellStruct] of spellMap.entries()){
    if(spellStruct.Spell.isArchived == 1) {continue;}
    if(g_hiddenFromBrowseContentSources.includes(spellStruct.Spell.contentSrc)) {continue;}
    foundCount++;

    let entryID = 'spell-'+spellID;
    let name = spellStruct.Spell.name;
    let actions = spellStruct.Spell.cast;

    let rarity = spellStruct.Spell.rarity;
    let level = spellStruct.Spell.level;
    if(level < 0 || level >= 99) { level = ''; }
    if(level == 0) { level = 'Cantrip'; }

    let focus = (spellStruct.Spell.isFocusSpell == 1) ? '<sup class="is-size-7 has-txt-noted is-italic"> Focus Spell</sup>' : '';
    let raritySpacing = (level == 'Cantrip') ? 'mr-4' : '';

    $('#browsingList').append('<div id="'+entryID+'" class="columns is-mobile border-bottom border-dark-lighter cursor-clickable"><div class="column is-8"><span class="is-size-5">'+name+'</span>'+convertActionToHTML(actions)+''+focus+'</div><div class="column is-4" style="position: relative;"><div class="'+raritySpacing+'">'+convertRarityToHTML(rarity)+'</div><span class="is-size-7 has-txt-noted is-italic pr-2" style="position: absolute; top: 1px; right: 0px;">'+level+'</span></div></div>');

    $('#'+entryID).click(function(){
      openQuickView('spellView', {
        SpellDataStruct: spellStruct,
      });
      updateBrowseURL('id', spellID);
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