export function mobileQuery() {
  return tabletQuery();
}

export function tabletQuery() {
  return `(max-width: 64em)`;
}

export function phoneQuery() {
  return `(max-width: 32em)`;
}
