import { FTC, importFromFTC } from '@import/ftc/import-from-ftc';
import { Session } from '@supabase/supabase-js';
import { lengthenLabels } from '@variables/variable-utils';

export async function importFromPathbuilder(session: Session, pathbuilderJsonId: number) {
  const res = await fetch(`https://pathbuilder2e.com/json.php?id=${pathbuilderJsonId}`);
  const json = await res.json();

  if (json?.success) {
    const ftc = convertPathbuilderToFTC(json.build);
    console.log('Converted FTC:', ftc);
    return await importFromFTC(session, ftc);
  }
  return null;
}

function convertPathbuilderToFTC(build: Record<string, any>): FTC {
  function convertAttributes(attributes: string[] | undefined, level: number) {
    return (
      attributes?.map((attr) => {
        return {
          name: lengthenLabels(attr),
          level: level,
        };
      }) ?? []
    );
  }

  function convertFeats(record: [string, null, string, number]) {
    return {
      name: record[0],
      level: record[3],
    };
  }

  function convertLores(record: [string, number]) {
    return {
      name: record[0],
      level: record[1],
    };
  }

  function convertSpells(spellCasters: any[]) {
    let extractedSpells: { name: string; rank: number; source: string }[] = [];

    for (const caster of spellCasters) {
      // Extract from 'spells'
      for (const spell of caster.spells) {
        spell.list.forEach((spellName: string) => {
          extractedSpells.push({ name: spellName, rank: spell.spellLevel, source: caster.name });
        });
      }
      // Extract from 'prepared'
      for (const prepared of caster.prepared) {
        prepared.list.forEach((spellName: string) => {
          extractedSpells.push({ name: spellName, rank: prepared.spellLevel, source: caster.name });
        });
      }
    }

    return extractedSpells;
  }

  const ftc = {
    version: '1.0',
    data: {
      class: build.class,
      background: build.background,
      ancestry: build.ancestry,
      name: build.name,
      level: build.level,
      experience: 0,
      content_sources: 'ALL',
      selections: [
        ...convertAttributes(build.abilities.breakdown.ancestryFree, 1),
        ...convertAttributes(build.abilities.breakdown.ancestryBoosts, 1),
        ...convertAttributes(build.abilities.breakdown.backgroundBoosts, 1),
        ...convertAttributes(build.abilities.breakdown.classBoosts, 1),
        ...convertAttributes(build.abilities.breakdown.mapLevelledBoosts['1'], 1),
        ...convertAttributes(build.abilities.breakdown.mapLevelledBoosts['5'], 5),
        ...convertAttributes(build.abilities.breakdown.mapLevelledBoosts['10'], 10),
        ...convertAttributes(build.abilities.breakdown.mapLevelledBoosts['15'], 15),
        ...convertAttributes(build.abilities.breakdown.mapLevelledBoosts['20'], 20),
        ...build.feats.map(convertFeats),
        ...build.lores.map(convertLores),
        {
          name: build.heritage,
          level: 1,
        },
      ],
      items: [
        ...build.equipment.map((data: [string, number, string, string]) => {
          return {
            name: data[0],
            level: data[1],
          };
        }),
        ...build.weapons.map((data: Record<string, any>) => {
          return {
            name: data.name,
            level: undefined,
          };
        }),
        ...build.armor.map((data: Record<string, any>) => {
          return {
            name: data.name,
            level: undefined,
          };
        }),
      ],
      coins: {
        cp: build.money.cp,
        sp: build.money.sp,
        gp: build.money.gp,
        pp: build.money.pp,
      },
      spells: convertSpells(build.spellCasters),
      conditions: [],
      hp: undefined,
      temp_hp: undefined,
      hero_points: undefined,
      stamina: undefined,
      resolve: undefined,
      info: {
        notes: undefined,
        appearance: undefined,
        personality: undefined,
        alignment: build.alignment,
        beliefs: build.deity,
        age: build.age,
        height: undefined,
        weight: undefined,
        gender: build.gender,
        pronouns: undefined,
        faction: undefined,
        reputation: undefined,
        ethnicity: undefined,
        nationality: undefined,
        birthplace: undefined,
        organized_play_id: undefined,
      },
    },
  } satisfies FTC;

  return ftc;
}
