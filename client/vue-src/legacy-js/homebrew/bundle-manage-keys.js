/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

// ~~~~~~~~~~~~~~ // Run on Load // ~~~~~~~~~~~~~~ //
$(function () {

  $('#manage-keys-modal-background,#manage-keys-modal-close').click(function() {
    $('#manage-keys-modal').removeClass('is-active');
    $('html').removeClass('is-clipped');
    $('#manage-keys-modal-body').html('');
  });

});

socket.on("returnBundleKeys", function(bundleKeys){
  $('#manage-keys-modal-body').html('');

  $('#manage-keys-modal-body').append('<div class="columns is-mobile is-marginless mb-1"><div class="column"><div class="buttons"><button id="manage-keys-generate-btn" class="button is-success is-outlined">Generate Key(s)</button></div></div><div class="column"><div class="field"><div class="control"><div class="select"><select id="manage-keys-key-type-selector"><option value="0">Permanent Key</option><option value="1">One-Time-Use Key</option></select></div></div></div></div><div class="column"><div class="field"><div class="control"><div class="select"><select id="manage-keys-key-amount-selector"><option value="1">1</option><option value="10">10</option></select></div></div></div></div></div>');

  $('#manage-keys-generate-btn').click(function() {
    socket.emit("requestBundleAddKeys", g_activeBundle.id, $('#manage-keys-key-amount-selector').val(), (($('#manage-keys-key-type-selector').val() == 1) ? true : false));
  });

  $('#manage-keys-modal-body').append('<hr class="m-2">');
  $('#manage-keys-modal-body').append('<div id="manage-keys-modal-key-container" class="use-custom-scrollbar" style="height: 400px; max-height: 400px; overflow-y: auto;"></div');

  let keyCount = 0;
  for(let bundleKey of bundleKeys) {
    let keyEntry = 'key-entry-'+keyCount;
    let keyEntryDeleteBtn = keyEntry+'-delete-btn';

    let useText = (bundleKey.isOneTimeUse == 1) ? 'One-Time-Use Key' : 'Permanent Key';

    $('#manage-keys-modal-key-container').append('<div id="'+keyEntry+'" class="columns is-mobile is-marginless mb-1 sub-section-box"><div class="column is-6"><p class="is-size-7 is-thin has-txt-value-string">'+bundleKey.keyCode+'</p></div><div class="column is-4"><p class="is-size-6 is-italic">'+useText+'</p></div><div class="column is-2"><div class="is-pulled-right buttons are-small"><button id="'+keyEntryDeleteBtn+'" class="button is-danger is-outlined">Delete</button></div></div></div>');

    $('#'+keyEntryDeleteBtn).click(function() {
      socket.emit("requestBundleRemoveKey", g_activeBundle.id, bundleKey.keyCode);
    });

    keyCount++;
  }
  if(keyCount == 0){
    $('#manage-keys-modal-key-container').append('<p class="has-text-centered is-italic">Bundle has no keys!</p>');
  }

  $('#manage-keys-modal').addClass('is-active');

});

socket.on("returnBundleRemoveKey", function(){
  socket.emit('requestBundleKeys', g_activeBundle.id);
});

socket.on("returnBundleAddKeys", function(){
  socket.emit('requestBundleKeys', g_activeBundle.id);
});