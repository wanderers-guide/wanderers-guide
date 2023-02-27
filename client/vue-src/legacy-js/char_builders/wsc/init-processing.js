/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

// ========================================================================================= //
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Wanderer's Guide Code ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ //
// ========================================================================================= //

const processingDebug = false;

// Global Variables //
let codeQueue = [];
let runningCodeQueue = false;
let gCode_statements, gCode_srcStruct, gCode_locationID, gCode_sourceName;
let wscChoiceStruct = null;
let wscMapsInit = false;
let g_langMap, g_archetypes, g_profMap = null;
let temp_classAbilities, temp_classNum, temp_ancestryFeatsLocs = null;
//                  //

function processBuilderCode(wscCode, srcStruct, locationID, sourceName=''){
    if(wscCode == null || wscCode == ''){ return; }

    // Process Variables
    wscCode = processVariables(wscCode, `builderCode-${srcStructToCompositeKey(srcStruct)}`);

    // Process ADD-TEXT Statements
    processAddText(wscCode, locationID, true);

    // Add Loading Animiation //
    $('#'+locationID).append('<div class="wsc-statement-roller"><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div></div>');

    // Uppercase all code (to make everything case insensitive)
    wscCode = wscCode.toUpperCase();

    // Clone srcStruct object (to prevent some concurrency issues)
    let newSrcStruct = cloneObj(srcStruct);

    if(wscChoiceStruct == null){
        displayError("WSC ChoiceStruct Has Not Been Init!");
        if(processingDebug) {console.error("WSC ChoiceStruct Has Not Been Init!");}
        return;
    }

    codeDecompiling(wscCode, newSrcStruct, locationID, sourceName);

}

function codeDecompiling(wscCode, srcStruct, locationID, sourceName){

    codeQueue.push({ wscCode, srcStruct, locationID, sourceName });

    if(!runningCodeQueue){

        runningCodeQueue = true;
        if(!wscMapsInit){
            //if(processingDebug) {console.log("Did not find valid WSC Maps :(");}
            socket.emit("requestWSCMapsInit",
                getCharIDFromURL());
        } else {
            //if(processingDebug) {console.log("> Found a valid WSC Maps!");}
            shiftCodeQueue();
        }

    }

}

function stopCodeProcessing(){
  codeQueue = [];
  gCode_statements = null;
  gCode_srcStruct = null;
  gCode_locationID = null;
  gCode_sourceName = null;
}

socket.on("returnWSCMapsInit", function(){
    //if(processingDebug) {console.log("Setting WSC Maps...");}
    wscMapsInit = true;

    initExpressionProcessor({
        ChoiceStruct : wscChoiceStruct,
    });
    
    window.setTimeout(() => {
        shiftCodeQueue();
    }, 100);
});

function shiftCodeQueue(){

    runningCodeQueue = true;
    let code = codeQueue.shift();

    if(processingDebug) {console.log("Starting Code Queue:");}
    if(processingDebug) {console.log(code);}
    if(code != null){
        gCode_statements = code.wscCode.split(/\n/);
        gCode_locationID = code.locationID;
        gCode_sourceName = code.sourceName;

        code.srcStruct.sourceCodeSNum = 'a'+code.srcStruct.sourceCodeSNum;
        gCode_srcStruct = code.srcStruct;
        
        let stateReturn = runNextStatement();
        if(stateReturn === 'END'){
            if(processingDebug) {console.log("Code Queue Complete - only 1 statement!");}
            shiftCodeQueue();
        } else if(stateReturn === 'SKIP'){
            statementComplete();
        }
    } else {
        runningCodeQueue = false;
        if(processingDebug) {console.log("No More Code Queues Remaining :)");}
        finishLoadingPage();
    }
    
}

function statementComplete(){
    if(gCode_srcStruct == null) { return; }
    if(processingDebug) {console.log("Statement Complete, onto next statement...");}

    if(processingDebug) {console.log(gCode_srcStruct.sourceCodeSNum);}
    // Up ticks the first digit in the sourceCodeSNum string.
    let sourceCodeSNum = gCode_srcStruct.sourceCodeSNum;
    let firstChar = sourceCodeSNum[0]; // Get first char
    sourceCodeSNum = sourceCodeSNum.substr(1); // Remove first char
    firstChar = charIncrease(firstChar);
    if(firstChar == null){
        displayError("Attempted to run more WSC statements than maximum!");
        return;
    }
    sourceCodeSNum = firstChar+sourceCodeSNum;
    gCode_srcStruct.sourceCodeSNum = sourceCodeSNum;
    if(processingDebug) {console.log(gCode_srcStruct.sourceCodeSNum);}
    
    let stateReturn = runNextStatement();
    if(stateReturn === 'END'){
        if(processingDebug) {console.log("Code Queue Complete");}
        shiftCodeQueue();
    } else if(stateReturn === 'SKIP'){
        statementComplete();
    }
}

function runNextStatement(){

    let wscStatement = gCode_statements.shift();
    let srcStruct = {
        sourceType: gCode_srcStruct.sourceType,
        sourceLevel: gCode_srcStruct.sourceLevel,
        sourceCode: gCode_srcStruct.sourceCode,
        sourceCodeSNum: gCode_srcStruct.sourceCodeSNum,
    };
    let locationID = gCode_locationID;
    let sourceName = gCode_sourceName;

    if(processingDebug) {console.log('SRC-STRUCT');}
    if(processingDebug) {console.log(srcStruct);}
    if(processingDebug) {console.log(wscStatement);}
    
    // Remove Loading Animiation //
    $('#'+locationID+' .wsc-statement-roller').remove();

    if(wscStatement != null){
        if(wscStatement.trim() == ''){ return 'SKIP'; }
        if(wscStatement.endsWith(',')){ wscStatement = wscStatement.slice(0, -1); }

        // Test/Check Statement for Expressions //
        wscStatement = testExpr(wscStatement, srcStruct);
        if(wscStatement == null) {
          socket.emit("requestDataClearAtSrcStruct",
              getCharIDFromURL(),
              srcStruct);
          return 'SKIP';
        }
        if(wscStatement.trim() == ''){ return 'SKIP'; }
        //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
        
        // Test/Check if Statement is a Sheet Statement //
        if(testSheetCode(wscStatement)){
            if(processingDebug) {console.log("Skipping '"+wscStatement+"' because it's a sheet statement.");}
            return 'SKIP';
        }
        //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//

        if(wscStatement == "CLEAR-DATA-FROM-CODE-BLOCK"){
            clearDataFromSrcStruct(srcStruct);
            return 'WAIT';
        }

        if(wscStatement.includes("-SCFS")){ // Needs to come before the rest
          processingSCFS(wscStatement, srcStruct, locationID, sourceName);
          return 'WAIT';
        }

        if(wscStatement.includes("-CHAR-TRAIT")){
            processingCharTags(wscStatement, srcStruct, locationID, sourceName);
            return 'WAIT';
        }

        if(wscStatement.includes("-PHYSICAL-FEATURE")){
            processingPhysicalFeatures(wscStatement, srcStruct, locationID, sourceName);
            return 'WAIT';
        }

        if(wscStatement.includes("-SENSE")){
            processingSenses(wscStatement, srcStruct, locationID, sourceName);
            return 'WAIT';
        }

        if(wscStatement.includes("-CLASS-FEATURE")){
          processingClassFeatures(wscStatement, srcStruct, locationID, sourceName);
          return 'WAIT';
        }

        if(wscStatement.includes("-FEAT")){
            processingFeats(wscStatement, srcStruct, locationID, sourceName);
            return 'WAIT';
        }

        if(wscStatement.includes("-PROF")){
            processingProf(wscStatement, srcStruct, locationID, sourceName);
            return 'WAIT';
        }

        if(wscStatement.includes("-SKILL")){
            processingSkills(wscStatement, srcStruct, locationID, sourceName);
            return 'WAIT';
        }

        if(wscStatement.includes("-LANG")){
            processingLangs(wscStatement, srcStruct, locationID, sourceName);
            return 'WAIT';
        }

        if(wscStatement.includes("-ABILITY-BOOST")){
            processingAbilityBoosts(wscStatement, srcStruct, locationID, sourceName);
            return 'WAIT';
        }

        if(wscStatement.includes("-INNATE")){
            processingInnateSpells(wscStatement, srcStruct, locationID, sourceName);
            return 'WAIT';
        }

        if(wscStatement.includes("-FOCUS")){
            processingFocusSpells(wscStatement, srcStruct, locationID, sourceName);
            return 'WAIT';
        }

        if(wscStatement.includes("-SPELL")){
            processingSpells(wscStatement, srcStruct, locationID, sourceName);
            return 'WAIT';
        }

        if(wscStatement.includes("-LORE")){
            processingLore(wscStatement, srcStruct, locationID, sourceName);
            return 'WAIT';
        }

        if(wscStatement.includes("-RESISTANCE") || wscStatement.includes("-WEAKNESS")){
            processingResistances(wscStatement, srcStruct, locationID, sourceName);
            return 'WAIT';
        }

        if(wscStatement.includes("-DOMAIN")){
            processingDomains(wscStatement, srcStruct, locationID, sourceName);
            return 'WAIT';
        }

        if(wscStatement.includes("-SPECIALIZATION")){
            processingSpecializations(wscStatement, srcStruct, locationID, sourceName);
            return 'WAIT';
        }

        if(wscStatement.includes("-FAMILIARITY")){
            processingFamiliarities(wscStatement, srcStruct, locationID, sourceName);
            return 'WAIT';
        }

        if(wscStatement.includes("-NOTES")){
            processingNotes(wscStatement, srcStruct, locationID, sourceName);
            return 'WAIT';
        }

        if(wscStatement.includes("-SPEED")){
            processingSpeeds(wscStatement, srcStruct, locationID, sourceName);
            return 'WAIT';
        }

        if(wscStatement.includes("-KEY-ABILITY")){
            processingKeyAbilities(wscStatement, srcStruct, locationID, sourceName);
            return 'WAIT';
        }

        if(wscStatement.includes("-HERITAGE-EFFECTS")){
            processingHeritageEffects(wscStatement, srcStruct, locationID, sourceName);
            return 'WAIT';
        }

        if(wscStatement.includes("ADD-TEXT")){
            processingAddText(wscStatement, srcStruct, locationID, sourceName);
            return 'WAIT';
        }

        displayError("Unknown statement (1): \'"+wscStatement+"\'");
        return 'END';

    } else {
        return 'END';
    }

}


socket.on("returnWSCStatementFailure", function(details){
    if(details != null){
        displayError("Statement failure: \'"+details+"\'");
    } else {
        displayError("Unknown statement failure");
    }
    statementComplete();
});

/////////////

function injectWSCChoiceStruct(choiceStruct){
    wscChoiceStruct = choiceStruct;
    g_profMap = objToMap(choiceStruct.ProfObject);
    updateExpressionProcessor({
        ChoiceStruct : choiceStruct,
    });
}

socket.on("returnWSCUpdateChoices", function(updateType, updateData){
    //if(processingDebug) {console.log("Updating choiceStruct part...");}

    if(updateType == 'ABILITY-BOOSTS'){
        wscChoiceStruct.BonusArray = updateData;
        updateAbilityMap();
    } else if(updateType == 'FEATS'){
        wscChoiceStruct.FeatArray = updateData;
    } else if(updateType == 'DOMAINS'){
        wscChoiceStruct.DomainArray = updateData;
    } else {
        displayError("Failed to update correct charChoice data!");
        if(processingDebug) {console.error('Failed to update correct charChoice data!');}
    }
    
    updateExpressionProcessor({
        ChoiceStruct : wscChoiceStruct,
    });
});

socket.on("returnWSCUpdateFeats", function(featObject){
    let featMap = objToMap(featObject);
    featMap = new Map([...featMap.entries()].sort(
        function(a, b) {
            if (a[1].Feat.level === b[1].Feat.level) {
                // Name is only important when levels are the same
                return a[1].Feat.name > b[1].Feat.name ? 1 : -1;
            }
            return b[1].Feat.level - a[1].Feat.level;
        })
    );
    //if(processingDebug) {console.log("Updating featMap...");}
    g_featMap = featMap;
    g_featMap = updateFeatMapWithMiscs(g_featMap);
});

socket.on("returnWSCUpdateLangs", function(langObject){
    let langMap = objToMap(langObject);
    //if(processingDebug) {console.log("Updating langMap...");}
    g_langMap = new Map([...langMap.entries()].sort(
        function(a, b) {
            return a[1].Lang.name > b[1].Lang.name ? 1 : -1;
        })
    );
});

socket.on("returnWSCUpdateSpells", function(spellObject){
    let spellsMap = objToMap(spellObject);
    spellsMap = new Map([...spellsMap.entries()].sort(
        function(a, b) {
            if (a[1].Spell.level === b[1].Spell.level) {
                // Name is only important when levels are the same
                return a[1].Spell.name > b[1].Spell.name ? 1 : -1;
            }
            return b[1].Spell.level - a[1].Spell.level;
        })
    );
    //if(processingDebug) {console.log("Updating spellMap...");}
    g_spellMap = spellsMap;
});

socket.on("returnWSCUpdateArchetypes", function(archetypesArray){
    //if(processingDebug) {console.log("Updating ArchetypesArray...");}
    g_archetypes = archetypesArray;
});

//////////////

function clearDataFromSrcStruct(srcStruct){
  let newSrcStruct = cloneObj(srcStruct);
  newSrcStruct.sourceCodeSNum = newSrcStruct.sourceCodeSNum.substring(1);
  socket.emit("requestWSCSrcStructDataClear",// FYI - No longer returns choiceStruct
      getCharIDFromURL(),
      newSrcStruct);
}

socket.on("returnWSCSrcStructDataClear", function(choiceStruct){
  injectWSCChoiceStruct(choiceStruct);
  statementComplete();
});

//////////////

function processBuilderCode_ClassAbilities(classAbilities, classNum){
    //if(processingDebug) {console.log("Starting to run class abilities code...");}
    temp_classAbilities = classAbilities;
    temp_classNum = classNum;
    for(const classAbility of classAbilities) {
        if(classAbility.selectType != 'SELECT_OPTION' && classAbility.level <= wscChoiceStruct.Character.level) {
            let srcStruct = {
                sourceType: getClassSourceType(classNum),
                sourceLevel: classAbility.level,
                sourceCode: 'classAbility-'+classAbility.id,
                sourceCodeSNum: 'a',
            };

            const classFeatureCode = replaceClassFeatureCodeFromClassArchetype(classAbility.id, classAbility.code, srcStruct);

            $('#classAbilityCode-'+classNum+'-'+classAbility.id).html('');
            processBuilderCode(
                classFeatureCode,
                srcStruct,
                'classAbilityCode-'+classNum+'-'+classAbility.id,
                classAbility.name+' (Lvl '+classAbility.level+')');
        }
    }
}

function processBuilderCode_AncestryAbilities(ancestryFeatsLocs){
    //if(processingDebug) {console.log("Starting to run ancestry feats code...");}
    temp_ancestryFeatsLocs = ancestryFeatsLocs;
    let ancestryFeatCount = 0;
    for(const ancestryFeatsLoc of ancestryFeatsLocs) {
        if(ancestryFeatsLoc == null) {continue;}
        let srcStruct = {
            sourceType: 'ancestry',
            sourceLevel: ancestryFeatsLoc.Level,
            sourceCode: 'ancestryFeat-'+ancestryFeatCount,
            sourceCodeSNum: 'a',
        };
        $('#'+ancestryFeatsLoc.LocationID).html('');
        processBuilderCode(
            'GIVE-ANCESTRY-FEAT='+ancestryFeatsLoc.Level,
            srcStruct,
            ancestryFeatsLoc.LocationID,
            'Ancestry Feat (Lvl '+ancestryFeatsLoc.Level+')');
        ancestryFeatCount++;
    }
}