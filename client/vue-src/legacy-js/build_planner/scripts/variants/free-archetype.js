/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

function addFreeArchetypeVariant(classStruct){
  for (let lvl = 2; lvl <= 20; lvl += 2) {
    classStruct.Abilities.push(getArchetypeClassAbility(lvl));
  }
  return classStruct;
}

function getArchetypeClassAbility(lvl){
  return {
    id: -1000+(-1*lvl),
    name: "Archetype Feat",
    level: lvl,
    description: "You gain a class feat that you can only select archetype feats with.",
    code: "GIVE-ARCHETYPE-FEAT="+lvl,
    contentSrc: "CRB",
    displayInSheet: 0,
    selectType: "NONE",
    selectOptionFor: null,
    isArchived: 0,
  };
}