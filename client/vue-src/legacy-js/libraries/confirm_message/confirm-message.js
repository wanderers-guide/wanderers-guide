/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

class ConfirmMessage {
  constructor(title, description, buttonName, modalID, deleteBtnID, btnColor='is-danger') {
    this.title = title;
    this.description = description;
    this.modalID = modalID;
    this.deleteBtnID = deleteBtnID;
    $('#center-body').parent().append('<div id="'+modalID+'" class="modal modal-confirm-message" style="z-index: 1060;"><div id="'+modalID+'-background" class="modal-background"></div><div class="modal-card"><header class="modal-card-head"><p class="modal-card-title is-size-4 has-txt-value-number">'+title+'</p><button id="'+modalID+'-card-close" class="delete modal-card-close" aria-label="close"></button></header><section class="modal-card-body"><p class="has-txt-listing has-text-centered">'+description+'</p></section><footer class="modal-card-foot is-paddingless p-3 field is-grouped is-grouped-centered"><p class="control"><a class="button '+btnColor+' is-outlined" id="'+deleteBtnID+'">'+buttonName+'</a></p></footer></div></div>');
    $('#'+modalID+'-card-close').click(function() {
      $('#'+modalID).removeClass('is-active');
      $('html').removeClass('is-clipped');
      $('#'+modalID).remove();
    });
    $('#'+modalID+'-background').click(function() {
      $('#'+modalID).removeClass('is-active');
      $('html').removeClass('is-clipped');
      $('#'+modalID).remove();
    });
    $('#'+deleteBtnID).click(function() {
      $('#'+modalID).removeClass('is-active');
      $('html').removeClass('is-clipped');
      window.setTimeout(()=>{ $('#'+modalID).remove(); }, 300);
    });

    // Open Modal
    $('#'+modalID).addClass('is-active');
    $('html').addClass('is-clipped');
  }
}