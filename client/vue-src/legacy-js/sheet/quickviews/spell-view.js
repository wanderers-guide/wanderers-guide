/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

let g_spellView_spellKeyAbility = null;

function openSpellQuickview(data){
    addBackFunctionality(data);
    addContentSource(data.SpellDataStruct.Spell.id, data.SpellDataStruct.Spell.contentSrc, data.SpellDataStruct.Spell.homebrewID);

    let spellDataStruct = data.SpellDataStruct;
    let spellID = spellDataStruct.Spell.id;
    let spellName = spellDataStruct.Spell.name;
    let spellHeightenLevel = null;

    let sheetSpellType = null;
    if(data.SheetData != null){
        if(data.SheetData.Slot != null) {
            sheetSpellType = 'CORE';
        } else if(data.SheetData.InnateSpell != null){
            sheetSpellType = 'INNATE';
        } else if(data.SheetData.FocusSpell != null){
            sheetSpellType = 'FOCUS';
        }
    }

    if(data.SheetData != null){
        let spellLevel = (spellDataStruct.Spell.level === 0) ? "Cantrip" : "Lvl "+spellDataStruct.Spell.level;
        let spellHeightened = null;
        if(sheetSpellType === 'CORE'){
            spellHeightened = data.SheetData.Slot.slotLevel;
        } else if(sheetSpellType === 'INNATE'){
            spellHeightened = data.SheetData.InnateSpell.SpellLevel;
        } else if(sheetSpellType === 'FOCUS'){
            let focusHeightened = Math.ceil(g_character.level/2);
            spellHeightened = (focusHeightened > spellDataStruct.Spell.level) ? focusHeightened : spellDataStruct.Spell.level;
        }
        if(spellDataStruct.Spell.level === 0) {
            let cantripHeightened = Math.ceil(g_character.level/2);
            spellHeightened = (spellHeightened > cantripHeightened) ? spellHeightened : cantripHeightened;
        }
        if(spellHeightened === null || spellDataStruct.Spell.level == spellHeightened || 
                (spellDataStruct.Spell.level === 0 && spellHeightened == 1)) {
            spellName += '<sup class="is-inline ml-2 is-size-7 is-italic">'+spellLevel+'</sup>';
            spellHeightenLevel = -1;
        } else {
            if(spellLevel == 'Cantrip') { spellLevel+=' (1)'; }
            spellName += '<sup class="is-inline ml-2 is-size-7 is-italic">'+spellLevel+'<span class="icon" style="font-size: 0.8em;"><i class="fas fa-caret-right"></i></span>'+spellHeightened+'</sup>';
            spellHeightenLevel = spellHeightened;
        }
    }

    if(data.SRCTabData != null){
        let spellLevel = (data.SRCTabData.SpellLevel === 0) ? "Cantrip" : "Lvl "+data.SRCTabData.SpellLevel;
        spellName += '<sup class="is-inline ml-2 is-size-7 is-italic">'+spellLevel+'</sup>';
    }

    if(spellDataStruct.Spell.isArchived === 1){
        spellName += '<em class="pl-1">(archived)</em>';
    }

    $('#quickViewTitle').html(spellName);
    let qContent = $('#quickViewContent');

    // Display Level to right if just viewing spell from index
    if(data.SheetData == null && data.SpellSlotData == null){
        let spellLevel = (spellDataStruct.Spell.level === 0) ? "Cantrip" : "Lvl "+spellDataStruct.Spell.level;
        $('#quickViewTitleRight').html('<span class="pr-2">'+spellLevel+'</span>');
    }

    // Coloring Spell SLOT //
    if(data.SpellSlotData != null){ // Set Slot Color-Type //
        
        let typeStruct = getSpellTypeStruct(data.SpellSlotData.Slot.type);

        let displayColorTypes = function(typeStruct) {
            let redTypeIcon = (typeStruct.Red) ? 'fas fa-xs fa-circle' : 'far fa-xs fa-circle';
            let greenTypeIcon = (typeStruct.Green) ? 'fas fa-xs fa-circle' : 'far fa-xs fa-circle';
            let blueTypeIcon = (typeStruct.Blue) ? 'fas fa-xs fa-circle' : 'far fa-xs fa-circle';
    
            $('#quickViewTitleRight').html('<span class="pr-2"><span class="icon has-text-danger is-small cursor-clickable spellSlotRedType"><i class="'+redTypeIcon+'"></i></span><span class="icon has-text-success is-small cursor-clickable spellSlotGreenType"><i class="'+greenTypeIcon+'"></i></span><span class="icon has-text-link is-small cursor-clickable spellSlotBlueType"><i class="'+blueTypeIcon+'"></i></span></span>');

            $('.spellSlotRedType').click(function(){
                typeStruct.Red = !typeStruct.Red;
                data.SpellSlotData.Slot.type = getSpellTypeData(typeStruct);
                socket.emit("requestSpellSlotUpdate",
                    getCharIDFromURL(),
                    data.SpellSlotData.Slot);
                displayColorTypes(typeStruct);
                openSpellSRCTab(data.SpellSlotData.SpellSRC, data.SpellSlotData.Data);
            });
    
            $('.spellSlotGreenType').click(function(){
                typeStruct.Green = !typeStruct.Green;
                data.SpellSlotData.Slot.type = getSpellTypeData(typeStruct);
                socket.emit("requestSpellSlotUpdate",
                    getCharIDFromURL(),
                    data.SpellSlotData.Slot);
                displayColorTypes(typeStruct);
                openSpellSRCTab(data.SpellSlotData.SpellSRC, data.SpellSlotData.Data);
            });
    
            $('.spellSlotBlueType').click(function(){
                typeStruct.Blue = !typeStruct.Blue;
                data.SpellSlotData.Slot.type = getSpellTypeData(typeStruct);
                socket.emit("requestSpellSlotUpdate",
                    getCharIDFromURL(),
                    data.SpellSlotData.Slot);
                displayColorTypes(typeStruct);
                openSpellSRCTab(data.SpellSlotData.SpellSRC, data.SpellSlotData.Data);
            });
        };

        displayColorTypes(typeStruct);
    
    }

    // Coloring SPELL in Spellbook //
    if(data.SRCTabData != null && data.SRCTabData.SpellBookSpellID != null && data.SRCTabData.SpellType != null){

      let typeStruct = getSpellTypeStruct(data.SRCTabData.SpellType);

      let displayColorTypes = function(typeStruct) {
          let redTypeIcon = (typeStruct.Red) ? 'fas fa-xs fa-circle' : 'far fa-xs fa-circle';
          let greenTypeIcon = (typeStruct.Green) ? 'fas fa-xs fa-circle' : 'far fa-xs fa-circle';
          let blueTypeIcon = (typeStruct.Blue) ? 'fas fa-xs fa-circle' : 'far fa-xs fa-circle';
  
          $('#quickViewTitleRight').html('<span class="pr-2"><span class="icon has-text-danger is-small cursor-clickable spellSlotRedType"><i class="'+redTypeIcon+'"></i></span><span class="icon has-text-success is-small cursor-clickable spellSlotGreenType"><i class="'+greenTypeIcon+'"></i></span><span class="icon has-text-link is-small cursor-clickable spellSlotBlueType"><i class="'+blueTypeIcon+'"></i></span></span>');

          $('.spellSlotRedType').click(function(){
              typeStruct.Red = !typeStruct.Red;
              data.SRCTabData.SpellType = getSpellTypeData(typeStruct);
              updateSpellBookSpellType(data.SRCTabData.SpellBookSpellID, data.SRCTabData.SpellType);
              socket.emit("requestSpellTypeUpdate",
                  getCharIDFromURL(),
                  data.SRCTabData.SpellBookSpellID,
                  data.SRCTabData.SpellType);
              displayColorTypes(typeStruct);
              openSpellSRCTab(data.SRCTabData.SpellSRC, data.SRCTabData.Data);
          });
  
          $('.spellSlotGreenType').click(function(){
              typeStruct.Green = !typeStruct.Green;
              data.SRCTabData.SpellType = getSpellTypeData(typeStruct);
              updateSpellBookSpellType(data.SRCTabData.SpellBookSpellID, data.SRCTabData.SpellType);
              socket.emit("requestSpellTypeUpdate",
                  getCharIDFromURL(),
                  data.SRCTabData.SpellBookSpellID,
                  data.SRCTabData.SpellType);
              displayColorTypes(typeStruct);
              openSpellSRCTab(data.SRCTabData.SpellSRC, data.SRCTabData.Data);
          });
  
          $('.spellSlotBlueType').click(function(){
              typeStruct.Blue = !typeStruct.Blue;
              data.SRCTabData.SpellType = getSpellTypeData(typeStruct);
              updateSpellBookSpellType(data.SRCTabData.SpellBookSpellID, data.SRCTabData.SpellType);
              socket.emit("requestSpellTypeUpdate",
                  getCharIDFromURL(),
                  data.SRCTabData.SpellBookSpellID,
                  data.SRCTabData.SpellType);
              displayColorTypes(typeStruct);
              openSpellSRCTab(data.SRCTabData.SpellSRC, data.SRCTabData.Data);
          });
      };

      displayColorTypes(typeStruct);
  
    }


    if(data.SRCTabData != null){ // Remove from SpellBook //

        qContent.append('<button id="spellRemoveFromSpellBookBtn" class="button is-small is-danger is-outlined is-rounded is-fullwidth"><span>Remove Spell</span></button>');
        
        qContent.append('<hr class="m-2">');

        $('#spellRemoveFromSpellBookBtn').click(function(){
            prev_spellSRC = data.SRCTabData.SpellSRC;
            prev_spellData = data.SRCTabData.Data;
            socket.emit("requestSpellRemoveFromSpellBook",
                getCharIDFromURL(),
                data.SRCTabData.SpellSRC,
                spellID,
                data.SRCTabData.SpellLevel);
            closeQuickView();
        });
    }

    if(data.SpellSlotData != null){ // Clear from SpellSlots //

        qContent.append('<button id="spellClearSpellSlotBtn" class="button is-small is-danger is-outlined is-rounded is-fullwidth"><span>Clear Slot</span></button>');
        
        qContent.append('<hr class="m-2">');

        $('#spellClearSpellSlotBtn').click(function(){
            updateSpellSlot(null, data.SpellSlotData.Slot, data.SpellSlotData.SpellSRC, data.SpellSlotData.Data);
            closeQuickView();
        });
    }

    let spellTradition = null;
    let spellKeyAbility = null;
    if(data.SheetData != null){ // View and Cast from Sheet //

        let spellSRC = null;
        let spellUsed = null;
        if(sheetSpellType === 'CORE') {
            let spellBook = g_spellBookArray.find(spellBook => {
                return spellBook.SpellSRC === data.SheetData.Slot.SpellSRC;
            });
            spellTradition = spellBook.SpellList;
            spellSRC = spellBook.SpellSRC;
            spellKeyAbility = spellBook.SpellKeyAbility;
            spellUsed = data.SheetData.Slot.used;
        } else if(sheetSpellType === 'FOCUS') {
            let spellBook = g_spellBookArray.find(spellBook => {
                return spellBook.SpellSRC === data.SheetData.FocusSpell.SpellSRC;
            });
            spellTradition = spellBook.SpellList;
            spellSRC = spellBook.SpellSRC;
            spellKeyAbility = spellBook.SpellKeyAbility;
            if(spellDataStruct.Spell.level == 0) {
                spellUsed = false;
            } else {
                spellUsed = !g_focusOpenPoint;
            }
        } else if(sheetSpellType === 'INNATE') {
            spellTradition = data.SheetData.InnateSpell.SpellTradition;
            spellKeyAbility = data.SheetData.InnateSpell.KeyAbility;
            spellUsed = (data.SheetData.InnateSpell.TimesCast == data.SheetData.InnateSpell.TimesPerDay);
        }
        g_spellView_spellKeyAbility = spellKeyAbility;
        
        $('#quickViewTitleRight').html('<span class="pr-2">'+capitalizeWord(spellTradition)+'</span>');

        let spellAttack = 0;
        let spellDC = 0;
        if(spellTradition === 'ARCANE'){
            spellAttack = data.SheetData.Data.ArcaneSpellAttack;
            spellDC = data.SheetData.Data.ArcaneSpellDC;
        } else if(spellTradition === 'DIVINE'){
            spellAttack = data.SheetData.Data.DivineSpellAttack;
            spellDC = data.SheetData.Data.DivineSpellDC;
        } else if(spellTradition === 'OCCULT'){
            spellAttack = data.SheetData.Data.OccultSpellAttack;
            spellDC = data.SheetData.Data.OccultSpellDC;
        } else if(spellTradition === 'PRIMAL'){
            spellAttack = data.SheetData.Data.PrimalSpellAttack;
            spellDC = data.SheetData.Data.PrimalSpellDC;
        }

        /*
            "You're always trained in spell attack rolls and spell DCs
            for your innate spells, even if you aren't otherwise trained
            in spell attack rolls or spell DCs. If your proficiency in
            spell attack rolls or spell DCs is expert or better, apply
            that proficiency to your innate spells, too."
        */
        if(sheetSpellType === 'INNATE'){
            let trainingProf = getProfNumber(1, g_character.level);
            spellAttack = (trainingProf > spellAttack) ? trainingProf : spellAttack;
            spellDC = (trainingProf > spellDC) ? trainingProf : spellDC;
        }

        let abilityMod = getModOfValue(spellKeyAbility);
        spellAttack += abilityMod;
        spellDC += abilityMod;
        
        spellAttack = signNumber(spellAttack);
        spellDC += 10;

        if(sheetSpellType === 'CORE' || sheetSpellType === 'FOCUS' || sheetSpellType === 'INNATE') {
            if(spellUsed){
                qContent.append('<button id="spellUnCastSpellBtn" class="button is-small is-info is-rounded is-outlined is-fullwidth mb-2"><span>Recover</span></button>');
            } else {
                qContent.append('<button id="spellCastSpellBtn" class="button is-small is-info is-rounded is-fullwidth mb-2"><span>Cast Spell</span></button>');
            }
        }

        qContent.append('<div class="columns is-mobile is-marginless text-center"><div class="column is-paddingless is-6"><strong>Attack</strong></div><div class="column is-paddingless is-6"><strong>DC</strong></div></div>');
        qContent.append('<div class="columns is-mobile is-marginless text-center"><div class="column is-paddingless is-6"><p class="pr-1 stat-roll-btn">'+spellAttack+'</p></div><div class="column is-paddingless is-6"><p>'+spellDC+'</p></div></div>');
        if(typeof gOption_hasDiceRoller !== 'undefined' && gOption_hasDiceRoller) { refreshStatRollButtons(); }

        qContent.append('<hr class="m-2">');

        if(sheetSpellType === 'CORE') {
            $('#spellCastSpellBtn').click(function(){
                if(spellDataStruct.Spell.level == 0) {
                    closeQuickView();
                } else {
                    data.SheetData.Slot.used = true;
                    socket.emit("requestSpellSlotUpdate",
                        getCharIDFromURL(),
                        data.SheetData.Slot);
                    let spellSlotsArray = g_spellSlotsMap.get(spellSRC);
                    if(spellSlotsArray != null){
                        spellSlotsArray = updateSlotUsed(spellSlotsArray, data.SheetData.Slot.slotID, true);
                    }
                    g_spellSlotsMap.set(spellSRC, spellSlotsArray);
                    displaySpellsAndSlots();
                    closeQuickView();
                }
            });
    
            $('#spellUnCastSpellBtn').click(function(){
                data.SheetData.Slot.used = false;
                socket.emit("requestSpellSlotUpdate",
                    getCharIDFromURL(),
                    data.SheetData.Slot);
                let spellSlotsArray = g_spellSlotsMap.get(spellSRC);
                if(spellSlotsArray != null){
                    spellSlotsArray = updateSlotUsed(spellSlotsArray, data.SheetData.Slot.slotID, false);
                }
                g_spellSlotsMap.set(spellSRC, spellSlotsArray);
                displaySpellsAndSlots();
                closeQuickView();
            });
        }

        if(sheetSpellType === 'FOCUS') {
            $('#spellCastSpellBtn').click(function(){
                if(spellDataStruct.Spell.level != 0) {
                    displayFocusCastingsSet('ADD');
                }
                closeQuickView();
            });
    
            $('#spellUnCastSpellBtn').click(function(){
                displayFocusCastingsSet('REMOVE');
                closeQuickView();
            });
        }

        if(sheetSpellType === 'INNATE') {
            $('#spellCastSpellBtn').click(function(){
                if(spellDataStruct.Spell.level == 0) {
                    closeQuickView();
                } else {
                    let innateSpellIndex = g_innateSpellArray.indexOf(data.SheetData.InnateSpell);
                    let newTimesCast = data.SheetData.InnateSpell.TimesCast+1;
                    socket.emit("requestInnateSpellCastingUpdate",
                        cloneObj(data.SheetData.InnateSpell),
                        newTimesCast);
                        data.SheetData.InnateSpell.TimesCast = newTimesCast;
                    g_innateSpellArray[innateSpellIndex] = data.SheetData.InnateSpell;
                    displaySpellsInnate();
                    closeQuickView();
                }
            });
    
            $('#spellUnCastSpellBtn').click(function(){
                let innateSpellIndex = g_innateSpellArray.indexOf(data.SheetData.InnateSpell);
                let newTimesCast = data.SheetData.InnateSpell.TimesCast-1;
                socket.emit("requestInnateSpellCastingUpdate",
                    cloneObj(data.SheetData.InnateSpell),
                    newTimesCast);
                    data.SheetData.InnateSpell.TimesCast = newTimesCast;
                g_innateSpellArray[innateSpellIndex] = data.SheetData.InnateSpell;
                displaySpellsInnate();
                closeQuickView();
            });
        }

    }

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

    spellDataStruct.Tags = spellDataStruct.Tags.sort(
        function(a, b) {
            return a.name > b.name ? 1 : -1;
        }
    );
    for(const tag of spellDataStruct.Tags){
        let tagDescription = tag.description;
        if(tagDescription.length > g_tagStringLengthMax){
            tagDescription = tagDescription.substring(0, g_tagStringLengthMax);
            tagDescription += '...';
        }
        tagsInnerHTML += '<button class="button is-paddingless px-2 is-marginless mr-2 mb-1 is-very-small is-info has-tooltip-bottom has-tooltip-multiline tagButton" data-tooltip="'+processTextRemoveIndexing(tagDescription)+'">'+tag.name+getImportantTraitIcon(tag)+'</button>';
    }

    if(tagsInnerHTML != ''){
        qContent.append('<div class="buttons is-marginless is-centered">'+tagsInnerHTML+'</div>');
        qContent.append('<hr class="mb-2 mt-1">');
    }

    $('.tagButton').click(function(){
        let tagName = $(this).text();
        openQuickView('tagView', {
            TagName : tagName,
            _prevBackData: {Type: g_QViewLastType, Data: g_QViewLastData},
        }, $('#quickviewDefault').hasClass('is-active'));
    });

    // Traditions
    if(data.SheetData == null){
        let traditionsString = '';
        let spellTraditions = JSON.parse(spellDataStruct.Spell.traditions);
        for(let tradition of spellTraditions){
            traditionsString += tradition+', ';
        }
        traditionsString = traditionsString.slice(0, -2);// Trim off that last ', '
        if(traditionsString != '') {
          qContent.append('<div class="tile"><div class="tile is-child"><p class="text-left"><strong>Traditions</strong> '+traditionsString+'</p></div></div>');
        }
    }

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
    componentsString = componentsString.replace(`somatic`, `(trait: somatic)`);
    componentsString = componentsString.replace(`verbal`, `(trait: verbal)`);
    componentsString = componentsString.replace(`material`, `(trait: material)`);
    componentsString = componentsString.replace(`focus`, `(trait: focus)`);
    if(typeof g_allTags !== 'undefined' && g_allTags != null) {
      componentsString = componentsString.replace(regexTraitLink, handleTraitLink);// From text-processing.js
    } else {
      componentsString = componentsString.replace(regexTraitLink, '<span class="is-underlined-warning">$2</span>');
    }

    qContent.append('<div class="tile"><div class="tile is-child"><p class="text-left"><strong>Cast</strong> '+castActions+' '+componentsString+'</p></div></div>');

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

    qContent.append('<div class="tile"><div class="tile is-child"><p class="text-left negative-indent">'+ctrString+'</p></div></div>');


    // Range // Area // Targets //
    let ratString = '';

    let spellRange = '';
    if(spellDataStruct.Spell.range != null){
        spellRange = '<strong>Range</strong> <span id="qContent-spell-range">'+spellDataStruct.Spell.range+'</span>; ';
    }
    ratString += spellRange;

    let spellArea = '';
    if(spellDataStruct.Spell.area != null){
        spellArea = '<strong>Area</strong> <span id="qContent-spell-area">'+spellDataStruct.Spell.area+'</span>; ';
    }
    ratString += spellArea;

    let spellTargets = '';
    if(spellDataStruct.Spell.targets != null){
        spellTargets = '<strong>Targets</strong> <span id="qContent-spell-targets">'+spellDataStruct.Spell.targets+'</span>; ';
    }
    ratString += spellTargets;
    ratString = ratString.slice(0, -2);// Trim off that last '; '

    qContent.append('<div class="tile"><div class="tile is-child"><p class="text-left negative-indent">'+ratString+'</p></div></div>');

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
        spellDuration = '<strong>Duration</strong> <span id="qContent-spell-duration">'+spellDataStruct.Spell.duration+'</span>; ';
    }
    sdString += spellDuration;
    sdString = sdString.slice(0, -2);// Trim off that last '; '

    qContent.append('<div class="tile"><div class="tile is-child"><p class="text-left negative-indent">'+sdString+'</p></div></div>');

    qContent.append('<hr class="m-2">');

    let spellDescription = spellDataStruct.Spell.description;// Let heighten potentially modify spellDescription
    qContent.append('<div id="qContent-spell-description"></div>');

    spellDescription = pre_spellModTextProcessor(spellDescription);

    if(spellDataStruct.Spell.heightenedOneVal != null || spellDataStruct.Spell.heightenedTwoVal != null || spellDataStruct.Spell.heightenedThreeVal != null) {

        let autoHeightenSpells = false;
        if(isSheetPage()){ autoHeightenSpells = gOption_hasAutoHeightenSpells; }
        if(true){ // !autoHeightenSpells || spellHeightenLevel == null

            let hOneText = null;
            if(spellDataStruct.Spell.heightenedOneVal != null){
                let heightenedTextName = getHeightenedTextFromCodeName(spellDataStruct.Spell.heightenedOneVal);
                let hText;
                if(heightenedTextName === "CUSTOM"){
                    hText = '<strong>Heightened</strong> '+spellDataStruct.Spell.heightenedOneText;
                } else {
                    hText = '<strong>Heightened ('+heightenedTextName+')</strong> '+spellDataStruct.Spell.heightenedOneText;
                }
                hText = pre_spellModTextProcessor(hText);

                // Auto Heighten Spell
                if(autoHeightenSpells && spellHeightenLevel != null){
                  let heightenedOneCount = getHeightenedCount(spellDataStruct.Spell.level, spellHeightenLevel, spellDataStruct.Spell.heightenedOneVal);
                  hText = getAutoHeightenedSpellText(heightenedOneCount, spellDataStruct.Spell.heightenedOneText, heightenedTextName);
                }
                hOneText = hText;

            }
    
            let hTwoText = null;
            if(spellDataStruct.Spell.heightenedTwoVal != null){
                let hText = '<strong>Heightened ('+getHeightenedTextFromCodeName(spellDataStruct.Spell.heightenedTwoVal)+')</strong> '+spellDataStruct.Spell.heightenedTwoText;
                hText = pre_spellModTextProcessor(hText);

                // Auto Heighten Spell
                if(autoHeightenSpells && spellHeightenLevel != null){
                  let heightenedTwoCount = getHeightenedCount(spellDataStruct.Spell.level, spellHeightenLevel, spellDataStruct.Spell.heightenedTwoVal);
                  hText = getAutoHeightenedSpellText(heightenedTwoCount, spellDataStruct.Spell.heightenedTwoText, getHeightenedTextFromCodeName(spellDataStruct.Spell.heightenedTwoVal));
                }
                hTwoText = hText;

            }
    
            let hThreeText = null;
            if(spellDataStruct.Spell.heightenedThreeVal != null){
                let hText = '<strong>Heightened ('+getHeightenedTextFromCodeName(spellDataStruct.Spell.heightenedThreeVal)+')</strong> '+spellDataStruct.Spell.heightenedThreeText;
                hText = pre_spellModTextProcessor(hText);

                // Auto Heighten Spell
                if(autoHeightenSpells && spellHeightenLevel != null){
                  let heightenedThreeCount = getHeightenedCount(spellDataStruct.Spell.level, spellHeightenLevel, spellDataStruct.Spell.heightenedThreeVal);
                  hText = getAutoHeightenedSpellText(heightenedThreeCount, spellDataStruct.Spell.heightenedThreeText, getHeightenedTextFromCodeName(spellDataStruct.Spell.heightenedThreeVal));
                }
                hThreeText = hText;

            }
    
            let hFourText = null;
            if(spellDataStruct.Spell.heightenedFourVal != null){
                let hText = '<strong>Heightened ('+getHeightenedTextFromCodeName(spellDataStruct.Spell.heightenedFourVal)+')</strong> '+spellDataStruct.Spell.heightenedFourText;
                hText = pre_spellModTextProcessor(hText);

                // Auto Heighten Spell
                if(autoHeightenSpells && spellHeightenLevel != null){
                  let heightenedFourCount = getHeightenedCount(spellDataStruct.Spell.level, spellHeightenLevel, spellDataStruct.Spell.heightenedFourVal);
                  hText = getAutoHeightenedSpellText(heightenedFourCount, spellDataStruct.Spell.heightenedFourText, getHeightenedTextFromCodeName(spellDataStruct.Spell.heightenedFourVal));
                }
                hFourText = hText;
                
            }

            // Auto Heighten Spell
            if(autoHeightenSpells && spellHeightenLevel != null){
              // Apply heighten changes to spell
              let spellData = {
                spellDescription,
                spellRange: $('#qContent-spell-range').html(),
                spellArea: $('#qContent-spell-area').html(),
                spellTargets: $('#qContent-spell-targets').html(),
                spellDuration: $('#qContent-spell-duration').html(),
              };
              if(hFourText != null){
                spellData = modifySpellByHeighten(spellData, hFourText);
                hFourText = spellData.hText;
              }
              if(hThreeText != null){
                spellData = modifySpellByHeighten(spellData, hThreeText);
                hThreeText = spellData.hText;
              }
              if(hTwoText != null){
                spellData = modifySpellByHeighten(spellData, hTwoText);
                hTwoText = spellData.hText;
              }
              if(hOneText != null){
                spellData = modifySpellByHeighten(spellData, hOneText);
                hOneText = spellData.hText;
              }
              spellDescription = spellData.spellDescription;
              $('#qContent-spell-range').html(processTextOnlyVariablesAndTooltips(spellData.spellRange));
              $('#qContent-spell-area').html(processTextOnlyVariablesAndTooltips(spellData.spellArea));
              $('#qContent-spell-targets').html(processTextOnlyVariablesAndTooltips(spellData.spellTargets));
              $('#qContent-spell-duration').html(processTextOnlyVariablesAndTooltips(spellData.spellDuration));
            }

            // Display hText
            if(hOneText != null && hOneText != ''){
              hOneText = post_spellModTextProcessor(hOneText);
              qContent.append('<hr class="m-2">');
              qContent.append('<div class="negative-indent">'+processText(hOneText, true, true, 'MEDIUM')+'</div>');
            }
            if(hTwoText != null && hTwoText != ''){
              hTwoText = post_spellModTextProcessor(hTwoText);
              qContent.append('<hr class="m-2">');
              qContent.append('<div class="negative-indent">'+processText(hTwoText, true, true, 'MEDIUM')+'</div>');
            }
            if(hThreeText != null && hThreeText != ''){
              hThreeText = post_spellModTextProcessor(hThreeText);
              qContent.append('<hr class="m-2">');
              qContent.append('<div class="negative-indent">'+processText(hThreeText, true, true, 'MEDIUM')+'</div>');
            }
            if(hFourText != null && hFourText != ''){
              hFourText = post_spellModTextProcessor(hFourText);
              qContent.append('<hr class="m-2">');
              qContent.append('<div class="negative-indent">'+processText(hFourText, true, true, 'MEDIUM')+'</div>');
            }

        }

    }

    
    spellDescription = post_spellModTextProcessor(spellDescription);
    $('#qContent-spell-description').append(processText(spellDescription, true, true, 'MEDIUM'));

}

///

function pre_spellModTextProcessor(text){
    if(!isSheetPage()) { return text; }
    if(g_spellView_spellKeyAbility == null) { return text; }

    text = text.replace('plus your spellcasting modifier', '+ SPELL_MODIFIER');
    text = text.replace('plus your spellcasting ability modifier', '+ SPELL_MODIFIER');

    text = text.replace('equal to your spellcasting ability modifier', 'SPELL_MODIFIER');
    text = text.replace('your spellcasting ability modifier', 'SPELL_MODIFIER');

    return text;
}

function post_spellModTextProcessor(text){
  if(!isSheetPage()) { return text; }
  if(g_spellView_spellKeyAbility == null) { return text; }

  text = text.replace('SPELL_MODIFIER', '{pre_'+g_spellView_spellKeyAbility+'_MOD|'+lengthenAbilityType(g_spellView_spellKeyAbility)+' Modifier}');
  
  return text;
}

///

function modifySpellByHeighten(spellData, hText){

  let spellDescription = spellData.spellDescription;
  let spellRange = spellData.spellRange;
  let spellArea = spellData.spellArea;
  let spellTargets = spellData.spellTargets;
  let spellDuration = spellData.spellDuration;
  
  // Increase Damage
  if(hText.toLowerCase().includes('damage') && (hText.toLowerCase().includes('increase ') || hText.toLowerCase().includes('increases '))){

    /////////
    let increaseDamageByProcessor = function(match, overrideExisting=false) {

      /////////
      let findDamageInSpell = function(spellDescription, match, overrideExisting){

        /////////
        let handleDamageReplacement = function(sub_match, startOfStr, dieNum, dieTypeStr, dieTypeNum, spellModStr, endOfStr, damageType) {
          let newDamage = '';
          let extraDamageModStr = '';

          if(dieTypeStr != ''){// There are dice

            if(overrideExisting){
              newDamage = match[4]+match[5];
            } else {
              newDamage = (parseInt(dieNum)+parseInt(match[4]))+match[5];
            }
            if(match[7] != ''){
              // Because this mod will be displayed in a tooltip, if SPELL_MODIFIER, find mod now and bake into string
              if(match[7] == ' + SPELL_MODIFIER'){
                let sheetVar = acquireSheetVariable('pre_'+g_spellView_spellKeyAbility+'_MOD');
                newDamage += ' + '+sheetVar;
              } else {
                newDamage += match[7];
              }
            } else {
              extraDamageModStr = spellModStr;
            }

            return startOfStr+('{cyan:'+newDamage+'|Heighten: '+dieNum+dieTypeStr+' ➙ '+newDamage.replace(/ /g,'')+'}')+extraDamageModStr+endOfStr;

          } else {// No dice, just flat number

            newDamage = match[4]+match[5];

            // Convert SPELL_MODIFIER to actual number
            let spellModStrConverted;
            if(spellModStr == 'SPELL_MODIFIER'){
              let sheetVar = acquireSheetVariable('pre_'+g_spellView_spellKeyAbility+'_MOD');
              spellModStrConverted = sheetVar;
            } else if (spellModStr != '') {
              spellModStrConverted = spellModStr;
            } else if (dieNum != ''){
              spellModStrConverted = dieNum;
            }

            let bonusDamage = spellModStrConverted;

            // If the heighten is also adding flat damage or SPELL_MODIFIER, add it to newDamage as well
            if(match[7] != ''){
              // Because this mod will be displayed in a tooltip, if SPELL_MODIFIER, find mod now and bake into string
              if(match[7] == ' + SPELL_MODIFIER'){
                let sheetVar = acquireSheetVariable('pre_'+g_spellView_spellKeyAbility+'_MOD');
                bonusDamage += ' + '+sheetVar;
              } else {
                bonusDamage += match[7];
              }
            }

            try {
              bonusDamage = parseInt(math.evaluate(bonusDamage))+'';
            } catch (err) {}
            
            // If not overriding, add original bonusDamage to newDamage
            if(!overrideExisting){
              newDamage += ' + '+bonusDamage;
            }

            try {
              newDamage = parseInt(math.evaluate(newDamage))+'';
            } catch (err) {}

            return startOfStr+('{cyan:'+newDamage+'|Heighten: '+spellModStrConverted+' ➙ '+newDamage.replace(/ /g,'')+'}')+endOfStr;

          }
        };
        /////////

        let damageType = match[2].toLowerCase().replace(/[().]/g, '');

        // Check if word before damage can be located in spellDesc (Ex. splash damage)
        // Ex. Find 'XdX splash (?) damage'
        // Double escape because string will remove an escape before regex applies
        let newSpellDescription = spellDescription.replace(
          new RegExp('()(\\d+)(d(\\d+)|)( \\+ SPELL_MODIFIER|)( '+damageType+' ([^ \\n]+) damage)', 'g'), handleDamageReplacement);
          
        // Else try find 'XdX (?) damage'
        if(newSpellDescription == spellDescription){
          newSpellDescription = spellDescription.replace(/()(\d+)(d(\d+)|)( \+ SPELL_MODIFIER|)( ([^ \n]+) damage)/g, handleDamageReplacement);
        }

        // Else try find 'XdX damage'
        if(newSpellDescription == spellDescription){
          newSpellDescription = spellDescription.replace(/()(\d+)(d(\d+)|)( \+ SPELL_MODIFIER|)( ()damage)/g, handleDamageReplacement);
        }

        // Else try find 'equal to XdX.'
        if(newSpellDescription == spellDescription){
          newSpellDescription = spellDescription.replace(/(equal to )(\d+)(d(\d+)|)( \+ SPELL_MODIFIER|)([.,;]|$)/g, handleDamageReplacement);
        }

        // Else try to find 'SPELL_MODIFIER splash (?) damage'
        if(newSpellDescription == spellDescription){
          newSpellDescription = spellDescription.replace(
            new RegExp('()()(())(SPELL_MODIFIER)( '+damageType+' ([^ \\n]+) damage)', 'g'), handleDamageReplacement);
        }
          
        // Else try to find 'SPELL_MODIFIER (?) damage'
        if(newSpellDescription == spellDescription){
          newSpellDescription = spellDescription.replace(/()()(())(SPELL_MODIFIER)( ([^ \n]+) damage)/g, handleDamageReplacement);
        }

        return newSpellDescription;

      };
      /////////

      let newSpellDescription = findDamageInSpell(spellDescription, match, overrideExisting);
      if(newSpellDescription == spellDescription){

        // Can it find without tooltips (aka, has it already been found)
        newSpellDescription = findDamageInSpell(processTextRemoveTooltips(spellDescription), match, overrideExisting);

        if(newSpellDescription == spellDescription){
          // Can't find at all, failed
          let newMatch0 = match[0].replace(match[4]+match[5]+match[7], '{red_underline:'+match[4]+match[5]+'|Failed to update damage in spell}'+match[7]);
          hText = hText.replace(match[0], newMatch0);
        } else {
          // Already found, okay
          let newMatch0 = match[0].replace(match[4]+match[5]+match[7], '{normal:'+match[4]+match[5]+'|Overridden}'+match[7]);
          hText = hText.replace(match[0], newMatch0);
        }

      } else {
        // Found, okay
        let newMatch0 = match[0].replace(match[4]+match[5]+match[7], '{cyan_underline:'+match[4]+match[5]+'|Applied to spell}'+match[7]);
        hText = hText.replace(match[0], newMatch0);

        spellDescription = newSpellDescription;
      }

    };
    /////////

    if(hText.includes('damage by')){
      let matches = hText.matchAll(getHeightenDamageRegex('damage by'));
      for(let match of matches){
        if(match[11] != null && damageInvalidEndWordList().includes(match[11].trim())) { continue; }
        increaseDamageByProcessor(match);
      }
    }

    if(hText.includes('damage increases by')){
      let matches = hText.matchAll(getHeightenDamageRegex('damage increases by'));
      for(let match of matches){
        if(match[11] != null && damageInvalidEndWordList().includes(match[11].trim())) { continue; }
        increaseDamageByProcessor(match);
      }
    } else if(hText.includes('increases by')){
      let matches = hText.matchAll(getHeightenDamageRegex('increases by'));
      for(let match of matches){
        if(match[11] != null && damageInvalidEndWordList().includes(match[11].trim())) { continue; }
        increaseDamageByProcessor(match);
      }
    }

    if(hText.includes('damage on a critical hit by')){
      let matches = hText.matchAll(getHeightenDamageRegex('damage on a critical hit by'));
      for(let match of matches){
        if(match[11] != null && damageInvalidEndWordList().includes(match[11].trim())) { continue; }
        increaseDamageByProcessor(match);
      }
    }

    if(hText.includes('damage to')){
      let matches = hText.matchAll(getHeightenDamageRegex('damage to'));
      for(let match of matches){
        if(match[11] != null && damageInvalidEndWordList().includes(match[11].trim())) { continue; }
        increaseDamageByProcessor(match, true);
      }
    }

    if(hText.includes('damage increases to')){
      let matches = hText.matchAll(getHeightenDamageRegex('damage increases to'));
      for(let match of matches){
        if(match[11] != null && damageInvalidEndWordList().includes(match[11].trim())) { continue; }
        increaseDamageByProcessor(match, true);
      }
    } else if(hText.includes('increases by')){
      let matches = hText.matchAll(getHeightenDamageRegex('increases to'));
      for(let match of matches){
        if(match[11] != null && damageInvalidEndWordList().includes(match[11].trim())) { continue; }
        increaseDamageByProcessor(match, true);
      }
    }

  }

  // Hardness
  if(hText.toLowerCase().includes('hardness')){
    let hardnessMatches = hText.matchAll(/has hardness (\d+)/ig);
    for(let match of hardnessMatches){
  
      /////////
      let findHardnessInSpell = function(spellDescription, match){
  
        let newSpellDescription = spellDescription.replace(/(Hardness )(\d+)/i, '$1{cyan:'+match[1]+'|Heighten: $2 ➙ '+match[1]+'}');
        return newSpellDescription;
  
      };
      /////////
  
      let newSpellDescription = findHardnessInSpell(spellDescription, match);
      if(newSpellDescription == spellDescription){
  
        // Can it find without tooltips (aka, has it already been found)
        newSpellDescription = findHardnessInSpell(processTextRemoveTooltips(spellDescription), match);
  
        if(newSpellDescription == spellDescription){
          // Can't find at all, failed
          let newMatch0 = match[0].replace(match[1], '{red_underline:'+match[1]+'|Failed to update hardness in spell}');
          hText = hText.replace(match[0], newMatch0);
        } else {
          // Already found, okay
          let newMatch0 = match[0].replace(match[1], '{normal:'+match[1]+'|Overridden}');
          hText = hText.replace(match[0], newMatch0);
        }
  
      } else {
        // Found, okay
        let newMatch0 = match[0].replace(match[1], '{cyan_underline:'+match[1]+'|Applied to spell}');
        hText = hText.replace(match[0], newMatch0);
  
        spellDescription = newSpellDescription;
      }
  
    }
  }

  // Target
  if(spellTargets != null && hText.includes('target')){

    /////////
    let updateTargetsProcessor = function(match) {
      // Skip if match ends with number,
      if(match[1].match(/[0-9]$/) != null) { return; }
      // Skip if match does not contain a number or 'any number of'
      if(match[1].match(/[0-9]|any number of/i) == null) { return; }
  
      let spellTargetsCleaned = processTextRemoveTooltips(spellTargets);
      if(spellTargetsCleaned != spellTargets){
        // Already found, okay
        let newMatch0 = match[0].replace(match[1], '{normal:'+match[1]+'|Overridden}');
        hText = hText.replace(match[0], newMatch0);
      } else {
        // Found, okay
        let newMatch0 = match[0].replace(match[1], '{cyan_underline:'+match[1]+'|Applied to spell}');
        hText = hText.replace(match[0], newMatch0);
  
        spellTargets = '{cyan:'+match[1]+'|Heightened from \''+spellTargets+'\'}';
      }
    };

    let targetMatches = hText.matchAll(/you can target ([^.,;\n]+)/gi);
    for(let match of targetMatches){
      updateTargetsProcessor(match);
    }
  
    let targetMatches2 = hText.matchAll(/the spell can target ([^.,;\n]+)/gi);
    for(let match of targetMatches2){
      updateTargetsProcessor(match);
    }

  }

  // Range
  if(spellRange != null && hText.includes('range')){

    /////////
    let updateRangeProcessor = function(match) {
      // Skip if match ends with number,
      if(match[2].match(/[0-9]$/) != null) { return; }
  
      let spellRangeCleaned = processTextRemoveTooltips(spellRange);
      if(spellRangeCleaned != spellRange){
        // Already found, okay
        let newMatch0 = match[0].replace(match[1]+match[2], '{normal:'+match[1]+match[2]+'|Overridden}');
        hText = hText.replace(match[0], newMatch0);
      } else {
        // Found, okay
        let newMatch0 = match[0].replace(match[1]+match[2], '{cyan_underline:'+match[1]+match[2]+'|Applied to spell}');
        hText = hText.replace(match[0], newMatch0);
  
        spellRange = '{cyan:'+match[1]+match[2]+'|Heightened from \''+spellRange+'\'}';
      }
    };

    let rangeMatches = hText.matchAll(/range increases to (\d+)([^.,;\n]+)/gi);
    for(let match of rangeMatches){
      updateRangeProcessor(match);
    }

  }

  // Duration
  if(spellDuration != null && hText.includes('duration')){

    /////////
    let updateDurationProcessor = function(match) {
      // Skip if match ends with number,
      if(match[2].match(/[0-9]$/) != null) { return; }
  
      let spellDurationCleaned = processTextRemoveTooltips(spellDuration);
      if(spellDurationCleaned != spellDuration){
        // Already found, okay
        let newMatch0 = match[0].replace(match[2], '{normal:'+match[2]+'|Overridden}');
        hText = hText.replace(match[0], newMatch0);
      } else {
        // Found, okay
        let newMatch0 = match[0].replace(match[2], '{cyan_underline:'+match[2]+'|Applied to spell}');
        hText = hText.replace(match[0], newMatch0);
  
        spellDuration = '{cyan:'+match[2]+'|Heightened from \''+spellDuration+'\'}';
      }
    };

    let durationMatches = hText.matchAll(/(duration is |duration increases to |duration of the spell is |duration becomes |duration lasts |the duration to |duration you can Sustain the Spell increases to )([^.,;\n]+)/gi);
    for(let match of durationMatches){
      updateDurationProcessor(match);
    }

  }

  // Area
  if(spellArea != null && hText.includes('area')){

    /////////
    let updateAreaProcessor = function(match) {
      // Skip if match ends with number,
      if(match[2].match(/[0-9]$/) != null) { return; }
  
      let spellAreaCleaned = processTextRemoveTooltips(spellArea);
      if(spellAreaCleaned != spellArea){
        // Already found, okay
        let newMatch0 = match[0].replace(match[2], '{normal:'+match[2]+'|Overridden}');
        hText = hText.replace(match[0], newMatch0);
      } else {
        // Found, okay
        let newMatch0 = match[0].replace(match[2], '{cyan_underline:'+match[2]+'|Applied to spell}');
        hText = hText.replace(match[0], newMatch0);
  
        spellArea = '{cyan:'+match[2]+'|Heightened from \''+spellArea+'\'}';
      }
    };

    let areaMatches = hText.matchAll(/(area increases to a )([^.,;\n]+)/gi);
    for(let match of areaMatches){
      updateAreaProcessor(match);
    }

  }

  /*
  // General purpose applying
  let hTextParts = hText.split(/[~,.;]/);
  for(let i = 0; i < hTextParts.length; i++){
    if(i == 0) { continue; }
    let hTextPart = hTextParts[i];
    if(hTextPart == '') { continue; }
    // If there are already tooltips, skip
    if(hTextPart != processTextRemoveTooltips(hTextPart)){ continue; }

    console.log(hTextPart);
  }
  */

  spellData.spellDescription = spellDescription;
  spellData.spellRange = spellRange;
  spellData.spellArea = spellArea;
  spellData.spellTargets = spellTargets;
  spellData.spellDuration = spellDuration;
  spellData.hText = hText;

  return spellData;
}

function getHeightenDamageRegex(textBefore){
  // Double escape because string will remove an escape before regex applies
  return new RegExp('( |^)([^ \\n]*)( |^)'+textBefore+' (\\d+)(d(\\d+)|)(( \\+ |\\+)(SPELL_MODIFIER|\\d+)|)([ .,;]|$)([^ .,;\\n]*|$)', 'g');
}
function damageInvalidEndWordList(){
  return ['feet'];
}

let g_tempAutoHeightenCount = null;
function getAutoHeightenedSpellText(hCount, hText, hVal){
    if(hCount <= 0){ return ''; }
    hText = pre_spellModTextProcessor(hText);
    g_tempAutoHeightenCount = hCount;

    let text = hText;
    text = text.replace(/by (\d+)d(\d+)([ .,;]|$)/g, handleSpellAutoHeightenedIncrease);
    text = text.replace(/by (\d+)d(\d+)\+(\d+)([ .,;]|$)/g, handleSpellAutoHeightenedIncreaseBonus);
    text = text.replace(/by (\d+)([ .,;]|$)/g, handleSpellAutoHeightenedIncreaseAnyNumber);

    if(text === hText){
        text = '';
        for (let i = 0; i < hCount; i++) {
            text += '~ : '+hText;
        }
    } else {
        text = '~ : '+text;
    }

    g_tempAutoHeightenCount = null;
    
    let finalHeightenText = '\n**Heightened'+((hVal !== 'CUSTOM') ? ' ('+hVal+')' : '')+'**';
    if(hCount > 1) {
      finalHeightenText += '<span class="is-size-6-5"> <i class="fas fa-caret-right"></i><span class="is-italic"> Improved <span class="has-text-cyan">'+hCount+'</span> times</span></span>';
    }
    return finalHeightenText+'\n'+text;

}

function handleSpellAutoHeightenedIncrease(match, dieAmount, dieType, endingChar){
    dieAmount = dieAmount*g_tempAutoHeightenCount;
    return 'by '+dieAmount+'d'+dieType+''+endingChar;
}

function handleSpellAutoHeightenedIncreaseBonus(match, dieAmount, dieType, bonusAmount, endingChar){
    dieAmount = dieAmount*g_tempAutoHeightenCount;
    bonusAmount = bonusAmount*g_tempAutoHeightenCount;
    return 'by '+dieAmount+'d'+dieType+'+'+bonusAmount+''+endingChar;
}

function handleSpellAutoHeightenedIncreaseAnyNumber(match, numAmount, endingChar){
  numAmount = numAmount*g_tempAutoHeightenCount;
  return 'by '+numAmount+''+endingChar;
}

// Spell Utils //
function getHeightenedTextFromCodeName(codeName){
    switch(codeName) {
      case "PLUS_ONE": return "+1";
      case "PLUS_TWO": return "+2";
      case "PLUS_THREE": return "+3";
      case "PLUS_FOUR": return "+4";
      case "LEVEL_2": return "2nd";
      case "LEVEL_3": return "3rd";
      case "LEVEL_4": return "4th";
      case "LEVEL_5": return "5th";
      case "LEVEL_6": return "6th";
      case "LEVEL_7": return "7th";
      case "LEVEL_8": return "8th";
      case "LEVEL_9": return "9th";
      case "LEVEL_10": return "10th";
      case "CUSTOM": return "CUSTOM";
      default: return codeName;
    }
}
  
function getHeightenedCount(spellLevel, spellHeightenLevel, heightenName){
    if(spellHeightenLevel == -1) { return 0; }
    if(spellLevel === 0){ spellLevel = 1; } // Cantrips are treated as 1st level
    switch(heightenName) {
      case "PLUS_ONE": return Math.floor(spellHeightenLevel-spellLevel);
      case "PLUS_TWO": return Math.floor((spellHeightenLevel-spellLevel)/2);
      case "PLUS_THREE": return Math.floor((spellHeightenLevel-spellLevel)/3);
      case "PLUS_FOUR": return Math.floor((spellHeightenLevel-spellLevel)/4);
      case "LEVEL_2": return (spellHeightenLevel >= 2) ? 1 : 0;
      case "LEVEL_3": return (spellHeightenLevel >= 3) ? 1 : 0;
      case "LEVEL_4": return (spellHeightenLevel >= 4) ? 1 : 0;
      case "LEVEL_5": return (spellHeightenLevel >= 5) ? 1 : 0;
      case "LEVEL_6": return (spellHeightenLevel >= 6) ? 1 : 0;
      case "LEVEL_7": return (spellHeightenLevel >= 7) ? 1 : 0;
      case "LEVEL_8": return (spellHeightenLevel >= 8) ? 1 : 0;
      case "LEVEL_9": return (spellHeightenLevel >= 9) ? 1 : 0;
      case "LEVEL_10": return (spellHeightenLevel >= 10) ? 1 : 0;
      case "CUSTOM": return 1;
      default: return 0;
    }
}

function removePeriodAtEndOfStr(str){
    if(str.endsWith('.')) {
        return str.substring(0, str.length - 1);
    } else {
        return str;
    }
}