import { num, pct, truncate } from '../../src/analytics/format.js';
import {
  formatBarChart,
  formatPlainTable,
  formatPrettyTable,
  resolveFormat,
} from '../../src/analytics/output.js';
import * as helpers from '../../src/helpers.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('num', () => {
  it('formats numbers with locale separators', () => {
    expect(num(0)).toBe('0');
    expect(num(1234)).toBe('1,234');
    expect(num(1000000)).toBe('1,000,000');
  });
});

describe('pct', () => {
  it('returns percentage string', () => {
    expect(pct(1, 4)).toBe('25.0%');
    expect(pct(1, 3)).toBe('33.3%');
  });

  it('returns dash when total is zero', () => {
    expect(pct(0, 0)).toBe('\u2014');
  });
});

describe('truncate', () => {
  it('returns short strings unchanged', () => {
    expect(truncate('hello', 10)).toBe('hello');
  });

  it('truncates long strings with ellipsis', () => {
    expect(truncate('hello world', 6)).toBe('hello\u2026');
  });

  it('returns string unchanged when exactly at max', () => {
    expect(truncate('hello', 5)).toBe('hello');
  });
});

describe('formatPrettyTable', () => {
  it('returns dim message for empty rows', () => {
    const result = formatPrettyTable(['A', 'B'], []);
    expect(result).toContain('No data found');
  });

  it('formats headers and rows with aligned columns', () => {
    const result = formatPrettyTable(
      ['Name', 'Count'],
      [
        ['foo', '10'],
        ['barbaz', '5'],
      ]
    );
    const lines = result.split('\n');
    expect(lines).toHaveLength(4);
    expect(lines[2]).toContain('foo');
    expect(lines[3]).toContain('barbaz');
  });
});

describe('formatPlainTable', () => {
  it('returns empty string for empty rows', () => {
    expect(formatPlainTable(['A', 'B'], [])).toBe('');
  });

  it('formats with tab separation and uppercase headers', () => {
    const result = formatPlainTable(
      ['Name', 'Count'],
      [
        ['foo', '10'],
        ['bar', '5'],
      ]
    );
    const lines = result.split('\n');
    expect(lines[0]).toContain('NAME');
    expect(lines[0]).toContain('\t');
    expect(lines[1]).toContain('foo');
  });
});

describe('resolveFormat', () => {
  it('returns json when AI mode is active', () => {
    vi.spyOn(helpers, 'isAI').mockReturnValue(true);
    expect(resolveFormat({})).toBe('json');
  });

  it('returns specified format', () => {
    vi.spyOn(helpers, 'isAI').mockReturnValue(true);
    expect(resolveFormat({ format: 'plain' })).toBe('plain');
    expect(resolveFormat({ format: 'json' })).toBe('json');
    expect(resolveFormat({ format: 'graph' })).toBe('graph');
  });

  it('defaults to plain', () => {
    vi.spyOn(helpers, 'isAI').mockReturnValue(false);
    expect(resolveFormat({})).toBe('plain');
  });
});

describe('formatBarChart', () => {
  it('returns dim message for empty items', () => {
    expect(formatBarChart([])).toContain('No data found');
  });

  it('renders bars with labels and values', () => {
    const result = formatBarChart([
      { label: 'Foo', value: 10 },
      { label: 'Bar', value: 5 },
    ]);
    const lines = result.split('\n');
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain('Foo');
    expect(lines[0]).toContain('10');
    expect(lines[0]).toContain('\u2588');
    expect(lines[1]).toContain('Bar');
    expect(lines[1]).toContain('5');
  });

  it('scales bars relative to max value', () => {
    const result = formatBarChart([
      { label: 'Big', value: 100 },
      { label: 'Small', value: 10 },
    ]);
    const bigBar = result.split('\n')[0]!;
    const smallBar = result.split('\n')[1]!;
    const bigBlocks = (bigBar.match(/\u2588/g) || []).length;
    const smallBlocks = (smallBar.match(/\u2588/g) || []).length;
    expect(bigBlocks).toBeGreaterThan(smallBlocks);
  });
});
