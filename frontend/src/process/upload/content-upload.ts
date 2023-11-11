import { FileWithPath } from '@mantine/dropzone';
import { AbilityBlock, Background, ContentSource, Item, Spell } from '@typing/content';
import {
  EQUIPMENT_TYPES,
  convertToActionCost,
  convertToRarity,
  convertToSize,
  extractFromDescription,
  findContentSource,
  getTraitIds,
} from './foundry-utils';
import _ from 'lodash';
import { uploadCreatureHandler } from './creature-import';
import { throwError } from '@utils/notifications';
import { upsertAbilityBlock, upsertSpell, upsertItem, upsertCreature, upsertBackground } from '@content/content-creation';
import { toText, toMarkdown } from '@content/content-utils';

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

export async function uploadContentList(type: string, files: FileWithPath[]) {
  resetUploadStats();

  uploadStats.total = files.length;

  for (let file of files) {
    await uploadContent(type, file);
  }

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

async function uploadContent(type: string, file: FileWithPath) {
  const jsonUrl = URL.createObjectURL(file);

  const res = await fetch(jsonUrl);
  const json = await res.json();

  const foundryId = (json.system?.source?.value || json.system?.details?.source?.value) as string;
  const source = await findContentSource(undefined, foundryId);
  if (!source) {
    // Increase missing source count
    uploadStats.missingSources.set(foundryId, (uploadStats.missingSources.get(foundryId) ?? 0) + 1);
    return false;
  }

  let success = false;
  if (type === 'action') {
    success = await uploadAction(source, json);
  } else if (type === 'feat') {
    success = await uploadFeat(source, json);
  } else if (type === 'class-feature') {
    success = await uploadClassFeature(source, json);
  } else if (type === 'spell') {
    success = await uploadSpell(source, json);
  } else if (type === 'item') {
    success = await uploadItem(source, json);
  } else if (type === 'creature') {
    success = await uploadCreature(source, json);
  } else if (type === 'heritage') {
    success = await uploadHeritage(source, json);
  } else if (type === 'background') {
    success = await uploadBackground(source, json);
  }

  if (success) {
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

  return success;
}

async function uploadAction(source: ContentSource, json: Record<string, any>) {
  if (json.type !== 'action') {
    if (DEBUG) {
      console.error(`Not an action, it's a "${json.type}"!`);
    }
    return false;
  }

  const descValues = extractFromDescription(json.system?.description?.value);

  const action = {
    id: -1,
    created_at: '',
    name: toText(json.name) ?? '',
    actions: convertToActionCost(json.system?.actionType?.value, json.system?.actions?.value),
    rarity: convertToRarity(json.system?.traits?.rarity),
    frequency: toText(json.system?.frequency),
    trigger: descValues?.trigger || toText(json.system?.trigger?.value),
    requirements: toText(descValues?.requirements),
    access: toText(json.access),
    description: toMarkdown(descValues.description) ?? '',
    type: 'action',
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
  return true;
}

async function uploadFeat(source: ContentSource, json: Record<string, any>) {
  if (json.type === 'feat' && json.system?.category !== 'classfeature') {} else {
    if (DEBUG) {
      console.error(`Not a feat, it's a "${json.type}"!`);
    }
    return false;
  }

  const descValues = extractFromDescription(json.system?.description?.value);
  const prerequisites =
    json.system?.prerequisites?.value?.map((prereq: { value: string }) => toText(prereq.value)) ??
    undefined;

  const action = {
    id: -1,
    created_at: '',
    name: toText(json.name) ?? '',
    actions: convertToActionCost(json.system?.actionType?.value, json.system?.actions?.value),
    level: json.system?.level?.value,
    rarity: convertToRarity(json.system?.traits?.rarity),
    frequency: toText(json.system?.frequency),
    trigger: descValues?.trigger || toText(json.system?.trigger?.value),
    requirements: toText(descValues?.requirements),
    access: toText(json.access),
    description: toMarkdown(descValues.description) ?? '',
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
  return true;
}

async function uploadClassFeature(source: ContentSource, json: Record<string, any>) {
  if (json.type === 'feat' && json.system?.category === 'classfeature') {} else {
    if (DEBUG) {
      console.error(`Not a class feature, it's a "${json.type}"!`);
    }
    return false;
  }

  const descValues = extractFromDescription(json.system?.description?.value);

  const action = {
    id: -1,
    created_at: '',
    name: toText(json.name) ?? '',
    actions: convertToActionCost(json.system?.actionType?.value, json.system?.actions?.value),
    level: json.system?.level?.value,
    rarity: convertToRarity(json.system?.traits?.rarity),
    frequency: toText(json.system?.frequency),
    trigger: descValues?.trigger || toText(json.system?.trigger?.value),
    requirements: toText(descValues?.requirements),
    access: toText(json.access),
    description: toMarkdown(descValues.description) ?? '',
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
  return true;
}

async function uploadSpell(source: ContentSource, json: Record<string, any>) {
  if (json.type !== 'spell') {
    if (DEBUG) {
      console.error(`Not a spell, it's a "${json.type}"!`);
    }
    return false;
  }

  const descValues = extractFromDescription(json.system?.description?.value);

  const spell = {
    id: -1,
    created_at: '',
    name: toText(json.name) ?? '',
    rank: json.system?.level?.value,
    traditions: json.system?.traditions?.value,
    rarity: convertToRarity(json.system?.traits?.rarity),
    cast: json.system?.time?.value,
    traits: await getTraitIds(json.system?.traits?.value ?? [], source),
    defenses: json.system?.save?.value,
    cost: json.system?.cost?.value,
    trigger: descValues?.trigger || toText(json.system?.trigger?.value),
    requirements: toText(descValues?.requirements),
    range: json.system?.range?.value,
    area:
      descValues?.area ||
      (json.system?.area && `${json.system?.area?.value}-foot ${json.system?.area?.type}`),
    targets: json.system?.target?.value,
    duration: json.system?.duration?.value,
    description: toMarkdown(descValues.description) ?? '',
    heightened: json.system?.heightening,
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
  return true;
}

async function uploadItem(source: ContentSource, json: Record<string, any>) {
  if (!EQUIPMENT_TYPES.includes(json.type)) {
    if (DEBUG) {
      console.error(`Not an item, it's a "${json.type}"!`);
    }
    return false;
  }

  const descValues = extractFromDescription(json.system?.description?.value);

  const item = {
    id: -1,
    created_at: '',
    name: toText(json.name) ?? '',
    level: json.system?.level?.value,
    price: json.system?.price?.value,
    rarity: convertToRarity(json.system?.traits?.rarity),
    bulk: json.system?.weight?.value,
    traits: await getTraitIds(json.system?.traits?.value ?? [], source),
    type: (json.system?.consumableType?.value || json.system?.group) ?? '',
    hands: undefined,
    size: convertToSize(json.system?.size?.value),
    craft_requirements: toText(descValues?.craft_requirements),
    usage: json.system?.usage?.value,
    description: toMarkdown(descValues.description) ?? '',
    meta_data: {
      base_item: json.system?.baseItem,
      category: json.system?.category,
      damage: json.system?.damage,
      bulk_equipped: json.system?.equippedBulk?.value,
      bulk_negate: json.system?.negateBulk?.value,
      group: json.system?.group,
      hardness: json.system?.hardness,
      hp: json.system?.hp?.value,
      hp_max: json.system?.hp?.max ?? 0,
      broken_threshold: parseInt(json.system?.hp?.max ?? 0) / 2,
      quantity: json.system?.quantity,
      material: json.system?.material,
      range: json.system?.range,
      reload: json.system?.reload?.value,
      runes: {
        potency_amount: json.system?.potencyRune?.value,
        striking_type: json.system?.strikingRune?.value,
        property_1: json.system?.propertyRune1?.value,
        property_2: json.system?.propertyRune2?.value,
        property_3: json.system?.propertyRune3?.value,
        property_4: json.system?.propertyRune4?.value,
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
  return true;
}

async function uploadCreature(source: ContentSource, json: Record<string, any>) {
  if (json.type !== 'npc') {
    if (DEBUG) {
      console.error(`Not a creature, it's a "${json.type}"!`);
    }
    return false;
  }

  try {
    const creature = await uploadCreatureHandler(source, json);
    console.log(creature);

    const createdCreature = await upsertCreature(creature);
    if (DEBUG) {
      console.log('Created Creature:');
      console.log(createdCreature);
    }
    return true;
  } catch (e) {
    console.log(e);
    if (typeof e === 'string') {
      throwError(e);
    } else if (e instanceof Error) {
      throwError(e.message);
    }
    return false;
  }
}


async function uploadHeritage(source: ContentSource, json: Record<string, any>) {
  if (json.type !== 'heritage') {
    if (DEBUG) {
      console.error(`Not a heritage, it's a "${json.type}"!`);
    }
    return false;
  }

  const descValues = extractFromDescription(json.system?.description?.value);

  const heritage = {
    id: -1,
    created_at: '',
    name: toText(json.name) ?? '',
    level: -1,
    actions: null,
    rarity: convertToRarity(json.system?.traits?.rarity),
    requirements: toText(descValues?.requirements),
    access: toText(json.access),
    description: toMarkdown(descValues.description) ?? '',
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
    heritage.traits = heritage.traits.concat(await getTraitIds([json.system.ancestry.name], source));
  }

  const createdHeritage = await upsertAbilityBlock(heritage);
  if (DEBUG) {
    console.log('Created Heritage:');
    console.log(createdHeritage);
  }
  return true;
}


async function uploadBackground(source: ContentSource, json: Record<string, any>) {
  if (json.type !== 'background') {
    if (DEBUG) {
      console.error(`Not a background, it's a "${json.type}"!`);
    }
    return false;
  }

  const descValues = extractFromDescription(json.system?.description?.value);

  const background = {
    id: -1,
    created_at: '',
    name: toText(json.name) ?? '',
    rarity: convertToRarity(json.system?.traits?.rarity),
    description: toMarkdown(descValues.description) ?? '',
    operations: [],
    content_source_id: source.id,
    version: '1.0',
  } satisfies Background;

  const createdBackground = await upsertBackground(background);
  if (DEBUG) {
    console.log('Created Background:');
    console.log(createdBackground);
  }
  return true;
}
