/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

// ~~~~~~~~~~~~~~ // General - Run On Load // ~~~~~~~~~~~~~~ //
$(function () {

  $('#leftQuickviewButton').click(function(event){
    event.stopImmediatePropagation();
    openLeftQuickView('skillsView', null);
  });

});