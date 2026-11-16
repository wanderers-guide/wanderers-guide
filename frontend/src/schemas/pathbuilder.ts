import { z } from 'zod';

/**
 * Zod schemas for the Pathbuilder 2e wire format.
 *
 * Pathbuilder is a third-party service we do not control, so this is exactly the
 * boundary core guideline 4 is about: the response is parsed here and every
 * downstream module consumes the inferred type. Nothing casts a Pathbuilder
 * response into shape.
 *
 * Two endpoints, two shapes:
 *
 *   POST /app/fetch_emailed.php {"id":"N"} -> { success, version, build: "<JSON string>" }
 *   GET  /json.php?id=N                    -> { success, build: <derived object> }
 *
 * The share endpoint's build is a JSON string, so it is parsed twice: once by
 * PathbuilderShareResponseSchema, then again through PathbuilderShareBuildSchema.
 *
 * Every object schema here is loose (.passthrough()). Pathbuilder adds fields
 * between releases and the importer persists the payload verbatim, so an unknown
 * key must survive parsing rather than be stripped or rejected.
 */

/**
 * Pathbuilder stores ability scores as small integers. Confirmed against build
 * 1596127: hashMapAncestryFreeBoostSelections {"0":2} is an Automaton's free
 * boost to Constitution, and the level-1 boosts [2,0,1,5] are four distinct
 * boosts to Con/Str/Dex/Cha.
 */
export const PATHBUILDER_ABILITIES = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const;
export type PathbuilderAbility = (typeof PATHBUILDER_ABILITIES)[number];

/** A Custom File UUID, which is how Pathbuilder references custom content. */
export const PATHBUILDER_UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Custom File type is an opaque Pathbuilder discriminator. Different share
 * payloads have serialized it as numbers, numeric strings, and other scalar
 * values. We do not use this field to resolve content, so rejecting a share
 * because a new Pathbuilder release changed this discriminator is unnecessary.
 *
 * Normalize numeric strings when possible, but otherwise preserve the wire value.
 */
const PathbuilderTypeSchema = z.preprocess(
  (value) => {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return /^\d+$/.test(trimmed) ? Number(trimmed) : trimmed;
    }
    return value;
  },
  z.unknown()
);

// ─── Custom Files ─────────────────────────────────────────────────────────────

export const PathbuilderCustomEffectSchema = z
  .object({
    effectType: z.number().nullish(),
    bonusAmount: z.number().nullish(),
    reference: z.string().nullish(),
    proficiencyName: z.string().nullish(),
  })
  .passthrough();
export type PathbuilderCustomEffect = z.infer<typeof PathbuilderCustomEffectSchema>;

/**
 * A parsed Custom File. Field presence depends on type, which has only been
 * observed as 1 (custom buff/effect) and 3 (custom weapon).
 *
 * Note the misspelling: custom weapons carry uniqueIdentiier while custom
 * buffs carry the correctly spelled uniqueIdentifier. Both appear in the same
 * payload (build 1596127), so both are accepted and neither can be dropped.
 */
export const PathbuilderCustomFileSchema = z
  .object({
    uniqueIdentifier: z.string(),
    type: PathbuilderTypeSchema.nullish(),
    name: z.string().nullish(),
    description: z.string().nullish(),
    itemLevel: z.number().nullish(),
    price: z.number().nullish(),
    hands: z.string().nullish(),
    bulk: z.string().nullish(),
    traits: z.string().nullish(),
    category: z.union([z.number(), z.string()]).nullish(),
    src: z.string().nullish(),
    proficiencyType: z.number().nullish(),
    damage: z.number().nullish(),
    damageType: z.string().nullish(),
    group: z.string().nullish(),
    weaponTraits: z.string().nullish(),
    action0: z.number().nullish(),
    action0desc: z.string().nullish(),
    listCustomEffects: z.array(PathbuilderCustomEffectSchema).nullish(),
  })
  .passthrough();
export type PathbuilderCustomFile = z.infer<typeof PathbuilderCustomFileSchema>;

/**
 * One Custom File as it arrives in listCustomFiles.
 *
 * json is a string containing JSON, and Pathbuilder is inconsistent about how
 * deeply it escapes it. Always go through parseCustomFileJson() rather than
 * calling JSON.parse directly.
 */
export const PathbuilderCustomFileEntrySchema = z
  .object({
    type: PathbuilderTypeSchema.nullish(),
    json: z.string(),
    timestamp: z.string().nullish(),
    uniqueIdentifier: z.string().nullish(),
  })
  .passthrough();
export type PathbuilderCustomFileEntry = z.infer<typeof PathbuilderCustomFileEntrySchema>;

// ─── characterData ────────────────────────────────────────────────────────────

export const PathbuilderPlayerWeaponSchema = z
  .object({
    weaponName: z.string(),
    amount: z.number().nullish(),
    attackAbilityRef: z.number().nullish(),
    itemStriking: z.number().nullish(),
    potency: z.number().nullish(),
    listPropertyRunes: z.array(z.string()).nullish(),
    nameOverride: z.string().nullish(),
    use2H: z.boolean().nullish(),
  })
  .passthrough();
export type PathbuilderPlayerWeapon = z.infer<typeof PathbuilderPlayerWeaponSchema>;

export const PathbuilderArmorSchema = z
  .object({
    armorName: z.string().nullish(),
    potency: z.number().nullish(),
    listPropertyRunes: z.array(z.string()).nullish(),
    res: z.union([z.string(), z.number()]).nullish(),
    // The share payload records the resilient rune rank here (e.g. 1),
    // while json.php expresses the same state as armor[].res = "resilient".
    itemResilient: z.union([z.number(), z.string()]).nullish(),
  })
  .passthrough();
export type PathbuilderArmor = z.infer<typeof PathbuilderArmorSchema>;

export const PathbuilderShieldSchema = z
  .object({
    shieldName: z.string().nullish(),
    shieldDamage: z.number().nullish(),
    potency: z.number().nullish(),
  })
  .passthrough();
export type PathbuilderShield = z.infer<typeof PathbuilderShieldSchema>;

export const PathbuilderEquipmentEntrySchema = z
  .object({
    name: z.string(),
    quantity: z.number().nullish(),
    inContainerID: z.string().nullish(),
  })
  .passthrough();
export type PathbuilderEquipmentEntry = z.infer<typeof PathbuilderEquipmentEntrySchema>;

export const PathbuilderContainerSchema = z
  .object({
    containerName: z.string().nullish(),
    backpack: z.boolean().nullish(),
  })
  .passthrough();
export type PathbuilderContainer = z.infer<typeof PathbuilderContainerSchema>;

export const PathbuilderSpellEntrySchema = z
  .object({
    spellList: z.number().nullish(),
    spellName: z.string().nullish(),
    heighten: z.number().nullish(),
  })
  .passthrough();
export type PathbuilderSpellEntry = z.infer<typeof PathbuilderSpellEntrySchema>;

/**
 * Raw editor state. Only the fields the importer reads are declared. Everything
 * else survives through passthrough so the persisted snapshot stays lossless.
 */
export const PathbuilderCharacterDataSchema = z
  .object({
    characterName: z.string().nullish(),
    characterLevel: z.number().nullish(),
    keyability: z.string().nullish(),
    ancestry: z.string().nullish(),
    className: z.string().nullish(),
    background: z.string().nullish(),
    heritage: z.string().nullish(),
    gender: z.string().nullish(),
    alignment: z.string().nullish(),
    deity: z.string().nullish(),
    age: z.string().nullish(),
    gold: z.number().nullish(),
    notes: z.string().nullish(),
    webID: z.string().nullish(),
    emailedBuildID: z.number().nullish(),

    classOptionalTrainedSkill: z.string().nullish(),
    listLanguages: z.array(z.string()).nullish(),
    dialects: z.array(z.string().nullish()).optional(),

    hashMapAbilityBoosts: z.record(z.string(), z.array(z.number())).nullish(),
    hashMapAncestryFreeBoostSelections: z.record(z.string(), z.number()).nullish(),
    backgroundBoostLimitedSelection: z.number().nullish(),
    getBackgroundBoostFreeSelection: z.number().nullish(),
    hashMapSkillIncreases: z.record(z.string(), z.array(z.string())).nullish(),
    hashMapCustomSkillIncreases: z.record(z.string(), z.number()).nullish(),
    hashMapTrainedOnlySkillChoices: z.record(z.string(), z.array(z.string())).nullish(),

    hashMapFeatSelections: z.record(z.string(), z.string()).nullish(),
    hashMapSpecialSelections: z.record(z.string(), z.record(z.string(), z.string())).nullish(),

    listPlayerWeapons: z.array(PathbuilderPlayerWeaponSchema).nullish(),
    playerArmor: PathbuilderArmorSchema.nullish(),
    playerShieldNew: PathbuilderShieldSchema.nullish(),
    listPlayerEquipment: z.array(PathbuilderEquipmentEntrySchema).nullish(),
    hashMapEquipmentContainers: z.record(z.string(), PathbuilderContainerSchema).nullish(),

    hashMapPlayerSpells: z.record(z.string(), PathbuilderSpellEntrySchema).nullish(),
    spentSpellPoints: z.number().nullish(),

    hashMapActiveCustomBuffs: z.record(z.string(), z.number()).nullish(),

    freeArchetype: z.boolean().nullish(),
    ancestryParagon: z.boolean().nullish(),
    gradualAbilityBoost: z.boolean().nullish(),
    remastered: z.boolean().nullish(),
    useUpdatedSpells: z.boolean().nullish(),
    allowHalfHeritages: z.boolean().nullish(),
    listDisabledRulebooks: z.array(z.string()).nullish(),
    listOptInBooks: z.array(z.string()).nullish(),
  })
  .passthrough();
export type PathbuilderCharacterData = z.infer<typeof PathbuilderCharacterDataSchema>;

// ─── envelopes ────────────────────────────────────────────────────────────────

export const PathbuilderShareBuildSchema = z
  .object({
    characterData: PathbuilderCharacterDataSchema,
    listCustomFiles: z.array(PathbuilderCustomFileEntrySchema).optional(),
  })
  .passthrough();
export type PathbuilderShareBuild = z.infer<typeof PathbuilderShareBuildSchema>;

/** Response body of POST /app/fetch_emailed.php. build is still a string here. */
export const PathbuilderShareResponseSchema = z
  .object({
    success: z.boolean(),
    version: z.string().nullish(),
    build: z.string().nullish(),
    error: z.string().nullish(),
  })
  .passthrough();
export type PathbuilderShareResponse = z.infer<typeof PathbuilderShareResponseSchema>;

/**
 * The derived json.php shape. Optional enrichment: it is unavailable for many
 * shared builds, and the importer must produce a complete result without it.
 */
export const PathbuilderDerivedSpellCasterSchema = z
  .object({
    name: z.string().nullish(),
    magicTradition: z.string().nullish(),
    spellcastingType: z.string().nullish(),
    ability: z.string().nullish(),
    proficiency: z.number().nullish(),
    focusPoints: z.number().nullish(),
    innate: z.boolean().nullish(),
    perDay: z.array(z.number()).nullish(),
    spells: z.array(z.unknown()).nullish(),
    prepared: z.array(z.unknown()).nullish(),
    blendedSpells: z.array(z.unknown()).nullish(),
  })
  .passthrough();

export const PathbuilderDerivedArmorSchema = z
  .object({
    name: z.string().nullish(),
    qty: z.number().nullish(),
    prof: z.string().nullish(),
    pot: z.number().nullish(),
    res: z.string().nullish(),
    display: z.string().nullish(),
    runes: z.array(z.string()).nullish(),
    worn: z.boolean().nullish(),
  })
  .passthrough();

export const PathbuilderDerivedBuildSchema = z
  .object({
    name: z.string().nullish(),
    class: z.string().optional(),
    ancestry: z.string().nullish(),
    heritage: z.string().nullish(),
    background: z.string().nullish(),
    level: z.number().optional(),
    keyability: z.string().nullish(),
    alignment: z.string().nullish(),
    deity: z.string().nullish(),
    gender: z.string().nullish(),
    age: z.string().nullish(),
    abilities: z.object({
      str: z.number().optional(),
      dex: z.number().optional(),
      con: z.number().optional(),
      int: z.number().optional(),
      wis: z.number().optional(),
      cha: z.number().optional(),
    }).passthrough().nullish(),
    proficiencies: z.record(z.string(), z.number()).nullish(),
    lores: z.array(z.tuple([z.string(), z.number()])).nullish(),
    attributes: z.record(z.string(), z.number()).nullish(),
    acTotal: z.object({
      acProfBonus: z.number().optional(),
      acAbilityBonus: z.number().optional(),
      acItemBonus: z.number().optional(),
      acTotal: z.number().optional(),
      // Pathbuilder v121 exports this as a string (e.g. "1") in some builds.
      shieldBonus: z.union([z.number(), z.string()]).nullable().optional(),
    }).passthrough().nullish(),
    money: z
      .object({
        cp: z.number().optional(),
        sp: z.number().optional(),
        gp: z.number().optional(),
        pp: z.number().optional(),
      })
      .optional(),
    resistances: z.array(z.string()).nullish(),
    armor: z.array(PathbuilderDerivedArmorSchema).nullish(),
    spellCasters: z.array(PathbuilderDerivedSpellCasterSchema).nullish(),
    focusPoints: z.number().nullish(),
    focus: z.record(z.string(), z.unknown()).nullish(),
    familiars: z.array(z.unknown()).nullish(),
    pets: z.array(z.unknown()).nullish(),
  })
  .passthrough();
export type PathbuilderDerivedBuild = z.infer<typeof PathbuilderDerivedBuildSchema>;

export const PathbuilderDerivedResponseSchema = z
  .object({
    success: z.boolean().optional(),
    build: PathbuilderDerivedBuildSchema.optional(),
  })
  .passthrough();
export type PathbuilderDerivedResponse = z.infer<typeof PathbuilderDerivedResponseSchema>;
