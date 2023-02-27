/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

function openSpellTab(data) {

  $('#tabContent').append('<div id="spellsTabs" class="tabs is-centered is-marginless"><ul class="spell-tabs"><li><a id="spellsTabCore">Core</a></li><li><a id="spellsTabFocus">Focus</a></li><li><a id="spellsTabInnate">Innate</a></li></ul></div>');

  $('#tabContent').append('<div id="spellsTabContent"></div>');

  let sourceCount = 0;
  if(g_spellSlotsMap.size != 0){
      $('#spellsTabCore').click(function(){
          changeSpellsTab('spellsTabCore');
      });
      sourceCount++;
  } else {
      $('#spellsTabCore').addClass('is-hidden');
  }

  if(g_focusSpellMap.size != 0){
      $('#spellsTabFocus').click(function(){
          changeSpellsTab('spellsTabFocus');
      });
      sourceCount++;
  } else {
      $('#spellsTabFocus').addClass('is-hidden');
  }

  if(g_innateSpellArray.length != 0){
      $('#spellsTabInnate').click(function(){
          changeSpellsTab('spellsTabInnate');
      });
      sourceCount++;
  } else {
      $('#spellsTabInnate').addClass('is-hidden');
  }

  if(sourceCount === 1){
      $('#spellsTabs').addClass('is-hidden');
  }

  if(g_selectedSpellSubTabID == null){
      if(g_spellSlotsMap.size != 0){
          $('#spellsTabCore').click();
      } else if(g_focusSpellMap.size != 0){
          $('#spellsTabFocus').click();
      } else {
          $('#spellsTabInnate').click();
      }
  } else {
      $('#'+g_selectedSpellSubTabID).click();
  }

}

// Spells Tabs //
function changeSpellsTab(type){
  if(!g_selectedSubTabLock) {g_selectedSubTabID = type;}
  g_selectedSpellSubTabID = type;

  $('#spellsTabContent').html('');

  $('#spellsTabCore').parent().removeClass("is-active");
  $('#spellsTabFocus').parent().removeClass("is-active");
  $('#spellsTabInnate').parent().removeClass("is-active");

  $('#'+type).parent().addClass("is-active");

  switch(type) {
      case 'spellsTabCore': displaySpellsCore(); break;
      case 'spellsTabFocus': displaySpellsFocus(); break;
      case 'spellsTabInnate': displaySpellsInnate(); break;
      default: break;
  }

}


// Core Spells //

function displaySpellsCore() {

  $('#spellsTabContent').append(`
    <div class="columns is-mobile is-marginless">
      <div class="column pb-0">
        <p class="control has-icons-left">
          <input id="spellsSearch" class="input" type="text" autocomplete="off" placeholder="Search Spells">
          <span class="icon is-left"><i class="fas fa-search" aria-hidden="true"></i></span>
        </p>
      </div>
      <div class="column pb-0 is-narrow">
        <button id="manageSpellsBtn" class="button is-info is-rounded">Manage Spells</button>
      </div>
    </div>
    <div id="spellsCoreContent" class="use-custom-scrollbar" style="height: 510px; max-height: 510px; overflow-y: auto;">
    </div>
  `);

  displaySpellsAndSlots();

}


function displaySpellsAndSlots(){

  let data = {
    ArcaneSpellAttack : getStatTotal(VARIABLE.ARCANE_SPELL_ATTACK),
    OccultSpellAttack : getStatTotal(VARIABLE.OCCULT_SPELL_ATTACK),
    PrimalSpellAttack : getStatTotal(VARIABLE.PRIMAL_SPELL_ATTACK),
    DivineSpellAttack : getStatTotal(VARIABLE.DIVINE_SPELL_ATTACK),
    ArcaneSpellDC : getStatTotal(VARIABLE.ARCANE_SPELL_DC),
    OccultSpellDC : getStatTotal(VARIABLE.OCCULT_SPELL_DC),
    PrimalSpellDC : getStatTotal(VARIABLE.PRIMAL_SPELL_DC),
    DivineSpellDC : getStatTotal(VARIABLE.DIVINE_SPELL_DC),
    SpellSlotsMap : g_spellSlotsMap,
    SpellMap : g_spellMap,
  };

  $('#manageSpellsBtn').off('click');
  $('#manageSpellsBtn').click(function(){
      openManageSpellsModal(data);
  });

  ////

  let spellsSearch = $('#spellsSearch');
  let spellsSearchInput = null;
  if(spellsSearch.val() != ''){
      spellsSearchInput = spellsSearch.val().toLowerCase();
      spellsSearch.addClass('is-info');
  } else {
      spellsSearch.removeClass('is-info');
  }

  $('#spellsSearch').off('change');
  $('#spellsSearch').change(function(){
    displaySpellsAndSlots(data);
  });
  
  $('#spellsCoreContent').html('');

  let count = 0;
  for(let spellBook of g_spellBookArray){
    if(spellBook.IsFocus) { continue; }
    count++;

    let spellBookSectionID = 'spellBookSection-'+count;
    let spellBookSectionTitleID = 'spellBookSection-title-'+count;
    $('#spellsCoreContent').append(`
      <div id="${spellBookSectionID}" class="pb-2">
        <p id="${spellBookSectionTitleID}" class="is-size-3 is-family-secondary has-txt-listing">
          ${capitalizeWords(spellBook.SpellSRC)}
        </p>
      </div>
    `);

    const slotArray = data.SpellSlotsMap.get(spellBook.SpellSRC);
    if(slotArray == null) {continue;}
    for(let slot of slotArray){
      slot.SpellSRC = spellBook.SpellSRC;
    }

    let numDisplays = 0;
    if(spellBook.SpellCastingType == 'PREPARED-BOOK' || spellBook.SpellCastingType == 'PREPARED-FAMILIAR' || spellBook.SpellCastingType == 'PREPARED-LIST'){
      
      let foundKeytermInSearch = false;
      if(spellsSearchInput != null){
        if(spellsSearchInput === 'cantrip' || spellsSearchInput === 'cantrips') {
          let spellBookLevelSectionID = spellBookSectionID+'-lvl-0';
          $('#'+spellBookSectionID).append('<div id="'+spellBookLevelSectionID+'"></div>');
          numDisplays += displaySpellsInLevelPrepared(spellBook, 0, slotArray, spellBookLevelSectionID, data, null);
          foundKeytermInSearch = true;
        } else {
            const foundStruct = spellsSearchInput.match(/^(level|lvl) ([0-9]|10)\s*$/);
            if(foundStruct != null){
                let level = parseInt(foundStruct[2]);
                let spellBookLevelSectionID = spellBookSectionID+'-lvl-'+level;
                $('#'+spellBookSectionID).append('<div id="'+spellBookLevelSectionID+'"></div>');
                numDisplays += displaySpellsInLevelPrepared(spellBook, level, slotArray, spellBookLevelSectionID, data, null);
                foundKeytermInSearch = true;
            }
        }
      }
      if(!foundKeytermInSearch) {
        for (let i = 0; i <= 10; i++) {
          let spellBookLevelSectionID = spellBookSectionID+'-lvl-'+i;
          $('#'+spellBookSectionID).append('<div id="'+spellBookLevelSectionID+'"></div>');
          numDisplays += displaySpellsInLevelPrepared(spellBook, i, slotArray, spellBookLevelSectionID, data, spellsSearchInput);
        }
      }
      
    } else if (spellBook.SpellCastingType == 'SPONTANEOUS-REPERTOIRE' || spellBook.SpellCastingType == 'FLEXIBLE-COLLECTION') {

      let foundKeytermInSearch = false;
      if(spellsSearchInput != null){
        if(spellsSearchInput === 'cantrip' || spellsSearchInput === 'cantrips') {
          let spellBookLevelSectionID = spellBookSectionID+'-lvl-0';
          $('#'+spellBookSectionID).append('<div id="'+spellBookLevelSectionID+'"></div>');
          numDisplays += displaySpellsInLevelSpontaneous(spellBook, 0, slotArray, spellBookLevelSectionID, data, null);
          foundKeytermInSearch = true;
        } else {
            const foundStruct = spellsSearchInput.match(/^(level|lvl) ([0-9]|10)\s*$/);
            if(foundStruct != null){
                let level = parseInt(foundStruct[2]);
                let spellBookLevelSectionID = spellBookSectionID+'-lvl-'+level;
                $('#'+spellBookSectionID).append('<div id="'+spellBookLevelSectionID+'"></div>');
                numDisplays += displaySpellsInLevelSpontaneous(spellBook, level, slotArray, spellBookLevelSectionID, data, null);
                foundKeytermInSearch = true;
            }
        }
      }
      if(!foundKeytermInSearch) {
        for (let i = 0; i <= 10; i++) {
          let spellBookLevelSectionID = spellBookSectionID+'-lvl-'+i;
          $('#'+spellBookSectionID).append('<div id="'+spellBookLevelSectionID+'"></div>');
          numDisplays += displaySpellsInLevelSpontaneous(spellBook, i, slotArray, spellBookLevelSectionID, data, spellsSearchInput);
        }
      }

    }

    if(numDisplays === 0){ // Hide title (and entire section) if nothing was displayed
      $('#'+spellBookSectionTitleID).addClass('is-hidden');
    }

  }

  if(count === 1){ // Hide title if there's just one displayed spell SRC
    $('#spellBookSection-title-1').addClass('is-hidden');
  }

}


function displaySpellsInLevelPrepared(spellBook, level, slotArray, spellBookSectionID, data, spellsSearchInput) {

  let sectionName = (level == 0) ? 'Cantrips' : 'Level '+level;
  let spellBookTitleSectionID = spellBookSectionID+'-title';
  $('#'+spellBookSectionID).append('<div id="'+spellBookTitleSectionID+'"></div>');

  let didDisplaySpellAtLevel = false;
  for(let slot of slotArray){
      if(slot.slotLevel != level) { continue; }

      let spellSlotID = 'preparedSpellSlot'+slot.slotID;
      
      let spellDataStruct = data.SpellMap.get(slot.spellID+"");

      /// Filter Thru Search ///
      let willDisplay = true;
      if(spellsSearchInput != null){
          if(spellDataStruct != null) {
              let spellName = spellDataStruct.Spell.name.toLowerCase();
              if(!spellName.includes(spellsSearchInput)){
                  willDisplay = false;
              }
          } else {
              willDisplay = false;
          }
      }
      if(!willDisplay){continue;}
      didDisplaySpellAtLevel = true;


      /// Display Spell Listing ///
      if(spellDataStruct != null) {
          
          // SpellBookSpell Data
          let spellData = spellBook.SpellBook.find(spellData => {
            return spellData.SpellID == slot.spellID;
          });


          // Name //
          let spellName = spellDataStruct.Spell.name;

          if(spellData != null){
            // Get color from spellBookSpell
            let bulmaColor = getSpellTypeBulmaColor(spellData.SpellType);
            if(bulmaColor != '' && bulmaColor != 'has-text-info'){
              spellName += '<span class="pos-absolute pos-l-1 pos-t-2 icon is-medium '+bulmaColor+'"><i class="fas fa-xs fa-circle"></i></span>';
            } else {

              // Get color from spell slot
              bulmaColor = getSpellTypeBulmaColor(slot.type);
              if(bulmaColor != '' && bulmaColor != 'has-text-info'){
                spellName += '<span class="pos-absolute pos-l-1 pos-t-2 icon is-medium '+bulmaColor+'"><i class="fas fa-xs fa-circle"></i></span>';
              }

            }
          }


          let spellNameHTML = '<span class="has-text-left pl-3 has-txt-listing">'+spellName+'</span>';

          if(spellDataStruct.Spell.isArchived === 1){
            spellNameHTML += '<em class="pl-1">(archived)</em>';
          }
          
          // Cast Actions //
          let spellCast = null;
          switch(spellDataStruct.Spell.cast) {
              case 'FREE_ACTION': spellCast = '<span class="pf-icon">[free-action]</span>'; break;
              case 'REACTION': spellCast = '<span class="pf-icon">[reaction]</span>'; break;
              case 'ACTION': spellCast = '<span class="pf-icon">[one-action]</span>'; break;
              case 'TWO_ACTIONS': spellCast = '<span class="pf-icon">[two-actions]</span>'; break;
              case 'THREE_ACTIONS': spellCast = '<span class="pf-icon">[three-actions]</span>'; break;
              case 'ONE_TO_THREE_ACTIONS': spellCast = '<span class="pf-icon">[one-action]</span><span> to </span><span class="pf-icon">[three-actions]</span>'; break;
              case 'ONE_TO_TWO_ACTIONS': spellCast = '<span class="pf-icon">[one-action]</span><span> to </span><span class="pf-icon">[two-actions]</span>'; break;
              case 'TWO_TO_THREE_ACTIONS': spellCast = '<span class="pf-icon">[two-actions]</span><span> to </span><span class="pf-icon">[three-actions]</span>'; break;
              case 'TWO_TO_TWO_ROUNDS': spellCast = '<span class="pf-icon">[two-actions]</span><span> to 2 rounds</span>'; break;
              case 'TWO_TO_THREE_ROUNDS': spellCast = '<span class="pf-icon">[two-actions]</span><span> to 3 rounds</span>'; break;
              case 'THREE_TO_TWO_ROUNDS': spellCast = '<span class="pf-icon">[three-actions]</span><span> to 2 rounds</span>'; break;
              case 'THREE_TO_THREE_ROUNDS': spellCast = '<span class="pf-icon">[three-actions]</span><span> to 3 rounds</span>'; break;
              case 'TWO_ROUNDS': spellCast = '<span>2 rounds</span>'; break;
              case 'THREE_ROUNDS': spellCast = '<span>3 rounds</span>'; break;
              case 'ONE_MINUTE': spellCast = '<span>1 minute</span>'; break;
              case 'FIVE_MINUTES': spellCast = '<span>5 minutes</span>'; break;
              case 'TEN_MINUTES': spellCast = '<span>10 minutes</span>'; break;
              case 'THIRTY_MINUTES': spellCast = '<span>30 minutes</span>'; break;
              case 'ONE_HOUR': spellCast = '<span>1 hour</span>'; break;
              case 'EIGHT_HOURS': spellCast = '<span>8 hours</span>'; break;
              case 'ONE_DAY': spellCast = '<span>24 hours</span>'; break;
              default: spellCast = '<em>see spell</em>'; break;
          }

          // Save //
          let spellSave = null;
          switch(spellDataStruct.Spell.savingThrow) {
            case 'WILL': spellSave = 'Will'; break;
            case 'BASIC_WILL': spellSave = 'Will'; break;
            case 'FORT': spellSave = 'Fort.'; break;
            case 'BASIC_FORT': spellSave = 'Fort.'; break;
            case 'REFLEX': spellSave = 'Reflex'; break;
            case 'BASIC_REFLEX': spellSave = 'Reflex'; break;
            default: spellSave = '-'; break;
          }

          // Range //
          let spellRange = (spellDataStruct.Spell.range != null) ? spellDataStruct.Spell.range : '-';

          // Tags //
          let tagsInnerHTML = '<div class="buttons is-marginless is-centered">';
          for(const tag of spellDataStruct.Tags){
              tagsInnerHTML += '<button class="button is-marginless mr-2 my-1 is-very-small is-info">'+tag.name+getImportantTraitIcon(tag)+'</button>';
          }
          tagsInnerHTML += '</div>';

          $('#'+spellBookSectionID).append(`
            <div id="${spellSlotID}" class="columns is-mobile is-marginless cursor-clickable">
              <div class="column is-4-desktop is-paddingless border-bottom border-dark-lighter is-6-mobile">
                <p class="has-text-left pl-3 pt-1 pos-relative">${spellNameHTML}</p>
              </div>
              <div class="column is-1-desktop is-paddingless border-bottom border-dark-lighter is-3-mobile">
                <p class="text-center has-txt-listing is-size-6-5 pt-1">${spellCast}</p>
              </div>
              <div class="column is-1-desktop is-paddingless border-bottom border-dark-lighter is-3-mobile">
                <p class="text-center has-txt-listing is-size-6-5 pt-1">${spellSave}</p>
              </div>
              <div class="column is-1-desktop is-paddingless border-bottom border-dark-lighter is-hidden-mobile">
                <p class="text-center has-txt-listing is-size-6-5 pt-1">${spellRange}</p>
              </div>
              <div class="column is-5-desktop is-paddingless border-bottom border-dark-lighter is-hidden-mobile">
                <p class="text-center has-txt-listing">${tagsInnerHTML}</p>
              </div>
            </div>
          `);

          $('#'+spellSlotID).click(function(){
              openQuickView('spellView', {
                  SpellDataStruct: spellDataStruct,
                  SheetData: {
                    Slot: slot,
                    Data: data},
              });
          });

          if(slot.used) {
              $('#'+spellSlotID).addClass('has-empty-slot-background');
              $('#'+spellSlotID).find(".has-txt-listing").removeClass("has-txt-listing").addClass("has-txt-noted");
          }

      } else {

        // Get color from spell slot
        let slotColorHTML = '';
        let bulmaColor = getSpellTypeBulmaColor(slot.type);
        if(bulmaColor != '' && bulmaColor != 'has-text-info'){
          slotColorHTML = '<span style="left:-9px; top:0px;" class="pos-absolute icon is-medium '+bulmaColor+'"><i class="fas fa-xs fa-circle"></i></span>';
        }

        $('#'+spellBookSectionID).append(`
          <div id="${spellSlotID}" class="columns is-mobile is-marginless">
            <div class="column is-4 is-paddingless border-bottom border-dark-lighter">
              <p class="has-text-left pl-4 has-txt-listing pos-relative">-${slotColorHTML}</p>
            </div>
            <div class="column is-1 is-paddingless border-bottom border-dark-lighter">
              <p class="text-center has-txt-listing">-</p>
            </div>
            <div class="column is-1 is-paddingless border-bottom border-dark-lighter">
              <p class="text-center has-txt-listing">-</p>
            </div>
            <div class="column is-1 is-paddingless border-bottom border-dark-lighter">
              <p class="text-center has-txt-listing">-</p>
            </div>
            <div class="column is-5 is-paddingless border-bottom border-dark-lighter">
              <p class="text-center has-txt-listing">-</p>
            </div>
          </div>
        `);
      }

      $('#'+spellSlotID).mouseenter(function(){
          $(this).addClass('has-bg-selectable-hover');
      });
      $('#'+spellSlotID).mouseleave(function(){
          $(this).removeClass('has-bg-selectable-hover');
      });
      
  }

  if(didDisplaySpellAtLevel){
      $('#'+spellBookTitleSectionID).append('<p class="is-size-5 has-txt-partial-noted has-text-weight-bold text-left pl-5">'+sectionName+'</p>');
      $('#'+spellBookTitleSectionID).append(`
        <div class="columns is-mobile is-marginless">
          <div class="column is-4-desktop is-paddingless is-6-mobile">
            <p class="has-text-left pl-3"><strong class="has-txt-listing">Name</strong></p>
          </div>
          <div class="column is-1-desktop is-paddingless is-3-mobile">
            <p class="text-center"><strong class="has-txt-listing">Cast</strong></p>
          </div>
          <div class="column is-1-desktop is-paddingless is-3-mobile">
            <p class="text-center"><strong class="has-txt-listing">Save</strong></p>
          </div>
          <div class="column is-1-desktop is-paddingless is-hidden-mobile">
            <p class="text-center"><strong class="has-txt-listing">Range</strong></p>
          </div>
          <div class="column is-5-desktop is-paddingless is-hidden-mobile">
            <p class="text-center"><strong class="has-txt-listing">Traits</strong></p>
          </div>
        </div>
        <div class="is-divider hr-light is-marginless"></div>
      `);
  }

  return (didDisplaySpellAtLevel) ? 1 : 0;
}



function displaySpellsInLevelSpontaneous(spellBook, level, slotArray, spellBookSectionID, data, spellsSearchInput) {

  let filteredSlotArray = [];
  for(let slot of slotArray){
    if(slot.slotLevel == level) {
      filteredSlotArray.push(slot);
    }
  }
  filteredSlotArray = filteredSlotArray.sort(
    function(a, b) {
      return (a.used && !b.used) ? -1 : 1;
    }
  );

  // If a level has no spell slots, don't display anything for that level
  let hasSlotsAtLevel = (filteredSlotArray.length > 0);
  if(!hasSlotsAtLevel) {return 0;}

  let sectionName = (level == 0) ? 'Cantrips' : 'Level '+level;
  let spellBookTitleSectionID = spellBookSectionID+'-title';
  $('#'+spellBookSectionID).append('<div id="'+spellBookTitleSectionID+'"></div>');

  let spellListingSponClass = spellBookSectionID+'-spellSponListingClass'+level;
  let spellListingCount = 0;
  let didDisplaySpellAtLevel = false;
  for(let spellData of spellBook.SpellBook){
    if(spellData.SpellLevel != level){continue;}

    let spellSponListingID = spellBookSectionID+'-spellSponListing'+spellListingCount+'L'+level;

    let spellDataStruct = data.SpellMap.get(spellData.SpellID+"");

    /// Filter Thru Search ///
    let willDisplay = true;
    if(spellsSearchInput != null){
        if(spellDataStruct != null) {
            let spellName = spellDataStruct.Spell.name.toLowerCase();
            if(!spellName.includes(spellsSearchInput)){
                willDisplay = false;
            }
        } else {
            willDisplay = false;
        }
    }
    if(!willDisplay){continue;}
    didDisplaySpellAtLevel = true;

    /// Display Spell Listing ///
    if(spellDataStruct != null) {
        
        // Name //
        let spellName = spellDataStruct.Spell.name;

        let bulmaColor = getSpellTypeBulmaColor(spellData.SpellType);
        if(bulmaColor != '' && bulmaColor != 'has-text-info'){
          spellName += '<span class="pos-absolute pos-l-1 pos-t-2 icon is-medium '+bulmaColor+'"><i class="fas fa-xs fa-circle"></i></span>';
        }


        let spellNameHTML = '<span class="has-text-left pl-3 has-txt-listing">'+spellName+'</span>';

        if(spellDataStruct.Spell.isArchived === 1){
          spellNameHTML += '<em class="pl-1">(archived)</em>';
        }
        
        // Cast Actions //
        let spellCast = null;
        switch(spellDataStruct.Spell.cast) {
            case 'FREE_ACTION': spellCast = '<span class="pf-icon">[free-action]</span>'; break;
            case 'REACTION': spellCast = '<span class="pf-icon">[reaction]</span>'; break;
            case 'ACTION': spellCast = '<span class="pf-icon">[one-action]</span>'; break;
            case 'TWO_ACTIONS': spellCast = '<span class="pf-icon">[two-actions]</span>'; break;
            case 'THREE_ACTIONS': spellCast = '<span class="pf-icon">[three-actions]</span>'; break;
            case 'ONE_TO_THREE_ACTIONS': spellCast = '<span class="pf-icon">[one-action]</span><span> to </span><span class="pf-icon">[three-actions]</span>'; break;
            case 'ONE_TO_TWO_ACTIONS': spellCast = '<span class="pf-icon">[one-action]</span><span> to </span><span class="pf-icon">[two-actions]</span>'; break;
            case 'TWO_TO_THREE_ACTIONS': spellCast = '<span class="pf-icon">[two-actions]</span><span> to </span><span class="pf-icon">[three-actions]</span>'; break;
            case 'TWO_TO_TWO_ROUNDS': spellCast = '<span class="pf-icon">[two-actions]</span><span> to 2 rounds</span>'; break;
            case 'TWO_TO_THREE_ROUNDS': spellCast = '<span class="pf-icon">[two-actions]</span><span> to 3 rounds</span>'; break;
            case 'THREE_TO_TWO_ROUNDS': spellCast = '<span class="pf-icon">[three-actions]</span><span> to 2 rounds</span>'; break;
            case 'THREE_TO_THREE_ROUNDS': spellCast = '<span class="pf-icon">[three-actions]</span><span> to 3 rounds</span>'; break;
            case 'TWO_ROUNDS': spellCast = '<span>2 rounds</span>'; break;
            case 'THREE_ROUNDS': spellCast = '<span>3 rounds</span>'; break;
            case 'ONE_MINUTE': spellCast = '<span>1 minute</span>'; break;
            case 'FIVE_MINUTES': spellCast = '<span>5 minutes</span>'; break;
            case 'TEN_MINUTES': spellCast = '<span>10 minutes</span>'; break;
            case 'THIRTY_MINUTES': spellCast = '<span>30 minutes</span>'; break;
            case 'ONE_HOUR': spellCast = '<span>1 hour</span>'; break;
            case 'EIGHT_HOURS': spellCast = '<span>8 hours</span>'; break;
            case 'ONE_DAY': spellCast = '<span>24 hours</span>'; break;
            default: spellCast = '<em>see spell</em>'; break;
        }

        // Save //
        let spellSave = null;
        switch(spellDataStruct.Spell.savingThrow) {
          case 'WILL': spellSave = 'Will'; break;
          case 'BASIC_WILL': spellSave = 'Will'; break;
          case 'FORT': spellSave = 'Fort.'; break;
          case 'BASIC_FORT': spellSave = 'Fort.'; break;
          case 'REFLEX': spellSave = 'Reflex'; break;
          case 'BASIC_REFLEX': spellSave = 'Reflex'; break;
          default: spellSave = '-'; break;
        }

        // Range //
        let spellRange = (spellDataStruct.Spell.range != null) ? spellDataStruct.Spell.range : '-';

        // Tags //
        let tagsInnerHTML = '<div class="buttons is-marginless is-centered">';
        for(const tag of spellDataStruct.Tags){
            tagsInnerHTML += '<button class="button is-marginless mr-2 my-1 is-very-small is-info">'+tag.name+getImportantTraitIcon(tag)+'</button>';
        }
        tagsInnerHTML += '</div>';

        $('#'+spellBookSectionID).append(`
          <div id="${spellSponListingID}" class="${spellListingSponClass} columns is-mobile is-marginless cursor-clickable">
            <div class="column is-4-desktop is-paddingless border-bottom border-dark-lighter is-6-mobile">
              <p class="has-text-left pl-3 pt-1 pos-relative">${spellNameHTML}</p>
            </div>
            <div class="column is-1-desktop is-paddingless border-bottom border-dark-lighter is-3-mobile">
              <p class="text-center has-txt-listing is-size-6-5 pt-1">${spellCast}</p>
            </div>
            <div class="column is-1-desktop is-paddingless border-bottom border-dark-lighter is-3-mobile">
              <p class="text-center has-txt-listing is-size-6-5 pt-1">${spellSave}</p>
            </div>
            <div class="column is-1-desktop is-paddingless border-bottom border-dark-lighter is-hidden-mobile">
              <p class="text-center has-txt-listing is-size-6-5 pt-1">${spellRange}</p>
            </div>
            <div class="column is-5-desktop is-paddingless border-bottom border-dark-lighter is-hidden-mobile">
              <p class="text-center has-txt-listing">${tagsInnerHTML}</p>
            </div>
          </div>
        `);

        let unusedSlot = filteredSlotArray.find(slot => {
            return slot.used === false;
        });
        if(unusedSlot == null && filteredSlotArray.length > 0){
            unusedSlot = filteredSlotArray[0];
        }
        if(unusedSlot != null){
            $('#'+spellSponListingID).click(function(){
                openQuickView('spellView', {
                    SpellDataStruct: spellDataStruct,
                    SheetData: {
                      Slot: unusedSlot,
                      Data: data},
                });
            });
        }

    } else {
        $('#'+spellBookSectionID).append(`
          <div id="${spellSponListingID}" class="${spellListingSponClass} columns is-mobile is-marginless">
            <div class="column is-4 is-paddingless border-bottom border-dark-lighter">
              <p class="has-text-left pl-4 has-txt-listing">-</p>
            </div>
            <div class="column is-1 is-paddingless border-bottom border-dark-lighter">
              <p class="text-center has-txt-listing">-</p>
            </div>
            <div class="column is-1 is-paddingless border-bottom border-dark-lighter">
              <p class="text-center has-txt-listing">-</p>
            </div>
            <div class="column is-1 is-paddingless border-bottom border-dark-lighter">
              <p class="text-center has-txt-listing">-</p>
            </div>
            <div class="column is-5 is-paddingless border-bottom border-dark-lighter">
              <p class="text-center has-txt-listing">-</p>
            </div>
          </div>
        `);
    }

    $('#'+spellSponListingID).mouseenter(function(){
        $(this).addClass('has-bg-selectable-hover');
    });
    $('#'+spellSponListingID).mouseleave(function(){
        $(this).removeClass('has-bg-selectable-hover');
    });

    spellListingCount++;

  }



  // Display Empty Slot Entry, If No Spells at Level (but not if using a search) //
  if(!didDisplaySpellAtLevel && spellsSearchInput == null){
    let spellSponListingID = spellBookSectionID+'-spellSponListingNoSpellsL'+level;
    $('#'+spellBookSectionID).append(`
      <div id="'+spellSponListingID+'" class="'+spellListingSponClass+' spellSponListing columns is-mobile is-marginless">
        <div class="column is-4 is-paddingless border-bottom border-dark-lighter">
          <p class="has-text-left pl-4 has-txt-listing">-</p>
        </div>
        <div class="column is-1 is-paddingless border-bottom border-dark-lighter">
          <p class="text-center has-txt-listing">-</p>
        </div>
        <div class="column is-1 is-paddingless border-bottom border-dark-lighter">
          <p class="text-center has-txt-listing">-</p>
        </div>
        <div class="column is-1 is-paddingless border-bottom border-dark-lighter">
          <p class="text-center has-txt-listing">-</p>
        </div>
        <div class="column is-5 is-paddingless border-bottom border-dark-lighter">
          <p class="text-center has-txt-listing">-</p>
        </div>
      </div>
    `);
    $('#'+spellSponListingID).mouseenter(function(){
        $(this).addClass('has-bg-selectable-hover');
    });
    $('#'+spellSponListingID).mouseleave(function(){
        $(this).removeClass('has-bg-selectable-hover');
    });
  }

  // Display Title and Casting Set //
  if(didDisplaySpellAtLevel || (!didDisplaySpellAtLevel && spellsSearchInput == null)){
    let spellSponCastingSetID = spellBookSectionID+'-spellSponCastingSet'+level;
    $('#'+spellBookTitleSectionID).append('<p class="text-left pl-5"><span class="has-txt-partial-noted has-text-weight-bold is-size-5 pr-2">'+sectionName+'</span><span id="'+spellSponCastingSetID+'" class="is-unselectable cursor-clickable"></span></p>');
    $('#'+spellBookTitleSectionID).append(`
      <div class="columns is-mobile is-marginless">
        <div class="column is-4-desktop is-paddingless is-6-mobile">
          <p class="has-text-left pl-3"><strong class="has-txt-listing">Name</strong></p>
        </div>
        <div class="column is-1-desktop is-paddingless is-3-mobile">
          <p class="text-center"><strong class="has-txt-listing">Cast</strong></p>
        </div>
        <div class="column is-1-desktop is-paddingless is-3-mobile">
          <p class="text-center"><strong class="has-txt-listing">Save</strong></p>
        </div>
        <div class="column is-1-desktop is-paddingless is-hidden-mobile">
          <p class="text-center"><strong class="has-txt-listing">Range</strong></p>
        </div>
        <div class="column is-5-desktop is-paddingless is-hidden-mobile">
          <p class="text-center"><strong class="has-txt-listing">Traits</strong></p>
        </div>
      </div>
      <div class="is-divider hr-light is-marginless"></div>
    `);
    if(level != 0){    
        displaySpontaneousCastingsSet(spellSponCastingSetID, filteredSlotArray, spellListingSponClass);
    }
  }
  
  return (didDisplaySpellAtLevel) ? 1 : 0;
}

function displaySpontaneousCastingsSet(locationID, slotsArray, spellListingSponClass){

  let castingButtonsClass = 'castingSpontaneousBtns-'+locationID;
  let slotsUsedCount = 0;
  let spellCastingsHTML = '';
  for(let slot of slotsArray){
      if(slot.used){
          slotsUsedCount++;
          spellCastingsHTML += '<span name="'+slot.slotID+'" class="pl-1 has-text-info '+castingButtonsClass+'"><i class="fas fa-lg fa-square"></i></span>';
      } else {
          spellCastingsHTML += '<span name="'+slot.slotID+'" class="pl-1 has-text-info '+castingButtonsClass+'"><i class="far fa-lg fa-square"></i></span>';
      }
  }
  $('#'+locationID).html(spellCastingsHTML);

  if(slotsUsedCount === slotsArray.length) {
      $('.'+spellListingSponClass).addClass('has-empty-slot-background');
      $('.'+spellListingSponClass).find(".has-txt-listing").removeClass("has-txt-listing").addClass("has-txt-noted");
  } else {
      $('.'+spellListingSponClass).removeClass('has-empty-slot-background');
      $('.'+spellListingSponClass).find(".has-txt-noted").removeClass("has-txt-noted").addClass("has-txt-listing");
  }

  $('.'+castingButtonsClass).off('click');
  $('.'+castingButtonsClass).click(function(){
      event.stopImmediatePropagation();
      let slotID = $(this).attr('name');
      let slot = slotsArray.find(slot => {
          return slot.slotID == slotID;
      });

      slot.used = !slot.used;
      socket.emit("requestSpellSlotUpdate",
          getCharIDFromURL(),
          slot);
      let spellSlotsArray = g_spellSlotsMap.get(slot.SpellSRC);
      if(spellSlotsArray != null){
          spellSlotsArray = updateSlotUsed(spellSlotsArray, slot.slotID, slot.used);
      }
      g_spellSlotsMap.set(slot.SpellSRC, spellSlotsArray);
      closeQuickView();
      displaySpellsAndSlots();
  });

}





// Focus Spells //
let g_focusOpenPoint = false;

function displaySpellsFocus() {

    let data = {
      ArcaneSpellAttack : getStatTotal(VARIABLE.ARCANE_SPELL_ATTACK),
      OccultSpellAttack : getStatTotal(VARIABLE.OCCULT_SPELL_ATTACK),
      PrimalSpellAttack : getStatTotal(VARIABLE.PRIMAL_SPELL_ATTACK),
      DivineSpellAttack : getStatTotal(VARIABLE.DIVINE_SPELL_ATTACK),
      ArcaneSpellDC : getStatTotal(VARIABLE.ARCANE_SPELL_DC),
      OccultSpellDC : getStatTotal(VARIABLE.OCCULT_SPELL_DC),
      PrimalSpellDC : getStatTotal(VARIABLE.PRIMAL_SPELL_DC),
      DivineSpellDC : getStatTotal(VARIABLE.DIVINE_SPELL_DC),
    };

    $('#spellsTabContent').append('<div id="spellsFocusContent" class="use-custom-scrollbar" style="height: 580px; max-height: 580px; overflow-y: auto;"></div>');

    let isFirstLevel = true;
    let sourceCount = 0;
    let focusSpellCount = 0;
    for(const [spellSRC, focusSpellDataArray] of g_focusSpellMap.entries()){
        let prevLevel = -100;
        $('#spellsFocusContent').append('<p class="focusSpellSourceTitle is-hidden is-size-4 mt-3 is-family-secondary has-txt-listing">'+capitalizeWord(spellSRC)+'</p>');

        let sortedFocusSpellDataArray = focusSpellDataArray.sort(
            function(a, b) {
                let aSpellData = g_spellMap.get(a.SpellID+"");
                let bSpellData = g_spellMap.get(b.SpellID+"");
                if(aSpellData == null || bSpellData == null){
                    return -1;
                } else {
                    if (aSpellData.Spell.level === bSpellData.Spell.level) {
                        // Name is only important when levels are the same
                        return aSpellData.Spell.name > bSpellData.Spell.name ? 1 : -1;
                    }
                    return aSpellData.Spell.level - bSpellData.Spell.level;
                }
            }
        );

        for(let focusSpellData of sortedFocusSpellDataArray){
            focusSpellData.SpellSRC = spellSRC;
            let spellDataStruct = g_spellMap.get(focusSpellData.SpellID+"");
            if(spellDataStruct == null) { continue; }
            
            if(spellDataStruct.Spell.level > prevLevel){
                let sectionName = (spellDataStruct.Spell.level == 0) ? 'Cantrips' : 'Level '+spellDataStruct.Spell.level;
                if(isFirstLevel){
                    $('#spellsFocusContent').append('<p class="text-left pl-5 pr-3"><span class="has-txt-partial-noted has-text-weight-bold is-size-5">'+sectionName+'</span><span id="focusPointsCastingSet" class="is-unselectable cursor-clickable"></span></p>');
                    isFirstLevel = false;
                } else {
                    $('#spellsFocusContent').append('<p class="is-size-5 has-txt-partial-noted has-text-weight-bold text-left pl-5 pt-2">'+sectionName+'</p>');
                }
                $('#spellsFocusContent').append(`
                  <div class="columns is-mobile is-marginless">
                    <div class="column is-4-desktop is-paddingless is-6-mobile">
                      <p class="has-text-left pl-3"><strong class="has-txt-listing">Name</strong></p>
                    </div>
                    <div class="column is-1-desktop is-paddingless is-3-mobile">
                      <p class="text-center"><strong class="has-txt-listing">Cast</strong></p>
                    </div>
                    <div class="column is-1-desktop is-paddingless is-3-mobile">
                      <p class="text-center"><strong class="has-txt-listing">Save</strong></p>
                    </div>
                    <div class="column is-1-desktop is-paddingless is-hidden-mobile">
                      <p class="text-center"><strong class="has-txt-listing">Range</strong></p>
                    </div>
                    <div class="column is-5-desktop is-paddingless is-hidden-mobile">
                      <p class="text-center"><strong class="has-txt-listing">Traits</strong></p>
                    </div>
                  </div>
                  <div class="is-divider hr-light is-marginless"></div>
                `);
            }

            let spellListingID = 'focusSpellListing'+focusSpellCount;
            
            // Name //
            let spellName = '<span class="has-text-left pl-3 has-txt-listing">'+spellDataStruct.Spell.name+'</span>';

            if(spellDataStruct.Spell.isArchived === 1){
                spellName += '<em class="pl-1">(archived)</em>';
            }
            
            // Cast Actions //
            let spellCast = null;
            switch(spellDataStruct.Spell.cast) {
                case 'FREE_ACTION': spellCast = '<span class="pf-icon">[free-action]</span>'; break;
                case 'REACTION': spellCast = '<span class="pf-icon">[reaction]</span>'; break;
                case 'ACTION': spellCast = '<span class="pf-icon">[one-action]</span>'; break;
                case 'TWO_ACTIONS': spellCast = '<span class="pf-icon">[two-actions]</span>'; break;
                case 'THREE_ACTIONS': spellCast = '<span class="pf-icon">[three-actions]</span>'; break;
                case 'ONE_TO_THREE_ACTIONS': spellCast = '<span class="pf-icon">[one-action]</span><span> to </span><span class="pf-icon">[three-actions]</span>'; break;
                case 'ONE_TO_TWO_ACTIONS': spellCast = '<span class="pf-icon">[one-action]</span><span> to </span><span class="pf-icon">[two-actions]</span>'; break;
                case 'TWO_TO_THREE_ACTIONS': spellCast = '<span class="pf-icon">[two-actions]</span><span> to </span><span class="pf-icon">[three-actions]</span>'; break;
                case 'TWO_TO_TWO_ROUNDS': spellCast = '<span class="pf-icon">[two-actions]</span><span> to 2 rounds</span>'; break;
                case 'TWO_TO_THREE_ROUNDS': spellCast = '<span class="pf-icon">[two-actions]</span><span> to 3 rounds</span>'; break;
                case 'THREE_TO_TWO_ROUNDS': spellCast = '<span class="pf-icon">[three-actions]</span><span> to 2 rounds</span>'; break;
                case 'THREE_TO_THREE_ROUNDS': spellCast = '<span class="pf-icon">[three-actions]</span><span> to 3 rounds</span>'; break;
                case 'TWO_ROUNDS': spellCast = '<span>2 rounds</span>'; break;
                case 'THREE_ROUNDS': spellCast = '<span>3 rounds</span>'; break;
                case 'ONE_MINUTE': spellCast = '<span>1 minute</span>'; break;
                case 'FIVE_MINUTES': spellCast = '<span>5 minutes</span>'; break;
                case 'TEN_MINUTES': spellCast = '<span>10 minutes</span>'; break;
                case 'THIRTY_MINUTES': spellCast = '<span>30 minutes</span>'; break;
                case 'ONE_HOUR': spellCast = '<span>1 hour</span>'; break;
                case 'EIGHT_HOURS': spellCast = '<span>8 hours</span>'; break;
                case 'ONE_DAY': spellCast = '<span>24 hours</span>'; break;
                default: spellCast = '<em>see spell</em>'; break;
            }

            // Save //
            let spellSave = null;
            switch(spellDataStruct.Spell.savingThrow) {
              case 'WILL': spellSave = 'Will'; break;
              case 'BASIC_WILL': spellSave = 'Will'; break;
              case 'FORT': spellSave = 'Fort.'; break;
              case 'BASIC_FORT': spellSave = 'Fort.'; break;
              case 'REFLEX': spellSave = 'Reflex'; break;
              case 'BASIC_REFLEX': spellSave = 'Reflex'; break;
              default: spellSave = '-'; break;
            }

            // Range //
            let spellRange = (spellDataStruct.Spell.range != null) ? spellDataStruct.Spell.range : '-';

            // Tags //
            let tagsInnerHTML = '<div class="buttons is-marginless is-centered">';
            for(const tag of spellDataStruct.Tags){
                tagsInnerHTML += '<button class="button is-marginless mr-2 my-1 is-very-small is-info">'+tag.name+getImportantTraitIcon(tag)+'</button>';
            }
            tagsInnerHTML += '</div>';

            let focusListingClass = (spellDataStruct.Spell.level != 0) ? 'focusSpellListingClass' : 'focusCantripListingClass';
            $('#spellsFocusContent').append(`
              <div id="${spellListingID}" class="${focusListingClass} columns is-mobile is-marginless cursor-clickable">
                <div class="column is-4-desktop is-paddingless border-bottom border-dark-lighter is-6-mobile">
                  <p class="has-text-left pl-3 pt-1">${spellName}</p>
                </div>
                <div class="column is-1-desktop is-paddingless border-bottom border-dark-lighter is-3-mobile">
                  <p class="text-center has-txt-listing is-size-6-5 pt-1">${spellCast}</p>
                </div>
                <div class="column is-1-desktop is-paddingless border-bottom border-dark-lighter is-3-mobile">
                  <p class="text-center has-txt-listing is-size-6-5 pt-1">${spellSave}</p>
                </div>
                <div class="column is-1-desktop is-paddingless border-bottom border-dark-lighter is-hidden-mobile">
                  <p class="text-center has-txt-listing is-size-6-5 pt-1">${spellRange}</p>
                </div>
                <div class="column is-5-desktop is-paddingless border-bottom border-dark-lighter is-hidden-mobile">
                  <p class="text-center has-txt-listing">${tagsInnerHTML}</p>
                </div>
              </div>
            `);

            
            $('#'+spellListingID).click(function(){
                openQuickView('spellView', {
                    SpellDataStruct: spellDataStruct,
                    SheetData: {FocusSpell: focusSpellData, Data: data},
                });
            });

            $('#'+spellListingID).mouseenter(function(){
                $(this).addClass('has-bg-selectable-hover');
            });
            $('#'+spellListingID).mouseleave(function(){
                $(this).removeClass('has-bg-selectable-hover');
            });

            prevLevel = spellDataStruct.Spell.level;
            focusSpellCount++;
        }
        sourceCount++;
    }

    if(sourceCount > 1){
        $('.focusSpellSourceTitle').removeClass('is-hidden');
    }

    displayFocusCastingsSet('NONE');

}

function displayFocusCastingsSet(changeType){

    let performedChange = false;
    for(let focusPointData of g_focusPointArray){
        if(changeType !== 'NONE' && !performedChange){
            if(changeType === 'ADD' && focusPointData.value == 1){
                focusPointData.value = 0;
                socket.emit("requestFocusPointUpdate",
                    getCharIDFromURL(),
                    focusPointData,
                    focusPointData.value);
                performedChange = true;
            } else if(changeType === 'REMOVE' && focusPointData.value == 0){
                focusPointData.value = 1;
                socket.emit("requestFocusPointUpdate",
                    getCharIDFromURL(),
                    focusPointData,
                    focusPointData.value);
                performedChange = true;
            }
        }
    }
    
    g_focusPointArray = g_focusPointArray.sort(
        function(a, b) {
            return (a.value == 0 && b.value == 1) ? 1 : -1;
        }
    );

    let pointsButtonsClass = 'castingFocusPointsBtns';
    
    g_focusOpenPoint = false;
    let spellCastingsHTML = '';
    for (let i = 0; i < g_focusPointArray.length; i++) {
        if(i < 3){
            let focusPointData = g_focusPointArray[i];
            if(focusPointData.value == 0) {
                spellCastingsHTML += '<span name="'+i+'" class="icon mt-1 is-pulled-right has-text-info '+pointsButtonsClass+'"><i class="fas fa-lg fa-square"></i></span>';
            } else {
                g_focusOpenPoint = true;
                spellCastingsHTML += '<span name="'+i+'" class="icon mt-1 is-pulled-right has-text-info '+pointsButtonsClass+'"><i class="far fa-lg fa-square"></i></span>';
            }
        }
    }
    $('#focusPointsCastingSet').html(spellCastingsHTML);

    
    if(g_focusOpenPoint) {
        $('.focusSpellListingClass').removeClass('has-empty-slot-background');
        $('.focusSpellListingClass').find(".has-txt-noted").removeClass("has-txt-noted").addClass("has-txt-listing");
    } else {
        $('.focusSpellListingClass').addClass('has-empty-slot-background');
        $('.focusSpellListingClass').find(".has-txt-listing").removeClass("has-txt-listing").addClass("has-txt-noted");
    }

    $('.'+pointsButtonsClass).off('click');
    $('.'+pointsButtonsClass).click(function(event){
        event.stopImmediatePropagation();
        let focusPointData = g_focusPointArray[$(this).attr('name')];

        focusPointData.value = (focusPointData.value == 1) ? 0 : 1;
        socket.emit("requestFocusPointUpdate",
            getCharIDFromURL(),
            focusPointData,
            focusPointData.value);

        displayFocusCastingsSet('NONE');
    });

}




// Innate Spells //
function displaySpellsInnate() {

    let data = {
      ArcaneSpellAttack : getStatTotal(VARIABLE.ARCANE_SPELL_ATTACK),
      OccultSpellAttack : getStatTotal(VARIABLE.OCCULT_SPELL_ATTACK),
      PrimalSpellAttack : getStatTotal(VARIABLE.PRIMAL_SPELL_ATTACK),
      DivineSpellAttack : getStatTotal(VARIABLE.DIVINE_SPELL_ATTACK),
      ArcaneSpellDC : getStatTotal(VARIABLE.ARCANE_SPELL_DC),
      OccultSpellDC : getStatTotal(VARIABLE.OCCULT_SPELL_DC),
      PrimalSpellDC : getStatTotal(VARIABLE.PRIMAL_SPELL_DC),
      DivineSpellDC : getStatTotal(VARIABLE.DIVINE_SPELL_DC),
    };

    let spellMap = g_spellMap;
    let innateSpellArray = g_innateSpellArray;

    $('#spellsTabContent').html('');
    $('#spellsTabContent').append('<div id="spellsInnateContent" class="use-custom-scrollbar" style="height: 580px; max-height: 580px; overflow-y: auto;"></div>');

    let isFirstLevel = true;
    let prevLevel = -100;
    for (let spellIndex = 0; spellIndex < innateSpellArray.length; spellIndex++) {
        let innateSpell = innateSpellArray[spellIndex];

        if(innateSpell.SpellLevel > prevLevel){
            let sectionName = (innateSpell.SpellLevel == 0) ? 'Cantrips' : 'Level '+innateSpell.SpellLevel;
            if(isFirstLevel){
                $('#spellsInnateContent').append('<p class="is-size-5 has-txt-partial-noted has-text-weight-bold text-left pl-5">'+sectionName+'</p>');
                isFirstLevel = false;
            } else {
                $('#spellsInnateContent').append('<p class="is-size-5 has-txt-partial-noted has-text-weight-bold text-left pl-5 pt-2">'+sectionName+'</p>');
            }
            $('#spellsInnateContent').append(`
              <div class="columns is-mobile is-marginless">
                <div class="column is-4-desktop is-paddingless is-6-mobile">
                  <p class="has-text-left pl-3"><strong class="has-txt-listing">Name</strong></p>
                </div>
                <div class="column is-2-desktop is-paddingless is-3-mobile">
                  <p class="text-center"><strong class="is-size-6-5 has-txt-listing">Casts Per Day</strong></p>
                </div>
                <div class="column is-1-desktop is-paddingless is-3-mobile">
                  <p class="text-center"><strong class="has-txt-listing">Cast</strong></p>
                </div>
                <div class="column is-1-desktop is-paddingless is-hidden-mobile">
                  <p class="text-center"><strong class="has-txt-listing">Range</strong></p>
                </div>
                <div class="column is-4-desktop is-paddingless is-hidden-mobile">
                  <p class="text-center"><strong class="has-txt-listing">Traits</strong></p>
                </div>
              </div>
              <div class="is-divider hr-light is-marginless"></div>
            `);
        }

        let spellDataStruct = spellMap.get(innateSpell.SpellID+"");

        /// Display Spell Listing ///
        if(spellDataStruct != null) {

            let spellListingID = 'innateSpellListing'+spellIndex;
            let spellCastingID = 'innateSpellCastings'+spellIndex;
            
            // Name //
            let spellName = '<span class="has-text-left pl-3 has-txt-listing">'+spellDataStruct.Spell.name+'</span>';

            if(spellDataStruct.Spell.isArchived === 1){
                spellName += '<em class="pl-1">(archived)</em>';
            }
            
            // Cast Actions //
            let spellCast = null;
            switch(spellDataStruct.Spell.cast) {
                case 'FREE_ACTION': spellCast = '<span class="pf-icon">[free-action]</span>'; break;
                case 'REACTION': spellCast = '<span class="pf-icon">[reaction]</span>'; break;
                case 'ACTION': spellCast = '<span class="pf-icon">[one-action]</span>'; break;
                case 'TWO_ACTIONS': spellCast = '<span class="pf-icon">[two-actions]</span>'; break;
                case 'THREE_ACTIONS': spellCast = '<span class="pf-icon">[three-actions]</span>'; break;
                case 'ONE_TO_THREE_ACTIONS': spellCast = '<span class="pf-icon">[one-action]</span><span> to </span><span class="pf-icon">[three-actions]</span>'; break;
                case 'ONE_TO_TWO_ACTIONS': spellCast = '<span class="pf-icon">[one-action]</span><span> to </span><span class="pf-icon">[two-actions]</span>'; break;
                case 'TWO_TO_THREE_ACTIONS': spellCast = '<span class="pf-icon">[two-actions]</span><span> to </span><span class="pf-icon">[three-actions]</span>'; break;
                case 'TWO_TO_TWO_ROUNDS': spellCast = '<span class="pf-icon">[two-actions]</span><span> to 2 rounds</span>'; break;
                case 'TWO_TO_THREE_ROUNDS': spellCast = '<span class="pf-icon">[two-actions]</span><span> to 3 rounds</span>'; break;
                case 'THREE_TO_TWO_ROUNDS': spellCast = '<span class="pf-icon">[three-actions]</span><span> to 2 rounds</span>'; break;
                case 'THREE_TO_THREE_ROUNDS': spellCast = '<span class="pf-icon">[three-actions]</span><span> to 3 rounds</span>'; break;
                case 'TWO_ROUNDS': spellCast = '<span>2 rounds</span>'; break;
                case 'THREE_ROUNDS': spellCast = '<span>3 rounds</span>'; break;
                case 'ONE_MINUTE': spellCast = '<span>1 minute</span>'; break;
                case 'FIVE_MINUTES': spellCast = '<span>5 minutes</span>'; break;
                case 'TEN_MINUTES': spellCast = '<span>10 minutes</span>'; break;
                case 'THIRTY_MINUTES': spellCast = '<span>30 minutes</span>'; break;
                case 'ONE_HOUR': spellCast = '<span>1 hour</span>'; break;
                case 'EIGHT_HOURS': spellCast = '<span>8 hours</span>'; break;
                case 'ONE_DAY': spellCast = '<span>24 hours</span>'; break;
                default: spellCast = '<em>see spell</em>'; break;
            }

            // Range //
            let spellRange = (spellDataStruct.Spell.range != null) ? spellDataStruct.Spell.range : '-';

            // Tags //
            let tagsInnerHTML = '<div class="buttons is-marginless is-centered">';
            for(const tag of spellDataStruct.Tags){
                tagsInnerHTML += '<button class="button is-marginless mr-2 my-1 is-very-small is-info">'+tag.name+getImportantTraitIcon(tag)+'</button>';
            }
            tagsInnerHTML += '</div>';

            $('#spellsInnateContent').append(`
              <div id="${spellListingID}" class="columns is-mobile is-marginless cursor-clickable">
                <div class="column is-4-desktop is-paddingless border-bottom border-dark-lighter is-6-mobile">
                  <p class="has-text-left pl-3 pt-1">${spellName}</p>
                </div>
                <div class="column is-2 is-paddingless border-bottom border-dark-lighter is-3-mobile">
                  <p id="${spellCastingID}" class="text-center has-txt-listing pt-1 is-unselectable"></p>
                </div>
                <div class="column is-1-desktop is-paddingless border-bottom border-dark-lighter is-3-mobile">
                  <p class="text-center has-txt-listing is-size-6-5 pt-1">${spellCast}</p>
                </div>
                <div class="column is-1-desktop is-paddingless border-bottom border-dark-lighter is-hidden-mobile">
                  <p class="text-center has-txt-listing is-size-6-5 pt-1">${spellRange}</p>
                </div>
                <div class="column is-4-desktop is-paddingless border-bottom border-dark-lighter is-hidden-mobile">
                  <p class="text-center has-txt-listing">${tagsInnerHTML}</p>
                </div>
              </div>
            `);

            if(spellDataStruct.Spell.level == 0 || innateSpell.TimesPerDay == 0){
                $('#'+spellCastingID).html('Unlimited');
            } else {
                displayInnateCastingsSet(spellCastingID, innateSpell, spellIndex, spellListingID);
            }
            
            $('#'+spellListingID).click(function(){
                openQuickView('spellView', {
                    SpellDataStruct: spellDataStruct,
                    SheetData: {InnateSpell: innateSpell, Data: data},
                });
            });

            $('#'+spellListingID).mouseenter(function(){
                $(this).addClass('has-bg-selectable-hover');
            });
            $('#'+spellListingID).mouseleave(function(){
                $(this).removeClass('has-bg-selectable-hover');
            });

        }

        prevLevel = innateSpell.SpellLevel;
    }

}

function displayInnateCastingsSet(locationID, innateSpell, spellIndex, spellListingID){

    let castingButtonsClass = 'castingInnateBtns'+locationID;

    let spellCastingsHTML = '';
    for (let i = 0; i < innateSpell.TimesPerDay; i++) {
        if(innateSpell.TimesCast > i) {
            spellCastingsHTML += '<span class="icon has-text-info isInnateCast '+castingButtonsClass+'"><i class="fas fa-lg fa-square"></i></span>';
        } else {
            spellCastingsHTML += '<span class="icon has-text-info '+castingButtonsClass+'"><i class="far fa-lg fa-square"></i></span>';
        }
    }
    $('#'+locationID).html(spellCastingsHTML);

    if(innateSpell.TimesPerDay === innateSpell.TimesCast) {
        $('#'+spellListingID).addClass('has-empty-slot-background');
        $('#'+spellListingID).find(".has-txt-listing").removeClass("has-txt-listing").addClass("has-txt-noted");
    } else {
        $('#'+spellListingID).removeClass('has-empty-slot-background');
        $('#'+spellListingID).find(".has-txt-noted").removeClass("has-txt-noted").addClass("has-txt-listing");
    }

    $('.'+castingButtonsClass).off('click');
    $('.'+castingButtonsClass).click(function(){
        event.stopImmediatePropagation();
        let newTimesCast = null;
        if($(this).hasClass('isInnateCast')) {
            newTimesCast = innateSpell.TimesCast-1;
        } else {
            newTimesCast = innateSpell.TimesCast+1;
        }
        socket.emit("requestInnateSpellCastingUpdate",
            cloneObj(innateSpell),
            newTimesCast);
        innateSpell.TimesCast = newTimesCast;
        g_innateSpellArray[spellIndex] = innateSpell;
        displayInnateCastingsSet(locationID, innateSpell, spellIndex, spellListingID);
    });

}