import { Character } from '@typing/content';

// Legacy WG .guidechar exports are version 3
const VERSION = 4;

export default function exportToJSON(character: Character) {
  const exportObject = {
    version: VERSION,
    character,
  };

  const fileName = character.name
    .trim()
    .toLowerCase()
    .replace(/([^a-z0-9]+)/gi, '-');
  downloadObjectAsJson(exportObject, fileName);
}

function downloadObjectAsJson(object: Record<string, any>, fileName: string) {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(object));
  const downloadAnchorNode = document.createElement('a');
  downloadAnchorNode.setAttribute('href', dataStr);
  downloadAnchorNode.setAttribute('download', fileName + '.json');
  document.body.appendChild(downloadAnchorNode); // required for firefox
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
}
