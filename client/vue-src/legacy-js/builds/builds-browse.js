/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

function openBuildsBrowse(){
  window.history.pushState('builds', '', '/builds/?sub_tab=browse');// Update URL
  socket.emit('requestPublishedBuilds');
  //startSpinnerSubLoader();
}

socket.on("returnPublishedBuilds", function(builds){

  builds = builds.sort(
    function(a, b) {
      let aRating = a.characters.length;
      let bRating = b.characters.length;
      if (aRating === bRating) {
        // Name is only important when ratings are the same
        return a.name > b.name ? 1 : -1;
      }
      return bRating - aRating;
    }
  );

  stopSpinnerSubLoader();
  $('#tabContent').html('');
  $('#tabContent').addClass('is-hidden');
  $('#tabContent').load("/templates/builds/display-browse.html");
  $.ajax({ type: "GET",
    url: "/templates/builds/display-browse.html",
    success : function(text)
    {

      $("#filterNameInput").blur(function(){
        if($('#filterNameInput').val() != ''){
          $('#filterNameInput').addClass('is-info');
        } else {
          $('#filterNameInput').removeClass('is-info');
        }
      });
      $("#filterDescInput").blur(function(){
        if($('#filterDescInput').val() != ''){
          $('#filterDescInput').addClass('is-info');
        } else {
          $('#filterDescInput').removeClass('is-info');
        }
      });$("#filterAuthorInput").blur(function(){
        if($('#filterAuthorInput').val() != ''){
          $('#filterAuthorInput').addClass('is-info');
        } else {
          $('#filterAuthorInput').removeClass('is-info');
        }
      });
      $("#filterRatingInput").blur(function(){
        if($('#filterRatingInput').val() != ''){
          $('#filterRatingInput').addClass('is-info');
        } else {
          $('#filterRatingInput').removeClass('is-info');
        }
      });

      // Search Filtering //
      $('#updateFilterButton').click(function(){
        filterBundleSearch(builds);
      });
      $(document).on('keypress',function(e) {
        if(e.which == 13) {
          filterBundleSearch(builds);
        }
      });
      filterBundleSearch(builds);

      $('#tabContent').removeClass('is-hidden');

    }
  });
});

function filterBundleSearch(builds){

  let nameFilter = $('#filterNameInput').val();
  let descFilter = $('#filterDescInput').val();
  let authorFilter = $('#filterAuthorInput').val();
  let ratingRelationFilter = $('#filterRatingRelationInput').val();
  let ratingFilter = $('#filterRatingInput').val();

  builds = new Set(builds);

  if(nameFilter != ''){
    console.log('Filtering by Name...');
    let parts = nameFilter.toUpperCase().split(' ');
    for(const build of builds){
      if(!textContainsWords(build.name, parts)){
        builds.delete(build);
      }
    }
  }

  if(descFilter != ''){
    console.log('Filtering by Description...');
    let parts = descFilter.toUpperCase().split(' ');
    for(const build of builds){
      if(!textContainsWords(build.description, parts)){
        builds.delete(build);
      }
    }
  }

  if(authorFilter != ''){
    console.log('Filtering by Author...');
    let parts = authorFilter.toUpperCase().split(' ');
    for(const build of builds){
      if(!textContainsWords(build.authorName, parts)){
        builds.delete(build);
      }
    }
  }

  if(ratingFilter != ''){
    console.log('Filtering by Rating...');
    let rating = parseInt(ratingFilter);
    for(const build of builds){
      let bundleRating = build.characters.length;
      switch(ratingRelationFilter) {
        case 'EQUAL': if(bundleRating === rating) {} else {builds.delete(build);} break;
        case 'LESS': if(bundleRating < rating) {} else {builds.delete(build);} break;
        case 'GREATER': if(bundleRating > rating) {} else {builds.delete(build);} break;
        case 'LESS-EQUAL': if(bundleRating <= rating) {} else {builds.delete(build);} break;
        case 'GREATER-EQUAL': if(bundleRating >= rating) {} else {builds.delete(build);} break;
        case 'NOT-EQUAL': if(bundleRating !== rating) {} else {builds.delete(build);} break;
        default: break;
      }
    }
  }

  displayBundleResults(builds);
}

function displayBundleResults(builds){
  $('#browsingList').html('');

  if(builds.size <= 0){
    $('#browsingList').html('<p class="has-text-centered is-italic">No results found!</p>');
    $('#searchResultCountContainer').html('<p class="is-italic has-txt-noted">(0 results found)</p>');
    return;
  }

  for(const build of builds){
    let entryID = 'bundle-entry-'+build.id;
    let rating = build.characters.length;
    let ratingColor = '';

    if(rating > 0){
      ratingColor = 'has-text-success';
    } else if (rating < 0) {
      ratingColor = 'has-text-danger';
    } else {
      ratingColor = 'has-text-warning';
    }

    let bundleName = build.name;
    if(build.hasKeys === 1){
      bundleName += '<sup class="has-txt-noted is-size-7 pl-1"><i class="fas fa-lock"></i></sup>';
    }

    $('#browsingList').append('<div id="'+entryID+'" class="columns is-mobile border-bottom border-dark-lighter cursor-clickable"><div class="column is-7"><span class="is-p is-size-5">'+bundleName+'</span></div><div class="column is-3"><span class="is-size-6 has-txt-noted is-italic">'+build.authorName+'</span></div><div class="column is-2" style="position: relative;"><span class="is-size-6 pr-2 '+ratingColor+'" style="position: absolute; top: 1px; right: 0px;">'+rating+'</span></div></div>');

    $('#'+entryID).click(function(){
      openBuildView(build.id);
    });

    $('#'+entryID).mouseenter(function(){
      $(this).addClass('has-bg-selectable-hover');
    });
    $('#'+entryID).mouseleave(function(){
      $(this).removeClass('has-bg-selectable-hover');
    });

  }

}