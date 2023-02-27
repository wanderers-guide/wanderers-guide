/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

$(function () {
  setInterval(() => {
    $('.has-back-to-top').each(function() {

      let surroundingDiv = $(this);
      let backToTopBtn = $(this).children('.back-to-top-btn');

      if(backToTopBtn.length == 0){

        if(surroundingDiv.hasClass('no-tooltip')){
          surroundingDiv.append(`
            <span class="back-to-top-btn is-hidden pos-absolute pos-r-5 pos-b-5 icon is-medium has-text-info cursor-clickable">
              <i class="fas fa-arrow-up"></i>
            </span>
          `);
        } else {
          surroundingDiv.append(`
            <span class="back-to-top-btn is-hidden pos-absolute pos-r-5 pos-b-5 icon is-medium has-text-info cursor-clickable has-tooltip-bottom" data-tooltip="Back to Top">
              <i class="fas fa-arrow-up"></i>
            </span>
          `);
        }

        backToTopBtn = surroundingDiv.find('.back-to-top-btn');
        backToTopBtn.off();
        backToTopBtn.click(function() {
          surroundingDiv[0].scrollIntoView();
        });

      }

      if(surroundingDiv[0].scrollHeight > $(window).height()){
        if(!backToTopBtn.is(":visible")){
          backToTopBtn.removeClass('is-hidden');
        }
      } else {
        if(backToTopBtn.is(":visible")){
          backToTopBtn.addClass('is-hidden');
        }
      }

    });

  }, 1000);// Every 1 second
});