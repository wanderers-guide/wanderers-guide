import { defineConfig } from 'cypress';
import { registerStartupRecoveryFixture } from './cypress/support/startup-recovery-fixture';
import { registerCampaignFixtures } from './cypress/support/campaign-fixture';
import { registerContentFixtures } from './cypress/support/content-fixture.mjs';

export default defineConfig({
  keystrokeDelay: 10,
  expose: {},
  env: {
    functions_url: 'http://127.0.0.1:54321/functions/v1',
    publicAnonKey: process.env.ANON_KEY,
  },
  e2e: {
    baseUrl: 'http://localhost:5173',
    pageLoadTimeout: 120000,
    // defaultCommandTimeout: 25000,
    setupNodeEvents(on, config) {
      // Only public routing/fixture options may be read synchronously in a browser.
      for (const key of ['functions_url', 'module_preview_url', 'patreonCase']) {
        if (config.env[key] !== undefined) config.expose[key] = config.env[key];
      }
      registerStartupRecoveryFixture(on);
      registerCampaignFixtures(on, config);
      registerContentFixtures(on);
      return config;
    },
  },
});
