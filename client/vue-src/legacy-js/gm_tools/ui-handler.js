/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

$(function () {

  $('.card-active').mouseenter(function(){
    $(this).addClass('card-content-hover');
  });
  $('.card-active').mouseleave(function(){
    $(this).removeClass('card-content-hover');
  });

  $('#card-encounter-builder').click(function() {
    window.location.href = '/gm-tools/encounter-builder';
  });
  $('#card-shop-generator').click(function() {
    window.location.href = '/gm-tools/shop-generator';
  });
  $('#card-campaigns').click(function() {
    window.location.href = '/gm-tools/campaigns';
  });

});