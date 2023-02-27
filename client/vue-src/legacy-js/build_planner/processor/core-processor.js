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
let gCode_statements, gCode_srcStruct, gCode_locationID, gCode_extraData;
const PROCESS_RETURN = {
  NEXT: 'NEXT',
  END: 'END',
  UNKNOWN: 'UNKNOWN',
};
//                  //

function processCode(wscCode, srcStruct, locationID, extraData){
    if(wscCode == null || wscCode.trim() == ''){ return; }
    if(extraData == null){ extraData = {source: 'Unknown', sourceName: ''}; }

    // Process Variables
    wscCode = processVariables(wscCode, `newCoreCode-${srcStructToCompositeKey(srcStruct)}`);

    // Add Loading Animiation //
    $('#'+locationID).append('<div class="wsc-statement-roller"><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div></div>');

    // Clone srcStruct object (to prevent some concurrency issues)
    let newSrcStruct = cloneObj(srcStruct);

    codeDecompiling(wscCode, newSrcStruct, locationID, extraData);

}

function codeDecompiling(wscCode, srcStruct, locationID, extraData){

  codeQueue.push({ wscCode, srcStruct, locationID, extraData });

  if(!runningCodeQueue){
    shiftCodeQueue();
  }

}

function stopCodeProcessing(){
  codeQueue = [];
  gCode_statements = null;
  gCode_srcStruct = null;
  gCode_locationID = null;
  gCode_extraData = null;
}

function shiftCodeQueue(){

    runningCodeQueue = true;
    let code = codeQueue.shift();

    if(processingDebug) {console.log("Starting Code Queue:");}
    if(processingDebug) {console.log(code);}
    if(code != null){
        gCode_statements = code.wscCode.split(/\n/);
        gCode_locationID = code.locationID;
        gCode_extraData = code.extraData;

        code.srcStruct.sourceCodeSNum = 'a'+code.srcStruct.sourceCodeSNum;
        gCode_srcStruct = code.srcStruct;
        
        // Start running statements,
        statementNext();
    } else {
        runningCodeQueue = false;
        if(processingDebug) {console.log("No More Code Queues Remaining :)");}
        finishLoadingPage();
    }
    
}

function statementNext(){
  const stateReturn = runQueuedStatement();
  if(stateReturn === PROCESS_RETURN.END){
    if(processingDebug) {console.log("Code Queue Complete");}
    shiftCodeQueue();
  } else if(stateReturn === PROCESS_RETURN.NEXT){
    statementComplete_new();
  }
}

function statementComplete_new(){
  if(gCode_srcStruct == null) { return; }
  if(processingDebug) {console.log("Statement Complete, onto next statement...");}

  if(processingDebug) {console.log(gCode_srcStruct.sourceCodeSNum);}
  // Up ticks the first digit in the sourceCodeSNum string.
  let sourceCodeSNum = gCode_srcStruct.sourceCodeSNum;
  let firstChar = sourceCodeSNum[0]; // Get first char
  sourceCodeSNum = sourceCodeSNum.substr(1); // Remove first char
  firstChar = processor_charIncrease(firstChar);
  if(firstChar == null){
      displayError("Attempted to run more WSC statements than maximum!");
      return;
  }
  sourceCodeSNum = firstChar+sourceCodeSNum;
  gCode_srcStruct.sourceCodeSNum = sourceCodeSNum;
  if(processingDebug) {console.log(gCode_srcStruct.sourceCodeSNum);}
  
  // Run next statement,
  statementNext();
}

//let timeTrackCount = null;
function statementComplete(calledSource='Unknown'){

  /*
  if(timeTrackCount != null){
    console.timeEnd('track-'+timeTrackCount);
    console.log('   Src: '+calledSource);
    timeTrackCount++;
  } else {
    timeTrackCount = 0;
  }
  
  console.time('track-'+timeTrackCount);
  */
  
}

function runQueuedStatement(){

    let wscStatement = gCode_statements.shift();
    let srcStruct = {
        sourceType: gCode_srcStruct.sourceType,
        sourceLevel: gCode_srcStruct.sourceLevel,
        sourceCode: gCode_srcStruct.sourceCode,
        sourceCodeSNum: gCode_srcStruct.sourceCodeSNum,
    };
    let locationID = gCode_locationID;
    let extraData = gCode_extraData;

    if(processingDebug) {console.log('SRC-STRUCT');}
    if(processingDebug) {console.log(srcStruct);}
    if(processingDebug) {console.log(wscStatement);}
    
    // Remove Loading Animiation //
    $('#'+locationID+' .wsc-statement-roller').remove();

    if(wscStatement != null){
        if(wscStatement.trim() == ''){ return PROCESS_RETURN.NEXT; }
        if(wscStatement.endsWith(',')){ wscStatement = wscStatement.slice(0, -1); }

        // Test/Check Statement for Expressions //
        wscStatement = testExpr(wscStatement, srcStruct);
        if(wscStatement == null) {
          if(g_char_id != null){
            socket.emit("requestDataClearAtSrcStruct",
                g_char_id,
                srcStruct);
          } else {
            saveBuildMetaData();
          }
          deleteDataBySourceStruct(srcStruct);
          return PROCESS_RETURN.NEXT;
        }
        if(wscStatement.trim() == ''){ return PROCESS_RETURN.NEXT; }
        //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//

        let wscStatementUpper = wscStatement.toUpperCase();
        //

        // If it's a removal statement, continue
        if(wscStatementUpper.startsWith('REMOVAL-')){
          return PROCESS_RETURN.NEXT;
        }

        // MiscFeats is run even on tests, which is how the code is run for character builder.
        //  - Probably should change this to a better system in the future.
        const miscFeat_stateReturn = runMiscFeatStatements(wscStatement, wscStatementUpper);
        if(miscFeat_stateReturn != PROCESS_RETURN.UNKNOWN){
          return miscFeat_stateReturn;
        }

        // Builder Compiler
        const builder_stateReturn = runBuilderStatements(wscStatement, wscStatementUpper, srcStruct, locationID, extraData);
        if(builder_stateReturn != PROCESS_RETURN.UNKNOWN){
          return builder_stateReturn;
        }

        // Sheet Compiler
        const sheet_stateReturn = runSheetStatements(wscStatement, wscStatementUpper, srcStruct, locationID, extraData);
        if(sheet_stateReturn != PROCESS_RETURN.UNKNOWN){
          return sheet_stateReturn;
        }

        // AddText will return true or false based on if it successfully processed the statement
        const addText_foundReturn = processStatement_AddText(wscStatement, locationID, true);
        if(addText_foundReturn){
          return PROCESS_RETURN.NEXT;
        }
        

        displayError("Unknown statement (1): \'"+wscStatement+"\'");
        return PROCESS_RETURN.END;

    } else {
        return PROCESS_RETURN.END;
    }

}


socket.on("returnWSCStatementFailure", function(details){
    if(details != null){
        displayError("Statement failure: \'"+details+"\'");
    } else {
        displayError("Unknown statement failure");
    }
});


// WSC statement maximum: 52
function processor_charIncrease(char){
  switch(char) {
    case 'a': return 'b';
    case 'b': return 'c';
    case 'c': return 'd';
    case 'd': return 'e';
    case 'e': return 'f';
    case 'f': return 'g';
    case 'g': return 'h';
    case 'h': return 'i';
    case 'i': return 'j';
    case 'j': return 'k';
    case 'k': return 'l';
    case 'l': return 'm';
    case 'm': return 'n';
    case 'n': return 'o';
    case 'o': return 'p';
    case 'p': return 'q';
    case 'q': return 'r';
    case 'r': return 's';
    case 's': return 't';
    case 't': return 'u';
    case 'u': return 'v';
    case 'v': return 'w';
    case 'w': return 'x';
    case 'x': return 'y';
    case 'y': return 'z';
    case 'z': return 'A';

    case 'A': return 'B';
    case 'B': return 'C';
    case 'C': return 'D';
    case 'D': return 'E';
    case 'E': return 'F';
    case 'F': return 'G';
    case 'G': return 'H';
    case 'H': return 'I';
    case 'I': return 'J';
    case 'J': return 'K';
    case 'K': return 'L';
    case 'L': return 'M';
    case 'M': return 'N';
    case 'N': return 'O';
    case 'O': return 'P';
    case 'P': return 'Q';
    case 'Q': return 'R';
    case 'R': return 'S';
    case 'S': return 'T';
    case 'T': return 'U';
    case 'U': return 'V';
    case 'V': return 'W';
    case 'W': return 'X';
    case 'X': return 'Y';
    case 'Y': return 'Z';
    case 'Z': return null;

    default: return null;
  }
}