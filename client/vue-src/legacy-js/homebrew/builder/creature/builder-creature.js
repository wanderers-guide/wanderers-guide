/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

let socket = io();
let g_homebrewID = null;

// ~~~~~~~~~~~~~~ // Run on Load // ~~~~~~~~~~~~~~ //
$(function () {

  socket.emit("requestHomebrewCreatureDetails", $('#builder-container').attr('data-bundle-id'));

});

socket.on("returnHomebrewCreatureDetails", function (creatureArray) {


  let skillCount = 0;
  $("#addSkillButton").click(function () {
    skillCount++;

    let skillID = "skill" + skillCount;
    let newSkill = $("#skillLayout").clone();
    newSkill.attr('id', skillID);
    newSkill.removeClass('is-hidden');
    newSkill.appendTo("#skillContent");

    let cardHeader = $("#" + skillID).find(".card-header");
    let cardContent = $("#" + skillID).find(".card-content");

    cardHeader.click(function () {
      if (cardContent.is(":visible")) {
        cardContent.addClass('is-hidden');
      } else {
        cardContent.removeClass('is-hidden');
      }
    });

    let cardHeaderIcon = $("#" + skillID).find(".card-header-icon");
    cardHeaderIcon.click(function () {
      $("#" + skillID).remove();
    });

    let inputSkillName = $("#" + skillID).find(".inputSkillName");
    inputSkillName.change(function () {
      $("#" + skillID).find(".card-header-title").html('Skill - ' + inputSkillName.val());
    });

  });

  let itemCount = 0;
  $("#addItemButton").click(function () {
    itemCount++;

    let itemID = "item" + itemCount;
    let newItem = $("#itemLayout").clone();
    newItem.attr('id', itemID);
    newItem.removeClass('is-hidden');
    newItem.appendTo("#itemContent");

    let cardHeader = $("#" + itemID).find(".card-header");
    let cardContent = $("#" + itemID).find(".card-content");

    cardHeader.click(function () {
      if (cardContent.is(":visible")) {
        cardContent.addClass('is-hidden');
      } else {
        cardContent.removeClass('is-hidden');
      }
    });

    let cardHeaderIcon = $("#" + itemID).find(".card-header-icon");
    cardHeaderIcon.click(function () {
      $("#" + itemID).remove();
    });

    let inputItemName = $("#" + itemID).find(".inputItemDisplayName");
    inputItemName.change(function () {
      $("#" + itemID).find(".card-header-title").html('Item - ' + inputItemName.val());
    });

  });




  $("#createButton").click(function () {
    $(this).unbind();
    finishCreature(false);
  });

  if ($("#createButton").length) {// If button exists
    stopSpinnerLoader();
  }
});

function finishCreature(isUpdate) {

  let name = $("#inputName").val();
  let level = $("#inputLevel").val();
  let rarity = $("#inputRarity").val();
  let alignment = $("#inputAlignment").val();
  let size = $("#inputSize").val();
  let tagsArray = $("#inputTags").val();
  let familyType = $("#inputFamilyType").val();
  let perceptionBonus = $("#inputPerceptionBonus").val();
  let senses = $("#inputSenses").val();
  let langsArray = $("#inputLanguages").val();
  let languagesCustom = $("#inputLanguagesCustom").val();

  let skillsArray = [];
  $(".creatureSkill").each(function () {
    if ($(this).is(":visible")) {
      let skillName = $(this).find(".inputSkillName").val();
      let skillBonus = $(this).find(".inputSkillBonus").val();
      skillsArray.push({
        name: skillName,
        bonus: skillBonus,
      });
    }
  });

  let itemsArray = [];
  $(".creatureItem").each(function () {
    if ($(this).is(":visible")) {
      let itemDisplayName = $(this).find(".inputItemDisplayName").val();
      let itemQuantity = $(this).find(".inputItemQuantity").val();
      itemsArray.push({
        displayName: itemDisplayName,
        quantity: itemQuantity,
        name: null,
        doIndex: false,
        shieldStats: null,
      });
    }
  });

  let strMod = $("#inputStrMod").val();
  let dexMod = $("#inputDexMod").val();
  let conMod = $("#inputConMod").val();
  let intMod = $("#inputIntMod").val();
  let wisMod = $("#inputWisMod").val();
  let chaMod = $("#inputChaMod").val();

  let acValue = $("#inputACValue").val();
  let fortValue = $("#inputFortValue").val();
  let reflexValue = $("#inputReflexValue").val();
  let willValue = $("#inputWillValue").val();
  let allSavesCustom = $("#inputAllSavesCustom").val();

  let hpMax = $("#inputHPMax").val();
  let hpDetails = $("#inputHPDetails").val();

  let speed = $("#inputSpeed").val();

  let description = $("#inputDescription").val();

  let requestPacket = null;
  g_homebrewID = $('#builder-container').attr('data-bundle-id');
  let creatureID = $('#builder-container').attr('data-creature-id');
  if (isUpdate) {
    requestPacket = "requestHomebrewUpdateCreature";
  } else {
    requestPacket = "requestHomebrewAddCreature";
  }

  socket.emit(requestPacket, g_homebrewID, {
    creatureID,
    name,
    level,
    rarity,
    alignment,
    size,
    tagsArray,
    familyType,
    perceptionBonus,
    senses,
    langsArray,
    languagesCustom,

    skillsArray,
    itemsArray,

    strMod,
    dexMod,
    conMod,
    intMod,
    wisMod,
    chaMod,

    acValue,
    fortValue,
    reflexValue,
    willValue,
    allSavesCustom,

    hpMax,
    hpDetails,
    speed,
    description,
  });

}

socket.on("returnHomebrewCompleteCreature", function () {
  window.location.href = '/homebrew/?edit_id=' + g_homebrewID;
});