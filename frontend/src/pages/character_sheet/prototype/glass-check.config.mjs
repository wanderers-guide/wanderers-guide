import { defineConfig } from 'cypress';

/** Manual checks for the isolated prototype. Never contacts the application API. */
export default defineConfig({
  video: false,
  screenshotsFolder: '../.scratch/mobile-sheet-ui/glass-captures',
  e2e: {
    baseUrl: 'http://127.0.0.1:5175',
    supportFile: false,
    specPattern: 'src/pages/character_sheet/prototype/glass-check.cy.ts',
    setupNodeEvents(on) {
      on('before:browser:launch', (browser, launchOptions) => {
        if (browser.name === 'electron') {
          launchOptions.preferences.width = 1600;
          launchOptions.preferences.height = 1500;
        }
        return launchOptions;
      });
    },
  },
});
