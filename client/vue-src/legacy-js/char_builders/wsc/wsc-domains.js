/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

//--------------------- Processing Domains --------------------//
function processingDomains(wscStatement, srcStruct, locationID, sourceName){

    if(wscStatement.includes("GIVE-DOMAIN-ADVANCEMENT=")){ // GIVE-DOMAIN-ADVANCEMENT=Cleric
        let spellSRC = wscStatement.split('=')[1];
        giveDomainAdvancement(srcStruct, locationID, spellSRC, sourceName);
    } else if(wscStatement.includes("GIVE-DOMAIN=")){ // GIVE-DOMAIN=Cleric
        let spellSRC = wscStatement.split('=')[1];
        giveDomain(srcStruct, locationID, spellSRC, sourceName);
    } else {
        displayError("Unknown statement (2-Domain): \'"+wscStatement+"\'");
        statementComplete();
    }

}

//////////////////////////////// Give Domain ///////////////////////////////////

function giveDomain(srcStruct, locationID, spellSRC, sourceName){

    let selectID = "selectDomain-"+locationID+"-"+srcStruct.sourceCode+"-"+srcStruct.sourceCodeSNum;
    let selectControlShellClass = selectID+'ControlShell';
    let descriptionID = "selectDomainDescription-"+locationID+"-"+srcStruct.sourceCode+"-"+srcStruct.sourceCodeSNum;

    const selectionTagInfo = getTagFromData(srcStruct, sourceName, 'Unselected Domain', 'UNSELECTED');

    $('#'+locationID).append('<div class="field is-grouped is-grouped-centered is-marginless my-1"><div class="select '+selectControlShellClass+'" data-selection-info="'+selectionTagInfo+'"><select id="'+selectID+'"></select></div></div>');

    $('#'+locationID).append('<div id="'+descriptionID+'"></div>');

    $('#'+selectID).append('<option value="chooseDefault">Choose a Domain</option>');
    $('#'+selectID).append('<optgroup label="──────────"></optgroup>');

    // Set saved domain choice
    let savedDomainData = wscChoiceStruct.DomainArray.find(domain => {
        return hasSameSrc(domain, srcStruct);
    });

    for(const domain of wscChoiceStruct.AllDomains){

        if(savedDomainData != null && savedDomainData.value.id == domain.id) {
            $('#'+selectID).append('<option value="'+domain.id+'" selected>'+domain.name+'</option>');
        } else {
            $('#'+selectID).append('<option value="'+domain.id+'">'+domain.name+'</option>');
        }

    }

    // On select change
    $('#'+selectID).change(function(event, triggerSave) {
        
        if($(this).val() == "chooseDefault"){

            $('.'+selectControlShellClass).addClass("is-info");

            $('#'+descriptionID).html('');

            socket.emit("requestDomainChange",
                getCharIDFromURL(),
                srcStruct,
                null);

        } else {

            $('.'+selectControlShellClass).removeClass("is-info");

            let domainID = $(this).val();
            let domain = wscChoiceStruct.AllDomains.find(domain => {
                return domain.id == domainID;
            });

            $('#'+descriptionID).html(processText(domain.description, false, null));

            socket.emit("requestDomainChange",
                getCharIDFromURL(),
                srcStruct,
                {Domain: domain, SpellSRC: spellSRC});
            
        }

        $(this).blur();

    });

    $('#'+selectID).trigger("change", [false]);

    statementComplete();

}

socket.on("returnDomainChange", function(){
    selectorUpdated();
    socket.emit("requestWSCUpdateChoices", getCharIDFromURL(), 'DOMAINS');
});


//////////////////////////////// Give Domain Advancement ///////////////////////////////////

function giveDomainAdvancement(srcStruct, locationID, spellSRC, sourceName){

    let selectID = "selectDomainAdvancement-"+locationID+"-"+srcStruct.sourceCode+"-"+srcStruct.sourceCodeSNum;
    let selectControlShellClass = selectID+'ControlShell';
    let descriptionID = "selectDomainAdvancementDescription-"+locationID+"-"+srcStruct.sourceCode+"-"+srcStruct.sourceCodeSNum;

    const selectionTagInfo = getTagFromData(srcStruct, sourceName, 'Unselected Domain Advancement', 'UNSELECTED');

    $('#'+locationID).append('<div class="field is-grouped is-grouped-centered is-marginless my-1"><div class="select '+selectControlShellClass+'" data-selection-info="'+selectionTagInfo+'"><select id="'+selectID+'"></select></div></div>');

    $('#'+locationID).append('<div id="'+descriptionID+'"></div>');

    $('#'+selectID).append('<option value="chooseDefault">Choose a Domain</option>');
    $('#'+selectID).append('<optgroup label="──────────"></optgroup>');

    // Set saved domain choice
    let savedDomainData = wscChoiceStruct.AdvancedDomainArray.find(domainAdvanced => {
        return hasSameSrc(domainAdvanced, srcStruct);
    });

    for(const domainData of wscChoiceStruct.DomainArray){

        if(savedDomainData != null && savedDomainData.value.id == domainData.value.id) {
            $('#'+selectID).append('<option value="'+domainData.value.id+'" selected>'+domainData.value.name+'</option>');
        } else {
            $('#'+selectID).append('<option value="'+domainData.value.id+'">'+domainData.value.name+'</option>');
        }

    }

    // On select change
    $('#'+selectID).change(function(event, triggerSave) {
        
        if($(this).val() == "chooseDefault"){

            $('.'+selectControlShellClass).addClass("is-info");

            $('#'+descriptionID).html('');

            socket.emit("requestDomainAdvancementChange",
                getCharIDFromURL(),
                srcStruct,
                null);

        } else {

            $('.'+selectControlShellClass).removeClass("is-info");

            let domainID = $(this).val();
            let domain = wscChoiceStruct.AllDomains.find(domain => {
                return domain.id == domainID;
            });

            $('#'+descriptionID).html(processText(domain.description, false, null));

            socket.emit("requestDomainAdvancementChange",
                getCharIDFromURL(),
                srcStruct,
                {Domain: domain, SpellSRC: spellSRC});
            
        }

        $(this).blur();

    });

    $('#'+selectID).trigger("change", [false]);

    statementComplete();

}

socket.on("returnDomainAdvancementChange", function(){
    selectorUpdated();
});