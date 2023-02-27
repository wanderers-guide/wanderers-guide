/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

function openAddLangQuickview(data) {

  $('#quickViewTitle').html("Add Language");
  let qContent = $('#quickViewContent');

  qContent.append('<div class="field is-grouped is-grouped-centered"><div class="control"><div class="select"><select id="addLangSelection"></select></div></div></div>');

  qContent.append('<div class="buttons is-centered pt-2"><button id="addLangAddButton" class="button is-link is-rounded">Add</button></div>');

  let langSelection = $('#addLangSelection');
  langSelection.append('<option value="chooseDefault">Language</option>');
  langSelection.append('<optgroup label="──────────"></optgroup>');
  for(const lang of g_allLanguages) {
    langSelection.append('<option value="'+lang.id+'">'+lang.name+'</option>');
  }

  $('#addLangAddButton').click(function(){

      let langID = $('#addLangSelection').val();

      if(langID != 'chooseDefault') {

        let srcStruct = {
          sourceType: 'user-added',
          sourceLevel: 0,
          sourceCode: 'Lang #'+langID,
          sourceCodeSNum: 'a',
        };
        socket.emit("requestLanguageChange",
            getCharIDFromURL(),
            srcStruct,
            langID
        );

        // Add lang to character's lang array
        let lang = g_allLanguages.find(lang => {
          return lang.id == langID;
        });
        if(lang != null) {
          g_langArray.push({ sourceType: 'user-added', value: lang });
        }

      }

  });

}