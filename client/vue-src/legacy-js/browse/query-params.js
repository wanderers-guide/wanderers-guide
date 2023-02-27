/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

let is_queryBrowseInit = false;

function queryBrowseContent(){

  let contentFilter = $('#tabContent').attr('data-content-filter');
  let contentSection = $('#tabContent').attr('data-content-section');
  let contentID = $('#tabContent').attr('data-content-id');

  if(contentSection != ''){

    openTab(contentSection);

    contentID = parseInt(contentID);
    if(!isNaN(contentID)){

      switch(contentSection){
        case 'ancestry':
          new DisplayAncestry('tabContent', contentID, g_featMap);
          break;
        case 'archetype':
          new DisplayArchetype('tabContent', contentID, g_featMap);
          break;
        case 'background':
          new DisplayBackground('tabContent', contentID);
          break;
        case 'class':
          new DisplayClass('tabContent', contentID, g_featMap);
          break;
        case 'feat':
          let featStruct = g_featMap.get(contentID+'');
          openQuickView('featView', {
            Feat : featStruct.Feat,
            Tags : featStruct.Tags
          }, true);
          break;
        case 'item':
          let itemStruct = g_itemMap.get(contentID+'');
          openQuickView('itemView', {
            ItemDataStruct : itemStruct
          }, true);
          break;
        case 'spell':
          let spellStruct = g_spellMap.get(contentID+'');
          openQuickView('spellView', {
            SpellDataStruct: spellStruct,
          }, true);
        break;
        case 'v-heritage':
          new DisplayUniHeritage('tabContent', contentID, g_featMap);
          break;
        default: break;
      }

    }

  }

  if(contentFilter != ''){

    let filterMap = getFilterMapFromURL();
    for(const [key, value] of filterMap.entries()){
      if(key == 'Traits'){
        let tagArray = JSON.parse(value);
        for(let tagID of tagArray){
          $("#filterTagsInput").find('option[value='+tagID+']').attr('selected','selected');
        }
        $("#filterTagsInput").trigger("chosen:updated");
      } else {
        $('#filter'+key+'Input').val(value);
      }
    }

    // Triggers all blur events, updating highlights
    $('.input').blur();
    $('.select select').blur();

    filterSearch();
  }

  is_queryBrowseInit = true;
}

function updateBrowseURL(paramKey, paramValue, override=false){
  if(!is_queryBrowseInit && !override) { return; }

  const urlParams = new URLSearchParams(location.search);
  if(paramValue == null){
    urlParams.delete(paramKey);
  } else {
    urlParams.set(paramKey, paramValue);
  }
  window.history.pushState('browse', '', 'browse?'+urlParams.toString());
}

function filterIllegalURLCharacters(str){
  return str.replace(/[\?\#\@\$\&\*\;\=\.\~]/g, '');
}

function getFilterMapFromURL(){
  let filterMap = new Map();
  try{
    const urlParams = new URLSearchParams(location.search);
    let paramFilter = decodeURIComponent(urlParams.get('filter'));
    if(!paramFilter.includes('~')) { return filterMap; }

    let filterParts = paramFilter.split('.');
    for(const filterPart of filterParts) {

      let filterPartEntry = filterPart.split('~');
      const filterPartKey = filterPartEntry[0];
      const filterPartValue = filterPartEntry[1];

      filterMap.set(filterPartKey, filterPartValue);

    }

    return filterMap;
  } catch (err) {
    return filterMap;
  }
}

function setFilterMapToURL(filterMap){

  let queryParam = '';
  for(const [key, value] of filterMap.entries()){

    let newVal = filterIllegalURLCharacters(value);
    queryParam += key+'~'+newVal+'.';

  }
  queryParam = queryParam.slice(0, -1); // Remove last '.'

  const urlParams = new URLSearchParams(location.search);
  if(queryParam == '') {
    urlParams.delete('filter');
  } else {
    urlParams.set('filter', encodeURIComponent(queryParam));
  }
  window.history.pushState('browse', '', 'browse?'+urlParams.toString());

}

function addToBrowseURL(paramKey, paramAddedValue, subKeyName){
  // Assumes paramKey='filter'
  if(!is_queryBrowseInit) { return; }
  let filterMap = getFilterMapFromURL();
  filterMap.set(subKeyName, paramAddedValue);
  setFilterMapToURL(filterMap);
}

function removeFromBrowseURL(paramKey, subKeyName){
  // Assumes paramKey='filter'
  if(!is_queryBrowseInit) { return; }
  let filterMap = getFilterMapFromURL();
  filterMap.delete(subKeyName);
  setFilterMapToURL(filterMap);
}
