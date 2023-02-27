/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

function filterClassSearch(){

  let nameFilter = $('#filterNameInput').val();
  let rarityFilter = $('#filterRarityInput').val();
  let sourceFilter = $('#filterSourceInput').val();


  let allClasses = new Set(g_allClasses);

  if(nameFilter != ''){
    console.log('Filtering by Name...');
    let parts = nameFilter.toUpperCase().split(' ');
    for(const cClass of allClasses){
      if(!textContainsWords(cClass.name, parts)){
        allClasses.delete(cClass);
      }
    }
  }

  if(rarityFilter != 'ANY'){
    console.log('Filtering by Rarity...');
    for(const cClass of allClasses){
      if(cClass.rarity !== rarityFilter){
        allClasses.delete(cClass);
      }
    }
  }

  if(sourceFilter != 'ANY'){
    console.log('Filtering by Source...');
    for(const cClass of allClasses){
      if(cClass.contentSrc !== sourceFilter){
        allClasses.delete(cClass);
      }
    }
  }

  displayClassResults(allClasses);
}

function displayClassResults(allClasses){
  $('#browsingList').html('');

  if(allClasses.size <= 0){
    $('#browsingList').html('<p class="has-text-centered is-italic">No results found!</p>');
    $('#searchResultCountContainer').html('<p class="is-italic has-txt-noted">(0 results found)</p>');
    return;
  }

  let foundCount = 0;
  for(const cClass of allClasses){
    if(cClass.isArchived == 1) {continue;}
    if(g_hiddenFromBrowseContentSources.includes(cClass.contentSrc)) {continue;}
    foundCount++;

    let entryID = 'class-'+cClass.id;
    let name = cClass.name;
    let rarity = cClass.rarity;

    $('#browsingList').append('<div id="'+entryID+'" class="columns is-mobile border-bottom border-dark-lighter cursor-clickable"><div class="column is-8"><span class="is-size-5">'+name+'</span></div><div class="column is-4" style="position: relative;">'+convertRarityToHTML(rarity)+'</div></div>');

    $('#'+entryID).click(function(){
      new DisplayClass('tabContent', cClass.id, g_featMap);
      updateBrowseURL('id', cClass.id);
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