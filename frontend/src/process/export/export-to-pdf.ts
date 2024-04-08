import { Character } from '@typing/content';
import _ from 'lodash';
import { pdfV1 } from './pdf/pdf-v1';

export const EXPORT_PDF_VERSION = 1;

export default async function exportToPDF(character: Character) {
  if (EXPORT_PDF_VERSION === 1) {
    return await pdfV1(character);
  }
}
