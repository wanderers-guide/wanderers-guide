export function intersection<T>(set1: Set<T> | Array<T>, set2: Set<T> | Array<T>): Set<T> {
  if (Array.isArray(set1)) set1 = new Set(set1);
  if (Array.isArray(set2)) set2 = new Set(set2);

  const intersectedSet = new Set<T>();
  for (const el of set1) {
    if (set2.has(el)) intersectedSet.add(el);
  }

  return intersectedSet;
}
