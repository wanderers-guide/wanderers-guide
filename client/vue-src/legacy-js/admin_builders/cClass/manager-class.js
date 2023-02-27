/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

let socket = io();

let activeModalClassID = -1;

// ~~~~~~~~~~~~~~ // Run on Load // ~~~~~~~~~~~~~~ //
$(function () {

    let classCards = $('.class-card');
    for(const classCard of classCards){

        let classID = $(classCard).attr('name');
        let cardEdit = $(classCard).find('.class-card-edit');
        let cardDelete = $(classCard).find('.class-card-delete');

        let classIsArchived = $(classCard).attr('data-is-archived');

        cardEdit.mouseenter(function(){
            $(this).addClass('card-footer-hover');
        });
        cardEdit.mouseleave(function(){
            $(this).removeClass('card-footer-hover');
        });
        cardEdit.click(function() {
            window.location.href = '/admin/edit/class/'+classID;
        });

        cardDelete.mouseenter(function(){
            $(this).addClass('card-footer-hover');
        });
        cardDelete.mouseleave(function(){
            $(this).removeClass('card-footer-hover');
        });
        cardDelete.click(function() {
          if(classIsArchived == 'true'){
            $('.modal').addClass('is-active');
            $('html').addClass('is-clipped');
            activeModalClassID = classID;
          }
        });

        $('.modal-card-close').click(function() {
            $('.modal').removeClass('is-active');
            $('html').removeClass('is-clipped');
            activeModalClassID = -1;
        });
        $('.modal-background').click(function() {
            $('.modal').removeClass('is-active');
            $('html').removeClass('is-clipped');
            activeModalClassID = -1;
        });

    }

    $('#delete-confirmation-btn').click(function() {
        socket.emit("requestAdminRemoveClass", activeModalClassID);
    });

}); 

socket.on("returnAdminRemoveClass", function() {
    window.location.href = '/admin/manage/class';
});