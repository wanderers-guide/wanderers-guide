import { fetchTraitByName } from '@content/content-store';
import { showNotification } from '@mantine/notifications';
import { makeRequest } from '@requests/request-manager';
import { AbilityBlockType, ContentType, Trait } from '@typing/content';

// 
const ENABLED = false;


// LEAKED: This key is gonna be leaked, but it's not a big deal.
// It's read-only and is used to access the free legacy API.
// Regardless, we'll refresh it often.
const WG_LEGACY_API_KEY = `6a24e0fd-6f3a-4319-a8e1-2049c761ab2d`;
const WG_LEGACY_API_URL = `https://wanderersguide.app/api`;

async function makeLegacyRequest(path: string) {
  const res = await fetch(`${WG_LEGACY_API_URL}/${path}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Apikey ${WG_LEGACY_API_KEY}`,
    },
  });
  const result = await res.json();
  return result;
}

export async function importContent(type: ContentType, abilityBlockType?: AbilityBlockType) {
  if (!ENABLED) {
    showNotification({
      title: 'Legacy Import Disabled',
      message: 'This import is currently disabled.',
      color: 'red',
      icon: null,
    });
    return;
  }

  if (type === 'ability-block' && abilityBlockType === 'feat') {
    await getAllFeats();
  }

  if (type === 'trait') {
    const traits = await getAllTraits();
    // Update all trait descriptions

    for (const trait of traits) {
      const foundTrait = await fetchTraitByName(trait.name);

      console.log(foundTrait);

      if (foundTrait) {
        // Update description and importance
        const result = await makeRequest<Trait>('create-trait', {
          id: foundTrait.id,
          description: trait.description,
          meta_data: {
            important: trait.isImportant === 1,
            creature_trait: trait.isHidden === 1,
            unselectable: false,
          },
        });
        console.log(result);
      }
    }

    showNotification({
      title: 'Traits Imported',
      message: 'The trait descriptions and metadata have been imported.',
      color: 'blue',
      icon: null,
    });
  }

  if (type === 'language') {

    const langs = [
      {
        id: 1,
        name: 'Common',
        speakers: 'Humans, Dwarves, Elves, Halflings, and other common ancestries',
        script: 'Common',
        description:
          'Common is a relative term used to denote the most prevalent human language spoken in a particular region. In each different region there may be different dialects and variations in the common language. In general, Common is the name for the standard language in which most humanoids speak.',
        contentSrc: 'CRB',
        homebrewID: null,
        createdAt: '2019-12-13 00:32:51',
        updatedAt: '2019-12-13 00:32:51',
      },
      // ...
    ];
    
    for(const lang of langs) {
      const {id, name, speakers, script, description} = lang;
      const result = await makeRequest('create-language', {
        name,
        speakers,
        script,
        rarity: 'COMMON',
        description,
        content_source_id: 1,
      });
      console.log(result);
    }

    showNotification({
      title: 'Languages Imported',
      message: 'The languages have been imported.',
      color: 'blue',
      icon: null,
    });
  }
}

async function getAllFeats() {
  const feats = await makeLegacyRequest(`feat/all`);
  console.log(feats);
}

async function getAllTraits() {
  const traits = await makeLegacyRequest(`trait/all`);
  return traits as Record<string, any>[];
}
