import { Character } from '@typing/content';
import jsonV4 from './json/json-v4';

// Legacy WG .guidechar exports are version 3
export const EXPORT_JSON_VERSION: number = 4;

export default async function exportToJSON(character: Character) {
  if (EXPORT_JSON_VERSION === 4) {
    return await jsonV4(character);
  }
}

// Utils
export function downloadObjectAsJson(object: Record<string, any>, fileName: string) {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(object));
  const downloadAnchorNode = document.createElement('a');
  downloadAnchorNode.setAttribute('href', dataStr);
  downloadAnchorNode.setAttribute('download', fileName + '.json');
  document.body.appendChild(downloadAnchorNode); // required for firefox
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
}
