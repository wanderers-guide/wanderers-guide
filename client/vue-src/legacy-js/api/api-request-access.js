/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

let socket = io();

// ~~~~~~~~~~~~~~ // Run on Load // ~~~~~~~~~~~~~~ //
$(function () {

  // Remove Header and Footer //
  $('#main-top').html('');
  $('#wanderers-guide-footer').html('');
  $('#main-container').addClass('is-paddingless');

  $('#character-access-btn').click(function() {
    let clientID = $('#access-container').attr('data-client-id');
    let charID = $('#access-container').attr('data-char-id');
    let accessRights = $('#access-container').attr('data-access-rights');
    socket.emit("requestAPIRequestAccess", clientID, charID, accessRights);
  });
  
});

socket.on("returnAPIRequestAccess", function(accessData) {
  let stateQueryParam = '';
  let stateText = $('#access-container').attr('data-state');
  if(stateText != null && stateText != '') {
    stateQueryParam = '&state='+stateText;
  }
  window.location.href = accessData.redirectURI+'?code='+accessData.singleUseCode+stateQueryParam;
});