/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

function filterItemSearch(){

  let nameFilter = $('#filterNameInput').val();
  let tagsFilter = $('#filterTagsInput').val();
  let usageFilter = $('#filterItemUsageInput').val();
  let descFilter = $('#filterDescInput').val();
  let levelRelationFilter = $('#filterLevelRelationInput').val();
  let levelFilter = $('#filterLevelInput').val();
  let priceRelationFilter = $('#filterItemPriceRelationInput').val();
  let priceFilter = $('#filterItemPriceInput').val();
  let bulkRelationFilter = $('#filterItemBulkRelationInput').val();
  let bulkFilter = $('#filterItemBulkInput').val();
  let rarityFilter = $('#filterRarityInput').val();
  let categoryFilter = $('#filterItemCategoryInput').val();
  let sourceFilter = $('#filterSourceInput').val();


  let itemMap = new Map(g_itemMap);

  if(nameFilter != ''){
    console.log('Filtering by Name...');
    let parts = nameFilter.toUpperCase().split(' ');
    for(const [itemID, itemStruct] of itemMap.entries()){
      if(!textContainsWords(itemStruct.Item.name, parts)){
        itemMap.delete(itemID);
      }
    }
  }

  if(tagsFilter.length > 0){
    console.log('Filtering by Traits...');
    for(const [itemID, itemStruct] of itemMap.entries()){
      let foundTags = itemStruct.TagArray.filter(tag => {
        return tagsFilter.includes(tag.id+"");
      });
      if(foundTags.length !== tagsFilter.length){
        itemMap.delete(itemID);
      }
    }
  }

  if(usageFilter != ''){
    console.log('Filtering by Usage...');
    let parts = usageFilter.toUpperCase().split(' ');
    for(const [itemID, itemStruct] of itemMap.entries()){
      if(!textContainsWords(itemStruct.Item.usage, parts)){
        itemMap.delete(itemID);
      }
    }
  }

  if(descFilter != ''){
    console.log('Filtering by Description...');
    let parts = descFilter.toUpperCase().split(' ');
    for(const [itemID, itemStruct] of itemMap.entries()){
      if(!textContainsWords(itemStruct.Item.description, parts)){
        itemMap.delete(itemID);
      }
    }
  }
  
  if(levelFilter != ''){
    console.log('Filtering by Level...');
    let level = parseInt(levelFilter);
    for(const [itemID, itemStruct] of itemMap.entries()){
      switch(levelRelationFilter) {
        case 'EQUAL': if(itemStruct.Item.level === level) {} else {itemMap.delete(itemID);} break;
        case 'LESS': if(itemStruct.Item.level < level) {} else {itemMap.delete(itemID);} break;
        case 'GREATER': if(itemStruct.Item.level > level) {} else {itemMap.delete(itemID);} break;
        case 'LESS-EQUAL': if(itemStruct.Item.level <= level) {} else {itemMap.delete(itemID);} break;
        case 'GREATER-EQUAL': if(itemStruct.Item.level >= level) {} else {itemMap.delete(itemID);} break;
        case 'NOT-EQUAL': if(itemStruct.Item.level !== level) {} else {itemMap.delete(itemID);} break;
        default: break;
      }
    }
  }

  if(priceFilter != ''){
    console.log('Filtering by Price...');
    let price = parseInt(priceFilter);
    for(const [itemID, itemStruct] of itemMap.entries()){
      switch(priceRelationFilter) {
        case 'EQUAL': if(itemStruct.Item.price === price) {} else {itemMap.delete(itemID);} break;
        case 'LESS': if(itemStruct.Item.price < price) {} else {itemMap.delete(itemID);} break;
        case 'GREATER': if(itemStruct.Item.price > price) {} else {itemMap.delete(itemID);} break;
        case 'LESS-EQUAL': if(itemStruct.Item.price <= price) {} else {itemMap.delete(itemID);} break;
        case 'GREATER-EQUAL': if(itemStruct.Item.price >= price) {} else {itemMap.delete(itemID);} break;
        case 'NOT-EQUAL': if(itemStruct.Item.price !== price) {} else {itemMap.delete(itemID);} break;
        default: break;
      }
    }
  }

  if(bulkFilter != ''){
    console.log('Filtering by Bulk...');
    let bulk = parseInt(bulkFilter);
    for(const [itemID, itemStruct] of itemMap.entries()){
      switch(bulkRelationFilter) {
        case 'EQUAL': if(itemStruct.Item.bulk === bulk) {} else {itemMap.delete(itemID);} break;
        case 'LESS': if(itemStruct.Item.bulk < bulk) {} else {itemMap.delete(itemID);} break;
        case 'GREATER': if(itemStruct.Item.bulk > bulk) {} else {itemMap.delete(itemID);} break;
        case 'LESS-EQUAL': if(itemStruct.Item.bulk <= bulk) {} else {itemMap.delete(itemID);} break;
        case 'GREATER-EQUAL': if(itemStruct.Item.bulk >= bulk) {} else {itemMap.delete(itemID);} break;
        case 'NOT-EQUAL': if(itemStruct.Item.bulk !== bulk) {} else {itemMap.delete(itemID);} break;
        default: break;
      }
    }
  }

  if(rarityFilter != 'ANY'){
    console.log('Filtering by Rarity...');
    for(const [itemID, itemStruct] of itemMap.entries()){
      if(itemStruct.Item.rarity !== rarityFilter){
        itemMap.delete(itemID);
      }
    }
  }

  if(categoryFilter != 'ANY'){
    console.log('Filtering by Category...');
    for(const [itemID, itemStruct] of itemMap.entries()){
      if(itemStruct.Item.itemType != categoryFilter){
        itemMap.delete(itemID);
      }
    }
  }

  if(sourceFilter != 'ANY'){
    console.log('Filtering by Source...');
    for(const [itemID, itemStruct] of itemMap.entries()){
      if(itemStruct.Item.contentSrc !== sourceFilter){
        itemMap.delete(itemID);
      }
    }
  }

  displayItemResults(itemMap);
}

function displayItemResults(itemMap){
  $('#browsingList').html('');

  if(itemMap.size <= 0){
    $('#browsingList').html('<p class="has-text-centered is-italic">No results found!</p>');
    $('#searchResultCountContainer').html('<p class="is-italic has-txt-noted">(0 results found)</p>');
    return;
  }

  itemMap = new Map([...itemMap.entries()].sort(
    function(a, b) {
        if (a[1].Item.level === b[1].Item.level) {
            // Name is only important when levels are the same
            return a[1].Item.name > b[1].Item.name ? 1 : -1;
        }
        return a[1].Item.level - b[1].Item.level;
    })
  );

  let foundCount = 0;
  for(const [itemID, itemStruct] of itemMap.entries()){
    if(itemStruct.Item.hidden == 1 || itemStruct.Item.isArchived == 1) {continue;}
    if(g_hiddenFromBrowseContentSources.includes(itemStruct.Item.contentSrc)) {continue;}
    foundCount++;

    let entryID = 'item-'+itemID;
    let name = itemStruct.Item.name;

    let rarity = itemStruct.Item.rarity;
    let level = itemStruct.Item.level;
    if(level <= 0 || level >= 99) { level = ''; }

    $('#browsingList').append('<div id="'+entryID+'" class="columns is-mobile border-bottom border-dark-lighter cursor-clickable"><div class="column is-8"><span class="is-size-5">'+name+'</span></div><div class="column is-4" style="position: relative;">'+convertRarityToHTML(rarity)+'<span class="is-size-7 has-txt-noted is-italic pr-2" style="position: absolute; top: 1px; right: 0px;">'+level+'</span></div></div>');

    $('#'+entryID).click(function(){
      openQuickView('itemView', {
        ItemDataStruct : itemStruct
      });
      updateBrowseURL('id', itemID);
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