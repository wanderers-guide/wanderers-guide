/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

class DisplayUniHeritage {
  constructor(containerID, uniHeritageID, featMap, homebrewID=null, backButton=true) {
    startSpinnerSubLoader();

    featMap = new Map([...featMap.entries()].sort(
      function(a, b) {
          if (a[1].Feat.level === b[1].Feat.level) {
              // Name is only important when levels are the same
              return a[1].Feat.name > b[1].Feat.name ? 1 : -1;
          }
          return a[1].Feat.level - b[1].Feat.level;
      })
    );

    let uniHeritageDisplayContainerID = 'uni-heritage-container-'+uniHeritageID;
    $('#'+containerID).parent().append('<div id="'+uniHeritageDisplayContainerID+'" class="generated-display-container is-hidden"></div>');
    $('#'+containerID).addClass('is-hidden');

    socket.emit('requestGeneralUniHeritage', uniHeritageID, homebrewID);
    socket.off('returnGeneralUniHeritage');
    socket.on("returnGeneralUniHeritage", function(uniHeritageStruct){
      $('#'+uniHeritageDisplayContainerID).load("/templates/display-uni-heritage.html");
      $.ajax({ type: "GET",
        url: "/templates/display-uni-heritage.html",
        success : function(text)
        {
          stopSpinnerSubLoader();

          if(backButton){
            $('#uni-heritage-back-btn').removeClass('is-hidden');
            $('#uni-heritage-back-btn').click(function() {
              $('#'+uniHeritageDisplayContainerID).remove();
              $('#'+containerID).removeClass('is-hidden');
            });
            $('.category-tabs li').click(function() {
              $('#'+uniHeritageDisplayContainerID).remove();
              $('#'+containerID).removeClass('is-hidden');
            });
          }

          $('#uni-heritage-name').html(uniHeritageStruct.heritage.name);
          $('#uni-heritage-description').html(processText(uniHeritageStruct.heritage.description, false, false, 'MEDIUM', false));

          if(typeof g_isDeveloper !== 'undefined' && g_isDeveloper && uniHeritageStruct.heritage.code != null && uniHeritageStruct.heritage.code.trim() != '') {
            $('#uni-heritage-code').html('');
            $('#uni-heritage-code').append('<hr class="m-3">');
            $('#uni-heritage-code').append('<p class="is-size-6 is-bold pl-2">WSC Statements</p>');
            
            let codeHTML = '';
            for(let codeStatement of uniHeritageStruct.heritage.code.split(/\n/)){
              codeHTML += '<p class="is-size-7">'+codeStatement+'</p>';
            }
            $('#uni-heritage-code').append('<div class="code-block">'+codeHTML+'</div>');
          }

          if(uniHeritageStruct.heritage.artworkURL != null){
            $('#uni-heritage-artwork-img').removeClass('is-hidden');
            $('#uni-heritage-artwork-img').attr('src', uniHeritageStruct.heritage.artworkURL);
          } else {
            $('#uni-heritage-artwork-img').addClass('is-hidden');
            $('#uni-heritage-artwork-img').attr('src', '');
          }

          let sourceTextName = getContentSourceTextName(uniHeritageStruct.heritage.contentSrc);
          let sourceLink = getContentSourceLink(uniHeritageStruct.heritage.contentSrc);
          if(uniHeritageStruct.heritage.homebrewID != null){
            sourceTextName = 'Bundle #'+uniHeritageStruct.heritage.homebrewID;
            sourceLink = '/homebrew/?view_id='+uniHeritageStruct.heritage.homebrewID;
          }
          let sourceStr = '<a class="has-txt-noted" href="'+sourceLink+'" target="_blank">'+sourceTextName+'</a><span class="has-txt-faded">, #'+uniHeritageStruct.heritage.id+'</span>';

          let uniHeritageRarity = convertRarityToHTML(uniHeritageStruct.heritage.rarity);
          if(uniHeritageRarity != ''){ sourceStr = '<span class="pr-2">'+sourceStr+'</span>'; }
          $('#uni-heritage-source').html(sourceStr+uniHeritageRarity);

          ///

          let uniHeritageFeatLevel = 0;
          for(const [featID, featStruct] of featMap.entries()){
            let tag = featStruct.Tags.find(tag => {
              return tag.id === uniHeritageStruct.heritage.tagID;
            });
            if(tag != null){
              if(featStruct.Feat.level <= 0) { continue; }
              if(featStruct.Feat.level > uniHeritageFeatLevel){
                uniHeritageFeatLevel = featStruct.Feat.level;
                $('#uni-heritage-feats').append('<div class="border-bottom border-dark-lighter has-bg-options-header-bold text-center is-bold"><p>Level '+uniHeritageFeatLevel+'</p></div>');
              }

              let sourceTextName = getContentSourceTextName(featStruct.Feat.contentSrc);
              if(featStruct.Feat.homebrewID != null){
                sourceTextName = 'Bundle #'+featStruct.Feat.homebrewID;
              }

              let featEntryID = 'uni-heritage-feat-'+featStruct.Feat.id;
              $('#uni-heritage-feats').append('<div id="'+featEntryID+'" class="border-bottom border-dark-lighter px-2 py-2 has-bg-selectable cursor-clickable pos-relative"><span class="pl-4 is-p">'+featStruct.Feat.name+convertActionToHTML(featStruct.Feat.actions)+'</span><span class="pos-absolute pos-b-5 pos-r-5 is-size-7-5 is-hidden-mobile has-txt-noted is-italic">'+sourceTextName+'</span></div>');

              $('#'+featEntryID).click(function(){
                openQuickView('featView', {
                  Feat : featStruct.Feat,
                  Tags : featStruct.Tags
                });
              });
          
              $('#'+featEntryID).mouseenter(function(){
                $(this).removeClass('has-bg-selectable');
                $(this).addClass('has-bg-selectable-hover');
              });
              $('#'+featEntryID).mouseleave(function(){
                $(this).removeClass('has-bg-selectable-hover');
                $(this).addClass('has-bg-selectable');
              });
              
            }
          }
          
          $('#'+uniHeritageDisplayContainerID).removeClass('is-hidden');
        }
      });
    });
  }
}