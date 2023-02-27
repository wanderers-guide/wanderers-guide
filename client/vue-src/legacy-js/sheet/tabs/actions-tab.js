/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

function openActionsTab(data) {

    $('#tabContent').append('<div class="tabs is-centered is-marginless"><ul class="action-tabs"><li><a id="actionTabEncounter">Encounter</a></li><li><a id="actionTabExploration">Exploration</a></li><li><a id="actionTabDowntime">Downtime</a></li></ul></div>');

    let actionsCount = 3;
    if(hasCondition(26)) { // Hardcoded - Quickened condition ID
        actionsCount++;
    }
    let slowedCondition = getCondition(29); // Hardcoded - Slowed condition ID
    if(slowedCondition != null){
        actionsCount -= slowedCondition.Value;
    }
    actionsCount = (actionsCount < 0) ? 0 : actionsCount;

    let skillsOptionsHTML = `
      <option value="chooseDefault" class="is-bold-very">All Skills</option>
      <optgroup label="───────"></optgroup>
    `;
    let foundLore = false;
    for(const [skillName, skillData] of data.SkillMap.entries()){
      if(skillData.Skill.name == 'Lore'){
        if(foundLore) {
          continue;
        } else {
          foundLore = true;
        }
      }
      skillsOptionsHTML += `<option value="${skillData.Skill.id}">${skillData.Skill.name}</option>`;
    }

    $('#tabContent').append(`
      <p id="stateNumberOfActions" class="is-size-7 has-text-left is-italic is-hidden-mobile pos-absolute pos-t-10 pos-l-5">${actionsCount} Actions per Turn</p>
      <div class="columns is-mobile is-marginless">

        <div class="column is-1 is-narrow pb-1">
          <p class="is-size-6 has-txt-value-number is-bold">Filter</p>
        </div>

        <div class="column is-narrow pb-1">
          
          <div class="is-inline-flex">
            <div class="field is-unselectable">
              <input class="is-checkradio is-small has-background-color is-info" id="actionsTabCheckBox-Basic" type="checkbox" name="actionsTabCheckBox-Basic" checked="checked">
              <label for="actionsTabCheckBox-Basic" class="is-size-6 pt-0">Basic</label>
            </div>

            <div class="field is-unselectable">
              <input class="is-checkradio is-small has-background-color is-info" id="actionsTabCheckBox-Feats" type="checkbox" name="actionsTabCheckBox-Feats" checked="checked">
              <label for="actionsTabCheckBox-Feats" class="is-size-6 pt-0">Feats</label>
            </div>

            <div class="field is-unselectable">
              <input class="is-checkradio is-small has-background-color is-info" id="actionsTabCheckBox-Items" type="checkbox" name="actionsTabCheckBox-Items" checked="checked">
              <label for="actionsTabCheckBox-Items" class="is-size-6 pt-0">Items</label>
            </div>

            <div class="field is-unselectable">
              <input class="is-checkradio is-small has-background-color is-info" id="actionsTabCheckBox-Skills" type="checkbox" name="actionsTabCheckBox-Skills" checked="checked">
              <label for="actionsTabCheckBox-Skills" class="is-size-6 pt-0">Skills</label>
            </div>
          </div>

        </div>

        <div class="column is-narrow pb-1 is-hidden-mobile">

          <div class="select is-small is-info mr-4">
            <select id="actionFilterSelectBySkill">
              ${skillsOptionsHTML}
            </select>
          </div>

          <div class="select is-small is-info">
            <select id="actionFilterSelectByAction" class="pf-icon">
              <option value="chooseDefault" class="is-bold-very">All Actions</option>
              <optgroup label="───────"></optgroup>
              <option value="OneAction" class="pf-icon">[one-action]</option>
              <option value="TwoActions" class="pf-icon">[two-actions]</option>
              <option value="ThreeActions" class="pf-icon">[three-actions]</option>
              <option value="FreeAction" class="pf-icon">[free-action]</option>
              <option value="Reaction" class="pf-icon">[reaction]</option>
            </select>
          </div>

        </div>

      </div>
      <div class="">
        <p class="control has-icons-left">
          <input id="actionFilterSearch" class="input" type="text" autocomplete="off" placeholder="Search">
          <span class="icon is-left">
            <i class="fas fa-search" aria-hidden="true"></i>
          </span>
        </p>
      </div>
    `);

    $('#tabContent').append('<div id="actionTabContent" class="use-custom-scrollbar" style="height: 465px; max-height: 465px; overflow-y: auto;"></div>');


    $('#actionTabEncounter').click(function(){
        changeActionTab('actionTabEncounter', data);
    });

    $('#actionTabExploration').click(function(){
        changeActionTab('actionTabExploration', data);
    });

    $('#actionTabDowntime').click(function(){
        changeActionTab('actionTabDowntime', data);
    });


    $('#actionsTabCheckBox-Basic, #actionsTabCheckBox-Feats, #actionsTabCheckBox-Items, #actionsTabCheckBox-Skills').change(function(event, loadActionTab){
      if ($(this).is(':checked')) {
        $(this).removeClass('is-dark');
        $(this).addClass('is-info');
        $(this).blur();

        if($(this).prop('id') == 'actionsTabCheckBox-Skills'){
          g_selectedAction_SkillsEnabled = true;
          $('#actionFilterSelectBySkill').parent().removeClass('is-hidden');
        } else if($(this).prop('id') == 'actionsTabCheckBox-Basic'){
          g_selectedAction_BasicEnabled = true;
        } else if($(this).prop('id') == 'actionsTabCheckBox-Feats'){
          g_selectedAction_FeatsEnabled = true;
        } else if($(this).prop('id') == 'actionsTabCheckBox-Items'){
          g_selectedAction_ItemsEnabled = true;
        }

        if(loadActionTab == null || loadActionTab){
          changeActionTab(g_selectedActionSubTabID, data);
        }
      } else {
        $(this).removeClass('is-info');
        $(this).addClass('is-dark');
        $(this).blur();

        if($(this).prop('id') == 'actionsTabCheckBox-Skills'){
          g_selectedAction_SkillsEnabled = false;
          g_selectedAction_SkillOption = 'chooseDefault';
          $('#actionFilterSelectBySkill').parent().addClass('is-hidden');
        } else if($(this).prop('id') == 'actionsTabCheckBox-Basic'){
          g_selectedAction_BasicEnabled = false;
        } else if($(this).prop('id') == 'actionsTabCheckBox-Feats'){
          g_selectedAction_FeatsEnabled = false;
        } else if($(this).prop('id') == 'actionsTabCheckBox-Items'){
          g_selectedAction_ItemsEnabled = false;
        }

        if(loadActionTab == null || loadActionTab){
          changeActionTab(g_selectedActionSubTabID, data);
        }
      }
    });

    $('#'+g_selectedActionSubTabID).click();

}







// Action Tabs //
function changeActionTab(type, data){
    if(!g_selectedSubTabLock) {g_selectedSubTabID = type;}
    g_selectedActionSubTabID = type;

    $('#actionFilterSelectByAction').off('change');
    $('#actionFilterSelectBySkill').off('change');
    $('#actionFilterSearch').off('change');

    $('#actionFilterSelectBySkill').val(g_selectedAction_SkillOption);
    $('#actionFilterSelectByAction').val(g_selectedAction_ActionOption);
    $('#actionFilterSearch').val(g_selectedAction_SearchText);

    $('#actionsTabCheckBox-Basic').prop('checked', g_selectedAction_BasicEnabled)
        .trigger("change", [false]);
    $('#actionsTabCheckBox-Feats').prop('checked', g_selectedAction_FeatsEnabled)
        .trigger("change", [false]);
    $('#actionsTabCheckBox-Items').prop('checked', g_selectedAction_ItemsEnabled)
        .trigger("change", [false]);
    $('#actionsTabCheckBox-Skills').prop('checked', g_selectedAction_SkillsEnabled)
        .trigger("change", [false]);

    $('#actionTabContent').html('');

    $('#actionTabEncounter').parent().removeClass("is-active");
    $('#actionTabExploration').parent().removeClass("is-active");
    $('#actionTabDowntime').parent().removeClass("is-active");

    $('#'+type).parent().addClass("is-active");


    let actionFilterSelectByAction = $('#actionFilterSelectByAction');
    actionFilterSelectByAction.blur();

    let actionFilterSelectBySkill = $('#actionFilterSelectBySkill');
    actionFilterSelectBySkill.blur();

    let actionFilterSearch = $('#actionFilterSearch');
    if(actionFilterSearch.val() == ""){
        actionFilterSearch.removeClass('is-info');
    } else {
        actionFilterSearch.addClass('is-info');
    }

    $('#actionFilterSelectByAction').change(function(){
        actionFilterSearch.val('');
        g_selectedAction_ActionOption = $(this).val();
        changeActionTab(type, data);
    });

    $('#actionFilterSelectBySkill').change(function(){
        actionFilterSearch.val('');
        g_selectedAction_SkillOption = $(this).val();
        changeActionTab(type, data);
    });

    $('#actionFilterSearch').change(function(){
        g_selectedAction_SearchText = $(this).val();
        changeActionTab(type, data);
    });


    if(type != 'actionTabEncounter') {
        $('#stateNumberOfActions').addClass('is-hidden');
        actionFilterSelectByAction.parent().addClass('is-hidden');
    } else {
        $('#stateNumberOfActions').removeClass('is-hidden');
        actionFilterSelectByAction.parent().removeClass('is-hidden');
    }

    let featStructArray = null;
    switch(type) {
      case 'actionTabEncounter': featStructArray = cloneObj(data.EncounterFeatStructArray); break;
      case 'actionTabExploration': featStructArray = cloneObj(data.ExplorationFeatStructArray); break;
      case 'actionTabDowntime': featStructArray = cloneObj(data.DowntimeFeatStructArray); break;
      default: break;
    }

    filterActionArray(data, featStructArray, type);

}

function filterActionArray(data, featStructArray, tabType){

    // Add class, acnestry, etc feats to featStructArray, if enabled
    if(g_selectedAction_FeatsEnabled){
      for(const feat of g_featChoiceArray){
        if(feat.value == null) { continue; }
        let featStruct = g_featMap.get(feat.value.id+"");
        if(featStruct == null) { continue; }
  
        // Hardcoded Exploration and Downtime Tag IDs
        let explorationTag = featStruct.Tags.find(tag => {return tag.id === 15;});
        let downtimeTag = featStruct.Tags.find(tag => {return tag.id === 218;});
        
        if(tabType == 'actionTabExploration' && explorationTag != null){
          featStructArray.push(featStruct);
        } else if(tabType == 'actionTabDowntime' && downtimeTag != null){
          featStructArray.push(featStruct);
        } else if(tabType == 'actionTabEncounter' && feat.value.actions != 'NONE'){
          featStructArray.push(featStruct);
        }
      }
    }
    
    // Convert featStructArray to actionStructArray
    let actionStructArray = [];
    for(const featStruct of featStructArray){
      if(featStruct.Feat.isArchived === 1){continue;}

      actionStructArray.push({
        name: featStruct.Feat.name,
        actions: featStruct.Feat.actions,
        Tags: featStruct.Tags,
        
        skillID: featStruct.Feat.skillID,
        genericType: featStruct.Feat.genericType,
        rarity: featStruct.Feat.rarity,
        level: featStruct.Feat.level,
        isCore: featStruct.Feat.isCore,
        Feat: featStruct.Feat,
        InvItem: null,
        Item: null,
      });

    }

    // Add itemActionStructArray to actionStructArray
    if(g_selectedAction_ItemsEnabled && tabType == 'actionTabEncounter'){
      let itemActionStructArray = findItemActionsFromInvItems();

      for(let itemActionStruct of itemActionStructArray){

        let free_action = itemActionStruct.Actions.free_action;
        if(free_action != null){
          actionStructArray.push({
            name: itemActionStruct.Name,
            actions: free_action.actions,
            Tags: free_action.traits,
            
            skillID: null,
            genericType: null,
            rarity: null,
            Feat: null,
            InvItem: itemActionStruct.InvItem,
            Item: itemActionStruct.Item,
          });
        }

        let reaction = itemActionStruct.Actions.reaction;
        if(reaction != null){
          actionStructArray.push({
            name: itemActionStruct.Name,
            actions: reaction.actions,
            Tags: reaction.traits,
            
            skillID: null,
            genericType: null,
            rarity: null,
            Feat: null,
            InvItem: itemActionStruct.InvItem,
            Item: itemActionStruct.Item,
          });
        }

        let one_action = itemActionStruct.Actions.one_action;
        if(one_action != null){
          actionStructArray.push({
            name: itemActionStruct.Name,
            actions: one_action.actions,
            Tags: one_action.traits,
            
            skillID: null,
            genericType: null,
            rarity: null,
            Feat: null,
            InvItem: itemActionStruct.InvItem,
            Item: itemActionStruct.Item,
          });
        }

        let two_actions = itemActionStruct.Actions.two_actions;
        if(two_actions != null){
          actionStructArray.push({
            name: itemActionStruct.Name,
            actions: two_actions.actions,
            Tags: two_actions.traits,
            
            skillID: null,
            genericType: null,
            rarity: null,
            Feat: null,
            InvItem: itemActionStruct.InvItem,
            Item: itemActionStruct.Item,
          });
        }

        let three_actions = itemActionStruct.Actions.three_actions;
        if(three_actions != null){
          actionStructArray.push({
            name: itemActionStruct.Name,
            actions: three_actions.actions,
            Tags: three_actions.traits,
            
            skillID: null,
            genericType: null,
            rarity: null,
            Feat: null,
            InvItem: itemActionStruct.InvItem,
            Item: itemActionStruct.Item,
          });
        }

      }

    }

    // Sort actions by name
    actionStructArray = actionStructArray.sort(
      function(a, b) {
          return a.name > b.name ? 1 : -1;
      }
    );

    let actionCount = 0;
    for(const actionStruct of actionStructArray){

        let willDisplay = true;

        // Filter by Action
        let actionFilterSelectByAction = $('#actionFilterSelectByAction');
        if(actionFilterSelectByAction.val() != "chooseDefault" && actionFilterSelectByAction.is(":visible")){
            if(actionFilterSelectByAction.val() == "OneAction"){
                if(actionStruct.actions != 'ACTION'){
                    willDisplay = false;
                }
            } else if(actionFilterSelectByAction.val() == "OneAction"){
                if(actionStruct.actions != 'ACTION'){
                    willDisplay = false;
                }
            } else if(actionFilterSelectByAction.val() == "TwoActions"){
                if(actionStruct.actions != 'TWO_ACTIONS'){
                    willDisplay = false;
                }
            } else if(actionFilterSelectByAction.val() == "ThreeActions"){
                if(actionStruct.actions != 'THREE_ACTIONS'){
                    willDisplay = false;
                }
            } else if(actionFilterSelectByAction.val() == "FreeAction"){
                if(actionStruct.actions != 'FREE_ACTION'){
                    willDisplay = false;
                }
            } else if(actionFilterSelectByAction.val() == "Reaction"){
                if(actionStruct.actions != 'REACTION'){
                    willDisplay = false;
                }
            }
        }

        // Filter by Skill
        let actionFilterSelectBySkill = $('#actionFilterSelectBySkill');
        if(actionFilterSelectBySkill.is(":visible")) {
          let filterVal = actionFilterSelectBySkill.val();
          if(filterVal != "chooseDefault"){
            if(actionStruct.skillID != filterVal){
              willDisplay = false;
            }
          } else {
            // Hide none-Core Exploration and Downtime activities unless a skill is picked
            if(tabType == 'actionTabExploration' || tabType == 'actionTabDowntime'){
              if(actionStruct.isCore != null && !actionStruct.isCore){
                willDisplay = false;
              }
            }
          }
        } else {
          // If skill selection is hidden, hide all skill actions
          /*
          if(actionStruct.skillID != null){
            willDisplay = false;
          }
          */
         if(!g_selectedAction_SkillsEnabled){
           // If it's skill related and isn't a skill feat
          if(actionStruct.skillID != null && actionStruct.genericType != 'SKILL-FEAT'){
            willDisplay = false;
          }
         }
        }

        // Filter by is Basic
        if(actionStruct.genericType == 'BASIC-ACTION' && !g_selectedAction_BasicEnabled) {
          willDisplay = false;
        }

        let actionFilterSearch = $('#actionFilterSearch');
        if(actionFilterSearch.val() != ''){
            let actionSearchInput = actionFilterSearch.val().toLowerCase();
            let actionName = actionStruct.name.toLowerCase();
            if(!actionName.includes(actionSearchInput)){
                let nameOfTag = actionStruct.Tags.find(tag => {
                    return tag.name.toLowerCase().includes(actionSearchInput);
                });
                if(nameOfTag == null){
                    willDisplay = false;
                }
            }
        }

        if(willDisplay){
            displayAction(actionStruct, actionCount, data.SkillMap);
        }

        actionCount++;
    }

}

function displayAction(actionStruct, actionCount, skillMap) {

    let actionID = 'actionLink-C'+actionCount;
                
    let actionNameInnerHTML = '<span class="is-size-5">'+actionStruct.name+'</span>';

    let actionActionInnerHTML = '';
    switch(actionStruct.actions) {
        case 'FREE_ACTION': actionActionInnerHTML += '<div class="column is-paddingless is-1 p-1 pt-2"><span class="pf-icon is-size-5">[free-action]</span></div>'; break;
        case 'REACTION': actionActionInnerHTML += '<div class="column is-paddingless is-1 p-1 pt-2"><span class="pf-icon is-size-5">[reaction]</span></div>'; break;
        case 'ACTION': actionActionInnerHTML += '<div class="column is-paddingless is-1 p-1 pt-2"><span class="pf-icon is-size-5">[one-action]</span></div>'; break;
        case 'TWO_ACTIONS': actionActionInnerHTML += '<div class="column is-paddingless is-1 p-1 pt-2"><span class="pf-icon is-size-5">[two-actions]</span></div>'; break;
        case 'THREE_ACTIONS': actionActionInnerHTML += '<div class="column is-paddingless is-1 p-1 pt-2"><span class="pf-icon is-size-5">[three-actions]</span></div>'; break;
        default: break;
    }

    let actionTagsInnerHTML = '<div class="buttons is-marginless is-right">';
    switch(actionStruct.rarity) {
        case 'UNCOMMON': actionTagsInnerHTML += '<button class="button is-marginless mr-2 my-1 is-very-small is-uncommon">Uncommon</button>';
            break;
        case 'RARE': actionTagsInnerHTML += '<button class="button is-marginless mr-2 my-1 is-very-small is-rare">Rare</button>';
            break;
        case 'UNIQUE': actionTagsInnerHTML += '<button class="button is-marginless mr-2 my-1 is-very-small is-unique">Unique</button>';
            break;
        default: break;
    }
    if(actionStruct.skillID != null){
        let skill = null;
        for(const [skillName, skillData] of skillMap.entries()){
            if(skillData.Skill.id == actionStruct.skillID) {
                skill = skillData.Skill;
                break;
            }
        }
        if(skill){
          actionTagsInnerHTML += '<button class="button is-marginless mr-2 my-1 is-very-small is-info">'+skill.name+'</button>';
        }
    }

    actionStruct.Tags = actionStruct.Tags.sort(
        function(a, b) {
            return a.name > b.name ? 1 : -1;
        }
    );
    for(const tag of actionStruct.Tags){
        if(actionStruct.level == -1 && tag.name == 'General'){ continue; }
        actionTagsInnerHTML += '<button class="button is-marginless mr-2 my-1 is-very-small is-info">'+tag.name+getImportantTraitIcon(tag)+'</button>';
    }
    actionTagsInnerHTML += '</div>';

    
    $('#actionTabContent').append('<div id="'+actionID+'" class="columns is-mobile border-bottom border-dark-lighter cursor-clickable is-marginless mx-2">'+actionActionInnerHTML+'<div class="column is-paddingless"><p class="text-left pl-2 pt-1">'+actionNameInnerHTML+'</p></div><div class="column is-paddingless"><p class="pt-1">'+actionTagsInnerHTML+'</p></div></div>');
    
    if(actionStruct.Feat != null){
      $('#'+actionID).click(function(){
        openQuickView('featView', {
            Feat : actionStruct.Feat,
            Tags : actionStruct.Tags
        });
      });
    } else if(actionStruct.Item != null){
      $('#'+actionID).click(function(){
        openQuickView('invItemView', {
            InvItem : actionStruct.InvItem,
            Item : actionStruct.Item,
            InvData : null,
            ExtraData : {}
        });
      });
    }

    $('#'+actionID).mouseenter(function(){
        $(this).addClass('has-bg-selectable-hover');
    });
    $('#'+actionID).mouseleave(function(){
        $(this).removeClass('has-bg-selectable-hover');
    });

}