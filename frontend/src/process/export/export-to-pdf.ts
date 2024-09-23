import { Character } from '@typing/content';
import { showNotification } from '@mantine/notifications';

export const EXPORT_PDF_VERSION: number = 2;

export default async function exportToPDF(character: Character) {
  if (EXPORT_PDF_VERSION === 1) {
    try {
      const { pdfV1 } = await import('./pdf/pdf-v1');
      return await pdfV1(character);
    } catch (err) {
      console.error(err);
      showNotification({
        title: 'Error',
        message: 'Failed to export PDF, please try again later.',
        color: 'red',
      });
    }
  } else if (EXPORT_PDF_VERSION === 2) {
    try {
      const { pdfV2 } = await import('./pdf/pdf-v2');
      return await pdfV2(character);
    } catch (err) {
      console.error(err);
      showNotification({
        title: 'Error',
        message: 'Failed to export PDF, please try again later.',
        color: 'red',
      });
    }
  }
}
