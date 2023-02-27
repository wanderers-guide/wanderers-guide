/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

function openAddResistQuickview(data) {
  addBackFunctionality(data);

  $('#quickViewTitle').html("Add Resistance");
  let qContent = $('#quickViewContent');

  qContent.append('<div class="field is-grouped is-grouped-centered mt-2"><div class="control"><input id="addResistNewType" class="input resistInput" type="text" maxlength="30" placeholder="Resistance Type" autocomplete="off"></div></div>');

  qContent.append('<div class="field is-grouped is-grouped-centered mt-2"><div class="control"><input id="addResistNewAmount" class="input resistInput" type="text" maxlength="30" placeholder="Resistance Amount" autocomplete="off"></div></div>');

  qContent.append('<div class="buttons is-centered pt-2"><button id="addResistAddButton" class="button is-link is-rounded">Add</button></div>');

  $('#addResistAddButton').click(function(){

      let resistType = $('#addResistNewType').val();
      let resistAmount = $('#addResistNewAmount').val();

      if(resistType != null && resistType != '' && resistAmount != null && resistAmount != ''){

        let srcStruct = {
          sourceType: 'user-added',
          sourceLevel: 0,
          sourceCode: resistType+' '+resistAmount+' Resist',
          sourceCodeSNum: 'a',
        };
        socket.emit("requestResistanceChange",
          getCharIDFromURL(),
          srcStruct,
          resistType,
          resistAmount
        );

      }

  });

}