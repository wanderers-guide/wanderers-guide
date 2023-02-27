/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/


$(function () {
  setInterval(() => {
    showMoreCheck();
  }, 1000);// Every 1 second
});

function showMoreCheck(){
  $('.reveal-container-text').each(function() {

    //if(!$(this).hasClass('is-event-binded')){
      //$(this).addClass('is-event-binded');

      let revealText = $(this);
      let fadeContainer = $(this).parent().find('.fading-reveal-container');

      if(hasGreaterHeight(fadeContainer, 380)) {

        revealText.removeClass('is-hidden');
        fadeContainer.addClass('is-enabled');

        revealText.off('click');
        revealText.click(function() {
          if(fadeContainer.hasClass('is-active')) {
            fadeContainer.removeClass('is-active');
            $(this).text('Show Less');
          } else {
            fadeContainer.addClass('is-active');
            $(this).text('Show More');
            fadeContainer[0].scrollIntoView();
          }
        });

      } else {

        revealText.addClass('is-hidden');
        fadeContainer.removeClass('is-enabled');

      }

    //}

  });
}