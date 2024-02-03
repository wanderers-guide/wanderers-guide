import { FileWithPath } from '@mantine/dropzone';
import {
  AbilityBlock,
  AbilityBlockType,
  Background,
  ContentSource,
  ContentType,
  Item,
  Spell,
} from '@typing/content';
import {
  EQUIPMENT_TYPES,
  convertToActionCost,
  convertToRarity,
  convertToSize,
  extractFromDescription,
  findContentSource,
  getTraitIds,
  stripFoundryLinking,
} from './foundry-utils';
import _ from 'lodash';
import { uploadCreatureHandler } from './creature-import';
import { throwError } from '@utils/notifications';
import {
  upsertAbilityBlock,
  upsertSpell,
  upsertItem,
  upsertCreature,
  upsertBackground,
} from '@content/content-creation';
import { toText, toMarkdown, convertToContentType } from '@content/content-utils';
import { classifySkillForAction } from '@ai/open-ai-handler';
import { UploadResult } from '@typing/index';
import { populateContent } from '@ai/vector-db/vector-manager';
import { hideNotification, showNotification } from '@mantine/notifications';
import { pluralize, toLabel } from '@utils/strings';
import { performAutoContentLinking } from './auto-content-linking';
import { convertCastToActionCost } from '@utils/actions';

// https://raw.githubusercontent.com/foundryvtt/pf2e/master/static/icons/equipment/adventuring-gear/alchemists-lab.webp
// systems/pf2e/icons/features/ancestry/aasimar.webp -> https://raw.githubusercontent.com/foundryvtt/pf2e/master/static/icons/features/ancestry/aasimar.webp

const DEBUG = false;

let uploadStats: {
  total: number;
  missingSources: Map<string, number>;
  uploads: Map<string, Map<string, number>>;
  failedUploads: Map<string, Map<string, number>>;
} = emptyUploadStats();
function emptyUploadStats() {
  return {
    total: 0,
    missingSources: new Map<string, number>(),
    uploads: new Map<string, Map<string, number>>(),
    failedUploads: new Map<string, Map<string, number>>(),
  };
}
export function getUploadStats() {
  return _.cloneDeep(uploadStats);
}
export function resetUploadStats() {
  uploadStats = emptyUploadStats();
}

export async function uploadContentList(
  type: ContentType | AbilityBlockType,
  files: FileWithPath[]
) {
  resetUploadStats();

  uploadStats.total = files.length;

  const addedIds = new Set<number>();
  for (let file of files) {
    const result = await uploadContent(type, file);
    if (result.success && result.id) {
      addedIds.add(result.id);
    }
  }

  // Generate embeddings for the added content
  showNotification({
    id: 'generate-embeddings',
    title: `Generating embeddings...`,
    message: `This may take a couple seconds, please wait.`,
    autoClose: false,
  });
  const result = await populateContent(convertToContentType(type), [...addedIds]);
  hideNotification('generate-embeddings');
  showNotification({
    id: 'generate-embeddings',
    title: `Successfully Generated Embeddings`,
    message: `Generated ${result.total} embeddings for ${pluralize(toLabel(type))}.`,
    autoClose: 6000,
  });

  console.log('-------- UPLOAD STATS --------');
  console.group('Successful Uploads:');
  for (let [type, sources] of uploadStats.uploads) {
    console.group(type);
    console.table(Object.fromEntries(sources));
    console.groupEnd();
  }
  console.groupEnd();

  console.group('Failed Uploads:');
  for (let [type, sources] of uploadStats.failedUploads) {
    console.group(type);
    console.table(Object.fromEntries(sources));
    console.groupEnd();
  }
  console.groupEnd();

  console.group('Missing Sources:');
  console.table(Object.fromEntries(uploadStats.missingSources));
  console.groupEnd();
}

async function uploadContent(type: string, file: FileWithPath): Promise<UploadResult> {
  const jsonUrl = URL.createObjectURL(file);

  const res = await fetch(jsonUrl);
  const json = (await res.json()) as Record<string, any>;

  const foundryId = (json.system?.publication?.title ||
    json.system?.source?.value ||
    json.system?.details?.source?.value) as string;
  const remaster = json.system?.publication?.remaster;
  const source = await findContentSource(undefined, foundryId);
  if (!source || !remaster) {
    // Increase missing source count
    uploadStats.missingSources.set(foundryId, (uploadStats.missingSources.get(foundryId) ?? 0) + 1);
    return {
      success: false,
    };
  }

  let result;
  if (type === 'action') {
    result = await uploadAction(source, json);
  } else if (type === 'feat') {
    result = await uploadFeat(source, json);
  } else if (type === 'class-feature') {
    result = await uploadClassFeature(source, json);
  } else if (type === 'spell') {
    result = await uploadSpell(source, json);
  } else if (type === 'item') {
    result = await uploadItem(source, json);
  } else if (type === 'creature') {
    result = await uploadCreature(source, json);
  } else if (type === 'heritage') {
    result = await uploadHeritage(source, json);
  } else if (type === 'background') {
    result = await uploadBackground(source, json);
  } else {
    console.error(`Unknown type: ${type}`);
    result = {
      success: false,
    };
  }

  if (result?.success) {
    // Increase upload count
    if (!uploadStats.uploads.has(type)) {
      uploadStats.uploads.set(type, new Map<string, number>());
    }
    uploadStats.uploads
      .get(type)!
      .set(foundryId, (uploadStats.uploads.get(type)!.get(foundryId) ?? 0) + 1);
  } else {
    if (DEBUG) {
      console.error(`Failed to upload ${type} from ${foundryId}`);
    }
    // Increase failed upload count
    if (!uploadStats.failedUploads.has(type)) {
      uploadStats.failedUploads.set(type, new Map<string, number>());
    }
    uploadStats.failedUploads
      .get(type)!
      .set(foundryId, (uploadStats.failedUploads.get(type)!.get(foundryId) ?? 0) + 1);
  }
  if (DEBUG) {
    console.log(json);
  }

  return result;
}

async function uploadAction(
  source: ContentSource,
  json: Record<string, any>
): Promise<UploadResult> {
  if (json.type !== 'action') {
    if (DEBUG) {
      console.error(`Not an action, it's a "${json.type}"!`);
    }
    return {
      success: false,
    };
  }

  const descValues = extractFromDescription(stripFoundryLinking(json.system?.description?.value));
  const description = await performAutoContentLinking(descValues.description);

  // Classify the skill for skill actions
  // - Kinda an overkill to do this just for the actions
  //   but it's a good test for using AI to curate our data
  const isSkillAction = (json.system?.traits?.value ?? []).includes('skill');
  let skill: string | null = null;
  if (isSkillAction) {
    skill = await classifySkillForAction(toMarkdown(descValues.description) ?? '');
    console.log(`Classified skill for action: ${toText(json.name)}, ${skill}`);
  }

  const action = {
    id: -1,
    created_at: '',
    name: toText(json.name) ?? '',
    actions: convertToActionCost(json.system?.actionType?.value, json.system?.actions?.value),
    rarity: convertToRarity(json.system?.traits?.rarity),
    frequency: toText(descValues.frequency),
    trigger: descValues?.trigger || toText(json.system?.trigger?.value),
    requirements: toText(descValues?.requirements),
    access: toText(json.access),
    description: toMarkdown(description) ?? '',
    special: toMarkdown(descValues.special),
    type: 'action',
    meta_data: {
      skill: skill ?? undefined,
      foundry: {
        rules: json.system?.rules,
        tags: json.system?.traits?.otherTags,
      },
    },
    traits: await getTraitIds(json.system?.traits?.value ?? [], source),
    content_source_id: source.id,
    version: '1.0',
  } satisfies AbilityBlock;

  const abilityBlock = await upsertAbilityBlock(action);
  if (DEBUG) {
    console.log('Created Ability Block:');
    console.log(abilityBlock);
  }
  return {
    success: !!abilityBlock,
    id: abilityBlock?.id,
  };
}

async function uploadFeat(source: ContentSource, json: Record<string, any>): Promise<UploadResult> {
  if (json.type === 'feat' && json.system?.category !== 'classfeature') {
  } else {
    if (DEBUG) {
      console.error(`Not a feat, it's a "${json.type}"!`);
    }
    return {
      success: false,
    };
  }

  const descValues = extractFromDescription(
    stripFoundryLinking(json.system?.description?.value, json.system?.level?.value)
  );
  const prerequisites =
    json.system?.prerequisites?.value?.map((prereq: { value: string }) => toText(prereq.value)) ??
    undefined;
  const description = await performAutoContentLinking(descValues.description);

  const action = {
    id: -1,
    created_at: '',
    name: toText(json.name) ?? '',
    actions: convertToActionCost(json.system?.actionType?.value, json.system?.actions?.value),
    level: json.system?.level?.value,
    rarity: convertToRarity(json.system?.traits?.rarity),
    frequency: toText(descValues.frequency),
    trigger: descValues?.trigger || toText(json.system?.trigger?.value),
    requirements: toText(descValues?.requirements),
    access: toText(json.access),
    description: toMarkdown(description) ?? '',
    special: toMarkdown(descValues.special),
    prerequisites: prerequisites,
    type: 'feat',
    meta_data: {
      foundry: {
        rules: json.system?.rules,
        tags: json.system?.traits?.otherTags,
      },
    },
    traits: await getTraitIds(json.system?.traits?.value ?? [], source),
    content_source_id: source.id,
    version: '1.0',
  } satisfies AbilityBlock;

  const abilityBlock = await upsertAbilityBlock(action);
  if (DEBUG) {
    console.log('Created Ability Block:');
    console.log(abilityBlock);
  }
  return {
    success: !!abilityBlock,
    id: abilityBlock?.id,
  };
}

async function uploadClassFeature(
  source: ContentSource,
  json: Record<string, any>
): Promise<UploadResult> {
  if (json.type === 'feat' && json.system?.category === 'classfeature') {
  } else {
    if (DEBUG) {
      console.error(`Not a class feature, it's a "${json.type}"!`);
    }
    return {
      success: false,
    };
  }

  const descValues = extractFromDescription(stripFoundryLinking(json.system?.description?.value));
  const description = await performAutoContentLinking(descValues.description);

  const action = {
    id: -1,
    created_at: '',
    name: toText(json.name) ?? '',
    actions: convertToActionCost(json.system?.actionType?.value, json.system?.actions?.value),
    level: json.system?.level?.value,
    rarity: convertToRarity(json.system?.traits?.rarity),
    frequency: toText(descValues.frequency),
    trigger: descValues?.trigger || toText(json.system?.trigger?.value),
    requirements: toText(descValues?.requirements),
    access: toText(json.access),
    description: toMarkdown(description) ?? '',
    special: toMarkdown(descValues.special),
    type: 'class-feature',
    meta_data: {
      foundry: {
        rules: json.system?.rules,
        tags: json.system?.traits?.otherTags,
      },
    },
    traits: await getTraitIds(json.system?.traits?.value ?? [], source),
    content_source_id: source.id,
    version: '1.0',
  } satisfies AbilityBlock;

  const abilityBlock = await upsertAbilityBlock(action);
  if (DEBUG) {
    console.log('Created Ability Block:');
    console.log(abilityBlock);
  }
  return {
    success: !!abilityBlock,
    id: abilityBlock?.id,
  };
}

async function uploadSpell(
  source: ContentSource,
  json: Record<string, any>
): Promise<UploadResult> {
  if (json.type !== 'spell') {
    if (DEBUG) {
      console.error(`Not a spell, it's a "${json.type}"!`);
    }
    return {
      success: false,
    };
  }

  const descValues = extractFromDescription(
    stripFoundryLinking(json.system?.description?.value, json.system?.level?.value)
  );
  const description = await performAutoContentLinking(descValues.description);

  const spell = {
    id: -1,
    created_at: '',
    name: toText(json.name) ?? '',
    rank: json.system?.level?.value,
    traditions: json.system?.traditions?.value,
    rarity: convertToRarity(json.system?.traits?.rarity),
    cast: convertCastToActionCost(json.system?.time?.value ?? ''),
    traits: await getTraitIds(json.system?.traits?.value ?? [], source),
    defense: json.system?.save?.value,
    cost: json.system?.cost?.value,
    trigger: descValues?.trigger || toText(json.system?.trigger?.value),
    requirements: toText(descValues?.requirements) || json.system?.materials?.value,
    range: json.system?.range?.value,
    area:
      descValues?.area ||
      (json.system?.area && `${json.system?.area?.value}-foot ${json.system?.area?.type}`),
    targets: json.system?.target?.value,
    duration: json.system?.duration?.value,
    description: toMarkdown(description) ?? '',
    heightened: {
      text: descValues.heightened as unknown as {
        amount: string;
        text: string;
      }[], // actually a list of objects 😈
      data: json.system?.heightening,
    },
    meta_data: {
      damage: Object.values(json.system?.damage?.value ?? {}),
      type: json.system?.spellType?.value,
      foundry: {
        rules: json.system?.rules,
        tags: json.system?.traits?.otherTags,
        components: json.system?.components,
        attribute: json.system?.ability?.value,
        materials: json.system?.materials?.value,
        is_focus: json.system?.category?.value === 'focus',
        is_sustained: json.system?.sustained?.value,
        has_counteract_check: json.system?.hasCounteractCheck?.value,
        custom_tradition: json.system?.traditions?.custom,
      },
    },
    content_source_id: source.id,
    version: '1.0',
  } satisfies Spell;

  const createdSpell = await upsertSpell(spell);
  if (DEBUG) {
    console.log('Created Spell:');
    console.log(createdSpell);
  }
  return {
    success: !!createdSpell,
    id: createdSpell?.id,
  };
}

async function uploadItem(source: ContentSource, json: Record<string, any>): Promise<UploadResult> {
  if (!EQUIPMENT_TYPES.includes(json.type)) {
    if (DEBUG) {
      console.error(`Not an item, it's a "${json.type}"!`);
    }
    return {
      success: false,
    };
  }

  const descValues = extractFromDescription(
    stripFoundryLinking(json.system?.description?.value, json.system?.level?.value)
  );
  const description = await performAutoContentLinking(descValues.description);

  const item = {
    id: -1,
    created_at: '',
    name: toText(json.name) ?? '',
    level: json.system?.level?.value,
    price: json.system?.price?.value,
    rarity: convertToRarity(json.system?.traits?.rarity),
    bulk: json.system?.bulk?.value,
    traits: await getTraitIds(json.system?.traits?.value ?? [], source),
    group: ((json.system?.group || json.system?.category || json.type) ?? '').toUpperCase(),
    hands: undefined,
    size: convertToSize(json.system?.size?.value),
    craft_requirements: toText(descValues?.craft_requirements),
    usage: json.system?.usage?.value,
    description: toMarkdown(description) ?? '',
    meta_data: {
      base_item: json.system?.baseItem,
      category: json.system?.category,
      damage: json.system?.damage,
      ac_bonus: json.system?.acBonus,
      check_penalty: json.system?.checkPenalty,
      speed_penalty: json.system?.speedPenalty,
      dex_cap: json.system?.dexCap,
      strength: json.system?.strength,
      bulk: {
        capacity: json.system?.bulk?.capacity,
        held_or_stowed: json.system?.bulk?.heldOrStowed,
        ignored: json.system?.bulk?.ignored,
      },
      group: json.system?.group,
      hardness: json.system?.hardness,
      hp: json.system?.hp?.value,
      hp_max: json.system?.hp?.max ?? 0,
      broken_threshold: parseInt(json.system?.hp?.max ?? 0) / 2,
      quantity: json.system?.quantity,
      material: {
        type: json.system?.material?.type,
        grade: json.system?.material?.grade,
      },
      range: json.system?.range,
      reload: json.system?.reload?.value,
      runes: {
        striking: json.system?.runes?.striking,
        potency: json.system?.runes?.potency,
        property: json.system?.runes?.property,
      },
      foundry: {
        rules: json.system?.rules,
        tags: json.system?.traits?.otherTags,
        bonus: json.system?.bonus?.value,
        bonus_damage: json.system?.bonusDamage?.value,
        container_id: json.system?.containerId,
        splash_damage: json.system?.splashDamage?.value,
        stack_group: json.system?.stackGroup,
        items: Object.values(json.system?.items ?? {}),
      },
    },
    content_source_id: source.id,
    version: '1.0',
  } satisfies Item;

  const createdItem = await upsertItem(item);
  if (DEBUG) {
    console.log('Created Item:');
    console.log(createdItem);
  }
  return {
    success: !!createdItem,
    id: createdItem?.id,
  };
}

async function uploadCreature(
  source: ContentSource,
  json: Record<string, any>
): Promise<UploadResult> {
  if (json.type !== 'npc') {
    if (DEBUG) {
      console.error(`Not a creature, it's a "${json.type}"!`);
    }
    return {
      success: false,
    };
  }

  try {
    const creature = await uploadCreatureHandler(source, json);

    const createdCreature = await upsertCreature(creature);
    if (DEBUG) {
      console.log('Converted Creature:');
      console.log(creature);
      console.log('Created Creature:');
      console.log(createdCreature);
    }
    return {
      success: !!createdCreature,
      id: createdCreature?.id,
    };
  } catch (e) {
    console.log(e);
    if (typeof e === 'string') {
      throwError(e);
    } else if (e instanceof Error) {
      throwError(e.message);
    }
    return {
      success: false,
    };
  }
}

async function uploadHeritage(
  source: ContentSource,
  json: Record<string, any>
): Promise<UploadResult> {
  if (json.type !== 'heritage') {
    if (DEBUG) {
      console.error(`Not a heritage, it's a "${json.type}"!`);
    }
    return {
      success: false,
    };
  }

  const descValues = extractFromDescription(stripFoundryLinking(json.system?.description?.value));
  const description = await performAutoContentLinking(descValues.description);

  const heritage = {
    id: -1,
    created_at: '',
    name: toText(json.name) ?? '',
    level: -1,
    actions: null,
    rarity: convertToRarity(json.system?.traits?.rarity),
    requirements: toText(descValues?.requirements),
    access: toText(json.access),
    description: toMarkdown(description) ?? '',
    special: toMarkdown(descValues.special) ?? '',
    type: 'heritage',
    meta_data: {
      foundry: {
        rules: json.system?.rules,
        tags: json.system?.traits?.otherTags,
      },
    },
    traits: await getTraitIds(json.system?.traits?.value ?? [], source),
    content_source_id: source.id,
    version: '1.0',
  } satisfies AbilityBlock;

  // Add ancestry trait
  if (json.system?.ancestry?.name) {
    heritage.traits = heritage.traits.concat(
      await getTraitIds([json.system.ancestry.name], source)
    );
  }

  const createdHeritage = await upsertAbilityBlock(heritage);
  if (DEBUG) {
    console.log('Created Heritage:');
    console.log(createdHeritage);
  }
  return {
    success: !!createdHeritage,
    id: createdHeritage?.id,
  };
}

async function uploadBackground(
  source: ContentSource,
  json: Record<string, any>
): Promise<UploadResult> {
  if (json.type !== 'background') {
    if (DEBUG) {
      console.error(`Not a background, it's a "${json.type}"!`);
    }
    return {
      success: false,
    };
  }

  const descValues = extractFromDescription(stripFoundryLinking(json.system?.description?.value));
  let description = await performAutoContentLinking(descValues.description);

  // Format background description
  description = toMarkdown(description) ?? '';
  description = description.trim().replace(/\*/g, ''); // remove bolding
  description = description.replace(/^([\s\S]*?)(\n\n|$)/, '> _$1_\n\n');
  // Now it's formatted in a clean way!

  const background = {
    id: -1,
    created_at: '',
    name: toText(json.name) ?? '',
    rarity: convertToRarity(json.system?.traits?.rarity),
    description: description,
    artwork_url: '',
    operations: [],
    content_source_id: source.id,
    version: '1.0',
  } satisfies Background;

  const createdBackground = await upsertBackground(background);
  if (DEBUG) {
    console.log('Created Background:');
    console.log(createdBackground);
  }
  return {
    success: !!createdBackground,
    id: createdBackground?.id,
  };
}
