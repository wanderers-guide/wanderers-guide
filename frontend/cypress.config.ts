import { defineConfig } from 'cypress';
import { registerCampaignFixtures } from './cypress/support/campaign-fixture';

export default defineConfig({
  // Generated HTML must not reload the app through Vite's file watcher.
  downloadsFolder: '../.agents/legacy/cypress-downloads',
  env: {
    functions_url: 'http://127.0.0.1:54321/functions/v1',
    publicAnonKey: process.env.ANON_KEY,
  },
  e2e: {
    baseUrl: 'http://localhost:5173',
    pageLoadTimeout: 120000,
    // defaultCommandTimeout: 25000,
    setupNodeEvents(on, config) {
      registerCampaignFixtures(on, config);
    },
  },
});
