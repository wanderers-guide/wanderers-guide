/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

let socket = io();

// ~~~~~~~~~~~~~~ // Run on Load // ~~~~~~~~~~~~~~ //
$(function () {
    
    $(".banner_w3lspvt-1").fadeTo(1000 , 1);



    $('#backReportBtn').click(function() {
        $('.modal').addClass('is-active');
        $('html').addClass('is-clipped');
    });
    $('.modal-card-close').click(function() {
        $('.modal').removeClass('is-active');
        $('html').removeClass('is-clipped');
    });
    $('.modal-background').click(function() {
        $('.modal').removeClass('is-active');
        $('html').removeClass('is-clipped');
    });

    $('#report-confirmation-btn').click(function() {
        let backgroundID = $("#backReportBtn").attr("name");
        let email = $("#inputEmail").val();
        let message = $("#reportMessage").val();
        if(message != "" && email != "") {
            $("#inputEmail").removeClass("is-danger");
            $("#reportMessage").removeClass("is-danger");
            socket.emit("requestBackgroundReport", 
                backgroundID,
                email,
                message);
        } else {
            if(message == "") {
                $("#reportMessage").addClass("is-danger");
            } else {
                $("#reportMessage").removeClass("is-danger");
            }
            if(email == "") {
                $("#inputEmail").addClass("is-danger");
            } else {
                $("#inputEmail").removeClass("is-danger");
            }
        }
    });

    // Switch main containers when in mobile
    if(isMobileView()){
      $('#home-desktop-layout').addClass('is-hidden');
      $('#home-mobile-layout').removeClass('is-hidden');
    }

    // Load Top Builds
    socket.emit("requestTopPublishedBuilds", 10);

    // Load Top Homebrew
    socket.emit("requestTopPublishedHomebrewBundles", 10);

});

socket.on("returnBackgroundReport", function() {
    window.location.href = '/';
});



socket.on("returnTopPublishedBuilds", function(builds) {
  $('#top-builds-loader').addClass('is-hidden');

  if(builds.size <= 0){
    $('#top-builds-list').html('<p class="has-text-centered is-italic">No results found!</p>');
  } else {
    for(const build of builds){
      let entryID = 'build-entry-'+build.id;
      let rating = build.characters.length;
      let ratingColor = '';

      if(rating > 0){
        ratingColor = 'has-text-success';
      } else if (rating < 0) {
        ratingColor = 'has-text-danger';
      } else {
        ratingColor = 'has-text-warning';
      }

      let buildName = build.name;

      $('#top-builds-list').append(`
        <div id="${entryID}" class="columns is-mobile border-bottom border-dark-lighter cursor-clickable">
          <div class="column is-12 pt-1 pb-0 pos-relative">
            <p class="is-size-6 text-overflow-ellipsis">${buildName}</p>
            <span class="is-p is-size-7 pr-2 ${ratingColor}" style="position: absolute; top: 1px; right: 0px;">${rating}</span>
            <p class="text-right is-size-7 has-txt-noted is-italic text-overflow-ellipsis">${build.authorName}</p>
          </div>
        </div>
      `);

      $('#'+entryID).click(function(){
        window.location.href = '/builds/?view_id='+build.id;
      });

      $('#'+entryID).mouseenter(function(){
        $(this).addClass('has-bg-selectable-hover');
      });
      $('#'+entryID).mouseleave(function(){
        $(this).removeClass('has-bg-selectable-hover');
      });

    }
  }

});


socket.on("returnTopPublishedHomebrewBundles", function(hBundles) {
  $('#top-homebrew-loader').addClass('is-hidden');

  if(hBundles.size <= 0){
    $('#top-homebrew-list').html('<p class="has-text-centered is-italic">No results found!</p>');
  } else {
    for(const homebrewBundle of hBundles){
      let entryID = 'bundle-entry-'+homebrewBundle.id;
      let rating = homebrewBundle.userHomebrewBundles.length;
      let ratingColor = '';

      if(rating > 0){
        ratingColor = 'has-text-success';
      } else if (rating < 0) {
        ratingColor = 'has-text-danger';
      } else {
        ratingColor = 'has-text-warning';
      }

      let bundleName = homebrewBundle.name;
      if(homebrewBundle.hasKeys === 1){
        bundleName += '<sup class="has-txt-noted is-size-7 pl-1"><i class="fas fa-lock"></i></sup>';
      }

      $('#top-homebrew-list').append(`
        <div id="${entryID}" class="columns is-mobile border-bottom border-dark-lighter cursor-clickable">
          <div class="column is-12 pt-1 pb-0 pos-relative">
            <p class="is-size-6 text-overflow-ellipsis">${bundleName}</p>
            <span class="is-p is-size-7 pr-2 ${ratingColor}" style="position: absolute; top: 1px; right: 0px;">${rating}</span>
            <p class="text-right is-size-7 has-txt-noted is-italic text-overflow-ellipsis">${homebrewBundle.authorName}</p>
          </div>
        </div>
      `);

      $('#'+entryID).click(function(){
        window.location.href = '/homebrew/?view_id='+homebrewBundle.id;
      });

      $('#'+entryID).mouseenter(function(){
        $(this).addClass('has-bg-selectable-hover');
      });
      $('#'+entryID).mouseleave(function(){
        $(this).removeClass('has-bg-selectable-hover');
      });

    }
  }

});