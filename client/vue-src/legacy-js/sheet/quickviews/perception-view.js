/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

function openPerceptionQuickview(data) {
    let noteFieldID = 'perception-'+data.ProfData.Name.replace(/\s/g, "_");

    $('#quickViewTitle').html(data.ProfData.Name);
    $('#quickViewTitleRight').html('<button id="customizeProfBtn" class="button is-very-small is-success is-outlined is-rounded is-pulled-right mr-1">Customize</button>');
    $('#customizeProfBtn').click(function(){
        openQuickView('customizeProfView', {
            ProfSrcData : {For:'Perception',To:'Perception'},
            ProfData : data.ProfData,
            NoteFieldID : noteFieldID,
            _prevBackData: {Type: g_QViewLastType, Data: g_QViewLastData},
        }, $('#quickviewDefault').hasClass('is-active'));
    });

    let qContent = $('#quickViewContent');

    let profName = getProfNameFromNumUps(data.ProfData.NumUps);
    let profNameHTML = getProfHistoryHTML(VARIABLE.PERCEPTION);
    if(data.ProfData.UserProfOverride){
        qContent.append('<p><strong>Proficiency:</strong> '+profNameHTML+' <span class="is-inline pl-1 is-size-7 is-italic"> ( Override )</span></p>');
    } else {
        qContent.append('<p><strong>Proficiency:</strong> '+profNameHTML+'</p>');
    }
    
    let userBonus = data.ProfData.UserBonus;
    if(userBonus != 0){
        qContent.append('<p><strong>Extra Bonus:</strong> '+signNumber(userBonus)+'</p>');
    }

    qContent.append('<p><strong>Ability Score:</strong> Wisdom</p>');
    qContent.append('<hr class="m-2">');
    qContent.append('<p>Perception measures your character’s ability to notice hidden objects or unusual situations, and it usually determines how quickly the character springs into action in combat.</p>');
    qContent.append('<hr class="m-2">');
    qContent.append('<p class="has-text-centered"><strong>Bonus Breakdown</strong></p>');

    if(gOption_hasDiceRoller) { refreshStatRollButtons(); }
    let breakDownInnerHTML = '<p class="has-text-centered"><span class="stat-roll-btn">'+signNumber(data.TotalBonus)+'</span> = ';

    breakDownInnerHTML += '<a class="has-text-info has-tooltip-bottom has-tooltip-multiline" data-tooltip="This is your Wisdom modifier. It is added when determining your total Perception bonus.">'+data.WisMod+'</a>';

    breakDownInnerHTML += ' + ';
    
    if(profName == "Untrained") {
        let untrainedProfBonus = 0;
        if(gOption_hasProfWithoutLevel){
            untrainedProfBonus = -2;
        }
        breakDownInnerHTML += '<a class="has-text-info has-tooltip-bottom has-tooltip-multiline" data-tooltip="This is your proficiency bonus. Because you are '+profName.toLowerCase()+' in Perception, your proficiency bonus is '+signNumber(untrainedProfBonus)+'.">'+data.ProfNum+'</a>';
    } else {
        if(gOption_hasProfWithoutLevel){
            breakDownInnerHTML += '<a class="has-text-info has-tooltip-bottom has-tooltip-multiline" data-tooltip="This is your proficiency bonus. Because you are '+profName.toLowerCase()+' in Perception, your proficiency bonus is '+signNumber(getBonusFromProfName(profName))+'.">'+data.ProfNum+'</a>';
        } else {
            breakDownInnerHTML += '<a class="has-text-info has-tooltip-bottom has-tooltip-multiline" data-tooltip="This is your proficiency bonus. Because you are '+profName.toLowerCase()+' in Perception, your proficiency bonus is equal to your level ('+data.CharLevel+') plus '+getBonusFromProfName(profName)+'.">'+data.ProfNum+'</a>';
        }
    }

    breakDownInnerHTML += ' + ';

    let amalgBonus = data.TotalBonus - (data.WisMod + data.ProfNum);
    breakDownInnerHTML += '<a id="amalgBonusNum" class="has-text-info has-tooltip-bottom">'+amalgBonus+'</a>';

    breakDownInnerHTML += '</p>';

    qContent.append(breakDownInnerHTML);

    let amalgBonuses = getStatExtraBonuses(VARIABLE.PERCEPTION);
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
    let conditionalStatMap = getConditionalStatMap(VARIABLE.PERCEPTION);
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
    

    // Senses //
    qContent.append('<hr class="m-2">');

    qContent.append('<p class="has-text-centered is-size-5"><strong>Senses</strong></p>');

    qContent.append('<p class="has-text-centered has-tooltip-bottom has-tooltip-multiline" data-tooltip="'+processTextRemoveIndexing(data.PrimaryVisionSense.description)+'">'+data.PrimaryVisionSense.name+'</p>');

    for(let additionalSense of data.AdditionalSenseArray) {
        qContent.append('<p class="has-text-centered has-tooltip-bottom has-tooltip-multiline" data-tooltip="'+processTextRemoveIndexing(additionalSense.description)+'">'+additionalSense.name+'</p>');
    }

}