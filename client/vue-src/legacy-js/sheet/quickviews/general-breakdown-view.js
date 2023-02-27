/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

/*
  data
    title
    name
    varName
    isProfDC, optional
*/

let amalgamationBonusText = "This is a collection of any additional bonuses or penalties you might have. This includes adjustments from feats, items, conditions, or those you may have added manually.";

function openGeneralBreakdownQuickview(data) {

  $('#quickViewTitle').html(data.title);

  let qContent = $('#quickViewContent');

  const variable = g_variableMap.get(data.varName);
  if(variable == null) {
    qContent.append(`
      <p class="pl-2 pr-1 negative-indent has-text-left has-text-danger">
        <em>Unknown variable: ${data.varName}!</em>
      </p>
    `);
    return;
  }

  //////// Prof ////////
  if(variable.Type == VAR_TYPE.PROFICIENCY){

    const rankName = profToWord(variables_getFinalRank(data.varName));
    const profNameHTML = getProfHistoryHTML(data.varName);
    qContent.append('<p><strong>Proficiency:</strong> '+profNameHTML+'</p>');

    if(variable.Value.AbilityScore != VARIABLE.SCORE_NONE){

      const abilityScoreName = lengthenAbilityType(variable.Value.AbilityScore.replace('SCORE_', ''));
      const profBonus = getProfNumber(profToNumUp(variables_getFinalRank(data.varName)), g_character.level);
      const isDC = (data.isProfDC != null && data.isProfDC);

      let totalValue = variables_getTotal(data.varName);
      if(isDC){
        totalValue += 10;
      } else {
        totalValue = signNumber(totalValue);
      }

      qContent.append(`
        <p>
          <strong>Ability Score:</strong> ${abilityScoreName}
        </p>`
      );

      qContent.append('<hr class="m-2">');

      qContent.append(`<p class="has-text-centered"><strong>${(isDC)?'DC':'Bonus'} Breakdown</strong></p>`);

      let breakDownInnerHTML = `
        <p class="has-text-centered"><span class="stat-roll-btn">${totalValue}</span> = 
      `;

      if(isDC){
        breakDownInnerHTML += ' 10 + ';
      }

      breakDownInnerHTML += `
        <a class="has-text-info has-tooltip-bottom has-tooltip-multiline" data-tooltip="This is your ${abilityScoreName} modifier. Because ${data.name} is ${abilityScoreName}-based, you add your ${abilityScoreName} modifier to determine your bonus.">
          ${getMod(variables_getTotal(variable.Value.AbilityScore))}
        </a>
      `;

      breakDownInnerHTML += ' + ';

      if(rankName == "Untrained") {
          let untrainedProfBonus = 0;
          if(gOption_hasProfWithoutLevel){
              untrainedProfBonus = -2;
          }
          breakDownInnerHTML += `
            <a class="has-text-info has-tooltip-bottom has-tooltip-multiline" data-tooltip="This is your proficiency bonus. Because you are ${rankName.toLowerCase()} in ${data.name}, your proficiency bonus is ${signNumber(untrainedProfBonus)}.">
              ${profBonus}
            </a>
          `;
      } else {
          if(gOption_hasProfWithoutLevel){
              breakDownInnerHTML += `
                <a class="has-text-info has-tooltip-bottom has-tooltip-multiline" data-tooltip="This is your proficiency bonus. Because you are ${rankName.toLowerCase()} in ${data.name}, your proficiency bonus is ${signNumber(getBonusFromProfName(rankName))}.">
                  ${profBonus}
                </a>
              `;
          } else {
              breakDownInnerHTML += `
                <a class="has-text-info has-tooltip-bottom has-tooltip-multiline" data-tooltip="This is your proficiency bonus. Because you are ${rankName.toLowerCase()} in ${data.name}, your proficiency bonus is equal to your level (${g_character.level}) plus ${getBonusFromProfName(rankName)}.">
                  ${profBonus}
                </a>
              `;
          }
      }

      breakDownInnerHTML += ' + ';

      // Bonuses
      let amalgBonus = variables_getBonusTotal(data.varName);
      breakDownInnerHTML += '<a id="amalgBonusNum" class="has-text-info has-tooltip-bottom">'+amalgBonus+'</a>';

      breakDownInnerHTML += '</p>';

      qContent.append(breakDownInnerHTML);

      let amalgBonuses = getStatExtraBonuses(data.varName);
      if(amalgBonuses != null && amalgBonuses.length > 0){
          $('#amalgBonusNum').removeClass('has-tooltip-multiline');
          let amalgTooltipText = 'Additional adjustments:';
          for(let amalgExtra of amalgBonuses){
              amalgTooltipText += '\n'+amalgExtra;
          }
          $('#amalgBonusNum').attr('data-tooltip', amalgTooltipText);
      } else {
          $('#amalgBonusNum').addClass('has-tooltip-multiline');
          $('#amalgBonusNum').attr('data-tooltip', amalgamationBonusText);
      }

      // Conditionals
      let conditionalStatMap = getConditionalStatMap(data.varName);
      if(conditionalStatMap != null && conditionalStatMap.size != 0){

          qContent.append('<hr class="m-2">');

          qContent.append('<p class="has-text-centered"><strong>Conditionals</strong></p>');
          
          for(const [condition, valueData] of conditionalStatMap.entries()){
            qContent.append('<p class="has-text-centered">'+condition+'</p>');
          }

      }

    }

    //////// Int ////////
    if(variable.Type == VAR_TYPE.INTEGER){

      qContent.append(`<p class="has-text-centered"><strong>Value Breakdown</strong></p>`);

      let breakDownInnerHTML = `
        <p class="has-text-centered"><span>${variables_getTotal(data.varName)}</span> = 
      `;

      breakDownInnerHTML += `
        <a class="has-text-info has-tooltip-bottom has-tooltip-multiline" data-tooltip="The intial value.">
          ${variables_getValue(data.varName)}
        </a> + `;

      // Bonuses
      let map = variables_getBonusesMap(data.varName);
      for(let [type, valueData] of map.entries()){
        breakDownInnerHTML += `
          <a class="has-text-info has-tooltip-bottom has-tooltip-multiline" data-tooltip="A ${type} bonus from ${valueData.Src}.">
            ${valueData.Value}
          </a> + `;
      }

      if(breakDownInnerHTML.endsWith(' + ')){
        breakDownInnerHTML = breakDownInnerHTML.slice(0, -3);// Trim off that last ' + '
      }

      qContent.append(breakDownInnerHTML);

      // Conditionals
      let conditionalStatMap = getConditionalStatMap(data.varName);
      if(conditionalStatMap != null && conditionalStatMap.size != 0){

        qContent.append('<hr class="m-2">');

        qContent.append('<p class="has-text-centered"><strong>Conditionals</strong></p>');
        
        for(const [condition, valueData] of conditionalStatMap.entries()){
          qContent.append('<p class="has-text-centered">'+condition+'</p>');
        }

      }

    }

    //////// String ////////
    if(variable.Type == VAR_TYPE.STRING){

      qContent.append(`<p class="has-text-centered"><strong>Value Breakdown</strong></p>`);

      let breakDownInnerHTML = ``;

      breakDownInnerHTML += `
        <a class="has-text-info has-tooltip-bottom has-tooltip-multiline" data-tooltip="The intial value.">
          ${variables_getValue(data.varName)}
        </a> + `;

      // Extras
      let map = variables_getExtrasMap(data.varName);
      for(let [type, valueData] of map.entries()){
        breakDownInnerHTML += `
          <a class="has-text-info has-tooltip-bottom has-tooltip-multiline" data-tooltip="From ${valueData.Src}.">
            ${valueData.Value}
          </a>, `;
      }

      if(breakDownInnerHTML.endsWith(', ')){
        breakDownInnerHTML = breakDownInnerHTML.slice(0, -2);// Trim off that last ', '
      }

      qContent.append(breakDownInnerHTML);

    }

  }


}