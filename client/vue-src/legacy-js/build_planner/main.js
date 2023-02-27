/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/
"use strict";

let socket = io();

let isBuilderInit = false;
let g_builder_type = null;// 'by-abc' or 'by-level'
let g_page_num = null;

let g_creationSectionScroll = null;

let g_char_id = null;
let g_char_level = null;

let g_build_id = null;

$(function () {

  g_builder_type = $('#builder-data').attr('data-builder-type');
  g_page_num = parseInt($('#builder-data').attr('data-page-num'));

  if($('#builder-data').attr('data-char-id') != 'none'){

    g_char_id = parseInt($('#builder-data').attr('data-char-id'));
    g_char_level = parseInt($('#builder-data').attr('data-char-lvl'));
    g_build_id = null;

  } else {

    g_char_id = null;
    g_char_level = 20;
    g_build_id = parseInt($('#builder-data').attr('data-build-id'));

  }

  startDiceLoader();
  $.get(`/mloads/char-builder/?char_id=${g_char_id}&build_id=${g_build_id}`).done(function(data){
    stopDiceLoader();
    g_buildInfo = data.buildInfo;
    mainLoaded(data.coreStruct.plannerStruct, data.coreStruct.choiceStruct);
  });

  // Create the container for each level
  $(`#creation-section`).html(`
    <div>
      <p id="creation-select-msg-by-level" class="is-hidden has-text-centered is-italic">Select an ancestry, background, or class.</p>
      <p id="creation-select-msg-by-abc-a" class="is-hidden has-text-centered is-italic">Select an ancestry.</p>
      <p id="creation-select-msg-by-abc-b" class="is-hidden has-text-centered is-italic">Select a background.</p>
      <p id="creation-select-msg-by-abc-c" class="is-hidden has-text-centered is-italic">Select a class.</p>
    </div>

    <div id="accord-container-init-stats" class="accord-container accord-creation-container my-1">
      <div class="accord-header">
        <span class="title-font pl-2">Initial Stats <span class="has-txt-noted is-italic">(Level 1)</span></span>
        <span class="accord-indicate-unselected-options"></span>
        <span class="icon is-pulled-right">
          <i class="accord-chevron fas fa-chevron-down"></i>
        </span>
      </div>
      <div class="accord-body is-hidden">
        <div id="initial-stats-ancestry" class="ancestry-feature-section"></div>
        <div id="initial-stats-background" class="background-feature-section"></div>
        <div id="initial-stats-class" class="class-feature-section"></div>
        <div id="initial-stats-custom-code" class="custom-code-feature-section"></div>
      </div>
    </div>
  `);
  for(let lvl = 1; lvl <= g_char_level; lvl++){
    $(`#creation-section`).append(`
      <div class="accord-container accord-creation-container my-1">
        <div class="accord-header">
          <span class="title-font pl-2">Level ${lvl}</span>
          <span class="accord-indicate-unselected-options"></span>
          <span class="icon is-pulled-right">
            <i class="accord-chevron fas fa-chevron-down"></i>
          </span>
        </div>
        <div id="level-${lvl}-body" class="accord-body is-hidden has-back-to-top no-tooltip">
        </div>
      </div>
    `);
  }

});




let g_buildInfo = null;

let g_character = null;

/* Internal Builder-Char Options */
let gOption_hasProfWithoutLevel = false;
let gOption_hasVariantAncestryParagon = false;
let gOption_hasFreeArchetype = false;
let gOption_hasAutoBonusProgression = false;
let gOption_hasGradualAbilityBoosts = false;
let gOption_hasClassArchetypes = false;
let gOption_hasAutoDetectPreReqs = false;
/* ~~~~~~~~~~~~~~~~~~~ */

/* Internal Sheet-State Options */
let gState_hasFinesseMeleeUseDexDamage = false;
let gState_armoredStealth = false;
let gState_mightyBulwark = false;
let gState_unburdenedIron = false;
let gState_improvisedWeaponNoPenalty = false;
let gState_addLevelToUntrainedWeaponAttack = false;
let gState_addLevelToUntrainedSkill = false;
let gState_displayCompanionTab = false;
let gState_MAP = 'TIER_1';
// TIER_1 = (5/10 or 4/8 agile)
// TIER_2 = (4/8 or 3/6 agile)
// TIER_3 = (3/6 or 2/4 agile)
// TIER_4 = (2/4 or 1/2 agile)
/* ~~~~~~~~~~~~~~~~~~~ */

let temp_classNum = 1;

let g_enabledSources = null;

let g_featMap = null;
let g_itemMap = null;
let g_spellMap = null;
let g_skillMap = null;

let g_allLanguages = null;
let g_allConditions = null;
let g_allTags = null;
let g_allPhyFeats = null;
let g_allSenses = null;

let g_classMap = null;
let g_ancestryMap = null;
let g_archetypes = null;
let g_backgrounds = null;
let g_uniHeritages = null;

let g_domains = null;
let g_classArchetypes = null;

function mainLoaded(plannerCoreStruct, choiceStruct){

  console.log('~ LOADING BUILDER ~');

  // Core Data //
  g_featMap = objToMap(plannerCoreStruct.featsObject);
  g_itemMap = objToMap(plannerCoreStruct.itemObject);
  g_spellMap = objToMap(plannerCoreStruct.spellObject);
  g_skillMap = objToMap(plannerCoreStruct.skillObject);

  g_allLanguages = plannerCoreStruct.allLanguages;
  g_allConditions = plannerCoreStruct.allConditions;
  g_allTags = plannerCoreStruct.allTags;
  g_allPhyFeats = plannerCoreStruct.allPhyFeats;
  g_allSenses = plannerCoreStruct.allSenses;

  g_classMap = objToMap(plannerCoreStruct.classes);
  g_ancestryMap = objToMap(plannerCoreStruct.ancestries);
  g_archetypes = plannerCoreStruct.archetypes;
  g_backgrounds = plannerCoreStruct.backgrounds;
  g_uniHeritages = plannerCoreStruct.uniHeritages;

  g_domains = plannerCoreStruct.allDomains;
  g_classArchetypes = plannerCoreStruct.classArchetypes;
  g_enabledSources = plannerCoreStruct.sourceBooks;
  //          //

  g_character = choiceStruct.character;
  
  // Set g_character.level = g_char_level for the build creator
  g_character.level = g_char_level;

  if(g_char_id == null){// If build creator, enable AutoDetectPreReqs
    g_character.optionAutoDetectPreReqs = 1;
  }

  // Init char meta data
  initDataMap(choiceStruct.charMetaData);

  // First expression and variable init
  initExpressionProcessor();
  initVariables();

  // Predetermine Prereq Match
  for(const [featID, featStruct] of g_featMap.entries()){
    g_featPrereqMap.set(featID+'', meetsPrereqs(featStruct.Feat));
  }

  // Init Class Archetypes
  initClassArchetypes(getDataSingle(DATA_SOURCE.CLASS_ARCHETYPE_CHOICE, {
    sourceType: 'class',
    sourceLevel: 1,
    sourceCode: 'classArchetype',
    sourceCodeSNum: 'a',
  }).value);

  // Bind step buttons
  $('.builder-basics-page-btn').click(function(event, initLoad){
    window.location.href = '/profile/characters/builder/basics/?id='+g_char_id;
  });
  $('.builder-ancestry-page-btn').click(function(event, initLoad){

    $('#builder-home-step').addClass('is-completed');
    $('#builder-ancestry-step').removeClass('is-completed');
    $('#builder-background-step').removeClass('is-completed');
    $('#builder-class-step').removeClass('is-completed');

    $('#builder-ancestry-step').addClass('is-active');
    $('#builder-background-step').removeClass('is-active');
    $('#builder-class-step').removeClass('is-active');

    $('#builder-ancestry-step').addClass('is-info');
    $('#builder-background-step').removeClass('is-info');
    $('#builder-class-step').removeClass('is-info');

    $('#builder-ancestry-step-symbol').removeClass('has-text-bck-color');
    $('#builder-background-step-symbol').addClass('has-text-bck-color');
    $('#builder-class-step-symbol').addClass('has-text-bck-color');

    $('#builder-ancestry-step-symbol').addClass('has-text-info');
    $('#builder-background-step-symbol').removeClass('has-text-info');
    $('#builder-class-step-symbol').removeClass('has-text-info');

    if(!initLoad){
      startSpinnerSubLoader('planner-subpageloader');
    }

    g_page_num = 2;
    window.history.pushState('profile/characters/builder', '', '/profile/characters/builder/?id='+g_char_id+'&page=2');// Update URL

    if(!initLoad){
      setTimeout(() => {
        stateLoad();
        stopSpinnerSubLoader('planner-subpageloader');
      }, 50);// After 0.05 second
    }
  });
  $('.builder-background-page-btn').click(function(event, initLoad){

    $('#builder-home-step').addClass('is-completed');
    $('#builder-ancestry-step').addClass('is-completed');
    $('#builder-background-step').removeClass('is-completed');
    $('#builder-class-step').removeClass('is-completed');

    $('#builder-ancestry-step').removeClass('is-active');
    $('#builder-background-step').addClass('is-active');
    $('#builder-class-step').removeClass('is-active');

    $('#builder-ancestry-step').addClass('is-info');
    $('#builder-background-step').addClass('is-info');
    $('#builder-class-step').removeClass('is-info');

    $('#builder-ancestry-step-symbol').addClass('has-text-bck-color');
    $('#builder-background-step-symbol').removeClass('has-text-bck-color');
    $('#builder-class-step-symbol').addClass('has-text-bck-color');

    $('#builder-ancestry-step-symbol').removeClass('has-text-info');
    $('#builder-background-step-symbol').addClass('has-text-info');
    $('#builder-class-step-symbol').removeClass('has-text-info');

    if(!initLoad){
      startSpinnerSubLoader('planner-subpageloader');
    }

    g_page_num = 3;
    window.history.pushState('profile/characters/builder', '', '/profile/characters/builder/?id='+g_char_id+'&page=3');// Update URL

    if(!initLoad){
      setTimeout(() => {
        stateLoad();
        stopSpinnerSubLoader('planner-subpageloader');
      }, 50);// After 0.05 second
    }
  });
  $('.builder-class-page-btn').click(function(event, initLoad){

    $('#builder-home-step').addClass('is-completed');
    $('#builder-ancestry-step').addClass('is-completed');
    $('#builder-background-step').addClass('is-completed');
    $('#builder-class-step').removeClass('is-completed');

    $('#builder-ancestry-step').removeClass('is-active');
    $('#builder-background-step').removeClass('is-active');
    $('#builder-class-step').addClass('is-active');

    $('#builder-ancestry-step').addClass('is-info');
    $('#builder-background-step').addClass('is-info');
    $('#builder-class-step').addClass('is-info');

    $('#builder-ancestry-step-symbol').addClass('has-text-bck-color');
    $('#builder-background-step-symbol').addClass('has-text-bck-color');
    $('#builder-class-step-symbol').removeClass('has-text-bck-color');

    $('#builder-ancestry-step-symbol').removeClass('has-text-info');
    $('#builder-background-step-symbol').removeClass('has-text-info');
    $('#builder-class-step-symbol').addClass('has-text-info');

    if(!initLoad){
      startSpinnerSubLoader('planner-subpageloader');
    }

    g_page_num = 4;
    window.history.pushState('profile/characters/builder', '', '/profile/characters/builder/?id='+g_char_id+'&page=4');// Update URL
    
    if(!initLoad){
      setTimeout(() => {
        stateLoad();
        stopSpinnerSubLoader('planner-subpageloader');
      }, 50);// After 0.05 second
    }
  });
  $('.builder-finalize-page-btn').click(function(event, initLoad){
    if(g_character.name != null && g_character.ancestryID != null && g_character.backgroundID != null && g_character.classID != null){
      window.location.href ='/profile/characters/'+g_char_id;
    } else {
      let charRequirements = '';
      if(g_character.name == null){ charRequirements += '<br><span class="is-bold">Name</span>'; }
      if(g_character.ancestryID == null){ charRequirements += '<br><span class="is-bold">Ancestry</span>'; }
      if(g_character.backgroundID == null){ charRequirements += '<br><span class="is-bold">Background</span>'; }
      if(g_character.classID == null){ charRequirements += '<br><span class="is-bold">Class</span>'; }
      new ConfirmMessage('Incomplete Character', 'Your character requires the following before you can view their sheet:'+charRequirements, 'Okay', 'modal-incomplete-character', 'modal-incomplete-character-btn', 'is-info');
    }
  });


  // ABC Selections //
  let ancestrySelections = [];
  for(const [ancestryID, ancestryData] of g_ancestryMap.entries()){
    if(ancestryData.Ancestry.isArchived == 1){ continue; }
    ancestrySelections.push({
      id: ancestryID,
      name: ancestryData.Ancestry.name,
      rarity: ancestryData.Ancestry.rarity,
      homebrewID: ancestryData.Ancestry.homebrewID
    });
  }
  ancestrySelections = ancestrySelections.sort(
    function(a, b) {
      return a.name > b.name ? 1 : -1;
    }
  );
  ancestrySelections = [{id: 'none', name: 'None', rarity: 'COMMON', homebrewID: null}, ...ancestrySelections];

  let ancestryModalSelect = function() {
    new ModalSelection('Select Ancestry', 'Confirm Ancestry', ancestrySelections, 'ancestry', 'modal-select-ancestry', 'modal-select-ancestry-confirm-btn', g_featMap, g_character);
    $('#modal-select-ancestry-confirm-btn').click(function() {
      let newAncestryID = $('#modal-select-ancestry-confirm-btn').attr('data-selectedOptionID');
      if(newAncestryID == 'none'){ newAncestryID = null; }

      // Update ancestry in builder
      deleteAncestry();
      setAncestry(newAncestryID);

      // Update ancestry in db
      if(g_char_id != null){
        socket.emit("requestAncestryChange",
          g_char_id,
          newAncestryID);
        socket.once("returnAncestryChange", function() {
          animatedStateLoad();
        });
      } else {
        saveBuildInfo();
        animatedStateLoad();
      }

    });
  };

  let backgroundSelections = [];
  for(const background of g_backgrounds){
    if(background.isArchived == 1){ continue; }
    backgroundSelections.push({
      id: background.id,
      name: background.name,
      rarity: background.rarity,
      homebrewID: background.homebrewID
    });
  }
  backgroundSelections = backgroundSelections.sort(
    function(a, b) {
      return a.name > b.name ? 1 : -1;
    }
  );
  backgroundSelections = [{id: 'none', name: 'None', rarity: 'COMMON', homebrewID: null}, ...backgroundSelections];

  let backgroundModalSelect = function() {
    new ModalSelection('Select Background', 'Confirm Background', backgroundSelections, 'background', 'modal-select-background', 'modal-select-background-confirm-btn', g_featMap, g_character);
    $('#modal-select-background-confirm-btn').click(function() {
      let newBackgroundID = $('#modal-select-background-confirm-btn').attr('data-selectedOptionID');
      if(newBackgroundID == 'none'){ newBackgroundID = null; }

      // Update background in builder
      deleteBackground();
      setBackground(newBackgroundID);

      // Update background in db
      if(g_char_id != null){
        socket.emit("requestBackgroundChange",
          g_char_id,
          newBackgroundID);
        socket.once("returnBackgroundChange", function() {
          animatedStateLoad();
        });
      } else {
        saveBuildInfo();
        animatedStateLoad();
      }

    });
  };

  let classSelections = [];
  for(const [classID, classData] of g_classMap.entries()){
    if(classData.Class.isArchived == 1){ continue; }
    classSelections.push({
      id: classID,
      name: classData.Class.name,
      rarity: classData.Class.rarity,
      homebrewID: classData.Class.homebrewID
    });
  }
  classSelections = classSelections.sort(
    function(a, b) {
      return a.name > b.name ? 1 : -1;
    }
  );
  classSelections = [{id: 'none', name: 'None', rarity: 'COMMON', homebrewID: null}, ...classSelections];

  let classModalSelect = function() {
    new ModalSelection('Select Class', 'Confirm Class', classSelections, 'class', 'modal-select-class', 'modal-select-class-confirm-btn', g_featMap, g_character);
    $('#modal-select-class-confirm-btn').click(function() {
      let newClassID = $('#modal-select-class-confirm-btn').attr('data-selectedOptionID');
      if(newClassID == 'none'){ newClassID = null; }

      // Update class in builder
      deleteClass();
      setClass(newClassID);

      // Update class in db
      if(g_char_id != null){
        socket.emit("requestClassChange",
          g_char_id,
          newClassID,
          1);
        socket.once("returnClassChange", function() {
          animatedStateLoad();
        });
      } else {
        saveBuildInfo();
        animatedStateLoad();
      }

    });
  };

  // Selector for changing ABCs
  if(g_builder_type == 'by-level'){
    
    $('#selected-ancestry').click(function() {
      ancestryModalSelect();
    });
    $('#selected-background').click(function() {
      backgroundModalSelect();
    });
    $('#selected-class').click(function() {
      classModalSelect();
    });

  } else if(g_builder_type == 'by-abc'){

    $('#selected-abc').click(function() {
      if(g_page_num == 2){
        ancestryModalSelect();
      } else if(g_page_num == 3){
        backgroundModalSelect();
      } else if(g_page_num == 4){
        classModalSelect();
      }
    });

  }

  // Set Builder State, don't load from it
  if(g_page_num == 2){
    $('.builder-ancestry-page-btn').trigger('click', [true]);
  } else if(g_page_num == 3){
    $('.builder-background-page-btn').trigger('click', [true]);
  } else if(g_page_num == 4){
    $('.builder-class-page-btn').trigger('click', [true]);
  }

  // Load State by calling
  stateLoad(true);

  isBuilderInit = true;

}

function stateLoad(isInitLoad=false){

  g_creationSectionScroll = $('#creation-section').scrollTop();

  // Clear each level container
  for(let lvl = 1; lvl <= g_char_level; lvl++){
    $(`#level-${lvl}-body`).html('');
  }

  gOption_hasProfWithoutLevel = (g_character.variantProfWithoutLevel === 1);
  gOption_hasVariantAncestryParagon = (g_character.variantAncestryParagon === 1);
  gOption_hasFreeArchetype = (g_character.variantFreeArchetype === 1);
  gOption_hasAutoBonusProgression = (g_character.variantAutoBonusProgression === 1);
  gOption_hasGradualAbilityBoosts = (g_character.variantGradualAbilityBoosts === 1);
  gOption_hasClassArchetypes = (g_character.optionClassArchetypes === 1);
  gOption_hasAutoDetectPreReqs = (g_character.optionAutoDetectPreReqs === 1);

  initExpressionProcessor();
  initVariables();

  // Process Modules //
  processAncestry();
  processBackground();
  processClass();

  processCustomCode();

  // Process Extra Ancestry Langs and Class Skill Trainings
  processExtraSkillsAndLangs();

  // Display Results //
  displayStats();

  // If level body is empty, hide accord
  if(g_builder_type == 'by-level'){
    for(let lvl = 1; lvl <= g_char_level; lvl++){
      if($(`#level-${lvl}-body`).html() == ''){
        $(`#level-${lvl}-body`).parent().addClass('is-hidden');
      } else {
        $(`#level-${lvl}-body`).parent().removeClass('is-hidden');
      }
    }
  } else if(g_builder_type == 'by-abc'){
    for(let lvl = 1; lvl <= g_char_level; lvl++){
      if(g_page_num == 2){
        if($(`#level-${lvl}-body`).find('.ancestry-feature-section').length > 0){
          $(`#level-${lvl}-body`).parent().removeClass('is-hidden');
        } else {
          $(`#level-${lvl}-body`).parent().addClass('is-hidden');
        }
      } else if(g_page_num == 3){
        if($(`#level-${lvl}-body`).find('.background-feature-section').length > 0){
          $(`#level-${lvl}-body`).parent().removeClass('is-hidden');
        } else {
          $(`#level-${lvl}-body`).parent().addClass('is-hidden');
        }
      } else if(g_page_num == 4){
        if($(`#level-${lvl}-body`).find('.class-feature-section').length > 0){
          $(`#level-${lvl}-body`).parent().removeClass('is-hidden');
        } else {
          $(`#level-${lvl}-body`).parent().addClass('is-hidden');
        }
      }
    }
  }

  // Set name of current ancestry / background / class in selector
  if(g_builder_type == 'by-level'){
    if(getCharAncestry() != null){
      $('#selected-ancestry').text(getCharAncestry().Ancestry.name);
    } else {
      $('#selected-ancestry').text('None');
    }
    if(getCharBackground() != null){
      $('#selected-background').text(getCharBackground().name);
    } else {
      $('#selected-background').text('None');
    }
    if(getCharClass() != null){
      $('#selected-class').text(getCharClass().Class.name);
    } else {
      $('#selected-class').text('None');
    }
  } else if(g_builder_type == 'by-abc'){
    if(g_page_num == 2){
      $('#selected-abc-title').text('Ancestry');
      if(getCharAncestry() != null){
        $('#selected-abc').text(getCharAncestry().Ancestry.name);
      } else {
        $('#selected-abc').text('None');
      }
    } else if(g_page_num == 3){
      $('#selected-abc-title').text('Background');
      if(getCharBackground() != null){
        $('#selected-abc').text(getCharBackground().name);
      } else {
        $('#selected-abc').text('None');
      }
    } else if(g_page_num == 4){
      $('#selected-abc-title').text('Class');
      if(getCharClass() != null){
        $('#selected-abc').text(getCharClass().Class.name);
      } else {
        $('#selected-abc').text('None');
      }
    }
  }

  // If ancestry, background, and/or class is none, hide init stats
  if(g_builder_type == 'by-level'){
    if(getCharAncestry() == null && getCharBackground() == null && getCharClass() == null){
      $('#accord-container-init-stats').addClass('is-hidden');
      $('#creation-select-msg-by-level').removeClass('is-hidden');
    } else {
      $('#accord-container-init-stats').removeClass('is-hidden');
      $('#creation-select-msg-by-level').addClass('is-hidden');
    }
  } else if(g_builder_type == 'by-abc'){
    $('#creation-select-msg-by-abc-a').addClass('is-hidden');
    $('#creation-select-msg-by-abc-b').addClass('is-hidden');
    $('#creation-select-msg-by-abc-c').addClass('is-hidden');
    if(g_page_num == 2){
      if(getCharAncestry() == null){
        $('#accord-container-init-stats').addClass('is-hidden');
        $('#creation-select-msg-by-abc-a').removeClass('is-hidden');
      } else {
        $('#accord-container-init-stats').removeClass('is-hidden');
      }
    } else if(g_page_num == 3){
      if(getCharBackground() == null){
        $('#accord-container-init-stats').addClass('is-hidden');
        $('#creation-select-msg-by-abc-b').removeClass('is-hidden');
      } else {
        $('#accord-container-init-stats').removeClass('is-hidden');
      }
    } else if(g_page_num == 4){
      if(getCharClass() == null){
        $('#accord-container-init-stats').addClass('is-hidden');
        $('#creation-select-msg-by-abc-c').removeClass('is-hidden');
      } else {
        $('#accord-container-init-stats').removeClass('is-hidden');
      }
    }
  }
  
  // If is in abc, hide other sections
  if(g_builder_type == 'by-abc'){
    if(g_page_num == 2){
      $('.ancestry-feature-section').removeClass('is-hidden');
      $('.background-feature-section').addClass('is-hidden');
      $('.class-feature-section').addClass('is-hidden');
      
      $('.background-feature-section').find('li').removeClass("active");

    } else if(g_page_num == 3){
      $('.ancestry-feature-section').addClass('is-hidden');
      $('.background-feature-section').removeClass('is-hidden');
      $('.class-feature-section').addClass('is-hidden');
    } else if(g_page_num == 4){
      $('.ancestry-feature-section').addClass('is-hidden');
      $('.background-feature-section').addClass('is-hidden');
      $('.class-feature-section').removeClass('is-hidden');
    }
  }

  if(isInitLoad){
    if(g_char_id == null){// If build creator, open first accord
      $('#accord-container-init-stats').find('.accord-header').trigger('click');
    } else {// Else, open last
      // Open Level's Accordion //
      $(`#level-${g_char_level}-body`).parent().find('.accord-header').trigger('click');
      // Scroll down to Accordion
      $(`#level-${g_char_level}-body`).parent()[0].scrollIntoView();
    }
  } else {
    // If is reload, scroll back to previous location
    $('#creation-section').scrollTop(g_creationSectionScroll);
  }

}

function displayStats(){

  // Scores
  $('#str-score').text(variables_getTotal(VARIABLE.SCORE_STR));
  $('#dex-score').text(variables_getTotal(VARIABLE.SCORE_DEX));
  $('#con-score').text(variables_getTotal(VARIABLE.SCORE_CON));
  $('#int-score').text(variables_getTotal(VARIABLE.SCORE_INT));
  $('#wis-score').text(variables_getTotal(VARIABLE.SCORE_WIS));
  $('#cha-score').text(variables_getTotal(VARIABLE.SCORE_CHA));

  // Hit Points
  let maxHealth = variables_getTotal(VARIABLE.MAX_HEALTH);
  let maxHealthPerLevel = 0;
  if(getCharClass() != null){
    maxHealthPerLevel = (getCharClass().Class.hitPoints+getMod(variables_getTotal(VARIABLE.SCORE_CON))+variables_getTotal(VARIABLE.MAX_HEALTH_BONUS_PER_LEVEL))*g_character.level;
  }
  $('#hit-points-total').text(maxHealth+maxHealthPerLevel);

  // Class DC
  $('#class-dc-total').html((variables_hasConditionals(VARIABLE.CLASS_DC)) ? variables_getTotal(VARIABLE.CLASS_DC)+10+'<sup class="is-size-7 has-text-info">*</sup>' : variables_getTotal(VARIABLE.CLASS_DC)+10);
  $('#class-dc-rank').text(variables_getFinalRank(VARIABLE.CLASS_DC));

  // Perception
  $('#perception-total').html((variables_hasConditionals(VARIABLE.PERCEPTION)) ? signNumber(variables_getTotal(VARIABLE.PERCEPTION))+'<sup class="is-size-7 has-text-info">*</sup>' : signNumber(variables_getTotal(VARIABLE.PERCEPTION)));
  $('#perception-rank').text(variables_getFinalRank(VARIABLE.PERCEPTION));

  // Saves
  let saves = [
    {
      Value1: 'Fortitude',
      Value2: (variables_hasConditionals(VARIABLE.SAVE_FORT)) ? signNumber(variables_getTotal(VARIABLE.SAVE_FORT))+'<sup class="is-size-7 has-text-info">*</sup>' : signNumber(variables_getTotal(VARIABLE.SAVE_FORT)),
      Value3: variables_getFinalRank(VARIABLE.SAVE_FORT),
      VarName: VARIABLE.SAVE_FORT,
    },
    {
      Value1: 'Reflex',
      Value2: (variables_hasConditionals(VARIABLE.SAVE_REFLEX)) ? signNumber(variables_getTotal(VARIABLE.SAVE_REFLEX))+'<sup class="is-size-7 has-text-info">*</sup>' : signNumber(variables_getTotal(VARIABLE.SAVE_REFLEX)),
      Value3: variables_getFinalRank(VARIABLE.SAVE_REFLEX),
      VarName: VARIABLE.SAVE_REFLEX,
    },
    {
      Value1: 'Will',
      Value2: (variables_hasConditionals(VARIABLE.SAVE_WILL)) ? signNumber(variables_getTotal(VARIABLE.SAVE_WILL))+'<sup class="is-size-7 has-text-info">*</sup>' : signNumber(variables_getTotal(VARIABLE.SAVE_WILL)),
      Value3: variables_getFinalRank(VARIABLE.SAVE_WILL),
      VarName: VARIABLE.SAVE_WILL,
    },
  ];
  populateAccord('saves-body', saves);

  // Skills
  let skills = [
    {
      Value1: 'Acrobatics',
      Value2: (variables_hasConditionals(VARIABLE.SKILL_ACROBATICS)) ? signNumber(variables_getTotal(VARIABLE.SKILL_ACROBATICS))+'<sup class="is-size-7 has-text-info">*</sup>' : signNumber(variables_getTotal(VARIABLE.SKILL_ACROBATICS)),
      Value3: variables_getFinalRank(VARIABLE.SKILL_ACROBATICS),
      VarName: VARIABLE.SKILL_ACROBATICS,
    },
    {
      Value1: 'Arcana',
      Value2: (variables_hasConditionals(VARIABLE.SKILL_ARCANA)) ? signNumber(variables_getTotal(VARIABLE.SKILL_ARCANA))+'<sup class="is-size-7 has-text-info">*</sup>' : signNumber(variables_getTotal(VARIABLE.SKILL_ARCANA)),
      Value3: variables_getFinalRank(VARIABLE.SKILL_ARCANA),
      VarName: VARIABLE.SKILL_ARCANA,
    },
    {
      Value1: 'Athletics',
      Value2: (variables_hasConditionals(VARIABLE.SKILL_ATHLETICS)) ? signNumber(variables_getTotal(VARIABLE.SKILL_ATHLETICS))+'<sup class="is-size-7 has-text-info">*</sup>' : signNumber(variables_getTotal(VARIABLE.SKILL_ATHLETICS)),
      Value3: variables_getFinalRank(VARIABLE.SKILL_ATHLETICS),
      VarName: VARIABLE.SKILL_ATHLETICS,
    },
    {
      Value1: 'Crafting',
      Value2: (variables_hasConditionals(VARIABLE.SKILL_CRAFTING)) ? signNumber(variables_getTotal(VARIABLE.SKILL_CRAFTING))+'<sup class="is-size-7 has-text-info">*</sup>' : signNumber(variables_getTotal(VARIABLE.SKILL_CRAFTING)),
      Value3: variables_getFinalRank(VARIABLE.SKILL_CRAFTING),
      VarName: VARIABLE.SKILL_CRAFTING,
    },
    {
      Value1: 'Deception',
      Value2: (variables_hasConditionals(VARIABLE.SKILL_DECEPTION)) ? signNumber(variables_getTotal(VARIABLE.SKILL_DECEPTION))+'<sup class="is-size-7 has-text-info">*</sup>' : signNumber(variables_getTotal(VARIABLE.SKILL_DECEPTION)),
      Value3: variables_getFinalRank(VARIABLE.SKILL_DECEPTION),
      VarName: VARIABLE.SKILL_DECEPTION,
    },
    {
      Value1: 'Diplomacy',
      Value2: (variables_hasConditionals(VARIABLE.SKILL_DIPLOMACY)) ? signNumber(variables_getTotal(VARIABLE.SKILL_DIPLOMACY))+'<sup class="is-size-7 has-text-info">*</sup>' : signNumber(variables_getTotal(VARIABLE.SKILL_DIPLOMACY)),
      Value3: variables_getFinalRank(VARIABLE.SKILL_DIPLOMACY),
      VarName: VARIABLE.SKILL_DIPLOMACY,
    },
    {
      Value1: 'Intimidation',
      Value2: (variables_hasConditionals(VARIABLE.SKILL_INTIMIDATION)) ? signNumber(variables_getTotal(VARIABLE.SKILL_INTIMIDATION))+'<sup class="is-size-7 has-text-info">*</sup>' : signNumber(variables_getTotal(VARIABLE.SKILL_INTIMIDATION)),
      Value3: variables_getFinalRank(VARIABLE.SKILL_INTIMIDATION),
      VarName: VARIABLE.SKILL_INTIMIDATION,
    },
    {
      Value1: 'Medicine',
      Value2: (variables_hasConditionals(VARIABLE.SKILL_MEDICINE)) ? signNumber(variables_getTotal(VARIABLE.SKILL_MEDICINE))+'<sup class="is-size-7 has-text-info">*</sup>' : signNumber(variables_getTotal(VARIABLE.SKILL_MEDICINE)),
      Value3: variables_getFinalRank(VARIABLE.SKILL_MEDICINE),
      VarName: VARIABLE.SKILL_MEDICINE,
    },
    {
      Value1: 'Nature',
      Value2: (variables_hasConditionals(VARIABLE.SKILL_NATURE)) ? signNumber(variables_getTotal(VARIABLE.SKILL_NATURE))+'<sup class="is-size-7 has-text-info">*</sup>' : signNumber(variables_getTotal(VARIABLE.SKILL_NATURE)),
      Value3: variables_getFinalRank(VARIABLE.SKILL_NATURE),
      VarName: VARIABLE.SKILL_NATURE,
    },
    {
      Value1: 'Occultism',
      Value2: (variables_hasConditionals(VARIABLE.SKILL_OCCULTISM)) ? signNumber(variables_getTotal(VARIABLE.SKILL_OCCULTISM))+'<sup class="is-size-7 has-text-info">*</sup>' : signNumber(variables_getTotal(VARIABLE.SKILL_OCCULTISM)),
      Value3: variables_getFinalRank(VARIABLE.SKILL_OCCULTISM),
      VarName: VARIABLE.SKILL_OCCULTISM,
    },
    {
      Value1: 'Performance',
      Value2: (variables_hasConditionals(VARIABLE.SKILL_PERFORMANCE)) ? signNumber(variables_getTotal(VARIABLE.SKILL_PERFORMANCE))+'<sup class="is-size-7 has-text-info">*</sup>' : signNumber(variables_getTotal(VARIABLE.SKILL_PERFORMANCE)),
      Value3: variables_getFinalRank(VARIABLE.SKILL_PERFORMANCE),
      VarName: VARIABLE.SKILL_PERFORMANCE,
    },
    {
      Value1: 'Religion',
      Value2: (variables_hasConditionals(VARIABLE.SKILL_RELIGION)) ? signNumber(variables_getTotal(VARIABLE.SKILL_RELIGION))+'<sup class="is-size-7 has-text-info">*</sup>' : signNumber(variables_getTotal(VARIABLE.SKILL_RELIGION)),
      Value3: variables_getFinalRank(VARIABLE.SKILL_RELIGION),
      VarName: VARIABLE.SKILL_RELIGION,
    },
    {
      Value1: 'Society',
      Value2: (variables_hasConditionals(VARIABLE.SKILL_SOCIETY)) ? signNumber(variables_getTotal(VARIABLE.SKILL_SOCIETY))+'<sup class="is-size-7 has-text-info">*</sup>' : signNumber(variables_getTotal(VARIABLE.SKILL_SOCIETY)),
      Value3: variables_getFinalRank(VARIABLE.SKILL_SOCIETY),
      VarName: VARIABLE.SKILL_SOCIETY,
    },
    {
      Value1: 'Stealth',
      Value2: (variables_hasConditionals(VARIABLE.SKILL_STEALTH)) ? signNumber(variables_getTotal(VARIABLE.SKILL_STEALTH))+'<sup class="is-size-7 has-text-info">*</sup>' : signNumber(variables_getTotal(VARIABLE.SKILL_STEALTH)),
      Value3: variables_getFinalRank(VARIABLE.SKILL_STEALTH),
      VarName: VARIABLE.SKILL_STEALTH,
    },
    {
      Value1: 'Survival',
      Value2: (variables_hasConditionals(VARIABLE.SKILL_SURVIVAL)) ? signNumber(variables_getTotal(VARIABLE.SKILL_SURVIVAL))+'<sup class="is-size-7 has-text-info">*</sup>' : signNumber(variables_getTotal(VARIABLE.SKILL_SURVIVAL)),
      Value3: variables_getFinalRank(VARIABLE.SKILL_SURVIVAL),
      VarName: VARIABLE.SKILL_SURVIVAL,
    },
    {
      Value1: 'Thievery',
      Value2: (variables_hasConditionals(VARIABLE.SKILL_THIEVERY)) ? signNumber(variables_getTotal(VARIABLE.SKILL_THIEVERY))+'<sup class="is-size-7 has-text-info">*</sup>' : signNumber(variables_getTotal(VARIABLE.SKILL_THIEVERY)),
      Value3: variables_getFinalRank(VARIABLE.SKILL_THIEVERY),
      VarName: VARIABLE.SKILL_THIEVERY,
    },
  ];

  const sortedLoreDataArray = getDataAll(DATA_SOURCE.LORE).sort(
    function(a, b) {
      return a.value > b.value ? 1 : -1;
    }
  );
  for(const loreData of sortedLoreDataArray){
    let loreTotal = signNumber(variables_getTotal(`SKILL_${profConversion_convertOldName(loreData.value)}_LORE`));
    if(variables_hasConditionals(`SKILL_${profConversion_convertOldName(loreData.value)}_LORE`)){
      loreTotal += '<sup class="is-size-7 has-text-info">*</sup>';
    }
    skills.push({
      Value1: capitalizeWords(loreData.value)+' Lore',
      Value2: loreTotal,
      Value3: variables_getFinalRank(`SKILL_${profConversion_convertOldName(loreData.value)}_LORE`),
      VarName: `SKILL_${profConversion_convertOldName(loreData.value)}_LORE`,
    });
  }
  populateAccord('skills-body', skills);

  // Attacks
  let attacks = [
    {
      Value1: 'Simple Weapons',
      Value2: variables_getFinalRank(VARIABLE.SIMPLE_WEAPONS),
      VarName: VARIABLE.SIMPLE_WEAPONS,
    },
    {
      Value1: 'Martial Weapons',
      Value2: variables_getFinalRank(VARIABLE.MARTIAL_WEAPONS),
      VarName: VARIABLE.MARTIAL_WEAPONS,
    },
    {
      Value1: 'Advanced Weapons',
      Value2: variables_getFinalRank(VARIABLE.ADVANCED_WEAPONS),
      VarName: VARIABLE.ADVANCED_WEAPONS,
    },
    {
      Value1: 'Unarmed Attacks',
      Value2: variables_getFinalRank(VARIABLE.UNARMED_ATTACKS),
      VarName: VARIABLE.UNARMED_ATTACKS,
    },
  ];
  populateAccord('attacks-body', attacks);

  // Armor
  let defenses = [
    {
      Value1: 'Light Armor',
      Value2: variables_getFinalRank(VARIABLE.LIGHT_ARMOR),
      VarName: VARIABLE.LIGHT_ARMOR,
    },
    {
      Value1: 'Medium Armor',
      Value2: variables_getFinalRank(VARIABLE.MEDIUM_ARMOR),
      VarName: VARIABLE.MEDIUM_ARMOR,
    },
    {
      Value1: 'Heavy Armor',
      Value2: variables_getFinalRank(VARIABLE.HEAVY_ARMOR),
      VarName: VARIABLE.HEAVY_ARMOR,
    },
    {
      Value1: 'Unarmored Defense',
      Value2: variables_getFinalRank(VARIABLE.UNARMORED_DEFENSE),
      VarName: VARIABLE.UNARMORED_DEFENSE,
    },
  ];
  populateAccord('defenses-body', defenses);

  // Spellcasting
  let spellcasting = [];
  const arcaneSpellAttacksRank = variables_getFinalRank(VARIABLE.ARCANE_SPELL_ATTACK);
  if(arcaneSpellAttacksRank != 'U'){
    spellcasting.push({
      Value1: 'Arcane Spell Attacks',
      Value2: arcaneSpellAttacksRank,
      VarName: VARIABLE.ARCANE_SPELL_ATTACK,
    });
  }
  const arcaneSpellDCsRank = variables_getFinalRank(VARIABLE.ARCANE_SPELL_DC);
  if(arcaneSpellDCsRank != 'U'){
    spellcasting.push({
      Value1: 'Arcane Spell DCs',
      Value2: arcaneSpellDCsRank,
      VarName: VARIABLE.ARCANE_SPELL_DC,
    });
  }

  const divineSpellAttacksRank = variables_getFinalRank(VARIABLE.DIVINE_SPELL_ATTACK);
  if(divineSpellAttacksRank != 'U'){
    spellcasting.push({
      Value1: 'Divine Spell Attacks',
      Value2: divineSpellAttacksRank,
      VarName: VARIABLE.DIVINE_SPELL_ATTACK,
    });
  }
  const divineSpellDCsRank = variables_getFinalRank(VARIABLE.DIVINE_SPELL_DC);
  if(divineSpellDCsRank != 'U'){
    spellcasting.push({
      Value1: 'Divine Spell DCs',
      Value2: divineSpellDCsRank,
      VarName: VARIABLE.DIVINE_SPELL_DC,
    });
  }

  const occultSpellAttacksRank = variables_getFinalRank(VARIABLE.OCCULT_SPELL_ATTACK);
  if(occultSpellAttacksRank != 'U'){
    spellcasting.push({
      Value1: 'Occult Spell Attacks',
      Value2: occultSpellAttacksRank,
      VarName: VARIABLE.OCCULT_SPELL_ATTACK,
    });
  }
  const occultSpellDCsRank = variables_getFinalRank(VARIABLE.OCCULT_SPELL_DC);
  if(occultSpellDCsRank != 'U'){
    spellcasting.push({
      Value1: 'Occult Spell DCs',
      Value2: occultSpellDCsRank,
      VarName: VARIABLE.OCCULT_SPELL_DC,
    });
  }

  const primalSpellAttacksRank = variables_getFinalRank(VARIABLE.PRIMAL_SPELL_ATTACK);
  if(primalSpellAttacksRank != 'U'){
    spellcasting.push({
      Value1: 'Primal Spell Attacks',
      Value2: primalSpellAttacksRank,
      VarName: VARIABLE.PRIMAL_SPELL_ATTACK,
    });
  }
  const primalSpellDCsRank = variables_getFinalRank(VARIABLE.PRIMAL_SPELL_DC);
  if(primalSpellDCsRank != 'U'){
    spellcasting.push({
      Value1: 'Primal Spell DCs',
      Value2: primalSpellDCsRank,
      VarName: VARIABLE.PRIMAL_SPELL_DC,
    });
  }
  populateAccord('spellcasting-body', spellcasting);

  // Languages
  let sortedLangsArray = [];
  for(const [key, data] of variables_getExtrasMap(VARIABLE.LANGUAGES).entries()){
    let lang = g_allLanguages.find(lang => {
      return lang.id == data.Value;
    });
    if(lang != null){
      sortedLangsArray.push(lang);
    }
  }
  sortedLangsArray = sortedLangsArray.sort(
    function(a, b) {
      return a.name > b.name ? 1 : -1;
    }
  );
  let languages = [];
  for(let lang of sortedLangsArray){
    languages.push({
      Value1: lang.name,
      Value2: '',
      CustomQuickview: {name: 'languageView', data: {Language: lang}},
    });
  }
  populateAccord('languages-body', languages);

  let resistWeaks = [];

  // Process Resists into array that can be passed into processResistsOrWeaksToMap()
  const resistsArray = [];
  for(const [key, data] of variables_getExtrasMap(VARIABLE.RESISTANCES).entries()){
    let dParts = data.Value.split(getSeparator());
    resistsArray.push({ Type: dParts[0], Amount: dParts[1] });
  }
  const resistsMap = processResistsOrWeaksToMap(resistsArray, g_character.level);

  for(const [type, amount] of resistsMap.entries()){
    resistWeaks.push({
      Value1: type+' '+amount,
      Value2: 'Resist.',
    });
  }

  // Process Weaks into array that can be passed into processResistsOrWeaksToMap()
  const weaksArray = [];
  for(const [key, data] of variables_getExtrasMap(VARIABLE.WEAKNESSES).entries()){
    let dParts = data.Value.split(getSeparator());
    weaksArray.push({ Type: dParts[0], Amount: dParts[1] });
  }
  const weaksMap = processResistsOrWeaksToMap(weaksArray, g_character.level);

  for(const [type, amount] of weaksMap.entries()){
    resistWeaks.push({
      Value1: type+' '+amount,
      Value2: 'Weak.',
    });
  }
  populateAccord('resist-weaks-body', resistWeaks);

}


function getAllAbilityTypes() {
  return ['Strength','Dexterity','Constitution','Intelligence','Wisdom','Charisma'];
}

function finishLoadingPage(){
  displayStats();
}

function animatedStateLoad() {
  startSpinnerSubLoader('planner-subpageloader');
  setTimeout(() => {
    stateLoad();
    stopSpinnerSubLoader('planner-subpageloader');
  }, 50);// After 0.05 second
}

function hasDuplicateFeat(featID){
  for(const feat of getDataAll(DATA_SOURCE.FEAT_CHOICE)){
    if(feat.value != null && feat.value == featID) {
      return true;
    }
  }
  return false;
}

function hasDuplicateSelected(selectOptions) {
  let optionValArray = [];
  $(selectOptions).each(function() {
      if($(this).val() != "chooseDefault"){
          optionValArray.push($(this).val());
      }
  });
  return (new Set(optionValArray)).size !== optionValArray.length;
}

function getSkillNameAbbrev(skillName){
  skillName = skillName.toUpperCase();
  switch(skillName) {
    case 'ACROBATICS': return 'Acro.';
    case 'ARCANA': return 'Arcana';
    case 'ATHLETICS': return 'Athletics';
    case 'CRAFTING': return 'Crafting';
    case 'DECEPTION': return 'Deception';
    case 'DIPLOMACY': return 'Diplomacy';
    case 'INTIMIDATION': return 'Intim.';
    case 'LORE': return 'Lore';
    case 'MEDICINE': return 'Medicine';
    case 'NATURE': return 'Nature';
    case 'OCCULTISM': return 'Occultism';
    case 'PERFORMANCE': return 'Perform.';
    case 'RELIGION': return 'Religion';
    case 'SOCIETY': return 'Society';
    case 'STEALTH': return 'Stealth';
    case 'SURVIVAL': return 'Survival';
    case 'THIEVERY': return 'Thievery';
    default: return '';
  }
}

function getSkillIDToName(skillID){
  switch(skillID) { // Hardcoded - Skill IDs
    case 1: return 'Acrobatics';
    case 3: return 'Arcana';
    case 4: return 'Athletics';
    case 5: return 'Crafting';
    case 6: return 'Deception';
    case 7: return 'Diplomacy';
    case 8: return 'Intimidation';
    case 9: return 'Lore';
    case 10: return 'Medicine';
    case 11: return 'Nature';
    case 12: return 'Occultism';
    case 14: return 'Performance';
    case 15: return 'Religion';
    case 16: return 'Society';
    case 17: return 'Stealth';
    case 18: return 'Survival';
    case 19: return 'Thievery';
    default: return 'Unknown';
  }
}