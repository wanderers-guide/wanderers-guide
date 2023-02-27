/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

class DisplayArchetype {
  constructor(containerID, archetypeID, featMap, homebrewID=null, backButton=true) {
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

    let archetypeDisplayContainerID = 'archetype-container-'+archetypeID;
    $('#'+containerID).parent().append('<div id="'+archetypeDisplayContainerID+'" class="generated-display-container is-hidden"></div>');
    $('#'+containerID).addClass('is-hidden');

    socket.emit('requestGeneralArchetype', archetypeID, homebrewID);
    socket.off('returnGeneralArchetype');
    socket.on("returnGeneralArchetype", function(archetypeStruct){
      $('#'+archetypeDisplayContainerID).load("/templates/display-archetype.html");
      $.ajax({ type: "GET",
        url: "/templates/display-archetype.html",
        success : function(text)
        {
          stopSpinnerSubLoader();

          if(backButton){
            $('#archetype-back-btn').removeClass('is-hidden');
            $('#archetype-back-btn').click(function() {
              $('#'+archetypeDisplayContainerID).remove();
              $('#'+containerID).removeClass('is-hidden');
            });
            $('.category-tabs li').click(function() {
              $('#'+archetypeDisplayContainerID).remove();
              $('#'+containerID).removeClass('is-hidden');
            });
          }

          $('#archetype-name').html(archetypeStruct.archetype.name);
          $('#archetype-description').html(processText(archetypeStruct.archetype.description, false, null, 'MEDIUM', false));

          let dedFeatStruct = featMap.get(archetypeStruct.archetype.dedicationFeatID+'');

          let sourceTextName = getContentSourceTextName(archetypeStruct.archetype.contentSrc);
          let sourceLink = getContentSourceLink(archetypeStruct.archetype.contentSrc);
          if(archetypeStruct.archetype.homebrewID != null){
            sourceTextName = 'Bundle #'+archetypeStruct.archetype.homebrewID;
            sourceLink = '/homebrew/?view_id='+archetypeStruct.archetype.homebrewID;
          }
          let sourceStr = '<a class="has-txt-noted" href="'+sourceLink+'" target="_blank">'+sourceTextName+'</a><span class="has-txt-faded">, #'+archetypeStruct.archetype.id+'</span>';

          let archetypeRarity = convertRarityToHTML(dedFeatStruct.Feat.rarity);
          if(archetypeRarity != ''){ sourceStr = '<span class="pr-2">'+sourceStr+'</span>'; }
          $('#archetype-source').html(sourceStr+archetypeRarity);

          ///
          
          $('#archetype-ded-feat-name').html(dedFeatStruct.Feat.name);
          $('#archetype-ded-feat-level').html('Lvl '+dedFeatStruct.Feat.level);

          $('#archetype-ded-feat-container').click(function(){
            openQuickView('featView', {
              Feat : dedFeatStruct.Feat,
              Tags : dedFeatStruct.Tags
            });
          });
      
          $('#archetype-ded-feat-container').mouseenter(function(){
            $(this).removeClass('has-bg-selectable');
            $(this).addClass('has-bg-selectable-hover');
          });
          $('#archetype-ded-feat-container').mouseleave(function(){
            $(this).removeClass('has-bg-selectable-hover');
            $(this).addClass('has-bg-selectable');
          });

          ///

          let archetypeFeatLevel = 0;
          for(const [featID, featStruct] of featMap.entries()){
            let tag = featStruct.Tags.find(tag => {
              return tag.id === archetypeStruct.archetype.tagID;
            });
            if(tag != null || featStruct.Feat.genTypeName == archetypeStruct.archetype.name+' Archetype'){
              if(featStruct.Feat.level <= 0) { continue; }
              if(featStruct.Feat.level > archetypeFeatLevel){
                archetypeFeatLevel = featStruct.Feat.level;
                $('#archetype-feats').append('<div class="border-bottom border-dark-lighter has-bg-options-header-bold text-center is-bold"><p>Level '+archetypeFeatLevel+'</p></div>');
              }

              let sourceTextName = getContentSourceTextName(featStruct.Feat.contentSrc);
              if(featStruct.Feat.homebrewID != null){
                sourceTextName = 'Bundle #'+featStruct.Feat.homebrewID;
              }

              let featEntryID = 'archetype-feat-'+featStruct.Feat.id;
              $('#archetype-feats').append('<div id="'+featEntryID+'" class="border-bottom border-dark-lighter px-2 py-2 has-bg-selectable cursor-clickable pos-relative"><span class="pl-4 is-p">'+featStruct.Feat.name+convertActionToHTML(featStruct.Feat.actions)+'</span><span class="pos-absolute pos-b-5 pos-r-5 is-size-7-5 is-hidden-mobile has-txt-noted is-italic">'+sourceTextName+'</span></div>');

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
          
          $('#'+archetypeDisplayContainerID).removeClass('is-hidden');
        }
      });
    });
  }
}