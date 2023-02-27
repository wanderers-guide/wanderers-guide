/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

function openSavingThrowQuickview(data) {
    let noteFieldID = 'savingThrow-'+data.ProfData.Name.replace(/\s/g, "_");

    $('#quickViewTitle').html(data.ProfData.Name);
    $('#quickViewTitleRight').html('<button id="customizeProfBtn" class="button is-very-small is-success is-outlined is-rounded is-pulled-right mr-1">Customize</button>');
    $('#customizeProfBtn').click(function(){
        openQuickView('customizeProfView', {
            ProfSrcData : data.ProfSrcData,
            ProfData : data.ProfData,
            NoteFieldID : noteFieldID,
            _prevBackData: {Type: g_QViewLastType, Data: g_QViewLastData},
        }, $('#quickviewDefault').hasClass('is-active'));
    });

    let qContent = $('#quickViewContent');

    let profName = getProfNameFromNumUps(data.ProfData.NumUps);
    let profNameHTML = getProfHistoryHTML(data.VARIABLE);
    if(data.ProfData.UserProfOverride){
        qContent.append('<p><strong>Proficiency:</strong> '+profNameHTML+' <span class="is-inline pl-1 is-size-7 is-italic"> ( Override )</span></p>');
    } else {
        qContent.append('<p><strong>Proficiency:</strong> '+profNameHTML+'</p>');
    }
    
    let userBonus = data.ProfData.UserBonus;
    if(userBonus != 0){
        qContent.append('<p><strong>Extra Bonus:</strong> '+signNumber(userBonus)+'</p>');
    }
    
    qContent.append('<p><strong>Ability Score:</strong> '+data.AbilityName+'</p>');
    qContent.append('<hr class="m-2">');
    qContent.append('<p>'+data.SavingThrowDescription+'</p>');
    qContent.append('<hr class="m-2">');
    qContent.append('<p class="has-text-centered"><strong>Bonus Breakdown</strong></p>');

    if(gOption_hasDiceRoller) { refreshStatRollButtons(); }
    let breakDownInnerHTML = '<p class="has-text-centered"><span class="stat-roll-btn">'+signNumber(data.TotalBonus)+'</span> = ';

    breakDownInnerHTML += '<a class="has-text-info has-tooltip-bottom has-tooltip-multiline" data-tooltip="This is your '+data.AbilityName+' modifier. Your '+data.AbilityName+' is relevant in determining how well you can act in dealing with situations where you will need to make a '+data.ProfData.Name+' saving throw; as a result, it\'s modifier is added when determining your total saving throw bonus.">'+data.AbilMod+'</a>';

    breakDownInnerHTML += ' + ';

    if(profName == "Untrained") {
        let untrainedProfBonus = 0;
        if(gOption_hasProfWithoutLevel){
            untrainedProfBonus = -2;
        }
        breakDownInnerHTML += '<a class="has-text-info has-tooltip-bottom has-tooltip-multiline" data-tooltip="This is your proficiency bonus. Because you are '+profName.toLowerCase()+' in '+data.ProfData.Name+', your proficiency bonus is '+signNumber(untrainedProfBonus)+'.">'+data.ProfNum+'</a>';
    } else {
        if(gOption_hasProfWithoutLevel){
            breakDownInnerHTML += '<a class="has-text-info has-tooltip-bottom has-tooltip-multiline" data-tooltip="This is your proficiency bonus. Because you are '+profName.toLowerCase()+' in '+data.ProfData.Name+', your proficiency bonus is '+signNumber(getBonusFromProfName(profName))+'.">'+data.ProfNum+'</a>';
        } else {
            breakDownInnerHTML += '<a class="has-text-info has-tooltip-bottom has-tooltip-multiline" data-tooltip="This is your proficiency bonus. Because you are '+profName.toLowerCase()+' in '+data.ProfData.Name+', your proficiency bonus is equal to your level ('+data.CharLevel+') plus '+getBonusFromProfName(profName)+'.">'+data.ProfNum+'</a>';
        }
    }

    breakDownInnerHTML += ' + ';

    let amalgBonus = data.TotalBonus - (data.AbilMod + data.ProfNum);
    breakDownInnerHTML += '<a id="amalgBonusNum" class="has-text-info has-tooltip-bottom">'+amalgBonus+'</a>';

    breakDownInnerHTML += '</p>';

    qContent.append(breakDownInnerHTML);

    let saveDataName = (data.ProfData.Name == 'Fortitude') ? 'SAVE_Fort' : 'SAVE_'+data.ProfData.Name;

    let amalgBonuses = getStatExtraBonuses(saveDataName);
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

    let conditionalStatMap = getConditionalStatMap(saveDataName);
    if(conditionalStatMap != null && conditionalStatMap.size != 0){

        qContent.append('<hr class="m-2">');

        qContent.append('<p class="has-text-centered"><strong>Conditionals</strong></p>');
        
        for(const [condition, valueData] of conditionalStatMap.entries()){
          qContent.append('<p class="has-text-centered">'+condition+'</p>');
        }

    }

    // Display Note Field
    let noteFieldSrcStruct = {
        sourceType: 'bonus-area',
        sourceLevel: 0,
        sourceCode: 'bonus-area-'+noteFieldID,
        sourceCodeSNum: 'a',
    };
    displayNotesField(qContent, noteFieldSrcStruct);

}