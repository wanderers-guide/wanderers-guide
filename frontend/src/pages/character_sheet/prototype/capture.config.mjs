import { defineConfig } from 'cypress';
import { copyFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Manual, anonymous visual capture. This is not part of the regression suite. */
export default defineConfig({
  video: false,
  screenshotsFolder: '../.scratch/mobile-sheet-ui/raw-captures',
  trashAssetsBeforeRuns: false,
  e2e: {
    testIsolation: false,
    baseUrl: 'https://wanderersguide.app',
    supportFile: false,
    specPattern: 'src/pages/character_sheet/prototype/capture.cy.ts',
    defaultCommandTimeout: 30000,
    pageLoadTimeout: 120000,
    setupNodeEvents(on) {
      on('before:browser:launch', (browser, launchOptions) => {
        if (browser.name === 'electron') {
          launchOptions.preferences.width = 1280;
          launchOptions.preferences.height = 1100;
        }
        return launchOptions;
      });
      on('after:screenshot', (details) => {
        if (!/^\d+-[a-z-]+\.png$/.test(path.basename(details.path))) return;
        const width = Number(path.basename(details.path).split('-')[0]);
        if (Math.abs(details.dimensions.width / details.dimensions.height - width / 844) > 0.001) {
          throw new Error('Capture dimensions do not match the recorded viewport');
        }
        const destination = fileURLToPath(new URL('./captures', import.meta.url));
        mkdirSync(destination, { recursive: true });
        copyFileSync(details.path, path.join(destination, path.basename(details.path)));
      });
    },
  },
});
