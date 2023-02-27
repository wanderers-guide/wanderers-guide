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


function expr_getProfUserBonus(profBonus){
  let numBonus = parseInt(profBonus);
  return (isNaN(numBonus) ? 0 : numBonus);
}

function expr_getFinalProf(profDataArray) {
  if(profDataArray == null || profDataArray.length == 0) { return null; }

  let finalProfData = null;

  for(const profData of profDataArray){

    let userAdded = false;
    if(profData.sourceType === 'user-added') {
        userAdded = true;
    }

    if(profData.sourceType === 'user-set') { // Hardcoded User-Set Data

        let userBonus = expr_getProfUserBonus(profData.Prof);
        let profOverride = (userBonus == 0);

        if(finalProfData != null){

            let bestProf = getBetterProf(finalProfData.BestProf, profData.Prof);
            let numIncreases = finalProfData.NumIncreases+getUpAmt(profData.Prof);
            if(finalProfData.UserProfOverride){
                bestProf = finalProfData.BestProf;
                numIncreases = finalProfData.NumIncreases;
            }
            if(profOverride){
                bestProf = getBetterProf('U', profData.Prof);
                numIncreases = getUpAmt(profData.Prof);
            }

            let userBonus = expr_getProfUserBonus(profData.Prof);
            finalProfData = {
                ProfName: profData.To,
                BestProf : bestProf,
                NumIncreases : numIncreases,
                For : finalProfData.For,
                UserBonus : ((finalProfData.UserBonus > userBonus) ? finalProfData.UserBonus : userBonus),
                UserProfOverride : profOverride,
                UserAdded : (userAdded || finalProfData.UserAdded),
            };

        } else {

            finalProfData = {
                ProfName: profData.To,
                BestProf : getBetterProf('U', profData.Prof),
                NumIncreases : getUpAmt(profData.Prof),
                For : profData.For,
                UserBonus : userBonus,
                UserProfOverride : profOverride,
                UserAdded : userAdded,
            };

        }

    } else {

        if(finalProfData != null){

            let bestProf = getBetterProf(finalProfData.BestProf, profData.Prof);
            let numIncreases = finalProfData.NumIncreases+getUpAmt(profData.Prof);
            if(finalProfData.UserProfOverride){
                bestProf = finalProfData.BestProf;
                numIncreases = finalProfData.NumIncreases;
            }

            let userBonus = expr_getProfUserBonus(profData.Prof);
            finalProfData = {
                ProfName: profData.To,
                BestProf : bestProf,
                NumIncreases : numIncreases,
                For : finalProfData.For,
                UserBonus : ((finalProfData.UserBonus > userBonus) ? finalProfData.UserBonus : userBonus),
                UserProfOverride : false,
                UserAdded : (userAdded || finalProfData.UserAdded),
            };

        } else {

            finalProfData = {
                ProfName: profData.To,
                BestProf : getBetterProf('U', profData.Prof),
                NumIncreases : getUpAmt(profData.Prof),
                For : profData.For,
                UserBonus : 0,
                UserProfOverride : false,
                UserAdded : userAdded,
            };

        }

    }

  }

  return {
    Name : finalProfData.ProfName,
    NumUps : profToNumUp(finalProfData.BestProf, true)+finalProfData.NumIncreases,
    For : finalProfData.For,
    UserBonus : finalProfData.UserBonus,
    UserProfOverride : finalProfData.UserProfOverride,
    UserAdded : finalProfData.UserAdded,
  };

}

function expr_getUserSetData(profDataArray) {
  if(profDataArray == null || profDataArray.length == 0) { return null; }
  for(const profData of profDataArray){
    if(profData.sourceType === 'user-set' && isNaN(profData.Prof)) {
      return profData;
    }
  }
  return null;
}

function expr_getUserAddedData(profDataArray) {
  if(profDataArray == null || profDataArray.length == 0) { return null; }
  for(const profData of profDataArray){
    if(profData.sourceType === 'user-added') {
      return profData;
    }
  }
  return null;
}