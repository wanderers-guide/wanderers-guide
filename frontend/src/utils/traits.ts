export type TraitType =
  | 'GENERAL'
  | 'SKILL'
  | 'INVESTED'
  | 'EXPLORATION'
  | 'DOWNTIME'
  | 'CONSUMABLE'
  | 'BRUTAL'
  | 'THROWN'
  | 'THROWN-5'
  | 'THROWN-10'
  | 'THROWN-15'
  | 'THROWN-20'
  | 'THROWN-25'
  | 'THROWN-30'
  | 'THROWN-40'
  | 'THROWN-100'
  | 'THROWN-200'
  | 'SPLASH'
  | 'PROPULSIVE'
  | 'FOCUS'
  | 'CANTRIP'
  | 'BOMB'
  | 'AGILE'
  | 'FINESSE'
  | 'FLEXIBLE'
  | 'MULTICLASS'
  | 'DEDICATION'
  | 'ARCHAIC'
  | 'MAGICAL'
  | 'STAFF'
  | 'WAND'
  | 'TECH'
  | 'ANALOG'
  | 'TRACKING-1'
  | 'TRACKING-2'
  | 'TRACKING-3'
  | 'TRACKING-4'
  | 'RESILIENT-1'
  | 'RESILIENT-2'
  | 'RESILIENT-3'
  | 'RESILIENT-4'
  | 'AUGMENTATION'
  | 'HINDERING'
  | 'COMPANION'
  | 'PET'
  | 'FAMILIAR'
  | 'NOISY'
  | 'FLARE';
const traitMap: Record<number, TraitType> = {
  // Hardcoded trait ids:
  1437: 'GENERAL',
  1438: 'SKILL',
  1527: 'INVESTED',
  1531: 'CONSUMABLE',
  1457: 'EXPLORATION',
  1466: 'DOWNTIME',
  4182: 'BRUTAL',
  1575: 'THROWN',
  2756: 'THROWN-5',
  1626: 'THROWN-10',
  2755: 'THROWN-15',
  1843: 'THROWN-20',
  2757: 'THROWN-25',
  2758: 'THROWN-30',
  3803: 'THROWN-40',
  4178: 'THROWN-100',
  4205: 'THROWN-200',
  1532: 'SPLASH',
  1579: 'PROPULSIVE',
  1856: 'FOCUS',
  1858: 'CANTRIP',
  1530: 'BOMB',
  1569: 'AGILE',
  1570: 'FINESSE',
  1580: 'FLEXIBLE',
  1446: 'MULTICLASS',
  1445: 'DEDICATION',
  1504: 'MAGICAL',
  1546: 'STAFF',
  1665: 'WAND',
  3668: 'ARCHAIC',
  3677: 'TECH',
  3672: 'ANALOG',
  3673: 'TRACKING-1',
  3674: 'TRACKING-2',
  3675: 'TRACKING-3',
  4001: 'TRACKING-4',
  4002: 'RESILIENT-1',
  4003: 'RESILIENT-2',
  4004: 'RESILIENT-3',
  4005: 'RESILIENT-4',
  4097: 'AUGMENTATION',
  2865: 'HINDERING',
  1538: 'COMPANION',
  4265: 'PET',
  3843: 'FAMILIAR',
  1582: 'NOISY',
  4629: 'FLARE',
};

export function getTraitTypeById(traitId: number): TraitType | null {
  return traitMap[traitId] ?? null;
}

export function getTraitIdByType(traitType: TraitType): number {
  return parseInt(Object.entries(traitMap).find(([id, type]) => type === traitType)?.[0] ?? '');
}

export function hasTraitType(traitType: TraitType, traitIds?: number[]): boolean {
  if (!traitIds) return false;
  return traitIds.some((traitId) => getTraitTypeById(traitId) === traitType);
}
