import { upsertAbilityBlock, upsertClass, upsertContentSource, upsertSpell } from '@content/content-creation';
import { defineDefaultSources, fetchContentAll, fetchContentSources } from '@content/content-store';
import { toMarkdown } from '@content/content-utils';
import { getFileContents } from '@import/json/import-from-json';
import { showNotification, hideNotification } from '@mantine/notifications';
import { ActionCost, ContentSource, Trait } from '@typing/content';

export async function importFromCustomPack(file: File) {
  showNotification({
    id: `importing-${file.name}`,
    title: `Importing custom pack "${file.name}"`,
    message: 'Please wait...',
    autoClose: false,
    withCloseButton: false,
    loading: true,
  });

  const contents = await getFileContents(file);
  let content = null;
  try {
    content = JSON.parse(contents);
  } catch (e) {
    hideNotification(`importing-${file.name}`);
    showNotification({
      title: 'Import failed',
      message: 'Invalid JSON file',
      color: 'red',
      icon: null,
      autoClose: false,
    });
    return;
  }

  const result = await processCustomPack(content);

  hideNotification(`importing-${file.name}`);

  return result;
}

async function processCustomPack(data: Record<string, any>): Promise<ContentSource | null> {
  console.log(data);

  const source = await upsertContentSource({
    id: -1,
    created_at: '',
    user_id: '',
    name: data.customPackName,
    foundry_id: undefined,
    url: '',
    description: '',
    operations: [],
    contact_info: '',
    group: '',
    require_key: false,
    keys: undefined,
    is_published: false,
    artwork_url: '',
    required_content_sources: [],
    meta_data: {},
  });
  if (!source) return null;

  // Define default sources
  const sources = await fetchContentSources({ ids: 'all' });
  defineDefaultSources([...sources.map((s) => s.id), source.id]);

  // Importing data
  const traitMap = new Map<string, number>();

  for (const _class of data.listCustomClasses ?? []) {
    const resultClass = await upsertClass({
      id: -1,
      created_at: '',
      name: _class.name,
      rarity: 'COMMON',
      description: toMarkdown(_class.description) ?? '',
      operations: [],
      skill_training_base: _class.numSkills,
      trait_id: -1,
      artwork_url: '',
      content_source_id: source.id,
      version: '1.0',
    });
    if (!resultClass) continue;

    // Add to trait map
    for (const mapKey of _class.listAdditionalFeatReferences) {
      traitMap.set(mapKey, resultClass.trait_id);
    }

    // Add class feats
    for (const fLvl of _class.classFeatLevels ?? []) {
      await upsertAbilityBlock({
        id: -1,
        created_at: '',
        operations: [
          {
            id: `2029b9c0-56fb-457a-8f95-f3ef4c8aa5a8-${fLvl}-${resultClass.id}`,
            type: 'select',
            data: {
              title: 'Select a Feat',
              modeType: 'FILTERED',
              optionType: 'ABILITY_BLOCK',
              optionsPredefined: [],
              optionsFilters: {
                id: `aafea893-4dfd-4ec6-9d6d-04ecf8845c47-${fLvl}-${resultClass.id}`,
                type: 'ABILITY_BLOCK',
                level: {
                  max: fLvl,
                },
                traits: [resultClass.name],
                abilityBlockType: 'feat',
              },
            },
          },
        ],
        name: `${resultClass.name} Feat`,
        actions: null,
        level: fLvl,
        rarity: 'COMMON',
        prerequisites: [],
        description: `You gain a ${resultClass.name.toLowerCase()} class feat.`,
        type: 'class-feature',
        traits: [resultClass.trait_id],
        content_source_id: source.id,
      });
    }

    // Add skill feats
    for (const fLvl of _class.skillFeatLevels ?? []) {
      await upsertAbilityBlock({
        id: -1,
        created_at: '',
        operations: [
          {
            id: `08b3cdf4-d894-465f-aa0f-94af0010b7be-${fLvl}-${resultClass.id}`,
            type: 'select',
            data: {
              title: 'Select a Feat',
              modeType: 'FILTERED',
              optionType: 'ABILITY_BLOCK',
              optionsPredefined: [],
              optionsFilters: {
                id: `7c6f4e2f-607b-4890-a99b-48721106d0c2-${fLvl}-${resultClass.id}`,
                type: 'ABILITY_BLOCK',
                level: {
                  max: fLvl,
                },
                traits: ['Skill'],
                abilityBlockType: 'feat',
              },
            },
          },
        ],
        name: `Skill Feat`,
        actions: null,
        level: fLvl,
        rarity: 'COMMON',
        prerequisites: [],
        description: `You gain a skill feat. You must be trained or better in the corresponding skill to select a skill feat.`,
        type: 'class-feature',
        traits: [resultClass.trait_id],
        content_source_id: source.id,
      });
    }

    // Add general feats
    for (const fLvl of [3, 7, 11, 15, 19]) {
      await upsertAbilityBlock({
        id: -1,
        created_at: '',
        operations: [
          {
            id: `262b4e1b-9173-49f1-b6ea-c82dd4ee3bdb-${fLvl}-${resultClass.id}`,
            type: 'select',
            data: {
              title: 'Select a Feat',
              modeType: 'FILTERED',
              optionType: 'ABILITY_BLOCK',
              optionsPredefined: [],
              optionsFilters: {
                id: `5176c508-4c33-46b2-8049-3e88647672aa-${fLvl}-${resultClass.id}`,
                type: 'ABILITY_BLOCK',
                level: {
                  max: fLvl,
                },
                traits: ['General'],
                abilityBlockType: 'feat',
              },
            },
          },
        ],
        name: `General Feat`,
        actions: null,
        level: fLvl,
        rarity: 'COMMON',
        prerequisites: [],
        description: `You gain a general feat.`,
        type: 'class-feature',
        traits: [resultClass.trait_id],
        content_source_id: source.id,
      });
    }

    // Add skill increases
    for (const fLvl of _class.skillIncreaseLevels ?? []) {
      await upsertAbilityBlock({
        id: -1,
        created_at: '',
        operations: [
          {
            id: `df3d5887-e83c-4bb7-9a30-b6892494b45c-${fLvl}-${resultClass.id}`,
            type: 'select',
            data: {
              title: 'Select a Skill to Increase',
              modeType: 'FILTERED',
              optionType: 'ADJ_VALUE',
              optionsPredefined: [],
              optionsFilters: {
                id: `42c9565e-6f57-493b-ae7d-fcc113e878da-${fLvl}-${resultClass.id}`,
                type: 'ADJ_VALUE',
                group: 'SKILL',
                value: {
                  value: '1',
                },
              },
            },
          },
        ],
        name: `Skill Increase`,
        actions: null,
        level: fLvl,
        rarity: 'COMMON',
        prerequisites: [],
        description: `You gain a skill increase.`,
        type: 'class-feature',
        traits: [resultClass.trait_id],
        content_source_id: source.id,
      });
    }

    // Add other class features
    for (const other of _class.listCustomSpecials ?? []) {
      await upsertAbilityBlock({
        id: -1,
        created_at: '',
        operations: [],
        name: other.name,
        actions: null,
        level: other.level ?? 1,
        rarity: 'COMMON',
        prerequisites: [],
        description: toMarkdown(other.description) ?? '',
        type: 'class-feature',
        traits: [resultClass.trait_id, ...(await findTraits(other.traits, traitMap))],
        content_source_id: source.id,
      });
    }
  }

  for (const feat of data.listCustomFeats ?? []) {
    const descValues = extractFromDescription(feat.textDescription);
    await upsertAbilityBlock({
      id: -1,
      created_at: '',
      operations: [],
      name: feat.name,
      actions: convertActions(feat.action),
      level: feat.level ?? 1,
      rarity: 'COMMON',
      prerequisites: descValues.prerequisites?.split(/[;,]/g)?.map((p) => p.trim()) ?? [],
      frequency: descValues.frequency,
      cost: descValues.cost,
      trigger: descValues.trigger,
      requirements: descValues.requirements,
      access: descValues.access,
      description: descValues.description,
      special: descValues.special,
      type: 'feat',
      traits: await findTraits(feat.traits, traitMap),
      content_source_id: source.id,
    });
  }

  for (const spell of data.listCustomSpells ?? []) {
    const descValues = extractFromDescription(spell.descriptionHeightened);
    await upsertSpell({
      id: -1,
      created_at: '',
      name: spell.name,
      rank: spell.level,
      traditions: [],
      rarity: 'COMMON',
      cast: convertActions(spell.actions),
      traits: await findTraits(spell.traits, traitMap),
      defense: descValues.defense,
      cost: descValues.cost,
      trigger: descValues.trigger,
      requirements: descValues.requirements,
      range: descValues.range,
      area: descValues.area,
      targets: descValues.targets,
      duration: descValues.duration,
      description: descValues.description,
      heightened: undefined,
      meta_data: {
        focus: spell.type === 'Focus',
      },
      content_source_id: source.id,
      version: '1.0',
    });
  }

  return source;
}

function convertActions(actions?: number): ActionCost {
  if (actions === 1) return 'ONE-ACTION';
  if (actions === 2) return 'TWO-ACTIONS';
  if (actions === 3) return 'THREE-ACTIONS';
  if (actions === 0) return 'REACTION';
  if (actions === -1) return 'FREE-ACTION';
  return null;
}

async function findTraits(input: string | undefined, traitMap: Map<string, number>) {
  if (!input) return [];
  const traits = await fetchContentAll<Trait>('trait');

  const output: number[] = [];
  for (const trait of input.split(/,/g)) {
    // Check trait map
    const foundId = traitMap.get(trait.trim());
    if (foundId) {
      output.push(foundId);
      continue;
    }

    // Search all traits
    const found = traits.find((t) => t.name === trait.trim());
    if (found) output.push(found.id);
  }
  return output;
}

function extractFromDescription(input?: string): Record<string, string> {
  const desc = toMarkdown(input ?? '') ?? '';

  const pattern =
    /(\*\*(Prerequisites|Trigger|Frequency|Requirements|Range|Area|Targets|Defense|Duration|Access|Cost|Area|Craft Requirements|Special)\s*\*\*([^*\n]+))([^*]+)/gm;

  const output: Record<string, string> = {};
  let resultDesc = desc;
  let match;
  while ((match = pattern.exec(desc)) !== null) {
    const label = match[2].toLowerCase().replace(/\s/g, '_');
    const text = match[3].trim();
    output[label] = text;
    resultDesc = resultDesc.replace(match[1], '').trim();
  }

  return {
    description: resultDesc,
    ...output,
  };
}
