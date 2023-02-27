/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

function readExpr(wscCode){
  // IF(*){*} or IF(*){*}ELSE{*}
  let rMatchIf = wscCode.match(/^\s*IF\s*\((.*?)\)\s*\{(.*?)\}\s*$/);
  let rMatchIfElse = wscCode.match(/^\s*IF\s*\((.*?)\)\s*\{(.*?)\}\s*ELSE\s*\{(.*?)\}\s*$/);
  let rMatchIfSheet = wscCode.match(/^\s*IF-SHEET\s*\((.*?)\)\s*\{(.*?)\}\s*$/);
  if(rMatchIf == null && rMatchIfElse == null && rMatchIfSheet == null) { return null; }

  let expression;
  let statement;
  let elseStatement;
  let isSheetOnly = false;
  if(rMatchIfElse != null){
      expression = rMatchIfElse[1];
      statement = rMatchIfElse[2];
      elseStatement = rMatchIfElse[3];
  } else if(rMatchIf != null){
      expression = rMatchIf[1];
      statement = rMatchIf[2];
      elseStatement = null;
  } else if(rMatchIfSheet != null){
      expression = rMatchIfSheet[1];
      statement = rMatchIfSheet[2];
      elseStatement = null;
      isSheetOnly = true;
  }
  return {expression, statement, elseStatement, isSheetOnly};
}