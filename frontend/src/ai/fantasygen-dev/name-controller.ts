import { Character } from "@typing/content";
import options from './name-set/options';
import { generateCompletion } from "@ai/open-ai-handler";

export async function generateNames(character: Character, amount: number): Promise<string[]> {

  const className = character.details?.class?.name;
  const ancestryName = character.details?.ancestry?.name;
  const backgroundName = character.details?.background?.name;

  let nameSet = null;
  for(const option of options) {
    if (option.title.toLowerCase() === className?.toLowerCase()) {
      nameSet = option;
      break;
    } else if (option.title.toLowerCase() === ancestryName?.toLowerCase()) {
      nameSet = option;
      break;
    }
  }
  if (!nameSet) {
    nameSet = options.find((option) => option.title.toLowerCase() === 'hero')!;
  }

  let additional = undefined;
  if(backgroundName) additional = `Background: ${backgroundName}`;

  return await _generateNames(nameSet, amount, additional);
}


async function _generateNames(nameSet: any, amount: number, extra?: string) {
  const prompt = `
    Please generate ${amount} fantasy name for something like D&D or MTG. It should be a first name and title. Please make the first name bold in markdown.

    ${nameSet.instructions}

    ${extra || ''}

    ### Examples:
    ${nameSet.data.join('\n')}
  `;

  const result = await generateCompletion(prompt);
  if (!result) return [];

  const names = result
    .split('\n')
    .map((name) => name.trim())
    .filter((name) => name.length > 0);
  return names;
}