/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

/* 
  Tag Name: data-selection-info

  STATES:
  - UNSELECTED
  - INCORRECT
*/

function getTagFromData(srcStruct, sourceName, details, STATE){
  return srcStruct.sourceType+':::'+srcStruct.sourceLevel+':::'+srcStruct.sourceCode+':::'+srcStruct.sourceCodeSNum+';;;'+sourceName+':::'+details+':::'+STATE;
}
function getDataFromTag(tagData){
  let parts = tagData.split(';;;');
  let srcStructParts = parts[0].split(':::');
  let otherDataParts = parts[1].split(':::');
  return {
    srcStruct: {
      sourceType: srcStructParts[0],
      sourceLevel: srcStructParts[1],
      sourceCode: srcStructParts[2],
      sourceCodeSNum: srcStructParts[3],
    },
    sourceName: otherDataParts[0],
    details: otherDataParts[1],
    STATE: otherDataParts[2],
  };
}



function selectorUpdated() {

  // Show blue circle indicator for all accords that require a selection //
  if(g_builder_type == 'by-level'){
    if(g_char_id == null){// If build creator, use custom icons
      selectorUpdatedBuildIcons();
    } else {// Else, use normal blue icons
      $('.accord-creation-container').each(function() {
        if($(this).find('.input.is-info').length !== 0 || $(this).find('.select.is-info').length !== 0 || $(this).find('.feat-selection.is-default').length !== 0){
            $(this).find('.accord-indicate-unselected-options').html('<span class="icon is-small has-text-info pl-3"><i class="fas fa-xs fa-circle"></i></span>');
        } else {
            $(this).find('.accord-indicate-unselected-options').html('');
        }
      });
    }
  } else if(g_builder_type == 'by-abc'){
    // Clear all blue dots
    $('.accord-creation-container').each(function() {
      $(this).find('.accord-indicate-unselected-options').html('');
    });

    // Reapply blue dots
    if(g_page_num == 2){
      $('.ancestry-feature-section').each(function() {
        if($(this).find('.input.is-info').length !== 0 || $(this).find('.select.is-info').length !== 0 || $(this).find('.feat-selection.is-default').length !== 0){
            $(this).parent().parent().find('.accord-indicate-unselected-options').html('<span class="icon is-small has-text-info pl-3"><i class="fas fa-xs fa-circle"></i></span>');
        }
      });
    } else if(g_page_num == 3){
      $('.background-feature-section').each(function() {
        if($(this).find('.input.is-info').length !== 0 || $(this).find('.select.is-info').length !== 0 || $(this).find('.feat-selection.is-default').length !== 0){
            $(this).parent().parent().find('.accord-indicate-unselected-options').html('<span class="icon is-small has-text-info pl-3"><i class="fas fa-xs fa-circle"></i></span>');
        }
      });
    } else if(g_page_num == 4){
      $('.class-feature-section').each(function() {
        if($(this).find('.input.is-info').length !== 0 || $(this).find('.select.is-info').length !== 0 || $(this).find('.feat-selection.is-default').length !== 0){
            $(this).parent().parent().find('.accord-indicate-unselected-options').html('<span class="icon is-small has-text-info pl-3"><i class="fas fa-xs fa-circle"></i></span>');
        }
      });
    }
    
  }

  // Process all selections that haven't been selected
  $('.select').each(function() {
    let tagData = $(this).attr('data-selection-info');
    if(tagData != null && tagData != '') {
      let data = getDataFromTag(tagData);
      if($(this).hasClass('is-info')){
        addUnselectedData(data.srcStruct, JSON.stringify({
          sourceName: data.sourceName,
          details: data.details,
          STATE: data.STATE,
        }));
      } else {
        removeUnselectedData(data.srcStruct);
      }
    }
  });

  $('.feat-selection').each(function() {
    let tagData = $(this).attr('data-selection-info');
    if(tagData != null && tagData != ''){
      let data = getDataFromTag(tagData);
      if(data.STATE != ''){
        addUnselectedData(data.srcStruct, JSON.stringify({
          sourceName: data.sourceName,
          details: data.details,
          STATE: data.STATE,
        }));
      } else {
        removeUnselectedData(data.srcStruct);
      }
    }
  });
  
}

function addUnselectedData(srcStruct, unselectedData){
  let existingData = getDataSingle(DATA_SOURCE.UNSELECTED_DATA, srcStruct);
  if(existingData == null || existingData.value == null){

    setDataOnly(DATA_SOURCE.UNSELECTED_DATA, srcStruct, unselectedData);

    if(g_char_id != null){
      socket.emit("requestUnselectedDataChange",
          g_char_id,
          srcStruct,
          unselectedData);
    } else {
      saveBuildMetaData();
    }

  }
}

function removeUnselectedData(srcStruct, deleteOnly=true){
  let existingData = getDataSingle(DATA_SOURCE.UNSELECTED_DATA, srcStruct);
  if(existingData != null && existingData.value != null){

    if(deleteOnly){
      deleteDataOnly(DATA_SOURCE.UNSELECTED_DATA, srcStruct);
    } else {
      deleteData(DATA_SOURCE.UNSELECTED_DATA, srcStruct);
    }

    if(g_char_id != null){
      socket.emit("requestUnselectedDataChange",
          g_char_id,
          srcStruct,
          null,
          deleteOnly);
    } else {
      saveBuildMetaData();
    }

  }
}