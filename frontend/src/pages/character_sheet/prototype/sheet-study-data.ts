import { z } from 'zod';
import rawDescriptions from './study-descriptions.json';
import {
  IconBackpack,
  IconBook2,
  IconHeart,
  IconNotes,
  IconPaw,
  IconSparkles,
  IconSwords,
  IconUser,
  IconWand,
} from '@tabler/icons-react';

/** Destinations follow the existing mobile picker; nested tabs share their parent selection. */
export const sheetDestinations = [
  { id: 'overview', label: 'Health, Attributes, Saves', icon: IconHeart },
  { id: 'skills', label: 'Skills & Actions', icon: IconSwords },
  { id: 'feats', label: 'Feats & Features', icon: IconBook2 },
  { id: 'inventory', label: 'Inventory', icon: IconBackpack },
  { id: 'spells', label: 'Spells', icon: IconWand },
  { id: 'notes', label: 'Notes', icon: IconNotes },
  { id: 'details', label: 'Details', icon: IconUser },
  { id: 'companions', label: 'Companions', icon: IconPaw },
  { id: 'extras', label: 'Extras', icon: IconSparkles },
] as const;

export const studyScreens = [
  {
    value: 'overview',
    label: 'Overview',
    change: 'Separate cards, opaque text, and a little more of the artwork showing through.',
  },
  { value: 'skills', label: 'Skills', change: 'Consistent rows, readable ranks, and room for long skill names.' },
  {
    value: 'actions',
    label: 'Actions / Abilities',
    change: 'Full-width search, a separate action filter row, and weapon stats below each name.',
  },
  {
    value: 'feats',
    label: 'Feats',
    change: 'Shared group styling, wrapping names, and readable level and action markers.',
  },
  {
    value: 'features',
    label: 'Features',
    change: 'The same group and row styles as feats. Search covers both categories.',
  },
  {
    value: 'inventory',
    label: 'Inventory',
    change: 'Full item names, weapon summaries on their own line, and separate equipment buttons.',
  },
  {
    value: 'spells',
    label: 'Spells',
    change: 'Clear casting stats and slot controls, with consistent rank separators.',
  },
  {
    value: 'notes',
    label: 'Notes',
    change:
      'A stable reading surface, a compact editor toolbar, and page controls above the text. Uses illustrative local notes.',
  },
  {
    value: 'details',
    label: 'Details / Information',
    change: 'Quieter nested navigation and one consistent treatment for labels and editable fields.',
  },
  {
    value: 'languages',
    label: 'Languages',
    change: 'Wrapping language and trait buttons without extra glass containers.',
  },
  {
    value: 'proficiencies',
    label: 'Proficiencies',
    change: 'Expandable categories and clearly labeled proficiency ranks.',
  },
  {
    value: 'companions',
    label: 'Companions',
    change: 'A compact companion card with separate details and removal targets.',
  },
  { value: 'extras', label: 'Extras', change: 'A quiet placeholder. No new game features are introduced.' },
] as const;
export type GlassScreen = (typeof studyScreens)[number]['value'];
export function isGlassScreen(value: string | null): value is GlassScreen {
  return studyScreens.some((screen) => screen.value === value);
}
export function parentScreen(screen: GlassScreen): GlassScreen {
  if (screen === 'actions') return 'skills';
  if (screen === 'features') return 'feats';
  if (screen === 'languages' || screen === 'proficiencies') return 'details';
  return screen;
}

export type StudyEntry = { name: string; level?: number; actions?: string; summary?: string; description?: string };
export type StudyGroup = { name: string; entries: StudyEntry[] };

/** First paragraphs from the sanitized content dump, for local drawer typography only. */
export const studyDescriptions = z.record(z.string(), z.object({ description: z.string() })).parse(rawDescriptions);

/** Names and displayed values are from the captured Kip sheet. Prose below is from data/data.sql. */
export const weapons: StudyEntry[] = [
  { name: 'Awakened Animal Claw', actions: '1', summary: '+6 attack · 1d4 + 1 S' },
  {
    name: 'Bastard Sword',
    actions: '1',
    summary: '+1 attack · 1d8 + 1 S',
    description:
      'This broad-bladed sword, sometimes called the hand-and-a-half sword, has a longer grip so it can be held in one hand or used with two hands to provide extra slashing power.',
  },
  { name: 'Club', actions: '1', summary: '+6 attack · 1d6 + 1 B' },
  { name: 'Fist', actions: '1', summary: '+6 attack · 1d4 + 1 B' },
];
export const featGroups: StudyGroup[] = [
  {
    name: 'Class Feats',
    entries: [
      { name: 'Curse of Turbulent Moments' },
      { name: 'Nudge the Scales', level: 1, actions: '1' },
      { name: 'Oracular Warning', level: 1, actions: '4' },
    ],
  },
  {
    name: 'Ancestry Feats',
    entries: [
      { name: 'Fascinated by Society', level: 1 },
      { name: "You're so Cute!", level: 1 },
    ],
  },
  {
    name: 'General & Skill Feats',
    entries: [
      {
        name: 'Impressive Performance',
        level: 1,
        description:
          'Your performances inspire admiration and win you fans. You can Make an Impression using Performance instead of Diplomacy. If you spend at least 10 minutes performing in front of an audience, you can Make an Impression targeting up to 10 members of the audience who were there for the whole performance, without taking the normal penalty. The number of targets increases to 20 for a 1-hour performance and 50 for a 2-hour performance.',
      },
      { name: 'Predict Weather', level: 2 },
      { name: 'Ancestral Paragon', level: 3 },
    ],
  },
  { name: 'Other Feats', entries: [{ name: 'Awakened Animal Attacks' }, { name: 'Mystery of Time', level: 1 }] },
];
export const featureGroups: StudyGroup[] = [
  {
    name: 'Class Features',
    entries: [
      { name: 'Mystery', level: 1 },
      { name: 'Oracle Spellcasting', level: 1 },
      { name: 'Spell Repertoire (Oracle)', level: 1 },
      { name: 'Signature Spells (Oracle)', level: 3 },
    ],
  },
  { name: 'Heritage', entries: [{ name: 'Climbing Animal' }] },
  { name: 'Ancestry Features', entries: [{ name: 'Awakened Form' }, { name: 'Awakened Mind' }] },
];

export type StudyNote = { id: string; title: string; content: string };
export const initialNotes: StudyNote[] = [
  {
    id: 'journal',
    title: 'Journey notes',
    content:
      '<h3>The road ahead</h3><p>Meet the others at the old bridge before sunrise. Bring the <strong>spyglass</strong> and check the weather before we leave.</p><h4>Things to remember</h4><ul><li>Ask the innkeeper about the northern road.</li><li>Find a quiet place for Badger to rest.</li><li>Keep an eye on the treeline.</li></ul><blockquote>Take the longer path if the river is still rising.</blockquote>',
  },
];
