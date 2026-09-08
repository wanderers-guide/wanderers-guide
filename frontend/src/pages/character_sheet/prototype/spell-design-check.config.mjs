import { defineConfig } from 'cypress';

/** Manual UI-only checks. No character API or production application is involved. */
export default defineConfig({
  video: false,
  screenshotsFolder: '../.scratch/mobile-sheet-ui/spell-design-captures',
  e2e: {
    baseUrl: 'http://127.0.0.1:5175',
    supportFile: false,
    specPattern: 'src/pages/character_sheet/prototype/spell-design-check.cy.ts',
    setupNodeEvents(on) {
      on('before:browser:launch', (browser, options) => {
        if (browser.name === 'electron') {
          options.preferences.width = 1600;
          options.preferences.height = 1500;
        }
        return options;
      });
    },
  },
});
