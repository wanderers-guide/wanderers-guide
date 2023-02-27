/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

class DisplayAncestry {
  constructor(containerID, ancestryID, featMap, homebrewID=null, backButton=true) {
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

    let ancestryDisplayContainerID = 'ancestry-container-'+ancestryID;
    $('#'+containerID).parent().append('<div id="'+ancestryDisplayContainerID+'" class="generated-display-container is-hidden"></div>');
    $('#'+containerID).addClass('is-hidden');
    
    socket.emit('requestGeneralAncestry', ancestryID, homebrewID);
    socket.off('returnGeneralAncestry');
    socket.on("returnGeneralAncestry", function(ancestryStruct){
      $('#'+ancestryDisplayContainerID).load("/templates/display-ancestry.html");
      $.ajax({ type: "GET",
        url: "/templates/display-ancestry.html",   
        success : function(text)
        {

          if(backButton){
            $('#ancestry-back-btn').removeClass('is-hidden');
            $('#ancestry-back-btn').click(function() {
              $('#'+ancestryDisplayContainerID).remove();
              $('#'+containerID).removeClass('is-hidden');
            });
            $('.category-tabs li').click(function() {
              $('#'+ancestryDisplayContainerID).remove();
              $('#'+containerID).removeClass('is-hidden');
            });
          }

          $('#ancestry-name').html(ancestryStruct.ancestry.name);
          $('#ancestry-description').html(processText(ancestryStruct.ancestry.description, false, false, 'MEDIUM', false));

          showMoreCheck();// Check if description is too long, reveal show more instead

          if(ancestryStruct.ancestry.artworkURL != null){
            $('#ancestry-artwork-img').removeClass('is-hidden');
            $('#ancestry-artwork-img').attr('src', ancestryStruct.ancestry.artworkURL);
          } else {
            $('#ancestry-artwork-img').addClass('is-hidden');
            $('#ancestry-artwork-img').attr('src', '');
          }

          let sourceTextName = getContentSourceTextName(ancestryStruct.ancestry.contentSrc);
          let sourceLink = getContentSourceLink(ancestryStruct.ancestry.contentSrc);
          if(ancestryStruct.ancestry.homebrewID != null){
            sourceTextName = 'Bundle #'+ancestryStruct.ancestry.homebrewID;
            sourceLink = '/homebrew/?view_id='+ancestryStruct.ancestry.homebrewID;
          }
          let sourceStr = '<a class="has-txt-noted" href="'+sourceLink+'" target="_blank">'+sourceTextName+'</a><span class="has-txt-faded">, #'+ancestryStruct.ancestry.id+'</span>';

          let ancestryRarity = convertRarityToHTML(ancestryStruct.ancestry.rarity);
          if(ancestryRarity != ''){ sourceStr = '<span class="pr-2">'+sourceStr+'</span>'; }
          $('#ancestry-source').html(sourceStr+ancestryRarity);

          let boostsStr = '';
          for(let boost of ancestryStruct.boosts){
            if(boostsStr != ''){boostsStr += ', ';}
            if(boost == 'Anything'){boost = 'Free';}
            boostsStr += boost;
          }
          if(boostsStr == '') {boostsStr = 'None';}
          $('#ancestry-boosts').html(boostsStr);
          
          let flawsStr = '';
          for(let flaw of ancestryStruct.flaws){
            if(flawsStr != ''){flawsStr += ', ';}
            if(flaw == 'Anything'){flaw = 'Free';}
            flawsStr += flaw;
          }
          if(flawsStr == '') {flawsStr = 'None';}
          $('#ancestry-flaws').html(flawsStr);

          $('#ancestry-hitPoints').html(ancestryStruct.ancestry.hitPoints);
          $('#ancestry-size').html(capitalizeWord(ancestryStruct.ancestry.size));
          $('#ancestry-speed').html(ancestryStruct.ancestry.speed+' ft');

          let langStr = '';
          for(const lang of ancestryStruct.languages) {
            langStr += lang.name+', ';
          }
          langStr = langStr.substring(0, langStr.length - 2);
          $('#ancestry-languages').html(langStr);

          let bonusLangStr = '';
          ancestryStruct.bonus_languages = ancestryStruct.bonus_languages.sort(
            function(a, b) {
              return a.name > b.name ? 1 : -1;
            }
          );
          for(const bonusLang of ancestryStruct.bonus_languages) {
            bonusLangStr += bonusLang.name+', ';
          }
          $('#ancestry-languages-bonus').html('<a class="has-text-info has-tooltip-bottom has-tooltip-multiline" data-tooltip="Additional languages equal to your Intelligence modifier (if it’s positive). Choose from '+bonusLangStr+'and any other languages to which you have access (such as the languages prevalent in your region).">Additional languages...</a>');

          let sensesStr = '';
          if(ancestryStruct.vision_sense != null){
            sensesStr += '<a class="has-text-info has-tooltip-bottom has-tooltip-multiline" data-tooltip="'+processTextRemoveIndexing(ancestryStruct.vision_sense.description)+'">'+ancestryStruct.vision_sense.name+'</a>';
            if(ancestryStruct.additional_sense != null){
              sensesStr += ' and ';
            }
          }
          if(ancestryStruct.additional_sense != null){
            sensesStr += '<a class="has-text-info has-tooltip-bottom has-tooltip-multiline" data-tooltip="'+processTextRemoveIndexing(ancestryStruct.additional_sense.description)+'">'+ancestryStruct.additional_sense.name+'</a>';
          }
          $('#ancestry-senses').html(sensesStr);
          
          let phyFeatsStr = '';
          if(ancestryStruct.physical_feature_one != null){
            phyFeatsStr += '<a class="has-text-info has-tooltip-bottom has-tooltip-multiline" data-tooltip="'+processTextRemoveIndexing(ancestryStruct.physical_feature_one.description)+'">'+ancestryStruct.physical_feature_one.name+'</a>';
            if(ancestryStruct.physical_feature_two != null){
              phyFeatsStr += ' and ';
            }
          }
          if(ancestryStruct.physical_feature_two != null){
            phyFeatsStr += '<a class="has-text-info has-tooltip-bottom has-tooltip-multiline" data-tooltip="'+processTextRemoveIndexing(ancestryStruct.physical_feature_two.description)+'">'+ancestryStruct.physical_feature_two.name+'</a>';
          }
          if(phyFeatsStr == ''){phyFeatsStr = 'None';}
          $('#ancestry-phyFeatures').html(phyFeatsStr);
          
          ///

          let firstHeritage = true;
          for(let heritage of ancestryStruct.heritages) {
            if(firstHeritage) {firstHeritage = false;} else {$('#ancestry-heritages').append('<hr class="m-2">');}

            let sourceTextName = getContentSourceTextName(heritage.contentSrc);
            if(heritage.homebrewID != null){
              sourceTextName = 'Bundle #'+heritage.homebrewID;
            }

            $('#ancestry-heritages').append(`
              <div class="pos-relative">
                <div class="pb-2 fading-reveal-container is-active">
                  <p><span id="ancestry-name" class="is-size-5 is-bold has-txt-listing pl-3">${heritage.name}</span>${convertRarityToHTML(heritage.rarity)}</p>
                  ${processText(heritage.description, false, null)}
                </div>
                <p class="reveal-container-text is-hidden has-text-info">Show More</p>
                
                <span class="is-size-7 has-txt-noted is-italic pr-2" style="position: absolute; bottom: 0px; right: 0px;">${sourceTextName}</span>
              </div>
            `);


            if(typeof g_isDeveloper !== 'undefined' && g_isDeveloper && heritage.code != null && heritage.code.trim() != '') {
              $('#ancestry-heritages').append('<p class="is-size-6 is-bold pl-2">WSC Statements</p>');
                
              let codeHTML = '';
              for(let codeStatement of heritage.code.split(/\n/)){
                codeHTML += '<p class="is-size-7">'+codeStatement+'</p>';
              }
              $('#ancestry-heritages').append('<div class="code-block">'+codeHTML+'</div>');
            }

          }

          ///

          let ancestryFeatLevel = 0;
          for(const [featID, featStruct] of featMap.entries()){
            let tag = featStruct.Tags.find(tag => {
              return tag.id === ancestryStruct.ancestry.tagID;
            });
            if(tag != null){
              if(featStruct.Feat.level <= 0) { continue; }
              if(featStruct.Feat.level > ancestryFeatLevel){
                ancestryFeatLevel = featStruct.Feat.level;
                $('#ancestry-feats').append('<div class="border-bottom border-dark-lighter has-bg-options-header-bold text-center is-bold"><p>Level '+ancestryFeatLevel+'</p></div>');
              }

              let sourceTextName = getContentSourceTextName(featStruct.Feat.contentSrc);
              if(featStruct.Feat.homebrewID != null){
                sourceTextName = 'Bundle #'+featStruct.Feat.homebrewID;
              }

              let featEntryID = 'ancestry-feat-'+featStruct.Feat.id;
              $('#ancestry-feats').append('<div id="'+featEntryID+'" class="border-bottom border-dark-lighter px-2 py-2 has-bg-selectable cursor-clickable pos-relative"><span class="pl-4 is-p">'+featStruct.Feat.name+convertActionToHTML(featStruct.Feat.actions)+'</span><span class="pos-absolute pos-b-5 pos-r-5 is-size-7-5 is-hidden-mobile has-txt-noted is-italic">'+sourceTextName+'</span></div>');

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
          
          stopSpinnerSubLoader();
          $('#'+ancestryDisplayContainerID).removeClass('is-hidden');
        }
      });
    });
  }
}