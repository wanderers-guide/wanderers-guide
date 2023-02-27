/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

let socket = io();

let g_activeBuild = null;

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
    $('#userContentTab').parent().removeClass("is-active");
    $(this).parent().addClass("is-active");
  });

  $('#browseTab').click(function() {
    openBuildsBrowse();
  });

  $('#userContentTab').click(function() {
    openUserContent();
  });


  let viewBuildID = $('#builds-container').attr('data-view-build-id');
  let buildTabName = $('#builds-container').attr('data-direct-to-tab').toUpperCase();

  if(viewBuildID != '' || buildTabName != '') {
    if(viewBuildID != ''){
      $('#browseTab').parent().addClass('is-active');
      openBuildView(viewBuildID);
    } else if(buildTabName != ''){
      switch(buildTabName) {
        case 'BROWSE': $('#browseTab').trigger("click"); break;
        case 'CONTENT': $('#userContentTab').trigger("click"); break;
        default: break;
      }
    }
  } else {
    $('#browseTab').trigger("click");
  }

});

/*
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
*/