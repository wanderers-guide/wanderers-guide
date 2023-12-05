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
  | 'stat-prof'
  | 'stat-attributes'
  | 'stat-hp'
  | 'stat-resist-weak';

export type UploadResult = {
  success: boolean;
  id?: number;
};
