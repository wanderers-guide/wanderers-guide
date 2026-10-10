import { fetchAbilityBlockByName, fetchCreatureByName, fetchSpellByName, fetchTraitByName } from './content-store';
import { convertToHardcodedLink } from './hardcoded-links';
import { Hazard } from '@schemas/content';
import type { Link, PhrasingContent, Root, RootContent, Text } from 'mdast';

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

type HazardProseContext = { text: string; offsets: Map<Text, number> };
const TRAIT_LIST_LABELS = new Set([
  ...HAZARD_REFERENCES.filter(({ type }: HazardReference): boolean => type === 'trait').map(
    ({ name }: HazardReference): string => name
  ),
  'magical',
  'aura',
  'occult',
]);

/** Read formatted prose, but never protected labels; a WG trait href is only an opaque list slot. */
function hazardProseContext(children: PhrasingContent[]): HazardProseContext {
  const context: HazardProseContext = { text: '', offsets: new Map<Text, number>() };
  const collect = (nodes: PhrasingContent[]): void => {
    for (const node of nodes) {
      if (node.type === 'text') {
        context.offsets.set(node, context.text.length);
        context.text += node.value;
      } else if (node.type === 'emphasis' || node.type === 'strong' || node.type === 'delete') {
        collect(node.children);
      } else {
        context.text += node.type === 'link' && /^link_trait_\d+$/.test(node.url) ? '\u0001' : '\u0000';
      }
    }
  };
  collect(children);
  return context;
}

/** Disambiguate only Air/Spirit in the reviewed trait, damage, defense, and elemental-result contexts. */
function isEligibleHazardReference(name: string, prose: string, start: number, end: number): boolean {
  if (name !== 'air' && name !== 'spirit') return true;
  const before = prose.slice(0, start);
  const after = prose.slice(end);
  if (/^[\s-]+(?:traits?|effects?)\b/i.test(after)) return true;
  if (name === 'spirit' && /^[\s-]+damage\b/i.test(after)) return true;
  if (name === 'air' && /^\s*\(\s*gust of wind\s*\)/i.test(after)) return true;

  const open = before.lastIndexOf('(');
  const close = prose.indexOf(')', end);
  if (open > before.lastIndexOf(')') && close >= end && !prose.slice(start, close).includes('(')) {
    const leftEntry = prose
      .slice(open + 1, start)
      .split(',')
      .at(-1)
      ?.trim();
    const rightEntry = prose.slice(end, close).split(',')[0].trim();
    const entries = prose
      .slice(open + 1, close)
      .split(',')
      .map((entry: string): string => entry.trim().toLowerCase());
    if (
      !leftEntry &&
      !rightEntry &&
      entries.every((entry: string): boolean => entry === '\u0001' || TRAIT_LIST_LABELS.has(entry))
    )
      return true;
  }

  // Defense clauses cannot borrow a remote number or a qualifier across protected content.
  const clause = before.split(/[.;\n\u0000\u0001]/).at(-1) ?? '';
  const endsEntry = /^\s*(?:\d+\s*)?(?:[,;.]|$)/.test(after);
  if (
    endsEntry &&
    /\b(?:immune|immunity|immunities|resistant|resistance|resistances|weakness|weaknesses)\s+(?:to\s+)?$/i.test(clause)
  )
    return true;
  const defenseList = /\b(?:immunities|resistances|weaknesses)\s*:?\s*(.*)$/i.exec(clause)?.[1];
  if (endsEntry && defenseList !== undefined && /^(?:[^,]*,)*\s*$/.test(defenseList)) return true;
  return name === 'spirit' && /^\s*\d+\s*(?:,|[.;]|$)/.test(after) && /^(?:\s*[a-z-]+\s+\d+\s*,)*\s*$/i.test(clause);
}

/** Resolve only named references present in this hazard, without delaying its stat block. */
export async function preloadHazardReferences(hazard: Hazard): Promise<boolean> {
  const details = hazard.details;
  const prose = [
    details.stealth,
    details.description,
    details.disable,
    details.defenses?.immunities,
    details.defenses?.hp_note,
    details.defenses?.weaknesses,
    details.defenses?.resistances,
    ...(details.passive_abilities ?? []).map(({ text }) => text),
    details.activation.name,
    ...(details.activation.traits ?? []),
    details.activation.trigger,
    details.activation.requirements,
    details.activation.effect,
    details.routine?.text,
    ...(details.secondary_activities ?? []).flatMap((activity) => [
      ...(activity.traits ?? []),
      activity.trigger,
      activity.requirements,
      activity.effect,
    ]),
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

/** Link confirmed hazard references after Markdown parsing, without entering authored links or code. */
export function remarkHazardReferences(): (tree: Root) => void {
  return (tree: Root): void => {
    const visit = (node: Root | RootContent): void => {
      if (node.type === 'paragraph' || node.type === 'heading' || node.type === 'tableCell') {
        node.children = linkInlineHazardReferences(node.children);
      } else if ('children' in node) {
        for (const child of node.children) visit(child);
      }
    };
    visit(tree);
  };
}

/** Match every eligible prose occurrence while keeping authored and newly created links opaque. */
function linkInlineHazardReferences(
  children: PhrasingContent[],
  context: HazardProseContext = hazardProseContext(children)
): PhrasingContent[] {
  // Earlier reference passes split Text nodes. Keep each slice's original context offset.
  const slice = (node: Text, start: number, end: number = node.value.length): Text => {
    const part: Text = { type: 'text', value: node.value.slice(start, end) };
    context.offsets.set(part, context.offsets.get(node)! + start);
    return part;
  };
  return children.flatMap((node: PhrasingContent): PhrasingContent[] => {
    if (node.type === 'emphasis' || node.type === 'strong' || node.type === 'delete') {
      return [{ ...node, children: linkInlineHazardReferences(node.children, context) }];
    }
    if (node.type !== 'text') return [node];

    return HAZARD_REFERENCES.reduce<PhrasingContent[]>(
      (nodes, { type, name, pattern }) => {
        return nodes.flatMap((part: PhrasingContent): PhrasingContent[] => {
          if (part.type !== 'text') return [part];
          const output: PhrasingContent[] = [];
          let cursor = 0;
          for (const match of part.value.matchAll(pattern)) {
            const displayText = match[0];
            const start = context.offsets.get(part)! + match.index;
            if (!isEligibleHazardReference(name, context.text, start, start + displayText.length)) continue;
            const generated = convertToHardcodedLink(type, name, displayText);
            // Extract only the helper's generated href, never parse or rewrite authored Markdown.
            const href = generated === displayText ? undefined : /^\[[^\]]+\]\(([^)]+)\)$/.exec(generated)?.[1];
            if (!href) continue;
            if (match.index > cursor) output.push(slice(part, cursor, match.index));
            const link: Link = { type: 'link', url: href, children: [{ type: 'text', value: displayText }] };
            output.push(link);
            cursor = match.index + displayText.length;
          }
          if (cursor === 0) return [part];
          if (cursor < part.value.length) output.push(slice(part, cursor));
          return output;
        });
      },
      [node]
    );
  });
}
