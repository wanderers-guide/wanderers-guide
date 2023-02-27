/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

function getFirstSentence(text){
  let rSent = text.match(/^.*?[\.!\?](?:\s|$)/);
  if(rSent != null){
    return rSent[0];
  } else {
    return '';
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