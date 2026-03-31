import Color from 'colorjs.io';


export function glassStyle(options?: { bg?: boolean; border?: boolean }) {
  return {
    backdropFilter: 'blur(16px) saturate(180%)',
    WebkitBackdropFilter: 'blur(16px) saturate(180%)',
    ...(options?.bg ? { backgroundColor: 'var(--glass-bg-color)' } : {}),
    ...(options?.border ? { border: '1px solid var(--glass-border-color)', borderRadius: '12px' } : {}),
  };
}
// import tinycolor from 'tinycolor2';

export function interpolateHealth(percentage: number) {
  const green = new Color('p3', [0, 0.9, 0.35]);
  const red = new Color('p3', [0.95, 0.25, 0.25]);
  let redgreen = green.range(red, {
    space: 'hsv',
    outputSpace: 'srgb',
  });
  return redgreen(1 - percentage).toString();
}
