/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

//------------------------- Processing Innate Spells -------------------------//
function processingInnateSpells(wscStatement, srcStruct, locationID, sourceName){

    if(wscStatement.includes("GIVE-INNATE-SPELL=")){// GIVE-INNATE-SPELL=3:divine:1(:ANY)
        let data = wscStatement.split('=')[1]; // Set cast times per day to 0 to cast an unlimited number
        let segments = data.split(':');// For cantrips just do: GIVE-INNATE-SPELL=0:divine:0
        giveInnateSpell(srcStruct, locationID, sourceName, segments[0], segments[1], segments[2], segments[3], segments[4]);
    } else if(wscStatement.includes("GIVE-INNATE-SPELL-NAME=")){// GIVE-INNATE-SPELL-NAME=Meld_Into_Stone:3:divine:1
        let data = wscStatement.split('=')[1]; // Set cast times per day to 0 to cast an unlimited number
        let segments = data.split(':');// For cantrips just do: GIVE-INNATE-SPELL-NAME=Daze:0:divine:0
        giveInnateSpellByName(srcStruct, sourceName, segments[0], segments[1], segments[2], segments[3]);
    } else {
        displayError("Unknown statement (2-SpellInnate): \'"+wscStatement+"\'");
        statementComplete();
    }

}

//////////////////////////////// Give Innate Spell ///////////////////////////////////
function giveInnateSpell(srcStruct, locationID, sourceName, spellLevel, spellTradition, timesPerDay, optionalSelectFromAnyTradition){
    let selectFromAnyTradition = (optionalSelectFromAnyTradition != null);
    if(spellTradition != null){
        if(spellTradition === 'OCCULT' || spellTradition === 'ARCANE' || spellTradition === 'DIVINE' || spellTradition === 'PRIMAL') {
            if(!isNaN(parseInt(spellLevel))) {
                displayInnateSpellChoice(srcStruct, locationID, sourceName, spellLevel, spellTradition, timesPerDay, selectFromAnyTradition);
            } else {
                displayError("Spell Level is Not a Number: \'"+spellLevel+"\'");
                statementComplete();
            }
        } else {
            displayError("Unknown Spell Tradition: \'"+spellTradition+"\'");
            statementComplete();
        }
    } else {
        displayError("Invalid Spell Tradition");
        statementComplete();
    }
}

function displayInnateSpellChoice(srcStruct, locationID, sourceName, spellLevel, spellTradition, timesPerDay, selectFromAnyTradition){

    let selectionName = (spellLevel == 0) ? 'Choose a Cantrip' : 'Choose a Level '+spellLevel+' Spell';
    let selectSpellID = "selectInnateSpell-"+locationID+"-"+srcStruct.sourceCode+"-"+srcStruct.sourceCodeSNum;
    let descriptionSpellID = "descriptionInnateSpell-"+locationID+"-"+srcStruct.sourceCode+"-"+srcStruct.sourceCodeSNum;
    let selectSpellControlShellClass = selectSpellID+'-ControlShell';

    // If ID already exists, just return. This is a temporary fix - this shouldn't be an issue in the first place.
    if($('#'+selectSpellID).length != 0) { statementComplete(); return; }

    const selectionTagInfo = getTagFromData(srcStruct, sourceName, 'Unselected Spell', 'UNSELECTED');

    $('#'+locationID).append('<div class="field is-grouped is-grouped-centered is-marginless mb-1"><div class="select '+selectSpellControlShellClass+'" data-selection-info="'+selectionTagInfo+'"><select id="'+selectSpellID+'" class="selectFeat"></select></div></div><div id="'+descriptionSpellID+'"></div>');

    $('#'+selectSpellID).append('<option value="chooseDefault">'+selectionName+'</option>');
    $('#'+selectSpellID).append('<optgroup label="──────────"></optgroup>');

    let triggerChange = false;
    // Set saved spell choices

    let innateSpellArray = wscChoiceStruct.InnateSpellArray;
    
    let innateSpellData = innateSpellArray.find(innateSpellData => {
        return hasSameSrc(innateSpellData, srcStruct);
    });

    let selectedSpell = null;
    if(innateSpellData != null){
        selectedSpell = innateSpellData;
        triggerChange = true;
    }

    for(const [spellID, spellData] of g_spellMap.entries()){
        if(spellData.Spell.level != spellLevel){ continue; }

        if(selectFromAnyTradition){
          if(spellData.Spell.traditions == '[]'){ continue; }// If has no tradition,
        } else {
          if(!spellData.Spell.traditions.includes(spellTradition.toLowerCase())){ continue; }
        }

        let spellName = spellData.Spell.name;
        if(spellData.Spell.isArchived === 1){
            if(selectedSpell != null && selectedSpell.SpellID == spellData.Spell.id){
                spellName += ' - Archived';
            } else {
                continue;
            }
        }

        $('#'+selectSpellID).append('<option value="'+spellData.Spell.id+'">'+spellName+'</option>');

    }

    if(selectedSpell != null){
        $('#'+selectSpellID).val(selectedSpell.SpellID);
        if ($('#'+selectSpellID).val() != selectedSpell.SpellID){
            $('#'+selectSpellID).val($("#"+selectSpellID+" option:first").val());
            $('#'+selectSpellID).parent().addClass("is-info");
        }
    }

    // On spell choice change
    $('#'+selectSpellID).change(function(event, triggerSave) {

        let spellID = $(this).val();
        let spell = g_spellMap.get(spellID+"");

        if($(this).val() == "chooseDefault" || spell == null){
            $('.'+selectSpellControlShellClass).addClass("is-info");

            // Display nothing
            $('#'+descriptionSpellID).html('');

            socket.emit("requestWSCInnateSpellChange",
                getCharIDFromURL(),
                srcStruct,
                null,
                selectSpellControlShellClass);

        } else {
            $('.'+selectSpellControlShellClass).removeClass("is-info");

            // Display spell
            displaySpell(descriptionSpellID, spell);

            // Save spell
            if(triggerSave == null || triggerSave) {
                $('.'+selectSpellControlShellClass).addClass("is-loading");
                socket.emit("requestWSCInnateSpellChange",
                    getCharIDFromURL(),
                    srcStruct,
                    {name: spell.Spell.name, level: spell.Spell.level, tradition: spellTradition, tPd: timesPerDay},
                    selectSpellControlShellClass);
            }

        }
        
    });

    $('#'+selectSpellID).trigger("change", [triggerChange]);

    statementComplete();

}


socket.on("returnWSCInnateSpellChange", function(selectControlShellClass){
    if(selectControlShellClass != null) {
        $('.'+selectControlShellClass).removeClass("is-loading");
        $('.'+selectControlShellClass+'>select').blur();
    }
    selectorUpdated();
});


//////////////////////////////// Give Innate Spell by Name ///////////////////////////////////
function giveInnateSpellByName(srcStruct, sourceName, spellName, spellLevel, spellTradition, timesPerDay){
    if(spellTradition != null){
        spellName = spellName.replace(/_/g," ");
        if(spellTradition === 'OCCULT' || spellTradition === 'ARCANE' || spellTradition === 'DIVINE' || spellTradition === 'PRIMAL') {
            socket.emit("requestInnateSpellChange",
                getCharIDFromURL(),
                srcStruct,
                spellName,
                spellLevel,
                spellTradition,
                timesPerDay);
        } else {
            displayError("Unknown Spell Tradition: \'"+spellTradition+"\'");
            statementComplete();
        }
    } else {
        displayError("Invalid Spell Tradition");
        statementComplete();
    }
}

socket.on("returnInnateSpellChange", function(){
    statementComplete();
});