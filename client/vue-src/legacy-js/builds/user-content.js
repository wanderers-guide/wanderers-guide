/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

function openUserContent(){
  window.history.pushState('builds', '', '/builds/?sub_tab=content');// Update URL
  socket.emit('requestUserBuilds');
  //startSpinnerSubLoader();
}

socket.on("returnUserBuilds", function(builds){
  
  stopSpinnerSubLoader();
  $('#tabContent').html('');
  $('#tabContent').addClass('is-hidden');
  $('#tabContent').load("/templates/builds/display-user-content.html");
  $.ajax({ type: "GET",
    url: "/templates/builds/display-user-content.html",
    success : function(text)
    {

      $('#createBuildBtn').click(function() {
        socket.emit('requestBuildCreate');
      });

      let foundPublished = false;
      let foundInProgess = false;
      for (const build of builds) {
        if(build.isPublished == 1){
          foundPublished = true;

          let buildViewID = 'build-'+build.id+'-view';
          let buildUpdateID = 'build-'+build.id+'-update';
          let buildDeleteID = 'build-'+build.id+'-delete';

          $('#buildsPublishedContainer').append('<div class="columns border-bottom border-dark-lighter"><div class="column is-6 text-center"><span class="is-p is-size-5">'+build.name+'</span></div><div class="column is-6"><div class="buttons are-small is-centered"><button id="'+buildViewID+'" class="button is-outlined is-success">View</button><button id="'+buildUpdateID+'" class="button is-outlined is-info">Update</button><button id="'+buildDeleteID+'" class="button is-outlined is-danger">Delete</button></div></div></div>');

          // View Button //
          $('#'+buildViewID).click(function() {
            openBuildView(build.id);
          });

          // Update Button //
          $('#'+buildUpdateID).click(function() {
            g_activeBuild = build;
            $('#build-update-published-modal').addClass('is-active');
            $('html').addClass('is-clipped');
          });

          // Delete Button //
          $('#'+buildDeleteID).click(function() {
            new ConfirmMessage('Delete “'+build.name+'”', '<p class="has-text-centered">Are you sure you want to delete this?</p><p class="has-text-centered">There are <span class="has-text-info">'+'???'+'</span> users still using this build.</p>', 'Delete', 'modal-delete-in-progress-build-'+build.id, 'modal-delete-in-progress-build-btn-'+build.id);
            $('#modal-delete-in-progress-build-btn-'+build.id).click(function() {
              socket.emit('requestBuildDelete', build.id);
            });
          });

        } else {
          foundInProgess = true;

          let buildViewID = 'build-'+build.id+'-view';
          let buildEditID = 'build-'+build.id+'-edit';
          let buildDeleteID = 'build-'+build.id+'-delete';

          $('#buildsInProgessContainer').append('<div class="columns border-bottom border-dark-lighter"><div class="column is-6 text-center"><span class="is-p is-size-5">'+build.name+'</span></div><div class="column is-6"><div class="buttons are-small is-centered"><button id="'+buildViewID+'" class="button is-outlined is-success">View</button><button id="'+buildEditID+'" class="button is-outlined is-info">Edit</button><button id="'+buildDeleteID+'" class="button is-outlined is-danger">Delete</button></div></div></div>');

          // View Button //
          $('#'+buildViewID).click(function() {
            openBuildView(build.id);
          });

          // Update Button //
          $('#'+buildEditID).click(function() {
            window.location.href = '/builds/create/?build_id='+build.id+'&page=init';
          });

          // Delete Button //
          $('#'+buildDeleteID).click(function() {
            new ConfirmMessage('Delete “'+build.name+'”', '<p class="has-text-centered">Are you sure you want to delete this?</p><p class="has-text-centered">There are <span class="has-text-info">'+'???'+'</span> users still using this build.</p>', 'Delete', 'modal-delete-published-build-'+build.id, 'modal-delete-published-build-btn-'+build.id);
            $('#modal-delete-published-build-btn-'+build.id).click(function() {
              socket.emit('requestBuildDelete', build.id);
            });
          });

        }
      }


      $('#build-update-published-modal-btn').click(function() {
        $('html').removeClass('is-clipped');
        socket.emit('requestBuildUpdate', g_activeBuild.id);
      });
      $('#build-update-published-modal-background,#build-update-published-modal-close').click(function() {
        $('#build-update-published-modal').removeClass('is-active');
        $('html').removeClass('is-clipped');
        g_activeBuild = null;
      });
      
      if(!foundPublished){
        $('#buildsPublishedContainer').html('<p class="has-text-centered has-txt-noted is-italic">None</p>');
      }
      if(!foundInProgess){
        $('#buildsInProgessContainer').html('<p class="has-text-centered has-txt-noted is-italic">None</p>');
      }

      $('#tabContent').removeClass('is-hidden');
    }
  });
});

socket.on("returnBuildCreate", function(build){
  window.location.href = '/builds/create/?build_id='+build.id+'&page=init';
});

socket.on("returnBuildDelete", function(){
  openUserContent();
});

socket.on("returnBuildUpdate", function(){
  openUserContent();
});