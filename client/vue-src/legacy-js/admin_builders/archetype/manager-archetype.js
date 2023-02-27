/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

let socket = io();

let activeModalArchetypeID = -1;

// ~~~~~~~~~~~~~~ // Run on Load // ~~~~~~~~~~~~~~ //
$(function () {

    let entries = $('.entryListing');
    for(const entry of entries){

        let archetypeID = $(entry).attr('name');
        let cardEdit = $(entry).find('.entry-update');
        let cardDelete = $(entry).find('.entry-delete');

        cardEdit.mouseenter(function(){
            $(this).addClass('entry-footer-hover');
        });
        cardEdit.mouseleave(function(){
            $(this).removeClass('entry-footer-hover');
        });
        cardEdit.click(function() {
            window.location.href = '/admin/edit/archetype/'+archetypeID;
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
            activeModalArchetypeID = archetypeID;
        });
        

        $('.modal-card-close').click(function() {
            $('.modal').removeClass('is-active');
            $('html').removeClass('is-clipped');
            activeModalArchetypeID = -1;
        });
        $('.modal-background').click(function() {
            $('.modal').removeClass('is-active');
            $('html').removeClass('is-clipped');
            activeModalArchetypeID = -1;
        });

    }

    $('#delete-confirmation-btn').click(function() {
        socket.emit("requestAdminRemoveArchetype", activeModalArchetypeID);
    });

}); 

socket.on("returnAdminRemoveArchetype", function() {
    window.location.href = '/admin/manage/archetype';
});