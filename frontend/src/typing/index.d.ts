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
  | 'condition'
  | 'character'
  | 'inv-item'
  | 'cast-spell'
  | 'add-item'
  | 'add-spell'
  | 'stat-prof'
  | 'stat-attr'
  | 'stat-hp'
  | 'stat-ac'
  | 'stat-speed'
  | 'stat-perception'
  | 'stat-resist-weak';

export type UploadResult = {
  success: boolean;
  id?: number;
};
