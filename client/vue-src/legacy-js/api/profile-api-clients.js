/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

let g_allAPIClients = null;
let g_openAPIClient = null;

// ~~~~~~~~~~~~~~ // Run on Load // ~~~~~~~~~~~~~~ //
$(function () {

  socket.emit("requestAllAPIClients");

  $('#add-new-client-btn').click(function() {
    $('.create-modal').find(".inputAppName").val(null);
    $('.create-modal').find(".inputAppDescription").val(null);
    $('.create-modal').find(".inputCompanyName").val(null);
    $('.create-modal').find(".inputIconURL").val(null);
    $('.create-modal').find(".inputRedirectURI").val(null);
    $('.create-modal').find(".inputAppPermissions").val('READ-ONLY');

    $('.create-modal').addClass('is-active');
    $('html').addClass('is-clipped');
  });
  $('.modal-card-close').click(function() {
    closeModals();
    g_openAPIClient = null;
  });
  $('.modal-background').click(function() {
    closeModals();
    g_openAPIClient = null;
  });

  $('#create-client-btn').click(function() {
    let appName = $('.create-modal').find(".inputAppName").val();
    let description = $('.create-modal').find(".inputAppDescription").val();
    let companyName = $('.create-modal').find(".inputCompanyName").val();
    let iconURL = $('.create-modal').find(".inputIconURL").val();
    let redirectURI = $('.create-modal').find(".inputRedirectURI").val();
    let appPermissions = $('.create-modal').find(".inputAppPermissions").val();

    let rURIMatch = redirectURI.match(/((([A-Za-z]{3,9}:(?:\/\/)?)(?:[\-;:&=\+\$,\w]+@)?[A-Za-z0-9\.\-]+|(?:www\.|[\-;:&=\+\$,\w]+@)[A-Za-z0-9\.\-]+)((?:\/[\+~%\/\.\w\-_]*)?\??(?:[\-\+=&;%@\.\w_]*)#?(?:[\.\!\/\\\w]*))?)/);
    if(appName != "" && (redirectURI != "" && rURIMatch != null)) {
        $('.create-modal').find(".inputAppName").removeClass("is-danger");
        $('.create-modal').find(".inputRedirectURI").removeClass("is-danger");
        socket.emit("requestAPIClientAdd",{
            appName,
            description,
            companyName,
            iconURL,
            redirectURI,
            appPermissions
        });
    } else {
        if(appName == "") {
            $('.create-modal').find(".inputAppName").addClass("is-danger");
        } else {
            $('.create-modal').find(".inputAppName").removeClass("is-danger");
        }
        if(redirectURI == "" || rURIMatch == null) {
            $('.create-modal').find(".inputRedirectURI").addClass("is-danger");
        } else {
            $('.create-modal').find(".inputRedirectURI").removeClass("is-danger");
        }
    }
  });

  $('#update-client-btn').click(function() {
    let clientID = g_openAPIClient.clientID;
    let apiKey = g_openAPIClient.apiKey;

    let appName = $('.update-modal').find(".inputAppName").val();
    let description = $('.update-modal').find(".inputAppDescription").val();
    let companyName = $('.update-modal').find(".inputCompanyName").val();
    let iconURL = $('.update-modal').find(".inputIconURL").val();
    let redirectURI = $('.update-modal').find(".inputRedirectURI").val();
    let appPermissions = $('.update-modal').find(".inputAppPermissions").val();

    let rURIMatch = redirectURI.match(/((([A-Za-z]{3,9}:(?:\/\/)?)(?:[\-;:&=\+\$,\w]+@)?[A-Za-z0-9\.\-]+|(?:www\.|[\-;:&=\+\$,\w]+@)[A-Za-z0-9\.\-]+)((?:\/[\+~%\/\.\w\-_]*)?\??(?:[\-\+=&;%@\.\w_]*)#?(?:[\.\!\/\\\w]*))?)/);
    if(appName != "" && (redirectURI != "" && rURIMatch != null)) {
        $('.update-modal').find(".inputAppName").removeClass("is-danger");
        $('.update-modal').find(".inputRedirectURI").removeClass("is-danger");
        socket.emit("requestAPIClientUpdate",{
            clientID,
            apiKey,
            appName,
            description,
            companyName,
            iconURL,
            redirectURI,
            appPermissions
        });
    } else {
        if(appName == "") {
            $('.update-modal').find(".inputAppName").addClass("is-danger");
        } else {
            $('.update-modal').find(".inputAppName").removeClass("is-danger");
        }
        if(redirectURI == "" || rURIMatch == null) {
            $('.update-modal').find(".inputRedirectURI").addClass("is-danger");
        } else {
            $('.update-modal').find(".inputRedirectURI").removeClass("is-danger");
        }
    }
  });

  $('#delete-client-btn').click(function() {
    let clientID = g_openAPIClient.clientID;
    let apiKey = g_openAPIClient.apiKey;
    socket.emit("requestAPIClientDelete",{
      clientID,
      apiKey,
    });
  });

});

socket.on("returnAllAPIClients", function(allAPIClients) {
  displayAllClients(allAPIClients);
});

socket.on("returnAPIClientAdd", function(apiClient, allAPIClients) {
  displayAllClients(allAPIClients);
  closeModals();
});

socket.on("returnAPIClientDelete", function(allAPIClients) {
  displayAllClients(allAPIClients);
  closeModals();
});

socket.on("returnAPIClientUpdate", function(allAPIClients) {
  displayAllClients(allAPIClients);
  closeModals();
});

socket.on("returnAPIClientRefreshKey", function(allAPIClients) {
  displayAllClients(allAPIClients);
});

function closeModals(){
  $('.modal').removeClass('is-active');
  $('html').removeClass('is-clipped');
}

function checkClientLimit(){
  if(g_allAPIClients.length >= 3){
    $('#add-new-client-btn').addClass('is-hidden');
  } else {
    $('#add-new-client-btn').removeClass('is-hidden');
  }
}

function displayAllClients(allAPIClients) {
  g_allAPIClients = allAPIClients;
  checkClientLimit();

  $('#clients-section').html('');

  for(let apiClient of allAPIClients){

    let clientDataEntryID = 'clientEntry-'+apiClient.clientID;
    let clientEntryDetailsID = clientDataEntryID+'-details';
    let clientEditIconID = clientDataEntryID+'-editIcon';
    let clientDeleteIconID = clientDataEntryID+'-deleteIcon';
    let clientViewIconID = clientDataEntryID+'-viewIcon';
    let clientChevronID = clientDataEntryID+'-viewChevron';
    let clientRefreshKeyID = clientDataEntryID+'-refreshKey';

    $('#clients-section').append('<div id="'+clientDataEntryID+'" class="client-info-entry"><div class="columns is-mobile is-gapless is-marginless"><div class="column is-narrow is-8"><p class="has-text-left pl-2 is-bold">'+apiClient.appName+'</p></div><div class="column is-narrow is-4"><span id="'+clientEditIconID+'" class="icon cursor-clickable"><i class="fas fa-sm fa-edit"></i></span><span id="'+clientDeleteIconID+'" class="icon cursor-clickable"><i class="fas fa-sm fa-trash"></i></span><span id="'+clientViewIconID+'" class="icon cursor-clickable"><i id="'+clientChevronID+'" class="fas fa-sm fa-chevron-down"></i></span></div></div><div id="'+clientEntryDetailsID+'" class="is-hidden"><hr class="hr-light mt-0 mb-2 mx-0"><div class="px-2"><p class="is-bold">Client ID</p><p class="is-size-7">'+apiClient.clientID+'</p><p class="is-bold">API Key</p><p class="is-size-7">'+apiClient.apiKey+'</p></div><a id="'+clientRefreshKeyID+'" class="button is-success is-very-small is-outlined is-rounded my-1"><span>Refresh Key</span></a></div></div>');

    $('#'+clientEditIconID).click(function() {
      g_openAPIClient = apiClient;
      openUpdateClientModal();
    });

    $('#'+clientDeleteIconID).click(function() {
      g_openAPIClient = apiClient;
      openDeleteClientModal();
    });

    $('#'+clientViewIconID).click(function() {
      if($('#'+clientEntryDetailsID).hasClass("is-hidden")) {
        $('#'+clientEntryDetailsID).removeClass('is-hidden');
        $('#'+clientChevronID).removeClass('fa-chevron-down');
        $('#'+clientChevronID).addClass('fa-chevron-up');
      } else {
        $('#'+clientEntryDetailsID).addClass('is-hidden');
        $('#'+clientChevronID).removeClass('fa-chevron-up');
        $('#'+clientChevronID).addClass('fa-chevron-down');
      }
    });

    $('#'+clientRefreshKeyID).click(function() {
      socket.emit("requestAPIClientRefreshKey",{
        clientID: apiClient.clientID,
        apiKey: apiClient.apiKey,
      });
    });

  }

}

function openUpdateClientModal(){
  let apiClient = g_openAPIClient;
  if(apiClient == null) {return;}

  $('.update-modal').find(".inputAppName").val(apiClient.appName);
  $('.update-modal').find(".inputAppDescription").val(apiClient.description);
  $('.update-modal').find(".inputCompanyName").val(apiClient.companyName);
  $('.update-modal').find(".inputIconURL").val(apiClient.iconURL);
  $('.update-modal').find(".inputRedirectURI").val(apiClient.redirectURI);
  $('.update-modal').find(".inputAppPermissions").val(apiClient.accessRights);

  $('.update-modal').addClass('is-active');
  $('html').addClass('is-clipped');

}

function openDeleteClientModal(){
  $('.delete-modal').addClass('is-active');
  $('html').addClass('is-clipped');
}