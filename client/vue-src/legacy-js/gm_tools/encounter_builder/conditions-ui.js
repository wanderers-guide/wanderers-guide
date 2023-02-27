/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

let conditionsModal_currentMember = null;
let conditionsModal_currentConditionName = null;

$(function () {

    $('#conditionsModalBackground').click(function(){
        closeConditionsModal();
    });
    $('#conditionsModalCloseButton').click(function(){
        closeConditionsModal();
    });

    $('#conditionsModalSubtractButton').click(function(){
        let value = parseInt($('#conditionsModalValue').text());
        if(!isNaN(value)){
            value--;
            value = (value > 9) ? 9 : value;
            value = (value < 1) ? 1 : value;
            $('#conditionsModalValue').text(value);
        }
    });

    $('#conditionsModalAddButton').click(function(){
        let value = parseInt($('#conditionsModalValue').text());
        if(!isNaN(value)){
            value++;
            value = (value > 9) ? 9 : value;
            value = (value < 1) ? 1 : value;
            $('#conditionsModalValue').text(value);
        }
    });

    $('#conditionsSelectModalBackground').click(function(){
        closeSelectConditionsModal();
    });
    $('#conditionsSelectModalCloseButton').click(function(){
        closeSelectConditionsModal();
    });

});




function openConditionsModal(member, conditionData){

    let condition = g_allConditions.find(condition => {
        return condition.name.toLowerCase() == conditionData.name.toLowerCase();
    });

    if(conditionData.value != null){
        $('#conditionsModalFooter').addClass('buttons'); 
        $('#conditionsModalSubtractButton').removeClass('is-hidden');
        $('#conditionsModalValueButton').removeClass('is-hidden');
        $('#conditionsModalAddButton').removeClass('is-hidden');
        $('#conditionsModalValue').text(conditionData.value);
    } else {
        $('#conditionsModalFooter').removeClass('buttons');
        $('#conditionsModalSubtractButton').addClass('is-hidden');
        $('#conditionsModalValueButton').addClass('is-hidden');
        $('#conditionsModalAddButton').addClass('is-hidden');
        $('#conditionsModalValue').text('');
    }


    if (conditionData.parentSource != null) {
      $('#conditionsModalRemoveButton').addClass('is-hidden');
      $('#conditionsModalTitle').removeClass('pl-5');
      $('#conditionsModalSourceContent').html(conditionData.parentSource);
      $('#conditionsModalSourceSection').removeClass('is-hidden');
    } else {
      $('#conditionsModalRemoveButton').removeClass('is-hidden');
      $('#conditionsModalSourceSection').addClass('is-hidden');
      $('#conditionsModalTitle').addClass('pl-5');
  
      $('#conditionsModalRemoveButton').off('click');
      $('#conditionsModalRemoveButton').click(function(){
        removeCondition(member, conditionData.name);
        closeConditionsModal();
      });
    }


    $('#conditionsModalTitle').html(condition.name);
    $('#conditionsModalContent').html(processText(condition.description, true, true, 'MEDIUM', false));


    $('#conditionsModalDefault').addClass('is-active');
    $('html').addClass('is-clipped');

    conditionsModal_currentMember = member;
    conditionsModal_currentConditionName = conditionData.name;

}

function closeConditionsModal(){

    $('#conditionsModalDefault').removeClass('is-active');
    $('html').removeClass('is-clipped');

    if(conditionsModal_currentMember != null){
        let value = parseInt($('#conditionsModalValue').text());
        if(!isNaN(value)){
            updateCondition(conditionsModal_currentMember, conditionsModal_currentConditionName, value);
        }
    }

    conditionsModal_currentMember = null;
    conditionsModal_currentConditionName = null;

}


function openSelectConditionsModal(member) {

    $('#conditionsSelectModalContent').html('');

    for (const condition of g_allConditions) {

        let conditionSectionID = 'conditionSection' + condition.id;

        $('#conditionsSelectModalContent').append('<div id="' + conditionSectionID + '" class="tile is-parent is-paddingless cursor-clickable"><div class="tile is-child"><p class="has-text-centered is-size-5 border-bottom border-dark">' + condition.name + '</p></div></div>');

        $('#' + conditionSectionID).mouseenter(function () {
            $(this).addClass('has-bg-selectable');
        });
        $('#' + conditionSectionID).mouseleave(function () {
            $(this).removeClass('has-bg-selectable');
        });

        $('#' + conditionSectionID).click(function () {
            let value = (condition.hasValue == 1) ? 1 : null;
            addCondition(member, condition.name, value);
            closeSelectConditionsModal();
        });



    }

    $('#conditionsSelectModalDefault').addClass('is-active');
    $('html').addClass('is-clipped');

}

function closeSelectConditionsModal() {

    $('#conditionsSelectModalDefault').removeClass('is-active');
    $('html').removeClass('is-clipped');

}


function getAppliedConditions(conditions){

  let conditionsMap = new Map();
  let addToMap = function(conditionName, condition){
    conditionName = conditionName.toLowerCase();
    let existingCondition = conditionsMap.get(conditionName);
    if(existingCondition){

      if(existingCondition.parentSource){
        conditionsMap.set(conditionName, condition);
      } else {
        if(condition.value && existingCondition.value){
          if(condition.value > existingCondition.value){
            conditionsMap.set(conditionName, condition);
          }
        }
      }
      
    } else {
      conditionsMap.set(conditionName, condition);
    }
  };

  // Apply Indirect Conditions
  for(let condition of conditions){
      addToMap(condition.name, condition);

      if(condition.name.toLowerCase() == 'encumbered'){
          addToMap('clumsy', { name: 'clumsy', value: 1, parentSource: 'Encumbered' });

      } else if(condition.name.toLowerCase() == 'confused'){
          addToMap('flat-footed', { name: 'flat-footed', value: null, parentSource: 'Confused' });

      } else if(condition.name.toLowerCase() == 'dying'){
          addToMap('unconscious', { name: 'unconscious', value: null, parentSource: 'Dying' });
          // + conditions from unconscious
          addToMap('blinded', { name: 'blinded', value: null, parentSource: 'Unconscious' });
          addToMap('flat-footed', { name: 'flat-footed', value: null, parentSource: 'Unconscious' });

      } else if(condition.name.toLowerCase() == 'grabbed'){
          addToMap('flat-footed', { name: 'flat-footed', value: null, parentSource: 'Grabbed' });
          addToMap('immobilized', { name: 'immobilized', value: null, parentSource: 'Grabbed' });

      } else if(condition.name.toLowerCase() == 'paralyzed'){
          addToMap('flat-footed', { name: 'flat-footed', value: null, parentSource: 'Paralyzed' });

      } else if(condition.name.toLowerCase() == 'prone'){
          addToMap('flat-footed', { name: 'flat-footed', value: null, parentSource: 'Prone' });

      } else if(condition.name.toLowerCase() == 'restrained'){
          addToMap('flat-footed', { name: 'flat-footed', value: null, parentSource: 'Restrained' });
          addToMap('immobilized', { name: 'immobilized', value: null, parentSource: 'Restrained' });

      } else if(condition.name.toLowerCase() == 'unconscious'){
          addToMap('blinded', { name: 'blinded', value: null, parentSource: 'Unconscious' });
          addToMap('flat-footed', { name: 'flat-footed', value: null, parentSource: 'Unconscious' });

      } else if(condition.name.toLowerCase() == 'unnoticed'){
          addToMap('undetected', { name: 'undetected', value: null, parentSource: 'Unnoticed' });

      }
  }

  let appliedConditions = [];
  for(const [conditionName, condition] of conditionsMap.entries()){
    appliedConditions.push(condition);
  }

  return appliedConditions.sort(
    function(a, b) {
      return a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1;
    }
  );

}