/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

let socket = io();

// ~~~~~~~~~~~~~~ // Run on Load // ~~~~~~~~~~~~~~ //
$(function () {

  $('#clear-db-cache-btn').click(function () {
    new ConfirmMessage('Clear Database Cache', '<p class="has-text-centered">Are you sure you want to clear the database\'s cache?</p>', 'Clear Cache', 'modal-clear-db-cache', 'modal-clear-db-cache-btn');
    $('#modal-clear-db-cache-btn').click(function () {
      socket.emit("requestAdminClearCache");
    });
  });

});

socket.on("returnAdminClearCache", function () {

});