import type { ColorScheme } from '@atoms/appearance';
import { readableLightColor } from '@utils/foreground-color';
import Color from 'colorjs.io';
import type { CSSProperties } from 'react';

/** Applies the shared glass filter, with optional surface tint and border. */
export function glassStyle(options?: { bg?: boolean; border?: boolean }): CSSProperties {
  return {
    backdropFilter: 'var(--glass-backdrop-filter)',
    WebkitBackdropFilter: 'var(--glass-backdrop-filter)',
    ...(options?.bg ? { backgroundColor: 'var(--glass-bg-color)' } : {}),
    ...(options?.border ? { border: '1px solid var(--glass-border-color)', borderRadius: '12px' } : {}),
  };
}

/** Keep health hues readable on the viewer's selected reading surface. */
export function interpolateHealth(percentage: number, scheme: ColorScheme = 'dark'): string {
  const green = new Color('p3', [0, 0.9, 0.35]);
  const red = new Color('p3', [0.95, 0.25, 0.25]);
  let redgreen = green.range(red, {
    space: 'hsv',
    outputSpace: 'srgb',
  });
  const color = redgreen(1 - percentage).toString();
  return scheme === 'light' ? readableLightColor(color) : color;
}
