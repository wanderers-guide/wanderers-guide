/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

function openSpellEmptyQuickview(data) {

    if(data.ViewType == 1){
        $('#quickViewTitle').html('Empty Slot');
    } else if(data.ViewType == 2){
        $('#quickViewTitle').html('Spell Slot');
    }
    let qContent = $('#quickViewContent');

    if(data.SpellSlotData != null){ // Set Slot Color-Type //
        
        let typeStruct = getSpellTypeStruct(data.SpellSlotData.Slot.type);

        let displayColorTypes = function(typeStruct) {
            let redTypeIcon = (typeStruct.Red) ? 'fas fa-xs fa-circle' : 'far fa-xs fa-circle';
            let greenTypeIcon = (typeStruct.Green) ? 'fas fa-xs fa-circle' : 'far fa-xs fa-circle';
            let blueTypeIcon = (typeStruct.Blue) ? 'fas fa-xs fa-circle' : 'far fa-xs fa-circle';
    
            $('#quickViewTitleRight').html('<span class="pr-2"><span class="icon has-text-danger is-small cursor-clickable spellSlotRedType"><i class="'+redTypeIcon+'"></i></span><span class="icon has-text-success is-small cursor-clickable spellSlotGreenType"><i class="'+greenTypeIcon+'"></i></span><span class="icon has-text-link is-small cursor-clickable spellSlotBlueType"><i class="'+blueTypeIcon+'"></i></span></span>');

            $('.spellSlotRedType').click(function(){
                typeStruct.Red = !typeStruct.Red;
                data.SpellSlotData.Slot.type = getSpellTypeData(typeStruct);
                socket.emit("requestSpellSlotUpdate",
                    getCharIDFromURL(),
                    data.SpellSlotData.Slot);
                displayColorTypes(typeStruct);
                openSpellSRCTab(data.SpellSlotData.SpellSRC, data.SpellSlotData.Data);
            });
    
            $('.spellSlotGreenType').click(function(){
                typeStruct.Green = !typeStruct.Green;
                data.SpellSlotData.Slot.type = getSpellTypeData(typeStruct);
                socket.emit("requestSpellSlotUpdate",
                    getCharIDFromURL(),
                    data.SpellSlotData.Slot);
                displayColorTypes(typeStruct);
                openSpellSRCTab(data.SpellSlotData.SpellSRC, data.SpellSlotData.Data);
            });
    
            $('.spellSlotBlueType').click(function(){
                typeStruct.Blue = !typeStruct.Blue;
                data.SpellSlotData.Slot.type = getSpellTypeData(typeStruct);
                socket.emit("requestSpellSlotUpdate",
                    getCharIDFromURL(),
                    data.SpellSlotData.Slot);
                displayColorTypes(typeStruct);
                openSpellSRCTab(data.SpellSlotData.SpellSRC, data.SpellSlotData.Data);
            });
        };

        displayColorTypes(typeStruct);
    
    }

    let emptySlotText;
    if(data.ViewType == 1){
        emptySlotText = 'This spell slot is empty. To fill it with a spell, drag and drop a spell from your spell list over to the slot.\nYou can assign a color to a spell slot to distinguish it from others - this has no effect, it is solely there for your convenience as a way to distinguish slots when needed.';
    } else if(data.ViewType == 2){
        emptySlotText = 'This is one of your spell slots.\nYou can assign a color to a spell slot to distinguish it from others - this has no effect, it is solely there for your convenience as a way to distinguish slots when needed.';
    }
    qContent.append(processText(emptySlotText, true, true, 'MEDIUM'));

    // User Added, Remove Button
    if(data.SpellSlotData.Slot.srcStruct.sourceType == 'user-added'){
      qContent.append('<div class="buttons is-centered is-marginless"><a id="removeUserAddedSlotButton" class="button is-small is-danger is-rounded is-outlined mt-3">Remove Slot</a></div>');

      $('#removeUserAddedSlotButton').click(function(){ // Remove User-Added Spell Slot
        
        socket.emit("requestSpellSlotChange",
            getCharIDFromURL(),
            data.SpellSlotData.Slot.srcStruct,
            data.SpellSlotData.Slot.SpellSRC,
            null
        );

        // Remove spell slot from g_spellSlotsMap
        let newSlotArray = [];
        for(let slot of g_spellSlotsMap.get(data.SpellSlotData.Slot.SpellSRC)){
          if(slot.slotID != data.SpellSlotData.Slot.slotID){
            newSlotArray.push(slot);
          }
        }
        g_spellSlotsMap.set(data.SpellSlotData.Slot.SpellSRC, newSlotArray);

      });
    }

}