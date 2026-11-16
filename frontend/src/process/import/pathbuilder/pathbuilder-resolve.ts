/**
 * Pure normalization of a Pathbuilder share payload into `ResolvedBuild`.
 *
 * Everything in this module is side-effect free and imports nothing from the
 * rest of Wanderer's Guide, so it can be unit-tested against a captured payload
 * (see `scripts/pathbuilder-share-import.test.mjs`) without a browser, a
 * Supabase session, or the content package.
 *
 * The guiding rule: **never silently drop a reference.** If Pathbuilder points at
 * something we cannot resolve (a Custom File UUID that is not in
 * `listCustomFiles`, an armor entry with no name, a spell whose casting source we
 * cannot see), that reference lands in `unresolved` with a reason. The legacy FTC path
 * discarded all of these, which is what destroyed custom items on import.
 */

import { PATHBUILDER_ABILITIES, PATHBUILDER_UUID_RE, PathbuilderCustomFileSchema } from '@schemas/pathbuilder';
import type {
  PathbuilderAbility,
  PathbuilderCharacterData,
  PathbuilderDerivedBuild,
  PathbuilderCustomFile,
  PathbuilderCustomFileEntry,
  PathbuilderEquipmentEntry,
  PathbuilderPlayerWeapon,
  PathbuilderShareBuild,
  ResolvedAbilityBoost,
  ResolvedBuild,
  ResolvedContainer,
  ResolvedCustomBuff,
  ResolvedFeatSelection,
  ResolvedItemRef,
  ResolvedSkillIncrease,
  ResolvedSpecialSelection,
  ResolvedSpell,
  ResolvedWeapon,
  UnresolvedRef,
} from './types';

export function isPathbuilderUuid(value: string | undefined | null): value is string {
  return typeof value === 'string' && PATHBUILDER_UUID_RE.test(value);
}

/**
 * Normalize labels to the uppercase underscore tokens used by the importer.
 * Kept local so this pure payload resolver does not depend on browser/application
 * modules (and remains runnable directly from the Node fixture tests).
 */
function normalizePathbuilderToken(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}


/**
 * Parse a Custom File's `json` field.
 *
 * Pathbuilder is inconsistent about escape depth: in build 1596127 the type-1
 * (custom buff) entry is double-encoded while the type-3 (custom weapon) entries
 * are single-encoded. So parse, and if the result is *still* a string, parse
 * again. Guarded to two levels: anything deeper is malformed, not encoded.
 */
export function parseCustomFileJson(entry: PathbuilderCustomFileEntry): PathbuilderCustomFile | null {
  let value: unknown = entry?.json;
  for (let depth = 0; depth < 3 && typeof value === 'string'; depth++) {
    const text = value.trim();
    if (!text) return null;
    try {
      value = JSON.parse(text);
    } catch {
      return null;
    }
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;

  // Normalize the two historical identifier spellings before validating the
  // parsed Custom File. The envelope identifier is the final fallback.
  const parsed = value as Record<string, unknown>;
  const normalized = {
    ...parsed,
    uniqueIdentifier:
      (typeof parsed.uniqueIdentifier === 'string' && parsed.uniqueIdentifier) ||
      (typeof parsed.uniqueIdentiier === 'string' && parsed.uniqueIdentiier) ||
      entry.uniqueIdentifier ||
      undefined,
    type: parsed.type ?? entry.type,
  };

  const validated = PathbuilderCustomFileSchema.safeParse(normalized);
  return validated.success ? validated.data : null;
}

export function buildCustomFileIndex(entries: PathbuilderCustomFileEntry[] | undefined): Map<string, PathbuilderCustomFile> {
  const index = new Map<string, PathbuilderCustomFile>();
  for (const entry of entries ?? []) {
    const parsed = parseCustomFileJson(entry);
    if (parsed) index.set(parsed.uniqueIdentifier.toLowerCase(), parsed);
  }
  return index;
}

/**
 * Split a `hashMapFeatSelections` key into its slot and level.
 *
 * Keys are a slot label with the level concatenated onto the end, sometimes
 * with a space ("Champion Feat 8") and sometimes without, when Pathbuilder
 * composes nested slots ("Reincarnation FeatAncestry Paragon 3"). Some slots
 * carry no level at all ("Heritage Feat").
 */
export function parseFeatSlotKey(key: string): { slot: string; level?: number } {
  const match = /^(.*?)(\d+)$/.exec(key.trim());
  if (match && match[1]) return { slot: match[1].trim(), level: Number(match[2]) };
  return { slot: key.trim() };
}

/**
 * Split a `hashMapFeatSelections` value into category / qualifier / name.
 *
 *   "CHAMPION_Advanced Deity's Domain"      -> CHAMPION / -       / Advanced Deity's Domain
 *   "ARCHETYPE_EXEMPLAR_Exemplar Dedication"-> ARCHETYPE / EXEMPLAR / Exemplar Dedication
 *   "ANCESTRY_GENERAL_Reincarnation Feat"   -> ANCESTRY  / GENERAL  / Reincarnation Feat
 */
export function parseFeatValue(value: string): { category?: string; qualifier?: string; name: string } {
  const parts = value.split('_');
  if (parts.length === 1) return { name: value };
  if (parts.length === 2) return { category: parts[0], name: parts[1] };
  return { category: parts[0], qualifier: parts[1], name: parts.slice(2).join('_') };
}

function abilityAt(index: number | undefined): PathbuilderAbility | undefined {
  return typeof index === 'number' ? PATHBUILDER_ABILITIES[index] : undefined;
}

/**
 * Convert Pathbuilder's compact ability token to the full label used by WG selectors.
 *
 * Pathbuilder serializes abilities as lowercase tokens such as `dex`, while WG's
 * attribute selection options expose labels such as `Dexterity`. Keeping this mapping
 * at the Pathbuilder boundary avoids changing the generic label helpers for every caller.
 */
const PATHBUILDER_ABILITY_LABELS: Record<PathbuilderAbility, string> = {
  str: 'Strength',
  dex: 'Dexterity',
  con: 'Constitution',
  int: 'Intelligence',
  wis: 'Wisdom',
  cha: 'Charisma',
};

/** Return the WG selection label for a validated Pathbuilder ability token. */
export function pathbuilderAbilityLabel(ability: PathbuilderAbility): string {
  return PATHBUILDER_ABILITY_LABELS[ability];
}

/** Normalize a Pathbuilder ability token from either share or derived payloads. */
export function parsePathbuilderAbility(value: string | null | undefined): PathbuilderAbility | undefined {
  const normalized = value?.trim().toLowerCase();
  return PATHBUILDER_ABILITIES.find((ability) => ability === normalized);
}

/**
 * `itemStriking` -> rune name.
 *
 * 1 = Striking is confirmed by build 1596127: the Crimson Blade's own description
 * says "+1 striking bastard sword ... wounding property rune" and the entry reads
 * `potency: 1, itemStriking: 1, listPropertyRunes: ["Wounding"]`. The higher
 * rungs follow the standard PF2e ladder but have not been observed in a payload.
 */
const STRIKING_LABELS: Record<number, string> = {
  1: 'Striking',
  2: 'Greater Striking',
  3: 'Major Striking',
};

/** Convert json.php's armor resilience label to WG's numeric rune rank. */
function parsePathbuilderArmorResilience(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || (typeof value === 'string' && !value.trim())) return null;
  if (typeof value === 'number') {
    return Number.isInteger(value) && value >= 0 && value <= 3 ? value : -1;
  }

  const normalized = normalizePathbuilderToken(value);
  if (
    ['0', 'NONE', 'NO_RUNE', 'NORUNE', 'UNARMED', 'N_A', 'NOT_APPLICABLE'].includes(normalized) ||
    /^(?:NO|NOT)_/.test(normalized)
  ) {
    return 0;
  }

  // Be strict: a custom label that merely contains "resilient" is not proof of
  // a standard rune rank. Pathbuilder may provide the simple names or the
  // explicit Greater/Major rank names; unrecognized variants remain unknown.
  if (/^(?:RESILIENT|RESILIENT_RUNE|RESILIENT_1|RESILIENT_I)$/.test(normalized)) return 1;
  if (/^(?:GREATER_RESILIENT|RESILIENT_GREATER|GREATER_RESILIENT_RUNE|RESILIENT_2|RESILIENT_II)$/.test(normalized)) return 2;
  if (/^(?:MAJOR_RESILIENT|RESILIENT_MAJOR|MAJOR_RESILIENT_RUNE|RESILIENT_3|RESILIENT_III)$/.test(normalized)) return 3;
  return -1;
}

function resolveRef(
  raw: string,
  customFiles: Map<string, PathbuilderCustomFile>,
  quantity = 1,
  nameOverride?: string,
  unresolved?: UnresolvedRef[],
  kind: UnresolvedRef['kind'] = 'equipment'
): ResolvedItemRef {
  if (isPathbuilderUuid(raw)) {
    const custom = customFiles.get(raw.toLowerCase());
    if (custom) {
      return {
        kind: 'custom',
        name: nameOverride || custom.name || raw,
        raw,
        uuid: custom.uniqueIdentifier,
        quantity,
        custom,
      };
    }
    unresolved?.push({
      kind,
      ref: raw,
      reason: 'Custom File UUID is not present in listCustomFiles (share payloads omit Custom Pack contents)',
    });
    return {
      kind: 'unresolved',
      name: nameOverride || raw,
      raw,
      uuid: raw,
      quantity,
      unresolvedKind: kind,
    };
  }
  return { kind: 'standard', name: nameOverride || raw, raw, quantity };
}

export function resolveWeapons(
  weapons: PathbuilderPlayerWeapon[] | undefined,
  customFiles: Map<string, PathbuilderCustomFile>,
  unresolved: UnresolvedRef[]
): ResolvedWeapon[] {
  return (weapons ?? []).map((weapon) => {
    const base = resolveRef(
      weapon.weaponName,
      customFiles,
      weapon.amount ?? 1,
      weapon.nameOverride ?? undefined,
      unresolved,
      'weapon'
    );
    const striking = weapon.itemStriking ?? 0;
    return {
      ...base,
      potency: weapon.potency ?? 0,
      striking,
      strikingLabel: STRIKING_LABELS[striking],
      runes: weapon.listPropertyRunes ?? [],
      twoHanded: weapon.use2H === true,
      attackAbility: abilityAt(weapon.attackAbilityRef ?? undefined),
    } satisfies ResolvedWeapon;
  });
}

/**
 * Equipment plus the container hierarchy.
 *
 * Two wrinkles from build 1596127:
 *  - The container itself also appears in `listPlayerEquipment` ({"name":"Backpack"}),
 *    so it must not be emitted a second time as a loose item.
 *  - `quantity` is omitted when it is 1.
 */
export function resolveEquipment(
  characterData: PathbuilderCharacterData,
  customFiles: Map<string, PathbuilderCustomFile>,
  unresolved: UnresolvedRef[]
): { loose: ResolvedItemRef[]; containers: ResolvedContainer[] } {
  const rawContainers = characterData.hashMapEquipmentContainers ?? {};
  const containers = new Map<string, ResolvedContainer>();
  const containerNames = new Set<string>();

  for (const [id, definition] of Object.entries(rawContainers)) {
    const name = definition?.containerName ?? id;
    containers.set(id, { id, name, isBackpack: definition?.backpack === true, items: [] });
    containerNames.add(name.toLowerCase());
  }

  const loose: ResolvedItemRef[] = [];
  for (const entry of (characterData.listPlayerEquipment ?? []) as PathbuilderEquipmentEntry[]) {
    const resolved = resolveRef(entry.name, customFiles, entry.quantity ?? 1, undefined, unresolved, 'equipment');

    // Skip the equipment row that *is* the container definition.
    if (!entry.inContainerID && containerNames.has(resolved.name.toLowerCase())) continue;

    const containerId = entry.inContainerID;
    if (containerId) {
      const container = containers.get(containerId);
      if (container) {
        container.items.push(resolved);
        continue;
      }
      unresolved.push({ kind: 'container', ref: containerId, reason: 'Item references a container that is not in hashMapEquipmentContainers' });
    }
    loose.push(resolved);
  }

  return { loose, containers: [...containers.values()] };
}

function recordInvalidAbilityIndex(
  unresolved: UnresolvedRef[],
  ref: string,
  index: number | undefined
): void {
  if (abilityAt(index) !== undefined) return;
  unresolved.push({
    kind: 'variant',
    ref,
    reason: `Pathbuilder ability index ${String(index)} is outside the supported range 0..5`,
  });
}

export function resolveAbilityBoosts(
  boosts: Record<string, number[]> | undefined,
  unresolved: UnresolvedRef[]
): ResolvedAbilityBoost[] {
  const out: ResolvedAbilityBoost[] = [];
  for (const [level, indices] of Object.entries(boosts ?? {})) {
    for (const index of indices ?? []) {
      const ability = abilityAt(index);
      if (ability) out.push({ level: Number(level), ability, origin: 'levelled' });
      else recordInvalidAbilityIndex(unresolved, `hashMapAbilityBoosts[${level}]`, index);
    }
  }
  return out.sort((a, b) => a.level - b.level);
}

/** Ancestry free boosts are stored as an index map; all are level-1 choices. */
export function resolveAncestryFreeBoosts(
  selections: Record<string, number> | undefined,
  unresolved: UnresolvedRef[]
): ResolvedAbilityBoost[] {
  const out: ResolvedAbilityBoost[] = [];
  for (const [slot, index] of Object.entries(selections ?? {})) {
    const ability = abilityAt(index);
    if (ability) out.push({ level: 1, ability, origin: 'ancestry' });
    else recordInvalidAbilityIndex(unresolved, `hashMapAncestryFreeBoostSelections[${slot}]`, index);
  }
  return out;
}

/**
 * Standard backgrounds provide one limited/fixed boost and one free boost.
 * Pathbuilder stores the selected ability indexes directly.
 */
export function resolveBackgroundBoosts(
  limitedSelection: number | undefined,
  freeSelection: number | undefined,
  unresolved: UnresolvedRef[]
): ResolvedAbilityBoost[] {
  const out: ResolvedAbilityBoost[] = [];
  for (const [field, index] of [
    ['backgroundBoostLimitedSelection', limitedSelection],
    ['getBackgroundBoostFreeSelection', freeSelection],
  ] as const) {
    if (index === undefined) continue;
    const ability = abilityAt(index);
    if (ability) out.push({ level: 1, ability, origin: 'background' });
    else recordInvalidAbilityIndex(unresolved, field, index);
  }
  return out;
}

export function resolveSkillIncreases(increases: Record<string, string[]> | undefined): ResolvedSkillIncrease[] {
  const out: ResolvedSkillIncrease[] = [];
  for (const [level, skills] of Object.entries(increases ?? {})) {
    for (const skill of skills ?? []) out.push({ level: Number(level), skill });
  }
  return out.sort((a, b) => a.level - b.level);
}

export function resolveFeats(selections: Record<string, string> | undefined): ResolvedFeatSelection[] {
  return Object.entries(selections ?? {}).map(([key, raw]) => {
    const { slot, level } = parseFeatSlotKey(key);
    const { category, qualifier, name } = parseFeatValue(raw);
    return { slot, level, category, qualifier, name, raw } satisfies ResolvedFeatSelection;
  });
}

export function resolveSpecialSelections(selections: Record<string, Record<string, string>> | undefined): ResolvedSpecialSelection[] {
  const out: ResolvedSpecialSelection[] = [];
  for (const [slot, choices] of Object.entries(selections ?? {})) {
    for (const [prompt, value] of Object.entries(choices ?? {})) out.push({ slot, prompt, value });
  }
  return out;
}

/**
 * `hashMapPlayerSpells` keys look like "Messenger&0&0" and the key's label does
 * not always match the spell ("Messenger" -> "Message"), so the value's
 * `spellName` is authoritative.
 *
 * `spellList` is an index into the character's spellcasting entries, and
 * `characterData` does not include those entries; only the derived `json.php`
 * payload does. Without it we cannot name the tradition/source, so record that
 * rather than guessing.
 */
export function resolveSpells(
  spells: Record<string, unknown> | undefined,
  derived?: Record<string, unknown> | null
): ResolvedSpell[] {
  const out: ResolvedSpell[] = [];
  const spellCasters = Array.isArray(derived?.spellCasters) ? derived.spellCasters : [];

  for (const [rawKey, value] of Object.entries(spells ?? {})) {
    const entry = (value ?? {}) as { spellName?: string; spellList?: number; heighten?: number };
    const name = entry.spellName ?? rawKey.split('&')[0];
    if (!name) continue;

    const caster =
      typeof entry.spellList === 'number' && entry.spellList >= 0
        ? (spellCasters[entry.spellList] as { name?: string; magicTradition?: string } | undefined)
        : undefined;

    out.push({
      name,
      spellListIndex: entry.spellList,
      heighten: entry.heighten ?? 0,
      rawKey,
      source: caster?.name ?? undefined,
      tradition: caster?.magicTradition ?? undefined,
    });
  }

  return out;
}

export function resolveActiveCustomBuffs(
  active: Record<string, number> | undefined,
  customFiles: Map<string, PathbuilderCustomFile>,
  unresolved: UnresolvedRef[]
): ResolvedCustomBuff[] {
  return Object.entries(active ?? {}).map(([uuid, stacks]) => {
    const custom = customFiles.get(uuid.toLowerCase());
    if (!custom) {
      unresolved.push({ kind: 'buff', ref: uuid, reason: 'Active custom buff is not present in listCustomFiles' });
    }
    return { uuid, stacks: stacks ?? 1, custom, name: custom?.name ?? uuid } satisfies ResolvedCustomBuff;
  });
}

/** Strip Pathbuilder's `BACKGROUND_` (and similar) content-type prefixes. */
export function stripCategoryPrefix(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const match = /^[A-Z][A-Z_]*_(.+)$/.exec(value);
  return match ? match[1] : value;
}

/**
 * Normalize a whole share payload.
 *
 * `derived` is optional enrichment from `json.php`; when present it supplies the
 * things the raw editor state genuinely lacks (coin denominations, spellcasting
 * source names). Its absence must never make the result incomplete.
 */
export function resolveBuild(
  build: PathbuilderShareBuild,
  options: { buildId?: string; formatVersion?: string; derived?: PathbuilderDerivedBuild | null } = {}
): ResolvedBuild {
  const cd: PathbuilderCharacterData = build?.characterData ?? {};
  const unresolved: UnresolvedRef[] = [];
  const hints: string[] = [];
  const customFiles = buildCustomFileIndex(build?.listCustomFiles);

  const { loose, containers } = resolveEquipment(cd, customFiles, unresolved);
  const weapons = resolveWeapons(cd.listPlayerWeapons ?? undefined, customFiles, unresolved);
  const buffs = resolveActiveCustomBuffs(cd.hashMapActiveCustomBuffs ?? undefined, customFiles, unresolved);
  const spells = resolveSpells(cd.hashMapPlayerSpells ?? undefined, options.derived);
  const feats = resolveFeats(cd.hashMapFeatSelections ?? undefined);
  const heritageFeat = feats.find((feat) => normalizePathbuilderToken(feat.slot) === 'HERITAGE_FEAT')?.name;
  const keyAbilityFromShare = cd.keyability;
  const keyAbilityFromDerived = options.derived?.keyability;
  if (keyAbilityFromShare !== undefined && keyAbilityFromShare !== null && !parsePathbuilderAbility(keyAbilityFromShare)) {
    unresolved.push({
      kind: 'variant',
      ref: 'characterData.keyability',
      reason: `Unsupported Pathbuilder key ability token "${String(keyAbilityFromShare)}"`,
    });
  } else if (
    (keyAbilityFromShare === undefined || keyAbilityFromShare === null) &&
    keyAbilityFromDerived !== undefined &&
    keyAbilityFromDerived !== null &&
    !parsePathbuilderAbility(keyAbilityFromDerived)
  ) {
    unresolved.push({
      kind: 'variant',
      ref: 'derived.keyability',
      reason: `Unsupported Pathbuilder key ability token "${String(keyAbilityFromDerived)}"`,
    });
  }
  for (const [weaponIndex, weapon] of (cd.listPlayerWeapons ?? []).entries()) {
    const index = weapon.attackAbilityRef;
    if (index === undefined || index === null) continue;
    if (abilityAt(index) === undefined) {
      recordInvalidAbilityIndex(unresolved, `listPlayerWeapons[${weaponIndex}].attackAbilityRef`, index);
    }
  }

  // Armor resolution uses explicit share identity first, then reliable JSON evidence.
  // Share links may carry an armor UUID whose Custom File is absent; json.php can then
  // recover the display item. Some exports incorrectly mark multiple rows worn, so we
  // never choose an arbitrary row merely because it appears first in the array.
  const armorRaw = cd.playerArmor;
  const rawArmorName = armorRaw?.armorName;
  const armorCustomFile =
    rawArmorName && isPathbuilderUuid(rawArmorName)
      ? customFiles.get(rawArmorName.toLowerCase())
      : undefined;
  const isMissingCustomArmorReference =
    !!rawArmorName && isPathbuilderUuid(rawArmorName) && !armorCustomFile;
  const rawIsUnarmoredPlaceholder =
    normalizePathbuilderToken(rawArmorName ?? '') === 'UNARMORED';

  const derivedArmors = options.derived?.armor ?? [];
  // json.php lists the equipped shield in the same `armor` array with worn: true.
  // Counting it here makes the real worn armor look ambiguous for non-chassis
  // builds; shields are resolved separately from `playerShieldNew`.
  const recordedShieldName = cd.playerShieldNew?.shieldName;
  const wornArmors = derivedArmors.filter(
    (entry) =>
      entry.worn === true &&
      entry.prof !== 'shield' &&
      (!recordedShieldName ||
        normalizePathbuilderToken(entry.name ?? '') !==
          normalizePathbuilderToken(recordedShieldName))
  );
  const hasReinforcedChassis = feats.some(
    (feat) => normalizePathbuilderToken(feat.name) === 'REINFORCED_CHASSIS'
  );
  const isAutomaton =
    normalizePathbuilderToken(cd.ancestry ?? options.derived?.ancestry ?? '') === 'AUTOMATON';
  const isChassisArmorRow = (entry: (typeof derivedArmors)[number]) => {
    const token = normalizePathbuilderToken(`${entry.name ?? ''} ${entry.display ?? ''}`);
    return (
      token.includes('AUTOMATON_CHASSI') ||
      token.includes('AUTOMATON_CHASSIS') ||
      token.includes('REINFORCED_CHASSIS')
    );
  };
  const chassisArmorRows = derivedArmors.filter(isChassisArmorRow);
  const chassisArmorCandidates = chassisArmorRows.filter((entry) => entry.worn === true);

  // When the share gives an item name (or a known Custom File name), match that
  // identity directly before considering worn flags. Otherwise use one unique worn
  // row, or the uniquely labelled chassis when the recorded rules choices support it.
  const namedArmorIdentity =
    armorCustomFile?.name ??
    (rawArmorName && !isPathbuilderUuid(rawArmorName) && !rawIsUnarmoredPlaceholder
      ? rawArmorName
      : undefined);
  const matchingNamedArmor = namedArmorIdentity
    ? derivedArmors.filter((entry) => {
        const target = normalizePathbuilderToken(namedArmorIdentity);
        const name = normalizePathbuilderToken(entry.name ?? '');
        const display = normalizePathbuilderToken(entry.display ?? '');
        return target !== '' && (name === target || display === target || display.includes(target));
      })
    : [];
  const derivedArmor =
    matchingNamedArmor.length === 1
      ? matchingNamedArmor[0]
      : namedArmorIdentity
        ? undefined
        : wornArmors.length === 1
          ? wornArmors[0]
          : hasReinforcedChassis && isAutomaton && chassisArmorCandidates.length === 1
            ? chassisArmorCandidates[0]
            : undefined;
  const derivedArmorName = derivedArmor?.name ?? undefined;
  // The share payload's itemResilient is a numeric rune rank; json.php instead
  // emits a label in armor[].res. Use either explicit share field before falling
  // back to the calculated export, and preserve an explicit zero (no rune).
  const shareArmorResilience = [armorRaw?.res, armorRaw?.itemResilient].find(
    (value) => value !== undefined && value !== null && String(value).trim() !== ''
  );
  const hasShareArmorResilience = shareArmorResilience !== undefined;
  const armorResilienceRaw = hasShareArmorResilience ? shareArmorResilience : derivedArmor?.res;
  const parsedArmorResilience = parsePathbuilderArmorResilience(armorResilienceRaw);
  const hasArmorResilienceSource =
    armorResilienceRaw !== undefined &&
    armorResilienceRaw !== null &&
    String(armorResilienceRaw).trim() !== '';

  if (wornArmors.length > 1) {
    hints.push(
      derivedArmor && isChassisArmorRow(derivedArmor) && hasReinforcedChassis && isAutomaton
        ? 'Armor: Pathbuilder JSON marks multiple armor rows as worn; the Reinforced Chassis row was selected because it matches the recorded Automaton ancestry and feat, but the other worn flags remain contradictory.'
        : derivedArmor && namedArmorIdentity
          ? `Armor: Pathbuilder JSON marks multiple rows as worn; the row matching the share armor identity "${namedArmorIdentity}" was used, but the other worn flags remain contradictory.`
          : 'Armor: Pathbuilder JSON marks multiple armor rows as worn; none was selected automatically because the equipped item is ambiguous.'
    );
  } else if (wornArmors.length === 0 && derivedArmors.length > 0 && !derivedArmor) {
    hints.push(
      'Armor: Pathbuilder JSON includes armor rows but does not identify a unique worn item; none was selected automatically.'
    );
  }

  if (hasArmorResilienceSource && parsedArmorResilience === -1) {
    const resilienceSource = hasShareArmorResilience ? 'Pathbuilder share' : 'Pathbuilder JSON';
    hints.push(
      'Armor: ' + resilienceSource + ' resilience rune "' + String(armorResilienceRaw) + '" could not be mapped to a known rank; its saving-throw bonus was not applied.'
    );
  }

  let armor: ResolvedItemRef | undefined;
  const armorLookupName =
    armorCustomFile
      ? rawArmorName
      : rawArmorName && isPathbuilderUuid(rawArmorName)
        ? derivedArmorName ?? rawArmorName
        : rawIsUnarmoredPlaceholder
          ? derivedArmorName ?? rawArmorName
          : rawArmorName ?? derivedArmorName;

  if (rawIsUnarmoredPlaceholder && derivedArmor && derivedArmorName) {
    hints.push(
      `Armor: the share payload says Unarmored, but json.php identifies "${derivedArmorName}" as the uniquely selected worn armor; the JSON armor row was used.`
    );
  }

  if (armorLookupName) {
    const originalUnresolvedLength = unresolved.length;
    armor = resolveRef(armorLookupName, customFiles, 1, undefined, unresolved, 'armor');
    if (
      rawArmorName &&
      derivedArmorName &&
      rawArmorName !== derivedArmorName &&
      armor.kind === 'standard'
    ) {
      armor.raw = rawArmorName;
    }
    if (armor.kind === 'standard') {
      unresolved.splice(originalUnresolvedLength);
    }
  } else if (
    armorRaw &&
    ((armorRaw.potency ?? 0) > 0 || (armorRaw.listPropertyRunes?.length ?? 0) > 0) &&
    !(hasReinforcedChassis && isAutomaton)
  ) {
    // Pathbuilder's PlayerArmor model can omit armorName or default it to Unarmored.
    // Preserve that ambiguity for ordinary characters instead of inventing armor.
    hints.push(
      'Pathbuilder has armor rune/potency state without a named armor; preserving the default Unarmored state and its raw rune data'
    );
  }

  // Reconstruct only when the rules data supports the chassis and the payload did
  // not provide a different uniquely identified worn armor. An unresolved share UUID
  // plus the Automaton + Reinforced Chassis choices is positive evidence of the
  // synthetic chassis even if json.php marks several rows worn or omits that row.
  const isUnarmoredReference =
    armor?.kind === 'standard' && normalizePathbuilderToken(armor.name) === 'UNARMORED';
  const characterLevel = cd.characterLevel ?? options.derived?.level ?? 1;
  const chassisTier = characterLevel >= 10 ? '10th' : characterLevel >= 5 ? '5th' : '1st';
  const inferredChassisName = `Automaton Chassi (${chassisTier} level)`;
  const shouldInferChassis =
    hasReinforcedChassis &&
    isAutomaton &&
    (
      (!armor && derivedArmors.length === 0) ||
      (isUnarmoredReference &&
        (derivedArmors.length === 0 || (derivedArmor !== undefined && isChassisArmorRow(derivedArmor)))) ||
      (armor?.kind === 'unresolved' && isMissingCustomArmorReference && !derivedArmor)
    );

  if (shouldInferChassis) {
    if (rawArmorName && isMissingCustomArmorReference) {
      for (let index = unresolved.length - 1; index >= 0; index--) {
        if (unresolved[index].kind === 'armor' && unresolved[index].ref === rawArmorName) {
          unresolved.splice(index, 1);
        }
      }
    }
    armor = {
      kind: 'standard',
      name: derivedArmor && isChassisArmorRow(derivedArmor) ? (derivedArmor.name ?? inferredChassisName) : inferredChassisName,
      raw: `inferred: Reinforced Chassis at level ${characterLevel}${rawArmorName ? `; original Pathbuilder reference ${rawArmorName}` : ''}`,
      quantity: 1,
    };
    hints.push(
      `Armor: Reconstructed the Automaton Reinforced Chassis (${chassisTier} level) because the share armor reference was missing or unresolved. Available potency, property-rune, and JSON resilience data were retained; absent or contradictory armor rows are reported separately.`
    );
  }

  const hasArmorRuneState =
    (armorRaw?.potency ?? derivedArmor?.pot ?? 0) > 0 ||
    (armorRaw?.listPropertyRunes?.length ?? derivedArmor?.runes?.length ?? 0) > 0;
  if (armor && hasArmorRuneState && !hasArmorResilienceSource) {
    hints.push(
      'Armor: Pathbuilder JSON did not provide a resilience rune rank and the share payload does not contain it; no Resilient bonus was applied.'
    );
  }

  const shieldRaw = cd.playerShieldNew;
  const shield = shieldRaw?.shieldName
    ? resolveRef(shieldRaw.shieldName, customFiles, 1, undefined, unresolved, 'shield')
    : undefined;
  if (shieldRaw && !shieldRaw.shieldName && Object.keys(shieldRaw).length > 0) {
    unresolved.push({ kind: 'shield', ref: JSON.stringify(shieldRaw), reason: 'playerShieldNew has no shieldName' });
  }

  const derived = options.derived;

  // An "ABP ..." custom buff strongly suggests Automatic Bonus Progression, but a
  // homebrew buff name is not proof of a rules variant. Surface it, do not set it.
  for (const buff of buffs) {
    if (/\bABP\b/i.test(buff.name)) hints.push(`Custom buff "${buff.name}" suggests Automatic Bonus Progression`);
  }
  if (cd.remastered === true) hints.push('Payload was built with the Remaster toggle on');

  return {
    buildId: options.buildId ?? String(cd.emailedBuildID ?? ''),
    formatVersion: options.formatVersion,
    identity: {
      name: cd.characterName ?? 'Unknown Wanderer',
      level: cd.characterLevel ?? options.derived?.level ?? 1,
      ancestry: cd.ancestry ?? options.derived?.ancestry ?? undefined,
      // Some v121 share payloads omit characterData.heritage but preserve the
      // selected heritage in hashMapFeatSelections["Heritage Feat"]. Prefer that
      // explicit editor choice, then the calculated JSON value, over asking again.
      heritage: stripCategoryPrefix(cd.heritage ?? heritageFeat ?? options.derived?.heritage ?? undefined),
      className: cd.className ?? undefined,
      keyAbility: parsePathbuilderAbility(cd.keyability ?? options.derived?.keyability),
      background: stripCategoryPrefix(cd.background ?? undefined),
      gender: cd.gender ?? undefined,
      alignment: cd.alignment ?? undefined,
      deity: cd.deity ?? undefined,
      age: cd.age ?? undefined,
    },
    variants: {
      ancestry_paragon: cd.ancestryParagon === true,
      free_archetype: cd.freeArchetype === true,
      gradual_attribute_boosts: cd.gradualAbilityBoost === true,
    },
    abilityBoosts: [
      ...resolveAbilityBoosts(cd.hashMapAbilityBoosts ?? undefined, unresolved),
      ...resolveAncestryFreeBoosts(cd.hashMapAncestryFreeBoostSelections ?? undefined, unresolved),
      ...resolveBackgroundBoosts(
        cd.backgroundBoostLimitedSelection ?? undefined,
        cd.getBackgroundBoostFreeSelection ?? undefined,
        unresolved
      ),
    ].sort((a, b) => a.level - b.level),
    skillIncreases: resolveSkillIncreases(cd.hashMapSkillIncreases ?? undefined),
    trainedSkills: [
      ...new Set([
        ...(cd.classOptionalTrainedSkill ? [cd.classOptionalTrainedSkill] : []),
        ...(cd.hashMapTrainedOnlySkillChoices?.standardSelection ?? []),
      ]),
    ],
    feats,
    specialSelections: resolveSpecialSelections(cd.hashMapSpecialSelections ?? undefined),
    weapons,
    armor,
    // Share editor state remains primary when present; json.php supplements fields
    // omitted by the share payload only when it identifies one unambiguous worn item.
    armorRunes: armorRaw?.listPropertyRunes ?? derivedArmor?.runes ?? [],
    armorPotency: armorRaw?.potency ?? derivedArmor?.pot ?? 0,
    armorResilience: parsedArmorResilience === -1 ? null : parsedArmorResilience,
    shield,
    looseEquipment: loose,
    containers,
    spells,
    activeCustomBuffs: buffs,
    customFiles,
    notes: cd.notes ?? undefined,
    // `characterData` only tracks `gold`; the derived payload has the full split.
    coins: derived?.money
      ? {
          cp: derived.money.cp ?? 0,
          sp: derived.money.sp ?? 0,
          gp: derived.money.gp ?? 0,
          pp: derived.money.pp ?? 0,
        }
      : { cp: 0, sp: 0, gp: cd.gold ?? 0, pp: 0 },
    languages: cd.listLanguages ?? [],
    unresolved,
    hints,
  };
}
