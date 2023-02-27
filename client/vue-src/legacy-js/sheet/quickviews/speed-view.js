/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

function openSpeedQuickview(data) {

    $('#quickViewTitle').html('Speed');
    let qContent = $('#quickViewContent');

    qContent.append('<p>Speed is the distance a character can move using a single action, measured in feet. Moving through an area of difficult terrain costs an extra 5 feet and moving through an area of greater difficult terrain costs 10 additional feet for each 5 feet of movement.</p>');

    addSpeedContent(qContent, 'SPEED', 'Speed');

    for(const otherSpeed of g_otherSpeeds){
        addSpeedContent(qContent, 'SPEED_'+otherSpeed.Type, capitalizeWords(otherSpeed.Type));
    }

    // Conditionals //
    let conditionalStatMap = getConditionalStatMap(VARIABLE.SPEED);
    if(conditionalStatMap != null && conditionalStatMap.size != 0){

        qContent.append('<hr class="m-2">');

        qContent.append('<p class="has-text-centered"><strong>Conditionals</strong></p>');
        
        for(const [condition, valueData] of conditionalStatMap.entries()){
          qContent.append('<p class="has-text-centered">'+condition+'</p>');
        }

    }

}

function addSpeedContent(qContent, speedStatName, speedName){
    qContent.append('<hr class="m-2">');

    let speedAmalgBonusNumID = 'amalgSpeedBonusNum'+speedStatName;
    let speedTotal = getStatTotal(speedStatName);
    
    let speedBase = variables_getValue(speedStatName);


    qContent.append('<p class="has-text-centered is-size-5"><strong>'+speedName+'</strong></p>');

    let amalgBonuses = getStatExtraBonuses(speedStatName);
    if(amalgBonuses != null && amalgBonuses.length > 0){

        let breakDownInnerHTML = '<p class="has-text-centered is-size-5-5">'+speedTotal+' = ';
        breakDownInnerHTML += '<a class="has-text-info has-tooltip-bottom" data-tooltip="This is your base speed.">'+speedBase+'</a>';
        breakDownInnerHTML += ' + ';
        let amalgBonus = speedTotal-speedBase;
        breakDownInnerHTML += '<a id="'+speedAmalgBonusNumID+'" class="has-text-info has-tooltip-bottom">'+amalgBonus+'</a>';
        breakDownInnerHTML += '</p>';
        qContent.append(breakDownInnerHTML);

        $('#'+speedAmalgBonusNumID).removeClass('has-tooltip-multiline');
        let amalgTooltipText = 'Additional adjustments:';
        for(let amalgExtra of amalgBonuses){
            amalgTooltipText += '\n'+amalgExtra;
        }
        $('#'+speedAmalgBonusNumID).attr('data-tooltip', amalgTooltipText);

    } else {

        qContent.append('<p class="has-text-centered is-size-5-5">'+speedTotal+'</p>');

    }

}