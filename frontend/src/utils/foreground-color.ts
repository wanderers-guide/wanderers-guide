import Color from 'colorjs.io';

/** Readable ink over pale glass, including darker nested imprint panels over illustrations. */
export function readableLightColor(color: string, surfaceColor = 'rgb(160, 166, 172)'): string {
  const ink = new Color(color).to('oklch');
  ink.alpha = 1;
  const surface = new Color(surfaceColor);
  let rendered = ink.to('srgb').toGamut();
  // Check the actual sRGB output: gamut mapping can change contrast for saturated colors.
  while (rendered.contrast(surface, 'WCAG21') < 4.55 && ink.oklch.l > 0) {
    ink.oklch.l = Math.max(0, ink.oklch.l - 0.02);
    rendered = ink.to('srgb').toGamut();
  }
  return rendered.toString({ format: 'rgb' });
}
