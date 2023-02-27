/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

function openAddLoreQuickview(data) {

    $('#quickViewTitle').html("Add Lore Skill");
    let qContent = $('#quickViewContent');

    qContent.append('<div class="field is-grouped is-grouped-centered mt-2"><div class="control"><input id="addLoreNewLoreName" class="input loreInput" type="text" maxlength="20" placeholder="Lore Type" autocomplete="off"></div></div>');

    qContent.append('<div class="field is-grouped is-grouped-centered"><div class="control"><div class="select"><select id="addLoreNewAbilityScore"><option value="STR">Strength</option><option value="DEX">Dexterity</option><option value="CON">Constitution</option><option value="INT" selected>Intelligence</option><option value="WIS">Wisdom</option><option value="CHA">Charisma</option></select></div></div></div>');

    qContent.append('<div class="buttons is-centered pt-2"><button id="addLoreAddButton" class="button is-link is-rounded">Add</button></div>');

    $('#addLoreAddButton').click(function(){

        let loreName = $('#addLoreNewLoreName').val();
        
        let validNameRegex = /^[A-Za-z0-9 \-_']+$/;
        if(loreName != null && loreName != '' && validNameRegex.test(loreName)){
          $('#addLoreNewLoreName').removeClass("is-danger");

          let abilScore = $('#addLoreNewAbilityScore').val();
          if(abilScore == 'INT') { abilScore = null; }

          let srcStruct = {
            sourceType: 'user-added',
            sourceLevel: 0,
            sourceCode: loreName+' Lore',
            sourceCodeSNum: 'a',
          };
          socket.emit("requestLoreChange",
            getCharIDFromURL(),
            srcStruct,
            loreName,
            null,
            'T',
            'User-Added',
            abilScore
          );

        } else {
          $('#addLoreNewLoreName').addClass("is-danger");
        }

    });

}