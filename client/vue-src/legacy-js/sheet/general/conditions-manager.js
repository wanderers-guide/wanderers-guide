/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

function getConditionFromName(name) {
  for (const condition of g_allConditions) {
    if (condition.name.toLowerCase() == name.toLowerCase()) {
      return condition;
    }
  }
  return null;
}

function getConditionFromID(conditionID) {
  for (const condition of g_allConditions) {
    if (condition.id == conditionID) {
      return condition;
    }
  }
  return null;
}

function hasCondition(checkingConditionID) {
  for (const [conditionID, conditionData] of g_conditionsMap.entries()) {
    if (conditionID == checkingConditionID) {
      return true;
    }
  }
  return false;
}

function getCondition(checkingConditionID) {
  for (const [conditionID, conditionData] of g_conditionsMap.entries()) {
    if (conditionID == checkingConditionID) {
      return conditionData;
    }
  }
  return null;
}

function getCurrentConditionIDFromName(name) {
  for (const [conditionID, conditionData] of g_conditionsMap.entries()) {
    if (conditionData.Condition.name.toLowerCase() == name.toLowerCase()) {
      return conditionData.EntryID;
    }
  }
  return null;
}

function getCurrentConditionIDFromSourceText(sourceText) {
  for (const [conditionID, conditionData] of g_conditionsMap.entries()) {
    if (conditionData.SourceText == sourceText) {
      return conditionData.EntryID;
    }
  }
  return null;
}

function addCondition(conditionID, value, sourceText, parentID = null) {
  let existingCondition = g_conditionsMap.get(conditionID + '');
  if (existingCondition != null) {
    if ((existingCondition.SourceText == null && sourceText != null) || (existingCondition.Value != value)) {
      // Replace unsourced with sourced condition OR update condition value
      socket.emit("requestConditionUpdate",
        getCharIDFromURL(),
        conditionID,
        value,
        sourceText,
        parentID);
    } else {
      return;
    }
  } else {
    socket.emit("requestConditionAdd",
      getCharIDFromURL(),
      conditionID,
      value,
      sourceText,
      parentID);
  }

}

function removeCondition(conditionID, onlyWithSourceText = null) {
  if (onlyWithSourceText != null) {
    let conditionEntryID = getCurrentConditionIDFromSourceText(onlyWithSourceText);
    if (conditionEntryID != null) {
      socket.emit("requestConditionRemove",
        getCharIDFromURL(),
        conditionID);
    }
  } else {
    socket.emit("requestConditionRemove",
      getCharIDFromURL(),
      conditionID);
  }
}

socket.on("returnUpdateConditionsMap", function (conditionsObject, reloadSheet) {
  g_conditionsMap = objToMap(conditionsObject);

  if (reloadSheet) {
    reloadCharSheet();
  }

});

// ~~~~~~~~~~~~~~ // Run on Load // ~~~~~~~~~~~~~~ //
$(function () {

  $('#conditionsModalBackground').click(function () {
    closeConditionsModal();
  });
  $('#conditionsModalCloseButton').click(function () {
    closeConditionsModal();
  });

  $('#conditionsModalSubtractButton').click(function () {
    let value = parseInt($('#conditionsModalValue').html());
    if (!isNaN(value)) {
      value--;
      value = (value > 9) ? 9 : value;
      value = (value < 1) ? 1 : value;
      $('#conditionsModalValue').html(value);
    }
  });

  $('#conditionsModalAddButton').click(function () {
    let value = parseInt($('#conditionsModalValue').html());
    if (!isNaN(value)) {
      value++;
      value = (value > 9) ? 9 : value;
      value = (value < 1) ? 1 : value;
      $('#conditionsModalValue').html(value);
    }
  });

});

function displayConditionsList() {

  $('#conditionsContent').html('');

  let conditionFound = false;
  for (const [conditionID, conditionData] of g_conditionsMap.entries()) {
    conditionFound = true;
    let conditionLinkID = 'conditionLink' + conditionID;
    let conditionValueHTML = (conditionData.Value != null) ? 'data-badge="' + conditionData.Value + '"' : '';
    $('#conditionsContent').append('<button id="' + conditionLinkID + '" class="button is-very-small is-danger is-outlined has-badge-rounded has-badge-danger" ' + conditionValueHTML + '>' + conditionData.Condition.name + '</button>');
    $('#' + conditionLinkID).click(function () {
      openConditionsModal(conditionID);
    });
  }

  if (!conditionFound) {
    $('#conditionsContent').append('<em class="has-txt-partial-noted is-unselectable">None</em>');
  }

  // Calculated Stat
  let conditionsList = [];
  for (const [conditionID, conditionData] of g_conditionsMap.entries()) {
    conditionsList.push({
      conditionID: conditionData.Condition.id,
      name: conditionData.Condition.name,
      entryID: conditionData.EntryID,
      parentEntryID: conditionData.ParentID,
      sourceText: conditionData.SourceText,
      value: conditionData.Value,
    });
  }
  g_calculatedStats.conditions = conditionsList;

}

function runAllConditionsCode() {
  for (const [conditionID, conditionData] of g_conditionsMap.entries()) {
    runConditionCode(conditionID);
  }
}

function runConditionCode(conditionID) {
  let conditionData = g_conditionsMap.get(conditionID + "");
  if (conditionData != null) {

    let conditionCode = conditionData.Condition.code;
    if (conditionCode != null) {
      conditionCode = conditionCode.replace(/CONDITION_VALUE_TIMES_TWO/g, conditionData.Value * 2);
      conditionCode = conditionCode.replace(/CONDITION_VALUE/g, conditionData.Value);

      processSheetCode(conditionCode, {
        source: 'Condition',
        sourceName: conditionData.Condition.name,
        conditionID: conditionData.Condition.id,
        conditionValue: conditionData.Value,
      });
    }

  }
}

function openConditionsModal(conditionID) {

  let conditionData = g_conditionsMap.get(conditionID + '');

  if (conditionData.Value != null) {
    $('#conditionsModalFooter').addClass('buttons');
    $('#conditionsModalSubtractButton').removeClass('is-hidden');
    $('#conditionsModalValueButton').removeClass('is-hidden');
    $('#conditionsModalAddButton').removeClass('is-hidden');
    $('#conditionsModalValue').html(conditionData.Value);
  } else {
    $('#conditionsModalFooter').removeClass('buttons');
    $('#conditionsModalSubtractButton').addClass('is-hidden');
    $('#conditionsModalValueButton').addClass('is-hidden');
    $('#conditionsModalAddButton').addClass('is-hidden');
    $('#conditionsModalValue').html('');
  }

  if (conditionData.SourceText != null) {
    $('#conditionsModalRemoveButton').addClass('is-hidden');
    $('#conditionsModalTitle').removeClass('pl-5');
    $('#conditionsModalSourceContent').html(conditionData.SourceText);
    $('#conditionsModalSourceSection').removeClass('is-hidden');
  } else {
    $('#conditionsModalRemoveButton').removeClass('is-hidden');
    $('#conditionsModalSourceSection').addClass('is-hidden');
    $('#conditionsModalTitle').addClass('pl-5');

    $('#conditionsModalRemoveButton').off('click');
    $('#conditionsModalRemoveButton').click(function () {
      removeCondition(conditionID);
      closeConditionsModal();
    });

  }

  $('#conditionsModalTitle').html(conditionData.Condition.name);
  $('#conditionsModalContent').html(processText(conditionData.Condition.description, true, true, 'MEDIUM', false));


  $('#conditionsModalDefault').addClass('is-active');
  $('html').addClass('is-clipped');

  $('#conditionsModalDefault').attr('name', conditionID);

}

function closeConditionsModal() {

  $('#conditionsModalDefault').removeClass('is-active');
  $('html').removeClass('is-clipped');

  let conditionID = parseInt($('#conditionsModalDefault').attr('name'));
  let conditionData = g_conditionsMap.get(conditionID + '');

  if (conditionData != null && conditionData.Value != null) {
    let value = parseInt($('#conditionsModalValue').html());
    if (conditionData.Value != value) {
      socket.emit("requestConditionUpdate",
        getCharIDFromURL(),
        conditionID,
        value,
        conditionData.SourceText,
        conditionData.ParentID);
    }
  }

}

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ //
// ~~~~~~~~~~~~~~~~~~~~~~~~~~ Select Conditions ~~~~~~~~~~~~~~~~~~~~~~~~~~ //
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ //

// ~~~~~~~~~~~~~~ // Run on Load // ~~~~~~~~~~~~~~ //
$(function () {

  $('#conditionsSelectModalBackground').click(function () {
    closeSelectConditionsModal();
  });
  $('#conditionsSelectModalCloseButton').click(function () {
    closeSelectConditionsModal();
  });

});


function openSelectConditionsModal() {

  $('#conditionsSelectModalContent').html('');

  for (const condition of g_allConditions) {

    let conditionSectionID = 'conditionSection' + condition.id;
    let conditionData = g_conditionsMap.get(condition.id + "");

    if (conditionData != null) {

      $('#conditionsSelectModalContent').append('<div id="' + conditionSectionID + '" class="tile is-parent is-paddingless has-bg-selectable cursor-clickable"><div class="tile is-child"><p class="has-text-centered is-size-5 border-bottom border-dark">' + condition.name + '</p></div></div>');

    } else {

      $('#conditionsSelectModalContent').append('<div id="' + conditionSectionID + '" class="tile is-parent is-paddingless cursor-clickable"><div class="tile is-child"><p class="has-text-centered is-size-5 border-bottom border-dark">' + condition.name + '</p></div></div>');

      $('#' + conditionSectionID).mouseenter(function () {
        $(this).addClass('has-bg-selectable');
      });
      $('#' + conditionSectionID).mouseleave(function () {
        $(this).removeClass('has-bg-selectable');
      });

      $('#' + conditionSectionID).click(function () {
        value = (condition.hasValue == 1) ? 1 : null;
        addCondition(condition.id + "", value, null);
        closeSelectConditionsModal();
      });

    }



  }

  $('#conditionsSelectModalDefault').addClass('is-active');
  $('html').addClass('is-clipped');

}

function closeSelectConditionsModal() {

  $('#conditionsSelectModalDefault').removeClass('is-active');
  $('html').removeClass('is-clipped');

}