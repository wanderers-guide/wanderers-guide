/* Copyright (C) 2022, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/


$(function () {

  $('#campaignsSelectModalBackground').click(function () {
    closeSelectCampaignModal();
  });
  $('#campaignsSelectModalCloseButton').click(function () {
    closeSelectCampaignModal();
  });

});


function openSelectCampaignModal() {

  $('#campaignsSelectModalContent').html('');

  for (const campaign of g_campaigns) {

    let campaignSectionID = 'campaignSection' + campaign.id;

    $('#campaignsSelectModalContent').append('<div id="' + campaignSectionID + '" class="tile is-parent is-paddingless cursor-clickable"><div class="tile is-child"><p class="has-text-centered is-size-5 py-3 border-bottom border-dark">' + campaign.name + '</p></div></div>');

    $('#' + campaignSectionID).mouseenter(function () {
      $(this).addClass('has-bg-selectable');
    });
    $('#' + campaignSectionID).mouseleave(function () {
      $(this).removeClass('has-bg-selectable');
    });

    $('#' + campaignSectionID).click(function () {
      allEncounters[currentEncounterIndex].campaignID = campaign.id;
      displayEncounter(currentEncounterIndex);
      closeSelectCampaignModal();
      openCampaignView(allEncounters[currentEncounterIndex].campaignID);
    });

  }

  $('#campaignsSelectModalDefault').addClass('is-active');
  $('html').addClass('is-clipped');

}

function closeSelectCampaignModal() {

  $('#campaignsSelectModalDefault').removeClass('is-active');
  $('html').removeClass('is-clipped');

}



/* Open Campaign View */

function openCampaignView(campaignID) {

  let modalID = 'campaignViewModal';
  let title = 'Campaign';

  $('#center-body').parent().append(`
      <div id="${modalID}" class="modal modal-selection" style="z-index: 29;">
        <div id="${modalID}-background" class="modal-background"></div>
        <div class="modal-card is-wider">
          <header class="modal-card-head">
            <p class="modal-card-title is-size-4 has-txt-value-number">${title}</p>
            <button id="${modalID}-card-close" class="delete modal-card-close" aria-label="close"></button>
          </header>
          <section class="modal-card-body is-paddingless">
            <div class="columns is-marginless is-mobile">
              <div class="column is-paddingless use-custom-scrollbar is-darker pos-relative" style="overflow-y: auto; overflow-x: hidden; height: calc(100vh - 200px); max-height: calc(100vh - 200px);">
                <div id="${modalID}-view">
                </div>
                <div class="subpageloader is-hidden"><div class="lds-roller"><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div></div></div>
              </div>
            </div>
          </section>
          <footer class="modal-card-foot">
          </footer>
        </div>
      </div>
  `);
  $('#' + modalID + '-card-close, #' + modalID + '-background').click(function () {
    $('#' + modalID).removeClass('is-active');
    $('html').removeClass('is-clipped');
    $('#' + modalID).remove();
  });

  // Allow quickview to close by clicking on modal
  $('#'+modalID).click(function(){
    if($('#quickviewDefault').hasClass('quickview-auto-close-protection')){
      $('#quickviewDefault').removeClass('quickview-auto-close-protection');
    } else {
      closeQuickView();
    }
  });

  // Delete any generated display containers
  $('.generated-display-container').each(function() {
    $(this).remove();
  });

  new DisplayCampaign(modalID+'-view', campaignID+'', false, true);

  // Open Modal
  $('#'+modalID).addClass('is-active');
  $('html').addClass('is-clipped');

}