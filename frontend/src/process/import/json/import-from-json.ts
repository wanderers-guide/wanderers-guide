import { hideNotification, showNotification } from '@mantine/notifications';
import { makeRequest } from '@requests/request-manager';
import { Character } from '@schemas/content';

export default async function importFromJSON(file: File) {
  showNotification({
    id: `importing-${file.name}`,
    title: `Importing character`,
    message: 'Please wait...',
    autoClose: false,
    withCloseButton: false,
    loading: true,
  });

  let character = null;
  let fileValidated = false;
  try {
    const contents = await getFileContents(file);
    const obj = JSON.parse(contents);
    if (obj?.version !== 4 || !obj.character || typeof obj.character !== 'object') throw new Error();
    fileValidated = true;
    character = await importObject(obj);
    if (character) {
      showNotification({
        title: 'Success',
        message: `Imported "${character.name}"`,
        icon: null,
        autoClose: 3000,
      });
    } else {
      throw new Error('The character could not be imported. Please try again.');
    }
  } catch (e) {
    showNotification({
      title: 'Import failed',
      message: fileValidated && e instanceof Error ? e.message : 'Invalid JSON file',
      color: 'red',
      icon: null,
      autoClose: false,
    });
  } finally {
    hideNotification(`importing-${file.name}`);
  }
  return character;
}

async function importObject(obj: Record<string, any>): Promise<Character | null> {
  const version = obj.version;
  if (version === 4) {
    return await importV4(obj);
  } else {
    return null;
  }
}

async function importV4(obj: Record<string, any>): Promise<Character | null> {
  const fileCharacter: Character = obj.character;

  const character = {
    ...fileCharacter,
    id: undefined, // remove ID so it creates a new character
  };

  return await makeRequest<Character>('create-character', character, true, { throwOnFailure: true });
}

// Utils
export async function getFileContents(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = function fileReadCompleted() {
      resolve(reader.result as string);
    };
    reader.onerror = () => reject(new Error('Could not read the selected file.'));
    reader.onabort = () => reject(new Error('File reading was cancelled.'));
    reader.readAsText(file);
  });
}
