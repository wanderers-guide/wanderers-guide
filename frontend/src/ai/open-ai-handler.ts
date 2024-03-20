import { makeRequest } from '@requests/request-manager';

export async function generateCompletion(prompt?: string) {
  if (!prompt) return null;
  const result = await makeRequest<string>('open-ai-request', {
    content: prompt.trim(),
    model: 'gpt-4',
  });
  return result;
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
  `;
  return await generateCompletion(prompt);
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
  `;
  return await generateCompletion(prompt);
}
