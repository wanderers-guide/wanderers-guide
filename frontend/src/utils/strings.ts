
export function pluralize(word: string): string {
  if (word[word.length - 1] === 'y') {
    return word.substring(0, word.length - 1) + 'ies';
  } else if(word[word.length - 1] === 's') {
    return word+ 'es';
  } else {
    return word+'s';
  }
}
