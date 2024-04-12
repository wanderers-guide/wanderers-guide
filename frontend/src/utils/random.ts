export function rollDie(dieType: string): number {
  const sides = parseInt(dieType.slice(1));
  if (isNaN(sides)) {
    throw new Error('Invalid dice notation');
  }
  return Math.floor(Math.random() * sides) + 1;
}

export function selectRandom<T>(items: T[]): T {
  const randomIndex = Math.floor(Math.random() * items.length);
  return items[randomIndex];
}
