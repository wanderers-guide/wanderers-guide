/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

function filterBackgroundSearch(){

  let nameFilter = $('#filterNameInput').val();
  let descFilter = $('#filterDescInput').val();
  let rarityFilter = $('#filterRarityInput').val();
  let sourceFilter = $('#filterSourceInput').val();


  let allBackgrounds = new Set(g_allBackgrounds);

  if(nameFilter != ''){
    console.log('Filtering by Name...');
    let parts = nameFilter.toUpperCase().split(' ');
    for(const background of allBackgrounds){
      if(!textContainsWords(background.name, parts)){
        allBackgrounds.delete(background);
      }
    }
  }

  if(descFilter != ''){
    console.log('Filtering by Description...');
    let parts = descFilter.toUpperCase().split(' ');
    for(const background of allBackgrounds){
      if(!textContainsWords(background.description, parts)){
        allBackgrounds.delete(background);
      }
    }
  }

  if(rarityFilter != 'ANY'){
    console.log('Filtering by Rarity...');
    for(const background of allBackgrounds){
      if(background.rarity !== rarityFilter){
        allBackgrounds.delete(background);
      }
    }
  }

  if(sourceFilter != 'ANY'){
    console.log('Filtering by Source...');
    for(const background of allBackgrounds){
      if(background.contentSrc !== sourceFilter){
        allBackgrounds.delete(background);
      }
    }
  }

  displayBackgroundResults(allBackgrounds);
}

function displayBackgroundResults(allBackgrounds){
  $('#browsingList').html('');

  if(allBackgrounds.size <= 0){
    $('#browsingList').html('<p class="has-text-centered is-italic">No results found!</p>');
    $('#searchResultCountContainer').html('<p class="is-italic has-txt-noted">(0 results found)</p>');
    return;
  }

  let foundCount = 0;
  for(const background of allBackgrounds){
    if(background.isArchived == 1) {continue;}
    if(g_hiddenFromBrowseContentSources.includes(background.contentSrc)) {continue;}
    foundCount++;

    let entryID = 'background-'+background.id;
    let name = background.name;
    let rarity = background.rarity;

    $('#browsingList').append('<div id="'+entryID+'" class="columns is-mobile border-bottom border-dark-lighter cursor-clickable"><div class="column is-8"><span class="is-size-5">'+name+'</span></div><div class="column is-4" style="position: relative;">'+convertRarityToHTML(rarity)+'</div></div>');

    $('#'+entryID).click(function(){
      new DisplayBackground('tabContent', background.id);
      updateBrowseURL('id', background.id);
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