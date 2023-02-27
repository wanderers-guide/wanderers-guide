/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

let socket = io();

let activeModalAncestryID = -1;

// ~~~~~~~~~~~~~~ // Run on Load // ~~~~~~~~~~~~~~ //
$(function () {

    let ancestryCards = $('.ancestry-card');
    for(const ancestryCard of ancestryCards){

        let ancestryID = $(ancestryCard).attr('name');
        let cardEdit = $(ancestryCard).find('.ancestry-card-edit');
        let cardDelete = $(ancestryCard).find('.ancestry-card-delete');

        cardEdit.mouseenter(function(){
            $(this).addClass('card-footer-hover');
        });
        cardEdit.mouseleave(function(){
            $(this).removeClass('card-footer-hover');
        });
        cardEdit.click(function() {
            window.location.href = '/admin/edit/ancestry/'+ancestryID;
        });

        cardDelete.mouseenter(function(){
            $(this).addClass('card-footer-hover');
        });
        cardDelete.mouseleave(function(){
            $(this).removeClass('card-footer-hover');
        });
        cardDelete.click(function() {
            $('.modal').addClass('is-active');
            $('html').addClass('is-clipped');
            activeModalAncestryID = ancestryID;
        });

        $('.modal-card-close').click(function() {
            $('.modal').removeClass('is-active');
            $('html').removeClass('is-clipped');
            activeModalAncestryID = -1;
        });
        $('.modal-background').click(function() {
            $('.modal').removeClass('is-active');
            $('html').removeClass('is-clipped');
            activeModalAncestryID = -1;
        });

    }

    $('#delete-confirmation-btn').click(function() {
        socket.emit("requestAdminRemoveAncestry", activeModalAncestryID);
    });

}); 

socket.on("returnAdminRemoveAncestry", function() {
    window.location.href = '/admin/manage/ancestry';
});