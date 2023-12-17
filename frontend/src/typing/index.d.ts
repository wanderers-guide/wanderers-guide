import type { ContentType, AbilityBlockType } from './content';

export type ImageOption = {
  name?: string;
  url: string;
  source?: string;
  source_url?: string;
};

export type DrawerType =
  | ContentType
  | AbilityBlockType
  | 'generic'
  | 'character'
  | 'add-item'
  | 'add-spell'
  | 'stat-prof'
  | 'stat-attr'
  | 'stat-hp'
  | 'stat-resist-weak';

export type UploadResult = {
  success: boolean;
  id?: number;
};
