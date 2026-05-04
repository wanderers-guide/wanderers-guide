export function num(n: number): string {
  return n.toLocaleString('en-US');
}

export function pct(n: number, total: number): string {
  if (total === 0) return '\u2014';
  return ((n / total) * 100).toFixed(1) + '%';
}

export function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + '\u2026';
}
