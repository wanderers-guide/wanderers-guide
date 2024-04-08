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

type DiceUserSettings = {
  audio: boolean;
  diceTray: string[];
};

export function getDiceUserSettings(): DiceUserSettings {
  try {
    return JSON.parse(localStorage.getItem('dice-settings') ?? 'none') as DiceUserSettings;
  } catch (e) {
    return { audio: true, diceTray: [] };
  }
}

export function setDiceUserSettings(settings: DiceUserSettings) {
  localStorage.setItem('dice-settings', JSON.stringify(settings));
}
