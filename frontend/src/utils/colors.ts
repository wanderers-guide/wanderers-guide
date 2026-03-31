import Color from 'colorjs.io';

export const GLASS_BG_COLOR = 'rgba(21, 24, 35, 0.75)';

export function glassStyle(options?: { bg?: boolean; border?: boolean }) {
  return {
    backdropFilter: 'blur(16px) saturate(180%)',
    WebkitBackdropFilter: 'blur(16px) saturate(180%)',
    ...(options?.bg ? { backgroundColor: GLASS_BG_COLOR } : {}),
    ...(options?.border ? { border: '1px solid rgba(255, 255, 255, 0.125)', borderRadius: '12px' } : {}),
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

// export function getShadesFromColor(color: string) {
//   let lightShades = [];
//   let darkShades = [];

//   for (let i = 0; i < 3; i++) {
//     let shade = tinycolor(color)
//       .lighten(i * 3)
//       .toString();
//     lightShades.push(shade);
//   }
//   for (let i = 0; i < 7; i++) {
//     let shade = tinycolor(color)
//       .darken(i * 3)
//       .toString();
//     darkShades.push(shade);
//   }

//   return [...lightShades, color, ...darkShades];
// }
