import Color from 'colorjs.io';

export function interpolateHealth(percentage: number) {
  let color = new Color('p3', [0, 1, 0]);
  let redgreen = color.range('red', {
    space: 'hsv',
    outputSpace: 'srgb',
  });
  return redgreen(1 - percentage).toString();
}
