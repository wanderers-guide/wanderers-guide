/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

//--------------------- Processing Ability Boosts --------------------//
function processingAbilityBoosts(wscStatement, srcStruct, locationID, sourceName){

    // GIVE-ABILITY-BOOST-SINGLE=ALL
    // GIVE-ABILITY-BOOST-SINGLE=INT,WIS,CHA
    if(wscStatement.includes("GIVE-ABILITY-BOOST-SINGLE")){
        let selectionOptions = wscStatement.split('=')[1];
        giveAbilityBoostSingle(srcStruct, selectionOptions, locationID, sourceName);
    } else if(wscStatement.includes("GIVE-ABILITY-BOOST-MULTIPLE")){// GIVE-ABILITY-BOOST-MULTIPLE=3
        let numberOfBoosts = wscStatement.split('=')[1];
        giveAbilityBoostMultiple(srcStruct, numberOfBoosts, locationID, sourceName);
    } else {
        displayError("Unknown statement (2-Boost): \'"+wscStatement+"\'");
        statementComplete();
    }

}

//////////////////////////////// Give Ability Boost - Single ///////////////////////////////////

function giveAbilityBoostMultiple(srcStruct, numberOfBoosts, locationID, sourceName) {
    statementComplete();
    if(numberOfBoosts > 6){
        displayError("Attempted to create more than 6 ability boosts!");
    } else {
        let multiBoostCodeStr = '';
        for (let i = 0; i < numberOfBoosts; i++) {
            multiBoostCodeStr += 'GIVE-ABILITY-BOOST-SINGLE=ALL\n';
        }
        if(multiBoostCodeStr != ''){
            let newLocationID = locationID+'-BoostContent';
            $('#'+locationID).append('<div class="field is-grouped is-grouped-centered"><div class="" id="'+newLocationID+'"></div></div>');
            processBuilderCode(
                multiBoostCodeStr,
                srcStruct,
                newLocationID,
                sourceName);
        }
    }
}

function giveAbilityBoostSingle(srcStruct, selectionOptions, locationID, sourceName){

    selectionOptions = selectionOptions.toUpperCase();

    if(selectionOptions == "ALL"){
        displayAbilityBoostSingle(srcStruct, locationID, getAllAbilityTypes(), sourceName);
    } else {

        let selectionOptionsArray = selectionOptions.split(",");
        if(selectionOptionsArray.length < 8){
            let abilityTypes = [];
            for(let selectionOption of selectionOptionsArray){
                let abilityType = lengthenAbilityType(selectionOption);
                if(!abilityTypes.includes(abilityType)){
                    abilityTypes.push(abilityType);
                }
            }
            if(abilityTypes.length != 0){
                if(abilityTypes.length != 1) {
                    displayAbilityBoostSingle(srcStruct, locationID, abilityTypes, sourceName);
                } else {
                    socket.emit("requestWSCAbilityBonusChange",
                        getCharIDFromURL(),
                        srcStruct,
                        {Ability: shortenAbilityType(abilityTypes[0]), Bonus: "Boost"},
                        null);
                    removeUnselectedData(srcStruct); // Fixes bug with ability boost selector becoming no selector
                    statementComplete();
                }
            } else {
                displayError("Attempted to produce an invalid ability boost! (2)");
                statementComplete();
            }
        } else {
            displayError("Attempted to produce an invalid ability boost! (1)");
            statementComplete();
        }
        
    }
    

}

function displayAbilityBoostSingle(srcStruct, locationID, abilityTypes, sourceName){
    
    let selectBoostID = "selectBoost-"+locationID+"-"+srcStruct.sourceCode+"-"+srcStruct.sourceCodeSNum;
    let selectBoostSet = "selectBoostSet-"+locationID;
    let selectBoostControlShellClass = selectBoostSet+'ControlShell';

    const selectionTagInfo = getTagFromData(srcStruct, sourceName, 'Unselected Ability Boost', 'UNSELECTED');

    $('#'+locationID).append('<span class="select mb-1 mx-1 '+selectBoostControlShellClass+'" data-selection-info="'+selectionTagInfo+'"><select id="'+selectBoostID+'" class="'+selectBoostSet+'"></select></span>');

    let selectBoost = $('#'+selectBoostID);
    selectBoost.append('<option value="chooseDefault">Choose an Ability</option>');
    selectBoost.append('<optgroup label="──────────"></optgroup>');
    for(const ability of abilityTypes){
        selectBoost.append('<option value="'+ability+'">'+ability+'</option>');
    }

    let bonusArray = wscChoiceStruct.BonusArray;

    let bonus = bonusArray.find(bonus => {
        return hasSameSrc(bonus, srcStruct);
    });
    if(bonus != null){
        let longAbilityType = lengthenAbilityType(bonus.Ability);
        
        $(selectBoost).val(longAbilityType);
        if ($(selectBoost).val() != longAbilityType){
            $(selectBoost).val($("#"+selectBoostID+" option:first").val());
            $(selectBoost).parent().addClass("is-info");
        }
    } else {
        $(selectBoost).parent().addClass("is-info");
    }

    $(selectBoost).change(function(){

        if(hasDuplicateSelected($('.'+selectBoostSet))){
            $('.'+selectBoostControlShellClass).addClass("is-danger");
            if($(this).val() != "chooseDefault"){
                $(this).parent().removeClass("is-info");
            } else {
                $(this).parent().addClass("is-info");
            }
        } else {
            $('.'+selectBoostControlShellClass).removeClass("is-danger");
            $('.'+selectBoostControlShellClass).addClass("is-loading");

            if($(this).val() != "chooseDefault"){
                $(this).parent().removeClass("is-info");
                socket.emit("requestWSCAbilityBonusChange",
                    getCharIDFromURL(),
                    srcStruct,
                    {Ability: shortenAbilityType($(this).val()), Bonus: "Boost"},
                    selectBoostControlShellClass);
            } else {
                $(this).parent().addClass("is-info");
                socket.emit("requestWSCAbilityBonusChange",
                    getCharIDFromURL(),
                    srcStruct,
                    null,
                    selectBoostControlShellClass);
            }

        }
        
    });

    statementComplete();

}

socket.on("returnWSCAbilityBonusChange", function(selectBoostControlShellClass){
    if(selectBoostControlShellClass != null){
        $('.'+selectBoostControlShellClass).removeClass("is-loading");
        $('.'+selectBoostControlShellClass+'>select').blur();
    }
    selectorUpdated();
    socket.emit("requestWSCUpdateChoices", getCharIDFromURL(), 'ABILITY-BOOSTS');
});