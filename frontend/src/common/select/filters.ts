import { AbilityBlock } from '@typing/content';
import { meetsPrerequisites } from '@variables/prereq-detection';

// export interface FilterOption {
//   title: string;
//   type: 'MULTI-SELECT' | 'SELECT' | 'TRAITS-SELECT' | 'TEXT-INPUT' | 'NUMBER-INPUT' | 'CHECKBOX';
//   key: string;
//   options?: string[] | { label: string; value: string }[];
//   default?: string[];
//   isActionOption?: boolean;
//   filterFn?: (option: Record<string, any>) => boolean;
// }

// export interface FilterOptions {
//   options: FilterOption[];
// }

// export interface SelectedFilter {
//   filter: FilterOption;
//   value: any;
// }

// export const defaultFeatOptions: FilterOption[] = [
//   {
//     title: 'Action',
//     type: 'MULTI-SELECT',
//     key: 'actions',
//     isActionOption: true,
//     options: [
//       { label: 'One Action', value: 'ONE-ACTION' },
//       { label: 'Two Actions', value: 'TWO-ACTIONS' },
//       { label: 'Three Actions', value: 'THREE-ACTIONS' },
//       { label: 'Free Action', value: 'FREE-ACTION' },
//       { label: 'Reaction', value: 'REACTION' },
//       { label: 'One to Two Actions', value: 'ONE-TO-TWO-ACTIONS' },
//       { label: 'One to Three Actions', value: 'ONE-TO-THREE-ACTIONS' },
//       { label: 'Two to Three Actions', value: 'TWO-TO-THREE-ACTIONS' },
//     ],
//   },
//   {
//     title: 'Level',
//     type: 'MULTI-SELECT',
//     key: 'level',
//     options: [
//       { label: '1st', value: '1' },
//       { label: '2nd', value: '2' },
//       { label: '3rd', value: '3' },
//       { label: '4th', value: '4' },
//       { label: '5th', value: '5' },
//       { label: '6th', value: '6' },
//       { label: '7th', value: '7' },
//       { label: '8th', value: '8' },
//       { label: '9th', value: '9' },
//       { label: '10th', value: '10' },
//       { label: '11th', value: '11' },
//       { label: '12th', value: '12' },
//       { label: '13th', value: '13' },
//       { label: '14th', value: '14' },
//       { label: '15th', value: '15' },
//       { label: '16th', value: '16' },
//       { label: '17th', value: '17' },
//       { label: '18th', value: '18' },
//       { label: '19th', value: '19' },
//       { label: '20th', value: '20' },
//     ],
//   },
// ];

// export const prereqFilterOption: FilterOption = {
//   title: 'Only prereqs met',
//   type: 'CHECKBOX',
//   key: 'prereq',
//   filterFn: (option: Record<string, any>) => {
//     const prereqMet = meetsPrerequisites('CHARACTER', (option as AbilityBlock).prerequisites);
//     return prereqMet.result !== 'NOT';
//   },
// };
