/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

let socket = io();

// ~~~~~~~~~~~~~~ // Run on Load // ~~~~~~~~~~~~~~ //
$(function () {

    // ~ Content Sources ~ //
    for(let contSrcData of g_contentSources){
      if(g_currentContentSource === contSrcData.CodeName){
        $("#inputContentSource").append('<option value="'+contSrcData.CodeName+'" selected>'+contSrcData.TextName+'</option>');
      } else {
        $("#inputContentSource").append('<option value="'+contSrcData.CodeName+'">'+contSrcData.TextName+'</option>');
      }
    }
    // ~ ~~~~~~~~~~~~~~~ ~ //

    $("#inputTags").chosen();

    $("#inputExtraType").change(function(){
      if($(this).val() == "VEHICLE" || $(this).val() == "OTHER"){
        $("#sectionHealth").removeClass('is-hidden');
      } else {
        $("#sectionHealth").addClass('is-hidden');
      }
    });
    $("#inputExtraType").trigger('change');

    $("#createButton").click(function(){
        $(this).unbind();
        finishExtra(false);
    });

});

function finishExtra(isUpdate){

    let extraName = $("#inputName").val();
    let extraRarity = $("#inputRarity").val();
    let extraSize = $("#inputSize").val();
    let extraPrice = $("#inputPrice").val();
    let extraDescription = $("#inputDescription").val();
    let extraType = $("#inputExtraType").val();
    let extraLevel = $("#inputLevel").val();
    let extraTags = $("#inputTags").val();
    let extraContentSrc = $("#inputContentSource").val();

    let extraHitPoints, extraBrokenThreshold, extraHardness = null;
    if($("#sectionHealth").is(":visible")) {
      extraHitPoints = $("#inputHitPoints").val();
      extraBrokenThreshold = $("#inputBrokenThreshold").val();
      extraHardness = $("#inputHardness").val();
    } else {
      extraHitPoints = 0;
      extraBrokenThreshold = 0;
      extraHardness = 0;
    }

    let requestPacket = null;
    let extraID = null;
    if(isUpdate){
        requestPacket = "requestAdminUpdateExtra";
        extraID = getExtraEditorIDFromURL();
    } else {
        requestPacket = "requestAdminAddExtra";
    }

    socket.emit(requestPacket,{
        extraID,
        extraName,
        extraRarity,
        extraPrice,
        extraSize,
        extraDescription,
        extraType,
        extraLevel,
        extraTags,
        extraHitPoints,
        extraBrokenThreshold,
        extraHardness,
        extraContentSrc
    });

}

socket.on("returnAdminCompleteExtra", function() {
  window.location.href = '/admin/manage/extra';
});