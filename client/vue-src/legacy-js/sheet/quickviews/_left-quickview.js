/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

function openLeftQuickView(subtabName) {

  $('#quickViewLeftTitle').html('Sheet Tools');

  $('#quickViewLeftTitleClose').html('<a id="quickViewLeftClose" class="delete"></a>');
  $('#quickViewLeftClose').click(function () {
    $('#quickviewLeftDefault').removeClass('is-active');
  });

  $('#quickviewLeftDefault').addClass('is-active');

  // Listeners to open tabs
  $('#quickViewLeftTab-DiceRoller').off('click');
  $('#quickViewLeftTab-DiceRoller').click(function () {
    setLeftQuickViewTab('Dice Roller');
  });

  $('#quickViewLeftTab-Toggleables').off('click');
  $('#quickViewLeftTab-Toggleables').click(function () {
    setLeftQuickViewTab('Toggleables');
  });

  if (g_campaignDetails) {

    $('#quickViewLeftTab-Campaign').parent().removeClass('is-hidden');

    $('#quickViewLeftTab-Campaign').off('click');
    $('#quickViewLeftTab-Campaign').click(function () {
      setLeftQuickViewTab('Campaign');
    });

  }

  // Open tab 
  setLeftQuickViewTab(subtabName);

}

function closeLeftQuickView() {
  $('#quickviewLeftDefault').removeClass('is-active');
}

function setLeftQuickViewTab(subtabName) {

  $('#quickViewLeftTitle').html('Sheet Tools - ' + subtabName);
  $('#quickViewLeftContent').html('');
  $('#quickViewLeftContent').scrollTop(0);

  $('#quickViewLeftTab-DiceRoller').parent().removeClass("is-active");
  $('#quickViewLeftTab-Toggleables').parent().removeClass("is-active");
  $('#quickViewLeftTab-Campaign').parent().removeClass("is-active");
  $('#quickViewLeftTab-' + (subtabName.replace(/ /g, ''))).parent().addClass("is-active");

  $('#quickViewLeftOuterExtra').html('');

  if (subtabName == 'Toggleables') {
    leftQuickview_OpenToggleables();
  } else if (subtabName == 'Dice Roller') {
    leftQuickview_OpenDiceRoller();
  } else if (subtabName == 'Campaign') {
    leftQuickview_OpenCampaign();
  }

}






function leftQuickview_OpenToggleables() {

  let qContent = $('#quickViewLeftContent');

  qContent.append(`
    <div class="mb-3">
      <p>The following are toggleable buttons that apply certain effects to the sheet when enabled. They can be useful for some abilities that tend to be either active or inactive.</p>
    </div>
  `);

  for (const sheetState of getSheetStates()) {

    let stateBtnID = 'sheetStateBtnID' + sheetState.id;
    qContent.append(`<button id="${stateBtnID}" class="button is-info is-fullwidth is-outlined has-tooltip-bottom" style="margin-bottom: 0.8rem;"
            data-tooltip="${processTextRemoveIndexing(sheetState.description)}"
        >${sheetState.name}</button>`);

    if (sheetState.isActive) {
      $('#' + stateBtnID).addClass('is-focused');
    }

    $('#' + stateBtnID).click(function () {
      setSheetStateActive(sheetState.id, !sheetState.isActive);
      openLeftQuickView('Toggleables');
      reloadCharSheet();
    });


  }

}


function leftQuickview_OpenDiceRoller() {

  let qContent = $('#quickViewLeftContent');

  // Set HTML
  qContent.append(`

      <div class="columns is-mobile is-narrow is-centered is-gapless mt-2">
        <div class="column is-1"></div>
        <div class="column is-2">
          <div class="control">
            <a id="dice-roller-input-roll" class="button is-outlined is-info">Roll</a>
          </div>
        </div>
        <div class="column is-8">
          <div class="field has-addons">
            <p class="control">
              <input id="dice-roller-input-dice-amt" class="input is-info" type="number" value="1" min="1" max="99">
            </p>
            <p class="control">
              <span class="select is-info">
                <select id="dice-roller-input-die-size">
                  <option value="2">d2</option>
                  <option value="4">d4</option>
                  <option value="6">d6</option>
                  <option value="8">d8</option>
                  <option value="10">d10</option>
                  <option value="12">d12</option>
                  <option value="20" selected>d20</option>
                  <option value="100">d100</option>
                </select>
              </span>
            </p>
            <p class="control">
              <a class="button is-static is-info is-outlined">+</a>
            </p>
            <p class="control">
              <input id="dice-roller-input-bonus" class="input is-info" type="number" value="0" min="-999" max="999">
            </p>
          </div>
        </div>
        <div class="column is-1"></div>
      </div>
      <hr class="m-2">
      <div class="pos-relative">
        <span id="dice-roller-clear-btn" class="icon is-small has-text-danger pos-absolute pos-t-2 pos-r-15 has-tooltip-left" data-tooltip="Clear History"><i class="fas fa-eraser"></i></span>
        <div id="dice-roller-output-container" class="px-5 use-custom-scrollbar" style="height: 70vh; max-height: 70vh; overflow-y: auto;"></div>
      </div>

  `);

  // Enable Dice Integration Button //
  if (gOption_hasDiceRoller) {
    $('#quickViewLeftOuterExtra').html(`
      <div class="pos-absolute pos-b-15 pos-r-15">
        <p class="is-size-7 has-txt-faded">Dice Integration Enabled</p>
      </div>
      <div class="pos-absolute pos-b-5 pos-r-15">
        <p class="is-size-8 has-txt-faded is-italic">(disable in the builder under options)</p>
      </div>
    `);
  } else {
    $('#quickViewLeftOuterExtra').html(`
      <div class="pos-absolute pos-b-15 pos-r-15">
        <button id="quickViewLeftEnableDiceIntegrationBtn" class="button is-info is-outlined is-rounded is-tiny">Enable Dice Integration?</button>
      </div>
    `);
    $('#quickViewLeftEnableDiceIntegrationBtn').click(function () {

      socket.emit("requestCharacterOptionChange",
        getCharIDFromURL(),
        'optionDiceRoller',
        1);

      gOption_hasDiceRoller = true;
      reloadCharSheet();
      closeLeftQuickView();
    });
  }

  // Display Roll History
  if (g_rollHistory.length > 0) {
    for (let i = 0; i < g_rollHistory.length; i++) {
      let rollStruct = g_rollHistory[i];

      if (i == g_rollHistory.length - 1 && g_rollHistory.length > 1) {
        $('#dice-roller-output-container').append('<hr class="m-2">');
      }

      // Display Roll //
      let resultLine = '<span class="has-txt-listing">' + rollStruct.RollData.DiceNum + '</span><span class="has-txt-noted is-thin">d</span><span class="has-txt-listing">' + rollStruct.RollData.DieType + '</span>';
      if (rollStruct.RollData.Bonus != 0) {
        resultLine += '<span class="has-txt-noted">+</span><span class="has-txt-listing">' + rollStruct.RollData.Bonus + '</span>';
      }

      if (rollStruct.RollData.DiceNum != 1 || rollStruct.RollData.Bonus != 0) {
        resultLine += '<i class="fas fa-caret-right has-txt-noted mx-2"></i>';
        let resultSubParts = '';
        let firstResult = true;
        for (let result of rollStruct.ResultData) {
          if (firstResult) { firstResult = false; } else { resultSubParts += '<span class="has-txt-noted">+</span>'; }

          let bulmaColor = 'has-txt-listing';
          if (result == rollStruct.RollData.DieType) { bulmaColor = 'has-text-success'; }
          else if (result == 1) { bulmaColor = 'has-text-danger'; }

          resultSubParts += '<span class="has-txt-noted">(</span><span class="' + bulmaColor + '">' + result + '</span><span class="has-txt-noted">)</span>';
        }
        if (rollStruct.RollData.Bonus != 0) {
          resultSubParts += '<span class="has-txt-noted">+</span><span class="has-txt-listing">' + rollStruct.RollData.Bonus + '</span>';
        }
        resultLine += '<span class="is-size-5 is-thin">' + resultSubParts + '</span>';
      }

      if (rollStruct.DoubleResult) {
        resultLine += `<span class="is-size-5 is-thin"><i class="fas fa-caret-right has-txt-noted mx-2"></i><span class="has-text-primary">2</span><span class="has-txt-noted">×</span><span class="has-txt-listing">${rollStruct.Total}</span></span><i class="fas fa-caret-right has-txt-noted mx-2"></i><span class="has-text-info is-bold">${(rollStruct.Total * 2)}<span class="has-txt-partial-noted is-size-6 is-thin is-italic"> ${rollStruct.ResultSuffix}</span></span>`;
      } else {
        resultLine += `<i class="fas fa-caret-right has-txt-noted mx-2"></i><span class="has-text-info is-bold">${rollStruct.Total}<span class="has-txt-partial-noted is-size-6 is-thin is-italic"> ${rollStruct.ResultSuffix}</span></span>`;
      }

      $('#dice-roller-output-container').append(`
          <div class="pos-relative">
            <p class="is-size-4 negative-indent">${resultLine}</p>
            <p class="pos-absolute pos-t-1 pos-r-1 is-size-8 has-txt-noted">${rollStruct.Label.Name}</p>
            <p class="pos-absolute pos-b-1 pos-r-1 is-size-8 has-txt-faded is-italic">${rollStruct.Timestamp.Time}</p>
          </div>
      `);
    }
  } else {
    $('#dice-roller-output-container').html('<p class="is-size-5 is-italic">No roll history.</p>');
  }

  // Scroll to Bottom
  window.setTimeout(() => {
    $('#dice-roller-output-container').scrollTop($('#dice-roller-output-container')[0].scrollHeight);
  }, 1);

  // Roll Btn Listener //
  $('#dice-roller-input-roll').click(function () {
    let diceAmtStr = $('#dice-roller-input-dice-amt').val();
    let dieSizeStr = $('#dice-roller-input-die-size').val();
    let bonusStr = $('#dice-roller-input-bonus').val();
    if (diceAmtStr != '') {
      let diceAmt = parseInt(diceAmtStr);
      let dieSize = parseInt(dieSizeStr);
      let bonus = (bonusStr != '') ? parseInt(bonusStr) : 0;
      makeDiceRoll(diceAmt, dieSize, bonus, '');
    }
  });

  // Clear History Listener //
  $('#dice-roller-clear-btn').click(function () {
    g_rollHistory = [];
    openLeftQuickView('Dice Roller');

    let rollHistoryJSON = JSON.stringify(g_rollHistory);

    socket.emit("requestRollHistorySave",
      getCharIDFromURL(),
      rollHistoryJSON);
    sendOutUpdateToGM('roll-history', rollHistoryJSON);
  });

}


function leftQuickview_OpenCampaign() {

  let qContent = $('#quickViewLeftContent');

  qContent.append(`
    <p class="title is-size-5 has-txt-value-number text-center mb-1">${g_campaignDetails.campaign.name}</p>
    <div class="">
      <p>${processText(g_campaignDetails.campaign.description, false, false, 'MEDIUM', false)}</p>
    </div>
    <hr class="m-2">
  `);

  g_campaignDetails.accessTokens = g_campaignDetails.accessTokens.sort(
    function(a, b) {
      return a.character.name > b.character.name ? 1 : -1;
    }
  );

  for (const accessToken of g_campaignDetails.accessTokens) {

    let charTitle = '';
    if (accessToken?.calculatedStat?.generalInfo && !accessToken.calculatedStat.fakeStats) {
      let generalInfo = accessToken.calculatedStat.generalInfo;
      if (typeof generalInfo === 'string' || generalInfo instanceof String){
        generalInfo = JSON.parse(generalInfo);
      }
      charTitle = generalInfo.heritageAncestryName + ' ' + generalInfo.className;
    } else {
      charTitle = 'Unknown Traveler';
    }

    let imageURL = '';

    // Override with custom set title in char info
    if(accessToken.character.infoJSON){
      let charInfo = accessToken.character.infoJSON;
      if (typeof charInfo === 'string' || charInfo instanceof String){
        charInfo = JSON.parse(charInfo);
      }
      if(charInfo?.title && charInfo.title.trim() != ''){
        charTitle = charInfo.title.trim();
      }

      if (charInfo?.imageURL && charInfo.imageURL.match(/\.(jpeg|jpg|gif|png|webp)$/) != null) {
        imageURL = charInfo.imageURL;
      }
    }

    qContent.append(`

      <div class="columns is-mobile is-marginless">
        <div class="column is-paddingless">
        
          <p class="pl-2">
            <span class="is-size-5-5 has-txt-value-string">${accessToken.character.name.trim()}</span><span class="is-size-6 is-italic">, ${charTitle}</span>
          </p>
          <div class="columns is-mobile is-marginless pl-3">
            <div class="column is-4 is-paddingless">
              <p id="campaign-character-health-${accessToken.charID}">
              </p>
            </div>
            <div class="column is-8 is-paddingless">
              <div id="campaign-character-conditions-${accessToken.charID}" class="is-flex" style="flex-wrap: wrap; padding-top: 0.3rem;">
              </div>
            </div>
          </div>
        
        </div>
        <div class="column is-2 is-paddingless">
          <figure class="image is-64x64 is-marginless"><img id="campaign-character-image-${accessToken.charID}" class="is-rounded character-icon-smaller is-hidden" src="${imageURL}"></figure>
        </div>
      </div>
      <hr class="m-2">

    `);

    if(imageURL.length > 0){
      $(`#campaign-character-image-${accessToken.charID}`).removeClass('is-hidden');
    }

    leftQuickview_setCharacterHealth(accessToken);
    leftQuickview_setCharacterConditions(accessToken);

  }

}

function leftQuickview_setCharacterHealth(accessToken) {
  if(!$('#quickviewLeftDefault').hasClass('is-active')) { return; }

  $(`#campaign-character-health-${accessToken.charID}`).html('');
  if (g_campaignDetails.campaign.optionDisplayPlayerHealth == 0 || !accessToken.calculatedStat || accessToken.calculatedStat.fakeStats) { return; }

  if(accessToken.character.currentHealth === null) {
    accessToken.character.currentHealth = accessToken.calculatedStat.maxHP;
  }

  let animationDelay = getAnimationDelayFromCurrentHP(accessToken.character.currentHealth, accessToken.calculatedStat.maxHP);

  if (g_campaignDetails.campaign.optionDisplayPlayerHealth == 1) {

    // Determine Status
    let statusMessage = '';
    let percentage = accessToken.character.currentHealth / accessToken.calculatedStat.maxHP;
    if(percentage >= 0.9){
      statusMessage = 'Good';
    } else if(percentage >= 0.7){
      statusMessage = 'Fine';
    } else if(percentage >= 0.4){
      statusMessage = 'Adequate';
    } else if(percentage >= 0.1){
      statusMessage = 'Serious';
    } else {
      statusMessage = 'Critical';
    }

    $(`#campaign-character-health-${accessToken.charID}`).html(`
      <p class="is-size-7 pt-1 pb-2">
        Status: <span class="health-variable-color" style="animation-delay: ${animationDelay}!important;">${statusMessage}</span>
      </p>`
    );

  } else if (g_campaignDetails.campaign.optionDisplayPlayerHealth == 2) {

    $(`#campaign-character-health-${accessToken.charID}`).html(`
      <p class="is-size-7 pt-1 pb-2">
        Health: <span class="health-variable-color" style="animation-delay: ${animationDelay}!important;">${accessToken.character.currentHealth}</span> / ${accessToken.calculatedStat.maxHP}
      </p>`
    );

  }

}

function leftQuickview_setCharacterConditions(accessToken) {
  if(!$('#quickviewLeftDefault').hasClass('is-active')) { return; }

  $(`#campaign-character-conditions-${accessToken.charID}`).html('');
  if (g_campaignDetails.campaign.optionDisplayPlayerHealth == 0 || !accessToken.calculatedStat || accessToken.calculatedStat.fakeStats) { return; }
  
  let conditions = accessToken.calculatedStat.conditions;
  if (typeof conditions === 'string' || conditions instanceof String){
    conditions = JSON.parse(conditions);
  }
  if(conditions == null){
    conditions = [];
  }
  for (let condition of conditions) {

    let conditionDisplayName = capitalizeWords(condition.name);
    if (condition.value != null) { conditionDisplayName += ` ${condition.value}`; }

    $(`#campaign-character-conditions-${accessToken.charID}`).append(`
      <div class="field has-addons is-marginless" style="padding-right: 0.25rem; padding-bottom: 0.25rem;">
        <div class="control">
          <button class="button is-very-small is-danger is-outlined">
            <span>${conditionDisplayName}</span>
          </button>
        </div>
      </div>
    `);

  }

}
