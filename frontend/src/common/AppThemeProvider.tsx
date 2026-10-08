import { colorSchemeAtom } from '@atoms/appearance';
import { MantineProvider } from '@mantine/core';
import { appCssVariablesResolver, createAppTheme } from '@utils/theme';
import { useAtomValue } from 'jotai';
import { useMemo, type ReactNode } from 'react';

/** All routes use one native theme, with optional character accent and font customization. */
export function AppThemeProvider({
  children,
  accent,
  dyslexiaFontEnabled = false,
}: {
  children: ReactNode;
  accent?: string;
  dyslexiaFontEnabled?: boolean;
}): ReactNode {
  const scheme = useAtomValue(colorSchemeAtom);
  const theme = useMemo(
    () => createAppTheme({ scheme, accent, dyslexiaFontEnabled }),
    [scheme, accent, dyslexiaFontEnabled]
  );
  return (
    <MantineProvider theme={theme} forceColorScheme={scheme} cssVariablesResolver={appCssVariablesResolver}>
      {children}
    </MantineProvider>
  );
}
