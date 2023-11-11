import { makeRequest } from '@requests/request-manager';

export async function generateCompletion(prompt?: string) {
  if (!prompt) return null;
  const result = await makeRequest<{ status: 'SUCCESS' | 'ERROR_UNKNOWN'; content: string }>(
    'open-ai-request',
    {
      content: prompt,
      model: 'gpt-4',
    }
  );
  return result && result.status === 'SUCCESS' ? result.content : null;
}


export function classifySkillForAction(description: string) {
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
  return generateCompletion(prompt);
}
