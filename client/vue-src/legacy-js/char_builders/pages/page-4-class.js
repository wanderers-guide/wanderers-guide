/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

let g_class = null;

// ~~~~~~~~~~~~~~ // Processings // ~~~~~~~~~~~~~~ //

function loadClassPage(classObject, classNum) {

    let classMap = objToMap(classObject);
    classMap = new Map([...classMap.entries()].sort(
        function(a, b) {
            return a[1].Class.name > b[1].Class.name ? 1 : -1;
        })
    );

    // Populate Class Selector
    let selectClass = $('#selectClass-'+classNum);
    selectClass.append('<option value="chooseDefault" name="chooseDefault">Choose a Class</option>');
    selectClass.append('<optgroup label="──────────"></optgroup>');
    for(const [key, value] of classMap.entries()){
        if(value.Class.id == getCharClassID(classNum)){
            if(value.Class.isArchived == 0){
                selectClass.append('<option value="'+value.Class.id+'" class="'+selectOptionRarity(value.Class.rarity)+'" selected>'+value.Class.name+'</option>');
            } else {
                selectClass.append('<option value="'+value.Class.id+'" class="'+selectOptionRarity(value.Class.rarity)+'" selected>'+value.Class.name+' (archived)</option>');
            }
        } else if(value.Class.isArchived == 0){
            selectClass.append('<option value="'+value.Class.id+'" class="'+selectOptionRarity(value.Class.rarity)+'">'+value.Class.name+'</option>');
        }
    }


    // Class Selection //
    $('#selectClass-'+classNum).change(function(event, triggerSave) {
        $('#classArtworkImg-'+classNum).attr('src', '');
        let classID = $("#selectClass-"+classNum+" option:selected").val();
        if(classID != "chooseDefault"){
            $('.class-content-'+classNum).removeClass("is-hidden");
            $('#selectClassControlShell-'+classNum).removeClass("is-info");

            if(triggerSave == null || triggerSave) {
                $('#selectClassControlShell-'+classNum).addClass("is-loading");

                setCharClassID(classNum, classID);
                g_class = classMap.get(classID);
                stopCodeProcessing();
                socket.emit("requestClassChange",
                    getCharIDFromURL(),
                    classID,
                    classNum);
                
            } else {
                displayCurrentClass(classMap.get(classID), classNum);
            }

        } else {
            $('.class-content-'+classNum).addClass("is-hidden");
            $('#selectClassControlShell-'+classNum).addClass("is-info");

            // Delete class, set to null
            setCharClassID(classNum, null);
            g_class = null;
            stopCodeProcessing();
            socket.emit("requestClassChange",
                getCharIDFromURL(),
                null,
                classNum);
        }

    });
 
    $('#selectClass-'+classNum).trigger("change", [false]);
    finishLoadingPage();

}

socket.on("returnClassChange", function(inChoiceStruct, classNum){
    $('#selectClassControlShell-'+classNum).removeClass("is-loading");

    if(g_class != null){
        injectWSCChoiceStruct(inChoiceStruct);
        updateSkillMap(true);
        resetClassArchetypes();
        displayCurrentClass(g_class, classNum);
    } else {
        finishLoadingPage();
    }

});

function displayCurrentClass(classStruct, classNum) {
    g_class = null;
    $('#selectClass-'+classNum).blur();
    resettingVariables(g_enabledSources);

    // Add support for Free Archetype Variant if enabled...
    if(wscChoiceStruct.Character.variantFreeArchetype == 1){
      classStruct = addFreeArchetypeVariant(classStruct);
    }

    // Add support for Auto Bonus Progression Variant if enabled...
    if(wscChoiceStruct.Character.variantAutoBonusProgression == 1){
      classStruct = addAutoBonusProgressionVariant(classStruct);
    }

    // Add support for Gradual Ability Boosts Variant if enabled...
    if(wscChoiceStruct.Character.variantGradualAbilityBoosts == 1){
      classStruct = addGradualAbilityBoostsVariant(classStruct);
    }

    let choiceArray = wscChoiceStruct.ChoiceArray;

    if(classStruct.Class.isArchived == 1){
        $('#isArchivedMessage-'+classNum).removeClass('is-hidden');
    } else {
        $('#isArchivedMessage-'+classNum).addClass('is-hidden');
    }

    // Rarity //
    $('#classRarityContainer-'+classNum).html(convertRarityToHTML(classStruct.Class.rarity));

    let classDescription = $('#classDescription-'+classNum);
    classDescription.html(processText(classStruct.Class.description, false, false, 'MEDIUM', false));

    if(classStruct.Class.artworkURL != null){
      $('#classArtworkImg-'+classNum).removeClass('is-hidden');
      $('#classArtworkImg-'+classNum).attr('src', classStruct.Class.artworkURL);
    } else {
      $('#classArtworkImg-'+classNum).addClass('is-hidden');
      $('#classArtworkImg-'+classNum).attr('src', '');
    }

    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Key Ability ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ //

    let keyAbility = $('#keyAbility-'+classNum);
    keyAbility.html('');
    
    if(classStruct.Class.keyAbility == 'OTHER'){

        keyAbility.append('<p class="is-size-5">Other</p>');

    } else if(classStruct.Class.keyAbility.includes(' or ')) {

        let keyAbilitySelectID = 'keyAbilitySelect-'+classNum;
        let keyAbilityControlShellClass = 'keyAbilityControlShell-'+classNum;
        let keyAbilityOptionArray = classStruct.Class.keyAbility.split(' or ');
        keyAbility.append('<div class="select '+keyAbilityControlShellClass+'"><select id="'+keyAbilitySelectID+'"></select></div>');

        let keyAbilitySelect = $('#'+keyAbilitySelectID);
        keyAbilitySelect.append('<option value="chooseDefault">Choose an Ability</option>');
        keyAbilitySelect.append('<optgroup label="──────────"></optgroup>');

        keyAbilitySelect.append('<option value="'+keyAbilityOptionArray[0]+'">'+keyAbilityOptionArray[0]+'</option>');
        keyAbilitySelect.append('<option value="'+keyAbilityOptionArray[1]+'">'+keyAbilityOptionArray[1]+'</option>');

        $('#'+keyAbilitySelectID).change(function() {
            let abilityName = $(this).val();
            if(abilityName != "chooseDefault"){
                $('.'+keyAbilityControlShellClass).removeClass("is-info");
                socket.emit("requestAbilityBonusChange",
                    getCharIDFromURL(),
                    {sourceType: getClassSourceType(classNum), sourceLevel: 1, sourceCode: 'keyAbility', sourceCodeSNum: 'a'},
                    {Ability : shortenAbilityType(abilityName), Bonus : "Boost"});
            } else {
                $('.'+keyAbilityControlShellClass).addClass("is-info");
                socket.emit("requestAbilityBonusChange",
                    getCharIDFromURL(),
                    {sourceType: getClassSourceType(classNum), sourceLevel: 1, sourceCode: 'keyAbility', sourceCodeSNum: 'a'},
                    null);
            }
            $(this).blur();
        });

        let keyAbilitySrcStruct = {
            sourceType: getClassSourceType(classNum),
            sourceLevel: 1,
            sourceCode: 'keyAbility',
            sourceCodeSNum: 'a'
        };
        let bonusArray = wscChoiceStruct.BonusArray;
        let keyAbilityChoice = bonusArray.find(bonus => {
            return hasSameSrc(bonus, keyAbilitySrcStruct);
        });
        if(keyAbilityChoice != null){
            keyAbilitySelect.val(lengthenAbilityType(keyAbilityChoice.Ability));
        }

        if(keyAbilitySelect.val() != "chooseDefault"){
            $('.'+keyAbilityControlShellClass).removeClass("is-info");
        } else {
            $('.'+keyAbilityControlShellClass).addClass("is-info");
        }

    } else {
        keyAbility.append('<p class="is-size-5">'+classStruct.Class.keyAbility+'</p>');
        socket.emit("requestAbilityBonusChange",
            getCharIDFromURL(),
            {sourceType: getClassSourceType(classNum), sourceLevel: 1, sourceCode: 'keyAbility', sourceCodeSNum: 'a'},
            {Ability : shortenAbilityType(classStruct.Class.keyAbility), Bonus : "Boost"});
    }


    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Hit Points ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ //

    let hitPoints = $('#hitPoints-'+classNum);
    hitPoints.html('');
    hitPoints.append('<p class="is-inline is-size-5">'+classStruct.Class.hitPoints+'</p>');



    let savingProfArray = [];

    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Perception ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ //
    let profPerception = $('#profPerception-'+classNum);
    profPerception.html('');
    profPerception.append('<ul id="profPerceptionUL-'+classNum+'"></ul>');

    let profPerceptionUL = $('#profPerceptionUL-'+classNum);
    profPerceptionUL.append('<li id="profPerceptionLI-'+classNum+'"></li>');

    let profPerceptionLI = $('#profPerceptionLI-'+classNum);
    profPerceptionLI.append(profToWord(classStruct.Class.tPerception));

    savingProfArray.push({ For : "Perception", To : "Perception", Prof : classStruct.Class.tPerception });

    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Skills ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ //
    $('#profSkillsCode-'+classNum).html('');
    let profSkills = $('#profSkills-'+classNum);
    profSkills.html('');
    profSkills.append('<ul id="profSkillsUL-'+classNum+'"></ul>');
    
    let profSkillsUL = $('#profSkillsUL-'+classNum);

    let tSkillsArray;
    if(classStruct.Class.tSkills != null){
        tSkillsArray = classStruct.Class.tSkills.split(', ');
    } else {
        tSkillsArray = [];
    }
    for(const tSkill of tSkillsArray){

        let tSkillID = tSkill.replace(/ /g,'_');
        profSkillsUL.append('<li id="profSkillsLI-'+classNum+'-'+tSkillID+'"></li>');
        let profSkillsLI = $('#profSkillsLI-'+classNum+'-'+tSkillID);

        if(tSkill.includes(' or ')){

            let tSkillControlShellClass = tSkillID+'-'+classNum+'-ControlShell';
            let tSkillsOptionArray = tSkill.split(' or ');
            profSkillsLI.append('Trained in <div class="select is-small '+tSkillControlShellClass+'"><select id="'+tSkillID+'-'+classNum+'"></select></div>');

            let tSkillSelect = $('#'+tSkillID+'-'+classNum);

            tSkillSelect.append('<option value="chooseDefault">Choose a Skill</option>');
            tSkillSelect.append('<optgroup label="──────────"></optgroup>');

            tSkillSelect.append('<option value="'+tSkillsOptionArray[0]+'">'+tSkillsOptionArray[0]+'</option>');
            tSkillSelect.append('<option value="'+tSkillsOptionArray[1]+'">'+tSkillsOptionArray[1]+'</option>');

            $('#'+tSkillID+'-'+classNum).change(function() {
                let skillName = $(this).val();

                let srcStruct = {
                    sourceType: getClassSourceType(classNum),
                    sourceLevel: 1,
                    sourceCode: 'inits-misc-'+tSkillID,
                    sourceCodeSNum: 'a',
                };

                if(skillName != "chooseDefault"){
                    $('.'+tSkillControlShellClass).removeClass("is-info");
                    processBuilderCode(
                        'GIVE-PROF-IN='+skillName+':T',
                        srcStruct,
                        'profSkillsCode-'+classNum,
                        'Initial Class');
                } else {
                    $('.'+tSkillControlShellClass).addClass("is-info");
                    socket.emit("requestProficiencyChange",
                        getCharIDFromURL(),
                        {srcStruct, isSkill : true},
                        null);
                }
                $(this).blur();
            });

            let tSkillSrcStruct = {
                sourceType: getClassSourceType(classNum),
                sourceLevel: 1,
                sourceCode: 'inits-misc-'+tSkillID,
                sourceCodeSNum: 'aa',
            };
            let profArray = wscChoiceStruct.ProfArray;
            let tSkillChoice = profArray.find(bonus => {
                return hasSameSrc(bonus, tSkillSrcStruct);
            });
            if(tSkillChoice != null){
                tSkillSelect.val(tSkillChoice.To);
            }

            if(tSkillSelect.val() != "chooseDefault"){
                $('.'+tSkillControlShellClass).removeClass("is-info");
            } else {
                $('.'+tSkillControlShellClass).addClass("is-info");
            }

        } else {

            profSkillsLI.append("Trained in "+tSkill);
            savingProfArray.push({ For : "Skill", To : tSkillID, Prof : 'T' });

        }

    }

    profSkillsUL.append('<li id="profSkillsLIAdditionalTrained-'+classNum+'"></li>');
    let profSkillsLIAddTrained = $('#profSkillsLIAdditionalTrained-'+classNum);

    profSkillsLIAddTrained.append('Trained in <a class="has-text-info has-tooltip-bottom has-tooltip-multiline" data-tooltip="You will get to select training in an additional number of skills equal to '+classStruct.Class.tSkillsMore+' plus your Intelligence modifier in the Finalize step">'+classStruct.Class.tSkillsMore+'*</a> more skills');


    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Saving Throws ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ //
    let profSavingThrows = $('#profSavingThrows-'+classNum);
    profSavingThrows.html('');
    profSavingThrows.append('<ul id="profSavingThrowsUL-'+classNum+'"></ul>');

    let profSavingThrowsUL = $('#profSavingThrowsUL-'+classNum);
    profSavingThrowsUL.append('<li id="profSavingThrowsLIFort-'+classNum+'"></li>');
    profSavingThrowsUL.append('<li id="profSavingThrowsLIReflex-'+classNum+'"></li>');
    profSavingThrowsUL.append('<li id="profSavingThrowsLIWill-'+classNum+'"></li>');

    let profSavingThrowsLIFort = $('#profSavingThrowsLIFort-'+classNum);
    profSavingThrowsLIFort.append(profToWord(classStruct.Class.tFortitude)+" in Fortitude");

    let profSavingThrowsLIReflex = $('#profSavingThrowsLIReflex-'+classNum);
    profSavingThrowsLIReflex.append(profToWord(classStruct.Class.tReflex)+" in Reflex");

    let profSavingThrowsLIWill = $('#profSavingThrowsLIWill-'+classNum);
    profSavingThrowsLIWill.append(profToWord(classStruct.Class.tWill)+" in Will");

    savingProfArray.push({ For : "Save", To : 'Fortitude', Prof : classStruct.Class.tFortitude });
    savingProfArray.push({ For : "Save", To : 'Reflex', Prof : classStruct.Class.tReflex });
    savingProfArray.push({ For : "Save", To : 'Will', Prof : classStruct.Class.tWill });


    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Attacks ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ //
    let profAttacks = $('#profAttacks-'+classNum);
    profAttacks.html('');

    profAttacks.append('<ul id="profAttacksUL-'+classNum+'"></ul>');
    let profAttacksUL = $('#profAttacksUL-'+classNum);


    let tWeaponsArray = [];
    if(classStruct.Class.tWeapons != null) { tWeaponsArray = classStruct.Class.tWeapons.split(',,, '); }
    for(const tWeapons of tWeaponsArray){
        
        let sections = tWeapons.split(':::');
        let weapTraining = sections[0];
        let weaponName = sections[1];

        let weapID;
        let profConvertData = g_profConversionMap.get(weaponName.replace(/\s+/g,'').toUpperCase());
        if(profConvertData != null){
            weapID = profConvertData.Name;
        } else {
            weapID = weaponName.replace(/\s+/g,'_').toUpperCase();
        }

        profAttacksUL.append('<li id="profAttacksLI-'+classNum+'-'+weapID+'"></li>');
        let profAttacksLI = $('#profAttacksLI-'+classNum+'-'+weapID);

        if(weaponName.slice(-1) === 's'){
            // is plural
            profAttacksLI.append(profToWord(weapTraining)+" in all "+weaponName);
        } else {
            // is singular
            profAttacksLI.append(profToWord(weapTraining)+" in the "+weaponName);
        }

        savingProfArray.push({ For : "Attack", To : weapID, Prof : weapTraining });

    }
    if(classStruct.Class.weaponsExtra != null) {
      let weapLines = classStruct.Class.weaponsExtra.split('\n');
      for(const weapLine of weapLines){
        profAttacksUL.append(`<li>${weapLine}</li>`);
      }
    }


    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Defenses ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ //
    let profDefenses = $('#profDefenses-'+classNum);
    profDefenses.html('');

    profDefenses.append('<ul id="profDefensesUL-'+classNum+'"></ul>');
    let profDefensesUL = $('#profDefensesUL-'+classNum);


    let tArmorArray = [];
    if(classStruct.Class.tArmor != null) { tArmorArray = classStruct.Class.tArmor.split(',,, '); }
    for(const tArmor of tArmorArray){

        let sections = tArmor.split(':::');
        let armorTraining = sections[0];
        let armorName = sections[1];

        let armorID;
        let profConvertData = g_profConversionMap.get(armorName.replace(/\s+/g,'').toUpperCase());
        if(profConvertData != null){
            armorID = profConvertData.Name;
        } else {
            armorID = armorName.replace(/\s+/g,'_').toUpperCase();
        }

        profDefensesUL.append('<li id="profDefensesLI-'+classNum+'-'+armorID+'"></li>');
        let profDefensesLI = $('#profDefensesLI-'+classNum+'-'+armorID);

        profDefensesLI.append(profToWord(armorTraining)+" in all "+armorName);

        savingProfArray.push({ For : "Defense", To : armorID, Prof : armorTraining });

    }

    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Class DC ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ //
    let profClassDC = $('#profClassDC-'+classNum);
    profClassDC.html('');
    profClassDC.append('<ul id="profClassDCUL-'+classNum+'"></ul>');

    let profClassDCUL = $('#profClassDCUL-'+classNum);
    profClassDCUL.append('<li id="profClassDCLI-'+classNum+'"></li>');

    let profClassDCLI = $('#profClassDCLI-'+classNum);
    profClassDCLI.append(profToWord(classStruct.Class.tClassDC));

    savingProfArray.push({ For : "Class_DC", To : "Class_DC", Prof : classStruct.Class.tClassDC });


    let savingProfCount = 0;
    for(let savingProf of savingProfArray){
        let srcStruct = {
            sourceType: getClassSourceType(classNum),
            sourceLevel: 1,
            sourceCode: 'inits-'+savingProfCount,
            sourceCodeSNum: 'a',
        };
        if(savingProf.For === 'Skill' && savingProf.Prof === 'T'){
          processBuilderCode( // Use WSC because if the character is already trained, it will give them a new skill.
                'GIVE-PROF-IN='+savingProf.To+':T',
                srcStruct,
                'profSkillsCode-'+classNum,
                'Initial Class');
        } else {
            savingProf.SourceName = 'Initial Class';
            socket.emit("requestProficiencyChange",
                getCharIDFromURL(),
                {srcStruct, isSkill : false},
                savingProf);
        }
        savingProfCount++;
    }


    $('#classAbilities-'+classNum).html('<div id="classAbilitiesTabs-'+classNum+'"></div><div id="classAbilitiesContent-'+classNum+'"></div>');

    let abilityTabsTempSet = new Set();
    let abilityNameSet = new Set();
    for(const classAbility of classStruct.Abilities) {
        if(classAbility.selectType != 'SELECT_OPTION') {
            if(abilityNameSet.has(classAbility.name)){
                abilityTabsTempSet.add(classAbility.name);
            } else {
                abilityNameSet.add(classAbility.name);
            }
        }
    }

    let abilityTabsSet = new Set();
    for(const abilName of abilityNameSet){
        if(abilityTabsTempSet.has(abilName)){
            abilityTabsSet.add(abilName);
        }
    }

    let abilityTabHTML = '<li><a id="abilityTab-'+classNum+'-Other">Core Features</a></li>';
    for(const abilityTab of abilityTabsSet){
        let hashOfName = hashCode(abilityTab);
        abilityTabHTML += '<li><a id="abilityTab-'+classNum+'-'+hashOfName+'">'+abilityTab+'</a></li>';
        $('#classAbilitiesContent-'+classNum).append('<div id="abilityContent-'+classNum+'-'+hashOfName+'" class="is-hidden"></div>');
    }
    $('#classAbilitiesContent-'+classNum).append('<div id="abilityContent-'+classNum+'-Other" class="is-hidden"></div>');

    $('#classAbilitiesTabs-'+classNum).html('<div class="tabs is-centered is-marginless use-custom-scrollbar"><ul class="ability-tabs">'+abilityTabHTML+'</ul></div>');

    for(const classAbility of classStruct.Abilities) {
        if(classAbility.level == -1) {continue;}

        if(classAbility.selectType != 'SELECT_OPTION' && classAbility.level <= wscChoiceStruct.Character.level) {

            let classAbilityID = "classAbility-"+classNum+"-"+classAbility.id;
            let classAbilityHeaderID = "classAbilityHeader-"+classNum+"-"+classAbility.id;
            let classAbilityContentID = "classAbilityContent-"+classNum+"-"+classAbility.id;
            let classAbilityCodeID = "classAbilityCode-"+classNum+"-"+classAbility.id;

            let tabContent = null;
            if(abilityTabsSet.has(classAbility.name)){

                let hashOfName = hashCode(classAbility.name);
                tabContent = $('#abilityContent-'+classNum+'-'+hashOfName);
                tabContent.append('<div id="'+classAbilityID+'" class="classAbility pt-1"></div>');

                let classAbilitySection = $('#'+classAbilityID);
                classAbilitySection.append('<span id="'+classAbilityHeaderID+'" class="is-size-4 has-text-weight-semibold">Level '+classAbility.level+'<span class="classAbilityUnselectedOption"></span></span>');
                classAbilitySection.append('<div id="'+classAbilityContentID+'"></div>');
                classAbilitySection.append('<hr class="ability-hr">');

            } else {

                tabContent = $('#abilityContent-'+classNum+'-Other');
                tabContent.append('<div id="'+classAbilityID+'" class="classAbility pt-1"></div>');

                let classAbilitySection = $('#'+classAbilityID);
                classAbilitySection.append('<span id="'+classAbilityHeaderID+'" class="is-size-4 has-text-weight-semibold">'+classAbility.name+'<sup class="is-italic pl-2 is-size-6">'+rankLevel(classAbility.level)+'</sup><span class="classAbilityUnselectedOption"></span></span>');
                classAbilitySection.append('<div id="'+classAbilityContentID+'"></div>');
                classAbilitySection.append('<hr class="ability-hr">');

            }


            let classAbilityContent = $('#'+classAbilityContentID);


            let result = applyClassArchetypeChoice(classAbility);
            if(result != null){
              classAbilityContent.append('<div class="container ability-text-section">'+result.tabsHTML+'</div>');
              assembleClassArchetypeTabs(result.tabsID, classAbility.id, classAbility.description);
            } else {
              classAbilityContent.append('<div class="container ability-text-section">'+processText(classAbility.description, false, null)+'</div>');
            }

            classAbilityContent.append('<div class="columns is-mobile is-centered is-marginless"><div id="'+classAbilityCodeID+'" class="column is-mobile is-11 is-paddingless"></div></div>');

            if(classAbility.selectType === 'SELECTOR') {

                let selectorID = 'classAbilSelection-'+classNum+'-'+classAbility.id;
                let descriptionID = 'classAbilSelection-'+classNum+'-'+classAbility.id+'Description';
                let abilityCodeID = 'classAbilSelection-'+classNum+'-'+classAbility.id+'Code';

                let classAbilitySelectorInnerHTML = '';

                classAbilitySelectorInnerHTML += '<div class="field"><div class="select">';
                classAbilitySelectorInnerHTML += '<select id="'+selectorID+'" class="classAbilSelection" name="'+classAbility.id+'">';

                classAbilitySelectorInnerHTML += '<option value="chooseDefault">Choose a '+classAbility.name+'</option>';
                classAbilitySelectorInnerHTML += '<optgroup label="──────────"></optgroup>';

                let choice = choiceArray.find(choice => {
                    return choice.SelectorID == classAbility.id;
                });
                for(const classSelectionOption of classStruct.Abilities) {
                    if(classSelectionOption.selectType === 'SELECT_OPTION' && (classSelectionOption.selectOptionFor === classAbility.id || classSelectionOption.indivClassAbilName === classAbility.name)) {

                        if(choice != null && choice.OptionID == classSelectionOption.id) {
                            classAbilitySelectorInnerHTML += '<option value="'+classSelectionOption.id+'" selected>'+classSelectionOption.name+'</option>';
                        } else {
                            classAbilitySelectorInnerHTML += '<option value="'+classSelectionOption.id+'">'+classSelectionOption.name+'</option>';
                        }

                    }
                }

                classAbilitySelectorInnerHTML += '</select>';
                classAbilitySelectorInnerHTML += '</div></div>';

                classAbilitySelectorInnerHTML += '<div class="columns is-centered is-hidden"><div class="column is-mobile is-8"><article class="message is-info"><div class="message-body"><div id="'+descriptionID+'"></div><div id="'+abilityCodeID+'"></div></div></article></div></div>';

                classAbilityContent.append(classAbilitySelectorInnerHTML);

            }


        }

    }

    // Class abilities should come before ability options
    processBuilderCode_ClassAbilities(classStruct.Abilities, classNum);

    // Class ability options
    let abilSelectors = $('.classAbilSelection');
    for(const abilSelector of abilSelectors){

        $(abilSelector).change(function(event, triggerSave, runCodeOnly){

            if(runCodeOnly === true){

              if($(this).val() != "chooseDefault"){

                let abilityCodeID = $(this).attr('id')+'Code';
                $('#'+abilityCodeID).html('');

                let classAbilityID = $(this).attr('name');
                let classAbility = classStruct.Abilities.find(classAbility => {
                    return classAbility.id == classAbilityID;
                });

                let srcStruct = {
                    sourceType: getClassSourceType(classNum),
                    sourceLevel: classAbility.level,
                    sourceCode: 'classAbilitySelector-'+classAbilityID,
                    sourceCodeSNum: 'a',
                };

                let chosenAbilityID = $(this).val();
                let chosenClassAbility = classStruct.Abilities.find(classAbility => {
                    return classAbility.id == chosenAbilityID;
                });

                const chosenClassFeatureCode = replaceClassFeatureCodeFromClassArchetype(chosenClassAbility.id, chosenClassAbility.code, srcStruct);

                // Run ability choice code
                processBuilderCode(
                    chosenClassFeatureCode,
                    srcStruct,
                    abilityCodeID,
                    chosenClassAbility.name);

              }

            } else {

              let descriptionID = $(this).attr('id')+'Description';
              let abilityCodeID = $(this).attr('id')+'Code';
              $('#'+descriptionID).html('');
              $('#'+abilityCodeID).html('');

              let classAbilityID = $(this).attr('name');
              let classAbility = classStruct.Abilities.find(classAbility => {
                  return classAbility.id == classAbilityID;
              });

              let srcStruct = {
                  sourceType: getClassSourceType(classNum),
                  sourceLevel: classAbility.level,
                  sourceCode: 'classAbilitySelector-'+classAbilityID,
                  sourceCodeSNum: 'a',
              };

              if($(this).val() == "chooseDefault"){
                  $(this).parent().addClass("is-info");
                  $('#'+descriptionID).parent().parent().parent().parent().addClass('is-hidden');
                  
                  // Save ability choice
                  if(triggerSave == null || triggerSave) {
                      socket.emit("requestClassChoiceChange",
                          getCharIDFromURL(),
                          srcStruct,
                          null);
                  }

              } else {
                  $(this).parent().removeClass("is-info");
                  $('#'+descriptionID).parent().parent().parent().parent().removeClass('is-hidden');

                  let chosenAbilityID = $(this).val();
                  let chosenClassAbility = classStruct.Abilities.find(classAbility => {
                      return classAbility.id == chosenAbilityID;
                  });

                  let result = applyClassArchetypeChoice(chosenClassAbility);
                  if(result != null){
                    $('#'+descriptionID).html(result.tabsHTML);
                    assembleClassArchetypeTabs(result.tabsID, chosenClassAbility.id, chosenClassAbility.description);
                  } else {
                    $('#'+descriptionID).html(processText(chosenClassAbility.description, false, null));
                  }

                  // Save ability choice
                  if(triggerSave == null || triggerSave) {
                      socket.emit("requestClassChoiceChange",
                          getCharIDFromURL(),
                          srcStruct,
                          { SelectorID : classAbilityID, OptionID : chosenAbilityID });
                  }

                  const chosenClassFeatureCode = replaceClassFeatureCodeFromClassArchetype(chosenClassAbility.id, chosenClassAbility.code, srcStruct);

                  // Run ability choice code
                  processBuilderCode(
                      chosenClassFeatureCode,
                      srcStruct,
                      abilityCodeID,
                      chosenClassAbility.name);
                  
              }

            }

            $(this).blur();
            selectorUpdated();
        });

    }

    $('.classAbilSelection').trigger("change", [false]);

    
    for(let abilityTab of $('.ability-tabs a')){
        let tabNameHash = $(abilityTab).attr('id').replace('abilityTab-'+classNum+'-', '');
        if($('#abilityContent-'+classNum+'-'+tabNameHash).html() == ''){
            $(abilityTab).parent().addClass('is-hidden');
        } else {
            $(abilityTab).parent().removeClass('is-hidden');
        }
    }

    $('.ability-tabs a').click(function(){
        $('#classAbilitiesContent-'+classNum+' > div').addClass('is-hidden');
        $('.ability-tabs > li').removeClass("is-active");

        let tabNameHash = $(this).attr('id').replace('abilityTab-'+classNum+'-', '');
        $('#abilityContent-'+classNum+'-'+tabNameHash).removeClass('is-hidden');
        $('#abilityTab-'+classNum+'-'+tabNameHash).parent().addClass("is-active");
    });

    $('.ability-tabs a:first').click();

}

socket.on("returnClassChoiceChange", function(srcStruct, selectorID, optionID){
    
    let choiceArray = wscChoiceStruct.ChoiceArray;

    let foundChoiceData = false;
    for(let choiceData of choiceArray){
        if(hasSameSrc(choiceData, srcStruct)){
            foundChoiceData = true;
            if(selectorID != null && optionID != null){
                choiceData.value = selectorID+':::'+optionID;
                choiceData.SelectorID = selectorID;
                choiceData.OptionID = optionID;
            } else {
                choiceData.value = null;
                choiceData.SelectorID = null;
                choiceData.OptionID = null;
            }
            break;
        }
    }

    if(!foundChoiceData && selectorID != null && optionID != null){
        let choiceData = cloneObj(srcStruct);
        choiceData.value = selectorID+':::'+optionID;
        choiceData.SelectorID = selectorID;
        choiceData.OptionID = optionID;
        choiceArray.push(choiceData);
    }

    wscChoiceStruct.ChoiceArray = choiceArray;
    updateExpressionProcessor({
        ChoiceStruct : wscChoiceStruct,
    });

});


function getCharClassID(classNum){
  if(classNum == 1){
    return g_char_classID_1;
  } else if(classNum == 2){
    return g_char_classID_2;
  } else {
    return null;
  }
}
function setCharClassID(classNum, char_classID){
  if(classNum == 1){
    g_char_classID_1 = char_classID;
  } else if(classNum == 2){
    g_char_classID_2 = char_classID;
  }
}

function getClassSourceType(classNum){
  if(classNum == 1){
    return 'class';
  } else if(classNum == 2){
    return 'class-2';
  } else {
    return 'class';
  }
}