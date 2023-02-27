/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

function openClassDCQuickview(data) {
    let noteFieldID = 'classDC';

    $('#quickViewTitle').html('Class DC');
    $('#quickViewTitleRight').html('<button id="customizeProfBtn" class="button is-very-small is-success is-outlined is-rounded is-pulled-right mr-1">Customize</button>');
    $('#customizeProfBtn').click(function(){
        openQuickView('customizeProfView', {
            ProfSrcData : {For:'Class_DC',To:'Class_DC'},
            ProfData : data.ProfData,
            NoteFieldID : noteFieldID,
            _prevBackData: {Type: g_QViewLastType, Data: g_QViewLastData},
        }, $('#quickviewDefault').hasClass('is-active'));
    });

    let qContent = $('#quickViewContent');

    let profName = getProfNameFromNumUps(data.ProfData.NumUps);
    let profNameHTML = getProfHistoryHTML(VARIABLE.CLASS_DC);
    if(data.ProfData.UserProfOverride){
        qContent.append('<p><strong>Proficiency:</strong> '+profNameHTML+' <span class="is-inline pl-1 is-size-7 is-italic"> ( Override )</span></p>');
    } else {
        qContent.append('<p><strong>Proficiency:</strong> '+profNameHTML+'</p>');
    }

    let keyAbilityName = lengthenAbilityType(g_classDetails.KeyAbility);
    keyAbilityName = (keyAbilityName == null) ? 'Unselected' : keyAbilityName;
    qContent.append('<p><strong>Ability Score:</strong> '+keyAbilityName+'</p>');
    
    let userBonus = data.ProfData.UserBonus;
    if(userBonus != 0){
        qContent.append('<p><strong>Extra Bonus:</strong> '+signNumber(userBonus)+'</p>');
    }

    qContent.append('<hr class="m-2">');
    qContent.append('<p>Your class DC sets the difficulty for certain abilities granted by your character’s class. </p>');
    qContent.append('<hr class="m-2">');
    qContent.append('<p class="has-text-centered"><strong>DC Breakdown</strong></p>');

    let breakDownInnerHTML = '<p class="has-text-centered">'+data.TotalDC+' = 10 + ';

    breakDownInnerHTML += '<a class="has-text-info has-tooltip-bottom has-tooltip-multiline" data-tooltip="This is your key ability modifier from your class ('+keyAbilityName+'). It is added when determining your class DC.">'+data.KeyMod+'</a>';

    breakDownInnerHTML += ' + ';
    
    if(profName == "Untrained") {
        let untrainedProfBonus = 0;
        if(gOption_hasProfWithoutLevel){
            untrainedProfBonus = -2;
        }
        breakDownInnerHTML += '<a class="has-text-info has-tooltip-bottom has-tooltip-multiline" data-tooltip="This is your proficiency bonus. Because you are '+profName.toLowerCase()+' in your class DC, your proficiency bonus is '+signNumber(untrainedProfBonus)+'.">'+data.ProfNum+'</a>';
    } else {
        if(gOption_hasProfWithoutLevel){
            breakDownInnerHTML += '<a class="has-text-info has-tooltip-bottom has-tooltip-multiline" data-tooltip="This is your proficiency bonus. Because you are '+profName.toLowerCase()+' in your class DC, your proficiency bonus is '+signNumber(getBonusFromProfName(profName))+'.">'+data.ProfNum+'</a>';
        } else {
            breakDownInnerHTML += '<a class="has-text-info has-tooltip-bottom has-tooltip-multiline" data-tooltip="This is your proficiency bonus. Because you are '+profName.toLowerCase()+' in your class DC, your proficiency bonus is equal to your level ('+data.CharLevel+') plus '+getBonusFromProfName(profName)+'.">'+data.ProfNum+'</a>';
        }
    }

    breakDownInnerHTML += ' + ';

    let amalgBonus = data.TotalDC - (data.KeyMod + data.ProfNum + 10);
    breakDownInnerHTML += '<a id="amalgBonusNum" class="has-text-info has-tooltip-bottom">'+amalgBonus+'</a>';

    breakDownInnerHTML += '</p>';

    qContent.append(breakDownInnerHTML);

    let amalgBonuses = getStatExtraBonuses(VARIABLE.CLASS_DC);
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
    let conditionalStatMap = getConditionalStatMap(VARIABLE.CLASS_DC);
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