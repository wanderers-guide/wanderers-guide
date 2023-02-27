/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/


function openUserCollection(){
  window.history.pushState('homebrew', '', '/homebrew/?sub_tab=collection');// Update URL
  socket.emit('requestCollectedHomebrewBundles');
  //startSpinnerSubLoader();
}

socket.on("returnCollectedHomebrewBundles", function(hBundles){
  stopSpinnerSubLoader();
  $('#tabContent').html('');
  $('#tabContent').addClass('is-hidden');
  $('#tabContent').load("/templates/homebrew/display-user-collection.html");
  $.ajax({ type: "GET",
    url: "/templates/homebrew/display-user-collection.html",
    success : function(text)
    {

      let foundBundle = false;
      for (const hBundle of hBundles) {
        if(!foundBundle){
          foundBundle = true;
        } else {
          $('#bundlesContainer').append('<hr class="mx-5 my-1">');
        }

        let homebrewBundle = hBundle.homebrewBundle;

        let bundleViewID = 'bundle-'+homebrewBundle.id+'-view';
        let bundleRemoveID = 'bundle-'+homebrewBundle.id+'-remove';

        let bundleName = homebrewBundle.name;
        if(homebrewBundle.isPublished === 0){
          bundleName += '<sup class="has-text-info is-size-7 pl-1"><i class="fa fa-wrench"></i></sup>';
        }

        $('#bundlesContainer').append('<div class="columns is-marginless"><div class="column is-6 text-center"><span class="is-size-5">'+bundleName+'</span></div><div class="column is-6"><div class="buttons are-small is-centered"><button id="'+bundleViewID+'" class="button is-outlined is-success">View</button><button id="'+bundleRemoveID+'" class="button is-outlined is-danger">Remove</button></div></div></div>');

        $('#'+bundleViewID).click(function() {
          openBundleView(homebrewBundle);
        });

        $('#'+bundleRemoveID).click(function() {
          new ConfirmMessage('Remove from Collection', 'Are you sure you want to remove this bundle from your collection? Any content your characters are using from the bundle will be removed.', 'Remove', 'modal-remove-collection-bundle-'+homebrewBundle.id, 'modal-remove-collection-bundle-btn-'+homebrewBundle.id);
          $('#modal-remove-collection-bundle-btn-'+homebrewBundle.id).click(function() {
            socket.on("returnBundleChangeCollection", function(toAdd, isSuccess){
              socket.off('returnBundleChangeCollection');
              openUserCollection();
            });
            socket.emit('requestBundleChangeCollection', homebrewBundle.id, false);
          });
        });

      }

      if(!foundBundle){
        $('#bundlesContainer').html('<p class="has-text-centered is-italic is-size-7">Your collection is empty. Go browse and find some homebrew to use with your characters!</p>');
      }

      $('#tabContent').removeClass('is-hidden');
    }
  });
});

