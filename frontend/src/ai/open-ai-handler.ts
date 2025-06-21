import { getAllIcons } from '@common/Icon';
import { convertTiptapToMarkdown } from '@common/rich_text_input/utils';
import { GUIDE_BLUE } from '@constants/data';
import { fetchContentPackage } from '@content/content-store';
import { calculateDifficulty } from '@pages/campaign/panels/EncountersPanel';
import { getEntityLevel } from '@pages/character_sheet/living-entity-utils';
import { makeRequest } from '@requests/request-manager';
import { Campaign, CampaignNPC, CampaignSessionIdea, Character, Creature, Encounter, Trait } from '@typing/content';
import { GranularCreature } from '@typing/index';
import { adjustCreature, findCreatureTraits } from '@utils/creature';
import { selectRandom } from '@utils/random';
import { isTruthy } from '@utils/type-fixing';
import yaml from 'js-yaml';
import { cloneDeep } from 'lodash-es';

export async function generateCompletion(prompt?: string, model = 'gpt-4o-mini') {
  if (!prompt) return null;
  const result = await makeRequest<string>('open-ai-request', {
    content: prompt.trim(),
    model: model,
  });
  return result;
}

export async function randomCharacterInfo(character: Character) {
  const prompt = `
  From the following information about a TTRPG character, generate the following information: about them.

  ## Name:
  ${character.name}
  ## Level:
  ${getEntityLevel(character)}

  ## Class:
  ${character.details?.class?.name}

  ## Background:
  ${character.details?.background?.name}

  ## Ancestry:
  ${character.details?.ancestry?.name}


  Here's the information I need, please fill in this JSON object with basic information.
  Be creative but keep each field to one sentence max. Do more with less.
  {
    appearance: string;
    personality: string;
    alignment: string;
    beliefs: string;
    age: string;
    height: string;
    weight: string;
    gender: string;
    pronouns: string;
    faction: string;
    ethnicity: string;
    nationality: string;
    birthplace: string;
  }


  Only return the JSON object with the information filled in. DO NOT INCLUDE \`\`\`json\`\`\` in your response.
  The resulting object:
  `.trim();
  const result = await generateCompletion(prompt, 'gpt-4o-mini');
  try {
    const data = yaml.load(result ?? '') as any;
    character.details = {
      ...character.details,
      info: {
        ...character.details?.info,
        appearance: `${data?.appearance}`,
        personality: `${data?.personality}`,
        alignment: `${data?.alignment}`,
        beliefs: `${data?.beliefs}`,
        age: `${data?.age}`,
        height: `${data?.height}`,
        weight: `${data?.weight}`,
        gender: `${data?.gender}`,
        pronouns: `${data?.pronouns}`,
        faction: `${data?.faction}`,
        ethnicity: `${data?.ethnicity}`,
        nationality: `${data?.nationality}`,
        birthplace: `${data?.birthplace}`,
      },
    };
    return character;
  } catch (e) {
    console.warn('Failed to parse response', e);
    return character;
  }
}

export async function classifySkillForAction(description: string) {
  const prompt = `
  Please determine the most appropriate skill for the action with the following description.
  Only respond with the skill name that is most appropriate for the action.
  If you are unsure, please respond with "unsure".

  ## Description:
  ${description}

  ## Skills:
    ACROBATICS
    ARCANA
    ATHLETICS
    CRAFTING
    DECEPTION
    DIPLOMACY
    INTIMIDATION
    MEDICINE
    NATURE
    OCCULTISM
    PERFORMANCE
    RELIGION
    SOCIETY
    STEALTH
    SURVIVAL
    THIEVERY
    LORE
  `.trim();
  return await generateCompletion(prompt);
}

export async function generateNPC(
  campaign: Campaign,
  players: Character[],
  notePages: number[],
  additional?: string
): Promise<CampaignNPC | null> {
  const prompt = `
  I’m going to give you some information about a Pathfinder / Starfinder / D&D campaign and I need you to generate an NPC for it.
  Be creative and have fun with it, the most interesting NPCs are ones that embrace archetypes and are complex and interesting.
  The ancestry, background, and class should be the name from the options you could select in Pathfinder / Starfinder.
  The NPC level should be within the range 1-20.

  # Campaign Basic Info:
  Name: ${campaign.name}
  Description: ${campaign.description}
  Additional Info: ${additional ?? 'None provided'}


  # Players:
  ${players
    .map((player) => {
      return `Name: ${player.name}\n Level: ${getEntityLevel(player)}\n Class: ${player.details?.class?.name}\n Background: ${player.details?.background?.name}\n Ancestry: ${player.details?.ancestry?.name} \n Details: ${JSON.stringify(player.details?.info ?? {})}\n`;
    })
    .join('\n\n-----\n\n')}


  # Campaign Notes:
  ${campaign.notes?.pages
    .filter((_page, index) => notePages.includes(index))
    ?.map((page) => '### ' + page.name + '\n' + convertTiptapToMarkdown(page.contents))
    .join('\n\n')}

      
  # Output Format:
  {
    name: string;
    description: string;
    level: number;
    class: string;
    background: string;
    ancestry: string;
  }


  Use markdown to format your output. Only return the JSON object with the information filled in. DO NOT INCLUDE \`\`\`json\`\`\` in your response.
  # Output:
  `.trim();
  const result = await generateCompletion(prompt, 'gpt-4o-mini');

  try {
    return yaml.load(result ?? '') as any;
  } catch (e) {
    console.warn('Failed to parse response', e);
    return null;
  }
}

export async function extractCharacterInfo(info: string): Promise<Record<string, string>> {
  const prompt = `
  I’m going to give you some background information about a Pathfinder/ Starfinder / D&D character and I want you to extract certain pieces of information about them. If you can't, just don't include that output field.

  # Character Background Info:
  ${info}
  
  # Output Format:
  {
    notes?: string;
    appearance?: string;
    personality?: string;
    alignment?: string;
    beliefs?: string;
    age?: string;
    height?: string;
    weight?: string;
    gender?: string;
    pronouns?: string;
    faction?: string;
    reputation?: string;
    ethnicity?: string;
    nationality?: string;
    birthplace?: string;
  }


  Only return the JSON object with the information filled in. DO NOT INCLUDE \`\`\`json\`\`\` in your response.
  # Output:
  `.trim();
  const result = await generateCompletion(prompt, 'gpt-4o-mini');

  try {
    return yaml.load(result ?? '') as any;
  } catch (e) {
    console.warn('Failed to parse response', e);
    return {};
  }
}

export async function generateSessionIdea(
  campaign: Campaign,
  players: Character[],
  notePages: number[],
  additional?: string
): Promise<CampaignSessionIdea | null> {
  const prompt = `
  I’m going to give you some information about a Pathfinder/ Starfinder / D&D campaign and I need you to generate a campaign the next session idea for it.
  This should be an outline of what should happen in the next session. Be creative and have fun with it.

  In your output outline, include a name and a detailed session outline.

  # Campaign Basic Info:
  Name: ${campaign.name}
  Description: ${campaign.description}
  Additional Info: ${additional ?? 'None provided'}


  # Players:
  ${players
    .map((player) => {
      return `Name: ${player.name}\n Level: ${getEntityLevel(player)}\n Class: ${player.details?.class?.name}\n Background: ${player.details?.background?.name}\n Ancestry: ${player.details?.ancestry?.name} \n Details: ${JSON.stringify(player.details?.info ?? {})}\n`;
    })
    .join('\n\n-----\n\n')}


  # Campaign Notes:
  ${campaign.notes?.pages
    .filter((_page, index) => notePages.includes(index))
    ?.map((page) => '### ' + page.name + '\n' + convertTiptapToMarkdown(page.contents))
    .join('\n\n')}

      
  # Output Format:
  {
    name: string;
    outline: string;
  }


  Use markdown to format your output. at the Only return the JSON object with the information filled in. DO NOT INCLUDE \`\`\`json\`\`\` in your response.
  # Output:
  `.trim();
  const result = await generateCompletion(prompt, 'gpt-4o-mini');

  try {
    const r = yaml.load(result ?? '') as any;
    const actions = await generateSessionIdeaActions(r.outline);
    return {
      name: r.name,
      outline: r.outline.replace(/^### .+\n/, ''),
      actions: actions?.actions ?? [],
    };
  } catch (e) {
    console.warn('Failed to parse response', e);
    return null;
  }
}

async function generateSessionIdeaActions(
  outline: string
): Promise<{ actions: { name: string; description: string; type: 'NPC' | 'ENCOUNTER' }[] } | null> {
  const prompt = `
  I’m going to give you an outline for a Pathfinder / Starfinder / D&D campaign session and I need you to generate some optional actions that includes info that could be used in the future to produce the NPCs or encounters for the session.
  These could be a basic outline of an NPC for the session or an basic description of an encounter in the session.

  
  # Session Outline:
  ${outline}


  # Output Format:
  {
    actions: {
      name: string;
      description: string;
      type: 'NPC' | 'ENCOUNTER';
    }[];
  }


  Use markdown to format your output. Only return the JSON object with the information filled in. DO NOT INCLUDE \`\`\`json\`\`\` in your response.
  # Output:
  `.trim();
  const result = await generateCompletion(prompt, 'gpt-4o-mini');
  try {
    return yaml.load(result ?? '') as any;
  } catch (e) {
    console.warn('Failed to parse response', e);
    return null;
  }
}

/**
 * Uses AI to detect potential content links.
 * - Potential content links are wrapped in double square brackets.
 * @param text
 */
export async function detectPotentialContentLinks(description: string) {
  const prompt = `
  # Your job is it to detect potential content links in a description for Pathfinder 2e. IMPORTANT: Your response should only be the exact same as the description but with any potential content links wrapped in double brackets.

  # Examples:
  ### Input:
  You change your grip on the shield, allowing you to combine rapid attacks with your shield boss or shield spikes and your main weapon’s Strikes in a series of swift motions. You reduce your [[shield boss]] and shield spikes weapon damage die to 1d4 and your Strikes gain the agile weapon trait. You can use Agile Shield Grip again to switch to a normal grip, which removes the agile trait.
  ### Output:
  You change your grip on the shield, allowing you to combine rapid attacks with your [[shield boss]] or [[shield spikes]] and your main weapon’s [[Strikes]] in a series of swift motions. You reduce your [[shield boss]] and [[shield spikes]] weapon damage die to 1d4 and your [[Strikes]] gain the [[agile]] weapon trait. You can use [[Agile Shield Grip]] again to switch to a normal grip, which removes the [[agile]] trait.

  ### Input:
  Your deceptions confound even the most powerful mortal divinations. Detection, revelation, and scrying effects pass right over you, your possessions, and your auras, detecting nothing unless the detecting effect has a counteract level of 10 or higher. For example, detect magic would still detect other magic in the area but not any magic on you, true seeing wouldn’t reveal you, locate or scrying wouldn’t find you, and so on.
  ### Output:
  Your deceptions confound even the most powerful mortal divinations. [[Detection]], [[revelation]], and [[scrying]] effects pass right over you, your possessions, and your auras, detecting nothing unless the detecting effect has a counteract level of 10 or higher. For example, [[detect magic]] would still detect other magic in the area but not any magic on you, [[true seeing]] wouldn’t reveal you, [[locate]] or [[scrying]] wouldn’t find you, and so on.

  ### Input:
  You whip up a small sandstorm around your body. When a creature starts its turn in the area or moves into the area, it must succeed at a Fortitude save or become dazzled for as long as it remains in the area; it is then temporarily immune to this dazzling effect for 10 minutes. 
  Additionally, you direct a jet of sand at a single target. One creature of your choice within 30 feet takes 8d6 slashing damage (basic Reflex save). On a critical failure, the creature is also frightened 1 until the next time you Sustain the Spell or for 1 minute.
  ### Output:
  You whip up a small sandstorm around your body. When a creature starts its turn in the area or moves into the area, it must succeed at a Fortitude save or become [[dazzled]] for as long as it remains in the area; it is then temporarily immune to this [[dazzling]] effect for 10 minutes. 
  Additionally, you direct a jet of sand at a single target. One creature of your choice within 30 feet takes 8d6 slashing damage (basic Reflex save). On a critical failure, the creature is also [[frightened 1]] until the next time you [[Sustain the Spell]] or for 1 minute.

  Now it's your turn.
  ### Input:
  ${description}
  `.trim();
  return await generateCompletion(prompt);
}

export async function fixBackgroundContent(description: string) {
  const prompt = `
  Your job is to fix backgrounds. I'm going to give you 3 examples and then it'll be your turn to do the same thing.

# Example 1
———————————

## Input
> _You spent your early days in a religious monastery or cloister. You may have traveled out into the world to spread the message of your religion or because you cast away the teachings of your faith, but deep down, you'll always carry within you the lessons you learned._

Choose two attribute boosts. One must be to [Intelligence](link_trait_1613) or Wisdom, and one is a free attribute boost.

You're trained in the Religion skill and the Scribing Lore skill. You gain the [Student of the Canon](link_feat_20599) skill feat.

## Output
### Description:
> _You spent your early days in a religious monastery or cloister. You may have traveled out into the world to spread the message of your religion or because you cast away the teachings of your faith, but deep down, you'll always carry within you the lessons you learned._

Choose two attribute boosts. One must be to Intelligence or Wisdom, and one is a free attribute boost.

You're trained in the Religion skill and the Scribing Lore skill. You gain the Student of the Canon skill feat.
### Attribute Choice: [INT, WIS]
### Skills: [RELIGION, LORE_SCRIBING]
### Feat: [Student of the Canon]

———————————
# Example 2
———————————

## Input
> _To the common folk, the life of a noble seems one of idyllic luxury, but growing up as a noble or member of the aspiring gentry, you know the reality: a noble's lot is obligation and intrigue. Whether you seek to escape your duties by adventuring or to better your station, you have traded silks and pageantry for an adventurer's life._

Choose two attribute boosts. One must be to [Intelligence](link_trait_1613) or Charisma, and one is a free attribute boost.

You're trained in the Society skill and the Genealogy Lore or Heraldry Lore skill. You gain the [Courtly Graces](link_feat_20024) skill feat.

## Output
### Description:
> _To the common folk, the life of a noble seems one of idyllic luxury, but growing up as a noble or member of the aspiring gentry, you know the reality: a noble's lot is obligation and intrigue. Whether you seek to escape your duties by adventuring or to better your station, you have traded silks and pageantry for an adventurer's life._

Choose two attribute boosts. One must be to Intelligence or Charisma, and one is a free attribute boost.

You're trained in the Society skill and the Genealogy Lore or Heraldry Lore skill. You gain the Courtly Graces skill feat.
### Attribute Choice: [INT, CHA]
### Skills: [SOCIETY, NOT_SURE]
### Feat: [Courtly Graces]

———————————
# Example 3
———————————

## Input
> _You have been imprisoned or punished for crimes (whether you were guilty or not). Now that your sentence has ended or you've escaped, you take full advantage of the newfound freedom of your adventuring life._

Choose two attribute boosts. One must be to Strength or Constitution, and one is a free attribute boost.

You're trained in the [Stealth](link_feat_20586) skill and the Underworld Lore skill. You gain the [Experienced Smuggler](link_feat_20127) skill feat.

## Output
### Description:
> _You have been imprisoned or punished for crimes (whether you were guilty or not). Now that your sentence has ended or you've escaped, you take full advantage of the newfound freedom of your adventuring life._

Choose two attribute boosts. One must be to Strength or Constitution, and one is a free attribute boost.

You're trained in the Stealth skill and the Underworld Lore skill. You gain the Experienced Smuggler skill feat.
### Attribute Choice: [STR, CON]
### Skills: [STEALTH, LORE_UNDERWORLD]
### Feat: [Experienced Smuggler]

———————————

If you come across any lore where it’s more complicated than just “you’re trained in <blank> Lore”, just say NOT_SURE.


Okay, now it’s your turn:

## Input
${description}

## Output`.trim();

  const result = (await generateCompletion(prompt)) ?? '';

  const obj = {
    description: '',
    attributeChoice: [] as string[],
    skills: [] as string[],
    feat: '',
  };

  // Extract Description
  const descriptionMatch = result.match(/Description:\s*(>\s*.*?)\s*###\s*/s);
  if (descriptionMatch) {
    obj.description = descriptionMatch[1].trim();
  }

  // Extract Attribute Choice
  const attributeChoiceMatch = result.match(/Attribute Choice: \[(.+?)\]/);
  if (attributeChoiceMatch) {
    obj.attributeChoice = attributeChoiceMatch[1].split(',').map((x) => x.trim());
  }

  // Extract Skills
  const skillsMatch = result.match(/Skills: \[(.+?)\]/);
  if (skillsMatch) {
    obj.skills = skillsMatch[1].split(',').map((x) => x.trim());
  }

  // Extract Feat
  const featMatch = result.match(/Feat: \[(.+?)\]/);
  if (featMatch) {
    obj.feat = featMatch[1].trim();
  }

  return obj;
}

export async function generateEncounters(partyLevel: number, partySize: number, description: string) {
  const content = await fetchContentPackage(undefined, { fetchSources: false, fetchCreatures: true });

  const creatureIds = await selectEncounterCreaturesSample(partyLevel, content.creatures, content.traits, description);
  if (!creatureIds) return null;
  const selectedCreatures = content.creatures.filter((creature) => creatureIds?.creatures.includes(creature.id));

  const encountersData = await buildEncounters(partyLevel, partySize, selectedCreatures, content.traits, description);
  if (!encountersData) return null;

  const encounters: Encounter[] = Object.values(encountersData).map((data) => {
    const creatures: Creature[] = [];
    for (const c of data.creatures) {
      const creatureData = selectedCreatures.find((cr) => cr.id === c.id);
      if (creatureData) {
        for (let i = 0; i < c.amount; i++) {
          creatures.push(creatureData);
        }
      }
    }

    // Ensure the hex color is valid
    const hexColor =
      data.hexColor.length === 7 ? data.hexColor : data.hexColor.length === 6 ? '#' + data.hexColor : GUIDE_BLUE;

    return {
      id: -1,
      created_at: '',
      user_id: '',
      //
      name: data.name,
      icon: selectRandom(getAllIcons()),
      color: hexColor,
      campaign_id: undefined,
      combatants: {
        list: creatures.map((creature) => ({
          _id: crypto.randomUUID(),
          type: 'CREATURE',
          ally: false,
          initiative: undefined,
          creature: creature,
          character: undefined,
          data: undefined,
        })),
      },
      meta_data: {
        description: data.description,
        party_level: partyLevel,
        party_size: partySize,
      },
    } satisfies Encounter;
  });

  // Auto scale the encounters
  console.log('Balancing encounters...');
  return encounters.map((encounter) => {
    let difficulty = calculateDifficulty(
      encounter,
      encounter.combatants.list.map((c) => ({
        ...c,
        data: c.creature!,
      }))
    );

    console.log('Initial Difficulty:', difficulty);
    while (
      (difficulty.status === 'IMPOSSIBLE' || difficulty.status === 'Trivial') &&
      encounter.combatants.list.length > 0
    ) {
      if (difficulty.status === 'IMPOSSIBLE') {
        const highestLevelCreature = encounter.combatants.list.reduce((prev, current) =>
          getEntityLevel(prev.creature!) > getEntityLevel(current.creature!) ? prev : current
        );
        const lowestLevelCreature = encounter.combatants.list.reduce((prev, current) =>
          getEntityLevel(prev.creature!) < getEntityLevel(current.creature!) ? prev : current
        );

        if (highestLevelCreature.creature!.details.adjustment === undefined) {
          // Weakened highest level creatures
          encounter.combatants.list = encounter.combatants.list.map((c) => {
            if (c.creature?.id === highestLevelCreature.creature?.id) {
              console.log('- Weakened:', highestLevelCreature.creature?.name);
              return {
                ...c,
                creature: adjustCreature(c.creature!, 'WEAK'),
              };
            } else {
              return c;
            }
          });
        } else {
          // Remove lowest level creature
          encounter.combatants.list = encounter.combatants.list.filter((c) => c !== lowestLevelCreature);
          console.log('- Removed:', lowestLevelCreature.creature?.name);
        }
      } else if (difficulty.status === 'Trivial') {
        const highestLevelCreature = encounter.combatants.list.reduce((prev, current) =>
          getEntityLevel(prev.creature!) > getEntityLevel(current.creature!) ? prev : current
        );
        const lowestLevelCreature = encounter.combatants.list.reduce((prev, current) =>
          getEntityLevel(prev.creature!) < getEntityLevel(current.creature!) ? prev : current
        );

        if (lowestLevelCreature.creature!.details.adjustment === undefined) {
          // Elite lowest level creatures
          encounter.combatants.list = encounter.combatants.list.map((c) => {
            if (c.creature?.id === lowestLevelCreature.creature?.id) {
              console.log('- Elited:', lowestLevelCreature.creature?.name);
              return {
                ...c,
                creature: adjustCreature(c.creature!, 'ELITE'),
              };
            } else {
              return c;
            }
          });
        } else {
          // Add another of highest level creature
          encounter.combatants.list.push({
            ...cloneDeep(highestLevelCreature),
            _id: crypto.randomUUID(),
          });
          console.log('- Added:', highestLevelCreature.creature?.name);
        }
      }

      difficulty = calculateDifficulty(
        encounter,
        encounter.combatants.list.map((c) => ({
          ...c,
          data: c.creature!,
        }))
      );
      console.log('- New Difficulty:', difficulty);
    }

    return encounter;
  });
}

async function selectEncounterCreaturesSample(
  partyLevel: number,
  creatures: Creature[],
  traits: Trait[],
  description: string
): Promise<{ creatures: number[] } | null> {
  const fightableCreatures = creatures.filter(
    (creature) => getEntityLevel(creature) >= partyLevel - 4 && getEntityLevel(creature) <= partyLevel + 4
  );

  const prompt = `
  You are a GM planning a session for a Pathfinder / Starfinder / D&D campaign and you need to select fitting creatures for an encounter.
  I’m going to give you a list of creatures and a description of what the setting should be like and I need you to select from the list of creatures the 30 most fitting creatures that could be used in an encounter for the setting.

  # Description:
  ${description}

  # Creatures (ID - Name - Traits):
  ${fightableCreatures.map((creature) => {
    return `${creature.id} - ${creature.name} - ${findCreatureTraits(creature)
      .map((traitId) => traits.find((t) => t.id === traitId)?.name)
      .filter(isTruthy)
      .join(', ')}`;
  })}


  # Output Format:
  {
    creatures: number[];
  }


  Use markdown to format your output. Only return the JSON object with the IDs for the 30 most likely creatures. DO NOT INCLUDE \`\`\`json\`\`\` in your response.
  # Output:
  `.trim();
  const result = await generateCompletion(prompt, 'gpt-4o');
  try {
    return yaml.load(result ?? '') as any;
  } catch (e) {
    console.warn('Failed to parse response', e);
    return null;
  }
}

async function buildEncounters(
  partyLevel: number,
  partySize: number,
  selectedCreatures: Creature[],
  traits: Trait[],
  description: string
): Promise<{
  encounter1: { creatures: { amount: number; id: number }[]; description: string; name: string; hexColor: string };
  encounter2: { creatures: { amount: number; id: number }[]; description: string; name: string; hexColor: string };
  encounter3: { creatures: { amount: number; id: number }[]; description: string; name: string; hexColor: string };
} | null> {
  const prompt = `
  You are a GM for a Pathfinder / Starfinder / D&D campaign and you need to build an encounter for the party.
  I’m going to give you a list of fitting creatures and a description of what the setting should be like and I need you to build an exciting encounter for it.
  Please build 3 example encounters, each with a different set of creatures and some variety - get creative with it!

  For each encounter, include 1 to 4 different types of creatures, how much of each of those creatures, and a short description on why you picked what you did.
  If you select a high level creature (3 or more levels above the party level), it's probably a boss creature and should be the only creature in the encounter or have a couple low level minions.

  # Description:
  ${description}

  # Party Level: ${partyLevel}
  # Party Size: ${partySize}

  # Creatures (ID - Name, Level - Traits):
  ${selectedCreatures.map((creature) => {
    return `${creature.id} - ${creature.name}, Lvl. ${getEntityLevel(creature)} - ${findCreatureTraits(creature)
      .map((traitId) => traits.find((t) => t.id === traitId)?.name)
      .filter(isTruthy)
      .join(', ')}`;
  })}


  # Output Format:
  {
    encounter1: {
      creatures: { amount: number, id: number }[];
      description: string;
      name: string;
      hexColor: string;
    },
    encounter2: {
      creatures: { amount: number, id: number }[];
      description: string;
      name: string;
      hexColor: string;
    },
    encounter3: {
      creatures: { amount: number, id: number }[];
      description: string;
      name: string;
      hexColor: string;
    },
  }


  Use markdown to format your output. Only return the JSON object with the information provided. DO NOT INCLUDE \`\`\`json\`\`\` in your response.
  # Output:
  `.trim();
  const result = await generateCompletion(prompt, 'gpt-4o');
  try {
    return yaml.load(result ?? '') as any;
  } catch (e) {
    console.warn('Failed to parse response', e);
    return null;
  }
}

export async function parseCreatureStatBlock(text: string) {
  const prompt =
    `I need you to parse through a pf2e stat block and extract what you can into the following output structure (follow the TypeScript interface).

interface GranularCreature {
  name?: string;
  level?: number;
  imageUrl?: string;
  size: 'MEDIUM' | string;
  rarity: 'COMMON' | string;
  traits?: string[];
  perception: {
    value: number;
    senses?: { name: string; range?: number; acuity?: 'precise' | 'imprecise' | 'vague' }[];
    notes?: string;
  };
  languages: {
    value?: string[];
    notes?: string;
  };
  skills?: { name: string; bonus: number }[];
  attributes: { name: string; value: number }[];
  items?: {
    name: string;
    quantity: number;
    notes?: string;
  }[];
  speeds: {
    name: string;
    value: number;
    notes?: string;
  }[];
  resistances?: {
    type: string;
    value: number;
    doubleAgainst?: string[];
    exceptions?: string[];
  }[];
  weaknesses?: {
    type: string;
    value: number;
    doubleAgainst?: string[];
    exceptions?: string[];
  }[];
  immunities?: {
    type: string;
    exceptions?: string[];
  }[];
  ac: {
    value: number;
    notes?: string;
  };
  saves: {
    fort: {
      value: number;
      notes?: string;
    };
    ref: {
      value: number;
      notes?: string;
    };
    will: {
      value: number;
      notes?: string;
    };
    generalNotes?: string;
  };
  hp: {
    value: number;
    notes?: string;
  };
  abilities?: {
    name: string;
    action?:
      | null
      | 'ONE-ACTION'
      | 'TWO-ACTIONS'
      | 'THREE-ACTIONS'
      | 'REACTION'
      | 'FREE-ACTION'
      | 'ONE-TO-TWO-ACTIONS'
      | 'ONE-TO-THREE-ACTIONS'
      | 'TWO-TO-THREE-ACTIONS'
      | 'TWO-TO-TWO-ROUNDS'
      | 'TWO-TO-THREE-ROUNDS'
      | 'THREE-TO-TWO-ROUNDS'
      | 'THREE-TO-THREE-ROUNDS';
    traits?: string[]; // listed as (traits, separated by commas)
    description: string; // ability's effect
    frequency?: string;
    trigger?: string;
    requirements?: string;
    special?: string;
  }[];
  attacks?: {
    attackType: 'melee' | 'ranged';
    action: 'ONE-ACTION';
    name: string;
    attackBonus: { attack1st: number; attack2nd?: number; attack3rd?: number };
    traits?: string[];
    damage: {
      amountOfDice: number;
      dieType: 'd4' | 'd6' | 'd8' | 'd10' | 'd12';
      damageBonus?: number;
      damageType: string;
      extraEffects?: string[];
    };
    misc?: {
      range?: number;
      reload?: number;
    };
  }[];
  spellcasting?: {
    innate?: {
      tradition: 'ARCANE' | 'DIVINE' | 'PRIMAL' | 'OCCULT';
      dc?: number;
      attackBonus?: number;
      spells: {
        name: string;
        rank: number;
        castsPerDay?: 'AT-WILL' | 'CONSTANT' | number;
        notes?: string;
      }[];
      cantripsHeighteningRank: 1 | number;
    };
    focus?: {
      type: string; // normal, domain, order, hex, etc.
      dc?: number;
      attackBonus?: number;
      focusPoints: 1 | number;
      spells: {
        name: string;
        rank: number;
        notes?: string;
      }[];
      cantripsHeighteningRank: 1 | number;
    };
    spontaneous?: {
      tradition: 'ARCANE' | 'DIVINE' | 'PRIMAL' | 'OCCULT';
      dc?: number;
      attackBonus?: number;
      slots: {
        rank: number;
        amount: number;
      }[];
      spells: {
        name: string;
        rank: number;
        notes?: string;
      }[];
      cantripsHeighteningRank: 1 | number;
    };
    prepared?: {
      tradition: 'ARCANE' | 'DIVINE' | 'PRIMAL' | 'OCCULT';
      dc?: number;
      attackBonus?: number;
      spells: {
        name: string;
        rank: number;
        amount: 1 | number;
        notes?: string;
      }[];
      cantripsHeighteningRank: 1 | number;
    };
    rituals?: {
      dc?: number;
      attackBonus?: number;
      spells: {
        name: string;
        rank: number;
        notes?: string;
      }[];
    };
  };
  description?: string;
}

---

Okay, I'm first going to give you an example of an input stat block and the output JSON, then I'll give you the actual stat block that I need you to parse.
### Example Input stat block:

Grim Reaper
Creature 21
Unique Medium Humanoid Undead Unholy 
Source Monster Core pg. 184 1.1
Perception +41; darkvision, see the unseen, status sight, truesight
Languages Common, Necril
Skills Acrobatics +43, Athletics +38, Deception +40, Intimidation +43, Religion +39, Society +36, Stealth +43
Str +8, Dex +10, Con +8, Int +5, Wis +7, Cha +8
Status Sight The Grim Reaper automatically knows the Hit Points, conditions, afflictions, and emotions of all creatures it can see.
Items scythe
AC 47; Fort +37, Ref +41, Will +38; +1 status to all saves vs. magic
HP 320; Immunities bleed, death effects, disease, paralyzed, poison, unconscious; Resistances all damage 15
Aura of Misfortune (aura, divine, misfortune) Within 20 feet. Living creatures in the aura must roll twice on all d20 rolls and use the lower result.
Death's Grace The Grim Reaper can choose whether or not it counts as undead for effects that affect undead differently. Even if it does not count as undead, the Grim Reaper still never counts as a living creature.
Void Healing The Grim Reaper can choose whether or not it takes vitality damage.
Lurking Death [reaction] (divine, teleportation) Trigger A creature within 100 feet makes a ranged attack or uses an action that has the concentrate, manipulate, or move trait; Effect The Grim Reaper teleports to a square adjacent to the triggering creature and makes a melee Strike against it. If the Strike hits, the Grim Reaper disrupts the triggering action.
Speed 50 feet, fly 75 feet
Melee [one-action] keen scythe +40 [+36/+32] (agile, deadly 3d10, magical, reach 10 feet, trip), Damage 4d10+23 slashing plus death strike and energy drain
Ranged [one-action] crossbow +36 [+31/+26] (magical, range increment 120 feet, reload 1), Damage 1d8+30 piercing
Divine Innate Spells DC 47, attack +37; 10th execute (×4); 7th interplanar teleport; Constant (6th) truesight; (3rd) haste; (2nd) see the unseen
Primal Spontaneous Spells DC 46; 1st fleet step, heal, pummeling rubble, runic weapon (4 slots); Cantrips (10th) caustic blast, detect magic, figment, know the way, tangle vine
Death Strike (death) A creature critically hit by any of the Grim Reaper's attacks or that critically fails against any of its spells must succeed at a DC 47 Fortitude save or die.
Energy Drain When the Grim Reaper hits and deals damage with its scythe, it regains 20 Hit Points, and the target must succeed at a DC 43 Fortitude save or become doomed 1. If the target is already doomed, the doomed value increases by 1 (to a maximum of doomed 3).
Final Death A creature killed by the Grim Reaper can't be brought back to life by any means short of divine intervention.
Infuse Weapon (divine) Any scythe gains the agile trait, can't be disarmed, and becomes a +3 major striking keen scythe while the Grim Reaper wields it. If the Grim Reaper Strikes a creature with a weakness to any specific type of damage, the scythe's damage counts as that type of damage, in addition to slashing.
Inspiring Display [one-action] (auditory, emotion, linguistic, mental) Requirements The Grim Reaper's previous action was to Cast a Spell; Effect The Grim Reaper uses their magical display to inspire another undead within 30 feet. That undead gains 4 temporary Hit Points that last until the start of the Grim Reaper's next turn.


### Example Output:
{
    "name": "Grim Reaper",
    "level": 21,
    "size": "MEDIUM",
    "rarity": "UNIQUE",
    "traits": [
        "Humanoid",
        "Undead",
        "Unholy"
    ],
    "perception": {
        "value": 41,
        "senses": [
            {
                "name": "darkvision"
            },
            {
                "name": "see the unseen"
            },
            {
                "name": "status sight"
            },
            {
                "name": "truesight"
            }
        ]
    },
    "languages": {
        "value": [
            "Common",
            "Necril"
        ]
    },
    "skills": [
        {
            "name": "Acrobatics",
            "bonus": 43
        },
        {
            "name": "Athletics",
            "bonus": 38
        },
        {
            "name": "Deception",
            "bonus": 40
        },
        {
            "name": "Intimidation",
            "bonus": 43
        },
        {
            "name": "Religion",
            "bonus": 39
        },
        {
            "name": "Society",
            "bonus": 36
        },
        {
            "name": "Stealth",
            "bonus": 43
        }
    ],
    "attributes": [
        {
            "name": "Str",
            "value": 8
        },
        {
            "name": "Dex",
            "value": 10
        },
        {
            "name": "Con",
            "value": 8
        },
        {
            "name": "Int",
            "value": 5
        },
        {
            "name": "Wis",
            "value": 7
        },
        {
            "name": "Cha",
            "value": 8
        }
    ],
    "items": [
        {
            "name": "scythe",
            "quantity": 1
        }
    ],
    "speeds": [
        {
            "name": "Normal",
            "value": 50
        },
        {
            "name": "Fly",
            "value": 75
        }
    ],
    "resistances": [
        {
            "type": "all damage",
            "value": 15
        }
    ],
    "immunities": [
        {
            "type": "bleed"
        },
        {
            "type": "death effects"
        },
        {
            "type": "disease"
        },
        {
            "type": "paralyzed"
        },
        {
            "type": "poison"
        },
        {
            "type": "unconscious"
        }
    ],
    "ac": {
        "value": 47
    },
    "saves": {
        "fort": {
            "value": 37
        },
        "ref": {
            "value": 41
        },
        "will": {
            "value": 38
        },
        "generalNotes": "+1 status to all saves vs. magic"
    },
    "hp": {
        "value": 320
    },
    "abilities": [
        {
            "name": "Status Sight",
            "description": "The Grim Reaper automatically knows the Hit Points, conditions, afflictions, and emotions of all creatures it can see."
        },
        {
            "name": "Aura of Misfortune",
            "traits": [
                "aura",
                "divine",
                "misfortune"
            ],
            "description": "Within 20 feet. Living creatures in the aura must roll twice on all d20 rolls and use the lower result."
        },
        {
            "name": "Death's Grace",
            "description": "The Grim Reaper can choose whether or not it counts as undead for effects that affect undead differently. Even if it does not count as undead, the Grim Reaper still never counts as a living creature."
        },
        {
            "name": "Void Healing",
            "description": "The Grim Reaper can choose whether or not it takes vitality damage."
        },
        {
            "name": "Lurking Death",
            "action": "REACTION",
            "traits": [
                "divine",
                "teleportation"
            ],
            "trigger": "A creature within 100 feet makes a ranged attack or uses an action that has the concentrate, manipulate, or move trait",
            "description": "The Grim Reaper teleports to a square adjacent to the triggering creature and makes a melee Strike against it. If the Strike hits, the Grim Reaper disrupts the triggering action."
        },
        {
            "name": "Death Strike",
            "traits": [
                "death"
            ],
            "description": "A creature critically hit by any of the Grim Reaper's attacks or that critically fails against any of its spells must succeed at a DC 47 Fortitude save or die."
        },
        {
            "name": "Energy Drain",
            "description": "When the Grim Reaper hits and deals damage with its scythe, it regains 20 Hit Points, and the target must succeed at a DC 43 Fortitude save or become doomed 1. If the target is already doomed, the doomed value increases by 1 (to a maximum of doomed 3)."
        },
        {
            "name": "Final Death",
            "description": "A creature killed by the Grim Reaper can't be brought back to life by any means short of divine intervention."
        },
        {
            "name": "Infuse Weapon",
            "traits": [
                "divine"
            ],
            "description": "Any scythe gains the agile trait, can't be disarmed, and becomes a +3 major striking keen scythe while the Grim Reaper wields it. If the Grim Reaper Strikes a creature with a weakness to any specific type of damage, the scythe's damage counts as that type of damage, in addition to slashing."
        },
        {
            "name": "Inspiring Display",
            "action": "ONE-ACTION",
            "traits": [
                "auditory",
                "emotion",
                "linguistic",
                "mental"
            ],
            "requirements": "The Grim Reaper's previous action was to Cast a Spell",
            "description": "The Grim Reaper uses their magical display to inspire another undead within 30 feet. That undead gains 4 temporary Hit Points that last until the start of the Grim Reaper's next turn."
        }
    ],
    "attacks": [
        {
            "attackType": "melee",
            "action": "ONE-ACTION",
            "name": "keen scythe",
            "attackBonus": {
                "attack1st": 40,
                "attack2nd": 36,
                "attack3rd": 32
            },
            "traits": [
                "agile",
                "deadly 3d10",
                "magical",
                "reach 10 feet",
                "trip"
            ],
            "damage": {
                "amountOfDice": 4,
                "dieType": "d10",
                "damageBonus": 23,
                "damageType": "slashing",
                "extraEffects": [
                    "death strike",
                    "energy drain"
                ]
            }
        },
        {
            "attackType": "ranged",
            "action": "ONE-ACTION",
            "name": "crossbow",
            "attackBonus": {
                "attack1st": 36,
                "attack2nd": 31,
                "attack3rd": 26
            },
            "traits": [
                "magical"
            ],
            "damage": {
                "amountOfDice": 1,
                "dieType": "d8",
                "damageBonus": 30,
                "damageType": "piercing"
            },
            "misc": {
                "range": 120,
                "reload": 1
            }
        }
    ],
    "spellcasting": {
        "innate": {
            "tradition": "DIVINE",
            "dc": 47,
            "attackBonus": 37,
            "spells": [
                {
                    "name": "execute",
                    "rank": 10,
                    "castsPerDay": 4
                },
                {
                    "name": "interplanar teleport",
                    "rank": 7
                },
                {
                    "name": "truesight",
                    "rank": 6,
                    "castsPerDay": "CONSTANT"
                },
                {
                    "name": "haste",
                    "rank": 3
                },
                {
                    "name": "see the unseen",
                    "rank": 2
                }
            ],
            "cantripsHeighteningRank": 10
        },
        "spontaneous": {
            "tradition": "PRIMAL",
            "dc": 46,
            "slots": [
                {
                    "rank": 1,
                    "amount": 4
                }
            ],
            "spells": [
                {
                    "name": "fleet step",
                    "rank": 1
                },
                {
                    "name": "heal",
                    "rank": 1
                },
                {
                    "name": "pummeling rubble",
                    "rank": 1
                },
                {
                    "name": "runic weapon",
                    "rank": 1
                },
                {
                    "name": "caustic blast",
                    "rank": 0
                },
                {
                    "name": "detect magic",
                    "rank": 0
                },
                {
                    "name": "figment",
                    "rank": 0
                },
                {
                    "name": "know the way",
                    "rank": 0
                },
                {
                    "name": "tangle vine",
                    "rank": 0
                }
            ],
            "cantripsHeighteningRank": 10
        }
    }
}

---
Now it's your turn:


### Input stat block:

${text}


Note: Use markdown to format your output. Only return the JSON object with the information filled in. DO NOT INCLUDE \`\`\`json\`\`\` in your response.

### Output:`.trim();

  const result = (await generateCompletion(prompt)) ?? '';

  try {
    const r = yaml.load(result ?? '') as GranularCreature;
    return r;
  } catch (e) {
    console.warn('Failed to parse response', e);
    return null;
  }
}
