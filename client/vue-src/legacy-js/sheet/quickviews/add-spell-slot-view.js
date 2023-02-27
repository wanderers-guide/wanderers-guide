/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

function openAddSpellSlotQuickview(data) {

    $('#quickViewTitle').html("Add Spell Slot");
    let qContent = $('#quickViewContent');

    qContent.append('<div class="field is-grouped is-grouped-centered"><div class="control"><div class="select"><select id="addSlotLevel"><option value="0">Cantrip</option><option value="1">1st</option><option value="2">2nd</option><option value="3">3rd</option><option value="4">4th</option><option value="5">5th</option><option value="6">6th</option><option value="7">7th</option><option value="8">8th</option><option value="9">9th</option><option value="10">10th</option></select></div></div></div>');

    qContent.append('<div class="buttons is-centered pt-2"><button id="addSlotAddButton" class="button is-link is-rounded">Add</button></div>');

    $('#addSlotAddButton').click(function(){

        let slotLevel = $('#addSlotLevel').val();
        
        let srcStruct = {
          sourceType: 'user-added',
          sourceLevel: 0, // Random int for 'unique' srcStruct (temp solution)
          sourceCode: 'AddedSlot-'+Math.floor(Math.random() * Number.MAX_SAFE_INTEGER),
          sourceCodeSNum: 'a',
        };
        socket.emit("requestSpellSlotChange",
          getCharIDFromURL(),
          srcStruct,
          data.SpellSRC,
          slotLevel
        );

    });

}