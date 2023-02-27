/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

function getAnimalCompanionMaxHealth(charAnimal){

  let animal = g_companionData.AllAnimalCompanions.find(animal => {
      return animal.id == charAnimal.animalCompanionID;
  });
  if(animal == null){
      return -1;
  }

  let maxHP = animal.hitPoints;
  maxHP += (6+getAnimalModCon(animal, charAnimal))*g_character.level;

  return maxHP;

}

////

let g_animalSpecialArray = null;
function initAnimalSpecializationArray(charAnimal){
  if(charAnimal.specialization == 'NONE'){
    g_animalSpecialArray = [];
  } else {
    try {
      g_animalSpecialArray = JSON.parse(charAnimal.specialization);
    } catch (error) {
      g_animalSpecialArray = [];
    }
  }
}

function animalHasSpecial(specialName){
  return g_animalSpecialArray.includes(specialName);
}

function animalHasAnySpecial(){
  return g_animalSpecialArray.length > 0;
}

////

function getAnimalModStr(animal, charAnimal){
  let modStr = animal.modStr;
  if(animalHasSpecial('BULLY')){ modStr += 1; }
  if(animalHasSpecial('WRECKER')){ modStr += 1; }
  switch(charAnimal.age){
    case 'YOUNG': return modStr;
    case 'MATURE': return modStr+1;
    case 'NIMBLE': return modStr+2;
    case 'SAVAGE': return modStr+3;
    case 'INDOMITABLE': return modStr+2;
    case 'UNSEEN': return modStr+2;
    default: return -1;
  }
}

function getAnimalModDex(animal, charAnimal){
  let modDex = animal.modDex;
  if(animalHasAnySpecial()){ modDex += 1; }
  if(animalHasSpecial('AMBUSHER')){ modDex += 1; }
  if(animalHasSpecial('DAREDEVIL')){ modDex += 1; }
  switch(charAnimal.age){
    case 'YOUNG': return modDex;
    case 'MATURE': return modDex+1;
    case 'NIMBLE': return modDex+3;
    case 'SAVAGE': return modDex+2;
    case 'INDOMITABLE': return modDex+2;
    case 'UNSEEN': return modDex+2;
    default: return -1;
  }
}

function getAnimalModCon(animal, charAnimal){
  let modCon = animal.modCon;
  if(animalHasSpecial('RACER')){ modCon += 1; }
  switch(charAnimal.age){
    case 'YOUNG': return modCon;
    case 'MATURE': return modCon+1;
    case 'NIMBLE': return modCon+2;
    case 'SAVAGE': return modCon+2;
    case 'INDOMITABLE': return modCon+3;
    case 'UNSEEN': return modCon+2;
    default: return -1;
  }
}

function getAnimalModInt(animal, charAnimal){
  let modInt = animal.modInt;
  if(animalHasAnySpecial()){ modInt += 2; }
  switch(charAnimal.age){
    case 'YOUNG': return modInt;
    case 'MATURE': return modInt;
    case 'NIMBLE': return modInt;
    case 'SAVAGE': return modInt;
    case 'INDOMITABLE': return modInt;
    case 'UNSEEN': return modInt;
    default: return -1;
  }
}

function getAnimalModWis(animal, charAnimal){
  let modWis = animal.modWis;
  if(animalHasSpecial('TRACKER')){ modWis += 1; }
  switch(charAnimal.age){
    case 'YOUNG': return modWis;
    case 'MATURE': return modWis+1;
    case 'NIMBLE': return modWis+2;
    case 'SAVAGE': return modWis+2;
    case 'INDOMITABLE': return modWis+2;
    case 'UNSEEN': return modWis+3;
    default: return -1;
  }
}

function getAnimalModCha(animal, charAnimal){
  let modCha = animal.modCha;
  if(animalHasSpecial('BULLY')){ modCha += 3; }
  switch(charAnimal.age){
    case 'YOUNG': return modCha;
    case 'MATURE': return modCha;
    case 'NIMBLE': return modCha;
    case 'SAVAGE': return modCha;
    case 'INDOMITABLE': return modCha;
    case 'UNSEEN': return modCha;
    default: return -1;
  }
}

//

function getAnimalDamageDieNumber(animal, charAnimal){
  if(animalHasAnySpecial()){
    return 3;
  }
  switch(charAnimal.age){
    case 'YOUNG': return 1;
    case 'MATURE': return 2;
    case 'NIMBLE': return 2;
    case 'SAVAGE': return 2;
    case 'INDOMITABLE': return 2;
    case 'UNSEEN': return 2;
    default: return -1;
  }
}

function getAnimalAdditionalDamage(animal, charAnimal){
  switch(charAnimal.age){
    case 'YOUNG': return 0;
    case 'MATURE': return 0;
    case 'NIMBLE':
      if(animalHasAnySpecial()){ return 4; }
      return 2;
    case 'SAVAGE':
      if(animalHasAnySpecial()){ return 6; }
      return 3;
    case 'INDOMITABLE':
      if(animalHasAnySpecial()){ return 6; }
      return 3;
    case 'UNSEEN':
      if(animalHasAnySpecial()){ return 6; }
      return 3;
    default: return -1;
  }
}

//

function hasAnimalAdvancedManeuver(animal, charAnimal){
  switch(charAnimal.age){
    case 'YOUNG': return false;
    case 'MATURE': return false;
    case 'NIMBLE': return true;
    case 'SAVAGE': return true;
    case 'INDOMITABLE': return true;
    case 'UNSEEN': return true;
    default: return false;
  }
}

function hasAnimalMagicalAttacks(animal, charAnimal){
  switch(charAnimal.age){
    case 'YOUNG': return false;
    case 'MATURE': return false;
    case 'NIMBLE': return true;
    case 'SAVAGE': return true;
    case 'INDOMITABLE': return true;
    case 'UNSEEN': return true;
    default: return false;
  }
}

//

function getAnimalSpecializationArray(charAnimal){
  if(!animalHasAnySpecial()){
    return null;
  }
  let specializationArray = [];
  if(animalHasSpecial('AMBUSHER')){
    specializationArray.push('In your companion’s natural environment, it can use a (action: Sneak) action even if it’s currently observed. It gains a +2 circumstance bonus to initiative rolls using Stealth.');
  }
  if(animalHasSpecial('BULLY')){
    //
  }
  if(animalHasSpecial('DAREDEVIL')){
    specializationArray.push('Your companion gains the deny advantage ability, so it isn’t flat-footed to hidden, undetected, or flanking creatures unless such a creature’s level is greater than yours.');
  }
  if(animalHasSpecial('RACER')){
    specializationArray.push('Your companion gains a +10-foot status bonus to its Speed, swim Speed, or fly Speed (your choice).');
  }
  if(animalHasSpecial('TRACKER')){
    specializationArray.push('Your companion can move at full Speed while following tracks.');
  }
  if(animalHasSpecial('WRECKER')){
    specializationArray.push('Your companion’s unarmed attacks ignore half an object’s Hardness.');
  }
  return specializationArray;
}

//

function getAnimalUnarmedAttacksNumUps(animal, charAnimal){
  if(animalHasAnySpecial()){
    return 2;
  }
  switch(charAnimal.age){
    case 'YOUNG': return 1;
    case 'MATURE': return 1;
    case 'NIMBLE': return 1;
    case 'SAVAGE': return 1;
    case 'INDOMITABLE': return 1;
    case 'UNSEEN': return 1;
    default: return -1;
  }
}

function getAnimalUnarmoredDefenseNumUps(animal, charAnimal){
  let cNumUps = 0;
  if(animalHasSpecial('AMBUSHER')){ cNumUps += 1; }
  if(animalHasSpecial('DAREDEVIL')){ cNumUps += 1; }
  if(animalHasSpecial('SHADE')){ cNumUps += 1; }
  switch(charAnimal.age){
    case 'YOUNG': return cNumUps+1;
    case 'MATURE': return cNumUps+1;
    case 'NIMBLE': return cNumUps+2;
    case 'SAVAGE': return cNumUps+1;
    case 'INDOMITABLE': return cNumUps+1;
    case 'UNSEEN': return cNumUps+1;
    default: return -1;
  }
}

//

function getAnimalSize(animal, charAnimal){
  let matureSize = function(size){
    if(size == 'TINY'){
      return 'SMALL';
    } else if(size == 'SMALL' || size == 'SMALL-MED'){
      return 'MEDIUM';
    } else if(size == 'MEDIUM' || size == 'MED-LARGE'){
      return 'LARGE';
    }
    return size;
  };
  switch(charAnimal.age){
    case 'YOUNG': return animal.size;
    case 'MATURE': return matureSize(animal.size);
    case 'NIMBLE': return matureSize(animal.size);
    case 'SAVAGE': return matureSize(matureSize(animal.size));
    case 'INDOMITABLE': return matureSize(matureSize(animal.size));
    case 'UNSEEN': return matureSize(animal.size);
    default: return null;
  }
}

//

function getAnimalSkillNumUps(animal, charAnimal, skillName){
  switch(skillName){
    case 'intimidation': return getAnimalIntimidationNumUps(animal, charAnimal);
    case 'stealth': return getAnimalStealthNumUps(animal, charAnimal);
    case 'survival': return getAnimalSurvivalNumUps(animal, charAnimal);
    case 'acrobatics': return getAnimalAcrobaticsNumUps(animal, charAnimal);
    case 'athletics': return getAnimalAthleticsNumUps(animal, charAnimal);
    default: return 1;
  }
}

function getAnimalAcrobaticsNumUps(animal, charAnimal){
  if(animalHasSpecial('DAREDEVIL')){ return 3; }
  switch(charAnimal.age){
    case 'YOUNG': return 1;
    case 'MATURE': return 1;
    case 'NIMBLE': return 2;
    case 'SAVAGE': return 1;
    case 'INDOMITABLE': return 1;
    case 'UNSEEN': return 1;
    default: return -1;
  }
}

function getAnimalAthleticsNumUps(animal, charAnimal){
  let cNumUps = 0;
  if(animalHasSpecial('WRECKER')){ return 3; }
  if(animalHasSpecial('BULLY')){ cNumUps += 1; }
  switch(charAnimal.age){
    case 'YOUNG': return cNumUps+1;
    case 'MATURE': return cNumUps+1;
    case 'NIMBLE': return cNumUps+1;
    case 'SAVAGE': return cNumUps+2;
    case 'INDOMITABLE': return cNumUps+2;
    case 'UNSEEN': return cNumUps+1;
    default: return -1;
  }
}

function getAnimalIntimidationNumUps(animal, charAnimal){
  let cNumUps = animal.skills.includes('intimidation') ? 1 : 0;
  if(animalHasSpecial('BULLY')){ cNumUps += 1; }
  switch(charAnimal.age){
    case 'YOUNG': return cNumUps+0;
    case 'MATURE': return cNumUps+1;
    case 'NIMBLE': return cNumUps+1;
    case 'SAVAGE': return cNumUps+1;
    case 'INDOMITABLE': return cNumUps+1;
    case 'UNSEEN': return cNumUps+1;
    default: return -1;
  }
}

function getAnimalStealthNumUps(animal, charAnimal){
  let cNumUps = animal.skills.includes('stealth') ? 1 : 0;
  if(animalHasSpecial('AMBUSHER')){ cNumUps += 1; }
  switch(charAnimal.age){
    case 'YOUNG': return cNumUps+0;
    case 'MATURE': return cNumUps+1;
    case 'NIMBLE': return cNumUps+1;
    case 'SAVAGE': return cNumUps+1;
    case 'INDOMITABLE': return cNumUps+1;
    case 'UNSEEN': return cNumUps+2;
    default: return -1;
  }
}

function getAnimalSurvivalNumUps(animal, charAnimal){
  let cNumUps = animal.skills.includes('survival') ? 1 : 0;
  if(animalHasSpecial('TRACKER')){ cNumUps += 1; }
  switch(charAnimal.age){
    case 'YOUNG': return cNumUps+0;
    case 'MATURE': return cNumUps+1;
    case 'NIMBLE': return cNumUps+1;
    case 'SAVAGE': return cNumUps+1;
    case 'INDOMITABLE': return cNumUps+1;
    case 'UNSEEN': return cNumUps+1;
    default: return -1;
  }
}

//

function getAnimalPerceptionNumUps(animal, charAnimal){
  if(animalHasAnySpecial()){
    return 3;
  }
  switch(charAnimal.age){
    case 'YOUNG': return 1;
    case 'MATURE': return 2;
    case 'NIMBLE': return 2;
    case 'SAVAGE': return 2;
    case 'INDOMITABLE': return 2;
    case 'UNSEEN': return 2;
    default: return -1;
  }
}

//

function getAnimalFortitudeNumUps(animal, charAnimal){
  if(animalHasSpecial('RACER')){ return 4; }
  if(animalHasAnySpecial()){ return 3; }
  switch(charAnimal.age){
    case 'YOUNG': return 1;
    case 'MATURE': return 2;
    case 'NIMBLE': return 2;
    case 'SAVAGE': return 2;
    case 'INDOMITABLE': return 2;
    case 'UNSEEN': return 2;
    default: return -1;
  }
}

function getAnimalReflexNumUps(animal, charAnimal){
  if(animalHasAnySpecial()){
    return 3;
  }
  switch(charAnimal.age){
    case 'YOUNG': return 1;
    case 'MATURE': return 2;
    case 'NIMBLE': return 2;
    case 'SAVAGE': return 2;
    case 'INDOMITABLE': return 2;
    case 'UNSEEN': return 2;
    default: return -1;
  }
}

function getAnimalWillNumUps(animal, charAnimal){
  if(animalHasAnySpecial()){
    return 3;
  }
  switch(charAnimal.age){
    case 'YOUNG': return 1;
    case 'MATURE': return 2;
    case 'NIMBLE': return 2;
    case 'SAVAGE': return 2;
    case 'INDOMITABLE': return 2;
    case 'UNSEEN': return 2;
    default: return -1;
  }
}

//

function getAnimalExtraText(animal, charAnimal){
  let extraText = '';
  if(animalHasSpecial('SHADE')){
    extraText += '<p>It gains darkvision, resistance 5 to all damage except force, and in areas of dim light or darkness, it can Step 10 feet instead of 5 feet.</p>';
  }
  if(charAnimal.age == 'UNSEEN'){
    extraText += '<p>It deals an extra 1d4 precision damage against flat-footed targets.</p>';
  }
  return extraText;
}