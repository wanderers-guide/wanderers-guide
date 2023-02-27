/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

const ancestryTrait_srcStruct = {
  sourceType: 'ancestry',
  sourceLevel: 1,
  sourceCode: 'defaultTag',
  sourceCodeSNum: 'a',
};

function processAncestry() {

  const charAncestry = getCharAncestry();
  $(`#initial-stats-ancestry`).html('');
  if(charAncestry != null){

    // Process initial ancestry stats //
    $(`#initial-stats-ancestry`).html(`
    
      <div class="pt-1">
        <div class="pos-relative">
          <div class="">
            <p class="text-center"><span class="is-size-3 has-text-weight-semibold">Ancestry</span></p>
          </div>
        </div>

        <div class="columns is-tablet">
          <div class="column text-center">
            <p class="title-font is-bold">Boosts</p>
            <p id="ancestry-initial-stats-display-boosts"></p>
          </div>
          <div class="column text-center">
            <p class="title-font is-bold">Flaws</p>
            <p id="ancestry-initial-stats-display-flaws"></p>
          </div>
        </div>
        <div class="columns is-tablet">
          <div class="column text-center">
            <p class="title-font is-bold">Hit Points</p>
            <p id="ancestry-initial-stats-display-hitPoints"></p>
          </div>
          <div class="column text-center">
            <p class="title-font is-bold">Size</p>
            <p id="ancestry-initial-stats-display-size"></p>
          </div>
        </div>
        <div class="columns is-tablet">
          <div class="column text-center">
            <p class="title-font is-bold">Speed</p>
            <p id="ancestry-initial-stats-display-speed"></p>
          </div>
          <div class="column text-center">
            <p class="title-font is-bold">Languages</p>
            <p id="ancestry-initial-stats-display-languages"></p>
          </div>
        </div>
        <div class="columns is-tablet">
          <div class="column text-center">
            <p class="title-font is-bold">Senses</p>
            <p id="ancestry-initial-stats-display-senses"></p>
          </div>
          <div id="ancestry-initial-stats-extra-features-section" class="column text-center">
            <p class="title-font is-bold">Extra Features</p>
            <p id="ancestry-initial-stats-display-physicalFeatures"></p>
          </div>
        </div>

        <hr class="mt-1 mb-0 mx-5">
        <div class="mx-5 my-1">
          <div id="ancestry-initial-stats-code-boosts"></div>
          <div id="ancestry-initial-stats-code-flaws"></div>
          <div id="ancestry-initial-stats-code-hitPoints"></div>
          <div id="ancestry-initial-stats-code-size"></div>
          <div id="ancestry-initial-stats-code-speed"></div>
          <div id="ancestry-initial-stats-code-languages"></div>
          <div id="ancestry-initial-stats-code-languages-extra"></div>
          <div id="ancestry-initial-stats-code-senses"></div>
          <div id="ancestry-initial-stats-code-physicalFeatures"></div>
        </div>
        <hr class="mt-0 mb-1 mx-0" style="height: 1px;">
      </div>
    
    `);
    processAncestryStats(charAncestry, {

      boosts: {
        displayID: 'ancestry-initial-stats-display-boosts',
        codeID: 'ancestry-initial-stats-code-boosts',
      },
      flaws: {
        displayID: 'ancestry-initial-stats-display-flaws',
        codeID: 'ancestry-initial-stats-code-flaws',
      },
  
      hitPoints: {
        displayID: 'ancestry-initial-stats-display-hitPoints',
        codeID: 'ancestry-initial-stats-code-hitPoints',
      },
      size: {
        displayID: 'ancestry-initial-stats-display-size',
        codeID: 'ancestry-initial-stats-code-size',
      },
      speed: {
        displayID: 'ancestry-initial-stats-display-speed',
        codeID: 'ancestry-initial-stats-code-speed',
      },

      languages: {
        displayID: 'ancestry-initial-stats-display-languages',
        codeID: 'ancestry-initial-stats-code-languages',
      },
      senses: {
        displayID: 'ancestry-initial-stats-display-senses',
        codeID: 'ancestry-initial-stats-code-senses',
      },
      physicalFeatures: {
        displayID: 'ancestry-initial-stats-display-physicalFeatures',
        codeID: 'ancestry-initial-stats-code-physicalFeatures',
      },
  
    }, PROCESS_ANCESTRY_STATS_TYPE.BOTH);

    // Make sure there is the ancestry's trait (important for creating from build)
    setData(DATA_SOURCE.CHAR_TRAIT, ancestryTrait_srcStruct, charAncestry.Ancestry.name);

    // Ancestry Heritage
    $(`#level-1-body`).append(`

      <div class="ancestry-feature-section pt-1">
        <div class="pos-relative">
          <div class="fading-reveal-container is-active">
            <p class="ancestry-feature-header text-center"><span class="is-size-4 has-text-weight-semibold">Heritage</span></p>
            <div id="ancestry-feature-container-heritage" class="ancestry-feature-container ability-text-section px-1">
              ${processText('You select a heritage at 1st level to reflect abilities passed down to you from your ancestors or common among those of your ancestry in the environment where you were born or grew up.', false, null)}
            </div>
          </div>
          <p class="reveal-container-text is-hidden has-text-info">Show More</p>
        </div>

        <div id="ancestry-feature-selector-section-heritage" class="pb-4">

          <div class="tabs is-small is-centered is-marginless use-custom-scrollbar">
              <ul class="builder-tabs">
                  <li><a id="ancestryHeritageTab" class="heritageTab">Ancestry</a></li>
                  <li><a id="universalHeritageTab" class="heritageTab">Versatile</a></li>
              </ul>
          </div>

          <div class="py-2">

              <div class="field is-grouped is-grouped-centered">
                <div class="select">
                  <select id="ancestry-feature-selector-heritage" class="classAbilSelection">
                  </select>
                </div>
              </div>

              <div id="ancestry-feature-selector-result-heritage" class="columns is-centered">
                  <div class="column is-mobile is-10" style="position: relative;">
                      <div id="ancestry-feature-selector-rarity-heritage" class="is-hidden-mobile" style="position: absolute; top: -20px; right: 0px;"></div>
                      <article class="message is-info">
                          <div class="message-body">

                            <div class="pos-relative">
                              <div class="fading-reveal-container is-active">
                                <div style="float: right; max-width: 60%; max-height: 40vh;">
                                  <img id="ancestry-feature-selector-artwork-heritage" src="" style="max-height: 40vh;">
                                </div>
                                <div id="ancestry-feature-selector-description-heritage" class="has-text-left"></div>
                              </div>
                              <p class="reveal-container-text is-hidden has-text-info">Show More</p>
                            </div>

                          </div>
                      </article>
                  </div>
              </div>

              <div class="columns is-centered">
                  <div id="ancestry-feature-selector-code-heritage" class="column is-10 is-paddingless">
                  </div>
              </div>

          </div>
        
        </div>

        <hr class="mt-0 mb-1 mx-0" style="height: 1px;">
      </div>

    `);

    processAncestry_displayHeritageSelectOptions(charAncestry, getCharHeritage(), false);

    // Heritage Selection //
    $('#ancestry-feature-selector-heritage').change(function(event, triggerSave) {
      $('#ancestry-feature-selector-artwork-heritage').attr('src', '');

      let heritageID = $(this).val();

      if(heritageID != "chooseDefault"){
          $('#ancestry-feature-selector-result-heritage').removeClass("is-hidden");
          $(this).parent().removeClass("is-info");

          // Save heritage
          let isUniversal = processAncestry_isUniversalHeritage();
          if(triggerSave == null || triggerSave) {
            
            if(isUniversal){
              g_character.uniHeritageID = heritageID;
            } else {
              g_character.heritageID = heritageID;
            }

            if(g_char_id != null){
              socket.emit("requestHeritageChange",
                  g_char_id,
                  heritageID,
                  isUniversal);
            } else {
              saveBuildInfo();
            }

            deleteDataBySourceCode('heritage');
              
          }

          processAncestry_displayCurrentHeritage(charAncestry, heritageID, isUniversal);

      } else {
          $('#ancestry-feature-selector-result-heritage').addClass("is-hidden");
          $(this).parent().addClass("is-info");

          $('#ancestry-feature-selector-code-heritage').html('');

          let isUniversal = processAncestry_isUniversalHeritage();
          if(triggerSave == null || triggerSave) {

            g_character.heritageID = null;
            g_character.uniHeritageID = null;

            if(g_char_id != null){
              socket.emit("requestHeritageChange",
                g_char_id,
                null,
                isUniversal);
            } else {
              saveBuildInfo();
            }

            deleteDataBySourceCode('heritage');

            // Update ancestry feats
            processAncestry_reprocessAncestryFeats();

          }
          
      }

    });

    $('.heritageTab').unbind();
    $('.heritageTab').click(function(event, autoPageLoad){
      if($(this).parent().hasClass('is-active')) { return; }
      $(this).parent().parent().find('.is-active').removeClass('is-active');
      $(this).parent().addClass('is-active');

      // Triggersave, which will reselect heritage again, only if autoPageLoad is false or null
      const triggersave = (!autoPageLoad || autoPageLoad == null);
      processAncestry_displayHeritageSelectOptions(charAncestry, getCharHeritage(), triggersave);
    });

    if(getCharHeritage() != null){
      if(getCharHeritage().tagID != null){
        $('#universalHeritageTab').trigger("click", [true]);
      } else {
        $('#ancestryHeritageTab').trigger("click", [true]);
      }
    } else {
      $('#ancestryHeritageTab').trigger("click", [true]);
    }

    
    // Ancestry Feat Progression //
    const ancestryProgression = (gOption_hasVariantAncestryParagon) ? ['1', '1-2', '3', '5', '7', '9', '11', '13', '15', '17', '19'] : ['1', '5', '9', '13', '17'];

    let ancestryFeatCount = 0;
    for(const ancestryFeatLevelID of ancestryProgression){
      let featLevel = (ancestryFeatLevelID == '1-2') ? '1' : ancestryFeatLevelID;

      $(`#level-${featLevel}-body`).append(`

        <div class="ancestry-feature-section pt-1">
          <div class="pos-relative">
            <div class="fading-reveal-container is-active">
              <p class="ancestry-feature-header text-center"><span class="is-size-4 has-text-weight-semibold">Ancestry Feat</span></p>
              <div id="ancestry-feature-container-${ancestryFeatLevelID}" class="ancestry-feature-container ability-text-section px-1">
                ${processText('You gain an ancestry feat.', false, null)}
              </div>
            </div>
            <p class="reveal-container-text is-hidden has-text-info">Show More</p>
          </div>

          <hr id="ancestry-feature-code-hr-${ancestryFeatLevelID}" class="mt-1 mb-0 mx-5">
          <div id="ancestry-feature-code-${ancestryFeatLevelID}" class="mx-5"></div>
          <hr class="mt-0 mb-1 mx-0" style="height: 1px;">
        </div>

      `);

      // Run code
      processCode(
        'GIVE-ANCESTRY-FEAT='+featLevel,
        {
          sourceType: 'ancestry',
          sourceLevel: featLevel,
          sourceCode: 'ancestryFeat-'+ancestryFeatCount,
          sourceCodeSNum: 'a'
        },
        'ancestry-feature-code-'+ancestryFeatLevelID,
        {source: 'Ancestry Feat', sourceName: 'Ancestry Feat (Lvl '+featLevel+')'});
      
      ancestryFeatCount++;

    }

  }

}

function processAncestry_reprocessAncestryFeats(){

  const ancestryProgression = (gOption_hasVariantAncestryParagon) ? ['1', '1-2', '3', '5', '7', '9', '11', '13', '15', '17', '19'] : ['1', '5', '9', '13', '17'];

  let ancestryFeatCount = 0;
  for(const ancestryFeatLevelID of ancestryProgression){
    let featLevel = (ancestryFeatLevelID == '1-2') ? '1' : ancestryFeatLevelID;

    $('#ancestry-feature-code-'+ancestryFeatLevelID).html('');

    // Run code
    processCode(
      'GIVE-ANCESTRY-FEAT='+featLevel,
      {
        sourceType: 'ancestry',
        sourceLevel: featLevel,
        sourceCode: 'ancestryFeat-'+ancestryFeatCount,
        sourceCodeSNum: 'a'
      },
      'ancestry-feature-code-'+ancestryFeatLevelID,
      {source: 'Ancestry Feat', sourceName: 'Ancestry Feat (Lvl '+featLevel+')'});
    
    ancestryFeatCount++;

  }

}

function processAncestry_displayHeritageSelectOptions(charAncestry, charHeritage, triggerSave){

  let selectHeritage = $('#ancestry-feature-selector-heritage');
  selectHeritage.html('');

  selectHeritage.append('<option value="chooseDefault">Choose a Heritage</option>');
  selectHeritage.append('<optgroup label="──────────"></optgroup>');

  if(processAncestry_isUniversalHeritage()){
      for(const uniHeritage of g_uniHeritages){
          if(charHeritage != null && charHeritage.tagID != null && charHeritage.id == uniHeritage.id) {
              selectHeritage.append('<option value="'+uniHeritage.id+'" class="'+selectOptionRarity(uniHeritage.rarity)+'" selected>'+uniHeritage.name+'</option>');
          } else {
              selectHeritage.append('<option value="'+uniHeritage.id+'" class="'+selectOptionRarity(uniHeritage.rarity)+'">'+uniHeritage.name+'</option>');
          }
      }
  } else {
      if(charAncestry != null){
          for(const heritage of charAncestry.Heritages){
              if(charHeritage != null && charHeritage.tagID == null && charHeritage.id == heritage.id) {
                  selectHeritage.append('<option value="'+heritage.id+'" class="'+selectOptionRarity(heritage.rarity)+'" selected>'+heritage.name+'</option>');
              } else {
                  selectHeritage.append('<option value="'+heritage.id+'" class="'+selectOptionRarity(heritage.rarity)+'">'+heritage.name+'</option>');
              }
          }
      }
  }

  
  $('#ancestry-feature-selector-heritage').trigger("change", [triggerSave]);

}

function processAncestry_isUniversalHeritage(){
  return $('#universalHeritageTab').parent().hasClass('is-active');
}

function processAncestry_displayCurrentHeritage(charAncestry, heritageID, isUniversal) {
  $('#ancestry-feature-selector-heritage').blur();

  if(heritageID != "chooseDefault" && charAncestry != null){
      
      let heritage;
      if(isUniversal) {
        heritage = g_uniHeritages.find(uniHeritage => {
          return uniHeritage.id == heritageID;
        });
        g_character.heritageID = null;
        g_character.uniHeritageID = heritageID;
      } else {
        heritage = charAncestry.Heritages.find(heritage => {
          return heritage.id == heritageID;
        });
        g_character.heritageID = heritageID;
        g_character.uniHeritageID = null;
      }

      // Rarity //
      $('#ancestry-feature-selector-rarity-heritage').html(convertRarityToHTML(heritage.rarity, true));
  
      let heritageDescription = $('#ancestry-feature-selector-description-heritage');
      heritageDescription.html(processText(heritage.description, false, false, 'MEDIUM', false));
      heritageDescription.removeClass('is-hidden');

      if(heritage.artworkURL != null){
        $('#ancestry-feature-selector-artwork-heritage').removeClass('is-hidden');
        $('#ancestry-feature-selector-artwork-heritage').attr('src', heritage.artworkURL);
      } else {
        $('#ancestry-feature-selector-artwork-heritage').addClass('is-hidden');
        $('#ancestry-feature-selector-artwork-heritage').attr('src', '');
      }

      $('#ancestry-feature-selector-code-heritage').html('');

      processCode(
        heritage.code,
        {
          sourceType: 'ancestry',
          sourceLevel: 1,
          sourceCode: 'heritage',
          sourceCodeSNum: 'a'
        },
        'ancestry-feature-selector-code-heritage',
        {source: 'Heritage', sourceName: 'Heritage'});

  } else {

      g_character.heritageID = null;
      g_character.uniHeritageID = null;

      $('#ancestry-feature-selector-rarity-heritage').html('');

      let heritageDescription = $('#ancestry-feature-selector-description-heritage');
      heritageDescription.html('');
      heritageDescription.addClass('is-hidden');
      $('#ancestry-feature-selector-artwork-heritage').addClass('is-hidden');
      $('#ancestry-feature-selector-artwork-heritage').attr('src', '');
      $('#ancestry-feature-selector-code-heritage').html('');

  }

  // Update ancestry feats
  processAncestry_reprocessAncestryFeats();

}





function deleteAncestry(){

  deleteDataBySourceType('ancestry');
  g_character.ancestryID = null;
  g_character.heritageID = null;
  g_character.uniHeritageID = null;

}

function setAncestry(ancestryID){

  g_character.ancestryID = ancestryID;
  const newAncestry = getCharAncestry();
  if(newAncestry != null){
    setData(DATA_SOURCE.CHAR_TRAIT, ancestryTrait_srcStruct, newAncestry.Ancestry.name);
  }

}