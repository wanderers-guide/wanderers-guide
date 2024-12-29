import { Rarity } from '@typing/content';
import * as _ from 'lodash-es';

export function sign(num: number | string): string {
  num = _.isString(num) ? parseFloat(num) : num;
  return num < 0 ? `${num}` : `+${num}`;
}

export function rankNumber(num: number, zeroName = '0'): string {
  return num === 0 ? zeroName : num === 1 ? '1st' : num === 2 ? '2nd' : num === 3 ? '3rd' : `${num}th`;
}

export function getDcForLevel(level: number, rarity?: Rarity): number {
  const dcLevelMap: Record<number, number> = {
    0: 14,
    1: 15,
    2: 16,
    3: 18,
    4: 19,
    5: 20,
    6: 22,
    7: 23,
    8: 24,
    9: 26,
    10: 27,
    11: 28,
    12: 30,
    13: 31,
    14: 32,
    15: 34,
    16: 35,
    17: 36,
    18: 38,
    19: 39,
    20: 40,
    21: 42,
    22: 44,
    23: 46,
    24: 48,
    25: 50,
  };

  let dc = dcLevelMap[level];
  if (level > 25) {
    dc = dcLevelMap[25] + (level - 25) * 2;
  } else if (level < 0) {
    dc = dcLevelMap[0];
  }

  if (rarity) {
    if (rarity === 'UNCOMMON') {
      dc += 2;
    } else if (rarity === 'RARE') {
      dc += 5;
    } else if (rarity === 'UNIQUE') {
      dc += 10;
    }
  }

  return dc;
}

export function hashData(data: Record<string, any>): number {
  return cyrb53(JSON.stringify(data));
}

/*
    cyrb53 (c) 2018 bryc (github.com/bryc)
    License: Public domain. Attribution appreciated.
    A fast and simple 53-bit string hash function with decent collision resistance.
    Largely inspired by MurmurHash2/3, but with a focus on speed/simplicity.
*/
const cyrb53 = (str: string, seed = 0) => {
  let h1 = 0xdeadbeef ^ seed,
    h2 = 0x41c6ce57 ^ seed;
  for (let i = 0, ch; i < str.length; i++) {
    ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);

  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
};
