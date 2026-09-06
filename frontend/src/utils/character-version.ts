/**
 * Compare server timestamps without losing PostgreSQL's sub-millisecond precision.
 * Unknown/opaque tokens are unordered; equality guards still use their original text.
 */
export function compareCharacterVersions(left?: string, right?: string): -1 | 0 | 1 | null {
  const parse = (value?: string): { milliseconds: number; remainder: string } | null => {
    if (!value) return null;
    const match = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.(\d{1,9}))?(?:Z|[+-]\d{2}:?\d{2})$/i.exec(value);
    const milliseconds = Date.parse(value);
    if (!match || !Number.isFinite(milliseconds)) return null;
    return { milliseconds, remainder: (match[1] ?? '').padEnd(9, '0').slice(3) };
  };
  const first = parse(left);
  const second = parse(right);
  if (!first || !second) return null;
  if (first.milliseconds !== second.milliseconds) return first.milliseconds < second.milliseconds ? -1 : 1;
  if (first.remainder === second.remainder) return 0;
  return first.remainder < second.remainder ? -1 : 1;
}
