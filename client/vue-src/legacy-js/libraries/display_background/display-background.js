/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

class DisplayBackground {
  constructor(containerID, backgroundID, homebrewID=null, backButton=true) {
    startSpinnerSubLoader();

    let backgroundDisplayContainerID = 'background-container-'+backgroundID;
    $('#'+containerID).parent().append('<div id="'+backgroundDisplayContainerID+'" class="generated-display-container is-hidden"></div>');
    $('#'+containerID).addClass('is-hidden');

    socket.emit('requestGeneralBackground', backgroundID, homebrewID);
    socket.off('returnGeneralBackground');
    socket.on("returnGeneralBackground", function(backgroundStruct){
      $('#'+backgroundDisplayContainerID).load("/templates/display-background.html");
      $.ajax({ type: "GET",
        url: "/templates/display-background.html",
        success : function(text)
        {
          stopSpinnerSubLoader();

          if(backButton){
            $('#background-back-btn').removeClass('is-hidden');
            $('#background-back-btn').click(function() {
              $('#'+backgroundDisplayContainerID).remove();
              $('#'+containerID).removeClass('is-hidden');
            });
            $('.category-tabs li').click(function() {
              $('#'+backgroundDisplayContainerID).remove();
              $('#'+containerID).removeClass('is-hidden');
            });
          }

          $('#background-name').html(backgroundStruct.background.name);
          $('#background-description').html(processText(backgroundStruct.background.description, false, null, 'MEDIUM', false));

          let sourceTextName = getContentSourceTextName(backgroundStruct.background.contentSrc);
          let sourceLink = getContentSourceLink(backgroundStruct.background.contentSrc);
          if(backgroundStruct.background.homebrewID != null){
            sourceTextName = 'Bundle #'+backgroundStruct.background.homebrewID;
            sourceLink = '/homebrew/?view_id='+backgroundStruct.background.homebrewID;
          }
          let sourceStr = '<a class="has-txt-noted" href="'+sourceLink+'" target="_blank">'+sourceTextName+'</a><span class="has-txt-faded">, #'+backgroundStruct.background.id+'</span>';

          let backgroundRarity = convertRarityToHTML(backgroundStruct.background.rarity);
          if(backgroundRarity != ''){ sourceStr = '<span class="pr-2">'+sourceStr+'</span>'; }
          $('#background-source').html(sourceStr+backgroundRarity);

          if(backgroundStruct.background.boostOne != null){
            let boostStr = '';
            let boostParts = backgroundStruct.background.boostOne.split(',');
            for (let i = 0; i < boostParts.length; i++) {
              if(i != 0) {
                if(i == boostParts.length-1){
                  boostStr += ' or ';
                } else {
                  boostStr += ', ';
                }
              }
              boostStr += lengthenAbilityType(boostParts[i]);
            }
            $('#background-boost-one').html(boostStr);
            $('#background-boost-two').html('Free');
          } else {
            $('#background-boost-one').parent().parent().parent().addClass('is-hidden');
          }

          if(typeof g_isDeveloper !== 'undefined' && g_isDeveloper && backgroundStruct.background.code != null && backgroundStruct.background.code.trim() != '') {
            $('#background-code').html('');
            $('#background-code').append('<hr class="m-3">');
            $('#background-code').append('<p class="is-size-6 is-bold pl-2">WSC Statements</p>');
            
            let codeHTML = '';
            for(let codeStatement of backgroundStruct.background.code.split(/\n/)){
              codeHTML += '<p class="is-size-7">'+codeStatement+'</p>';
            }
            $('#background-code').append('<div class="code-block">'+codeHTML+'</div>');
          }
          
          $('#'+backgroundDisplayContainerID).removeClass('is-hidden');
        }
      });
    });
  }
}