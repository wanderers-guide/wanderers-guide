import { ActionCost, ContentSource, Rarity, Size, Trait } from "@typing/content";
import _ from "lodash";
import { makeRequest } from "@requests/request-manager";
import { getAllContentSources } from "@content/content-controller";

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
    foundry_id,
  });
}


export function extractFromDescription(description?: string) {
  if (!description)
    return {
      description: "",
    };

  const pattern = /<p><strong>(Trigger|Requirements|Area|Craft Requirements)<\/strong>(.*?)<\/p>/gs;

  const output: Record<string, string> = {};
  let match;
  while ((match = pattern.exec(description)) !== null) {
    const label = match[1].trim().toLowerCase().replace(/\s/g, "_");
    const text = match[2].trim();
    output[label] = text;
  }

  output.description = description.replace(pattern, "");

  return output;
}

export const EQUIPMENT_TYPES = ['equipment', 'weapon', 'armor', 'kit', 'consumable', 'backpack', 'treasure'];