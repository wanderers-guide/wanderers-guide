import type { Link, PhrasingContent, Root, RootContent, Text } from 'mdast';

type ConditionLinkOptions = {
  conditions: string[];
  persistentDamage: boolean;
};
type TextSpan = { node: Text; start: number; end: number };
type ConditionRange = { start: number; end: number; condition: string };

/** Link condition prose after Markdown parsing, never inside authored links or code. */
export function remarkConditionLinks(options: ConditionLinkOptions): (tree: Root) => void {
  const names = options.conditions.map((name: string) => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const conditions = names.length ? new RegExp(`\\b(${names.join('|')})\\b`, 'g') : null;

  return (tree: Root): void => {
    const visit = (node: Root | RootContent): void => {
      if (node.type === 'paragraph' || node.type === 'heading' || node.type === 'tableCell') {
        node.children = linkInlineConditions(node.children, conditions, options.persistentDamage);
      } else if ('children' in node) {
        for (const child of node.children) visit(child);
      }
    };
    visit(tree);
  };
}

/** Read emphasis and trait labels while treating code, external links and images as boundaries. */
function linkInlineConditions(
  children: PhrasingContent[],
  conditions: RegExp | null,
  persistentDamage: boolean
): PhrasingContent[] {
  const spans: TextSpan[] = [];
  const ranges = new Map<Text, ConditionRange[]>();
  let prose = '';
  const flatten = (nodes: PhrasingContent[]): void => {
    for (const node of nodes) {
      if (node.type === 'text') {
        spans.push({ node, start: prose.length, end: prose.length + node.value.length });
        prose += node.value;
      } else if (node.type === 'emphasis' || node.type === 'strong' || node.type === 'delete') {
        flatten(node.children);
      } else if (node.type === 'link' && /^link_trait_\d+$/.test(node.url)) {
        prose += traitLabel(node.children);
      } else {
        prose += '\u0000';
      }
    }
  };
  flatten(children);

  const addRange = (start: number, end: number, condition: string): void => {
    const span = spans.find((candidate: TextSpan) => candidate.start <= start && candidate.end >= end);
    if (!span) return;
    const selected = ranges.get(span.node) ?? [];
    selected.push({ start: start - span.start, end: end - span.start, condition });
    ranges.set(span.node, selected);
  };
  if (persistentDamage) {
    const damagePhrase = /\bpersistent (?:\w+(?:(?:,\s*(?:(?:and|or)\s+)?|\s+(?:and|or)\s+)\w+)*\s+)?damage\b/gi;
    for (const match of prose.matchAll(damagePhrase)) {
      const start = match.index;
      const end = start + match[0].length;
      const shorthand = prose.slice(0, start).match(/\bpersistent bleed\s+(?:and|or)\s+$/i);
      if (shorthand?.index !== undefined) {
        addRange(shorthand.index, shorthand.index + 'persistent bleed'.length, 'persistent damage');
      }
      if (spans.some((span: TextSpan) => span.start <= start && span.end >= end)) {
        addRange(start, end, 'persistent damage');
      } else {
        addRange(start, start + 'persistent'.length, 'persistent damage');
        addRange(end - 'damage'.length, end, 'persistent damage');
      }
    }
  }
  if (conditions) {
    for (const span of spans) {
      for (const match of span.node.value.matchAll(conditions)) {
        const selected = ranges.get(span.node) ?? [];
        const start = match.index;
        const end = start + match[0].length;
        if (selected.some((range: ConditionRange) => range.start < end && range.end > start)) continue;
        selected.push({ start, end, condition: match[0] });
        ranges.set(span.node, selected);
      }
    }
  }

  const replace = (nodes: PhrasingContent[]): PhrasingContent[] =>
    nodes.flatMap((node: PhrasingContent): PhrasingContent[] => {
      if (node.type === 'emphasis' || node.type === 'strong' || node.type === 'delete') {
        return [{ ...node, children: replace(node.children) }];
      }
      if (node.type !== 'text' || !ranges.has(node)) return [node];
      const output: PhrasingContent[] = [];
      let cursor = 0;
      for (const range of (ranges.get(node) ?? []).sort((a: ConditionRange, b: ConditionRange) => a.start - b.start)) {
        if (range.start > cursor) output.push({ type: 'text', value: node.value.slice(cursor, range.start) });
        const link: Link = {
          type: 'link',
          url: `link_condition_${range.condition.replaceAll(' ', '~')}`,
          children: [{ type: 'text', value: node.value.slice(range.start, range.end) }],
        };
        output.push(link);
        cursor = range.end;
      }
      if (cursor < node.value.length) output.push({ type: 'text', value: node.value.slice(cursor) });
      return output;
    });
  return replace(children);
}

/** Only existing trait labels may participate in a phrase crossing an authored link. */
function traitLabel(children: PhrasingContent[]): string {
  return children
    .map((node: PhrasingContent): string => {
      if (node.type === 'text') return node.value;
      if (node.type === 'emphasis' || node.type === 'strong' || node.type === 'delete')
        return traitLabel(node.children);
      return '\u0000';
    })
    .join('');
}
