import '@mantine/core/styles.css';
import '@mantine/dropzone/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/spotlight/styles.css';
import '@mantine/tiptap/styles.css';
import '@mantine/carousel/styles.css';
import '@mantine/dates/styles.css';
import '@mantine/charts/styles.css';

import { AuthRouteWrapper } from '@auth/AuthedRouteWrapper.tsx';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import './index.css';
import { ErrorPage } from './pages/ErrorPage.tsx';
import { MantineProvider } from '@mantine/core';
import { supabase } from './supabase-client.ts';

const queryClient = new QueryClient();

// Re-exported for the many existing `import { supabase } from '../main'` call sites.
// The client itself lives in supabase-client.ts so modules that main.tsx transitively
// depends on (e.g. the request manager) can import it without a circular dependency.
export { supabase };

// One-time legacy cache cleanup.
//
// Earlier builds cleared ALL Cache Storage and unregistered the service worker on EVERY
// load. That defeated the workbox precache entirely, so the ~10 MB app bundle was
// re-downloaded from the network on every single visit. We keep a one-shot version of that
// cleanup so any client still carrying a stale SW / cache from that era gets flushed once,
// then never again — after that the precache (revisioned, with cleanupOutdatedCaches)
// serves instantly and handles per-deploy invalidation itself.
(async () => {
  const LEGACY_FLUSH_KEY = 'wg-legacy-cache-flushed-v1';
  try {
    if (localStorage.getItem(LEGACY_FLUSH_KEY)) return;
  } catch {
    return; // storage unavailable (private mode) — skip rather than wipe every load
  }
  try {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((r) => r.unregister()));
    }
  } catch {
    // best-effort; don't block app startup on cleanup
  } finally {
    try {
      localStorage.setItem(LEGACY_FLUSH_KEY, '1');
    } catch {
      /* ignore */
    }
  }
})();

// The DOM router for determining what pages are rendered at which paths
const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    errorElement: <ErrorPage />,
    children: [
      {
        Component: AuthRouteWrapper,
        children: [
          {
            path: 'characters',
            lazy: () => import('@pages/CharactersPage.tsx'),
          },
          {
            path: 'campaigns',
            lazy: () => import('@pages/CampaignsPage.tsx'),
          },
          {
            path: 'encounters',
            lazy: () => import('@pages/EncountersPage.tsx'),
          },
          {
            path: 'account',
            lazy: () => import('@pages/AccountPage.tsx'),
          },
          {
            path: 'admin',
            lazy: async () => import('@pages/admin_panel/AdminPage.tsx'),
          },
          {
            path: 'auth/patreon/redirect',
            lazy: async () => import('@pages/PatreonRedirectPage.tsx'),
          },
          {
            path: 'gm-share/:gmUserId',
            lazy: () => import('@pages/GmSharePage.tsx'),
            loader: async ({ params }: { params: any }) => {
              return { gmUserId: params.gmUserId };
            },
          },
          {
            path: 'oauth/access',
            lazy: async () => import('@pages/OAuthAccessPage.tsx'),
          },
          {
            path: 'campaign/:campaignId',
            lazy: () => import('@pages/campaign/CampaignOverviewPage.tsx'),
            loader: async ({ params }: { params: any }) => {
              return { campaignId: params.campaignId };
            },
          },
          {
            path: 'builder/:characterId',
            lazy: () => import('@pages/character_builder/CharacterBuilderPage.tsx'),
            loader: async ({ params }: { params: any }) => {
              return { characterId: params.characterId };
            },
          },
          {
            path: 'homebrew',
            lazy: () => import('@pages/homebrew/HomebrewPage.tsx'),
          },
        ],
      },
      {
        path: 'sheet/:characterId',
        lazy: () => import('@pages/character_sheet/CharacterSheetPage.tsx'),
        loader: async ({ params }: { params: any }) => {
          return { characterId: params.characterId };
        },
      },
      {
        path: 'sheet-unauthorized',
        lazy: () => import('@pages/character_sheet/UnauthorizedSheetPage.tsx'),
      },
      {
        path: '',
        lazy: () => import('@pages/HomePage.tsx'),
      },
      {
        path: 'content-update/:id',
        lazy: () => import('@pages/ContentUpdatePage.tsx'),
        loader: async ({ params }: { params: any }) => {
          return { updateId: params.id };
        },
      },
      {
        path: 'content-update-overview',
        lazy: () => import('@pages/ContentUpdateOverviewPage.tsx'),
      },
      {
        path: 'content-cleaning/:id',
        lazy: () => import('@pages/ContentCleaningPage.tsx'),
        loader: async ({ params }: { params: any }) => {
          return { recordId: params.id };
        },
      },
      {
        path: 'content-cleaning-source',
        lazy: () => import('@pages/ContentCleaningSourcePage.tsx'),
      },
      {
        // Legacy Character Redirect
        path: 'profile/characters/:id',
        lazy: () => import('@pages/LegacyRedirectPage.tsx'),
      },
      {
        path: 'login',
        lazy: () => import('./pages/LoginPage.tsx'),
      },
      {
        path: 'update-password',
        lazy: () => import('./pages/UpdatePasswordPage.tsx'),
      },
      {
        path: '*',
        lazy: () => import('./pages/MissingPage.tsx'),
      },
    ],
  },
  {
    path: 'stat-block/:type/:id',
    lazy: () => import('@pages/StatBlockPage.tsx'),
    loader: async ({ params }: { params: any }) => {
      return { type: params.type, id: params.id };
    },
  },
]);

// Remove dumb warning (errors) caused by Mantine in dev
const consoleError = console.error;
console.error = function (message, ...args) {
  if (/validateDOMNesting|changing an uncontrolled input/.test(message)) {
    return;
  }
  consoleError(message, ...args);
};

const root = createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <StrictMode>
    <MantineProvider forceColorScheme='dark'>
      <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
      </QueryClientProvider>
    </MantineProvider>
  </StrictMode>
);
