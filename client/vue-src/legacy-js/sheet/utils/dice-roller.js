/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

let g_rollHistory = [];

function initDiceRoller(){

  if(gOption_hasDiceRoller){
    // Stat Roller Btns //
    refreshStatRollButtons();

    // Dice Notation Btns //
    refreshDiceNotationButtons();
  }

}

function refreshStatRollButtons() {
  window.setTimeout(() => {
    $('.stat-roll-btn').removeClass('pr-1');
    $('.stat-roll-btn').addClass('button is-outlined is-info is-small');
    $('.stat-roll-btn').click(function() {
      let bonus = parseInt($(this).text());
      makeDiceRoll(1, 20, bonus, diceRoller_getQuickViewLabel());
    });

    $('.damage-roll-btn').addClass('button is-outlined is-info is-small mb-05');
    $('.damage-roll-btn').click(function() {
      let damageText = $(this).text();
      let match = damageText.match(/(^| )(\d+)+d(\d+)((\s*[+-]\s*\d+)*)/m);
      if(match != null){

        let diceNum = parseInt(match[2]);
        let dieSize = parseInt(match[3]);
        let bonus = parseInt(math.evaluate(match[4]));
        let endStr = damageText.replace(match[0], '').trim();
        let doubleResult = $(this).hasClass('damage-roll-double-result');
        makeDiceRoll(diceNum, dieSize, bonus, diceRoller_getQuickViewLabel(), endStr, doubleResult);

      }
    });
  }, 100);
}


function refreshDiceNotationButtons(){
  window.setTimeout(() => {
    $('.dice-roll-btn').off();
    $('.dice-roll-btn').click(function() {
      let diceNum = $(this).attr('data-dice-num');
      let diceType = $(this).attr('data-dice-type');
      let bonus = parseInt(math.evaluate($(this).attr('data-dice-bonus').replace(/[^(\d|\W)]/g,'')));
      let endStr  = $(this).attr('data-dice-dmg-type'); if(endStr == null){ endStr = ''; }

      makeDiceRoll(diceNum, diceType, bonus, diceRoller_getQuickViewLabel(), endStr);
      $(this).blur();
    });
  }, 100);
}

function processDiceNotation(text){

  text = processTextBakeSheetVariables(text);
  text = processTextRemoveTooltips(text, /((\d+)+d(\d+)|\+(\d+)|\+ (\d+))/g);

  let notationDmgTypeRegex = /(^| )(\d+)+d(\d+)((\s*[+-]\s*\d+)*)( ([^ \n]+) damage)/g;
  text = text.replace(notationDmgTypeRegex, function(match, startSpace, diceNum, diceType, bonus, endBonus, endStr, dmgType) {
    return `${startSpace}<button class="button dice-roll-btn is-paddingless px-2 is-marginless mt-1 is-very-small is-outlined is-info" data-dice-num="${diceNum}" data-dice-type="${diceType}" data-dice-bonus="${bonus}" data-dice-dmg-type="${dmgType}">${match.replace(endStr, '').trim()}</button>${endStr}`;
  });

  let notationRegex = /(^| )(\d+)+d(\d+)((\s*[+-]\s*\d+)*)/g;
  text = text.replace(notationRegex, function(match, startSpace, diceNum, diceType, bonus) {
    return `${startSpace}<button class="button dice-roll-btn is-paddingless px-2 is-marginless mt-1 is-very-small is-outlined is-info" data-dice-num="${diceNum}" data-dice-type="${diceType}" data-dice-bonus="${bonus}">${match.trim()}</button>`;
  });

  return text;

}


function makeDiceRoll(diceNum, dieType, bonus, label, resultSuffix='', doubleResult=false){
  let rollStruct = diceRoller_getDiceRoll(diceNum, dieType, bonus, label, resultSuffix, doubleResult);
  g_rollHistory.push(rollStruct);
  openLeftQuickView('Dice Roller');

  let rollHistoryJSON = JSON.stringify(g_rollHistory);

  socket.emit("requestRollHistorySave",
      getCharIDFromURL(),
      rollHistoryJSON);
  sendOutUpdateToGM('roll-history', rollHistoryJSON);
}

//// Math Rands ////
function diceRoller_getDiceRoll(diceNum, dieType, bonus, label, resultSuffix='', doubleResult=false){
  if(bonus == null || isNaN(bonus)) { bonus = 0; }
  let rollStruct = {Total: null, ResultData: null, RollData: {DiceNum: diceNum, DieType: dieType, Bonus: bonus} };
  let total = 0; let resultData = [];
  for (let i = 0; i < diceNum; i++) {
    let result = diceRoller_getRandomNumber(dieType);
    resultData.push(result);
    total += result;
  }
  total += bonus;
  rollStruct.Total = total;
  rollStruct.ResultData = resultData;
  rollStruct.Label = { Name: label };
  rollStruct.DoubleResult = doubleResult;
  rollStruct.ResultSuffix = resultSuffix;

  let currentDate = new Date();
  rollStruct.Timestamp = {
    Date: currentDate.toLocaleDateString(),
    Time: currentDate.toLocaleTimeString(),
    UTC_Time: currentDate.toUTCString(),
  };

  return rollStruct;
}

function diceRoller_getRandomNumber(max) {
  return Math.floor(Math.random()*Math.floor(max))+1;
}

function diceRoller_getQuickViewLabel(){
  let label = null;
  if($('#quickviewDefault').hasClass('is-active')){
    label = $('#quickViewTitle').html().split('<')[0];
  }
  return label;
}