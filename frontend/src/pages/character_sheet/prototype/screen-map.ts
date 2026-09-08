/** Current navigation inventory. The ordering matches the live mobile panel picker. */
export type ScreenDescription = { id: string; title: string; contents: string; interaction: string; parent?: string };

export const screenMap: ScreenDescription[] = [
  {
    id: 'overview',
    title: 'Health, Attributes, Saves',
    contents: 'Identity, HP, conditions, hero points, attributes, AC, saves, perception, speed and class DC.',
    interaction: 'The initial screen. Stats form a vertical stack.',
  },
  {
    id: 'overview-bottom',
    title: 'Overview, scrolled down',
    contents: 'The lower stats, including perception, speed and class DC.',
    interaction: 'The app header collapses as the outer sheet scrolls.',
    parent: 'overview',
  },
  {
    id: 'picker',
    title: 'Panel picker',
    contents: 'One overview button and four rows of paired panel buttons.',
    interaction: 'The bottom-right grid button opens this menu.',
  },
  {
    id: 'skills',
    title: 'Skills & Actions',
    contents: 'Searchable skills with bonuses and proficiency ranks.',
    interaction: 'Two tabs separate skills from actions and abilities.',
  },
  {
    id: 'actions',
    title: 'Actions / Abilities',
    contents: 'Action-cost filters, weapon attacks and grouped action accordions.',
    interaction: 'The second tab inside Skills & Actions.',
    parent: 'skills',
  },
  {
    id: 'feats',
    title: 'Feats & Features',
    contents: 'Search and grouped class, ancestry, general and skill feats.',
    interaction: 'A segmented control switches between feats and features.',
  },
  {
    id: 'features',
    title: 'Features',
    contents: 'Class, heritage and ancestry features.',
    interaction: 'The second segment inside Feats & Features.',
    parent: 'feats',
  },
  {
    id: 'inventory',
    title: 'Inventory',
    contents: 'A compact item list and search. Options contain bulk, Add Item and Manage Currency.',
    interaction: 'Quantity, bulk and price columns are hidden on phones.',
  },
  {
    id: 'spells',
    title: 'Spells',
    contents: 'Search, action-cost filters, casting sources, spell ranks and focus spells.',
    interaction: 'Casting controls depend on the character’s casting sources.',
  },
  {
    id: 'notes',
    title: 'Notes',
    contents: 'One rich-text page with a floating page menu and page settings.',
    interaction: 'The page menu switches or adds pages.',
  },
  {
    id: 'details',
    title: 'Details',
    contents: 'Information, languages and proficiencies. Information also has General and Organized Play tabs.',
    interaction: 'Another nested tab set inside the selected panel.',
  },
  {
    id: 'languages',
    title: 'Languages',
    contents: 'Languages, character traits and size.',
    interaction: 'The second Details tab.',
    parent: 'details',
  },
  {
    id: 'proficiencies',
    title: 'Proficiencies',
    contents: 'Armor and weapon proficiency groups.',
    interaction: 'The third Details tab.',
    parent: 'details',
  },
  {
    id: 'companions',
    title: 'Companions',
    contents: 'Companion cards or the existing empty state.',
    interaction: 'Companion cards open the creature drawer.',
  },
  {
    id: 'extras',
    title: 'Extras',
    contents: 'The existing “More to come!” placeholder.',
    interaction: 'This remains a destination in the current picker.',
  },
];

/** Translate only captured navigation controls into prototype transitions. */
export function navigationTarget(label: string, currentScreen: string): string | undefined {
  const normalized = label.trim();
  if (normalized === 'Panel Grid') return currentScreen === 'picker' ? 'overview' : 'picker';
  if (normalized === 'Skills' && ['skills', 'actions'].includes(currentScreen)) return 'skills';
  if (normalized === 'Feats' && ['feats', 'features'].includes(currentScreen)) return 'feats';
  if (normalized === 'Information' && ['details', 'languages', 'proficiencies'].includes(currentScreen))
    return 'details';
  return screenMap.find((screen) => screen.title === normalized)?.id;
}
