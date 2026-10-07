import { ContentEntryPrintingSchema, ContentSourcePrintingSchema } from '@schemas/content';
import type { ContentSourcePrinting, ContentType } from '@schemas/content';

type PrintingEntry = {
  id: number;
  content_source_id: number;
  type?: string;
  deprecated?: boolean | null;
  meta_data?: { printing?: unknown; deprecated?: boolean; unselectable?: boolean } | null;
};

type PrintingSource = {
  id: number;
  user_id: string | null;
  is_published: boolean;
  meta_data?: { printing?: unknown } | null;
};

/** Rank equivalent rules only when both entries carry explicit edition provenance. */
function comparePrintings(
  left: ContentSourcePrinting,
  leftEdition: string | undefined,
  right: ContentSourcePrinting,
  rightEdition: string | undefined
): number {
  if (!leftEdition || !rightEdition) return 0;
  if (leftEdition !== rightEdition) return leftEdition === 'REMASTER' ? 1 : -1;
  // Broad rulebooks outrank adventure reprints; setting books need no invented hierarchy.
  if (left.role === 'RULEBOOK' && right.role === 'ADVENTURE') return 1;
  if (left.role === 'ADVENTURE' && right.role === 'RULEBOOK') return -1;
  const dateOrder = left.published_on.localeCompare(right.published_on);
  if (dateOrder !== 0) return dateOrder;
  return left.book_key === right.book_key ? left.printing - right.printing : 0;
}

/**
 * Prefer reviewed official replacements among already eligible, enabled candidates.
 * Never load another source, rewrite an ID, mutate rows, or collapse names/levels.
 * Pinned books, explicit choices, unknown provenance, branches and cycles stay literal.
 */
export function selectPreferredPrintings<T extends PrintingEntry>(
  type: ContentType,
  entries: readonly T[],
  sources: readonly PrintingSource[],
  options: { sourceId?: number; preserveIds?: readonly number[] } = {}
): T[] {
  if (options.sourceId !== undefined || type === 'content-source') return [...entries];
  const rows = new Map(entries.map((entry) => [entry.id, entry]));
  if (rows.size !== entries.length) return [...entries];
  const sourceRows = new Map(sources.map((source) => [source.id, source]));
  if (sourceRows.size !== sources.length) return [...entries];
  const provenance = new Map<number, ContentSourcePrinting>();
  for (const source of sources) {
    if (source.user_id !== null || !source.is_published) continue;
    const parsed = ContentSourcePrintingSchema.safeParse(source.meta_data?.printing);
    if (parsed.success) provenance.set(source.id, parsed.data);
  }
  const invalidMetadata = new Set<number>();
  const metadata = new Map(
    entries.map((entry) => {
      const parsed = ContentEntryPrintingSchema.safeParse(entry.meta_data?.printing);
      if (entry.meta_data?.printing !== undefined && !parsed.success) invalidMetadata.add(entry.id);
      return [entry.id, parsed.success ? parsed.data : undefined];
    })
  );
  const references = new Map<number, Set<number>>();
  const preferred = new Map<number, Set<number>>();
  for (const entry of entries) {
    const printing = provenance.get(entry.content_source_id);
    if (
      !printing ||
      invalidMetadata.has(entry.id) ||
      entry.deprecated ||
      entry.meta_data?.deprecated ||
      entry.meta_data?.unselectable
    )
      continue;
    const edition = metadata.get(entry.id)?.rules_edition ?? printing.rules_edition;
    for (const replacement of metadata.get(entry.id)?.replaces ?? []) {
      const original = rows.get(replacement.id);
      if (
        !original ||
        invalidMetadata.has(original.id) ||
        replacement.type !== type ||
        original.content_source_id !== replacement.content_source_id ||
        entry.id === original.id ||
        entry.type !== original.type
      )
        continue;
      const originalPrinting = provenance.get(original.content_source_id);
      if (!originalPrinting) continue;
      const originalEdition = metadata.get(original.id)?.rules_edition ?? originalPrinting.rules_edition;
      const refs = references.get(entry.id) ?? new Set<number>();
      refs.add(original.id);
      references.set(entry.id, refs);
      const comparison =
        replacement.relationship === 'REMASTER'
          ? edition === 'REMASTER' && originalEdition === 'LEGACY'
            ? 1
            : 0
          : comparePrintings(printing, edition, originalPrinting, originalEdition);
      if (comparison === 0) continue;
      const loser = comparison > 0 ? original.id : entry.id;
      const winner = comparison > 0 ? entry.id : original.id;
      const successors = preferred.get(loser) ?? new Set<number>();
      successors.add(winner);
      preferred.set(loser, successors);
    }
  }
  // A contradictory reviewed-reference cycle must not be hidden by policy ranking.
  const cyclic = new Set<number>();
  const findCycles = (id: number, path: number[]): void => {
    const start = path.indexOf(id);
    if (start !== -1) {
      path.slice(start).forEach((member) => cyclic.add(member));
      return;
    }
    for (const next of references.get(id) ?? []) findCycles(next, [...path, id]);
  };
  for (const id of references.keys()) findCycles(id, []);
  const terminals = (id: number, path: Set<number>, output: Set<number>): boolean => {
    if (path.has(id) || cyclic.has(id)) return false;
    const next = preferred.get(id);
    if (!next?.size) {
      output.add(id);
      return true;
    }
    const visited = new Set([...path, id]);
    return [...next].every((successor) => terminals(successor, visited, output));
  };
  const preserved = new Set(options.preserveIds);
  return entries.filter((entry) => {
    if (preserved.has(entry.id) || !preferred.has(entry.id)) return true;
    const winners = new Set<number>();
    return !terminals(entry.id, new Set(), winners) || winners.size !== 1;
  });
}
