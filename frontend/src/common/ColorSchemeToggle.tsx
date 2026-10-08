import { colorSchemeAtom } from '@atoms/appearance';
import { ActionIcon, Tooltip } from '@mantine/core';
import { IconMoon, IconSun } from '@tabler/icons-react';
import { useAtom } from 'jotai';
import type { ReactNode } from 'react';

/** Switch the viewer's device appearance without writing character or account data. */
export function ColorSchemeToggle(): ReactNode {
  const [scheme, setScheme] = useAtom(colorSchemeAtom);
  const label = scheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
  return (
    <Tooltip label={label} withArrow>
      <ActionIcon
        variant='subtle'
        color='gray'
        radius='xl'
        size='md'
        aria-label={label}
        onClick={() => setScheme(scheme === 'dark' ? 'light' : 'dark')}
      >
        {scheme === 'dark' ? <IconSun size='1.1rem' stroke={1.5} /> : <IconMoon size='1.1rem' stroke={1.5} />}
      </ActionIcon>
    </Tooltip>
  );
}
