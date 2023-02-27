/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

function openACQuickview(data) {

    $('#quickViewTitle').html('Armor Class - <em class="is-size-6">'+data.ArmorItemName+'</em>');

    let qContent = $('#quickViewContent');

    let profName = getProfNameFromNumUps(data.NumUps);
    qContent.append('<p><strong>Proficiency:</strong> '+profName+'</p>');

    qContent.append('<hr class="m-2">');
    qContent.append('<p>Your Armor Class (AC) measures how well you can defend against attacks. When a creature attacks you, your Armor Class is the DC for that attack roll.</p>');
    qContent.append('<hr class="m-2">');
    qContent.append('<p class="has-text-centered"><strong>AC Breakdown</strong></p>');

    let breakDownInnerHTML = '<p class="has-text-centered">'+data.TotalAC+' = 10 + ';

    breakDownInnerHTML += '<a class="has-text-info has-tooltip-bottom has-tooltip-multiline" data-tooltip="This is your Dexterity modifier, capped out by your armor\'s Dex Cap and decreased by certain conditions.">'+data.DexMod+'</a>';

    breakDownInnerHTML += ' + ';

    breakDownInnerHTML += '<a class="has-text-info has-tooltip-bottom has-tooltip-multiline" data-tooltip="This is the total bonus you get from your armor (including any penalties it may have from being broken or shoddy).">'+data.ArmorBonus+'</a>';

    breakDownInnerHTML += ' + ';
    
    if(profName == "Untrained") {
        let untrainedProfBonus = 0;
        if(gOption_hasProfWithoutLevel){
            untrainedProfBonus = -2;
        }
        breakDownInnerHTML += '<a class="has-text-info has-tooltip-bottom has-tooltip-multiline" data-tooltip="This is your proficiency bonus. Because you are '+profName.toLowerCase()+' in what you\'re wearing, your proficiency bonus is '+signNumber(untrainedProfBonus)+'.">'+data.ProfNum+'</a>';
    } else {
        if(gOption_hasProfWithoutLevel){
            breakDownInnerHTML += '<a class="has-text-info has-tooltip-bottom has-tooltip-multiline" data-tooltip="This is your proficiency bonus. Because you are '+profName.toLowerCase()+' in what you\'re wearing, your proficiency bonus is '+signNumber(getBonusFromProfName(profName))+'.">'+data.ProfNum+'</a>';
        } else {
            breakDownInnerHTML += '<a class="has-text-info has-tooltip-bottom has-tooltip-multiline" data-tooltip="This is your proficiency bonus. Because you are '+profName.toLowerCase()+' in what you\'re wearing, your proficiency bonus is equal to your level ('+data.CharLevel+') plus '+getBonusFromProfName(profName)+'.">'+data.ProfNum+'</a>';
        }
    }

    breakDownInnerHTML += ' + ';

    let amalgBonus = data.TotalAC - (data.DexMod + data.ProfNum + data.ArmorBonus + 10);
    breakDownInnerHTML += '<a id="amalgBonusNum" class="has-text-info has-tooltip-bottom">'+amalgBonus+'</a>';

    breakDownInnerHTML += '</p>';

    qContent.append(breakDownInnerHTML);

    let amalgBonuses = getStatExtraBonuses(VARIABLE.AC);
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

    // Conditionals //
    let conditionalStatMap = getConditionalStatMap(VARIABLE.AC);
    if(conditionalStatMap != null && conditionalStatMap.size != 0){

        qContent.append('<hr class="m-2">');

        qContent.append('<p class="has-text-centered"><strong>Conditionals</strong></p>');
        
        for(const [condition, valueData] of conditionalStatMap.entries()){
          qContent.append('<p class="has-text-centered">'+condition+'</p>');
        }

    }

}