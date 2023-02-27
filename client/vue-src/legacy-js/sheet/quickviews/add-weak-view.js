/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

function openAddWeakQuickview(data) {
  addBackFunctionality(data);

  $('#quickViewTitle').html("Add Weakness");
  let qContent = $('#quickViewContent');

  qContent.append('<div class="field is-grouped is-grouped-centered mt-2"><div class="control"><input id="addWeaknessNewType" class="input weakInput" type="text" maxlength="30" placeholder="Weakness Type" autocomplete="off"></div></div>');

  qContent.append('<div class="field is-grouped is-grouped-centered mt-2"><div class="control"><input id="addWeaknessNewAmount" class="input weakInput" type="text" maxlength="30" placeholder="Weakness Amount" autocomplete="off"></div></div>');

  qContent.append('<div class="buttons is-centered pt-2"><button id="addWeaknessAddButton" class="button is-link is-rounded">Add</button></div>');

  $('#addWeaknessAddButton').click(function(){

      let weakType = $('#addWeaknessNewType').val();
      let weakAmount = $('#addWeaknessNewAmount').val();

      if(weakType != null && weakType != '' && weakAmount != null && weakAmount != ''){

        let srcStruct = {
          sourceType: 'user-added',
          sourceLevel: 0,
          sourceCode: weakType+' '+weakAmount+' Weak',
          sourceCodeSNum: 'a',
        };
        socket.emit("requestVulnerabilityChange",
          getCharIDFromURL(),
          srcStruct,
          weakType,
          weakAmount
        );

      }

  });

}