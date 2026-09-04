import { Character, Creature, Inventory, InventoryItem, Item } from '@schemas/content';
import { StoreID, VariableBool, VariableListStr, VariableNum } from '@schemas/variables';
import { addVariable, getVariable } from '@variables/variable-manager';
import { labelToVariable } from '@variables/variable-utils';
import { getFlatInvItems, isItemInvestable, isItemWeapon } from './inv-utils';

const EIDOLON_TRAIT_ID = 2937;
const POTENCY_VARIABLE = 'EIDOLON_WEAPON_POTENCY';
const STRIKING_VARIABLE = 'EIDOLON_WEAPON_STRIKING';
const OWNER_VARIABLE = 'HAS_EIDOLON_COMPANION';

/** Fundamental runes derived from one invested item, never saved onto an attack. */
export type EidolonRunes = { potency: number; striking: number };

/** Recognizes the existing Eidolon trait operation, including renamed companions. */
export function isEidolon(creature: Creature): boolean {
  return creature.operations?.some((op) => op.type === 'giveTrait' && op.data.traitId === EIDOLON_TRAIT_ID) ?? false;
}

/** Limits the special weapon investment control to the summoner's inventory. */
export function canInvestEidolonWeapon(id: StoreID, item: Item): boolean {
  if (id !== 'CHARACTER' || !isEidolonWeapon(item)) return false;
  return (
    !!getVariable<VariableBool>(id, OWNER_VARIABLE)?.value ||
    !!getVariable<VariableListStr>(id, 'CLASS_NAMES')?.value.includes('SUMMONER')
  );
}

/** A magic weapon can be invested for an eidolon; unarmed attacks cannot be held. */
function isEidolonWeapon(item: Item): boolean {
  return (
    isItemWeapon(item) &&
    item.meta_data?.category !== 'unarmed_attack' &&
    (!!item.meta_data?.runes?.potency || !!item.meta_data?.runes?.striking || item.traits?.includes(1504) === true)
  );
}

/** Identifies the canonical handwraps item and items derived from that base. */
function isHandwraps(item: Item): boolean {
  return (
    [7020, 11933].includes(item.id) ||
    [item.name, item.meta_data?.base_item].some(
      (name) => !!name && labelToVariable(name) === 'HANDWRAPS_OF_MIGHTY_BLOWS'
    )
  );
}

/**
 * Derives runes from an invested held weapon, falling back to invested handwraps.
 * Equipped weapons are held in this inventory model. Container contents are stowed,
 * so even a stale equipped flag on a contained weapon must not confer runes.
 * See "Gear And Your Eidolon": https://2e.aonprd.com/Classes.aspx?ID=77.
 */
export function getEidolonRunes(inventory?: Inventory | null): EidolonRunes {
  const weapon = inventory?.items.find(
    (entry) =>
      entry.id === inventory.eidolon_weapon_id &&
      !entry.is_formula &&
      entry.is_invested &&
      entry.is_equipped &&
      isEidolonWeapon(entry.item)
  );
  const handwraps = inventory?.items.find((entry) => !entry.is_formula && entry.is_invested && isHandwraps(entry.item));
  const runes = (weapon ?? handwraps)?.item.meta_data?.runes;
  return {
    potency: Math.max(0, Math.min(runes?.potency ?? 0, 4)),
    striking: Math.max(0, Math.min(runes?.striking ?? 0, 4)),
  };
}

/** Selects one shared weapon while preserving equipment with its own Invested trait. */
export function setEidolonWeaponInvestment(inventory: Inventory, itemId: string, invested: boolean): Inventory {
  const target = getFlatInvItems(inventory).find((entry) => entry.id === itemId);
  if (!target || target.is_formula || !isEidolonWeapon(target.item)) return inventory;
  const updateItems = (items: InventoryItem[]): InventoryItem[] =>
    items.map((entry) => ({
      ...entry,
      is_invested:
        entry.id === itemId
          ? invested || (isItemInvestable(entry.item) && entry.is_invested)
          : invested && entry.id === inventory.eidolon_weapon_id && !isItemInvestable(entry.item)
            ? false
            : entry.is_invested,
      container_contents: updateItems(entry.container_contents),
    }));
  return {
    ...inventory,
    eidolon_weapon_id: invested
      ? itemId
      : inventory.eidolon_weapon_id === itemId
        ? undefined
        : inventory.eidolon_weapon_id,
    items: updateItems(inventory.items),
  };
}

/** Publishes transient owner equipment values through the existing worker store. */
export function setEidolonRunesInStore(character: Character): void {
  const runes = getEidolonRunes(character.inventory);
  addVariable(
    'CHARACTER',
    'bool',
    OWNER_VARIABLE,
    character.companions?.list?.some(isEidolon) ?? false,
    'Eidolon gear'
  );
  addVariable('CHARACTER', 'num', POTENCY_VARIABLE, runes.potency, 'Eidolon gear');
  addVariable('CHARACTER', 'num', STRIKING_VARIABLE, runes.striking, 'Eidolon gear');
}

/** Shares owner runes only with unarmed attacks belonging to an actual eidolon. */
export function getSharedEidolonRunes(id: StoreID, item: Item): EidolonRunes {
  if (
    !id.startsWith('COMPANION_') ||
    item.meta_data?.category !== 'unarmed_attack' ||
    getVariable<VariableNum>(id, 'TRAIT_ANCESTRY_EIDOLON_IDS')?.value !== EIDOLON_TRAIT_ID
  ) {
    return { potency: 0, striking: 0 };
  }
  return {
    potency: getVariable<VariableNum>('CHARACTER', POTENCY_VARIABLE)?.value ?? 0,
    striking: getVariable<VariableNum>('CHARACTER', STRIKING_VARIABLE)?.value ?? 0,
  };
}
