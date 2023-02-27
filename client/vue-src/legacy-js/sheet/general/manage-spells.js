/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

let prev_spellSRC, prev_spellData = null;
let current_spellSRC = null;

// ~~~~~~~~~~~~~~ // Run on Load // ~~~~~~~~~~~~~~ //
$(function () {

    $('#manageSpellsModalBackground').click(function(){
      current_spellSRC = null;
      closeManageSpellsModal();
    });
    $('#manageSpellsModalCloseButton').click(function(){
      current_spellSRC = null;
      closeManageSpellsModal();
    });

    $('#manageSpellsAddNewSlotBtn').click(function(){
      if(current_spellSRC != null){
        openQuickView('addSpellSlotView', {
          SpellSRC: current_spellSRC,
        });
      }
    });

});

function openManageSpellsModal(data){

    $('#manageSpellsTabs').html('');
    for(let spellBook of g_spellBookArray) {
        if(spellBook.IsFocus) {continue;}
        let spellSRCTabID = 'spellSRCTab'+spellBook.SpellSRC.replace(/\s/g, "_");
        $('#manageSpellsTabs').append('<li id="'+spellSRCTabID+'" class="spellSRCTabs"><a>'+capitalizeWords(spellBook.SpellSRC)+'</a></li>');

        $('#'+spellSRCTabID).click(function(){
            $('.spellSRCTabs').removeClass('is-active');
            $('#'+spellSRCTabID).addClass('is-active');
            openSpellSRCTab(spellBook.SpellSRC, data);
            $('#manageSpellsSlots').scrollTop(0);
        });

    }

    $("#manageSpellsTabs").children(":first").trigger("click");


    $('#manageSpellsModalDefault').addClass('is-active');
    $('html').addClass('is-clipped');

}

function closeManageSpellsModal(){

    $('#spellsTab').trigger("click", [true]);

    $('#manageSpellsModalDefault').removeClass('is-active');
    $('html').removeClass('is-clipped');

}



// Socket.IO Spellbook Update //
socket.on("returnSpellBookUpdated", function(spellBookStruct){
    for (let i = 0; i < g_spellBookArray.length; i++) {
        let spellBook = g_spellBookArray[i];
        if(spellBook.SpellSRC === spellBookStruct.SpellSRC && !spellBook.IsFocus){
            g_spellBookArray[i] = spellBookStruct;
        }
    }

    if(prev_spellSRC != null && prev_spellData != null){
        openSpellSRCTab(prev_spellSRC, prev_spellData);
        prev_spellSRC = null; prev_spellData = null;
    }
});



function openSpellSRCTab(spellSRC, data){
    current_spellSRC = spellSRC;
    
    let spellBook = g_spellBookArray.find(spellBook => {
        return spellBook.SpellSRC === spellSRC;
    });
    spellBook.SpellBook = removeAllNullSpells(spellBook.SpellBook);
    spellBook.SpellBook = spellBook.SpellBook.sort(
        function(a, b) {
            let aStruct = data.SpellMap.get(a.SpellID+"");
            let bStruct = data.SpellMap.get(b.SpellID+"");
            if (a.SpellLevel === b.SpellLevel) {
                // Name is only important when levels are the same
                if(aStruct == null || bStruct == null) { return -1; }
                return aStruct.Spell.name > bStruct.Spell.name ? 1 : -1;
            }
            return a.SpellLevel - b.SpellLevel;
        }
    );

    $('#manageSpellsOpenSpellListsBtn').off('click');
    $('#manageSpellsOpenSpellListsBtn').click(function(){
        openQuickView('addSpellView', {
            SpellBook: spellBook,
            Data: data,
        });
    });

    if(spellBook.SpellCastingType === 'SPONTANEOUS-REPERTOIRE' || spellBook.SpellCastingType === 'FLEXIBLE-COLLECTION') {
        displaySpellSpontaneous(spellBook, data);
        displaySpellSlotsSpontaneous(spellSRC, data);
    } else {
        displaySpellBookPrepared(spellBook, data);
        displaySpellSlotsPrepared(spellSRC, data);
    }

    if(spellBook.SpellCastingType === 'PREPARED-BOOK'){
        $('#manageSpellsListName').html('<p class="is-size-5 has-text-centered has-tooltip-multiline has-tooltip-bottom" data-tooltip="All the spells you know how to prepare and cast are kept in your spellbook. Your spellbook starts with 10 common cantrips and five common 1st-level spells. At every additional level, you add two more spells to your book. You may also come across spells in your adventures which you can add to your book as well.">Spellbook</p>');
    } else if(spellBook.SpellCastingType === 'PREPARED-FAMILIAR'){
        $('#manageSpellsListName').html('<p class="is-size-5 has-text-centered has-tooltip-multiline has-tooltip-bottom" data-tooltip="Your familiar functions as a direct conduit between you and your patron. Your patron teaches your familiar spells who then teaches and facilitates those spells to you. Your familiar starts off knowing 10 cantrips, five 1st-level spells, and one additional spell determined by your patron’s theme. At every additional level, your familiar learns two new spells of any level you can cast, chosen from common spells of your tradition or others you gain access to.">Familiar\'s Spells</p>');
    } else if(spellBook.SpellCastingType === 'PREPARED-LIST'){
        $('#manageSpellsListName').html('<p class="is-size-5 has-text-centered has-tooltip-multiline has-tooltip-bottom" data-tooltip="You know how to prepare and cast all common spells from your tradition\'s spell list ('+capitalizeWord(spellBook.SpellList)+'). Add the appropriate spells to your spell list accordingly.">Spell List</p>');
    } else if(spellBook.SpellCastingType === 'SPONTANEOUS-REPERTOIRE'){
        $('#manageSpellsListName').html('<p class="is-size-5 has-text-centered has-tooltip-multiline has-tooltip-bottom" data-tooltip="Your spell repertoire is the collection of spells you know how to cast and at which level. Each time you gain new spell slots, add that many spells of that level to your spell repertoire and you may also switch out an old spell for a different one of the same level.">Spell Repertoire</p>');
    } else if(spellBook.SpellCastingType === 'FLEXIBLE-COLLECTION'){
      $('#manageSpellsListName').html('<p class="is-size-5 has-text-centered has-tooltip-multiline has-tooltip-bottom" data-tooltip="Your spell collection is the list of spells you prepare each day that you can cast at any appropriate level. The size of your spell collection is equal to the number of spell slots you have. You still prepare cantrips as normal. Lastly, you must select at least one 1st-level spell for your collection each time you prepare, ensuring that you can use all your spell slots each day.">Spell Collection</p>');
    }

}




function displaySpellSpontaneous(spellBook, data) {

    let spellBookSearch = $('#manageSpellsSpellBookSearch');
    let spellBookSearchInput = null;
    if(spellBookSearch.val() != ''){
        spellBookSearchInput = spellBookSearch.val().toLowerCase();
        spellBookSearch.addClass('is-info');
    } else {
        spellBookSearch.removeClass('is-info');
    }

    $('#manageSpellsSpellBookSearch').off('change');
    $('#manageSpellsSpellBookSearch').change(function(){
        displaySpellSpontaneous(spellBook, data);
    });


    $('#manageSpellsSpellBook').html('');
    let spellListingCount = 0;
    for(let spellData of spellBook.SpellBook) {

        let spellDataStruct = data.SpellMap.get(spellData.SpellID+"");

        // Filter Thru Search //
        let willDisplay = true;
        if(spellBookSearchInput != null){
            let spellName = spellDataStruct.Spell.name.toLowerCase();
            if(!spellName.includes(spellBookSearchInput)){
                willDisplay = false;
            }
        }

        if(!willDisplay){continue;}
        // Display Spell in SpellBook //
        if(spellDataStruct == null){continue;}

        let spellName = spellDataStruct.Spell.name;
        if(spellDataStruct.Spell.isArchived === 1){
            spellName += '<em class="pl-1">(archived)</em>';
        }

        let bulmaColor = getSpellTypeBulmaColor(spellData.SpellType);
        if(bulmaColor != '' && bulmaColor != 'has-text-info'){
          spellName += '<span style="left:-25px; top:-5px;" class="pos-absolute icon is-medium '+bulmaColor+'"><i class="fas fa-xs fa-circle"></i></span>';
        }

        let spellBookListingID = "spellBookListing"+spellListingCount;
        let spellLevel = (spellData.SpellLevel == 0) ? "Cantrip" : "Lvl "+spellData.SpellLevel;

        $('#manageSpellsSpellBook').append('<div id="'+spellBookListingID+'" class="border-bottom border-dark-lighter cursor-clickable has-bg-selectable" name="'+spellDataStruct.Spell.id+'" style="z-index: 40; border-radius: 5px;"><span class="is-size-6 has-txt-listing ml-3 mr-1 pos-relative">'+spellName+'</span><span class="is-size-7 has-txt-listing is-pulled-right ml-1 mr-3">('+spellLevel+')</span></div>');
        
        $('#'+spellBookListingID).click(function(){
            openQuickView('spellView', {
                SpellDataStruct: spellDataStruct,
                SRCTabData: {
                  SpellBookSpellID: spellData.SpellBookSpellID,
                  SpellSRC: spellBook.SpellSRC,
                  SpellLevel: spellData.SpellLevel,
                  SpellType: spellData.SpellType,
                  Data: data},
            });
        });

        $('#'+spellBookListingID).mouseenter(function(){
            $(this).addClass('has-bg-selectable-hover');
        });
        $('#'+spellBookListingID).mouseleave(function(){
            $(this).removeClass('has-bg-selectable-hover');
        });

        //$('#'+spellBookListingID).draggable({ opacity: 0.8, helper: "clone", revert: true });

        spellListingCount++;
    }

    if(spellBook.SpellBook.length == 0){
        $('#manageSpellsSpellBook').append('<p class="is-size-7 has-text-centered is-italic pt-2">You have no spells!</p>');
    }

}

function displaySpellSlotsSpontaneous(spellSRC, data) {

    let spellSlotArray = data.SpellSlotsMap.get(spellSRC);
    let spellSlotMap = new Map();
    for(let spellSlot of spellSlotArray){
        let spellSlotMapArray = [];
        if(spellSlotMap.has(spellSlot.slotLevel)){
            spellSlotMapArray = spellSlotMap.get(spellSlot.slotLevel);
        }
        spellSlotMapArray.push(spellSlot);
        spellSlotMap.set(spellSlot.slotLevel, spellSlotMapArray);
    }

    $('#manageSpellsSlots').html('');
    for(const [level, slotArray] of spellSlotMap){
        let sortedSlotArray = slotArray.sort(
            function(a, b) {
                return (a.used && !b.used) ? -1 : 1;
            }
        );

        let sectionName = (level == 0) ? 'Cantrips' : 'Level '+level;
        $('#manageSpellsSlots').append('<p class="is-size-5 has-txt-partial-noted has-text-weight-bold text-left pl-5">'+sectionName+'</p>');
        $('#manageSpellsSlots').append('<hr class="hr-highlighted" style="margin-top:-0.5em; margin-bottom:0em;">');

        let spellSlotsButtonsID = 'spellManagerSlotsButtons'+level;
        $('#manageSpellsSlots').append('<div id="'+spellSlotsButtonsID+'" class="text-center mt-3"></div>');
        if(level != 0) {
            
            for(let slot of sortedSlotArray){
                let spellManagerSlotID = 'spellManagerSlot'+slot.slotID;

                let bulmaColor = getSpellTypeBulmaColor(slot.type);

                let isSlotCustomClass = (slot.srcStruct.sourceType == 'user-added') ? 'is-underlined-thin-darker' : '';
                if(slot.used) {
                    $('#'+spellSlotsButtonsID).append('<span id="'+spellManagerSlotID+'" class="icon is-medium '+bulmaColor+' mx-2 has-tooltip-bottom '+isSlotCustomClass+'" data-tooltip="Consumed Slot"><i class="fas fa-2x fa-square"></i></span>');
                } else {
                    $('#'+spellSlotsButtonsID).append('<span id="'+spellManagerSlotID+'" class="icon is-medium '+bulmaColor+' mx-2 has-tooltip-bottom '+isSlotCustomClass+'" data-tooltip="Available Slot"><i class="far fa-2x fa-square"></i></span>');
                }

                $('#'+spellManagerSlotID).click(function(){
                    openQuickView('spellEmptyView', {
                        ViewType: 2,
                        SpellSlotData: {Slot: slot, SpellSRC: spellSRC, Data: data},
                    });
                });

            }
            if(sortedSlotArray.length == 1){
                $('#'+spellSlotsButtonsID).append('<p class="is-size-5 is-italic">'+sortedSlotArray.length+' Spell Slot</p>');
            } else {
                $('#'+spellSlotsButtonsID).append('<p class="is-size-5 is-italic">'+sortedSlotArray.length+' Spell Slots</p>');
            }

        } else {
            for(let slot of sortedSlotArray){
                let spellManagerSlotID = 'spellManagerCantripSlot'+slot.slotID;

                let bulmaColor = getSpellTypeBulmaColor(slot.type);

                let isSlotCustomClass = (slot.srcStruct.sourceType == 'user-added') ? 'is-underlined-thin-darker' : '';
                $('#'+spellSlotsButtonsID).append('<span id="'+spellManagerSlotID+'" class="icon is-medium cursor-clickable '+bulmaColor+' mx-2 '+isSlotCustomClass+'"><i class="fas fa-2x fa-dot-circle"></i></span>');

                $('#'+spellManagerSlotID).click(function(){
                    openQuickView('spellEmptyView', {
                        ViewType: 2,
                        SpellSlotData: {Slot: slot, SpellSRC: spellSRC, Data: data},
                    });
                });
            }
            $('#'+spellSlotsButtonsID).append('<p class="is-size-5 is-italic">'+sortedSlotArray.length+' Cantrips</p>');
        }

    }

}






function displaySpellBookPrepared(spellBook, data) {

    let spellBookSearch = $('#manageSpellsSpellBookSearch');
    let spellBookSearchInput = null;
    if(spellBookSearch.val() != ''){
        spellBookSearchInput = spellBookSearch.val().toLowerCase();
        spellBookSearch.addClass('is-info');
    } else {
        spellBookSearch.removeClass('is-info');
    }

    $('#manageSpellsSpellBookSearch').off('change');
    $('#manageSpellsSpellBookSearch').change(function(){
        displaySpellBookPrepared(spellBook, data);
    });


    $('#manageSpellsSpellBook').html('');
    let spellListingCount = 0;
    for(let spellData of spellBook.SpellBook) {

        let spellDataStruct = data.SpellMap.get(spellData.SpellID+"");

        // Filter Thru Search //
        let willDisplay = true;
        if(spellBookSearchInput != null){
            let spellName = spellDataStruct.Spell.name.toLowerCase();
            if(!spellName.includes(spellBookSearchInput)){
                willDisplay = false;
            }
        }

        if(!willDisplay){continue;}
        // Display Spell in SpellBook //
        if(spellDataStruct == null){continue;}

        let spellName = spellDataStruct.Spell.name;
        if(spellDataStruct.Spell.isArchived === 1){
            spellName += '<em class="pl-1">(archived)</em>';
        }

        let bulmaColor = getSpellTypeBulmaColor(spellData.SpellType);
        if(bulmaColor != '' && bulmaColor != 'has-text-info'){
          spellName += '<span style="left:-25px; top:-5px;" class="pos-absolute icon is-medium '+bulmaColor+'"><i class="fas fa-xs fa-circle"></i></span>';
        }

        let spellBookListingID = "spellBookListing"+spellListingCount;
        let spellLevel = (spellDataStruct.Spell.level == 0) ? "Cantrip" : "Lvl "+spellDataStruct.Spell.level;

        $('#manageSpellsSpellBook').append('<div id="'+spellBookListingID+'" class="border-bottom border-dark-lighter cursor-clickable has-bg-selectable" name="'+spellDataStruct.Spell.id+'" style="z-index: 40; border-radius: 5px;"><span class="is-size-6 has-txt-listing ml-3 mr-1 pos-relative">'+spellName+'</span><span class="is-size-7 has-txt-listing is-pulled-right ml-1 mr-3">('+spellLevel+')</span></div>');
        
        $('#'+spellBookListingID).click(function(){
            openQuickView('spellView', {
                SpellDataStruct: spellDataStruct,
                SRCTabData: {
                  SpellBookSpellID: spellData.SpellBookSpellID,
                  SpellSRC: spellBook.SpellSRC,
                  SpellLevel: spellData.SpellLevel,
                  SpellType: spellData.SpellType,
                  Data: data},
            });
        });

        $('#'+spellBookListingID).mouseenter(function(){
            $(this).addClass('has-bg-selectable-hover');
        });
        $('#'+spellBookListingID).mouseleave(function(){
            $(this).removeClass('has-bg-selectable-hover');
        });

        $('#'+spellBookListingID).draggable({ opacity: 0.8, helper: "clone", revert: true });

        spellListingCount++;
    }

    if(spellBook.SpellBook.length == 0){
        $('#manageSpellsSpellBook').append('<p class="is-size-7 has-text-centered is-italic pt-2">You have no spells!</p>');
    }

}

function displaySpellSlotsPrepared(spellSRC, data) {

    let spellSlotArray = data.SpellSlotsMap.get(spellSRC);
    let spellSlotMap = new Map();
    for(let spellSlot of spellSlotArray){
        let spellSlotMapArray = [];
        if(spellSlotMap.has(spellSlot.slotLevel)){
            spellSlotMapArray = spellSlotMap.get(spellSlot.slotLevel);
        }
        spellSlotMapArray.push(spellSlot);
        spellSlotMap.set(spellSlot.slotLevel, spellSlotMapArray);
    }

    $('#manageSpellsSlots').html('');
    for(const [level, slotArray] of spellSlotMap){

        let sectionName = (level == 0) ? 'Cantrips' : 'Level '+level;
        $('#manageSpellsSlots').append('<p class="is-size-5 has-txt-partial-noted has-text-weight-bold text-left pl-5">'+sectionName+'</p>');
        $('#manageSpellsSlots').append('<hr class="hr-highlighted" style="margin-top:-0.5em; margin-bottom:0em;">');

        let spellSlotsButtonsID = 'spellManagerSlotsButtons'+level;
        $('#manageSpellsSlots').append('<div id="'+spellSlotsButtonsID+'" class="buttons is-centered mt-1"></div>');
        for(let slot of slotArray){
            let spellManagerSlotID = 'spellManagerSlot'+slot.slotID;
            let spellDataStruct = data.SpellMap.get(slot.spellID+"");

            if(spellDataStruct != null) {

                let bulmaColor = getSpellTypeBulmaColor_SlotFilled(slot.type);

                let isSlotCustomClass = (slot.srcStruct.sourceType == 'user-added') ? 'is-underlined-darker' : '';
                $('#'+spellSlotsButtonsID).append('<p id="'+spellManagerSlotID+'" class="button '+bulmaColor+' '+isSlotCustomClass+'">'+spellDataStruct.Spell.name+'</p>');

                $('#'+spellManagerSlotID).click(function(){
                    openQuickView('spellView', {
                        SpellDataStruct: spellDataStruct,
                        SpellSlotData: {Slot: slot, SpellSRC: spellSRC, Data: data},
                    });
                });

            } else {

                let bulmaColor = getSpellTypeBulmaColor_SlotEmpty(slot.type);

                let isSlotCustomClass = (slot.srcStruct.sourceType == 'user-added') ? 'is-underlined-darker' : '';
                $('#'+spellSlotsButtonsID).append('<a id="'+spellManagerSlotID+'" class="button '+bulmaColor+' '+isSlotCustomClass+'">Empty</a>');

                $('#'+spellManagerSlotID).click(function(){
                    openQuickView('spellEmptyView', {
                        ViewType: 1,
                        SpellSlotData: {Slot: slot, SpellSRC: spellSRC, Data: data},
                    });
                });

            }

            $("#"+spellManagerSlotID).droppable({
                tolerance: "pointer",
                drop: function(event, ui) {
                    updateSpellSlot($(ui.draggable).attr('name'), slot, spellSRC, data);
                }
            });
            
        }

    }

}

function slotCanTakeSpell(spellDataStruct, slot){
    if(spellDataStruct.Spell.level > slot.slotLevel){
        return false;
    }
    if(spellDataStruct.Spell.level == 0 && slot.slotLevel != 0){
        return false;
    }

    return true;

}

function updateSpellSlot(spellID, slot, spellSRC, data){
    if(spellID != null) {
        let spellDataStruct = data.SpellMap.get(spellID+"");
        if(!slotCanTakeSpell(spellDataStruct, slot)){
            return;
        }
    }

    // Update Data Struct to Add Spell to Slot
    slot.spellID = spellID;
    socket.emit("requestSpellSlotUpdate",
        getCharIDFromURL(),
        slot);

    
    let spellSlotsArray = g_spellSlotsMap.get(spellSRC);
    if(spellSlotsArray != null){
        spellSlotsArray = updateSlotSpellID(spellSlotsArray, slot.slotID, spellID);
    }
    g_spellSlotsMap.set(spellSRC, spellSlotsArray);
    data.SpellSlotsMap = g_spellSlotsMap;

    openSpellSRCTab(spellSRC, data);

}

function updateSlotSpellID(spellSlotsArray, slotID, spellID) {
    for(let slot of spellSlotsArray){
        if(slot.slotID == slotID){
            slot.spellID = spellID;
            return spellSlotsArray;
        }
    }
    return spellSlotsArray;
}

function updateSlotUsed(spellSlotsArray, slotID, used) {
    for(let slot of spellSlotsArray){
        if(slot.slotID == slotID){
            slot.used = used;
            return spellSlotsArray;
        }
    }
    return spellSlotsArray;
}

function removeAllNullSpells(spellBook) {
    for(let i = spellBook.length - 1; i >= 0; i--) {
        if(spellBook[i] === null) {
            spellBook.splice(i, 1);
        }
    }
    return spellBook;
}
