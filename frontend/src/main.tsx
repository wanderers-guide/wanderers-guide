import "@mantine/core/styles.css";
import "@mantine/spotlight/styles.css";
import "@mantine/dropzone/styles.css";
import '@mantine/notifications/styles.css';

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import { RouterProvider, createBrowserRouter } from "react-router-dom";
import MissingPage from "./pages/MissingPage.tsx";
import { ErrorPage } from "./pages/ErrorPage.tsx";
import HomePage from "./pages/HomePage.tsx";
import RestrictedRoute from "@auth/RestrictedRoute.tsx";
import DashboardPage from "@pages/DashboardPage.tsx";
import LoginPage from "@pages/LoginPage.tsx";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RecoilRoot } from "recoil";
import { createClient } from "@supabase/supabase-js";
import AdminPage from "@pages/AdminPage.tsx";
import './index.css';
import CharacterBuilderPage from "@pages/character_builder/CharacterBuilderPage.tsx";

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
  if ("serviceWorker" in navigator) {
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
        path: '',
        element: <HomePage />,
      },
      {
        path: 'dashboard',
        element: <RestrictedRoute page={<DashboardPage />} />,
      },
      {
        path: 'admin',
        element: <RestrictedRoute page={<AdminPage />} />,
      },
      {
        path: 'builder/:characterId',
        element: <RestrictedRoute page={<CharacterBuilderPage />} />,
        loader: async ({ params }: { params: any }) => {
          return { characterId: params.characterId };
        },
      },
      {
        path: 'login',
        element: <LoginPage />,
      },
      {
        path: '*',
        element: <MissingPage />,
      },
    ],
  },
]);

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RecoilRoot>
        <RouterProvider router={router} />
      </RecoilRoot>
    </QueryClientProvider>
  </React.StrictMode>
);
