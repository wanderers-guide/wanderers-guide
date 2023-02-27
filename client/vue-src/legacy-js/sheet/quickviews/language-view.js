/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

function openLanguageQuickview(data) {
    addBackFunctionality(data);

    $('#quickViewTitle').html(data.Language.name);
    let qContent = $('#quickViewContent');

    if(data.Language.speakers != null){
      qContent.append('<p class="negative-indent"><strong>Speakers</strong> '+data.Language.speakers+'</p>');
    }
    if(data.Language.script != null){
      qContent.append('<p class="negative-indent"><strong>Script</strong> '+data.Language.script+'</p>');
    }

    // Description
    if(data.Language.description != null){
      qContent.append('<hr class="m-2">');
      qContent.append(processText(data.Language.description, true, true, 'MEDIUM'));
    }

    // Script
    let scriptClass = '';
    if(data.Language.script == 'Common'){
        scriptClass = 'font-common';
    } else if(data.Language.script == 'Iokharic'){
        scriptClass = 'font-iokharic';
    } else if(data.Language.script == 'Dethek'){
        scriptClass = 'font-dethek';
    } else if(data.Language.script == 'Rellanic'){
        scriptClass = 'font-rellanic';
    } else if(data.Language.script == 'Barazhad'){
        scriptClass = 'font-barazhad';
    } else if(data.Language.script == 'Enochian'){
        scriptClass = 'font-enochian';
    } else if(data.Language.script == 'Aklo'){
        scriptClass = 'font-aklo';
    } else if(data.Language.script == 'Gnomish'){
        scriptClass = 'font-gnomish';
    } else if(data.Language.script == 'Necril'){
        scriptClass = 'font-necril';
    } else if(data.Language.script == 'Druidic'){
        scriptClass = 'font-druidic';
    }
    if(scriptClass != ''){
        qContent.append('<hr class="m-2">');
        qContent.append('<input id="scriptDisplayArea" class="input is-medium" spellcheck="false" type="text" autocomplete="off" placeholder="Script Display Area">');
        $('#scriptDisplayArea').addClass(scriptClass);
    }
    
    // User Added, Remove Button
    if(data.SourceType == 'user-added'){
      qContent.append('<div class="buttons is-centered is-marginless"><a id="removeUserAddedLangButton" class="button is-small is-danger is-rounded is-outlined mt-3">Remove</a></div>');

      $('#removeUserAddedLangButton').click(function(){ // Remove User-Added Lang

        let srcStruct = {
          sourceType: 'user-added',
          sourceLevel: 0,
          sourceCode: 'Lang #'+data.Language.id,
          sourceCodeSNum: 'a',
        };
        socket.emit("requestLanguageChange",
            getCharIDFromURL(),
            srcStruct,
            null
        );

        // Remove lang from character's lang array
        let newLangArray = [];
        for(const langData of g_langArray){
          if(langData.value.id != data.Language.id){
            newLangArray.push(langData);
          }
        }
        g_langArray = newLangArray;

      });
    }

}