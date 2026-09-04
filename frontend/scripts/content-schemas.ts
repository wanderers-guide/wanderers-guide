import { z } from 'zod';
import {
  AbilityBlockSchema,
  AncestrySchema,
  ArchetypeSchema,
  BackgroundSchema,
  ClassArchetypeSchema,
  ClassSchema,
  ContentSourceSchema,
  CreatureSchema,
  ItemSchema,
  LanguageSchema,
  SpellSchema,
  TraitSchema,
  VersatileHeritageSchema,
} from '../src/schemas/content';

/** Shared registry for the file validator and read-only database audit. */
export const CONTENT_SCHEMAS: Record<string, z.ZodTypeAny> = {
  trait: TraitSchema,
  item: ItemSchema,
  spell: SpellSchema,
  class: ClassSchema,
  archetype: ArchetypeSchema,
  'versatile-heritage': VersatileHeritageSchema,
  'class-archetype': ClassArchetypeSchema,
  'ability-block': AbilityBlockSchema,
  creature: CreatureSchema,
  ancestry: AncestrySchema,
  background: BackgroundSchema,
  language: LanguageSchema,
  'content-source': ContentSourceSchema,
};
