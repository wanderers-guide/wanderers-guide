import {
  createTheme,
  DEFAULT_THEME,
  defaultVariantColorsResolver,
  parseThemeColor,
  rgba,
  v8CssVariablesResolver,
  type CSSVariablesResolver,
  type MantineColorsTuple,
  type MantineThemeOverride,
} from '@mantine/core';
import { IMPRINT_BG_COLOR, IMPRINT_BORDER_COLOR } from '@constants/data';
import { generateThemeColors } from '@utils/theme-color';
import { readableLightColor } from '@utils/foreground-color';
import type { ColorScheme } from '@atoms/appearance';

/** Keep the ten-shade contract explicit instead of casting an arbitrary array. */
function inkPalette(colors: MantineColorsTuple): MantineColorsTuple {
  return [
    readableLightColor(colors[0]),
    readableLightColor(colors[1]),
    readableLightColor(colors[2]),
    readableLightColor(colors[3]),
    readableLightColor(colors[4]),
    readableLightColor(colors[5]),
    readableLightColor(colors[6]),
    readableLightColor(colors[7]),
    readableLightColor(colors[8]),
    readableLightColor(colors[9]),
  ];
}

/** Foreground palettes are separate from neutral surfaces and filled controls. */
function createInkColors(scheme: ColorScheme, accentColors: MantineColorsTuple): Record<string, MantineColorsTuple> {
  const neutral: MantineColorsTuple =
    scheme === 'dark'
      ? [
          'rgba(248, 249, 250, 0.89)',
          'rgba(241, 243, 245, 0.85)',
          'rgba(233, 236, 239, 0.80)',
          'rgba(222, 226, 230, 0.75)',
          'rgba(206, 212, 218, 0.82)',
          'rgba(173, 181, 189, 0.77)',
          'rgba(134, 142, 150, 0.72)',
          'rgba(73, 80, 87, 0.67)',
          'rgba(52, 58, 64, 0.62)',
          'rgba(33, 37, 41, 0.57)',
        ]
      : ['#161e29', '#1b2431', '#222c3b', '#2c394b', '#344152', '#3d4b5c', '#414f61', '#445365', '#465569', '#48586c'];
  const darkInk: MantineColorsTuple =
    scheme === 'dark'
      ? [
          'rgba(193, 194, 197, 0.89)',
          'rgba(166, 167, 171, 0.85)',
          'rgba(144, 146, 150, 0.80)',
          'rgba(92, 95, 102, 0.75)',
          'rgba(55, 58, 64, 0.82)',
          'rgba(44, 46, 51, 0.77)',
          'rgba(37, 38, 43, 0.72)',
          'rgba(26, 27, 30, 0.67)',
          'rgba(20, 21, 23, 0.62)',
          'rgba(16, 17, 19, 0.57)',
        ]
      : neutral;
  const palettes: Record<string, MantineColorsTuple> = { text: neutral, darkInk };
  for (const [name, colors] of Object.entries({ ...DEFAULT_THEME.colors, guide: accentColors })) {
    if (name === 'gray' || name === 'dark') continue;
    palettes[name + 'Ink'] = scheme === 'dark' ? colors : inkPalette(colors);
  }
  return palettes;
}

/** Shared theme for app routes, standalone stat blocks, and the root error page. */
export function createAppTheme({
  scheme,
  accent,
  dyslexiaFontEnabled = false,
}: {
  scheme: ColorScheme;
  accent?: string;
  dyslexiaFontEnabled?: boolean;
}): MantineThemeOverride {
  const accentColors = generateThemeColors(accent);
  return createTheme({
    colors: {
      guide: accentColors,
      ...createInkColors(scheme, accentColors),
      // Dark scale: near-opaque at [0] → nearly transparent at [9]
      dark: [
        'rgba(193, 194, 197, 0.89)', // [0] lightest text / icons
        'rgba(166, 167, 171, 0.85)', // [1]
        'rgba(144, 146, 150, 0.80)', // [2]
        'rgba(92,  95,  102, 0.75)', // [3]
        'rgba(55,  58,  64,  0.82)', // [4] ← glass surfaces
        'rgba(44,  46,  51,  0.77)', // [5]
        'rgba(37,  38,  43,  0.72)', // [6] ← card bg
        'rgba(26,  27,  30,  0.67)', // [7] ← page bg
        'rgba(20,  21,  23,  0.62)', // [8]
        'rgba(16,  17,  19,  0.57)', // [9] darkest / most transparent
      ],

      // Native light controls need opaque neutral text and surfaces; preserve the original dark gray scale.
      gray:
        scheme === 'light'
          ? [
              '#f8f9fa',
              '#f1f3f5',
              '#e9ecef',
              '#dee2e6',
              '#ced4da',
              '#adb5bd',
              '#596779',
              '#3d4b5c',
              '#344152',
              '#2c394b',
            ]
          : [
              'rgba(248, 249, 250, 0.89)', // [0] near-white surfaces
              'rgba(241, 243, 245, 0.85)', // [1]
              'rgba(233, 236, 239, 0.80)', // [2]
              'rgba(222, 226, 230, 0.75)', // [3]
              'rgba(206, 212, 218, 0.82)', // [4] ← glass surfaces
              'rgba(173, 181, 189, 0.77)', // [5]
              'rgba(134, 142, 150, 0.72)', // [6] ← borders / muted text
              'rgba(73,  80,  87,  0.67)', // [7] ← body text
              'rgba(52,  58,  64,  0.62)', // [8]
              'rgba(33,  37,  41,  0.57)', // [9] darkest text
            ],
    },
    cursorType: 'pointer',
    primaryColor: 'guide',
    autoContrast: scheme === 'light',
    luminanceThreshold: scheme === 'light' ? 0.2 : DEFAULT_THEME.luminanceThreshold,
    variantColorResolver: (input) => {
      const resolved = defaultVariantColorsResolver(input);
      if (scheme !== 'light' || !['light', 'subtle', 'outline', 'transparent'].includes(input.variant)) return resolved;
      const parsed = parseThemeColor({
        color: input.color ?? input.theme.primaryColor,
        theme: input.theme,
        colorScheme: 'light',
      });
      if (!parsed.isThemeColor) return resolved;
      const role = parsed.color === 'gray' ? 'text' : parsed.color === 'dark' ? 'darkInk' : parsed.color + 'Ink';
      if (!input.theme.colors[role]) return resolved;
      const foreground = 'var(--mantine-color-' + role + '-' + (parsed.shade ?? 6) + ')';
      // Mantine 9 treats an explicit shade in the light variant as an opaque fill.
      // Keep these secondary controls pale so the foreground role stays readable.
      const lightFill =
        input.variant === 'light' && parsed.shade !== undefined
          ? {
              background: rgba(input.theme.colors[parsed.color][parsed.shade], 0.1),
              hover: rgba(input.theme.colors[parsed.color][parsed.shade], 0.16),
            }
          : {};
      return { ...resolved, ...lightFill, color: foreground, hoverColor: foreground };
    },
    defaultRadius: 'md',
    fontFamily: dyslexiaFontEnabled ? 'OpenDyslexicRegular, sans-serif' : 'Montserrat, sans-serif',
    fontFamilyMonospace: 'Ubuntu Mono, monospace',
    components: {
      Modal: {
        defaultProps: { removeScrollProps: { allowPinchZoom: true } },
        styles: {
          content: { backgroundColor: 'var(--reading-bg-color)' },
          header: { backgroundColor: 'var(--reading-bg-color)' },
        },
      },
      Drawer: {
        defaultProps: { removeScrollProps: { allowPinchZoom: true } },
        styles: {
          content: { backgroundColor: 'var(--reading-bg-color)' },
          header: { backgroundColor: 'var(--reading-bg-color)' },
        },
      },
      // Portaled controls remain above the app's existing modal and drawer layers.
      Popover: {
        defaultProps: { zIndex: 1500 },
        styles: { dropdown: { backgroundColor: 'var(--portal-bg-color)' } },
      },
      Menu: {
        defaultProps: { zIndex: 1500 },
        styles: { dropdown: { backgroundColor: 'var(--portal-bg-color)' } },
      },
      HoverCard: {
        defaultProps: { zIndex: 1500 },
        styles: { dropdown: { backgroundColor: 'var(--portal-bg-color)' } },
      },
      Tooltip: { defaultProps: { zIndex: 1500 } },
      Accordion: {
        vars: () => ({
          item: {
            '--item-filled-color': IMPRINT_BG_COLOR,
          },
        }),
        styles: {
          item: {
            borderColor: IMPRINT_BORDER_COLOR,
          },
        },
      },
      Slider: {
        styles: scheme === 'light' ? { markLabel: { color: 'var(--mantine-color-dimmed)' } } : {},
      },
      Badge: {
        // Resolve native filled colors even when a badge relies on its default variant.
        defaultProps: scheme === 'light' ? { variant: 'filled' } : undefined,
        styles: {
          label: { overflow: 'visible' },
        },
      },
      Tabs: {
        vars: () => ({
          tab: {
            '--tab-hover-color': IMPRINT_BG_COLOR,
          },
          list: {
            '--tab-border-color': IMPRINT_BG_COLOR,
          },
        }),
      },
      Stepper: {
        vars: () => ({
          root: {
            '--stepper-outline-color': IMPRINT_BG_COLOR,
          },
        }),
      },
      Divider: {
        vars: () => ({
          root: {
            '--divider-color': IMPRINT_BORDER_COLOR,
          },
        }),
      },
      RichTextEditor: {
        styles: scheme === 'light' ? { root: { backgroundColor: 'var(--reading-bg-color)' } } : undefined,
        vars: () => ({
          root: {
            borderColor: IMPRINT_BORDER_COLOR,
          },
          toolbar: {
            borderColor: IMPRINT_BORDER_COLOR,
          },
        }),
      },
      Notification: {
        styles: {
          root: { backgroundColor: 'var(--portal-bg-color)' },
          ...(scheme === 'light'
            ? { title: { color: 'var(--mantine-color-text)' }, description: { color: 'var(--mantine-color-dimmed)' } }
            : {}),
        },
      },
    },
  });
}

/** Native light and dark component variables plus the app's reading-surface roles. */
export const appCssVariablesResolver: CSSVariablesResolver = (theme) => {
  const v8 = v8CssVariablesResolver(theme);
  return {
    variables: { ...v8.variables },
    light: {
      ...v8.light,
      '--mantine-color-anchor': 'var(--mantine-color-guideInk-7)',
      '--mantine-color-error': 'var(--mantine-color-redInk-7)',
      '--mantine-color-text': 'rgb(34, 44, 59)',
      '--mantine-color-dimmed': 'rgb(72, 88, 108)',
      '--mantine-color-body': 'rgb(231, 237, 244)',
    },
    dark: {
      ...v8.dark,
      '--mantine-color-text': 'rgb(202, 202, 202)',
      '--mantine-color-dimmed': 'rgb(200, 200, 200)',
      '--mantine-color-body': 'rgba(26, 27, 30, 1)',
    },
  };
};
