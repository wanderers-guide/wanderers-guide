/** Minimal local fixtures. No user characters or Discord transcripts are included. */
export const magicWeapon = {
  id: 800,
  name: '+2 striking spear',
  description: 'A spear bearing potency and striking runes.',
  group: 'WEAPON',
  traits: [1504],
  operations: [],
  meta_data: {
    category: 'simple',
    group: 'spear',
    damage: { dice: 1, die: 'd6', damageType: 'piercing' },
    runes: { potency: 2, striking: 1, property: [] },
  },
};
export const unarmedAttack = {
  id: 801,
  name: 'Eidolon Primary Attack',
  description: 'Choose the damage and traits of your natural attack.',
  group: 'WEAPON',
  traits: [2398],
  operations: [],
  meta_data: {
    category: 'unarmed_attack',
    group: 'brawling',
    damage: { dice: 1, die: 'd8', damageType: 'slashing' },
    runes: { potency: 0, striking: 0, property: [] },
  },
};
export const handwraps = {
  id: 7020,
  name: 'Handwraps of Mighty Blows',
  description: 'Invested handwraps bearing weapon runes.',
  group: 'WEAPON',
  traits: [1504, 1527],
  operations: [],
  meta_data: {
    category: 'unarmed_attack',
    group: 'brawling',
    base_item: 'fist',
    damage: { dice: 1, die: 'd4', damageType: 'bludgeoning' },
    runes: { potency: 1, striking: 1, property: [] },
  },
};
export const vial = {
  id: 802,
  name: 'Versatile Vial',
  description: 'The base item description.',
  group: 'GENERAL',
  traits: [],
  operations: [],
  meta_data: {},
};
/** Creates an independent inventory copy with explicit equipment and investment flags. */
export function inventoryItem(item, overrides = {}) {
  return {
    id: `inventory-${item.id}`,
    item,
    is_equipped: false,
    is_invested: false,
    is_implanted: false,
    is_formula: false,
    container_contents: [],
    ...overrides,
  };
}
export const eidolon = {
  id: 1,
  name: 'Beast Eidolon',
  level: 1,
  abilities_added: [],
  abilities_base: [],
  operation_data: {},
  details: {},
  meta_data: { reset_hp: false },
  inventory: { coins: { cp: 0, sp: 0, gp: 0, pp: 0 }, items: [inventoryItem(unarmedAttack, { is_equipped: true })] },
  operations: [
    { id: 'trait', type: 'giveTrait', data: { traitId: 2937 } },
    { id: 'str', type: 'setValue', data: { variable: 'ATTRIBUTE_STR', value: { value: 4 } } },
    { id: 'prof', type: 'adjValue', data: { variable: 'UNARMED_ATTACKS', value: { value: 'T' } } },
  ],
};
export const content = {
  defaultSources: { PAGE: [], INFO: [] },
  classes: [],
  ancestries: [],
  backgrounds: [],
  abilityBlocks: [],
  items: [magicWeapon, unarmedAttack, handwraps, vial],
  traits: [{ id: 2937, name: 'Eidolon', meta_data: { companion_type_trait: true } }],
  sources: [],
  languages: [],
  spells: [],
};
/** Creates a synthetic character whose companion exercises the real gear-sharing pipeline. */
export function summoner(items = []) {
  return {
    id: 1,
    level: 1,
    name: 'Summoner',
    details: {},
    inventory: { coins: { cp: 0, sp: 0, gp: 0, pp: 0 }, items },
    operation_data: {},
    meta_data: {},
    variants: {},
    custom_operations: [],
    companions: { list: [structuredClone(eidolon)] },
  };
}
