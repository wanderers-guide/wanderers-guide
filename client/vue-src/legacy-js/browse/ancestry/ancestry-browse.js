/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

function filterAncestrySearch(){

  let nameFilter = $('#filterNameInput').val();
  let rarityFilter = $('#filterRarityInput').val();
  let sourceFilter = $('#filterSourceInput').val();


  let allAncestries = new Set(g_allAncestries);

  if(nameFilter != ''){
    console.log('Filtering by Name...');
    let parts = nameFilter.toUpperCase().split(' ');
    for(const ancestry of allAncestries){
      if(!textContainsWords(ancestry.name, parts)){
        allAncestries.delete(ancestry);
      }
    }
  }

  if(rarityFilter != 'ANY'){
    console.log('Filtering by Rarity...');
    for(const ancestry of allAncestries){
      if(ancestry.rarity !== rarityFilter){
        allAncestries.delete(ancestry);
      }
    }
  }

  if(sourceFilter != 'ANY'){
    console.log('Filtering by Source...');
    for(const ancestry of allAncestries){
      if(ancestry.contentSrc !== sourceFilter){
        allAncestries.delete(ancestry);
      }
    }
  }

  displayAncestryResults(allAncestries);
}

function displayAncestryResults(allAncestries){
  $('#browsingList').html('');

  if(allAncestries.size <= 0){
    $('#browsingList').html('<p class="has-text-centered is-italic">No results found!</p>');
    $('#searchResultCountContainer').html('<p class="is-italic has-txt-noted">(0 results found)</p>');
    return;
  }

  let foundCount = 0;
  for(const ancestry of allAncestries){
    if(ancestry.isArchived == 1) {continue;}
    if(g_hiddenFromBrowseContentSources.includes(ancestry.contentSrc)) {continue;}
    foundCount++;

    let entryID = 'ancestry-'+ancestry.id;
    let name = ancestry.name;
    let rarity = ancestry.rarity;

    $('#browsingList').append('<div id="'+entryID+'" class="columns is-mobile border-bottom border-dark-lighter cursor-clickable"><div class="column is-8"><span class="is-size-5">'+name+'</span></div><div class="column is-4" style="position: relative;">'+convertRarityToHTML(rarity)+'</div></div>');

    $('#'+entryID).click(function(){
      new DisplayAncestry('tabContent', ancestry.id, g_featMap);
      updateBrowseURL('id', ancestry.id);
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