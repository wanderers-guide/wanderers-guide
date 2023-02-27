/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

let socket = io();

$(function () {

  startSpinnerLoader();
  socket.emit("requestEncounterDetails");

  // Save every 1 minute
  window.setInterval(() => {
    saveData();
  }, 60000);

  // Save on tab close
  window.onbeforeunload = function (e) {
    saveData();
  };

});

let g_creaturesMap;
let g_extractedCreaturesMap;
let g_foundCreatureTraitsSet;
let g_foundCreatureFamiliesSet;
let g_foundCreatureBooksSet;

let g_allConditions;
let g_allTags;
let g_featMap;
let g_itemMap;
let g_spellMap;
let g_skillMap;

let g_campaigns;

socket.on("returnEncounterDetails", function (allCreatures, allTags, featsObject, itemsObject, spellsObject, allConditions, skillObject, campaigns) {

  g_creaturesMap = new Map();
  for (let creature of allCreatures) {
    g_creaturesMap.set(creature.id, creature);
  }
  let extractDataToString = function(data){
    let resultStr = ``;
    for(let d in data) {
        if(data[d] != '' && data[d] != null){
            resultStr += ` ${JSON.stringify(data[d])} `;
        }
    }
    return resultStr.replace(/\W/g, ' ').toLowerCase();
  };
  g_extractedCreaturesMap = new Map();
  g_foundCreatureTraitsSet = new Set();
  g_foundCreatureFamiliesSet = new Set();
  g_foundCreatureBooksSet = new Set();
  for (const [creatureID, data] of g_creaturesMap.entries()) {
    g_extractedCreaturesMap.set(creatureID, extractDataToString(data));

    try {
      let traits = JSON.parse(data.traitsJSON.toLowerCase());
      for(let trait of traits){
        g_foundCreatureTraitsSet.add(trait);
      }
    } catch (error) {}

    let familyType = (data.familyType != null) ? data.familyType.toLowerCase() : 'other';
    g_foundCreatureFamiliesSet.add(familyType);
    g_foundCreatureBooksSet.add(data.contentSrc);

  }

  g_foundCreatureTraitsSet = Array.from(g_foundCreatureTraitsSet).sort(
    function(a, b) {
      return a > b ? 1 : -1;
    }
  );
  g_foundCreatureFamiliesSet = Array.from(g_foundCreatureFamiliesSet).sort(
    function(a, b) {
      return a > b ? 1 : -1;
    }
  );
  g_foundCreatureBooksSet = Array.from(g_foundCreatureBooksSet).sort(
    function(a, b) {
      return a > b ? 1 : -1;
    }
  );

  g_allConditions = allConditions.sort(
    function(a, b) {
      return a.name > b.name ? 1 : -1;
    }
  );
  g_allTags = allTags;
  g_featMap = objToMap(featsObject);
  g_itemMap = objToMap(itemsObject);
  g_spellMap = objToMap(spellsObject);
  g_skillMap = objToMap(skillObject);

  g_campaigns = campaigns;

  loadData();

  $(`#encounter-add-btn`).click(function () {
    if (allEncounters.length >= 25) { return; }
    addEncounter();
    displayEncounter(allEncounters.length - 1);
    reloadEncounters();
  });

  reloadEncounters();
  initEncounterView();

  stopSpinnerLoader();

});


let currentEncounterIndex = null;
let allEncounters = [];

function reloadEncounters() {

  $(`#encounter-tab-list`).html(``);
  for (let i = 0; i < allEncounters.length; i++) {
    let encounter = allEncounters[i];

    let btn_encounterView = `encounter-btn-view-${i}`;
    let btn_encounterDelete = `encounter-btn-delete-${i}`;

    $(`#encounter-tab-list`).append(`
      <div class="field has-addons pr-2">
          <p class="control">
              <button id="${btn_encounterView}" class="encounterViewBtn button is-small is-info is-outlined">
                  <span>${encounter.name}</span>
              </button>
          </p>
          <p class="control">
              <button id="${btn_encounterDelete}" class="button is-small is-info is-outlined">
                  <span class="icon is-small">
                      <i class="fas fa-trash"></i>
                  </span>
              </button>
          </p>
      </div>
    `);

    $(`#${btn_encounterView}`).click(function () {
      displayEncounter(i);
    });

    $(`#${btn_encounterDelete}`).click(function () {
      new ConfirmMessage('Delete “' + encounter.name + '”', '<p class="has-text-centered">Are you sure you want to delete this encounter?</p>', 'Delete', 'modal-delete-encounter', 'modal-delete-encounter-btn');
      $('#modal-delete-encounter-btn').click(function () {
        removeEncounter(i);
      });
    });

  }

  if (allEncounters.length == 0) {
    $(`#encounter-add-btn`).click();
  }
  if (allEncounters[currentEncounterIndex] == null) {
    currentEncounterIndex = 0;
  }

  displayEncounter(currentEncounterIndex);

}

function displayEncounter(encounterIndex) {
  currentEncounterIndex = encounterIndex;
  $(`#encounter-name-input`).val(allEncounters[currentEncounterIndex].name);
  $(`#encounter-party-size-input`).val(allEncounters[currentEncounterIndex].partySize);
  $(`#encounter-party-level-input`).val(allEncounters[currentEncounterIndex].partyLevel);

  if(allEncounters[currentEncounterIndex].campaignID == null){
    $('#encounter-set-campaign-btn').addClass('is-outlined');
    $('#encounter-set-campaign-title').text('Set Campaign');

    $(`#encounter-section-party-size`).show();
    $(`#encounter-section-party-level`).show();
  } else {
    $('#encounter-set-campaign-btn').removeClass('is-outlined');
    $('#encounter-set-campaign-title').text('View Campaign');

    $(`#encounter-section-party-size`).hide();
    $(`#encounter-section-party-level`).hide();
  }

  $(`.encounterViewBtn`).removeClass('is-hovered');
  $(`#encounter-btn-view-${currentEncounterIndex}`).addClass('is-hovered');

  reloadEncounterMembers();
  reloadBalanceResults();
}

function initEncounterView() {

  $(`#encounter-name-input`).on('keypress', function (e) {
    if (e.which == 13) {
      $(`#encounter-name-input`).blur();
    }
  });
  $(`#encounter-name-input`).change(function () {
    allEncounters[currentEncounterIndex].name = $(this).val().trim();
    reloadEncounters();
  });

  $(`#encounter-party-size-input`).on('keypress', function (e) {
    if (e.which == 13) {
      $(`#encounter-party-size-input`).blur();
    }
  });
  $(`#encounter-party-size-input`).change(function () {
    allEncounters[currentEncounterIndex].partySize = parseInt($(this).val());
    reloadBalanceResults();
  });

  $(`#encounter-party-level-input`).on('keypress', function (e) {
    if (e.which == 13) {
      $(`#encounter-party-level-input`).blur();
    }
  });
  $(`#encounter-party-level-input`).change(function () {
    allEncounters[currentEncounterIndex].partyLevel = parseInt($(this).val());
    reloadBalanceResults();
  });


  $(`#encounter-roll-initiative-btn`).click(function () {
    $('#quickviewLeftDefault').removeClass('is-active');
    $('#quickviewDefault').removeClass('is-active');

    openRollInitiativeModal();
  });
  $(`#encounter-add-creature-btn`).click(function () {
    $('#quickviewLeftDefault').removeClass('is-active');
    $('#quickviewDefault').removeClass('is-active');
    
    openCreatureSelectQuickview();
  });
  $(`#encounter-add-custom-btn`).click(function () {
    $('#quickviewLeftDefault').removeClass('is-active');
    $('#quickviewDefault').removeClass('is-active');

    openCustomCreatureQuickview();
  });

  if(g_campaigns.length === 0){
    $(`#encounter-set-campaign-btn`).prop('disabled', true);
  } else {
    $(`#encounter-set-campaign-btn`).click(function () {
      $('#quickviewLeftDefault').removeClass('is-active');
      $('#quickviewDefault').removeClass('is-active');
  
      let campaignID = allEncounters[currentEncounterIndex].campaignID;
      if(campaignID == null){
        openSelectCampaignModal();
      } else {
        openCampaignView(campaignID);
      }
    });
  }

}

function addEncounter() {
  allEncounters.push({
    name: `Encounter #${allEncounters.length + 1}`,
    partySize: 4,
    partyLevel: 1,
    members: [],
    campaignID: null,
  });
}

function removeEncounter(encounterIndex) {
  allEncounters.splice(encounterIndex, 1);
  reloadEncounters();
}

function addMember(encounter, creatureID, eliteWeak = null) {
  let creature = g_creaturesMap.get(creatureID);
  if (creature == null) { console.error(`Unknown creature ${creatureID}!`); return; }
  encounter.members.push({
    creatureID: creatureID,
    init: 0,
    name: `${eliteWeak == 'elite' || eliteWeak == 'weak' ? `${capitalizeWord(eliteWeak)} - ` : ``}${creature.name}`,
    level: getCreatureLevel(creature.level, eliteWeak),
    currentHP: getCreatureMaxHP(creature.level, creature.hpMax, eliteWeak),
    maxHP: getCreatureMaxHP(creature.level, creature.hpMax, eliteWeak),
    conditions: [],
    eliteWeak: eliteWeak,
    commentsOpen: false,
    comments: ``,
    isCustom: false,
    customData: null,
    isCharacter: false,
    characterData: null,
  });
}

function addCustomMember(encounter, name, level, maxHP) {
  encounter.members.push({
    creatureID: null,
    init: 0,
    name: name,
    level: level,
    currentHP: maxHP,
    maxHP: maxHP,
    conditions: [],
    eliteWeak: 'normal',
    commentsOpen: false,
    comments: ``,
    isCustom: true,
    customData: { name: name, level: level, hpMax: maxHP },
    isCharacter: false,
    characterData: null,
  });
}

function removeMember(encounter, member) {
  encounter.members = encounter.members.filter((mem) => {
    return mem != member;
  });
  reloadEncounterMembers();
  reloadBalanceResults();
}

function getOriginalCreature(member){
  if(member.isCharacter){
    return member.characterData;
  } else if(member.isCustom){
    return member.customData;
  } else {
    return g_creaturesMap.get(member.creatureID);
  }
}

function addCondition(member, conditionName, conditionValue = null) {

  if(member.isCharacter){
    processCharacter_addCondition(member.characterData, conditionName, conditionValue);
    return;
  }

  const condition = member.conditions.find(condition => {
    return condition.name.toLowerCase() == conditionName.toLowerCase();
  });
  if (condition == null) {
    if (conditionName.toLowerCase() == 'drained') {
      member.currentHP -= (member.level > 1 ? member.level : 1) * conditionValue;
      member.maxHP = getCreatureMaxHP(member.level, getOriginalCreature(member).hpMax, member.eliteWeak) - (member.level > 1 ? member.level : 1) * conditionValue;
    }
    if (conditionName.toLowerCase() == 'dying') {
      const woundedCondition = member.conditions.find(condition => {
        return condition.name.toLowerCase() == 'wounded';
      });
      if (woundedCondition != null) {
        conditionValue += woundedCondition.value;
      }
    }

    member.conditions.push({
      name: conditionName,
      value: conditionValue,
      parentSource: null,
    });
    reloadEncounterMembers();
  }
}

function removeCondition(member, conditionName) {

  if(member.isCharacter){
    processCharacter_removeCondition(member.characterData, conditionName);
    return;
  }

  const condition = member.conditions.find(condition => {
    return condition.name.toLowerCase() == conditionName.toLowerCase();
  });
  if (condition != null) {
    if (conditionName.toLowerCase() == 'drained') {
      member.maxHP = getCreatureMaxHP(member.level, getOriginalCreature(member).hpMax, member.eliteWeak);
    }
    if (conditionName.toLowerCase() == 'dying') {
      const woundedCondition = member.conditions.find(condition => {
        return condition.name.toLowerCase() == 'wounded';
      });
      if (woundedCondition != null) {
        woundedCondition.value++;
      } else {
        addCondition(member, 'Wounded', 1);
      }
    }

    // Filter out all conditions with same name
    member.conditions = member.conditions.filter((condition) => {
      return condition.name.toLowerCase() != conditionName.toLowerCase();
    });
    reloadEncounterMembers();
  }
}

function updateCondition(member, conditionName, newValue) {

  if(member.isCharacter){
    processCharacter_updateCondition(member.characterData, conditionName, newValue);
    return;
  }

  let condition = member.conditions.find(condition => {
    return condition.name.toLowerCase() == conditionName.toLowerCase();
  });
  if (condition != null) {
    if (conditionName.toLowerCase() == 'drained') {
      if (newValue > condition.value) {
        member.currentHP -= (member.level > 1 ? member.level : 1) * (newValue - condition.value);
      }
      member.maxHP = getCreatureMaxHP(member.level, getOriginalCreature(member).hpMax, member.eliteWeak) - (member.level > 1 ? member.level : 1) * newValue;
    }

    condition.value = newValue;
    reloadEncounterMembers();
  }
}


function reloadEncounterMembers() {
  $(`#encounter-members-view`).html(``);
  if (currentEncounterIndex == null) { return; }

  let encounter = allEncounters[currentEncounterIndex];

  encounter.members = encounter.members.sort(
    function (a, b) {
      if (b.init === a.init) {
        // Name is only important when init are the same
        return a.name > b.name ? 1 : -1;
      }
      return b.init - a.init;
    }
  );

  if (encounter.members.length == 0) {
    $(`#encounter-members-view`).html(`
      <p class="has-text-centered is-italic is-unselectable has-txt-noted">Empty encounter...</p>
    `);
    return;
  }

  for (let i = 0; i < encounter.members.length; i++) {

    let member = encounter.members[i];

    let input_memberInit = `member-input-init-${i}`;
    let input_memberName = `member-input-name-${i}`;
    let input_memberCurrentHP = `member-input-hp-${i}`;
    let input_memberComments = `member-input-comments-${i}`;

    let btn_memberAddCondition = `member-btn-condition-add-${i}`;
    let btn_memberView = `member-btn-view-${i}`;
    let btn_memberViewComments = `member-btn-comments-view-${i}`;
    let btn_memberDelete = `member-btn-delete-${i}`;

    let container_memberConditions = `member-container-conditions-${i}`;
    let container_memberComments = `member-container-comments-${i}`;

    let currentHP = (member.isCharacter) ? member.characterData.character.currentHealth : member.currentHP;
    let maxHP = (member.isCharacter) ? member.characterData.calculatedStat.maxHP : member.maxHP;

    $(`#encounter-members-view`).append(`
      <div class="columns is-marginless is-mobile">
        <div class="column is-1 text-center is-paddingless">
            <div style="padding-left: 0.15rem; padding-right: 0.15rem; padding-top: 0.2rem; padding-bottom: 0.2rem;">
                <input id="${input_memberInit}" class="input is-small text-center" type="number" min="0" max="100" autocomplete="off" value="${member.init}">
            </div>
        </div>
        <div class="column is-3 text-left is-paddingless">
            <div style="padding-left: 0.15rem; padding-right: 0.15rem; padding-top: 0.2rem; padding-bottom: 0.2rem;">
                <input id="${input_memberName}" class="input is-small" type="text" autocomplete="off" value="${member.name}">
            </div>
        </div>
        <div class="column is-1 is-paddingless">
            <div class="" style="padding-left: 0.15rem; padding-right: 0.15rem; padding-top: 0.35rem; padding-bottom: 0.35rem;">
                <button id="${btn_memberView}" class="button is-info is-very-small is-fullwidth">
                    <span class="">
                        View
                    </span>
                </button>
            </div>
        </div>
        <div class="column is-2 text-center is-paddingless">
            <div class="field has-addons has-addons-centered" style="padding-left: 0.15rem; padding-right: 0.15rem; padding-top: 0.2rem; padding-bottom: 0.2rem;">
                <p class="control"><input id="${input_memberCurrentHP}" class="input is-small text-center" type="text"
                        min="0" max="${maxHP}" autocomplete="off" value="${currentHP}"></p>
                <p class="control"><a class="button is-static is-small border-darker">/</a></p>
                <p class="control"><a class="button is-static is-extra is-small border-darker">${maxHP}</a>
                </p>
            </div>
        </div>
        <div class="column is-4 text-left is-paddingless">
            <div class="is-inline-flex" style="padding-left: 0.15rem; padding-right: 0.15rem; padding-top: 0.07rem; padding-bottom: 0.01rem;">
              <div>
                <span id="${btn_memberAddCondition}" class="icon is-small has-text-info cursor-clickable my-2 ml-3 mr-2">
                  <i class="fal fa-plus-circle"></i>
                </span>
              </div>
              <div id="${container_memberConditions}" class="is-flex" style="flex-wrap: wrap; padding-top: 0.3rem;">
              </div>
            </div>
        </div>
        <div class="column is-1 is-paddingless is-inline-flex">
            <span id="${btn_memberViewComments}" class="icon is-medium has-text-info mt-1 cursor-clickable">
              <i class="far fa-comment-alt-edit"></i>
            </span>
            <span id="${btn_memberDelete}" class="icon is-medium has-text-danger mt-1 ml-2 cursor-clickable">
                <i class="fas fa-minus-circle"></i>
            </span>
        </div>
      </div>
      <div id="${container_memberComments}" class="is-hidden" style="padding-left: 0.15rem; padding-right: 0.15rem; padding-top: 0.0rem; padding-bottom: 0.2rem;">
        <textarea id="${input_memberComments}" class="textarea is-small use-custom-scrollbar" placeholder="Any comments or notes..." rows="2" maxlength="4990">${member.comments}</textarea>
      </div>
      <hr class="my-0">
    `);

    // Init //
    $(`#${input_memberInit}`).on('keypress', function (e) {
      if (e.which == 13) {
        $(`#${input_memberInit}`).blur();
      }
    });
    $(`#${input_memberInit}`).blur(function () {
      member.init = parseInt($(this).val());
      reloadEncounterMembers();
    });

    // Name //
    if(member.isCharacter){
      $(`#${input_memberName}`).prop('readonly', true);
      $(`#${input_memberName}`).addClass('is-bold');
    } else {
      $(`#${input_memberName}`).on('keypress', function (e) {
        if (e.which == 13) {
          $(`#${input_memberName}`).blur();
        }
      });
      $(`#${input_memberName}`).blur(function () {
        member.name = $(this).val();
      });
    }

    // View //
    $(`#${btn_memberView}`).click(function () {
      let creatureData = getOriginalCreature(member);
      if(member.isCharacter){
        g_characterViewOpenedTab_rollHistory = false;
        g_characterViewOpenedTab_charInfo = false;
        openQuickView('characterView', creatureData);
      } else if(member.isCustom){
        openQuickView('creatureCustomView', member);
      } else {
        openQuickView('creatureView', {
          data: creatureData,
          conditions: member.conditions,
          eliteWeak: member.eliteWeak,
        });
      }
    });

    // HP //
    $(`#${input_memberCurrentHP}`).on('keypress', function (e) {
      if (e.which == 13) {
        $(`#${input_memberCurrentHP}`).blur();
      }
    });
    $(`#${input_memberCurrentHP}`).blur(function () {
      let newHP;
      try {
        newHP = parseInt(math.evaluate($(this).val()));
        if (newHP > 9999) { newHP = 9999; }
        if (newHP < 0) { newHP = 0; }
        if (isNaN(newHP)) { newHP = 0; }
      } catch (err) {
        newHP = 0;
      }

      //

      if(member.isCharacter){
        if (newHP > member.characterData.calculatedStat.maxHP) { newHP = member.characterData.calculatedStat.maxHP; }
        if(member.characterData.character.currentHealth !== newHP){
          socket.emit(`requestCharacterUpdate-Health`, member.characterData.charID, newHP);
          member.characterData.character.currentHealth = newHP;
          refreshQuickView();
        }
      }

      let currentIsZero = (member.currentHP == 0);

      member.currentHP = newHP;
      $(this).val(member.currentHP);

      if(!member.isCharacter){
        if(currentIsZero && newHP > 0){
          removeCondition(member, 'Dying');
        } else if(newHP == 0){
          addCondition(member, 'Dying', 1);
        }
      }

    });
    $(`#${input_memberCurrentHP}`).click(function (event) {
      event.stopImmediatePropagation();
    });

    // Comments //
    $(`#${btn_memberViewComments}`).click(function () {
      if ($(`#${container_memberComments}`).hasClass("is-hidden")) {
        $(`#${container_memberComments}`).removeClass('is-hidden');
        $(`#${btn_memberViewComments} :first-child`).attr('data-prefix', 'fas');
        $(`#${btn_memberViewComments} :first-child`).removeClass('far');
        $(`#${btn_memberViewComments} :first-child`).addClass('fas');
        member.commentsOpen = true;
      } else {
        $(`#${container_memberComments}`).addClass('is-hidden');
        $(`#${btn_memberViewComments} :first-child`).attr('data-prefix', 'far');
        $(`#${btn_memberViewComments} :first-child`).removeClass('fas');
        $(`#${btn_memberViewComments} :first-child`).addClass('far');
        member.commentsOpen = false;
      }
    });
    if(member.commentsOpen){
      $(`#${btn_memberViewComments}`).click();
    }

    $(`#${input_memberComments}`).change(function () {
      member.comments = $(this).val();
    });

    // Delete //
    $(`#${btn_memberDelete}`).click(function () {
      removeMember(encounter, member);
    });

    // Conditions //
    if(member.isCharacter){

      populateConditions(member.characterData, container_memberConditions, true);

    } else {

      for (let condition of getAppliedConditions(member.conditions)) {
        let conditionDisplayName = capitalizeWords(condition.name);
        if (condition.value != null) { conditionDisplayName += ` ${condition.value}`; }
  
        let btn_memberConditionView = `member-btn-condition-view-${i}-${condition.name.replace(/\W/g, '_')}`;
        let btn_memberConditionDelete = `member-btn-condition-delete-${i}-${condition.name.replace(/\W/g, '_')}`;
  
        if(condition.parentSource) {
          $(`#${container_memberConditions}`).append(`
            <div class="field has-addons is-marginless" style="padding-right: 0.25rem;">
              <p class="control">
                  <button id="${btn_memberConditionView}" class="button is-very-small is-danger is-outlined">
                      <span>${conditionDisplayName}</span>
                  </button>
              </p>
            </div>
          `);
        } else {
          $(`#${container_memberConditions}`).append(`
            <div class="field has-addons is-marginless" style="padding-right: 0.25rem;">
              <p class="control">
                  <button id="${btn_memberConditionView}" class="button is-very-small is-danger is-outlined">
                      <span>${conditionDisplayName}</span>
                  </button>
              </p>
              <p class="control">
                  <button id="${btn_memberConditionDelete}" class="button is-very-small is-danger is-outlined">
                      <span class="icon is-small">
                          <i class="fas fa-minus-circle"></i>
                      </span>
                  </button>
              </p>
            </div>
          `);
        }
  
        $(`#${btn_memberConditionView}`).click(function () {
          openConditionsModal(member, condition);
        });
  
        $(`#${btn_memberConditionDelete}`).click(function () {
          removeCondition(member, condition.name);
        });
  
      }

    }

    $(`#${btn_memberAddCondition}`).click(function () {
      openSelectConditionsModal(member);
    });

  }

}

function reloadBalanceResults() {

  $(`#encounter-balance-bar`).removeClass(`is-link`);
  $(`#encounter-balance-bar`).removeClass(`is-primary`);
  $(`#encounter-balance-bar`).removeClass(`is-success`);
  $(`#encounter-balance-bar`).removeClass(`is-orange`);
  $(`#encounter-balance-bar`).removeClass(`is-danger`);
  $(`#encounter-balance-display`).text(``);

  let encounter = allEncounters[currentEncounterIndex];

  if (encounter == null) { return; }

  if(showBalanceResults(encounter)){
    let results = getBalanceResults(encounter);

    $(`#encounter-balance-display`).text(`${results.difficulty} (${results.xp} xp)`);
  
    switch (results.difficulty) {
      case 'Trivial': $(`#encounter-balance-bar`).addClass(`is-link`); break;
      case 'Low': $(`#encounter-balance-bar`).addClass(`is-primary`); break;
      case 'Moderate': $(`#encounter-balance-bar`).addClass(`is-success`); break;
      case 'Severe': $(`#encounter-balance-bar`).addClass(`is-orange`); break;
      case 'Extreme': $(`#encounter-balance-bar`).addClass(`is-danger`); break;
      case 'IMPOSSIBLE': $(`#encounter-balance-bar`).addClass(`is-danger`); break;
      default: break;
    }
  }

}

function loadData() {
  let savedData = localStorage.getItem(`wg_encounters`);
  if (savedData != null) {
    try {
      savedData = JSON.parse(savedData);
      currentEncounterIndex = savedData.currentEncounterIndex;
      allEncounters = savedData.allEncounters;
    } catch (error) {
      console.warn(`Saved data is corrupted, deleting...`);
      localStorage.removeItem(`wg_encounters`);
    }
  }
}
function saveData() {
  localStorage.setItem(`wg_encounters`, JSON.stringify({
    allEncounters,
    currentEncounterIndex,
  }));
}