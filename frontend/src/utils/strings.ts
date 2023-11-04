
export function pluralize(word: string): string {
  if(word[word.length - 1] === 's') {
    return word+'es';
  } else {
    return word+'s';
  }
}
