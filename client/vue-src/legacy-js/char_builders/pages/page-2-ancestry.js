/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

let g_uniHeritageArray = null;

let g_ancestry = null;
let g_ancestryForHeritage = null;

// ~~~~~~~~~~~~~~ // Processings // ~~~~~~~~~~~~~~ //

function loadAncestryPage(ancestryObject, uniHeritageArray) {

    g_uniHeritageArray = uniHeritageArray;

    let ancestryMap = objToMap(ancestryObject);
    ancestryMap = new Map([...ancestryMap.entries()].sort(
        function(a, b) {
            return a[1].Ancestry.name > b[1].Ancestry.name ? 1 : -1;
        })
    );

    // Populate Ancestry Selector
    let selectAncestry = $('#selectAncestry');
    selectAncestry.append('<option value="chooseDefault" name="chooseDefault">Choose an Ancestry</option>');
    selectAncestry.append('<optgroup label="──────────"></optgroup>');
    for(const [key, value] of ancestryMap.entries()){
        if(value.Ancestry.id == g_char_ancestryID){
            if(value.Ancestry.isArchived == 0){
                selectAncestry.append('<option value="'+value.Ancestry.id+'" class="'+selectOptionRarity(value.Ancestry.rarity)+'" selected>'+value.Ancestry.name+'</option>');
            } else {
                selectAncestry.append('<option value="'+value.Ancestry.id+'" class="'+selectOptionRarity(value.Ancestry.rarity)+'" selected>'+value.Ancestry.name+' (archived)</option>');
            }
        } else if(value.Ancestry.isArchived == 0){
            selectAncestry.append('<option value="'+value.Ancestry.id+'" class="'+selectOptionRarity(value.Ancestry.rarity)+'">'+value.Ancestry.name+'</option>');
        }
    }
    

    // Ancestry Selection //
    selectAncestry.change(function(event, triggerSave) {
        $('#ancestryArtworkImg').attr('src', '');
        let ancestryID = $("#selectAncestry option:selected").val();
        if(ancestryID != "chooseDefault"){
            $('.ancestry-content').removeClass("is-hidden");
            $('#selectAncestryControlShell').removeClass("is-info");
    
            // Save ancestry
            if(triggerSave == null || triggerSave) {
                $('#selectAncestryControlShell').addClass("is-loading");
    
                g_char_ancestryID = ancestryID;
                g_ancestry = ancestryMap.get(ancestryID);
                stopCodeProcessing();
                socket.emit("requestAncestryChange",
                    getCharIDFromURL(),
                    ancestryID);
                
            } else {
                displayCurrentAncestry(ancestryMap.get(ancestryID), false);
            }

        } else {
            $('.ancestry-content').addClass("is-hidden");
            $('#selectAncestryControlShell').addClass("is-info");

            $('#ancestryRarityContainer').html('');

            // Delete ancestry, set to null
            g_char_ancestryID = null;
            g_ancestry = null;
            stopCodeProcessing();
            socket.emit("requestAncestryChange",
                getCharIDFromURL(),
                null);
        }

    });

    // Heritage Selection //
    $('#selectHeritage').change(function(event, triggerSave) {
        $('#heritageArtworkImg').attr('src', '');

        let heritageID = $(this).val();
        let ancestryID = $("#selectAncestry option:selected").val();

        if(ancestryID != "chooseDefault" && heritageID != "chooseDefault"){
            $('#heritageInfo').removeClass("is-hidden");
            $('#selectHeritageControlShell').removeClass("is-info");

            // Save heritage
            let isUniversal = isUniversalHeritage();
            if(triggerSave == null || triggerSave) {
                $('#selectHeritageControlShell').addClass("is-loading");
                
                g_ancestryForHeritage = ancestryMap.get(ancestryID);
                socket.emit("requestHeritageChange",
                    getCharIDFromURL(),
                    heritageID,
                    isUniversal);
                
            } else {
                displayCurrentHeritage(ancestryMap.get(ancestryID), heritageID, isUniversal);
            }

        } else {
            $('#heritageInfo').addClass("is-hidden");
            $('#selectHeritageControlShell').addClass("is-info");

            g_ancestryForHeritage = null;
            let isUniversal = isUniversalHeritage();
            socket.emit("requestHeritageChange",
                    getCharIDFromURL(),
                    null,
                    isUniversal);
            
        }

    });


    $('.heritageTab').click(function(event, autoPageLoad){
        if($(this).parent().hasClass('is-active')) { return; }
        $(this).parent().parent().find('.is-active').removeClass('is-active');
        $(this).parent().addClass('is-active');

        let ancestryID = $("#selectAncestry option:selected").val();
        if(ancestryID != "chooseDefault"){
            let heritage;
            if(autoPageLoad != null && autoPageLoad){
                heritage = wscChoiceStruct.Heritage;
            } else {
                heritage = null;
            }
            displayHeritageSelectOptions(ancestryMap.get(ancestryID), heritage);
        }
    });

    if(wscChoiceStruct.Heritage != null){
        if(wscChoiceStruct.Heritage.tagID != null){
            $('#universalHeritageTab').trigger("click", [true]);
        } else {
            $('#ancestryHeritageTab').trigger("click", [true]);
        }
    } else {
        $('#ancestryHeritageTab').trigger("click", [true]);
    }

    // Display current ancestry
    selectAncestry.trigger("change", [false]);

}

/*
socket.on("returnAncestryChange", function(inChoiceStruct){
    $('#selectAncestryControlShell').removeClass("is-loading");

    if(g_ancestry != null){
        injectWSCChoiceStruct(inChoiceStruct);
        displayHeritageSelectOptions(g_ancestry, wscChoiceStruct.Heritage);
        displayCurrentAncestry(g_ancestry, true);
    } else {
        finishLoadingPage();
    }

});*/

socket.on("returnHeritageChange", function(heritageID, isUniversal, charTagsArray){
    $('#selectHeritageControlShell').removeClass("is-loading");

    wscChoiceStruct.CharTagsArray = charTagsArray;
    if($('#quickviewLeftDefault').hasClass('is-active')){
        openLeftQuickView('skillsView', null);
    }
    displayCurrentHeritage(g_ancestryForHeritage, heritageID, isUniversal);

});


function displayCurrentAncestry(ancestryStruct, saving) {
    g_ancestry = null;
    $('#selectAncestry').blur();
    resettingVariables(g_enabledSources);

    if(ancestryStruct.Ancestry.isArchived == 1){
        $('#isArchivedMessage').removeClass('is-hidden');
    } else {
        $('#isArchivedMessage').addClass('is-hidden');
    }
    
    $('#physicalFeatureOneCodeOutput').html('');
    $('#physicalFeatureTwoCodeOutput').html('');

    let ancestryDescription = $('#ancestryDescription');
    ancestryDescription.html(processText(ancestryStruct.Ancestry.description, false, false, 'MEDIUM', false));

    if(ancestryStruct.Ancestry.artworkURL != null){
      $('#ancestryArtworkImg').removeClass('is-hidden');
      $('#ancestryArtworkImg').attr('src', ancestryStruct.Ancestry.artworkURL);
    } else {
      $('#ancestryArtworkImg').addClass('is-hidden');
      $('#ancestryArtworkImg').attr('src', '');
    }

    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Rarity ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ //
    $('#ancestryRarityContainer').html(convertRarityToHTML(ancestryStruct.Ancestry.rarity));

    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Hit Points ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ //
    let ancestryHitPoints = $('#ancestryHitPoints');
    ancestryHitPoints.html('');
    ancestryHitPoints.append(ancestryStruct.Ancestry.hitPoints);

    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Size ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ //
    let ancestrySize = $('#ancestrySize');
    ancestrySize.html('');
    ancestrySize.append(capitalizeWord(ancestryStruct.Ancestry.size));

    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Speed ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ //
    let ancestrySpeed = $('#ancestrySpeed');
    ancestrySpeed.html('');
    ancestrySpeed.append(ancestryStruct.Ancestry.speed+" ft");

    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Languages ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ //
    let ancestryLanguages = $('#ancestryLanguages');
    ancestryLanguages.html('');
    let langIDArray = [];
    for(const language of ancestryStruct.Languages) {
        ancestryLanguages.append(language.name+", ");
        langIDArray.push(language.id);
    }
    let bonusLangs = '';
    ancestryStruct.BonusLanguages = ancestryStruct.BonusLanguages.sort(
        function(a, b) {
            return a.name > b.name ? 1 : -1;
        }
    );
    for(const bonusLang of ancestryStruct.BonusLanguages) {
        bonusLangs += bonusLang.name+", ";
    }
    bonusLangs = bonusLangs.substring(0, bonusLangs.length - 2);
    ancestryLanguages.append('and <a class="has-text-info has-tooltip-bottom has-tooltip-multiline" data-tooltip="You will get to select an additional number of languages equal your Intelligence modifier in the Finalize step. The following are the options you will be able to choose from: '+bonusLangs+'">more*</a>');

    if(saving){
        let langCount = 0;
        for(let langID of langIDArray){
            let srcStruct = {
                sourceType: 'ancestry',
                sourceLevel: 1,
                sourceCode: 'inits-'+langCount,
                sourceCodeSNum: 'a',
            };
            socket.emit("requestLanguageChange",
                getCharIDFromURL(),
                srcStruct,
                langID,
                false);
            langCount++;
        }
    }

    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Senses ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ //
    let ancestrySenses = $('#ancestrySenses');
    ancestrySenses.html('');
    let senseIDArray = [];
    if(ancestryStruct.VisionSense != null){
        ancestrySenses.append('<a class="has-text-info has-tooltip-bottom has-tooltip-multiline" data-tooltip="'+processTextRemoveIndexing(ancestryStruct.VisionSense.description)+'">'+ancestryStruct.VisionSense.name+'</a>');
        senseIDArray.push(ancestryStruct.VisionSense.id);
        if(ancestryStruct.AdditionalSense != null){
            ancestrySenses.append(' and ');
        }
    }
    if(ancestryStruct.AdditionalSense != null){
        ancestrySenses.append('<a class="has-text-info has-tooltip-bottom has-tooltip-multiline" data-tooltip="'+processTextRemoveIndexing(ancestryStruct.AdditionalSense.description)+'">'+ancestryStruct.AdditionalSense.name+'</a>');
        senseIDArray.push(ancestryStruct.AdditionalSense.id);
    }

    if(saving){
        let senseCount = 0;
        for(let senseID of senseIDArray){
            let srcStruct = {
                sourceType: 'ancestry',
                sourceLevel: 1,
                sourceCode: 'inits-'+senseCount,
                sourceCodeSNum: 'a',
            };
            socket.emit("requestSensesChange",
                getCharIDFromURL(),
                srcStruct,
                senseID,
                false);
            senseCount++;
        }
    }

    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Physical Features ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ //
    
    $('#physicalFeatureOneCodeOutput').addClass('is-hidden');
    $('#physicalFeatureTwoCodeOutput').addClass('is-hidden');

    if(ancestryStruct.PhysicalFeatureOne != null || ancestryStruct.PhysicalFeatureTwo != null) {
        $('#sectionPhysicalFeatures').removeClass('is-hidden');

        let ancestryPhysicalFeatures = $('#ancestryPhysicalFeatures');
        ancestryPhysicalFeatures.html('');
        let physicalFeatureIDArray = [];
        if(ancestryStruct.PhysicalFeatureOne != null){
            ancestryPhysicalFeatures.append('<a class="has-text-info has-tooltip-bottom has-tooltip-multiline" data-tooltip="'+processTextRemoveIndexing(ancestryStruct.PhysicalFeatureOne.description)+'">'+ancestryStruct.PhysicalFeatureOne.name+'</a>');
            physicalFeatureIDArray.push(ancestryStruct.PhysicalFeatureOne.id);
            if(ancestryStruct.PhysicalFeatureTwo != null){
                ancestryPhysicalFeatures.append(' and ');
            }

            let srcStruct = {
                sourceType: 'ancestry',
                sourceLevel: 1,
                sourceCode: 'inits-phyFeat-1',
                sourceCodeSNum: 'a',
            };
            processBuilderCode(
                ancestryStruct.PhysicalFeatureOne.code,
                srcStruct,
                'physicalFeatureOneCodeOutput',
                'Ancestry Feature');
            if(ancestryStruct.PhysicalFeatureOne.code != null){
                $('#physicalFeatureOneCodeOutput').removeClass('is-hidden');
            }
        }

        if(ancestryStruct.PhysicalFeatureTwo != null){
            ancestryPhysicalFeatures.append('<a class="has-text-info has-tooltip-bottom has-tooltip-multiline" data-tooltip="'+processTextRemoveIndexing(ancestryStruct.PhysicalFeatureTwo.description)+'">'+ancestryStruct.PhysicalFeatureTwo.name+'</a>');
            physicalFeatureIDArray.push(ancestryStruct.PhysicalFeatureTwo.id);

            let srcStruct = {
                sourceType: 'ancestry',
                sourceLevel: 1,
                sourceCode: 'inits-phyFeat-2',
                sourceCodeSNum: 'a',
            };
            processBuilderCode(
                ancestryStruct.PhysicalFeatureTwo.code,
                srcStruct,
                'physicalFeatureTwoCodeOutput',
                'Ancestry Feature');
            if(ancestryStruct.PhysicalFeatureTwo.code != null){
                $('#physicalFeatureTwoCodeOutput').removeClass('is-hidden');
            }
        }
    
        if(saving){
            let phyFeatCount = 0;
            for(let physicalFeatureID of physicalFeatureIDArray){
                let srcStruct = {
                    sourceType: 'ancestry',
                    sourceLevel: 1,
                    sourceCode: 'inits-'+phyFeatCount,
                    sourceCodeSNum: 'a',
                };
                socket.emit("requestPhysicalFeaturesChange",
                    getCharIDFromURL(),
                    srcStruct,
                    physicalFeatureID,
                    false);
                phyFeatCount++;
            }
        }

    } else {
        $('#sectionPhysicalFeatures').addClass('is-hidden');
    }

    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ //

    // Boosts //

    let boostChooseCount = 0;
    let boostNonChooseList = [];
    for(const boost of ancestryStruct.Boosts) {
        if(boost == "Anything") {
            boostChooseCount++;
        } else {
            boostNonChooseList.push(boost);
        }
    }
    let boostsNonChoose = $('#boostsNonChoose');
    let boostsNonChooseInnerHTML = '';
    let boostNonChooseCount = 0;
    for(const boostNonChoose of boostNonChooseList) {
        boostsNonChooseInnerHTML += ' <span class="button">'+boostNonChoose+'</span>';
        $(".abilityBoost option[value='"+boostNonChoose+"']").remove();

        if(saving){
            socket.emit("requestAbilityBonusChange",
                getCharIDFromURL(),
                {sourceType: 'ancestry', sourceLevel: 1, sourceCode: 'boost-nonChoose-'+boostNonChooseCount, sourceCodeSNum: 'a'},
                {Ability : shortenAbilityType(boostNonChoose), Bonus : "Boost"});
        }
        boostNonChooseCount++;

    }
    boostsNonChoose.html(boostsNonChooseInnerHTML);


    let boostChooseString = '';
    for(let ability of getAllAbilityTypes()){
        if(!boostNonChooseList.includes(ability)){
            boostChooseString += shortenAbilityType(ability)+',';
        }
    }

    $('#boostsChoose').html('');
    let srcStruct = {
        sourceType: 'ancestry',
        sourceLevel: 1,
        sourceCode: 'boost-choose',
        sourceCodeSNum: 'a',
    };
    let boostChooseCodeStr = '';
    for(let i = 0; i < boostChooseCount; i++) {
        boostChooseCodeStr += 'GIVE-ABILITY-BOOST-SINGLE='+boostChooseString+'\n';
    }
    if(boostChooseCodeStr != ''){
      processBuilderCode(
            boostChooseCodeStr,
            srcStruct,
            'boostsChoose',
            'Ancestry Boosts');
    }


    // Flaws //
    let flawNonChooseList = [];
    for(const flaw of ancestryStruct.Flaws) {
        if(flaw == "Anything") {
            
        } else {
            flawNonChooseList.push(flaw);
        }
    }
    let flawsNonChoose = $('#flawsNonChoose');
    let flawsNonChooseInnerHTML = '';
    let flawNonChooseCount = 0;
    for(const flawNonChoose of flawNonChooseList) {
        flawsNonChooseInnerHTML += ' <span class="button">'+flawNonChoose+'</span>';
        $(".abilityBoost option[value='"+flawNonChoose+"']").remove();

        if(saving){
            socket.emit("requestAbilityBonusChange",
                getCharIDFromURL(),
                {sourceType: 'ancestry', sourceLevel: 1, sourceCode: 'flaw-nonChoose-'+flawNonChooseCount, sourceCodeSNum: 'a',},
                {Ability : shortenAbilityType(flawNonChoose), Bonus : "Flaw"});
        }
        flawNonChooseCount++;
    }
    flawsNonChoose.html(flawsNonChooseInnerHTML);

    if(flawNonChooseList.length == 0){
        $('#flawsSection').addClass('is-hidden');
    } else {
        $('#flawsSection').removeClass('is-hidden');
    }

}

function displayHeritageSelectOptions(ancestryStruct, charHeritage){

    let selectHeritage = $('#selectHeritage');
    selectHeritage.html('');

    selectHeritage.append('<option value="chooseDefault">Choose a Heritage</option>');
    selectHeritage.append('<optgroup label="──────────"></optgroup>');

    if(isUniversalHeritage()){
        for(const uniHeritage of g_uniHeritageArray){
            if(charHeritage != null && charHeritage.tagID != null && charHeritage.id == uniHeritage.id) {
                selectHeritage.append('<option value="'+uniHeritage.id+'" class="'+selectOptionRarity(uniHeritage.rarity)+'" selected>'+uniHeritage.name+'</option>');
            } else {
                selectHeritage.append('<option value="'+uniHeritage.id+'" class="'+selectOptionRarity(uniHeritage.rarity)+'">'+uniHeritage.name+'</option>');
            }
        }
    } else {
        if(ancestryStruct != null){
            for(const heritage of ancestryStruct.Heritages){
                if(charHeritage != null && charHeritage.tagID == null && charHeritage.id == heritage.id) {
                    selectHeritage.append('<option value="'+heritage.id+'" class="'+selectOptionRarity(heritage.rarity)+'" selected>'+heritage.name+'</option>');
                } else {
                    selectHeritage.append('<option value="'+heritage.id+'" class="'+selectOptionRarity(heritage.rarity)+'">'+heritage.name+'</option>');
                }
            }
        }
    }

    
    $('#selectHeritage').trigger("change", [false]);

}

function isUniversalHeritage(){
    return $('#universalHeritageTab').parent().hasClass('is-active');
}

function displayCurrentHeritage(ancestryStruct, heritageID, isUniversal) {
    $('#selectHeritage').blur();

    if(heritageID != "chooseDefault" && ancestryStruct != null){
        
        let heritage;
        if(isUniversal) {
            heritage = g_uniHeritageArray.find(uniHeritage => {
                return uniHeritage.id == heritageID;
            });
        } else {
            heritage = ancestryStruct.Heritages.find(heritage => {
                return heritage.id == heritageID;
            });
        }
        wscChoiceStruct.Heritage = heritage;

        // Rarity //
        $('#heritageRarityContainer').html(convertRarityToHTML(heritage.rarity, true));
    
        let heritageDescription = $('#heritageDescription');
        heritageDescription.html(processText(heritage.description, false, false, 'MEDIUM', false));
        heritageDescription.removeClass('is-hidden');

        if(heritage.artworkURL != null){
          $('#heritageArtworkImg').removeClass('is-hidden');
          $('#heritageArtworkImg').attr('src', heritage.artworkURL);
        } else {
          $('#heritageArtworkImg').addClass('is-hidden');
          $('#heritageArtworkImg').attr('src', '');
        }

        $('#heritageCodeOutput').html('');

        let srcStruct = {
            sourceType: 'ancestry',
            sourceLevel: 1,
            sourceCode: 'heritage',
            sourceCodeSNum: 'a',
        };
        
        // Clear wscChoiceStruct.FeatArray of feats with srcStruct
        //featsRemoveFromWSCChoiceStruct(srcStruct, true);

        processBuilderCode(
            heritage.code,
            srcStruct,
            'heritageCodeOutput',
            'Heritage');

    } else {

        wscChoiceStruct.Heritage = null;

        $('#heritageRarityContainer').html('');

        let heritageDescription = $('#heritageDescription');
        heritageDescription.html('');
        heritageDescription.addClass('is-hidden');
        $('#heritageArtworkImg').addClass('is-hidden');
        $('#heritageArtworkImg').attr('src', '');
        $('#heritageCodeOutput').html('');

    }

    window.setTimeout(() => {
        createAncestryFeats(wscChoiceStruct.Character.level);
    }, 250);

}


function createAncestryFeats(charLevel){
    
    $('#ancestryFeats').html('');

    let ancestryFeatsLocs = [];

    // Use Ancestry Paragon Variant if enabled instead...
    if(wscChoiceStruct.Character.variantAncestryParagon == 1){
      
      let locData1, locData3, locData7, locData11, locData15, locData19;

      if(charLevel >= 1){
        let locData = buildFeatStruct(1);
        ancestryFeatsLocs.push(locData);

        locData1 = buildFeatStruct(1, '1-2');
      }
      ancestryFeatsLocs.push(locData1);

      if(charLevel >= 3){
        locData3 = buildFeatStruct(3);
      }
      ancestryFeatsLocs.push(locData3);

      if(charLevel >= 5){
        let locData = buildFeatStruct(5);
        ancestryFeatsLocs.push(locData);
      }

      if(charLevel >= 7){
        locData7 = buildFeatStruct(7);
      }
      ancestryFeatsLocs.push(locData7);

      if(charLevel >= 9){
        let locData = buildFeatStruct(9);
        ancestryFeatsLocs.push(locData);
      }

      if(charLevel >= 11){
        locData11 = buildFeatStruct(11);
      }
      ancestryFeatsLocs.push(locData11);

      if(charLevel >= 13){
        let locData = buildFeatStruct(13);
        ancestryFeatsLocs.push(locData);
      }

      if(charLevel >= 15){
        locData15 = buildFeatStruct(15);
      }
      ancestryFeatsLocs.push(locData15);

      if(charLevel >= 17){
        let locData = buildFeatStruct(17);
        ancestryFeatsLocs.push(locData);
      }

      if(charLevel >= 19){
        locData19 = buildFeatStruct(19);
      }
      ancestryFeatsLocs.push(locData19);

    } else { // Or else use normal...

      if(charLevel >= 1){
        let locData = buildFeatStruct(1);
        ancestryFeatsLocs.push(locData);
      }
      if(charLevel >= 5){
        let locData = buildFeatStruct(5);
        ancestryFeatsLocs.push(locData);
      }
      if(charLevel >= 9){
        let locData = buildFeatStruct(9);
        ancestryFeatsLocs.push(locData);
      }
      if(charLevel >= 13){
        let locData = buildFeatStruct(13);
        ancestryFeatsLocs.push(locData);
      }
      if(charLevel >= 17){
        let locData = buildFeatStruct(17);
        ancestryFeatsLocs.push(locData);
      }

    }

    processBuilderCode_AncestryAbilities(ancestryFeatsLocs);

}

function buildFeatStruct(featLevel, locID=null) {

  if(locID == null) { locID = featLevel; }
  let locationID = "descriptionFeat"+locID;

  $('#ancestryFeats').append('<div class=""><div class="pb-3"><span class="is-size-4 has-text-weight-semibold">Level '+featLevel+'</span><p>You gain an ancestry feat.</p></div><div class="columns is-centered"><div id="'+locationID+'" class="column is-paddingless is-8"></div></div></div>');

  return { LocationID : locationID, Level : featLevel };

}