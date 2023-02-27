/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

let socket = io();

let g_activeBundle = null;

let g_featMap = null;
let g_itemMap = null;
let g_spellMap = null;
let g_allLanguages = null;
let g_allConditions = null;
let g_allTags = null;
let g_skillMap = null;

// ~~~~~~~~~~~~~~ // Run on Load // ~~~~~~~~~~~~~~ //
$(function () {

  $('.category-tabs li a').click(function() {
    $('#browseTab').parent().removeClass("is-active");
    $('#userCollectionTab').parent().removeClass("is-active");
    $('#userContentTab').parent().removeClass("is-active");
    $(this).parent().addClass("is-active");
  });

  $('#browseTab').click(function() {
    openBundleBrowse();
  });

  $('#userCollectionTab').click(function() {
    openUserCollection();
  });

  $('#userContentTab').click(function() {
    openUserContent();
  });


  let editHomebrewID = $('#homebrew-container').attr('data-edit-homebrew-id');
  let viewHomebrewID = $('#homebrew-container').attr('data-view-homebrew-id');
  let homebrewTabName = $('#homebrew-container').attr('data-direct-to-tab').toUpperCase();

  if(editHomebrewID != '' || viewHomebrewID != '' || homebrewTabName != '') {
    if(editHomebrewID != ''){
      $('#userContentTab').parent().addClass('is-active');
      socket.emit('requestHomebrewBundle', 'EDIT', editHomebrewID);
    } else if(viewHomebrewID != ''){
      $('#browseTab').parent().addClass('is-active');
      socket.emit('requestHomebrewBundle', 'VIEW', viewHomebrewID);
    } else if(homebrewTabName != ''){
      switch(homebrewTabName) {
        case 'BROWSE': $('#browseTab').trigger("click"); break;
        case 'COLLECTION': $('#userCollectionTab').trigger("click"); break;
        case 'CONTENT': $('#userContentTab').trigger("click"); break;
        default: break;
      }
    }
  } else {
    $('#browseTab').trigger("click");
  }

});

socket.on("returnHomebrewBundle", function(REQUEST_TYPE, homebrewBundle){
  if(homebrewBundle != null){
    if(REQUEST_TYPE === 'EDIT') {
      $('#userContentTab').parent().addClass("is-active");
      openBundleEditor(homebrewBundle);
    } else if(REQUEST_TYPE === 'VIEW') {
      $('#browseTab').parent().addClass("is-active");
      openBundleView(homebrewBundle);
    }
  }
});

// Utils //
/*
function getHomebrewContentSrc(homebrewID){
  if(g_activeBundle != null && g_activeBundle.id == homebrewID){
    return g_activeBundle.name;
  } else {
    return null;
  }
}*/