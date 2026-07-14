/**
 * Validate a JSON object against a Wanderer's Guide content Zod schema.
 *
 * Pass the content type as the first argument and the JSON on stdin, or give a
 * file path as the second argument. Prints VALID, or INVALID plus the Zod errors
 * (same formatting the app logs). If the JSON is an array, each element is checked.
 *
 * Exit code: 0 = all valid, 1 = something invalid, 2 = bad usage / unparseable JSON.
 *
 *   echo '{"id":1, ...}' | npm run validate:content -- spell
 *   npm run validate:content -- spell ./some-spell.json
 */

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
import { formatZodError } from '../src/schemas/shared';
import { readFileSync } from 'node:fs';

const SCHEMAS: Record<string, z.ZodTypeAny> = {
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

const type = process.argv[2];
const file = process.argv[3];
const schema = SCHEMAS[type];

if (!schema) {
  console.error('Usage: validate:content <type> [file.json]   (JSON is read from stdin if no file)');
  console.error(`Types: ${Object.keys(SCHEMAS).join(', ')}`);
  process.exit(2);
}

let raw: string;
try {
  // fd 0 = stdin, so `echo '{...}' | ... ` works with no file argument.
  raw = readFileSync(file ?? 0, 'utf8');
} catch (e) {
  console.error(`Could not read ${file ?? 'stdin'}: ${(e as Error).message}`);
  process.exit(2);
}

let data: unknown;
try {
  data = JSON.parse(raw);
} catch (e) {
  console.error(`Not valid JSON: ${(e as Error).message}`);
  process.exit(2);
}

const items = Array.isArray(data) ? data : [data];
let anyInvalid = false;

items.forEach((item, i) => {
  const label = Array.isArray(data) ? `[${i}] ` : '';
  const result = schema.safeParse(item);
  if (result.success) {
    console.log(`${label}VALID`);
  } else {
    anyInvalid = true;
    console.log(`${label}INVALID: ${formatZodError(item, result.error)}`);
  }
});

process.exit(anyInvalid ? 1 : 0);
