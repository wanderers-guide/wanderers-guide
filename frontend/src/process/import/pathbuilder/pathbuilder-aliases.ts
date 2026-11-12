/**
 * Pathbuilder legacy-name -> current Wanderer's Guide content aliases.
 *
 * Pathbuilder stores builds created before the Pathfinder Second Edition
 * Remaster under the legacy names (Magic Missile, Ifrit, Gnoll, ...), while the
 * current WG content package uses the Remastered names (Force Barrage, Naari,
 * Kholo, ...). Without a bridge those builds fail closed even though the
 * mechanics are equivalent.
 *
 * Sources, cross-checked against each other and against WG's actual content:
 *  - Paizo, Pathfinder Second Edition Remaster Project / Player Core & Player
 *    Core 2 (official names; e.g. Aiuvarin, Dromaar, Nephilim, Naari).
 *  - Archives of Nethys 2e (current equipment/spell/feat names).
 *  - PathfinderWiki "Mapping of canon changes" (Aiuvarin/Dromaar/Naari).
 *  - Foundry VTT PF2e `Remaster-Changes` wiki (the rename/merge tables used to
 *    seed the feat, spell, and equipment lists below).
 *
 * Application rules (deliberately fail-closed):
 *  1. An exact WG name always wins; aliases are only consulted when the source
 *     name does not exist in the loaded content package.
 *  2. Alias targets are only used when the loaded package actually contains
 *     them, so the registry cannot manufacture a reference to absent content.
 *  3. If an alias resolves to more than one distinct record, the lookup is
 *     ambiguous and returns nothing. The importer then reports/blocks the
 *     choice instead of guessing.
 *  4. Qualifier fallback is allowed only when it is unique
 *     ("Ember's Eyes (Darkvision)" -> the single "Ember's Eyes"). A generic
 *     name that matches several class-qualified records stays unresolved.
 *
 * Keep this module dependency-free: it is imported by the pure resolver tests.
 */

export type PathbuilderAliasCategory =
  | 'item'
  | 'spell'
  | 'feat'
  | 'ancestry'
  | 'heritage'
  | 'language'
  | 'background'
  | 'class';

const ITEM_ALIASES: Record<string, string[]> = {
  'Aeon Stone (Clear Spindle)': ['Aeon Stone (Nourishing)'],
  'Aeon Stone (Dull Grey)': ['Aeon Stone (Consumed)'],
  'Aeon Stone (Orange Prism)': ['Aeon Stone (Amplifying)'],
  'Aeon Stone (Tourmaline Sphere)': ['Aeon Stone (Delaying)'],
  'Alchemist\'s Tools': ['Alchemist\'s Toolkit'],
  'Barkskin Potion': ['Oak Potion'],
  'Boots of Speed': ['Propulsive Boots'],
  'Bracers of Armor': ['Bands of Force'],
  'Breastplate of Command': ['Warleader\'s Bulwark'],
  'Broom of Flying': ['Flying Broomstick'],
  'Celestial Armor': ['Holy Chain'],
  'Dagger of Venom': ['Serpent Dagger'],
  'Demon Armor': ['Unholy Plate'],
  'Druid\'s Vestments': ['Living Mantle'],
  'Everburning Torch': ['Everlight Crystal'],
  'Eyes of the Eagle': ['Eyes of the Cat'],
  'Flame Tongue': ['Searing Blade'],
  'Gloves of Storing': ['Retrieval Belt'],
  'Hat of Disguise': ['Masquerade Scarf'],
  'Hat of the Magi': ['Mage\'s Hat'],
  'Healer\'s Tools': ['Healer\'s Toolkit'],
  'Healer\'s Tools (Expanded)': ['Healer\'s Toolkit (Expanded)'],
  'Holy Avenger': ['Chalice of Justice'],
  'Horn of Fog': ['Cloud Pouch'],
  'Horseshoes of Speed': ['Alacritous Horseshoes'],
  'Javelin of Lightning': ['Trident of Lightning'],
  'Lich Dust': ['Enervating Powder'],
  'Malyass Root Paste': ['Tangle Root Toxin'],
  'Mask of the Banshee': ['Guise of the Smirking Devil'],
  'Oil of Object Animation': ['Oil of Dynamism'],
  'Owlbear Claw': ['Predator\'s Claw'],
  'Purple Worm Venom': ['Cave Worm Venom'],
  'Rations': ['Rations (1 week)'],
  'Repair Kit': ['Repair Toolkit'],
  'Repair Kit (Commercial)': ['Repair Toolkit (Commercial)'],
  'Repair Kit (Superb)': ['Repair Toolkit (Superb)'],
  'Repair Kit (Tactical)': ['Repair Toolkit (Tactical)'],
  'Rhino Hide': ['Onslaught Hide'],
  'Rungu': ['Cruuk'],
  'Salve of Slipperiness': ['Tricky Liniment'],
  'Shadow Essence': ['Nethershade'],
  'Silversheen': ['Silver Salve'],
  'Sovereign Glue': ['Everlasting Adhesive'],
  'Spell-Storing Rune': ['Spell Reservoir'],
  'Sunrod': ['Glow Rod'],
  'Thieves\' Tools': ['Thieves\' Toolkit'],
  'Thieves\' Tools (Concealable)': ['Concealable Thieves\' Tools'],
  'Tindertwig': ['Matchstick'],
};

const SPELL_ALIASES: Record<string, string[]> = {
  'Abundant Step': ['Shrink the Span'],
  'Abyssal Wrath': ['Chthonian Wrath'],
  'Animate Dead': ['Summon Undead'],
  'Augment Summoning': ['Fortify Summoning'],
  'Baleful Polymorph': ['Cursed Metamorphosis'],
  'Barkskin': ['Oaken Resilience'],
  'Bind Soul': ['Seize Soul'],
  'Blind Ambition': ['Ignite Ambition'],
  'Blink': ['Flicker'],
  'Burning Hands': ['Breathe Fire'],
  'Calm Emotions': ['Calm'],
  'Charming Words': ['Charming Push'],
  'Chill Touch': ['Void Warp'],
  'Cloudkill': ['Toxic Cloud'],
  'Color Spray': ['Dizzying Colors'],
  'Commune with Nature': ['Commune'],
  'Comprehend Language': ['Translate'],
  'Continual Flame': ['Everlight'],
  'Crushing Despair': ['Wave of Despair'],
  'Dancing Lights': ['Light'],
  'Dimension Door': ['Translocate'],
  'Dimensional Anchor': ['Planar Seal'],
  'Dimensional Lock': ['Planar Tether'],
  'Discern Location': ['Pinpoint'],
  'Disrupt Undead': ['Vitality Lash'],
  'Disrupting Weapons': ['Infuse Vitality'],
  'Dragon Claws': ['Flurry of Claws'],
  'Empty Body': ['Embrace Nothingness'],
  'Endure Elements': ['Environmental Endurance'],
  'Entangle': ['Entangling Flora'],
  'False Life': ['False Vitality'],
  'Feather Fall': ['Gentle Landing'],
  'Feeblemind': ['Never Mind'],
  'Finger of Death': ['Execute'],
  'Flaming Sphere': ['Floating Flame'],
  'Flesh To Stone': ['Petrify'],
  'Floating Disk': ['Carryall'],
  'Force Cage': ['Lifewood Cage'],
  'Freedom of Movement': ['Unfettered Movement'],
  'Gaseous Form': ['Vapor Form'],
  'Gentle Repose': ['Peaceful Rest'],
  'Glibness': ['Honeyed Words'],
  'Glitterdust': ['Revealing Light'],
  'Globe of Invulnerability': ['Dispelling Globe'],
  'Glutton\'s Jaw': ['Glutton\'s Jaws'],
  'Hallucinatory Terrain': ['Mirage'],
  'Heroes\' Feast': ['Fortifying Brew'],
  'Hideous Laughter': ['Laughing Fit'],
  'Horrid Wilting': ['Desiccate'],
  'Hypnotic Pattern': ['Hypnotize'],
  'Inspire Competence': ['Uplifting Overture'],
  'Inspire Courage': ['Courageous Anthem'],
  'Inspire Defense': ['Rallying Anthem'],
  'Inspire Heroics': ['Fortissimo Composition'],
  'Invisibility Sphere': ['Shared Invisibility'],
  'Ki Blast': ['Qi Blast'],
  'Ki Form': ['Qi Form'],
  'Ki Rush': ['Qi Rush'],
  'Ki Strike': ['Inner Upheaval'],
  'Know Direction': ['Know the Way'],
  'Legend Lore': ['Collective Memories'],
  'Longstrider': ['Tailwind'],
  'Mage Armor': ['Mystic Armor'],
  'Mage Hand': ['Telekinetic Hand'],
  'Magic Aura': ['Disguise Magic'],
  'Magic Fang': ['Runic Body'],
  'Magic Missile': ['Force Barrage'],
  'Magic Mouth': ['Embed Message'],
  'Magic Weapon': ['Runic Weapon'],
  'Magnificent Mansion': ['Planar Palace'],
  'Maze': ['Quandary'],
  'Meld into Stone': ['One with Stone'],
  'Meteor Swarm': ['Falling Stars'],
  'Mind Blank': ['Hidden Mind'],
  'Misdirection': ['Disguise Magic'],
  'Modify Memory': ['Rewrite Memory'],
  'Neutralize Poison': ['Cleanse Affliction'],
  'Nondetection': ['Veil of Privacy'],
  'Obscuring Mist': ['Mist'],
  'Pass Without Trace': ['Vanishing Tracks'],
  'Passwall': ['Magic Passage'],
  'Phantom Mount': ['Marvelous Mount'],
  'Planar Binding': ['Planar Servitor'],
  'Plane Shift': ['Interplanar Teleport'],
  'Positive Luminance': ['Vital Luminance'],
  'Private Sanctum': ['Peaceful Bubble'],
  'Prying Eye': ['Scouting Eye'],
  'Pulse of The City': ['Pulse of Civilization'],
  'Purify Food And Drink': ['Cleanse Cuisine'],
  'Quivering Palm': ['Touch of Death'],
  'Ray of Enfeeblement': ['Enfeeble'],
  'Remove Curse': ['Cleanse Affliction'],
  'Remove Disease': ['Cleanse Affliction'],
  'Remove Fear': ['Clear Mind'],
  'Remove Paralysis': ['Sure Footing'],
  'Restore Senses': ['Sound Body'],
  'Righteous Might': ['Sacred Form'],
  'Sanctified Ground': ['Anointed Ground'],
  'Scintillating Pattern': ['Confusing Colors'],
  'Scorching Ray': ['Blazing Bolt'],
  'Searing Light': ['Holy Light'],
  'See Invisibility': ['See the Unseen'],
  'Shadow Walk': ['Umbral Journey'],
  'Shapechange': ['Metamorphosis'],
  'Shield Other': ['Share Life'],
  'Simulacrum': ['Shadow Double'],
  'Sound Burst': ['Noise Blast'],
  'Spectral Hand': ['Ghostly Carrier'],
  'Spider Climb': ['Gecko Grip'],
  'Splash of Art': ['Creative Splash'],
  'Stone Tell': ['Speak with Stones'],
  'Stoneskin': ['Mountain Resilience'],
  'Tanglefoot': ['Tangle Vine'],
  'Time Stop': ['Freeze Time'],
  'Tongues': ['Truespeech'],
  'Touch of Idiocy': ['Stupefy'],
  'Tree Shape': ['One with Plants'],
  'Tree Stride': ['Nature\'s Pathway'],
  'True Strike': ['Sure Strike'],
  'Trueseeing': ['Truesight'],
  'Unseen Custodians': ['Phantasmal Custodians'],
  'Unseen Servant': ['Phantasmal Minion'],
  'Vampiric Touch': ['Vampiric Feast'],
  'Veil': ['Illusory Disguise'],
  'Vigilant Eye': ['Rune of Observation'],
  'Wail of the Banshee': ['Wails of the Damned'],
  'Wholeness of Body': ['Harmonize Self'],
  'Wind Walk': ['Migration'],
  'Word of Recall': ['Gathering Call'],
  'Zone of Truth': ['Ring of Truth'],
  // Foundry's rename table is explicitly partial. These additional renames are
  // confirmed by the Archives of Nethys entries and RPGBOT's Remastered spell
  // guides (each current spell notes its legacy name).
  'Acid Splash': ['Caustic Blast'],
  'Comprehend Languages': ['Translate'],
  'Cone of Cold': ['Howling Blizzard'],
  'Disjunction': ['Detonate Magic'],
  'Forbidding Ward': ['Protection'],
  'Ghost Sound': ['Figment'],
  'Phantasmal Killer': ['Vision of Death'],
  'Produce Flame': ['Ignition'],
  'Ray of Frost': ['Frostbite'],
  'Shocking Grasp': ['Thunderstrike'],
  'Weird': ['Phantasmagoria'],
};

const FEAT_ALIASES: Record<string, string[]> = {
  'Aasimar\'s Mercy': ['Celestial Mercy'],
  'Abundant Step': ['Advanced Qi Spells'],
  'Alchemical Savant': ['Alchemical Assessment'],
  'Align Armament': ['Sanctify Armament'],
  'Align Ki': ['Align Qi'],
  'Angelic Magic': ['Celestial Magic'],
  'Animal Feature': ['Advanced Warden'],
  'Archon Magic': ['Celestial Magic'],
  'Arrow Snatching': ['Projectile Snatching'],
  'Aura of Preservation': ['Aura of Determination'],
  'Azata Magic': ['Celestial Magic'],
  'Bespell Weapon': ['Bespell Strikes'],
  'Bone Rider': ['Fossil Rider'],
  'Buckler Expertise': ['Elegant Buckler'],
  'Burrow Elocutionist': ['Animal Elocutionist'],
  'Call Bonded Item': ['Call Wizardly Tools'],
  'Celestial Eyes': ['Nephilim Eyes'],
  'Celestial Lore': ['Nephilim Lore'],
  'Celestial Resistance': ['Nephilim Resistance'],
  'Celestial Wings': ['Divine Wings'],
  'Celestial Word': ['Divine Declaration'],
  'Channeled Succor': ['Restorative Channel'],
  'Combat Reflexes': ['Tactical Reflexes'],
  'Daemon Magic': ['Fiendish Magic'],
  'Deflect Arrow': ['Deflect Projectile'],
  'Demon Magic': ['Fiendish Magic'],
  'Devil Magic': ['Fiendish Magic'],
  'Disrupt Ki': ['Disrupt Qi'],
  'Divine Ally': ['Devout Blessing'],
  'Diviner Sense': ['Keen Magical Detection'],
  'Dragging Strike': ['Sleek Reposition'],
  'Dueling Parry (Swashbuckler)': ['Extravagant Parry'],
  'Dwarven Weapon Cunning': ['Dwarven Weapon Familiarity'],
  'Elastic Mutagen': ['Mutant Physique'],
  'Eldritch Nails': ['Witch\'s Armaments'],
  'Elven Weapon Elegance': ['Elven Weapon Familiarity'],
  'Empty Body, Ki Form': ['Grandmaster Qi Spells'],
  'Empyreal Blessing': ['Extraplanar Supplication'],
  'Enchanting Arrow': ['Enchanting Shot'],
  'Ephemeral Tracking': ['Masterful Warden'],
  'Expert Disassembler': ['Expert Disassembly'],
  'Extend Armament Alignment': ['Lasting Armament'],
  'Eyes of the Night': ['Eyes of Night'],
  'Favored Enemy': ['Favored Prey'],
  'Feral Mutagen': ['Mutant Physique'],
  'Fiend\'s Door': ['Slip Sideways'],
  'Fiendish Eyes': ['Nephilim Eyes'],
  'Fiendish Lore': ['Nephilim Lore'],
  'Fiendish Resistance': ['Nephilim Resistance'],
  'Fiendish Wings': ['Divine Wings'],
  'Fiendish Word': ['Divine Declaration'],
  'Form of the Fiend': ['Bestial Manifestation'],
  'Genius Mutagen': ['Mutant Innervation'],
  'Glib Mutagen': ['Mutant Innervation'],
  'Gnoll Lore': ['Kholo Lore'],
  'Gnoll Weapon Familiarity': ['Kholo Weapon Familiarity'],
  'Gnome Weapon Innovator': ['Gnome Weapon Familiarity'],
  'Goblin Weapon Frenzy': ['Goblin Weapon Familiarity'],
  'Gravity Weapon': ['Initiate Warden'],
  'Green Empathy': ['Plant Empathy'],
  'Grippli Glide': ['Tripkee Glide'],
  'Grippli Weapon Familiarity': ['Tripkee Weapon Familiarity'],
  'Halfling Weapon Trickster': ['Halfling Weapon Familiarity'],
  'Hatchling Flight': ['Winglet Flight'],
  'Healing Touch': ['Devout Magic'],
  'Holy Castigation': ['Divine Castigation'],
  'Hunter\'s Luck': ['Advanced Warden'],
  'Hunter\'s Vision': ['Peerless Warden'],
  'Improved Knockdown': ['Crashing Slam'],
  'Inspirational Performance': ['Anthemic Performance'],
  'Inspire Competence': ['Uplifting Overture'],
  'Inspire Heroics': ['Fortissimo Composition'],
  'Invincible Mutagen': ['Mutant Physique'],
  'Ki Blast': ['Advanced Qi Spells'],
  'Ki Center': ['Qi Center'],
  'Ki Rush': ['Qi Spells'],
  'Knockdown': ['Slam Down'],
  'Leech-Clipper': ['Leech-Clip'],
  'Living Hair': ['Witch\'s Armaments'],
  'Magic Arrow': ['Magic Ammunition'],
  'Malicious Bane': ['Extraplanar Supplication'],
  'Medusa\'s Wrath': ['Master Qi Spells'],
  'Metamagic Channel': ['Spellshape Channel'],
  'Mindblank Mutagen': ['Mutant Innervation'],
  'Necrotic Infusion': ['Divine Infusion'],
  'Nimble Dodge': ['Flashy Dodge'],
  'Nimble Roll': ['Flashy Roll'],
  'Nocturnal Grippli': ['Nocturnal Tripkee'],
  'Nocturnal Sense': ['Nocturnal Senses'],
  'Opportunist': ['Reactive Striker'],
  'Orc Weapon Carnage': ['Orc Weapon Familiarity'],
  'Pirate Weapon Training': ['Pirate Combat Training'],
  'Point-Blank Shot': ['Point Blank Stance'],
  'Power Attack': ['Vicious Swing'],
  'Precious Arrow': ['Precious Ammunition'],
  'Quick Alchemy': ['Advanced Alchemy'],
  'Quivering Palm': ['Master Qi Spells'],
  'Radiant Blade Master': ['Armament Paragon'],
  'Radiant Blade Spirit': ['Radiant Armament'],
  'Radiant Infusion': ['Divine Infusion'],
  'Ranged Reprisal': ['Nimble Reprisal'],
  'Ranger\'s Bramble': ['Masterful Warden'],
  'Ratfolk Growth': ['Greater than the Sum'],
  'Razor Claws': ['Iruxi Armaments'],
  'Reckless Abandon (Barbarian)': ['Desperate Wrath'],
  'Red Herring': ['Eliminate Red Herrings'],
  'Safeguarded Spell': ['Safeguard Spell'],
  'Scroll Savant': ['Scroll Adept'],
  'Second Ally': ['Second Blessing'],
  'Second Chance Spell': ['Second Thoughts'],
  'Seeker Arrow': ['Homing Shot'],
  'Shared Luck (Catfolk)': ['Luck of the Clowder'],
  'Sharp Fangs': ['Iruxi Armaments'],
  'Silent Spell': ['Conceal Spell'],
  'Smite Evil': ['Smite'],
  'Smite Good': ['Smite'],
  'Sneak Savant': ['Sneak Adept'],
  'Soothing Mist': ['Advanced Warden'],
  'Spell Penetration': ['Irresistible Magic'],
  'Spirit Strikes': ['Quietus Strikes'],
  'Spring Attack': ['Dashing Strike'],
  'Stance Savant': ['Opening Stance', 'Reflexive Stance'],
  'Stonecunning': ['Stonemason\'s Eye'],
  'Stunning Fist': ['Stunning Blows'],
  'Subtle Delivery': ['Blowgun Poisoner'],
  'Summon Celestial Kin': ['Summon Nephilim Kin'],
  'Summon Fiendish Kin': ['Summon Nephilim Kin'],
  'Tail Whip': ['Iruxi Armaments'],
  'Temporary Potions': ['Cauldron'],
  'Terrain Transposition': ['Peerless Warden'],
  'Thousand Faces': ['Anthropomorphic Shape'],
  'Turn Undead': ['Panic the Dead'],
  'Vanth\'s Weapon Familiarity': ['Duskwalker Weapon Familiarity'],
  'Vengeful Hatred': ['Mountain Strategy'],
  'Vigorous Inspiration': ['Vigorous Anthem'],
  'Vile Desecration': ['Divine Castigation'],
  'Wholeness of Body': ['Harmonize Self'],
  'Wild Empathy': ['Animal Empathy (Ranger)'],
  'Wild Shape': ['Untamed Form'],
  'Woodland Stride': ['Forest Passage'],
  // Pathbuilder records the Fighter/class reaction as a feat selection. Foundry
  // lists it under Class Features, so it is not in the Feats table above.
  'Attack of Opportunity': ['Reactive Strike'],
};

const ANCESTRY_ALIASES: Record<string, string[]> = {
  'Gnoll': ['Kholo'],
  'Grippli': ['Tripkee'],
};

const HERITAGE_ALIASES: Record<string, string[]> = {
  'Aasimar': ['Nephilim'],
  'Half-Elf': ['Aiuvarin'],
  'Half-Orc': ['Dromaar'],
  'Ifrit': ['Naari'],
  'Tiefling': ['Nephilim'],
};

const LANGUAGE_ALIASES: Record<string, string[]> = {
  'Abyssal': ['Chthonian'],
  'Aquan': ['Thalassic'],
  'Auran': ['Sussuran'],
  'Celestial': ['Empyrean'],
  'Druidic': ['Wildsong'],
  'Gnoll': ['Kholo'],
  'Ignan': ['Pyric'],
  'Infernal': ['Diabolic'],
  'Sylvan': ['Fey'],
  'Terran': ['Petran'],
  'Undercommon': ['Sakvroth'],
};

export const PATHBUILDER_ALIASES: Record<
  PathbuilderAliasCategory,
  Record<string, string[]>
> = {
  item: ITEM_ALIASES,
  spell: SPELL_ALIASES,
  feat: FEAT_ALIASES,
  ancestry: ANCESTRY_ALIASES,
  heritage: HERITAGE_ALIASES,
  language: LANGUAGE_ALIASES,
  background: {},
  class: {},
};

/** Same normalization WG uses for content names (digits and punctuation dropped). */
export function pathbuilderAliasKey(name: string): string {
  return name
    .trim()
    .toUpperCase()
    .replace(/-/g, '_')
    .replace(/[^A-Z_\s]/g, '')
    .replace(/\s+/g, '_');
}

const NORMALIZED_ALIASES: Record<PathbuilderAliasCategory, Record<string, string[]>> = {
  item: {},
  spell: {},
  feat: {},
  ancestry: {},
  heritage: {},
  language: {},
  background: {},
  class: {},
};
for (const [category, table] of Object.entries(PATHBUILDER_ALIASES) as Array<
  [PathbuilderAliasCategory, Record<string, string[]>]
>) {
  for (const [legacy, targets] of Object.entries(table)) {
    NORMALIZED_ALIASES[category][pathbuilderAliasKey(legacy)] = targets;
  }
}

/** Strip a trailing parenthetical qualifier, e.g. "(Darkvision)" or "(legacy)". */
function baseAliasKey(name: string): string {
  return pathbuilderAliasKey(name.replace(/\s*\([^()]*\)\s*$/, ''));
}

/** Original name followed by every validated alias target, without duplicates. */
export function pathbuilderNameCandidates(
  category: PathbuilderAliasCategory,
  name: string
): string[] {
  const candidates = [name, ...(NORMALIZED_ALIASES[category][pathbuilderAliasKey(name)] ?? [])];
  return candidates.filter((candidate, index) => candidates.indexOf(candidate) === index);
}

/**
 * Resolve a Pathbuilder name against a content list.
 *
 * Exact matches win. Otherwise aliases are tried, then a unique
 * qualifier-insensitive match. Ambiguous alias/base matches yield no result so
 * callers can keep the import fail-closed.
 */
export function findPathbuilderMatch<T>(
  category: PathbuilderAliasCategory,
  name: string,
  entries: readonly T[],
  getName: (entry: T) => string | undefined
): T | undefined {
  const nameKey = pathbuilderAliasKey(name);
  const exact = entries.find((entry) => {
    const candidate = getName(entry);
    return candidate !== undefined && pathbuilderAliasKey(candidate) === nameKey;
  });
  if (exact) return exact;

  const aliases = pathbuilderNameCandidates(category, name).slice(1);
  const aliasMatches: T[] = [];
  for (const alias of aliases) {
    const key = pathbuilderAliasKey(alias);
    for (const entry of entries) {
      const candidate = getName(entry);
      if (
        candidate !== undefined &&
        pathbuilderAliasKey(candidate) === key &&
        !aliasMatches.includes(entry)
      ) {
        aliasMatches.push(entry);
      }
    }
  }
  if (aliasMatches.length > 0) {
    return aliasMatches.length === 1 ? aliasMatches[0] : undefined;
  }

  // Unique qualifier-insensitive fallback: "Name (Variant)" <-> "Name".
  const baseKey = baseAliasKey(name);
  if (!baseKey) return undefined;
  const baseMatches = entries.filter((entry) => {
    const candidate = getName(entry);
    return candidate !== undefined && baseAliasKey(candidate) === baseKey;
  });
  return baseMatches.length === 1 ? baseMatches[0] : undefined;
}

/** Every record a name/alias resolves to, for callers that need to fail on ambiguity. */
export function findPathbuilderMatches<T>(
  category: PathbuilderAliasCategory,
  name: string,
  entries: readonly T[],
  getName: (entry: T) => string | undefined
): T[] {
  const nameKey = pathbuilderAliasKey(name);
  const exact = entries.filter((entry) => {
    const candidate = getName(entry);
    return candidate !== undefined && pathbuilderAliasKey(candidate) === nameKey;
  });
  if (exact.length > 0) return exact;

  const matches: T[] = [];
  for (const alias of pathbuilderNameCandidates(category, name).slice(1)) {
    const key = pathbuilderAliasKey(alias);
    for (const entry of entries) {
      const candidate = getName(entry);
      if (
        candidate !== undefined &&
        pathbuilderAliasKey(candidate) === key &&
        !matches.includes(entry)
      ) {
        matches.push(entry);
      }
    }
  }
  if (matches.length > 0) return matches;

  const baseKey = baseAliasKey(name);
  if (!baseKey) return [];
  return entries.filter((entry) => {
    const candidate = getName(entry);
    return candidate !== undefined && baseAliasKey(candidate) === baseKey;
  });
}
