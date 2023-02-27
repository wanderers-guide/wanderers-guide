/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

let amalgamationBonusText = "This is a collection of any additional bonuses or penalties you might have. This includes adjustments from feats, items, conditions, or those you may have added manually.";

function openSkillQuickview(data) {

    let noteFieldID = 'skill-'+data.SkillName.replace(/\s/g, "_");

    $('#quickViewTitle').html(data.SkillName);
    $('#quickViewTitleRight').html('<button id="customizeProfBtn" class="button is-very-small is-success is-outlined is-rounded is-pulled-right mr-1">Customize</button>');
    $('#customizeProfBtn').click(function(){
        openQuickView('customizeProfView', {
            ProfSrcData : {For:'Skill',To:data.SkillName},
            ProfData : data.ProfData,
            NoteFieldID : noteFieldID,
            _prevBackData: {Type: g_QViewLastType, Data: g_QViewLastData},
        }, $('#quickviewDefault').hasClass('is-active'));
    });

    let qContent = $('#quickViewContent');

    let abilityScoreName = lengthenAbilityType(data.Skill.ability);

    let profName = getProfNameFromNumUps(data.ProfData.NumUps);
    let profNameHTML = getProfHistoryHTML(data.VARIABLE);
    if(data.ProfData.UserProfOverride != null && data.ProfData.UserProfOverride){
        qContent.append('<p><strong>Proficiency:</strong> '+profNameHTML+' <span class="is-inline pl-1 is-size-7 is-italic"> ( Override )</span></p>');
    } else {
        qContent.append('<p><strong>Proficiency:</strong> '+profNameHTML+'</p>');
    }
    
    let userBonus = data.ProfData.UserBonus;
    if(data.ProfData.UserBonus != null && userBonus != 0){
        qContent.append('<p><strong>Extra Bonus:</strong> '+signNumber(userBonus)+'</p>');
    }

    qContent.append('<p><strong>Ability Score:</strong> '+abilityScoreName+'</p>');
    qContent.append('<hr class="m-2">');
    qContent.append(processText(data.Skill.description, true, true, 'MEDIUM'));
    qContent.append('<hr class="m-2">');
    qContent.append('<p class="has-text-centered"><strong>Bonus Breakdown</strong></p>');

    if(gOption_hasDiceRoller) { refreshStatRollButtons(); }
    let breakDownInnerHTML = '<p class="has-text-centered"><span class="stat-roll-btn">'+signNumber(data.TotalBonus)+'</span> = ';

    breakDownInnerHTML += '<a class="has-text-info has-tooltip-bottom has-tooltip-multiline" data-tooltip="This is your '+abilityScoreName+' modifier. Because '+data.Skill.name+' is a '+abilityScoreName+'-based skill, you add your '+abilityScoreName+' modifier to determine your skill bonus.">'+data.AbilMod+'</a>';

    breakDownInnerHTML += ' + ';

    if(profName == "Untrained") {
        let untrainedProfBonus = 0;
        if(gOption_hasProfWithoutLevel){
            untrainedProfBonus = -2;
        }
        breakDownInnerHTML += '<a class="has-text-info has-tooltip-bottom has-tooltip-multiline" data-tooltip="This is your proficiency bonus. Because you are '+profName.toLowerCase()+' in '+data.SkillName+', your proficiency bonus is '+signNumber(untrainedProfBonus)+'.">'+data.ProfNum+'</a>';
    } else {
        if(gOption_hasProfWithoutLevel){
            breakDownInnerHTML += '<a class="has-text-info has-tooltip-bottom has-tooltip-multiline" data-tooltip="This is your proficiency bonus. Because you are '+profName.toLowerCase()+' in '+data.SkillName+', your proficiency bonus is '+signNumber(getBonusFromProfName(profName))+'.">'+data.ProfNum+'</a>';
        } else {
            breakDownInnerHTML += '<a class="has-text-info has-tooltip-bottom has-tooltip-multiline" data-tooltip="This is your proficiency bonus. Because you are '+profName.toLowerCase()+' in '+data.SkillName+', your proficiency bonus is equal to your level ('+data.CharLevel+') plus '+getBonusFromProfName(profName)+'.">'+data.ProfNum+'</a>';
        }
    }

    breakDownInnerHTML += ' + ';

    let amalgBonus = data.TotalBonus - (data.AbilMod + data.ProfNum);
    breakDownInnerHTML += '<a id="amalgBonusNum" class="has-text-info has-tooltip-bottom">'+amalgBonus+'</a>';

    breakDownInnerHTML += '</p>';

    qContent.append(breakDownInnerHTML);

    let amalgBonuses = getStatExtraBonuses('SKILL_'+data.SkillName);
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

    let conditionalStatMap = getConditionalStatMap('SKILL_'+data.SkillName);
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

    
    let userAddedData = getUserAddedData(g_profMap.get(data.SkillName));
    if(userAddedData != null){
      qContent.append('<hr class="m-2">');
      qContent.append('<div class="buttons is-centered is-marginless"><a id="removeUserAddedLoreButton" class="button is-small is-danger is-rounded is-outlined mt-3">Remove</a></div>');

      $('#removeUserAddedLoreButton').click(function(){ // Remove User-Added Lore

        let srcStruct = {
          sourceType: 'user-added',
          sourceLevel: 0,
          sourceCode: data.SkillName,
          sourceCodeSNum: 'a',
        };
        socket.emit("requestLoreChange",
            getCharIDFromURL(),
            srcStruct,
            null,
            null,
            'T',
            'User-Added'
        );

      });
    }

}