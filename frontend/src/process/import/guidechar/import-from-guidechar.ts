import { FTC, importFromFTC } from '@import/ftc/import-from-ftc';
import { getFileContents } from '@import/json/import-from-json';
import { hideNotification, showNotification } from '@mantine/notifications';
import { lengthenLabels } from '@variables/variable-utils';

export default async function importFromGUIDECHAR(file: File) {
  showNotification({
    id: `importing-${file.name}`,
    title: `Importing character`,
    message: 'This may take a minute...',
    autoClose: false,
    withCloseButton: false,
    loading: true,
  });

  const contents = await getFileContents(file);
  let character = null;
  try {
    const obj = JSON.parse(contents);
    const ftc = convertGUIDECHARToFTC(obj);
    console.log('Converted FTC:', ftc);
    const character = await importFromFTC(ftc);

    if (character) {
      hideNotification(`importing-${file.name}`);
      showNotification({
        title: 'Success',
        message: `Imported "${character.name}"`,
        icon: null,
        autoClose: 3000,
      });
    } else {
      throw new Error();
    }
  } catch (e) {
    hideNotification(`importing-${file.name}`);
    showNotification({
      title: 'Import failed',
      message: 'Invalid GUIDECHAR file',
      color: 'red',
      icon: null,
      autoClose: false,
    });
  }
  return character;
}

function convertGUIDECHARToFTC(data: Record<string, any>): FTC {
  const convertBoosts = (boosts: any[]) => {
    return boosts.map((boost) => {
      return {
        name: lengthenLabels(boost.Ability),
        level: boost.sourceLevel,
      };
    });
  };

  const convertFeats = (feats: any[]) => {
    return feats.map((feat) => {
      return {
        name: feat.value.name,
        level: feat.sourceLevel,
      };
    });
  };

  const convertLanguages = (languages: any[]) => {
    return languages.map((language) => {
      return {
        name: language.value.name,
        level: language.sourceLevel,
      };
    });
  };

  const convertProficiencies = (profs: any[]) => {
    return profs.map((prof) => {
      return {
        name: prof.To,
        level: prof.sourceLevel,
      };
    });
  };

  let info: Record<string, string> = {};
  try {
    info = JSON.parse(data.character.infoJSON);
  } catch (e) {}

  const ftc = {
    version: '1.0',
    data: {
      class: data.character?._class?.name,
      background: data.character?._background?.name,
      ancestry: data.character?._ancestry?.name,
      name: data.character?.name,
      level: data.character?.level,
      experience: data.character?.experience,
      content_sources: 'ALL',
      selections: [
        ...convertBoosts(data.build?.boosts ?? []),
        ...convertFeats(data.build?.feats ?? []),
        ...convertLanguages(data.build?.languages ?? []),
        ...convertProficiencies(data.build?.proficiencies ?? []),
        {
          name: data.character?._heritage?.name,
          level: 1,
        },
      ],
      items: [
        ...data.invItems?.map((invItem: any) => {
          return {
            name: invItem._itemOriginalName,
            level: undefined,
          };
        }),
      ],
      coins: {
        // TODO
        cp: 0,
        sp: 0,
        gp: 0,
        pp: 0,
      },
      spells: [
        ...data.spellBookSpells?.map((spell: any) => {
          return {
            source: spell.spellSRC,
            name: spell._spellName,
            rank: spell.spellLevel,
          };
        }),
      ],
      conditions: [
        ...data.conditions?.map((condition: any) => {
          return {
            name: condition._conditionName,
            value: condition.value ? `${condition.value}` : undefined,
          };
        }),
      ],
      variants: {
        ancestry_paragon: data.character?.variantAncestryParagon === 1,
        proficiency_without_level: data.character?.variantProfWithoutLevel === 1,
        stamina: data.character?.variantStamina === 1,
        free_archetype: data.character?.variantFreeArchetype === 1,
        dual_class: false,
      },
      options: {
        public: data.character?.optionPublicCharacter === 1,
        auto_detect_prerequisites: data.character?.optionAutoDetectPreReqs === 1,
        auto_heighten_spells: data.character?.optionAutoHeightenSpells === 1,
        class_archetypes: data.character?.optionClassArchetypes === 1,
        dice_roller: data.character?.optionDiceRoller === 1,
        ignore_bulk_limit: data.character?.optionIgnoreBulk === 1,
        alternate_ancestry_boosts: data.character?.optionAltAbilityBoosts === 1,
        voluntary_flaws: false,
      },
      hp: data.character?.currentHealth,
      temp_hp: data.character?.tempHealth,
      hero_points: data.character?.heroPoints,
      stamina: data.character?.currentStamina,
      resolve: data.character?.currentResolve,
      info: {
        notes: 'Please copy and paste your notes manually, thanks!',
        appearance: info.appearance,
        personality: info.personality,
        alignment: info.alignment,
        beliefs: info.beliefs,
        age: info.age,
        height: undefined,
        weight: undefined,
        gender: info.gender,
        pronouns: info.pronouns,
        faction: info.faction,
        reputation: undefined,
        ethnicity: info.ethnicity,
        nationality: info.nationality,
        birthplace: undefined,
        organized_play_id: undefined,
      },
    },
  } satisfies FTC;

  return ftc;
}
