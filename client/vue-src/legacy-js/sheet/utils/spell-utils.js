/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

function getSpellTypeBulmaColor(typeData){
  let typeColor = getSpellTypeColor(typeData);
  let bulmaColor;
  switch(typeColor){
    case 'R': bulmaColor = 'has-text-danger'; break;
    case 'G': bulmaColor = 'has-text-success'; break;
    case 'B': bulmaColor = 'has-text-link'; break;
    case 'RG': bulmaColor = 'has-text-brown'; break;
    case 'GB': bulmaColor = 'has-text-turquoise'; break;
    case 'RB': bulmaColor = 'has-text-purple'; break;
    case 'RGB': bulmaColor = 'has-text-gold'; break;
    case '': bulmaColor = 'has-text-info'; break;
    default: bulmaColor = ''; break;
  }
  return bulmaColor;
}

function getSpellTypeBulmaColor_SlotFilled(typeData){
  let typeColor = getSpellTypeColor(typeData);
  let bulmaColor;
  switch(typeColor){
    case 'R': bulmaColor = 'is-filled-red-spell-slot'; break;
    case 'G': bulmaColor = 'is-filled-green-spell-slot'; break;
    case 'B': bulmaColor = 'is-filled-blue-spell-slot'; break;
    case 'RG': bulmaColor = 'is-filled-brown-spell-slot'; break;
    case 'GB': bulmaColor = 'is-filled-turquoise-spell-slot'; break;
    case 'RB': bulmaColor = 'is-filled-purple-spell-slot'; break;
    case 'RGB': bulmaColor = 'is-filled-multiple-spell-slot'; break;
    case '': bulmaColor = 'is-filled-spell-slot'; break;
    default: bulmaColor = ''; break;
  }
  return bulmaColor;
}

function getSpellTypeBulmaColor_SlotEmpty(typeData){
  let typeColor = getSpellTypeColor(typeData);
  let bulmaColor;
  switch(typeColor){
    case 'R': bulmaColor = 'is-empty-red-spell-slot'; break;
    case 'G': bulmaColor = 'is-empty-green-spell-slot'; break;
    case 'B': bulmaColor = 'is-empty-blue-spell-slot'; break;
    case 'RG': bulmaColor = 'is-empty-brown-spell-slot'; break;
    case 'GB': bulmaColor = 'is-empty-turquoise-spell-slot'; break;
    case 'RB': bulmaColor = 'is-empty-purple-spell-slot'; break;
    case 'RGB': bulmaColor = 'is-empty-multiple-spell-slot'; break;
    case '': bulmaColor = 'is-empty-spell-slot'; break;
    default: bulmaColor = ''; break;
  }
  return bulmaColor;
}


function getSpellTypeColor(typeData) {
  let typeStruct = getSpellTypeStruct(typeData);
  let colorType = '';
  if(typeStruct.Red){
    colorType += 'R';
  }
  if(typeStruct.Green){
    colorType += 'G';
  }
  if(typeStruct.Blue){
    colorType += 'B';
  }
  return colorType;
}


// Spell Color-Types //

function getSpellTypeStruct(typeData){
  let isRedType, isGreenType, isBlueType;
  if(typeData == '' || typeData == null){
      isRedType = false;
      isGreenType = false;
      isBlueType = false;
  } else {
      let slotTypeDataSections = typeData.split(',');
      isRedType = (slotTypeDataSections[0] == 'R:1');
      isGreenType = (slotTypeDataSections[1] == 'G:1');
      isBlueType = (slotTypeDataSections[2] == 'B:1');
  }
  return {Red: isRedType, Green: isGreenType, Blue: isBlueType};
}

function getSpellTypeData(typeStruct){
  let redPart = (typeStruct.Red) ? 'R:1' : 'R:0';
  let greenPart = (typeStruct.Green) ? 'G:1' : 'G:0';
  let bluePart = (typeStruct.Blue) ? 'B:1' : 'B:0';
  return redPart+','+greenPart+','+bluePart;
}

function updateSpellBookSpellType(spellBookSpellID, spellType){
  for(let spellBook of g_spellBookArray){
    for(let spellBookSpell of spellBook.SpellBook){
      if(spellBookSpell.SpellBookSpellID == spellBookSpellID){
        spellBookSpell.SpellType = spellType;
        return;
      }
    }
  }
}