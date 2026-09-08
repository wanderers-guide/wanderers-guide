/** CSS compositing checks shared by the manual visual suites. */
function luminance(rgb: number[]): number {
  const linear = rgb.map((channel) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}

function rgba(value: string): number[] {
  const channels = value.match(/[\d.]+/g)?.map(Number) ?? [];
  return [channels[0], channels[1], channels[2], channels[3] ?? 1];
}

export function contrastOf(element: Element, win: Window): number {
  const foreground = rgba(win.getComputedStyle(element).color);
  expect(foreground[3], 'opaque text').to.equal(1);
  const layers: number[][] = [];
  for (let ancestor: Element | null = element; ancestor; ancestor = ancestor.parentElement) {
    layers.unshift(rgba(win.getComputedStyle(ancestor).backgroundColor));
  }
  const background = layers.reduce(
    (under, over) => over.slice(0, 3).map((channel, i) => channel * over[3] + under[i] * (1 - over[3])),
    [255, 255, 255]
  );
  const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}
