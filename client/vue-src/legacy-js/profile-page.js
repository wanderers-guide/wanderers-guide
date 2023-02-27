/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

let socket = io();

let g_profileName = null;

// ~~~~~~~~~~~~~~ // Run on Load // ~~~~~~~~~~~~~~ //
$(function () {

  g_profileName= $('#profileName').attr('data-profile-name');

  $('#profileNameBtn').click(function() {
    $('#profileName').html('<div class="pt-2"><input id="profileNameInput" class="input is-medium" style="max-width: 340px;" maxlength="40" value="'+g_profileName+'" spellcheck="false" autocomplete="off"></div>');
    $('#profileNameBtn').addClass('is-hidden');
    $('#profileNameInput').focus();

    // Press Enter Key
    $('#profileNameInput').on('keypress',function(e){
      if(e.which == 13){
        $(this).blur();
      }
    });
  
    $('#profileNameInput').blur(function(){
      let newName = $('#profileNameInput').val();
      if(newName == null || newName == '') {return;}
      $(this).unbind();
      $('#profileName').html(newName);
      $('#profileNameBtn').removeClass('is-hidden');
      socket.emit("requestProfileNameChange", newName);
    });
  
  });

  $('#developerModeBtn').change(function(){
    if ($(this).is(':checked')) {
      $(this).removeClass('is-dark');
      $(this).addClass('is-info');
      $(this).blur();
      socket.emit("requestDeveloperStatusChange", true);
    } else {
      $(this).removeClass('is-info');
      $(this).addClass('is-dark');
      $(this).blur();
      socket.emit("requestDeveloperStatusChange", false);
    }
  });

  $('#lightModeBtn').change(function(){
    if ($(this).is(':checked')) {
      $(this).removeClass('is-dark');
      $(this).addClass('is-info');
      $(this).blur();
      socket.emit("requestThemeStatusChange", true);
    } else {
      $(this).removeClass('is-info');
      $(this).addClass('is-dark');
      $(this).blur();
      socket.emit("requestThemeStatusChange", false);
    }
  });

});

socket.on("returnProfileNameChange", function(newName){
  g_profileName = newName;
});

socket.on("returnDeveloperStatusChange", function(isDeveloper){
  if(isDeveloper){
    $('#developerStatusListing').removeClass('is-hidden');
  } else {
    $('#developerStatusListing').addClass('is-hidden');
  }
});

socket.on("returnThemeStatusChange", function(lightMode){
  window.location.reload(true);
});