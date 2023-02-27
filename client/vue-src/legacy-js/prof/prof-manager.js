/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

function getProfUserBonus(profBonus){
  let numBonus = parseInt(profBonus);
  return (isNaN(numBonus) ? 0 : numBonus);
}

function getFinalProf(profDataArray) {
  if(profDataArray == null || profDataArray.length == 0) { return null; }

  let finalProfData = null;

  for(const profData of profDataArray){

    let userAdded = false;
    if(profData.sourceType === 'user-added') {
        userAdded = true;
    }

    if(profData.sourceType === 'user-set') { // Hardcoded User-Set Data

        let userBonus = getProfUserBonus(profData.Prof);
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

            let userBonus = getProfUserBonus(profData.Prof);
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

            let userBonus = getProfUserBonus(profData.Prof);
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

function getUserSetData(profDataArray) {
  if(profDataArray == null || profDataArray.length == 0) { return null; }
  for(const profData of profDataArray){
    if(profData.sourceType === 'user-set' && isNaN(profData.Prof)) {
      return profData;
    }
  }
  return null;
}

function getUserAddedData(profDataArray) {
  if(profDataArray == null || profDataArray.length == 0) { return null; }
  for(const profData of profDataArray){
    if(profData.sourceType === 'user-added') {
      return profData;
    }
  }
  return null;
}
