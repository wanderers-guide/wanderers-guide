/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

let g_mobile_menu_active = false;

$(function () {

  $('.nav-menu-toggle').click(function(){
    g_mobile_menu_active = !g_mobile_menu_active;
    updateMobileMenu();
  });

  $(window).resize(function() {
    if($('.nav-menu-toggle').is(':hidden')){
      g_mobile_menu_active = false;
      updateMobileMenu();
    }
  });

});

function updateMobileMenu() {
  $('#mobile-nav-menu-container').html('');
  if(g_mobile_menu_active) {
    $('.nav-menu-toggle').addClass('is-active');

    $('#mobile-nav-menu-container').html('<div id="mobile-nav-menu"></div>');

    $('.nav-menu > li').each(function() {
      let aHTML = $(this).find('a').parent().html();
      if(aHTML.includes('/browse')) {
        aHTML = '<a href="/browse">Search <i class="fas fa-search"></i></a>';
      }
      if(aHTML.includes('profile-header-icon')) {
        
        $('#mobile-nav-menu').append('<hr class="m-1 border-light">');
        $(this).find('li').each(function() {
          let aSubHTML = $(this).find('a').parent().html();
          $('#mobile-nav-menu').append(aSubHTML);
        });

      } else {
        $('#mobile-nav-menu').append(aHTML);
      }
    });

  } else {
    $('.nav-menu-toggle').removeClass('is-active');
  }

}