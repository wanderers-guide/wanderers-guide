import { DrawerType } from '@typing/index';
import { ContentType, AbilityBlockType } from '@typing/content';
import { isAbilityBlockType } from '@content/content-utils';

export function convertContentLink(input: { type: ContentType | AbilityBlockType; id: number }): {
  type: DrawerType;
  data: any;
} {
  // TODO: Add support for other drawer types
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

export function mapToDrawerData(
  type: ContentType,
  data: Record<string, any> | number
): { type: DrawerType; data: any } {
  let drawerType: DrawerType = type;
  if (data instanceof Object && isAbilityBlockType(data.type)) {
    drawerType = data.type;
  }

  let drawerData: Record<string, any> = {};
  if (typeof data === 'number') {
    drawerData = { id: data };
  } else {
    drawerData = data;
  }

  return { type: drawerType, data: drawerData };
}
