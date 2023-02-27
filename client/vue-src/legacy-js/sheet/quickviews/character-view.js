/* Copyright (C) 2022, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

let g_characterViewOpenedTab_rollHistory = false;
let g_characterViewOpenedTab_charInfo = false;

function openCharacterQuickview(data) {

  let info = null;
  if (data.character.infoJSON) {
    info = JSON.parse(data.character.infoJSON);
  }

  let rollHistory = [];
  if (data.character.rollHistoryJSON) {
    rollHistory = JSON.parse(data.character.rollHistoryJSON);
  }

  $('#quickViewTitle').html(data.character.name);
  $('#quickViewTitleRight').html(`Level ${data.character.level}`);

  let qContent = $('#quickViewContent');


  qContent.append('<div class="columns is-marginless"><div id="charInfoBasicInfoSection" class="column is-8 is-paddingless"></div><div id="charInfoPictureSection" class="column is-4 is-paddingless pt-2"></div></div>');

  /// Basic Info ///

  $('#charInfoBasicInfoSection').append('<div class="field is-horizontal is-marginless"><div class="field-label"><label class="label">Class</label></div><div class="field-label"><p class="is-size-6 has-text-left has-txt-value-string">' + data.calculatedStat.generalInfo.className + '</p></div></div>');

  $('#charInfoBasicInfoSection').append('<div class="field is-horizontal is-marginless"><div class="field-label"><label class="label">Ancestry</label></div><div class="field-label"><p class="is-size-6 has-text-left has-txt-value-string">' + data.calculatedStat.generalInfo.heritageAncestryName + '</p></div></div>');

  $('#charInfoBasicInfoSection').append('<div class="field is-horizontal is-marginless"><div class="field-label"><label class="label">Background</label></div><div class="field-label"><p class="is-size-6 has-text-left has-txt-value-string">' + data.calculatedStat.generalInfo.backgroundName + '</p></div></div>');

  $('#charInfoBasicInfoSection').append(`
    <div class="" style="padding-left: 0.8rem; padding-right: 3.0rem; padding-top: 0.35rem; padding-bottom: 0.35rem;">
      <a href="/profile/characters/${data.charID}" target="_blank" class="button is-info is-small is-fullwidth is-outlined">
        <span class="">
          Open Sheet
        </span>
        <sup class="icon is-small">
          <i class="fas fa-xs fa-external-link-alt"></i>
        </sup>
      </a>
    </div>
  `);

  $('#charInfoPictureSection').append('<figure class="image is-128x128 is-marginless"><img id="charInfoPicture" class="is-rounded character-icon" src=""></figure>');

  if (info?.imageURL && info.imageURL.match(/\.(jpeg|jpg|gif|png|webp)$/) != null) {
    $('#charInfoPicture').attr('src', info.imageURL);
  } else {
    $('#charInfoPicture').attr('src', '/images/fb_profile_pic.png');
  }

  ///         ///

  let traitsInnerHTML = '';

  if (data.calculatedStat.generalInfo.size) {
    traitsInnerHTML += '<button class="button is-paddingless px-2 is-marginless mr-1 mb-1 is-very-small is-link tagButton">' + data.calculatedStat.generalInfo.size + '</button>';
  }

  for (const charTag of data.calculatedStat.generalInfo.traits) {
    if (charTag != null && charTag != '') {
      traitsInnerHTML += '<button class="button is-paddingless px-2 is-marginless mr-1 mb-1 is-very-small is-info tagButton">' + charTag + '</button>';
    }
  }

  if (traitsInnerHTML != '') {
    qContent.append('<div class="mb-4 pb-1"><div class="buttons is-marginless is-pulled-right">' + traitsInnerHTML + '</div></div>');
  }

  qContent.append('<hr class="m-2">');

  ///         ///


  // Conditions //
  let conditionsInnerHTML = '';
  for (let condition of getAppliedConditions(data.calculatedStat.conditions)) {
    conditionsInnerHTML += `<button class="button is-paddingless px-2 is-marginless mr-2 mb-1 is-very-small is-danger tagButton">${capitalizeWords(condition.name)} ${(condition.value != null ? condition.value : '')}</button>`;
  }
  if (conditionsInnerHTML != '') {
    qContent.append('<div class="buttons is-marginless is-centered">' + conditionsInnerHTML + '</div>');
    qContent.append('<hr class="mt-1 mb-2 mx-2">');
  }

  ///         ///

  qContent.append(`
    <div class="field is-horizontal">
      <div class="field-label is-normal is-long">
        <label class="label">Hit Points</label>
      </div>
      <div class="field-body">
        <div class="field is-narrow has-addons has-addons-centered" style="padding-left: 0.15rem; padding-right: 0.15rem; padding-top: 0.2rem; padding-bottom: 0.2rem;">
          <p class="control"><input id="charUpdateInput-HP" class="input text-center" type="text"
                  min="0" max="${data.calculatedStat.maxHP}" autocomplete="off" value="${ (data.character.currentHealth === null) ? data.calculatedStat.maxHP : data.character.currentHealth }"></p>
          <p class="control"><a class="button is-static border-darker">/</a></p>
          <p class="control"><a class="button is-static is-extra border-darker">${data.calculatedStat.maxHP}</a>
          </p>
        </div>
      </div>
    </div>

    <div class="field is-horizontal">
      <div class="field-label is-normal is-long">
        <label class="label">Temp. HP</label>
      </div>
      <div class="field-body">
        <div class="field is-narrow">
          <div class="control">
            <input id="charUpdateInput-TempHP" class="input text-center" type="text" min="0" autocomplete="off" value="${(data.character.tempHealth) ? data.character.tempHealth : 0}">
          </div>
        </div>
      </div>
    </div>

    <div id="staminaSection"></div>

    <div class="field is-horizontal">
      <div class="field-label is-normal is-long">
        <label class="label">Experience</label>
      </div>
      <div class="field-body">
        <div class="field is-narrow">
          <div class="control">
            <input id="charUpdateInput-Experience" class="input text-center" type="text" min="0" autocomplete="off" value="${(data.character.experience) ? data.character.experience : 0}">
          </div>
        </div>
      </div>
    </div>

    <div class="field is-horizontal">
      <div class="field-label is-normal is-long">
        <label class="label">Hero Points</label>
      </div>
      <div class="field-body">
        <div class="field is-narrow">
          <div class="control">
            <div class="select">
              <select id="charUpdateSelect-HeroPoints">
                <option value="0">0</option>
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>

    <hr class="m-2">
  `);

  // HP //
  $(`#charUpdateInput-HP`).on('keypress', function (e) {
    if (e.which == 13) {
      $(`#charUpdateInput-HP`).blur();
    }
  });
  $(`#charUpdateInput-HP`).blur(function () {
    let newHP = 0;
    try {
      newHP = parseInt(math.evaluate($(this).val()));
      if (newHP > data.calculatedStat.maxHP) { newHP = data.calculatedStat.maxHP; }
      if (newHP < 0) { newHP = 0; }
      if (isNaN(newHP)) { newHP = 0; }
    } catch (err) {
      newHP = 0;
    }
    $(this).val(newHP);
    data.character.currentHealth = newHP;
    socket.emit(`requestCharacterUpdate-Health`, data.charID, newHP);

    // For encounter builder
    if(typeof reloadEncounterMembers !== 'undefined'){
      reloadEncounterMembers();
    }
  });
  $(`#charUpdateInput-HP`).click(function (event) {
    event.stopImmediatePropagation();
  });

  // Temp HP //
  $(`#charUpdateInput-TempHP`).on('keypress', function (e) {
    if (e.which == 13) {
      $(`#charUpdateInput-TempHP`).blur();
    }
  });
  $(`#charUpdateInput-TempHP`).blur(function () {
    let newTempHP = 0;
    try {
      newTempHP = parseInt(math.evaluate($(this).val()));
      if (newTempHP < 0) { newTempHP = 0; }
      if (isNaN(newTempHP)) { newTempHP = 0; }
    } catch (err) {
      newTempHP = 0;
    }
    $(this).val(newTempHP);
    data.character.tempHealth = newTempHP;
    socket.emit(`requestCharacterUpdate-TempHealth`, data.charID, newTempHP);
  });
  $(`#charUpdateInput-TempHP`).click(function (event) {
    event.stopImmediatePropagation();
  });

  // Experience //
  $(`#charUpdateInput-Experience`).on('keypress', function (e) {
    if (e.which == 13) {
      $(`#charUpdateInput-Experience`).blur();
    }
  });
  $(`#charUpdateInput-Experience`).blur(function () {
    let newExperience = 0;
    try {
      newExperience = parseInt(math.evaluate($(this).val()));
      if (newExperience < 0) { newExperience = 0; }
      if (isNaN(newExperience)) { newExperience = 0; }
    } catch (err) {
      newExperience = 0;
    }
    $(this).val(newExperience);
    data.character.experience = newExperience;
    socket.emit(`requestCharacterUpdate-Exp`, data.charID, newExperience);
  });
  $(`#charUpdateInput-Experience`).click(function (event) {
    event.stopImmediatePropagation();
  });

  // Hero Points //
  $(`#charUpdateSelect-HeroPoints option[value="${data.character.heroPoints}"]`).attr('selected', 'selected');

  $(`#charUpdateSelect-HeroPoints`).change(function () {
    let newHeroPoints = $(this).val();
    data.character.heroPoints = newHeroPoints;
    socket.emit(`requestCharacterUpdate-HeroPoints`, data.charID, newHeroPoints);
  });

  ///         ///

  if (data.character.variantStamina == 1) {

    $('#staminaSection').html(`
      <div class="field is-horizontal">
        <div class="field-label is-normal is-long">
          <label class="label">Stamina</label>
        </div>
        <div class="field-body">
          <div class="field is-narrow has-addons has-addons-centered" style="padding-left: 0.15rem; padding-right: 0.15rem; padding-top: 0.2rem; padding-bottom: 0.2rem;">
            <p class="control"><input id="charUpdateInput-Stamina" class="input text-center" type="text"
                    min="0" max="${data.calculatedStat.maxStamina}" autocomplete="off" value="${data.character.currentStamina}"></p>
            <p class="control"><a class="button is-static border-darker">/</a></p>
            <p class="control"><a class="button is-static is-extra border-darker">${data.calculatedStat.maxStamina}</a>
            </p>
          </div>
        </div>
      </div>

      <div class="field is-horizontal">
        <div class="field-label is-normal is-long">
          <label class="label">Resolve</label>
        </div>
        <div class="field-body">
          <div class="field is-narrow has-addons has-addons-centered" style="padding-left: 0.15rem; padding-right: 0.15rem; padding-top: 0.2rem; padding-bottom: 0.2rem;">
            <p class="control"><input id="charUpdateInput-Resolve" class="input text-center" type="text"
                    min="0" max="${data.calculatedStat.maxResolve}" autocomplete="off" value="${data.character.currentResolve}"></p>
            <p class="control"><a class="button is-static border-darker">/</a></p>
            <p class="control"><a class="button is-static is-extra border-darker">${data.calculatedStat.maxResolve}</a>
            </p>
          </div>
        </div>
      </div>
    `);

    // Stamina //
    $(`#charUpdateInput-Stamina`).on('keypress', function (e) {
      if (e.which == 13) {
        $(`#charUpdateInput-Stamina`).blur();
      }
    });
    $(`#charUpdateInput-Stamina`).blur(function () {
      let newStamina = 0;
      try {
        newStamina = parseInt(math.evaluate($(this).val()));
        if (newStamina > data.calculatedStat.maxStamina) { newStamina = data.calculatedStat.maxStamina; }
        if (newStamina < 0) { newStamina = 0; }
        if (isNaN(newStamina)) { newStamina = 0; }
      } catch (err) {
        newStamina = 0;
      }
      $(this).val(newStamina);
      data.character.currentStamina = newStamina;
      socket.emit(`requestCharacterUpdate-Stamina`, data.charID, newStamina);
    });
    $(`#charUpdateInput-Stamina`).click(function (event) {
      event.stopImmediatePropagation();
    });

    // Resolve //
    $(`#charUpdateInput-Resolve`).on('keypress', function (e) {
      if (e.which == 13) {
        $(`#charUpdateInput-Resolve`).blur();
      }
    });
    $(`#charUpdateInput-Resolve`).blur(function () {
      let newResolve = 0;
      try {
        newResolve = parseInt(math.evaluate($(this).val()));
        if (newResolve > data.calculatedStat.maxResolve) { newResolve = data.calculatedStat.maxResolve; }
        if (newResolve < 0) { newResolve = 0; }
        if (isNaN(newResolve)) { newResolve = 0; }
      } catch (err) {
        newResolve = 0;
      }
      $(this).val(newResolve);
      data.character.currentResolve = newResolve;
      socket.emit(`requestCharacterUpdate-Resolve`, data.charID, newResolve);
    });
    $(`#charUpdateInput-Resolve`).click(function (event) {
      event.stopImmediatePropagation();
    });

  }

  ///         ///

  qContent.append('<p id="charRollHistoryName" class="has-text-centered is-size-7 is-unselectable"><strong class="cursor-clickable">Roll History</strong><sub class="icon is-small pl-1 cursor-clickable"><i id="charRollHistoryChevron" class="fas fa-lg fa-chevron-down"></i></sub></p>');

  qContent.append('<div id="charRollHistorySection" class="is-hidden p-1 m-2 use-custom-scrollbar" style="border: 1px solid var(--hr-color); max-height: 300px; overflow-y: auto;"></div>');
  qContent.append('<hr id="charRollHistoryBar" class="m-2">');

  $('#charRollHistoryName').click(function () {
    if ($("#charRollHistorySection").hasClass("is-hidden")) {
      $("#charRollHistorySection").removeClass('is-hidden');
      $("#charRollHistoryChevron").removeClass('fa-chevron-down');
      $("#charRollHistoryChevron").addClass('fa-chevron-up');
      $('#charRollHistoryBar').addClass('is-hidden');
      g_characterViewOpenedTab_rollHistory = true;

      // Scroll to bottom
      $('#charRollHistorySection').scrollTop($('#charRollHistorySection')[0].scrollHeight);
    } else {
      $("#charRollHistorySection").addClass('is-hidden');
      $("#charRollHistoryChevron").removeClass('fa-chevron-up');
      $("#charRollHistoryChevron").addClass('fa-chevron-down');
      $('#charRollHistoryBar').removeClass('is-hidden');
      g_characterViewOpenedTab_rollHistory = false;
    }
  });

  let populateRollHistory = function (rollHistory) {

    $('#charRollHistorySection').html('');

    // Display Roll History
    if (rollHistory.length > 0) {
      for (let i = 0; i < rollHistory.length; i++) {
        let rollStruct = rollHistory[i];

        if (i == rollHistory.length - 1 && rollHistory.length > 1) {
          $('#charRollHistorySection').append('<hr class="m-2">');
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

        $('#charRollHistorySection').append(`
          <div class="pos-relative">
            <p class="is-size-4 negative-indent">${resultLine}</p>
            <p class="pos-absolute pos-t-1 pos-r-1 is-size-8 has-txt-noted">${rollStruct.Label.Name}</p>
            <p class="pos-absolute pos-b-1 pos-r-1 is-size-8 has-txt-faded is-italic">${rollStruct.Timestamp.Time}</p>
          </div>
      `);
      }
    } else {
      $('#charRollHistorySection').html('<p class="is-size-5 is-italic">No roll history.</p>');
    }

    // Scroll to Bottom
    window.setTimeout(() => {
      $('#charRollHistorySection').scrollTop($('#charRollHistorySection')[0].scrollHeight);
    }, 1);

  }

  populateRollHistory(rollHistory);

  if(g_characterViewOpenedTab_rollHistory){
    $('#charRollHistoryName').click();
  }

  ///         ///

  qContent.append('<p id="charInfoName" class="has-text-centered is-size-7 is-unselectable"><strong class="cursor-clickable">Character Info</strong><sub class="icon is-small pl-1 cursor-clickable"><i id="charInfoChevron" class="fas fa-lg fa-chevron-down"></i></sub></p>');

  qContent.append('<div id="charInfoSection" class="is-hidden pt-2 m-2" style="border: 1px solid var(--hr-color);"></div>');

  $('#charInfoSection').append('<div id="charInfoContainer-Appearance" class="field is-horizontal"><div class="field-label is-normal is-long"><label class="label">Appearance</label></div><div class="field-body"><div class="field is-narrow"><div class="control"><textarea id="charInfoInput-Appearance" class="input use-custom-scrollbar" type="text" maxlength="400" autocomplete="off" placeholder="Appearance" readonly></textarea></div></div></div></div>');

  $('#charInfoSection').append('<div id="charInfoContainer-Personality" class="field is-horizontal"><div class="field-label is-normal is-long"><label class="label">Personality</label></div><div class="field-body"><div class="field is-narrow"><div class="control"><input id="charInfoInput-Personality" class="input" type="text" maxlength="40" autocomplete="off" placeholder="Personality" readonly></div></div></div></div>');

  $('#charInfoSection').append('<div id="charInfoContainer-Alignment" class="field is-horizontal"><div class="field-label is-normal is-long"><label class="label">Alignment</label></div><div class="field-body"><div class="field is-narrow"><div class="control"><input id="charInfoInput-Alignment" class="input" type="text" maxlength="40" spellcheck="false" autocomplete="off" placeholder="Alignment" readonly></div></div></div></div>');

  $('#charInfoSection').append('<div id="charInfoContainer-Beliefs" class="field is-horizontal"><div class="field-label is-normal is-long"><label class="label">Beliefs</label></div><div class="field-body"><div class="field is-narrow"><div class="control"><input id="charInfoInput-Beliefs" class="input" type="text" maxlength="40" spellcheck="false" autocomplete="off" placeholder="Beliefs" readonly></div></div></div></div>');

  $('#charInfoSection').append('<hr id="charInfoBar-AGPT" class="m-2">');

  $('#charInfoSection').append('<div id="charInfoContainer-Age" class="field is-horizontal"><div class="field-label is-normal is-long"><label class="label">Age</label></div><div class="field-body"><div class="field is-narrow"><div class="control"><input id="charInfoInput-Age" class="input" type="text" maxlength="40" spellcheck="false" autocomplete="off" placeholder="Age" readonly></div></div></div></div>');

  $('#charInfoSection').append('<div id="charInfoContainer-Gender" class="field is-horizontal"><div class="field-label is-normal is-long"><label class="label">Gender</label></div><div class="field-body"><div class="field is-narrow"><div class="control"><input id="charInfoInput-Gender" class="input" type="text" maxlength="40" spellcheck="false" autocomplete="off" placeholder="Gender" readonly></div></div></div></div>');

  $('#charInfoSection').append('<div id="charInfoContainer-Pronouns" class="field is-horizontal"><div class="field-label is-normal is-long"><label class="label">Pronouns</label></div><div class="field-body"><div class="field is-narrow"><div class="control"><input id="charInfoInput-Pronouns" class="input" type="text" maxlength="40" spellcheck="false" autocomplete="off" placeholder="Pronouns" readonly></div></div></div></div>');

  $('#charInfoSection').append('<div id="charInfoContainer-Title" class="field is-horizontal"><div class="field-label is-normal is-long"><label class="label">Title</label></div><div class="field-body"><div class="field is-narrow"><div class="control"><input id="charInfoInput-Title" class="input" type="text" maxlength="40" spellcheck="false" autocomplete="off" placeholder="Title" readonly></div></div></div></div>');

  $('#charInfoSection').append('<hr id="charInfoBar-FEN" class="m-2">');

  $('#charInfoSection').append('<div id="charInfoContainer-Faction" class="field is-horizontal"><div class="field-label is-normal is-long"><label class="label">Faction</label></div><div class="field-body"><div class="field is-narrow"><div class="control"><input id="charInfoInput-Faction" class="input" type="text" maxlength="40" spellcheck="false" autocomplete="off" placeholder="Faction" readonly></div></div></div></div>');

  $('#charInfoSection').append('<div id="charInfoContainer-Ethnicity" class="field is-horizontal"><div class="field-label is-normal is-long"><label class="label">Ethnicity</label></div><div class="field-body"><div class="field is-narrow"><div class="control"><input id="charInfoInput-Ethnicity" class="input" type="text" maxlength="40" spellcheck="false" autocomplete="off" placeholder="Ethnicity" readonly></div></div></div></div>');

  $('#charInfoSection').append('<div id="charInfoContainer-Nationality" class="field is-horizontal"><div class="field-label is-normal is-long"><label class="label">Nationality</label></div><div class="field-body"><div class="field is-narrow"><div class="control"><input id="charInfoInput-Nationality" class="input" type="text" maxlength="40" spellcheck="false" autocomplete="off" placeholder="Nationality" readonly></div></div></div></div>');

  qContent.append('<hr id="charInfoBar-Bottom" class="m-2">');

  //
  if (info?.appearance) {
    $('#charInfoInput-Appearance').val(info.appearance);
  } else {
    $('#charInfoContainer-Appearance').addClass('is-hidden');
  }

  if (info?.personality) {
    $('#charInfoInput-Personality').val(info.personality);
  } else {
    $('#charInfoContainer-Personality').addClass('is-hidden');
  }

  if (info?.alignment) {
    $('#charInfoInput-Alignment').val(info.alignment);
  } else {
    $('#charInfoContainer-Alignment').addClass('is-hidden');
  }

  if (info?.beliefs) {
    $('#charInfoInput-Beliefs').val(info.beliefs);
  } else {
    $('#charInfoContainer-Beliefs').addClass('is-hidden');
  }

  if (info?.age || info?.gender || info?.pronouns || info?.title) {
  } else {
    $('#charInfoBar-AGPT').addClass('is-hidden');
  }

  if (info?.age) {
    $('#charInfoInput-Age').val(info.age);
  } else {
    $('#charInfoContainer-Age').addClass('is-hidden');
  }

  if (info?.gender) {
    $('#charInfoInput-Gender').val(info.gender);
  } else {
    $('#charInfoContainer-Gender').addClass('is-hidden');
  }

  if (info?.pronouns) {
    $('#charInfoInput-Pronouns').val(info.pronouns);
  } else {
    $('#charInfoContainer-Pronouns').addClass('is-hidden');
  }

  if (info?.title) {
    $('#charInfoInput-Title').val(info.title);
  } else {
    $('#charInfoContainer-Title').addClass('is-hidden');
  }

  if (info?.faction || info?.ethnicity || info?.nationality) {
  } else {
    $('#charInfoBar-FEN').addClass('is-hidden');
  }

  if (info?.faction) {
    $('#charInfoInput-Faction').val(info.faction);
  } else {
    $('#charInfoContainer-Faction').addClass('is-hidden');
  }

  if (info?.ethnicity) {
    $('#charInfoInput-Ethnicity').val(info.ethnicity);
  } else {
    $('#charInfoContainer-Ethnicity').addClass('is-hidden');
  }

  if (info?.nationality) {
    $('#charInfoInput-Nationality').val(info.nationality);
  } else {
    $('#charInfoContainer-Nationality').addClass('is-hidden');
  }

  if (info?.appearance || info?.personality || info?.alignment || info?.beliefs || info?.age || info?.gender || info?.pronouns || info?.title || info?.faction || info?.ethnicity || info?.nationality) {
    $('#charInfoName').click(function () {
      if ($("#charInfoSection").hasClass("is-hidden")) {
        $("#charInfoSection").removeClass('is-hidden');
        $("#charInfoChevron").removeClass('fa-chevron-down');
        $("#charInfoChevron").addClass('fa-chevron-up');
        $('#charInfoBar-Bottom').addClass('is-hidden');
        g_characterViewOpenedTab_charInfo = true;
      } else {
        $("#charInfoSection").addClass('is-hidden');
        $("#charInfoChevron").removeClass('fa-chevron-up');
        $("#charInfoChevron").addClass('fa-chevron-down');
        $('#charInfoBar-Bottom').removeClass('is-hidden');
        g_characterViewOpenedTab_charInfo = false;
      }
    });

    if(g_characterViewOpenedTab_charInfo){
      $('#charInfoName').click();
    }

  } else {
    $('#charInfoName').addClass('is-hidden');
    $('#charInfoSection').addClass('is-hidden');
    $('#charInfoBar-Bottom').addClass('is-hidden');
  }

  //

}
