/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

function getCharIDFromURL(){
  return $('#char-builder-container').attr('data-char-id');
}

function getAllAbilityTypes() {
  return ['Strength','Dexterity','Constitution','Intelligence','Wisdom','Charisma'];
}

/* Duplicate Checking */
function hasDuplicateSelected(selectOptions) {
  let optionValArray = [];
  $(selectOptions).each(function() {
      if($(this).val() != "chooseDefault"){
          optionValArray.push($(this).val());
      }
  });
  return (new Set(optionValArray)).size !== optionValArray.length;
}

function hasDuplicateFeat(featArray, featID){
  for(const feat of featArray){
    if(feat.value != null && feat.value.id == featID) {
      return true;
    }
  }
  return false;
}

function hasDuplicateLang(langArray, langID){
  for(const lang of langArray){
    if(lang.value.id == langID) {
      return true;
    }
  }
  return false;
}

// WSC statement maximum: 52
function charIncrease(char){
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