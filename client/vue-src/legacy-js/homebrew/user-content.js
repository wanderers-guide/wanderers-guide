/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

let g_homebrewBundles = null;

function openUserContent(){
  window.history.pushState('homebrew', '', '/homebrew/?sub_tab=content');// Update URL
  socket.emit('requestHomebrewBundles');
  //startSpinnerSubLoader();
}

socket.on("returnHomebrewBundles", function(homebrewBundles, canMakeHomebrew){
  g_homebrewBundles = homebrewBundles;
  
  stopSpinnerSubLoader();
  $('#tabContent').html('');
  $('#tabContent').addClass('is-hidden');
  $('#tabContent').load("/templates/homebrew/display-user-content.html");
  $.ajax({ type: "GET",
    url: "/templates/homebrew/display-user-content.html",
    success : function(text)
    {

      if(canMakeHomebrew){
        $('#createBundleBtn').click(function() {
          socket.emit('requestBundleCreate');
        });
      } else {
        $('#createBundleBtn').attr('disabled','disabled');
        $('#createBundleBtn').parent().addClass('has-tooltip-left has-tooltip-multiline');
        $('#createBundleBtn').parent().attr('data-tooltip', 'Only Wanderer tier patrons and up can create their own homebrew content. You can support us and what we\'re doing on Patreon!');
      }

      let foundPublished = false;
      let foundInProgess = false;
      for (const homebrewBundle of homebrewBundles) {
        if(homebrewBundle.isPublished == 1){
          foundPublished = true;

          let bundleViewID = 'bundle-'+homebrewBundle.id+'-view';
          let bundleManageKeysID = 'bundle-'+homebrewBundle.id+'-manage-keys';
          let bundleUpdateID = 'bundle-'+homebrewBundle.id+'-update';
          let bundleDeleteID = 'bundle-'+homebrewBundle.id+'-delete';

          let bundleName = homebrewBundle.name;
          let manageKeysHTML = '';
          if(homebrewBundle.hasKeys === 1){
            bundleName += '<sup class="has-txt-noted is-size-7 pl-1"><i class="fas fa-lock"></i></sup>';
            manageKeysHTML = '<button id="'+bundleManageKeysID+'" class="button is-outlined is-link">Manage Keys</button>';
          }

          $('#bundlesPublishedContainer').append('<div class="columns border-bottom border-dark-lighter"><div class="column is-6 text-center"><span class="is-size-5">'+bundleName+'</span></div><div class="column is-6"><div class="buttons are-small is-centered"><button id="'+bundleViewID+'" class="button is-outlined is-success">View</button>'+manageKeysHTML+'<button id="'+bundleUpdateID+'" class="button is-outlined is-info">Update</button><button id="'+bundleDeleteID+'" class="button is-outlined is-danger">Delete</button></div></div></div>');

          // View Button //
          $('#'+bundleViewID).click(function() {
            openBundleView(homebrewBundle);
          });

          // Manage Keys Button //
          if(homebrewBundle.hasKeys === 1){
            $('#'+bundleManageKeysID).click(function() {
              g_activeBundle = homebrewBundle;
              socket.emit('requestBundleKeys', g_activeBundle.id);
            });
          }

          // Update Button //
          if(canMakeHomebrew){
            $('#'+bundleUpdateID).click(function() {
              g_activeBundle = homebrewBundle;
              $('#bundle-update-published-modal').addClass('is-active');
              $('html').addClass('is-clipped');
            });
          } else {
            $('#'+bundleUpdateID).attr('disabled','disabled');
          }

          // Delete Button //
          $('#'+bundleDeleteID).click(function() {
            new ConfirmMessage('Delete “'+homebrewBundle.name+'”', '<p class="has-text-centered">Are you sure you want to delete this?</p><p class="has-text-centered">There are <span class="has-text-info">'+homebrewBundle.userHomebrewBundles.length+'</span> users still using the bundle.</p>', 'Delete', 'modal-delete-in-progress-bundle-'+homebrewBundle.id, 'modal-delete-in-progress-bundle-btn-'+homebrewBundle.id);
            $('#modal-delete-in-progress-bundle-btn-'+homebrewBundle.id).click(function() {
              socket.emit('requestBundleDelete', homebrewBundle.id);
            });
          });

        } else {
          foundInProgess = true;

          let bundleEditID = 'bundle-'+homebrewBundle.id+'-edit';
          let bundleDeleteID = 'bundle-'+homebrewBundle.id+'-delete';

          let bundleName = homebrewBundle.name;
          if(homebrewBundle.hasKeys === 1){
            bundleName += '<sup class="has-txt-noted is-size-7 pl-1"><i class="fas fa-lock"></i></sup>';
          }

          $('#bundlesInProgessContainer').append('<div class="columns border-bottom border-dark-lighter"><div class="column is-6 text-center"><span class="is-size-5">'+bundleName+'</span></div><div class="column is-6"><div class="buttons are-small is-centered"><button id="'+bundleEditID+'" class="button is-outlined is-info">Edit</button><button id="'+bundleDeleteID+'" class="button is-outlined is-danger">Delete</button></div></div></div>');

          if(canMakeHomebrew){
            $('#'+bundleEditID).click(function() {
              openBundleEditor(homebrewBundle);
            });
          } else {
            $('#'+bundleEditID).attr('disabled','disabled');
          }

          $('#'+bundleDeleteID).click(function() {
            new ConfirmMessage('Delete “'+homebrewBundle.name+'”', '<p class="has-text-centered">Are you sure you want to delete this?</p><p class="has-text-centered">There are <span class="has-text-info">'+homebrewBundle.userHomebrewBundles.length+'</span> users still using the bundle.</p>', 'Delete', 'modal-delete-published-bundle-'+homebrewBundle.id, 'modal-delete-published-bundle-btn-'+homebrewBundle.id);
            $('#modal-delete-published-bundle-btn-'+homebrewBundle.id).click(function() {
              socket.emit('requestBundleDelete', homebrewBundle.id);
            });
          });

        }
      }


      $('#bundle-update-published-modal-btn').click(function() {
        $('html').removeClass('is-clipped');
        socket.emit('requestBundleUpdatePublished', g_activeBundle.id);
      });
      $('#bundle-update-published-modal-background,#bundle-update-published-modal-close').click(function() {
        $('#bundle-update-published-modal').removeClass('is-active');
        $('html').removeClass('is-clipped');
        g_activeBundle = null;
      });
      
      if(!foundPublished){
        $('#bundlesPublishedContainer').html('<p class="has-text-centered has-txt-noted is-italic">None</p>');
      }
      if(!foundInProgess){
        $('#bundlesInProgessContainer').html('<p class="has-text-centered has-txt-noted is-italic">None</p>');
      }

      $('#tabContent').removeClass('is-hidden');
    }
  });
});

socket.on("returnBundleDelete", function(){
  openUserContent();
});

socket.on("returnBundleUpdatePublished", function(){
  openUserContent();
});