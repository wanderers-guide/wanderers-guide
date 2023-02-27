/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

function processBackground() {

  const charBackground = getCharBackground();
  $(`#initial-stats-background`).html('');
  if(charBackground != null){

    // Process initial class stats //
    $(`#initial-stats-background`).html(`
    
      <div class="pt-1">
        <div class="pos-relative">
          <div class="fading-reveal-container is-active">
            <p class="text-center"><span class="is-size-3 has-text-weight-semibold">Background</span></p>
            <div class="ability-text-section px-1">
              ${processText(charBackground.description, false, null, 'MEDIUM', false)}
            </div>
          </div>
          <p class="reveal-container-text is-hidden has-text-info">Show More</p>
        </div>

        <hr class="mt-1 mb-0 mx-5">
        <div class="mx-5 my-1">
          <div id="background-initial-boosts"></div>
          <div id="background-initial-code"></div>
        </div>
        <hr class="mt-0 mb-1 mx-0" style="height: 1px;">
      </div>
    
    `);

    // Code
    let codeSrcStruct = {
        sourceType: 'background',
        sourceLevel: 1,
        sourceCode: 'background',
        sourceCodeSNum: 'a',
    };
    processCode(
        charBackground.code,
        codeSrcStruct,
        'background-initial-code',
        {source: 'Background', sourceName: 'Background'});
    
    // Boosts
    let boostSrcStruct = {
        sourceType: 'background',
        sourceLevel: 1,
        sourceCode: 'boost-choose',
        sourceCodeSNum: 'a',
    };
    if(charBackground.boostOne != null && charBackground.boostTwo != null) {
      processCode(
          'GIVE-ABILITY-BOOST-SINGLE='+charBackground.boostOne+'\n GIVE-ABILITY-BOOST-SINGLE='+charBackground.boostTwo,
          boostSrcStruct,
          'background-initial-boosts',
          {source: 'Background', sourceName: 'Background Boosts'});
    }

  }

}

function deleteBackground(){

  deleteDataBySourceType('background');
  g_character.backgroundID = null;

}

function setBackground(backgroundID){

  g_character.backgroundID = backgroundID;

}