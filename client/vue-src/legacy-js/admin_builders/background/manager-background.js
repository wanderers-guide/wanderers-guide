/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

let socket = io();

let activeModalBackgroundID = -1;

// ~~~~~~~~~~~~~~ // Run on Load // ~~~~~~~~~~~~~~ //
$(function () {

    let entries = $('.entryListing');
    for(const entry of entries){

        let backgroundID = $(entry).attr('name');
        let cardEdit = $(entry).find('.entry-update');
        let cardDelete = $(entry).find('.entry-delete');

        cardEdit.mouseenter(function(){
            $(this).addClass('entry-footer-hover');
        });
        cardEdit.mouseleave(function(){
            $(this).removeClass('entry-footer-hover');
        });
        cardEdit.click(function() {
            window.location.href = '/admin/edit/background/'+backgroundID;
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
            activeModalBackgroundID = backgroundID;
        });

        $('.modal-card-close').click(function() {
            $('.modal').removeClass('is-active');
            $('html').removeClass('is-clipped');
            activeModalBackgroundID = -1;
        });
        $('.modal-background').click(function() {
            $('.modal').removeClass('is-active');
            $('html').removeClass('is-clipped');
            activeModalBackgroundID = -1;
        });

    }

    $('#delete-confirmation-btn').click(function() {
        socket.emit("requestAdminRemoveBackground", activeModalBackgroundID);
    });

}); 

socket.on("returnAdminRemoveBackground", function() {
    window.location.href = '/admin/manage/background';
});