import '@mantine/core/styles.css';
import { MantineProvider, createTheme } from '@mantine/core';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { GlassComparison } from './GlassComparison';
import './prototype.css';

/** Neutral review controls surround the unmodified, captured character sheet. */
const theme = createTheme({ primaryColor: 'teal', defaultRadius: 'md', cursorType: 'pointer' });

createRoot(document.getElementById('root')!).render(
  <MantineProvider theme={theme} defaultColorScheme='dark'>
    <BrowserRouter>
      <GlassComparison />
    </BrowserRouter>
  </MantineProvider>
);
