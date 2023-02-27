/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

$(function () {

    socket.emit("requestAdminExtraDetails");

});

socket.on("returnAdminExtraDetails", function(extrasObject){
  
    let extraMap = objToMap(extrasObject);

    let extraData = extraMap.get(getExtraEditorIDFromURL()+"");

    if(extraData == null){
      window.location.href = '/admin/manage/extra';
      return;
    }

    $("#inputName").val(extraData.Extra.name);
    $("#inputExtraType").val(extraData.Extra.type);
    $("#inputRarity").val(extraData.Extra.rarity);
    $("#inputSize").val(extraData.Extra.size);
    $("#inputLevel").val(extraData.Extra.level);
    $("#inputDescription").val(extraData.Extra.description);
    $("#inputPrice").val(extraData.Extra.price);
    $("#inputContentSource").val(extraData.Extra.contentSrc);

    $("#inputHitPoints").val(extraData.Extra.hitPoints);
    $("#inputBrokenThreshold").val(extraData.Extra.brokenThreshold);
    $("#inputHardness").val(extraData.Extra.hardness);

    for(let extraTag of extraData.Tags){
      $("#inputTags").find('option[value='+extraTag.id+']').attr('selected','selected');
    }
    $("#inputTags").trigger("chosen:updated");

    $("#inputExtraType").trigger('change');

    $("#updateButton").click(function(){
      $(this).unbind();
      finishExtra(true);
    });

});