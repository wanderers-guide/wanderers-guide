import { Character } from '@typing/content';
import _ from 'lodash';
import { pdfV1 } from './pdf/pdf-v1';
import { pdfV2 } from './pdf/pdf-v2';

export const EXPORT_PDF_VERSION: number = 2;

export default async function exportToPDF(character: Character) {
  if (EXPORT_PDF_VERSION === 1) {
    return await pdfV1(character);
  } else if (EXPORT_PDF_VERSION === 2) {
    return await pdfV2(character);
  }
}
