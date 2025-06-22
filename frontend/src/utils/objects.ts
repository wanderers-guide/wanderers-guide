import { keys, union, isEqual, isObject } from 'lodash-es';

export function getDeepDiff(obj1: any, obj2: any) {
  const changes: Record<string, any> = {};

  function compare(o1: any, o2: any, path: string[] = []) {
    const allKeys = union(keys(o1), keys(o2));
    for (const key of allKeys) {
      const fullPath = [...path, key];
      const val1 = o1?.[key];
      const val2 = o2?.[key];

      if (isEqual(val1, val2)) continue;

      if (isObject(val1) && isObject(val2)) {
        compare(val1, val2, fullPath);
      } else {
        changes[fullPath.join('.')] = { from: val1, to: val2 };
      }
    }
  }

  compare(obj1, obj2);
  return changes;
}
