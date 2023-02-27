/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

let g_addSpellEntrySetNum = 0;

function openAddSpellQuickview(data){

    $('#quickViewTitle').html("Tradition Spell List");
    let qContent = $('#quickViewContent');

    qContent.append('<div class="tabs is-small is-centered is-marginless mb-1"><ul class="category-tabs"><li><a id="spellTraditionArcane">Arcane</a></li><li><a id="spellTraditionDivine">Divine</a></li><li><a id="spellTraditionOccult">Occult</a></li><li><a id="spellTraditionPrimal">Primal</a></li></ul></div>');

    qContent.append('<div class="columns is-mobile is-marginless mb-3"><div class="column is-9 pr-1"><p class="control has-icons-left"><input id="traditionSpellsSearch" class="input" type="text" placeholder="Search Spells in Tradition"><span class="icon is-left"><i class="fas fa-search" aria-hidden="true"></i></span></p></div><div class="column mt-1"><div class="select is-small is-info"><select id="traditionSpellsFilterByLevel"><option value="0">Cantrip</option><option value="1">1st</option><option value="2">2nd</option><option value="3">3rd</option><option value="4">4th</option><option value="5">5th</option><option value="6">6th</option><option value="7">7th</option><option value="8">8th</option><option value="9">9th</option><option value="10">10th</option></select></div></div></div>');

    qContent.append('<div id="traitionSpellListSection" class="tile is-ancestor is-vertical"></div>');

    $('#spellTraditionArcane').click(function(){
        changeSpellTraditionTab('spellTraditionArcane', 'arcane', data);
    });

    $('#spellTraditionDivine').click(function(){
        changeSpellTraditionTab('spellTraditionDivine', 'divine', data);
    });

    $('#spellTraditionOccult').click(function(){
        changeSpellTraditionTab('spellTraditionOccult', 'occult', data);
    });

    $('#spellTraditionPrimal').click(function(){
        changeSpellTraditionTab('spellTraditionPrimal', 'primal', data);
    });

    let spellList = data.SpellBook.SpellList.toUpperCase();
    if(spellList === 'ARCANE'){
        $('#spellTraditionArcane').click();
    } else if(spellList === 'DIVINE'){
        $('#spellTraditionDivine').click();
    } else if(spellList === 'OCCULT'){
        $('#spellTraditionOccult').click();
    } else if(spellList === 'PRIMAL'){
        $('#spellTraditionPrimal').click();
    }

}






function changeSpellTraditionTab(type, traditionName, data){

    $('#traitionSpellListSection').html('');

    $('#spellTraditionArcane').parent().removeClass("is-active");
    $('#spellTraditionDivine').parent().removeClass("is-active");
    $('#spellTraditionOccult').parent().removeClass("is-active");
    $('#spellTraditionPrimal').parent().removeClass("is-active");
    $('#'+type).parent().addClass("is-active");

    let traditionSpellsSearch = $('#traditionSpellsSearch');
    let traditionSpellsSearchInput = null;
    if(traditionSpellsSearch.val() != ''){
        traditionSpellsSearchInput = traditionSpellsSearch.val().toUpperCase();
        traditionSpellsSearch.addClass('is-info');
    } else {
        traditionSpellsSearch.removeClass('is-info');
        traditionSpellsSearch.blur();
    }

    let traditionSpellsLevelFilterValue = $('#traditionSpellsFilterByLevel').val();

    $('#traditionSpellsSearch').off('change');
    $('#traditionSpellsSearch').change(function(){
        changeSpellTraditionTab(type, traditionName, data);
    });

    $('#traditionSpellsFilterByLevel').off('change');
    $('#traditionSpellsFilterByLevel').change(function(){
        changeSpellTraditionTab(type, traditionName, data);
    });

    for(const [spellID, spellDataStruct] of data.Data.SpellMap.entries()){

        let willDisplay = false;

        let spellTraditions = JSON.parse(spellDataStruct.Spell.traditions);
        if(spellTraditions.includes(traditionName)){
            willDisplay = true;
        }

        if(traditionSpellsSearchInput != null){
            $('#traditionSpellsFilterByLevel').parent().removeClass('is-info');

            let spellName = spellDataStruct.Spell.name.toUpperCase();
            if(!spellName.includes(traditionSpellsSearchInput)){
                willDisplay = false;
            }
        } else {
            $('#traditionSpellsFilterByLevel').parent().addClass('is-info');

            if(spellDataStruct.Spell.level != traditionSpellsLevelFilterValue){
                willDisplay = false;
            }

        }

        if(willDisplay){
            displayAddSpell(spellDataStruct, data);
        }

    }


    $('.spellEntryPart').click(function(){

        let spellID = $(this).parent().attr('data-spell-id');
        let spellDataStruct = data.Data.SpellMap.get(spellID+"");

        let spellTradChevronSpellID = 'addSpellFromTraditionChevronSpellID'+spellID;
        let spellTradNameID = 'addSpellFromTraditionName'+spellID;
        let spellTradDetailsSpellID = 'addSpellFromTraditionDetailsSpell'+spellID;
        if($('#'+spellTradDetailsSpellID).html() != ''){
            $('#'+spellTradChevronSpellID).removeClass('fa-chevron-up');
            $('#'+spellTradChevronSpellID).addClass('fa-chevron-down');
            $('#'+spellTradNameID).removeClass('has-text-weight-bold');
            displaySpellDetails(null, spellTradDetailsSpellID);
        } else {
            $('#'+spellTradChevronSpellID).removeClass('fa-chevron-down');
            $('#'+spellTradChevronSpellID).addClass('fa-chevron-up');
            $('#'+spellTradNameID).addClass('has-text-weight-bold');
            displaySpellDetails(spellDataStruct, spellTradDetailsSpellID);
        }

    });

}

function displayAddSpell(spellDataStruct, data){

    if(spellDataStruct.Spell.isArchived === 1){
        return;
    }
    if(spellDataStruct.Spell.isFocusSpell === 1){
        return;
    }

    let spellID = spellDataStruct.Spell.id;
    let spellLevel = (spellDataStruct.Spell.level == 0) ? "Cantrip" : "Lvl "+spellDataStruct.Spell.level;
    let spellName = spellDataStruct.Spell.name;

    let spellTradAddSpellBtnWrapperID = 'addSpellBtnWrapper'+spellID;
    let spellTradAddSpellID = 'addSpellFromTraditionAddSpell'+spellID;
    let spellTradChevronSpellID = 'addSpellFromTraditionChevronSpellID'+spellID;
    let spellTradNameID = 'addSpellFromTraditionName'+spellID;
    let spellTradDetailsSpellID = 'addSpellFromTraditionDetailsSpell'+spellID;

    $('#traitionSpellListSection').append('<div class="tile is-parent is-flex is-paddingless border-bottom border-additems has-bg-options-header-bold cursor-clickable" data-spell-id="'+spellID+'"><div class="tile is-child is-9 spellEntryPart"><p id="'+spellTradNameID+'" class="has-text-left mt-1 pl-3 has-txt-value-number">'+spellName+'</p></div><div id="'+spellTradAddSpellBtnWrapperID+'" class="tile is-child"></div><div class="tile is-child is-1 spellEntryPart"><span class="icon has-txt-noted mt-2"><i id="'+spellTradChevronSpellID+'" class="fas fa-chevron-down"></i></span></div></div><div id="'+spellTradDetailsSpellID+'"></div>');

    
    if(data.SpellBook.SpellCastingType === 'SPONTANEOUS-REPERTOIRE' && spellDataStruct.Spell.level != 0) {

        let spellAddSelectHTML = '<div class="select my-1 is-small is-success"><select id="'+spellTradAddSpellID+'" class="spellEntryAdd">';
        spellAddSelectHTML += '<option value="chooseDefault">Add</option>';
        for (let i = spellDataStruct.Spell.level; i < 11; i++) {
            spellAddSelectHTML += '<option value="'+i+'">'+rankLevel(i)+'</option>';
        }
        spellAddSelectHTML += '</select></div>';
        $('#'+spellTradAddSpellBtnWrapperID).html(spellAddSelectHTML);

        $('#'+spellTradAddSpellID).change(function(){
            let spellLevel = $("#"+spellTradAddSpellID+" option:selected").val();
            if(spellLevel != 'chooseDefault') {
                prev_spellSRC = data.SpellBook.SpellSRC;
                prev_spellData = data.Data;
                socket.emit("requestSpellAddToSpellBook",
                    getCharIDFromURL(),
                    data.SpellBook.SpellSRC,
                    spellDataStruct.Spell.id,
                    spellLevel,
                    null);
                data.SpellBook.SpellBook.push({SpellID: spellDataStruct.Spell.id, SpellLevel: spellLevel});
                $("#"+spellTradAddSpellID).val('chooseDefault');
            }
        });

    } else {

        let spellData = data.SpellBook.SpellBook.find(spellData => {
            return spellData.SpellID == spellDataStruct.Spell.id;
        });
        if(spellData != null) {
            $('#'+spellTradAddSpellBtnWrapperID).html('<button class="button my-1 is-small is-primary is-rounded">Added</button>');
        } else {
            $('#'+spellTradAddSpellBtnWrapperID).html('<button id="'+spellTradAddSpellID+'" class="button my-1 is-small is-success is-rounded">Add</button>');
        }
    
        $('#'+spellTradAddSpellID).click(function(){
            prev_spellSRC = data.SpellBook.SpellSRC;
            prev_spellData = data.Data;
            socket.emit("requestSpellAddToSpellBook",
                getCharIDFromURL(),
                data.SpellBook.SpellSRC,
                spellDataStruct.Spell.id,
                spellDataStruct.Spell.level,
                null);
            data.SpellBook.SpellBook.push({SpellID: spellDataStruct.Spell.id, SpellLevel: spellDataStruct.Spell.level});
            $('#'+spellTradAddSpellBtnWrapperID).html('<button class="button my-1 is-small is-primary is-rounded">Added</button>');
        });

    }
    

}

function displaySpellDetails(spellDataStruct, spellTradDetailsSpellID){

    if(spellDataStruct == null){
        $('#'+spellTradDetailsSpellID).html('');
        return;
    }

    $('#'+spellTradDetailsSpellID).html('<div class="tile is-parent is-vertical is-paddingless border-bottom border-additems p-2 text-center"></div>');
    let spellDetails = $('#'+spellTradDetailsSpellID+' > div');

    let rarity = spellDataStruct.Spell.rarity;
    let tagsInnerHTML = '';
    switch(rarity) {
      case 'UNCOMMON': tagsInnerHTML += '<button class="button is-paddingless px-2 is-marginless mr-2 mb-1 is-very-small is-uncommon">Uncommon</button>';
        break;
      case 'RARE': tagsInnerHTML += '<button class="button is-paddingless px-2 is-marginless mr-2 mb-1 is-very-small is-rare">Rare</button>';
        break;
      case 'UNIQUE': tagsInnerHTML += '<button class="button is-paddingless px-2 is-marginless mr-2 mb-1 is-very-small is-unique">Unique</button>';
        break;
      default: break;
    }
    for(const tag of spellDataStruct.Tags){
        let tagDescription = tag.description;
        if(tagDescription.length > g_tagStringLengthMax){
            tagDescription = tagDescription.substring(0, g_tagStringLengthMax);
            tagDescription += '...';
        }
        tagsInnerHTML += '<button class="button is-paddingless px-2 is-marginless mr-2 mb-1 is-very-small is-info has-tooltip-bottom has-tooltip-multiline tagButton" data-tooltip="'+processTextRemoveIndexing(tagDescription)+'">'+tag.name+getImportantTraitIcon(tag)+'</button>';
    }

    if(tagsInnerHTML != ''){
        spellDetails.append('<div class="buttons is-marginless is-centered">'+tagsInnerHTML+'</div>');
        spellDetails.append('<hr class="mb-2 mt-1">');
    }

    $('.tagButton').click(function(){
        let tagName = $(this).text();
        openQuickView('tagView', {
            TagName : tagName,
            _prevBackData: {Type: g_QViewLastType, Data: g_QViewLastData},
        }, $('#quickviewDefault').hasClass('is-active'));
    });

    // Traditions
    let traditionsString = '';
    let spellTraditions = JSON.parse(spellDataStruct.Spell.traditions);
    for(let tradition of spellTraditions){
        traditionsString += tradition+', ';
    }
    traditionsString = traditionsString.slice(0, -2);// Trim off that last ', '
    spellDetails.append('<div class="tile"><div class="tile is-child"><p class="text-left"><strong>Traditions</strong> '+traditionsString+'</p></div></div>');

    // Cast
    let castActions = null;
    let wrapComponents = false;
    switch(spellDataStruct.Spell.cast) {
        case 'FREE_ACTION': castActions = '<span class="pf-icon">[free-action]</span>'; break;
        case 'REACTION': castActions = '<span class="pf-icon">[reaction]</span>'; break;
        case 'ACTION': castActions = '<span class="pf-icon">[one-action]</span>'; break;
        case 'TWO_ACTIONS': castActions = '<span class="pf-icon">[two-actions]</span>'; break;
        case 'THREE_ACTIONS': castActions = '<span class="pf-icon">[three-actions]</span>'; break;
        case 'ONE_TO_THREE_ACTIONS': castActions = '<span class="pf-icon">[one-action]</span><span> to </span><span class="pf-icon">[three-actions]</span>'; break;
        case 'ONE_TO_TWO_ACTIONS': castActions = '<span class="pf-icon">[one-action]</span><span> to </span><span class="pf-icon">[two-actions]</span>'; break;
        case 'TWO_TO_THREE_ACTIONS': castActions = '<span class="pf-icon">[two-actions]</span><span> to </span><span class="pf-icon">[three-actions]</span>'; break;
        case 'TWO_TO_TWO_ROUNDS': castActions = '<span class="pf-icon">[two-actions]</span><span> to 2 rounds</span>'; break;
        case 'TWO_TO_THREE_ROUNDS': castActions = '<span class="pf-icon">[two-actions]</span><span> to 3 rounds</span>'; break;
        case 'THREE_TO_TWO_ROUNDS': castActions = '<span class="pf-icon">[three-actions]</span><span> to 2 rounds</span>'; break;
        case 'THREE_TO_THREE_ROUNDS': castActions = '<span class="pf-icon">[three-actions]</span><span> to 3 rounds</span>'; break;
        case 'TWO_ROUNDS': castActions = '<span>2 rounds</span>'; wrapComponents = true; break;
        case 'THREE_ROUNDS': castActions = '<span>3 rounds</span>'; wrapComponents = true; break;
        case 'ONE_MINUTE': castActions = '<span>1 minute</span>'; wrapComponents = true; break;
        case 'FIVE_MINUTES': castActions = '<span>5 minutes</span>'; wrapComponents = true; break;
        case 'TEN_MINUTES': castActions = '<span>10 minutes</span>'; wrapComponents = true; break;
        case 'THIRTY_MINUTES': castActions = '<span>30 minutes</span>'; wrapComponents = true; break;
        case 'ONE_HOUR': castActions = '<span>1 hour</span>'; wrapComponents = true; break;
        case 'EIGHT_HOURS': castActions = '<span>8 hours</span>'; wrapComponents = true; break;
        case 'ONE_DAY': castActions = '<span>24 hours</span>'; wrapComponents = true; break;
        default: break;
    }

    let componentsString = '';
    let spellComponents = JSON.parse(spellDataStruct.Spell.castingComponents);
    for(let components of spellComponents){
        componentsString += components+', ';
    }
    componentsString = componentsString.slice(0, -2);// Trim off that last ', '
    if(wrapComponents && componentsString != ''){
        componentsString = '('+componentsString+')';
    }

    spellDetails.append('<div class="tile"><div class="tile is-child"><p class="text-left"><strong>Cast</strong> '+castActions+' '+componentsString+'</p></div></div>');

    // Cost // Trigger // Requirements // 
    let ctrString = '';

    let spellCost = '';
    if(spellDataStruct.Spell.cost != null){
        spellCost = '<strong>Cost</strong> '+removePeriodAtEndOfStr(spellDataStruct.Spell.cost)+'; ';
    }
    ctrString += spellCost;

    let spellTrigger = '';
    if(spellDataStruct.Spell.trigger != null){
        spellTrigger = '<strong>Trigger</strong> '+removePeriodAtEndOfStr(spellDataStruct.Spell.trigger)+'; ';
    }
    ctrString += spellTrigger;

    let spellRequirements = '';
    if(spellDataStruct.Spell.requirements != null){
        spellRequirements = '<strong>Requirements</strong> '+removePeriodAtEndOfStr(spellDataStruct.Spell.requirements)+'; ';
    }
    ctrString += spellRequirements;
    ctrString = ctrString.slice(0, -2);// Trim off that last '; '
    if(ctrString != '') {ctrString += '.';}// Add period at end.

    spellDetails.append('<div class="tile"><div class="tile is-child"><p class="text-left negative-indent">'+ctrString+'</p></div></div>');


    // Range // Area // Targets //
    let ratString = '';

    let spellRange = '';
    if(spellDataStruct.Spell.range != null){
        spellRange = '<strong>Range</strong> '+spellDataStruct.Spell.range+'; ';
    }
    ratString += spellRange;

    let spellArea = '';
    if(spellDataStruct.Spell.area != null){
        spellArea = '<strong>Area</strong> '+spellDataStruct.Spell.area+'; ';
    }
    ratString += spellArea;

    let spellTargets = '';
    if(spellDataStruct.Spell.targets != null){
        spellTargets = '<strong>Targets</strong> '+spellDataStruct.Spell.targets+'; ';
    }
    ratString += spellTargets;
    ratString = ratString.slice(0, -2);// Trim off that last '; '

    spellDetails.append('<div class="tile"><div class="tile is-child"><p class="text-left negative-indent">'+ratString+'</p></div></div>');

    // Saving Throw // Duration //
    let sdString = '';

    let savingThrowType = null;
    switch(spellDataStruct.Spell.savingThrow) {
        case 'FORT': savingThrowType = 'Fortitude'; break;
        case 'REFLEX': savingThrowType = 'Reflex'; break;
        case 'WILL': savingThrowType = 'Will'; break;
        case 'BASIC_FORT': savingThrowType = 'basic Fortitude'; break;
        case 'BASIC_REFLEX': savingThrowType = 'basic Reflex'; break;
        case 'BASIC_WILL': savingThrowType = 'basic Will'; break;
        default: break;
    }
    if(savingThrowType != null){
        sdString += '<strong>Saving Throw</strong> '+savingThrowType+'; ';
    }

    let spellDuration = '';
    if(spellDataStruct.Spell.duration != null){
        spellDuration = '<strong>Duration</strong> '+spellDataStruct.Spell.duration+'; ';
    }
    sdString += spellDuration;
    sdString = sdString.slice(0, -2);// Trim off that last '; '

    spellDetails.append('<div class="tile"><div class="tile is-child"><p class="text-left negative-indent">'+sdString+'</p></div></div>');

    spellDetails.append('<hr class="m-2">');

    spellDetails.append(processText(spellDataStruct.Spell.description, true, true, 'MEDIUM'));

    if(spellDataStruct.Spell.heightenedOneVal != null || spellDataStruct.Spell.heightenedTwoVal != null || spellDataStruct.Spell.heightenedThreeVal != null) {

        spellDetails.append('<hr class="m-2">');

        if(spellDataStruct.Spell.heightenedOneVal != null){
            let heightenedTextName = getHeightenedTextFromCodeName(spellDataStruct.Spell.heightenedOneVal);
            let hText;
            if(heightenedTextName === "CUSTOM"){
                hText = '<strong>Heightened</strong> '+spellDataStruct.Spell.heightenedOneText;
            } else {
                hText = '<strong>Heightened ('+heightenedTextName+')</strong> '+spellDataStruct.Spell.heightenedOneText;
            }
            spellDetails.append('<div class="negative-indent">'+processText(hText, true, true, 'MEDIUM')+'</div>');
        }

        if(spellDataStruct.Spell.heightenedTwoVal != null){
            let hText = '<strong>Heightened ('+getHeightenedTextFromCodeName(spellDataStruct.Spell.heightenedTwoVal)+')</strong> '+spellDataStruct.Spell.heightenedTwoText;
            spellDetails.append('<div class="negative-indent">'+processText(hText, true, true, 'MEDIUM')+'</div>');
        }

        if(spellDataStruct.Spell.heightenedThreeVal != null){
            let hText = '<strong>Heightened ('+getHeightenedTextFromCodeName(spellDataStruct.Spell.heightenedThreeVal)+')</strong> '+spellDataStruct.Spell.heightenedThreeText;
            spellDetails.append('<div class="negative-indent">'+processText(hText, true, true, 'MEDIUM')+'</div>');
        }

        if(spellDataStruct.Spell.heightenedFourVal != null){
            let hText = '<strong>Heightened ('+getHeightenedTextFromCodeName(spellDataStruct.Spell.heightenedFourVal)+')</strong> '+spellDataStruct.Spell.heightenedFourText;
            spellDetails.append('<div class="negative-indent">'+processText(hText, true, true, 'MEDIUM')+'</div>');
        }

    }


}

function removePeriodAtEndOfStr(str){
    if(str.endsWith('.')) {
        return str.substring(0, str.length - 1);
    } else {
        return str;
    }
}