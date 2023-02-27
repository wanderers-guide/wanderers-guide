/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

$(function () {

    // ~ Remove Footer ~ //
    $('#wanderers-guide-footer').addClass('is-hidden');
    $('#main-container').addClass('is-paddingless');
    // ~~~~~~~~~~~~~~~~~ //

    $(".text-processing").each(function(){
        $(this).html(processText($(this).text(), false, false, 'MEDIUM', false));
    });
    
    updateHideables();

    $(window).on('hashchange', function(e){
        updateHideables();
    });

});

function updateHideables(){
    $('.isHideable').each(function(){
        $(this).addClass('is-hidden');
    });
    if(window.location.hash != ''){
        $(window.location.hash).removeClass('is-hidden');
        $(window.location.hash+'>div.is-hidden').removeClass("is-hidden");
    }
}