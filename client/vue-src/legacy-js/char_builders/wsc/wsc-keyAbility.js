/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

//--------------------- Processing Key Ability --------------------//
function processingKeyAbilities(wscStatement, srcStruct, locationID, sourceName){

    // SET-KEY-ABILITY=ALL
    // SET-KEY-ABILITY=INT,WIS,CHA
    if(wscStatement.includes("SET-KEY-ABILITY")){
        let selectionOptions = wscStatement.split('=')[1];
        let keyAbilitySrcStruct = {
            sourceType: getClassSourceType(temp_classNum),
            sourceLevel: 1,
            sourceCode: 'keyAbility',
            sourceCodeSNum: 'a'
        };
        giveAbilityBoostSingle(keyAbilitySrcStruct, selectionOptions, locationID, sourceName);
    } else {
        displayError("Unknown statement (2-KeyAbility): \'"+wscStatement+"\'");
        statementComplete();
    }

}