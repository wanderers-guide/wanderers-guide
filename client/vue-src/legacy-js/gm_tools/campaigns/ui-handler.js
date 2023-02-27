
let activeModalCampaign = null;
let campaignMap = new Map();

let socket = io();

$(function () {

  for (let campaign of rawCampaigns) {
    campaignMap.set(campaign.id + '', campaign);
  }

  let campaignCards = $('.campaign-card');
  for (const campaignCard of campaignCards) {

    let campaignID = $(campaignCard).attr('data-campaign-id');
    let cardContent = $(campaignCard).find('.card-content');
    let cardEdit = $(campaignCard).find('.campaign-card-edit');
    let cardDelete = $(campaignCard).find('.campaign-card-delete');

    cardContent.mouseenter(function () {
      $(this).addClass('card-content-hover');
    });
    cardContent.mouseleave(function () {
      $(this).removeClass('card-content-hover');
    });
    cardContent.click(function () {
      openViewCampaign(campaignID+'');
    });

    cardEdit.mouseenter(function () {
      $(this).addClass('card-footer-hover');
    });
    cardEdit.mouseleave(function () {
      $(this).removeClass('card-footer-hover');
    });
    cardEdit.click(function () {
      openEditCampaign(campaignMap.get(campaignID + ''));
    });

    cardDelete.mouseenter(function () {
      $(this).addClass('card-footer-hover');
    });
    cardDelete.mouseleave(function () {
      $(this).removeClass('card-footer-hover');
    });
    cardDelete.click(function () {
      activeModalCampaign = campaignMap.get(campaignID + '');
      new ConfirmMessage('Delete “' + activeModalCampaign.name + '”', '<p class="has-text-centered">Are you sure you want to delete this campaign?</p>', 'Delete', 'modal-delete-campaign', 'modal-delete-campaign-btn');
      $('#modal-delete-campaign-btn').click(function () {
        socket.emit(`requestDeleteCampaign`, campaignID);
        activeModalCampaign = null;
      });
    });

  }

  $('.modal-card-close, .modal-background').click(function () {
    $('.modal').removeClass('is-active');
    $('html').removeClass('is-clipped');
    activeModalCampaign = null;
  });

  $(`#campaign-create-btn`).click(() => {
    socket.emit(`requestAddCampaign`);
  });

  handleCampaignForwardingFromURL();
});

socket.on('returnAddCampaign', (campaign) => {
  window.location.reload(true);
});

socket.on('returnDeleteCampaign', () => {
  window.location.reload(true);
});

socket.on('returnEditCampaign', () => {
  $('#inputCampaignName').parent().removeClass("is-loading");
  $('#inputCampaignDescription').parent().removeClass("is-loading");
  $('#inputCampaignImageURL').parent().removeClass("is-loading");

  $('#selectCampaignOption-DisplayPlayerHealth').parent().removeClass("is-loading");
});


function openViewCampaign(campaignID) {
  window.history.pushState({}, null, '/gm-tools/campaigns/'+campaignID);
  new DisplayCampaign('campaigns-container', campaignID);
}

function openEditCampaign(campaign) {

  activeModalCampaign = campaign;

  $("#inputCampaignName").val(activeModalCampaign.name);
  $("#inputCampaignDescription").val(activeModalCampaign.description);
  $("#inputCampaignImageURL").val(activeModalCampaign.imageURL);

  $(`#selectCampaignOption-DisplayPlayerHealth option[value="${activeModalCampaign.optionDisplayPlayerHealth}"]`).attr('selected', 'selected');

  $('#editModalDefault').addClass('is-active');
  $('html').addClass('is-clipped');

  $("#inputCampaignName, #inputCampaignDescription, #inputCampaignImageURL, #selectCampaignOption-DisplayPlayerHealth").off('blur');
  $("#inputCampaignName, #inputCampaignDescription, #inputCampaignImageURL, #selectCampaignOption-DisplayPlayerHealth").blur(function(){

    let name = $('#inputCampaignName').val();
    let description = $('#inputCampaignDescription').val();
    let imageURL = $('#inputCampaignImageURL').val();

    let optionDisplayPlayerHealth = parseInt($('#selectCampaignOption-DisplayPlayerHealth').val());

    if(activeModalCampaign.name != name
        || activeModalCampaign.description != description
        || activeModalCampaign.imageURL != imageURL
        || activeModalCampaign.optionDisplayPlayerHealth != optionDisplayPlayerHealth){

      $(this).parent().addClass("is-loading");

      if(name.trim() == ''){
        name = 'Unnamed Campaign';
        $("#inputCampaignName").val(name);
      }
      
      socket.emit(`requestEditCampaign`, activeModalCampaign.id, {
        name: name,
        description: description,
        imageURL: imageURL,
        optionDisplayPlayerHealth: optionDisplayPlayerHealth,
      });

      activeModalCampaign.name = name;
      activeModalCampaign.description = description;
      activeModalCampaign.imageURL = imageURL;

      activeModalCampaign.optionDisplayPlayerHealth = optionDisplayPlayerHealth;

      $(`#campaign-${activeModalCampaign.id}-name`).text(activeModalCampaign.name);

    }
  });

}


/* Handle campaign opening from URL id */
function handleCampaignForwardingFromURL(){

  let campaignID = parseInt(window.location.pathname.split("campaigns/")[1]);
  if(!isNaN(campaignID) && campaignMap.get(campaignID+'') != null){
    openViewCampaign(campaignID+'');
  }

}