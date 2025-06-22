import { DrawerType } from '@typing/index';
import { ContentType, AbilityBlockType } from '@typing/content';
import { isAbilityBlockType } from '@content/content-utils';
import { CREATURE_DRAWER_ZINDEX } from './types/CreatureDrawer';

export function convertContentLink(input: { type: ContentType | AbilityBlockType | 'condition'; id: string }): {
  type: DrawerType;
  data: any;
} {
  return {
    type: input.type,
    data: {
      id: parseInt(input.id) ? parseInt(input.id) : input.id,
      readOnly: true,
      zIndex: input.type === 'creature' ? CREATURE_DRAWER_ZINDEX : undefined,
    },
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
  data: Record<string, any> | number,
  dataInject?: Record<string, any>
): { type: DrawerType; data: any } {
  let drawerType: DrawerType = type;
  if (data instanceof Object && isAbilityBlockType(data.type)) {
    drawerType = data.type;
  }

  console.log('drawerType', drawerType, 'data', data, 'dataInject', dataInject);

  let drawerData: Record<string, any> = {};
  if (typeof data === 'number') {
    drawerData = { id: data, ...(dataInject ?? {}) };
  } else {
    let key = '';
    if (drawerType === 'action' || isAbilityBlockType(drawerType)) key = 'action';
    if (drawerType === 'ancestry') key = 'ancestry';
    if (drawerType === 'background') key = 'background';
    if (drawerType === 'class') key = 'class_';
    if (drawerType === 'class-feature') key = 'classFeature';
    if (drawerType === 'feat') key = 'feat';
    if (drawerType === 'item') key = 'item';
    if (drawerType === 'language') key = 'language';
    if (drawerType === 'spell') key = 'spell';
    if (drawerType === 'trait') key = 'trait';
    if (drawerType === 'archetype') key = 'archetype';
    if (drawerType === 'versatile-heritage') key = 'versatileHeritage';
    if (drawerType === 'content-source') key = 'source';
    if (drawerType === 'creature') {
      key = 'creature';
      dataInject = {
        ...(dataInject ?? {}),
        zIndex: CREATURE_DRAWER_ZINDEX,
      };
    }
    drawerData = {
      [key]: data,
      ...(dataInject ?? {}),
    };
  }

  return { type: drawerType, data: drawerData };
}
