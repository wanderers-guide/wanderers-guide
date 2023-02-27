/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

const g_keyAbility_SrcStruct = {
  sourceType: 'class',
  sourceLevel: 1,
  sourceCode: 'keyAbility',
  sourceCodeSNum: 'a'
};

//--------------------- Processing Key Ability --------------------//
function processingKeyAbilities(wscStatement, srcStruct, locationID, extraData){

    // SET-KEY-ABILITY=ALL
    // SET-KEY-ABILITY=INT,WIS,CHA
    if(wscStatement.includes("SET-KEY-ABILITY")){
        let selectionOptions = wscStatement.split('=')[1];
        giveAbilityBoostSingle(g_keyAbility_SrcStruct, selectionOptions, locationID, extraData);
    } else {
        displayError("Unknown statement (2-KeyAbility): \'"+wscStatement+"\'");
        statementComplete('KeyAbility - Unknown Statement');
    }

}