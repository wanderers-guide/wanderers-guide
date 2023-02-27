/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

let socket = io();

let activeModalSpellID = -1;

// ~~~~~~~~~~~~~~ // Run on Load // ~~~~~~~~~~~~~~ //
$(function () {

    let entries = $('.entryListing');
    for(let entry of entries){

        let spellID = $(entry).attr('name');
        let cardEdit = $(entry).find('.entry-update');
        let cardDelete = $(entry).find('.entry-delete');

        cardEdit.mouseenter(function(){
            $(this).addClass('entry-footer-hover');
        });
        cardEdit.mouseleave(function(){
            $(this).removeClass('entry-footer-hover');
        });
        cardEdit.click(function() {
            window.location.href = '/admin/edit/spell/'+spellID;
        });

        cardDelete.mouseenter(function(){
            $(this).addClass('entry-footer-hover');
        });
        cardDelete.mouseleave(function(){
            $(this).removeClass('entry-footer-hover');
        });
        cardDelete.click(function() {
            $('.modal').addClass('is-active');
            $('html').addClass('is-clipped');
            activeModalSpellID = spellID;
        });

        $('.modal-card-close').click(function() {
            $('.modal').removeClass('is-active');
            $('html').removeClass('is-clipped');
            activeModalSpellID = -1;
        });
        $('.modal-background').click(function() {
            $('.modal').removeClass('is-active');
            $('html').removeClass('is-clipped');
            activeModalSpellID = -1;
        });

    }

    $('#delete-confirmation-btn').click(function() {
        socket.emit("requestAdminRemoveSpell", activeModalSpellID);
    });

    initSearchBar();

});

socket.on("returnAdminRemoveSpell", function() {
    window.location.href = '/admin/manage/spell';
});

function initSearchBar(){

    const searchBarID = 'spellsSearch';
    const levelFilterID = 'spellsFilterByLevel';

    $('#'+searchBarID).change(function(){
        filterEntries(searchBarID, levelFilterID);
    });
    $('#'+levelFilterID).change(function(){
        filterEntries(searchBarID, levelFilterID);
    });

}

function filterEntries(searchBarID, levelFilterID){

    let searchBar = $('#'+searchBarID);
    let searchBarValue = (searchBar.val() === "") ? null : searchBar.val();
    if(searchBarValue == null){
        searchBar.removeClass('is-info');
    } else {
        searchBar.addClass('is-info');
    }

    let levelFilter = $('#'+levelFilterID);
    let levelFilterValue = levelFilter.val();
    if(levelFilterValue === "All"){
        levelFilter.parent().removeClass('is-info');
    } else {
        levelFilter.parent().addClass('is-info');
    }
    levelFilter.blur();

    if(searchBarValue != null){
        searchBarValue = searchBarValue.toUpperCase();
    }

    let entries = $('.entryListing');
    for(let entry of entries){

        let entryName = $(entry).attr('data-entry-name').toUpperCase();
        let entryLevel = $(entry).attr('data-entry-level');

        let isHidden = false;

        if(searchBarValue != null){
            if(!entryName.includes(searchBarValue)){
                isHidden = true;
            }
        }

        if(levelFilterValue !== "All"){
            if(entryLevel != levelFilterValue){
                isHidden = true;
            }
        }

        if(isHidden){
            $(entry).addClass('is-hidden');
        } else {
            $(entry).removeClass('is-hidden');
        }

    }

}