/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

/*
  data
    classHitPoints
*/

let hitPointsFlatBonusText = "This is a collection of any additional Hit Points you might be given. This primarily includes additional Hit Points given from feats.";

let hitPointsPerLevelBonusText = "This is a collection of any additional Hit Points you gain at each level that you might be given. This primarily includes additional Hit Points given from feats.";

function openHitPointsBreakdownQuickview(data) {

  $('#quickViewTitle').html('Hit Points');

  let qContent = $('#quickViewContent');

  qContent.append(`<p class="has-text-centered"><strong>Value Breakdown</strong></p>`);

  const flatHitPoints = variables_getTotal(VARIABLE.MAX_HEALTH);
  const conMod = getMod(variables_getTotal(VARIABLE.SCORE_CON));
  const hitPointsPerLevel = variables_getTotal(VARIABLE.MAX_HEALTH_BONUS_PER_LEVEL);

  const totalHitPoints = flatHitPoints + (data.classHitPoints+conMod+hitPointsPerLevel)*g_character.level;

  let breakDownInnerHTML = `
    <p class="has-text-centered"><span>${totalHitPoints}</span> = 
  `;

  breakDownInnerHTML += `
    <a class="has-text-info has-tooltip-bottom has-tooltip-multiline" data-tooltip="These are the Hit Points your ancestry gives you. You add these Hit Points once at 1st level.">
      ${variables_getValue(VARIABLE.MAX_HEALTH)}
    </a>
  `;

  breakDownInnerHTML += ' + ';

  breakDownInnerHTML += '<a id="hitPointsFlatBonus" class="has-text-info has-tooltip-bottom">'+variables_getBonusTotal(VARIABLE.MAX_HEALTH)+'</a>';

  breakDownInnerHTML += ' + ';

  breakDownInnerHTML += `
    <a class="has-text-info has-tooltip-bottom has-tooltip-multiline" data-tooltip="This is your level. Your Hit Points increase by everything within the following parenthese each time you level up.">
      ${g_character.level}</a>`;

  breakDownInnerHTML += '×(';

  breakDownInnerHTML += `
    <a class="has-text-info has-tooltip-bottom has-tooltip-multiline" data-tooltip="These are the Hit Points your class gives you at each level.">
      ${data.classHitPoints}
    </a>
  `;

  breakDownInnerHTML += ' + ';

  breakDownInnerHTML += `
    <a class="has-text-info has-tooltip-bottom has-tooltip-multiline" data-tooltip="This is your Constitution modifier. You add Hit Points equal to your Constitution modifier for each level.">
      ${conMod}
    </a>
  `;

  breakDownInnerHTML += ' + ';

  breakDownInnerHTML += '<a id="hitPointsPerLevelBonus" class="has-text-info has-tooltip-bottom">'+hitPointsPerLevel+'</a>';

  breakDownInnerHTML += ')';

  qContent.append(breakDownInnerHTML);


  let hitPointsFlatBonuses = getStatExtraBonuses(VARIABLE.MAX_HEALTH);
  if(hitPointsFlatBonuses != null && hitPointsFlatBonuses.length > 0){
      $('#hitPointsFlatBonus').removeClass('has-tooltip-multiline');
      let tooltipText = 'Additional adjustments:';
      for(let hitPointsExtra of hitPointsFlatBonuses){
        tooltipText += '\n'+hitPointsExtra;
      }
      $('#hitPointsFlatBonus').attr('data-tooltip', tooltipText);
  } else {
    $('#hitPointsFlatBonus').addClass('has-tooltip-multiline');
    $('#hitPointsFlatBonus').attr('data-tooltip', hitPointsFlatBonusText);
  }

  let hitPointsPerLevelBonuses = getStatExtraBonuses(VARIABLE.MAX_HEALTH_BONUS_PER_LEVEL);
  if(hitPointsPerLevelBonuses != null && hitPointsPerLevelBonuses.length > 0){
      $('#hitPointsPerLevelBonus').removeClass('has-tooltip-multiline');
      let tooltipText = 'Additional adjustments:';
      for(let hitPointsExtra of hitPointsPerLevelBonuses){
        tooltipText += '\n'+hitPointsExtra;
      }
      $('#hitPointsPerLevelBonus').attr('data-tooltip', tooltipText);
  } else {
    $('#hitPointsPerLevelBonus').addClass('has-tooltip-multiline');
    $('#hitPointsPerLevelBonus').attr('data-tooltip', hitPointsPerLevelBonusText);
  }


}