/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

function getCharIDFromURL(){
    return window.location.pathname.split("characters/")[1];
}

function hasEnabledSource(codeName){
  const source = g_enabledSources.find(source => {
    return source.codeName != null && source.codeName == codeName;
  });
  return source != null;
}

function getBulmaTextColorFromCurrentHP(currentHP, maxHP) {
  if(currentHP >= maxHP*0.8){
    return "has-text-success";
  } else if(currentHP >= maxHP*0.5){
    return "has-text-warning";
  } else {
    return "has-text-danger";
  }
}
function getAnimationDelayFromCurrentHP(currentHP, maxHP) {
  let value = currentHP*(100/maxHP);
  return `-${Math.floor(value-0.0001)}s`;
}

function dieTypeToNum(dieType){
  switch(dieType) {
    case '':
      return 1;
    case 'd2':
      return 2;
    case 'd4':
      return 4;
    case 'd6':
      return 6;
    case 'd8':
      return 8;
    case 'd10':
      return 10;
    case 'd12':
      return 12;
    case 'd20':
      return 20;
    default:
      return 0;
  }
}

function textContainsWords(text, wordArray){
  if(text == null || wordArray.length == 0) {return false;}
  text = text.toUpperCase();

  // If words are in quotes, treat as a singular word.
  let firstLetter = wordArray[0].slice(0,1);
  let lastLetter = wordArray[wordArray.length-1].slice(-1);
  if(firstLetter == '\'' || firstLetter == '"' || firstLetter == '`'){
    if(firstLetter === lastLetter){
      let oneWord = '';
      for(let word of wordArray){
        if(oneWord != '') { oneWord += ' '; }
        oneWord += word;
      }
      oneWord = oneWord.substring(1); // Remove first character
      oneWord = oneWord.substring(0, oneWord.length-1); // Remove last character
      wordArray = [oneWord];
    }
  }

  for(let word of wordArray){
    if(!text.includes(word)){
      return false;
    }
  }
  return true;
}