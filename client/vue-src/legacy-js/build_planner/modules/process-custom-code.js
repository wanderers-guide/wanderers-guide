/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

function processCustomCode() {

  $(`#initial-stats-custom-code`).html('');
  if(g_character.optionCustomCodeBlock === 1){

    $(`#initial-stats-custom-code`).html(`
      <div class="pt-1">
        <div class="pos-relative">
          <div class="">
            <p class="text-center"><span class="is-size-3 has-text-weight-semibold">Custom Code</span></p>
            <p class="text-center help is-info is-italic">Anything generated from the code you wrote in the code block on the Home page will appear below.</p>
          </div>
        </div>
      </div>

      <hr class="mt-1 mb-0 mx-5">
      <div class="mx-5 my-1">
        <div id="custom-code-block-code"></div>
      </div>
    `);

    processCode(
      g_character.customCode,
      {
        sourceType: 'custom-code',
        sourceLevel: 0,
        sourceCode: 'custom-code',
        sourceCodeSNum: 'a',
      },
      `custom-code-block-code`,
      {source: 'Custom Code Block', sourceName: 'Custom Code Block'});

  } else {
    if(g_char_id != null){
      socket.emit("requestCustomCodeBlockDataClear",
          g_char_id);
    } else {
      saveBuildMetaData();
    }
  }

}