/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

let socket = io();

// Core Quickview Data //
let g_isDeveloper = false;

let g_enabledSources = null;

let g_featMap = null;
let g_skillMap = null;
let g_itemMap = null;
let g_spellMap = null;
let g_allLanguages = null;
let g_allConditions = null;
let g_allTags = null;
let g_allClasses = null;
let g_allAncestries = null;
let g_allArchetypes = null;
let g_allBackgrounds = null;
let g_allUniHeritages = null;
// ~~~~~~~~~~~~~~~~~ //

let activeSearchTab = 'ancestry';

// ~~~~~~~~~~~~~~ // Run on Load // ~~~~~~~~~~~~~~ //
$(function () {

  $.get('/mloads/browse').done(function(searchStruct){
    
    g_isDeveloper = searchStruct.isDeveloper;
  
    let featMap = objToMap(searchStruct.featsObject);
    let skillMap = objToMap(searchStruct.skillObject);
    let itemMap = objToMap(searchStruct.itemObject);
    let spellMap = objToMap(searchStruct.spellObject);
  
    initBrowse(featMap, skillMap, itemMap, spellMap, searchStruct.allLanguages, searchStruct.allConditions, searchStruct.allTags, searchStruct.classes, searchStruct.ancestries, searchStruct.archetypes, searchStruct.backgrounds, searchStruct.uniHeritages, searchStruct.sourceBooks);

  });

  startDiceLoader();

});

function initBrowse(featMap, skillMap, itemMap, spellMap, allLanguages, allConditions, allTags, classes, ancestries, archetypes, backgrounds, uniHeritages, sourceBooks) {
  finishLoadingPage();
  
  g_featMap = featMap;
  g_skillMap = skillMap;
  g_itemMap = itemMap;
  g_spellMap = spellMap;
  g_allLanguages = allLanguages;
  g_allConditions = allConditions;
  g_allTags = allTags;
  g_allClasses = classes;
  g_allAncestries = ancestries;
  g_allArchetypes = archetypes;
  g_allBackgrounds = backgrounds;
  g_allUniHeritages = uniHeritages;

  g_enabledSources = sourceBooks;

  // Run All SourceBook Code, variable code only //
  g_expr_hasInit = true;// pretend to init expr processor
  let sourceBookCount = 0;
  for(let enabledSource of g_enabledSources){
    processVariables(enabledSource.code, 'SourceBook-'+sourceBookCount);
  }
  // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ //

  // Tags
  for(let tag of g_allTags){
    $('#filterTagsInput').append('<option value="'+tag.id+'">'+tag.name+'</option>');
  }
  $("#filterTagsInput").chosen({width: "100%"});
  $("#filterTagsInput").chosen();

  // Sources
  $('#filterSourceInput').append('<option value="ANY">Any</option>');
  for(let source of g_contentSources){
    if(source.Unreleased == null || !source.Unreleased) {
      $('#filterSourceInput').append('<option value="'+source.CodeName+'">'+source.TextName+'</option>');
    }
  }

  // Skill
  $('#filterFeatSkillInput').append('<option value="ANY">Any</option>');
  for(const [skillName, skillData] of g_skillMap.entries()){
    $('#filterFeatSkillInput').append('<option value="'+skillData.Skill.id+'">'+skillName+'</option>');
  }


  // Highlighting Applied Filters //
  $("#filterNameInput").blur(function(){
    if($('#filterNameInput').val() != ''){
      $('#filterNameInput').addClass('is-info');
      addToBrowseURL('filter', $('#filterNameInput').val(), 'Name');
    } else {
      $('#filterNameInput').removeClass('is-info');
      removeFromBrowseURL('filter', 'Name');
    }
  });
  $("#filterFeatPrereqInput").blur(function(){
    if($('#filterFeatPrereqInput').val() != ''){
      $('#filterFeatPrereqInput').addClass('is-info');
      addToBrowseURL('filter', $('#filterFeatPrereqInput').val(), 'FeatPrereq');
    } else {
      $('#filterFeatPrereqInput').removeClass('is-info');
      removeFromBrowseURL('filter', 'FeatPrereq');
    }
  });
  $("#filterItemUsageInput").blur(function(){
    if($('#filterItemUsageInput').val() != ''){
      $('#filterItemUsageInput').addClass('is-info');
      addToBrowseURL('filter', $('#filterItemUsageInput').val(), 'ItemUsage');
    } else {
      $('#filterItemUsageInput').removeClass('is-info');
      removeFromBrowseURL('filter', 'ItemUsage');
    }
  });
  $("#filterAreaInput").blur(function(){
    if($('#filterAreaInput').val() != ''){
      $('#filterAreaInput').addClass('is-info');
      addToBrowseURL('filter', $('#filterAreaInput').val(), 'Area');
    } else {
      $('#filterAreaInput').removeClass('is-info');
      removeFromBrowseURL('filter', 'Area');
    }
  });
  $("#filterRangeInput").blur(function(){
    if($('#filterRangeInput').val() != ''){
      $('#filterRangeInput').addClass('is-info');
      addToBrowseURL('filter', $('#filterRangeInput').val(), 'Range');
    } else {
      $('#filterRangeInput').removeClass('is-info');
      removeFromBrowseURL('filter', 'Range');
    }
  });
  $("#filterTargetsInput").blur(function(){
    if($('#filterTargetsInput').val() != ''){
      $('#filterTargetsInput').addClass('is-info');
      addToBrowseURL('filter', $('#filterTargetsInput').val(), 'Targets');
    } else {
      $('#filterTargetsInput').removeClass('is-info');
      removeFromBrowseURL('filter', 'Targets');
    }
  });
  $("#filterDescInput").blur(function(){
    if($('#filterDescInput').val() != ''){
      $('#filterDescInput').addClass('is-info');
      addToBrowseURL('filter', $('#filterDescInput').val(), 'Desc');
    } else {
      $('#filterDescInput').removeClass('is-info');
      removeFromBrowseURL('filter', 'Desc');
    }
  });
  $("#filterSpellTraditionInput").blur(function(){
    if($('#filterSpellTraditionInput').val() != 'ANY'){
      $('#filterSpellTraditionInput').parent().addClass('is-info');
      addToBrowseURL('filter', $('#filterSpellTraditionInput').val(), 'SpellTradition');
    } else {
      $('#filterSpellTraditionInput').parent().removeClass('is-info');
      removeFromBrowseURL('filter', 'SpellTradition');
    }
  });
  $("#filterActionsInput").blur(function(){
    if($('#filterActionsInput').val() != 'ANY'){
      $('#filterActionsInput').parent().addClass('is-info');
      addToBrowseURL('filter', $('#filterActionsInput').val(), 'Actions');
    } else {
      $('#filterActionsInput').parent().removeClass('is-info');
      removeFromBrowseURL('filter', 'Actions');
    }
  });
  $("#filterCastTimeInput").blur(function(){
    if($('#filterCastTimeInput').val() != 'ANY'){
      $('#filterCastTimeInput').parent().addClass('is-info');
      addToBrowseURL('filter', $('#filterCastTimeInput').val(), 'CastTime');
    } else {
      $('#filterCastTimeInput').parent().removeClass('is-info');
      removeFromBrowseURL('filter', 'CastTime');
    }
  });
  $("#filterComponentsInput").blur(function(){
    if($('#filterComponentsInput').val() != 'ANY'){
      $('#filterComponentsInput').parent().addClass('is-info');
      addToBrowseURL('filter', $('#filterComponentsInput').val(), 'Components');
    } else {
      $('#filterComponentsInput').parent().removeClass('is-info');
      removeFromBrowseURL('filter', 'Components');
    }
  });
  $("#filterSpellSavingThrowInput").blur(function(){
    if($('#filterSpellSavingThrowInput').val() != 'ANY'){
      $('#filterSpellSavingThrowInput').parent().addClass('is-info');
      addToBrowseURL('filter', $('#filterSpellSavingThrowInput').val(), 'SpellSavingThrow');
    } else {
      $('#filterSpellSavingThrowInput').parent().removeClass('is-info');
      removeFromBrowseURL('filter', 'SpellSavingThrow');
    }
  });
  $("#filterSpellHeightenInput").blur(function(){
    if($('#filterSpellHeightenInput').val() != 'ANY'){
      $('#filterSpellHeightenInput').parent().addClass('is-info');
      addToBrowseURL('filter', $('#filterSpellHeightenInput').val(), 'SpellHeighten');
    } else {
      $('#filterSpellHeightenInput').parent().removeClass('is-info');
      removeFromBrowseURL('filter', 'SpellHeighten');
    }
  });
  $("#filterSpellFocusInput").blur(function(){
    if($('#filterSpellFocusInput').val() != 'ANY'){
      $('#filterSpellFocusInput').parent().addClass('is-info');
      addToBrowseURL('filter', $('#filterSpellFocusInput').val(), 'SpellFocus');
    } else {
      $('#filterSpellFocusInput').parent().removeClass('is-info');
      removeFromBrowseURL('filter', 'SpellFocus');
    }
  });
  $("#filterLevelInput").blur(function(){
    if($('#filterLevelInput').val() != ''){
      $('#filterLevelInput').addClass('is-info');
      addToBrowseURL('filter', $('#filterLevelInput').val(), 'Level');
    } else {
      $('#filterLevelInput').removeClass('is-info');
      removeFromBrowseURL('filter', 'Level');
    }
  });
  $("#filterItemPriceInput").blur(function(){
    if($('#filterItemPriceInput').val() != ''){
      $('#filterItemPriceInput').addClass('is-info');
      addToBrowseURL('filter', $('#filterItemPriceInput').val(), 'ItemPrice');
    } else {
      $('#filterItemPriceInput').removeClass('is-info');
      removeFromBrowseURL('filter', 'ItemPrice');
    }
  });
  $("#filterItemBulkInput").blur(function(){
    if($('#filterItemBulkInput').val() != ''){
      $('#filterItemBulkInput').addClass('is-info');
      addToBrowseURL('filter', $('#filterItemBulkInput').val(), 'ItemBulk');
    } else {
      $('#filterItemBulkInput').removeClass('is-info');
      removeFromBrowseURL('filter', 'ItemBulk');
    }
  });
  $("#filterRarityInput").blur(function(){
    if($('#filterRarityInput').val() != 'ANY'){
      $('#filterRarityInput').parent().addClass('is-info');
      addToBrowseURL('filter', $('#filterRarityInput').val(), 'Rarity');
    } else {
      $('#filterRarityInput').parent().removeClass('is-info');
      removeFromBrowseURL('filter', 'Rarity');
    }
  });
  $("#filterFeatSkillInput").blur(function(){
    if($('#filterFeatSkillInput').val() != 'ANY'){
      $('#filterFeatSkillInput').parent().addClass('is-info');
      addToBrowseURL('filter', $('#filterFeatSkillInput').val(), 'FeatSkill');
    } else {
      $('#filterFeatSkillInput').parent().removeClass('is-info');
      removeFromBrowseURL('filter', 'FeatSkill');
    }
  });
  $("#filterItemCategoryInput").blur(function(){
    if($('#filterItemCategoryInput').val() != 'ANY'){
      $('#filterItemCategoryInput').parent().addClass('is-info');
      addToBrowseURL('filter', $('#filterItemCategoryInput').val(), 'ItemCategory');
    } else {
      $('#filterItemCategoryInput').parent().removeClass('is-info');
      removeFromBrowseURL('filter', 'ItemCategory');
    }
  });
  $("#filterSourceInput").blur(function(){
    if($('#filterSourceInput').val() != 'ANY'){
      $('#filterSourceInput').parent().addClass('is-info');
      addToBrowseURL('filter', $('#filterSourceInput').val(), 'Source');
    } else {
      $('#filterSourceInput').parent().removeClass('is-info');
      removeFromBrowseURL('filter', 'Source');
    }
  });

  //

  $("#filterLevelRelationInput").blur(function(){
    if($('#filterLevelRelationInput').val() != 'EQUAL'){
      addToBrowseURL('filter', $('#filterLevelRelationInput').val(), 'LevelRelation');
    } else {
      removeFromBrowseURL('filter', 'LevelRelation');
    }
  });
  $("#filterItemPriceRelationInput").blur(function(){
    if($('#filterItemPriceRelationInput').val() != 'EQUAL'){
      addToBrowseURL('filter', $('#filterItemPriceRelationInput').val(), 'ItemPriceRelation');
    } else {
      removeFromBrowseURL('filter', 'ItemPriceRelation');
    }
  });
  $("#filterItemBulkRelationInput").blur(function(){
    if($('#filterItemBulkRelationInput').val() != 'EQUAL'){
      addToBrowseURL('filter', $('#filterItemBulkRelationInput').val(), 'ItemBulkRelation');
    } else {
      removeFromBrowseURL('filter', 'ItemBulkRelation');
    }
  });

  //

  $("#filterTagsInput").chosen().change(function(){
    let traitsStr = JSON.stringify($('#filterTagsInput').val());
    if(traitsStr != '[]'){
      addToBrowseURL('filter', traitsStr, 'Traits');
    } else {
      removeFromBrowseURL('filter', 'Traits');
    }
  });

  // Changing Tabs //
  $('.searchTab').click(function(){
    let tabName = $(this).attr('data-tab-name');
    openTab(tabName);
  });
  openTab(activeSearchTab);

  // Search Filtering //
  $('#updateFilterButton').click(function(){
    filterSearch();
  });
  $(document).on('keypress',function(e) {
    if(e.which == 13) {
      filterSearch();
    }
  });

  // Check query parameters for search
  queryBrowseContent();

}

function openTab(tabName){
  activeSearchTab = tabName;
  let searchOnTabOpen = false;

  $('#ancestriesSearchTab').parent().removeClass("is-active");
  $('#archetypesSearchTab').parent().removeClass("is-active");
  $('#backgroundsSearchTab').parent().removeClass("is-active");
  $('#classesSearchTab').parent().removeClass("is-active");
  $('#featsSearchTab').parent().removeClass("is-active");
  $('#itemsSearchTab').parent().removeClass("is-active");
  $('#spellsSearchTab').parent().removeClass("is-active");
  $('#vHeritagesSearchTab').parent().removeClass("is-active");

  $('.filterFieldSection').each(function(){
    $(this).addClass('is-hidden');
  });

  // Reset Filter Sections //
  $('#filterNameInput').val('');
  $('#filterTagsInput').val('');
  $('#filterTagsInput').trigger("chosen:updated");
  $('#filterTagsInput').trigger('change');
  $('#filterFeatPrereqInput').val('');
  $('#filterItemUsageInput').val('');
  $('#filterAreaInput').val('');
  $('#filterRangeInput').val('');
  $('#filterTargetsInput').val('');
  $('#filterDescInput').val('');
  $('#filterSpellTraditionInput').val('ANY');
  $('#filterActionsInput').val('ANY');
  $('#filterCastTimeInput').val('ANY');
  $('#filterComponentsInput').val('ANY');
  $('#filterLevelRelationInput').val('EQUAL');
  $('#filterLevelInput').val('');
  $('#filterSpellSavingThrowInput').val('ANY');
  $('#filterSpellHeightenInput').val('ANY');
  $('#filterSpellFocusInput').val('ANY');
  $('#filterItemPriceRelationInput').val('EQUAL');
  $('#filterItemPriceInput').val('');
  $('#filterItemBulkRelationInput').val('EQUAL');
  $('#filterItemBulkInput').val('');
  $('#filterRarityInput').val('ANY');
  $('#filterFeatSkillInput').val('ANY');
  $('#filterItemCategoryInput').val('ANY');
  $('#filterSourceInput').val('ANY');

  switch(tabName){
    case 'ancestry':
      $('#filterNameSection').removeClass('is-hidden');
      $('#filterRaritySection').removeClass('is-hidden');
      $('#filterSourceSection').removeClass('is-hidden');

      $('#ancestriesSearchTab').parent().addClass("is-active");

      searchOnTabOpen = true;
      break;
    case 'archetype':
      $('#filterNameSection').removeClass('is-hidden');
      $('#filterLevelSection').removeClass('is-hidden');
      $('#filterRaritySection').removeClass('is-hidden');
      $('#filterSourceSection').removeClass('is-hidden');

      $('#archetypesSearchTab').parent().addClass("is-active");

      // Defaults //
      $('#filterLevelInput').attr('max', 20);
      $('#filterLevelInput').attr('min', 0);
      searchOnTabOpen = true;
      break;
    case 'background':
      $('#filterNameSection').removeClass('is-hidden');
      $('#filterDescSection').removeClass('is-hidden');
      $('#filterRaritySection').removeClass('is-hidden');
      $('#filterSourceSection').removeClass('is-hidden');

      $('#backgroundsSearchTab').parent().addClass("is-active");

      searchOnTabOpen = true;
      break;
    case 'class':
      $('#filterNameSection').removeClass('is-hidden');
      $('#filterRaritySection').removeClass('is-hidden');
      $('#filterSourceSection').removeClass('is-hidden');

      $('#classesSearchTab').parent().addClass("is-active");

      searchOnTabOpen = true;
      break;
    case 'feat':
      $('#filterNameSection').removeClass('is-hidden');
      $('#filterTagsSection').removeClass('is-hidden');
      $('#filterFeatPrereqSection').removeClass('is-hidden');
      $('#filterDescSection').removeClass('is-hidden');
      $('#filterActionsSection').removeClass('is-hidden');
      $('#filterLevelSection').removeClass('is-hidden');
      $('#filterRaritySection').removeClass('is-hidden');
      $('#filterFeatSkillSection').removeClass('is-hidden');
      $('#filterSourceSection').removeClass('is-hidden');

      $('#featsSearchTab').parent().addClass("is-active");

      // Defaults //
      $('#filterLevelRelationInput').val('GREATER-EQUAL');
      $('#filterLevelInput').val('1');
      $('#filterLevelInput').attr('max', 20);
      $('#filterLevelInput').attr('min', -1);
      break;
    case 'item':
      $('#filterNameSection').removeClass('is-hidden');
      $('#filterTagsSection').removeClass('is-hidden');
      $('#filterItemUsageSection').removeClass('is-hidden');
      $('#filterDescSection').removeClass('is-hidden');
      $('#filterLevelSection').removeClass('is-hidden');
      $('#filterItemPriceSection').removeClass('is-hidden');
      $('#filterItemBulkSection').removeClass('is-hidden');
      $('#filterRaritySection').removeClass('is-hidden');
      $('#filterItemCategorySection').removeClass('is-hidden');
      $('#filterSourceSection').removeClass('is-hidden');

      $('#itemsSearchTab').parent().addClass("is-active");

      // Defaults //
      $('#filterLevelInput').attr('max', 30);
      $('#filterLevelInput').attr('min', 0);
      break;
    case 'spell':
      $('#filterNameSection').removeClass('is-hidden');
      $('#filterTagsSection').removeClass('is-hidden');
      $('#filterDescSection').removeClass('is-hidden');
      $('#filterSpellTraditionSection').removeClass('is-hidden');
      $('#filterComponentsSection').removeClass('is-hidden');
      $('#filterCastTimeSection').removeClass('is-hidden');
      $('#filterAreaSection').removeClass('is-hidden');
      $('#filterRangeSection').removeClass('is-hidden');
      $('#filterTargetsSection').removeClass('is-hidden');
      $('#filterLevelSection').removeClass('is-hidden');
      $('#filterSpellSavingThrowSection').removeClass('is-hidden');
      $('#filterSpellHeightenSection').removeClass('is-hidden');
      $('#filterSpellFocusSection').removeClass('is-hidden');
      $('#filterRaritySection').removeClass('is-hidden');
      $('#filterSourceSection').removeClass('is-hidden');

      $('#spellsSearchTab').parent().addClass("is-active");

      // Defaults //
      $('#filterLevelInput').attr('max', 10);
      $('#filterLevelInput').attr('min', 0);
      break;
    case 'v-heritage':
      $('#filterNameSection').removeClass('is-hidden');
      $('#filterSourceSection').removeClass('is-hidden');

      $('#vHeritagesSearchTab').parent().addClass("is-active");

      searchOnTabOpen = true;
      break;
    default: break;
  }

  // Update content (tab) query parameters
  updateBrowseURL('content', tabName, true);
  updateBrowseURL('id', null);

  // Triggers all blur events, updating highlights
  $('.input').blur();
  $('.select select').blur();

  // Default Search Results
  if(searchOnTabOpen){
    filterSearch();
  } else {
    $('#searchResultCountContainer').html('');
    displayDefaultResults();
  }
}

function filterSearch(){

  updateBrowseURL('id', null);

  // Triggers all blur events, updating highlights
  $('.input').blur();
  $('.select select').blur();

  switch(activeSearchTab){
    case 'ancestry': filterAncestrySearch(); return;
    case 'archetype': filterArchetypeSearch(); return;
    case 'background': filterBackgroundSearch(); return;
    case 'class': filterClassSearch(); return;
    case 'feat': filterFeatSearch(); return;
    case 'item': filterItemSearch(); return;
    case 'spell': filterSpellSearch(); return;
    case 'v-heritage': filterUniHeritageSearch(); return;
    default: return;
  }
}

function displayDefaultResults(){
  $('#browsingList').html('<p class="has-text-centered is-italic">Apply some filters and click to search!</p>');
}

function finishLoadingPage() {
  // Turn off page loading
  stopDiceLoader();
}