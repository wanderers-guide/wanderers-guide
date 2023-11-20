import { ActionCost, ContentSource, Rarity, Size, Trait } from "@typing/content";
import _ from "lodash";
import { makeRequest } from "@requests/request-manager";
import { getAllContentSources } from "@content/content-controller";
import * as math from 'mathjs';

export function convertToActionCost(
  actionType: string,
  actionValue?: number
): ActionCost {
  if (actionType === "action") {
    if (actionValue === 1) {
      return "ONE-ACTION";
    } else if (actionValue === 2) {
      return "TWO-ACTIONS";
    } else if (actionValue === 3) {
      return "THREE-ACTIONS";
    }
  } else if (actionType === "reaction") {
    return "REACTION";
  } else if (actionType === "free") {
    return "FREE-ACTION";
  }
  return null;
}


export function convertToRarity(value?: string): Rarity {
  if (value === "common") {
    return "COMMON";
  } else if (value === "uncommon") {
    return "UNCOMMON";
  } else if (value === "rare") {
    return "RARE";
  } else if (value === "unique") {
    return "UNIQUE";
  }
  return "COMMON";
}


export function convertToSize(value?: string): Size {
  switch (value) {
    case 'tiny':
      return 'TINY';
    case 'sm':
      return 'SMALL';
    case 'med':
      return 'MEDIUM';
    case 'lg':
      return 'LARGE';
    case 'huge':
      return 'HUGE';
    case 'grg':
      return 'GARGANTUAN';
    default:
      return (value?.toUpperCase() || 'MEDIUM') as Size;
  }
}


export async function getTraitIds(traitNames: string[], source: ContentSource) {
  const sources = await getAllContentSources();

  const traitIds: number[] = [];
  for (let traitName of traitNames) {
    let trait = await findTrait(traitName, sources);
    if (!trait) {
      await createTrait(_.startCase(traitName), '', source.id);
      trait = await findTrait(traitName, sources);
    }
    if (trait) {
      traitIds.push(trait.id);
    }
  }
  return traitIds;
}

async function findTrait(name: string, contentSources: number[]) {
  return await makeRequest<Trait>('find-trait', {
    name,
    contentSources,
  });
}

async function createTrait(
  name: string,
  description: string,
  content_source_id: number,
  meta_data?: Record<string, any>
) {
  return await makeRequest<Trait>('create-trait', {
    name,
    description,
    meta_data,
    content_source_id,
  });
}


export async function findContentSource(id?: number, foundry_id?: string) {
  return await makeRequest<ContentSource>('find-content-source', {
    id,
    foundry_id: foundry_id === 'Pathfinder Core Rulebook' ? 'Pathfinder Player Core' : foundry_id,
  });
}


export function extractFromDescription(description?: string) {
  if (!description)
    return {
      description: "",
    };

  const pattern =
    /<p><strong>(Frequency|Trigger|Requirements|Area|Craft Requirements|Special|Heightened (.*?))<\/strong>(.*?)<\/p>/gs;

  const output: Record<string, string | Record<string, string>[]> = {};
  let match;
  while ((match = pattern.exec(description)) !== null) {
    const label = match[1].trim().toLowerCase().replace(/\s/g, "_");
    const heightenedAmount = (match[2] ?? '').trim();
    const text = match[3].trim();

    if(label.startsWith('heightened')) {
      if(!output.heightened) {
        output.heightened = [];
      }
      if(!_.isString(output.heightened)) {
        output.heightened.push({
          amount: heightenedAmount,
          text: text,
        });
      }
    } else {
      output[label] = text;
    }
  }

  output.description = description.replace(pattern, "");

  return output as Record<string, string>;
}

export const EQUIPMENT_TYPES = ['equipment', 'weapon', 'armor', 'kit', 'consumable', 'backpack', 'treasure'];


//// Foundry Content Linking Parsing & Removal ////
// - Maybe save some of this data instead of deleting it all
export function stripFoundryLinking(text: string, level?: number) {
  text = text.replace(/@actor\.level/g, '1');
  if(level) {
    text = text.replace(/@item\.level/g, `${level}`);
  }

  text = stripCompendiumLinks(text);
  text = stripDamageLinks(text);
  text = stripCheckLinks(text, true);
  text = stripCheckLinks(text, false);
  text = stripDistanceLinks(text);
  text = stripMathLinks(text);

  console.log(text);

  return text;
}

function stripDamageLinks(text: string) {
  const regex = /@Damage\[([^\]]+)d(\d+)\[([^\]]+)\]\]/gm;

  let newText = text;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const formula = match[1];
    const diceType = match[2];
    const damageType = match[3];

    const result = math.evaluate(formula);

    newText = newText.replace(match[0], `${result}d${diceType} ${damageType}`);
  }

  return newText;
}

function stripMathLinks(text: string) {
  const regex = /\[\[([^\]]+?)\(([^\]]+)\)\[([^\]]+)\]\]\]/gm;

  let newText = text;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const beginning = match[1];
    const formula = match[2];
    let words = match[3];
    words = words.replace(/[, ]/g, ' ');

    let result = formula;
    try {
      result = math.evaluate(formula);
    } catch (e) {}

    newText = newText.replace(match[0], `${result} ${words}`);
  }

  return newText;
}


function stripCheckLinks(text: string, basic: boolean) {
  const regex = basic
    ? /@Check\[type:([^\]]+)\|([^\]]+)\|basic:true\]/gm
    : /@Check\[type:([^\]]+)\|([^\]]+)\|basic:false\]/gm;

  let newText = text;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const type = match[1];
    const extra = match[2];

    newText = newText.replace(match[0], `basic ${_.startCase(type)}`);
  }

  return newText;
}


function stripDistanceLinks(text: string) {
  const regex = /@Template\[type:([^\]]+)\|distance:([^\]]+)\]/gm;

  let newText = text;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const type = match[1];
    const distance = match[2];

    newText = newText.replace(match[0], `${distance}-foot ${type}`);
  }

  return newText;
}


function stripCompendiumLinks(text: string) {
  const regex = /@UUID\[Compendium\.([^\]]+)\]/gm;

  let newText = text;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const contentParts = match[1].split('.');
    const name = contentParts[contentParts.length - 1];

    // We convert them to a potential content link for further processing
    newText = newText.replace(match[0], `[[${name}]]`);
  }

  return newText;
}
