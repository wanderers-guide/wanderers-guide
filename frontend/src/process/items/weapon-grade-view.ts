import type { ArmorGrade, Item } from '@schemas/content';

// Player Core, Weapon Statistics. Values are cumulative from Commercial.
const statistics = {
  COMMERCIAL: { level: 0, price: 0, upgradePrice: 0, slots: 0, dice: 1, tracking: null },
  TACTICAL: { level: 2, price: 350, upgradePrice: 350, slots: 0, dice: 1, tracking: 'TRACKING-1' },
  ADVANCED: { level: 4, price: 1000, upgradePrice: 650, slots: 1, dice: 2, tracking: 'TRACKING-1' },
  SUPERIOR: { level: 10, price: 10000, upgradePrice: 9000, slots: 1, dice: 2, tracking: 'TRACKING-2' },
  ELITE: { level: 12, price: 20000, upgradePrice: 10000, slots: 2, dice: 3, tracking: 'TRACKING-2' },
  ULTIMATE: { level: 16, price: 100000, upgradePrice: 80000, slots: 2, dice: 3, tracking: 'TRACKING-3' },
  PARAGON: { level: 19, price: 400000, upgradePrice: 300000, slots: 3, dice: 4, tracking: 'TRACKING-3' },
} as const;

/** The existing Commercial-based weapon table, shared by marked and unmarked weapons. */
export function getWeaponGradeStatistics(grade: ArmorGrade) {
  return Object.hasOwn(statistics, grade) ? statistics[grade] : statistics.COMMERCIAL;
}

type FinalWeaponGradeView = {
  kind: 'final';
  grade: ArmorGrade;
  baseGrade: ArmorGrade;
  level: number;
  price: Item['price'];
  priceDelta: number;
  upgradePrice: number;
  damageDelta: number;
  upgradeSlots: number;
  tracking: ReturnType<typeof getWeaponGradeStatistics>['tracking'];
};

export type WeaponGradeView = { kind: 'legacy' | 'invalid' } | FinalWeaponGradeView;

/** Apply only improvements above an explicitly authored weapon printing; never rewrite its snapshot. */
export function getWeaponGradeView(item: Item): WeaponGradeView {
  const metadata = item.meta_data?.starfinder;
  if (item.group !== 'WEAPON') return { kind: 'legacy' };
  if (metadata?.base_grade === undefined && metadata?.base_upgrade_slots === undefined) {
    return { kind: metadata?.built_in_upgrades === undefined ? 'legacy' : 'invalid' };
  }
  const baseGrade = metadata?.base_grade;
  const grade = metadata?.grade ?? baseGrade;
  const slots = metadata?.base_upgrade_slots;
  const damage = item.meta_data?.damage;
  if (
    !baseGrade ||
    !grade ||
    !Object.hasOwn(statistics, baseGrade) ||
    !Object.hasOwn(statistics, grade) ||
    statistics[grade].level < statistics[baseGrade].level ||
    !Number.isInteger(slots) ||
    slots === undefined ||
    slots < 0 ||
    metadata.built_in_upgrades !== undefined ||
    !Number.isInteger(Number(damage?.dice)) ||
    Number(damage?.dice) < 1 ||
    !damage?.die ||
    !damage.damageType ||
    !Number.isFinite(item.level) ||
    (item.price != null &&
      Object.values(item.price).some((value) => value !== undefined && !Number.isFinite(Number(value))))
  ) {
    return { kind: 'invalid' };
  }
  const base = statistics[baseGrade];
  const selected = statistics[grade];
  const priceDelta = selected.price - base.price;
  return {
    kind: 'final',
    grade,
    baseGrade,
    level: Math.max(item.level, selected.level),
    price:
      item.price == null
        ? null
        : { ...item.price, ...(priceDelta ? { sp: Number(item.price.sp ?? 0) + priceDelta } : {}) },
    priceDelta,
    upgradePrice: grade === baseGrade ? 0 : selected.upgradePrice,
    damageDelta: selected.dice - base.dice,
    upgradeSlots: slots + selected.slots - base.slots,
    tracking: selected.tracking,
  };
}
