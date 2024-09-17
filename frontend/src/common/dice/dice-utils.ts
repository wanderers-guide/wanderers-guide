// /**
//  * Creates a new room on the DDDice server.
//  * @param AUTH_KEY
//  * @returns - The room object.
//  */
// export async function createDiceRoom(AUTH_KEY: string) {
//   const res = await fetch('https://dddice.com/api/1.0/room', {
//     method: 'POST',
//     headers: {
//       Authorization: `Bearer ${AUTH_KEY}`,
//       'Content-Type': 'application/json',
//       Accept: 'application/json',
//     },
//     body: JSON.stringify({
//       is_public: true,
//       name: crypto.randomUUID(),
//       passcode: '',
//     }),
//   });
//   return await res.json();
// }

import { Character, Dice } from '@typing/content';
import { StoreID } from '@typing/variables';
import { getAllSaveVariables, getAllSkillVariables } from '@variables/variable-manager';
import { DICE_THEMES } from './dice-tray';
import { getFinalProfValue } from '@variables/variable-display';
import { isItemWeapon } from '@items/inv-utils';
import { getWeaponStats } from '@items/weapon-handler';
import { getSpellStats } from '@spells/spell-handler';
import { parseDiceRoll, toLabel } from '@utils/strings';

/**
 * Deletes a room on the DDDice server.
 * @param AUTH_KEY
 * @returns - True if the room was deleted successfully.
 */
export async function deleteDiceRoom(AUTH_KEY: string, roomId: string) {
  const res = await fetch(`https://dddice.com/api/1.0/room/${roomId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${AUTH_KEY}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  });
  return res.ok;
}

export function findDefaultPresets(id: StoreID, character: Character | null) {
  console.log('Loading default presets...');

  const theme = DICE_THEMES[0].theme;
  const presets: {
    id: string;
    name: string;
    dice: Dice[];
  }[] = [];

  // Spells
  // if (
  //   compileProficiencyType(getVariable<VariableProf>('CHARACTER', 'SPELL_ATTACK')?.value) !== undefined &&
  //   compileProficiencyType(getVariable<VariableProf>('CHARACTER', 'SPELL_ATTACK')?.value) !== 'U'
  // ) {
  //   presets.push({
  //     id: crypto.randomUUID(),
  //     name: 'Spell attack',
  //     dice: [
  //       {
  //         id: crypto.randomUUID(),
  //         type: 'd20',
  //         theme: theme,
  //         bonus: //getSpellStats(id, null, 'TODO', 'TODO').spell_attack.total[0],
  //         label: 'Spell attack',
  //       },
  //     ],
  //   });
  // }

  // Weapons
  const weapons = character?.inventory?.items
    .filter((invItem) => invItem.is_equipped && isItemWeapon(invItem.item))
    .sort((a, b) => a.item.name.localeCompare(b.item.name));
  for (const weapon of weapons ?? []) {
    const weaponStats = getWeaponStats(id, weapon.item);
    presets.push({
      id: crypto.randomUUID(),
      name: `${weapon.item.name} (1st attack)`,
      dice: [
        {
          id: crypto.randomUUID(),
          type: 'd20',
          theme: theme,
          bonus: weaponStats.attack_bonus.total[0],
          label: `${weapon.item.name} (1st attack)`,
        },
      ],
    });
    if (!weaponStats.damage.die || weaponStats.damage.die === '1') continue;

    const weapDice: Dice[] = [];

    // Add dice for base weapon damage + bonus
    for (let i = 0; i < weaponStats.damage.dice; i++) {
      weapDice.push({
        id: crypto.randomUUID(),
        type: weaponStats.damage.die,
        theme: theme,
        bonus: i === weaponStats.damage.dice - 1 ? weaponStats.damage.bonus.total : 0,
        label: `${weaponStats.damage.damageType} dmg (${weapon.item.name})`,
      });
    }

    // Add other damage
    for (const part of weaponStats.damage.other) {
      // Skip persistent damage (it's rolled at the end of each turn!)
      if (part.damageType.includes('persistent')) continue;

      for (let i = 0; i < part.dice; i++) {
        // Format the damage source to just include name
        const source = part.source?.match(/^<(.+?)>/)?.[1] ?? part.source;
        weapDice.push({
          id: crypto.randomUUID(),
          type: part.die,
          theme: theme,
          bonus: i === part.dice - 1 ? part.bonus : 0,
          label: `${part.damageType} dmg ${source ? `(${source})` : ``}`,
        });
      }
    }

    // Attempt to add extra damage
    if (weaponStats.damage.extra) {
      const parsedDamage = parseDiceRoll(weaponStats.damage.extra);
      for (const part of parsedDamage) {
        // Skip persistent damage (it's rolled at the end of each turn!)
        if (part.suffix.includes('persistent')) continue;

        for (let i = 0; i < part.dice; i++) {
          weapDice.push({
            id: crypto.randomUUID(),
            type: part.die,
            theme: theme,
            bonus: i === part.dice - 1 ? part.bonus : 0,
            label: `${part.suffix} dmg (Extra)`,
          });
        }
      }
    }

    presets.push({
      id: crypto.randomUUID(),
      name: `${weapon.item.name} (damage)`,
      dice: weapDice,
    });
  }

  // Saves
  presets.push(
    ...getAllSaveVariables(id).map((save) => ({
      id: crypto.randomUUID(),
      name: `${toLabel(save.name)} save`,
      dice: [
        {
          id: crypto.randomUUID(),
          type: 'd20',
          theme: theme,
          bonus: parseInt(getFinalProfValue(id, save.name)),
          label: `${toLabel(save.name)} save`,
        },
      ],
    }))
  );

  // Perception
  presets.push({
    id: crypto.randomUUID(),
    name: 'Perception check',
    dice: [
      {
        id: crypto.randomUUID(),
        type: 'd20',
        theme: theme,
        bonus: parseInt(getFinalProfValue(id, 'PERCEPTION')),
        label: 'Perception check',
      },
    ],
  });

  // Skills
  presets.push(
    ...getAllSkillVariables(id)
      .filter((skill) => skill.name !== 'SKILL_LORE____')
      .map((skill) => ({
        id: crypto.randomUUID(),
        name: `${toLabel(skill.name)} check`,
        dice: [
          {
            id: crypto.randomUUID(),
            type: 'd20',
            theme: theme,
            bonus: parseInt(getFinalProfValue(id, skill.name)),
            label: `${toLabel(skill.name)} check`,
          },
        ],
      }))
  );

  return presets;
}
