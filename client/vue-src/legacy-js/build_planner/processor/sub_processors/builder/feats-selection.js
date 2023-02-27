/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

let g_featPrereqMap = new Map();
let g_featSelectionMap = new Map();

function giveFeatSelection(locationID, srcStruct, selectionName, selectionMap, sourceName){

  // Sort selectionMap by key (level) -> highest to loweest
  selectionMap = new Map([...selectionMap.entries()].sort(
    function(a, b) {
        return b[0] - a[0];
    })
  );

  let featSelectionLocID = "featSelect-"+locationID+"-"+srcStruct.sourceCode+"-"+srcStruct.sourceCodeSNum;
  $('#'+locationID).append('<div id="'+featSelectionLocID+'" class="py-1"></div>');
  generateFeatSelection(featSelectionLocID, srcStruct, selectionName, selectionMap, sourceName);

}

function generateFeatSelection(contentLocID, srcStruct, selectionName, selectionMap, sourceName){
  g_featSelectionMap.set(contentLocID, {
    SrcStruct: srcStruct,
    SelectionName: selectionName,
    SelectionMap: selectionMap,
    SourceName: sourceName,
  });

  // Find selectedFeat //
  let selectedFeatData = getDataSingle(DATA_SOURCE.FEAT_CHOICE, srcStruct);
  let selectedFeat = null;
  if(selectedFeatData != null && selectedFeatData.value != null){
    selectedFeat = g_featMap.get(selectedFeatData.value+"");
  }

  // Selected feat must be one of the selection options,
  if(selectedFeat != null){
    let findSelectedFeatInSelectionMap = function(){
      for(let [featLevel, featArray] of selectionMap.entries()){
        for(let feat of featArray){
          if(feat.Feat.name == selectedFeat.Feat.name){
            return true;
          }
        }
      }
      return false;
    };
    if(!findSelectedFeatInSelectionMap()){
      selectedFeat = null;
      setData(DATA_SOURCE.FEAT_CHOICE, srcStruct, null);
    }
  }
  // ~~~~~~~~~~~~~~~~~ //

  let openFeatDetailsClass = "openFeat-"+contentLocID;
  let openFeatListClass = "openList-"+contentLocID;

  let featListSectionID = "featListSection-"+contentLocID;
  let featDropdownIconID = "featDropdownIcon-"+contentLocID;

  let featCodeSectionID = "featCode-"+contentLocID;

  let featSelectButtonClass = "featSelectBtn-"+contentLocID;
  let featRemoveButtonClass = "featRemoveBtn-"+contentLocID;

  if(selectedFeat == null) {
    const selectionTagInfo = getTagFromData(srcStruct, sourceName, 'Unselected Feat', 'UNSELECTED');

    $('#'+contentLocID).html(`
      <div class="mb-0">
        <div data-contentLoc-id="${contentLocID}" class="feat-selection is-default cursor-clickable columns is-mobile mb-0 p-0" data-selection-info="${selectionTagInfo}">
          <div class="column is-2 is-paddingless ${openFeatListClass} py-2"></div>
          <div class="column is-8 is-paddingless ${openFeatListClass} py-2">
            <span class="">${selectionName}</span>
          </div>
          <div class="column is-2 is-paddingless ${openFeatListClass} py-2">
            <span class="icon feat-selection-dropdown"><i id="${featDropdownIconID}" class="fas fa-chevron-down"></i></span>
          </div>
        </div>
        <div id="${featListSectionID}" class="is-hidden"></div>
        <div id="${featCodeSectionID}" class="py-2"></div>
      </div>
    `);
  } else {
    const selectionTagInfo = (meetsPrereqs(selectedFeat.Feat) == 'FALSE') ? getTagFromData(srcStruct, sourceName, 'Prerequisites Not Met', 'INCORRECT') : getTagFromData(srcStruct, sourceName, '', '');

    let featNameHTML = '<span class="">'+selectedFeat.Feat.name+'</span>';
    if(selectedFeat.Feat.isArchived === 1){ featNameHTML += '<span class="has-txt-partial-noted is-size-6-5"> - Archived</span>'; }
    let featLevelHTML = '';
    if(selectedFeat.Feat.level > 0){ featLevelHTML = '<sup class="is-size-7 has-txt-noted is-italic"> Lvl '+selectedFeat.Feat.level+'</sup>'; }
    $('#'+contentLocID).html(`
      <div class="mb-0">
        <div data-contentLoc-id="${contentLocID}" class="feat-selection cursor-clickable columns is-mobile mb-0 p-0" data-selection-info="${selectionTagInfo}">
          <div class="column is-1 is-paddingless ${openFeatDetailsClass} py-2"></div>
          <div class="column is-10 is-paddingless ${openFeatDetailsClass} py-2">
            ${featNameHTML}${featLevelHTML}
          </div>
          <div class="column is-1 is-paddingless ${openFeatListClass} py-2" style="border-left: 1px solid hsl(0, 0%, 13%);">
            <span class="icon feat-selection-dropdown"><i id="${featDropdownIconID}" class="fas fa-chevron-down"></i></span>
          </div>
        </div>
        <div id="${featListSectionID}" class="is-hidden"></div>
        <div id="${featCodeSectionID}" class="py-2"></div>
      </div>
    `);
  }


  if(selectedFeat != null) {
    $('.'+openFeatDetailsClass).click(function(event) {
      openQuickView('featView', {
        Feat : selectedFeat.Feat,
        Tags : selectedFeat.Tags,
        _prevBackData: {Type: g_QViewLastType, Data: g_QViewLastData},
      });
    });

    $('.'+openFeatDetailsClass).mouseenter(function(){
      $('.'+openFeatDetailsClass).addClass('feat-selection-is-hovered');
    });
    $('.'+openFeatDetailsClass).mouseleave(function(){
      $('.'+openFeatDetailsClass).removeClass('feat-selection-is-hovered');
    });
  
    $('.'+openFeatListClass).mouseenter(function(){
      $(this).addClass('feat-selection-is-hovered');
    });
    $('.'+openFeatListClass).mouseleave(function(){
      $(this).removeClass('feat-selection-is-hovered');
    });
  }

  $('.'+openFeatListClass).click(function() {
    if($('#'+featListSectionID).hasClass('is-hidden')){
      $('#'+featDropdownIconID).removeClass('fa-chevron-down');
      $('#'+featDropdownIconID).addClass('fa-chevron-up');

      generateFeatSelectionList(contentLocID, srcStruct, selectedFeat, selectionMap, {
        featListSectionID,
        featSelectButtonClass,
        featRemoveButtonClass,
        featCodeSectionID,
      });

      $('#'+featListSectionID).removeClass('is-hidden');
    } else {

      $('#'+featDropdownIconID).removeClass('fa-chevron-up');
      $('#'+featDropdownIconID).addClass('fa-chevron-down');
      $('#'+featListSectionID).addClass('is-hidden');

      $('#'+featListSectionID).html('');

    }
  });

  if(selectedFeat != null){
    processCode(
        selectedFeat.Feat.code,
        srcStruct,
        featCodeSectionID,
        {source: 'Feat', sourceName: selectedFeat.Feat.name+' (Lvl '+srcStruct.sourceLevel+')'});
  }

}

function generateFeatSelectionList(contentLocID, srcStruct, selectedFeat, selectionMap, featListStruct){

  let featListSectionID = featListStruct.featListSectionID;
  let featCodeSectionID = featListStruct.featCodeSectionID;

  let featSelectButtonClass = featListStruct.featSelectButtonClass;
  let featRemoveButtonClass = featListStruct.featRemoveButtonClass;


  // Update prereqs
  if(gOption_hasAutoDetectPreReqs) {
    for(let [featLevel, featArray] of selectionMap.entries()){
      for(let featData of featArray) {
        const preReqResult = meetsPrereqs(featData.Feat);
        g_featPrereqMap.set(featData.Feat.id+'', preReqResult);
      }
    }
  }

  let sortedSelectionMap = new Map();
  for(let [featLevel, featArray] of selectionMap.entries()){

    // Sort feat array by level -> prereq -> name
    let sortedFeatArray = featArray.sort(
      function(a, b) {
        if (a.Feat.level === b.Feat.level) {
          if(gOption_hasAutoDetectPreReqs) {
            // Prereq is only important when levels are the same
            let a_meets = prereqToValue(g_featPrereqMap.get(a.Feat.id+''));
            let b_meets = prereqToValue(g_featPrereqMap.get(b.Feat.id+''));
            if(a_meets === b_meets) {
              // Name is only important when prereqs are the same
              return a.Feat.name > b.Feat.name ? 1 : -1;
            }
            return b_meets - a_meets;
          } else {
            return a.Feat.name > b.Feat.name ? 1 : -1;
          }
        }
        return a.Feat.level - b.Feat.level;
      }
    );
    sortedSelectionMap.set(featLevel, sortedFeatArray);

  }

  let featListHTML = '';
  let displayedFeat = false;
  for(let [featLevel, featArray] of sortedSelectionMap.entries()){

    if(featLevel > 0){
      featListHTML += '<hr class="hr-feat-selection m-0"><div class="feat-selection-level"><span class="">Level '+featLevel+'</span></div>';
    }

    // If all the feats of a given level start with the same 'Text - ...', remove the 'Text - '
    let detectSameBeginningDashText = function(){
      let beginningDashText = null;
      for(const featData of featArray){
        if(beginningDashText == null){
          if(featData.Feat.name.includes(' - ')){
            beginningDashText = featData.Feat.name.split(' - ')[0];
          } else {
            return null;
          }
        } else {
          if(!featData.Feat.name.startsWith(beginningDashText+' - ')){
            return null;
          }
        }
      }
      return beginningDashText;
    };
    const beginningDashText = detectSameBeginningDashText();
    
    for(let featData of featArray) {

      let featNameHTML = '<span class="feat-selection-list-entry-feat-name">'+featData.Feat.name.replace(beginningDashText+' - ', '')+'</span><span class="feat-selection-list-entry-feat-actions">'+convertActionToHTML(featData.Feat.actions)+'</span>';

      if(featData.Feat.isArchived === 1){
        if(selectedFeat != null && selectedFeat.Feat.id == featData.Feat.id){
          featNameHTML += '<span class="has-txt-partial-noted is-size-6-5"> - Archived</span>';
        } else {
          continue;
        }
      }


      let preReqIconHTML = '';
      if(gOption_hasAutoDetectPreReqs){
        const preReqResult = g_featPrereqMap.get(featData.Feat.id+'');
        if(preReqResult == 'TRUE'){
          preReqIconHTML = ' '+preReqGetIconTrue();
        } else if(preReqResult == 'FALSE'){
          preReqIconHTML = ' '+preReqGetIconFalse();
        } else if(preReqResult == 'UNKNOWN'){
          preReqIconHTML = ' '+preReqGetIconUnknown();
        }
      }

      let rightInfoHTML = `
        <div class="pos-relative">
          <span class="is-hidden-mobile">${convertRarityToIconHTML(featData.Feat.rarity)}</span>
          <span class="featPrereqIcon">${preReqIconHTML}</span>
        </div>
      `;

      let topLeftHTML = '';
      if(featData.Feat.skillID != null){
        topLeftHTML = '<span class="has-txt-partial-noted is-italic is-size-7-5">'+getSkillNameAbbrev(getSkillIDToName(featData.Feat.skillID))+'</span>';
      }

      /*
      let featRarityClass = '';
      if(featData.Feat.rarity == 'UNCOMMON'){
        featRarityClass = 'is-uncommon';
      } else if(featData.Feat.rarity == 'RARE'){
        featRarityClass = 'is-rare';
      } else if(featData.Feat.rarity == 'UNIQUE'){
        featRarityClass = 'is-unique';
      }*/

      let hasFeat = (featData.Feat.canSelectMultiple == 0 && hasDuplicateFeat(featData.Feat.id));
      if(selectedFeat != null && selectedFeat.Feat.id == featData.Feat.id){
        featListHTML += `
          <hr class="hr-feat-selection m-0">
          <div class="cursor-clickable feat-selection-list-entry is-prev-selected pos-relative columns is-mobile m-0 p-0" data-feat-id="${featData.Feat.id}">
            <div class="column is-2 is-paddingless py-2 feat-selection-list-entry-view"></div>
            <div class="column is-7 is-paddingless py-2 feat-selection-list-entry-view">${featNameHTML}</div>
            <div class="column is-1 is-paddingless py-2 pr-1 feat-selection-list-entry-view text-right">${rightInfoHTML}</div>
            <div class="column is-2 is-paddingless py-2 feat-selection-list-entry-choose">
              <button class="button is-very-small is-danger is-outlined is-rounded ${featRemoveButtonClass}" data-feat-id="${featData.Feat.id}">Remove</button>
            </div>
            <div class="pos-absolute pos-t-0 pos-l-5">${topLeftHTML}</div>
          </div>
        `;
      } else if(hasFeat) {
        featListHTML += `
          <hr class="hr-feat-selection m-0">
          <div class="cursor-clickable feat-selection-list-entry is-prev-selected pos-relative columns is-mobile m-0 p-0" data-feat-id="${featData.Feat.id}">
            <div class="column is-2 is-paddingless py-2 feat-selection-list-entry-view"></div>
            <div class="column is-7 is-paddingless py-2 feat-selection-list-entry-view">${featNameHTML}</div>
            <div class="column is-1 is-paddingless py-2 pr-1 feat-selection-list-entry-view text-right">${rightInfoHTML}</div>
            <div class="column is-2 is-paddingless py-2"></div>
            <div class="pos-absolute pos-t-0 pos-l-5">${topLeftHTML}</div>
          </div>
        `;
      } else {
        featListHTML += `
          <hr class="hr-feat-selection m-0">
          <div class="cursor-clickable feat-selection-list-entry pos-relative columns is-mobile m-0 p-0" data-feat-id="${featData.Feat.id}">
            <div class="column is-2 is-paddingless py-2 feat-selection-list-entry-view"></div>
            <div class="column is-7 is-paddingless py-2 feat-selection-list-entry-view">${featNameHTML}</div>
            <div class="column is-1 is-paddingless py-2 pr-1 feat-selection-list-entry-view text-right">${rightInfoHTML}</div>
            <div class="column is-2 is-paddingless py-2 feat-selection-list-entry-choose">
              <button class="button is-very-small is-info is-outlined is-rounded ${featSelectButtonClass}" data-feat-id="${featData.Feat.id}">Select</button>
            </div>
            <div class="pos-absolute pos-t--5 pos-l-5">${topLeftHTML}</div>
          </div>
        `;
      }
      displayedFeat = true;

    }
  }
  if(!displayedFeat){
    // No feat displayed,
    featListHTML = `
      <hr class="hr-feat-selection m-0">
      <div class="feat-selection-none"><span class="">None</span></div>
    `;
  }
  $('#'+featListSectionID).html('<div class="feat-selection-list use-feat-selection-scrollbar">'+featListHTML+'</div>');

  // Events //
  $('.'+featSelectButtonClass).click(function() {
    $(this).addClass('is-loading');
    let featID = $(this).attr('data-feat-id');
    let feat = g_featMap.get(featID);

    setData(DATA_SOURCE.FEAT_CHOICE, srcStruct, featID);
    if(g_char_id != null){
      socket.emit("requestFeatChange",
          g_char_id,
          {srcStruct, feat, featID, codeLocationID : featCodeSectionID });
    } else {
      saveBuildMetaData();
    }
    handleFeatChange(feat, contentLocID);
  });

  $('.'+featRemoveButtonClass).click(function() {
    $(this).addClass('is-loading');

    setData(DATA_SOURCE.FEAT_CHOICE, srcStruct, null);
    if(g_char_id != null){
      socket.emit("requestFeatChange",
          g_char_id,
          {srcStruct, feat : null, featID : null, codeLocationID : featCodeSectionID });
    } else {
      saveBuildMetaData();
    }
    handleFeatChange(null, contentLocID);
  });

  updateFeatSelectionEntryEvents();

}

//socket.on("returnFeatChange", function(featChangePacket){});

function handleFeatChange(feat, contentLocID){

  // Updating feat selections will run code for all feats (including this one)
  let featData = g_featSelectionMap.get(contentLocID);
  if(featData != null){
    generateFeatSelection(contentLocID,
      featData.SrcStruct,
      featData.SelectionName,
      featData.SelectionMap,
      featData.SourceName);
  }
  //updateAllFeatSelections();
  selectorUpdated();

  // Get number of character archetypes
  let charArchetypesArray = [];
  for(let featChoice of getDataAll(DATA_SOURCE.FEAT_CHOICE)){
    if(featChoice.value != null) {
      let feat = g_featMap.get(featChoice.value+"");
      if(feat != null){
        let dedicationTag = feat.Tags.find(featTag => {
          return featTag.name === 'Dedication';
        });
        if(dedicationTag != null){
          charArchetypesArray.push(featChoice.value);
        }
      }
    }
  }

  // Get number of current archetype tabs
  let maxArchetypesLength = 0;
  $('.classFeatTabs').each(function() {
    let archetypesTabClass = $(this).attr('data-arch-tab-class');
    let archLength = $('.'+archetypesTabClass).length;
    if (archLength > maxArchetypesLength) {
      maxArchetypesLength = archLength;
    }
  });

  // Changed feat has Dedication tag
  let featDedicationTag = null;
  if(feat != null){
    featDedicationTag = feat.Tags.find(featTag => {
      return featTag.name === 'Dedication';
    });
  }

  // If they aren't the same amount, reload state
  if(maxArchetypesLength != charArchetypesArray.length || featDedicationTag != null) {
    animatedStateLoad();
  }

}

/*
function updateAllFeatSelections(){

  $(".feat-selection").each(function(){

    let contentLocID = $(this).attr('data-contentLoc-id');
    let featData = g_featSelectionMap.get(contentLocID);
    if(featData != null){
      generateFeatSelection(contentLocID,
        featData.SrcStruct,
        featData.SelectionName,
        featData.SelectionMap,
        featData.SourceName);
    }

  });

}*/

function updateFeatSelectionEntryEvents(){

  // Feat Selection Entry Events //
  $('.feat-selection-list-entry').unbind();
  $('.feat-selection-list-entry').mouseenter(function(){
    $(this).addClass('is-selected');
  });
  $('.feat-selection-list-entry').mouseleave(function(){
    $(this).removeClass('is-selected');
  });

  $('.feat-selection-list-entry-view').unbind();
  $('.feat-selection-list-entry-view').click(function(){
    let featID = $(this).parent().attr('data-feat-id');
    let feat = g_featMap.get(featID);
    openQuickView('featView', {
      Feat : feat.Feat,
      Tags : feat.Tags,
      _prevBackData: {Type: g_QViewLastType, Data: g_QViewLastData},
    });
  });

}