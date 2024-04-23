import { AbilityBlock } from '@typing/content';
import { meetsPrerequisites } from '@variables/prereq-detection';

export interface FilterOption {
  title: string;
  type: 'MULTI-SELECT' | 'SELECT' | 'TRAITS-SELECT' | 'TEXT-INPUT' | 'NUMBER-INPUT' | 'CHECKBOX';
  key: string;
  options?: string[] | { label: string; value: string }[];
  filterFn?: (option: Record<string, any>) => boolean;
}

export interface FilterOptions {
  options: FilterOption[];
}

export interface SelectedFilter {
  filter: FilterOption;
  value: any;
}

export const prereqFilterOption: FilterOption = {
  title: 'Only prerequisites met',
  type: 'CHECKBOX',
  key: 'prereq',
  filterFn: (option: Record<string, any>) => {
    const prereqMet = meetsPrerequisites('CHARACTER', (option as AbilityBlock).prerequisites);
    return prereqMet.result !== 'NOT';
  },
};
