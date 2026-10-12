import type { ArmorGrade, Item } from '@schemas/content';

export const ARMOR_GRADES: readonly ArmorGrade[] = [
  'COMMERCIAL',
  'TACTICAL',
  'ADVANCED',
  'SUPERIOR',
  'ELITE',
  'ULTIMATE',
  'PARAGON',
];

// Player Core, Armor Statistics. Values are cumulative from Commercial.
const improvements = [
  { level: 0, price: 0, slots: 0, ac: 0, resilience: 0 },
  { level: 5, price: 1600, slots: 1, ac: 1, resilience: 0 },
  { level: 8, price: 5000, slots: 1, ac: 1, resilience: 1 },
  { level: 11, price: 14000, slots: 2, ac: 2, resilience: 1 },
  { level: 14, price: 45000, slots: 2, ac: 2, resilience: 2 },
  { level: 18, price: 240000, slots: 3, ac: 3, resilience: 2 },
  { level: 20, price: 700000, slots: 3, ac: 3, resilience: 3 },
] as const;

type FinalArmorGradeView = {
  kind: 'final';
  grade: ArmorGrade;
  baseGrade: ArmorGrade;
  level: number;
  price: Item['price'];
  priceDelta: number;
  acBonus: number;
  acDelta: number;
  upgradeSlots: number;
  resilience: number;
};

export type ArmorGradeView = { kind: 'legacy' | 'invalid' } | FinalArmorGradeView;

/** Read a final printing without changing its printed fields or saved snapshot. */
export function getArmorGradeView(item: Item): ArmorGradeView {
  const metadata = item.meta_data?.starfinder;
  if (metadata?.base_grade === undefined && metadata?.base_upgrade_slots === undefined) {
    return { kind: metadata?.built_in_upgrades === undefined ? 'legacy' : 'invalid' };
  }
  const baseIndex = ARMOR_GRADES.indexOf(metadata?.base_grade as ArmorGrade);
  const grade = metadata?.grade ?? metadata?.base_grade;
  const selectedIndex = ARMOR_GRADES.indexOf(grade as ArmorGrade);
  const slots = metadata?.base_upgrade_slots;
  const ac = item.meta_data?.ac_bonus;
  const dexCap = item.meta_data?.dex_cap;
  if (
    item.group !== 'ARMOR' ||
    !Number.isFinite(ac) ||
    !Number.isFinite(dexCap) ||
    baseIndex < 0 ||
    selectedIndex < baseIndex ||
    !Number.isInteger(slots) ||
    (slots as number) < 0 ||
    !Number.isFinite(item.level) ||
    (item.price != null &&
      Object.values(item.price).some((value) => value !== undefined && !Number.isFinite(Number(value))))
  ) {
    return { kind: 'invalid' };
  }
  const base = improvements[baseIndex];
  const selected = improvements[selectedIndex];
  const priceDelta = selected.price - base.price;
  return {
    kind: 'final',
    grade: grade as ArmorGrade,
    baseGrade: metadata!.base_grade!,
    level: Math.max(item.level, selected.level),
    price:
      item.price == null
        ? null
        : { ...item.price, ...(priceDelta ? { sp: Number(item.price.sp ?? 0) + priceDelta } : {}) },
    priceDelta,
    acBonus: (ac as number) + selected.ac - base.ac,
    acDelta: selected.ac - base.ac,
    upgradeSlots: (slots as number) + selected.slots - base.slots,
    resilience: selected.resilience,
  };
}

export function getEffectiveItemPrice(item: Item): Item['price'] {
  const view = getArmorGradeView(item);
  return view.kind === 'final' ? view.price : item.price;
}

export function getEffectiveItemLevel(item: Item): number {
  const view = getArmorGradeView(item);
  return view.kind === 'final' ? view.level : item.level;
}

/** An active grade grant cannot be confused with a same-label operation or another printing. */
export function getArmorGradeBonusKey(item: Item): string | undefined {
  const view = getArmorGradeView(item);
  return view.kind === 'final'
    ? JSON.stringify([item.id, item.content_source_id, view.baseGrade, view.grade, view.acBonus])
    : undefined;
}
