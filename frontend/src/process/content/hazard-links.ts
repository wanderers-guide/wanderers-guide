import { fetchAbilityBlockByName, fetchCreatureByName, fetchSpellByName, fetchTraitByName } from './content-store';
import { convertToHardcodedLink } from './hardcoded-links';
import { Hazard } from '@schemas/content';

type HazardReference = {
  type: 'spell' | 'action' | 'trait' | 'creature';
  name: string;
  pattern: RegExp;
};

const HAZARD_REFERENCES: HazardReference[] = [
  { type: 'spell', name: 'gust of wind', pattern: /\bgust of wind\b/gi },
  { type: 'spell', name: 'thunderstrike', pattern: /\bthunderstrike\b/gi },
  { type: 'spell', name: 'blazing bolt', pattern: /\bblazing bolt\b/gi },
  { type: 'spell', name: 'spider sting', pattern: /\bspider sting\b/gi },
  { type: 'spell', name: 'shatter', pattern: /\bshatter\b/gi },
  { type: 'spell', name: 'hydraulic push', pattern: /\bhydraulic push\b/gi },
  { type: 'action', name: 'Strike', pattern: /\bStrikes?\b/g },
  { type: 'action', name: 'Fly', pattern: /\b(?:Fly|Flies)\b/g },
  { type: 'creature', name: 'Agyra', pattern: /\bAgyra\b/g },
  { type: 'creature', name: 'Verex-That-Was', pattern: /\bVerex-That-Was\b/g },
  { type: 'creature', name: 'Oliphaunt of Jandelay', pattern: /\bOliphaunt(?: of Jandelay)?\b/g },
  { type: 'trait', name: 'air', pattern: /\bair\b/gi },
  { type: 'trait', name: 'electricity', pattern: /\belectricity\b/gi },
  { type: 'trait', name: 'fire', pattern: /\bfire\b/gi },
  { type: 'trait', name: 'poison', pattern: /\bpoison\b/gi },
  { type: 'trait', name: 'sonic', pattern: /\bsonic\b/gi },
  { type: 'trait', name: 'spirit', pattern: /\bspirit\b/gi },
  { type: 'trait', name: 'water', pattern: /\bwater\b/gi },
  { type: 'trait', name: 'primal', pattern: /\bprimal\b/gi },
  { type: 'trait', name: 'vitality', pattern: /\bvitality\b/gi },
  { type: 'trait', name: 'unholy', pattern: /\bunholy\b/gi },
];

/** Resolve only named references present in this hazard, without delaying its stat block. */
export async function preloadHazardReferences(hazard: Hazard): Promise<boolean> {
  const details = hazard.details;
  const prose = [
    details.stealth,
    details.description,
    details.disable,
    details.defenses?.immunities,
    details.activation.name,
    ...(details.activation.traits ?? []),
    details.activation.trigger,
    details.activation.effect,
    details.routine?.text,
    details.reset,
  ]
    .filter((part): part is string => typeof part === 'string')
    .join('\n');

  const missing = HAZARD_REFERENCES.filter(
    ({ type, name, pattern }) => prose.match(pattern) && convertToHardcodedLink(type, name) === name
  );
  await Promise.allSettled(
    missing.map(({ type, name }) => {
      if (type === 'spell') return fetchSpellByName(name, 'ALL-OFFICIAL-PUBLIC');
      if (type === 'action') return fetchAbilityBlockByName(name, 'ALL-OFFICIAL-PUBLIC');
      if (type === 'creature') return fetchCreatureByName(name, 'ALL-OFFICIAL-PUBLIC');
      return fetchTraitByName(name, 'ALL-OFFICIAL-PUBLIC');
    })
  );
  return true;
}

/** Link each occurrence of a confirmed hazard reference using the content cache. */
export function linkHazardReferences(text: string): string {
  return HAZARD_REFERENCES.reduce(
    (linkedText, { type, name, pattern }) =>
      linkedText.replace(pattern, (displayText) => convertToHardcodedLink(type, name, displayText)),
    text
  );
}
