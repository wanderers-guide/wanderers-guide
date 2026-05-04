import Color from 'color';

export const WCAG_STANDARDS = {
  AA_NORMAL: 4.5,
  AA_LARGE: 3,
  AAA_NORMAL: 7,
  AAA_LARGE: 4.5,
} as const;

export type ContrastResult = {
  ratio: number;
  meetsAA: boolean;
  meetsAAA: boolean;
  recommendation: 'pass' | 'warning' | 'fail';
  message: string;
};

export function checkColorContrast(
  foreground: string,
  background: string,
  minThreshold: number = WCAG_STANDARDS.AA_NORMAL
): ContrastResult | null {
  try {
    const fg = Color(foreground);
    const bg = Color(background);

    const ratio = fg.contrast(bg);
    const level = fg.level(bg);

    const meetsAA = level === 'AA' || level === 'AAA';
    const meetsAAA = level === 'AAA';

    let recommendation: 'pass' | 'warning' | 'fail';
    let message: string;

    if (minThreshold !== WCAG_STANDARDS.AA_NORMAL) {
      if (ratio >= minThreshold) {
        recommendation = 'pass';
        message = `Contrast ratio: ${ratio.toFixed(
          2
        )}:1 (meets minimum threshold of ${minThreshold}:1)`;
      } else {
        recommendation = 'fail';
        message = `Poor contrast ratio: ${ratio.toFixed(
          2
        )}:1 (fails minimum threshold, required: ${minThreshold}:1)`;
      }
    } else {
      if (meetsAAA) {
        recommendation = 'pass';
        message = `Excellent contrast ratio: ${ratio.toFixed(2)}:1 (meets WCAG AAA)`;
      } else if (meetsAA) {
        recommendation = 'warning';
        message = `Good contrast ratio: ${ratio.toFixed(
          2
        )}:1 (meets WCAG AA, consider AAA for better accessibility)`;
      } else {
        recommendation = 'fail';
        message = `Poor contrast ratio: ${ratio.toFixed(2)}:1 (fails WCAG AA, minimum required: ${
          WCAG_STANDARDS.AA_NORMAL
        }:1)`;
      }
    }

    return {
      ratio,
      meetsAA,
      meetsAAA,
      recommendation,
      message,
    };
  } catch {
    return null;
  }
}

export interface AccessibilityCheckResult {
  primaryContrast: ContrastResult | null;
  lightContrast: ContrastResult | null;
  darkContrast: ContrastResult | null;
  darkOnLightContrast: ContrastResult | null;
  anchorResults: Array<{
    name: string;
    lightContrast: ContrastResult | null;
    darkContrast: ContrastResult | null;
  }>;
  overallScore: 'pass' | 'warning' | 'fail';
}

export function checkDocsColors(
  colors: {
    primary?: string;
    light?: string;
    dark?: string;
  },
  background: {
    lightHex: string;
    darkHex: string;
  },
  navigation?: {
    global?: {
      anchors?: Array<{
        anchor: string;
        color?: {
          light?: string;
          dark?: string;
        };
      }>;
    };
  }
): AccessibilityCheckResult {
  const lightBackground = background.lightHex;
  const darkBackground = background.darkHex;

  const primaryContrast = colors.primary
    ? checkColorContrast(colors.primary, lightBackground)
    : null;

  const lightContrast = colors.light ? checkColorContrast(colors.light, darkBackground) : null;

  const darkContrast = colors.dark ? checkColorContrast(colors.dark, darkBackground, 3) : null;

  const darkOnLightContrast = colors.dark
    ? checkColorContrast(colors.dark, lightBackground, 3)
    : null;

  const anchorResults: Array<{
    name: string;
    lightContrast: ContrastResult | null;
    darkContrast: ContrastResult | null;
  }> = [];

  if (navigation?.global?.anchors) {
    for (const anchor of navigation.global.anchors) {
      if (anchor.color) {
        const lightContrast = anchor.color.light
          ? checkColorContrast(anchor.color.light, lightBackground)
          : null;
        const darkContrast = anchor.color.dark
          ? checkColorContrast(anchor.color.dark, darkBackground)
          : null;

        anchorResults.push({
          name: anchor.anchor,
          lightContrast,
          darkContrast,
        });
      }
    }
  }

  const results = [
    primaryContrast,
    lightContrast,
    darkContrast,
    darkOnLightContrast,
    ...anchorResults.flatMap((anchor) => [anchor.lightContrast, anchor.darkContrast]),
  ].filter(Boolean);

  const hasFailure = results.some((result) => result!.recommendation === 'fail');
  const hasWarning = results.some((result) => result!.recommendation === 'warning');

  let overallScore: 'pass' | 'warning' | 'fail';
  if (hasFailure) {
    overallScore = 'fail';
  } else if (hasWarning) {
    overallScore = 'warning';
  } else {
    overallScore = 'pass';
  }

  return {
    primaryContrast,
    lightContrast,
    darkContrast,
    darkOnLightContrast,
    anchorResults,
    overallScore,
  };
}
