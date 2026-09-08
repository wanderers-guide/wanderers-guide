import '@mantine/core/styles.css';
import { MantineProvider, createTheme } from '@mantine/core';
import { createRoot } from 'react-dom/client';
import { MobileSheetPrototype } from './MobileSheetPrototype';
import './prototype.css';

/** Neutral review controls surround the unmodified, captured character sheet. */
const theme = createTheme({ primaryColor: 'teal', defaultRadius: 'md', cursorType: 'pointer' });

createRoot(document.getElementById('root')!).render(
  <MantineProvider theme={theme} defaultColorScheme='dark'>
    <MobileSheetPrototype />
  </MantineProvider>
);
