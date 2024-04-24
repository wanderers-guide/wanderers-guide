import '@mantine/core/styles.css';
import '@mantine/dropzone/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/spotlight/styles.css';
import '@mantine/tiptap/styles.css';
import '@mantine/carousel/styles.css';
import '@mantine/dates/styles.css';

import { AuthRouteWrapper } from '@auth/AuthedRouteWrapper.tsx';
import { createClient } from '@supabase/supabase-js';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import { RecoilRoot } from 'recoil';
import App from './App.tsx';
import './index.css';
import { ErrorPage } from './pages/ErrorPage.tsx';
import { MantineProvider } from '@mantine/core';

const queryClient = new QueryClient();

export const supabase = createClient(
  /*<Database>*/
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_KEY
);

// Fixes cache issues on refresh
(async () => {
  // Clear the cache on startup
  const keys = await caches.keys();
  for (const key of keys) {
    caches.delete(key);
  }

  // Unregister our service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(async (registration) => {
      const result = await registration.unregister();
    });
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
        ],
      },
      {
        path: 'homebrew',
        lazy: () => import('@pages/homebrew/HomebrewPage.tsx'),
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
        // Legacy Character Redirect
        path: 'profile/characters/:id',
        lazy: () => import('@pages/LegacyRedirectPage.tsx'),
      },
      {
        path: 'login',
        lazy: () => import('./pages/LoginPage.tsx'),
      },
      {
        path: '*',
        lazy: () => import('./pages/MissingPage.tsx'),
      },
    ],
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
    <MantineProvider defaultColorScheme='dark'>
      <QueryClientProvider client={queryClient}>
        <RecoilRoot>
          <RouterProvider router={router} />
        </RecoilRoot>
      </QueryClientProvider>
    </MantineProvider>
  </StrictMode>
);
