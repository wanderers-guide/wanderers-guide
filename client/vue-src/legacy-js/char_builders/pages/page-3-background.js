/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

let g_background = null;

// ~~~~~~~~~~~~~~ // Processings // ~~~~~~~~~~~~~~ //

function loadBackgroundPage(backgrounds) {

    backgrounds = backgrounds.sort(
        function(a, b) {
            return a.name > b.name ? 1 : -1;
        }
    );

    // Populate Background Selector
    let selectBackground = $('#selectBackground');
    selectBackground.append('<option value="chooseDefault" name="chooseDefault">Choose a Background</option>');
    selectBackground.append('<optgroup label="──────────"></optgroup>');
    for(const background of backgrounds){
        if(background.id == g_char_backgroundID){
            if(background.isArchived == 0){
                selectBackground.append('<option value="'+background.id+'" class="'+selectOptionRarity(background.rarity)+'" selected>'+background.name+'</option>');
            } else {
                selectBackground.append('<option value="'+background.id+'" class="'+selectOptionRarity(background.rarity)+'" selected>'+background.name+' (archived)</option>');
            }
        } else if(background.isArchived == 0){
            selectBackground.append('<option value="'+background.id+'" class="'+selectOptionRarity(background.rarity)+'">'+background.name+'</option>');
        }
    }

    // Background Selection //
    selectBackground.change(function(event, triggerSave) {
        let backgroundID = $("#selectBackground option:selected").val();

        let background = backgrounds.find(background => {
            return background.id == backgroundID;
        });

        if(backgroundID != "chooseDefault" && background != null){
            $('.background-content').removeClass("is-hidden");
            $('#selectBackgroundControlShell').removeClass("is-info");

            // Save background
            if(triggerSave == null || triggerSave) {
                $('#selectBackgroundControlShell').addClass("is-loading");
                
                g_char_backgroundID = backgroundID;
                g_background = background;
                stopCodeProcessing();
                socket.emit("requestBackgroundChange",
                    getCharIDFromURL(),
                    backgroundID);
            } else {
                displayCurrentBackground(background);
            }

        } else {
            $('.background-content').addClass("is-hidden");
            $('#selectBackgroundControlShell').addClass("is-info");

            $('#backgroundRarityContainer').html('');

            // Delete background, set to null
            g_char_backgroundID = null;
            g_background = null;
            stopCodeProcessing();
            socket.emit("requestBackgroundChange",
                getCharIDFromURL(),
                null);
        }

    });


    // Display current background
    $('#selectBackground').trigger("change", [false]);

    // Activate boostSingleSelection() triggers
    $('.abilityBoost').trigger("change", [false]);

}

socket.on("returnBackgroundChange", function(choiceStruct){
    $('#selectBackgroundControlShell').removeClass("is-loading");

    if(g_background != null){
        injectWSCChoiceStruct(choiceStruct);
        displayCurrentBackground(g_background);
    } else {
        finishLoadingPage();
    }
    
});


function displayCurrentBackground(background) {
    g_background = null;
    $('#selectBackground').blur();
    resettingVariables(g_enabledSources);
    
    if(background.isArchived == 1){
        $('#isArchivedMessage').removeClass('is-hidden');
    } else {
        $('#isArchivedMessage').addClass('is-hidden');
    }

    let backgroundDescription = $('#backgroundDescription');
    backgroundDescription.html(processText(background.description, false, null, 'MEDIUM', false));

    // Rarity //
    $('#backgroundRarityContainer').html(convertRarityToHTML(background.rarity));


    // Code - Run General Code before Boosts Code, it's more likely to be delaying //
    $('#backgroundCodeOutput').html('');
    let srcStruct = {
        sourceType: 'background',
        sourceLevel: 1,
        sourceCode: 'background',
        sourceCodeSNum: 'a',
    };
    processBuilderCode(
        background.code,
        srcStruct,
        'backgroundCodeOutput',
        'Background');

    // Boosts //
    $('#backBoostSection').html('');
    // No need for a process clear because it will be going to AbilityBoost data every time.
    let boostSrcStruct = {
        sourceType: 'background',
        sourceLevel: 1,
        sourceCode: 'boost-choose',
        sourceCodeSNum: 'a',
    };
    if(background.boostOne != null && background.boostTwo != null) {
      processBuilderCode(
            'GIVE-ABILITY-BOOST-SINGLE='+background.boostOne+'\n GIVE-ABILITY-BOOST-SINGLE='+background.boostTwo,
            boostSrcStruct,
            'backBoostSection',
            'Background Boosts');
    }

}