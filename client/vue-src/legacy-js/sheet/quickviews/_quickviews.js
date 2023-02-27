/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

// ~~~~~~~~~~~~~~ // Run on Load // ~~~~~~~~~~~~~~ //
$(function () {

  let quickviews = bulmaQuickview.attach();

  // Click will close right quickview (with protection)
  $('#center-body, #main-top, #manageSpellsModalDefault').click(function () {
    if ($('#quickviewDefault').hasClass('quickview-auto-close-protection')) {
      $('#quickviewDefault').removeClass('quickview-auto-close-protection');
    } else {
      if(!$('#quickviewDefault').hasClass('quickview-prevent-auto-close')){
        closeQuickView();
      }
    }
  });

  // Double click will close left quickview
  $('#center-body, #main-top, #manageSpellsModalDefault').dblclick(function () {
    $('#quickviewLeftDefault').removeClass('is-active');
  });

  // Press Esc key to close
  $(document).on('keyup', function (e) {
    if (e.which == 27) {

      if ($('#quickviewDefault').hasClass('is-active')) {
        closeQuickView();
      } else if ($('#quickviewLeftDefault').hasClass('is-active')) {
        $('#quickviewLeftDefault').removeClass('is-active');
      } else {
        $('.modal').removeClass('is-active');
        $('html').removeClass('is-clipped');
      }

    }
  });

});

let g_QViewLastType = null;
let g_QViewLastData = null;

function openQuickView(type, data, noProtection = false) {

  $('#quickViewTitle').html('');
  $('#quickViewTitleRight').html('');
  $('#quickViewContent').html('');
  $('#quickViewContent').scrollTop(0);

  $('#quickViewTitleClose').html('<a id="quickViewClose" class="delete"></a>');
  $('#quickViewClose').click(function () {
    closeQuickView();
  });

  if (!noProtection) {
    $('#quickviewDefault').addClass('quickview-auto-close-protection');
  }
  $('#quickviewDefault').addClass('is-active');

  g_QViewLastType = type;
  g_QViewLastData = data;

  if (type == 'addSpellView') {
    openAddSpellQuickview(data);
  } else if (type == 'spellView') {
    openSpellQuickview(data);
  } else if (type == 'spellEmptyView') {
    openSpellEmptyQuickview(data);
  } else if (type == 'skillView') {
    openSkillQuickview(data);
  } else if (type == 'abilityScoreView') {
    openAbilityScoreQuickview(data);
  } else if (type == 'heroPointsView') {
    openHeroPointsQuickview(data);
  } else if (type == 'languageView') {
    openLanguageQuickview(data);
  } else if (type == 'featView') {
    openFeatQuickview(data);
  } else if (type == 'savingThrowView') {
    openSavingThrowQuickview(data);
  } else if (type == 'perceptionView') {
    openPerceptionQuickview(data);
  } else if (type == 'speedView') {
    openSpeedQuickview(data);
  } else if (type == 'invItemView') {
    openInvItemQuickview(data);
  } else if (type == 'customizeItemView') {
    openCustomizeItemQuickview(data);
  } else if (type == 'addItemView') {
    openAddItemQuickview(data);
  } else if (type == 'itemView') {
    openItemQuickview(data);
  } else if (type == 'abilityView') {
    openAbilityQuickview(data);
  } else if (type == 'resistView') {
    openResistancesQuickview(data);
  } else if (type == 'resistListView') {
    openResistancesListQuickview(data);
  } else if (type == 'otherProfsView') {
    openOtherProfsQuickview(data);
  } else if (type == 'customizeProfView') {
    openCustomizeProfQuickview(data);
  } else if (type == 'addProfView') {
    openAddProfQuickview(data);
  } else if (type == 'addLoreView') {
    openAddLoreQuickview(data);
  } else if (type == 'addLangView') {
    openAddLangQuickview(data);
  } else if (type == 'addSpellSlotView') {
    openAddSpellSlotQuickview(data);
  } else if (type == 'addResistView') {
    openAddResistQuickview(data);
  } else if (type == 'addWeakView') {
    openAddWeakQuickview(data);
  } else if (type == 'addUnarmedAttackView') {
    openAddUnarmedAttackQuickview(data);
  } else if (type == 'tagView') {
    openTagQuickview(data);
  } else if (type == 'classDCView') {
    openClassDCQuickview(data);
  } else if (type == 'conditionView') {
    openConditionQuickview(data);
  } else if (type == 'acView') {
    openACQuickview(data);
  } else if (type == 'charInfoView') {
    openCharInfoQuickview(data);
  } else if (type == 'animalCompanionView') {
    openAnimalCompQuickview(data);
  } else if (type == 'familiarView') {
    openFamiliarQuickview(data);
  } else if (type == 'itemBreakdownView') {
    openItemBreakdownQuickview(data);
  } else if (type == 'generalBreakdownView') {
    openGeneralBreakdownQuickview(data);
  } else if (type == 'hitPointsBreakdownView') {
    openHitPointsBreakdownQuickview(data);
  } else if (type == 'abilityScoresBreakdownView') {
    openAbilityScoresBreakdownQuickview(data);
  } else if (type == 'warningsView') {
    openWarningsQuickview(data);
  } else if (type == 'creatureView') {
    openCreatureQuickview(data);
  } else if (type == 'creatureCustomView') {
    openCreatureCustomQuickview(data);
  } else if (type == 'characterView') {
    openCharacterQuickview(data);
  }

}

function closeQuickView() {
  $('#quickviewDefault').removeClass('is-active');
  g_QViewLastData = null;

  // For toggle critical hit in invItem quickview
  if (typeof g_invItemView_isCriticalHit !== 'undefined') {
    g_invItemView_isCriticalHit = false;
  }
}

function addQuickViewProtection() {
  $('#quickviewDefault').addClass('quickview-auto-close-protection');
}

function enablePreventQuickViewAutoClose(){
  $('#quickviewDefault').addClass('quickview-prevent-auto-close');
}
function disablePreventQuickViewAutoClose(){
  $('#quickviewDefault').removeClass('quickview-prevent-auto-close');
}

function refreshQuickView(newData=g_QViewLastData) {
  if ($('#quickviewDefault').hasClass('is-active')) {
    let scrollAmt = $('#quickViewContent').parent().scrollTop();

    openQuickView(g_QViewLastType, newData, true);
    
    $('#quickViewContent').parent().scrollTop(scrollAmt);
  }
}


function addBackFunctionality(quickViewData) {

  if (quickViewData._prevBackData != null && quickViewData._prevBackData.Data != null) {
    $('#quickViewTitleClose').html('<span id="quickViewBack" class="icon has-txt-value-string cursor-clickable" style="font-size:0.8em;"><i class="fas fa-arrow-left"></i></i></span>');
    $('#quickViewBack').click(function () {
      openQuickView(quickViewData._prevBackData.Type, quickViewData._prevBackData.Data, true);
    });
  }

}

function getContentSource(contentID, contentSrc, homebrewID) {

  if (contentID != null && contentSrc == null && homebrewID == null) {
    return '<div style="position: fixed; bottom: 5px; right: 12px;"><span class="is-size-7 has-txt-faded is-italic">#' + contentID + '</span></div>';
  }

  let sourceTextName, sourceLink;
  if (homebrewID == null) {
    sourceTextName = getContentSourceTextName(contentSrc);
    sourceLink = getContentSourceLink(contentSrc);
    if (sourceTextName == null) { sourceTextName = capitalizeWords(contentSrc); }
    if (sourceLink == null) { sourceLink = ''; }
  } else {

    sourceTextName = 'Bundle #' + homebrewID;
    sourceLink = '/homebrew/?view_id=' + homebrewID;

    if (typeof g_enabledSources !== 'undefined') {
      let enabledSource = g_enabledSources.find(enabledSource => {
        return enabledSource.bundleID && enabledSource.bundleID + '' === homebrewID + '';
      });
      if (enabledSource) {
        sourceTextName = enabledSource.name;
      }
    }

  }

  let contentIDStr = (contentID == null) ? '' : '<span class="is-size-7 has-txt-faded is-italic">, #' + contentID + '</span>';
  return '<div style="position: fixed; bottom: 5px; right: 12px;"><a class="is-size-7 has-txt-noted is-italic" href="' + sourceLink + '" target="_blank">' + sourceTextName + '</a>' + contentIDStr + '</div>';

}

function addContentSource(contentID, contentSrc, homebrewID) {
  $('#quickViewContent').parent().css('position', 'relative');
  $('#quickViewContent').append(getContentSource(contentID, contentSrc, homebrewID));
}