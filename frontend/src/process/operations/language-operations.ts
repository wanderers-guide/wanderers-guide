import { fetchContentAll, fetchContentById, getDefaultSources } from '@content/content-store';
import { Language } from '@schemas/content';
import { StoreID, VariableListStr, VariableValue } from '@schemas/variables';
import { adjVariable, getVariable, setVariable } from '@variables/variable-manager';
import { z } from 'zod';

export type LanguageOverride = {
  variable: 'LANGUAGE_IDS' | 'LANGUAGE_NAMES';
  values: string[];
};

const LanguageListSchema = z.array(z.string().trim().min(1));

/** Recognize explicit language overrides, rejecting malformed lists rather than treating them as a wipe. */
export function parseLanguageOverride(variable: string, value: VariableValue): LanguageOverride | undefined {
  if (variable !== 'LANGUAGE_IDS' && variable !== 'LANGUAGE_NAMES') return undefined;
  let input: unknown = value;
  if (typeof value === 'string') {
    try {
      input = JSON.parse(value);
    } catch {
      throw new Error(`${variable}: enter a JSON array of language ${variable === 'LANGUAGE_IDS' ? 'IDs' : 'names'}.`);
    }
  }
  const parsed = LanguageListSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(`${variable}: expected an array of nonempty strings; use [] to remove all languages.`);
  }
  return { variable, values: [...new Set(parsed.data)] };
}

/** Resolve the entire replacement before changing either list, preserving the current store if any entry is unknown. */
export async function resolveLanguageOverride(id: StoreID, override: LanguageOverride): Promise<Language[]> {
  if (override.values.length === 0) return [];
  if (override.variable === 'LANGUAGE_IDS') {
    return await Promise.all(
      override.values.map(async (value): Promise<Language> => {
        const languageId = Number(value);
        const language = Number.isSafeInteger(languageId)
          ? await fetchContentById<Language>('language', languageId)
          : null;
        if (!language)
          throw new Error(`Language ID "${value}" could not be resolved. The language override was not applied.`);
        return language;
      })
    );
  }
  const languages: Language[] = await fetchContentAll<Language>('language', getDefaultSources('PAGE'));
  const existingIds: string[] = getVariable<VariableListStr>(id, 'LANGUAGE_IDS')?.value ?? [];
  return override.values.map((name): Language => {
    const matches: Language[] = languages.filter((language) => language.name.toUpperCase() === name.toUpperCase());
    // Prefer an already-granted record when sources contain languages with the same name.
    const granted: Language[] = matches.filter((language) => existingIds.includes(`${language.id}`));
    if (granted.length === 1) return granted[0];
    if (matches.length === 1) return matches[0];
    if (matches.length === 0)
      throw new Error(`Language "${name}" could not be resolved. The language override was not applied.`);
    throw new Error(`More than one language is named "${name}". Use LANGUAGE_IDS to choose the intended record.`);
  });
}

/** Replace displayed membership and names used by conditions/exports together. */
export function replaceLanguages(id: StoreID, languages: Language[], source?: string): void {
  setVariable(
    id,
    'LANGUAGE_IDS',
    languages.map((language) => `${language.id}`),
    source
  );
  setVariable(
    id,
    'LANGUAGE_NAMES',
    languages.map((language) => language.name.toUpperCase()),
    source
  );
}

/** Keep direct grants and selected languages on the same membership update path. */
export function grantLanguage(id: StoreID, language: Pick<Language, 'id' | 'name'>, source?: string): void {
  adjVariable(id, 'LANGUAGE_IDS', `${language.id}`, source);
  adjVariable(id, 'LANGUAGE_NAMES', language.name.toUpperCase(), source);
}

/** Remove a known language from both membership and names without changing other grants. */
export function removeGrantedLanguage(id: StoreID, language: Language, source?: string): void {
  const ids: string[] = getVariable<VariableListStr>(id, 'LANGUAGE_IDS')?.value ?? [];
  const names: string[] = getVariable<VariableListStr>(id, 'LANGUAGE_NAMES')?.value ?? [];
  setVariable(
    id,
    'LANGUAGE_IDS',
    ids.filter((value) => value !== `${language.id}`),
    source
  );
  setVariable(
    id,
    'LANGUAGE_NAMES',
    names.filter((value) => value !== language.name.toUpperCase()),
    source
  );
}
