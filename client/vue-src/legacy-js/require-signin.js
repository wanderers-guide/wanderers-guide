/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

$(function () {
  setTimeout(() => {

    if(typeof socket === 'undefined'){
      socket = io();
    }

    socket.on("userNotLoggedIn", function(){
      // Hardcoded redirect
      window.location.href = '/auth/login';
    });

  }, 100);
});