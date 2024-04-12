import { getFileContents } from '@import/json/import-from-json';
import { showNotification, hideNotification } from '@mantine/notifications';

export async function importFromCustomPack(sourceId: number, file: File) {
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

  console.log(content);

  hideNotification(`importing-${file.name}`);

  return content;
}
