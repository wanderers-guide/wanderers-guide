import { defineConfig } from "cypress";

export default defineConfig({
  env: {
    "functions_url": "http://127.0.0.1:54321/functions/v1"
  },
  e2e: {
    // defaultCommandTimeout: 25000,
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
  },
});
