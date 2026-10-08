import { defineConfig } from 'cypress';
import { registerCampaignFixtures } from './cypress/support/campaign-fixture';

export default defineConfig({
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
      // Keep the real viewport inside the browser window for uncropped visual captures.
      on('before:browser:launch', (browser, launchOptions) => {
        if (browser.family === 'chromium' && browser.isHeadless) launchOptions.args.push('--window-size=1600,1100');
        return launchOptions;
      });
    },
  },
});
