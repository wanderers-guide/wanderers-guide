import { DrawerType } from '@typing/index';
import { ContentType, AbilityBlockType } from '@typing/content';

export function convertContentLink(input: { type: ContentType | AbilityBlockType; id: number }): {
  type: DrawerType;
  data: any;
} {
  // TODO: Added support for other drawer types
  return {
    type: input.type,
    data: { id: input.id },
  };
}


export type PrevMetadata = {
  scrollTop: number;
  openedDict: Record<string, string>;
};

export function getMetadataOpenedDict() {
  const value = localStorage.getItem('prev-drawer-metadata');
  if (!value) return {};

  const metadata: PrevMetadata = JSON.parse(value);
  return metadata.openedDict;
}