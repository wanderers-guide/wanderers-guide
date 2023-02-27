/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

// ~~~~~~~~~~~~~~ // Run on Load // ~~~~~~~~~~~~~~ //
$(function () {

});

function changeTab(type, data) {

    $('#tabContent').html('');

    $('#actionsTab').parent().removeClass("is-active");
    $('#weaponsTab').parent().removeClass("is-active");
    $('#spellsTab').parent().removeClass("is-active");
    $('#inventoryTab').parent().removeClass("is-active");
    $('#companionsTab').parent().removeClass("is-active");
    $('#detailsTab').parent().removeClass("is-active");
    $('#notesTab').parent().removeClass("is-active");

    $('#'+type).parent().addClass("is-active");
    g_selectedTabID = type;

    if(type == 'actionsTab'){
        openActionsTab(data);
    } else if(type == 'weaponsTab'){
        openWeaponsTab(data);
    } else if(type == 'spellsTab'){
        openSpellTab(data);
    } else if(type == 'inventoryTab'){
        openInventoryTab(data);
    } else if(type == 'companionsTab'){
        openCompanionTab(data);
    } else if(type == 'detailsTab'){
        openDetailsTab(data);
    } else if(type == 'notesTab'){
        openNotesTab(data);
    }

}
